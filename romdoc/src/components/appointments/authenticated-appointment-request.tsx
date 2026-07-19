import {getLocale} from "next-intl/server";

import AppointmentRequestForm from "@/components/appointments/appointment-request-form";
import PreAuthAppointmentRequest from "@/components/appointments/pre-auth-appointment-request";
import {BOOKING_COPY} from "@/lib/appointments/booking-copy";
import {normalizeAppLocale} from "@/lib/i18n/app-locale";
import {createClient} from "@/lib/supabase/server";

type ClinicOption = {
  id: string;
  name: string;
  address: string;
};

type Props = {
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
}: Props) {
  const locale = normalizeAppLocale(await getLocale());
  const copy = BOOKING_COPY[locale].gate;
  const supabase = await createClient();

  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return (
      <PreAuthAppointmentRequest
        doctorId={doctorId}
        doctorName={doctorName}
        doctorSlug={doctorSlug}
        clinics={clinics}
      />
    );
  }

  if (!user.email_confirmed_at) {
    return (
      <section className="romdoc-notice romdoc-notice-warning p-[21px]">
        <h2 className="text-xl font-bold">{copy.verifyEmailTitle}</h2>
        <p className="mt-[8px] leading-7">
          {copy.verifyEmailDescription}
        </p>
      </section>
    );
  }

  const {data: profile, error: profileError} = await supabase
    .from("profiles")
    .select("role, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Patient appointment profile lookup failed:",
      profileError
    );

    return (
      <div className="romdoc-notice romdoc-notice-danger">
        {copy.profileError}
      </div>
    );
  }

  if (!profile || !["patient", "user"].includes(profile.role)) {
    return (
      <section className="romdoc-notice romdoc-notice-warning p-[21px]">
        <h2 className="text-xl font-bold">
          {copy.incompatibleTitle}
        </h2>
        <p className="mt-[8px] leading-7">
          {copy.incompatibleDescription}
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
      doctorSlug={doctorSlug}
      clinics={clinics}
      initialPatientName={patientName}
      authenticatedEmail={user.email ?? ""}
    />
  );
}
