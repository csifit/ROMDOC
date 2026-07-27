import { isIP } from "node:net";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getContractAcceptanceCheckboxText,
  getContractRepresentativeCapacity,
  type ContractClientType,
} from "@/lib/contracts/contract-acceptance-copy";
import {
  executeContractAcceptance,
} from "@/lib/contracts/contract-acceptance-service";
import {
  requireDoctorAccountByProfileId,
  requireIndependentDoctorAccount,
} from "@/lib/doctors/doctor-account-type";
import {
  normalizeAppLocale,
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_COPY: Record<
  AppLocale,
  Record<string, string>
> = {
  ro: {
    unauthenticated: "Trebuie să fiți autentificat.",
    invalidRequest: "Cererea de acceptare nu este validă.",
    forbidden: "Nu aveți dreptul să acceptați acest contract.",
    unavailable: "Contractul nu mai este disponibil pentru acceptare.",
    billingIncomplete:
      "Completați datele juridice și de facturare înainte de acceptarea contractului.",
    serverError:
      "Acceptarea contractului nu a putut fi înregistrată.",
  },
  en: {
    unauthenticated: "You must be signed in.",
    invalidRequest: "The acceptance request is invalid.",
    forbidden: "You are not authorised to accept this contract.",
    unavailable: "The contract is no longer available for acceptance.",
    billingIncomplete:
      "Complete the legal and billing details before accepting the contract.",
    serverError: "The contract acceptance could not be recorded.",
  },
  de: {
    unauthenticated: "Sie müssen angemeldet sein.",
    invalidRequest: "Die Annahmeanfrage ist ungültig.",
    forbidden: "Sie dürfen diesen Vertrag nicht annehmen.",
    unavailable: "Der Vertrag steht nicht mehr zur Annahme bereit.",
    billingIncomplete:
      "Vervollständigen Sie vor der Annahme die Rechts- und Rechnungsdaten.",
    serverError: "Die Vertragsannahme konnte nicht erfasst werden.",
  },
};

type AssignmentRow = {
  id: string;
  package_id: string;
  client_type: ContractClientType;
  doctor_id: string | null;
  clinic_organization_id: string | null;
  status: string;
  acceptance_required: boolean;
};

type PackageRow = {
  id: string;
  title: string;
  version: string;
  locale: AppLocale;
};

type ProfileRow = {
  role: string;
  account_status: string;
  first_name: string | null;
  last_name: string | null;
};

function fullName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
) {
  const value = [firstName, lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return value || fallback;
}

function nonEmpty(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function validEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

function requestIp(request: NextRequest) {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const direct = request.headers.get("x-real-ip")?.trim();
  const value = forwarded || direct || "";

  return isIP(value) > 0 ? value : null;
}

function jsonError(
  locale: AppLocale,
  code: string,
  status: number,
  redirectTo?: string
) {
  return NextResponse.json(
    {
      error:
        ERROR_COPY[locale][code] ??
        ERROR_COPY[locale].serverError,
      code,
      redirectTo: redirectTo ?? null,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("ro", "unauthenticated", 401);
  }

  let body: {
    assignmentId?: unknown;
    accepted?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError("ro", "invalidRequest", 400);
  }

  const assignmentId =
    typeof body.assignmentId === "string"
      ? body.assignmentId.trim()
      : "";

  if (
    !UUID_PATTERN.test(assignmentId) ||
    body.accepted !== true
  ) {
    return jsonError("ro", "invalidRequest", 400);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role, account_status, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  const profile = profileData as ProfileRow | null;

  if (!profile || profile.account_status !== "active") {
    return jsonError("ro", "forbidden", 403);
  }

  const { data: mayAccess } = await supabase.rpc(
    "can_access_contract_assignment",
    {
      target_assignment_id: assignmentId,
    }
  );

  if (!mayAccess) {
    return jsonError("ro", "forbidden", 403);
  }

  const admin = createAdminClient();

  const { data: assignmentData, error: assignmentError } =
    await admin
      .from("client_contract_assignments")
      .select(`
        id,
        package_id,
        client_type,
        doctor_id,
        clinic_organization_id,
        status,
        acceptance_required
      `)
      .eq("id", assignmentId)
      .maybeSingle();

  if (assignmentError || !assignmentData) {
    return jsonError("ro", "unavailable", 404);
  }

  const assignment =
    assignmentData as unknown as AssignmentRow;

  const { data: packageData, error: packageError } =
    await admin
      .from("contract_packages")
      .select("id, title, version, locale")
      .eq("id", assignment.package_id)
      .maybeSingle();

  if (packageError || !packageData) {
    return jsonError("ro", "unavailable", 409);
  }

  const contractPackage =
    packageData as unknown as PackageRow;
  const locale = normalizeAppLocale(
    contractPackage.locale
  );

  if (
    !assignment.acceptance_required ||
    ![
      "assigned",
      "notified",
      "awaiting_acceptance",
      "accepted",
    ].includes(assignment.status)
  ) {
    return jsonError(locale, "unavailable", 409);
  }

  const representativeName = fullName(
    profile.first_name,
    profile.last_name,
    user.email?.split("@")[0] ?? "RomDoc user"
  );

  let representedEntityName = "";
  let representativeCapacity = "";
  let representedEntitySnapshot: Record<
    string,
    unknown
  > = {};
  let recipientEmail = user.email ?? "";
  let redirectTo = "";

  if (
    assignment.client_type === "independent_doctor"
  ) {
    if (
      profile.role !== "doctor" ||
      !assignment.doctor_id
    ) {
      return jsonError(locale, "forbidden", 403);
    }

    try {
      const doctorAccount =
        requireIndependentDoctorAccount(
          await requireDoctorAccountByProfileId(
            supabase,
            user.id
          )
        );

      if (
        doctorAccount.doctorId !==
        assignment.doctor_id
      ) {
        return jsonError(locale, "forbidden", 403);
      }
    } catch {
      return jsonError(locale, "forbidden", 403);
    }

    const { data: billingData } = await admin
      .from("doctor_billing_profiles")
      .select(`
        entity_type,
        legal_name,
        cui,
        trade_registry_number,
        vat_payer,
        billing_address,
        county,
        city,
        postal_code,
        country,
        billing_email
      `)
      .eq("doctor_id", assignment.doctor_id)
      .maybeSingle();

    redirectTo = "/doctor-dashboard/billing";

    if (
      !billingData ||
      !nonEmpty(billingData.legal_name) ||
      !nonEmpty(billingData.billing_address) ||
      !validEmail(billingData.billing_email)
    ) {
      return jsonError(
        locale,
        "billingIncomplete",
        409,
        redirectTo
      );
    }

    representedEntityName = billingData.legal_name.trim();
    recipientEmail = validEmail(user.email)
      ? user.email.trim()
      : billingData.billing_email.trim();
    representativeCapacity =
      getContractRepresentativeCapacity(
        locale,
        assignment.client_type,
        billingData.entity_type
      );

    representedEntitySnapshot = {
      clientType: assignment.client_type,
      doctorId: assignment.doctor_id,
      profileId: user.id,
      doctorName: representativeName,
      entityType: billingData.entity_type,
      legalName: representedEntityName,
      taxId: billingData.cui,
      tradeRegisterNumber:
        billingData.trade_registry_number,
      vatPayer: billingData.vat_payer,
      billingAddress: billingData.billing_address,
      county: billingData.county,
      city: billingData.city,
      postalCode: billingData.postal_code,
      country: billingData.country,
      billingEmail: billingData.billing_email.trim(),
      accountEmail: recipientEmail,
    };
  } else {
    if (
      profile.role !== "clinic_manager" ||
      !assignment.clinic_organization_id
    ) {
      return jsonError(locale, "forbidden", 403);
    }

    const { data: membershipData } = await admin
      .from("clinic_organization_members")
      .select("member_role, status, can_sign_contracts")
      .eq(
        "organization_id",
        assignment.clinic_organization_id
      )
      .eq("profile_id", user.id)
      .maybeSingle();

    if (
      !membershipData ||
      membershipData.status !== "active" ||
      membershipData.can_sign_contracts !== true
    ) {
      return jsonError(locale, "forbidden", 403);
    }

    const [organizationResult, billingResult] =
      await Promise.all([
        admin
          .from("clinic_organizations")
          .select("id, name, contact_email")
          .eq("id", assignment.clinic_organization_id)
          .maybeSingle(),
        admin
          .from("clinic_organization_billing_profiles")
          .select(`
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
          .eq(
            "organization_id",
            assignment.clinic_organization_id
          )
          .maybeSingle(),
      ]);

    const organization = organizationResult.data;
    const billing = billingResult.data;
    redirectTo = "/clinic-manager-dashboard/billing";

    if (
      !organization ||
      !billing ||
      !nonEmpty(billing.company_name) ||
      !nonEmpty(billing.tax_id) ||
      !nonEmpty(billing.billing_address) ||
      !validEmail(billing.billing_email)
    ) {
      return jsonError(
        locale,
        "billingIncomplete",
        409,
        redirectTo
      );
    }

    representedEntityName = billing.company_name.trim();
    recipientEmail = validEmail(user.email)
      ? user.email.trim()
      : billing.billing_email.trim();
    representativeCapacity =
      getContractRepresentativeCapacity(
        locale,
        assignment.client_type,
        membershipData.member_role
      );

    representedEntitySnapshot = {
      clientType: assignment.client_type,
      organizationId:
        assignment.clinic_organization_id,
      organizationDisplayName: organization.name,
      legalName: representedEntityName,
      taxId: billing.tax_id,
      tradeRegisterNumber:
        billing.trade_register_number,
      billingAddress: billing.billing_address,
      billingCity: billing.billing_city,
      billingCounty: billing.billing_county,
      billingCountry: billing.billing_country,
      billingEmail: billing.billing_email.trim(),
      accountEmail: recipientEmail,
      vatPayer: billing.is_vat_payer,
      vatNumber: billing.vat_number,
      acceptedByProfileId: user.id,
      memberRole: membershipData.member_role,
      canSignContracts: true,
    };
  }

  const checkboxText =
    getContractAcceptanceCheckboxText(
      locale,
      assignment.client_type
    );

  try {
    const result = await executeContractAcceptance({
      admin,
      assignmentId,
      acceptedByProfileId: user.id,
      representedEntityName,
      representativeName,
      representativeCapacity,
      representedEntitySnapshot,
      checkboxText,
      ipAddress: requestIp(request),
      userAgent: request.headers
        .get("user-agent")
        ?.slice(0, 2000) ?? null,
      recipientEmail,
      recipientName: representativeName,
      clientType: assignment.client_type,
    });

    return NextResponse.json(
      {
        ok: true,
        acceptanceId: result.acceptanceId,
        pdfStatus: result.pdfStatus,
        pdfFileName: result.pdfFileName,
        emailStatus: result.emailStatus,
        warnings: result.warnings,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Contract electronic acceptance failed:",
      error
    );

    return jsonError(locale, "serverError", 500);
  }
}
