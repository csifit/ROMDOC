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

function formatPrice(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Bucharest",
  }).format(new Date(`${date}T12:00:00`));
}

export default function DoctorBookingSummary({
  clinicName,
  clinicAddress,
  consultationPrice,
  nextAvailableSlot,
}: Props) {
  return (
    <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
        Programare online
      </p>

      <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
        Informațiile esențiale
      </h2>

      <dl className="mt-6 space-y-5">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Clinica afișată
          </dt>
          <dd className="mt-1 font-semibold text-gray-900">
            {clinicName ?? "Selectează clinica în formular"}
          </dd>
          {clinicAddress && (
            <dd className="mt-1 text-sm leading-6 text-gray-600">
              {clinicAddress}
            </dd>
          )}
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Tarif orientativ
          </dt>
          <dd className="mt-1 text-lg font-bold text-gray-900">
            {consultationPrice !== null
              ? `De la ${formatPrice(consultationPrice)} RON`
              : "Tariful va fi confirmat de clinică"}
          </dd>
        </div>

        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Următorul interval disponibil
          </dt>
          <dd className="mt-1">
            {nextAvailableSlot ? (
              <>
                <span className="block font-semibold capitalize text-[#036661]">
                  {formatDate(nextAvailableSlot.date)}
                </span>
                <span className="mt-1 block text-sm text-gray-700">
                  Ora {nextAvailableSlot.time}
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
        className="romdoc-button romdoc-button-primary mt-7 w-full justify-center"
      >
        Solicită o programare
      </a>

      <p className="mt-4 text-xs leading-5 text-gray-500">
        Programarea online este o solicitare. Medicul sau personalul clinicii o va confirma ulterior.
      </p>
    </aside>
  );
}
