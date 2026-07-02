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
    setIsOpen(
      !hasAcknowledgedCookieNotice()
    );

    function handleOpenNotice() {
      setIsOpen(true);
    }

    window.addEventListener(
      COOKIE_NOTICE_OPEN_EVENT,
      handleOpenNotice
    );

    return () => {
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
          : "Informare privind cookie-urile și confidențialitatea"
      }
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-gray-200 bg-white/98 shadow-[0_-12px_40px_rgba(15,23,42,0.16)] backdrop-blur"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-5xl space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-950 sm:text-lg">
                {isEnglish
                  ? "Cookies, external services and medical-data privacy"
                  : "Cookie-uri, servicii externe și confidențialitatea datelor medicale"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-gray-700">
                {isEnglish
                  ? "RomDoc uses technologies required for authentication, security and appointment functionality. The platform also integrates Google Maps, an important component for locating clinics and geographic search. When the map loads, your browser connects to Google services, which may process technical information about your device and connection."
                  : "RomDoc utilizează tehnologii necesare pentru autentificare, securitate și funcționarea programărilor. Platforma integrează și Google Maps, o componentă importantă pentru localizarea clinicilor și căutarea geografică. La încărcarea hărții, browserul dumneavoastră se conectează la serviciile Google, care pot prelucra informații tehnice despre dispozitiv și conexiune."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#036661]/20 bg-[#F0EEE9] px-4 py-3">
              <p className="text-sm leading-6 text-gray-800">
                {isEnglish
                  ? "A patient's Medical Profile and Medical Folder may contain information entered by doctors who have an authorized medical relationship with that patient. Platform administrators and managers do not have routine access to medical content. Patients may view their information, manage sharing permissions and request account closure under the conditions described in the Privacy Policy."
                  : "Profilul medical și Dosarul medical al pacientului pot conține informații introduse de medicii care au o relație medicală autorizată cu pacientul. Administratorii și managerii platformei nu au acces obișnuit la conținutul medical. Pacientul poate consulta informațiile, administra permisiunile de partajare și poate solicita închiderea contului, în condițiile descrise în Politica de confidențialitate."}
              </p>
            </div>

            <p className="text-xs leading-5 text-gray-500">
              {isEnglish
                ? "By continuing to use the platform, you confirm that you have read this information. This acknowledgement is not consent to optional advertising or analytics technologies."
                : "Prin continuarea utilizării platformei confirmați că ați luat la cunoștință aceste informații. Această confirmare nu reprezintă consimțământ pentru tehnologii opționale de publicitate sau analiză."}
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
                : "Am înțeles"}
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
                  : "Politica de confidențialitate"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
