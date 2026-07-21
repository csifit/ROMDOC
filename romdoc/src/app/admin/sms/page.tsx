import { redirect } from "next/navigation";

import AdminSmsControlPanel from "@/components/admin/admin-sms-control-panel";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

export default async function AdminSmsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({ locale, next: "/admin/sms" });
    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.pages.smsAdmin.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.smsAdmin.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.smsAdmin.description}
        </p>
      </header>

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col justify-between gap-[13px] lg:flex-row lg:items-end">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {copy.smsPanel.exportTitle}
            </h2>
            <p className="mt-[8px] text-sm leading-6 text-gray-600">
              {copy.smsPanel.exportDescription}
            </p>
          </div>
          <a
            href="/api/admin/sms/export"
            className="romdoc-focus-ring w-fit rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            {copy.smsPanel.exportWithoutFilters}
          </a>
        </div>

        <form
          action="/api/admin/sms/export"
          method="get"
          className="mt-[21px] grid gap-[13px] md:grid-cols-2 xl:grid-cols-5"
        >
          <label className="text-sm font-semibold text-gray-700">
            {copy.smsPanel.exportFrom}
            <input
              type="date"
              name="from"
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-normal text-gray-950"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            {copy.smsPanel.exportTo}
            <input
              type="date"
              name="to"
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-normal text-gray-950"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            {copy.smsPanel.exportPaymentStatus}
            <select
              name="paymentStatus"
              defaultValue="all"
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-normal text-gray-950"
            >
              <option value="all">{copy.common.all}</option>
              <option value="open">{copy.smsPanel.statuses.unpaid}</option>
              <option value="paid">{copy.smsPanel.statuses.paid}</option>
              <option value="failed">{copy.smsPanel.statuses.failed}</option>
              <option value="cancelled">{copy.smsPanel.statuses.cancelled}</option>
              <option value="refunded">{copy.smsPanel.statuses.refunded}</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-gray-700">
            {copy.smsPanel.exportSagaStatus}
            <select
              name="sagaStatus"
              defaultValue="all"
              className="romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-normal text-gray-950"
            >
              <option value="all">{copy.common.all}</option>
              <option value="missing">{copy.smsPanel.statuses.sagaMissing}</option>
              <option value="issued">{copy.smsPanel.statuses.sagaIssued}</option>
              <option value="cancelled">{copy.smsPanel.statuses.sagaCancelled}</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="romdoc-focus-ring w-full rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
            >
              {copy.smsPanel.exportDownload}
            </button>
          </div>
        </form>
      </section>

      <AdminSmsControlPanel locale={locale} />
    </div>
  );
}
