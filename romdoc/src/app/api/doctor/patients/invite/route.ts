import {
  createHash,
  randomBytes,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  sendPatientRegistrationInvite,
} from "@/lib/patients/send-patient-registration-invite";
import {
  createClient,
} from "@/lib/supabase/server";

type InviteBody = {
  patientId?: unknown;
  locale?: unknown;
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

function doctorDisplayName(
  firstName:
    | string
    | null,
  lastName:
    | string
    | null
) {
  const name =
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name
    ? `Dr. ${name}`
    : "RomDoc";
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        InviteBody;

    const patientId =
      cleanText(
        body.patientId,
        64
      );

    const locale =
      normalizeAppLocale(
        typeof body.locale ===
          "string"
          ? body.locale
          : null
      );

    if (
      !isUuid(
        patientId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Pacientul selectat nu este valid.",
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
          "role, account_status, first_name, last_name"
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
            "Doar medicii cu un cont activ pot trimite invitații.",
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

    const {
      data:
        patient,
      error:
        patientError,
    } =
      await supabase
        .from(
          "doctor_patients"
        )
        .select(
          "id, doctor_id, display_name, email, patient_profile_id, archived_at"
        )
        .eq(
          "id",
          patientId
        )
        .eq(
          "doctor_id",
          doctor.id
        )
        .is(
          "archived_at",
          null
        )
        .maybeSingle();

    if (
      patientError ||
      !patient
    ) {
      return NextResponse.json(
        {
          error:
            "Pacientul nu a fost găsit în baza ta de pacienți.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      patient.patient_profile_id
    ) {
      return NextResponse.json(
        {
          error:
            "Pacientul are deja un cont RomDoc asociat.",
        },
        {
          status: 409,
        }
      );
    }

    const email =
      patient.email
        ?.trim()
        .toLowerCase() ??
      "";

    if (
      !email
    ) {
      return NextResponse.json(
        {
          error:
            "Adaugă o adresă de e-mail înainte de a trimite invitația.",
        },
        {
          status: 400,
        }
      );
    }

    const inviteToken =
      randomBytes(
        32
      ).toString(
        "base64url"
      );

    const tokenHash =
      createHash(
        "sha256"
      )
        .update(
          inviteToken
        )
        .digest(
          "hex"
        );

    const expiresAt =
      new Date(
        Date.now() +
          7 *
            24 *
            60 *
            60 *
            1000
      ).toISOString();

    const {
      error:
        tokenError,
    } =
      await supabase
        .rpc(
          "store_doctor_patient_invite",
          {
            target_doctor_patient_id:
              patient.id,
            target_token_hash:
              tokenHash,
            target_expires_at:
              expiresAt,
          }
        );

    if (
      tokenError
    ) {
      console.error(
        "Doctor patient invite token storage failed:",
        tokenError
      );

      return NextResponse.json(
        {
          error:
            "Invitația nu a putut fi pregătită.",
        },
        {
          status: 400,
        }
      );
    }

    const emailResult =
      await sendPatientRegistrationInvite({
        patientName:
          patient.display_name,
        patientEmail:
          email,
        doctorName:
          doctorDisplayName(
            profile.first_name,
            profile.last_name
          ),
        locale,
        inviteToken,
      });

    if (
      !emailResult.sent
    ) {
      console.error(
        "Doctor patient invite email failed:",
        emailResult
      );

      return NextResponse.json(
        {
          error:
            emailResult.skipped
              ? "Serviciul de e-mail nu este configurat."
              : "Invitația nu a putut fi trimisă prin e-mail.",
        },
        {
          status: 502,
        }
      );
    }

    const {
      error:
        markSentError,
    } =
      await supabase
        .rpc(
          "mark_doctor_patient_invite_sent",
          {
            target_doctor_patient_id:
              patient.id,
          }
        );

    if (
      markSentError
    ) {
      console.error(
        "Patient invite was sent but could not be marked as sent:",
        markSentError
      );
    }

    return NextResponse.json(
      {
        success: true,
        sent: true,
        expiresAt,
      }
    );
  } catch (error) {
    console.error(
      "Doctor patient invite API failed:",
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
