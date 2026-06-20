import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";
import {
  createSpecialtySlug,
} from "@/lib/specialties/create-specialty-slug";

export const runtime = "nodejs";

type AdminAuthorizationResult =
  | {
      profileId: string;
      response: null;
    }
  | {
      profileId: null;
      response: NextResponse;
    };

type SpecialtyRequestBody = {
  specialtyId?: unknown;
  slug?: unknown;
  icon?: unknown;
  nameRo?: unknown;
  nameEn?: unknown;
  metaTitleRo?: unknown;
  metaTitleEn?: unknown;
  metaDescriptionRo?: unknown;
  metaDescriptionEn?: unknown;
  isActive?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength = 500
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

async function requireAdmin(): Promise<AdminAuthorizationResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      profileId: null,

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
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !== "admin"
  ) {
    return {
      profileId: null,

      response:
        NextResponse.json(
          {
            error:
              "Nu ai permisiunea de a administra specialitățile.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    profileId: user.id,
    response: null,
  };
}

export async function GET(): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    data: specialties,
    error,
  } = await admin
    .from("specialties")
    .select(`
      id,
      slug,
      icon,
      is_active,
      created_at,
      updated_at,
      specialty_translations (
        id,
        locale,
        name,
        meta_title,
        meta_description
      ),
      doctor_specialties (
        doctor_id
      )
    `)
    .order(
      "slug",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Admin specialties query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Specialitățile nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const result =
    (specialties ?? []).map(
      (specialty) => ({
        ...specialty,

        doctor_count:
          specialty.doctor_specialties
            ?.length ?? 0,
      })
    );

  return NextResponse.json({
    specialties: result,
  });
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  let body: SpecialtyRequestBody;

  try {
    body =
      (await request.json()) as
        SpecialtyRequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const nameRo =
    normalizeString(
      body.nameRo,
      200
    );

  const nameEn =
    normalizeString(
      body.nameEn,
      200
    );

  const providedSlug =
    normalizeString(
      body.slug,
      200
    );

  const slug =
    createSpecialtySlug(
      providedSlug ||
        nameRo
    );

  const icon =
    normalizeString(
      body.icon,
      100
    ) || null;

  if (nameRo.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele specialității în limba română.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameEn.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele specialității în limba engleză.",
      },
      {
        status: 400,
      }
    );
  }

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Nu a putut fi generat un slug valid.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existingSlug,
    error: existingSlugError,
  } = await admin
    .from("specialties")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existingSlugError) {
    return NextResponse.json(
      {
        error:
          "Slug-ul nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (existingSlug) {
    return NextResponse.json(
      {
        error:
          "Există deja o specialitate cu acest slug.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: duplicateTranslation,
    error:
      duplicateTranslationError,
  } = await admin
    .from("specialty_translations")
    .select("specialty_id")
    .eq("locale", "ro")
    .ilike("name", nameRo)
    .maybeSingle();

  if (duplicateTranslationError) {
    return NextResponse.json(
      {
        error:
          "Numele specialității nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (duplicateTranslation) {
    return NextResponse.json(
      {
        error:
          "Există deja o specialitate cu acest nume.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    data: specialty,
    error: specialtyError,
  } = await admin
    .from("specialties")
    .insert({
      slug,
      icon,
      is_active: true,
    })
    .select(`
      id,
      slug,
      icon,
      is_active,
      created_at,
      updated_at
    `)
    .single();

  if (
    specialtyError ||
    !specialty
  ) {
    console.error(
      "Specialty creation failed:",
      specialtyError
    );

    return NextResponse.json(
      {
        error:
          specialtyError?.code ===
          "23505"
            ? "Există deja o specialitate cu acest slug."
            : "Specialitatea nu a putut fi creată.",
      },
      {
        status:
          specialtyError?.code ===
          "23505"
            ? 409
            : 500,
      }
    );
  }

  const translations = [
    {
      specialty_id:
        specialty.id,

      locale: "ro",
      name: nameRo,

      meta_title:
        normalizeString(
          body.metaTitleRo,
          250
        ) || null,

      meta_description:
        normalizeString(
          body.metaDescriptionRo,
          500
        ) || null,
    },
    {
      specialty_id:
        specialty.id,

      locale: "en",
      name: nameEn,

      meta_title:
        normalizeString(
          body.metaTitleEn,
          250
        ) || null,

      meta_description:
        normalizeString(
          body.metaDescriptionEn,
          500
        ) || null,
    },
  ];

  const {
    error: translationsError,
  } = await admin
    .from("specialty_translations")
    .insert(translations);

  if (translationsError) {
    console.error(
      "Specialty translations creation failed:",
      translationsError
    );

    await admin
      .from("specialties")
      .delete()
      .eq("id", specialty.id);

    return NextResponse.json(
      {
        error:
          "Traducerile specialității nu au putut fi salvate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      message:
        "Specialitatea a fost adăugată.",

      specialty,
    },
    {
      status: 201,
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  let body: SpecialtyRequestBody;

  try {
    body =
      (await request.json()) as
        SpecialtyRequestBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
      }
    );
  }

  const specialtyId =
    normalizeString(
      body.specialtyId,
      100
    );

  if (!specialtyId) {
    return NextResponse.json(
      {
        error:
          "Specialitatea lipsește.",
      },
      {
        status: 400,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: existingSpecialty,
    error:
      existingSpecialtyError,
  } = await admin
    .from("specialties")
    .select(`
      id,
      slug,
      icon,
      is_active
    `)
    .eq("id", specialtyId)
    .maybeSingle();

  if (
    existingSpecialtyError ||
    !existingSpecialty
  ) {
    return NextResponse.json(
      {
        error:
          "Specialitatea nu a fost găsită.",
      },
      {
        status: 404,
      }
    );
  }

  const requestedActive =
    typeof body.isActive ===
      "boolean"
      ? body.isActive
      : existingSpecialty.is_active;

  if (
    requestedActive === false &&
    existingSpecialty.is_active ===
      true
  ) {
    const {
      count: doctorCount,
      error: countError,
    } = await admin
      .from("doctor_specialties")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq(
        "specialty_id",
        specialtyId
      );

    if (countError) {
      return NextResponse.json(
        {
          error:
            "Utilizarea specialității nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      (doctorCount ?? 0) >
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Specialitatea este asociată unor medici și nu poate fi dezactivată.",
        },
        {
          status: 409,
        }
      );
    }
  }

  const nameRo =
    normalizeString(
      body.nameRo,
      200
    );

  const nameEn =
    normalizeString(
      body.nameEn,
      200
    );

  const requestedSlug =
    normalizeString(
      body.slug,
      200
    );

  const slug =
    requestedSlug
      ? createSpecialtySlug(
          requestedSlug
        )
      : existingSpecialty.slug;

  const icon =
    normalizeString(
      body.icon,
      100
    ) || null;

  if (nameRo.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele în limba română.",
      },
      {
        status: 400,
      }
    );
  }

  if (nameEn.length < 2) {
    return NextResponse.json(
      {
        error:
          "Introdu numele în limba engleză.",
      },
      {
        status: 400,
      }
    );
  }

  if (!slug) {
    return NextResponse.json(
      {
        error:
          "Slug-ul nu este valid.",
      },
      {
        status: 400,
      }
    );
  }

  const {
    data: duplicateSlug,
    error: duplicateSlugError,
  } = await admin
    .from("specialties")
    .select("id")
    .eq("slug", slug)
    .neq("id", specialtyId)
    .maybeSingle();

  if (duplicateSlugError) {
    return NextResponse.json(
      {
        error:
          "Slug-ul nu a putut fi verificat.",
      },
      {
        status: 500,
      }
    );
  }

  if (duplicateSlug) {
    return NextResponse.json(
      {
        error:
          "Există deja o specialitate cu acest slug.",
      },
      {
        status: 409,
      }
    );
  }

  const {
    error: specialtyUpdateError,
  } = await admin
    .from("specialties")
    .update({
      slug,
      icon,
      is_active:
        requestedActive,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", specialtyId);

  if (specialtyUpdateError) {
    return NextResponse.json(
      {
        error:
          "Specialitatea nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  const translations = [
    {
      specialty_id:
        specialtyId,

      locale: "ro",
      name: nameRo,

      meta_title:
        normalizeString(
          body.metaTitleRo,
          250
        ) || null,

      meta_description:
        normalizeString(
          body.metaDescriptionRo,
          500
        ) || null,
    },
    {
      specialty_id:
        specialtyId,

      locale: "en",
      name: nameEn,

      meta_title:
        normalizeString(
          body.metaTitleEn,
          250
        ) || null,

      meta_description:
        normalizeString(
          body.metaDescriptionEn,
          500
        ) || null,
    },
  ];

  const {
    error: translationsError,
  } = await admin
    .from("specialty_translations")
    .upsert(
      translations,
      {
        onConflict:
          "specialty_id,locale",
      }
    );

  if (translationsError) {
    return NextResponse.json(
      {
        error:
          "Traducerile specialității nu au putut fi actualizate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    message:
      requestedActive
        ? "Specialitatea a fost actualizată."
        : "Specialitatea a fost dezactivată.",
  });
}