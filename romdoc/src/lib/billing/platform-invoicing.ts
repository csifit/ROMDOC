import type { AppLocale } from "@/lib/i18n/app-locale";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformBillingCurrency = "RON" | "EUR";

export type PlatformVatTreatment =
  | "domestic"
  | "reverse_charge"
  | "outside_scope"
  | "exempt"
  | "custom";

export type PlatformVatValidationStatus =
  | "not_checked"
  | "valid"
  | "invalid"
  | "unavailable";

export type PlatformBillingRates = {
  subscriptionPriceRon: number;
  /**
   * Compatibility field.
   * SMS is included in the subscription/package and is not billed separately.
   */
  smsPriceRon: number;
  vatRate: number;
  updatedAt: string | null;
  updatedByProfileId: string | null;
};

export type PlatformBillingDetails = {
  legalName: string | null;
  taxId: string | null;
  tradeRegisterNumber: string | null;
  billingEmail: string | null;
  billingAddress: string | null;
  country: string | null;
  vatNumber: string | null;
  vatPayer: boolean | null;
};

export type PlatformInvoiceClientType =
  | "independent_doctor"
  | "clinic_organization";

export type PlatformClientBillingTerms = {
  id: string;
  clientType: PlatformInvoiceClientType;
  clientId: string;
  subscriptionUnitPrice: number | null;
  /**
   * Legacy compatibility field. It is ignored by invoice calculations.
   */
  smsUnitPrice: number | null;
  currency: PlatformBillingCurrency;
  vatRate: number | null;
  vatTreatment: PlatformVatTreatment;
  vatReason: string | null;
  vatNumber: string | null;
  vatValidatedAt: string | null;
  vatValidationStatus: PlatformVatValidationStatus | null;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  updatedAt: string;
};

export type PlatformClientInvoiceRecord = {
  id: string;
  invoiceNumber: string;
  issuedOn: string;
  estimatedAmount: number | null;
  amount: number;
  currency: PlatformBillingCurrency;
  status: "invoiced" | "paid";
  paidOn: string | null;
  paymentReference: string | null;
  notes: string | null;
};

export type PlatformBillingClientOption = {
  id: string;
  clientType: PlatformInvoiceClientType;
  name: string;
  accountEmail: string | null;
  terms: PlatformClientBillingTerms | null;
};

export type PlatformInvoiceAmountRow = {
  id: string;
  clientType: PlatformInvoiceClientType;
  clientName: string;
  accountEmail: string | null;
  subscriptionCount: number;
  confirmationSmsCount: number;
  reminder24hSmsCount: number;
  otherSmsCount: number;
  totalSmsCount: number;
  subscriptionUnitPrice: number;
  /**
   * Compatibility field. Always 0 for new invoice calculations.
   */
  smsUnitPrice: number;
  currency: PlatformBillingCurrency;
  vatRate: number;
  vatTreatment: PlatformVatTreatment;
  vatReason: string | null;
  billingTermsSource: "client" | "global";
  subscriptionAmount: number;
  /**
   * Compatibility field. Always 0 for new invoice calculations.
   */
  smsAmount: number;
  subtotal: number;
  vatAmount: number;
  total: number;
  billingDetails: PlatformBillingDetails | null;
  invoiceRecord: PlatformClientInvoiceRecord | null;
};

export type PlatformMonthRange = {
  month: string;
  startIso: string;
  endExclusiveIso: string;
  startDate: string;
  endDate: string;
  previousMonth: string;
  nextMonth: string;
  currentMonth: string;
};

export type PlatformInvoicingData = {
  range: PlatformMonthRange;
  rates: PlatformBillingRates;
  independentDoctors: PlatformInvoiceAmountRow[];
  clinicOrganizations: PlatformInvoiceAmountRow[];
  rows: PlatformInvoiceAmountRow[];
  pricingClients: PlatformBillingClientOption[];
  historyMonths: string[];
  previousCalendarMonth: string;
  hasPartialError: boolean;
};

type BillingSettingsRow = {
  clinic_doctor_monthly_price_ron: number | string | null;
  vat_rate: number | string | null;
  updated_at: string | null;
  updated_by_profile_id: string | null;
};

type DoctorRow = {
  id: string;
  profile_id: string | null;
  clinic_organization_id: string | null;
  slug: string;
  email: string | null;
  account_type: string | null;
  status: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type DoctorSubscriptionRow = {
  doctor_id: string | null;
  profile_id: string | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
};

type DoctorAccessGrantRow = {
  doctor_id: string;
  status: string;
  ends_at: string;
};

type DoctorBillingProfileRow = {
  doctor_id: string;
  legal_name: string | null;
  cui: string | null;
  trade_registry_number: string | null;
  vat_payer: boolean | null;
  billing_address: string | null;
  county: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  billing_email: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  created_at: string;
};

type OrganizationBillingProfileRow = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  trade_register_number: string | null;
  billing_address: string;
  billing_city: string;
  billing_county: string;
  billing_country: string;
  billing_email: string;
  is_vat_payer: boolean;
  vat_number: string | null;
};

type ClinicDoctorRelationshipRow = {
  organization_id: string;
  doctor_id: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
  accepted_at: string | null;
  coverage_started_at: string | null;
  coverage_ended_at: string | null;
  created_at: string;
};

type SmsLogRow = {
  doctor_id: string | null;
  event: string | null;
  status: string | null;
  payer_clinic_organization_id: string | null;
  created_at: string;
};

type ClientBillingTermsRow = {
  id: string;
  client_type: PlatformInvoiceClientType;
  doctor_id: string | null;
  clinic_organization_id: string | null;
  subscription_unit_price: number | string | null;
  sms_unit_price: number | string | null;
  currency: PlatformBillingCurrency;
  vat_rate: number | string | null;
  vat_treatment: PlatformVatTreatment;
  vat_reason: string | null;
  vat_number: string | null;
  vat_validated_at: string | null;
  vat_validation_status: PlatformVatValidationStatus | null;
  effective_from: string | null;
  effective_until: string | null;
  updated_at: string;
};

type ClientInvoiceRow = {
  id: string;
  client_type: PlatformInvoiceClientType;
  doctor_id: string | null;
  clinic_organization_id: string | null;
  billing_period_start: string;
  billing_period_end: string;
  invoice_number: string;
  issued_on: string;
  estimated_amount: number | string | null;
  amount: number | string;
  currency: PlatformBillingCurrency;
  status: "invoiced" | "paid";
  paid_on: string | null;
  payment_reference: string | null;
  notes: string | null;
};

const DEFAULT_RATES: PlatformBillingRates = {
  subscriptionPriceRon: 100,
  smsPriceRon: 0,
  vatRate: 0.21,
  updatedAt: null,
  updatedByProfileId: null,
};

const BILLABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "past_due",
  "unpaid",
]);

const BILLABLE_COVERAGE_STATUSES = new Set([
  "active",
  "paused",
  "cancelled",
  "ended",
]);

function toNumber(
  value: number | string | null | undefined,
  fallback: number
) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function bucharestYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);

  return { year, month };
}

function normalizeMonth(
  value: string | undefined,
  fallback: "current" | "previous"
) {
  if (/^\d{4}-\d{2}$/.test(value ?? "")) {
    const month = Number(value?.slice(5, 7));
    if (month >= 1 && month <= 12) return value as string;
  }

  const current = bucharestYearMonth();
  const date = new Date(
    Date.UTC(
      current.year,
      current.month - 1 + (fallback === "previous" ? -1 : 0),
      1
    )
  );

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function shiftPlatformBillingMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

export function getPlatformMonthRange(
  month?: string,
  fallback: "current" | "previous" = "current"
): PlatformMonthRange {
  const normalized = normalizeMonth(month, fallback);
  const [year, monthNumber] = normalized.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));
  const inclusiveEnd = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  const current = normalizeMonth(undefined, "current");

  return {
    month: normalized,
    startIso: start.toISOString(),
    endExclusiveIso: end.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    endDate: inclusiveEnd.toISOString().slice(0, 10),
    previousMonth: shiftPlatformBillingMonth(normalized, -1),
    nextMonth: shiftPlatformBillingMonth(normalized, 1),
    currentMonth: current,
  };
}

export function getPlatformBillingHistoryMonths(count = 6) {
  const current = normalizeMonth(undefined, "current");
  return Array.from({ length: Math.max(1, count) }, (_, index) =>
    shiftPlatformBillingMonth(current, -index)
  );
}

export function formatPlatformBillingMonth(month: string, locale: AppLocale) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { month: "long", year: "numeric", timeZone: "UTC" }
  ).format(new Date(Date.UTC(year, monthNumber - 1, 15)));
}

export function formatPlatformBillingCurrency(
  value: number,
  locale: AppLocale,
  currency: PlatformBillingCurrency = "RON"
) {
  return new Intl.NumberFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { style: "currency", currency, maximumFractionDigits: 2 }
  ).format(value);
}

function fullName(profile: ProfileRow | undefined) {
  return [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function doctorNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part, index) =>
      index === 0 && part.toLocaleLowerCase() === "dr"
        ? "Dr."
        : part.charAt(0).toLocaleUpperCase() + part.slice(1)
    )
    .join(" ")
    .trim();
}

function doctorBillingAddress(profile: DoctorBillingProfileRow) {
  return [
    profile.billing_address,
    profile.postal_code,
    profile.city,
    profile.county,
    profile.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function organizationBillingAddress(profile: OrganizationBillingProfileRow) {
  return [
    profile.billing_address,
    profile.billing_city,
    profile.billing_county,
    profile.billing_country,
  ]
    .filter(Boolean)
    .join(", ");
}

function isDateBefore(value: string | null | undefined, boundary: string) {
  return !value || new Date(value).getTime() < new Date(boundary).getTime();
}

function isDateAfterOrEqual(
  value: string | null | undefined,
  boundary: string
) {
  return !value || new Date(value).getTime() >= new Date(boundary).getTime();
}

function termAppliesToRange(
  terms: PlatformClientBillingTerms | null,
  range: PlatformMonthRange
) {
  if (!terms) return false;

  return (
    (!terms.effectiveFrom || terms.effectiveFrom <= range.endDate) &&
    (!terms.effectiveUntil || terms.effectiveUntil >= range.startDate)
  );
}

function buildAmounts({
  subscriptionCount,
  terms,
  rates,
}: {
  subscriptionCount: number;
  /**
   * Kept in the call contract so SMS counts can remain available to callers,
   * but they are intentionally excluded from monetary calculations.
   */
  totalSmsCount: number;
  terms: PlatformClientBillingTerms | null;
  rates: PlatformBillingRates;
}) {
  const subscriptionUnitPrice =
    terms?.subscriptionUnitPrice ?? rates.subscriptionPriceRon;
  const currency = terms?.currency ?? "RON";
  const vatRate = terms?.vatRate ?? rates.vatRate;
  const vatTreatment = terms?.vatTreatment ?? "domestic";
  const vatReason = terms?.vatReason ?? null;

  const subscriptionAmount = roundMoney(
    subscriptionCount * subscriptionUnitPrice
  );

  // SMS is included in the fixed subscription/package price.
  // Keep compatibility fields at zero until the old SMS billing schema/types
  // are retired in a later cleanup migration.
  const smsUnitPrice = 0;
  const smsAmount = 0;

  const subtotal = subscriptionAmount;
  const vatAmount = roundMoney(subtotal * vatRate);
  const total = roundMoney(subtotal + vatAmount);

  return {
    subscriptionUnitPrice,
    smsUnitPrice,
    currency,
    vatRate,
    vatTreatment,
    vatReason,
    billingTermsSource: terms ? ("client" as const) : ("global" as const),
    subscriptionAmount,
    smsAmount,
    subtotal,
    vatAmount,
    total,
  };
}

function normalizeTerms(row: ClientBillingTermsRow): PlatformClientBillingTerms {
  const clientId =
    row.client_type === "independent_doctor"
      ? row.doctor_id
      : row.clinic_organization_id;

  if (!clientId) {
    throw new Error("Client billing terms row has no client identifier.");
  }

  return {
    id: row.id,
    clientType: row.client_type,
    clientId,
    subscriptionUnitPrice: nullableNumber(row.subscription_unit_price),
    smsUnitPrice: nullableNumber(row.sms_unit_price),
    currency: row.currency,
    vatRate: nullableNumber(row.vat_rate),
    vatTreatment: row.vat_treatment,
    vatReason: row.vat_reason,
    vatNumber: row.vat_number,
    vatValidatedAt: row.vat_validated_at,
    vatValidationStatus: row.vat_validation_status,
    effectiveFrom: row.effective_from,
    effectiveUntil: row.effective_until,
    updatedAt: row.updated_at,
  };
}

function normalizeInvoice(row: ClientInvoiceRow): PlatformClientInvoiceRecord {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    issuedOn: row.issued_on,
    estimatedAmount:
      row.estimated_amount === null ? null : Number(row.estimated_amount),
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    paidOn: row.paid_on,
    paymentReference: row.payment_reference,
    notes: row.notes,
  };
}

function clientKey(type: PlatformInvoiceClientType, id: string) {
  return `${type}:${id}`;
}

export async function loadPlatformBillingRates(): Promise<{
  rates: PlatformBillingRates;
  error: boolean;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .select(
      "clinic_doctor_monthly_price_ron, vat_rate, updated_at, updated_by_profile_id"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Platform billing settings query failed:", error);
    return { rates: DEFAULT_RATES, error: true };
  }

  const row = data as BillingSettingsRow | null;
  if (!row) return { rates: DEFAULT_RATES, error: true };

  return {
    rates: {
      subscriptionPriceRon: toNumber(
        row.clinic_doctor_monthly_price_ron,
        DEFAULT_RATES.subscriptionPriceRon
      ),
      smsPriceRon: 0,
      vatRate: Math.min(1, toNumber(row.vat_rate, DEFAULT_RATES.vatRate)),
      updatedAt: row.updated_at,
      updatedByProfileId: row.updated_by_profile_id,
    },
    error: false,
  };
}

export async function loadPlatformInvoicingData({
  locale,
  month,
  fallback = "current",
}: {
  locale: AppLocale;
  month?: string;
  fallback?: "current" | "previous";
}): Promise<PlatformInvoicingData> {
  const range = getPlatformMonthRange(month, fallback);
  const admin = createAdminClient();

  const [
    ratesResult,
    doctorsResult,
    profilesResult,
    subscriptionsResult,
    accessGrantsResult,
    doctorBillingResult,
    organizationsResult,
    organizationBillingResult,
    relationshipsResult,
    smsResult,
    termsResult,
    invoicesResult,
  ] = await Promise.all([
    loadPlatformBillingRates(),
    admin
      .from("doctors")
      .select(
        "id, profile_id, clinic_organization_id, slug, email, account_type, status, created_at"
      )
      .eq("status", "active")
      .order("slug", { ascending: true }),
    admin.from("profiles").select("id, first_name, last_name"),
    admin
      .from("doctor_subscriptions")
      .select(
        "doctor_id, profile_id, status, current_period_start, current_period_end, canceled_at, created_at"
      ),
    admin
      .from("doctor_access_grants")
      .select("doctor_id, status, ends_at")
      .eq("grant_type", "admin_complimentary"),
    admin
      .from("doctor_billing_profiles")
      .select(
        "doctor_id, legal_name, cui, trade_registry_number, vat_payer, billing_address, county, city, postal_code, country, billing_email"
      ),
    admin
      .from("clinic_organizations")
      .select("id, name, status, contact_email, created_at")
      .eq("status", "active")
      .order("name", { ascending: true }),
    admin.from("clinic_organization_billing_profiles").select(`
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
    `),
    admin.from("clinic_doctor_relationships").select(`
      organization_id,
      doctor_id,
      invitation_status,
      payment_responsibility,
      coverage_status,
      accepted_at,
      coverage_started_at,
      coverage_ended_at,
      created_at
    `),
    admin
      .from("sms_delivery_logs")
      .select(
        "doctor_id, event, status, payer_clinic_organization_id, created_at"
      )
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso)
      .eq("status", "sent"),
    admin.from("client_billing_terms").select(`
      id,
      client_type,
      doctor_id,
      clinic_organization_id,
      subscription_unit_price,
      sms_unit_price,
      currency,
      vat_rate,
      vat_treatment,
      vat_reason,
      vat_number,
      vat_validated_at,
      vat_validation_status,
      effective_from,
      effective_until,
      updated_at
    `),
    admin
      .from("client_billing_invoice_records")
      .select(`
        id,
        client_type,
        doctor_id,
        clinic_organization_id,
        billing_period_start,
        billing_period_end,
        invoice_number,
        issued_on,
        estimated_amount,
        amount,
        currency,
        status,
        paid_on,
        payment_reference,
        notes
      `)
      .lte("billing_period_start", range.endDate)
      .gte("billing_period_end", range.startDate),
  ]);

  const queryErrors = [
    doctorsResult.error,
    profilesResult.error,
    subscriptionsResult.error,
    accessGrantsResult.error,
    doctorBillingResult.error,
    organizationsResult.error,
    organizationBillingResult.error,
    relationshipsResult.error,
    smsResult.error,
    termsResult.error,
    invoicesResult.error,
  ];

  for (const error of queryErrors) {
    if (error) console.error("Platform invoicing query failed:", error);
  }

  const rates = ratesResult.rates;
  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const subscriptions = (subscriptionsResult.data ??
    []) as DoctorSubscriptionRow[];
  const accessGrants = (accessGrantsResult.data ??
    []) as DoctorAccessGrantRow[];
  const doctorBillingProfiles = (doctorBillingResult.data ??
    []) as DoctorBillingProfileRow[];
  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const organizationBillingProfiles = (organizationBillingResult.data ??
    []) as OrganizationBillingProfileRow[];
  const relationships = (relationshipsResult.data ??
    []) as ClinicDoctorRelationshipRow[];
  const smsLogs = (smsResult.data ?? []) as SmsLogRow[];
  const termRows = (termsResult.data ?? []) as ClientBillingTermsRow[];
  const invoiceRows = (invoicesResult.data ?? []) as ClientInvoiceRow[];

  const termsByClient = new Map<string, PlatformClientBillingTerms>();

  for (const row of termRows) {
    try {
      const terms = normalizeTerms(row);
      termsByClient.set(clientKey(terms.clientType, terms.clientId), terms);
    } catch (error) {
      console.error("Invalid client billing terms row:", error);
    }
  }

  const invoiceByClient = new Map<string, PlatformClientInvoiceRecord>();

  for (const invoice of invoiceRows) {
    const id =
      invoice.client_type === "independent_doctor"
        ? invoice.doctor_id
        : invoice.clinic_organization_id;

    if (!id) continue;

    invoiceByClient.set(
      clientKey(invoice.client_type, id),
      normalizeInvoice(invoice)
    );
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const subscriptionsByDoctorId = new Map<string, DoctorSubscriptionRow>();
  const subscriptionsByProfileId = new Map<string, DoctorSubscriptionRow>();

  for (const subscription of subscriptions) {
    if (subscription.doctor_id) {
      subscriptionsByDoctorId.set(subscription.doctor_id, subscription);
    }

    if (subscription.profile_id) {
      subscriptionsByProfileId.set(subscription.profile_id, subscription);
    }
  }

  const complimentaryEndsByDoctorId = new Map<string, string>();

  for (const grant of accessGrants) {
    if (!["active", "expired"].includes(grant.status)) {
      continue;
    }

    const existingEnd = complimentaryEndsByDoctorId.get(grant.doctor_id);

    if (
      !existingEnd ||
      new Date(grant.ends_at).getTime() > new Date(existingEnd).getTime()
    ) {
      complimentaryEndsByDoctorId.set(grant.doctor_id, grant.ends_at);
    }
  }

  const doctorBillingById = new Map(
    doctorBillingProfiles.map((profile) => [profile.doctor_id, profile])
  );

  const organizationBillingById = new Map(
    organizationBillingProfiles.map((profile) => [
      profile.organization_id,
      profile,
    ])
  );

  const billableRelationships = relationships.filter((relationship) => {
    if (
      relationship.payment_responsibility !== "clinic_paid" ||
      relationship.invitation_status !== "accepted" ||
      !relationship.doctor_id ||
      !BILLABLE_COVERAGE_STATUSES.has(relationship.coverage_status)
    ) {
      return false;
    }

    const start =
      relationship.coverage_started_at ??
      relationship.accepted_at ??
      relationship.created_at;

    return (
      isDateBefore(start, range.endExclusiveIso) &&
      isDateAfterOrEqual(relationship.coverage_ended_at, range.startIso)
    );
  });

  const organizationByDoctorId = new Map<string, string>();

  // Immutable Doctor account ownership is the primary source of truth.
  for (const doctor of doctors) {
    if (
      doctor.account_type === "clinic_invited" &&
      doctor.clinic_organization_id
    ) {
      organizationByDoctorId.set(
        doctor.id,
        doctor.clinic_organization_id
      );
    }
  }

  // Accepted clinic-paid relationships remain a compatibility fallback.
  for (const relationship of billableRelationships) {
    if (
      relationship.doctor_id &&
      !organizationByDoctorId.has(relationship.doctor_id)
    ) {
      organizationByDoctorId.set(
        relationship.doctor_id,
        relationship.organization_id
      );
    }
  }

  type SmsCounter = {
    total: number;
    confirmations: number;
    reminders: number;
    other: number;
  };

  const doctorSmsCounts = new Map<string, SmsCounter>();
  const organizationSmsCounts = new Map<string, SmsCounter>();

  for (const log of smsLogs) {
    const increment = (
      map: Map<string, SmsCounter>,
      key: string
    ) => {
      const current = map.get(key) ?? {
        total: 0,
        confirmations: 0,
        reminders: 0,
        other: 0,
      };

      current.total += 1;

      if (log.event === "confirmed") {
        current.confirmations += 1;
      } else if (log.event === "reminder_24_hours") {
        current.reminders += 1;
      } else {
        current.other += 1;
      }

      map.set(key, current);
    };

    const explicitOrganizationId =
      log.payer_clinic_organization_id;

    const inferredOrganizationId = log.doctor_id
      ? organizationByDoctorId.get(log.doctor_id)
      : undefined;

    const organizationId =
      explicitOrganizationId ?? inferredOrganizationId;

    if (organizationId) {
      increment(organizationSmsCounts, organizationId);
      continue;
    }

    if (log.doctor_id) {
      increment(doctorSmsCounts, log.doctor_id);
    }
  }

  const pricingClients: PlatformBillingClientOption[] = [];

  const independentDoctors = doctors
    .filter((doctor) => doctor.account_type === "independent")
    .map((doctor): PlatformInvoiceAmountRow | null => {
      const subscription =
        subscriptionsByDoctorId.get(doctor.id) ??
        (doctor.profile_id
          ? subscriptionsByProfileId.get(doctor.profile_id)
          : undefined);

      const existedBeforeMonthEnd = isDateBefore(
        doctor.created_at,
        range.endExclusiveIso
      );

      const complimentaryEndsAt =
        complimentaryEndsByDoctorId.get(doctor.id) ?? null;

      const invoiceableFrom =
        complimentaryEndsAt ?? subscription?.created_at ?? null;

      const hasBillableSubscription = Boolean(
        subscription &&
          invoiceableFrom &&
          BILLABLE_SUBSCRIPTION_STATUSES.has(subscription.status ?? "") &&
          isDateBefore(invoiceableFrom, range.endExclusiveIso) &&
          isDateAfterOrEqual(subscription.canceled_at, range.startIso)
      );

      const subscriptionCount =
        existedBeforeMonthEnd && hasBillableSubscription ? 1 : 0;

      const sms = doctorSmsCounts.get(doctor.id) ?? {
        total: 0,
        confirmations: 0,
        reminders: 0,
        other: 0,
      };

      const profile = doctor.profile_id
        ? profilesById.get(doctor.profile_id)
        : undefined;

      const billing = doctorBillingById.get(doctor.id);

      const clientName =
        fullName(profile) ||
        doctorNameFromSlug(doctor.slug) ||
        billing?.legal_name ||
        doctor.slug;

      const rawTerms =
        termsByClient.get(
          clientKey("independent_doctor", doctor.id)
        ) ?? null;

      const applicableTerms = termAppliesToRange(rawTerms, range)
        ? rawTerms
        : null;

      pricingClients.push({
        id: doctor.id,
        clientType: "independent_doctor",
        name: clientName,
        accountEmail: doctor.email,
        terms: rawTerms,
      });

      const invoiceRecord =
        invoiceByClient.get(
          clientKey("independent_doctor", doctor.id)
        ) ?? null;

      if (subscriptionCount === 0 && !invoiceRecord) {
        return null;
      }

      return {
        id: doctor.id,
        clientType: "independent_doctor",
        clientName,
        accountEmail: doctor.email,
        subscriptionCount,
        confirmationSmsCount: sms.confirmations,
        reminder24hSmsCount: sms.reminders,
        otherSmsCount: sms.other,
        totalSmsCount: sms.total,
        ...buildAmounts({
          subscriptionCount,
          totalSmsCount: sms.total,
          terms: applicableTerms,
          rates,
        }),
        billingDetails: billing
          ? {
              legalName: billing.legal_name,
              taxId: billing.cui,
              tradeRegisterNumber: billing.trade_registry_number,
              billingEmail: billing.billing_email,
              billingAddress: doctorBillingAddress(billing),
              country: billing.country,
              vatNumber: applicableTerms?.vatNumber ?? null,
              vatPayer: billing.vat_payer,
            }
          : null,
        invoiceRecord,
      };
    })
    .filter((row): row is PlatformInvoiceAmountRow => Boolean(row))
    .sort((first, second) =>
      first.clientName.localeCompare(second.clientName, locale)
    );

  const subscriptionsByOrganization = new Map<string, number>();

  for (const doctor of doctors) {
    if (
      doctor.account_type !== "clinic_invited" ||
      !doctor.clinic_organization_id ||
      !isDateBefore(doctor.created_at, range.endExclusiveIso)
    ) {
      continue;
    }

    subscriptionsByOrganization.set(
      doctor.clinic_organization_id,
      (subscriptionsByOrganization.get(doctor.clinic_organization_id) ?? 0) + 1
    );
  }

  const clinicOrganizations = organizations
    .map((organization): PlatformInvoiceAmountRow | null => {
      const subscriptionCount =
        subscriptionsByOrganization.get(organization.id) ?? 0;

      const sms = organizationSmsCounts.get(organization.id) ?? {
        total: 0,
        confirmations: 0,
        reminders: 0,
        other: 0,
      };

      const billing = organizationBillingById.get(organization.id);

      const rawTerms =
        termsByClient.get(
          clientKey("clinic_organization", organization.id)
        ) ?? null;

      const applicableTerms = termAppliesToRange(rawTerms, range)
        ? rawTerms
        : null;

      pricingClients.push({
        id: organization.id,
        clientType: "clinic_organization",
        name: organization.name,
        accountEmail: organization.contact_email,
        terms: rawTerms,
      });

      const invoiceRecord =
        invoiceByClient.get(
          clientKey("clinic_organization", organization.id)
        ) ?? null;

      const existedBeforeMonthEnd = isDateBefore(
        organization.created_at,
        range.endExclusiveIso
      );

      if (!existedBeforeMonthEnd && sms.total === 0 && !invoiceRecord) {
        return null;
      }

      return {
        id: organization.id,
        clientType: "clinic_organization",
        clientName: organization.name,
        accountEmail: organization.contact_email,
        subscriptionCount,
        confirmationSmsCount: sms.confirmations,
        reminder24hSmsCount: sms.reminders,
        otherSmsCount: sms.other,
        totalSmsCount: sms.total,
        ...buildAmounts({
          subscriptionCount,
          totalSmsCount: sms.total,
          terms: applicableTerms,
          rates,
        }),
        billingDetails: billing
          ? {
              legalName: billing.company_name,
              taxId: billing.tax_id,
              tradeRegisterNumber: billing.trade_register_number,
              billingEmail: billing.billing_email,
              billingAddress: organizationBillingAddress(billing),
              country: billing.billing_country,
              vatNumber: applicableTerms?.vatNumber ?? billing.vat_number,
              vatPayer: billing.is_vat_payer,
            }
          : null,
        invoiceRecord,
      };
    })
    .filter((row): row is PlatformInvoiceAmountRow => Boolean(row))
    .sort((first, second) =>
      first.clientName.localeCompare(second.clientName, locale)
    );

  pricingClients.sort((first, second) => {
    if (first.clientType !== second.clientType) {
      return first.clientType === "independent_doctor" ? -1 : 1;
    }

    return first.name.localeCompare(second.name, locale);
  });

  return {
    range,
    rates,
    independentDoctors,
    clinicOrganizations,
    rows: [...independentDoctors, ...clinicOrganizations],
    pricingClients,
    historyMonths: getPlatformBillingHistoryMonths(6),
    previousCalendarMonth: shiftPlatformBillingMonth(range.currentMonth, -1),
    hasPartialError:
      ratesResult.error || queryErrors.some((error) => Boolean(error)),
  };
}
