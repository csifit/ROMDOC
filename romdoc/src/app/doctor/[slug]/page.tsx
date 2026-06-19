import { notFound } from "next/navigation";
import AuthenticatedAppointmentRequest from "@/components/appointments/authenticated-appointment-request";
import PublicDoctorServices from "@/components/doctor/public-doctor-services";
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
  city_translations:
    | CityTranslation[]
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  phone: string | null;
  website: string | null;
  street_address: string | null;

  clinic_translations:
    | ClinicTranslation[]
    | null;

  cities:
    | CityRelation
    | CityRelation[]
    | null;
};

type DoctorClinicRelation = {
  clinic_id: string;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

function formatDoctorName(
  slug: string
) {
  return slug
    .split("-")
    .map((part: string) => {
      return (
        part.charAt(0).toUpperCase() +
        part.slice(1)
      );
    })
    .join(" ");
}

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatConsultationPrice(
  value: number | string
) {
  const numericValue =
    Number(value);

  if (
    Number.isNaN(numericValue)
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "ro-RO",
    {
      maximumFractionDigits: 2,
    }
  ).format(numericValue);
}

export default async function DoctorPage({
  params,
}: Props) {
  const { slug } = await params;

  const supabase =
    await createClient();

  const {
    data: doctor,
    error,
  } = await supabase
    .from("doctors")
    .select(`
      id,
      slug,
      phone,
      email,
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
    console.error(
      "Doctor profile query failed:",
      error
    );
  }

  if (!doctor) {
    notFound();
  }

  const doctorTranslations =
    doctor.doctor_translations as
      | DoctorTranslation[]
      | null;

  const translation =
    doctorTranslations?.find(
      (
        item: DoctorTranslation
      ) => item.locale === "ro"
    ) ??
    doctorTranslations?.[0] ??
    null;

  const clinicRelations =
    (doctor.doctor_clinics as unknown as
      | DoctorClinicRelation[]
      | null) ?? [];

  const clinicOptions: ClinicOption[] =
    clinicRelations.flatMap(
      (
        relation:
          DoctorClinicRelation
      ) => {
        const clinic =
          getFirstRelation(
            relation.clinics
          );

        if (!clinic) {
          return [];
        }

        const clinicTranslation =
          clinic.clinic_translations?.find(
            (
              item:
                ClinicTranslation
            ) => item.locale === "ro"
          ) ??
          clinic.clinic_translations?.[0] ??
          null;

        const city =
          getFirstRelation(
            clinic.cities
          );

        const cityTranslation =
          city?.city_translations?.find(
            (
              item:
                CityTranslation
            ) => item.locale === "ro"
          ) ??
          city?.city_translations?.[0] ??
          null;

        const address = [
          clinic.street_address,
          cityTranslation?.name,
        ]
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              value.trim().length > 0
          )
          .join(", ");

        return [
          {
            id: clinic.id,

            name:
              clinicTranslation?.name ??
              "Clinică medicală",

            address,
          },
        ];
      }
    );

  const doctorName =
    formatDoctorName(
      doctor.slug
    );

  return (
    <main className="min-h-screen bg-[#F0EEE9] py-12">
      <div className="mx-auto max-w-4xl px-6">
        <article className="rounded-2xl bg-white p-8 shadow-sm">
          <header>
            <h1 className="text-4xl font-bold text-gray-900">
              {doctorName}
            </h1>

            <p className="mt-3 text-lg text-gray-700">
              {translation?.title ??
                "Medic"}
            </p>

            <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600">
              <span>
                ⭐{" "}
                {doctor.average_rating ??
                  0}{" "}
                (
                {doctor.review_count ??
                  0}{" "}
                recenzii)
              </span>

              {doctor.years_experience !==
                null && (
                <span>
                  {
                    doctor.years_experience
                  }{" "}
                  ani experiență
                </span>
              )}

              {doctor.consultation_price !==
                null && (
                <span>
                  {formatConsultationPrice(
                    doctor.consultation_price
                  )}{" "}
                  RON consultație
                </span>
              )}
            </div>

            {(doctor.phone ||
              doctor.email) && (
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {doctor.phone && (
                  <a
                    href={`tel:${doctor.phone.replace(
                      /\s+/g,
                      ""
                    )}`}
                    className="font-medium text-gray-800 underline-offset-4 hover:underline"
                  >
                    {doctor.phone}
                  </a>
                )}

                {doctor.email && (
                  <a
                    href={`mailto:${doctor.email}`}
                    className="font-medium text-gray-800 underline-offset-4 hover:underline"
                  >
                    {doctor.email}
                  </a>
                )}
              </div>
            )}
          </header>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Despre medic
            </h2>

            <p className="mt-4 whitespace-pre-line leading-7 text-gray-700">
              {translation?.biography ??
                "Informațiile despre acest medic vor fi disponibile în curând."}
            </p>
          </section>

          <div className="mt-10">
            <PublicDoctorServices
              doctorId={doctor.id}
              locale="ro"
            />
          </div>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-gray-900">
              Locații
            </h2>

            {clinicOptions.length >
            0 ? (
              <div className="mt-5 space-y-4">
                {clinicRelations.map(
                  (
                    relation:
                      DoctorClinicRelation
                  ) => {
                    const clinic =
                      getFirstRelation(
                        relation.clinics
                      );

                    if (!clinic) {
                      return null;
                    }

                    const clinicTranslation =
                      clinic.clinic_translations?.find(
                        (
                          item:
                            ClinicTranslation
                        ) =>
                          item.locale ===
                          "ro"
                      ) ??
                      clinic
                        .clinic_translations?.[0] ??
                      null;

                    const city =
                      getFirstRelation(
                        clinic.cities
                      );

                    const cityTranslation =
                      city?.city_translations?.find(
                        (
                          item:
                            CityTranslation
                        ) =>
                          item.locale ===
                          "ro"
                      ) ??
                      city
                        ?.city_translations?.[0] ??
                      null;

                    const address = [
                      clinic.street_address,
                      cityTranslation?.name,
                    ]
                      .filter(
                        (
                          value
                        ): value is string =>
                          typeof value ===
                            "string" &&
                          value
                            .trim()
                            .length > 0
                      )
                      .join(", ");

                    return (
                      <article
                        key={
                          relation.clinic_id
                        }
                        className="rounded-xl border border-gray-200 bg-white p-6"
                      >
                        <h3 className="text-xl font-semibold text-gray-900">
                          {clinicTranslation?.name ??
                            "Clinică medicală"}
                        </h3>

                        {clinicTranslation?.description && (
                          <p className="mt-2 text-gray-600">
                            {
                              clinicTranslation.description
                            }
                          </p>
                        )}

                        {address && (
                          <p className="mt-4 text-gray-700">
                            <span className="font-medium">
                              Adresă:
                            </span>{" "}
                            {address}
                          </p>
                        )}

                        {clinic.phone && (
                          <p className="mt-2 text-gray-700">
                            <span className="font-medium">
                              Telefon:
                            </span>{" "}
                            <a
                              href={`tel:${clinic.phone.replace(
                                /\s+/g,
                                ""
                              )}`}
                              className="underline-offset-4 hover:underline"
                            >
                              {clinic.phone}
                            </a>
                          </p>
                        )}

                        {clinic.website && (
                          <p className="mt-2">
                            <a
                              href={
                                clinic.website
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium text-gray-800 underline-offset-4 hover:underline"
                            >
                              Vizitează site-ul
                              clinicii
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
                Locațiile acestui medic nu
                sunt încă disponibile.
              </div>
            )}
          </section>

          <section className="mt-10">
            <AuthenticatedAppointmentRequest
              doctorId={doctor.id}
              doctorName={doctorName}
              doctorSlug={doctor.slug}
              clinics={clinicOptions}
            />
          </section>
        </article>
      </div>
    </main>
  );
}