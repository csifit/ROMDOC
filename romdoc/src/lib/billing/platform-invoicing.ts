import type { AppLocale } from "@/lib/i18n/app-locale";
import { selectTranslation } from "@/lib/i18n/app-locale";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformBillingRates = {
  subscriptionPriceRon: number;
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
  vatNumber: string | null;
  vatPayer: boolean | null;
};

export type PlatformInvoiceClientType =
  | "independent_doctor"
  | "clinic_organization";

export type PlatformInvoiceAmountRow = {
  id: string;
  clientType: PlatformInvoiceClientType;
  clientName: string;
  accountEmail: string | null;
  subscriptionCount: number;
  confirmationSmsCount: number;
  reminder24hSmsCount: number;
  totalSmsCount: number;
  subscriptionAmountRon: number;
  smsAmountRon: number;
  subtotalRon: number;
  vatRon: number;
  totalRon: number;
  billingDetails: PlatformBillingDetails | null;
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
  hasPartialError: boolean;
};

type BillingSettingsRow = {
  clinic_doctor_monthly_price_ron: number | string | null;
  sms_unit_price_ron: number | string | null;
  vat_rate: number | string | null;
  updated_at: string | null;
  updated_by_profile_id: string | null;
};

type DoctorRow = {
  id: string;
  profile_id: string | null;
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

type DoctorTranslationRow = {
  doctor_id: string;
  locale: string;
  title: string | null;
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
  invoice_status: string | null;
  payer_type: string | null;
  payer_clinic_organization_id: string | null;
  created_at: string;
};

const DEFAULT_RATES: PlatformBillingRates = {
  subscriptionPriceRon: 60,
  smsPriceRon: 0.3,
  vatRate: 0.21,
  updatedAt: null,
  updatedByProfileId: null,
};

const BILLABLE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
]);

const BILLABLE_COVERAGE_STATUSES = new Set([
  "active",
  "paused",
  "cancelled",
  "ended",
]);

function toNumber(value: number | string | null | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
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

function normalizeMonth(value: string | undefined, fallback: "current" | "previous") {
  if (/^\d{4}-\d{2}$/.test(value ?? "")) {
    const month = Number(value?.slice(5, 7));
    if (month >= 1 && month <= 12) return value as string;
  }

  const current = bucharestYearMonth();
  const date = new Date(
    Date.UTC(current.year, current.month - 1 + (fallback === "previous" ? -1 : 0), 1)
  );

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
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
    previousMonth: shiftMonth(normalized, -1),
    nextMonth: shiftMonth(normalized, 1),
    currentMonth: current,
  };
}

export function formatPlatformBillingMonth(month: string, locale: AppLocale) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { month: "long", year: "numeric", timeZone: "UTC" }
  ).format(new Date(Date.UTC(year, monthNumber - 1, 15)));
}

export function formatPlatformBillingCurrency(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(
    locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB",
    { style: "currency", currency: "RON", maximumFractionDigits: 2 }
  ).format(value);
}

function fullName(profile: ProfileRow | undefined) {
  return [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
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

function isDateAfterOrEqual(value: string | null | undefined, boundary: string) {
  return !value || new Date(value).getTime() >= new Date(boundary).getTime();
}

function buildAmounts(
  subscriptionCount: number,
  totalSmsCount: number,
  rates: PlatformBillingRates
) {
  const subscriptionAmountRon = roundMoney(
    subscriptionCount * rates.subscriptionPriceRon
  );
  const smsAmountRon = roundMoney(totalSmsCount * rates.smsPriceRon);
  const subtotalRon = roundMoney(subscriptionAmountRon + smsAmountRon);
  const vatRon = roundMoney(subtotalRon * rates.vatRate);
  const totalRon = roundMoney(subtotalRon + vatRon);

  return {
    subscriptionAmountRon,
    smsAmountRon,
    subtotalRon,
    vatRon,
    totalRon,
  };
}

export async function loadPlatformBillingRates(): Promise<{
  rates: PlatformBillingRates;
  error: boolean;
}> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinic_billing_settings")
    .select(
      "clinic_doctor_monthly_price_ron, sms_unit_price_ron, vat_rate, updated_at, updated_by_profile_id"
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
      smsPriceRon: toNumber(row.sms_unit_price_ron, DEFAULT_RATES.smsPriceRon),
      vatRate: Math.min(
        1,
        toNumber(row.vat_rate, DEFAULT_RATES.vatRate)
      ),
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
    translationsResult,
    subscriptionsResult,
    doctorBillingResult,
    organizationsResult,
    organizationBillingResult,
    relationshipsResult,
    smsResult,
  ] = await Promise.all([
    loadPlatformBillingRates(),
    admin
      .from("doctors")
      .select("id, profile_id, slug, email, account_type, status, created_at")
      .eq("account_type", "independent")
      .order("slug", { ascending: true }),
    admin.from("profiles").select("id, first_name, last_name"),
    admin
      .from("doctor_translations")
      .select("doctor_id, locale, title"),
    admin
      .from("doctor_subscriptions")
      .select(
        "doctor_id, profile_id, status, current_period_start, current_period_end, canceled_at, created_at"
      ),
    admin
      .from("doctor_billing_profiles")
      .select(
        "doctor_id, legal_name, cui, trade_registry_number, vat_payer, billing_address, county, city, postal_code, country, billing_email"
      ),
    admin
      .from("clinic_organizations")
      .select("id, name, status, contact_email, created_at")
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
        "doctor_id, event, status, invoice_status, payer_type, payer_clinic_organization_id, created_at"
      )
      .gte("created_at", range.startIso)
      .lt("created_at", range.endExclusiveIso)
      .eq("status", "sent"),
  ]);

  const queryErrors = [
    doctorsResult.error,
    profilesResult.error,
    translationsResult.error,
    subscriptionsResult.error,
    doctorBillingResult.error,
    organizationsResult.error,
    organizationBillingResult.error,
    relationshipsResult.error,
    smsResult.error,
  ];

  for (const error of queryErrors) {
    if (error) console.error("Platform invoicing query failed:", error);
  }

  const rates = ratesResult.rates;
  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const translations = (translationsResult.data ?? []) as DoctorTranslationRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as DoctorSubscriptionRow[];
  const doctorBillingProfiles = (doctorBillingResult.data ?? []) as DoctorBillingProfileRow[];
  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const organizationBillingProfiles = (organizationBillingResult.data ?? []) as OrganizationBillingProfileRow[];
  const relationships = (relationshipsResult.data ?? []) as ClinicDoctorRelationshipRow[];
  const smsLogs = (smsResult.data ?? []) as SmsLogRow[];

  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const translationsByDoctorId = new Map<string, DoctorTranslationRow[]>();
  for (const translation of translations) {
    const current = translationsByDoctorId.get(translation.doctor_id) ?? [];
    current.push(translation);
    translationsByDoctorId.set(translation.doctor_id, current);
  }

  const subscriptionsByDoctorId = new Map<string, DoctorSubscriptionRow>();
  const subscriptionsByProfileId = new Map<string, DoctorSubscriptionRow>();
  for (const subscription of subscriptions) {
    if (subscription.doctor_id) subscriptionsByDoctorId.set(subscription.doctor_id, subscription);
    if (subscription.profile_id) subscriptionsByProfileId.set(subscription.profile_id, subscription);
  }

  const doctorBillingById = new Map(
    doctorBillingProfiles.map((profile) => [profile.doctor_id, profile])
  );
  const organizationBillingById = new Map(
    organizationBillingProfiles.map((profile) => [profile.organization_id, profile])
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
  for (const relationship of billableRelationships) {
    if (relationship.doctor_id && !organizationByDoctorId.has(relationship.doctor_id)) {
      organizationByDoctorId.set(relationship.doctor_id, relationship.organization_id);
    }
  }

  const doctorSmsCounts = new Map<
    string,
    { total: number; confirmations: number; reminders: number }
  >();
  const organizationSmsCounts = new Map<
    string,
    { total: number; confirmations: number; reminders: number }
  >();

  for (const log of smsLogs) {
    if (log.invoice_status === "not_billable") continue;

    const increment = (map: typeof doctorSmsCounts, key: string) => {
      const current = map.get(key) ?? { total: 0, confirmations: 0, reminders: 0 };
      current.total += 1;
      if (log.event === "confirmed") current.confirmations += 1;
      if (log.event === "reminder_24_hours") current.reminders += 1;
      map.set(key, current);
    };

    const explicitOrganizationId = log.payer_clinic_organization_id;
    const inferredOrganizationId = log.doctor_id
      ? organizationByDoctorId.get(log.doctor_id)
      : undefined;

    if (
      log.payer_type === "clinic_organization" ||
      explicitOrganizationId ||
      inferredOrganizationId
    ) {
      const organizationId = explicitOrganizationId ?? inferredOrganizationId;
      if (organizationId) increment(organizationSmsCounts, organizationId);
      continue;
    }

    if (log.doctor_id) increment(doctorSmsCounts, log.doctor_id);
  }

  const independentDoctors = doctors
    .map((doctor): PlatformInvoiceAmountRow | null => {
      const subscription =
        subscriptionsByDoctorId.get(doctor.id) ??
        (doctor.profile_id ? subscriptionsByProfileId.get(doctor.profile_id) : undefined);

      const subscriptionCount =
        subscription &&
        BILLABLE_SUBSCRIPTION_STATUSES.has(subscription.status ?? "") &&
        isDateBefore(subscription.created_at, range.endExclusiveIso) &&
        isDateAfterOrEqual(subscription.canceled_at, range.startIso)
          ? 1
          : 0;

      const sms = doctorSmsCounts.get(doctor.id) ?? {
        total: 0,
        confirmations: 0,
        reminders: 0,
      };

      if (subscriptionCount === 0 && sms.total === 0) return null;

      const translatedName = selectTranslation(
        translationsByDoctorId.get(doctor.id),
        locale
      )?.title;
      const profile = doctor.profile_id
        ? profilesById.get(doctor.profile_id)
        : undefined;
      const billing = doctorBillingById.get(doctor.id);
      const clientName = translatedName || fullName(profile) || doctor.slug;

      const amounts = buildAmounts(subscriptionCount, sms.total, rates);

      return {
        id: doctor.id,
        clientType: "independent_doctor",
        clientName,
        accountEmail: doctor.email,
        subscriptionCount,
        confirmationSmsCount: sms.confirmations,
        reminder24hSmsCount: sms.reminders,
        totalSmsCount: sms.total,
        ...amounts,
        billingDetails: billing
          ? {
              legalName: billing.legal_name,
              taxId: billing.cui,
              tradeRegisterNumber: billing.trade_registry_number,
              billingEmail: billing.billing_email,
              billingAddress: doctorBillingAddress(billing),
              vatNumber: null,
              vatPayer: billing.vat_payer,
            }
          : null,
      };
    })
    .filter((row): row is PlatformInvoiceAmountRow => Boolean(row))
    .sort((first, second) =>
      first.clientName.localeCompare(second.clientName, locale)
    );

  const subscriptionsByOrganization = new Map<string, number>();
  for (const relationship of billableRelationships) {
    subscriptionsByOrganization.set(
      relationship.organization_id,
      (subscriptionsByOrganization.get(relationship.organization_id) ?? 0) + 1
    );
  }

  const clinicOrganizations = organizations
    .map((organization): PlatformInvoiceAmountRow | null => {
      const subscriptionCount = subscriptionsByOrganization.get(organization.id) ?? 0;
      const sms = organizationSmsCounts.get(organization.id) ?? {
        total: 0,
        confirmations: 0,
        reminders: 0,
      };

      if (subscriptionCount === 0 && sms.total === 0) return null;

      const billing = organizationBillingById.get(organization.id);
      const amounts = buildAmounts(subscriptionCount, sms.total, rates);

      return {
        id: organization.id,
        clientType: "clinic_organization",
        clientName: organization.name,
        accountEmail: organization.contact_email,
        subscriptionCount,
        confirmationSmsCount: sms.confirmations,
        reminder24hSmsCount: sms.reminders,
        totalSmsCount: sms.total,
        ...amounts,
        billingDetails: billing
          ? {
              legalName: billing.company_name,
              taxId: billing.tax_id,
              tradeRegisterNumber: billing.trade_register_number,
              billingEmail: billing.billing_email,
              billingAddress: organizationBillingAddress(billing),
              vatNumber: billing.vat_number,
              vatPayer: billing.is_vat_payer,
            }
          : null,
      };
    })
    .filter((row): row is PlatformInvoiceAmountRow => Boolean(row))
    .sort((first, second) =>
      first.clientName.localeCompare(second.clientName, locale)
    );

  return {
    range,
    rates,
    independentDoctors,
    clinicOrganizations,
    rows: [...independentDoctors, ...clinicOrganizations],
    hasPartialError:
      ratesResult.error || queryErrors.some((error) => Boolean(error)),
  };
}
