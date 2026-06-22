import type { SupabaseClient } from "@supabase/supabase-js";

export type DoctorOnboardingItemKey =
  | "identity"
  | "contact"
  | "publicProfile"
  | "photo"
  | "specialty"
  | "service"
  | "clinic"
  | "availability";

export type DoctorOnboardingItem = {
  key: DoctorOnboardingItemKey;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  completed: boolean;
};

export type DoctorProfileCompletion = {
  doctorId: string;
  doctorSlug: string;
  doctorStatus: string;
  verificationStatus: string;
  completedItems: number;
  totalItems: number;
  percentage: number;
  isComplete: boolean;
  items: DoctorOnboardingItem[];
};

type DoctorTranslation = {
  locale: string;
  title: string | null;
  biography: string | null;
};

type DoctorRecord = {
  id: string;
  slug: string;
  status: string;
  phone: string | null;
  email: string | null;
  years_experience: number | null;
  consultation_price: number | string | null;
  photo_url: string | null;
  verification_status: string | null;
  doctor_translations: DoctorTranslation[] | null;
};

function hasMeaningfulText(
  value: string | null | undefined,
  minimumLength = 1
) {
  return (
    typeof value === "string" &&
    value.trim().length >= minimumLength
  );
}

export async function getDoctorProfileCompletion(
  supabase: SupabaseClient,
  profileId: string,
  profileFirstName: string | null,
  profileLastName: string | null
): Promise<DoctorProfileCompletion | null> {
  const {
    data: doctorData,
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
      photo_url,
      verification_status,
      doctor_translations (
        locale,
        title,
        biography
      )
    `)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (doctorError) {
    console.error(
      "Doctor completion doctor query failed:",
      doctorError
    );

    return null;
  }

  if (!doctorData) {
    return null;
  }

  const doctor = doctorData as unknown as DoctorRecord;

  const [
    specialtyResult,
    serviceResult,
    clinicResult,
    availabilityResult,
  ] = await Promise.all([
    supabase
      .from("doctor_specialties")
      .select("doctor_id", {
        count: "exact",
        head: true,
      })
      .eq("doctor_id", doctor.id),

    supabase
      .from("doctor_services")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("doctor_id", doctor.id)
      .eq("is_active", true),

    supabase
      .from("doctor_clinics")
      .select("clinic_id", {
        count: "exact",
        head: true,
      })
      .eq("doctor_id", doctor.id),

    supabase
      .from("availability")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("doctor_id", doctor.id)
      .eq("is_active", true),
  ]);

  if (specialtyResult.error) {
    console.error(
      "Doctor completion specialty query failed:",
      specialtyResult.error
    );
  }

  if (serviceResult.error) {
    console.error(
      "Doctor completion service query failed:",
      serviceResult.error
    );
  }

  if (clinicResult.error) {
    console.error(
      "Doctor completion clinic query failed:",
      clinicResult.error
    );
  }

  if (availabilityResult.error) {
    console.error(
      "Doctor completion availability query failed:",
      availabilityResult.error
    );
  }

  const romanianTranslation =
    doctor.doctor_translations?.find(
      (translation) => translation.locale === "ro"
    ) ??
    doctor.doctor_translations?.[0] ??
    null;

  const identityComplete =
    hasMeaningfulText(profileFirstName, 2) &&
    hasMeaningfulText(profileLastName, 2);

  const contactComplete =
    hasMeaningfulText(doctor.phone, 6) &&
    hasMeaningfulText(doctor.email, 5);

  const publicProfileComplete =
    hasMeaningfulText(romanianTranslation?.title, 2) &&
    hasMeaningfulText(romanianTranslation?.biography, 80) &&
    doctor.years_experience !== null &&
    Number(doctor.years_experience) >= 0 &&
    doctor.consultation_price !== null &&
    Number(doctor.consultation_price) >= 0;

  const specialtyComplete =
    (specialtyResult.count ?? 0) > 0;

  const serviceComplete =
    (serviceResult.count ?? 0) > 0;

  const clinicComplete =
    (clinicResult.count ?? 0) > 0;

  const availabilityComplete =
    (availabilityResult.count ?? 0) > 0;

  const items: DoctorOnboardingItem[] = [
    {
      key: "identity",
      title: "Identitatea contului",
      description:
        "Adaugă prenumele și numele complet în contul RomDoc.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Completează identitatea",
      completed: identityComplete,
    },
    {
      key: "contact",
      title: "Date de contact",
      description:
        "Adaugă un număr de telefon și o adresă de e-mail profesională.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Completează contactul",
      completed: contactComplete,
    },
    {
      key: "publicProfile",
      title: "Profilul public",
      description:
        "Completează titlul, biografia, experiența și prețul consultației.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Editează profilul",
      completed: publicProfileComplete,
    },
    {
      key: "photo",
      title: "Fotografie profesională",
      description:
        "Publică o fotografie clară pentru profilul afișat pacienților.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Adaugă fotografia",
      completed: hasMeaningfulText(doctor.photo_url, 10),
    },
    {
      key: "specialty",
      title: "Specialitate medicală",
      description:
        "Asociază profilul cu cel puțin o specialitate medicală.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Configurează specialitatea",
      completed: specialtyComplete,
    },
    {
      key: "service",
      title: "Servicii și tarife",
      description:
        "Publică cel puțin un serviciu medical activ cu tarif.",
      href: "/doctor-dashboard/profile",
      actionLabel: "Adaugă un serviciu",
      completed: serviceComplete,
    },
    {
      key: "clinic",
      title: "Clinică aprobată",
      description:
        "Asociază profilul cu cel puțin o clinică disponibilă în RomDoc.",
      href: "/doctor-dashboard/clinics",
      actionLabel: "Gestionează clinicile",
      completed: clinicComplete,
    },
    {
      key: "availability",
      title: "Program de lucru",
      description:
        "Configurează cel puțin un interval activ pentru programări.",
      href: "/doctor-dashboard/availability",
      actionLabel: "Configurează programul",
      completed: availabilityComplete,
    },
  ];

  const completedItems = items.filter(
    (item) => item.completed
  ).length;

  const totalItems = items.length;

  const percentage = Math.round(
    (completedItems / totalItems) * 100
  );

  return {
    doctorId: doctor.id,
    doctorSlug: doctor.slug,
    doctorStatus: doctor.status,
    verificationStatus:
      doctor.verification_status ?? "not_submitted",
    completedItems,
    totalItems,
    percentage,
    isComplete: completedItems === totalItems,
    items,
  };
}
