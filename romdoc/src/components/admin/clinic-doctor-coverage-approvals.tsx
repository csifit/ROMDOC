import { createAdminClient } from "@/lib/supabase/admin";

import ClinicDoctorCoverageActions from "./clinic-doctor-coverage-actions";

type DoctorRelationship = {
  id: string;
  organization_id: string;
  doctor_id: string | null;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
  accepted_at: string | null;
  expires_at: string | null;
  created_at: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
};

type Doctor = {
  id: string;
  slug: string;
  profile_id: string | null;
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
};

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
      return "Așteaptă aprobarea RomDoc";
  }
}

function getDoctorDisplayName(
  relationship: DoctorRelationship,
  doctorsById: Map<string, Doctor>,
  doctorTitlesById: Map<string, string>,
  profilesById: Map<string, Profile>
) {
  if (!relationship.doctor_id) {
    return relationship.invited_doctor_email ?? "Medic invitat";
  }

  const title = doctorTitlesById.get(relationship.doctor_id);

  if (title) {
    return title;
  }

  const doctor = doctorsById.get(relationship.doctor_id);

  if (doctor?.profile_id) {
    const profile = profilesById.get(doctor.profile_id);
    const profileName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    if (profileName) {
      return profileName;
    }
  }

  return doctor?.slug ?? relationship.invited_doctor_email ?? "Medic invitat";
}

export default async function ClinicDoctorCoverageApprovals() {
  const admin = createAdminClient();

  const { data: relationshipsData, error: relationshipsError } = await admin
    .from("clinic_doctor_relationships")
    .select(
      `
        id,
        organization_id,
        doctor_id,
        invited_doctor_email,
        invitation_status,
        payment_responsibility,
        coverage_status,
        accepted_at,
        expires_at,
        created_at
      `
    )
    .eq("payment_responsibility", "clinic_paid")
    .order("created_at", {
      ascending: false,
    });

  if (relationshipsError) {
    console.error("Clinic coverage approvals query failed:", relationshipsError);

    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
        Relațiile medic-clinică nu au putut fi încărcate.
      </section>
    );
  }

  const relationships = (relationshipsData ?? []) as DoctorRelationship[];

  const organizationIds = Array.from(
    new Set(relationships.map((relationship) => relationship.organization_id))
  );

  const doctorIds = Array.from(
    new Set(
      relationships
        .map((relationship) => relationship.doctor_id)
        .filter((doctorId): doctorId is string => Boolean(doctorId))
    )
  );

  let organizations: ClinicOrganization[] = [];
  let doctors: Doctor[] = [];
  let doctorTranslations: DoctorTranslation[] = [];
  let profiles: Profile[] = [];

  if (organizationIds.length > 0) {
    const { data } = await admin
      .from("clinic_organizations")
      .select("id, name")
      .in("id", organizationIds);

    organizations = (data ?? []) as ClinicOrganization[];
  }

  if (doctorIds.length > 0) {
    const [doctorsResult, translationsResult] = await Promise.all([
      admin
        .from("doctors")
        .select("id, slug, profile_id")
        .in("id", doctorIds),

      admin
        .from("doctor_translations")
        .select("doctor_id, locale, title")
        .in("doctor_id", doctorIds),
    ]);

    doctors = (doctorsResult.data ?? []) as Doctor[];
    doctorTranslations = (translationsResult.data ?? []) as DoctorTranslation[];

    const profileIds = Array.from(
      new Set(
        doctors
          .map((doctor) => doctor.profile_id)
          .filter((profileId): profileId is string => Boolean(profileId))
      )
    );

    if (profileIds.length > 0) {
      const { data } = await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", profileIds);

      profiles = (data ?? []) as Profile[];
    }
  }

  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization])
  );

  const doctorsById = new Map(doctors.map((doctor) => [doctor.id, doctor]));
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const doctorTitlesById = new Map<string, string>();

  for (const translation of doctorTranslations) {
    if (!translation.title) {
      continue;
    }

    const existingTitle = doctorTitlesById.get(translation.doctor_id);

    if (!existingTitle || translation.locale === "ro") {
      doctorTitlesById.set(translation.doctor_id, translation.title);
    }
  }

  const pendingApprovalCount = relationships.filter(
    (relationship) =>
      relationship.invitation_status === "accepted" &&
      relationship.coverage_status === "pending_admin_approval"
  ).length;

  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Acoperire abonamente medici
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Aprobă manual medicii care au acceptat invitația clinicii. Doar
            relațiile acceptate pot deveni acoperire activă plătită de clinică.
          </p>
        </div>

        <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
          {pendingApprovalCount} în aprobare
        </span>
      </div>

      {relationships.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
          Nu există încă invitații sau relații medic-clinică plătite de clinică.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Medic</th>
                  <th className="px-4 py-3">Organizație</th>
                  <th className="px-4 py-3">Invitație</th>
                  <th className="px-4 py-3">Acoperire</th>
                  <th className="px-4 py-3">Acceptată</th>
                  <th className="px-4 py-3">Acțiuni</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {relationships.map((relationship) => {
                  const organization = organizationsById.get(
                    relationship.organization_id
                  );

                  return (
                    <tr key={relationship.id} className="align-top">
                      <td className="px-4 py-4 font-medium text-gray-900">
                        {getDoctorDisplayName(
                          relationship,
                          doctorsById,
                          doctorTitlesById,
                          profilesById
                        )}
                        {relationship.invited_doctor_email && (
                          <p className="mt-1 text-xs font-normal text-gray-500">
                            {relationship.invited_doctor_email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {organization?.name ?? "Organizație necunoscută"}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {getInvitationStatusLabel(relationship.invitation_status)}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {getCoverageStatusLabel(relationship.coverage_status)}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {formatDate(relationship.accepted_at)}
                      </td>

                      <td className="px-4 py-4">
                        <ClinicDoctorCoverageActions
                          relationshipId={relationship.id}
                          invitationStatus={relationship.invitation_status}
                          coverageStatus={relationship.coverage_status}
                          hasDoctor={Boolean(relationship.doctor_id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
