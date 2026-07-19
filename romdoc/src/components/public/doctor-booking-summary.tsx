import type {
  AppLocale,
} from "@/lib/i18n/app-locale";

type NextAvailableSlot = {
  date: string;
  time: string;
} | null;

type Props = {
  clinicName: string | null;
  clinicAddress: string | null;
  consultationPrice: number | null;
  nextAvailableSlot: NextAvailableSlot;
  locale: AppLocale;
};

const copy = {
  ro: {
    eyebrow: "Programare online",
    title: "Detalii pentru programare",
    description: "Verifică informațiile principale, apoi completează formularul de programare.",
    clinic: "Clinica",
    selectClinic: "Selectează clinica în formular",
    indicativeFee: "Tarif orientativ",
    priceFrom: "De la {price} RON",
    feeConfirmed: "Tariful va fi confirmat de clinică",
    nextAvailable: "Următorul interval disponibil",
    time: "Ora {time}",
    checkAvailability: "Verifică disponibilitatea în formularul de programare.",
    request: "Solicită o programare",
    notice: "Programarea online este o solicitare. Medicul sau personalul clinicii va confirma ulterior data și ora.",
  },
  en: {
    eyebrow: "Online appointment",
    title: "Appointment details",
    description: "Review the main information, then complete the appointment form.",
    clinic: "Clinic",
    selectClinic: "Select the clinic in the form",
    indicativeFee: "Indicative fee",
    priceFrom: "From {price} RON",
    feeConfirmed: "The fee will be confirmed by the clinic",
    nextAvailable: "Next available time",
    time: "Time {time}",
    checkAvailability: "Check availability in the appointment form.",
    request: "Request an appointment",
    notice: "The online appointment is a request. The doctor or clinic staff will confirm the date and time later.",
  },
  de: {
    eyebrow: "Online-Termin",
    title: "Termindetails",
    description: "Prüfen Sie die wichtigsten Angaben und füllen Sie anschließend das Terminformular aus.",
    clinic: "Klinik",
    selectClinic: "Wählen Sie die Klinik im Formular aus",
    indicativeFee: "Unverbindlicher Preis",
    priceFrom: "Ab {price} RON",
    feeConfirmed: "Der Preis wird von der Klinik bestätigt",
    nextAvailable: "Nächster verfügbarer Termin",
    time: "Uhrzeit {time}",
    checkAvailability: "Prüfen Sie die Verfügbarkeit im Terminformular.",
    request: "Termin anfragen",
    notice: "Der Online-Termin ist eine Anfrage. Der Arzt oder das Klinikpersonal bestätigt Datum und Uhrzeit später.",
  },
} as const;

function intlLocale(
  locale: AppLocale
) {
  return locale === "ro"
    ? "ro-RO"
    : locale === "de"
      ? "de-DE"
      : "en-GB";
}

function formatPrice(
  value: number,
  locale: AppLocale
) {
  return new Intl.NumberFormat(
    intlLocale(locale),
    {
      maximumFractionDigits: 2,
    }
  ).format(value);
}

function formatDate(
  date: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    intlLocale(locale),
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

export default function DoctorBookingSummary({
  clinicName,
  clinicAddress,
  consultationPrice,
  nextAvailableSlot,
  locale,
}: Props) {
  const t =
    copy[locale];

  return (
    <aside
      aria-labelledby="doctor-booking-summary-title"
      className="romdoc-card hidden self-start lg:sticky lg:top-[89px] lg:block lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto"
    >
      <div className="border-b border-gray-200 pb-[21px]">
        <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#036661]">
          {t.eyebrow}
        </p>

        <h2
          id="doctor-booking-summary-title"
          className="mt-[8px] text-2xl font-bold tracking-tight text-gray-900"
        >
          {t.title}
        </h2>

        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          {t.description}
        </p>
      </div>

      <dl className="mt-[21px] space-y-[21px]">
        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t.clinic}
          </dt>

          <dd className="mt-[5px] font-semibold text-gray-900">
            {clinicName ??
              t.selectClinic}
          </dd>

          {clinicAddress && (
            <dd className="mt-[5px] text-sm leading-6 text-gray-600">
              {clinicAddress}
            </dd>
          )}
        </div>

        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t.indicativeFee}
          </dt>

          <dd className="mt-[5px] text-lg font-bold text-gray-900">
            {consultationPrice !== null
              ? t.priceFrom.replace(
                  "{price}",
                  formatPrice(
                    consultationPrice,
                    locale
                  )
                )
              : t.feeConfirmed}
          </dd>
        </div>

        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {t.nextAvailable}
          </dt>

          <dd className="mt-[5px]">
            {nextAvailableSlot ? (
              <>
                <span className="block font-semibold capitalize text-[#036661]">
                  {formatDate(
                    nextAvailableSlot.date,
                    locale
                  )}
                </span>

                <span className="mt-[5px] block text-sm text-gray-700">
                  {t.time.replace(
                    "{time}",
                    nextAvailableSlot.time
                  )}
                </span>
              </>
            ) : (
              <span className="text-sm leading-6 text-gray-600">
                {t.checkAvailability}
              </span>
            )}
          </dd>
        </div>
      </dl>

      <a
        href="#programare"
        className="romdoc-button romdoc-button-primary mt-[21px] w-full justify-center"
      >
        {t.request}
      </a>

      <p className="mt-[13px] text-xs leading-5 text-gray-500">
        {t.notice}
      </p>
    </aside>
  );
}
