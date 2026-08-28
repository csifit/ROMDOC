import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DoctorProfileRequestBody = {
  publicName?: string | null;
  phone?: string | null;
  email?: string | null;
  yearsExperience?: number | null;
  consultationPrice?: number | null;
  titleRo?: string | null;
  biographyRo?: string | null;
};

function normalizeOptionalText(
  value: unknown
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function slugifyDoctorName(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(/ß/g, "ss")
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

async function getAvailableDoctorSlug({
  supabase,
  doctorId,
  publicName,
}: {
  supabase: Awaited<
    ReturnType<typeof createClient>
  >;
  doctorId: string;
  publicName: string;
}) {
  const baseSlug =
    slugifyDoctorName(
      publicName
    ) || "doctor";

  for (
    let suffix = 1;
    suffix <= 1000;
    suffix += 1
  ) {
    const candidate =
      suffix === 1
        ? baseSlug
        : `${baseSlug}-${suffix}`;

    const {
      data,
      error,
    } = await supabase
      .from("doctors")
      .select("id")
      .eq(
        "slug",
        candidate
      )
      .neq(
        "id",
        doctorId
      )
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return candidate;
    }
  }

  throw new Error(
    "Nu a putut fi generată o adresă publică unică pentru medic."
  );
}

async function getAuthenticatedDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json(
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
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Doctor profile API role lookup failed:",
      profileError
    );

    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Rolul utilizatorului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!profile || profile.role !== "doctor") {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Doar medicii își pot modifica profilul.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id, slug, public_name, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor profile API doctor lookup failed:",
      doctorError
    );

    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Profilul medicului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      ),
    };
  }

  if (!doctor) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Contul nu este asociat unui profil de medic.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    supabase,
    doctor,
    errorResponse: null,
  };
}

export async function PATCH(
  request: Request
) {
  try {
    const body =
      (await request.json()) as DoctorProfileRequestBody;

    const publicName =
      normalizeOptionalText(
        body.publicName
      );

    const phone =
      normalizeOptionalText(body.phone);

    const email =
      normalizeOptionalText(body.email)
        ?.toLowerCase() ?? null;

    const titleRo =
      normalizeOptionalText(body.titleRo);

    const biographyRo =
      normalizeOptionalText(
        body.biographyRo
      );

    const yearsExperience =
      body.yearsExperience === null ||
      body.yearsExperience === undefined
        ? null
        : Number(body.yearsExperience);

    const consultationPrice =
      body.consultationPrice === null ||
      body.consultationPrice === undefined
        ? null
        : Number(body.consultationPrice);

    if (
      !publicName ||
      publicName.length < 2 ||
      publicName.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "Numele public trebuie să conțină între 2 și 200 de caractere.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      phone &&
      phone.length < 7
    ) {
      return NextResponse.json(
        {
          error:
            "Numărul de telefon trebuie să conțină cel puțin 7 caractere.",
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
      yearsExperience !== null &&
      (
        !Number.isInteger(
          yearsExperience
        ) ||
        yearsExperience < 0 ||
        yearsExperience > 80
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Experiența trebuie să fie un număr întreg între 0 și 80.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      consultationPrice !== null &&
      (
        !Number.isFinite(
          consultationPrice
        ) ||
        consultationPrice < 0 ||
        consultationPrice > 100000
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Prețul consultației nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      titleRo &&
      titleRo.length > 200
    ) {
      return NextResponse.json(
        {
          error:
            "Titlul profesional este prea lung.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      biographyRo &&
      biographyRo.length > 10000
    ) {
      return NextResponse.json(
        {
          error:
            "Biografia este prea lungă.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      supabase,
      doctor,
      errorResponse,
    } = await getAuthenticatedDoctor();

    if (errorResponse || !doctor) {
      return errorResponse;
    }

    let nextSlug =
      doctor.slug;

    if (
      publicName !==
      doctor.public_name
    ) {
      try {
        nextSlug =
          await getAvailableDoctorSlug({
            supabase,
            doctorId:
              doctor.id,
            publicName,
          });
      } catch (
        slugError
      ) {
        console.error(
          "Doctor public slug generation failed:",
          slugError
        );

        return NextResponse.json(
          {
            error:
              "Adresa publică a profilului nu a putut fi actualizată.",
          },
          {
            status: 500,
          }
        );
      }
    }

    const {
      error: doctorUpdateError,
    } = await supabase
      .from("doctors")
      .update({
        public_name:
          publicName,
        slug:
          nextSlug,
        phone,
        email,
        years_experience:
          yearsExperience,
        consultation_price:
          consultationPrice,
      })
      .eq("id", doctor.id)
      .eq(
        "profile_id",
        doctor.profile_id
      );

    if (doctorUpdateError) {
      console.error(
        "Doctor profile update failed:",
        doctorUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Datele principale ale profilului nu au putut fi salvate.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: translationError,
    } = await supabase
      .from("doctor_translations")
      .upsert(
        {
          doctor_id: doctor.id,
          locale: "ro",
          title: titleRo,
          biography: biographyRo,
        },
        {
          onConflict:
            "doctor_id,locale",
        }
      );

    if (translationError) {
      console.error(
        "Doctor profile translation update failed:",
        translationError
      );

      return NextResponse.json(
        {
          error:
            "Datele principale au fost salvate, dar titlul și biografia nu au putut fi actualizate.",
          partialSuccess: true,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      slug:
        nextSlug,
    });
  } catch (error) {
    console.error(
      "Doctor profile API failed:",
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