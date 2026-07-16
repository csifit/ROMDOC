import { createAdminClient } from "@/lib/supabase/admin";
import {
  type ClinicInvoiceOrganization,
  type ClinicInvoiceRow,
} from "@/lib/invoices/clinic-invoices";

type InvoiceDatabaseRow = {
  id: string;
  organization_id: string;
  billing_period_start: string;
  billing_period_end: string;
  invoice_number: string;
  issued_on: string;
  estimated_amount_ron: number | string | null;
  amount_ron: number | string;
  status: "draft" | "invoiced" | "paid";
  paid_on: string | null;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  clinic_organizations:
    | {
        id: string;
        name: string;
      }
    | {
        id: string;
        name: string;
      }[]
    | null;
};

type OrganizationDatabaseRow = {
  id: string;
  name: string;
  status: string;
};

type BillingProfileDatabaseRow = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  billing_email: string;
};

function firstRelation<T>(
  value: T | T[] | null
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

export async function loadClinicInvoiceWorkspaceData() {
  const admin = createAdminClient();

  const [
    organizationsResult,
    billingProfilesResult,
    invoicesResult,
  ] = await Promise.all([
    admin
      .from("clinic_organizations")
      .select("id, name, status")
      .order("name", { ascending: true }),

    admin
      .from("clinic_organization_billing_profiles")
      .select(`
        organization_id,
        company_name,
        tax_id,
        billing_email
      `),

    admin
      .from("clinic_invoices")
      .select(`
        id,
        organization_id,
        billing_period_start,
        billing_period_end,
        invoice_number,
        issued_on,
        estimated_amount_ron,
        amount_ron,
        status,
        paid_on,
        payment_reference,
        notes,
        created_at,
        updated_at,
        clinic_organizations (
          id,
          name
        )
      `)
      .order("issued_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (organizationsResult.error) {
    console.error(
      "Clinic invoice organizations query failed:",
      organizationsResult.error
    );
  }

  if (billingProfilesResult.error) {
    console.error(
      "Clinic invoice billing profiles query failed:",
      billingProfilesResult.error
    );
  }

  if (invoicesResult.error) {
    console.error(
      "Clinic invoices query failed:",
      invoicesResult.error
    );
  }

  const organizations =
    (organizationsResult.data as OrganizationDatabaseRow[] | null) ?? [];

  const billingProfiles =
    (billingProfilesResult.data as BillingProfileDatabaseRow[] | null) ?? [];

  const billingByOrganization = new Map(
    billingProfiles.map((billing) => [
      billing.organization_id,
      billing,
    ])
  );

  const organizationOptions: ClinicInvoiceOrganization[] =
    organizations.map((organization) => {
      const billing = billingByOrganization.get(organization.id);

      return {
        id: organization.id,
        name: organization.name,
        companyName: billing?.company_name ?? null,
        taxId: billing?.tax_id ?? null,
        billingEmail: billing?.billing_email ?? null,
      };
    });

  const invoices =
    (invoicesResult.data as unknown as InvoiceDatabaseRow[] | null) ?? [];

  const invoiceRows: ClinicInvoiceRow[] = invoices.map((invoice) => {
    const organization = firstRelation(invoice.clinic_organizations);
    const billing = billingByOrganization.get(invoice.organization_id);

    return {
      id: invoice.id,
      organizationId: invoice.organization_id,
      organizationName:
        organization?.name ?? "Organizație indisponibilă",
      companyName: billing?.company_name ?? null,
      taxId: billing?.tax_id ?? null,
      billingEmail: billing?.billing_email ?? null,
      billingPeriodStart: invoice.billing_period_start,
      billingPeriodEnd: invoice.billing_period_end,
      invoiceNumber: invoice.invoice_number,
      issuedOn: invoice.issued_on,
      estimatedAmountRon:
        invoice.estimated_amount_ron === null
          ? null
          : Number(invoice.estimated_amount_ron),
      amountRon: Number(invoice.amount_ron),
      status: invoice.status,
      paidOn: invoice.paid_on,
      paymentReference: invoice.payment_reference,
      notes: invoice.notes,
      createdAt: invoice.created_at,
      updatedAt: invoice.updated_at,
    };
  });

  return {
    organizations: organizationOptions,
    invoices: invoiceRows,
  };
}
