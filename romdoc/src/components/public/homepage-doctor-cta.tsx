import Link from "@/components/public/localized-public-link";

export default function HomepageDoctorCta() {
  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
              Pentru profesioniÈ™ti medicali
            </p>

            <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              EÈ™ti medic?
            </h2>

            <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600">
              CreeazÄƒ-È›i profilul RomDoc, publicÄƒ serviciile È™i
              clinicile aprobate, configureazÄƒ disponibilitatea È™i
              primeÈ™te cereri de programare online.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register?role=doctor"
                className="romdoc-button romdoc-button-primary romdoc-button-lg"
              >
                CreeazÄƒ cont de medic
              </Link>

              <Link
                href="/pentru-medici/cum-functioneaza"
                className="romdoc-button romdoc-button-secondary romdoc-button-lg"
              >
                Cum funcÈ›ioneazÄƒ RomDoc
              </Link>
            </div>
          </div>

          <div className="bg-[#F0EEE9] p-6 sm:p-8 lg:p-10">
            <h3 className="text-lg font-semibold text-gray-900">
              Ce poÈ›i administra
            </h3>

            <ul className="mt-5 space-y-4 text-sm leading-6 text-gray-700">
              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                Profilul public, biografia È™i informaÈ›iile
                profesionale
              </li>

              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                Serviciile medicale È™i preÈ›urile consultaÈ›iilor
              </li>

              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                Clinicile propuse È™i locaÈ›iile aprobate
              </li>

              <li className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#036661]" />
                Programul, disponibilitatea È™i cererile pacienÈ›ilor
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

