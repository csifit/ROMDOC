import { redirect } from "next/navigation";

import PlatformSmsReport from "@/components/billing/platform-sms-report";
import { loadPlatformInvoicingData } from "@/lib/billing/platform-invoicing";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

type ManagerClinicSmsPageProps = {
  searchParams?: Promise<{ month?: string }>;
};

export default async function ManagerClinicSmsPage({
  searchParams,
}: ManagerClinicSmsPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters = new URLSearchParams({
        locale,
        next: "/manager-dashboard/clinic-sms",
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
          {copy.pages.clinicSms.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.clinicSms.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.clinicSms.description}
        </p>
      </header>

      <PlatformSmsReport
        locale={locale}
        data={data}
        clientType="clinic_organization"
        basePath="/manager-dashboard/clinic-sms"
      />
    </div>
  );
}
