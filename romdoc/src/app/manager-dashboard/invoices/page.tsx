import { redirect } from "next/navigation";

import AmountsToInvoice from "@/components/billing/amounts-to-invoice";
import ClinicInvoicesWorkspace from "@/components/invoices/clinic-invoices-workspace";
import { loadPlatformInvoicingData } from "@/lib/billing/platform-invoicing";
import {
  getClinicInvoiceInitialDraft,
  type InvoiceSearchParameters,
} from "@/lib/invoices/clinic-invoice-prefill";
import { loadClinicInvoiceWorkspaceData } from "@/lib/invoices/load-clinic-invoice-workspace-data";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

type ManagerInvoicesPageProps = {
  searchParams?: Promise<InvoiceSearchParameters>;
};

export default async function ManagerInvoicesPage({
  searchParams,
}: ManagerInvoicesPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters = new URLSearchParams({
        locale,
        next: "/manager-dashboard/invoices",
      });
      redirect(`/login?${parameters.toString()}`);
    }

    return (
      <div className="space-y-[34px]">
        <header>
          <p className="text-sm font-semibold text-[#036661]">
            {copy.pages.permission.eyebrow}
          </p>
          <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
            {copy.pages.permission.title}
          </h1>
        </header>

        <section className="rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] text-amber-950">
          <h2 className="text-lg font-bold">
            {copy.pages.permission.heading}
          </h2>
          <p className="mt-[8px] text-sm leading-6">
            {copy.pages.permission.description}
          </p>
        </section>
      </div>
    );
  }

  if (access.actor.role !== "manager") redirect("/dashboard");

  const parameters = (await searchParams) ?? {};
  const initialDraft = getClinicInvoiceInitialDraft(parameters);

  const [{ organizations, invoices }, amounts] = await Promise.all([
    loadClinicInvoiceWorkspaceData(),
    loadPlatformInvoicingData({ locale, fallback: "previous" }),
  ]);

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.pages.invoicesManager.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.invoicesManager.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.invoicesManager.description}
        </p>
      </header>

      <AmountsToInvoice locale={locale} data={amounts} role="manager" />

      <ClinicInvoicesWorkspace
        locale={locale}
        invoices={invoices}
        organizations={organizations}
        initialDraft={initialDraft}
      />
    </div>
  );
}
