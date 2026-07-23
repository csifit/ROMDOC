import {
  NextRequest,
  NextResponse,
} from "next/server";
import {
  getGooglePlaceDetails,
} from "@/lib/google-maps/get-place-details";
import {
  createLocationSlug,
} from "@/lib/locations/create-location-slug";
import {
  matchOrCreateCity,
} from "@/lib/locations/match-or-create-city";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

type ClinicProposalBody = {
  name?: unknown;
  placeId?: unknown;
  addressLine2?: unknown;
  phone?: unknown;
  email?: unknown;
  website?: unknown;
  description?: unknown;
};

type DoctorIdentity = {
  profileId: string;
  doctorId: string;
};

function normalizeOptionalString(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized =
    value.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(
    0,
    maximumLength
  );
}

function normalizeEmail(
  value: unknown
) {
  const normalized =
    normalizeOptionalString(
      value,
      320
    );

  if (!normalized) {
    return null;
  }

  const email =
    normalized.toLowerCase();

  if (
    !email.includes("@") ||
    email.startsWith("@") ||
    email.endsWith("@")
  ) {
    throw new Error(
      "Adresa de e-mail a clinicii nu este validă."
    );
  }

  return email;
}

function normalizeWebsite(
  value: unknown
) {
  const normalized =
    normalizeOptionalString(
      value,
      500
    );

  if (!normalized) {
    return null;
  }

  try {
    const url =
      new URL(normalized);

    if (
      ![
        "http:",
        "https:",
      ].includes(url.protocol)
    ) {
      throw new Error();
    }

    return url.toString();
  } catch {
    throw new Error(
      "Adresa website-ului clinicii nu este validă."
    );
  }
}

async function requireDoctor():
  Promise<
    | {
        identity: DoctorIdentity;
        error: null;
      }
    | {
        identity: null;
        error: NextResponse;
      }
  > {
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
      identity: null,

      error:
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
    profile?.role !== "doctor"
  ) {
    return {
      identity: null,

      error:
        NextResponse.json(
          {
            error:
              "Doar medicii activi pot administra clinici.",
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
    .select("id, account_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return {
      identity: null,

      error:
        NextResponse.json(
          {
            error:
              "Profilul de medic nu a fost găsit.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  if (
    doctor.account_type !==
      "independent"
  ) {
    return {
      identity: null,

      error:
        NextResponse.json(
          {
            code:
              "independent_doctor_required",

            error:
              "Doar medicii independenți pot propune sau administra clinici.",
          },
          {
            status: 403,
          }
        ),
    };
  }

  return {
    identity: {
      profileId: user.id,
      doctorId: doctor.id,
    },

    error: null,
  };
}

async function createUniqueClinicSlug(
  clinicName: string,
  citySlug: string
) {
  const admin =
    createAdminClient();

  const baseSlug =
    createLocationSlug(
      `${clinicName}-${citySlug}`
    ) || "clinica";

  let candidate =
    baseSlug;

  let suffix = 2;

  while (true) {
    const {
      data,
      error,
    } = await admin
      .from("clinics")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Clinic slug lookup failed: ${error.message}`
      );
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

export async function GET() {
  const authorization =
    await requireDoctor();

  if (authorization.error) {
    return authorization.error;
  }

  const {
    doctorId,
    profileId,
  } = authorization.identity;

  const admin =
    createAdminClient();

  const {
    data: linkedRows,
    error: linkedError,
  } = await admin
    .from("doctor_clinics")
    .select(`
      clinic_id,
      clinics (
        id,
        slug,
        status,
        formatted_address,
        phone,
        email,
        website,
        google_maps_uri,
        clinic_translations (
          locale,
          name,
          description
        )
      )
    `)
    .eq("doctor_id", doctorId);

  if (linkedError) {
    console.error(
      "Linked clinics query failed:",
      linkedError
    );

    return NextResponse.json(
      {
        error:
          "Clinicile asociate nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const {
    data: proposedRows,
    error: proposedError,
  } = await admin
    .from("clinics")
    .select(`
      id,
      slug,
      status,
      formatted_address,
      phone,
      email,
      website,
      google_maps_uri,
      rejection_reason,
      created_at,
      clinic_translations (
        locale,
        name,
        description
      )
    `)
    .eq(
      "proposed_by_profile_id",
      profileId
    )
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  if (proposedError) {
    console.error(
      "Clinic proposals query failed:",
      proposedError
    );

    return NextResponse.json(
      {
        error:
          "Propunerile de clinici nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  const linkedClinics =
    (linkedRows ?? [])
      .map((row) =>
        Array.isArray(row.clinics)
          ? row.clinics[0]
          : row.clinics
      )
      .filter(Boolean);

  return NextResponse.json({
    linkedClinics,
    proposals:
      proposedRows ?? [],
  });
}

export async function POST(
  request: NextRequest
) {
  const authorization =
    await requireDoctor();

  if (authorization.error) {
    return authorization.error;
  }

  const {
    doctorId,
    profileId,
  } = authorization.identity;

  let body: ClinicProposalBody;

  try {
    body =
      (await request.json()) as
        ClinicProposalBody;
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

  const clinicName =
    normalizeOptionalString(
      body.name,
      200
    );

  if (
    !clinicName ||
    clinicName.length < 2
  ) {
    return NextResponse.json(
      {
        error:
          "Introdu numele clinicii.",
      },
      {
        status: 400,
      }
    );
  }

  const placeId =
    normalizeOptionalString(
      body.placeId,
      500
    );

  if (!placeId) {
    return NextResponse.json(
      {
        error:
          "Selectează adresa clinicii din lista Google.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const phone =
      normalizeOptionalString(
        body.phone,
        50
      );

    const email =
      normalizeEmail(
        body.email
      );

    const website =
      normalizeWebsite(
        body.website
      );

    const description =
      normalizeOptionalString(
        body.description,
        3000
      );

    const addressLine2 =
      normalizeOptionalString(
        body.addressLine2,
        300
      );

    const googleAddress =
      await getGooglePlaceDetails(
        placeId
      );

    const admin =
      createAdminClient();

    const city =
      await matchOrCreateCity(
        admin,
        {
          cityName:
            googleAddress.cityName,

          countryCode:
            googleAddress.countryCode,

          latitude:
            googleAddress.latitude,

          longitude:
            googleAddress.longitude,
        }
      );

    /*
     * Google Place ID is the strongest duplicate identifier.
     */
    const {
      data: existingClinic,
      error:
        existingClinicError,
    } = await admin
      .from("clinics")
      .select(`
        id,
        slug,
        status,
        proposed_by_profile_id
      `)
      .eq(
        "google_place_id",
        googleAddress.placeId
      )
      .maybeSingle();

    if (existingClinicError) {
      throw new Error(
        `Existing clinic lookup failed: ${existingClinicError.message}`
      );
    }

    if (existingClinic) {
      if (
        existingClinic.status ===
        "approved"
      ) {
        const {
          error: linkError,
        } = await admin
          .from("doctor_clinics")
          .upsert(
            {
              doctor_id:
                doctorId,

              clinic_id:
                existingClinic.id,
            },
            {
              onConflict:
                "doctor_id,clinic_id",
            }
          );

        if (linkError) {
          throw new Error(
            `Existing clinic association failed: ${linkError.message}`
          );
        }

        return NextResponse.json({
          message:
            "Clinica exista deja și a fost asociată profilului tău.",

          clinicId:
            existingClinic.id,

          status:
            "approved",

          linkedExisting:
            true,
        });
      }

      if (
        existingClinic.status ===
        "pending"
      ) {
        return NextResponse.json(
          {
            error:
              "Această clinică a fost deja propusă și așteaptă aprobarea administratorului.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        existingClinic.status ===
        "rejected"
      ) {
        return NextResponse.json(
          {
            error:
              "Această locație a fost respinsă anterior. Contactează administratorul RomDoc.",
          },
          {
            status: 409,
          }
        );
      }
    }

    const clinicSlug =
      await createUniqueClinicSlug(
        clinicName,
        city.slug
      );

    const {
      data: clinic,
      error: clinicInsertError,
    } = await admin
      .from("clinics")
      .insert({
        slug:
          clinicSlug,

        city_id:
          city.id,

        email,
        phone,
        website,

        street_address:
          googleAddress
            .addressLine1,

        formatted_address:
          googleAddress
            .formattedAddress,

        address_line_1:
          googleAddress
            .addressLine1,

        address_line_2:
          addressLine2,

        postal_code:
          googleAddress
            .postalCode,

        county_name:
          googleAddress
            .countyName,

        country_code:
          googleAddress
            .countryCode,

        latitude:
          googleAddress.latitude,

        longitude:
          googleAddress.longitude,

        google_place_id:
          googleAddress.placeId,

        google_maps_uri:
          googleAddress
            .googleMapsUri,

        address_verified_at:
          new Date().toISOString(),

        status:
          "pending",

        proposed_by_profile_id:
          profileId,
      })
      .select("id, slug, status")
      .single();

    if (
      clinicInsertError ||
      !clinic
    ) {
      throw new Error(
        `Clinic proposal creation failed: ${
          clinicInsertError?.message ??
          "No clinic returned"
        }`
      );
    }

    const translations = [
      {
        clinic_id:
          clinic.id,

        locale: "ro",

        name:
          clinicName,

        description,
      },
      {
        clinic_id:
          clinic.id,

        locale: "en",

        /*
         * Until professional translation is added,
         * preserve the original proper name.
         */
        name:
          clinicName,

        description,
      },
    ];

    const {
      error:
        translationInsertError,
    } = await admin
      .from(
        "clinic_translations"
      )
      .upsert(
        translations,
        {
          onConflict:
            "clinic_id,locale",
        }
      );

    if (
      translationInsertError
    ) {
      /*
       * Avoid leaving a clinic without its required name.
       */
      await admin
        .from("clinics")
        .delete()
        .eq("id", clinic.id);

      throw new Error(
        `Clinic translation creation failed: ${translationInsertError.message}`
      );
    }

    return NextResponse.json(
      {
        message:
          "Clinica a fost trimisă spre aprobarea administratorului.",

        clinicId:
          clinic.id,

        status:
          clinic.status,

        linkedExisting:
          false,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Doctor clinic proposal failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Clinica nu a putut fi propusă.",
      },
      {
        status: 500,
      }
    );
  }
}