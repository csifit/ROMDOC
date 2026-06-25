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
  requireAdminAal2Api,
} from "@/lib/auth/require-admin-aal2-api";

export const runtime = "nodejs";

type DoctorActionBody = {
  doctorId?: unknown;
  action?: unknown;
  status?: unknown;
  verificationStatus?: unknown;
  registrationNumber?: unknown;
  verificationExpiresAt?: unknown;
};

type AuthUserMap = Map<
  string,
  {
    email: string | null;
    emailConfirmed: boolean;
  }
>;

function normalizeString(
  value: unknown,
  maximumLength = 500
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

async function listAllAuthUsers(): Promise<AuthUserMap> {
  const admin =
    createAdminClient();

  const authUsers: User[] = [];

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

    authUsers.push(
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
    authUsers.map((user) => [
      user.id,
      {
        email:
          user.email ?? null,
        emailConfirmed:
          Boolean(
            user.email_confirmed_at
          ),
      },
    ])
  );
}

export async function GET(): Promise<Response> {
  const authorization =
    await requireAdminAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const [
    doctorsResult,
    subscriptionsResult,
    clinicLinksResult,
    staffResult,
  ] = await Promise.all([
    admin
      .from("doctors")
      .select(`
        id,
        profile_id,
        slug,
        photo_url,
        phone,
        email,
        years_experience,
        consultation_price,
        status,
        average_rating,
        review_count,
        verification_status,
        professional_registration_number,
        verified_at,
        verified_by_profile_id,
        verification_expires_at,
        created_at,
        updated_at,
        profile:profiles!doctors_profile_id_fkey (
          id,
          first_name,
          last_name,
          role,
          account_status
        ),
        doctor_translations (
          locale,
          title,
          biography
        ),
        doctor_specialties (
          specialties (
            id,
            slug,
            specialty_translations (
              locale,
              name
            )
          )
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),

    admin
      .from("doctor_subscriptions")
      .select(`
        id,
        profile_id,
        doctor_id,
        stripe_customer_id,
        stripe_subscription_id,
        stripe_price_id,
        status,
        billing_interval,
        current_period_start,
        current_period_end,
        cancel_at_period_end,
        canceled_at,
        last_payment_at,
        created_at,
        updated_at
      `),

    admin
      .from("doctor_clinics")
      .select(`
        doctor_id,
        clinic_id
      `),

    admin
      .from("doctor_staff")
      .select(`
        doctor_id,
        status
      `),
  ]);

  if (doctorsResult.error) {
    console.error(
      "Admin doctors query failed:",
      doctorsResult.error
    );

    return NextResponse.json(
      {
        error:
          "Medicii nu au putut fi încărcați.",
      },
      {
        status: 500,
      }
    );
  }

  if (subscriptionsResult.error) {
    console.error(
      "Admin subscriptions query failed:",
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

  if (clinicLinksResult.error) {
    console.error(
      "Admin doctor clinic counts query failed:",
      clinicLinksResult.error
    );

    return NextResponse.json(
      {
        error:
          "Asocierile clinicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  if (staffResult.error) {
    console.error(
      "Admin doctor staff counts query failed:",
      staffResult.error
    );

    return NextResponse.json(
      {
        error:
          "Personalul medicilor nu a putut fi încărcat.",
      },
      {
        status: 500,
      }
    );
  }

  let authUserMap: AuthUserMap;

  try {
    authUserMap =
      await listAllAuthUsers();
  } catch (authError) {
    console.error(
      "Admin doctor auth users query failed:",
      authError
    );

    return NextResponse.json(
      {
        error:
          "Datele de autentificare ale medicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const subscriptionByDoctorId =
    new Map(
      (
        subscriptionsResult.data ??
        []
      )
        .filter(
          (subscription) =>
            Boolean(
              subscription.doctor_id
            )
        )
        .map((subscription) => [
          subscription.doctor_id as string,
          subscription,
        ])
    );

  const subscriptionByProfileId =
    new Map(
      (
        subscriptionsResult.data ??
        []
      ).map((subscription) => [
        subscription.profile_id,
        subscription,
      ])
    );

  const clinicCountByDoctorId =
    new Map<string, number>();

  for (
    const link of
      clinicLinksResult.data ??
      []
  ) {
    clinicCountByDoctorId.set(
      link.doctor_id,
      (
        clinicCountByDoctorId.get(
          link.doctor_id
        ) ?? 0
      ) + 1
    );
  }

  const activeStaffCountByDoctorId =
    new Map<string, number>();

  for (
    const assignment of
      staffResult.data ??
      []
  ) {
    if (
      assignment.status !==
      "active"
    ) {
      continue;
    }

    activeStaffCountByDoctorId.set(
      assignment.doctor_id,
      (
        activeStaffCountByDoctorId.get(
          assignment.doctor_id
        ) ?? 0
      ) + 1
    );
  }

  const doctors =
    (
      doctorsResult.data ??
      []
    ).map((doctor) => {
      const profile =
        Array.isArray(
          doctor.profile
        )
          ? doctor.profile[0] ??
            null
          : doctor.profile;

      const authUser =
        doctor.profile_id
          ? authUserMap.get(
              doctor.profile_id
            )
          : null;

      const subscription =
        subscriptionByDoctorId.get(
          doctor.id
        ) ??
        (
          doctor.profile_id
            ? subscriptionByProfileId.get(
                doctor.profile_id
              )
            : null
        ) ??
        null;

      return {
        ...doctor,

        profile,

        auth_email:
          authUser?.email ??
          doctor.email ??
          null,

        email_verified:
          authUser?.emailConfirmed ??
          false,

        subscription,

        clinic_count:
          clinicCountByDoctorId.get(
            doctor.id
          ) ?? 0,

        active_staff_count:
          activeStaffCountByDoctorId.get(
            doctor.id
          ) ?? 0,
      };
    });

  return NextResponse.json({
    doctors,
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdminAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: DoctorActionBody;

  try {
    body =
      (await request.json()) as
        DoctorActionBody;
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

  const doctorId =
    normalizeString(
      body.doctorId,
      100
    );

  const action =
    normalizeString(
      body.action,
      50
    );

  if (!doctorId) {
    return NextResponse.json(
      {
        error:
          "Medicul lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action !== "set_status" &&
    action !==
      "set_verification"
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

  const admin =
    createAdminClient();

  const {
    data: doctor,
    error: doctorError,
  } = await admin
    .from("doctors")
    .select(`
      id,
      profile_id,
      status,
      verification_status
    `)
    .eq("id", doctorId)
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return NextResponse.json(
      {
        error:
          "Medicul nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  const now =
    new Date().toISOString();

  if (action === "set_status") {
    const status =
      normalizeString(
        body.status,
        50
      );

    const allowedStatuses = [
      "pending",
      "active",
      "suspended",
      "rejected",
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Statutul medicului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: updatedDoctor,
      error: updateError,
    } = await admin
      .from("doctors")
      .update({
        status,
        updated_at: now,
      })
      .eq("id", doctorId)
      .select("id")
      .maybeSingle();

    if (
      updateError ||
      !updatedDoctor
    ) {
      return NextResponse.json(
        {
          error:
            "Statutul medicului nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      message:
        status === "active"
          ? "Medicul a fost activat."
          : status ===
              "suspended"
            ? "Medicul a fost suspendat."
            : status ===
                "rejected"
              ? "Medicul a fost respins."
              : "Medicul a fost trecut în așteptare.",
    });
  }

  const verificationStatus =
    normalizeString(
      body.verificationStatus,
      50
    );

  const registrationNumber =
    normalizeString(
      body.registrationNumber,
      200
    );

  const verificationExpiresAt =
    normalizeString(
      body.verificationExpiresAt,
      100
    );

  const allowedVerificationStatuses = [
    "not_submitted",
    "pending",
    "verified",
    "rejected",
    "expired",
  ];

  if (
    !allowedVerificationStatuses.includes(
      verificationStatus
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Statutul verificării profesionale nu este valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    verificationStatus ===
      "verified" &&
    registrationNumber.length < 2
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu numărul de înregistrare profesională.",
      },
      {
        status: 400,
      }
    );
  }

  let parsedExpiry:
    | string
    | null = null;

  if (verificationExpiresAt) {
    const expiryDate =
      new Date(
        verificationExpiresAt
      );

    if (
      Number.isNaN(
        expiryDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Data expirării verificării nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    parsedExpiry =
      expiryDate.toISOString();
  }

  const isVerified =
    verificationStatus ===
    "verified";

  const {
    data: updatedDoctor,
    error: verificationError,
  } = await admin
    .from("doctors")
    .update({
      verification_status:
        verificationStatus,

      professional_registration_number:
        registrationNumber ||
        null,

      verified_at:
        isVerified
          ? now
          : null,

      verified_by_profile_id:
        isVerified
          ? authorization.profileId
          : null,

      verification_expires_at:
        isVerified
          ? parsedExpiry
          : null,

      updated_at:
        now,
    })
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();

  if (
    verificationError ||
    !updatedDoctor
  ) {
    return NextResponse.json(
      {
        error:
          "Verificarea profesională nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      isVerified
        ? "Medicul a fost verificat profesional."
        : "Statutul verificării profesionale a fost actualizat.",
  });
}