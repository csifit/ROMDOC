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

type AdminInvoicesPageProps = {
  searchParams?: Promise<InvoiceSearchParameters>;
};

export default async function AdminInvoicesPage({
  searchParams,
}: AdminInvoicesPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      const parameters = new URLSearchParams({
        locale,
        next: "/admin/invoices",
      });
      redirect(`/login?${parameters.toString()}`);
    }

    redirect("/dashboard");
  }

  if (access.actor.role !== "admin") redirect("/dashboard");

  const parameters = (await searchParams) ?? {};
  const initialDraft = getClinicInvoiceInitialDraft(parameters);

  const [{ organizations, invoices }, amounts] = await Promise.all([
    loadClinicInvoiceWorkspaceData(),
    loadPlatformInvoicingData({ locale, fallback: "previous" }),
  ]);

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.pages.invoicesAdmin.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.invoicesAdmin.title}
        </h1>
        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.invoicesAdmin.description}
        </p>
      </header>

      <AmountsToInvoice locale={locale} data={amounts} role="admin" />

      <ClinicInvoicesWorkspace
        locale={locale}
        invoices={invoices}
        organizations={organizations}
        initialDraft={initialDraft}
      />
    </div>
  );
}
