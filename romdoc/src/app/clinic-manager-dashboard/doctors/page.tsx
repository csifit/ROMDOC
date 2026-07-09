import Link from "next/link";

import DoctorLocationAssignmentControl from "@/components/clinic-manager/doctor-location-assignment-control";
import { createClient } from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
};

type DoctorRelationship = {
  id: string;
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  accepted_profile_id: string | null;
  accepted_account_email: string | null;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type Doctor = {
  id: string;
  slug: string;
  profile_id: string | null;
  status: string | null;
};

type DoctorTranslation = {
  doctor_id: string;
  locale: string;
  title: string | null;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  account_status: string | null;
};

type ClinicTranslation = {
  locale: string;
  name: string | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  clinic_translations: ClinicTranslation[] | null;
};

type ClinicOrganizationClinicRow = {
  organization_id: string;
  clinic_id: string;
  status: string;
  clinics: ClinicRelation | ClinicRelation[] | null;
};

type ApprovedClinicLocation = {
  organizationId: string;
  clinicId: string;
  clinicName: string;
  formattedAddress: string | null;
};

const DOCTOR_MONTHLY_PRICE_RON = 60;

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getFirstRelation<T>(
  relation: T | T[] | null | undefined
): T | null {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function formatSlugName(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getClinicName(clinic: ClinicRelation) {
  return (
    clinic.clinic_translations?.find(
      (translation) => translation.locale === "ro"
    )?.name ??
    clinic.clinic_translations?.[0]?.name ??
    formatSlugName(clinic.slug)
  );
}

function getOrganizationStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activă";

    case "suspended":
      return "Suspendată";

    case "rejected":
      return "Respinsă";

    default:
      return "În verificare";
  }
}

function getInvitationStatusLabel(status: string) {
  switch (status) {
    case "accepted":
      return "Acceptată";

    case "declined":
      return "Refuzată";

    case "expired":
      return "Expirată";

    case "cancelled":
      return "Anulată";

    default:
      return "Trimisă";
  }
}

function getCoverageStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activă";

    case "paused":
      return "Suspendată";

    case "cancelled":
      return "Anulată";

    case "ended":
      return "Încheiată";

    case "none":
      return "Fără acoperire";

    default:
      return "În curs";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "active":
    case "accepted":
      return "bg-green-100 text-green-800";

    case "pending":
    case "none":
      return "bg-amber-100 text-amber-900";

    case "paused":
      return "bg-orange-100 text-orange-800";

    case "declined":
    case "expired":
    case "cancelled":
    case "ended":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getProfileName(profile: Profile | undefined) {
  if (!profile) {
    return "";
  }

  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName;
}

function getDoctorDisplayName({
  relationship,
  doctorsById,
  doctorTitlesById,
  profilesById,
}: {
  relationship: DoctorRelationship;
  doctorsById: Map<string, Doctor>;
  doctorTitlesById: Map<string, string>;
  profilesById: Map<string, Profile>;
}) {
  if (relationship.doctor_id) {
    const title = doctorTitlesById.get(
      relationship.doctor_id
    );

    if (title) {
      return title;
    }

    const doctor = doctorsById.get(
      relationship.doctor_id
    );

    if (doctor?.profile_id) {
      const profileName = getProfileName(
        profilesById.get(doctor.profile_id)
      );

      if (profileName) {
        return profileName;
      }
    }

    if (doctor?.slug) {
      return doctor.slug;
    }
  }

  if (relationship.accepted_profile_id) {
    const profileName = getProfileName(
      profilesById.get(
        relationship.accepted_profile_id
      )
    );

    if (profileName) {
      return profileName;
    }
  }

  return (
    relationship.accepted_account_email ??
    relationship.invited_doctor_email ??
    "Medic invitat"
  );
}

function getDoctorProfileHref(
  relationship: DoctorRelationship,
  doctorsById: Map<string, Doctor>
) {
  if (!relationship.doctor_id) {
    return null;
  }

  const doctor = doctorsById.get(
    relationship.doctor_id
  );

  if (!doctor?.slug) {
    return null;
  }

  return `/doctor/${doctor.slug}`;
}

function DashboardStat({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-gray-900">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

export default async function ClinicManagerDoctorsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = user?.id;

  const { data: memberships } = profileId
    ? await supabase
        .from("clinic_organization_members")
        .select("organization_id")
        .eq("profile_id", profileId)
        .eq("status", "active")
    : { data: [] };

  const activeMemberships =
    (memberships ?? []) as OrganizationMember[];

  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  let organizations: ClinicOrganization[] = [];
  let relationships: DoctorRelationship[] = [];
  let approvedLocations: ApprovedClinicLocation[] = [];

  if (organizationIds.length > 0) {
    const [
      organizationsResult,
      relationshipsResult,
      locationsResult,
    ] = await Promise.all([
      supabase
        .from("clinic_organizations")
        .select(
          `
            id,
            name,
            status
          `
        )
        .in("id", organizationIds)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("clinic_doctor_relationships")
        .select(
          `
            id,
            organization_id,
            clinic_id,
            doctor_id,
            accepted_profile_id,
            accepted_account_email,
            invited_doctor_email,
            invitation_status,
            payment_responsibility,
            coverage_status,
            accepted_at,
            expires_at,
            created_at
          `
        )
        .in("organization_id", organizationIds)
        .eq("payment_responsibility", "clinic_paid")
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("clinic_organization_clinics")
        .select(
          `
            organization_id,
            clinic_id,
            status,
            clinics (
              id,
              slug,
              status,
              formatted_address,
              clinic_translations (
                locale,
                name
              )
            )
          `
        )
        .in("organization_id", organizationIds)
        .eq("status", "active")
        .order("created_at", {
          ascending: false,
        }),
    ]);

    organizations =
      (organizationsResult.data ?? []) as ClinicOrganization[];

    relationships =
      (relationshipsResult.data ?? []) as DoctorRelationship[];

    const locationRows =
      (locationsResult.data ??
        []) as unknown as ClinicOrganizationClinicRow[];

    approvedLocations = locationRows.flatMap(
      (location): ApprovedClinicLocation[] => {
        const clinic = getFirstRelation(
          location.clinics
        );

        if (
          !clinic ||
          clinic.status !== "approved"
        ) {
          return [];
        }

        return [
          {
            organizationId: location.organization_id,
            clinicId: location.clinic_id,
            clinicName: getClinicName(clinic),
            formattedAddress:
              clinic.formatted_address,
          },
        ];
      }
    );
  }

  const doctorIds = Array.from(
    new Set(
      relationships
        .map((relationship) => relationship.doctor_id)
        .filter(
          (doctorId): doctorId is string =>
            Boolean(doctorId)
        )
    )
  );

  const acceptedProfileIds = Array.from(
    new Set(
      relationships
        .map(
          (relationship) =>
            relationship.accepted_profile_id
        )
        .filter(
          (acceptedProfileId): acceptedProfileId is string =>
            Boolean(acceptedProfileId)
        )
    )
  );

  let doctors: Doctor[] = [];
  let doctorTranslations: DoctorTranslation[] = [];
  let profiles: Profile[] = [];

  if (doctorIds.length > 0) {
    const [
      doctorsResult,
      translationsResult,
    ] = await Promise.all([
      supabase
        .from("doctors")
        .select("id, slug, profile_id, status")
        .in("id", doctorIds),

      supabase
        .from("doctor_translations")
        .select("doctor_id, locale, title")
        .in("doctor_id", doctorIds),
    ]);

    doctors =
      (doctorsResult.data ?? []) as Doctor[];

    doctorTranslations =
      (translationsResult.data ??
        []) as DoctorTranslation[];
  }

  const profileIds = Array.from(
    new Set([
      ...acceptedProfileIds,
      ...doctors
        .map((doctor) => doctor.profile_id)
        .filter(
          (doctorProfileId): doctorProfileId is string =>
            Boolean(doctorProfileId)
        ),
    ])
  );

  if (profileIds.length > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, role, account_status")
      .in("id", profileIds);

    profiles =
      (profilesData ?? []) as Profile[];
  }

  const organizationsById = new Map(
    organizations.map((organization) => [
      organization.id,
      organization,
    ])
  );

  const doctorsById = new Map(
    doctors.map((doctor) => [doctor.id, doctor])
  );

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );

  const doctorTitlesById = new Map<string, string>();

  for (const translation of doctorTranslations) {
    if (!translation.title) {
      continue;
    }

    const existingTitle = doctorTitlesById.get(
      translation.doctor_id
    );

    if (
      !existingTitle ||
      translation.locale === "ro"
    ) {
      doctorTitlesById.set(
        translation.doctor_id,
        translation.title
      );
    }
  }

  const openInvitations = relationships.filter(
    (relationship) =>
      relationship.invitation_status === "pending"
  );

  const acceptedInvitations = relationships.filter(
    (relationship) =>
      relationship.invitation_status === "accepted"
  );

  const activeCoveredDoctors = relationships.filter(
    (relationship) =>
      relationship.invitation_status === "accepted" &&
      relationship.coverage_status === "active"
  );

  const completedDoctorProfiles = relationships.filter(
    (relationship) => Boolean(relationship.doctor_id)
  );

  const assignedDoctors = relationships.filter(
    (relationship) => Boolean(relationship.clinic_id)
  );

  const monthlyEstimateRon =
    activeCoveredDoctors.length *
    DOCTOR_MONTHLY_PRICE_RON;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Medici gestionați de clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Urmărește medicii invitați de clinică, conturile create prin
          invitație și atribuie fiecare medic unei locații aprobate a
          organizației. Clinica gestionează relația comercială; medicul rămâne
          responsabil pentru propriul profil profesional.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <DashboardStat
          label="Invitații deschise"
          value={openInvitations.length}
          helper="Medici invitați care nu au creat încă un cont."
        />
        <DashboardStat
          label="Conturi create"
          value={acceptedInvitations.length}
          helper="Invitații acceptate prin înregistrarea medicului."
        />
        <DashboardStat
          label="Profiluri medic"
          value={completedDoctorProfiles.length}
          helper="Medici care au deja profil profesional conectat."
        />
        <DashboardStat
          label="Atribuiți locației"
          value={assignedDoctors.length}
          helper="Relații clinic-paid cu locație aprobată selectată."
        />
        <DashboardStat
          label="Estimare lunară"
          value={`${monthlyEstimateRon} RON + TVA`}
          helper="Doar medicii acoperiți activ de clinică."
        />
      </div>

      {organizations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu există încă organizații asociate contului tău
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            După ce contul tău este asociat unei organizații de clinică,
            medicii invitați vor apărea aici.
          </p>
        </section>
      ) : relationships.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu există încă medici invitați
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Folosește pagina de invitații pentru a trimite primul link de
            înregistrare către un medic.
          </p>
          <Link
            href="/clinic-manager-dashboard/invitations"
            className="romdoc-focus-ring mt-5 inline-flex rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#024d49]"
          >
            Invită un medic
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Lista medicilor invitați
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                Atribuie fiecare medic unei locații aprobate din organizația
                clinicii. Lista de locații este limitată la punctele de lucru
                aprobate de RomDoc pentru organizația ta.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/clinic-manager-dashboard/locations"
                className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Gestionează locații
              </Link>

              <Link
                href="/clinic-manager-dashboard/invitations"
                className="romdoc-focus-ring rounded-xl border border-[#036661] px-4 py-2.5 text-sm font-semibold text-[#036661] transition hover:bg-[#036661]/10"
              >
                Invită medic nou
              </Link>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">
                      Medic
                    </th>
                    <th className="px-4 py-3">
                      Organizație
                    </th>
                    <th className="px-4 py-3">
                      Invitație
                    </th>
                    <th className="px-4 py-3">
                      Acoperire
                    </th>
                    <th className="px-4 py-3">
                      Locație aprobată
                    </th>
                    <th className="px-4 py-3">
                      Profil
                    </th>
                    <th className="px-4 py-3">
                      Cost lunar
                    </th>
                    <th className="px-4 py-3">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {relationships.map((relationship) => {
                    const organization =
                      organizationsById.get(
                        relationship.organization_id
                      );

                    const profileHref =
                      getDoctorProfileHref(
                        relationship,
                        doctorsById
                      );

                    const isActiveCovered =
                      relationship.invitation_status ===
                        "accepted" &&
                      relationship.coverage_status ===
                        "active";

                    return (
                      <tr
                        key={relationship.id}
                        className="align-top"
                      >
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900">
                            {getDoctorDisplayName({
                              relationship,
                              doctorsById,
                              doctorTitlesById,
                              profilesById,
                            })}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {relationship.accepted_account_email ??
                              relationship.invited_doctor_email ??
                              "E-mail indisponibil"}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          <p>
                            {organization?.name ??
                              "Organizație necunoscută"}
                          </p>
                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              organization?.status ??
                                "unknown"
                            )}`}
                          >
                            {getOrganizationStatusLabel(
                              organization?.status ??
                                "unknown"
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              relationship.invitation_status
                            )}`}
                          >
                            {getInvitationStatusLabel(
                              relationship.invitation_status
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              relationship.coverage_status
                            )}`}
                          >
                            {getCoverageStatusLabel(
                              relationship.coverage_status
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <DoctorLocationAssignmentControl
                            relationshipId={
                              relationship.id
                            }
                            organizationId={
                              relationship.organization_id
                            }
                            currentClinicId={
                              relationship.clinic_id
                            }
                            locations={approvedLocations}
                          />
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {profileHref ? (
                            <Link
                              href={profileHref}
                              className="font-semibold text-[#036661] underline-offset-4 hover:underline"
                            >
                              Vezi profilul public
                            </Link>
                          ) : relationship.accepted_profile_id ? (
                            <span>
                              Cont creat, profil în pregătire
                            </span>
                          ) : (
                            <span>
                              În așteptarea înregistrării
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {isActiveCovered
                            ? `${DOCTOR_MONTHLY_PRICE_RON} RON/lună + TVA`
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-xs leading-5 text-gray-600">
                          <p>
                            Invitat:{" "}
                            {formatDate(
                              relationship.created_at
                            )}
                          </p>
                          <p>
                            Acceptat:{" "}
                            {formatDate(
                              relationship.accepted_at
                            )}
                          </p>
                          <p>
                            Expiră:{" "}
                            {formatDate(
                              relationship.expires_at
                            )}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            Medicii pot fi atribuiți doar locațiilor aprobate ale organizației.
            Dacă lista de locații este goală, creează mai întâi o cerere în
            pagina Locații și așteaptă aprobarea RomDoc pentru punctul de lucru.
          </div>
        </section>
      )}
    </div>
  );
}
