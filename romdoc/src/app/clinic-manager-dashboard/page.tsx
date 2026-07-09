import { createClient } from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
  member_role: string;
  status: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  contact_phone: string | null;
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

export default async function ClinicManagerDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profileId = user?.id;

  const { data: memberships } = profileId
    ? await supabase
        .from("clinic_organization_members")
        .select("organization_id, member_role, status")
        .eq("profile_id", profileId)
        .eq("status", "active")
    : { data: [] };

  const activeMemberships =
    (memberships ?? []) as OrganizationMember[];

  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  const { data: organizations } =
    organizationIds.length > 0
      ? await supabase
          .from("clinic_organizations")
          .select(
            `
              id,
              name,
              status,
              contact_email,
              contact_phone,
              created_at,
              approved_at
            `
          )
          .in("id", organizationIds)
          .order("created_at", {
            ascending: false,
          })
      : { data: [] };

  const { data: billingProfiles } =
    organizationIds.length > 0
      ? await supabase
          .from("clinic_organization_billing_profiles")
          .select(
            `
              organization_id,
              company_name,
              tax_id,
              billing_email,
              is_vat_payer
            `
          )
          .in("organization_id", organizationIds)
      : { data: [] };

  const organizationRows =
    (organizations ?? []) as ClinicOrganization[];

  const billingByOrganization = new Map(
    ((billingProfiles ?? []) as BillingProfile[]).map((profile) => [
      profile.organization_id,
      profile,
    ])
  );

  const activeOrganizations = organizationRows.filter(
    (organization) => organization.status === "active"
  ).length;

  const pendingOrganizations = organizationRows.filter(
    (organization) => organization.status === "pending"
  ).length;

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Dashboard clinică
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Aceasta este zona clinicii pentru gestionarea medicilor invitați,
          facturării și consumului SMS. Nu oferă acces la dosarele medicale ale
          pacienților.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStat
          label="Organizații"
          value={organizationRows.length}
          helper="Conturi de clinică la care ai acces."
        />
        <DashboardStat
          label="Active"
          value={activeOrganizations}
          helper="Organizații aprobate de RomDoc."
        />
        <DashboardStat
          label="În așteptare"
          value={pendingOrganizations}
          helper="Organizații care așteaptă verificarea RomDoc."
        />
      </div>

      {organizationRows.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu există încă o organizație asociată contului tău
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
            După ce RomDoc aprobă cererea clinicii sau te asociază unei
            organizații existente, detaliile vor apărea aici. Contul tău rămâne
            separat de rolul de doctor sau staff.
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {organizationRows.map((organization) => {
            const membership = activeMemberships.find(
              (item) => item.organization_id === organization.id
            );
            const billing = billingByOrganization.get(organization.id);

            return (
              <article
                key={organization.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-900">
                        {organization.name}
                      </h2>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                          organization.status
                        )}`}
                      >
                        {getStatusLabel(organization.status)}
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-gray-600">
                      Rolul tău: {membership?.member_role ?? "manager"}
                    </p>
                  </div>

                  <div className="text-sm text-gray-600">
                    <p>{organization.contact_email ?? "E-mail indisponibil"}</p>
                    <p>{organization.contact_phone ?? "Telefon indisponibil"}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 bg-[#F0EEE9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Facturare
                    </p>
                    {billing ? (
                      <div className="mt-2 text-sm leading-6 text-gray-700">
                        <p className="font-semibold text-gray-900">
                          {billing.company_name}
                        </p>
                        <p>CUI: {billing.tax_id}</p>
                        <p>{billing.billing_email}</p>
                        <p>
                          TVA: {billing.is_vat_payer ? "Plătitor TVA" : "Neplătitor TVA"}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-600">
                        Datele de facturare nu sunt încă asociate.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-[#F0EEE9] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Acces medical
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-700">
                      Clinic Manager poate administra relația comercială cu
                      medicii și plata lor, dar nu are acces la dosarele
                      medicale ale pacienților.
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}
