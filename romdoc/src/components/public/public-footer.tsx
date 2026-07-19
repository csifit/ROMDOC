import NextLink from "next/link";
import {
  getLocale,
} from "next-intl/server";

import CookieInformationLink from "@/components/privacy/cookie-information-link";
import RecentlyViewedDoctorsPanel from "@/components/public/recently-viewed-doctors-panel";
import {
  recentlyViewedFooterCopy,
} from "@/components/public/recently-viewed-footer-copy";
import {
  getPathname,
} from "@/i18n/navigation";
import {
  type AppLocale,
} from "@/i18n/routing";

type PublicFooterProps = {
  locale?: AppLocale;
};

type FooterLink = {
  href: string;
  label: string;
};

type FooterCopy = {
  home: string;
  doctors: string;
  specialties: string;
  patientGuide: string;
  createAccount: string;
  signIn: string;
  joinAsDoctor: string;
  clinicOffer: string;
  doctorStaffGuide: string;
  doctorSubscription: string;
  doctorSignIn: string;
  professionalVerification: string;
  terms: string;
  privacy: string;
  cookies: string;
  legalInformation: string;
  support: string;
  reportProblem: string;
  platform: string;
  forDoctors: string;
  cookieInformation: string;
  description: string;
  disclaimer: string;
  rights: string;
  serviceDescription: string;
};

const footerCopy: Record<
  AppLocale,
  FooterCopy
> = {
  ro: {
    home: "Acasă",
    doctors: "Medici",
    specialties: "Specializări",
    patientGuide: "Ghid pentru pacienți",
    createAccount: "Creează cont",
    signIn: "Autentificare",
    joinAsDoctor: "Înscrie-te ca medic",
    clinicOffer: "Ofertă pentru clinici",
    doctorStaffGuide: "Ghid pentru medici și personal",
    doctorSubscription: "Abonament medic",
    doctorSignIn: "Autentificare medic",
    professionalVerification: "Verificare profesională",
    terms: "Termeni și condiții",
    privacy: "Politica de confidențialitate",
    cookies: "Politica de cookies",
    legalInformation: "Informații legale",
    support: "Suport",
    reportProblem: "Raportează o problemă",
    platform: "Platformă",
    forDoctors: "Pentru medici",
    cookieInformation: "Informare cookie și confidențialitate",
    description: "Platformă pentru descoperirea medicilor, clinicilor și gestionarea programărilor medicale în România.",
    disclaimer: "RomDoc facilitează căutarea și programarea. Informațiile publicate nu înlocuiesc consultația, diagnosticul sau tratamentul medical.",
    rights: "Toate drepturile rezervate.",
    serviceDescription: "Serviciu digital de intermediere a programărilor medicale.",
  },
  en: {
    home: "Home",
    doctors: "Doctors",
    specialties: "Specialties",
    patientGuide: "Patient guide",
    createAccount: "Create account",
    signIn: "Sign in",
    joinAsDoctor: "Join as a doctor",
    clinicOffer: "Clinic offer",
    doctorStaffGuide: "Guide for doctors and staff",
    doctorSubscription: "Doctor subscription",
    doctorSignIn: "Doctor sign in",
    professionalVerification: "Professional verification",
    terms: "Terms and conditions",
    privacy: "Privacy policy",
    cookies: "Cookie policy",
    legalInformation: "Legal information",
    support: "Support",
    reportProblem: "Report a problem",
    platform: "Platform",
    forDoctors: "For doctors",
    cookieInformation: "Cookie and privacy information",
    description: "Multilingual platform for finding doctors, clinics and medical appointments in Romania.",
    disclaimer: "RomDoc supports medical discovery and appointment requests. Published information does not replace medical consultation, diagnosis or treatment.",
    rights: "All rights reserved.",
    serviceDescription: "Digital service for facilitating medical appointments.",
  },
  de: {
    home: "Startseite",
    doctors: "Ärzte",
    specialties: "Fachrichtungen",
    patientGuide: "Ratgeber für Patienten",
    createAccount: "Konto erstellen",
    signIn: "Anmelden",
    joinAsDoctor: "Als Arzt registrieren",
    clinicOffer: "Angebot für Kliniken",
    doctorStaffGuide: "Ratgeber für Ärzte und Personal",
    doctorSubscription: "Arzt-Abonnement",
    doctorSignIn: "Arzt-Anmeldung",
    professionalVerification: "Berufliche Verifizierung",
    terms: "Allgemeine Geschäftsbedingungen",
    privacy: "Datenschutzerklärung",
    cookies: "Cookie-Richtlinie",
    legalInformation: "Rechtliche Informationen",
    support: "Support",
    reportProblem: "Problem melden",
    platform: "Plattform",
    forDoctors: "Für Ärzte",
    cookieInformation: "Cookie- und Datenschutzinformationen",
    description: "Mehrsprachige Plattform zur Suche nach Ärzten, Kliniken und medizinischen Terminen in Rumänien.",
    disclaimer: "RomDoc unterstützt die Arztsuche und Terminanfragen. Veröffentlichte Informationen ersetzen keine medizinische Beratung, Diagnose oder Behandlung.",
    rights: "Alle Rechte vorbehalten.",
    serviceDescription: "Digitaler Dienst zur Vermittlung medizinischer Termine.",
  },
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
              <NextLink
                href={link.href}
                className="romdoc-focus-ring rounded-sm text-sm text-gray-600 transition hover:text-[#036661]"
              >
                {link.label}
              </NextLink>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

export default async function PublicFooter({
  locale: localeProp,
}: PublicFooterProps = {}) {
  const locale =
    localeProp ??
    ((await getLocale()) as AppLocale);

  const copy =
    footerCopy[locale];

  const recentlyViewedCopy =
    recentlyViewedFooterCopy[
      locale
    ];

  const homeHref =
    getPathname({
      locale,
      href: "/",
    });

  const doctorsHref =
    getPathname({
      locale,
      href: "/medici",
    });

  const specialtiesHref =
    getPathname({
      locale,
      href: "/specialitati",
    });

  const patientGuideHref =
    getPathname({
      locale,
      href: "/ghid-pacienti",
    });

  const doctorStaffGuideHref =
    getPathname({
      locale,
      href:
        "/ghid-medici-personal",
    });

  const clinicOfferHref =
    getPathname({
      locale,
      href: "/oferta-clinici",
    });

  const legalInformationHref =
    getPathname({
      locale,
      href: "/informatii-legale",
    });

  const termsHref =
    getPathname({
      locale,
      href: "/termeni-si-conditii",
    });

  const privacyHref =
    getPathname({
      locale,
      href: "/confidentialitate",
    });

  const cookiesHref =
    getPathname({
      locale,
      href: "/cookies",
    });

  const contactHref =
    getPathname({
      locale,
      href: "/contact",
    });

  const loginHref =
    `/login?locale=${locale}`;

  const registerHref =
    `/register?locale=${locale}`;

  const doctorRegisterHref =
    `/register?locale=${locale}&role=doctor&type=doctor`;

  const platformLinks:
    FooterLink[] = [
      {
        href: homeHref,
        label: copy.home,
      },
      {
        href: doctorsHref,
        label: copy.doctors,
      },
      {
        href: specialtiesHref,
        label:
          copy.specialties,
      },
      {
        href: patientGuideHref,
        label:
          copy.patientGuide,
      },
      {
        href: registerHref,
        label:
          copy.createAccount,
      },
      {
        href: loginHref,
        label: copy.signIn,
      },
    ];

  const doctorLinks:
    FooterLink[] = [
      {
        href:
          doctorRegisterHref,
        label:
          copy.joinAsDoctor,
      },
      {
        href: clinicOfferHref,
        label:
          copy.clinicOffer,
      },
      {
        href:
          doctorStaffGuideHref,
        label:
          copy.doctorStaffGuide,
      },
      {
        href:
          `${doctorStaffGuideHref}#abonament`,
        label:
          copy.doctorSubscription,
      },
      {
        href: loginHref,
        label:
          copy.doctorSignIn,
      },
      {
        href:
          `${legalInformationHref}#verificare-profesionala`,
        label:
          copy.professionalVerification,
      },
    ];

  const legalLinks:
    FooterLink[] = [
      {
        href: termsHref,
        label: copy.terms,
      },
      {
        href: privacyHref,
        label: copy.privacy,
      },
      {
        href: cookiesHref,
        label: copy.cookies,
      },
      {
        href:
          legalInformationHref,
        label:
          copy.legalInformation,
      },
    ];

  const supportLinks:
    FooterLink[] = [
      {
        href: contactHref,
        label: "Contact",
      },
      {
        href:
          `${contactHref}#suport-pacienti`,
        label: copy.support,
      },
      {
        href:
          `${contactHref}#probleme-tehnice`,
        label:
          copy.reportProblem,
      },
    ];

  return (
    <footer className="relative min-h-[430px] overflow-hidden border-t border-gray-200 bg-white">
      <RecentlyViewedDoctorsPanel
        doctorsHref={
          doctorsHref
        }
        copy={
          recentlyViewedCopy
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <NextLink
              href={homeHref}
              className="romdoc-focus-ring inline-flex rounded-sm text-2xl font-bold tracking-tight text-[#036661]"
            >
              RomDoc
            </NextLink>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-600">
              {copy.description}
            </p>

            <p className="mt-4 max-w-sm text-xs leading-5 text-gray-500">
              {copy.disclaimer}
            </p>
          </div>

          <FooterColumn
            title={
              copy.platform
            }
            links={
              platformLinks
            }
          />

          <FooterColumn
            title={
              copy.forDoctors
            }
            links={
              doctorLinks
            }
          />

          <div>
            <FooterColumn
              title="Legal"
              links={
                legalLinks
              }
            />

            <div className="mt-3">
              <CookieInformationLink
                label={
                  copy.cookieInformation
                }
              />
            </div>
          </div>

          <FooterColumn
            title="Contact"
            links={
              supportLinks
            }
          />
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-gray-200 pt-6 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © 2026 RomDoc.{" "}
            {copy.rights}
          </p>

          <p>
            {
              copy.serviceDescription
            }
          </p>
        </div>
      </div>
    </footer>
  );
}
