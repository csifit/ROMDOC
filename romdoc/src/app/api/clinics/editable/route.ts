import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import { getGooglePlaceDetails } from "@/lib/google-maps/get-place-details";
import { matchOrCreateCity } from "@/lib/locations/match-or-create-city";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  clinic_translations (
    locale,
    name,
    description
  ),
  cities (
    id,
    slug,
    city_translations (
      locale,
      name
    )
  )
`;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeOptionalString(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized
    ? normalized.slice(0, maximumLength)
    : null;
}

function normalizeRequiredString(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maximumLength);
}

function normalizeEmail(value: unknown) {
  const normalized = normalizeOptionalString(value, 320);

  if (!normalized) {
    return null;
  }

  const email = normalized.toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Adresa de e-mail a clinicii nu este validă.");
  }

  return email;
}

function normalizeWebsite(value: unknown) {
  const normalized = normalizeOptionalString(value, 500);

  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }

    return url.toString();
  } catch {
    throw new Error("Adresa website-ului clinicii nu este validă.");
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
      response: NextResponse.json(
        { error: "Trebuie să fii autentificat." },
        { status: 401 }
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
      response: NextResponse.json(
        { error: "Contul nu are permisiunea necesară." },
        { status: 403 }
      ),
    };
  }

  if (
    profile.role === "admin" ||
    profile.role === "manager"
  ) {
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
        response: NextResponse.json(
          { error: "Contul de medic nu este asociat unui profil de medic." },
          { status: 403 }
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
    response: NextResponse.json(
      { error: "Nu ai permisiunea de a edita clinici." },
      { status: 403 }
    ),
  };
}

async function userCanEditClinic(
  access: Exclude<UserAccess, { response: NextResponse }>,
  clinicId: string
) {
  if (access.mode === "platform") {
    return true;
  }

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

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function GET(): Promise<Response> {
  const access = await requireEditableClinicAccess();

  if (access.response) {
    return access.response;
  }

  const admin = createAdminClient();

  if (access.mode === "platform") {
    const { data, error } = await admin
      .from("clinics")
      .select(clinicSelect)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Editable clinics platform query failed:", error);

      return NextResponse.json(
        { error: "Clinicile nu au putut fi încărcate." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        clinics: data ?? [],
        role: access.role,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { data: relations, error: relationsError } = await admin
    .from("doctor_clinics")
    .select("clinic_id")
    .eq("doctor_id", access.doctorId);

  if (relationsError) {
    console.error("Editable doctor clinics relation query failed:", relationsError);

    return NextResponse.json(
      { error: "Clinicile medicului nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  const clinicIds = Array.from(
    new Set((relations ?? []).map((relation) => relation.clinic_id))
  );

  if (clinicIds.length === 0) {
    return NextResponse.json(
      {
        clinics: [],
        role: access.role,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const { data, error } = await admin
    .from("clinics")
    .select(clinicSelect)
    .in("id", clinicIds)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Editable doctor clinics query failed:", error);

    return NextResponse.json(
      { error: "Clinicile medicului nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      clinics: data ?? [],
      role: access.role,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const access = await requireEditableClinicAccess();

  if (access.response) {
    return access.response;
  }

  let body: EditableClinicBody;

  try {
    body = (await request.json()) as EditableClinicBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const clinicId = normalizeRequiredString(body.clinicId, 100);

  if (!clinicId || !isUuid(clinicId)) {
    return NextResponse.json(
      { error: "Clinica selectată nu este validă." },
      { status: 400 }
    );
  }

  const canEdit = await userCanEditClinic(access, clinicId);

  if (!canEdit) {
    return NextResponse.json(
      { error: "Nu ai permisiunea de a edita această clinică." },
      { status: 403 }
    );
  }

  const name = normalizeRequiredString(body.name, 200);

  if (name.length < 2) {
    return NextResponse.json(
      { error: "Introdu numele clinicii." },
      { status: 400 }
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

      clinicUpdate.city_id = city.id;
      clinicUpdate.street_address = googleAddress.addressLine1;
      clinicUpdate.formatted_address = googleAddress.formattedAddress;
      clinicUpdate.address_line_1 = googleAddress.addressLine1;
      clinicUpdate.postal_code = googleAddress.postalCode;
      clinicUpdate.county_name = googleAddress.countyName;
      clinicUpdate.country_code = googleAddress.countryCode;
      clinicUpdate.latitude = googleAddress.latitude;
      clinicUpdate.longitude = googleAddress.longitude;
      clinicUpdate.google_place_id = googleAddress.placeId;
      clinicUpdate.google_maps_uri = googleAddress.googleMapsUri;
      clinicUpdate.address_verified_at = new Date().toISOString();
    }

    const { data: updatedClinic, error: updateError } = await admin
      .from("clinics")
      .update(clinicUpdate)
      .eq("id", clinicId)
      .select("id")
      .maybeSingle();

    if (updateError || !updatedClinic) {
      console.error("Clinic update failed:", updateError);

      return NextResponse.json(
        { error: "Clinica nu a putut fi actualizată." },
        { status: 500 }
      );
    }

    const { error: translationError } = await admin
      .from("clinic_translations")
      .upsert(
        [
          {
            clinic_id: clinicId,
            locale: "ro",
            name,
            description,
          },
          {
            clinic_id: clinicId,
            locale: "en",
            name,
            description,
          },
        ],
        {
          onConflict: "clinic_id,locale",
        }
      );

    if (translationError) {
      console.error("Clinic translation update failed:", translationError);

      return NextResponse.json(
        { error: "Traducerile clinicii nu au putut fi actualizate." },
        { status: 500 }
      );
    }

    const clinic = await loadClinic(clinicId);

    return NextResponse.json(
      {
        message: "Clinica a fost actualizată.",
        clinic,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Editable clinic update failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Clinica nu a putut fi actualizată.",
      },
      { status: 500 }
    );
  }
}
