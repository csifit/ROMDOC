import type { Metadata } from "next";
import Link from "next/link";

import PublicLayout from "@/components/public/public-layout";
import SupportTicketForm from "@/components/support/support-ticket-form";
import {
  getPathname,
} from "@/i18n/navigation";
import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  publicSupportCopy,
  type SupportCategory,
  type SupportRequesterType,
} from "@/lib/i18n/public-support";

type SupportPageProps = {
  searchParams?: Promise<{
    type?: string;
    category?: string;
    locale?: string;
  }>;
};

const REQUESTER_TYPES = new Set([
  "patient",
  "doctor",
  "clinic",
  "visitor",
]);

const CATEGORIES = new Set([
  "patient_support",
  "doctor_support",
  "profile_correction",
  "booking_problem",
  "privacy_request",
  "technical_problem",
  "other",
]);

function getRequesterType(
  value: string | undefined
): SupportRequesterType {
  return REQUESTER_TYPES.has(
    value ?? ""
  )
    ? (value as SupportRequesterType)
    : "patient";
}

function getCategory(
  value: string | undefined
): SupportCategory {
  return CATEGORIES.has(
    value ?? ""
  )
    ? (value as SupportCategory)
    : "patient_support";
}

export async function generateMetadata({
  searchParams,
}: SupportPageProps): Promise<Metadata> {
  const parameters = searchParams
    ? await searchParams
    : {};
  const locale = normalizeAppLocale(
    parameters.locale
  );
  const copy =
    publicSupportCopy[locale]
      .supportPage;

  return {
    title: copy.metadataTitle,
    description:
      copy.metadataDescription,
  };
}

export default async function SupportPage({
  searchParams,
}: SupportPageProps) {
  const parameters = searchParams
    ? await searchParams
    : {};
  const locale = normalizeAppLocale(
    parameters.locale
  );
  const copy =
    publicSupportCopy[locale];

  const initialRequesterType =
    getRequesterType(
      parameters.type
    );
  const initialCategory =
    getCategory(
      parameters.category
    );

  const contactHref = getPathname({
    locale,
    href: "/contact",
  });
  const privacyHref = getPathname({
    locale,
    href: "/confidentialitate",
  });

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              {copy.supportPage.eyebrow}
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {copy.supportPage.title}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
              {copy.supportPage.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={contactHref}
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {
                  copy.supportPage
                    .backToContact
                }
              </Link>

              <Link
                href={privacyHref}
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                {
                  copy.supportPage
                    .privacyLabel
                }
              </Link>
            </div>
          </header>

          <SupportTicketForm
            initialRequesterType={
              initialRequesterType
            }
            initialCategory={
              initialCategory
            }
            copy={copy.form}
          />
        </div>
      </main>
    </PublicLayout>
  );
}
