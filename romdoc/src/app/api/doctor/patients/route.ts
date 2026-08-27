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

type UpdatePatientBody = {
  patientId?: unknown;
  displayName?: unknown;
  email?: unknown;
  phone?: unknown;
  addressLine1?: unknown;
  addressLine2?: unknown;
  city?: unknown;
  county?: unknown;
  postalCode?: unknown;
  country?: unknown;
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

function normalizeEmail(
  value: string
) {
  return value
    .trim()
    .toLowerCase();
}

function normalizePhone(
  value: string
) {
  return value.replace(
    /\D/g,
    ""
  );
}

function isValidEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function requireActiveDoctor() {
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
    return {
      supabase: null,
      user: null,
      doctor: null,
      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          {
            status: 401,
          }
        ),
    };
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
    return {
      supabase: null,
      user: null,
      doctor: null,
      response:
        NextResponse.json(
          {
            error:
              "Doar medicii cu un cont activ pot administra baza de pacienți.",
          },
          {
            status: 403,
          }
        ),
    };
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
    return {
      supabase: null,
      user: null,
      doctor: null,
      response:
        NextResponse.json(
          {
            error:
              "Profilul medicului nu a putut fi verificat.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    supabase,
    user,
    doctor,
    response: null,
  };
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
      normalizedPhone.length <
        7
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
      normalizedPhone.length <
        7
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

    const authorization =
      await requireActiveDoctor();

    if (
      authorization.response
    ) {
      return authorization.response;
    }

    const {
      supabase,
      user,
      doctor,
    } =
      authorization;

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
        .is(
          "archived_at",
          null
        )
        .limit(
          5000
        );

    if (
      existingError
    ) {
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

    if (
      duplicate
    ) {
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

    if (
      insertError
    ) {
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
      "Doctor patient create API failed:",
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

export async function PATCH(
  request: Request
) {
  try {
    const body =
      (await request.json()) as
        UpdatePatientBody;

    const patientId =
      cleanText(
        body.patientId,
        64
      );

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

    const addressLine1 =
      cleanText(
        body.addressLine1,
        300
      );

    const addressLine2 =
      cleanText(
        body.addressLine2,
        300
      );

    const city =
      cleanText(
        body.city,
        150
      );

    const county =
      cleanText(
        body.county,
        150
      );

    const postalCode =
      cleanText(
        body.postalCode,
        30
      );

    const country =
      cleanText(
        body.country,
        100
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
      normalizePhone(
        phone
      ).length <
        7
    ) {
      return NextResponse.json(
        {
          error:
            "Introdu cel puțin o adresă de e-mail sau un număr de telefon valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      email &&
      !isValidEmail(
        email
      )
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
      normalizePhone(
        phone
      ).length <
        7
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

    const authorization =
      await requireActiveDoctor();

    if (
      authorization.response
    ) {
      return authorization.response;
    }

    const {
      data:
        updatedPatientId,
      error:
        updateError,
    } =
      await authorization
        .supabase
        .rpc(
          "update_doctor_patient_contact_details",
          {
            target_doctor_patient_id:
              patientId,
            target_display_name:
              displayName,
            target_email:
              email ||
              null,
            target_phone:
              phone ||
              null,
            target_address_line_1:
              addressLine1 ||
              null,
            target_address_line_2:
              addressLine2 ||
              null,
            target_city:
              city ||
              null,
            target_county:
              county ||
              null,
            target_postal_code:
              postalCode ||
              null,
            target_country:
              country ||
              null,
          }
        );

    if (
      updateError
    ) {
      console.error(
        "Doctor patient contact update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Datele pacientului nu au putut fi actualizate.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        patientId:
          updatedPatientId,
      }
    );
  } catch (error) {
    console.error(
      "Doctor patient update API failed:",
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
