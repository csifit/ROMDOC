import {
  NextRequest,
  NextResponse,
} from "next/server";

import type {
  AppLocale,
} from "@/lib/i18n/app-locale";
import {
  getRequestAppLocale,
} from "@/lib/i18n/request-app-locale";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type TranslationRow = {
  locale: string;
  name: string;
};

type CityRelation = {
  slug:
    | string
    | null;

  city_translations:
    | TranslationRow[]
    | null;
};

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
    | TranslationRow[]
    | null;

  cities:
    | CityRelation
    | CityRelation[]
    | null;
};

type DoctorClinicRow = {
  clinic_id: string;
  doctor_id: string;
};

type DoctorRow = {
  id: string;
};

type DoctorSpecialtyRow = {
  doctor_id: string;
  specialty_id: string;
};

const errorCopy = {
  ro:
    "Harta clinicilor nu a putut fi încărcată.",

  en:
    "The clinic map could not be loaded.",

  de:
    "Die Klinikkarte konnte nicht geladen werden.",
} as const;

function getSingleRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    Array.isArray(
      relation
    )
  ) {
    return (
      relation[0] ??
      null
    );
  }

  return (
    relation ??
    null
  );
}

function getTranslatedName(
  translations:
    | TranslationRow[]
    | null
    | undefined,
  locale: AppLocale
) {
  if (
    !translations
      ?.length
  ) {
    return null;
  }

  const requested =
    translations.find(
      (
        translation
      ) =>
        translation.locale ===
        locale
    );

  const romanian =
    translations.find(
      (
        translation
      ) =>
        translation.locale ===
        "ro"
    );

  return (
    requested?.name
      ?.trim() ||
    romanian?.name
      ?.trim() ||
    translations[0]
      ?.name
      ?.trim() ||
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
    typeof value ===
    "number"
  ) {
    return Number.isFinite(
      value
    )
      ? value
      : null;
  }

  if (
    typeof value ===
    "string"
  ) {
    const parsed =
      Number(value);

    return Number.isFinite(
      parsed
    )
      ? parsed
      : null;
  }

  return null;
}

function mapError(
  locale: AppLocale,
  context: string,
  error: unknown
) {
  console.error(
    context,
    error
  );

  return NextResponse.json(
    {
      error:
        errorCopy[locale],
    },
    {
      status: 500,
    }
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const locale =
    getRequestAppLocale(
      request
    );

  try {
    const admin =
      createAdminClient();

    const {
      data:
        clinicData,
      error:
        clinicsError,
    } = await admin
      .from(
        "clinics"
      )
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

    if (
      clinicsError
    ) {
      return mapError(
        locale,
        "Public clinic map query failed:",
        clinicsError
      );
    }

    const clinics =
      (
        clinicData ??
        []
      ) as
        ClinicRow[];

    if (
      clinics.length ===
      0
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
        (
          clinic
        ) =>
          clinic.id
      );

    const {
      data:
        doctorClinicData,
      error:
        doctorClinicsError,
    } = await admin
      .from(
        "doctor_clinics"
      )
      .select(
        "clinic_id, doctor_id"
      )
      .in(
        "clinic_id",
        clinicIds
      );

    if (
      doctorClinicsError
    ) {
      return mapError(
        locale,
        "Public clinic map doctor-link query failed:",
        doctorClinicsError
      );
    }

    const doctorClinics =
      (
        doctorClinicData ??
        []
      ) as
        DoctorClinicRow[];

    const linkedDoctorIds =
      Array.from(
        new Set(
          doctorClinics.map(
            (
              row
            ) =>
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
            .from(
              "doctors"
            )
            .select(
              "id"
            )
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
            .select(
              "doctor_id, specialty_id"
            )
            .in(
              "doctor_id",
              linkedDoctorIds
            ),
        ]);

      if (
        doctorsResult.error
      ) {
        return mapError(
          locale,
          "Public clinic map active-doctor query failed:",
          doctorsResult.error
        );
      }

      if (
        specialtiesResult.error
      ) {
        return mapError(
          locale,
          "Public clinic map specialty query failed:",
          specialtiesResult.error
        );
      }

      activeDoctorIds =
        new Set(
          (
            doctorsResult.data ??
            []
          ).map(
            (
              doctor:
                DoctorRow
            ) =>
              doctor.id
          )
        );

      doctorSpecialties =
        (
          specialtiesResult
            .data ??
          []
        ) as
          DoctorSpecialtyRow[];
    }

    const activeDoctorIdsByClinic =
      new Map<
        string,
        Set<string>
      >();

    for (
      const link of
        doctorClinics
    ) {
      if (
        !activeDoctorIds.has(
          link.doctor_id
        )
      ) {
        continue;
      }

      const clinicDoctors =
        activeDoctorIdsByClinic
          .get(
            link.clinic_id
          ) ??
        new Set<string>();

      clinicDoctors.add(
        link.doctor_id
      );

      activeDoctorIdsByClinic
        .set(
          link.clinic_id,
          clinicDoctors
        );
    }

    const specialtyIdsByDoctor =
      new Map<
        string,
        Set<string>
      >();

    for (
      const relation of
        doctorSpecialties
    ) {
      if (
        !activeDoctorIds.has(
          relation.doctor_id
        )
      ) {
        continue;
      }

      const specialties =
        specialtyIdsByDoctor
          .get(
            relation.doctor_id
          ) ??
        new Set<string>();

      specialties.add(
        relation.specialty_id
      );

      specialtyIdsByDoctor
        .set(
          relation.doctor_id,
          specialties
        );
    }

    const publicClinics =
      clinics.flatMap(
        (
          clinic
        ) => {
          const latitude =
            toCoordinate(
              clinic.latitude
            );

          const longitude =
            toCoordinate(
              clinic.longitude
            );

          if (
            latitude ===
              null ||
            longitude ===
              null ||
            latitude < -90 ||
            latitude > 90 ||
            longitude < -180 ||
            longitude > 180
          ) {
            return [];
          }

          const city =
            getSingleRelation(
              clinic.cities
            );

          const clinicName =
            getTranslatedName(
              clinic
                .clinic_translations,
              locale
            );

          const cityName =
            getTranslatedName(
              city
                ?.city_translations,
              locale
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

          const clinicDoctorIds =
            activeDoctorIdsByClinic
              .get(
                clinic.id
              ) ??
            new Set<string>();

          const clinicSpecialtyIds =
            new Set<string>();

          for (
            const doctorId of
              clinicDoctorIds
          ) {
            const specialties =
              specialtyIdsByDoctor
                .get(
                  doctorId
                );

            if (
              !specialties
            ) {
              continue;
            }

            for (
              const specialtyId of
                specialties
            ) {
              clinicSpecialtyIds
                .add(
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
                clinic
                  .google_maps_uri
                  ?.trim() ??
                null,

              doctorCount:
                clinicDoctorIds
                  .size,

              specialtyCount:
                clinicSpecialtyIds
                  .size,
            },
          ];
        }
      );

    publicClinics.sort(
      (
        first,
        second
      ) =>
        first.cityName
          .localeCompare(
            second.cityName,
            locale
          ) ||
        first.name
          .localeCompare(
            second.name,
            locale
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
  } catch (
    error
  ) {
    return mapError(
      locale,
      "Public clinic map API failed:",
      error
    );
  }
}
