import { NextRequest, NextResponse } from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    organizationId: string;
  }>;
};

type BillingProfileBody = {
  locale?: unknown;
  contactName?: unknown;
  contactEmail?: unknown;
  contactPhone?: unknown;
  companyName?: unknown;
  taxId?: unknown;
  tradeRegisterNumber?: unknown;
  billingAddress?: unknown;
  billingCity?: unknown;
  billingCounty?: unknown;
  billingCountry?: unknown;
  billingEmail?: unknown;
  isVatPayer?: unknown;
  vatNumber?: unknown;
};


type ApiLocale = "ro" | "en" | "de";

const API_COPY = {
  ro: {
    adminOnly: "Doar Administratorul poate modifica datele de facturare ale organizației.",
    invalidOrganization: "Organizația nu este validă.",
    invalidJson: "Cererea nu conține date JSON valide.",
    required: "Completează toate câmpurile obligatorii de facturare.",
    invalidContactEmail: "Adresa de e-mail a persoanei de contact nu este validă.",
    vatRequired: "Introdu codul de TVA pentru plătitorul de TVA.",
    notFound: "Organizația de clinică nu a fost găsită.",
    billingFailed: "Datele de facturare nu au putut fi salvate.",
    contactFailed: "Datele de facturare au fost salvate, dar persoana de contact nu a putut fi actualizată.",
  },
  en: {
    adminOnly: "Only an Administrator can change the organisation billing details.",
    invalidOrganization: "The organisation is not valid.",
    invalidJson: "The request does not contain valid JSON data.",
    required: "Complete all required billing fields.",
    invalidContactEmail: "The contact email address is not valid.",
    vatRequired: "Enter the VAT number for a VAT-registered organisation.",
    notFound: "The Clinic Organisation was not found.",
    billingFailed: "The billing details could not be saved.",
    contactFailed: "The billing details were saved, but the contact person could not be updated.",
  },
  de: {
    adminOnly: "Nur ein Administrator kann die Rechnungsdaten der Organisation ändern.",
    invalidOrganization: "Die Organisation ist ungültig.",
    invalidJson: "Die Anfrage enthält keine gültigen JSON-Daten.",
    required: "Bitte alle erforderlichen Rechnungsfelder ausfüllen.",
    invalidContactEmail: "Die Kontakt-E-Mail-Adresse ist ungültig.",
    vatRequired: "Bitte die Umsatzsteuer-Identifikationsnummer eingeben.",
    notFound: "Die Klinikorganisation wurde nicht gefunden.",
    billingFailed: "Die Rechnungsdaten konnten nicht gespeichert werden.",
    contactFailed: "Die Rechnungsdaten wurden gespeichert, aber die Kontaktperson konnte nicht aktualisiert werden.",
  },
} as const;

function normalizeLocale(value: unknown): ApiLocale {
  return value === "en" || value === "de" ? value : "ro";
}

function normalizeText(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function optionalText(value: unknown, maximumLength = 500) {
  const text = normalizeText(value, maximumLength);
  return text || null;
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function errorResponse(error: string, status: number) {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;

  let body: BillingProfileBody;
  try {
    body = (await request.json()) as BillingProfileBody;
  } catch {
    return errorResponse(API_COPY.ro.invalidJson, 400);
  }

  const locale = normalizeLocale(body.locale);
  const copy = API_COPY[locale];
  const adminOnly = requireAdministratorCapability(
    authorization.role,
    copy.adminOnly
  );
  if (adminOnly) return adminOnly;

  const { organizationId } = await context.params;
  if (!isUuid(organizationId)) {
    return errorResponse(copy.invalidOrganization, 400);
  }

  const contactName = optionalText(body.contactName, 160);
  const contactEmail = optionalText(body.contactEmail, 320);
  const contactPhone = optionalText(body.contactPhone, 80);
  const companyName = normalizeText(body.companyName, 240);
  const taxId = normalizeText(body.taxId, 80);
  const tradeRegisterNumber = optionalText(body.tradeRegisterNumber, 120);
  const billingAddress = normalizeText(body.billingAddress, 500);
  const billingCity = normalizeText(body.billingCity, 160);
  const billingCounty = normalizeText(body.billingCounty, 160);
  const billingCountry = normalizeText(body.billingCountry, 160);
  const billingEmail = normalizeText(body.billingEmail, 320);
  const isVatPayer = body.isVatPayer === true;
  const vatNumber = optionalText(body.vatNumber, 120);

  if (
    companyName.length < 2 ||
    taxId.length < 2 ||
    billingAddress.length < 5 ||
    billingCity.length < 2 ||
    billingCounty.length < 2 ||
    billingCountry.length < 2 ||
    !isEmail(billingEmail)
  ) {
    return errorResponse(
      copy.required,
      400
    );
  }

  if (contactEmail && !isEmail(contactEmail)) {
    return errorResponse(copy.invalidContactEmail, 400);
  }

  if (isVatPayer && !vatNumber) {
    return errorResponse(copy.vatRequired, 400);
  }

  const admin = createAdminClient();
  const { data: organization, error: organizationError } = await admin
    .from("clinic_organizations")
    .select("id")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationError || !organization) {
    return errorResponse(copy.notFound, 404);
  }

  const { data: billingProfile, error: billingError } = await admin
    .from("clinic_organization_billing_profiles")
    .upsert(
      {
        organization_id: organizationId,
        company_name: companyName,
        tax_id: taxId,
        trade_register_number: tradeRegisterNumber,
        billing_address: billingAddress,
        billing_city: billingCity,
        billing_county: billingCounty,
        billing_country: billingCountry,
        billing_email: billingEmail,
        is_vat_payer: isVatPayer,
        vat_number: isVatPayer ? vatNumber : null,
        updated_by_profile_id: authorization.profileId,
      },
      {
        onConflict: "organization_id",
      }
    )
    .select(
      "organization_id, company_name, tax_id, trade_register_number, billing_address, billing_city, billing_county, billing_country, billing_email, is_vat_payer, vat_number"
    )
    .single();

  if (billingError) {
    console.error("Admin clinic billing profile update failed:", billingError);
    return errorResponse(copy.billingFailed, 500);
  }

  const { data: updatedOrganization, error: contactError } = await admin
    .from("clinic_organizations")
    .update({
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
    })
    .eq("id", organizationId)
    .select("id, contact_name, contact_email, contact_phone")
    .single();

  if (contactError) {
    console.error("Admin clinic organization contact update failed:", contactError);
    return errorResponse(
      copy.contactFailed,
      500
    );
  }

  return NextResponse.json(
    {
      success: true,
      organization: updatedOrganization,
      billingProfile,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
