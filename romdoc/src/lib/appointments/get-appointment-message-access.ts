import type {
  SupabaseClient,
} from "@supabase/supabase-js";

export type MessageAccessProfile = {
  id: string;
  role: string;
  account_status: string | null;
  first_name: string | null;
  last_name: string | null;
};

export type MessageAccessAppointment = {
  id: string;
  doctor_id: string;
  clinic_id: string | null;
  patient_profile_id: string | null;
  status: string;
};

export type AppointmentMessageAccess = {
  userId: string;
  profile: MessageAccessProfile;
  appointment: MessageAccessAppointment;
};

type AccessResult =
  | {
      access: AppointmentMessageAccess;
      error: null;
      status: 200;
    }
  | {
      access: null;
      error: string;
      status: 400 | 401 | 403 | 404;
    };

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function staffCanAccessAppointment({
  admin,
  staffProfileId,
  doctorId,
  clinicId,
}: {
  admin: SupabaseClient;
  staffProfileId: string;
  doctorId: string;
  clinicId: string | null;
}) {
  let query = admin
    .from("doctor_staff")
    .select("id, clinic_id")
    .eq(
      "staff_profile_id",
      staffProfileId
    )
    .eq(
      "doctor_id",
      doctorId
    )
    .eq(
      "status",
      "active"
    );

  if (clinicId) {
    query = query.or(
      `clinic_id.eq.${clinicId},clinic_id.is.null`
    );
  } else {
    query = query.is(
      "clinic_id",
      null
    );
  }

  const {
    data,
    error,
  } = await query
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Appointment messaging Staff access lookup failed:",
      error
    );
  }

  return Boolean(data) && !error;
}

export async function getAppointmentMessageAccess({
  supabase,
  admin,
  appointmentId,
}: {
  supabase: SupabaseClient;
  admin: SupabaseClient;
  appointmentId: string;
}): Promise<AccessResult> {
  if (!isUuid(appointmentId)) {
    return {
      access: null,
      error:
        "Identificatorul programării nu este valid.",
      status: 400,
    };
  }

  const {
    data: {
      user,
    },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      access: null,
      error:
        "Trebuie să fii autentificat.",
      status: 401,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id, role, account_status, first_name, last_name"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    return {
      access: null,
      error:
        "Profilul utilizatorului nu a putut fi verificat.",
      status: 403,
    };
  }

  const typedProfile =
    profile as MessageAccessProfile;

  if (
    typedProfile.account_status &&
    typedProfile.account_status !==
      "active"
  ) {
    return {
      access: null,
      error:
        "Contul nu este activ.",
      status: 403,
    };
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, doctor_id, clinic_id, patient_profile_id, status"
    )
    .eq(
      "id",
      appointmentId
    )
    .maybeSingle();

  if (
    appointmentError ||
    !appointment
  ) {
    return {
      access: null,
      error:
        "Programarea nu a fost găsită.",
      status: 404,
    };
  }

  const typedAppointment =
    appointment as MessageAccessAppointment;

  let hasAccess =
    typedProfile.role ===
      "patient" &&
    typedAppointment.patient_profile_id ===
      user.id;

  if (
    !hasAccess &&
    typedProfile.role ===
      "doctor"
  ) {
    const {
      data: doctor,
      error: doctorError,
    } = await admin
      .from("doctors")
      .select(
        "id, profile_id"
      )
      .eq(
        "id",
        typedAppointment.doctor_id
      )
      .maybeSingle();

    if (doctorError) {
      console.error(
        "Appointment messaging Doctor access lookup failed:",
        doctorError
      );
    }

    hasAccess =
      Boolean(doctor) &&
      doctor?.profile_id ===
        user.id;
  }

  if (
    !hasAccess &&
    typedProfile.role ===
      "staff"
  ) {
    hasAccess =
      await staffCanAccessAppointment({
        admin,
        staffProfileId:
          user.id,
        doctorId:
          typedAppointment.doctor_id,
        clinicId:
          typedAppointment.clinic_id,
      });
  }

  if (!hasAccess) {
    return {
      access: null,
      error:
        "Nu ai acces la mesajele acestei programări.",
      status: 403,
    };
  }

  return {
    access: {
      userId:
        user.id,
      profile:
        typedProfile,
      appointment:
        typedAppointment,
    },
    error: null,
    status: 200,
  };
}

export function canSendAppointmentMessage(
  status: string
) {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
    "cancelled",
    "no_show",
  ].includes(status);
}
