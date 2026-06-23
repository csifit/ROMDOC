import type {
  SupabaseClient,
} from "@supabase/supabase-js";

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
  status:
    | 401
    | 403
    | 404
    | 500;
  error: string;
};

export type AppointmentAccessResult =
  | AppointmentAccessSuccess
  | AppointmentAccessFailure;

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
      error:
        "Trebuie să fii autentificat.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "id, role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      authorized: false,
      status: 500,
      error:
        "Rolul utilizatorului nu a putut fi verificat.",
    };
  }

  if (
    !profile ||
    profile.account_status !== "active"
  ) {
    return {
      authorized: false,
      status: 403,
      error:
        "Profilul utilizatorului nu este activ.",
    };
  }

  const role =
    profile.role as RomDocRole;

  if (
    ![
      "patient",
      "doctor",
      "staff",
      "admin",
    ].includes(role)
  ) {
    return {
      authorized: false,
      status: 403,
      error:
        "Rolul utilizatorului nu este valid.",
    };
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await supabase
    .from("appointments")
    .select(
      "id, doctor_id, clinic_id, status"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError) {
    return {
      authorized: false,
      status: 500,
      error:
        "Programarea nu a putut fi verificată.",
    };
  }

  if (!appointment) {
    return {
      authorized: false,
      status: 404,
      error:
        "Programarea nu a fost găsită.",
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
    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (doctorError || !doctor) {
      return {
        authorized: false,
        status: 403,
        error:
          "Contul tău nu este asociat unui profil de medic.",
      };
    }

    if (
      doctor.id !==
      appointment.doctor_id
    ) {
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
    if (!appointment.clinic_id) {
      return {
        authorized: false,
        status: 403,
        error:
          "Programarea nu este asociată unei clinici.",
      };
    }

    const {
      data: isAssigned,
      error: assignmentError,
    } = await supabase.rpc(
      "is_staff_for_doctor_clinic",
      {
        requested_staff_profile_id:
          user.id,
        requested_doctor_id:
          appointment.doctor_id,
        requested_clinic_id:
          appointment.clinic_id,
      }
    );

    if (
      assignmentError ||
      !isAssigned
    ) {
      return {
        authorized: false,
        status: 403,
        error:
          "Nu ai acces la această programare.",
      };
    }

    return {
      authorized: true,
      userId: user.id,
      role,
      appointment,
    };
  }

  return {
    authorized: false,
    status: 403,
    error:
      "Pacienții nu pot modifica starea administrativă a programărilor.",
  };
}
