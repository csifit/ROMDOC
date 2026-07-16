import { redirect } from "next/navigation";

import ClinicInvoicesWorkspace from "@/components/invoices/clinic-invoices-workspace";
import { loadClinicInvoiceWorkspaceData } from "@/lib/invoices/load-clinic-invoice-workspace-data";
import { requireClinicInvoiceAccess } from "@/lib/invoices/require-clinic-invoice-access";

export default async function ManagerInvoicesPage() {
  const access = await requireClinicInvoiceAccess();

  if (!access.ok) {
    if (access.status === 401) {
      redirect("/login?next=/manager-dashboard/invoices");
    }

    return (
      <div className="space-y-8">
        <header>
          <p className="text-sm font-semibold text-[#036661]">
            Panou manager
          </p>

          <h1 className="mt-2 text-3xl font-bold text-gray-900">
            Facturi
          </h1>
        </header>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="text-lg font-bold">
            Permisiunea Facturare este necesară
          </h2>

          <p className="mt-2 text-sm leading-6">
            Această pagină este disponibilă doar managerilor RomDoc cu
            permisiunea Facturare. Administratorul poate acorda această
            permisiune din pagina Admin → Manageri RomDoc.
          </p>
        </section>
      </div>
    );
  }

  if (access.actor.role !== "manager") {
    redirect("/dashboard");
  }

  const { organizations, invoices } =
    await loadClinicInvoiceWorkspaceData();

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Manager Facturare
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturi
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Înregistrează facturile create manual în SAGA și confirmă încasarea
          lor. RomDoc este doar CRM-ul operațional de facturare.
        </p>
      </header>

      <ClinicInvoicesWorkspace
        invoices={invoices}
        organizations={organizations}
      />
    </div>
  );
}
