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

function translatedItems(
  t: Awaited<
    ReturnType<
      typeof getTranslations
    >
  >,
  path: string,
  count: number
) {
  return Array.from(
    { length: count },
    (_, index) => ({
      title: t(
        `${path}.${index}.title`
      ),
      body: t(
        `${path}.${index}.body`
      ),
    })
  );
}

function translatedList(
  t: Awaited<
    ReturnType<
      typeof getTranslations
    >
  >,
  path: string,
  count: number
) {
  return Array.from(
    { length: count },
    (_, index) =>
      t(`${path}.${index}`)
  );
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
        "DoctorStaffGuide",
    });

  const canonical =
    getPathname({
      locale,
      href:
        "/ghid-medici-personal",
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
            "/ghid-medici-personal",
        }),
        en: getPathname({
          locale: "en",
          href:
            "/ghid-medici-personal",
        }),
        de: getPathname({
          locale: "de",
          href:
            "/ghid-medici-personal",
        }),
        "x-default":
          getPathname({
            locale: "ro",
            href:
              "/ghid-medici-personal",
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

export default async function DoctorStaffGuidePage({
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
        "DoctorStaffGuide",
    });

  const homeHref =
    getPathname({
      locale,
      href: "/",
    });

  const permissions =
    translatedItems(
      t,
      "access.items",
      2
    );

  const statuses =
    translatedItems(
      t,
      "appointments.items",
      6
    );

  const smsRules =
    translatedList(
      t,
      "sms.rules",
      7
    );

  const fields =
    translatedList(
      t,
      "manual.fields",
      8
    );

  const workflow =
    translatedList(
      t,
      "workflow.items",
      7
    );

  const securityRules =
    translatedList(
      t,
      "security.rules",
      5
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
              {t(
                "introduction"
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="romdoc-button romdoc-button-primary"
              >
                {t(
                  "actions.signIn"
                )}
              </Link>

              <Link
                href="/register?role=doctor"
                className="romdoc-button romdoc-button-secondary"
              >
                {t(
                  "actions.join"
                )}
              </Link>
            </div>
          </header>

          <section
            id="acces"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "access.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "access.title"
              )}
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {permissions.map(
                (item) => (
                  <article
                    key={
                      item.title
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {
                        item.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {item.body}
                    </p>
                  </article>
                )
              )}
            </div>
          </section>

          <section
            id="programari"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "appointments.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "appointments.title"
              )}
            </h2>

            <div className="mt-7 grid gap-5 md:grid-cols-2">
              {statuses.map(
                (status) => (
                  <article
                    key={
                      status.title
                    }
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
                  >
                    <h3 className="text-lg font-semibold text-gray-900">
                      {
                        status.title
                      }
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-gray-700">
                      {status.body}
                    </p>
                  </article>
                )
              )}
            </div>
          </section>

          <section
            id="abonament"
            className="mt-8 rounded-3xl border border-[#036661]/20 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "subscription.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "subscription.title"
              )}
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-700">
              {t(
                "subscription.description"
              )}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-600">
                  {t(
                    "subscription.monthlyLabel"
                  )}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {t(
                    "subscription.monthlyPrice"
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <p className="text-sm font-semibold text-gray-600">
                  {t(
                    "subscription.yearlyLabel"
                  )}
                </p>

                <p className="mt-2 text-2xl font-bold text-gray-900">
                  {t(
                    "subscription.yearlyPrice"
                  )}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-gray-700">
              {t(
                "subscription.smsNote"
              )}
            </p>
          </section>

          <section
            id="sms"
            className="mt-8 rounded-3xl border border-[#036661]/20 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              SMS
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t("sms.title")}
            </h2>

            <p className="mt-4 text-sm leading-7 text-gray-700">
              {t(
                "sms.description"
              )}
            </p>

            <ul className="mt-5 space-y-3 text-sm leading-7 text-gray-700">
              {smsRules.map(
                (rule) => (
                  <li
                    key={rule}
                    className="flex gap-3"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                    <span>
                      {rule}
                    </span>
                  </li>
                )
              )}
            </ul>
          </section>

          <section
            id="creare-programare"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "manual.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "manual.title"
              )}
            </h2>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {fields.map(
                (field) => (
                  <div
                    key={field}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm font-semibold text-gray-800"
                  >
                    {field}
                  </div>
                )
              )}
            </div>
          </section>

          <section
            id="flux"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "workflow.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "workflow.title"
              )}
            </h2>

            <ol className="mt-7 space-y-4">
              {workflow.map(
                (
                  item,
                  index
                ) => (
                  <li
                    key={item}
                    className="flex gap-4 rounded-2xl border border-gray-200 p-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#036661] font-bold text-white">
                      {index + 1}
                    </span>

                    <p className="pt-2 text-sm leading-6 text-gray-700">
                      {item}
                    </p>
                  </li>
                )
              )}
            </ol>
          </section>

          <section
            id="securitate"
            className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {t(
                "security.eyebrow"
              )}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
              {t(
                "security.title"
              )}
            </h2>

            <ul className="mt-7 space-y-3 text-sm leading-7 text-gray-700">
              {securityRules.map(
                (rule) => (
                  <li
                    key={rule}
                    className="flex gap-3"
                  >
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                    <span>
                      {rule}
                    </span>
                  </li>
                )
              )}
            </ul>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={homeHref}
              className="romdoc-button romdoc-button-secondary"
            >
              {t(
                "actions.back"
              )}
            </Link>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}
