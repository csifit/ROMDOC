import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type SyncPatientBody = {
  appointmentId?: unknown;
};

function cleanText(
  value: unknown,
  maximumLength: number
) {
  return typeof value === "string"
    ? value.trim().slice(
        0,
        maximumLength
      )
    : "";
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        SyncPatientBody;

    const appointmentId =
      cleanText(
        body.appointmentId,
        64
      );

    if (
      !isUuid(
        appointmentId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Programarea selectată nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase =
      await createClient();

    const {
      data: {
        user,
      },
      error:
        userError,
    } =
      await supabase.auth
        .getUser();

    if (
      userError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data:
        profile,
      error:
        profileError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(
          "role, account_status"
        )
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      profileError ||
      profile?.role !==
        "doctor" ||
      profile.account_status !==
        "active"
    ) {
      return NextResponse.json(
        {
          error:
            "Doar medicii cu un cont activ pot sincroniza pacienți.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data:
        doctor,
      error:
        doctorError,
    } =
      await supabase
        .from(
          "doctors"
        )
        .select(
          "id"
        )
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle();

    if (
      doctorError ||
      !doctor
    ) {
      return NextResponse.json(
        {
          error:
            "Profilul medicului nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data:
        appointment,
      error:
        appointmentError,
    } =
      await admin
        .from(
          "appointments"
        )
        .select(`
          id,
          doctor_id,
          patient_profile_id,
          patient_name,
          patient_email,
          patient_phone
        `)
        .eq(
          "id",
          appointmentId
        )
        .eq(
          "doctor_id",
          doctor.id
        )
        .maybeSingle();

    if (
      appointmentError ||
      !appointment
    ) {
      return NextResponse.json(
        {
          error:
            "Programarea nu a fost găsită.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !appointment.patient_email?.trim() &&
      !appointment.patient_phone?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Pacientul nu are încă e-mail sau telefon pentru baza de pacienți.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      error:
        syncError,
    } =
      await admin
        .from(
          "appointments"
        )
        .update({
          patient_profile_id:
            appointment.patient_profile_id,
          patient_name:
            appointment.patient_name,
          patient_email:
            appointment.patient_email,
          patient_phone:
            appointment.patient_phone,
        })
        .eq(
          "id",
          appointment.id
        )
        .eq(
          "doctor_id",
          doctor.id
        );

    if (
      syncError
    ) {
      console.error(
        "Doctor appointment patient synchronization failed:",
        syncError
      );

      return NextResponse.json(
        {
          error:
            "Pacientul nu a putut fi sincronizat.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      appointmentId:
        appointment.id,
    });
  } catch (error) {
    console.error(
      "Doctor patient synchronization API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}
