import Link from "next/link";
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
          : "Acasă",
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
          : "Specializări",
      },
      {
        href: isEnglish
          ? "/en/patient-guide"
          : "/ro/ghid-pacienti",
        label: isEnglish
          ? "Patient guide"
          : "Ghid pentru pacienți",
      },
      {
        href: "/register",
        label: isEnglish
          ? "Create account"
          : "Creează cont",
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
          : "Înscrie-te ca medic",
      },
      {
        href: isEnglish
          ? "/en/doctor-staff-guide"
          : "/ro/ghid-medici-personal",
        label: isEnglish
          ? "Guide for doctors and staff"
          : "Ghid pentru medici și personal",
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
          : "Verificare profesională",
      },
    ];

  const legalLinks:
    FooterLink[] = [
      {
        href:
          "/termeni-si-conditii",
        label: isEnglish
          ? "Terms and conditions"
          : "Termeni și condiții",
      },
      {
        href:
          "/confidentialitate",
        label: isEnglish
          ? "Privacy policy"
          : "Politica de confidențialitate",
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
          : "Informații legale",
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
          : "Raportează o problemă",
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
                : "Platformă pentru descoperirea medicilor, clinicilor și gestionarea programărilor medicale în România."}
            </p>

            <p className="mt-4 max-w-sm text-xs leading-5 text-gray-500">
              {isEnglish
                ? "RomDoc supports medical discovery and appointment requests. Published information does not replace medical consultation, diagnosis or treatment."
                : "RomDoc facilitează căutarea și programarea. Informațiile publicate nu înlocuiesc consultația, diagnosticul sau tratamentul medical."}
            </p>
          </div>

          <FooterColumn
            title={
              isEnglish
                ? "Platform"
                : "Platformă"
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
                    : "Informare cookie și confidențialitate"
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
            © 2026 RomDoc.{" "}
            {isEnglish
              ? "All rights reserved."
              : "Toate drepturile rezervate."}
          </p>

          <p>
            {isEnglish
              ? "Digital service for facilitating medical appointments."
              : "Serviciu digital de intermediere a programărilor medicale."}
          </p>
        </div>
      </div>
    </footer>
  );
}
