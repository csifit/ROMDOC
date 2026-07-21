import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import ClinicEditingPanel from "@/components/clinic/clinic-editing-panel";
import AdminAccordion from "@/components/ui/admin-accordion";
import { getPlatformOperatorClinics } from "@/lib/i18n/platform-operator-clinics";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

export default async function ManagerClinicsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorClinics(locale);

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.common.operationalManagement}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.manager.title}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.manager.description}
        </p>
      </header>

      <ClinicManagementActions />

      <AdminAccordion
        title={copy.accordions.editingTitle}
        description={copy.accordions.editingDescription}
      >
        <ClinicEditingPanel
          title={copy.editing.title}
          description={copy.editing.descriptionManager}
          emptyMessage={copy.editing.empty}
        />
      </AdminAccordion>
    </div>
  );
}
