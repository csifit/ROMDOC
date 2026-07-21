import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_DIRECTORY_CODES } from "@/lib/api/platform-operator-directory-codes";
import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { createSpecialtySlug } from "@/lib/specialties/create-specialty-slug";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type SpecialtyRequestBody = {
  specialtyId?: unknown;
  slug?: unknown;
  icon?: unknown;
  nameRo?: unknown;
  nameEn?: unknown;
  nameDe?: unknown;
  metaTitleRo?: unknown;
  metaTitleEn?: unknown;
  metaTitleDe?: unknown;
  metaDescriptionRo?: unknown;
  metaDescriptionEn?: unknown;
  metaDescriptionDe?: unknown;
  isActive?: unknown;
};

type SpecialtyQueryRow = {
  doctor_specialties?: Array<{ doctor_id: string }> | null;
  [key: string]: unknown;
};

type TranslationInput = {
  specialty_id: string;
  locale: "ro" | "en" | "de";
  name: string;
  meta_title: string | null;
  meta_description: string | null;
};

function normalizeString(value: unknown, maximumLength = 500) {
  return typeof value === "string"
    ? value.trim().slice(0, maximumLength)
    : "";
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function failure(code: string, error: string, status: number) {
  return json({ code, error }, status);
}

function success(
  code: string,
  message: string,
  extra?: Record<string, unknown>,
  status = 200
) {
  return json({ code, message, ...extra }, status);
}

async function authorizeAdministrator() {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return {
      authorization,
      response: authorization.response,
    };
  }

  const adminOnlyResponse = requireAdministratorCapability(
    authorization.role,
    "Doar administratorii pot administra specialitățile."
  );

  return {
    authorization,
    response: adminOnlyResponse,
  };
}

function requiredTranslations(
  specialtyId: string,
  body: SpecialtyRequestBody
): TranslationInput[] {
  return [
    {
      specialty_id: specialtyId,
      locale: "ro",
      name: normalizeString(body.nameRo, 200),
      meta_title: normalizeString(body.metaTitleRo, 250) || null,
      meta_description:
        normalizeString(body.metaDescriptionRo, 500) || null,
    },
    {
      specialty_id: specialtyId,
      locale: "en",
      name: normalizeString(body.nameEn, 200),
      meta_title: normalizeString(body.metaTitleEn, 250) || null,
      meta_description:
        normalizeString(body.metaDescriptionEn, 500) || null,
    },
  ];
}

function germanTranslation(
  specialtyId: string,
  body: SpecialtyRequestBody
): TranslationInput | null {
  const name = normalizeString(body.nameDe, 200);

  if (!name) return null;

  return {
    specialty_id: specialtyId,
    locale: "de",
    name,
    meta_title: normalizeString(body.metaTitleDe, 250) || null,
    meta_description: normalizeString(body.metaDescriptionDe, 500) || null,
  };
}

async function saveTranslations(
  specialtyId: string,
  body: SpecialtyRequestBody
) {
  const admin = createAdminClient();
  const optionalGerman = germanTranslation(specialtyId, body);
  const translations = optionalGerman
    ? [...requiredTranslations(specialtyId, body), optionalGerman]
    : requiredTranslations(specialtyId, body);

  const { error: upsertError } = await admin
    .from("specialty_translations")
    .upsert(translations, {
      onConflict: "specialty_id,locale",
    });

  if (upsertError) return upsertError;

  if (!optionalGerman) {
    const { error: deleteGermanError } = await admin
      .from("specialty_translations")
      .delete()
      .eq("specialty_id", specialtyId)
      .eq("locale", "de");

    if (deleteGermanError) return deleteGermanError;
  }

  return null;
}

function validateNames(body: SpecialtyRequestBody) {
  if (normalizeString(body.nameRo, 200).length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyNameRoRequired,
      "Introdu numele specialității în limba română.",
      400
    );
  }

  if (normalizeString(body.nameEn, 200).length < 2) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyNameEnRequired,
      "Introdu numele specialității în limba engleză.",
      400
    );
  }

  return null;
}

export async function GET(): Promise<Response> {
  const authorization = await authorizeAdministrator();
  if (authorization.response) return authorization.response;

  const admin = createAdminClient();
  const { data: specialties, error } = await admin
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
    .order("slug", { ascending: true });

  if (error) {
    console.error("Admin specialties query failed:", error);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtiesLoadFailed,
      "Specialitățile nu au putut fi încărcate.",
      500
    );
  }

  const result = ((specialties ?? []) as SpecialtyQueryRow[]).map(
    (specialty) => ({
    ...specialty,
      doctor_count: specialty.doctor_specialties?.length ?? 0,
    })
  );

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.specialtiesLoaded,
    "Specialitățile au fost încărcate.",
    {
      specialties: result,
      capabilities: {
        canCreateSpecialties: true,
        canUpdateSpecialties: true,
      },
    }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const authorization = await authorizeAdministrator();
  if (authorization.response) return authorization.response;

  let body: SpecialtyRequestBody;

  try {
    body = (await request.json()) as SpecialtyRequestBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const validationResponse = validateNames(body);
  if (validationResponse) return validationResponse;

  const nameRo = normalizeString(body.nameRo, 200);
  const providedSlug = normalizeString(body.slug, 200);
  const slug = createSpecialtySlug(providedSlug || nameRo);

  if (!slug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugInvalid,
      "Nu a putut fi generat un slug valid.",
      400
    );
  }

  const admin = createAdminClient();
  const { data: duplicateSlug, error: duplicateSlugError } = await admin
    .from("specialties")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (duplicateSlugError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugCheckFailed,
      "Slug-ul nu a putut fi verificat.",
      500
    );
  }

  if (duplicateSlug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugDuplicate,
      "Există deja o specialitate cu acest slug.",
      409
    );
  }

  const { data: duplicateName, error: duplicateNameError } = await admin
    .from("specialty_translations")
    .select("specialty_id")
    .eq("locale", "ro")
    .ilike("name", nameRo)
    .maybeSingle();

  if (duplicateNameError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyNameCheckFailed,
      "Numele specialității nu a putut fi verificat.",
      500
    );
  }

  if (duplicateName) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyNameDuplicate,
      "Există deja o specialitate cu acest nume.",
      409
    );
  }

  const { data: specialty, error: specialtyError } = await admin
    .from("specialties")
    .insert({
      slug,
      icon: normalizeString(body.icon, 100) || null,
      is_active: true,
    })
    .select("id, slug, icon, is_active, created_at, updated_at")
    .single();

  if (specialtyError || !specialty) {
    console.error("Specialty creation failed:", specialtyError);
    const duplicate = specialtyError?.code === "23505";

    return failure(
      duplicate
        ? PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugDuplicate
        : PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyCreateFailed,
      duplicate
        ? "Există deja o specialitate cu acest slug."
        : "Specialitatea nu a putut fi creată.",
      duplicate ? 409 : 500
    );
  }

  const translationError = await saveTranslations(specialty.id, body);

  if (translationError) {
    console.error("Specialty translations creation failed:", translationError);
    await admin.from("specialties").delete().eq("id", specialty.id);

    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyTranslationCreateFailed,
      "Traducerile specialității nu au putut fi salvate.",
      500
    );
  }

  return success(
    PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyCreated,
    "Specialitatea a fost adăugată.",
    { specialty },
    201
  );
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const authorization = await authorizeAdministrator();
  if (authorization.response) return authorization.response;

  let body: SpecialtyRequestBody;

  try {
    body = (await request.json()) as SpecialtyRequestBody;
  } catch {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.invalidJson,
      "Cererea nu conține date JSON valide.",
      400
    );
  }

  const specialtyId = normalizeString(body.specialtyId, 100);

  if (!specialtyId) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyIdRequired,
      "Specialitatea lipsește.",
      400
    );
  }

  const validationResponse = validateNames(body);
  if (validationResponse) return validationResponse;

  const admin = createAdminClient();
  const { data: existingSpecialty, error: existingSpecialtyError } =
    await admin
      .from("specialties")
      .select("id, slug, icon, is_active")
      .eq("id", specialtyId)
      .maybeSingle();

  if (existingSpecialtyError || !existingSpecialty) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyNotFound,
      "Specialitatea nu a fost găsită.",
      404
    );
  }

  const requestedActive =
    typeof body.isActive === "boolean"
      ? body.isActive
      : existingSpecialty.is_active;

  if (!requestedActive && existingSpecialty.is_active) {
    const { count: doctorCount, error: countError } = await admin
      .from("doctor_specialties")
      .select("*", { count: "exact", head: true })
      .eq("specialty_id", specialtyId);

    if (countError) {
      return failure(
        PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyUsageCheckFailed,
        "Utilizarea specialității nu a putut fi verificată.",
        500
      );
    }

    if ((doctorCount ?? 0) > 0) {
      return failure(
        PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyInUse,
        "Specialitatea este asociată unor medici și nu poate fi dezactivată.",
        409
      );
    }
  }

  const requestedSlug = normalizeString(body.slug, 200);
  const slug = requestedSlug
    ? createSpecialtySlug(requestedSlug)
    : existingSpecialty.slug;

  if (!slug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugInvalid,
      "Slug-ul nu este valid.",
      400
    );
  }

  const { data: duplicateSlug, error: duplicateSlugError } = await admin
    .from("specialties")
    .select("id")
    .eq("slug", slug)
    .neq("id", specialtyId)
    .maybeSingle();

  if (duplicateSlugError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugCheckFailed,
      "Slug-ul nu a putut fi verificat.",
      500
    );
  }

  if (duplicateSlug) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtySlugDuplicate,
      "Există deja o specialitate cu acest slug.",
      409
    );
  }

  const { error: updateError } = await admin
    .from("specialties")
    .update({
      slug,
      icon: normalizeString(body.icon, 100) || null,
      is_active: requestedActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", specialtyId);

  if (updateError) {
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyUpdateFailed,
      "Specialitatea nu a putut fi actualizată.",
      500
    );
  }

  const translationError = await saveTranslations(specialtyId, body);

  if (translationError) {
    console.error("Specialty translations update failed:", translationError);
    return failure(
      PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyTranslationUpdateFailed,
      "Traducerile specialității nu au putut fi actualizate.",
      500
    );
  }

  return success(
    requestedActive
      ? PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyUpdated
      : PLATFORM_OPERATOR_DIRECTORY_CODES.specialtyDeactivated,
    requestedActive
      ? "Specialitatea a fost actualizată."
      : "Specialitatea a fost dezactivată."
  );
}
