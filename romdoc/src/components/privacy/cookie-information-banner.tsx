"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import {
  acknowledgeCookieNotice,
  COOKIE_NOTICE_OPEN_EVENT,
  hasAcknowledgedCookieNotice,
} from "@/lib/privacy/cookie-notice-preference";

type CookieInformationBannerProps = {
  locale: "ro" | "en";
};

export default function CookieInformationBanner({
  locale,
}: CookieInformationBannerProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const isEnglish = locale === "en";

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsOpen(
        !hasAcknowledgedCookieNotice()
      );
    }, 0);

    function handleOpenNotice() {
      setIsOpen(true);
    }

    window.addEventListener(
      COOKIE_NOTICE_OPEN_EVENT,
      handleOpenNotice
    );

    return () => {
      window.clearTimeout(timerId);
      window.removeEventListener(
        COOKIE_NOTICE_OPEN_EVENT,
        handleOpenNotice
      );
    };
  }, []);

  function handleAcknowledge() {
    acknowledgeCookieNotice();
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <section
      aria-label={
        isEnglish
          ? "Cookie and privacy information"
          : "Informare privind cookie-urile È™i confidenÈ›ialitatea"
      }
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.16)]"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-5xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950 sm:text-lg">
                {isEnglish
                  ? "Cookies, external services and medical-data privacy"
                  : "Cookie-uri, servicii externe È™i confidenÈ›ialitatea datelor medicale"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                {isEnglish
                  ? "RomDoc uses technologies required for authentication, security and appointment functionality. The platform also integrates Google Maps, an important component for locating clinics and geographic search. When the map loads, your browser connects to Google services, which may process technical information about your device and connection."
                  : "RomDoc utilizeazÄƒ tehnologii necesare pentru autentificare, securitate È™i funcÈ›ionarea programÄƒrilor. Platforma integreazÄƒ È™i Google Maps, o componentÄƒ importantÄƒ pentru localizarea clinicilor È™i cÄƒutarea geograficÄƒ. La Ã®ncÄƒrcarea hÄƒrÈ›ii, browserul dumneavoastrÄƒ se conecteazÄƒ la serviciile Google, care pot prelucra informaÈ›ii tehnice despre dispozitiv È™i conexiune."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#036661]/20 bg-[#F0EEE9] px-4 py-3">
              <p className="text-sm leading-6 text-gray-800">
                {isEnglish
                  ? "A patient's Medical Profile and Medical Folder may contain information entered by doctors who have an authorized medical relationship with that patient. Platform administrators and managers do not have routine access to medical content. Patients may view their information, manage sharing permissions and request account closure under the conditions described in the Privacy Policy."
                  : "Profilul medical È™i Dosarul medical al pacientului pot conÈ›ine informaÈ›ii introduse de medicii care au o relaÈ›ie medicalÄƒ autorizatÄƒ cu pacientul. Administratorii È™i managerii platformei nu au acces obiÈ™nuit la conÈ›inutul medical. Pacientul poate consulta informaÈ›iile, administra permisiunile de partajare È™i poate solicita Ã®nchiderea contului, Ã®n condiÈ›iile descrise Ã®n Politica de confidenÈ›ialitate."}
              </p>
            </div>

            <p className="text-xs leading-5 text-gray-500">
              {isEnglish
                ? "By continuing to use the platform, you confirm that you have read this information. This acknowledgement is not consent to optional advertising or analytics technologies."
                : "Prin continuarea utilizÄƒrii platformei confirmaÈ›i cÄƒ aÈ›i luat la cunoÈ™tinÈ›Äƒ aceste informaÈ›ii. AceastÄƒ confirmare nu reprezintÄƒ consimÈ›ÄƒmÃ¢nt pentru tehnologii opÈ›ionale de publicitate sau analizÄƒ."}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-stretch">
            <button
              type="button"
              onClick={handleAcknowledge}
              className="romdoc-focus-ring rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#ff2800]"
            >
              {isEnglish
                ? "I understand"
                : "Am Ã®nÈ›eles"}
            </button>

            <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href="/cookies"
                className="romdoc-focus-ring rounded-sm font-medium text-[#036661] underline decoration-[#036661]/30 underline-offset-4 hover:text-[#ff2800]"
              >
                {isEnglish
                  ? "Cookie policy"
                  : "Politica privind cookie-urile"}
              </Link>

              <Link
                href="/confidentialitate"
                className="romdoc-focus-ring rounded-sm font-medium text-[#036661] underline decoration-[#036661]/30 underline-offset-4 hover:text-[#ff2800]"
              >
                {isEnglish
                  ? "Privacy policy"
                  : "Politica de confidenÈ›ialitate"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

