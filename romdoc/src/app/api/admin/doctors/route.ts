import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import { requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DoctorActionBody = {
  doctorId?: unknown;
  action?: unknown;
  status?: unknown;
  accountStatus?: unknown;
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

type ClinicOrganization = {
  id: string;
  name: string;
};

type DoctorRow = {
  id: string;
  profile_id: string | null;
  account_type?: string | null;
  clinic_organization_id?: string | null;
};

type SubscriptionRow = {
  profile_id: string | null;
  doctor_id: string | null;
};

function normalizeString(value: unknown, maximumLength = 500): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

async function listAllAuthUsers(): Promise<AuthUserMap> {
  const admin = createAdminClient();
  const authUsers: User[] = [];
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

    authUsers.push(...data.users);

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  return new Map(
    authUsers.map((user) => [
      user.id,
      {
        email: user.email ?? null,
        emailConfirmed: Boolean(user.email_confirmed_at),
      },
    ])
  );
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const admin = createAdminClient();

  const [
    doctorsResult,
    subscriptionsResult,
    clinicLinksResult,
    staffResult,
    organizationsResult,
  ] = await Promise.all([
    admin
      .from("doctors")
      .select(
        `
        id,
        profile_id,
        slug,
        photo_url,
        phone,
        email,
        years_experience,
        consultation_price,
        status,
        account_type,
        clinic_organization_id,
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
      `
      )
      .order("created_at", {
        ascending: false,
      }),

    admin.from("doctor_subscriptions").select(
      `
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
      `
    ),

    admin.from("doctor_clinics").select(
      `
        doctor_id,
        clinic_id
      `
    ),

    admin.from("doctor_staff").select(
      `
        doctor_id,
        status
      `
    ),

    admin.from("clinic_organizations").select("id, name"),
  ]);

  if (doctorsResult.error) {
    console.error("Admin doctors query failed:", doctorsResult.error);

    return NextResponse.json(
      {
        error: "Medicii nu au putut fi încărcați.",
      },
      {
        status: 500,
      }
    );
  }

  if (subscriptionsResult.error) {
    console.error("Admin subscriptions query failed:", subscriptionsResult.error);

    return NextResponse.json(
      {
        error: "Abonamentele medicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  if (clinicLinksResult.error) {
    console.error("Admin doctor clinic counts query failed:", clinicLinksResult.error);

    return NextResponse.json(
      {
        error: "Asocierile clinicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  if (staffResult.error) {
    console.error("Admin doctor staff counts query failed:", staffResult.error);

    return NextResponse.json(
      {
        error: "Personalul medicilor nu a putut fi încărcat.",
      },
      {
        status: 500,
      }
    );
  }

  if (organizationsResult.error) {
    console.error(
      "Admin doctor clinic organizations query failed:",
      organizationsResult.error
    );

    return NextResponse.json(
      {
        error: "Organizațiile clinicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  let authUserMap: AuthUserMap;

  try {
    authUserMap = await listAllAuthUsers();
  } catch (authError) {
    console.error("Admin doctor auth users query failed:", authError);

    return NextResponse.json(
      {
        error: "Datele de autentificare ale medicilor nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const subscriptionRows =
    (subscriptionsResult.data ?? []) as Array<SubscriptionRow & Record<string, unknown>>;

  const subscriptionByDoctorId = new Map(
    subscriptionRows
      .filter((subscription) => Boolean(subscription.doctor_id))
      .map((subscription) => [subscription.doctor_id as string, subscription])
  );

  const subscriptionByProfileId = new Map(
    subscriptionRows
      .filter((subscription) => Boolean(subscription.profile_id))
      .map((subscription) => [subscription.profile_id as string, subscription])
  );

  const clinicCountByDoctorId = new Map<string, number>();

  for (const link of clinicLinksResult.data ?? []) {
    clinicCountByDoctorId.set(
      link.doctor_id,
      (clinicCountByDoctorId.get(link.doctor_id) ?? 0) + 1
    );
  }

  const activeStaffCountByDoctorId = new Map<string, number>();

  for (const assignment of staffResult.data ?? []) {
    if (assignment.status !== "active") {
      continue;
    }

    activeStaffCountByDoctorId.set(
      assignment.doctor_id,
      (activeStaffCountByDoctorId.get(assignment.doctor_id) ?? 0) + 1
    );
  }

  const organizations = (organizationsResult.data ?? []) as ClinicOrganization[];
  const organizationNameById = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  );

  const doctors = ((doctorsResult.data ?? []) as Array<DoctorRow & Record<string, unknown>>).map(
    (doctor) => {
      const rawProfile = doctor.profile;
      const profile = Array.isArray(rawProfile) ? rawProfile[0] ?? null : rawProfile ?? null;

      const authUser = doctor.profile_id ? authUserMap.get(doctor.profile_id) : null;

      const subscription =
        subscriptionByDoctorId.get(doctor.id) ??
        (doctor.profile_id ? subscriptionByProfileId.get(doctor.profile_id) : null) ??
        null;

      const isClinicSubAccount = doctor.account_type === "clinic_sub_account";
      const clinicOrganizationName = doctor.clinic_organization_id
        ? organizationNameById.get(doctor.clinic_organization_id) ?? null
        : null;

      return {
        ...doctor,
        profile,
        auth_email: authUser?.email ?? doctor.email ?? null,
        email_verified: authUser?.emailConfirmed ?? false,
        subscription,
        subscription_payer: isClinicSubAccount ? "clinic" : "doctor",
        clinic_organization_name: clinicOrganizationName,
        clinic_count: clinicCountByDoctorId.get(doctor.id) ?? 0,
        active_staff_count: activeStaffCountByDoctorId.get(doctor.id) ?? 0,
      };
    }
  );

  return NextResponse.json({
    doctors,
    operatorRole: authorization.role,
    capabilities: {
      canDeleteDoctors: false,
      canManageDoctors: true,
      canManageVerification: true,
    },
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: DoctorActionBody;

  try {
    body = (await request.json()) as DoctorActionBody;
  } catch {
    return NextResponse.json(
      {
        error: "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const doctorId = normalizeString(body.doctorId, 100);
  const action = normalizeString(body.action, 50);

  if (!doctorId) {
    return NextResponse.json(
      {
        error: "Medicul lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  if (
    action !== "set_status" &&
    action !== "set_account_status" &&
    action !== "set_verification"
  ) {
    return NextResponse.json(
      {
        error: "Acțiunea solicitată nu este validă.",
      },
      {
        status: 400,
      }
    );
  }

  const admin = createAdminClient();

  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select(
      `
        id,
        profile_id,
        status,
        verification_status
      `
    )
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError || !doctor) {
    return NextResponse.json(
      {
        error: "Medicul nu a fost găsit.",
      },
      {
        status: 404,
      }
    );
  }

  const now = new Date().toISOString();

  if (action === "set_status") {
    const status = normalizeString(body.status, 50);
    const allowedStatuses = ["active", "suspended"];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: "Statutul medicului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: updatedDoctor, error: updateError } = await admin
      .from("doctors")
      .update({
        status,
        updated_at: now,
      })
      .eq("id", doctorId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedDoctor) {
      return NextResponse.json(
        {
          error: "Statutul medicului nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }

    if (doctor.profile_id) {
      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({
          account_status: status === "active" ? "active" : "suspended",
          updated_at: now,
        })
        .eq("id", doctor.profile_id);

      if (profileUpdateError) {
        console.error("Doctor profile account status sync failed:", profileUpdateError);
      }
    }

    return NextResponse.json({
      message:
        status === "active"
          ? "Medicul a fost reactivat."
          : "Medicul a fost suspendat.",
    });
  }

  if (action === "set_account_status") {
    if (!doctor.profile_id) {
      return NextResponse.json(
        {
          error: "Medicul nu are un cont de utilizator asociat.",
        },
        {
          status: 409,
        }
      );
    }

    const accountStatus = normalizeString(body.accountStatus, 50);
    const allowedAccountStatuses = ["active", "suspended", "blocked"];

    if (!allowedAccountStatuses.includes(accountStatus)) {
      return NextResponse.json(
        {
          error: "Statutul contului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const { error: profileUpdateError } = await admin
      .from("profiles")
      .update({
        account_status: accountStatus,
        updated_at: now,
      })
      .eq("id", doctor.profile_id);

    if (profileUpdateError) {
      return NextResponse.json(
        {
          error: "Statutul contului nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }

    const { error: doctorUpdateError } = await admin
      .from("doctors")
      .update({
        status: accountStatus === "active" ? "active" : "suspended",
        updated_at: now,
      })
      .eq("id", doctorId);

    if (doctorUpdateError) {
      console.error("Doctor status sync after account status failed:", doctorUpdateError);
    }

    return NextResponse.json({
      message:
        accountStatus === "blocked"
          ? "Contul medicului a fost blocat."
          : accountStatus === "suspended"
            ? "Contul medicului a fost suspendat."
            : "Contul medicului a fost reactivat.",
    });
  }

  const verificationStatus = normalizeString(body.verificationStatus, 50);
  const registrationNumber = normalizeString(body.registrationNumber, 200);
  const verificationExpiresAt = normalizeString(body.verificationExpiresAt, 100);

  const allowedVerificationStatuses = [
    "not_submitted",
    "pending",
    "verified",
    "rejected",
    "expired",
  ];

  if (!allowedVerificationStatuses.includes(verificationStatus)) {
    return NextResponse.json(
      {
        error: "Statutul verificării profesionale nu este valid.",
      },
      {
        status: 400,
      }
    );
  }

  if (verificationStatus === "verified" && registrationNumber.length < 2) {
    return NextResponse.json(
      {
        error: "Introdu numărul de înregistrare profesională.",
      },
      {
        status: 400,
      }
    );
  }

  let parsedExpiry: string | null = null;

  if (verificationExpiresAt) {
    const expiryDate = new Date(verificationExpiresAt);

    if (Number.isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        {
          error: "Data expirării verificării nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    parsedExpiry = expiryDate.toISOString();
  }

  const isVerified = verificationStatus === "verified";

  const { data: updatedDoctor, error: verificationError } = await admin
    .from("doctors")
    .update({
      verification_status: verificationStatus,
      professional_registration_number: registrationNumber || null,
      verified_at: isVerified ? now : null,
      verified_by_profile_id: isVerified ? authorization.profileId : null,
      verification_expires_at: isVerified ? parsedExpiry : null,
      updated_at: now,
    })
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();

  if (verificationError || !updatedDoctor) {
    return NextResponse.json(
      {
        error: "Verificarea profesională nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message: isVerified
      ? "Medicul a fost verificat profesional."
      : "Statutul verificării profesionale a fost actualizat.",
  });
}
