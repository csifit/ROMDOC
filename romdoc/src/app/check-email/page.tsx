import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import PublicFooter from "@/components/public/public-footer";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    type?: string;
    next?: string;
    locale?: string;
  }>;
};

function getSafeNextPath(
  nextPath:
    | string
    | undefined
) {
  if (
    !nextPath ||
    !nextPath.startsWith(
      "/"
    ) ||
    nextPath.startsWith(
      "//"
    )
  ) {
    return null;
  }

  return nextPath;
}

function getAuthHref(
  pathname: string,
  locale: string,
  nextPath: string | null
) {
  const parameters =
    new URLSearchParams({
      locale,
    });

  if (nextPath) {
    parameters.set(
      "next",
      nextPath
    );
  }

  return `${pathname}?${parameters.toString()}`;
}

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const parameters =
    await searchParams;

  const locale =
    normalizeAppLocale(
      parameters.locale
    );

  const t =
    await getTranslations({
      locale,
      namespace:
        "AuthReturn.checkEmail",
    });

  const email =
    parameters.email?.trim() ??
    "";

  const isDoctor =
    parameters.type ===
    "doctor";

  const isClinic =
    parameters.type ===
    "clinic";

  const nextPath =
    getSafeNextPath(
      parameters.next
    );

  const loginHref =
    getAuthHref(
      "/login",
      locale,
      nextPath
    );

  const passwordResetHref =
    getAuthHref(
      "/forgot-password",
      locale,
      nextPath
    );

  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <main className="flex-1 px-[21px] py-[34px] sm:px-[34px] sm:py-[55px]">
        <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-2xl items-center justify-center">
          <section className="romdoc-card w-full p-[21px] text-center sm:p-[34px]">
            <div className="mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full bg-green-100 text-2xl">
              ✉
            </div>

            <h1 className="mt-[21px] text-3xl font-bold text-gray-900">
              {t("title")}
            </h1>

            <p className="mt-[13px] leading-7 text-gray-600">
              {email
                ? t.rich(
                    "sentWithEmail",
                    {
                      strong: (chunks) => (
                        <strong className="text-gray-900">
                          {chunks}
                        </strong>
                      ),
                      email,
                    }
                  )
                : t(
                    "sentWithoutEmail"
                  )}
            </p>

            <p className="mt-[8px] leading-7 text-gray-600">
              {t(
                "instructions"
              )}
            </p>

            <div className="romdoc-notice romdoc-notice-info mt-[21px] text-left">
              <h2 className="font-bold">
                {t(
                  "notReceivedTitle"
                )}
              </h2>

              <p className="mt-[8px]">
                {t(
                  "securityExplanation"
                )}
              </p>

              <p className="mt-[8px]">
                {t(
                  "signInSuggestion"
                )}
              </p>
            </div>

            {isDoctor && (
              <div className="mt-[21px] rounded-[13px] border border-[#D97757]/30 bg-[#F0EEE9] p-[13px] text-left text-sm leading-6 text-gray-800">
                {t.rich(
                  "doctorNotice",
                  {
                    price:
                      (
                        chunks
                      ) => (
                        <strong>
                          {
                            chunks
                          }
                        </strong>
                      ),
                  }
                )}
              </div>
            )}

            {isClinic && (
              <div className="mt-[21px] rounded-[13px] border border-[#D97757]/30 bg-[#F0EEE9] p-[13px] text-left text-sm leading-6 text-gray-800">
                {t(
                  "clinicNotice"
                )}
              </div>
            )}

            <div className="romdoc-notice romdoc-notice-warning mt-[13px] text-left">
              {t(
                "spamNotice"
              )}
            </div>

            <div className="mt-[21px] grid gap-[8px] sm:grid-cols-2">
              <Link
                href={
                  loginHref
                }
                className="romdoc-button romdoc-button-primary justify-center"
              >
                {t(
                  "goToLogin"
                )}
              </Link>

              <Link
                href={
                  passwordResetHref
                }
                className="romdoc-button romdoc-button-secondary justify-center"
              >
                {t(
                  "resetPassword"
                )}
              </Link>
            </div>

            <Link
              href={`/${locale}`}
              className="romdoc-link mt-[21px] inline-block text-sm font-semibold underline-offset-4 hover:underline"
            >
              {t(
                "backHome"
              )}
            </Link>
          </section>
        </div>
      </main>

      <PublicFooter
        locale={locale}
      />
    </div>
  );
}
