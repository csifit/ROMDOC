import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createUniqueClinicOrganizationSlug,
  validateClinicOrganizationInvitationInput,
} from "@/lib/admin/clinic-organization-invitations";
import {
  validateAdminClinicOrganizationOnboardingInput,
} from "@/lib/admin/clinic-organization-onboarding";
import {
  createClinicOrganizationInvitation,
} from "@/lib/admin/create-clinic-organization-invitation";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot crea organizații clinice."
  );

  if (adminOnly) {
    return adminOnly;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        code: "clinic_organization_onboarding_invalid_json",
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const validation =
    validateAdminClinicOrganizationOnboardingInput(body);

  if (!validation.ok) {
    return json(
      {
        code: "clinic_organization_onboarding_invalid_payload",
        error: validation.error,
        field: validation.field ?? null,
      },
      400
    );
  }

  const input = validation.value;
  const organizationId = crypto.randomUUID();

  let organizationSlug: string;

  try {
    organizationSlug = await createUniqueClinicOrganizationSlug(
      input.organizationName,
      organizationId
    );
  } catch (slugError) {
    console.error(
      "Admin Clinic Organisation slug creation failed:",
      slugError
    );

    return json(
      {
        code: "clinic_organization_onboarding_slug_failed",
        error: "Organizația nu a putut fi pregătită.",
      },
      500
    );
  }

  const managerName = [
    input.managerFirstName,
    input.managerLastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const contactName = input.contactName ?? managerName;
  const contactEmail = input.contactEmail ?? input.managerEmail;
  const contactPhone = input.contactPhone ?? input.managerPhone;
  const now = new Date().toISOString();

  const admin = createAdminClient();

  const {
    data: organization,
    error: organizationError,
  } = await admin
    .from("clinic_organizations")
    .insert({
      id: organizationId,
      name: input.organizationName,
      slug: organizationSlug,
      status: "active",
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      website: input.website,
      admin_notes:
        "Creat de Administrator prin fluxul de onboarding asistat.",
      created_by_profile_id: authorization.profileId,
      approved_by_profile_id: authorization.profileId,
      approved_at: now,
    })
    .select(`
      id,
      name,
      slug,
      status,
      contact_name,
      contact_email,
      contact_phone,
      website,
      created_at,
      approved_at
    `)
    .single();

  if (organizationError || !organization) {
    console.error(
      "Admin Clinic Organisation creation failed:",
      organizationError
    );

    return json(
      {
        code: "clinic_organization_onboarding_create_failed",
        error: "Organizația nu a putut fi creată.",
      },
      500
    );
  }

  const {
    data: billingProfile,
    error: billingError,
  } = await admin
    .from("clinic_organization_billing_profiles")
    .insert({
      organization_id: organization.id,
      company_name: input.billing.companyName,
      tax_id: input.billing.taxId,
      trade_register_number: input.billing.tradeRegisterNumber,
      billing_address: input.billing.billingAddress,
      billing_city: input.billing.billingCity,
      billing_county: input.billing.billingCounty,
      billing_country: input.billing.billingCountry,
      billing_email: input.billing.billingEmail,
      is_vat_payer: input.billing.isVatPayer,
      vat_number: input.billing.vatNumber,
      created_by_profile_id: authorization.profileId,
      updated_by_profile_id: authorization.profileId,
    })
    .select(`
      organization_id,
      company_name,
      tax_id,
      trade_register_number,
      billing_address,
      billing_city,
      billing_county,
      billing_country,
      billing_email,
      is_vat_payer,
      vat_number
    `)
    .single();

  if (billingError || !billingProfile) {
    console.error(
      "Admin Clinic Organisation onboarding billing creation failed:",
      billingError
    );

    return json(
      {
        success: true,
        organizationCreated: true,
        billingCreated: false,
        invitationSent: false,
        organization,
        code: "clinic_organization_onboarding_billing_failed",
        warning:
          "Organizația a fost creată, dar datele de facturare nu au putut fi salvate. Invitația managerului nu a fost trimisă.",
      },
      201
    );
  }

  const invitationValidation =
    validateClinicOrganizationInvitationInput({
      organizationName: input.organizationName,
      email: input.managerEmail,
      firstName: input.managerFirstName,
      lastName: input.managerLastName,
      phone: input.managerPhone,
      locale: input.invitationLocale,
      personalMessage: input.personalMessage,
      trialMonths: input.trialMonths,
      organizationId: organization.id,
    });

  if (!invitationValidation.ok) {
    console.error(
      "Admin Clinic Organisation invitation validation failed after organization setup:",
      invitationValidation
    );

    return json(
      {
        success: true,
        organizationCreated: true,
        billingCreated: true,
        invitationSent: false,
        organization,
        billingProfile,
        code:
          "clinic_organization_onboarding_invitation_validation_failed",
        warning:
          "Organizația și facturarea au fost create, dar invitația managerului nu a putut fi pregătită.",
      },
      201
    );
  }

  const invitationResult =
    await createClinicOrganizationInvitation({
      actorProfileId: authorization.profileId,
      input: invitationValidation.value,
    });

  if (!invitationResult.ok) {
    return json(
      {
        success: true,
        organizationCreated: true,
        billingCreated: true,
        invitationSent: false,
        organization,
        billingProfile,
        invitationId: invitationResult.invitationId ?? null,
        code: invitationResult.code,
        warning:
          `Organizația și facturarea au fost create, dar fluxul invitației managerului nu a fost finalizat. ${invitationResult.error}`,
      },
      201
    );
  }

  return json(
    {
      success: true,
      organizationCreated: true,
      billingCreated: true,
      invitationSent: true,
      organization,
      billingProfile,
      invitation: invitationResult.invitation,
      code: "clinic_organization_onboarding_created",
      message:
        "Organizația și facturarea au fost create, iar invitația managerului a fost trimisă.",
    },
    201
  );
}
