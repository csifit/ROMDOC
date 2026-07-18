type NextAvailableSlot = {
  date: string;
  time: string;
} | null;

type Props = {
  clinicName: string | null;
  clinicAddress: string | null;
  consultationPrice: number | null;
  nextAvailableSlot: NextAvailableSlot;
};

function formatPrice(
  value: number
) {
  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    value
  );
}

function formatDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
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
}: Props) {
  return (
    <aside
      aria-labelledby="doctor-booking-summary-title"
      className="romdoc-card hidden self-start lg:sticky lg:top-[89px] lg:block lg:max-h-[calc(100vh-110px)] lg:overflow-y-auto"
    >
      <div className="border-b border-gray-200 pb-[21px]">
        <p className="text-sm font-semibold uppercase tracking-[0.13em] text-[#036661]">
          Programare online
        </p>

        <h2
          id="doctor-booking-summary-title"
          className="mt-[8px] text-2xl font-bold tracking-tight text-gray-900"
        >
          Detalii pentru programare
        </h2>

        <p className="mt-[8px] text-sm leading-6 text-gray-600">
          Verifică informațiile principale, apoi completează formularul de programare.
        </p>
      </div>

      <dl className="mt-[21px] space-y-[21px]">
        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Clinica
          </dt>

          <dd className="mt-[5px] font-semibold text-gray-900">
            {clinicName ??
              "Selectează clinica în formular"}
          </dd>

          {clinicAddress && (
            <dd className="mt-[5px] text-sm leading-6 text-gray-600">
              {
                clinicAddress
              }
            </dd>
          )}
        </div>

        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tarif orientativ
          </dt>

          <dd className="mt-[5px] text-lg font-bold text-gray-900">
            {consultationPrice !==
            null
              ? `De la ${formatPrice(
                  consultationPrice
                )} RON`
              : "Tariful va fi confirmat de clinică"}
          </dd>
        </div>

        <div className="romdoc-panel-muted">
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Următorul interval disponibil
          </dt>

          <dd className="mt-[5px]">
            {nextAvailableSlot ? (
              <>
                <span className="block font-semibold capitalize text-[#036661]">
                  {formatDate(
                    nextAvailableSlot.date
                  )}
                </span>

                <span className="mt-[5px] block text-sm text-gray-700">
                  Ora{" "}
                  {
                    nextAvailableSlot.time
                  }
                </span>
              </>
            ) : (
              <span className="text-sm leading-6 text-gray-600">
                Verifică disponibilitatea în formularul de programare.
              </span>
            )}
          </dd>
        </div>
      </dl>

      <a
        href="#programare"
        className="romdoc-button romdoc-button-primary mt-[21px] w-full justify-center"
      >
        Solicită o programare
      </a>

      <p className="mt-[13px] text-xs leading-5 text-gray-500">
        Programarea online este o solicitare. Medicul sau personalul clinicii va confirma ulterior data și ora.
      </p>
    </aside>
  );
}
