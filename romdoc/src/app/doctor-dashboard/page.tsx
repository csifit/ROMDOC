import Link from "next/link";
import { redirect } from "next/navigation";

import DoctorOnboardingChecklist from "@/components/doctor/doctor-onboarding-checklist";
import DoctorSmsBillingPaymentButton from "@/components/doctor/doctor-sms-billing-payment-button";
import { getDoctorProfileCompletion } from "@/lib/doctors/get-doctor-profile-completion";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import DoctorDashboardOperationalOverview from "@/components/doctor/doctor-dashboard-operational-overview";

type SmsUsageLogRow = {
  status: string;
  invoice_status: string | null;
  unit_cost_minor: number | null;
};

type BillableSmsLogRow = {
  id: string;
  unit_cost_minor: number | null;
};

type SmsBillingPeriodRow = {
  id: string;
  period_start: string;
  period_end: string;
  sms_count: number;
  net_amount_minor: number;
  vat_amount_minor: number;
  gross_amount_minor: number;
  currency: string;
  payment_status: string;
  saga_invoice_status: string;
};

type DoctorAccountRow = {
  id: string;
  status: string | null;
  account_type: string | null;
  clinic_organization_id: string | null;
};

const VAT_RATE_BASIS_POINTS = 2100;

function getCurrentMonthBounds() {
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  );

  return {
    monthStartIso: monthStart.toISOString(),
    nextMonthStartIso: nextMonthStart.toISOString(),
  };
}

function getPreviousMonthDateBounds() {
  const now = new Date();
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
  );
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  );

  return {
    periodStartDate: periodStart.toISOString().slice(0, 10),
    periodEndDate: periodEnd.toISOString().slice(0, 10),
    periodStartIso: periodStart.toISOString(),
    periodEndIso: periodEnd.toISOString(),
  };
}

function formatMoney(minorAmount: number, currency = "RON") {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorAmount / 100);
}

function formatPeriod(periodStart: string, periodEnd: string) {
  const startDate = new Date(`${periodStart}T12:00:00Z`);

  return new Intl.DateTimeFormat("ro-RO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(startDate);
}

async function getOrCreatePreviousSmsBill({
  doctorId,
  profileId,
}: {
  doctorId: string;
  profileId: string;
}) {
  const admin = createAdminClient();
  const {
    periodStartDate,
    periodEndDate,
    periodStartIso,
    periodEndIso,
  } = getPreviousMonthDateBounds();

  const { data: existingBill, error: existingBillError } = await admin
    .from("doctor_sms_billing_periods")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("period_start", periodStartDate)
    .eq("period_end", periodEndDate)
    .maybeSingle();

  if (existingBillError) {
    console.error("Previous SMS bill lookup failed:", existingBillError);
  }

  if (existingBill) {
    return;
  }

  const { data: billableLogsData, error: billableLogsError } = await admin
    .from("sms_delivery_logs")
    .select("id, unit_cost_minor")
    .eq("doctor_id", doctorId)
    .eq("status", "sent")
    .eq("invoice_status", "uninvoiced")
    .is("sms_billing_period_id", null)
    .gte("created_at", periodStartIso)
    .lt("created_at", periodEndIso);

  if (billableLogsError) {
    console.error("Previous SMS bill logs lookup failed:", billableLogsError);
    return;
  }

  const billableLogs = (billableLogsData ?? []) as BillableSmsLogRow[];

  if (billableLogs.length === 0) {
    return;
  }

  const netAmountMinor = billableLogs.reduce(
    (total, log) => total + (log.unit_cost_minor ?? 30),
    0
  );
  const vatAmountMinor = Math.round(
    (netAmountMinor * VAT_RATE_BASIS_POINTS) / 10000
  );
  const grossAmountMinor = netAmountMinor + vatAmountMinor;

  const { data: newBill, error: newBillError } = await admin
    .from("doctor_sms_billing_periods")
    .insert({
      doctor_id: doctorId,
      profile_id: profileId,
      period_start: periodStartDate,
      period_end: periodEndDate,
      sms_count: billableLogs.length,
      unit_cost_minor: 30,
      net_amount_minor: netAmountMinor,
      vat_rate_basis_points: VAT_RATE_BASIS_POINTS,
      vat_amount_minor: vatAmountMinor,
      gross_amount_minor: grossAmountMinor,
      currency: "RON",
      payment_status: "unpaid",
      saga_invoice_status: "not_issued",
    })
    .select("id")
    .single();

  if (newBillError || !newBill) {
    console.error("Previous SMS bill creation failed:", newBillError);
    return;
  }

  await admin
    .from("sms_delivery_logs")
    .update({
      sms_billing_period_id: newBill.id,
    })
    .in(
      "id",
      billableLogs.map((log) => log.id)
    );
}

async function getUnpaidSmsBills({
  doctorId,
  profileId,
}: {
  doctorId: string;
  profileId: string;
}) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("doctor_sms_billing_periods")
    .select(`
      id,
      period_start,
      period_end,
      sms_count,
      net_amount_minor,
      vat_amount_minor,
      gross_amount_minor,
      currency,
      payment_status,
      saga_invoice_status
    `)
    .eq("doctor_id", doctorId)
    .eq("profile_id", profileId)
    .in("payment_status", ["unpaid", "checkout_open", "failed"])
    .gt("gross_amount_minor", 0)
    .order("period_start", { ascending: true });

  if (error) {
    console.error("Unpaid SMS bills query failed:", error);
    return [];
  }

  return (data ?? []) as SmsBillingPeriodRow[];
}

export default async function DoctorDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login?next=/doctor-dashboard");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  const completion = await getDoctorProfileCompletion(
    supabase,
    user.id,
    profile.first_name,
    profile.last_name
  );

  if (!completion) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul este activ, dar profilul de medic nu a putut fi găsit.
            Verifică activarea abonamentului sau contactează suportul RomDoc.
          </div>
        </div>
      </main>
    );
  }

  const { data: doctorAccount, error: doctorAccountError } = await supabase
    .from("doctors")
    .select(`
      id,
      status,
      account_type,
      clinic_organization_id
   `)

    .eq("id", completion.doctorId)
    .maybeSingle();

  if (doctorAccountError) {
    console.error(
      "Doctor dashboard account type query failed:",
      doctorAccountError
    );
  }

  const typedDoctorAccount = doctorAccount as DoctorAccountRow | null;
  const isClinicSubAccount =
    typedDoctorAccount?.account_type === "clinic_sub_account";

  let smsUsage = {
    sent: 0,
    invoiced: 0,
    uninvoiced: 0,
    uninvoicedValueMinor: 0,
  };

  let unpaidSmsBills: SmsBillingPeriodRow[] = [];

  let unpaidBalance = {
    smsCount: 0,
    netAmountMinor: 0,
    vatAmountMinor: 0,
    grossAmountMinor: 0,
    currency: "RON",
  };

  if (!isClinicSubAccount) {
    const admin = createAdminClient();
    const { monthStartIso, nextMonthStartIso } = getCurrentMonthBounds();

    await getOrCreatePreviousSmsBill({
      doctorId: completion.doctorId,
      profileId: user.id,
    });

    const [smsLogsResult, unpaidBills] = await Promise.all([
      admin
        .from("sms_delivery_logs")
        .select("status, invoice_status, unit_cost_minor")
        .eq("doctor_id", completion.doctorId)
        .gte("created_at", monthStartIso)
        .lt("created_at", nextMonthStartIso),
      getUnpaidSmsBills({
        doctorId: completion.doctorId,
        profileId: user.id,
      }),
    ]);

    if (smsLogsResult.error) {
      console.error(
        "Doctor dashboard SMS usage query failed:",
        smsLogsResult.error
      );
    }

    const smsLogs = (smsLogsResult.data ?? []) as SmsUsageLogRow[];

    smsUsage = smsLogs.reduce(
      (currentUsage, log) => {
        const invoiceStatus = log.invoice_status ?? "not_billable";
        const unitCostMinor = log.unit_cost_minor ?? 30;

        if (log.status === "sent") {
          currentUsage.sent += 1;
        }

        if (invoiceStatus === "invoiced") {
          currentUsage.invoiced += 1;
        }

        if (invoiceStatus === "uninvoiced") {
          currentUsage.uninvoiced += 1;
          currentUsage.uninvoicedValueMinor += unitCostMinor;
        }

        return currentUsage;
      },
      {
        sent: 0,
        invoiced: 0,
        uninvoiced: 0,
        uninvoicedValueMinor: 0,
      }
    );

    unpaidSmsBills = unpaidBills;

    unpaidBalance = unpaidSmsBills.reduce(
      (total, bill) => ({
        smsCount: total.smsCount + bill.sms_count,
        netAmountMinor: total.netAmountMinor + bill.net_amount_minor,
        vatAmountMinor: total.vatAmountMinor + bill.vat_amount_minor,
        grossAmountMinor: total.grossAmountMinor + bill.gross_amount_minor,
        currency: bill.currency || total.currency,
      }),
      {
        smsCount: 0,
        netAmountMinor: 0,
        vatAmountMinor: 0,
        grossAmountMinor: 0,
        currency: "RON",
      }
    );
  }

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-sm font-semibold text-[#036661]">Panou medic</p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            Bun venit, {profile.first_name || "doctore"}
          </h1>

          <p className="mt-3 max-w-3xl leading-7 text-gray-600">
            Vezi rapid cererile noi, programul de astăzi și acțiunile importante.
          </p>
        </header>

        {isClinicSubAccount ? (
          <section className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6 text-green-900 shadow-sm">
            <h2 className="text-xl font-bold">
              Cont de medic gestionat de clinică
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6">
              Abonamentul, facturarea SMS și datele de facturare sunt gestionate
              de Clinic Manager. Tu poți administra profilul profesional,
              serviciile, disponibilitatea și programările pentru locația
              atribuită.
            </p>
          </section>
        ) : null}

        {typedDoctorAccount && (
          <DoctorDashboardOperationalOverview
             doctor={typedDoctorAccount}
             profileCompletionPercent={
               completion.percentage
           }
          />
       )}

        <div className="mt-8">
          <DoctorOnboardingChecklist completion={completion} />
        </div>

        {!isClinicSubAccount ? (
          <>
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Date de facturare
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Completează datele private necesare pentru facturarea
                    SMS-urilor și a altor servicii RomDoc. Aceste informații nu
                    apar public.
                  </p>
                </div>

                <Link
                  href="/doctor-dashboard/billing"
                  className="romdoc-focus-ring w-fit rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
                >
                  Deschide datele de facturare
                </Link>
              </div>
            </section>

            {unpaidSmsBills.length > 0 ? (
              <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-800">
                      Sold SMS restant
                    </p>

                    <h2 className="mt-2 text-xl font-bold text-amber-950">
                      Total de plată:{" "}
                      {formatMoney(
                        unpaidBalance.grossAmountMinor,
                        unpaidBalance.currency
                      )}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-amber-900">
                      Soldul include {unpaidBalance.smsCount} SMS-uri din{" "}
                      {unpaidSmsBills.length} perioadă/perioade. Net:{" "}
                      {formatMoney(
                        unpaidBalance.netAmountMinor,
                        unpaidBalance.currency
                      )}
                      . TVA 21%:{" "}
                      {formatMoney(
                        unpaidBalance.vatAmountMinor,
                        unpaidBalance.currency
                      )}
                      .
                    </p>

                    <div className="mt-4 space-y-2 text-sm text-amber-950">
                      {unpaidSmsBills.map((bill) => (
                        <div
                          key={bill.id}
                          className="flex flex-col rounded-xl border border-amber-200 bg-white/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="font-semibold">
                            {formatPeriod(bill.period_start, bill.period_end)}
                          </span>
                          <span>
                            {bill.sms_count} SMS ·{" "}
                            {formatMoney(
                              bill.gross_amount_minor,
                              bill.currency
                            )}
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-amber-800">
                      Plata se face prin Stripe. Factura fiscală se emite separat
                      în SAGA.
                    </p>
                  </div>

                  <DoctorSmsBillingPaymentButton />
                </div>
              </section>
            ) : null}

            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
                    SMS
                  </p>

                  <h2 className="mt-2 text-xl font-bold text-gray-900">
                    Utilizare SMS luna aceasta
                  </h2>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    Acest contor arată SMS-urile trimise pentru programările tale
                    în luna curentă. Marcarea ca facturat este făcută de Admin
                    sau de managerul Facturare.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  Valoare nefacturată:{" "}
                  {formatMoney(smsUsage.uninvoicedValueMinor)} + TVA
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Trimise luna aceasta
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {smsUsage.sent}
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Facturate
                  </p>
                  <p className="mt-2 text-3xl font-bold text-emerald-900">
                    {smsUsage.invoiced}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Nefacturate
                  </p>
                  <p className="mt-2 text-3xl font-bold text-blue-900">
                    {smsUsage.uninvoiced}
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
