import Link from "next/link";
import { redirect } from "next/navigation";
import DoctorProfileForm from "@/components/doctor/doctor-profile-form";
import DoctorServicesManager, {
  type DoctorServiceItem,
} from "@/components/doctor/doctor-services-manager";
import { createClient } from "@/lib/supabase/server";

type DoctorTranslation = {
  locale: string;
  title: string | null;
  biography: string | null;
};

type ServiceTranslation = {
  locale: string;
  name: string;
};

type DoctorServiceRow = {
  id: string;
  price: number | string;
  currency: string;
  sort_order: number;
  is_active: boolean;

  doctor_service_translations:
    | ServiceTranslation[]
    | null;
};

function getRomanianDoctorTranslation(
  translations: DoctorTranslation[] | null
) {
  return (
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    ) ?? null
  );
}

function getRomanianServiceName(
  translations: ServiceTranslation[] | null
) {
  const romanianTranslation =
    translations?.find(
      (translation) =>
        translation.locale === "ro"
    );

  const fallbackTranslation =
    translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    "Serviciu fără denumire"
  );
}

function isSupportedCurrency(
  currency: string
): currency is "RON" | "EUR" {
  return (
    currency === "RON" ||
    currency === "EUR"
  );
}

export default async function DoctorProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error(
      "Doctor profile page profile query failed:",
      profileError
    );
  }

  if (
    !profile ||
    profile.role !== "doctor"
  ) {
    redirect("/");
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select(`
      id,
      slug,
      status,
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
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor profile page doctor query failed:",
      doctorError
    );
  }

  if (!doctor) {
    return (
      <main className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-900">
            Contul tău nu este asociat unui
            profil de medic.
          </div>
        </div>
      </main>
    );
  }

  const {
    data: servicesData,
    error: servicesError,
  } = await supabase
    .from("doctor_services")
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
    .eq("doctor_id", doctor.id)
    .order("sort_order", {
      ascending: true,
    })
    .order("created_at", {
      ascending: true,
    });

  if (servicesError) {
    console.error(
      "Doctor profile services query failed:",
      servicesError
    );
  }

  const translation =
    getRomanianDoctorTranslation(
      doctor.doctor_translations
    );

  const serviceRows =
    (servicesData as unknown as
      | DoctorServiceRow[]
      | null) ?? [];

  const services: DoctorServiceItem[] =
    serviceRows
      .filter((service) =>
        isSupportedCurrency(
          service.currency
        )
      )
      .map((service) => ({
        id: service.id,

        name:
          getRomanianServiceName(
            service.doctor_service_translations
          ),

        price: Number(service.price),

        currency: service.currency as
          | "RON"
          | "EUR",

        sortOrder:
          service.sort_order,

        isActive:
          service.is_active,
      }));

  const displayName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <main className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-medium text-gray-500">
              Panou medic
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Profilul meu
            </h1>

            <p className="mt-3 max-w-3xl text-gray-600">
              Actualizează informațiile publice,
              biografia și lista serviciilor
              medicale.
            </p>

            {displayName && (
              <p className="mt-2 text-sm font-medium text-gray-700">
                {displayName}
              </p>
            )}
          </div>

          <Link
            href={`/doctor/${doctor.slug}`}
            target="_blank"
            rel="noreferrer"
            className="w-fit rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-800 transition hover:bg-gray-50"
          >
            Vezi profilul public
          </Link>
        </header>

        {doctor.status !== "active" && (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
            Profilul tău are momentan starea{" "}
            <strong>{doctor.status}</strong>.
            Modificările pot fi salvate, dar
            profilul public poate rămâne limitat
            până la activare.
          </div>
        )}

        <div className="mt-10 space-y-8">
          <DoctorProfileForm
            initialPhone={
              doctor.phone ?? ""
            }
            initialEmail={
              doctor.email ?? ""
            }
            initialYearsExperience={
              doctor.years_experience
            }
            initialConsultationPrice={
              doctor.consultation_price ===
              null
                ? null
                : Number(
                    doctor.consultation_price
                  )
            }
            initialTitleRo={
              translation?.title ?? ""
            }
            initialBiographyRo={
              translation?.biography ?? ""
            }
          />

          {servicesError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
              Serviciile nu au putut fi
              încărcate.
            </div>
          ) : (
            <DoctorServicesManager
              initialServices={services}
            />
          )}
        </div>
      </div>
    </main>
  );
}