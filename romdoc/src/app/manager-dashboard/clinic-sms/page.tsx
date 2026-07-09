import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ClinicSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type OrganizationRow = {
  id: string;
  name: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
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

type OrganizationMemberRow = {
  organization_id: string;
  profile_id: string;
  member_role: string;
  status: string;
  profiles:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | {
        first_name: string | null;
        last_name: string | null;
      }[]
    | null;
};

type SmsLogRow = {
  id: string;
  doctor_id: string | null;
  clinic_id: string | null;
  event: string | null;
  recipient: string | null;
  status: string | null;
  provider: string | null;
  provider_message_id: string | null;
  created_at: string;
  delivery_report_status: string | null;
  invoice_status: string | null;
  unit_cost_minor: number | null;
  currency: string | null;
  invoice_reference: string | null;
  invoiced_at: string | null;
  payer_type: string | null;
  payer_clinic_organization_id: string | null;
};

type DoctorRow = {
  id: string;
  slug: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRow = {
  id: string;
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type AuthUserSummary = {
  email: string | null;
};

type ManagerInfo = {
  profileId: string;
  name: string;
  email: string | null;
  role: string;
  status: string;
};

type ClinicDoctorRelationshipRow = {
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  invited_doctor_email: string | null;
  accepted_account_email: string | null;
  invitation_status: string;
  coverage_status: string;
  payment_responsibility: string;
};

type ClinicDoctorInfo = {
  doctorId: string | null;
  displayName: string;
  email: string | null;
  clinicName: string | null;
  invitationStatus: string;
  coverageStatus: string;
};

type OrganizationInvoiceGroup = {
  organization: OrganizationRow;
  billingProfile: OrganizationBillingProfileRow | null;
  managers: ManagerInfo[];
  clinicDoctors: ClinicDoctorInfo[];
  doctorCount: number;
  subscriptionSubtotalMinor: number;
  subscriptionVatMinor: number;
  subscriptionTotalMinor: number;
  smsLogs: SmsLogRow[];
  sentCount: number;
  uninvoicedCount: number;
  invoicedCount: number;
  failedCount: number;
  uninvoicedCostMinor: number;
  currency: string;
};

function getMonthRange(monthParam: string | undefined) {
  const now = new Date();
  const fallbackYear = now.getFullYear();
  const fallbackMonth = now.getMonth() + 1;

  const match = monthParam?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : fallbackYear;
  const month = match ? Number(match[2]) : fallbackMonth;

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12
  ) {
    return getMonthRange(undefined);
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const previous = new Date(Date.UTC(year, month - 2, 1));
  const next = new Date(Date.UTC(year, month, 1));

  return {
    label: new Intl.DateTimeFormat("ro-RO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(start),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    currentMonth: start.toISOString().slice(0, 7),
    previousMonth: previous.toISOString().slice(0, 7),
    nextMonth: next.toISOString().slice(0, 7),
  };
}

function formatCurrencyMinor(valueMinor: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(valueMinor / 100);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(new Date(value));
}

function maskRecipient(value: string | null) {
  if (!value) {
    return "—";
  }

  const trimmed = value.trim();

  if (trimmed.length <= 4) {
    return "••••";
  }

  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-3)}`;
}

function getFirstRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation) ? (relation[0] ?? null) : relation;
}

function getDisplayName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  fallback = "Manager clinică",
) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

function getClinicName(clinic: ClinicRow) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro",
    )?.name ??
    clinic.clinic_translations?.[0]?.name ??
    clinic.slug
  );
}

function getStatusLabel(status: string | null) {
  switch (status) {
    case "sent":
      return "Trimis";
    case "failed":
      return "Eșuat";
    case "skipped":
      return "Sărit";
    case "queued":
      return "În coadă";
    default:
      return status ?? "—";
  }
}

function getInvoiceLabel(status: string | null) {
  switch (status) {
    case "uninvoiced":
      return "Nefacturat";
    case "invoiced":
      return "Facturat";
    case "credited":
      return "Stornat";
    case "not_billable":
      return "Nefacturabil";
    default:
      return status ?? "—";
  }
}

function getMemberRoleLabel(role: string) {
  switch (role) {
    case "owner":
      return "Owner";
    case "billing_manager":
      return "Manager facturare clinică";
    case "manager":
      return "Manager clinică";
    default:
      return role;
  }
}

function SummaryBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{helper}</p>
    </div>
  );
}

const DOCTOR_MONTHLY_SUBSCRIPTION_MINOR = 6000;
const ROMANIA_VAT_RATE = 0.21;

function FieldLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  );
}

async function listAuthUsersById(profileIds: string[]) {
  if (profileIds.length === 0) {
    return new Map<string, AuthUserSummary>();
  }

  const admin = createAdminClient();
  const wantedIds = new Set(profileIds);
  const usersById = new Map<string, AuthUserSummary>();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("Clinic manager auth user lookup failed:", error);
      return usersById;
    }

    for (const authUser of data.users) {
      if (wantedIds.has(authUser.id)) {
        usersById.set(authUser.id, {
          email: authUser.email ?? null,
        });
      }
    }

    if (data.users.length < perPage || usersById.size === wantedIds.size) {
      break;
    }

    page += 1;
  }

  return usersById;
}

export default async function ManagerClinicSmsPage({
  searchParams,
}: ClinicSmsPageProps) {
  const parameters = await searchParams;
  const monthRange = getMonthRange(parameters?.month);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/manager-dashboard/clinic-sms");
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "manager" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const { data: permission } = await admin
    .from("manager_permissions")
    .select("profile_id")
    .eq("profile_id", user.id)
    .eq("permission_key", "accounting")
    .is("revoked_at", null)
    .maybeSingle();

  if (!permission) {
    return (
      <div className="space-y-8">
        <header>
          <p className="text-sm font-semibold text-[#036661]">Panou manager</p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Facturare SMS clinici
          </h1>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-lg font-bold">
            Permisiunea Facturare este necesară
          </h2>
          <p className="mt-2 text-sm leading-6">
            Această pagină este disponibilă doar managerilor RomDoc cu
            permisiunea Facturare. Administratorul poate acorda această
            permisiune din pagina Admin → Manageri RomDoc.
          </p>
        </section>
      </div>
    );
  }

  const [
    organizationsResult,
    billingProfilesResult,
    organizationMembersResult,
    clinicDoctorRelationshipsResult,
    smsLogsResult,
  ] = await Promise.all([
    admin
      .from("clinic_organizations")
      .select(
        "id, name, status, contact_name, contact_email, contact_phone, website",
      )
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
    admin
      .from("clinic_organization_members")
      .select(
        `
        organization_id,
        profile_id,
        member_role,
        status,
        profiles!clinic_organization_members_profile_id_fkey (
          first_name,
          last_name
        )
      `,
      )
      .eq("status", "active"),
    admin
      .from("clinic_doctor_relationships")
      .select(
        `
        organization_id,
        clinic_id,
        doctor_id,
        invited_doctor_email,
        accepted_account_email,
        invitation_status,
        coverage_status,
        payment_responsibility
      `,
      )
      .eq("payment_responsibility", "clinic_paid"),
    admin
      .from("sms_delivery_logs")
      .select(
        `
        id,
        doctor_id,
        clinic_id,
        event,
        recipient,
        status,
        provider,
        provider_message_id,
        created_at,
        delivery_report_status,
        invoice_status,
        unit_cost_minor,
        currency,
        invoice_reference,
        invoiced_at,
        payer_type,
        payer_clinic_organization_id
      `,
      )
      .gte("created_at", monthRange.startIso)
      .lt("created_at", monthRange.endIso)
      .order("created_at", { ascending: false }),
  ]);

  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const billingProfiles = (billingProfilesResult.data ??
    []) as OrganizationBillingProfileRow[];
  const organizationMembers = (organizationMembersResult.data ??
    []) as OrganizationMemberRow[];
  const clinicDoctorRelationships = (clinicDoctorRelationshipsResult.data ??
    []) as ClinicDoctorRelationshipRow[];
  const allSmsLogs = (smsLogsResult.data ?? []) as SmsLogRow[];

  const clinicSmsLogs = allSmsLogs.filter(
    (log) =>
      log.payer_type === "clinic_organization" ||
      Boolean(log.payer_clinic_organization_id),
  );

  const billingProfileByOrganizationId = new Map(
    billingProfiles.map((profile) => [profile.organization_id, profile]),
  );

  const managerProfileIds = Array.from(
    new Set(
      organizationMembers.map((member) => member.profile_id).filter(Boolean),
    ),
  );

  const authUserById = await listAuthUsersById(managerProfileIds);

  const managersByOrganizationId = new Map<string, ManagerInfo[]>();

  for (const member of organizationMembers) {
    const memberProfile = getFirstRelation(member.profiles);
    const manager: ManagerInfo = {
      profileId: member.profile_id,
      name: getDisplayName(
        memberProfile?.first_name,
        memberProfile?.last_name,
        "Manager clinică",
      ),
      email: authUserById.get(member.profile_id)?.email ?? null,
      role: member.member_role,
      status: member.status,
    };

    const existing = managersByOrganizationId.get(member.organization_id) ?? [];
    existing.push(manager);
    managersByOrganizationId.set(member.organization_id, existing);
  }

  const organizationIdsWithSms = new Set(
    clinicSmsLogs
      .map((log) => log.payer_clinic_organization_id)
      .filter((id): id is string => Boolean(id)),
  );

  const groupedOrganizations = organizations.filter(
    (organization) =>
      organization.status === "active" ||
      organizationIdsWithSms.has(organization.id) ||
      billingProfileByOrganizationId.has(organization.id),
  );

  const doctorIds = Array.from(
    new Set(
      [
        ...clinicSmsLogs.map((log) => log.doctor_id),
        ...clinicDoctorRelationships.map(
          (relationship) => relationship.doctor_id,
        ),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const clinicIds = Array.from(
    new Set(
      [
        ...clinicSmsLogs.map((log) => log.clinic_id),
        ...clinicDoctorRelationships.map(
          (relationship) => relationship.clinic_id,
        ),
      ].filter((id): id is string => Boolean(id)),
    ),
  );

  const [doctorsResult, clinicsResult] = await Promise.all([
    doctorIds.length > 0
      ? admin.from("doctors").select("id, slug").in("id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
    clinicIds.length > 0
      ? admin
          .from("clinics")
          .select(
            `
            id,
            slug,
            clinic_translations (
              locale,
              name
            )
          `,
          )
          .in("id", clinicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const clinics = (clinicsResult.data ?? []) as ClinicRow[];

  const doctorSlugById = new Map(
    doctors.map((doctor) => [doctor.id, doctor.slug]),
  );
  const clinicNameById = new Map(
    clinics.map((clinic) => [clinic.id, getClinicName(clinic)]),
  );

  const clinicDoctorsByOrganizationId = new Map<string, ClinicDoctorInfo[]>();

  for (const relationship of clinicDoctorRelationships) {
    const isManagedDoctor =
      relationship.payment_responsibility === "clinic_paid" &&
      relationship.invitation_status === "accepted" &&
      relationship.coverage_status === "active";

    if (!isManagedDoctor) {
      continue;
    }

    const doctorLabel = relationship.doctor_id
      ? (doctorSlugById.get(relationship.doctor_id) ??
        relationship.doctor_id.slice(0, 8))
      : (relationship.accepted_account_email ??
        relationship.invited_doctor_email ??
        "Medic clinică");

    const doctorInfo: ClinicDoctorInfo = {
      doctorId: relationship.doctor_id,
      displayName: doctorLabel,
      email:
        relationship.accepted_account_email ??
        relationship.invited_doctor_email ??
        null,
      clinicName: relationship.clinic_id
        ? (clinicNameById.get(relationship.clinic_id) ??
          relationship.clinic_id.slice(0, 8))
        : null,
      invitationStatus: relationship.invitation_status,
      coverageStatus: relationship.coverage_status,
    };

    const existing =
      clinicDoctorsByOrganizationId.get(relationship.organization_id) ?? [];
    existing.push(doctorInfo);
    clinicDoctorsByOrganizationId.set(relationship.organization_id, existing);
  }

  const groups: OrganizationInvoiceGroup[] = groupedOrganizations
    .map((organization) => {
      const smsLogs = clinicSmsLogs.filter(
        (log) => log.payer_clinic_organization_id === organization.id,
      );
      const sentCount = smsLogs.filter((row) => row.status === "sent").length;
      const failedCount = smsLogs.filter(
        (row) => row.status === "failed",
      ).length;
      const uninvoicedRows = smsLogs.filter(
        (row) => row.invoice_status === "uninvoiced",
      );
      const invoicedCount = smsLogs.filter(
        (row) => row.invoice_status === "invoiced",
      ).length;
      const currency = smsLogs.find((row) => row.currency)?.currency ?? "RON";

      const clinicDoctors =
        clinicDoctorsByOrganizationId.get(organization.id) ?? [];
      const doctorCount = clinicDoctors.length;
      const subscriptionSubtotalMinor =
        doctorCount * DOCTOR_MONTHLY_SUBSCRIPTION_MINOR;
      const subscriptionVatMinor = Math.round(
        subscriptionSubtotalMinor * ROMANIA_VAT_RATE,
      );

      return {
        organization,
        billingProfile:
          billingProfileByOrganizationId.get(organization.id) ?? null,
        managers: managersByOrganizationId.get(organization.id) ?? [],
        clinicDoctors,
        doctorCount,
        subscriptionSubtotalMinor,
        subscriptionVatMinor,
        subscriptionTotalMinor:
          subscriptionSubtotalMinor + subscriptionVatMinor,
        smsLogs,
        sentCount,
        uninvoicedCount: uninvoicedRows.length,
        invoicedCount,
        failedCount,
        uninvoicedCostMinor: uninvoicedRows.reduce(
          (total, row) => total + (row.unit_cost_minor ?? 0),
          0,
        ),
        currency,
      };
    })
    .sort((first, second) => {
      if (first.uninvoicedCostMinor !== second.uninvoicedCostMinor) {
        return second.uninvoicedCostMinor - first.uninvoicedCostMinor;
      }

      return first.organization.name.localeCompare(
        second.organization.name,
        "ro",
      );
    });

  const sentRows = clinicSmsLogs.filter((row) => row.status === "sent");
  const failedRows = clinicSmsLogs.filter((row) => row.status === "failed");
  const uninvoicedRows = clinicSmsLogs.filter(
    (row) => row.invoice_status === "uninvoiced",
  );
  const invoicedRows = clinicSmsLogs.filter(
    (row) => row.invoice_status === "invoiced",
  );

  const estimatedUninvoicedCostMinor = uninvoicedRows.reduce(
    (total, row) => total + (row.unit_cost_minor ?? 0),
    0,
  );

  const currency = clinicSmsLogs.find((row) => row.currency)?.currency ?? "RON";
  const pageError =
    organizationsResult.error?.message ??
    billingProfilesResult.error?.message ??
    organizationMembersResult.error?.message ??
    clinicDoctorRelationshipsResult.error?.message ??
    smsLogsResult.error?.message ??
    doctorsResult.error?.message ??
    clinicsResult.error?.message ??
    null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Manager Facturare
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturare SMS clinici
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi consumul SMS al clinicilor pentru perioada selectată și datele
          necesare pentru invoicing. Corpul SMS, notele medicale și dosarele
          pacienților nu sunt afișate.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Perioadă: {monthRange.label}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Sunt afișate SMS-urile cu payer clinică și organizațiile de
              clinică care pot necesita facturare.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/manager-dashboard/clinic-sms?month=${monthRange.previousMonth}`}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Luna anterioară
            </Link>
            <Link
              href={`/manager-dashboard/clinic-sms?month=${monthRange.nextMonth}`}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Luna următoare
            </Link>
          </div>
        </div>
      </section>

      {pageError ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800 shadow-sm">
          <h2 className="font-semibold">
            Datele de facturare SMS nu au putut fi încărcate complet
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-red-900">
            {pageError}
          </pre>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryBox
          label="Organizații"
          value={groups.length}
          helper="Organizații active sau cu date de facturare/consum."
        />
        <SummaryBox
          label="SMS trimise"
          value={sentRows.length}
          helper="Mesaje marcate ca trimise pentru clinici."
        />
        <SummaryBox
          label="Nefacturate"
          value={uninvoicedRows.length}
          helper="SMS care pot intra în factura clinicii."
        />
        <SummaryBox
          label="Facturate"
          value={invoicedRows.length}
          helper="SMS deja marcate ca facturate."
        />
        <SummaryBox
          label="Cost estimat"
          value={formatCurrencyMinor(estimatedUninvoicedCostMinor, currency)}
          helper="Estimare pentru SMS nefacturate."
        />
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Organizații pentru invoicing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Fiecare organizație este afișată într-un accordion ca să păstrăm
              pagina compactă. Deschide organizația pentru datele de facturare,
              Clinic Manageri și detaliile SMS.
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
            {clinicSmsLogs.length} loguri SMS
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există organizații de clinică sau consum SMS de clinică pentru
            perioada selectată.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {groups.map((group) => {
              const billing = group.billingProfile;
              const organization = group.organization;

              return (
                <details
                  key={organization.id}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-sm open:border-[#036661]/40"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-4 rounded-2xl px-5 py-4 hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {organization.name}
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {organization.status}
                        </span>
                        {billing ? (
                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-800">
                            Date facturare OK
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Lipsesc date facturare
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {group.doctorCount}{" "}
                        {group.doctorCount === 1 ? "medic" : "medici"} ·{" "}
                        {group.sentCount} SMS trimise · {group.uninvoicedCount}{" "}
                        nefacturate ·{" "}
                        {formatCurrencyMinor(
                          group.uninvoicedCostMinor,
                          group.currency,
                        )}
                      </p>
                    </div>

                    <span className="text-sm font-semibold text-[#036661] transition group-open:rotate-180">
                      Deschide ↓
                    </span>
                  </summary>

                  <div className="border-t border-gray-200 px-5 py-5">
                    <div className="grid gap-4 md:grid-cols-4">
                      <SummaryBox
                        label="SMS trimise"
                        value={group.sentCount}
                        helper="Pentru această organizație."
                      />
                      <SummaryBox
                        label="Nefacturate"
                        value={group.uninvoicedCount}
                        helper="Intră în calculul facturii."
                      />
                      <SummaryBox
                        label="Facturate"
                        value={group.invoicedCount}
                        helper="Au referință/status de facturare."
                      />
                      <SummaryBox
                        label="Cost estimat"
                        value={formatCurrencyMinor(
                          group.uninvoicedCostMinor,
                          group.currency,
                        )}
                        helper="Doar SMS nefacturate."
                      />
                    </div>

                    <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            Abonamente medici gestionați de clinică
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-gray-700">
                            Nr. medici gestionați = {group.doctorCount};{" "}
                            {group.doctorCount} × 60 lei ={" "}
                            {formatCurrencyMinor(
                              group.subscriptionSubtotalMinor,
                              "RON",
                            )}{" "}
                            + TVA.
                          </p>
                        </div>

                        <div className="grid gap-3 text-sm sm:grid-cols-3 lg:min-w-[30rem]">
                          <div className="rounded-xl border border-white/70 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Subtotal
                            </p>
                            <p className="mt-1 text-lg font-bold text-gray-900">
                              {formatCurrencyMinor(
                                group.subscriptionSubtotalMinor,
                                "RON",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/70 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              TVA 21%
                            </p>
                            <p className="mt-1 text-lg font-bold text-gray-900">
                              {formatCurrencyMinor(
                                group.subscriptionVatMinor,
                                "RON",
                              )}
                            </p>
                          </div>

                          <div className="rounded-xl border border-white/70 bg-white p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              Total
                            </p>
                            <p className="mt-1 text-lg font-bold text-gray-900">
                              {formatCurrencyMinor(
                                group.subscriptionTotalMinor,
                                "RON",
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="mt-6 grid gap-5 lg:grid-cols-3">
                      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <h4 className="font-bold text-gray-900">
                          Date organizație
                        </h4>
                        <dl className="mt-4 space-y-4">
                          <FieldLine
                            label="Contact"
                            value={organization.contact_name}
                          />
                          <FieldLine
                            label="E-mail contact"
                            value={organization.contact_email}
                          />
                          <FieldLine
                            label="Telefon"
                            value={organization.contact_phone}
                          />
                          <FieldLine
                            label="Website"
                            value={organization.website}
                          />
                        </dl>
                      </section>

                      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <h4 className="font-bold text-gray-900">
                          Date facturare
                        </h4>
                        {billing ? (
                          <dl className="mt-4 space-y-4">
                            <FieldLine
                              label="Firmă"
                              value={billing.company_name}
                            />
                            <FieldLine label="CUI" value={billing.tax_id} />
                            <FieldLine
                              label="Nr. Registrul Comerțului"
                              value={billing.trade_register_number}
                            />
                            <FieldLine
                              label="Plătitor TVA"
                              value={billing.is_vat_payer ? "Da" : "Nu"}
                            />
                            <FieldLine
                              label="Cod TVA"
                              value={billing.vat_number}
                            />
                            <FieldLine
                              label="E-mail facturare"
                              value={billing.billing_email}
                            />
                            <FieldLine
                              label="Adresă"
                              value={`${billing.billing_address}, ${billing.billing_city}, ${billing.billing_county}, ${billing.billing_country}`}
                            />
                          </dl>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-amber-800">
                            Nu există încă profil de facturare pentru această
                            organizație. Contactează Clinic Managerul înainte de
                            emiterea facturii.
                          </p>
                        )}
                      </section>

                      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <h4 className="font-bold text-gray-900">
                          Clinic Manageri
                        </h4>
                        {group.managers.length === 0 ? (
                          <p className="mt-4 text-sm leading-6 text-gray-600">
                            Nu există manager activ legat de această
                            organizație.
                          </p>
                        ) : (
                          <div className="mt-4 space-y-3">
                            {group.managers.map((manager) => (
                              <div
                                key={`${organization.id}-${manager.profileId}`}
                                className="rounded-xl border border-gray-200 bg-white p-4"
                              >
                                <p className="font-semibold text-gray-900">
                                  {manager.name}
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {manager.email ?? "E-mail indisponibil"}
                                </p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {getMemberRoleLabel(manager.role)} ·{" "}
                                  {manager.status}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </section>
                    </div>

                    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            Medici gestionați de clinică
                          </h4>
                          <p className="mt-1 text-sm text-gray-600">
                            Acești medici sunt conturi clinic-paid acceptate și
                            active pentru organizația de clinică.
                          </p>
                        </div>
                        <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
                          {group.doctorCount}{" "}
                          {group.doctorCount === 1 ? "medic" : "medici"}
                        </span>
                      </div>

                      {group.clinicDoctors.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                          Nu există încă medici clinic-paid activi legați de
                          această organizație.
                        </div>
                      ) : (
                        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {group.clinicDoctors.map((doctor) => (
                            <div
                              key={`${organization.id}-${doctor.doctorId ?? doctor.email ?? doctor.displayName}`}
                              className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                            >
                              <p className="font-semibold text-gray-900">
                                {doctor.displayName}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {doctor.email ?? "E-mail indisponibil"}
                              </p>
                              <p className="mt-1 text-sm text-gray-600">
                                {doctor.clinicName ?? "Locație neasignată"}
                              </p>
                              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {doctor.invitationStatus} ·{" "}
                                {doctor.coverageStatus}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            Detalii SMS
                          </h4>
                          <p className="mt-1 text-sm text-gray-600">
                            Numărul pacientului este mascat. Nu afișăm
                            conținutul mesajelor.
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                          {group.smsLogs.length} loguri
                        </span>
                      </div>

                      {group.smsLogs.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                          Nu există consum SMS pentru această organizație în
                          perioada selectată.
                        </div>
                      ) : (
                        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                  <th className="px-4 py-3">Dată</th>
                                  <th className="px-4 py-3">Medic</th>
                                  <th className="px-4 py-3">Clinică</th>
                                  <th className="px-4 py-3">Eveniment</th>
                                  <th className="px-4 py-3">Status</th>
                                  <th className="px-4 py-3">Destinatar</th>
                                  <th className="px-4 py-3">Facturare</th>
                                  <th className="px-4 py-3 text-right">Cost</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 bg-white">
                                {group.smsLogs.map((row) => (
                                  <tr key={row.id}>
                                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                                      {formatDateTime(row.created_at)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {row.doctor_id
                                        ? (doctorSlugById.get(row.doctor_id) ??
                                          row.doctor_id.slice(0, 8))
                                        : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {row.clinic_id
                                        ? (clinicNameById.get(row.clinic_id) ??
                                          row.clinic_id.slice(0, 8))
                                        : "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {row.event ?? "—"}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {getStatusLabel(row.status)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      {maskRecipient(row.recipient)}
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">
                                      <div>
                                        {getInvoiceLabel(row.invoice_status)}
                                      </div>
                                      {row.invoice_reference ? (
                                        <div className="text-xs text-gray-500">
                                          {row.invoice_reference}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                                      {formatCurrencyMinor(
                                        row.unit_cost_minor ?? 0,
                                        row.currency ?? group.currency,
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </section>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
