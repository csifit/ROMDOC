import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

type DoctorTranslation = {
  locale: string;
  title: string;
  biography: string;
};

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function DoctorPage({ params }: Props) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: doctor } = await supabase
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
    .eq("slug", slug)
    .single();

  if (!doctor) {
    notFound();
  }

  const translation = doctor.doctor_translations?.find(
    (t: DoctorTranslation) => t.locale === "ro"
  );

  return (
    <main
      className="min-h-screen py-12"
      style={{ backgroundColor: "#FDEEE9" }}
    >
      <div className="mx-auto max-w-4xl px-6">
        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-4xl font-bold">
            {formatDoctorName(doctor.slug)}
          </h1>

          <p className="mt-3 text-lg text-gray-700">
            {translation?.title}
          </p>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600">
            <span>
              ⭐ {doctor.average_rating} ({doctor.review_count} recenzii)
            </span>

            <span>
              {doctor.years_experience} ani experiență
            </span>

            <span>
              {doctor.consultation_price} RON consultație
            </span>
          </div>

          <section className="mt-8">
            <h2 className="text-2xl font-semibold">
              Despre medic
            </h2>

            <p className="mt-4 leading-7 text-gray-700">
              {translation?.biography}
            </p>
          </section>

          <section className="mt-10">
            <button
              className="rounded-xl px-6 py-3 font-medium text-white"
              style={{ backgroundColor: "#D97757" }}
            >
              Solicită programare
            </button>
          </section>
        </article>
      </div>
    </main>
  );
}