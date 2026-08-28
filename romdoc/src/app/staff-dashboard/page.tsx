import {
  NextIntlClientProvider,
} from "next-intl";
import {
  getTranslations,
} from "next-intl/server";
import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import StaffAppointmentsManager from "@/components/staff/staff-appointments-manager";
import StaffLogoutButton from "@/components/staff/staff-logout-button";
import {
  getAccountSecurityCopy,
} from "@/lib/i18n/account-security";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

import roMessages from "../../../messages/ro.json";
import enMessages from "../../../messages/en.json";
import deMessages from "../../../messages/de.json";

const messagesByLocale = {
  ro: roMessages,
  en: enMessages,
  de: deMessages,
} as const;

const PATIENTS_LABEL = {
  ro: "Pacienți",
  en: "Patients",
  de: "Patienten",
} as const;

export default async function StaffDashboardPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorStaffFoundation.staff.page",
    });

  const securityCopy =
    getAccountSecurityCopy(
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
          "/staff-dashboard",
      });

    redirect(
      `/login?${parameters.toString()}`
    );
  }

  const registrationType =
    typeof user
      .user_metadata
      ?.registration_type ===
    "string"
      ? user
          .user_metadata
          .registration_type
      : "";

  const passwordInitialized =
    user.user_metadata
      ?.password_initialized ===
    true;

  if (
    registrationType ===
      "staff" &&
    !passwordInitialized
  ) {
    const parameters =
      new URLSearchParams({
        mode:
          "invite",

        locale,

        next:
          "/staff-dashboard",
      });

    redirect(
      `/set-password?${parameters.toString()}`
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
    !profile
  ) {
    redirect(
      "/dashboard"
    );
  }

  if (
    profile.role !==
    "staff"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      activeAssignments,
    error:
      assignmentError,
  } =
    await supabase
      .from(
        "doctor_staff"
      )
      .select(
        "id"
      )
      .eq(
        "staff_profile_id",
        user.id
      )
      .eq(
        "status",
        "active"
      );

  if (
    assignmentError
  ) {
    console.error(
      "Staff assignment lookup failed:",
      assignmentError
    );
  }

  const hasActiveAssignment =
    Boolean(
      activeAssignments
        ?.length
    );

  const staffName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const displayName =
    staffName ||
    user.email ||
    t(
      "fallbackStaff"
    );

  const homeHref =
    `/${locale}`;

  return (
    <NextIntlClientProvider
      locale={locale}
      messages={
        messagesByLocale[
          locale
        ]
      }
    >
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div>
              <Link
                href={
                  homeHref
                }
                className="text-2xl font-bold text-gray-900"
              >
                RomDoc
              </Link>

              <p className="mt-1 text-sm text-gray-600">
                {displayName}
              </p>

              <span className="mt-2 inline-flex rounded-full bg-[#F0EEE9] px-3 py-1 text-xs font-semibold text-[#9A4F35]">
                {t(
                  "roleBadge"
                )}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {hasActiveAssignment && (
                <Link
                  href="/staff-dashboard/patients"
                  className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                >
                  {
                    PATIENTS_LABEL[
                      locale
                    ]
                  }
                </Link>
              )}

              <Link
                href="/staff-dashboard/security"
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {securityCopy.navigationLabel}
              </Link>

              <Link
                href={
                  homeHref
                }
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {t(
                  "home"
                )}
              </Link>

              <StaffLogoutButton />
            </div>
          </header>

          {hasActiveAssignment ? (
            <StaffAppointmentsManager />
          ) : (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 shadow-sm">
              <h1 className="text-2xl font-bold text-amber-950">
                {t(
                  "inactiveTitle"
                )}
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-900">
                {t(
                  "inactiveDescription"
                )}
              </p>
            </section>
          )}
        </div>
      </main>
    </NextIntlClientProvider>
  );
}
