import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import AdminClinicCreationForm from "@/components/admin/admin-clinic-creation-form";
import AdminDoctorClinicAssociations from "@/components/admin/admin-doctor-clinic-associations";
import ClinicManagementActions from "@/components/admin/clinic-management-actions";
import ClinicEditingPanel from "@/components/clinic/clinic-editing-panel";
import AdminAccordion from "@/components/ui/admin-accordion";
import {
  getPlatformOperatorClinics,
} from "@/lib/i18n/platform-operator-clinics";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function AdminClinicsPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    getPlatformOperatorClinics(
      locale
    );

  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/admin/clinics",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, account_status"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "admin" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <div className="space-y-[34px]">
      <header className="flex flex-wrap items-start justify-between gap-[21px]">
        <div>
          <p className="text-sm font-semibold text-[#9A4F35]">
            {
              copy.common
                .administration
            }
          </p>

          <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
            {
              copy.pages.admin
                .title
            }
          </h1>

          <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
            {
              copy.moderation
                .description
            }
          </p>
        </div>

        <Link
          href="/admin/clinics/clinic-billing"
          target="_blank"
          rel="noopener noreferrer"
          className="romdoc-focus-ring inline-flex min-h-[42px] items-center rounded-xl border border-[#036661] bg-white px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:bg-[#036661]/10"
        >
          {
            copy.pages.admin
              .billing
          }
        </Link>
      </header>

      <ClinicManagementActions />

      <AdminAccordion
        title={
          copy.accordions
            .createTitle
        }
        description={
          copy.accordions
            .createDescription
        }
      >
        <AdminClinicCreationForm />
      </AdminAccordion>

      <AdminAccordion
        title={
          copy.accordions
            .associationsTitle
        }
        description={
          copy.accordions
            .associationsDescription
        }
      >
        <AdminDoctorClinicAssociations />
      </AdminAccordion>

      <AdminAccordion
        title={
          copy.accordions
            .editingTitle
        }
        description={
          copy.accordions
            .editingDescription
        }
      >
        <ClinicEditingPanel
          title={
            copy.editing.title
          }
          description={
            copy.editing
              .descriptionAdmin
          }
          emptyMessage={
            copy.editing.empty
          }
        />
      </AdminAccordion>
    </div>
  );
}
