import Link from "next/link";
import {
  notFound,
} from "next/navigation";
import PublicLayout from "@/components/public/public-layout";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{
    specialty: string;
    city: string;
  }>;

  searchParams: Promise<{
    verified?: string;
    online?: string;
  }>;
};

type Translation = {
  locale: string;
  name?: string;
  title?: string;
  biography?: string;
};

type DoctorRow = {
  id: string;
  slug: string;
  years_experience:
    | number
    | null;

  consultation_price:
    | number
    | null;

  average_rating:
    | number
    | null;

  review_count:
    | number
    | null;

  verification_status:
    | string
    | null;

  doctor_translations:
    | Translation[]
    | null;
};

function formatDoctorName(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part: string) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

export default async function SpecialtyCityPage({
  params,
  searchParams,
}: Props) {
  const {
    specialty,
    city,
  } = await params;

  const filters =
    await searchParams;

  const verifiedOnly =
    filters.verified ===
    "true";

  const onlineOnly =
    filters.online ===
    "true";

  const supabase =
    await createClient();

  const [
    specialtyResult,
    cityResult,
  ] =
    await Promise.all([
      supabase
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
        .single(),

      supabase
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
        .single(),
    ]);

  const specialtyData =
    specialtyResult.data;

  const cityData =
    cityResult.data;

  if (
    !specialtyData ||
    !cityData
  ) {
    notFound();
  }

  const specialtyTranslation =
    specialtyData
      .specialty_translations
      ?.find(
        (
          translation:
            Translation
        ) =>
          translation.locale ===
          "ro"
      );

  const cityTranslation =
    cityData
      .city_translations
      ?.find(
        (
          translation:
            Translation
        ) =>
          translation.locale ===
          "ro"
      );

  const {
    data:
      doctorSpecialties,
  } = await supabase
    .from(
      "doctor_specialties"
    )
    .select("doctor_id")
    .eq(
      "specialty_id",
      specialtyData.id
    );

  let doctorIds =
    doctorSpecialties?.map(
      (item: {
        doctor_id: string;
      }) => item.doctor_id
    ) ?? [];

  if (
    onlineOnly &&
    doctorIds.length > 0
  ) {
    const {
      data:
        availabilityRows,
    } = await supabase
      .from("availability")
      .select("doctor_id")
      .in(
        "doctor_id",
        doctorIds
      );

    const availableDoctorIds =
      new Set(
        (
          availabilityRows ??
          []
        ).map(
          (row: {
            doctor_id: string;
          }) => row.doctor_id
        )
      );

    doctorIds =
      doctorIds.filter(
        (doctorId) =>
          availableDoctorIds.has(
            doctorId
          )
      );
  }

  let doctors:
    DoctorRow[] = [];

  if (
    doctorIds.length > 0
  ) {
    let doctorQuery =
      supabase
        .from("doctors")
        .select(`
          id,
          slug,
          years_experience,
          consultation_price,
          average_rating,
          review_count,
          verification_status,
          doctor_translations (
            locale,
            title,
            biography
          )
        `)
        .eq(
          "city_id",
          cityData.id
        )
        .eq(
          "status",
          "active"
        )
        .in("id", doctorIds);

    if (verifiedOnly) {
      doctorQuery =
        doctorQuery.eq(
          "verification_status",
          "verified"
        );
    }

    const {
      data:
        doctorRows,
      error:
        doctorsError,
    } =
      await doctorQuery;

    if (doctorsError) {
      console.error(
        "Filtered doctor query failed:",
        doctorsError
      );
    } else {
      doctors =
        (doctorRows ??
          []) as DoctorRow[];
    }
  }

  return (
    <PublicLayout>
      <main className="bg-[#F0EEE9] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#036661]">
              Director medical
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {
                specialtyTranslation
                  ?.name
              }{" "}
              în{" "}
              {
                cityTranslation
                  ?.name
              }
            </h1>

            <p className="mt-4 text-gray-600">
              Găsește medici pentru{" "}
              {specialtyTranslation
                ?.name
                ?.toLowerCase()}{" "}
              în{" "}
              {
                cityTranslation
                  ?.name
              }{" "}
              și trimite o cerere de programare online.
            </p>

            {(verifiedOnly ||
              onlineOnly) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {verifiedOnly && (
                  <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
                    Doar medici verificați
                  </span>
                )}

                {onlineOnly && (
                  <span className="rounded-full bg-[#036661]/10 px-3 py-1.5 text-xs font-semibold text-[#036661]">
                    Programări online disponibile
                  </span>
                )}

                <Link
                  href={`/medici/${specialty}/${city}`}
                  className="romdoc-link text-sm"
                >
                  Elimină filtrele
                </Link>
              </div>
            )}
          </div>

          <section className="mt-8 space-y-4">
            {doctors.length >
            0 ? (
              doctors.map(
                (doctor) => {
                  const doctorTranslation =
                    doctor
                      .doctor_translations
                      ?.find(
                        (
                          translation:
                            Translation
                        ) =>
                          translation.locale ===
                          "ro"
                      );

                  return (
                    <article
                      key={
                        doctor.id
                      }
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-2xl font-semibold">
                              <Link
                                href={`/doctor/${doctor.slug}`}
                                className="romdoc-link"
                              >
                                {formatDoctorName(
                                  doctor.slug
                                )}
                              </Link>
                            </h2>

                            {doctor.verification_status ===
                              "verified" && (
                              <span className="rounded-full bg-[#036661]/10 px-2.5 py-1 text-xs font-semibold text-[#036661]">
                                Medic verificat
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-gray-700">
                            {
                              doctorTranslation
                                ?.title
                            }
                          </p>

                          <p className="mt-3 max-w-3xl text-gray-600">
                            {
                              doctorTranslation
                                ?.biography
                            }
                          </p>

                          <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                            <span>
                              {Number(
                                doctor.average_rating ??
                                  0
                              ).toFixed(
                                1
                              )}{" "}
                              (
                              {doctor.review_count ??
                                0}{" "}
                              recenzii)
                            </span>

                            <span>
                              {doctor.years_experience ??
                                0}{" "}
                              ani experiență
                            </span>

                            <span>
                              {doctor.consultation_price ??
                                "—"}{" "}
                              RON consultație
                            </span>
                          </div>
                        </div>

                        <Link
                          href={`/doctor/${doctor.slug}`}
                          className="romdoc-button romdoc-button-primary romdoc-button-sm shrink-0"
                        >
                          Vezi profilul
                        </Link>
                      </div>
                    </article>
                  );
                }
              )
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm">
                Nu există încă medici pentru această combinație de filtre.
              </div>
            )}
          </section>
        </div>
      </main>
    </PublicLayout>
  );
}
