import { redirect } from "next/navigation";

import ClinicInvoicesWorkspace from "@/components/invoices/clinic-invoices-workspace";
import { loadClinicInvoiceWorkspaceData } from "@/lib/invoices/load-clinic-invoice-workspace-data";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";

export default async function AdminInvoicesPage() {
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/login?next=/admin/invoices");
    }

    redirect("/dashboard");
  }

  if (access.actor.role !== "admin") {
    redirect("/dashboard");
  }

  const { organizations, invoices } =
    await loadClinicInvoiceWorkspaceData();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Administrare facturare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturi
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Evidență operațională pentru facturile organizațiilor de clinică
          create manual în SAGA. SAGA rămâne evidența contabilă oficială.
        </p>
      </header>

      <ClinicInvoicesWorkspace
        invoices={invoices}
        organizations={organizations}
      />
    </div>
  );
}
