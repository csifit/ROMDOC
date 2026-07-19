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
      "Director medical",
    title:
      "Lista medicilor nu a putut fi încărcată",
    description:
      "A apărut o problemă temporară la încărcarea medicilor și clinicilor.",
    details:
      "Poți încerca din nou. Filtrele din adresă vor rămâne păstrate.",
    retry:
      "Încearcă din nou",
    home:
      "Pagina principală",
  },
  en: {
    eyebrow:
      "Medical directory",
    title:
      "The doctor directory could not be loaded",
    description:
      "A temporary problem occurred while loading doctors and clinics.",
    details:
      "Try again. Filters in the address will remain preserved.",
    retry:
      "Try again",
    home:
      "Homepage",
  },
  de: {
    eyebrow:
      "Ärzteverzeichnis",
    title:
      "Das Ärzteverzeichnis konnte nicht geladen werden",
    description:
      "Beim Laden der Ärzte und Kliniken ist vorübergehend ein Problem aufgetreten.",
    details:
      "Versuchen Sie es erneut. Die Filter in der Adresse bleiben erhalten.",
    retry:
      "Erneut versuchen",
    home:
      "Startseite",
  },
} as const;

export default function DoctorsDirectoryError({
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
      "Public doctor directory failed:",
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
            href: "/",
            label:
              t.home,
          },
        ]}
      />
    </main>
  );
}
