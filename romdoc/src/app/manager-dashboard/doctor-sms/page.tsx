import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type DoctorSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
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
  profile_id: string | null;
  slug: string;
  email: string | null;
  phone: string | null;
  account_type: string | null;
  status: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  account_status: string | null;
};

type DoctorTranslationRow = {
  doctor_id: string;
  locale: string;
  title: string | null;
};

type DoctorBillingProfileRow = {
  id: string;
  doctor_id: string;
  profile_id: string;
  entity_type: string;
  legal_name: string;
  cui: string;
  trade_registry_number: string | null;
  vat_payer: boolean;
  billing_address: string;
  county: string;
  city: string;
  postal_code: string | null;
  country: string;
  billing_email: string;
  accounting_contact_name: string | null;
  accounting_contact_phone: string | null;
  invoice_notes: string | null;
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

type DoctorInvoiceGroup = {
  doctor: DoctorRow;
  profile: ProfileRow | null;
  billingProfile: DoctorBillingProfileRow | null;
  title: string | null;
  authEmail: string | null;
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

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
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

function getDisplayName(profile: ProfileRow | null, doctor: DoctorRow) {
  const profileName = [profile?.first_name, profile?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return profileName || doctor.slug || "Medic";
}

function getClinicName(clinic: ClinicRow) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
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

function getEntityTypeLabel(entityType: string | null | undefined) {
  switch (entityType) {
    case "company":
      return "Firmă";
    case "individual":
      return "Persoană fizică";
    case "pfa":
      return "PFA";
    default:
      return entityType ?? "—";
  }
}

function getDoctorAccountTypeLabel(value: string | null) {
  switch (value) {
    case "clinic_sub_account":
      return "Medic clinică";
    case "independent":
      return "Medic independent";
    default:
      return value ?? "—";
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
      <p className="mt-3 text-2xl font-bold text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

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
      <dd className="mt-1 text-sm font-medium text-gray-900">
        {value || "—"}
      </dd>
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
      console.error("Doctor invoicing auth user lookup failed:", error);
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

export default async function ManagerDoctorSmsPage({
  searchParams,
}: DoctorSmsPageProps) {
  const parameters = await searchParams;
  const monthRange = getMonthRange(parameters?.month);
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/manager-dashboard/doctor-sms");
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
          <p className="text-sm font-semibold text-[#036661]">
            Panou manager
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Facturare SMS medici
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

  const [smsLogsResult, billingProfilesResult] = await Promise.all([
    admin
      .from("sms_delivery_logs")
      .select(`
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
      `)
      .gte("created_at", monthRange.startIso)
      .lt("created_at", monthRange.endIso)
      .order("created_at", { ascending: false }),
    admin
      .from("doctor_billing_profiles")
      .select(`
        id,
        doctor_id,
        profile_id,
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
        billing_email,
        accounting_contact_name,
        accounting_contact_phone,
        invoice_notes
      `),
  ]);

  const allSmsLogs = (smsLogsResult.data ?? []) as SmsLogRow[];
  const billingProfiles =
    (billingProfilesResult.data ?? []) as DoctorBillingProfileRow[];

  const doctorSmsLogs = allSmsLogs.filter(
    (log) =>
      Boolean(log.doctor_id) &&
      log.payer_clinic_organization_id === null &&
      log.payer_type !== "clinic_organization"
  );

  const billingProfileByDoctorId = new Map(
    billingProfiles.map((profile) => [profile.doctor_id, profile])
  );

  const doctorIds = Array.from(
    new Set([
      ...doctorSmsLogs
        .map((log) => log.doctor_id)
        .filter((id): id is string => Boolean(id)),
      ...billingProfiles.map((profile) => profile.doctor_id),
    ])
  );

  const clinicIds = Array.from(
    new Set(
      doctorSmsLogs
        .map((log) => log.clinic_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [doctorsResult, clinicsResult] = await Promise.all([
    doctorIds.length > 0
      ? admin
          .from("doctors")
          .select("id, profile_id, slug, email, phone, account_type, status")
          .in("id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
    clinicIds.length > 0
      ? admin
          .from("clinics")
          .select(`
            id,
            slug,
            clinic_translations (
              locale,
              name
            )
          `)
          .in("id", clinicIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const clinics = (clinicsResult.data ?? []) as ClinicRow[];

  const profileIds = Array.from(
    new Set(
      doctors
        .map((doctor) => doctor.profile_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [profilesResult, translationsResult] = await Promise.all([
    profileIds.length > 0
      ? admin
          .from("profiles")
          .select("id, first_name, last_name, account_status")
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    doctorIds.length > 0
      ? admin
          .from("doctor_translations")
          .select("doctor_id, locale, title")
          .in("doctor_id", doctorIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const translations = (translationsResult.data ?? []) as DoctorTranslationRow[];
  const authUserById = await listAuthUsersById(profileIds);

  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const titleByDoctorId = new Map(
    translations
      .filter((translation) => translation.locale === "ro" && translation.title)
      .map((translation) => [translation.doctor_id, translation.title])
  );
  const clinicNameById = new Map(
    clinics.map((clinic) => [clinic.id, getClinicName(clinic)])
  );

  const groups: DoctorInvoiceGroup[] = doctors
    .map((doctor) => {
      const smsLogs = doctorSmsLogs.filter((log) => log.doctor_id === doctor.id);
      const sentCount = smsLogs.filter((row) => row.status === "sent").length;
      const failedCount = smsLogs.filter((row) => row.status === "failed").length;
      const uninvoicedRows = smsLogs.filter(
        (row) => row.invoice_status === "uninvoiced"
      );
      const invoicedCount = smsLogs.filter(
        (row) => row.invoice_status === "invoiced"
      ).length;
      const currency = smsLogs.find((row) => row.currency)?.currency ?? "RON";
      const profile = doctor.profile_id
        ? profileById.get(doctor.profile_id) ?? null
        : null;

      return {
        doctor,
        profile,
        billingProfile: billingProfileByDoctorId.get(doctor.id) ?? null,
        title: titleByDoctorId.get(doctor.id) ?? null,
        authEmail: doctor.profile_id
          ? authUserById.get(doctor.profile_id)?.email ?? null
          : null,
        smsLogs,
        sentCount,
        uninvoicedCount: uninvoicedRows.length,
        invoicedCount,
        failedCount,
        uninvoicedCostMinor: uninvoicedRows.reduce(
          (total, row) => total + (row.unit_cost_minor ?? 0),
          0
        ),
        currency,
      };
    })
    .filter(
      (group) =>
        group.smsLogs.length > 0 ||
        Boolean(group.billingProfile)
    )
    .sort((first, second) => {
      if (first.uninvoicedCostMinor !== second.uninvoicedCostMinor) {
        return second.uninvoicedCostMinor - first.uninvoicedCostMinor;
      }

      return getDisplayName(first.profile, first.doctor).localeCompare(
        getDisplayName(second.profile, second.doctor),
        "ro"
      );
    });

  const sentRows = doctorSmsLogs.filter((row) => row.status === "sent");
  const failedRows = doctorSmsLogs.filter((row) => row.status === "failed");
  const uninvoicedRows = doctorSmsLogs.filter(
    (row) => row.invoice_status === "uninvoiced"
  );
  const invoicedRows = doctorSmsLogs.filter(
    (row) => row.invoice_status === "invoiced"
  );

  const estimatedUninvoicedCostMinor = uninvoicedRows.reduce(
    (total, row) => total + (row.unit_cost_minor ?? 0),
    0
  );

  const currency = doctorSmsLogs.find((row) => row.currency)?.currency ?? "RON";
  const pageError =
    smsLogsResult.error?.message ??
    billingProfilesResult.error?.message ??
    doctorsResult.error?.message ??
    clinicsResult.error?.message ??
    profilesResult.error?.message ??
    translationsResult.error?.message ??
    null;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Manager Facturare
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturare SMS medici
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi consumul SMS al medicilor individuali pentru perioada selectată
          și datele necesare pentru invoicing. Corpul SMS, notele medicale și
          dosarele pacienților nu sunt afișate.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Perioadă: {monthRange.label}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Sunt afișate SMS-urile unde payer-ul nu este organizație de
              clinică. Pentru clinicile care plătesc centralizat, folosește
              pagina Facturare SMS clinici.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/manager-dashboard/doctor-sms?month=${monthRange.previousMonth}`}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Luna anterioară
            </Link>
            <Link
              href={`/manager-dashboard/doctor-sms?month=${monthRange.nextMonth}`}
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
            Datele de facturare SMS medici nu au putut fi încărcate complet
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-red-900">
            {pageError}
          </pre>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-5">
        <SummaryBox
          label="Medici"
          value={groups.length}
          helper="Medici cu consum SMS sau date de facturare."
        />
        <SummaryBox
          label="SMS trimise"
          value={sentRows.length}
          helper="Mesaje marcate ca trimise pentru medici individuali."
        />
        <SummaryBox
          label="Nefacturate"
          value={uninvoicedRows.length}
          helper="SMS care pot intra în factura medicului."
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
              Medici pentru invoicing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Fiecare medic este afișat într-un accordion ca să păstrăm pagina
              compactă. Deschide medicul pentru datele de facturare și
              detaliile SMS.
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
            {doctorSmsLogs.length} loguri SMS
          </span>
        </div>

        {groups.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există consum SMS individual sau date de facturare pentru medici
            în perioada selectată.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {groups.map((group) => {
              const billing = group.billingProfile;
              const doctor = group.doctor;
              const doctorName = getDisplayName(group.profile, doctor);

              return (
                <details
                  key={doctor.id}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-sm open:border-[#036661]/40"
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-4 rounded-2xl px-5 py-4 hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-gray-900">
                          {doctorName}
                        </h3>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          {getDoctorAccountTypeLabel(doctor.account_type)}
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
                        {group.sentCount} SMS trimise · {group.uninvoicedCount} nefacturate · {formatCurrencyMinor(
                          group.uninvoicedCostMinor,
                          group.currency
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
                        helper="Pentru acest medic."
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
                          group.currency
                        )}
                        helper="Doar SMS nefacturate."
                      />
                    </div>

                    <div className="mt-6 grid gap-5 lg:grid-cols-2">
                      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <h4 className="font-bold text-gray-900">
                          Date medic
                        </h4>
                        <dl className="mt-4 space-y-4">
                          <FieldLine label="Nume" value={doctorName} />
                          <FieldLine label="Titlu public" value={group.title} />
                          <FieldLine label="E-mail cont" value={group.authEmail ?? doctor.email} />
                          <FieldLine label="Telefon" value={doctor.phone} />
                          <FieldLine label="Slug" value={doctor.slug} />
                          <FieldLine label="Status profil" value={doctor.status} />
                          <FieldLine
                            label="Status cont"
                            value={group.profile?.account_status}
                          />
                        </dl>
                      </section>

                      <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                        <h4 className="font-bold text-gray-900">
                          Date facturare
                        </h4>
                        {billing ? (
                          <dl className="mt-4 space-y-4">
                            <FieldLine label="Tip entitate" value={getEntityTypeLabel(billing.entity_type)} />
                            <FieldLine label="Nume legal" value={billing.legal_name} />
                            <FieldLine label="CUI" value={billing.cui} />
                            <FieldLine
                              label="Nr. Registrul Comerțului"
                              value={billing.trade_registry_number}
                            />
                            <FieldLine
                              label="Plătitor TVA"
                              value={billing.vat_payer ? "Da" : "Nu"}
                            />
                            <FieldLine label="E-mail facturare" value={billing.billing_email} />
                            <FieldLine
                              label="Contact contabilitate"
                              value={billing.accounting_contact_name}
                            />
                            <FieldLine
                              label="Telefon contabilitate"
                              value={billing.accounting_contact_phone}
                            />
                            <FieldLine
                              label="Adresă"
                              value={`${billing.billing_address}, ${billing.city}, ${billing.county}, ${billing.country}`}
                            />
                            <FieldLine label="Note factură" value={billing.invoice_notes} />
                          </dl>
                        ) : (
                          <p className="mt-4 text-sm leading-6 text-amber-800">
                            Nu există încă profil de facturare pentru acest
                            medic. Contactează medicul înainte de emiterea
                            facturii.
                          </p>
                        )}
                      </section>
                    </div>

                    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-gray-900">
                            Detalii SMS
                          </h4>
                          <p className="mt-1 text-sm text-gray-600">
                            Numărul pacientului este mascat. Nu afișăm conținutul
                            mesajelor.
                          </p>
                        </div>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
                          {group.smsLogs.length} loguri
                        </span>
                      </div>

                      {group.smsLogs.length === 0 ? (
                        <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                          Nu există consum SMS pentru acest medic în perioada
                          selectată.
                        </div>
                      ) : (
                        <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                <tr>
                                  <th className="px-4 py-3">Dată</th>
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
                                      {row.clinic_id
                                        ? clinicNameById.get(row.clinic_id) ?? row.clinic_id.slice(0, 8)
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
                                      <div>{getInvoiceLabel(row.invoice_status)}</div>
                                      {row.invoice_reference ? (
                                        <div className="text-xs text-gray-500">
                                          {row.invoice_reference}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                                      {formatCurrencyMinor(
                                        row.unit_cost_minor ?? 0,
                                        row.currency ?? group.currency
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
