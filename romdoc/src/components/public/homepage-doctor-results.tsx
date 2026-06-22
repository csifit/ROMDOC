import Link from "next/link";
import HomepageDoctorCard, {
  type HomepageDoctorCardData,
} from "@/components/public/homepage-doctor-card";

type HomepageDoctorResultsProps = {
  doctors: HomepageDoctorCardData[];
};

export default function HomepageDoctorResults({
  doctors,
}: HomepageDoctorResultsProps) {
  if (doctors.length === 0) {
    return (
      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Medicii vor apărea aici
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-600">
            Nu există încă medici activi cu o clinică aprobată și date publice complete.
          </p>

          <Link
            href="/medici"
            className="romdoc-button romdoc-button-primary mt-6"
          >
            Deschide directorul medical
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="homepage-doctors-title"
      className="px-4 pb-14 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              Medici RomDoc
            </p>

            <h2
              id="homepage-doctors-title"
              className="mt-2 text-3xl font-bold tracking-tight text-gray-900"
            >
              Medici disponibili pe platformă
            </h2>

            <p className="mt-3 max-w-2xl text-gray-600">
              Descoperă medici activi, clinici aprobate și opțiuni de programare online.
            </p>
          </div>

          <Link
            href="/medici"
            className="romdoc-button romdoc-button-secondary"
          >
            Vezi toți medicii
          </Link>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map(
            (doctor) => (
              <HomepageDoctorCard
                key={doctor.id}
                doctor={doctor}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
