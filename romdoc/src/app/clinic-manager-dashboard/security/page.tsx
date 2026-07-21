import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import {
  type AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function formatDate(
  value:
    | string
    | undefined,
  locale:
    AppLocale
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return new Intl
    .DateTimeFormat(
      DATE_LOCALE[
        locale
      ],
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",

        timeZone:
          "Europe/Bucharest",
      }
    )
    .format(
      date
    );
}

export default async function ClinicManagerSecurityPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.security",
    });

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
          "/clinic-manager-dashboard/security",
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
    !profile ||
    profile.role !==
      "clinic_manager" ||
    profile
      .account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const [
    factorsResult,
    assuranceResult,
  ] =
    await Promise.all([
      supabase.auth.mfa
        .listFactors(),

      supabase.auth.mfa
        .getAuthenticatorAssuranceLevel(),
    ]);

  const factor =
    factorsResult.data
      ?.totp?.[0] ??
    null;

  const configuredAt =
    factor
      ? formatDate(
          factor.updated_at ??
            factor.created_at,
          locale
        )
      : null;

  const currentLevel =
    assuranceResult.data
      ?.currentLevel ??
    "aal1";

  const setupParameters =
    new URLSearchParams({
      locale,
      next:
        "/clinic-manager-dashboard/security",
    });

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      {factorsResult.error ? (
        <div
          role="alert"
          className="mt-[34px] rounded-[21px] border border-red-200 bg-red-50 p-[21px] text-sm text-red-800 shadow-sm"
        >
          {t(
            "loadError"
          )}
        </div>
      ) : factor ? (
        <div className="mt-[34px] rounded-[21px] border border-green-200 bg-green-50 p-[21px] shadow-sm">
          <div className="flex items-start gap-[13px]">
            <div
              aria-hidden="true"
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                stroke="currentColor"
                strokeWidth={
                  1.8
                }
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z"
                />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m9 12 2 2 4-4"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-green-950">
                {t(
                  "activeTitle"
                )}
              </h2>

              <p className="mt-[8px] text-sm leading-6 text-green-900">
                {t(
                  "activeDescription"
                )}
              </p>

              {configuredAt && (
                <p className="mt-[13px] text-xs text-green-800">
                  {t(
                    "configuredAt",
                    {
                      date:
                        configuredAt,
                    }
                  )}
                </p>
              )}

              <p className="mt-[5px] text-xs text-green-800">
                {t(
                  "sessionLevel"
                )}
                :{" "}

                <strong>
                  {currentLevel ===
                  "aal2"
                    ? t(
                        "aal2"
                      )
                    : t(
                        "aal1"
                      )}
                </strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-[34px] rounded-[21px] border border-amber-200 bg-amber-50 p-[21px] shadow-sm">
          <div className="flex items-start gap-[13px]">
            <div
              aria-hidden="true"
              className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-full bg-amber-700 text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                stroke="currentColor"
                strokeWidth={
                  1.8
                }
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3 19 6v5c0 4.6-2.7 8-7 10-4.3-2-7-5.4-7-10V6l7-3Z"
                />

                <path
                  strokeLinecap="round"
                  d="M12 8v5M12 17h.01"
                />
              </svg>
            </div>

            <div>
              <h2 className="text-xl font-bold text-amber-950">
                {t(
                  "inactiveTitle"
                )}
              </h2>

              <p className="mt-[13px] text-sm leading-6 text-amber-900">
                {t(
                  "inactiveDescription"
                )}
              </p>

              <Link
                href={`/mfa/admin/setup?${setupParameters.toString()}`}
                className="romdoc-button romdoc-button-primary romdoc-button-sm mt-[21px]"
              >
                {t(
                  "activate"
                )}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mt-[21px] rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">
          {t(
            "recommendationsTitle"
          )}
        </h2>

        <ul className="mt-[13px] space-y-[8px] text-sm leading-6 text-gray-600">
          <li className="flex gap-[8px]">
            <span
              aria-hidden="true"
              className="text-[#036661]"
            >
              •
            </span>

            <span>
              {t(
                "recommendations.codes"
              )}
            </span>
          </li>

          <li className="flex gap-[8px]">
            <span
              aria-hidden="true"
              className="text-[#036661]"
            >
              •
            </span>

            <span>
              {t(
                "recommendations.phone"
              )}
            </span>
          </li>

          <li className="flex gap-[8px]">
            <span
              aria-hidden="true"
              className="text-[#036661]"
            >
              •
            </span>

            <span>
              {t(
                "recommendations.lostDevice"
              )}
            </span>
          </li>
        </ul>
      </div>
    </section>
  );
}
