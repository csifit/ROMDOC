import ClinicOrganizationBillingEditor from "@/components/admin/clinic-organization-billing-editor";
import ClinicOrganizationDoctorsManager, {
  type CoveredClinicDoctorAccount,
} from "@/components/admin/clinic-organization-doctors-manager";
import ClinicOrganizationLocationAdder from "@/components/admin/clinic-organization-location-adder";
import type { AppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorClinics,
  interpolatePlatformClinicCopy,
  PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-clinics";
import { createAdminClient } from "@/lib/supabase/admin";

type ClinicOrganization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  created_at: string;
  approved_at: string | null;
};

type BillingProfile = {
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

type OrganizationMember = {
  organization_id: string;
  profile_id: string;
  member_role: string;
  status: string;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string | null;
};

type OrganizationClinicLink = {
  organization_id: string;
  clinic_id: string;
  status: string;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
};

type ClinicTranslation = {
  clinic_id: string;
  locale: string;
  name: string;
};

type DoctorRelationship = {
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  accepted_profile_id: string | null;
  accepted_account_email: string | null;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
};

type DoctorAccountRow = {
  id: string;
  profile_id: string | null;
  slug: string;
  status: string;
  profile:
    | Profile
    | Profile[]
    | null;
};

type BillingSettings = {
  clinic_doctor_monthly_price_ron: number | string | null;
  vat_rate: number | string | null;
  billing_currency: string | null;
};

type OrganizationSummary = {
  managerNames: string[];
  activeClinicNames: string[];
  pendingClinicCount: number;
  activeCoveredDoctorCount: number;
  acceptedDoctorCount: number;
  invitedDoctorCount: number;
};

type Props = {
  locale: AppLocale;
};

function emptySummary(): OrganizationSummary {
  return {
    managerNames: [],
    activeClinicNames: [],
    pendingClinicCount: 0,
    activeCoveredDoctorCount: 0,
    acceptedDoctorCount: 0,
    invitedDoctorCount: 0,
  };
}

function numberOrFallback(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function statusClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "suspended":
      return "bg-orange-100 text-orange-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "archived":
      return "bg-slate-200 text-slate-900";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

function localLabel(
  locale: AppLocale,
  values: { ro: string; en: string; de: string }
) {
  return values[locale];
}

function formatSlugName(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ClinicOrganizationsOverview({ locale }: Props) {
  const copy = getPlatformOperatorClinics(locale);
  const localeTag = PLATFORM_OPERATOR_CLINIC_LOCALE_TAGS[locale];
  const admin = createAdminClient();

  const [
    organizationsResult,
    billingProfilesResult,
    membersResult,
    clinicLinksResult,
    doctorRelationshipsResult,
    billingSettingsResult,
  ] = await Promise.all([
    admin
      .from("clinic_organizations")
      .select(
        "id, name, slug, status, contact_name, contact_email, contact_phone, website, created_at, approved_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("clinic_organization_billing_profiles")
      .select(
        "organization_id, company_name, tax_id, trade_register_number, billing_address, billing_city, billing_county, billing_country, billing_email, is_vat_payer, vat_number"
      ),
    admin
      .from("clinic_organization_members")
      .select("organization_id, profile_id, member_role, status"),
    admin
      .from("clinic_organization_clinics")
      .select("organization_id, clinic_id, status"),
    admin
      .from("clinic_doctor_relationships")
      .select(
        "organization_id, clinic_id, doctor_id, accepted_profile_id, accepted_account_email, invited_doctor_email, invitation_status, payment_responsibility, coverage_status"
      ),
    admin
      .from("clinic_billing_settings")
      .select("clinic_doctor_monthly_price_ron, vat_rate, billing_currency")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (organizationsResult.error) {
    console.error(
      "Clinic organizations query failed:",
      organizationsResult.error
    );
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-[21px] text-sm text-red-800 shadow-sm">
        {copy.moderation.states.loadFailed}
      </section>
    );
  }

  if (billingProfilesResult.error) {
    console.error(
      "Clinic organization billing profiles query failed:",
      billingProfilesResult.error
    );
  }
  if (membersResult.error) {
    console.error(
      "Clinic organization members query failed:",
      membersResult.error
    );
  }
  if (clinicLinksResult.error) {
    console.error(
      "Clinic organization clinic links query failed:",
      clinicLinksResult.error
    );
  }
  if (doctorRelationshipsResult.error) {
    console.error(
      "Clinic organization Doctor relationships query failed:",
      doctorRelationshipsResult.error
    );
  }
  if (billingSettingsResult.error) {
    console.error(
      "Clinic organization billing settings query failed:",
      billingSettingsResult.error
    );
  }

  const organizations =
    (organizationsResult.data ?? []) as ClinicOrganization[];
  const billingProfiles =
    (billingProfilesResult.data ?? []) as BillingProfile[];
  const members =
    (membersResult.data ?? []) as OrganizationMember[];
  const clinicLinks =
    (clinicLinksResult.data ?? []) as OrganizationClinicLink[];
  const doctorRelationships =
    (doctorRelationshipsResult.data ?? []) as DoctorRelationship[];
  const settings =
    (billingSettingsResult.data ?? null) as BillingSettings | null;

  const profileIds = Array.from(
    new Set(members.map((member) => member.profile_id).filter(Boolean))
  );
  const clinicIds = Array.from(
    new Set(clinicLinks.map((link) => link.clinic_id).filter(Boolean))
  );
  const coveredDoctorIds = Array.from(
    new Set(
      doctorRelationships
        .filter(
          (relationship) =>
            relationship.payment_responsibility === "clinic_paid" &&
            relationship.invitation_status === "accepted" &&
            Boolean(relationship.doctor_id)
        )
        .map((relationship) => relationship.doctor_id as string)
    )
  );

  const [profilesResult, clinicsResult, translationsResult, doctorsResult, restrictionsResult] =
    await Promise.all([
      profileIds.length
        ? admin
            .from("profiles")
            .select("id, first_name, last_name, role, account_status")
            .in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),
      clinicIds.length
        ? admin
            .from("clinics")
            .select("id, slug, status")
            .in("id", clinicIds)
        : Promise.resolve({ data: [], error: null }),
      clinicIds.length
        ? admin
            .from("clinic_translations")
            .select("clinic_id, locale, name")
            .in("clinic_id", clinicIds)
        : Promise.resolve({ data: [], error: null }),
      coveredDoctorIds.length
        ? admin
            .from("doctors")
            .select(`
              id,
              profile_id,
              slug,
              status,
              profile:profiles!doctors_profile_id_fkey (
                id,
                first_name,
                last_name,
                role,
                account_status
              )
            `)
            .in("id", coveredDoctorIds)
        : Promise.resolve({ data: [], error: null }),
      coveredDoctorIds.length
        ? admin
            .from("doctor_telehealth_restrictions")
            .select("doctor_id, is_restricted")
            .in("doctor_id", coveredDoctorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (profilesResult.error) {
    console.error(
      "Clinic organization profiles query failed:",
      profilesResult.error
    );
  }
  if (clinicsResult.error) {
    console.error(
      "Clinic organization clinics query failed:",
      clinicsResult.error
    );
  }
  if (translationsResult.error) {
    console.error(
      "Clinic organization translations query failed:",
      translationsResult.error
    );
  }
  if (doctorsResult.error) {
    console.error(
      "Clinic organization covered Doctors query failed:",
      doctorsResult.error
    );
  }

  const profilesById = new Map(
    ((profilesResult.data ?? []) as Profile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );
  const clinicsById = new Map(
    ((clinicsResult.data ?? []) as Clinic[]).map((clinic) => [
      clinic.id,
      clinic,
    ])
  );
  const doctorsById = new Map(
    ((doctorsResult.data ?? []) as DoctorAccountRow[]).map((doctor) => [
      doctor.id,
      doctor,
    ])
  );
  const restrictionByDoctorId = new Map(
    (restrictionsResult.data ?? []).map((restriction) => [restriction.doctor_id, restriction.is_restricted])
  );
  const translations =
    (translationsResult.data ?? []) as ClinicTranslation[];
  const billingByOrganization = new Map(
    billingProfiles.map((profile) => [profile.organization_id, profile])
  );

  const doctorMonthlyPrice = numberOrFallback(
    settings?.clinic_doctor_monthly_price_ron,
    60
  );
  const vatRate = Math.min(
    1,
    numberOrFallback(settings?.vat_rate, 0.21)
  );
  const currency = settings?.billing_currency === "RON" ? "RON" : "EUR";

  const clinicName = (clinicId: string) => {
    const requested = translations.find(
      (translation) =>
        translation.clinic_id === clinicId &&
        translation.locale === locale
    );
    const romanian = translations.find(
      (translation) =>
        translation.clinic_id === clinicId &&
        translation.locale === "ro"
    );

    return (
      requested?.name ??
      romanian?.name ??
      translations.find(
        (translation) => translation.clinic_id === clinicId
      )?.name ??
      clinicsById.get(clinicId)?.slug ??
      copy.common.addressUnavailable
    );
  };

  const profileName = (profileId: string) => {
    const profile = profilesById.get(profileId);
    const name = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();
    return name || profile?.role || copy.common.unknownDoctor;
  };

  const summaries = new Map<string, OrganizationSummary>();
  for (const organization of organizations) {
    summaries.set(organization.id, emptySummary());
  }

  for (const member of members) {
    const summary = summaries.get(member.organization_id);
    if (!summary || member.status !== "active") continue;
    summary.managerNames.push(profileName(member.profile_id));
  }

  for (const link of clinicLinks) {
    const summary = summaries.get(link.organization_id);
    if (!summary) continue;
    if (link.status === "active") {
      summary.activeClinicNames.push(clinicName(link.clinic_id));
    }
    if (link.status === "pending") summary.pendingClinicCount += 1;
  }

  for (const relationship of doctorRelationships) {
    const summary = summaries.get(relationship.organization_id);
    if (!summary) continue;
    if (relationship.invitation_status === "pending") {
      summary.invitedDoctorCount += 1;
    }
    if (
      relationship.payment_responsibility === "clinic_paid" &&
      relationship.invitation_status === "accepted"
    ) {
      summary.acceptedDoctorCount += 1;
    }
    if (
      relationship.payment_responsibility === "clinic_paid" &&
      relationship.invitation_status === "accepted" &&
      relationship.coverage_status === "active"
    ) {
      summary.activeCoveredDoctorCount += 1;
    }
  }

  const coveredDoctorsByOrganization =
    new Map<string, CoveredClinicDoctorAccount[]>();

  for (const organization of organizations) {
    const deduplicated = new Map<string, CoveredClinicDoctorAccount>();

    for (const relationship of doctorRelationships) {
      if (
        relationship.organization_id !== organization.id ||
        relationship.payment_responsibility !== "clinic_paid" ||
        relationship.invitation_status !== "accepted" ||
        !relationship.doctor_id
      ) {
        continue;
      }

      const doctor = doctorsById.get(relationship.doctor_id);
      if (!doctor) continue;

      const rawProfile = doctor.profile;
      const profile = Array.isArray(rawProfile)
        ? rawProfile[0] ?? null
        : rawProfile ?? null;
      const profileId = doctor.profile_id ?? relationship.accepted_profile_id;
      const accountName = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const accountEmail =
        relationship.accepted_account_email ??
        relationship.invited_doctor_email ??
        null;
      const displayName =
        accountName ||
        accountEmail ||
        formatSlugName(doctor.slug) ||
        copy.common.unknownDoctor;

      deduplicated.set(doctor.id, {
        doctorId: doctor.id,
        profileId,
        displayName,
        accountEmail,
        accountStatus: profile?.account_status ?? "unknown",
        doctorStatus: doctor.status,
        coverageStatus: relationship.coverage_status,
        telehealthRestricted: restrictionByDoctorId.get(doctor.id) ?? false,
      });
    }

    coveredDoctorsByOrganization.set(
      organization.id,
      Array.from(deduplicated.values()).sort((first, second) =>
        first.displayName.localeCompare(second.displayName, locale)
      )
    );
  }

  const totalOrganizations = organizations.length;
  const activeOrganizations = organizations.filter(
    (organization) => organization.status === "active"
  ).length;
  const pendingOrganizations = organizations.filter(
    (organization) => organization.status === "pending"
  ).length;
  const activeCoveredDoctors = Array.from(summaries.values()).reduce(
    (total, summary) => total + summary.activeCoveredDoctorCount,
    0
  );

  const formatDate = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat(localeTag, {
          dateStyle: "medium",
          timeZone: "Europe/Bucharest",
        }).format(new Date(value))
      : copy.common.none;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);

  const formatPercent = (value: number) =>
    new Intl.NumberFormat(localeTag, {
      style: "percent",
      maximumFractionDigits: 2,
    }).format(value);

  const organizationStatus = (status: string) => {
    const statuses = copy.organizations.statuses as Record<string, string>;
    return statuses[status] ?? copy.organizations.statuses.pending;
  };

  const currencyText = localLabel(locale, {
    ro: "Monedă",
    en: "Currency",
    de: "Währung",
  });
  const monthlyPriceText = localLabel(locale, {
    ro: "Preț per medic acoperit / lună",
    en: "Price per covered Doctor / month",
    de: "Preis pro abgedecktem Arzt / Monat",
  });
  const vatText = localLabel(locale, {
    ro: "TVA",
    en: "VAT",
    de: "MwSt.",
  });
  const estimateText = localLabel(locale, {
    ro: "Estimare lunară",
    en: "Estimated monthly amount",
    de: "Geschätzter Monatsbetrag",
  });
  const operationalText = localLabel(locale, {
    ro: "Estimarea folosește tarifele globale configurate în prezent. Factura contabilă este creată separat în SAGA.",
    en: "The estimate uses the currently configured global prices. The accounting invoice is created separately in SAGA.",
    de: "Die Schätzung verwendet die aktuell konfigurierten globalen Preise. Die Buchhaltungsrechnung wird separat in SAGA erstellt.",
  });

  return (
    <section className="space-y-[21px] rounded-2xl border border-gray-200 bg-white p-[21px] shadow-sm">
      <div>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.organizations.eyebrow}
        </p>
        <h2 className="mt-[5px] text-xl font-bold text-gray-900">
          {copy.organizations.title}
        </h2>
        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.organizations.description}
        </p>
        <p className="mt-[8px] text-sm text-gray-500">
          {currencyText}: {currency}
        </p>
      </div>

      <div className="grid gap-[13px] sm:grid-cols-2 lg:grid-cols-4">
        {[
          [copy.organizations.metrics.organizations, totalOrganizations],
          [copy.organizations.metrics.active, activeOrganizations],
          [copy.organizations.metrics.pending, pendingOrganizations],
          [copy.organizations.metrics.coveredDoctors, activeCoveredDoctors],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-[13px]"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {label}
            </p>
            <p className="mt-[8px] text-2xl font-bold text-gray-900">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-[13px] text-sm text-gray-700">
        <p>
          <span className="font-semibold">{currencyText}:</span> {currency}
        </p>
        <p className="mt-[5px]">
          <span className="font-semibold">{monthlyPriceText}:</span>{" "}
          {formatCurrency(doctorMonthlyPrice)}
        </p>
        <p className="mt-[5px]">
          <span className="font-semibold">{vatText}:</span>{" "}
          {formatPercent(vatRate)}
        </p>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm text-gray-600">
          {copy.organizations.empty}
        </div>
      ) : (
        <div className="space-y-[13px]">
          {organizations.map((organization) => {
            const summary = summaries.get(organization.id) ?? emptySummary();
            const billing = billingByOrganization.get(organization.id) ?? null;
            const coveredDoctors =
              coveredDoctorsByOrganization.get(organization.id) ?? [];
            const estimatedNet =
              summary.activeCoveredDoctorCount * doctorMonthlyPrice;
            const estimatedGross = estimatedNet + estimatedNet * vatRate;

            return (
              <details
                key={organization.id}
                className="group overflow-hidden rounded-2xl border border-gray-200 bg-white"
              >
                <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] px-[21px] py-[13px] hover:bg-gray-50 [&::-webkit-details-marker]:hidden">
                  <div>
                    <div className="flex flex-wrap items-center gap-[8px]">
                      <h3 className="font-bold text-gray-900">
                        {organization.name}
                      </h3>
                      <span
                        className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                          organization.status
                        )}`}
                      >
                        {organizationStatus(organization.status)}
                      </span>
                    </div>
                    <p className="mt-[5px] text-xs text-gray-500">
                      {interpolatePlatformClinicCopy(
                        copy.organizations.labels.created,
                        { date: formatDate(organization.created_at) }
                      )}
                    </p>
                  </div>
                  <span className="text-xl text-gray-500 transition-transform group-open:rotate-180">
                    ⌄
                  </span>
                </summary>

                <div className="border-t border-gray-200 p-[21px]">
                  <div className="grid gap-[13px] md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.organizations.labels.manager}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {summary.managerNames.join(", ") || copy.common.none}
                      </p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.organizations.labels.clinics}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {copy.organizations.labels.activeClinics}:{" "}
                        {summary.activeClinicNames.length}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {copy.organizations.labels.pendingClinics}:{" "}
                        {summary.pendingClinicCount}
                      </p>

                      {organization.status === "active" ? (
                        <ClinicOrganizationLocationAdder
                          locale={locale}
                          organizationId={organization.id}
                          organizationName={organization.name}
                        />
                      ) : null}
                    </div>

                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.organizations.labels.doctors}
                      </p>
                      <p className="mt-[5px] text-sm text-gray-900">
                        {copy.organizations.labels.covered}:{" "}
                        {summary.activeCoveredDoctorCount}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {copy.organizations.labels.registered}:{" "}
                        {summary.acceptedDoctorCount}
                      </p>
                      <p className="mt-[5px] text-xs text-gray-500">
                        {copy.organizations.labels.openInvitations}:{" "}
                        {summary.invitedDoctorCount}
                      </p>

                      <ClinicOrganizationDoctorsManager
                        locale={locale}
                        organizationId={organization.id}
                        organizationName={organization.name}
                        coveredDoctors={coveredDoctors}
                      />
                    </div>

                    <div className="rounded-xl bg-gray-50 p-[13px]">
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {copy.organizations.labels.billing}
                      </p>
                      {billing ? (
                        <>
                          <p className="mt-[5px] text-sm font-medium text-gray-900">
                            {billing.company_name}
                          </p>
                          <p className="mt-[5px] text-xs text-gray-500">
                            {copy.organizations.labels.taxId}: {billing.tax_id}
                          </p>
                          <p className="mt-[5px] text-xs text-gray-500">
                            {billing.billing_city} · {billing.billing_country}
                          </p>
                        </>
                      ) : (
                        <p className="mt-[5px] text-sm text-gray-500">
                          {copy.organizations.labels.billingMissing}
                        </p>
                      )}
                      <p className="mt-[8px] text-xs text-gray-500">
                        {currencyText}: {currency}
                      </p>
                      <p className="mt-[5px] text-xs font-semibold text-gray-700">
                        {estimateText}: {formatCurrency(estimatedGross)}
                      </p>

                      <ClinicOrganizationBillingEditor
                        locale={locale}
                        organizationId={organization.id}
                        organizationName={organization.name}
                        contactName={organization.contact_name}
                        contactEmail={organization.contact_email}
                        contactPhone={organization.contact_phone}
                        billingProfile={billing}
                      />
                    </div>
                  </div>

                  <div className="mt-[13px] rounded-xl border border-gray-200 bg-white p-[13px] text-sm text-gray-700">
                    <p>
                      <span className="font-semibold">
                        {copy.organizations.labels.contact}:
                      </span>{" "}
                      {organization.contact_name ?? copy.common.none}
                      {organization.contact_email
                        ? ` · ${organization.contact_email}`
                        : ""}
                      {organization.contact_phone
                        ? ` · ${organization.contact_phone}`
                        : ""}
                    </p>
                    {summary.activeClinicNames.length ? (
                      <p className="mt-[8px] text-xs leading-5 text-gray-600">
                        {summary.activeClinicNames.join(", ")}
                      </p>
                    ) : null}
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
        {operationalText}
      </div>
    </section>
  );
}
