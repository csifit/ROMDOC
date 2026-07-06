import type { Metadata } from "next";
import Link from "next/link";

import PublicLayout from "@/components/public/public-layout";
import SupportTicketForm from "@/components/support/support-ticket-form";

type SupportRequesterType =
  | "patient"
  | "doctor"
  | "clinic"
  | "visitor";

type SupportCategory =
  | "patient_support"
  | "doctor_support"
  | "profile_correction"
  | "booking_problem"
  | "privacy_request"
  | "technical_problem"
  | "other";

type SupportPageProps = {
  searchParams?: Promise<{
    type?: string;
    category?: string;
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

export const metadata: Metadata = {
  title: "Suport RomDoc",
  description:
    "Trimite o solicitare de suport pentru cont, profil, programări, probleme tehnice sau confidențialitate.",
};

function getRequesterType(
  value: string | undefined
): SupportRequesterType {
  return REQUESTER_TYPES.has(value ?? "")
    ? (value as SupportRequesterType)
    : "patient";
}

function getCategory(
  value: string | undefined
): SupportCategory {
  return CATEGORIES.has(value ?? "")
    ? (value as SupportCategory)
    : "patient_support";
}

export default async function SupportPage({
  searchParams,
}: SupportPageProps) {
  const resolvedSearchParams =
    searchParams ? await searchParams : {};

  const initialRequesterType = getRequesterType(
    resolvedSearchParams.type
  );

  const initialCategory = getCategory(
    resolvedSearchParams.category
  );

  return (
    <PublicLayout>
      <main className="min-h-screen bg-[#F0EEE9] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#036661]">
              Suport platformă
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Contactează echipa RomDoc
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-7 text-gray-600">
              Acest formular este pentru folosirea platformei RomDoc:
              conturi, profiluri publice, programări, probleme tehnice și
              solicitări de confidențialitate. Nu este un canal pentru sfaturi
              medicale.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                Înapoi la Contact
              </Link>

              <Link
                href="/confidentialitate"
                className="romdoc-button romdoc-button-secondary romdoc-button-sm"
              >
                Politica de confidențialitate
              </Link>
            </div>
          </header>

          <SupportTicketForm
            initialRequesterType={initialRequesterType}
            initialCategory={initialCategory}
          />
        </div>
      </main>
    </PublicLayout>
  );
}
