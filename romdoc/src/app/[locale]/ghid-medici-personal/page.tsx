import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicLayout from "@/components/public/public-layout";
import { getPathname } from "@/i18n/navigation";
import {
  type AppLocale,
  routing,
} from "@/i18n/routing";
import {
  professionalPlatformGuideCopy,
  type ProfessionalGuideAudience,
  type ProfessionalGuideCategory,
} from "@/lib/i18n/professional-platform-guide";

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

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0 text-[#036661]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m5 12 4 4L19 6"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5 shrink-0 transition-transform duration-200 group-open:rotate-180"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6 9 6 6 6-6"
      />
    </svg>
  );
}

function GuideAccordion({
  category,
}: {
  category: ProfessionalGuideCategory;
}) {
  return (
    <details
      id={category.id}
      className="group scroll-mt-28 rounded-2xl border border-gray-200 bg-white shadow-sm open:border-[#036661]/30"
    >
      <summary className="romdoc-focus-ring flex cursor-pointer list-none items-start justify-between gap-5 rounded-2xl px-5 py-5 marker:content-none sm:px-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
            {category.title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            {category.summary}
          </p>
        </div>

        <span className="mt-1 rounded-full border border-gray-200 bg-gray-50 p-2 text-gray-600 transition group-open:border-[#036661]/30 group-open:bg-[#036661]/10 group-open:text-[#036661]">
          <ChevronIcon />
        </span>
      </summary>

      <div className="border-t border-gray-200 px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-5 lg:grid-cols-2">
          {category.items.map(
            (item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
              >
                <h4 className="text-base font-semibold text-gray-900">
                  {item.title}
                </h4>

                <p className="mt-3 text-sm leading-7 text-gray-700">
                  {item.body}
                </p>

                <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
                  {item.bullets.map(
                    (bullet) => (
                      <li
                        key={bullet}
                        className="flex gap-3"
                      >
                        <CheckIcon />
                        <span>{bullet}</span>
                      </li>
                    )
                  )}
                </ul>
              </article>
            )
          )}
        </div>

        {category.note ? (
          <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
            {category.note}
          </p>
        ) : null}
      </div>
    </details>
  );
}

function AudienceGuide({
  audience,
  accordionHint,
}: {
  audience: ProfessionalGuideAudience;
  accordionHint: string;
}) {
  return (
    <section
      id={audience.id}
      className="scroll-mt-24"
    >
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {audience.eyebrow}
        </p>

        <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {audience.title}
        </h2>

        <p className="mt-4 max-w-3xl text-base leading-8 text-gray-700">
          {audience.description}
        </p>

        <div className="mt-7 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {audience.quickStartTitle}
          </h3>

          <ol className="mt-4 grid gap-3 text-sm leading-6 text-gray-700 md:grid-cols-2">
            {audience.quickStart.map(
              (step, index) => (
                <li
                  key={step}
                  className="flex gap-3 rounded-xl border border-white/80 bg-white px-4 py-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#036661] text-xs font-bold text-white">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">
                    {step}
                  </span>
                </li>
              )
            )}
          </ol>
        </div>

        <p className="mt-6 text-sm font-medium text-gray-600">
          {accordionHint}
        </p>
      </div>

      <div className="mt-5 space-y-4">
        {audience.categories.map(
          (category) => (
            <GuideAccordion
              key={category.id}
              category={category}
            />
          )
        )}
      </div>
    </section>
  );
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy =
    professionalPlatformGuideCopy[locale];

  const canonical = getPathname({
    locale,
    href: "/ghid-medici-personal",
  });

  return {
    title: copy.metadataTitle,
    description:
      copy.metadataDescription,
    alternates: {
      canonical,
      languages: {
        ro: getPathname({
          locale: "ro",
          href: "/ghid-medici-personal",
        }),
        en: getPathname({
          locale: "en",
          href: "/ghid-medici-personal",
        }),
        de: getPathname({
          locale: "de",
          href: "/ghid-medici-personal",
        }),
        "x-default": getPathname({
          locale: "ro",
          href: "/ghid-medici-personal",
        }),
      },
    },
    openGraph: {
      type: "article",
      locale: localeOpenGraph(locale),
      siteName: "RomDoc",
      title: copy.metadataTitle,
      description:
        copy.metadataDescription,
      url: `${siteUrl}${canonical}`,
    },
  };
}

export default async function ProfessionalPlatformGuidePage({
  params,
}: Props) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const copy =
    professionalPlatformGuideCopy[locale];

  const clinicOfferHref = getPathname({
    locale,
    href: "/oferta-clinici",
  });

  const contactHref = getPathname({
    locale,
    href: "/contact",
  });

  const loginHref =
    `/login?locale=${locale}`;

  const doctorRegisterHref =
    `/register?locale=${locale}&role=doctor&type=doctor`;

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <header className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              {copy.eyebrow}
            </p>

            <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {copy.title}
            </h1>

            <p className="mt-5 max-w-4xl text-base leading-8 text-gray-700 sm:text-lg">
              {copy.introduction}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={loginHref}
                className="romdoc-button romdoc-button-primary"
              >
                {copy.actions.signIn}
              </Link>

              <Link
                href={doctorRegisterHref}
                className="romdoc-button romdoc-button-secondary"
              >
                {copy.actions.joinDoctor}
              </Link>

              <Link
                href={clinicOfferHref}
                className="romdoc-button romdoc-button-secondary"
              >
                {copy.actions.clinicOffer}
              </Link>
            </div>
          </header>

          <section className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">
              {copy.chooseGuide}
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-700">
              {copy.chooseGuideDescription}
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {copy.audiences.map(
                (audience) => (
                  <Link
                    key={audience.id}
                    href={`#${audience.id}`}
                    className="romdoc-focus-ring group rounded-2xl border border-gray-200 bg-gray-50 p-5 transition hover:border-[#036661]/40 hover:bg-[#036661]/5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.12em] text-[#036661]">
                      {audience.eyebrow}
                    </p>

                    <h3 className="mt-2 text-xl font-bold text-gray-900 group-hover:text-[#036661]">
                      {audience.navigationLabel}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {audience.description}
                    </p>
                  </Link>
                )
              )}
            </div>
          </section>

          <div className="mt-8 space-y-12">
            {copy.audiences.map(
              (audience) => (
                <AudienceGuide
                  key={audience.id}
                  audience={audience}
                  accordionHint={
                    copy.accordionHint
                  }
                />
              )
            )}
          </div>

          <section className="mt-12 rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-bold text-amber-950">
              {copy.importantTitle}
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-7 text-amber-950">
              {copy.importantBody}
            </p>
          </section>

          <section className="mt-8 rounded-3xl border border-[#036661]/20 bg-white p-6 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                {copy.supportTitle}
              </h2>

              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-700">
                {copy.supportBody}
              </p>
            </div>

            <Link
              href={contactHref}
              className="romdoc-button romdoc-button-primary mt-6 shrink-0 sm:mt-0"
            >
              {copy.actions.contact}
            </Link>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
