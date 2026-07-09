import { createAdminClient } from "@/lib/supabase/admin";

type ClinicOrganization = {
  id: string;
  name: string;
  slug: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  created_at: string;
  approved_at: string | null;
};

type BillingProfile = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  billing_email: string;
  is_vat_payer: boolean;
};

type OrganizationMember = {
  organization_id: string;
  profile_id: string;
  member_role: string;
  status: string;
};

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string | null;
};

type OrganizationClinicLink = {
  organization_id: string;
  clinic_id: string;
  status: string;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
};

type ClinicTranslation = {
  clinic_id: string;
  locale: string;
  name: string;
};

type DoctorRelationship = {
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
};

type OrganizationSummary = {
  activeMembers: OrganizationMember[];
  managerNames: string[];
  linkedClinics: OrganizationClinicLink[];
  activeClinicNames: string[];
  pendingClinicCount: number;
  doctorRelationships: DoctorRelationship[];
  activeCoveredDoctorCount: number;
  pendingCoveredDoctorCount: number;
  invitedDoctorCount: number;
};

const DOCTOR_MONTHLY_PRICE_RON = 60;

function getStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activă";

    case "suspended":
      return "Suspendată";

    case "rejected":
      return "Respinsă";

    case "archived":
      return "Arhivată";

    default:
      return "În așteptare";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";

    case "suspended":
      return "bg-orange-100 text-orange-800";

    case "rejected":
      return "bg-red-100 text-red-800";

    case "archived":
      return "bg-slate-200 text-slate-900";

    default:
      return "bg-amber-100 text-amber-900";
  }
}

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

function getProfileName(profile: Profile | undefined) {
  if (!profile) {
    return "Manager necunoscut";
  }

  const fullName = [profile.first_name, profile.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || profile.role;
}

function getClinicName(
  clinicId: string,
  clinicMap: Map<string, Clinic>,
  translationMap: Map<string, string>
) {
  return (
    translationMap.get(clinicId) ??
    clinicMap.get(clinicId)?.slug ??
    "Clinică necunoscută"
  );
}

function createEmptySummary(): OrganizationSummary {
  return {
    activeMembers: [],
    managerNames: [],
    linkedClinics: [],
    activeClinicNames: [],
    pendingClinicCount: 0,
    doctorRelationships: [],
    activeCoveredDoctorCount: 0,
    pendingCoveredDoctorCount: 0,
    invitedDoctorCount: 0,
  };
}

export default async function ClinicOrganizationsOverview() {
  const admin = createAdminClient();

  const [
    organizationsResult,
    billingProfilesResult,
    membersResult,
    clinicLinksResult,
    doctorRelationshipsResult,
  ] = await Promise.all([
    admin
      .from("clinic_organizations")
      .select(
        `
          id,
          name,
          slug,
          status,
          contact_name,
          contact_email,
          contact_phone,
          website,
          created_at,
          approved_at
        `
      )
      .order("created_at", {
        ascending: false,
      }),

    admin
      .from("clinic_organization_billing_profiles")
      .select(
        `
          organization_id,
          company_name,
          tax_id,
          billing_email,
          is_vat_payer
        `
      ),

    admin
      .from("clinic_organization_members")
      .select(
        `
          organization_id,
          profile_id,
          member_role,
          status
        `
      ),

    admin
      .from("clinic_organization_clinics")
      .select(
        `
          organization_id,
          clinic_id,
          status
        `
      ),

    admin
      .from("clinic_doctor_relationships")
      .select(
        `
          organization_id,
          clinic_id,
          doctor_id,
          invited_doctor_email,
          invitation_status,
          payment_responsibility,
          coverage_status
        `
      ),
  ]);

  if (organizationsResult.error) {
    console.error(
      "Clinic organizations query failed:",
      organizationsResult.error
    );

    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800 shadow-sm sm:p-6">
        Organizațiile de clinică nu au putut fi încărcate.
      </section>
    );
  }

  const organizations =
    (organizationsResult.data ?? []) as ClinicOrganization[];

  const billingProfiles =
    (billingProfilesResult.data ?? []) as BillingProfile[];

  const members =
    (membersResult.data ?? []) as OrganizationMember[];

  const clinicLinks =
    (clinicLinksResult.data ?? []) as OrganizationClinicLink[];

  const doctorRelationships =
    (doctorRelationshipsResult.data ?? []) as DoctorRelationship[];

  const profileIds = Array.from(
    new Set(
      members
        .map((member) => member.profile_id)
        .filter(Boolean)
    )
  );

  const clinicIds = Array.from(
    new Set(
      clinicLinks
        .map((link) => link.clinic_id)
        .filter(Boolean)
    )
  );

  const [profilesResult, clinicsResult, translationsResult] =
    await Promise.all([
      profileIds.length > 0
        ? admin
            .from("profiles")
            .select(
              `
                id,
                first_name,
                last_name,
                role,
                account_status
              `
            )
            .in("id", profileIds)
        : Promise.resolve({ data: [], error: null }),

      clinicIds.length > 0
        ? admin
            .from("clinics")
            .select(
              `
                id,
                slug,
                status
              `
            )
            .in("id", clinicIds)
        : Promise.resolve({ data: [], error: null }),

      clinicIds.length > 0
        ? admin
            .from("clinic_translations")
            .select(
              `
                clinic_id,
                locale,
                name
              `
            )
            .in("clinic_id", clinicIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (profilesResult.error) {
    console.error(
      "Clinic organization profiles query failed:",
      profilesResult.error
    );
  }

  if (clinicsResult.error) {
    console.error(
      "Clinic organization clinics query failed:",
      clinicsResult.error
    );
  }

  if (translationsResult.error) {
    console.error(
      "Clinic organization translations query failed:",
      translationsResult.error
    );
  }

  const billingByOrganization = new Map(
    billingProfiles.map((profile) => [
      profile.organization_id,
      profile,
    ])
  );

  const profilesById = new Map(
    ((profilesResult.data ?? []) as Profile[]).map((profile) => [
      profile.id,
      profile,
    ])
  );

  const clinicsById = new Map(
    ((clinicsResult.data ?? []) as Clinic[]).map((clinic) => [
      clinic.id,
      clinic,
    ])
  );

  const clinicNameById = new Map<string, string>();

  for (const translation of (translationsResult.data ?? []) as ClinicTranslation[]) {
    const existingName = clinicNameById.get(translation.clinic_id);

    if (!existingName || translation.locale === "ro") {
      clinicNameById.set(translation.clinic_id, translation.name);
    }
  }

  const summaryByOrganization = new Map<string, OrganizationSummary>();

  for (const organization of organizations) {
    summaryByOrganization.set(organization.id, createEmptySummary());
  }

  for (const member of members) {
    const summary = summaryByOrganization.get(member.organization_id);

    if (!summary || member.status !== "active") {
      continue;
    }

    summary.activeMembers.push(member);
    summary.managerNames.push(
      getProfileName(profilesById.get(member.profile_id))
    );
  }

  for (const link of clinicLinks) {
    const summary = summaryByOrganization.get(link.organization_id);

    if (!summary) {
      continue;
    }

    summary.linkedClinics.push(link);

    if (link.status === "active") {
      summary.activeClinicNames.push(
        getClinicName(link.clinic_id, clinicsById, clinicNameById)
      );
    }

    if (link.status === "pending") {
      summary.pendingClinicCount += 1;
    }
  }

  for (const relationship of doctorRelationships) {
    const summary = summaryByOrganization.get(
      relationship.organization_id
    );

    if (!summary) {
      continue;
    }

    summary.doctorRelationships.push(relationship);

    if (relationship.invitation_status === "pending") {
      summary.invitedDoctorCount += 1;
    }

    if (
      relationship.payment_responsibility === "clinic_paid" &&
      relationship.coverage_status === "active"
    ) {
      summary.activeCoveredDoctorCount += 1;
    }

    if (
      relationship.payment_responsibility === "clinic_paid" &&
      relationship.coverage_status === "pending_admin_approval"
    ) {
      summary.pendingCoveredDoctorCount += 1;
    }
  }

  const totalOrganizations = organizations.length;
  const activeOrganizations = organizations.filter(
    (organization) => organization.status === "active"
  ).length;
  const pendingOrganizations = organizations.filter(
    (organization) => organization.status === "pending"
  ).length;
  const activeCoveredDoctors = Array.from(
    summaryByOrganization.values()
  ).reduce(
    (total, summary) =>
      total + summary.activeCoveredDoctorCount,
    0
  );

  return (
    <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#9A4F35]">
            Organizații de clinică
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Clinici, manageri și facturare cumulată
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            Această zonă arată conturile de clinică create pentru fluxul
            „Suntem clinică”: managerii asociați, clinicile legate, medicii
            acoperiți de clinică și baza simplă pentru facturarea cumulată.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Organizații
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalOrganizations}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Active
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {activeOrganizations}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            În așteptare
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {pendingOrganizations}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Medici acoperiți
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {activeCoveredDoctors}
          </p>
        </div>
      </div>

      {organizations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm leading-6 text-gray-600">
          Nu există încă organizații de clinică. După ce un cont se înscrie
          prin „Suntem clinică”, organizația și datele de facturare vor apărea
          aici.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Organizație</th>
                  <th className="px-4 py-3">Manager</th>
                  <th className="px-4 py-3">Clinici</th>
                  <th className="px-4 py-3">Medici</th>
                  <th className="px-4 py-3">Facturare</th>
                  <th className="px-4 py-3">SMS</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 bg-white">
                {organizations.map((organization) => {
                  const summary =
                    summaryByOrganization.get(organization.id) ??
                    createEmptySummary();

                  const billing = billingByOrganization.get(
                    organization.id
                  );

                  const estimatedMonthlyTotal =
                    summary.activeCoveredDoctorCount *
                    DOCTOR_MONTHLY_PRICE_RON;

                  return (
                    <tr key={organization.id} className="align-top">
                      <td className="px-4 py-4">
                        <div className="min-w-56">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">
                              {organization.name}
                            </p>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                                organization.status
                              )}`}
                            >
                              {getStatusLabel(organization.status)}
                            </span>
                          </div>

                          <p className="mt-1 text-xs text-gray-500">
                            Creată la {formatDate(organization.created_at)}
                          </p>

                          <p className="mt-2 text-xs text-gray-600">
                            Contact: {organization.contact_name ?? "—"}
                            {organization.contact_email
                              ? ` · ${organization.contact_email}`
                              : ""}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {summary.managerNames.length > 0 ? (
                          <ul className="space-y-1">
                            {summary.managerNames.map((name, index) => (
                              <li key={`${organization.id}-manager-${index}`}>
                                {name}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        <p>
                          Active: {summary.activeClinicNames.length}
                        </p>
                        <p className="text-xs text-gray-500">
                          În așteptare: {summary.pendingClinicCount}
                        </p>

                        {summary.activeClinicNames.length > 0 && (
                          <p className="mt-2 max-w-52 text-xs leading-5 text-gray-600">
                            {summary.activeClinicNames.slice(0, 3).join(", ")}
                            {summary.activeClinicNames.length > 3
                              ? ` +${summary.activeClinicNames.length - 3}`
                              : ""}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        <p>
                          Acoperiți activ: {summary.activeCoveredDoctorCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          În aprobare: {summary.pendingCoveredDoctorCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          Invitații deschise: {summary.invitedDoctorCount}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {billing ? (
                          <div className="min-w-48">
                            <p className="font-medium text-gray-900">
                              {billing.company_name}
                            </p>
                            <p className="text-xs text-gray-500">
                              CUI: {billing.tax_id}
                            </p>
                            <p className="text-xs text-gray-500">
                              {billing.billing_email}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-gray-700">
                              Estimare abonamente: {estimatedMonthlyTotal} RON/lună + TVA
                            </p>
                          </div>
                        ) : (
                          <span className="text-gray-500">
                            Date de facturare lipsă
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        <p className="text-xs leading-5 text-gray-600">
                          Payer SMS: clinică
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Consumul SMS va fi afișat aici după conectarea
                          logurilor SMS la organizația clinicii.
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
        Regula simplă de facturare pentru clinici rămâne: medici acoperiți
        activ de clinică × 60 RON/lună + TVA, iar SMS-urile se vor adăuga
        separat când logurile SMS sunt conectate la organizații.
      </div>
    </section>
  );
}
