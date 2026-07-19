"use client";

import {
  usePathname,
} from "next/navigation";

import PublicFallbackState from "@/components/public/public-fallback-state";

type Locale =
  | "ro"
  | "en"
  | "de";

const copy = {
  ro: {
    doctor: {
      eyebrow:
        "Profil medic",
      title:
        "Acest profil nu este disponibil",
      description:
        "Medicul nu a fost găsit sau profilul nu mai este public.",
      details:
        "Poți reveni la director pentru a găsi un alt medic după specialitate și oraș.",
      primary:
        "Caută alt medic",
    },
    general: {
      eyebrow:
        "RomDoc",
      title:
        "Pagina nu a fost găsită",
      description:
        "Adresa accesată nu există sau pagina a fost mutată.",
      details:
        "Poți reveni la pagina principală sau poți deschide directorul medicilor.",
      primary:
        "Vezi medicii",
    },
    home:
      "Pagina principală",
  },
  en: {
    doctor: {
      eyebrow:
        "Doctor profile",
      title:
        "This profile is unavailable",
      description:
        "The doctor was not found or the profile is no longer public.",
      details:
        "Return to the directory to find another doctor by specialty and city.",
      primary:
        "Find another doctor",
    },
    general: {
      eyebrow:
        "RomDoc",
      title:
        "Page not found",
      description:
        "The requested address does not exist or the page has been moved.",
      details:
        "Return to the homepage or open the doctor directory.",
      primary:
        "View doctors",
    },
    home:
      "Homepage",
  },
  de: {
    doctor: {
      eyebrow:
        "Arztprofil",
      title:
        "Dieses Profil ist nicht verfügbar",
      description:
        "Der Arzt wurde nicht gefunden oder das Profil ist nicht mehr öffentlich.",
      details:
        "Im Verzeichnis können Sie einen anderen Arzt nach Fachrichtung und Stadt finden.",
      primary:
        "Anderen Arzt finden",
    },
    general: {
      eyebrow:
        "RomDoc",
      title:
        "Seite nicht gefunden",
      description:
        "Die aufgerufene Adresse existiert nicht oder die Seite wurde verschoben.",
      details:
        "Kehren Sie zur Startseite zurück oder öffnen Sie das Ärzteverzeichnis.",
      primary:
        "Ärzte anzeigen",
    },
    home:
      "Startseite",
  },
} as const;

function getLocaleFromPathname(
  pathname: string
): Locale {
  const segment =
    pathname
      .split("/")
      .filter(Boolean)[0];

  if (
    segment === "en" ||
    segment === "de"
  ) {
    return segment;
  }

  return "ro";
}

function isDoctorProfilePath(
  pathname: string
) {
  return (
    /^\/(?:ro|en)\/doctor\/[^/]+\/?$/.test(
      pathname
    ) ||
    /^\/de\/arzt\/[^/]+\/?$/.test(
      pathname
    ) ||
    /^\/doctor\/[^/]+\/?$/.test(
      pathname
    ) ||
    /^\/arzt\/[^/]+\/?$/.test(
      pathname
    )
  );
}

function directoryHref(
  locale: Locale
) {
  if (
    locale === "en"
  ) {
    return "/en/doctors";
  }

  if (
    locale === "de"
  ) {
    return "/de/aerzte";
  }

  return "/ro/medici";
}

function homeHref(
  locale: Locale
) {
  return `/${locale}`;
}

export default function GlobalNotFound() {
  const pathname =
    usePathname();

  const locale =
    getLocaleFromPathname(
      pathname
    );

  const t =
    copy[locale];

  const doctorPath =
    isDoctorProfilePath(
      pathname
    );

  const selectedCopy =
    doctorPath
      ? t.doctor
      : t.general;

  return (
    <main className="min-h-screen bg-[#F0EEE9] px-[21px] py-[55px]">
      <PublicFallbackState
        eyebrow={
          selectedCopy.eyebrow
        }
        title={
          selectedCopy.title
        }
        description={
          selectedCopy.description
        }
        details={
          selectedCopy.details
        }
        tone={
          doctorPath
            ? "warning"
            : "neutral"
        }
        icon={
          doctorPath
            ? "?"
            : "404"
        }
        actions={[
          {
            href:
              directoryHref(
                locale
              ),
            label:
              selectedCopy.primary,
            primary:
              true,
          },
          {
            href:
              homeHref(
                locale
              ),
            label:
              t.home,
          },
        ]}
      />
    </main>
  );
}
