import {
  NextRequest,
  NextResponse,
} from "next/server";
import type {
  User,
} from "@supabase/supabase-js";

import {
  PLATFORM_OPERATOR_DOCTOR_CODES as CODE,
} from "@/lib/api/platform-operator-doctor-codes";
import {
  requirePlatformOperatorAal2Api,
  requireAdministratorCapability,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type DoctorActionBody = {
  doctorId?: unknown;
  action?: unknown;
  status?: unknown;
  accountStatus?: unknown;
  verificationStatus?: unknown;
  registrationNumber?: unknown;
  verificationExpiresAt?: unknown;
  telehealthRestricted?: unknown;
  restrictionReason?: unknown;
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

type ComplimentaryAccessRow = {
  id: string;
  doctor_id: string;
  invitation_id: string | null;
  grant_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
};

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(
  code: string,
  error: string,
  status: number
) {
  return json(
    {
      code,
      error,
    },
    status
  );
}

function success(
  code: string,
  message: string,
  extra: Record<string, unknown> = {}
) {
  return json({
    code,
    message,
    ...extra,
  });
}

function normalizeString(
  value: unknown,
  maximumLength = 500
): string {
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
    complimentaryAccessResult,
    clinicLinksResult,
    staffResult,
    organizationsResult,
    telehealthRestrictionsResult,
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
      `)
      .order("created_at", {
        ascending: false,
      }),
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
      .from("doctor_access_grants")
      .select(`
        id,
        doctor_id,
        invitation_id,
        grant_type,
        status,
        starts_at,
        ends_at,
        created_at,
        updated_at
      `)
      .eq("grant_type", "admin_complimentary")
      .order("created_at", {
        ascending: false,
      }),
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
    admin
      .from("clinic_organizations")
      .select("id, name"),
    admin
      .from("doctor_telehealth_restrictions")
      .select("doctor_id, is_restricted, restriction_reason"),
  ]);

  if (doctorsResult.error) {
    console.error(
      "Admin doctors query failed:",
      doctorsResult.error
    );

    return failure(
      CODE.doctorsLoadFailed,
      "Medicii nu au putut fi încărcați.",
      500
    );
  }

  if (subscriptionsResult.error) {
    console.error(
      "Admin subscriptions query failed:",
      subscriptionsResult.error
    );

    return failure(
      CODE.doctorSubscriptionsLoadFailed,
      "Abonamentele medicilor nu au putut fi încărcate.",
      500
    );
  }

  if (complimentaryAccessResult.error) {
    console.error(
      "Admin doctor complimentary-access query failed:",
      complimentaryAccessResult.error
    );

    return failure(
      CODE.doctorSubscriptionsLoadFailed,
      "Accesul comercial al medicilor nu a putut fi încărcat.",
      500
    );
  }

  if (clinicLinksResult.error) {
    console.error(
      "Admin doctor clinic counts query failed:",
      clinicLinksResult.error
    );

    return failure(
      CODE.doctorClinicLinksLoadFailed,
      "Asocierile clinicilor nu au putut fi încărcate.",
      500
    );
  }

  if (staffResult.error) {
    console.error(
      "Admin doctor staff counts query failed:",
      staffResult.error
    );

    return failure(
      CODE.doctorStaffLoadFailed,
      "Personalul medicilor nu a putut fi încărcat.",
      500
    );
  }

  if (organizationsResult.error) {
    console.error(
      "Admin doctor clinic organizations query failed:",
      organizationsResult.error
    );

    return failure(
      CODE.clinicOrganizationsLoadFailed,
      "Organizațiile clinicilor nu au putut fi încărcate.",
      500
    );
  }

  let authUserMap: AuthUserMap;

  try {
    authUserMap = await listAllAuthUsers();
  } catch (authError) {
    console.error(
      "Admin doctor auth users query failed:",
      authError
    );

    return failure(
      CODE.doctorAuthLoadFailed,
      "Datele de autentificare ale medicilor nu au putut fi încărcate.",
      500
    );
  }

  const subscriptionRows = (subscriptionsResult.data ?? []) as Array<
    SubscriptionRow & Record<string, unknown>
  >;

  const subscriptionByDoctorId = new Map(
    subscriptionRows
      .filter((subscription) => Boolean(subscription.doctor_id))
      .map((subscription) => [
        subscription.doctor_id as string,
        subscription,
      ])
  );

  const subscriptionByProfileId = new Map(
    subscriptionRows
      .filter((subscription) => Boolean(subscription.profile_id))
      .map((subscription) => [
        subscription.profile_id as string,
        subscription,
      ])
  );

  /*
   * The query is ordered newest first. Keeping only the first row per
   * doctor gives Admin the latest Admin-granted complimentary period while
   * preserving expired history in the database.
   */
  const complimentaryAccessByDoctorId =
    new Map<string, ComplimentaryAccessRow>();

  for (
    const grant of
    (complimentaryAccessResult.data ?? []) as ComplimentaryAccessRow[]
  ) {
    if (!complimentaryAccessByDoctorId.has(grant.doctor_id)) {
      complimentaryAccessByDoctorId.set(
        grant.doctor_id,
        grant
      );
    }
  }

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

  const organizations =
    (organizationsResult.data ?? []) as ClinicOrganization[];

  const organizationNameById = new Map(
    organizations.map((organization) => [
      organization.id,
      organization.name,
    ])
  );

  const telehealthRestrictionByDoctorId = new Map(
    (telehealthRestrictionsResult.data ?? []).map((restriction) => [restriction.doctor_id, restriction])
  );

  const doctors = (
    (doctorsResult.data ?? []) as Array<
      DoctorRow & Record<string, unknown>
    >
  ).map((doctor) => {
    const rawProfile = doctor.profile;
    const profile = Array.isArray(rawProfile)
      ? rawProfile[0] ?? null
      : rawProfile ?? null;

    const authUser = doctor.profile_id
      ? authUserMap.get(doctor.profile_id)
      : null;

    const subscription =
      subscriptionByDoctorId.get(doctor.id) ??
      (doctor.profile_id
        ? subscriptionByProfileId.get(doctor.profile_id)
        : null) ??
      null;

    const complimentaryAccess =
      complimentaryAccessByDoctorId.get(doctor.id) ??
      null;

    const canonicalAccountType =
      doctor.account_type ?? "independent";

    const isClinicInvited =
      canonicalAccountType === "clinic_invited";

    const clinicOrganizationName = doctor.clinic_organization_id
      ? organizationNameById.get(doctor.clinic_organization_id) ?? null
      : null;

    return {
      ...doctor,
      profile,
      auth_email: authUser?.email ?? doctor.email ?? null,
      email_verified: authUser?.emailConfirmed ?? false,
      subscription,
      complimentary_access: complimentaryAccess,
      subscription_payer: isClinicInvited ? "clinic" : "doctor",
      clinic_organization_name: clinicOrganizationName,
      clinic_count: clinicCountByDoctorId.get(doctor.id) ?? 0,
      active_staff_count:
        activeStaffCountByDoctorId.get(doctor.id) ?? 0,
      telehealth_admin_restricted:
        telehealthRestrictionByDoctorId.get(doctor.id)?.is_restricted ?? false,
      telehealth_restriction_reason:
        telehealthRestrictionByDoctorId.get(doctor.id)?.restriction_reason ?? null,

      /*
       * The existing Admin component still recognizes the historical display
       * token `clinic_sub_account`. Keep that token only at this presentation
       * boundary while exposing the canonical database value separately.
       * No database value is changed.
       */
      account_type: isClinicInvited
        ? "clinic_sub_account"
        : canonicalAccountType,
      canonical_account_type: canonicalAccountType,
    };
  });

  return json({
    code: CODE.doctorsLoaded,
    doctors,
    operatorRole: authorization.role,
    capabilities: {
      canDeleteDoctors: false,
      canManageDoctors: true,
      canManageVerification: true,
    },
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  let body: DoctorActionBody;

  try {
    body = (await request.json()) as DoctorActionBody;
  } catch {
    return failure(
      CODE.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const doctorId = normalizeString(body.doctorId, 100);
  const action = normalizeString(body.action, 50);

  if (!doctorId) {
    return failure(
      CODE.doctorIdRequired,
      "Medicul lipsește.",
      400
    );
  }

  if (
    action !== "set_status" &&
    action !== "set_account_status" &&
    action !== "set_verification" &&
    action !== "set_telehealth_restriction"
  ) {
    return failure(
      CODE.invalidAction,
      "Acțiunea solicitată nu este validă.",
      400
    );
  }

  const admin = createAdminClient();

  const { data: doctor, error: doctorError } = await admin
    .from("doctors")
    .select(`
      id,
      profile_id,
      status,
      verification_status
    `)
    .eq("id", doctorId)
    .maybeSingle();

  if (doctorError || !doctor) {
    return failure(
      CODE.doctorNotFound,
      "Medicul nu a fost găsit.",
      404
    );
  }

  const now = new Date().toISOString();

  if (action === "set_telehealth_restriction") {
    const capabilityError = requireAdministratorCapability(
      authorization.role,
      "Doar administratorii pot modifica accesul telehealth."
    );
    if (capabilityError) return capabilityError;

    const restricted = body.telehealthRestricted === true;
    const reason = normalizeString(body.restrictionReason, 1000) || null;
    const { error: restrictionError } = await admin
      .from("doctor_telehealth_restrictions")
      .upsert(
        {
          doctor_id: doctorId,
          is_restricted: restricted,
          restricted_at: restricted ? now : null,
          restricted_by_profile_id: restricted ? authorization.profileId : null,
          restriction_reason: restricted ? reason : null,
          updated_at: now,
        },
        { onConflict: "doctor_id" }
      );

    if (restrictionError) {
      console.error("Admin telehealth restriction update failed:", restrictionError);
      return failure("telehealth_restriction_update_failed", "Accesul telehealth nu a putut fi actualizat.", 500);
    }

    await admin.from("telehealth_audit_events").insert({
      doctor_id: doctorId,
      event_type: restricted ? "admin_restricted" : "admin_allowed",
      actor_profile_id: authorization.profileId,
      metadata: reason ? { reason } : {},
    });

    return success(
      restricted ? "telehealth_restricted" : "telehealth_allowed",
      restricted ? "Accesul telehealth al medicului a fost restricționat." : "Accesul telehealth al medicului a fost permis."
    );
  }

  if (action === "set_status") {
    const status = normalizeString(body.status, 50);
    const allowedStatuses = ["active", "suspended"];

    if (!allowedStatuses.includes(status)) {
      return failure(
        CODE.invalidDoctorStatus,
        "Statutul medicului nu este valid.",
        400
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
      return failure(
        CODE.doctorStatusUpdateFailed,
        "Statutul medicului nu a putut fi actualizat.",
        500
      );
    }

    if (doctor.profile_id) {
      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({
          account_status:
            status === "active" ? "active" : "suspended",
          updated_at: now,
        })
        .eq("id", doctor.profile_id);

      if (profileUpdateError) {
        console.error(
          "Doctor profile account status sync failed:",
          profileUpdateError
        );
      }
    }

    return success(
      status === "active"
        ? CODE.doctorReactivated
        : CODE.doctorSuspended,
      status === "active"
        ? "Medicul a fost reactivat."
        : "Medicul a fost suspendat."
    );
  }

  if (action === "set_account_status") {
    if (!doctor.profile_id) {
      return failure(
        CODE.doctorAccountMissing,
        "Medicul nu are un cont de utilizator asociat.",
        409
      );
    }

    const accountStatus = normalizeString(body.accountStatus, 50);
    const allowedAccountStatuses = [
      "active",
      "suspended",
      "blocked",
    ];

    if (!allowedAccountStatuses.includes(accountStatus)) {
      return failure(
        CODE.invalidDoctorAccountStatus,
        "Statutul contului nu este valid.",
        400
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
      return failure(
        CODE.doctorAccountStatusUpdateFailed,
        "Statutul contului nu a putut fi actualizat.",
        500
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
      console.error(
        "Doctor status sync after account status failed:",
        doctorUpdateError
      );
    }

    if (accountStatus === "blocked") {
      return success(
        CODE.doctorAccountBlocked,
        "Contul medicului a fost blocat."
      );
    }

    if (accountStatus === "suspended") {
      return success(
        CODE.doctorAccountSuspended,
        "Contul medicului a fost suspendat."
      );
    }

    return success(
      CODE.doctorAccountReactivated,
      "Contul medicului a fost reactivat."
    );
  }

  const verificationStatus = normalizeString(
    body.verificationStatus,
    50
  );

  const registrationNumber = normalizeString(
    body.registrationNumber,
    200
  );

  const verificationExpiresAt = normalizeString(
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

  if (!allowedVerificationStatuses.includes(verificationStatus)) {
    return failure(
      CODE.invalidProfessionalVerificationStatus,
      "Statutul verificării profesionale nu este valid.",
      400
    );
  }

  if (
    verificationStatus === "verified" &&
    registrationNumber.length < 2
  ) {
    return failure(
      CODE.professionalRegistrationRequired,
      "Introdu numărul de înregistrare profesională.",
      400
    );
  }

  let parsedExpiry: string | null = null;

  if (verificationExpiresAt) {
    const expiryDate = new Date(verificationExpiresAt);

    if (Number.isNaN(expiryDate.getTime())) {
      return failure(
        CODE.professionalVerificationExpiryInvalid,
        "Data expirării verificării nu este validă.",
        400
      );
    }

    parsedExpiry = expiryDate.toISOString();
  }

  const isVerified = verificationStatus === "verified";

  const { data: updatedDoctor, error: verificationError } = await admin
    .from("doctors")
    .update({
      verification_status: verificationStatus,
      professional_registration_number:
        registrationNumber || null,
      verified_at: isVerified ? now : null,
      verified_by_profile_id: isVerified
        ? authorization.profileId
        : null,
      verification_expires_at: isVerified
        ? parsedExpiry
        : null,
      updated_at: now,
    })
    .eq("id", doctorId)
    .select("id")
    .maybeSingle();

  if (verificationError || !updatedDoctor) {
    return failure(
      CODE.professionalVerificationUpdateFailed,
      "Verificarea profesională nu a putut fi actualizată.",
      500
    );
  }

  return success(
    isVerified
      ? CODE.doctorProfessionallyVerified
      : CODE.professionalVerificationUpdated,
    isVerified
      ? "Medicul a fost verificat profesional."
      : "Statutul verificării profesionale a fost actualizat."
  );
}
