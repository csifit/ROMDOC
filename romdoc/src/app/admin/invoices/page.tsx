import { redirect } from "next/navigation";

import AmountsToInvoice, {
  type InitialClientInvoiceDraft,
} from "@/components/billing/amounts-to-invoice";
import { loadPlatformInvoicingData } from "@/lib/billing/platform-invoicing";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";
import { getPlatformOperatorBilling } from "@/lib/i18n/platform-operator-billing";
import { getPlatformOperatorBillingHistory } from "@/lib/i18n/platform-operator-billing-history";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

type InvoicePageSearchParameters = {
  month?: string;
  create?: string;
  organizationId?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  estimatedAmountRon?: string;
};

type AdminInvoicesPageProps = {
  searchParams?: Promise<InvoicePageSearchParameters>;
};

function getRequestedMonth(parameters: InvoicePageSearchParameters) {
  if (/^\d{4}-\d{2}$/.test(parameters.month ?? "")) {
    return parameters.month;
  }

  if (
    parameters.create === "1" &&
    /^\d{4}-\d{2}-\d{2}$/.test(parameters.billingPeriodStart ?? "")
  ) {
    return parameters.billingPeriodStart?.slice(0, 7);
  }

  return undefined;
}

function getInitialInvoiceDraft(
  parameters: InvoicePageSearchParameters
): InitialClientInvoiceDraft | null {
  if (
    parameters.create !== "1" ||
    !parameters.organizationId ||
    !/^[0-9a-f-]{36}$/i.test(parameters.organizationId)
  ) {
    return null;
  }

  const numericEstimate = Number(
    (parameters.estimatedAmountRon ?? "").replace(",", ".")
  );

  return {
    clientType: "clinic_organization",
    clientId: parameters.organizationId,
    estimatedAmount:
      Number.isFinite(numericEstimate) && numericEstimate >= 0
        ? numericEstimate
        : undefined,
  };
}

export default async function AdminInvoicesPage({
  searchParams,
}: AdminInvoicesPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const historyCopy = getPlatformOperatorBillingHistory(locale);
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
  const initialInvoiceDraft = getInitialInvoiceDraft(parameters);
  const data = await loadPlatformInvoicingData({
    locale,
    month: getRequestedMonth(parameters),
    fallback: "current",
  });

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.pages.invoicesAdmin.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.invoicesAdmin.title}
        </h1>
        <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
          {historyCopy.pages.adminDescription}
        </p>
      </header>

      <AmountsToInvoice
        locale={locale}
        data={data}
        role="admin"
        initialInvoiceDraft={initialInvoiceDraft}
      />
    </div>
  );
}
