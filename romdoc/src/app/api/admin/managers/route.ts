import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requireAdminAal2Api,
} from "@/lib/auth/require-admin-aal2-api";

export const runtime =
  "nodejs";

type ManagerActionBody = {
  action?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  profileId?: unknown;
  invitationId?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength: number
) {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(
      0,
      maximumLength
    );
}

function normalizeEmail(
  value: unknown
) {
  return normalizeString(
    value,
    320
  ).toLowerCase();
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

async function listAuthUsers() {
  const admin =
    createAdminClient();

  const users = [];
  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } =
      await admin.auth.admin
        .listUsers({
          page,
          perPage,
        });

    if (error) {
      throw error;
    }

    users.push(
      ...data.users
    );

    if (
      data.users.length <
      perPage
    ) {
      break;
    }

    page += 1;
  }

  return new Map(
    users.map(
      (user) => [
        user.id,
        {
          email:
            user.email ??
            null,
          confirmed:
            Boolean(
              user
                .email_confirmed_at
            ),
          lastSignInAt:
            user
              .last_sign_in_at ??
            null,
        },
      ]
    )
  );
}

export async function GET(): Promise<Response> {
  const authorization =
    await requireAdminAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const [
    profilesResult,
    invitationsResult,
  ] =
    await Promise.all([
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
        .eq(
          "role",
          "manager"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      admin
        .from(
          "manager_invitations"
        )
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
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    profilesResult.error ||
    invitationsResult.error
  ) {
    console.error(
      "Manager management query failed:",
      profilesResult.error ??
        invitationsResult.error
    );

    return NextResponse.json(
      {
        error:
          "Managerii nu au putut fi încărcați.",
      },
      {
        status: 500,
      }
    );
  }

  let authUsers:
    Awaited<
      ReturnType<
        typeof listAuthUsers
      >
    >;

  try {
    authUsers =
      await listAuthUsers();
  } catch (error) {
    console.error(
      "Manager auth user lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Datele de autentificare ale managerilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const managers =
    (
      profilesResult.data ??
      []
    ).map(
      (profile) => ({
        ...profile,
        auth:
          authUsers.get(
            profile.id
          ) ?? null,
      })
    );

  return NextResponse.json(
    {
      managers,
      invitations:
        invitationsResult.data ??
        [],
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdminAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    ManagerActionBody;

  try {
    body =
      (await request.json()) as
        ManagerActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      {
        status: 400,
      }
    );
  }

  const email =
    normalizeEmail(
      body.email
    );

  const firstName =
    normalizeString(
      body.firstName,
      100
    );

  const lastName =
    normalizeString(
      body.lastName,
      100
    );

  if (
    !email ||
    !isValidEmail(email)
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu o adresă de e-mail validă.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      existingInvitation,
  } =
    await admin
      .from(
        "manager_invitations"
      )
      .select(
        "id, status"
      )
      .ilike(
        "email",
        email
      )
      .eq(
        "status",
        "pending"
      )
      .maybeSingle();

  if (
    existingInvitation
  ) {
    return NextResponse.json(
      {
        error:
          "Există deja o invitație activă pentru această adresă.",
      },
      {
        status: 409,
      }
    );
  }

  const siteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl.origin;

  const redirectTo =
    new URL(
      "/auth/confirm",
      siteUrl
    );

  redirectTo.searchParams.set(
    "next",
    "/dashboard"
  );

  const {
    data: inviteData,
    error: inviteError,
  } =
    await admin.auth.admin
      .inviteUserByEmail(
        email,
        {
          redirectTo:
            redirectTo.toString(),
          data: {
            role:
              "manager",
            first_name:
              firstName ||
              null,
            last_name:
              lastName ||
              null,
          },
        }
      );

  if (
    inviteError ||
    !inviteData.user
  ) {
    console.error(
      "Manager invitation auth error:",
      inviteError
    );

    const message =
      inviteError?.message ??
      "";

    return NextResponse.json(
      {
        error:
          message
            .toLowerCase()
            .includes(
              "already"
            )
            ? "Adresa aparține deja unui cont. Rolul trebuie acordat printr-un flux administrativ separat."
            : "Invitația nu a putut fi trimisă.",
      },
      {
        status:
          message
            .toLowerCase()
            .includes(
              "already"
            )
            ? 409
            : 500,
      }
    );
  }

  const userId =
    inviteData.user.id;

  const {
    error: profileError,
  } =
    await admin
      .from("profiles")
      .upsert(
        {
          id: userId,
          role:
            "manager",
          account_status:
            "active",
          first_name:
            firstName ||
            null,
          last_name:
            lastName ||
            null,
        },
        {
          onConflict:
            "id",
        }
      );

  if (profileError) {
    console.error(
      "Manager profile creation failed:",
      profileError
    );

    await admin.auth.admin
      .deleteUser(userId);

    return NextResponse.json(
      {
        error:
          "Profilul de manager nu a putut fi creat.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: invitation,
    error:
      invitationError,
  } =
    await admin
      .from(
        "manager_invitations"
      )
      .insert({
        email,
        first_name:
          firstName ||
          null,
        last_name:
          lastName ||
          null,
        invited_by_profile_id:
          authorization.profileId,
        invited_user_id:
          userId,
      })
      .select("*")
      .single();

  if (
    invitationError ||
    !invitation
  ) {
    console.error(
      "Manager invitation record failed:",
      invitationError
    );

    return NextResponse.json(
      {
        error:
          "Invitația a fost trimisă, dar evidența internă nu a putut fi creată.",
      },
      {
        status: 500,
      }
    );
  }

  await admin
    .from(
      "manager_audit_events"
    )
    .insert({
      manager_profile_id:
        userId,
      invitation_id:
        invitation.id,
      actor_profile_id:
        authorization.profileId,
      event_type:
        "invited",
      metadata: {
        email,
      },
    });

  return NextResponse.json(
    {
      success: true,
      invitation,
    },
    {
      status: 201,
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdminAal2Api();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    ManagerActionBody;

  try {
    body =
      (await request.json()) as
        ManagerActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      {
        status: 400,
      }
    );
  }

  const action =
    normalizeString(
      body.action,
      50
    );

  const profileId =
    normalizeString(
      body.profileId,
      100
    );

  const invitationId =
    normalizeString(
      body.invitationId,
      100
    );

  const admin =
    createAdminClient();

  if (
    action ===
      "suspend_manager" ||
    action ===
      "activate_manager"
  ) {
    if (!profileId) {
      return NextResponse.json(
        {
          error:
            "Managerul lipsește.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      profileId ===
      authorization.profileId
    ) {
      return NextResponse.json(
        {
          error:
            "Nu îți poți modifica propriul cont din această pagină.",
        },
        {
          status: 409,
        }
      );
    }

    const nextStatus =
      action ===
      "suspend_manager"
        ? "blocked"
        : "active";

    const {
      data: manager,
      error,
    } =
      await admin
        .from("profiles")
        .update({
          account_status:
            nextStatus,
        })
        .eq(
          "id",
          profileId
        )
        .eq(
          "role",
          "manager"
        )
        .select(`
          id,
          role,
          account_status
        `)
        .maybeSingle();

    if (
      error ||
      !manager
    ) {
      return NextResponse.json(
        {
          error:
            "Managerul nu a putut fi actualizat.",
        },
        {
          status: 404,
        }
      );
    }

    await admin
      .from(
        "manager_audit_events"
      )
      .insert({
        manager_profile_id:
          profileId,
        actor_profile_id:
          authorization.profileId,
        event_type:
          nextStatus ===
          "active"
            ? "activated"
            : "suspended",
      });

    return NextResponse.json({
      success: true,
      manager,
    });
  }

  if (
    action ===
    "revoke_invitation"
  ) {
    if (!invitationId) {
      return NextResponse.json(
        {
          error:
            "Invitația lipsește.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: invitation,
      error,
    } =
      await admin
        .from(
          "manager_invitations"
        )
        .update({
          status:
            "revoked",
          revoked_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          invitationId
        )
        .eq(
          "status",
          "pending"
        )
        .select("*")
        .maybeSingle();

    if (
      error ||
      !invitation
    ) {
      return NextResponse.json(
        {
          error:
            "Invitația nu a putut fi revocată.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      invitation
        .invited_user_id
    ) {
      await admin
        .from("profiles")
        .update({
          account_status:
            "blocked",
        })
        .eq(
          "id",
          invitation
            .invited_user_id
        )
        .eq(
          "role",
          "manager"
        );
    }

    await admin
      .from(
        "manager_audit_events"
      )
      .insert({
        manager_profile_id:
          invitation
            .invited_user_id,
        invitation_id:
          invitation.id,
        actor_profile_id:
          authorization.profileId,
        event_type:
          "invitation_revoked",
      });

    return NextResponse.json({
      success: true,
      invitation,
    });
  }

  return NextResponse.json(
    {
      error:
        "Acțiunea solicitată nu este validă.",
    },
    {
      status: 400,
    }
  );
}
