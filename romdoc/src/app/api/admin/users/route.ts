import {
  NextRequest,
  NextResponse,
} from "next/server";
import type {
  User,
} from "@supabase/supabase-js";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";

export const runtime = "nodejs";

type UserActionBody = {
  userId?: unknown;
  action?: unknown;
  reason?: unknown;
};

type ProfileRecord = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
  account_status: string;
  blocked_at: string | null;
  blocked_by_profile_id:
    | string
    | null;
  blocked_reason:
    | string
    | null;
  created_at: string;
  updated_at: string;
};

type SubscriptionRecord = {
  profile_id: string;
  doctor_id: string | null;
  status: string;
  stripe_subscription_id:
    | string
    | null;
  current_period_end:
    | string
    | null;
};

function normalizeString(
  value: unknown,
  maximumLength = 1000
): string {
  if (
    typeof value !== "string"
  ) {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function createSlugPart(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function createDoctorSlug(
  firstName: string | null,
  lastName: string | null,
  userId: string
) {
  const namePart =
    createSlugPart(
      [
        firstName,
        lastName,
      ]
        .filter(Boolean)
        .join(" ")
    );

  const fallback =
    userId
      .replace(/-/g, "")
      .slice(0, 8);

  return namePart
    ? `dr-${namePart}`
    : `doctor-${fallback}`;
}

async function getUniqueDoctorSlug(
  baseSlug: string
) {
  const admin =
    createAdminClient();

  let candidate =
    baseSlug;

  let suffix = 2;

  while (true) {
    const {
      data,
      error,
    } = await admin
      .from("doctors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

async function listAllAuthUsers() {
  const admin =
    createAdminClient();

  const users: User[] = [];

  let page = 1;
  const perPage = 1000;

  while (true) {
    const {
      data,
      error,
    } =
      await admin.auth.admin.listUsers({
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

  return users;
}

export async function GET(): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  let authUsers: User[];

  try {
    authUsers =
      await listAllAuthUsers();
  } catch (authUsersError) {
    console.error(
      "Admin auth users query failed:",
      authUsersError
    );

    return NextResponse.json(
      {
        error:
          "Utilizatorii de autentificare nu au putut fi încărcați.",
      },
      {
        status: 500,
      }
    );
  }

  const authUserIds =
    authUsers.map(
      (user) => user.id
    );

  let profiles:
    ProfileRecord[] = [];

  let subscriptions:
    SubscriptionRecord[] = [];

  if (
    authUserIds.length > 0
  ) {
    const [
      profilesResult,
      subscriptionsResult,
    ] = await Promise.all([
      admin
        .from("profiles")
        .select(`
          id,
          role,
          first_name,
          last_name,
          account_status,
          blocked_at,
          blocked_by_profile_id,
          blocked_reason,
          created_at,
          updated_at
        `)
        .in(
          "id",
          authUserIds
        ),

      admin
        .from(
          "doctor_subscriptions"
        )
        .select(`
          profile_id,
          doctor_id,
          status,
          stripe_subscription_id,
          current_period_end
        `)
        .in(
          "profile_id",
          authUserIds
        ),
    ]);

    if (
      profilesResult.error
    ) {
      console.error(
        "Admin user profiles query failed:",
        profilesResult.error
      );

      return NextResponse.json(
        {
          error:
            "Profilurile utilizatorilor nu au putut fi încărcate.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      subscriptionsResult.error
    ) {
      console.error(
        "Admin doctor subscriptions query failed:",
        subscriptionsResult.error
      );

      return NextResponse.json(
        {
          error:
            "Abonamentele medicilor nu au putut fi încărcate.",
        },
        {
          status: 500,
        }
      );
    }

    profiles =
      (profilesResult.data ??
        []) as ProfileRecord[];

    subscriptions =
      (subscriptionsResult.data ??
        []) as SubscriptionRecord[];
  }

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const subscriptionMap =
    new Map(
      subscriptions.map(
        (subscription) => [
          subscription.profile_id,
          subscription,
        ]
      )
    );

  const users =
    authUsers
      .map((authUser) => {
        const profile =
          profileMap.get(
            authUser.id
          );

        const subscription =
          subscriptionMap.get(
            authUser.id
          );

        const metadata =
          authUser.user_metadata ??
          {};

        const firstName =
          profile?.first_name ??
          (
            typeof metadata.first_name ===
            "string"
              ? metadata.first_name
              : null
          );

        const lastName =
          profile?.last_name ??
          (
            typeof metadata.last_name ===
            "string"
              ? metadata.last_name
              : null
          );

        return {
          id:
            authUser.id,

          email:
            authUser.email ??
            null,

          phone:
            authUser.phone ??
            null,

          first_name:
            firstName,

          last_name:
            lastName,

          role:
            profile?.role ??
            "unknown",

          account_status:
            profile?.account_status ??
            "active",

          email_verified:
            Boolean(
              authUser.email_confirmed_at
            ),

          email_confirmed_at:
            authUser.email_confirmed_at ??
            null,

          last_sign_in_at:
            authUser.last_sign_in_at ??
            null,

          created_at:
            authUser.created_at,

          blocked_at:
            profile?.blocked_at ??
            null,

          blocked_reason:
            profile?.blocked_reason ??
            null,

          is_current_admin:
            authUser.id ===
            authorization.profileId,

          subscription_status:
            subscription?.status ??
            null,

          subscription_doctor_id:
            subscription?.doctor_id ??
            null,

          stripe_subscription_id:
            subscription
              ?.stripe_subscription_id ??
            null,

          subscription_period_end:
            subscription
              ?.current_period_end ??
            null,

          can_activate_doctor:
            profile?.role ===
              "doctor_applicant" &&
            profile.account_status ===
              "active" &&
            Boolean(
              authUser.email_confirmed_at
            ) &&
            (
              subscription?.status ===
                "active" ||
              subscription?.status ===
                "trialing"
            ),
        };
      })
      .sort(
        (
          first,
          second
        ) =>
          new Date(
            second.created_at
          ).getTime() -
          new Date(
            first.created_at
          ).getTime()
      );

  return NextResponse.json({
    users,
    operatorRole:
      authorization.role,
    capabilities: {
      canSuspendUsers:
        true,
      canChangePrivilegedRoles:
        authorization.role ===
        "admin",
    },
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: UserActionBody;

  try {
    body =
      (await request.json()) as
        UserActionBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const userId =
    normalizeString(
      body.userId,
      100
    );

  const action =
    normalizeString(
      body.action,
      50
    );

  const reason =
    normalizeString(
      body.reason,
      1000
    );

  if (!userId) {
    return NextResponse.json(
      {
        error:
          "Utilizatorul lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action !== "block" &&
    action !== "unblock" &&
    action !== "activate_doctor"
  ) {
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

  if (
    action === "block" &&
    reason.length < 3
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu motivul blocării.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    userId ===
      authorization.profileId &&
    action !== "activate_doctor"
  ) {
    return NextResponse.json(
      {
        error:
          "Nu îți poți modifica propriul cont prin această acțiune.",
      },
      {
        status: 409,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: targetProfile,
    error: targetProfileError,
  } = await admin
    .from("profiles")
    .select(`
      id,
      role,
      first_name,
      last_name,
      account_status
    `)
    .eq("id", userId)
    .maybeSingle();

  if (
    targetProfileError ||
    !targetProfile
  ) {
    return NextResponse.json(
      {
        error:
          "Profilul utilizatorului nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  if (
    authorization.role ===
      "manager" &&
    (
      targetProfile.role ===
        "admin" ||
      targetProfile.role ===
        "manager"
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Managerii nu pot modifica administratori sau alți manageri.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    authorization.role ===
      "manager" &&
    action !== "block" &&
    action !== "unblock"
  ) {
    return NextResponse.json(
      {
        error:
          "Managerii pot doar suspenda sau reactiva utilizatori.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    action === "activate_doctor"
  ) {
    if (
      targetProfile.role !==
      "doctor_applicant"
    ) {
      return NextResponse.json(
        {
          error:
            "Numai candidații medici pot fi activați.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      targetProfile.account_status !==
      "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Contul candidatului este blocat. Deblochează contul înainte de activare.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: authUserResult,
      error: authUserError,
    } =
      await admin.auth.admin.getUserById(
        userId
      );

    if (
      authUserError ||
      !authUserResult.user
    ) {
      return NextResponse.json(
        {
          error:
            "Contul de autentificare al candidatului nu a fost găsit.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !authUserResult.user
        .email_confirmed_at
    ) {
      return NextResponse.json(
        {
          error:
            "Candidatul trebuie să își verifice adresa de e-mail înainte de activare.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: subscription,
      error: subscriptionError,
    } = await admin
      .from(
        "doctor_subscriptions"
      )
      .select(`
        id,
        profile_id,
        doctor_id,
        status,
        stripe_subscription_id
      `)
      .eq(
        "profile_id",
        userId
      )
      .maybeSingle();

    if (
      subscriptionError
    ) {
      console.error(
        "Doctor subscription verification failed:",
        subscriptionError
      );

      return NextResponse.json(
        {
          error:
            "Abonamentul candidatului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Candidatul nu are un abonament de medic.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      subscription.status !==
        "active" &&
      subscription.status !==
        "trialing"
    ) {
      return NextResponse.json(
        {
          error:
            "Candidatul nu are un abonament activ sau în perioada de probă.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data: existingDoctor,
      error: existingDoctorError,
    } = await admin
      .from("doctors")
      .select(`
        id,
        profile_id,
        slug,
        status
      `)
      .eq(
        "profile_id",
        userId
      )
      .maybeSingle();

    if (
      existingDoctorError
    ) {
      console.error(
        "Existing doctor lookup failed:",
        existingDoctorError
      );

      return NextResponse.json(
        {
          error:
            "Profilul de medic existent nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    let doctorId =
      existingDoctor?.id ??
      null;

    let createdDoctorId:
      | string
      | null = null;

    if (!doctorId) {
      let doctorSlug: string;

      try {
        doctorSlug =
          await getUniqueDoctorSlug(
            createDoctorSlug(
              targetProfile.first_name,
              targetProfile.last_name,
              userId
            )
          );
      } catch (slugError) {
        console.error(
          "Doctor slug generation failed:",
          slugError
        );

        return NextResponse.json(
          {
            error:
              "Slug-ul profilului de medic nu a putut fi generat.",
          },
          {
            status: 500,
          }
        );
      }

      const {
        data: createdDoctor,
        error: createDoctorError,
      } = await admin
        .from("doctors")
        .insert({
          profile_id:
            userId,

          slug:
            doctorSlug,

          status:
            "active",

          email:
            authUserResult.user
              .email ?? null,

          phone:
            authUserResult.user
              .phone ?? null,
        })
        .select(`
          id,
          slug
        `)
        .single();

      if (
        createDoctorError ||
        !createdDoctor
      ) {
        console.error(
          "Doctor record creation failed:",
          createDoctorError
        );

        return NextResponse.json(
          {
            error:
              "Profilul de medic nu a putut fi creat.",
          },
          {
            status: 500,
          }
        );
      }

      doctorId =
        createdDoctor.id;

      createdDoctorId =
        createdDoctor.id;
    } else if (
      existingDoctor?.status !==
      "active"
    ) {
      const {
        error: doctorUpdateError,
      } = await admin
        .from("doctors")
        .update({
          status:
            "active",

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          doctorId
        );

      if (doctorUpdateError) {
        console.error(
          "Doctor record activation failed:",
          doctorUpdateError
        );

        return NextResponse.json(
          {
            error:
              "Profilul de medic existent nu a putut fi activat.",
          },
          {
            status: 500,
          }
        );
      }
    }

    if (!doctorId) {
      return NextResponse.json(
        {
          error:
            "Profilul de medic nu a putut fi identificat.",
        },
        {
          status: 500,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: updatedSubscription,
      error:
        subscriptionUpdateError,
    } = await admin
      .from(
        "doctor_subscriptions"
      )
      .update({
        doctor_id:
          doctorId,

        updated_at:
          now,
      })
      .eq(
        "id",
        subscription.id
      )
      .select("id")
      .maybeSingle();

    if (
      subscriptionUpdateError ||
      !updatedSubscription
    ) {
      console.error(
        "Doctor subscription linking failed:",
        subscriptionUpdateError
      );

      if (createdDoctorId) {
        await admin
          .from("doctors")
          .delete()
          .eq(
            "id",
            createdDoctorId
          );
      }

      return NextResponse.json(
        {
          error:
            "Abonamentul nu a putut fi asociat profilului de medic.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: activatedProfile,
      error: profileActivationError,
    } = await admin
      .from("profiles")
      .update({
        role:
          "doctor",

        updated_at:
          now,
      })
      .eq(
        "id",
        userId
      )
      .eq(
        "role",
        "doctor_applicant"
      )
      .eq(
        "account_status",
        "active"
      )
      .select("id")
      .maybeSingle();

    if (
      profileActivationError ||
      !activatedProfile
    ) {
      console.error(
        "Doctor applicant role activation failed:",
        profileActivationError
      );

      await admin
        .from(
          "doctor_subscriptions"
        )
        .update({
          doctor_id:
            subscription.doctor_id,
        })
        .eq(
          "id",
          subscription.id
        );

      if (createdDoctorId) {
        await admin
          .from("doctors")
          .delete()
          .eq(
            "id",
            createdDoctorId
          );
      } else if (
        existingDoctor &&
        existingDoctor.status !==
          "active"
      ) {
        await admin
          .from("doctors")
          .update({
            status:
              existingDoctor.status,
          })
          .eq(
            "id",
            existingDoctor.id
          );
      }

      return NextResponse.json(
        {
          error:
            "Rolul de medic nu a putut fi acordat. Modificările au fost anulate.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        "Candidatul a fost activat ca medic.",
    });
  }

  if (
    targetProfile.role ===
    "admin"
  ) {
    return NextResponse.json(
      {
        error:
          "Conturile de administrator nu pot fi blocate din această pagină.",
      },
      {
        status: 403,
      }
    );
  }

  if (
    action === "block" &&
    targetProfile.account_status ===
      "blocked"
  ) {
    return NextResponse.json(
      {
        error:
          "Contul este deja blocat.",
      },
      {
        status: 409,
      }
    );
  }

  if (
    action === "unblock" &&
    targetProfile.account_status ===
      "active"
  ) {
    return NextResponse.json(
      {
        error:
          "Contul este deja activ.",
      },
      {
        status: 409,
      }
    );
  }

  const now =
    new Date().toISOString();

  if (action === "block") {
    const {
      error: authBlockError,
    } =
      await admin.auth.admin.updateUserById(
        userId,
        {
          ban_duration:
            "876000h",
        }
      );

    if (authBlockError) {
      console.error(
        "Auth user blocking failed:",
        authBlockError
      );

      return NextResponse.json(
        {
          error:
            "Contul de autentificare nu a putut fi blocat.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      data: blockedProfile,
      error: profileBlockError,
    } = await admin
      .from("profiles")
      .update({
        account_status:
          "blocked",

        blocked_at:
          now,

        blocked_by_profile_id:
          authorization.profileId,

        blocked_reason:
          reason,

        updated_at:
          now,
      })
      .eq("id", userId)
      .neq("role", "admin")
      .neq("role", "manager")
      .select("id")
      .maybeSingle();

    if (
      profileBlockError ||
      !blockedProfile
    ) {
      console.error(
        "Profile blocking failed:",
        profileBlockError
      );

      const {
        error: rollbackError,
      } =
        await admin.auth.admin.updateUserById(
          userId,
          {
            ban_duration:
              "none",
          }
        );

      if (rollbackError) {
        console.error(
          "Auth block rollback failed:",
          rollbackError
        );
      }

      return NextResponse.json(
        {
          error:
            "Profilul nu a putut fi blocat. Modificarea autentificării a fost anulată.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        "Utilizatorul a fost blocat.",
    });
  }

  const {
    error: authUnblockError,
  } =
    await admin.auth.admin.updateUserById(
      userId,
      {
        ban_duration:
          "none",
      }
    );

  if (authUnblockError) {
    console.error(
      "Auth user unblocking failed:",
      authUnblockError
    );

    return NextResponse.json(
      {
        error:
          "Contul de autentificare nu a putut fi deblocat.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: unblockedProfile,
    error: profileUnblockError,
  } = await admin
    .from("profiles")
    .update({
      account_status:
        "active",

      blocked_at:
        null,

      blocked_by_profile_id:
        null,

      blocked_reason:
        null,

      updated_at:
        now,
    })
    .eq("id", userId)
    .neq("role", "admin")
      .neq("role", "manager")
    .select("id")
    .maybeSingle();

  if (
    profileUnblockError ||
    !unblockedProfile
  ) {
    console.error(
      "Profile unblocking failed:",
      profileUnblockError
    );

    const {
      error: rollbackError,
    } =
      await admin.auth.admin.updateUserById(
        userId,
        {
          ban_duration:
            "876000h",
        }
      );

    if (rollbackError) {
      console.error(
        "Auth unblock rollback failed:",
        rollbackError
      );
    }

    return NextResponse.json(
      {
        error:
          "Profilul nu a putut fi deblocat. Modificarea autentificării a fost anulată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      "Utilizatorul a fost deblocat.",
  });
}