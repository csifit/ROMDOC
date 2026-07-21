import type { User } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

import { PLATFORM_OPERATOR_ACCESS_CODES } from "@/lib/api/platform-operator-access-codes";
import { requireAdminAal2Api } from "@/lib/auth/require-admin-aal2-api";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import { getPlatformOperatorAccess } from "@/lib/i18n/platform-operator-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ManagerActionBody = {
  action?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  profileId?: unknown;
  invitationId?: unknown;
  managerType?: unknown;
  locale?: unknown;
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

function apiError(code: string, error: string, status: number) {
  return NextResponse.json(
    { code, error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function apiSuccess(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
  status = 200
) {
  return NextResponse.json(
    { code, message, ...extra },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function normalizeString(value: unknown, maximumLength: number) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
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

function replaceTokens(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

async function listAuthUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;
    users.push(...data.users);

    if (data.users.length < perPage) break;
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
    if (permission.revoked_at) continue;
    const current = map.get(permission.profile_id) ?? [];

    if (!current.includes(permission.permission_key)) {
      current.push(permission.permission_key);
    }

    map.set(permission.profile_id, current);
  }

  return map;
}

async function loadActivePermissions(profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, string[]>();

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

  if ((existingRows ?? []).some((row: PermissionRow) => !row.revoked_at)) {
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

  const { error } = await admin.from("manager_permissions").insert({
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
    .update({ revoked_at: new Date().toISOString() })
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
  locale,
  actionLink,
}: {
  email: string;
  firstName: string;
  lastName: string;
  managerType: string;
  locale: AppLocale;
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

  const copy = getPlatformOperatorAccess(locale).managers.emailInvitation;
  const displayName =
    [firstName, lastName].filter(Boolean).join(" ").trim() || "Manager";
  const managerTypeLabel =
    managerType === "accounting"
      ? copy.accountingType
      : copy.operationalType;
  const subject =
    managerType === "accounting"
      ? copy.subjectAccounting
      : copy.subjectOperational;
  const greeting = replaceTokens(copy.greeting, { name: displayName });
  const body = replaceTokens(copy.body, { type: managerTypeLabel });
  const safeLink = escapeHtml(actionLink);
  const resend = new Resend(resendApiKey);

  const { error } = await resend.emails.send({
    from: resendFromEmail,
    to: email,
    subject,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827;max-width:640px;margin:0 auto;">
        <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(copy.heading)}</h1>
        <p>${escapeHtml(greeting)}</p>
        <p>${escapeHtml(body)}</p>
        <p>${escapeHtml(copy.instructions)}</p>
        <p style="margin:24px 0;">
          <a href="${safeLink}" style="display:inline-block;background:#036661;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
            ${escapeHtml(copy.action)}
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563;">${escapeHtml(copy.fallback)}</p>
        <p style="font-size:13px;word-break:break-all;color:#036661;">${safeLink}</p>
        <p style="font-size:13px;color:#4b5563;">${escapeHtml(copy.ignore)}</p>
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

  return { sent: true, error: null };
}

export async function GET(): Promise<Response> {
  const authorization = await requireAdminAal2Api();
  if (authorization.response) return authorization.response;

  const admin = createAdminClient();
  const [profilesResult, invitationsResult] = await Promise.all([
    admin
      .from("profiles")
      .select(
        "id, first_name, last_name, role, account_status, created_at, updated_at"
      )
      .eq("role", "manager")
      .order("created_at", { ascending: false }),
    admin
      .from("manager_invitations")
      .select(
        "id, email, first_name, last_name, invited_by_profile_id, invited_user_id, accepted_by_profile_id, status, expires_at, accepted_at, revoked_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false }),
  ]);

  if (profilesResult.error || invitationsResult.error) {
    console.error(
      "Manager management query failed:",
      profilesResult.error ?? invitationsResult.error
    );
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managersLoadFailed,
      "Managerii nu au putut fi încărcați.",
      500
    );
  }

  let authUsers: Awaited<ReturnType<typeof listAuthUsers>>;
  try {
    authUsers = await listAuthUsers();
  } catch (authError) {
    console.error("Manager auth user lookup failed:", authError);
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managerAuthLoadFailed,
      "Datele de autentificare ale managerilor nu au putut fi încărcate.",
      500
    );
  }

  const profiles = (profilesResult.data ?? []) as ManagerProfileRow[];
  const invitations =
    (invitationsResult.data ?? []) as ManagerInvitationRow[];
  const permissionProfileIds = Array.from(
    new Set([
      ...profiles.map((profile) => profile.id),
      ...invitations
        .map((invitation) => invitation.invited_user_id)
        .filter((id): id is string => Boolean(id)),
    ])
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
      code: PLATFORM_OPERATOR_ACCESS_CODES.managersLoaded,
      managers,
      invitations: invitationsWithPermissions,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await requireAdminAal2Api();
  if (authorization.response) return authorization.response;

  let body: ManagerActionBody;
  try {
    body = (await request.json()) as ManagerActionBody;
  } catch {
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.invalidRequestData,
      "Datele trimise nu sunt valide.",
      400
    );
  }

  const email = normalizeEmail(body.email);
  const firstName = normalizeString(body.firstName, 100);
  const lastName = normalizeString(body.lastName, 100);
  const managerType = normalizeManagerType(body.managerType);
  const locale = normalizeAppLocale(
    typeof body.locale === "string" ? body.locale : undefined
  );

  if (!email || !isValidEmail(email)) {
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.invalidEmail,
      "Introdu o adresă de e-mail validă.",
      400
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
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managerInvitationExists,
      "Există deja o invitație activă pentru această adresă.",
      409
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? request.nextUrl.origin;
  const redirectTo = new URL("/set-password", siteUrl);
  redirectTo.searchParams.set("mode", "invite");
  redirectTo.searchParams.set("next", "/dashboard");
  redirectTo.searchParams.set("locale", locale);

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo: redirectTo.toString(),
        data: {
          role: "manager",
          manager_type: managerType,
          permissions:
            managerType === "accounting" ? ["accounting"] : [],
          invitation_locale: locale,
          first_name: firstName || null,
          last_name: lastName || null,
          password_initialized: false,
        },
      },
    });

  if (linkError || !linkData.user || !linkData.properties?.action_link) {
    console.error("Manager invitation link error:", linkError);
    const message = linkError?.message ?? "";
    const existing = message.toLowerCase().includes("already");

    return apiError(
      existing
        ? PLATFORM_OPERATOR_ACCESS_CODES.existingAccountRequiresSeparateFlow
        : PLATFORM_OPERATOR_ACCESS_CODES.managerInvitationLinkFailed,
      existing
        ? "Adresa aparține deja unui cont. Rolul trebuie acordat printr-un flux administrativ separat."
        : "Linkul de invitație nu a putut fi generat.",
      existing ? 409 : 500
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
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managerProfileCreateFailed,
      "Profilul de manager nu a putut fi creat.",
      500
    );
  }

  if (managerType === "accounting") {
    const permissionError = await grantAccountingPermission(
      userId,
      authorization.profileId
    );

    if (permissionError) {
      await admin.auth.admin.deleteUser(userId);
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.accountingPermissionGrantFailed,
        "Permisiunea de facturare nu a putut fi acordată.",
        500
      );
    }
  }

  const emailResult = await sendManagerInvitationEmail({
    email,
    firstName,
    lastName,
    managerType,
    locale,
    actionLink: linkData.properties.action_link,
  });

  if (!emailResult.sent) {
    await admin.auth.admin.deleteUser(userId);
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managerInvitationEmailFailed,
      emailResult.error ?? "E-mailul de invitație nu a putut fi trimis.",
      500
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
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.managerInvitationRecordFailed,
      "Invitația a fost trimisă, dar evidența internă nu a putut fi creată.",
      500
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
      permissions:
        managerType === "accounting" ? ["accounting"] : [],
      invitation_locale: locale,
      email_delivery: "resend_custom_manager_invitation",
      acceptance_redirect: "/set-password",
    },
  });

  return apiSuccess(
    PLATFORM_OPERATOR_ACCESS_CODES.managerInvited,
    "Invitația de manager a fost trimisă.",
    {
      success: true,
      invitation: {
        ...invitation,
        permissions:
          managerType === "accounting" ? ["accounting"] : [],
      },
    },
    201
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requireAdminAal2Api();
  if (authorization.response) return authorization.response;

  let body: ManagerActionBody;
  try {
    body = (await request.json()) as ManagerActionBody;
  } catch {
    return apiError(
      PLATFORM_OPERATOR_ACCESS_CODES.invalidRequestData,
      "Datele trimise nu sunt valide.",
      400
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
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.managerIdRequired,
        "Managerul lipsește.",
        400
      );
    }

    if (profileId === authorization.profileId) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.selfPermissionChangeForbidden,
        "Nu îți poți modifica propriile permisiuni din această pagină.",
        409
      );
    }

    const { data: manager, error: managerError } = await admin
      .from("profiles")
      .select("id, role, account_status")
      .eq("id", profileId)
      .eq("role", "manager")
      .maybeSingle();

    if (managerError || !manager) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.managerNotFound,
        "Managerul nu a fost găsit.",
        404
      );
    }

    const permissionError =
      action === "grant_accounting_permission"
        ? await grantAccountingPermission(
            profileId,
            authorization.profileId
          )
        : await revokeAccountingPermission(profileId);

    if (permissionError) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.accountingPermissionUpdateFailed,
        "Permisiunea de facturare nu a putut fi actualizată.",
        500
      );
    }

    const granted = action === "grant_accounting_permission";
    await admin.from("manager_audit_events").insert({
      manager_profile_id: profileId,
      actor_profile_id: authorization.profileId,
      event_type: granted
        ? "accounting_permission_granted"
        : "accounting_permission_revoked",
      metadata: { permission_key: "accounting" },
    });

    return apiSuccess(
      granted
        ? PLATFORM_OPERATOR_ACCESS_CODES.accountingPermissionGranted
        : PLATFORM_OPERATOR_ACCESS_CODES.accountingPermissionRevoked,
      granted
        ? "Permisiunea Facturare a fost acordată."
        : "Permisiunea Facturare a fost eliminată.",
      { success: true }
    );
  }

  if (
    action === "suspend_manager" ||
    action === "activate_manager" ||
    action === "delete_manager"
  ) {
    if (!profileId) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.managerIdRequired,
        "Managerul lipsește.",
        400
      );
    }

    if (profileId === authorization.profileId) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.selfManagerAccountChangeForbidden,
        "Nu îți poți modifica propriul cont din această pagină.",
        409
      );
    }

    if (action === "delete_manager") {
      const { data: existingManager, error: existingManagerError } =
        await admin
          .from("profiles")
          .select("id, role, account_status, first_name, last_name")
          .eq("id", profileId)
          .eq("role", "manager")
          .maybeSingle();

      if (existingManagerError || !existingManager) {
        return apiError(
          PLATFORM_OPERATOR_ACCESS_CODES.managerNotFound,
          "Managerul nu a fost găsit.",
          404
        );
      }

      const { data: removedManager, error: removeError } = await admin
        .from("profiles")
        .update({ role: "patient", account_status: "blocked" })
        .eq("id", profileId)
        .eq("role", "manager")
        .select("id, role, account_status")
        .maybeSingle();

      if (removeError || !removedManager) {
        return apiError(
          PLATFORM_OPERATOR_ACCESS_CODES.managerDeleteFailed,
          "Managerul nu a putut fi șters.",
          500
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

      return apiSuccess(
        PLATFORM_OPERATOR_ACCESS_CODES.managerDeleted,
        "Managerul a fost șters din lista de manageri și accesul operațional a fost blocat.",
        { success: true, manager: removedManager }
      );
    }

    const nextStatus =
      action === "suspend_manager" ? "blocked" : "active";
    const { data: manager, error } = await admin
      .from("profiles")
      .update({ account_status: nextStatus })
      .eq("id", profileId)
      .eq("role", "manager")
      .select("id, role, account_status")
      .maybeSingle();

    if (error || !manager) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.managerUpdateFailed,
        "Managerul nu a putut fi actualizat.",
        404
      );
    }

    const activated = nextStatus === "active";
    await admin.from("manager_audit_events").insert({
      manager_profile_id: profileId,
      actor_profile_id: authorization.profileId,
      event_type: activated ? "activated" : "suspended",
    });

    return apiSuccess(
      activated
        ? PLATFORM_OPERATOR_ACCESS_CODES.managerActivated
        : PLATFORM_OPERATOR_ACCESS_CODES.managerSuspended,
      activated
        ? "Managerul a fost activat."
        : "Managerul a fost suspendat.",
      { success: true, manager }
    );
  }

  if (action === "revoke_invitation") {
    if (!invitationId) {
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.invitationIdRequired,
        "Invitația lipsește.",
        400
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
      return apiError(
        PLATFORM_OPERATOR_ACCESS_CODES.invitationRevokeFailed,
        "Invitația nu a putut fi revocată.",
        404
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

    return apiSuccess(
      PLATFORM_OPERATOR_ACCESS_CODES.invitationRevoked,
      "Invitația a fost revocată.",
      { success: true, invitation }
    );
  }

  return apiError(
    PLATFORM_OPERATOR_ACCESS_CODES.invalidManagerAction,
    "Acțiunea solicitată nu este validă.",
    400
  );
}
