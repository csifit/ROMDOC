import {
  NextRequest,
  NextResponse,
} from "next/server";
import { Resend } from "resend";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requireAdminAal2Api,
} from "@/lib/auth/require-admin-aal2-api";

export const runtime = "nodejs";

type ManagerActionBody = {
  action?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  profileId?: unknown;
  invitationId?: unknown;
  managerType?: unknown;
};

type PermissionRow = {
  profile_id: string;
  permission_key: string;
  revoked_at: string | null;
};

type ManagerProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
  created_at: string;
  updated_at: string | null;
};

type ManagerInvitationRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  invited_by_profile_id: string | null;
  invited_user_id: string | null;
  accepted_by_profile_id: string | null;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string | null;
};

function normalizeString(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function normalizeEmail(value: unknown) {
  return normalizeString(value, 320).toLowerCase();
}

function normalizeManagerType(value: unknown) {
  return normalizeString(value, 40) === "accounting"
    ? "accounting"
    : "operational";
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getManagerTypeLabel(managerType: string) {
  return managerType === "accounting"
    ? "Manager Facturare"
    : "Manager Operațional";
}

async function listAuthUsers() {
  const admin = createAdminClient();
  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    users.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return new Map(
    users.map((user) => [
      user.id,
      {
        email: user.email ?? null,
        confirmed: Boolean(user.email_confirmed_at),
        lastSignInAt: user.last_sign_in_at ?? null,
      },
    ])
  );
}

function buildPermissionMap(permissions: PermissionRow[]) {
  const map = new Map<string, string[]>();

  for (const permission of permissions) {
    if (permission.revoked_at) {
      continue;
    }

    const current = map.get(permission.profile_id) ?? [];

    if (!current.includes(permission.permission_key)) {
      current.push(permission.permission_key);
    }

    map.set(permission.profile_id, current);
  }

  return map;
}

async function loadActivePermissions(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, string[]>();
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("manager_permissions")
    .select("profile_id, permission_key, revoked_at")
    .in("profile_id", profileIds)
    .is("revoked_at", null);

  if (error) {
    console.error("Manager permissions query failed:", error);
    return new Map<string, string[]>();
  }

  return buildPermissionMap((data ?? []) as PermissionRow[]);
}

async function grantAccountingPermission(
  profileId: string,
  actorProfileId: string
) {
  const admin = createAdminClient();

  const { data: existingRows, error: existingError } = await admin
    .from("manager_permissions")
    .select("profile_id, permission_key, revoked_at")
    .eq("profile_id", profileId)
    .eq("permission_key", "accounting");

  if (existingError) {
    console.error("Accounting permission lookup failed:", existingError);
    return existingError;
  }

  const existingActive = (existingRows ?? []).some(
    (row) => !row.revoked_at
  );

  if (existingActive) {
    return null;
  }

  if ((existingRows ?? []).length > 0) {
    const { error } = await admin
      .from("manager_permissions")
      .update({
        granted_by_profile_id: actorProfileId,
        revoked_at: null,
      })
      .eq("profile_id", profileId)
      .eq("permission_key", "accounting");

    if (error) {
      console.error("Accounting permission restore failed:", error);
      return error;
    }

    return null;
  }

  const { error } = await admin
    .from("manager_permissions")
    .insert({
      profile_id: profileId,
      permission_key: "accounting",
      granted_by_profile_id: actorProfileId,
      revoked_at: null,
    });

  if (error) {
    console.error("Accounting permission grant failed:", error);
    return error;
  }

  return null;
}

async function revokeAccountingPermission(profileId: string) {
  const admin = createAdminClient();

  const { error } = await admin
    .from("manager_permissions")
    .update({
      revoked_at: new Date().toISOString(),
    })
    .eq("profile_id", profileId)
    .eq("permission_key", "accounting")
    .is("revoked_at", null);

  if (error) {
    console.error("Accounting permission revoke failed:", error);
    return error;
  }

  return null;
}

async function sendManagerInvitationEmail({
  email,
  firstName,
  lastName,
  managerType,
  actionLink,
}: {
  email: string;
  firstName: string;
  lastName: string;
  managerType: string;
  actionLink: string;
}) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    return {
      sent: false,
      error: "Resend nu este configurat pentru invitațiile de manager.",
    };
  }

  const resend = new Resend(resendApiKey);
  const managerTypeLabel = getManagerTypeLabel(managerType);
  const displayName = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || "Manager";

  const safeName = escapeHtml(displayName);
  const safeType = escapeHtml(managerTypeLabel);
  const safeLink = escapeHtml(actionLink);

  const { error } = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject: `Invitație RomDoc — ${managerTypeLabel}`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;">
        <h1 style="font-size:22px;margin:0 0 16px;">Invitație RomDoc</h1>
        <p>Bună, ${safeName},</p>
        <p>Ai fost invitat(ă) să devii <strong>${safeType}</strong> în platforma RomDoc.</p>
        <p>Apasă butonul de mai jos pentru a confirma invitația și pentru a crea parola contului.</p>
        <p style="margin:24px 0;">
          <a href="${safeLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
            Acceptă invitația
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563;">Dacă butonul nu funcționează, copiază acest link în browser:</p>
        <p style="font-size:13px;word-break:break-all;color:#036661;">${safeLink}</p>
        <p style="font-size:13px;color:#4b5563;">Dacă nu te așteptai la această invitație, poți ignora acest e-mail.</p>
      </div>
    `,
  });

  if (error) {
    console.error("Manager invitation email failed:", error);
    return {
      sent: false,
      error: "E-mailul de invitație nu a putut fi trimis.",
    };
  }

  return {
    sent: true,
    error: null,
  };
}

export async function GET(): Promise<Response> {
  const authorization = await requireAdminAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const admin = createAdminClient();

  const [profilesResult, invitationsResult] = await Promise.all([
    admin
      .from("profiles")
      .select(`
        id,
        first_name,
        last_name,
        role,
        account_status,
        created_at,
        updated_at
      `)
      .eq("role", "manager")
      .order("created_at", { ascending: false }),

    admin
      .from("manager_invitations")
      .select(`
        id,
        email,
        first_name,
        last_name,
        invited_by_profile_id,
        invited_user_id,
        accepted_by_profile_id,
        status,
        expires_at,
        accepted_at,
        revoked_at,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false }),
  ]);

  if (profilesResult.error || invitationsResult.error) {
    console.error(
      "Manager management query failed:",
      profilesResult.error ?? invitationsResult.error
    );

    return NextResponse.json(
      { error: "Managerii nu au putut fi încărcați." },
      { status: 500 }
    );
  }

  let authUsers: Awaited<ReturnType<typeof listAuthUsers>>;

  try {
    authUsers = await listAuthUsers();
  } catch (error) {
    console.error("Manager auth user lookup failed:", error);

    return NextResponse.json(
      {
        error:
          "Datele de autentificare ale managerilor nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  const profiles = (profilesResult.data ?? []) as ManagerProfileRow[];
  const invitations = (invitationsResult.data ?? []) as ManagerInvitationRow[];
  const permissionProfileIds = Array.from(
    new Set(
      [
        ...profiles.map((profile) => profile.id),
        ...invitations
          .map((invitation) => invitation.invited_user_id)
          .filter((id): id is string => Boolean(id)),
      ]
    )
  );
  const permissionMap = await loadActivePermissions(permissionProfileIds);

  const managers = profiles.map((profile) => ({
    ...profile,
    permissions: permissionMap.get(profile.id) ?? [],
    auth: authUsers.get(profile.id) ?? null,
  }));

  const invitationsWithPermissions = invitations.map((invitation) => ({
    ...invitation,
    permissions: invitation.invited_user_id
      ? permissionMap.get(invitation.invited_user_id) ?? []
      : [],
  }));

  return NextResponse.json(
    {
      managers,
      invitations: invitationsWithPermissions,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requireAdminAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: ManagerActionBody;

  try {
    body = (await request.json()) as ManagerActionBody;
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const email = normalizeEmail(body.email);
  const firstName = normalizeString(body.firstName, 100);
  const lastName = normalizeString(body.lastName, 100);
  const managerType = normalizeManagerType(body.managerType);

  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { error: "Introdu o adresă de e-mail validă." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existingInvitation } = await admin
    .from("manager_invitations")
    .select("id, status")
    .ilike("email", email)
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvitation) {
    return NextResponse.json(
      { error: "Există deja o invitație activă pentru această adresă." },
      { status: 409 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const redirectTo = new URL("/set-password", siteUrl);
  redirectTo.searchParams.set("mode", "invite");
  redirectTo.searchParams.set("next", "/dashboard");

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo: redirectTo.toString(),
      data: {
        role: "manager",
        manager_type: managerType,
        permissions: managerType === "accounting" ? ["accounting"] : [],
        first_name: firstName || null,
        last_name: lastName || null,
        password_initialized: false,
      },
    },
  });

  if (linkError || !linkData.user || !linkData.properties?.action_link) {
    console.error("Manager invitation link error:", linkError);

    const message = linkError?.message ?? "";

    return NextResponse.json(
      {
        error: message.toLowerCase().includes("already")
          ? "Adresa aparține deja unui cont. Rolul trebuie acordat printr-un flux administrativ separat."
          : "Linkul de invitație nu a putut fi generat.",
      },
      { status: message.toLowerCase().includes("already") ? 409 : 500 }
    );
  }

  const userId = linkData.user.id;

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      role: "manager",
      account_status: "active",
      first_name: firstName || null,
      last_name: lastName || null,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Manager profile creation failed:", profileError);
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json(
      { error: "Profilul de manager nu a putut fi creat." },
      { status: 500 }
    );
  }

  if (managerType === "accounting") {
    const permissionError = await grantAccountingPermission(
      userId,
      authorization.profileId
    );

    if (permissionError) {
      await admin.auth.admin.deleteUser(userId);

      return NextResponse.json(
        { error: "Permisiunea de facturare nu a putut fi acordată." },
        { status: 500 }
      );
    }
  }

  const emailResult = await sendManagerInvitationEmail({
    email,
    firstName,
    lastName,
    managerType,
    actionLink: linkData.properties.action_link,
  });

  if (!emailResult.sent) {
    await admin.auth.admin.deleteUser(userId);

    return NextResponse.json(
      {
        error:
          emailResult.error ?? "E-mailul de invitație nu a putut fi trimis.",
      },
      { status: 500 }
    );
  }

  const { data: invitation, error: invitationError } = await admin
    .from("manager_invitations")
    .insert({
      email,
      first_name: firstName || null,
      last_name: lastName || null,
      invited_by_profile_id: authorization.profileId,
      invited_user_id: userId,
    })
    .select("*")
    .single();

  if (invitationError || !invitation) {
    console.error("Manager invitation record failed:", invitationError);

    return NextResponse.json(
      {
        error:
          "Invitația a fost trimisă, dar evidența internă nu a putut fi creată.",
      },
      { status: 500 }
    );
  }

  await admin.from("manager_audit_events").insert({
    manager_profile_id: userId,
    invitation_id: invitation.id,
    actor_profile_id: authorization.profileId,
    event_type: "invited",
    metadata: {
      email,
      manager_type: managerType,
      permissions: managerType === "accounting" ? ["accounting"] : [],
      email_delivery: "resend_custom_manager_invitation",
      acceptance_redirect: "/set-password",
    },
  });

  return NextResponse.json(
    {
      success: true,
      invitation: {
        ...invitation,
        permissions: managerType === "accounting" ? ["accounting"] : [],
      },
    },
    { status: 201 }
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requireAdminAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: ManagerActionBody;

  try {
    body = (await request.json()) as ManagerActionBody;
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const action = normalizeString(body.action, 50);
  const profileId = normalizeString(body.profileId, 100);
  const invitationId = normalizeString(body.invitationId, 100);
  const admin = createAdminClient();

  if (
    action === "grant_accounting_permission" ||
    action === "revoke_accounting_permission"
  ) {
    if (!profileId) {
      return NextResponse.json(
        { error: "Managerul lipsește." },
        { status: 400 }
      );
    }

    if (profileId === authorization.profileId) {
      return NextResponse.json(
        { error: "Nu îți poți modifica propriile permisiuni din această pagină." },
        { status: 409 }
      );
    }

    const { data: manager, error: managerError } = await admin
      .from("profiles")
      .select("id, role, account_status")
      .eq("id", profileId)
      .eq("role", "manager")
      .maybeSingle();

    if (managerError || !manager) {
      return NextResponse.json(
        { error: "Managerul nu a fost găsit." },
        { status: 404 }
      );
    }

    const permissionError =
      action === "grant_accounting_permission"
        ? await grantAccountingPermission(profileId, authorization.profileId)
        : await revokeAccountingPermission(profileId);

    if (permissionError) {
      return NextResponse.json(
        { error: "Permisiunea de facturare nu a putut fi actualizată." },
        { status: 500 }
      );
    }

    await admin.from("manager_audit_events").insert({
      manager_profile_id: profileId,
      actor_profile_id: authorization.profileId,
      event_type:
        action === "grant_accounting_permission"
          ? "accounting_permission_granted"
          : "accounting_permission_revoked",
      metadata: {
        permission_key: "accounting",
      },
    });

    return NextResponse.json({
      success: true,
      message:
        action === "grant_accounting_permission"
          ? "Permisiunea Facturare a fost acordată."
          : "Permisiunea Facturare a fost eliminată.",
    });
  }

  if (
    action === "suspend_manager" ||
    action === "activate_manager" ||
    action === "delete_manager"
  ) {
    if (!profileId) {
      return NextResponse.json(
        { error: "Managerul lipsește." },
        { status: 400 }
      );
    }

    if (profileId === authorization.profileId) {
      return NextResponse.json(
        { error: "Nu îți poți modifica propriul cont din această pagină." },
        { status: 409 }
      );
    }

    if (action === "delete_manager") {
      const { data: existingManager, error: existingManagerError } = await admin
        .from("profiles")
        .select("id, role, account_status, first_name, last_name")
        .eq("id", profileId)
        .eq("role", "manager")
        .maybeSingle();

      if (existingManagerError || !existingManager) {
        return NextResponse.json(
          { error: "Managerul nu a fost găsit." },
          { status: 404 }
        );
      }

      const { data: removedManager, error: removeError } = await admin
        .from("profiles")
        .update({
          role: "patient",
          account_status: "blocked",
        })
        .eq("id", profileId)
        .eq("role", "manager")
        .select("id, role, account_status")
        .maybeSingle();

      if (removeError || !removedManager) {
        return NextResponse.json(
          { error: "Managerul nu a putut fi șters." },
          { status: 500 }
        );
      }

      await admin
        .from("manager_permissions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("profile_id", profileId)
        .is("revoked_at", null);

      await admin
        .from("manager_invitations")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("invited_user_id", profileId)
        .in("status", ["pending", "accepted"]);

      await admin.from("manager_audit_events").insert({
        manager_profile_id: profileId,
        actor_profile_id: authorization.profileId,
        event_type: "suspended",
        metadata: {
          admin_action: "delete_manager",
          previous_role: "manager",
          new_role: "patient",
          previous_account_status: existingManager.account_status,
          new_account_status: "blocked",
        },
      });

      return NextResponse.json({
        success: true,
        manager: removedManager,
        message:
          "Managerul a fost șters din lista de manageri și accesul operațional a fost blocat.",
      });
    }

    const nextStatus = action === "suspend_manager" ? "blocked" : "active";

    const { data: manager, error } = await admin
      .from("profiles")
      .update({ account_status: nextStatus })
      .eq("id", profileId)
      .eq("role", "manager")
      .select("id, role, account_status")
      .maybeSingle();

    if (error || !manager) {
      return NextResponse.json(
        { error: "Managerul nu a putut fi actualizat." },
        { status: 404 }
      );
    }

    await admin.from("manager_audit_events").insert({
      manager_profile_id: profileId,
      actor_profile_id: authorization.profileId,
      event_type: nextStatus === "active" ? "activated" : "suspended",
    });

    return NextResponse.json({ success: true, manager });
  }

  if (action === "revoke_invitation") {
    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitația lipsește." },
        { status: 400 }
      );
    }

    const { data: invitation, error } = await admin
      .from("manager_invitations")
      .update({
        status: "revoked",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", invitationId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json(
        { error: "Invitația nu a putut fi revocată." },
        { status: 404 }
      );
    }

    if (invitation.invited_user_id) {
      await admin
        .from("profiles")
        .update({ account_status: "blocked" })
        .eq("id", invitation.invited_user_id)
        .eq("role", "manager");

      await admin
        .from("manager_permissions")
        .update({ revoked_at: new Date().toISOString() })
        .eq("profile_id", invitation.invited_user_id)
        .is("revoked_at", null);
    }

    await admin.from("manager_audit_events").insert({
      manager_profile_id: invitation.invited_user_id,
      invitation_id: invitation.id,
      actor_profile_id: authorization.profileId,
      event_type: "invitation_revoked",
    });

    return NextResponse.json({ success: true, invitation });
  }

  return NextResponse.json(
    { error: "Acțiunea solicitată nu este validă." },
    { status: 400 }
  );
}
