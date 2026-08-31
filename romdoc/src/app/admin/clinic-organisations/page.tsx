import { redirect } from "next/navigation";

import ClinicOrganisationLeadsPanel from "@/components/admin/clinic-organisation-leads-panel";
import ClinicOrganizationLocationApprovals from "@/components/admin/clinic-organization-location-approvals";
import ClinicOrganizationsOverview from "@/components/admin/clinic-organizations-overview";
import AdminAccordion from "@/components/ui/admin-accordion";
import { getPlatformOperatorClinics } from "@/lib/i18n/platform-operator-clinics";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

const LEAD_ACCORDION_COPY = {
  ro: {
    title: "Organizații interesate",
    description:
      "Solicitări primite prin formularul public RomDoc pentru clinici și alte organizații medicale.",
  },
  en: {
    title: "Prospective organisations",
    description:
      "Enquiries received through the public RomDoc form for clinics and other healthcare organisations.",
  },
  de: {
    title: "Interessierte Organisationen",
    description:
      "Anfragen über das öffentliche RomDoc-Formular für Kliniken und andere medizinische Organisationen.",
  },
} as const;

export default async function AdminClinicOrganisationsPage() {
  const locale = await getStoredAppLocale();
  const copy = getPlatformOperatorClinics(locale);
  const leadCopy = LEAD_ACCORDION_COPY[locale];
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    const parameters = new URLSearchParams({
      locale,
      next: "/admin/clinic-organisations",
    });

    redirect(`/login?${parameters.toString()}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {copy.common.administration}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {copy.accordions.organizationsTitle}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {copy.accordions.organizationsDescription}
        </p>
      </header>

      <AdminAccordion
        title={leadCopy.title}
        description={leadCopy.description}
        defaultOpen
      >
        <ClinicOrganisationLeadsPanel locale={locale} />
      </AdminAccordion>

      <AdminAccordion
        title={copy.accordions.organizationsTitle}
        description={copy.accordions.organizationsDescription}
      >
        <ClinicOrganizationsOverview locale={locale} />
      </AdminAccordion>

      <AdminAccordion
        title={copy.accordions.locationsTitle}
        description={copy.accordions.locationsDescription}
        defaultOpen
      >
        <ClinicOrganizationLocationApprovals />
      </AdminAccordion>
    </div>
  );
}
