import Link from "next/link";
import DoctorManagementActions from "@/components/admin/doctor-management-actions";
import { createClient } from "@/lib/supabase/server";

type ProfileRelation = {
  id: string;
  role: string;
  first_name: string | null;
  last_name: string | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  slug: string;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type DoctorClinicRelation = {
  clinic_id: string;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type DoctorRow = {
  id: string;
  slug: string;
  status: string;
  profile_id: string | null;
  created_at: string;

  profiles:
    | ProfileRelation
    | ProfileRelation[]
    | null;

  doctor_clinics:
    | DoctorClinicRelation[]
    | null;
};

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

function formatNameFromSlug(
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

function getProfileName(
  profile: ProfileRelation | null,
  slug: string
) {
  if (!profile) {
    return formatNameFromSlug(slug);
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    formatNameFromSlug(slug)
  );
}

function getClinicName(
  clinic: ClinicRelation | null
) {
  if (!clinic) {
    return "Clinică indisponibilă";
  }

  const romanianTranslation =
    clinic.clinic_translations?.find(
      (
        translation:
          ClinicTranslation
      ) => translation.locale === "ro"
    );

  const fallbackTranslation =
    clinic.clinic_translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    formatNameFromSlug(clinic.slug)
  );
}

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(date));
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "active":
      return "Activ";

    case "suspended":
      return "Suspendat";

    case "rejected":
      return "Respins";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";

    case "suspended":
      return "bg-red-100 text-red-800";

    case "rejected":
      return "bg-gray-200 text-gray-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default async function AdminDoctorsPage() {
  const supabase = await createClient();

  const {
    data,
    error,
  } = await supabase
    .from("doctors")
    .select(`
      id,
      slug,
      status,
      profile_id,
      created_at,
      profiles (
        id,
        role,
        first_name,
        last_name
      ),
      doctor_clinics (
        clinic_id,
        clinics (
          id,
          slug,
          clinic_translations (
            locale,
            name
          )
        )
      )
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Admin doctors query failed:",
      error
    );
  }

  const doctors =
    (data as unknown as
      | DoctorRow[]
      | null) ?? [];

  const activeDoctors =
    doctors.filter(
      (doctor) =>
        doctor.status === "active"
    ).length;

  const pendingDoctors =
    doctors.filter(
      (doctor) =>
        doctor.status === "pending"
    ).length;

  const unlinkedDoctors =
    doctors.filter(
      (doctor) =>
        !doctor.profile_id
    ).length;

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header>
          <p className="text-sm font-medium text-gray-500">
            Panou administrator
          </p>

          <h1 className="mt-2 text-4xl font-bold text-gray-900">
            Administrare medici
          </h1>

          <p className="mt-3 max-w-3xl text-gray-600">
            Verifică starea profilurilor, asocierea cu
            conturile autentificate și clinicile în care
            lucrează medicii.
          </p>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Medici înregistrați
            </p>

            <p className="mt-3 text-4xl font-bold text-gray-900">
              {doctors.length}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Activi
            </p>

            <p className="mt-3 text-4xl font-bold text-green-700">
              {activeDoctors}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              În așteptare
            </p>

            <p className="mt-3 text-4xl font-bold text-amber-700">
              {pendingDoctors}
            </p>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Fără cont asociat
            </p>

            <p className="mt-3 text-4xl font-bold text-red-700">
              {unlinkedDoctors}
            </p>
          </article>
        </section>

        <section className="mt-10">
          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
              Lista medicilor nu a putut fi încărcată.
            </div>
          ) : doctors.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600 shadow-sm">
              Nu există încă medici înregistrați.
            </div>
          ) : (
            <div className="space-y-6">
              {doctors.map(
                (doctor: DoctorRow) => {
                  const profile =
                    getFirstRelation(
                      doctor.profiles
                    );

                  const doctorName =
                    getProfileName(
                      profile,
                      doctor.slug
                    );

                  const clinicRelations =
                    doctor.doctor_clinics ??
                    [];

                  return (
                    <article
                      key={doctor.id}
                      className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-2xl font-bold text-gray-900">
                              {doctorName}
                            </h2>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                doctor.status
                              )}`}
                            >
                              {getStatusLabel(
                                doctor.status
                              )}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-500">
                            Profil creat la{" "}
                            {formatCreatedAt(
                              doctor.created_at
                            )}
                          </p>
                        </div>

                        <Link
                          href={`/doctor/${doctor.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-fit rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
                        >
                          Vezi profilul public
                        </Link>
                      </div>

                      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Doctor ID
                          </p>

                          <p className="mt-2 break-all font-mono text-xs text-gray-800">
                            {doctor.id}
                          </p>
                        </div>

                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Cont autentificat
                          </p>

                          {doctor.profile_id ? (
                            <>
                              <p className="mt-2 font-medium text-green-800">
                                Asociat
                              </p>

                              <p className="mt-1 break-all font-mono text-xs text-gray-700">
                                {doctor.profile_id}
                              </p>
                            </>
                          ) : (
                            <p className="mt-2 font-medium text-red-700">
                              Neasociat
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl bg-gray-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Rol profil
                          </p>

                          <p className="mt-2 font-medium text-gray-900">
                            {profile?.role ??
                              "Fără profil"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h3 className="font-semibold text-gray-900">
                          Clinici asociate
                        </h3>

                        {clinicRelations.length >
                        0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {clinicRelations.map(
                              (
                                relation:
                                  DoctorClinicRelation
                              ) => {
                                const clinic =
                                  getFirstRelation(
                                    relation.clinics
                                  );

                                return (
                                  <span
                                    key={
                                      relation.clinic_id
                                    }
                                    className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-800"
                                  >
                                    {getClinicName(
                                      clinic
                                    )}
                                  </span>
                                );
                              }
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-amber-700">
                            Medicul nu este asociat niciunei
                            clinici.
                          </p>
                        )}
                      </div>

                      <DoctorManagementActions
                        doctorId={doctor.id}
                        currentStatus={
                          doctor.status
                        }
                        currentProfileId={
                          doctor.profile_id
                        }
                      />
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}