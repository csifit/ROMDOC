import HomepageDoctorCard, {
  type HomepageDoctorCardData,
} from "@/components/public/homepage-doctor-card";

type DoctorDirectoryResultsProps = {
  doctors:
    HomepageDoctorCardData[];
  cityName:
    | string
    | null;
  specialtyName:
    | string
    | null;
  verifiedOnly:
    boolean;
};

function createResultTitle({
  cityName,
  specialtyName,
  verifiedOnly,
}: Omit<
  DoctorDirectoryResultsProps,
  "doctors"
>) {
  const parts = [
    specialtyName,
    cityName
      ? `în ${cityName}`
      : null,
    verifiedOnly
      ? "verificați profesional"
      : null,
  ].filter(Boolean);

  return parts.length > 0
    ? `Medici ${parts.join(
        " "
      )}`
    : "Toți medicii disponibili";
}

export default function DoctorDirectoryResults({
  doctors,
  cityName,
  specialtyName,
  verifiedOnly,
}: DoctorDirectoryResultsProps) {
  const title =
    createResultTitle({
      cityName,
      specialtyName,
      verifiedOnly,
    });

  return (
    <section
      aria-labelledby="doctor-directory-results-title"
      className="px-4 pb-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              Rezultate
            </p>

            <h2
              id="doctor-directory-results-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              {title}
            </h2>

            <p className="mt-3 text-sm text-gray-600">
              {doctors.length ===
              1
                ? "1 medic găsit"
                : `${doctors.length} medici găsiți`}
            </p>
          </div>
        </div>

        {doctors.length ===
        0 ? (
          <div className="mt-7 rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <h3 className="text-xl font-bold text-gray-900">
              Nu am găsit medici pentru aceste filtre
            </h3>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              Resetează filtrele sau încearcă un alt oraș ori o altă specialitate.
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {doctors.map(
              (doctor) => (
                <HomepageDoctorCard
                  key={
                    doctor.id
                  }
                  doctor={
                    doctor
                  }
                />
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
