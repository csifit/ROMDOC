import {
  NextResponse,
} from "next/server";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type ClinicTranslationRow = {
  locale: string;
  name: string;
};

type CityTranslationRow = {
  locale: string;
  name: string;
};

type CityRelation =
  | {
      slug:
        | string
        | null;

      city_translations:
        | CityTranslationRow[]
        | null;
    }
  | Array<{
      slug:
        | string
        | null;

      city_translations:
        | CityTranslationRow[]
        | null;
    }>
  | null;

type ClinicRow = {
  id: string;
  slug:
    | string
    | null;

  formatted_address:
    | string
    | null;

  street_address:
    | string
    | null;

  latitude:
    | number
    | string
    | null;

  longitude:
    | number
    | string
    | null;

  google_maps_uri:
    | string
    | null;

  clinic_translations:
    | ClinicTranslationRow[]
    | null;

  cities:
    CityRelation;
};

type DoctorClinicRow = {
  clinic_id: string;
  doctor_id: string;
};

type DoctorRow = {
  id: string;
  status:
    | string
    | null;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialty_id: string;
};

export type PublicClinicMapItem = {
  id: string;
  slug: string;
  name: string;
  cityName: string;
  citySlug:
    | string
    | null;

  formattedAddress: string;
  latitude: number;
  longitude: number;
  googleMapsUri:
    | string
    | null;

  doctorCount: number;
  specialtyCount: number;
};

function getSingleRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation ?? null;
}

function getRomanianTranslationName(
  translations:
    | Array<{
        locale: string;
        name: string;
      }>
    | null
    | undefined
) {
  if (!translations?.length) {
    return null;
  }

  const romanian =
    translations.find(
      (translation) =>
        translation.locale ===
        "ro"
    );

  return (
    romanian?.name?.trim() ||
    translations[0]?.name?.trim() ||
    null
  );
}

function toCoordinate(
  value:
    | number
    | string
    | null
) {
  if (
    typeof value === "number"
  ) {
    return Number.isFinite(value)
      ? value
      : null;
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(parsed)
      ? parsed
      : null;
  }

  return null;
}

function isValidLatitude(
  latitude: number
) {
  return (
    latitude >= -90 &&
    latitude <= 90
  );
}

function isValidLongitude(
  longitude: number
) {
  return (
    longitude >= -180 &&
    longitude <= 180
  );
}

function createCountMap(
  rows: DoctorClinicRow[],
  activeDoctorIds:
    Set<string>
) {
  const doctorIdsByClinic =
    new Map<
      string,
      Set<string>
    >();

  for (const row of rows) {
    if (
      !activeDoctorIds.has(
        row.doctor_id
      )
    ) {
      continue;
    }

    const existing =
      doctorIdsByClinic.get(
        row.clinic_id
      ) ??
      new Set<string>();

    existing.add(
      row.doctor_id
    );

    doctorIdsByClinic.set(
      row.clinic_id,
      existing
    );
  }

  return doctorIdsByClinic;
}

export async function GET(): Promise<Response> {
  try {
    const admin =
      createAdminClient();

    const {
      data: clinicData,
      error: clinicsError,
    } = await admin
      .from("clinics")
      .select(`
        id,
        slug,
        formatted_address,
        street_address,
        latitude,
        longitude,
        google_maps_uri,
        clinic_translations (
          locale,
          name
        ),
        cities (
          slug,
          city_translations (
            locale,
            name
          )
        )
      `)
      .eq(
        "status",
        "approved"
      )
      .not(
        "latitude",
        "is",
        null
      )
      .not(
        "longitude",
        "is",
        null
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (clinicsError) {
      console.error(
        "Public clinic map query failed:",
        clinicsError
      );

      return NextResponse.json(
        {
          error:
            "Clinicile nu au putut fi încărcate.",
        },
        {
          status: 500,
        }
      );
    }

    const clinics =
      (clinicData ??
        []) as ClinicRow[];

    if (
      clinics.length === 0
    ) {
      return NextResponse.json(
        {
          clinics: [],
        },
        {
          headers: {
            "Cache-Control":
              "public, s-maxage=300, stale-while-revalidate=600",
          },
        }
      );
    }

    const clinicIds =
      clinics.map(
        (clinic) =>
          clinic.id
      );

    const {
      data:
        doctorClinicData,
      error:
        doctorClinicsError,
    } = await admin
      .from("doctor_clinics")
      .select(`
        clinic_id,
        doctor_id
      `)
      .in(
        "clinic_id",
        clinicIds
      );

    if (
      doctorClinicsError
    ) {
      console.error(
        "Public clinic doctor-link query failed:",
        doctorClinicsError
      );

      return NextResponse.json(
        {
          error:
            "Asocierile medicilor nu au putut fi încărcate.",
        },
        {
          status: 500,
        }
      );
    }

    const doctorClinics =
      (doctorClinicData ??
        []) as DoctorClinicRow[];

    const linkedDoctorIds =
      Array.from(
        new Set(
          doctorClinics.map(
            (row) =>
              row.doctor_id
          )
        )
      );

    let activeDoctorIds =
      new Set<string>();

    let doctorSpecialties:
      DoctorSpecialtyRow[] = [];

    if (
      linkedDoctorIds.length >
      0
    ) {
      const [
        doctorsResult,
        specialtiesResult,
      ] =
        await Promise.all([
          admin
            .from("doctors")
            .select(`
              id,
              status
            `)
            .in(
              "id",
              linkedDoctorIds
            )
            .eq(
              "status",
              "active"
            ),

          admin
            .from(
              "doctor_specialties"
            )
            .select(`
              doctor_id,
              specialty_id
            `)
            .in(
              "doctor_id",
              linkedDoctorIds
            ),
        ]);

      if (
        doctorsResult.error
      ) {
        console.error(
          "Public clinic active-doctor query failed:",
          doctorsResult.error
        );

        return NextResponse.json(
          {
            error:
              "Medicii clinicilor nu au putut fi încărcați.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        specialtiesResult.error
      ) {
        console.error(
          "Public clinic specialties query failed:",
          specialtiesResult.error
        );

        return NextResponse.json(
          {
            error:
              "Specialitățile clinicilor nu au putut fi încărcate.",
          },
          {
            status: 500,
          }
        );
      }

      activeDoctorIds =
        new Set(
          (
            doctorsResult.data ??
            []
          )
            .filter(
              (
                doctor
              ): doctor is DoctorRow =>
                Boolean(
                  doctor?.id
                )
            )
            .map(
              (doctor) =>
                doctor.id
            )
        );

      doctorSpecialties =
        (
          specialtiesResult.data ??
          []
        ) as DoctorSpecialtyRow[];
    }

    const doctorIdsByClinic =
      createCountMap(
        doctorClinics,
        activeDoctorIds
      );

    const specialtiesByDoctor =
      new Map<
        string,
        Set<string>
      >();

    for (
      const row of
        doctorSpecialties
    ) {
      if (
        !activeDoctorIds.has(
          row.doctor_id
        )
      ) {
        continue;
      }

      const existing =
        specialtiesByDoctor.get(
          row.doctor_id
        ) ??
        new Set<string>();

      existing.add(
        row.specialty_id
      );

      specialtiesByDoctor.set(
        row.doctor_id,
        existing
      );
    }

    const publicClinics =
      clinics.flatMap(
        (
          clinic
        ): PublicClinicMapItem[] => {
          const latitude =
            toCoordinate(
              clinic.latitude
            );

          const longitude =
            toCoordinate(
              clinic.longitude
            );

          if (
            latitude === null ||
            longitude === null ||
            !isValidLatitude(
              latitude
            ) ||
            !isValidLongitude(
              longitude
            )
          ) {
            return [];
          }

          const city =
            getSingleRelation(
              clinic.cities
            );

          const clinicName =
            getRomanianTranslationName(
              clinic
                .clinic_translations
            );

          const cityName =
            getRomanianTranslationName(
              city
                ?.city_translations
            );

          const formattedAddress =
            clinic
              .formatted_address
              ?.trim() ||
            clinic
              .street_address
              ?.trim();

          if (
            !clinicName ||
            !cityName ||
            !formattedAddress
          ) {
            return [];
          }

          const activeClinicDoctors =
            doctorIdsByClinic.get(
              clinic.id
            ) ??
            new Set<string>();

          const clinicSpecialtyIds =
            new Set<string>();

          for (
            const doctorId of
              activeClinicDoctors
          ) {
            const specialtyIds =
              specialtiesByDoctor.get(
                doctorId
              );

            if (!specialtyIds) {
              continue;
            }

            for (
              const specialtyId of
                specialtyIds
            ) {
              clinicSpecialtyIds.add(
                specialtyId
              );
            }
          }

          return [
            {
              id:
                clinic.id,

              slug:
                clinic.slug ??
                clinic.id,

              name:
                clinicName,

              cityName,

              citySlug:
                city?.slug ??
                null,

              formattedAddress,

              latitude,

              longitude,

              googleMapsUri:
                clinic.google_maps_uri
                  ?.trim() ??
                null,

              doctorCount:
                activeClinicDoctors.size,

              specialtyCount:
                clinicSpecialtyIds.size,
            },
          ];
        }
      );

    publicClinics.sort(
      (first, second) =>
        first.cityName.localeCompare(
          second.cityName,
          "ro"
        ) ||
        first.name.localeCompare(
          second.name,
          "ro"
        )
    );

    return NextResponse.json(
      {
        clinics:
          publicClinics,
      },
      {
        headers: {
          "Cache-Control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error(
      "Public clinic map API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Harta clinicilor nu a putut fi încărcată.",
      },
      {
        status: 500,
      }
    );
  }
}
