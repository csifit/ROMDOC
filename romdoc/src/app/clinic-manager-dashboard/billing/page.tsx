import { createClient } from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
  member_role: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
};

type BillingProfile = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  trade_register_number: string | null;
  billing_address: string;
  billing_city: string;
  billing_county: string;
  billing_country: string;
  billing_email: string;
  is_vat_payer: boolean;
  vat_number: string | null;
  updated_at: string;
};

type DoctorRelationship = {
  organization_id: string;
  doctor_id: string | null;
  invited_doctor_email: string | null;
  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;
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

const DOCTOR_MONTHLY_PRICE_RON = 60;
const VAT_RATE = 0.19;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 2,
  }).format(value);
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

function getOrganizationStatusLabel(status: string) {
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

function getRelationshipStatusLabel(relationship: DoctorRelationship) {
  if (relationship.coverage_status === "active") {
    return "Acoperire activă";
  }

  if (relationship.coverage_status === "pending_admin_approval") {
    return "Așteaptă aprobarea RomDoc";
  }

  if (relationship.coverage_status === "paused") {
    return "Acoperire suspendată";
  }

  if (relationship.invitation_status === "pending") {
    return "Invitație trimisă";
  }

  return "Neacoperit activ";
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

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-gray-900">
        {value || "—"}
      </dd>
    </div>
  );
}

function SummaryBox({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-[#F0EEE9] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

export default async function ClinicManagerBillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = user?.id;

  const { data: memberships } = profileId
    ? await supabase
        .from("clinic_organization_members")
        .select("organization_id, member_role")
        .eq("profile_id", profileId)
        .eq("status", "active")
    : { data: [] };

  const activeMemberships = (memberships ?? []) as OrganizationMember[];
  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  let organizations: ClinicOrganization[] = [];
  let billingProfiles: BillingProfile[] = [];
  let doctorRelationships: DoctorRelationship[] = [];

  if (organizationIds.length > 0) {
    const [organizationsResult, billingProfilesResult, relationshipsResult] =
      await Promise.all([
        supabase
          .from("clinic_organizations")
          .select(
            `
              id,
              name,
              status,
              contact_email,
              contact_phone
            `
          )
          .in("id", organizationIds)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("clinic_organization_billing_profiles")
          .select(
            `
              organization_id,
              company_name,
              tax_id,
              trade_register_number,
              billing_address,
              billing_city,
              billing_county,
              billing_country,
              billing_email,
              is_vat_payer,
              vat_number,
              updated_at
            `
          )
          .in("organization_id", organizationIds),

        supabase
          .from("clinic_doctor_relationships")
          .select(
            `
              organization_id,
              doctor_id,
              invited_doctor_email,
              invitation_status,
              payment_responsibility,
              coverage_status
            `
          )
          .in("organization_id", organizationIds),
      ]);

    organizations = (organizationsResult.data ?? []) as ClinicOrganization[];
    billingProfiles = (billingProfilesResult.data ?? []) as BillingProfile[];
    doctorRelationships =
      (relationshipsResult.data ?? []) as DoctorRelationship[];
  }

  const doctorIds = Array.from(
    new Set(
      doctorRelationships
        .map((relationship) => relationship.doctor_id)
        .filter((doctorId): doctorId is string => Boolean(doctorId))
    )
  );

  let doctors: Doctor[] = [];
  let doctorTranslations: DoctorTranslation[] = [];
  let doctorProfiles: Profile[] = [];

  if (doctorIds.length > 0) {
    const [doctorsResult, translationsResult] = await Promise.all([
      supabase
        .from("doctors")
        .select("id, slug, profile_id")
        .in("id", doctorIds),

      supabase
        .from("doctor_translations")
        .select("doctor_id, locale, title")
        .in("doctor_id", doctorIds),
    ]);

    doctors = (doctorsResult.data ?? []) as Doctor[];
    doctorTranslations =
      (translationsResult.data ?? []) as DoctorTranslation[];

    const profileIds = Array.from(
      new Set(
        doctors
          .map((doctor) => doctor.profile_id)
          .filter((profileId): profileId is string => Boolean(profileId))
      )
    );

    if (profileIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", profileIds);

      doctorProfiles = (profiles ?? []) as Profile[];
    }
  }

  const billingByOrganization = new Map(
    billingProfiles.map((profile) => [profile.organization_id, profile])
  );

  const doctorsById = new Map(
    doctors.map((doctor) => [doctor.id, doctor])
  );

  const profilesById = new Map(
    doctorProfiles.map((profile) => [profile.id, profile])
  );

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

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Facturare clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Verifică datele de facturare ale clinicii, medicii acoperiți activ și
          estimarea lunară simplă. Plata efectivă și marcarea facturilor rămân
          gestionate de administrator în această etapă.
        </p>
      </header>

      {organizations.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu există încă date de facturare pentru contul tău
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            După ce RomDoc asociază contul tău unei organizații de clinică,
            datele de facturare vor fi afișate aici.
          </p>
        </section>
      ) : (
        <div className="space-y-6">
          {organizations.map((organization) => {
            const billing = billingByOrganization.get(organization.id);
            const relationships = doctorRelationships.filter(
              (relationship) => relationship.organization_id === organization.id
            );

            const activeCoveredRelationships = relationships.filter(
              (relationship) =>
                relationship.payment_responsibility === "clinic_paid" &&
                relationship.coverage_status === "active"
            );

            const pendingCoveredRelationships = relationships.filter(
              (relationship) =>
                relationship.payment_responsibility === "clinic_paid" &&
                relationship.coverage_status === "pending_admin_approval"
            );

            const openInvitations = relationships.filter(
              (relationship) => relationship.invitation_status === "pending"
            );

            const monthlySubscriptionNet =
              activeCoveredRelationships.length * DOCTOR_MONTHLY_PRICE_RON;
            const monthlyVat = monthlySubscriptionNet * VAT_RATE;
            const monthlySubscriptionGross =
              monthlySubscriptionNet + monthlyVat;

            return (
              <section
                key={organization.id}
                className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {organization.name}
                      </h2>
                      <span className="rounded-full bg-[#036661]/10 px-2.5 py-1 text-xs font-semibold text-[#036661]">
                        {getOrganizationStatusLabel(organization.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Contact: {organization.contact_email ?? "—"}
                      {organization.contact_phone
                        ? ` · ${organization.contact_phone}`
                        : ""}
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Facturarea este momentan manuală. Administratorul confirmă
                    plata și statusul final.
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <SummaryBox
                    label="Medici activi"
                    value={activeCoveredRelationships.length}
                    helper="Intră în totalul lunar al clinicii."
                  />
                  <SummaryBox
                    label="În aprobare"
                    value={pendingCoveredRelationships.length}
                    helper="Așteaptă confirmarea RomDoc."
                  />
                  <SummaryBox
                    label="Invitații"
                    value={openInvitations.length}
                    helper="Invitații încă neacceptate."
                  />
                  <SummaryBox
                    label="Total estimat"
                    value={formatCurrency(monthlySubscriptionGross)}
                    helper="Abonamente + TVA, fără SMS."
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Date de facturare
                    </h3>

                    {billing ? (
                      <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                        <DetailRow label="Denumire firmă" value={billing.company_name} />
                        <DetailRow label="CUI" value={billing.tax_id} />
                        <DetailRow
                          label="Nr. Registrul Comerțului"
                          value={billing.trade_register_number}
                        />
                        <DetailRow label="E-mail facturare" value={billing.billing_email} />
                        <DetailRow label="Adresă" value={billing.billing_address} />
                        <DetailRow label="Oraș" value={billing.billing_city} />
                        <DetailRow label="Județ" value={billing.billing_county} />
                        <DetailRow label="Țară" value={billing.billing_country} />
                        <DetailRow
                          label="Plătitor TVA"
                          value={billing.is_vat_payer ? "Da" : "Nu"}
                        />
                        <DetailRow label="Cod TVA" value={billing.vat_number} />
                        <DetailRow
                          label="Ultima actualizare"
                          value={formatDate(billing.updated_at)}
                        />
                      </dl>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-gray-600">
                        Datele de facturare nu sunt încă asociate acestei
                        organizații. Te rugăm să contactezi RomDoc pentru
                        completare.
                      </p>
                    )}
                  </div>

                  <aside className="space-y-4 rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Sumar curent
                    </h3>

                    <dl className="space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-gray-600">Abonamente medici</dt>
                        <dd className="font-semibold text-gray-900">
                          {formatCurrency(monthlySubscriptionNet)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <dt className="text-gray-600">TVA estimat</dt>
                        <dd className="font-semibold text-gray-900">
                          {formatCurrency(monthlyVat)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 border-t border-gray-200 pt-3">
                        <dt className="font-semibold text-gray-900">
                          Total estimat
                        </dt>
                        <dd className="font-bold text-gray-900">
                          {formatCurrency(monthlySubscriptionGross)}
                        </dd>
                      </div>
                    </dl>

                    <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-600">
                      SMS-urile nu sunt incluse încă în acest total. După
                      conectarea logurilor SMS la clinică, ele vor apărea într-o
                      linie separată.
                    </p>
                  </aside>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Medici acoperiți de clinică
                  </h3>

                  {relationships.length === 0 ? (
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      Nu există încă medici invitați sau acoperiți de această
                      clinică.
                    </p>
                  ) : (
                    <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-4 py-3">Medic</th>
                              <th className="px-4 py-3">Invitație</th>
                              <th className="px-4 py-3">Plată</th>
                              <th className="px-4 py-3">Status acoperire</th>
                              <th className="px-4 py-3">Cost lunar</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {relationships.map((relationship, index) => {
                              const isActiveCovered =
                                relationship.payment_responsibility ===
                                  "clinic_paid" &&
                                relationship.coverage_status === "active";

                              return (
                                <tr
                                  key={`${organization.id}-${relationship.doctor_id ?? relationship.invited_doctor_email ?? index}`}
                                >
                                  <td className="px-4 py-3 font-medium text-gray-900">
                                    {getDoctorDisplayName(
                                      relationship,
                                      doctorsById,
                                      doctorTitlesById,
                                      profilesById
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">
                                    {relationship.invitation_status}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">
                                    {relationship.payment_responsibility ===
                                    "clinic_paid"
                                      ? "Plătit de clinică"
                                      : "Plătit individual"}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">
                                    {getRelationshipStatusLabel(relationship)}
                                  </td>
                                  <td className="px-4 py-3 text-gray-700">
                                    {isActiveCovered
                                      ? `${DOCTOR_MONTHLY_PRICE_RON} RON/lună + TVA`
                                      : "—"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Consum SMS
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Consumul SMS va fi afișat aici după ce logurile SMS vor fi
                      legate de organizația clinicii. Vor fi vizibile doar date
                      de livrare și facturare, nu dosare medicale.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-gray-200 p-5">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Istoric facturi / plăți
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Istoricul facturilor va fi adăugat după ce stabilim fluxul
                      final pentru facturarea manuală sau Stripe.
                    </p>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
