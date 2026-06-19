import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type AppointmentStatusCount = {
  status: string;
};

type RecentAppointment = {
  id: string;
  patient_name: string;
  status: string;
  created_at: string;
  doctors:
    | {
        slug: string;
      }
    | {
        slug: string;
      }[]
    | null;
};

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatDoctorName(slug: string) {
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

function formatCreatedAt(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return "Confirmată";

    case "rescheduled":
      return "Reprogramată";

    case "cancelled":
      return "Anulată";

    case "completed":
      return "Finalizată";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800";

    case "rescheduled":
      return "bg-blue-100 text-blue-800";

    case "cancelled":
      return "bg-red-100 text-red-800";

    case "completed":
      return "bg-gray-200 text-gray-800";

    default:
      return "bg-amber-100 text-amber-800";
  }
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    appointmentsResult,
    doctorsResult,
    clinicsResult,
    specialtiesResult,
    citiesResult,
    reviewsResult,
    recentAppointmentsResult,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("status"),

    supabase
      .from("doctors")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("clinics")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("specialties")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("cities")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("reviews")
      .select("*", {
        count: "exact",
        head: true,
      }),

    supabase
      .from("appointments")
      .select(`
        id,
        patient_name,
        status,
        created_at,
        doctors (
          slug
        )
      `)
      .order("created_at", {
        ascending: false,
      })
      .limit(5),
  ]);

  if (appointmentsResult.error) {
    console.error(
      "Admin overview appointment count query failed:",
      appointmentsResult.error
    );
  }

  if (doctorsResult.error) {
    console.error(
      "Admin overview doctors count query failed:",
      doctorsResult.error
    );
  }

  if (clinicsResult.error) {
    console.error(
      "Admin overview clinics count query failed:",
      clinicsResult.error
    );
  }

  if (specialtiesResult.error) {
    console.error(
      "Admin overview specialties count query failed:",
      specialtiesResult.error
    );
  }

  if (citiesResult.error) {
    console.error(
      "Admin overview cities count query failed:",
      citiesResult.error
    );
  }

  if (reviewsResult.error) {
    console.error(
      "Admin overview reviews count query failed:",
      reviewsResult.error
    );
  }

  if (recentAppointmentsResult.error) {
    console.error(
      "Admin overview recent appointments query failed:",
      recentAppointmentsResult.error
    );
  }

  const appointmentRows =
    (appointmentsResult.data as
      | AppointmentStatusCount[]
      | null) ?? [];

  const totalAppointments =
    appointmentRows.length;

  const pendingAppointments =
    appointmentRows.filter(
      (appointment) =>
        appointment.status === "pending"
    ).length;

  const confirmedAppointments =
    appointmentRows.filter(
      (appointment) =>
        appointment.status === "confirmed"
    ).length;

  const completedAppointments =
    appointmentRows.filter(
      (appointment) =>
        appointment.status === "completed"
    ).length;

  const recentAppointments =
    (recentAppointmentsResult.data as unknown as
      | RecentAppointment[]
      | null) ?? [];

  const cards = [
    {
      label: "Programări totale",
      value: totalAppointments,
      description:
        "Toate cererile și programările înregistrate.",
    },
    {
      label: "În așteptare",
      value: pendingAppointments,
      description:
        "Programări care necesită confirmare.",
    },
    {
      label: "Confirmate",
      value: confirmedAppointments,
      description:
        "Programări confirmate pentru pacienți.",
    },
    {
      label: "Finalizate",
      value: completedAppointments,
      description:
        "Programări marcate ca îndeplinite.",
    },
  ];

  const directoryCards = [
    {
      label: "Medici",
      value: doctorsResult.count ?? 0,
    },
    {
      label: "Clinici",
      value: clinicsResult.count ?? 0,
    },
    {
      label: "Specialități",
      value: specialtiesResult.count ?? 0,
    },
    {
      label: "Orașe",
      value: citiesResult.count ?? 0,
    },
    {
      label: "Recenzii",
      value: reviewsResult.count ?? 0,
    },
  ];

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Panou administrator
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Prezentare generală
            </h1>

            <p className="mt-3 text-gray-600">
              Monitorizează activitatea principală a platformei RomDoc.
            </p>
          </div>

          <Link
            href="/admin/appointments"
            className="w-fit rounded-xl bg-[#D97757] px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Vezi programările
          </Link>
        </header>

        <section className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <p className="text-sm font-medium text-gray-500">
                {card.label}
              </p>

              <p className="mt-3 text-4xl font-bold text-gray-900">
                {card.value}
              </p>

              <p className="mt-3 text-sm leading-6 text-gray-600">
                {card.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-2xl font-bold text-gray-900">
            Director RomDoc
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {directoryCards.map((card) => (
              <article
                key={card.label}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-medium text-gray-500">
                  {card.label}
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {card.value}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Programări recente
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Cele mai recente cinci înregistrări.
              </p>
            </div>

            <Link
              href="/admin/appointments"
              className="text-sm font-medium text-[#9A4F35] underline-offset-4 hover:underline"
            >
              Vezi toate programările
            </Link>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {recentAppointments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Pacient
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Medic
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Creată
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200">
                    {recentAppointments.map(
                      (appointment) => {
                        const doctor =
                          getFirstRelation(
                            appointment.doctors
                          );

                        return (
                          <tr key={appointment.id}>
                            <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-900">
                              {appointment.patient_name}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">
                              {doctor
                                ? formatDoctorName(
                                    doctor.slug
                                  )
                                : "Medic indisponibil"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
                                  appointment.status
                                )}`}
                              >
                                {getStatusLabel(
                                  appointment.status
                                )}
                              </span>
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                              {formatCreatedAt(
                                appointment.created_at
                              )}
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-gray-600">
                Nu există încă programări.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}