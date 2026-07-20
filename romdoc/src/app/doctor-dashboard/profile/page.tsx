import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import DoctorClinicEditingPanel from "@/components/doctor/doctor-clinic-editing-panel";
import DoctorPhotoManager from "@/components/doctor/doctor-photo-manager";
import DoctorProfileForm from "@/components/doctor/doctor-profile-form";
import DoctorServicesManager, {
  type DoctorServiceItem,
} from "@/components/doctor/doctor-services-manager";
import DoctorSpecialtiesManager, {
  type DoctorSpecialtyOption,
} from "@/components/doctor/doctor-specialties-manager";
import {
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorTranslation = {
  locale: string;

  title:
    | string
    | null;

  biography:
    | string
    | null;
};

type ServiceTranslation = {
  locale: string;
  name: string;
};

type DoctorServiceRow = {
  id: string;

  price:
    | number
    | string;

  currency: string;
  sort_order: number;
  is_active: boolean;

  doctor_service_translations:
    | ServiceTranslation[]
    | null;
};

type SpecialtyTranslation = {
  locale: string;
  name: string;
};

type SpecialtyRow = {
  id: string;
  slug: string;

  specialty_translations:
    | SpecialtyTranslation[]
    | null;
};

function getRomanianDoctorTranslation(
  translations:
    | DoctorTranslation[]
    | null
) {
  return (
    translations?.find(
      (
        translation
      ) =>
        translation.locale ===
        "ro"
    ) ??
    translations?.[0] ??
    null
  );
}

function getRomanianServiceName(
  translations:
    | ServiceTranslation[]
    | null,
  fallback:
    string
) {
  return (
    translations?.find(
      (
        translation
      ) =>
        translation.locale ===
        "ro"
    )?.name ??
    translations?.[0]
      ?.name ??
    fallback
  );
}

function isSupportedCurrency(
  currency:
    string
): currency is
  | "RON"
  | "EUR" {
  return (
    currency === "RON" ||
    currency === "EUR"
  );
}

export default async function DoctorProfilePage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.profilePage",
    });

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
    const query =
      new URLSearchParams({
        locale,
        next:
          "/doctor-dashboard/profile",
      });

    redirect(
      `/login?${query.toString()}`
    );
  }

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, first_name, last_name"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    !profile ||
    profile.role !==
      "doctor"
  ) {
    redirect(
      "/dashboard"
    );
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
      .select(`
        id,
        slug,
        status,
        photo_url,
        phone,
        email,
        years_experience,
        consultation_price,
        doctor_translations (
          locale,
          title,
          biography
        )
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (
    doctorError
  ) {
    console.error(
      "Doctor profile page doctor query failed:",
      doctorError
    );
  }

  if (
    !doctor
  ) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            {t(
              "missingProfile"
            )}
          </div>
        </div>
      </main>
    );
  }

  const [
    servicesResult,
    specialtiesResult,
    doctorSpecialtiesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "doctor_services"
        )
        .select(`
          id,
          price,
          currency,
          sort_order,
          is_active,
          doctor_service_translations (
            locale,
            name
          )
        `)
        .eq(
          "doctor_id",
          doctor.id
        )
        .order(
          "sort_order",
          {
            ascending:
              true,
          }
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "specialties"
        )
        .select(`
          id,
          slug,
          specialty_translations (
            locale,
            name
          )
        `)
        .eq(
          "is_active",
          true
        )
        .order(
          "slug",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "doctor_specialties"
        )
        .select(
          "specialty_id"
        )
        .eq(
          "doctor_id",
          doctor.id
        ),
    ]);

  const translation =
    getRomanianDoctorTranslation(
      doctor
        .doctor_translations
    );

  const serviceRows =
    (
      servicesResult
        .data as unknown as
        | DoctorServiceRow[]
        | null
    ) ??
    [];

  const services:
    DoctorServiceItem[] =
    serviceRows
      .filter(
        (
          service
        ) =>
          isSupportedCurrency(
            service.currency
          )
      )
      .map(
        (
          service
        ) => ({
          id:
            service.id,

          name:
            getRomanianServiceName(
              service
                .doctor_service_translations,
              t(
                "unnamedService"
              )
            ),

          price:
            Number(
              service.price
            ),

          currency:
            service.currency as
              | "RON"
              | "EUR",

          sortOrder:
            service
              .sort_order,

          isActive:
            service
              .is_active,
        })
      );

  const specialtyRows =
    (
      specialtiesResult
        .data as unknown as
        | SpecialtyRow[]
        | null
    ) ??
    [];

  const specialties:
    DoctorSpecialtyOption[] =
    specialtyRows
      .map(
        (
          specialty
        ) => ({
          id:
            specialty.id,

          slug:
            specialty.slug,

          name:
            selectTranslation(
              specialty
                .specialty_translations,
              locale
            )?.name ??
            specialty.slug,
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          first.name
            .localeCompare(
              second.name,
              locale
            )
      );

  const selectedSpecialtyIds =
    (
      doctorSpecialtiesResult
        .data ??
      []
    ).map(
      (
        item
      ) =>
        item.specialty_id
    );

  const displayName =
    [
      profile.first_name,
      profile.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();

  const publicProfileHref =
    locale === "de"
      ? `/de/arzt/${doctor.slug}`
      : `/${locale}/doctor/${doctor.slug}`;

  const doctorStatus =
    [
      "active",
      "pending",
      "suspended",
      "rejected",
      "draft",
    ].includes(
      doctor.status
    )
      ? t(
          `statuses.${doctor.status}`
        )
      : doctor.status;

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-gray-500">
              {t(
                "eyebrow"
              )}
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              {t(
                "title"
              )}
            </h1>

            <p className="mt-3 max-w-3xl text-gray-600">
              {t(
                "description"
              )}
            </p>

            {displayName && (
              <p className="mt-2 text-sm font-medium text-gray-700">
                {
                  displayName
                }
              </p>
            )}
          </div>

          <Link
            href={
              publicProfileHref
            }
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
          >
            {t(
              "viewPublic"
            )}
          </Link>
        </header>

        {doctor.status !==
          "active" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            {t(
              "inactiveNotice",
              {
                status:
                  doctorStatus,
              }
            )}
          </div>
        )}

        <div className="mt-10 space-y-8">
          <DoctorPhotoManager
            initialPhotoUrl={
              doctor
                .photo_url ??
              null
            }
            doctorName={
              displayName ||
              doctor.slug
            }
          />

          <DoctorProfileForm
            initialPhone={
              doctor.phone ??
              ""
            }
            initialEmail={
              doctor.email ??
              ""
            }
            initialYearsExperience={
              doctor
                .years_experience
            }
            initialConsultationPrice={
              doctor
                .consultation_price ===
              null
                ? null
                : Number(
                    doctor
                      .consultation_price
                  )
            }
            initialTitleRo={
              translation
                ?.title ??
              ""
            }
            initialBiographyRo={
              translation
                ?.biography ??
              ""
            }
          />

          <DoctorClinicEditingPanel
            title={t(
              "clinicsTitle"
            )}
            description={t(
              "clinicsDescription"
            )}
            emptyMessage={t(
              "clinicsEmpty"
            )}
          />

          {specialtiesResult
            .error ||
          doctorSpecialtiesResult
            .error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              {t(
                "specialtiesLoadError"
              )}
            </div>
          ) : (
            <DoctorSpecialtiesManager
              specialties={
                specialties
              }
              initialSpecialtyIds={
                selectedSpecialtyIds
              }
            />
          )}

          {servicesResult
            .error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              {t(
                "servicesLoadError"
              )}
            </div>
          ) : (
            <DoctorServicesManager
              initialServices={
                services
              }
            />
          )}
        </div>
      </div>
    </main>
  );
}
