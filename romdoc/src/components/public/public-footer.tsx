import Link from "@/components/public/localized-public-link";
import {
  getLocale,
} from "next-intl/server";

import CookieInformationLink from "@/components/privacy/cookie-information-link";
import {
  type AppLocale,
} from "@/i18n/routing";

type FooterLink = {
  href: string;
  label: string;
};

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-gray-900">
        {title}
      </h2>

      <ul className="mt-4 space-y-3">
        {links.map(
          (link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="romdoc-focus-ring rounded-sm text-sm text-gray-600 transition hover:text-[#036661]"
              >
                {link.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

export default async function PublicFooter() {
  const locale =
    (await getLocale()) as AppLocale;

  const isEnglish =
    locale === "en";

  const homeHref =
    isEnglish ? "/en" : "/ro";

  const platformLinks:
    FooterLink[] = [
      {
        href: homeHref,
        label: isEnglish
          ? "Home"
          : "AcasÄƒ",
      },
      {
        href: isEnglish
          ? "/en/doctors"
          : "/ro/medici",
        label: isEnglish
          ? "Doctors"
          : "Medici",
      },
      {
        href: isEnglish
          ? "/en/specialties"
          : "/ro/specialitati",
        label: isEnglish
          ? "Specialties"
          : "SpecializÄƒri",
      },
      {
        href: isEnglish
          ? "/en/patient-guide"
          : "/ro/ghid-pacienti",
        label: isEnglish
          ? "Patient guide"
          : "Ghid pentru pacienÈ›i",
      },
      {
        href: "/register",
        label: isEnglish
          ? "Create account"
          : "CreeazÄƒ cont",
      },
      {
        href: "/login",
        label: isEnglish
          ? "Sign in"
          : "Autentificare",
      },
    ];

  const doctorLinks:
    FooterLink[] = [
      {
        href:
          "/register?role=doctor",
        label: isEnglish
          ? "Join as a doctor"
          : "ÃŽnscrie-te ca medic",
      },
      {
        href:
          "/oferta-clinici",
        label: isEnglish
          ? "Clinic offer"
          : "OfertÄƒ pentru clinici",
   },
      {
        href: isEnglish
          ? "/en/doctor-staff-guide"
          : "/ro/ghid-medici-personal",
        label: isEnglish
          ? "Guide for doctors and staff"
          : "Ghid pentru medici È™i personal",
      },
      {
        href: isEnglish
          ? "/en/doctor-staff-guide#abonament"
          : "/ro/ghid-medici-personal#abonament",
        label: isEnglish
          ? "Doctor subscription"
          : "Abonament medic",
      },
      {
        href: "/login",
        label: isEnglish
          ? "Doctor sign in"
          : "Autentificare medic",
      },
      {
        href:
          "/informatii-legale#verificare-profesionala",
        label: isEnglish
          ? "Professional verification"
          : "Verificare profesionalÄƒ",
      },
    ];

  const legalLinks:
    FooterLink[] = [
      {
        href:
          "/termeni-si-conditii",
        label: isEnglish
          ? "Terms and conditions"
          : "Termeni È™i condiÈ›ii",
      },
      {
        href:
          "/confidentialitate",
        label: isEnglish
          ? "Privacy policy"
          : "Politica de confidenÈ›ialitate",
      },
      {
        href: "/cookies",
        label: isEnglish
          ? "Cookie policy"
          : "Politica de cookies",
      },
      {
        href:
          "/informatii-legale",
        label: isEnglish
          ? "Legal information"
          : "InformaÈ›ii legale",
      },
    ];

  const supportLinks:
    FooterLink[] = [
      {
        href: "/contact",
        label: "Contact",
      },
      {
        href:
          "/contact#suport",
        label: isEnglish
          ? "Support"
          : "Suport",
      },
      {
        href:
          "/contact#raporteaza-problema",
        label: isEnglish
          ? "Report a problem"
          : "RaporteazÄƒ o problemÄƒ",
      },
    ];

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <Link
              href={homeHref}
              className="romdoc-focus-ring inline-flex rounded-sm text-2xl font-bold tracking-tight text-[#036661]"
            >
              RomDoc
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">
              {isEnglish
                ? "Multilingual platform for finding doctors, clinics and medical appointments in Romania."
                : "PlatformÄƒ pentru descoperirea medicilor, clinicilor È™i gestionarea programÄƒrilor medicale Ã®n RomÃ¢nia."}
            </p>

            <p className="mt-4 max-w-sm text-xs leading-5 text-gray-500">
              {isEnglish
                ? "RomDoc supports medical discovery and appointment requests. Published information does not replace medical consultation, diagnosis or treatment."
                : "RomDoc faciliteazÄƒ cÄƒutarea È™i programarea. InformaÈ›iile publicate nu Ã®nlocuiesc consultaÈ›ia, diagnosticul sau tratamentul medical."}
            </p>
          </div>

          <FooterColumn
            title={
              isEnglish
                ? "Platform"
                : "PlatformÄƒ"
            }
            links={
              platformLinks
            }
          />

          <FooterColumn
            title={
              isEnglish
                ? "For doctors"
                : "Pentru medici"
            }
            links={doctorLinks}
          />

          <div>
            <FooterColumn
              title="Legal"
              links={legalLinks}
            />

            <div className="mt-3">
              <CookieInformationLink
                label={
                  isEnglish
                    ? "Cookie and privacy information"
                    : "Informare cookie È™i confidenÈ›ialitate"
                }
              />
            </div>
          </div>

          <FooterColumn
            title="Contact"
            links={supportLinks}
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Â© 2026 RomDoc.{" "}
            {isEnglish
              ? "All rights reserved."
              : "Toate drepturile rezervate."}
          </p>

          <p>
            {isEnglish
              ? "Digital service for facilitating medical appointments."
              : "Serviciu digital de intermediere a programÄƒrilor medicale."}
          </p>
        </div>
      </div>
    </footer>
  );
}

