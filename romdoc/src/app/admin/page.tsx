import Link from "next/link";
import {
  redirect,
} from "next/navigation";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type PendingClinic = {
  id: string;
  slug: string;
  formatted_address:
    | string
    | null;

  created_at: string;

  clinic_translations:
    | {
        locale: string;
        name: string;
      }[]
    | null;
};

type RecentDoctor = {
  id: string;
  slug: string;
  status: string;
  created_at: string;
};

type MetricCardProps = {
  label: string;
  value: number;
  description: string;
  href?: string;
  attention?: boolean;
};

function MetricCard({
  label,
  value,
  description,
  href,
  attention = false,
}: MetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-semibold text-gray-600">
          {label}
        </p>

        {attention &&
          value > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
              Necesită atenție
            </span>
          )}
      </div>

      <p className="mt-4 text-4xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#D97757]/40 hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {content}
    </div>
  );
}

function getClinicName(
  clinic: PendingClinic
) {
  return (
    clinic.clinic_translations
      ?.find(
        (translation) =>
          translation.locale ===
          "ro"
      )?.name ??
    clinic.clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function formatDoctorName(
  slug: string
) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

export default async function AdminPage() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/admin"
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin"
  ) {
    redirect("/dashboard");
  }

  const admin =
    createAdminClient();

  const [
    doctorsCountResult,
    activeDoctorsCountResult,
    pendingClinicsCountResult,
    approvedClinicsCountResult,
    pendingAppointmentsCountResult,
    activeStaffCountResult,
    patientsCountResult,
    recentPendingClinicsResult,
    recentDoctorsResult,
  ] = await Promise.all([
    admin
      .from("doctors")
      .select("*", {
        count: "exact",
        head: true,
      }),

    admin
      .from("doctors")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "active"
      ),

    admin
      .from("clinics")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "pending"
      ),

    admin
      .from("clinics")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "approved"
      ),

    admin
      .from("appointments")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "pending"
      ),

    admin
      .from("doctor_staff")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "status",
        "active"
      ),

    admin
      .from("profiles")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "role",
        "patient"
      ),

    admin
      .from("clinics")
      .select(`
        id,
        slug,
        formatted_address,
        created_at,
        clinic_translations (
          locale,
          name
        )
      `)
      .eq(
        "status",
        "pending"
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(5),

    admin
      .from("doctors")
      .select(`
        id,
        slug,
        status,
        created_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        }
      )
      .limit(5),
  ]);

  const totalDoctors =
    doctorsCountResult.count ??
    0;

  const activeDoctors =
    activeDoctorsCountResult.count ??
    0;

  const pendingClinics =
    pendingClinicsCountResult.count ??
    0;

  const approvedClinics =
    approvedClinicsCountResult.count ??
    0;

  const pendingAppointments =
    pendingAppointmentsCountResult.count ??
    0;

  const activeStaff =
    activeStaffCountResult.count ??
    0;

  const patients =
    patientsCountResult.count ??
    0;

  const recentPendingClinics =
    (
      recentPendingClinicsResult.data ??
      []
    ) as PendingClinic[];

  const recentDoctors =
    (
      recentDoctorsResult.data ??
      []
    ) as RecentDoctor[];

  const adminName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="space-y-10">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Panou administrator
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">
          Bun venit
          {adminName
            ? `, ${adminName}`
            : ""}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Urmărește activitatea platformei, aprobă clinicile și
          gestionează elementele care necesită intervenție
          administrativă.
        </p>
      </header>

      <section>
        <h2 className="text-xl font-bold text-gray-900">
          Situația platformei
        </h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Total medici"
            value={totalDoctors}
            description="Toate profilurile de medici create în RomDoc."
            href="/admin/doctors"
          />

          <MetricCard
            label="Medici activi"
            value={activeDoctors}
            description="Medici cu acces activ la platformă."
            href="/admin/doctors"
          />

          <MetricCard
            label="Clinici în așteptare"
            value={pendingClinics}
            description="Propuneri care trebuie verificate și moderate."
            href="/admin/clinics"
            attention
          />

          <MetricCard
            label="Clinici aprobate"
            value={approvedClinics}
            description="Clinici comune disponibile medicilor RomDoc."
            href="/admin/clinics"
          />

          <MetricCard
            label="Programări în așteptare"
            value={pendingAppointments}
            description="Acces excepțional pentru situații de suport."
            href="/admin/appointments"
            attention
          />

          <MetricCard
            label="Personal activ"
            value={activeStaff}
            description="Atribuiri active între personal, medic și clinică."
          />

          <MetricCard
            label="Pacienți"
            value={patients}
            description="Conturi de pacienți înregistrate în platformă."
          />

          <MetricCard
            label="Elemente urgente"
            value={
              pendingClinics +
              pendingAppointments
            }
            description="Clinici și programări care pot necesita atenție."
            attention
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Clinici care necesită aprobare
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Cele mai recente propuneri.
              </p>
            </div>

            <Link
              href="/admin/clinics"
              className="text-sm font-semibold text-[#9A4F35] hover:underline"
            >
              Vezi toate
            </Link>
          </div>

          {recentPendingClinics.length ===
          0 ? (
            <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
              Nu există clinici care așteaptă aprobarea.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-gray-200">
              {recentPendingClinics.map(
                (clinic) => (
                  <Link
                    key={clinic.id}
                    href="/admin/clinics"
                    className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {getClinicName(
                          clinic
                        )}
                      </p>

                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {clinic.formatted_address ??
                          "Adresă indisponibilă"}
                      </p>
                    </div>

                    <span className="shrink-0 text-xs text-gray-500">
                      {formatDate(
                        clinic.created_at
                      )}
                    </span>
                  </Link>
                )
              )}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Medici recenți
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Cele mai noi profiluri de medici.
              </p>
            </div>

            <Link
              href="/admin/doctors"
              className="text-sm font-semibold text-[#9A4F35] hover:underline"
            >
              Vezi toți
            </Link>
          </div>

          {recentDoctors.length ===
          0 ? (
            <p className="mt-6 rounded-xl bg-gray-50 p-5 text-sm text-gray-600">
              Nu există medici înregistrați.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-gray-200">
              {recentDoctors.map(
                (doctor) => (
                  <div
                    key={doctor.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">
                        {formatDoctorName(
                          doctor.slug
                        )}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Creat la{" "}
                        {formatDate(
                          doctor.created_at
                        )}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        doctor.status ===
                        "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-900"
                      }`}
                    >
                      {doctor.status ===
                      "active"
                        ? "Activ"
                        : "În așteptare"}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-bold text-amber-950">
          Acces excepțional la programări
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
          Programările sunt gestionate în mod normal de medic și
          personalul său. Administratorul poate deschide lista globală
          numai pentru suport, investigații sau situații excepționale.
        </p>

        <Link
          href="/admin/appointments"
          className="mt-4 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          Deschide programările
        </Link>
      </section>
    </div>
  );
}