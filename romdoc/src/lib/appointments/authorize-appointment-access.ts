import type { SupabaseClient } from "@supabase/supabase-js";

export type RomDocRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin";

type AppointmentAccessSuccess = {
  authorized: true;
  userId: string;
  role: RomDocRole;
  appointment: {
    id: string;
    doctor_id: string;
    clinic_id: string | null;
    status: string;
  };
};

type AppointmentAccessFailure = {
  authorized: false;
  status: 401 | 403 | 404 | 500;
  error: string;
};

export type AppointmentAccessResult =
  | AppointmentAccessSuccess
  | AppointmentAccessFailure;

/**
 * Verifies whether the currently authenticated user may manage
 * a specific RomDoc appointment.
 *
 * Permission rules:
 *
 * admin:
 * - May manage any appointment.
 *
 * doctor:
 * - May manage only appointments whose doctor_id belongs to the
 *   doctor record connected through doctors.profile_id.
 *
 * staff:
 * - Denied temporarily until clinic staff ownership tables are added.
 *
 * patient:
 * - May not manage appointments.
 */
export async function authorizeAppointmentAccess(
  supabase: SupabaseClient,
  appointmentId: string
): Promise<AppointmentAccessResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      authorized: false,
      status: 401,
      error: "Trebuie să fii autentificat.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Appointment authorization profile lookup failed:",
      profileError
    );

    return {
      authorized: false,
      status: 500,
      error: "Rolul utilizatorului nu a putut fi verificat.",
    };
  }

  if (!profile) {
    return {
      authorized: false,
      status: 403,
      error: "Profilul utilizatorului nu este configurat.",
    };
  }

  const role = profile.role as RomDocRole;

  if (
    role !== "patient" &&
    role !== "doctor" &&
    role !== "staff" &&
    role !== "admin"
  ) {
    return {
      authorized: false,
      status: 403,
      error: "Rolul utilizatorului nu este valid.",
    };
  }

  const { data: appointment, error: appointmentError } =
    await supabase
      .from("appointments")
      .select("id, doctor_id, clinic_id, status")
      .eq("id", appointmentId)
      .maybeSingle();

  if (appointmentError) {
    console.error(
      "Appointment authorization appointment lookup failed:",
      appointmentError
    );

    return {
      authorized: false,
      status: 500,
      error: "Programarea nu a putut fi verificată.",
    };
  }

  if (!appointment) {
    return {
      authorized: false,
      status: 404,
      error: "Programarea nu a fost găsită.",
    };
  }

  if (role === "admin") {
    return {
      authorized: true,
      userId: user.id,
      role,
      appointment,
    };
  }

  if (role === "doctor") {
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (doctorError) {
      console.error(
        "Appointment authorization doctor lookup failed:",
        doctorError
      );

      return {
        authorized: false,
        status: 500,
        error: "Contul medicului nu a putut fi verificat.",
      };
    }

    if (!doctor) {
      return {
        authorized: false,
        status: 403,
        error:
          "Contul tău nu este asociat unui profil de medic.",
      };
    }

    if (doctor.id !== appointment.doctor_id) {
      return {
        authorized: false,
        status: 403,
        error:
          "Nu ai permisiunea de a gestiona această programare.",
      };
    }

    return {
      authorized: true,
      userId: user.id,
      role,
      appointment,
    };
  }

  if (role === "staff") {
    return {
      authorized: false,
      status: 403,
      error:
        "Accesul personalului clinicii va fi activat după configurarea asocierilor cu clinicile.",
    };
  }

  return {
    authorized: false,
    status: 403,
    error:
      "Pacienții nu pot modifica starea administrativă a programărilor.",
  };
}