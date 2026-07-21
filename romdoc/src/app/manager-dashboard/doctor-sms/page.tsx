import { redirect } from "next/navigation";

import PlatformSmsReport from "@/components/billing/platform-sms-report";
import { loadPlatformInvoicingData } from "@/lib/billing/platform-invoicing";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

type ManagerDoctorSmsPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function ManagerDoctorSmsPage({
  searchParams,
}: ManagerDoctorSmsPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters = new URLSearchParams({
        locale,
        next: "/manager-dashboard/doctor-sms",
      });
      redirect(`/login?${parameters.toString()}`);
    }
    redirect("/manager-dashboard/invoices");
  }

  if (access.actor.role !== "manager") redirect("/dashboard");

  const parameters = (await searchParams) ?? {};
  const data = await loadPlatformInvoicingData({
    locale,
    month: parameters.month,
    fallback: "current",
  });

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.pages.doctorSms.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.doctorSms.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.doctorSms.description}
        </p>
      </header>

      <PlatformSmsReport
        locale={locale}
        data={data}
        clientType="independent_doctor"
        basePath="/manager-dashboard/doctor-sms"
      />
    </div>
  );
}
