import { createClient } from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
};

type SmsUsageRow = {
  id: string;
  organization_id: string;
  doctor_id: string | null;
  clinic_id: string | null;
  event_type: string | null;
  delivery_status: string | null;
  invoice_status: string | null;
  masked_recipient: string | null;
  unit_cost_minor: number | null;
  currency: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  created_at: string | null;
};

type ClinicManagerSmsPageProps = {
  searchParams?: Promise<{
    month?: string;
  }>;
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
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
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
    return "â€”";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getDeliveryLabel(status: string | null) {
  switch (status) {
    case "sent":
      return "Trimis";

    case "failed":
      return "EÈ™uat";

    case "skipped":
      return "SÄƒrit";

    case "queued":
      return "ÃŽn coadÄƒ";

    default:
      return status ?? "â€”";
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
      return status ?? "â€”";
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

export default async function ClinicManagerSmsPage({
  searchParams,
}: ClinicManagerSmsPageProps) {
  const parameters = await searchParams;
  const monthRange = getMonthRange(parameters?.month);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = user?.id;

  const { data: memberships } = profileId
    ? await supabase
        .from("clinic_organization_members")
        .select("organization_id")
        .eq("profile_id", profileId)
        .eq("status", "active")
    : { data: [] };

  const activeMemberships = (memberships ?? []) as OrganizationMember[];
  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  let organizations: ClinicOrganization[] = [];
  let usageRows: SmsUsageRow[] = [];
  let usageErrors: string[] = [];

  if (organizationIds.length > 0) {
    const { data: organizationsData } = await supabase
      .from("clinic_organizations")
      .select("id, name, status")
      .in("id", organizationIds)
      .order("name", {
        ascending: true,
      });

    organizations = (organizationsData ?? []) as ClinicOrganization[];

    const usageResults = await Promise.all(
      organizationIds.map(async (organizationId) => {
        const { data, error } = await supabase.rpc(
          "get_clinic_organization_sms_usage",
          {
            target_organization_id: organizationId,
            period_start: monthRange.startDate,
            period_end: monthRange.endDate,
          }
        );

        if (error) {
          return {
            rows: [] as SmsUsageRow[],
            error: error.message,
          };
        }

        return {
          rows: (data ?? []) as SmsUsageRow[],
          error: null,
        };
      })
    );

    usageRows = usageResults.flatMap((result) => result.rows);
    usageErrors = usageResults
      .map((result) => result.error)
      .filter((error): error is string => Boolean(error));
  }

  const organizationNameById = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  );

  const sentRows = usageRows.filter((row) => row.delivery_status === "sent");
const uninvoicedRows = usageRows.filter(
    (row) => row.invoice_status === "uninvoiced"
  );
  const invoicedRows = usageRows.filter(
    (row) => row.invoice_status === "invoiced"
  );

  const estimatedUninvoicedCostMinor = uninvoicedRows.reduce(
    (total, row) => total + (row.unit_cost_minor ?? 0),
    0
  );

  const currency = usageRows.find((row) => row.currency)?.currency ?? "RON";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">Clinic Manager</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Consum SMS clinicÄƒ
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Vezi consumul SMS al clinicii pentru perioada selectatÄƒ. Pagina afiÈ™eazÄƒ
          doar metadate de livrare È™i facturare: nu afiÈ™eazÄƒ conÈ›inutul SMS,
          note medicale sau dosare ale pacienÈ›ilor.
        </p>
      </header>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              PerioadÄƒ: {monthRange.label}
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              Interval calculat: {monthRange.startDate} â€” {monthRange.endDate}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={`/clinic-manager-dashboard/sms?month=${monthRange.previousMonth}`}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Luna anterioarÄƒ
            </a>
            <a
              href={`/clinic-manager-dashboard/sms?month=${monthRange.nextMonth}`}
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Luna urmÄƒtoare
            </a>
          </div>
        </div>
      </section>

      {usageErrors.length > 0 && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800 shadow-sm">
          <h2 className="font-semibold">Consum SMS indisponibil</h2>
          <p className="mt-2">
            VerificÄƒ dacÄƒ migrarea SQL pentru Step 72J a fost aplicatÄƒ È™i dacÄƒ
            tabelul sms_delivery_logs are coloanele aÈ™teptate.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-red-900">
            {usageErrors.join("\n")}
          </pre>
        </section>
      )}

      {organizations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu existÄƒ Ã®ncÄƒ o organizaÈ›ie de clinicÄƒ asociatÄƒ contului tÄƒu
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            DupÄƒ ce RomDoc asociazÄƒ contul tÄƒu unei organizaÈ›ii active, consumul
            SMS va fi afiÈ™at aici.
          </p>
        </section>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryBox
              label="SMS trimise"
              value={sentRows.length}
              helper="Mesaje livrate sau acceptate de provider ca trimise."
            />
            <SummaryBox
              label="Nefacturate"
              value={uninvoicedRows.length}
              helper="SMS trimise care pot intra Ã®n factura clinicii."
            />
            <SummaryBox
              label="Facturate"
              value={invoicedRows.length}
              helper="SMS deja marcate ca facturate de RomDoc."
            />
            <SummaryBox
              label="Cost estimat"
              value={formatCurrencyMinor(estimatedUninvoicedCostMinor, currency)}
              helper="Estimare pentru SMS nefacturate, fÄƒrÄƒ alte servicii."
            />
          </div>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Detalii SMS
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                  NumÄƒrul pacientului este mascat. Corpul mesajului SMS nu este
                  afiÈ™at implicit pentru Clinic Manager.
                </p>
              </div>

              <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
                {usageRows.length} loguri
              </span>
            </div>

            {usageRows.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
                Nu existÄƒ consum SMS pentru perioada selectatÄƒ.
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">DatÄƒ</th>
                        <th className="px-4 py-3">OrganizaÈ›ie</th>
                        <th className="px-4 py-3">Eveniment</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Facturare</th>
                        <th className="px-4 py-3">Telefon</th>
                        <th className="px-4 py-3">Cost</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-200 bg-white">
                      {usageRows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-gray-700">
                            {formatDateTime(row.sent_at ?? row.created_at)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {organizationNameById.get(row.organization_id) ?? "â€”"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {row.event_type ?? "â€”"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getDeliveryLabel(row.delivery_status)}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {getInvoiceLabel(row.invoice_status)}
                          </td>
                          <td className="px-4 py-3 font-mono text-gray-700">
                            {row.masked_recipient ?? "â€”"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
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

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900 shadow-sm">
            <h2 className="font-semibold">LimitÄƒ de vizibilitate</h2>
            <p className="mt-2">
              Clinic Manager vede doar informaÈ›ii necesare pentru cost È™i
              facturare: datÄƒ, tip eveniment, status, telefon mascat È™i cost.
              Pentru audit detaliat, administratorul poate consulta logurile
              complete Ã®n zona de administrare, conform politicilor interne.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

