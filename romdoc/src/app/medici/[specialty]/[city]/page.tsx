import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    specialty: string;
    city: string;
  }>;
};

type Translation = {
  locale: string;
  name?: string;
  title?: string;
  biography?: string;
};

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function SpecialtyCityPage({ params }: Props) {
  const { specialty, city } = await params;

  const supabase = await createClient();

  const { data: specialtyData } = await supabase
    .from("specialties")
    .select(`
      id,
      slug,
      specialty_translations (
        locale,
        name
      )
    `)
    .eq("slug", specialty)
    .single();

  const { data: cityData } = await supabase
    .from("cities")
    .select(`
      id,
      slug,
      city_translations (
        locale,
        name
      )
    `)
    .eq("slug", city)
    .single();

  if (!specialtyData || !cityData) {
    notFound();
  }

  const specialtyTranslation = specialtyData.specialty_translations?.find(
    (translation: Translation) => translation.locale === "ro"
  );

  const cityTranslation = cityData.city_translations?.find(
    (translation: Translation) => translation.locale === "ro"
  );

  const { data: doctorSpecialties } = await supabase
    .from("doctor_specialties")
    .select("doctor_id")
    .eq("specialty_id", specialtyData.id);

  const doctorIds =
    doctorSpecialties?.map((item: { doctor_id: string }) => item.doctor_id) ??
    [];

  const { data: doctors } =
    doctorIds.length > 0
      ? await supabase
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
            )
          `)
          .eq("city_id", cityData.id)
          .eq("status", "active")
          .in("id", doctorIds)
      : { data: [] };

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-bold">
        {specialtyTranslation?.name} în {cityTranslation?.name}
      </h1>

      <p className="mt-4 text-gray-600">
        Găsește medici pentru{" "}
        {specialtyTranslation?.name?.toLowerCase()} în {cityTranslation?.name} și
        trimite o cerere de programare online.
      </p>

      <section className="mt-10 space-y-4">
        {doctors && doctors.length > 0 ? (
          doctors.map((doctor) => {
            const doctorTranslation = doctor.doctor_translations?.find(
              (translation: Translation) => translation.locale === "ro"
            );

            return (
              <article
                key={doctor.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <h2 className="text-2xl font-semibold">
                  {formatDoctorName(doctor.slug)}
                </h2>

                <p className="mt-2 text-gray-700">
                  {doctorTranslation?.title}
                </p>

                <p className="mt-3 text-gray-600">
                  {doctorTranslation?.biography}
                </p>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>
                    ⭐ {doctor.average_rating} ({doctor.review_count} recenzii)
                  </span>

                  <span>{doctor.years_experience} ani experiență</span>

                  <span>{doctor.consultation_price} RON consultație</span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="rounded-lg border bg-white p-6">
            Nu există încă medici pentru această combinație.
          </div>
        )}
      </section>
    </main>
  );
}