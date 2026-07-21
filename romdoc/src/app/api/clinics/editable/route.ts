import { NextRequest, NextResponse } from "next/server";

import { PLATFORM_OPERATOR_CLINIC_CODES } from "@/lib/api/platform-operator-clinic-codes";
import { requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import { getGooglePlaceDetails } from "@/lib/google-maps/get-place-details";
import { matchOrCreateCity } from "@/lib/locations/match-or-create-city";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type EditableClinicBody = {
  clinicId?: unknown;
  name?: unknown;
  description?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  addressLine2?: unknown;
  placeId?: unknown;
};

type UserAccess =
  | {
      mode: "platform";
      profileId: string;
      role: "admin" | "manager";
      doctorId: null;
      response: null;
    }
  | {
      mode: "doctor";
      profileId: string;
      role: "doctor";
      doctorId: string;
      response: null;
    }
  | {
      mode: null;
      profileId: null;
      role: null;
      doctorId: null;
      response: NextResponse;
    };

const clinicSelect = `
  id,
  slug,
  city_id,
  email,
  phone,
  website,
  street_address,
  formatted_address,
  address_line_1,
  address_line_2,
  postal_code,
  county_name,
  country_code,
  latitude,
  longitude,
  google_place_id,
  google_maps_uri,
  address_verified_at,
  status,
  updated_at,
  clinic_translations (locale, name, description),
  cities (id, slug, city_translations (locale, name))
`;

class ClinicInputError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeOptionalString(value: unknown, maximumLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized.slice(0, maximumLength) : null;
}

function normalizeRequiredString(value: unknown, maximumLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maximumLength) : "";
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeOptionalString(value, 320);
  if (!normalized) return null;
  const email = normalized.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ClinicInputError(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicEmailInvalid,
      "Adresa de e-mail a clinicii nu este validă."
    );
  }

  return email;
}

function normalizeWebsite(value: unknown) {
  const normalized = normalizeOptionalString(value, 500);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new ClinicInputError(
      PLATFORM_OPERATOR_CLINIC_CODES.clinicWebsiteInvalid,
      "Adresa website-ului clinicii nu este validă."
    );
  }
}

async function requireEditableClinicAccess(): Promise<UserAccess> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      mode: null,
      profileId: null,
      role: null,
      doctorId: null,
      response: json(
        {
          code: "authentication_required",
          error: "Trebuie să fii autentificat.",
        },
        401
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active"
  ) {
    return {
      mode: null,
      profileId: null,
      role: null,
      doctorId: null,
      response: json(
        { code: "access_denied", error: "Contul nu are permisiunea necesară." },
        403
      ),
    };
  }

  if (profile.role === "admin" || profile.role === "manager") {
    const authorization = await requirePlatformOperatorAal2Api();
    if (authorization.response) {
      return {
        mode: null,
        profileId: null,
        role: null,
        doctorId: null,
        response: authorization.response,
      };
    }

    return {
      mode: "platform",
      profileId: authorization.profileId,
      role: authorization.role,
      doctorId: null,
      response: null,
    };
  }

  if (profile.role === "doctor") {
    const admin = createAdminClient();
    const { data: doctor, error: doctorError } = await admin
      .from("doctors")
      .select("id")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (doctorError || !doctor) {
      return {
        mode: null,
        profileId: null,
        role: null,
        doctorId: null,
        response: json(
          {
            code: PLATFORM_OPERATOR_CLINIC_CODES.doctorProfileMissing,
            error: "Contul de medic nu este asociat unui profil de medic.",
          },
          403
        ),
      };
    }

    return {
      mode: "doctor",
      profileId: user.id,
      role: "doctor",
      doctorId: doctor.id,
      response: null,
    };
  }

  return {
    mode: null,
    profileId: null,
    role: null,
    doctorId: null,
    response: json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicEditRoleDenied,
        error: "Nu ai permisiunea de a edita clinici.",
      },
      403
    ),
  };
}

async function userCanEditClinic(
  access: Exclude<UserAccess, { mode: null }>,
  clinicId: string
) {
  if (access.mode === "platform") return true;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("doctor_clinics")
    .select("doctor_id")
    .eq("doctor_id", access.doctorId)
    .eq("clinic_id", clinicId)
    .maybeSingle();

  return !error && Boolean(data);
}

async function loadClinic(clinicId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("clinics")
    .select(clinicSelect)
    .eq("id", clinicId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function GET(): Promise<Response> {
  const access = await requireEditableClinicAccess();
  if (access.response) return access.response;

  const admin = createAdminClient();

  if (access.mode === "platform") {
    const { data, error } = await admin
      .from("clinics")
      .select(clinicSelect)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Editable clinics platform query failed:", error);
      return json(
        {
          code: PLATFORM_OPERATOR_CLINIC_CODES.editableClinicsLoadFailed,
          error: "Clinicile nu au putut fi încărcate.",
        },
        500
      );
    }

    return json({
      code: PLATFORM_OPERATOR_CLINIC_CODES.editableClinicsLoaded,
      clinics: data ?? [],
      role: access.role,
    });
  }

  const { data: relations, error: relationsError } = await admin
    .from("doctor_clinics")
    .select("clinic_id")
    .eq("doctor_id", access.doctorId);

  if (relationsError) {
    console.error("Editable doctor clinics relation query failed:", relationsError);
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorEditableClinicsLoadFailed,
        error: "Clinicile medicului nu au putut fi încărcate.",
      },
      500
    );
  }

  const clinicIds = Array.from(
    new Set((relations ?? []).map((relation: { clinic_id: string }) => relation.clinic_id))
  );

  if (!clinicIds.length) {
    return json({
      code: PLATFORM_OPERATOR_CLINIC_CODES.editableClinicsLoaded,
      clinics: [],
      role: access.role,
    });
  }

  const { data, error } = await admin
    .from("clinics")
    .select(clinicSelect)
    .in("id", clinicIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Editable doctor clinics query failed:", error);
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.doctorEditableClinicsLoadFailed,
        error: "Clinicile medicului nu au putut fi încărcate.",
      },
      500
    );
  }

  return json({
    code: PLATFORM_OPERATOR_CLINIC_CODES.editableClinicsLoaded,
    clinics: data ?? [],
    role: access.role,
  });
}

export async function PATCH(request: NextRequest): Promise<Response> {
  const access = await requireEditableClinicAccess();
  if (access.response) return access.response;

  let body: EditableClinicBody;
  try {
    body = (await request.json()) as EditableClinicBody;
  } catch {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.invalidJson,
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const clinicId = normalizeRequiredString(body.clinicId, 100);
  if (!clinicId || !isUuid(clinicId)) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicInvalid,
        error: "Clinica selectată nu este validă.",
      },
      400
    );
  }

  const canEdit = await userCanEditClinic(access, clinicId);
  if (!canEdit) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicEditAccessDenied,
        error: "Nu ai permisiunea de a edita această clinică.",
      },
      403
    );
  }

  const name = normalizeRequiredString(body.name, 200);
  if (name.length < 2) {
    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicNameRequired,
        error: "Introdu numele clinicii.",
      },
      400
    );
  }

  try {
    const admin = createAdminClient();
    const phone = normalizeOptionalString(body.phone, 50);
    const email = normalizeEmail(body.email);
    const website = normalizeWebsite(body.website);
    const description = normalizeOptionalString(body.description, 3000);
    const addressLine2 = normalizeOptionalString(body.addressLine2, 300);
    const placeId = normalizeOptionalString(body.placeId, 500);

    const clinicUpdate: Record<string, unknown> = {
      phone,
      email,
      website,
      address_line_2: addressLine2,
      updated_at: new Date().toISOString(),
    };

    if (placeId) {
      const googleAddress = await getGooglePlaceDetails(placeId);
      const city = await matchOrCreateCity(admin, {
        cityName: googleAddress.cityName,
        countryCode: googleAddress.countryCode,
        latitude: googleAddress.latitude,
        longitude: googleAddress.longitude,
      });

      Object.assign(clinicUpdate, {
        city_id: city.id,
        street_address: googleAddress.addressLine1,
        formatted_address: googleAddress.formattedAddress,
        address_line_1: googleAddress.addressLine1,
        postal_code: googleAddress.postalCode,
        county_name: googleAddress.countyName,
        country_code: googleAddress.countryCode,
        latitude: googleAddress.latitude,
        longitude: googleAddress.longitude,
        google_place_id: googleAddress.placeId,
        google_maps_uri: googleAddress.googleMapsUri,
        address_verified_at: new Date().toISOString(),
      });
    }

    const { data: updatedClinic, error: updateError } = await admin
      .from("clinics")
      .update(clinicUpdate)
      .eq("id", clinicId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedClinic) {
      console.error("Clinic update failed:", updateError);
      return json(
        {
          code: PLATFORM_OPERATOR_CLINIC_CODES.clinicUpdateFailed,
          error: "Clinica nu a putut fi actualizată.",
        },
        500
      );
    }

    const { error: translationError } = await admin
      .from("clinic_translations")
      .upsert(
        [
          { clinic_id: clinicId, locale: "ro", name, description },
          { clinic_id: clinicId, locale: "en", name, description },
        ],
        { onConflict: "clinic_id,locale" }
      );

    if (translationError) {
      console.error("Clinic translation update failed:", translationError);
      return json(
        {
          code: PLATFORM_OPERATOR_CLINIC_CODES.clinicTranslationUpdateFailed,
          error: "Traducerile clinicii nu au putut fi actualizate.",
        },
        500
      );
    }

    const clinic = await loadClinic(clinicId);
    return json({
      code: PLATFORM_OPERATOR_CLINIC_CODES.clinicUpdated,
      message: "Clinica a fost actualizată.",
      clinic,
    });
  } catch (error) {
    console.error("Editable clinic update failed:", error);

    if (error instanceof ClinicInputError) {
      return json({ code: error.code, error: error.message }, 400);
    }

    return json(
      {
        code: PLATFORM_OPERATOR_CLINIC_CODES.clinicUpdateFailed,
        error:
          error instanceof Error
            ? error.message
            : "Clinica nu a putut fi actualizată.",
      },
      500
    );
  }
}
