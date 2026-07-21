import Link from "next/link";

import {
  getPlatformOperatorFoundation,
} from "@/lib/i18n/platform-operator-foundation";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type PlatformOperatorSecurityPageProps = {
  role:
    | "admin"
    | "manager";
  nextPath: string;
};

const localeTags = {
  ro:
    "ro-RO",
  en:
    "en-GB",
  de:
    "de-DE",
} as const;

function formatDate(
  value:
    | string
    | undefined,
  locale:
    keyof typeof localeTags
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

  return new Intl.DateTimeFormat(
    localeTags[
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
  ).format(
    date
  );
}

export default async function PlatformOperatorSecurityPage({
  role,
  nextPath,
}: PlatformOperatorSecurityPageProps) {
  const locale =
    await getStoredAppLocale();

  const copy =
    getPlatformOperatorFoundation(
      locale
    ).security;

  const supabase =
    await createClient();

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

  const description =
    role ===
      "admin"
      ? copy
          .adminDescription
      : copy
          .managerDescription;

  const activeDescription =
    role ===
      "admin"
      ? copy
          .adminActiveDescription
      : copy
          .managerActiveDescription;

  const inactiveDescription =
    role ===
      "admin"
      ? copy
          .adminInactiveDescription
      : copy
          .managerInactiveDescription;

  const aal1Label =
    role ===
      "admin"
      ? copy
          .adminAal1
      : copy
          .managerAal1;

  const recommendationOne =
    role ===
      "admin"
      ? copy
          .adminRecommendationOne
      : copy
          .managerRecommendationOne;

  const recommendationThree =
    role ===
      "admin"
      ? copy
          .adminRecommendationThree
      : copy
          .managerRecommendationThree;

  const setupParameters =
    new URLSearchParams({
      locale,
      next:
        nextPath,
    });

  return (
    <section className="mx-auto w-full max-w-4xl">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
          {
            copy.eyebrow
          }
        </p>

        <h1 className="mt-3 text-3xl font-bold text-gray-900">
          {
            copy.title
          }
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          {
            description
          }
        </p>
      </header>

      {factorsResult.error ? (
        <div
          role="alert"
          className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm"
        >
          {
            copy.loadError
          }
        </div>
      ) : factor ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-700 text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6"
                stroke="currentColor"
                strokeWidth="1.8"
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
                {
                  copy.activeTitle
                }
              </h2>

              <p className="mt-2 text-sm leading-6 text-green-900">
                {
                  activeDescription
                }
              </p>

              {configuredAt && (
                <p className="mt-3 text-xs text-green-800">
                  {copy.configuredAt.replace(
                    "{date}",
                    configuredAt
                  )}
                </p>
              )}

              <p className="mt-1 text-xs text-green-800">
                {
                  copy.currentLevel
                }{" "}
                <strong>
                  {currentLevel ===
                  "aal2"
                    ? copy.aal2
                    : aal1Label}
                </strong>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <h2 className="text-xl font-bold text-amber-950">
            {
              copy.inactiveTitle
            }
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-900">
            {
              inactiveDescription
            }
          </p>

          <Link
            href={
              `/mfa/admin/setup?${setupParameters.toString()}`
            }
            className="romdoc-button romdoc-button-primary romdoc-button-sm mt-5"
          >
            {
              copy.configure
            }
          </Link>
        </div>
      )}

      <details className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <summary className="cursor-pointer text-lg font-bold text-gray-900">
          {
            copy.recommendations
          }
        </summary>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-600">
          <li>
            {
              recommendationOne
            }
          </li>

          <li>
            {
              copy.recommendationTwo
            }
          </li>

          <li>
            {
              recommendationThree
            }
          </li>
        </ul>
      </details>
    </section>
  );
}
