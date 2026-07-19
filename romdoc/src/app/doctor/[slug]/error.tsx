"use client";

import {
  useLocale,
} from "next-intl";
import {
  useEffect,
} from "react";

import PublicFallbackState from "@/components/public/public-fallback-state";

type Props = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

const copy = {
  ro: {
    eyebrow:
      "Profil medic",
    title:
      "Profilul nu a putut fi încărcat",
    description:
      "A apărut o problemă temporară la încărcarea informațiilor medicului.",
    details:
      "Încearcă din nou sau revino la directorul medicilor.",
    retry:
      "Încearcă din nou",
    directory:
      "Vezi toți medicii",
    home:
      "Pagina principală",
  },
  en: {
    eyebrow:
      "Doctor profile",
    title:
      "The profile could not be loaded",
    description:
      "A temporary problem occurred while loading the doctor's information.",
    details:
      "Try again or return to the doctor directory.",
    retry:
      "Try again",
    directory:
      "View all doctors",
    home:
      "Homepage",
  },
  de: {
    eyebrow:
      "Arztprofil",
    title:
      "Das Profil konnte nicht geladen werden",
    description:
      "Beim Laden der Arztinformationen ist vorübergehend ein Problem aufgetreten.",
    details:
      "Versuchen Sie es erneut oder kehren Sie zum Ärzteverzeichnis zurück.",
    retry:
      "Erneut versuchen",
    directory:
      "Alle Ärzte anzeigen",
    home:
      "Startseite",
  },
} as const;

export default function DoctorProfileError({
  error,
  reset,
}: Props) {
  const locale =
    useLocale() as
      | "ro"
      | "en"
      | "de";

  const t =
    copy[locale] ??
    copy.ro;

  useEffect(() => {
    console.error(
      "Public doctor profile failed:",
      error
    );
  }, [error]);

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[21px] py-[55px]">
      <PublicFallbackState
        eyebrow={
          t.eyebrow
        }
        title={
          t.title
        }
        description={
          t.description
        }
        details={
          t.details
        }
        tone="error"
        icon="!"
        onRetry={
          reset
        }
        retryLabel={
          t.retry
        }
        actions={[
          {
            href:
              "/medici",
            label:
              t.directory,
            primary:
              true,
          },
          {
            href: "/",
            label:
              t.home,
          },
        ]}
      />
    </main>
  );
}
