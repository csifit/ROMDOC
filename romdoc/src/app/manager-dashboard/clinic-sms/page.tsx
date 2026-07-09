import Link from "next/link";
import { redirect } from "next/navigation";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type ClinicSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
};

type OrganizationRow = {
  id: string;
  name: string;
  status: string;
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
          <p className="text-sm font-semibold text-[#036661]">
            Panou manager
          </p>
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

  const [organizationsResult, smsLogsResult] = await Promise.all([
    admin
      .from("clinic_organizations")
      .select("id, name, status")
      .order("name", { ascending: true }),
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
  ]);

  const organizations = (organizationsResult.data ?? []) as OrganizationRow[];
  const organizationNameById = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  );

  const allSmsLogs = (smsLogsResult.data ?? []) as SmsLogRow[];
  const clinicSmsLogs = allSmsLogs.filter(
    (log) =>
      log.payer_type === "clinic_organization" ||
      Boolean(log.payer_clinic_organization_id)
  );

  const doctorIds = Array.from(
    new Set(
      clinicSmsLogs
        .map((log) => log.doctor_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const clinicIds = Array.from(
    new Set(
      clinicSmsLogs
        .map((log) => log.clinic_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const [doctorsResult, clinicsResult] = await Promise.all([
    doctorIds.length > 0
      ? admin
          .from("doctors")
          .select("id, slug")
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

  const doctorSlugById = new Map(
    doctors.map((doctor) => [doctor.id, doctor.slug])
  );
  const clinicNameById = new Map(
    clinics.map((clinic) => [clinic.id, getClinicName(clinic)])
  );

  const sentRows = clinicSmsLogs.filter((row) => row.status === "sent");
  const failedRows = clinicSmsLogs.filter((row) => row.status === "failed");
  const uninvoicedRows = clinicSmsLogs.filter(
    (row) => row.invoice_status === "uninvoiced"
  );
  const invoicedRows = clinicSmsLogs.filter(
    (row) => row.invoice_status === "invoiced"
  );

  const estimatedUninvoicedCostMinor = uninvoicedRows.reduce(
    (total, row) => total + (row.unit_cost_minor ?? 0),
    0
  );

  const currency = clinicSmsLogs.find((row) => row.currency)?.currency ?? "RON";

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
          Vezi consumul SMS al clinicilor pentru perioada selectată. Pagina
          afișează doar date de facturare și livrare: nu afișează corpul SMS,
          note medicale sau dosare ale pacienților.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Perioadă: {monthRange.label}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Sunt afișate SMS-urile cu payer clinică pentru luna selectată.
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

      {organizationsResult.error || smsLogsResult.error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800 shadow-sm">
          <h2 className="font-semibold">
            Datele de facturare SMS nu au putut fi încărcate
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-red-900">
            {organizationsResult.error?.message ?? smsLogsResult.error?.message}
          </pre>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
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
              Detalii pentru invoicing
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Numărul pacientului este mascat. Pentru facturare contează
              organizația plătitoare, statusul, costul și referința facturii.
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
            {clinicSmsLogs.length} loguri
          </span>
        </div>

        {clinicSmsLogs.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există consum SMS de clinică pentru perioada selectată.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Dată</th>
                    <th className="px-4 py-3">Organizație</th>
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
                  {clinicSmsLogs.map((row) => (
                    <tr key={row.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {row.payer_clinic_organization_id
                          ? organizationNameById.get(row.payer_clinic_organization_id) ?? "Organizație"
                          : "Organizație clinică"}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.doctor_id
                          ? doctorSlugById.get(row.doctor_id) ?? row.doctor_id.slice(0, 8)
                          : "—"}
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
                          row.currency ?? currency
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
  );
}
