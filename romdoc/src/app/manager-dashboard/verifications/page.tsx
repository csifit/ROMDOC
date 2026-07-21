import DoctorVerificationsManagement from "@/components/admin/doctor-verifications-management";
import { getPlatformOperatorDoctors } from "@/lib/i18n/platform-operator-doctors";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";

export default async function ManagerVerificationsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorDoctors(locale);

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          {copy.common.operationalManagement}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.pages.managerVerifications.title}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.pages.managerVerifications.description}
        </p>
      </header>

      <DoctorVerificationsManagement />
    </div>
  );
}
