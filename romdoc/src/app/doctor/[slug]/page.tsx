import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

type DoctorTranslation = {
  locale: string;
  title: string | null;
  biography: string | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
  description: string | null;
};

type CityTranslation = {
  locale: string;
  name: string;
};

type CityRelation = {
  slug: string;
  city_translations: CityTranslation[] | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  phone: string | null;
  website: string | null;
  street_address: string | null;
  clinic_translations: ClinicTranslation[] | null;

  // Supabase returns this nested relationship as an array.
  cities: CityRelation[] | null;
};

type DoctorClinicRelation = {
  clinic_id: string;

  // Supabase returns this nested relationship as an array.
  clinics: ClinicRelation[] | null;
};

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map((part: string) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(" ");
}

export default async function DoctorPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: doctor, error } = await supabase
    .from("doctors")
    .select(`
      id,
      slug,
      years_experience,
      consultation_price,
      average_rating,
      review_count,
      doctor_translations (
        locale,
        title,
        biography
      ),
      doctor_clinics (
        clinic_id,
        clinics (
          id,
          slug,
          phone,
          website,
          street_address,
          clinic_translations (
            locale,
            name,
            description
          ),
          cities (
            slug,
            city_translations (
              locale,
              name
            )
          )
        )
      )
    `)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Doctor profile query failed:", error);
  }

  if (!doctor) {
    notFound();
  }

  const doctorTranslations =
    doctor.doctor_translations as DoctorTranslation[] | null;

  const translation = doctorTranslations?.find(
    (item: DoctorTranslation) => item.locale === "ro"
  );

  const clinicRelations =
    (doctor.doctor_clinics as DoctorClinicRelation[] | null) ?? [];

  return (
    <main className="min-h-screen bg-[#F0EEE9] py-12">
      <div className="mx-auto max-w-4xl px-6">
        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <header>
            <h1 className="text-4xl font-bold text-gray-900">
              {formatDoctorName(doctor.slug)}
            </h1>

            <p className="mt-3 text-lg text-gray-700">
              {translation?.title ?? "Medic"}
            </p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600">
              <span>
                ⭐ {doctor.average_rating} ({doctor.review_count} recenzii)
              </span>

              {doctor.years_experience !== null && (
                <span>{doctor.years_experience} ani experiență</span>
              )}

              {doctor.consultation_price !== null && (
                <span>{doctor.consultation_price} RON consultație</span>
              )}
            </div>
          </header>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Despre medic
            </h2>

            <p className="mt-4 leading-7 text-gray-700">
              {translation?.biography ??
                "Informațiile despre acest medic vor fi disponibile în curând."}
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Locații
            </h2>

            {clinicRelations.length > 0 ? (
              <div className="mt-5 space-y-4">
                {clinicRelations.map(
                  (relation: DoctorClinicRelation) => {
                    // Supabase returns clinics as an array.
                    const clinic = relation.clinics?.[0];

                    if (!clinic) {
                      return null;
                    }

                    const clinicTranslation =
                      clinic.clinic_translations?.find(
                        (item: ClinicTranslation) => item.locale === "ro"
                      );

                    // Supabase also returns cities as an array.
                    const city = clinic.cities?.[0];

                    const cityTranslation =
                      city?.city_translations?.find(
                        (item: CityTranslation) => item.locale === "ro"
                      );

                    const address = [
                      clinic.street_address,
                      cityTranslation?.name,
                    ]
                      .filter(
                        (value): value is string =>
                          typeof value === "string" && value.length > 0
                      )
                      .join(", ");

                    return (
                      <article
                        key={relation.clinic_id}
                        className="rounded-xl border border-gray-200 bg-white p-6"
                      >
                        <h3 className="text-xl font-semibold text-gray-900">
                          {clinicTranslation?.name ?? "Clinică medicală"}
                        </h3>

                        {clinicTranslation?.description && (
                          <p className="mt-2 text-gray-600">
                            {clinicTranslation.description}
                          </p>
                        )}

                        {address && (
                          <p className="mt-4 text-gray-700">
                            <span className="font-medium">Adresă:</span>{" "}
                            {address}
                          </p>
                        )}

                        {clinic.phone && (
                          <p className="mt-2 text-gray-700">
                            <span className="font-medium">Telefon:</span>{" "}
                            <a
                              href={`tel:${clinic.phone.replace(/\s+/g, "")}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {clinic.phone}
                            </a>
                          </p>
                        )}

                        {clinic.website && (
                          <p className="mt-2">
                            <a
                              href={clinic.website}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-gray-800 underline-offset-4 hover:underline"
                            >
                              Vizitează site-ul clinicii
                            </a>
                          </p>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">
                Locațiile acestui medic nu sunt încă disponibile.
              </div>
            )}
          </section>

          <section className="mt-10">
            <button
              type="button"
              className="rounded-xl bg-[#D97757] px-6 py-3 font-medium text-white transition hover:opacity-90"
            >
              Solicită programare
            </button>
          </section>
        </article>
      </div>
    </main>
  );
}