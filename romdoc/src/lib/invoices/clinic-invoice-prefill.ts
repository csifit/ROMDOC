import {
  type ClinicInvoiceInitialDraft,
} from "@/components/invoices/clinic-invoices-workspace";

type InvoiceSearchParameters = {
  create?: string;
  organizationId?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  estimatedAmountRon?: string;
};

function validDate(
  value: string | undefined
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const parsed =
    new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return value;
}

function validEstimate(
  value: string | undefined
) {
  if (!value) {
    return null;
  }

  const numeric =
    Number(value.replace(",", "."));

  if (
    !Number.isFinite(numeric) ||
    numeric < 0 ||
    numeric > 9999999999.99
  ) {
    return null;
  }

  return numeric.toFixed(2);
}

export function getClinicInvoiceInitialDraft(
  parameters:
    InvoiceSearchParameters
): ClinicInvoiceInitialDraft | null {
  if (
    parameters.create !== "1" ||
    !parameters.organizationId ||
    !/^[0-9a-f-]{36}$/i.test(
      parameters.organizationId
    )
  ) {
    return null;
  }

  const billingPeriodStart =
    validDate(
      parameters.billingPeriodStart
    );

  const billingPeriodEnd =
    validDate(
      parameters.billingPeriodEnd
    );

  const estimatedAmountRon =
    validEstimate(
      parameters.estimatedAmountRon
    );

  if (
    !billingPeriodStart ||
    !billingPeriodEnd ||
    billingPeriodEnd <
      billingPeriodStart ||
    estimatedAmountRon === null
  ) {
    return null;
  }

  return {
    organizationId:
      parameters.organizationId,
    billingPeriodStart,
    billingPeriodEnd,
    estimatedAmountRon,
  };
}

export type {
  InvoiceSearchParameters,
};
