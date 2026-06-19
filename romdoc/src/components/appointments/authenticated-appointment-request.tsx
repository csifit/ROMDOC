import Link from "next/link";
import AppointmentRequestForm from "@/components/appointments/appointment-request-form";
import { createClient } from "@/lib/supabase/server";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type AuthenticatedAppointmentRequestProps = {
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  clinics: ClinicOption[];
};

export default async function AuthenticatedAppointmentRequest({
  doctorId,
  doctorName,
  doctorSlug,
  clinics,
}: AuthenticatedAppointmentRequestProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginPath =
      `/login?next=${encodeURIComponent(
        `/doctor/${doctorSlug}`
      )}`;

    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-gray-500">
          Programare online
        </p>

        <h2 className="mt-2 text-2xl font-bold text-gray-900">
          Autentificare necesară
        </h2>

        <p className="mt-3 leading-7 text-gray-600">
          Pentru protejarea programărilor și pentru
          accesul ulterior la istoricul medical, trebuie
          să fii autentificat înainte de a solicita o
          programare.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={loginPath}
            className="rounded-xl bg-[#D97757] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Autentificare
          </Link>

          <Link
            href="/register"
            className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
          >
            Creează cont
          </Link>
        </div>
      </section>
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-bold">
          Verifică adresa de e-mail
        </h2>

        <p className="mt-3 leading-7">
          Trebuie să confirmi adresa de e-mail înainte
          de a solicita o programare. Deschide mesajul
          trimis de RomDoc și apasă linkul de confirmare.
        </p>
      </section>
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Patient appointment profile lookup failed:",
      profileError
    );

    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        Contul nu a putut fi verificat.
      </div>
    );
  }

  if (
    !profile ||
    !["patient", "user"].includes(
      profile.role
    )
  ) {
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h2 className="text-xl font-bold">
          Cont incompatibil
        </h2>

        <p className="mt-3 leading-7">
          Conturile de medic, administrator sau personal
          clinică nu pot solicita programări ca pacient.
        </p>
      </section>
    );
  }

  const patientName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <AppointmentRequestForm
      doctorId={doctorId}
      doctorName={doctorName}
      clinics={clinics}
      initialPatientName={patientName}
      authenticatedEmail={user.email ?? ""}
    />
  );
}