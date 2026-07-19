import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type Props = {
  consultationPrice: number | null;
  locale: AppLocale;
};

const copy = {
  ro: {
    region: "Acțiune rapidă pentru programare",
    consultation: "Consultație",
    priceFrom: "De la {price} RON",
    feeConfirmed: "Tarif confirmat de clinică",
    linkLabel: "Mergi la formularul de programare",
    book: "Programează-te",
  },
  en: {
    region: "Quick appointment action",
    consultation: "Consultation",
    priceFrom: "From {price} RON",
    feeConfirmed: "Fee confirmed by the clinic",
    linkLabel: "Go to the appointment form",
    book: "Book appointment",
  },
  de: {
    region: "Schnellzugriff auf die Terminbuchung",
    consultation: "Konsultation",
    priceFrom: "Ab {price} RON",
    feeConfirmed: "Preis wird von der Klinik bestätigt",
    linkLabel: "Zum Terminformular",
    book: "Termin buchen",
  },
} as const;

function formatPrice(
  value: number,
  locale: AppLocale
) {
  return new Intl.NumberFormat(
    locale === "ro"
      ? "ro-RO"
      : locale === "de"
        ? "de-DE"
        : "en-GB",
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

export default function DoctorMobileBookingBar({
  consultationPrice,
  locale,
}: Props) {
  const t =
    copy[locale];

  return (
    <div
      role="region"
      aria-label={
        t.region
      }
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-[13px] pt-[8px] shadow-[0_-8px_21px_rgba(15,23,42,0.10)] backdrop-blur-md lg:hidden"
      style={{
        paddingBottom:
          "max(13px, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-[13px]">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500">
            {t.consultation}
          </p>

          <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
            {consultationPrice !== null
              ? t.priceFrom.replace(
                  "{price}",
                  formatPrice(
                    consultationPrice,
                    locale
                  )
                )
              : t.feeConfirmed}
          </p>
        </div>

        <a
          href="#programare"
          className="romdoc-button romdoc-button-primary romdoc-button-sm shrink-0"
          aria-label={
            t.linkLabel
          }
        >
          {t.book}
        </a>
      </div>
    </div>
  );
}
