import CapabilityMatrixSimulation from "@/components/admin/capability-matrix-simulation";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";

export default async function AdminCapabilitiesPage() {
  const locale =
    await getStoredAppLocale();

  return (
    <CapabilityMatrixSimulation
      locale={
        locale
      }
    />
  );
}
