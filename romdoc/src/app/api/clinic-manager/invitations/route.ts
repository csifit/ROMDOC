import crypto from "node:crypto";

import {
  NextRequest,
} from "next/server";

import {
  CLINIC_ORGANIZATION_API_CODES,
  type ClinicOrganizationApiCode,
} from "@/lib/api/clinic-organization-api-codes";
import {
  stableApiError,
  stableApiSuccess,
} from "@/lib/api/stable-api-response";
import {
  sendClinicDoctorInvitationEmail,
} from "@/lib/clinic-organizations/clinic-doctor-invitation-email";
import {
  getClinicOrganizationApiMessage,
} from "@/lib/i18n/clinic-organization-api-copy";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type InvitationRequestBody = {
  organizationId?:
    unknown;
  doctorEmail?:
    unknown;
  locale?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength =
    500
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
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

function createInvitationToken() {
  return crypto
    .randomBytes(
      32
    )
    .toString(
      "base64url"
    );
}

function hashInvitationToken(
  token: string
) {
  return crypto
    .createHash(
      "sha256"
    )
    .update(
      token
    )
    .digest(
      "hex"
    );
}

function apiError(
  locale: AppLocale,
  code:
    ClinicOrganizationApiCode,
  status: number
) {
  return stableApiError(
    code,
    getClinicOrganizationApiMessage(
      locale,
      code
    ),
    status
  );
}

export async function POST(
  request:
    NextRequest
): Promise<Response> {
  let body:
    InvitationRequestBody;

  try {
    body =
      (await request
        .json()) as
        InvitationRequestBody;
  } catch {
    const locale =
      getRequestAppLocale(
        request
      );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .invalidJson,
      400
    );
  }

  const locale =
    getRequestAppLocale(
      request,
      body.locale
    );

  const organizationId =
    normalizeString(
      body.organizationId,
      100
    );

  const doctorEmail =
    normalizeEmail(
      body.doctorEmail
    );

  if (!organizationId) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationRequired,
      400
    );
  }

  if (
    !isValidEmail(
      doctorEmail
    )
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .doctorEmailInvalid,
      400
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .authenticationRequired,
      401
    );
  }

  const admin =
    createAdminClient();

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await admin
      .from(
        "profiles"
      )
      .select(
        "role, account_status"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "clinic_manager"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .clinicManagerRequired,
      403
    );
  }

  if (
    profile.account_status !==
      "active"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .activeManagerRequired,
      403
    );
  }

  const {
    data:
      membership,
    error:
      membershipError,
  } =
    await admin
      .from(
        "clinic_organization_members"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      )
      .maybeSingle();

  if (
    membershipError ||
    !membership
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationAccessDenied,
      403
    );
  }

  const {
    data:
      organization,
    error:
      organizationError,
  } =
    await admin
      .from(
        "clinic_organizations"
      )
      .select(
        "id, name, status"
      )
      .eq(
        "id",
        organizationId
      )
      .maybeSingle();

  if (
    organizationError ||
    !organization
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationNotFound,
      404
    );
  }

  if (
    organization.status !==
      "active"
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .organizationNotActive,
      409
    );
  }

  const {
    data:
      existingInvitation,
    error:
      existingInvitationError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .select(
        "id"
      )
      .eq(
        "organization_id",
        organizationId
      )
      .eq(
        "invited_doctor_email",
        doctorEmail
      )
      .in(
        "invitation_status",
        [
          "pending",
          "accepted",
        ]
      )
      .maybeSingle();

  if (
    existingInvitationError
  ) {
    console.error(
      "Existing clinic Doctor invitation query failed:",
      existingInvitationError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .invitationCheckFailed,
      500
    );
  }

  if (
    existingInvitation
  ) {
    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .invitationAlreadyExists,
      409
    );
  }

  const invitationToken =
    createInvitationToken();

  const invitationTokenHash =
    hashInvitationToken(
      invitationToken
    );

  const expiresAt =
    new Date();

  expiresAt.setDate(
    expiresAt.getDate() +
      30
  );

  const baseUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL ??
    request.nextUrl
      .origin;

  const inviteUrl =
    new URL(
      "/clinic-doctor-register",
      baseUrl
    );

  inviteUrl.searchParams
    .set(
      "token",
      invitationToken
    );

  inviteUrl.searchParams
    .set(
      "email",
      doctorEmail
    );

  inviteUrl.searchParams
    .set(
      "locale",
      locale
    );

  const {
    data:
      invitation,
    error:
      invitationError,
  } =
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .insert({
        organization_id:
          organizationId,
        invited_doctor_email:
          doctorEmail,
        invitation_token_hash:
          invitationTokenHash,
        invitation_status:
          "pending",
        payment_responsibility:
          "clinic_paid",
        coverage_status:
          "none",
        invited_by_profile_id:
          user.id,
        expires_at:
          expiresAt
            .toISOString(),
      })
      .select(`
        id,
        organization_id,
        invited_doctor_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        expires_at,
        created_at
      `)
      .maybeSingle();

  if (
    invitationError ||
    !invitation
  ) {
    console.error(
      "Clinic Doctor invitation insert failed:",
      invitationError
    );

    return apiError(
      locale,
      CLINIC_ORGANIZATION_API_CODES
        .invitationCreateFailed,
      500
    );
  }

  const emailResult =
    await sendClinicDoctorInvitationEmail({
      doctorEmail,
      organizationName:
        organization.name,
      inviteUrl:
        inviteUrl.toString(),
      locale,
    });

  const code =
    emailResult.sent
      ? CLINIC_ORGANIZATION_API_CODES
          .invitationSent
      : CLINIC_ORGANIZATION_API_CODES
          .invitationCreatedEmailFailed;

  return stableApiSuccess(
    code,
    {
      message:
        getClinicOrganizationApiMessage(
          locale,
          code
        ),
      invitation,
      inviteUrl:
        inviteUrl.toString(),
      emailSent:
        emailResult.sent,
      emailError:
        emailResult.error,
    },
    201
  );
}
