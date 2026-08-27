import {
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type AddPatientBody = {
  displayName?: unknown;
  email?: unknown;
  phone?: unknown;
};

function cleanText(
  value: unknown,
  maximumLength: number
) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        AddPatientBody;

    const displayName =
      cleanText(
        body.displayName,
        200
      );

    const email =
      normalizeEmail(
        cleanText(
          body.email,
          320
        )
      );

    const phone =
      cleanText(
        body.phone,
        50
      );

    const normalizedPhone =
      normalizePhone(phone);

    if (
      displayName.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Introdu un nume valid pentru pacient.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !email &&
      normalizedPhone.length < 7
    ) {
      return NextResponse.json(
        {
          error:
            "Introdu o adresă de e-mail sau un număr de telefon valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      email &&
      !isValidEmail(email)
    ) {
      return NextResponse.json(
        {
          error:
            "Adresa de e-mail nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      phone &&
      normalizedPhone.length < 7
    ) {
      return NextResponse.json(
        {
          error:
            "Numărul de telefon nu este valid.",
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
            "Doar medicii cu un cont activ pot adăuga pacienți.",
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
        existingRows,
      error:
        existingError,
    } =
      await supabase
        .from(
          "doctor_patients"
        )
        .select(
          "id, display_name, email, phone"
        )
        .eq(
          "doctor_id",
          doctor.id
        )
        .limit(5000);

    if (existingError) {
      console.error(
        "Doctor patient duplicate lookup failed:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "Lista pacienților nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    const normalizedName =
      displayName.toLowerCase();

    const duplicate =
      (
        existingRows ??
        []
      ).some(
        (
          patient
        ) => {
          if (
            patient.display_name
              .trim()
              .toLowerCase() !==
            normalizedName
          ) {
            return false;
          }

          const sameEmail =
            Boolean(
              email &&
              patient.email &&
              patient.email
                .trim()
                .toLowerCase() ===
                email
            );

          const samePhone =
            Boolean(
              normalizedPhone &&
              patient.phone &&
              normalizePhone(
                patient.phone
              ) ===
                normalizedPhone
            );

          return (
            sameEmail ||
            samePhone
          );
        }
      );

    if (duplicate) {
      return NextResponse.json(
        {
          error:
            "Acest pacient există deja în baza ta de pacienți.",
        },
        {
          status: 409,
        }
      );
    }

    const {
      data:
        patient,
      error:
        insertError,
    } =
      await supabase
        .from(
          "doctor_patients"
        )
        .insert({
          doctor_id:
            doctor.id,
          patient_profile_id:
            null,
          display_name:
            displayName,
          email:
            email ||
            null,
          phone:
            phone ||
            null,
          source:
            "manual",
          created_by_profile_id:
            user.id,
        })
        .select(
          "id, display_name, email, phone, patient_profile_id, source, created_at"
        )
        .single();

    if (insertError) {
      console.error(
        "Doctor patient insert failed:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Pacientul nu a putut fi adăugat.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        patient,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Doctor patient API failed:",
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
