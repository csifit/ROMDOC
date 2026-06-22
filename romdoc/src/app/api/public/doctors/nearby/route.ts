import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_RADII = new Set([10, 50]);
const MAX_RESULTS = 100;

type NearbyClinicRow = {
  clinic_id: string;
  distance_metres: number | string;
};

type Translation = {
  locale: string;
  name?: string;
  title?: string;
};

type ClinicRow = {
  id: string;
  slug: string | null;
  formatted_address: string | null;
  google_maps_uri: string | null;
  clinic_translations: Translation[] | null;
  cities:
    | {
        slug: string | null;
        country_code: string | null;
        city_translations: Translation[] | null;
      }
    | Array<{
        slug: string | null;
        country_code: string | null;
        city_translations: Translation[] | null;
      }>
    | null;
};

type DoctorClinicRow = {
  doctor_id: string;
  clinic_id: string;
};

type SpecialtyRelation = {
  slug: string | null;
  specialty_translations: Translation[] | null;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialties:
    | SpecialtyRelation
    | SpecialtyRelation[]
    | null;
};

type DoctorRow = {
  id: string;
  slug: string;
  photo_url: string | null;
  years_experience: number | null;
  consultation_price: number | string | null;
  average_rating: number | string | null;
  review_count: number | null;
  verification_status: string | null;
  doctor_translations: Translation[] | null;
};

type AvailabilityRow = {
  doctor_id: string;
};

export type PublicNearbyDoctor = {
  id: string;
  slug: string;
  name: string;
  title: string;
  photoUrl: string | null;
  specialty: {
    slug: string;
    name: string;
  };
  clinic: {
    id: string;
    slug: string | null;
    name: string;
    cityName: string;
    citySlug: string | null;
    countryCode: string | null;
    formattedAddress: string | null;
    googleMapsUri: string | null;
    distanceKilometres: number;
  };
  averageRating: number;
  reviewCount: number;
  yearsExperience: number | null;
  consultationPrice: number | null;
  isVerified: boolean;
  hasOnlineAvailability: boolean;
};

function getSingleRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function getTranslationValue(
  translations: Translation[] | null | undefined,
  field: "name" | "title"
) {
  if (!translations?.length) {
    return null;
  }

  const romanian =
    translations.find(
      (translation) => translation.locale === "ro"
    ) ?? translations[0];

  return romanian?.[field]?.trim() || null;
}

function formatDoctorName(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

function parseFiniteNumber(value: string | null) {
  if (value === null) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNumber(
  value: number | string | null
) {
  if (value === null) {
    return null;
  }

  const parsed =
    typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

function emptyResponse({
  latitude,
  longitude,
  radius,
  specialtySlug,
  verifiedOnly,
  onlineOnly,
  clinicCount = 0,
}: {
  latitude: number;
  longitude: number;
  radius: number;
  specialtySlug: string;
  verifiedOnly: boolean;
  onlineOnly: boolean;
  clinicCount?: number;
}) {
  return NextResponse.json(
    {
      doctors: [],
      meta: {
        latitude,
        longitude,
        radiusKilometres: radius,
        specialty: specialtySlug,
        verifiedOnly,
        onlineOnly,
        clinicCount,
        doctorCount: 0,
      },
    },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  try {
    const searchParams = request.nextUrl.searchParams;

    const latitude = parseFiniteNumber(
      searchParams.get("lat")
    );

    const longitude = parseFiniteNumber(
      searchParams.get("lng")
    );

    const radius = parseFiniteNumber(
      searchParams.get("radius")
    );

    const specialtySlug =
      searchParams
        .get("specialty")
        ?.trim()
        .toLowerCase() ?? "";

    const verifiedOnly =
      searchParams.get("verified") === "true";

    const onlineOnly =
      searchParams.get("online") === "true";

    if (
      latitude === null ||
      latitude < -90 ||
      latitude > 90
    ) {
      return jsonError(
        "Latitudinea este invalidă.",
        400
      );
    }

    if (
      longitude === null ||
      longitude < -180 ||
      longitude > 180
    ) {
      return jsonError(
        "Longitudinea este invalidă.",
        400
      );
    }

    if (
      radius === null ||
      !ALLOWED_RADII.has(radius)
    ) {
      return jsonError(
        "Raza trebuie să fie 10 sau 50 km.",
        400
      );
    }

    if (!specialtySlug) {
      return jsonError(
        "Specialitatea este obligatorie.",
        400
      );
    }

    const admin = createAdminClient();

    const {
      data: specialtyData,
      error: specialtyError,
    } = await admin
      .from("specialties")
      .select("id, slug")
      .eq("slug", specialtySlug)
      .eq("is_active", true)
      .maybeSingle();

    if (specialtyError) {
      console.error(
        "Nearby specialty lookup failed:",
        specialtyError
      );

      return jsonError(
        "Specialitatea nu a putut fi verificată.",
        500
      );
    }

    if (!specialtyData) {
      return jsonError(
        "Specialitatea nu există.",
        404
      );
    }

    const {
      data: nearbyClinicData,
      error: nearbyClinicError,
    } = await admin.rpc(
      "find_approved_clinics_nearby",
      {
        search_latitude: latitude,
        search_longitude: longitude,
        radius_kilometres: radius,
      }
    );

    if (nearbyClinicError) {
      console.error(
        "Nearby clinic RPC failed:",
        nearbyClinicError
      );

      return jsonError(
        "Clinicile din apropiere nu au putut fi căutate.",
        500
      );
    }

    const nearbyClinics =
      (nearbyClinicData ?? []) as NearbyClinicRow[];

    if (nearbyClinics.length === 0) {
      return emptyResponse({
        latitude,
        longitude,
        radius,
        specialtySlug,
        verifiedOnly,
        onlineOnly,
      });
    }

    const clinicDistanceMap = new Map<
      string,
      number
    >();

    for (const row of nearbyClinics) {
      const distance = normalizeNumber(
        row.distance_metres
      );

      if (distance !== null) {
        clinicDistanceMap.set(
          row.clinic_id,
          distance
        );
      }
    }

    const clinicIds = Array.from(
      clinicDistanceMap.keys()
    );

    if (clinicIds.length === 0) {
      return emptyResponse({
        latitude,
        longitude,
        radius,
        specialtySlug,
        verifiedOnly,
        onlineOnly,
      });
    }

    const [
      clinicsResult,
      doctorClinicsResult,
    ] = await Promise.all([
      admin
        .from("clinics")
        .select(`
          id,
          slug,
          formatted_address,
          google_maps_uri,
          clinic_translations (
            locale,
            name
          ),
          cities (
            slug,
            country_code,
            city_translations (
              locale,
              name
            )
          )
        `)
        .in("id", clinicIds)
        .eq("status", "approved"),

      admin
        .from("doctor_clinics")
        .select("doctor_id, clinic_id")
        .in("clinic_id", clinicIds),
    ]);

    if (clinicsResult.error) {
      console.error(
        "Nearby clinic details lookup failed:",
        clinicsResult.error
      );

      return jsonError(
        "Detaliile clinicilor nu au putut fi încărcate.",
        500
      );
    }

    if (doctorClinicsResult.error) {
      console.error(
        "Nearby doctor-clinic lookup failed:",
        doctorClinicsResult.error
      );

      return jsonError(
        "Asocierile medicilor nu au putut fi încărcate.",
        500
      );
    }

    const clinics =
      (clinicsResult.data ?? []) as ClinicRow[];

    const doctorClinics =
      (doctorClinicsResult.data ??
        []) as DoctorClinicRow[];

    const candidateDoctorIds = Array.from(
      new Set(
        doctorClinics.map((row) => row.doctor_id)
      )
    );

    if (candidateDoctorIds.length === 0) {
      return emptyResponse({
        latitude,
        longitude,
        radius,
        specialtySlug,
        verifiedOnly,
        onlineOnly,
        clinicCount: clinicIds.length,
      });
    }

    const {
      data: doctorSpecialtyData,
      error: doctorSpecialtyError,
    } = await admin
      .from("doctor_specialties")
      .select(`
        doctor_id,
        specialties (
          slug,
          specialty_translations (
            locale,
            name
          )
        )
      `)
      .eq("specialty_id", specialtyData.id)
      .in("doctor_id", candidateDoctorIds);

    if (doctorSpecialtyError) {
      console.error(
        "Nearby doctor-specialty lookup failed:",
        doctorSpecialtyError
      );

      return jsonError(
        "Specialitățile medicilor nu au putut fi încărcate.",
        500
      );
    }

    const doctorSpecialties =
      (doctorSpecialtyData ??
        []) as DoctorSpecialtyRow[];

    const matchingDoctorIds = Array.from(
      new Set(
        doctorSpecialties.map(
          (row) => row.doctor_id
        )
      )
    );

    if (matchingDoctorIds.length === 0) {
      return emptyResponse({
        latitude,
        longitude,
        radius,
        specialtySlug,
        verifiedOnly,
        onlineOnly,
        clinicCount: clinicIds.length,
      });
    }

    let doctorQuery = admin
      .from("doctors")
      .select(`
        id,
        slug,
        photo_url,
        years_experience,
        consultation_price,
        average_rating,
        review_count,
        verification_status,
        doctor_translations (
          locale,
          title
        )
      `)
      .eq("status", "active")
      .in("id", matchingDoctorIds);

    if (verifiedOnly) {
      doctorQuery = doctorQuery.eq(
        "verification_status",
        "verified"
      );
    }

    const [
      doctorsResult,
      availabilityResult,
    ] = await Promise.all([
      doctorQuery,

      admin
        .from("availability")
        .select("doctor_id")
        .in("doctor_id", matchingDoctorIds)
        .eq("is_active", true),
    ]);

    if (doctorsResult.error) {
      console.error(
        "Nearby doctors lookup failed:",
        doctorsResult.error
      );

      return jsonError(
        "Medicii nu au putut fi încărcați.",
        500
      );
    }

    if (availabilityResult.error) {
      console.error(
        "Nearby availability lookup failed:",
        availabilityResult.error
      );

      return jsonError(
        "Disponibilitatea medicilor nu a putut fi verificată.",
        500
      );
    }

    const doctors =
      (doctorsResult.data ?? []) as DoctorRow[];

    const availableDoctorIds = new Set(
      (
        availabilityResult.data ?? []
      ).map(
        (row: AvailabilityRow) => row.doctor_id
      )
    );

    const clinicById = new Map(
      clinics.map((clinic) => [
        clinic.id,
        clinic,
      ])
    );

    const specialtyByDoctorId = new Map(
      doctorSpecialties.map((row) => [
        row.doctor_id,
        getSingleRelation(row.specialties),
      ])
    );

    const publicDoctors = doctors
      .flatMap(
        (
          doctor
        ): PublicNearbyDoctor[] => {
          if (
            onlineOnly &&
            !availableDoctorIds.has(doctor.id)
          ) {
            return [];
          }

          const doctorClinicRows =
            doctorClinics.filter(
              (row) =>
                row.doctor_id === doctor.id
            );

          if (doctorClinicRows.length === 0) {
            return [];
          }

          const nearestClinicRow =
            doctorClinicRows
              .map((row) => ({
                row,
                distance:
                  clinicDistanceMap.get(
                    row.clinic_id
                  ) ??
                  Number.POSITIVE_INFINITY,
              }))
              .sort(
                (first, second) =>
                  first.distance -
                  second.distance
              )[0];

          const clinic = clinicById.get(
            nearestClinicRow.row.clinic_id
          );

          if (!clinic) {
            return [];
          }

          const city = getSingleRelation(
            clinic.cities
          );

          const clinicName =
            getTranslationValue(
              clinic.clinic_translations,
              "name"
            );

          const cityName =
            getTranslationValue(
              city?.city_translations,
              "name"
            );

          const specialty =
            specialtyByDoctorId.get(doctor.id);

          const specialtyName =
            getTranslationValue(
              specialty?.specialty_translations,
              "name"
            );

          if (
            !clinicName ||
            !cityName ||
            !specialty?.slug ||
            !specialtyName
          ) {
            return [];
          }

          return [
            {
              id: doctor.id,
              slug: doctor.slug,
              name: formatDoctorName(
                doctor.slug
              ),
              title:
                getTranslationValue(
                  doctor.doctor_translations,
                  "title"
                ) ?? "Medic",
              photoUrl: doctor.photo_url,
              specialty: {
                slug: specialty.slug,
                name: specialtyName,
              },
              clinic: {
                id: clinic.id,
                slug: clinic.slug,
                name: clinicName,
                cityName,
                citySlug: city?.slug ?? null,
                countryCode:
                  city?.country_code ?? null,
                formattedAddress:
                  clinic.formatted_address,
                googleMapsUri:
                  clinic.google_maps_uri,
                distanceKilometres: Number(
                  (
                    nearestClinicRow.distance /
                    1000
                  ).toFixed(1)
                ),
              },
              averageRating:
                normalizeNumber(
                  doctor.average_rating
                ) ?? 0,
              reviewCount:
                doctor.review_count ?? 0,
              yearsExperience:
                doctor.years_experience,
              consultationPrice:
                normalizeNumber(
                  doctor.consultation_price
                ),
              isVerified:
                doctor.verification_status ===
                "verified",
              hasOnlineAvailability:
                availableDoctorIds.has(
                  doctor.id
                ),
            },
          ];
        }
      )
      .sort(
        (first, second) =>
          first.clinic.distanceKilometres -
            second.clinic
              .distanceKilometres ||
          Number(second.isVerified) -
            Number(first.isVerified) ||
          second.averageRating -
            first.averageRating ||
          second.reviewCount -
            first.reviewCount
      )
      .slice(0, MAX_RESULTS);

    return NextResponse.json(
      {
        doctors: publicDoctors,
        meta: {
          latitude,
          longitude,
          radiusKilometres: radius,
          specialty: specialtySlug,
          verifiedOnly,
          onlineOnly,
          clinicCount: clinicIds.length,
          doctorCount: publicDoctors.length,
        },
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.error(
      "Public nearby doctor API failed:",
      error
    );

    return jsonError(
      "Căutarea medicilor din apropiere nu a putut fi finalizată.",
      500
    );
  }
}
