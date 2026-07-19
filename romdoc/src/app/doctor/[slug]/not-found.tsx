import {
  getLocale,
} from "next-intl/server";

import PublicFallbackState from "@/components/public/public-fallback-state";

const copy = {
  ro: {
    eyebrow:
      "Profil medic",
    title:
      "Acest profil nu este disponibil",
    description:
      "Medicul nu a fost găsit sau profilul nu mai este public.",
    details:
      "Poți reveni la director pentru a găsi un alt medic după specialitate și oraș.",
    directory:
      "Caută alt medic",
    home:
      "Pagina principală",
  },
  en: {
    eyebrow:
      "Doctor profile",
    title:
      "This profile is unavailable",
    description:
      "The doctor was not found or the profile is no longer public.",
    details:
      "Return to the directory to find another doctor by specialty and city.",
    directory:
      "Find another doctor",
    home:
      "Homepage",
  },
  de: {
    eyebrow:
      "Arztprofil",
    title:
      "Dieses Profil ist nicht verfügbar",
    description:
      "Der Arzt wurde nicht gefunden oder das Profil ist nicht mehr öffentlich.",
    details:
      "Im Verzeichnis können Sie einen anderen Arzt nach Fachrichtung und Stadt finden.",
    directory:
      "Anderen Arzt finden",
    home:
      "Startseite",
  },
} as const;

export default async function DoctorProfileNotFound() {
  const locale =
    (await getLocale()) as
      | "ro"
      | "en"
      | "de";

  const t =
    copy[locale] ??
    copy.ro;

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
        tone="warning"
        icon="?"
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
