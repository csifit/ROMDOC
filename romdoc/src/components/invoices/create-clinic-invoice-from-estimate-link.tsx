import Link from "next/link";

type CreateClinicInvoiceFromEstimateLinkProps = {
  href: "/admin/invoices" | "/manager-dashboard/invoices";
  organizationId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  estimatedAmountRon: number;
  label?: string;
  className?: string;
};

function normalizeAmount(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return "0.00";
  }

  return value.toFixed(2);
}

export default function CreateClinicInvoiceFromEstimateLink({
  href,
  organizationId,
  billingPeriodStart,
  billingPeriodEnd,
  estimatedAmountRon,
  label = "Marchează ca facturată",
  className,
}: CreateClinicInvoiceFromEstimateLinkProps) {
  const parameters = new URLSearchParams({
    create: "1",
    organizationId,
    billingPeriodStart,
    billingPeriodEnd,
    estimatedAmountRon: normalizeAmount(estimatedAmountRon),
  });

  return (
    <Link
      href={`${href}?${parameters.toString()}`}
      className={
        className ??
        "romdoc-focus-ring inline-flex items-center justify-center rounded-xl bg-[#036661] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff2800]"
      }
    >
      {label}
    </Link>
  );
}
