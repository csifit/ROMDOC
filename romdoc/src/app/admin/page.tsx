import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import ClinicOrganizationAccountRequests from "@/components/admin/clinic-organization-account-requests";
import {
  OverviewAccordion,
  OverviewMetricCard,
} from "@/components/dashboard/platform-operator-overview-ui";
import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorOverview,
} from "@/lib/i18n/platform-operator-overview";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type PendingClinic = {
  id: string;
  slug: string;
  formatted_address:
    | string
    | null;
  created_at: string;
  clinic_translations:
    | {
        locale: string;
        name: string;
      }[]
    | null;
};

type RecentDoctor = {
  id: string;
  slug: string;
  status: string;
  created_at: string;
};

const dateLocales = {
  ro:
    "ro-RO",
  en:
    "en-GB",
  de:
    "de-DE",
} as const;

function getClinicName(
  clinic: PendingClinic,
  locale: AppLocale
) {
  return (
    clinic.clinic_translations
      ?.find(
        (
          translation
        ) =>
          translation.locale ===
          locale
      )?.name ??
    clinic.clinic_translations
      ?.find(
        (
          translation
        ) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic.clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function formatDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    dateLocales[
      locale
    ],
    {
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(
      value
    )
  );
}

function formatDoctorName(
  slug: string
) {
  return slug
    .split(
      "-"
    )
    .map(
      (
        part
      ) =>
        part
          .charAt(
            0
          )
          .toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      " "
    );
}

export default async function AdminPage() {
  const locale =
    await getStoredAppLocale();

  const copy =
    getPlatformOperatorOverview(
      locale
    );

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const parameters =
      new URLSearchParams({
        locale,
        next:
          "/admin",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(`
        role,
        first_name,
        last_name
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "admin"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const admin =
    createAdminClient();

  const [
    doctorsCountResult,
    activeDoctorsCountResult,
    pendingClinicsCountResult,
    approvedClinicsCountResult,
    pendingAppointmentsCountResult,
    activeStaffCountResult,
    patientsCountResult,
    recentPendingClinicsResult,
    recentDoctorsResult,
  ] =
    await Promise.all([
      admin
        .from(
          "doctors"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        ),

      admin
        .from(
          "doctors"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "status",
          "active"
        ),

      admin
        .from(
          "clinics"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "status",
          "pending"
        ),

      admin
        .from(
          "clinics"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "status",
          "approved"
        ),

      admin
        .from(
          "appointments"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "status",
          "pending"
        ),

      admin
        .from(
          "doctor_staff"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "status",
          "active"
        ),

      admin
        .from(
          "profiles"
        )
        .select(
          "*",
          {
            count:
              "exact",
            head:
              true,
          }
        )
        .eq(
          "role",
          "patient"
        ),

      admin
        .from(
          "clinics"
        )
        .select(`
          id,
          slug,
          formatted_address,
          created_at,
          clinic_translations (
            locale,
            name
          )
        `)
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          5
        ),

      admin
        .from(
          "doctors"
        )
        .select(`
          id,
          slug,
          status,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          5
        ),
    ]);

  const totalDoctors =
    doctorsCountResult.count ??
    0;

  const activeDoctors =
    activeDoctorsCountResult.count ??
    0;

  const pendingClinics =
    pendingClinicsCountResult.count ??
    0;

  const approvedClinics =
    approvedClinicsCountResult.count ??
    0;

  const pendingAppointments =
    pendingAppointmentsCountResult.count ??
    0;

  const activeStaff =
    activeStaffCountResult.count ??
    0;

  const patients =
    patientsCountResult.count ??
    0;

  const attentionItems =
    pendingClinics +
    pendingAppointments;

  const recentPendingClinics =
    (
      recentPendingClinicsResult.data ??
      []
    ) as PendingClinic[];

  const recentDoctors =
    (
      recentDoctorsResult.data ??
      []
    ) as RecentDoctor[];

  const hasDataWarning =
    [
      doctorsCountResult.error,
      activeDoctorsCountResult.error,
      pendingClinicsCountResult.error,
      approvedClinicsCountResult.error,
      pendingAppointmentsCountResult.error,
      activeStaffCountResult.error,
      patientsCountResult.error,
      recentPendingClinicsResult.error,
      recentDoctorsResult.error,
    ].some(
      Boolean
    );

  const adminName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {
            copy.admin
              .eyebrow
          }
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-950 sm:text-4xl">
          {
            copy.admin
              .welcome
          }
          {adminName
            ? `, ${adminName}`
            : ""}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-[1.6] text-gray-600">
          {
            copy.admin
              .description
          }
        </p>
      </header>

      {hasDataWarning && (
        <section
          role="alert"
          className="rounded-[13px] border border-amber-200 bg-amber-50 p-[21px] text-amber-950"
        >
          <h2 className="font-bold">
            {
              copy.common
                .dataWarningTitle
            }
          </h2>

          <p className="mt-[8px] text-sm leading-[1.55]">
            {
              copy.common
                .dataWarningDescription
            }
          </p>
        </section>
      )}

      <ClinicOrganizationAccountRequests
        locale={
          locale
        }
      />

      <section className="space-y-[13px]">
        <h2 className="text-xl font-bold text-gray-950">
          {
            copy.admin
              .platformStatus
          }
        </h2>

        <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          <OverviewMetricCard
            label={
              copy.admin
                .attentionItems
                .label
            }
            value={
              attentionItems
            }
            description={
              copy.admin
                .attentionItems
                .description
            }
            badge={
              copy.common
                .needsAttention
            }
            tone="attention"
          />

          <OverviewMetricCard
            label={
              copy.admin
                .pendingClinics
                .label
            }
            value={
              pendingClinics
            }
            description={
              copy.admin
                .pendingClinics
                .description
            }
            href="/admin/clinics"
            badge={
              copy.common
                .needsAttention
            }
            tone={
              pendingClinics >
              0
                ? "attention"
                : "default"
            }
          />

          <OverviewMetricCard
            label={
              copy.admin
                .pendingAppointments
                .label
            }
            value={
              pendingAppointments
            }
            description={
              copy.admin
                .pendingAppointments
                .description
            }
            href="/admin/appointments"
            badge={
              copy.common
                .needsAttention
            }
            tone={
              pendingAppointments >
              0
                ? "attention"
                : "default"
            }
          />

          <OverviewMetricCard
            label={
              copy.admin
                .activeDoctors
                .label
            }
            value={
              activeDoctors
            }
            description={
              copy.admin
                .activeDoctors
                .description
            }
            href="/admin/doctors"
            tone="success"
          />
        </div>
      </section>

      <OverviewAccordion
        title={
          copy.admin
            .secondaryMetrics
            .title
        }
        description={
          copy.admin
            .secondaryMetrics
            .description
        }
      >
        <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          <OverviewMetricCard
            label={
              copy.admin
                .secondaryMetrics
                .totalDoctors
            }
            value={
              totalDoctors
            }
            description={
              copy.admin
                .secondaryMetrics
                .totalDoctorsDescription
            }
            href="/admin/doctors"
          />

          <OverviewMetricCard
            label={
              copy.admin
                .secondaryMetrics
                .approvedClinics
            }
            value={
              approvedClinics
            }
            description={
              copy.admin
                .secondaryMetrics
                .approvedClinicsDescription
            }
            href="/admin/clinics"
          />

          <OverviewMetricCard
            label={
              copy.admin
                .secondaryMetrics
                .activeStaff
            }
            value={
              activeStaff
            }
            description={
              copy.admin
                .secondaryMetrics
                .activeStaffDescription
            }
          />

          <OverviewMetricCard
            label={
              copy.admin
                .secondaryMetrics
                .patients
            }
            value={
              patients
            }
            description={
              copy.admin
                .secondaryMetrics
                .patientsDescription
            }
            href="/admin/users"
          />
        </div>
      </OverviewAccordion>

      <section className="grid gap-[13px] xl:grid-cols-2">
        <OverviewAccordion
          title={
            copy.admin
              .pendingClinicsQueue
              .title
          }
          description={
            copy.admin
              .pendingClinicsQueue
              .description
          }
          badge={
            pendingClinics
          }
          attention={
            pendingClinics >
            0
          }
          defaultOpen={
            pendingClinics >
            0
          }
        >
          {recentPendingClinics.length ===
          0 ? (
            <p className="rounded-[13px] bg-gray-50 p-[13px] text-sm text-gray-600">
              {
                copy.admin
                  .pendingClinicsQueue
                  .empty
              }
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentPendingClinics.map(
                (
                  clinic
                ) => (
                  <Link
                    key={
                      clinic.id
                    }
                    href="/admin/clinics"
                    className="romdoc-focus-ring flex items-start justify-between gap-[13px] rounded-[8px] py-[13px] first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-950">
                        {getClinicName(
                          clinic,
                          locale
                        )}
                      </p>

                      <p className="mt-[5px] line-clamp-2 text-sm text-gray-600">
                        {clinic.formatted_address ??
                          copy.common
                            .addressUnavailable}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDate(
                        clinic.created_at,
                        locale
                      )}
                    </span>
                  </Link>
                )
              )}
            </div>
          )}

          <Link
            href="/admin/clinics"
            className="romdoc-focus-ring mt-[13px] inline-flex rounded-[8px] text-sm font-semibold text-[#036661] hover:underline"
          >
            {
              copy.common
                .viewAll
            }
          </Link>
        </OverviewAccordion>

        <OverviewAccordion
          title={
            copy.admin
              .recentDoctors
              .title
          }
          description={
            copy.admin
              .recentDoctors
              .description
          }
          badge={
            recentDoctors.length
          }
        >
          {recentDoctors.length ===
          0 ? (
            <p className="rounded-[13px] bg-gray-50 p-[13px] text-sm text-gray-600">
              {
                copy.admin
                  .recentDoctors
                  .empty
              }
            </p>
          ) : (
            <div className="divide-y divide-gray-200">
              {recentDoctors.map(
                (
                  doctor
                ) => (
                  <div
                    key={
                      doctor.id
                    }
                    className="flex items-center justify-between gap-[13px] py-[13px] first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-gray-950">
                        {formatDoctorName(
                          doctor.slug
                        )}
                      </p>

                      <p className="mt-[5px] text-xs text-gray-500">
                        {copy.common.createdOn.replace(
                          "{date}",
                          formatDate(
                            doctor.created_at,
                            locale
                          )
                        )}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-[13px] py-[5px] text-xs font-semibold ${
                        doctor.status ===
                        "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-950"
                      }`}
                    >
                      {doctor.status ===
                      "active"
                        ? copy.common
                            .active
                        : copy.common
                            .pending}
                    </span>
                  </div>
                )
              )}
            </div>
          )}

          <Link
            href="/admin/doctors"
            className="romdoc-focus-ring mt-[13px] inline-flex rounded-[8px] text-sm font-semibold text-[#036661] hover:underline"
          >
            {
              copy.common
                .viewAllDoctors
            }
          </Link>
        </OverviewAccordion>
      </section>

      <OverviewAccordion
        title={
          copy.admin
            .supportAppointments
            .title
        }
        description={
          copy.admin
            .supportAppointments
            .description
        }
      >
        <Link
          href="/admin/appointments"
          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
        >
          {
            copy.admin
              .supportAppointments
              .action
          }
        </Link>
      </OverviewAccordion>
    </div>
  );
}
