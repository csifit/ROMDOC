import type {
  Metadata,
} from "next";
import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  notFound,
} from "next/navigation";

import PublicLayout from "@/components/public/public-layout";
import {
  getPathname,
} from "@/i18n/navigation";
import {
  type AppLocale,
  routing,
} from "@/i18n/routing";

type Props = {
  params: Promise<{
    locale: AppLocale;
  }>;
};

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  "https://www.romdoc.fit"
).replace(/\/+$/, "");

function isLocale(
  value: string
): value is AppLocale {
  return routing.locales.includes(
    value as AppLocale
  );
}

function localeOpenGraph(
  locale: AppLocale
) {
  if (locale === "en") {
    return "en_US";
  }

  if (locale === "de") {
    return "de_DE";
  }

  return "ro_RO";
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } =
    await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientGuide",
    });

  const canonical =
    getPathname({
      locale,
      href:
        "/ghid-pacienti",
    });

  const title =
    t("metadataTitle");

  const description =
    t(
      "metadataDescription"
    );

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        ro: getPathname({
          locale: "ro",
          href:
            "/ghid-pacienti",
        }),
        en: getPathname({
          locale: "en",
          href:
            "/ghid-pacienti",
        }),
        de: getPathname({
          locale: "de",
          href:
            "/ghid-pacienti",
        }),
        "x-default":
          getPathname({
            locale: "ro",
            href:
              "/ghid-pacienti",
          }),
      },
    },
    openGraph: {
      type: "article",
      locale:
        localeOpenGraph(
          locale
        ),
      siteName:
        "RomDoc",
      title,
      description,
      url:
        `${siteUrl}${canonical}`,
    },
  };
}

export default async function PatientGuidePage({
  params,
}: Props) {
  const { locale } =
    await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const t =
    await getTranslations({
      locale,
      namespace:
        "PatientGuide",
    });

  const homeHref =
    getPathname({
      locale,
      href: "/",
    });

  const doctorsHref =
    getPathname({
      locale,
      href: "/medici",
    });

  const specialtiesHref =
    getPathname({
      locale,
      href:
        "/specialitati",
    });

  const cardiologyHref =
    getPathname({
      locale,
      href: {
        pathname:
          "/medici/[specialty]/[city]",
        params: {
          specialty:
            "cardiologie",
          city:
            "bucuresti",
        },
      },
    });

  const benefits =
    Array.from(
      { length: 4 },
      (_, index) => ({
        title: t(
          `benefits.items.${index}.title`
        ),
        body: t(
          `benefits.items.${index}.body`
        ),
      })
    );

  const steps =
    Array.from(
      { length: 5 },
      (_, index) => ({
        title: t(
          `steps.items.${index}.title`
        ),
        body: t(
          `steps.items.${index}.body`
        ),
      })
    );

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t("eyebrow")}
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {t("title")}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-700 sm:text-lg">
              {t.rich(
                "introduction",
                {
                  homeLink:
                    (chunks) => (
                      <Link
                        href={
                          homeHref
                        }
                        className="font-semibold text-[#036661] underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                }
              )}
            </p>
          </header>

          <section
            aria-labelledby="benefits-title"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "benefits.eyebrow"
              )}
            </p>

            <h2
              id="benefits-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {t(
                "benefits.title"
              )}
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {benefits.map(
                (benefit) => (
                  <article
                    key={
                      benefit.title
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {
                        benefit.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {
                        benefit.body
                      }
                    </p>
                  </article>
                )
              )}
            </div>

            <p className="mt-7 text-sm leading-7 text-gray-700">
              {t.rich(
                "benefits.directoryLinks",
                {
                  specialtiesLink:
                    (chunks) => (
                      <Link
                        href={
                          specialtiesHref
                        }
                        className="font-semibold text-[#036661] underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                  doctorsLink:
                    (chunks) => (
                      <Link
                        href={
                          doctorsHref
                        }
                        className="font-semibold text-[#036661] underline underline-offset-4"
                      >
                        {chunks}
                      </Link>
                    ),
                }
              )}
            </p>
          </section>

          <section
            aria-labelledby="sms-title"
            className="mt-8 rounded-3xl border border-[#036661]/20 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              SMS
            </p>

            <h2
              id="sms-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {t("sms.title")}
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-700">
              {t(
                "sms.description"
              )}
            </p>

            <p className="mt-3 text-sm leading-7 text-gray-700">
              {t(
                "sms.privacy"
              )}
            </p>
          </section>

          <section
            aria-labelledby="how-to-use-title"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "steps.eyebrow"
              )}
            </p>

            <h2
              id="how-to-use-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {t("steps.title")}
            </h2>

            <ol className="mt-7 space-y-5">
              {steps.map(
                (
                  step,
                  index
                ) => (
                  <li
                    key={
                      step.title
                    }
                    className="flex gap-4 rounded-2xl border border-gray-200 p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#036661] font-bold text-white">
                      {index + 1}
                    </span>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {
                          step.title
                        }
                      </h3>

                      <p className="mt-2 text-sm leading-7 text-gray-700">
                        {
                          step.body
                        }
                      </p>
                    </div>
                  </li>
                )
              )}
            </ol>

            <div className="mt-8 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {t(
                  "example.title"
                )}
              </h3>

              <p className="mt-3 text-sm leading-7 text-gray-700">
                {t.rich(
                  "example.body",
                  {
                    cardiologyLink:
                      (
                        chunks
                      ) => (
                        <Link
                          href={
                            cardiologyHref
                          }
                          className="font-semibold text-[#036661] underline underline-offset-4"
                        >
                          {
                            chunks
                          }
                        </Link>
                      ),
                  }
                )}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={homeHref}
                className="romdoc-button romdoc-button-primary"
              >
                {t(
                  "actions.start"
                )}
              </Link>

              <Link
                href={
                  specialtiesHref
                }
                className="romdoc-button romdoc-button-secondary"
              >
                {t(
                  "actions.specialties"
                )}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
