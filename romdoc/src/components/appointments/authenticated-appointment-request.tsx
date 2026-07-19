import AppointmentRequestForm from "@/components/appointments/appointment-request-form";
import PreAuthAppointmentRequest from "@/components/appointments/pre-auth-appointment-request";
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
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser();

  if (!user) {
    return (
      <PreAuthAppointmentRequest
        doctorId={
          doctorId
        }
        doctorName={
          doctorName
        }
        doctorSlug={
          doctorSlug
        }
        clinics={
          clinics
        }
      />
    );
  }

  if (
    !user.email_confirmed_at
  ) {
    return (
      <section className="romdoc-notice romdoc-notice-warning p-[21px]">
        <h2 className="text-xl font-bold">
          Verifică adresa de e-mail
        </h2>

        <p className="mt-[8px] leading-7">
          Trebuie să confirmi adresa de e-mail înainte de a solicita programarea. După confirmare vei reveni la acest profil, iar clinica, data și ora selectate vor fi restaurate automat.
        </p>
      </section>
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
  } = await supabase
    .from(
      "profiles"
    )
    .select(
      "role, first_name, last_name"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError
  ) {
    console.error(
      "Patient appointment profile lookup failed:",
      profileError
    );

    return (
      <div className="romdoc-notice romdoc-notice-danger">
        Contul nu a putut fi verificat.
      </div>
    );
  }

  if (
    !profile ||
    ![
      "patient",
      "user",
    ].includes(
      profile.role
    )
  ) {
    return (
      <section className="romdoc-notice romdoc-notice-warning p-[21px]">
        <h2 className="text-xl font-bold">
          Cont incompatibil
        </h2>

        <p className="mt-[8px] leading-7">
          Conturile de medic, administrator sau personal clinică nu pot solicita programări ca Patient.
        </p>
      </section>
    );
  }

  const patientName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();

  return (
    <AppointmentRequestForm
      doctorId={
        doctorId
      }
      doctorName={
        doctorName
      }
      doctorSlug={
        doctorSlug
      }
      clinics={
        clinics
      }
      initialPatientName={
        patientName
      }
      authenticatedEmail={
        user.email ??
        ""
      }
    />
  );
}
