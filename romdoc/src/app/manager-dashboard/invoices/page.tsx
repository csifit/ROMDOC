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

type ManagerInvoicesPageProps = {
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

export default async function ManagerInvoicesPage({
  searchParams,
}: ManagerInvoicesPageProps) {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorBilling(locale);
  const historyCopy = getPlatformOperatorBillingHistory(locale);
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
          <h2 className="text-lg font-bold">{copy.pages.permission.heading}</h2>
          <p className="mt-[8px] text-sm leading-6">
            {copy.pages.permission.description}
          </p>
        </section>
      </div>
    );
  }

  if (access.actor.role !== "manager") redirect("/dashboard");

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
        <p className="text-sm font-semibold text-[#036661]">
          {copy.pages.invoicesManager.eyebrow}
        </p>
        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.invoicesManager.title}
        </h1>
        <p className="mt-[13px] max-w-4xl text-sm leading-6 text-gray-600">
          {historyCopy.pages.managerDescription}
        </p>
      </header>

      <AmountsToInvoice
        locale={locale}
        data={data}
        role="manager"
        initialInvoiceDraft={initialInvoiceDraft}
      />
    </div>
  );
}
