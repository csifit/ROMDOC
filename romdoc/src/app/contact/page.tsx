import type { Metadata } from "next";
import NextLink from "next/link";
import { getLocale } from "next-intl/server";

import PublicLayout from "@/components/public/public-layout";
import {
  Link as LocalizedLink,
} from "@/i18n/navigation";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  publicSupportCopy,
} from "@/lib/i18n/public-support";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeAppLocale(
    await getLocale()
  );
  const copy =
    publicSupportCopy[locale].contact;

  return {
    title: copy.metadataTitle,
    description:
      copy.metadataDescription,
  };
}

export default async function ContactPage() {
  const locale = normalizeAppLocale(
    await getLocale()
  );
  const copy =
    publicSupportCopy[locale].contact;

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {copy.title}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
              {copy.introduction}
            </p>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
              {copy.medicalWarning}
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {copy.options.map(
                (option) => {
                  const supportHref =
                    `/support?locale=${locale}&type=${option.requesterType}&category=${option.category}`;

                  return (
                    <article
                      key={option.id}
                      id={option.id}
                      className="scroll-mt-28 rounded-2xl border border-gray-200 bg-gray-50 p-6"
                    >
                      <h2 className="text-xl font-bold text-gray-900">
                        {option.title}
                      </h2>

                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        {option.description}
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <NextLink
                          href={supportHref}
                          className="romdoc-button romdoc-button-primary romdoc-button-sm"
                        >
                          {option.buttonLabel}
                        </NextLink>

                        <a
                          href={`mailto:${option.email}`}
                          className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                        >
                          {option.email}
                        </a>
                      </div>
                    </article>
                  );
                }
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <LocalizedLink
                href="/confidentialitate"
                className="romdoc-button romdoc-button-secondary"
              >
                {copy.privacyLabel}
              </LocalizedLink>

              <LocalizedLink
                href="/termeni-si-conditii"
                className="romdoc-button romdoc-button-secondary"
              >
                {copy.termsLabel}
              </LocalizedLink>
            </div>
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
