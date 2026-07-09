import ClinicLocationRequestForm from "@/components/clinic-manager/clinic-location-request-form";
import { createClient } from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
};

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type OrganizationClinicLink = {
  organization_id: string;
  clinic_id: string;
  status: string;
  approved_at: string | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;
  formatted_address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  google_maps_uri: string | null;
};

type ClinicTranslation = {
  clinic_id: string;
  locale: string;
  name: string;
};

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

function getLinkStatusLabel(status: string) {
  switch (status) {
    case "active":
      return "Activă";
    case "removed":
      return "Eliminată";
    default:
      return "În verificare";
  }
}

function getClinicStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Clinică aprobată";
    case "rejected":
      return "Clinică respinsă";
    case "suspended":
      return "Clinică suspendată";
    default:
      return "Clinică în verificare";
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case "active":
    case "approved":
      return "bg-green-100 text-green-800";
    case "removed":
    case "rejected":
    case "suspended":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-900";
  }
}

function getClinicName(
  clinicId: string,
  clinicsById: Map<string, Clinic>,
  clinicNameById: Map<string, string>
) {
  return clinicNameById.get(clinicId) ?? clinicsById.get(clinicId)?.slug ?? "Locație";
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
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{helper}</p>
    </div>
  );
}

export default async function ClinicManagerLocationsPage() {
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

  const activeMemberships = (memberships ?? []) as OrganizationMember[];
  const organizationIds = activeMemberships.map(
    (membership) => membership.organization_id
  );

  let organizations: ClinicOrganizationOption[] = [];
  let clinicLinks: OrganizationClinicLink[] = [];

  if (organizationIds.length > 0) {
    const [organizationsResult, clinicLinksResult] = await Promise.all([
      supabase
        .from("clinic_organizations")
        .select("id, name, status")
        .in("id", organizationIds)
        .order("name", {
          ascending: true,
        }),

      supabase
        .from("clinic_organization_clinics")
        .select("organization_id, clinic_id, status, approved_at")
        .in("organization_id", organizationIds)
        .order("created_at", {
          ascending: false,
        }),
    ]);

    organizations =
      (organizationsResult.data ?? []) as ClinicOrganizationOption[];
    clinicLinks = (clinicLinksResult.data ?? []) as OrganizationClinicLink[];
  }

  const clinicIds = Array.from(
    new Set(clinicLinks.map((link) => link.clinic_id).filter(Boolean))
  );

  let clinics: Clinic[] = [];
  let clinicTranslations: ClinicTranslation[] = [];

  if (clinicIds.length > 0) {
    const [clinicsResult, translationsResult] = await Promise.all([
      supabase
        .from("clinics")
        .select(
          `
            id,
            slug,
            status,
            formatted_address,
            phone,
            email,
            website,
            google_maps_uri
          `
        )
        .in("id", clinicIds),

      supabase
        .from("clinic_translations")
        .select("clinic_id, locale, name")
        .in("clinic_id", clinicIds),
    ]);

    clinics = (clinicsResult.data ?? []) as Clinic[];
    clinicTranslations =
      (translationsResult.data ?? []) as ClinicTranslation[];
  }

  const organizationsById = new Map(
    organizations.map((organization) => [organization.id, organization])
  );
  const clinicsById = new Map(clinics.map((clinic) => [clinic.id, clinic]));
  const clinicNameById = new Map<string, string>();

  for (const translation of clinicTranslations) {
    const existingName = clinicNameById.get(translation.clinic_id);

    if (!existingName || translation.locale === "ro") {
      clinicNameById.set(translation.clinic_id, translation.name);
    }
  }

  const activeLocations = clinicLinks.filter((link) => link.status === "active");
  const pendingLocations = clinicLinks.filter(
    (link) => link.status === "pending"
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Locații / puncte de lucru
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Administrează locațiile reale ale organizației. După verificarea
          RomDoc, aceste locații pot fi folosite pentru repartizarea medicilor
          clinicii, disponibilitate și programări.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <DashboardStat
          label="Organizații"
          value={organizations.length}
          helper="Organizații de clinică asociate contului tău."
        />
        <DashboardStat
          label="Locații active"
          value={activeLocations.length}
          helper="Puncte de lucru aprobate pentru organizație."
        />
        <DashboardStat
          label="În verificare"
          value={pendingLocations.length}
          helper="Locații sau asocieri care așteaptă verificarea RomDoc."
        />
      </div>

      <ClinicLocationRequestForm organizations={organizations} />

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Locațiile organizației
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Doar locațiile active vor fi folosite mai departe pentru
              repartizarea medicilor. Locațiile în verificare sunt vizibile
              aici pentru transparență.
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-3 py-1 text-sm font-semibold text-gray-700">
            {clinicLinks.length} locații
          </span>
        </div>

        {clinicLinks.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            Nu există încă locații asociate organizației tale. Trimite prima
            solicitare folosind formularul de mai sus.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-xl border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Locație</th>
                    <th className="px-4 py-3">Organizație</th>
                    <th className="px-4 py-3">Status asociere</th>
                    <th className="px-4 py-3">Status clinică</th>
                    <th className="px-4 py-3">Contact</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {clinicLinks.map((link) => {
                    const clinic = clinicsById.get(link.clinic_id);
                    const organization = organizationsById.get(
                      link.organization_id
                    );

                    return (
                      <tr key={`${link.organization_id}-${link.clinic_id}`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900">
                            {getClinicName(
                              link.clinic_id,
                              clinicsById,
                              clinicNameById
                            )}
                          </div>
                          <div className="mt-1 max-w-sm text-xs leading-5 text-gray-500">
                            {clinic?.formatted_address ?? "Adresă indisponibilă"}
                          </div>
                          {clinic?.google_maps_uri && (
                            <a
                              href={clinic.google_maps_uri}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-1 inline-block text-xs font-semibold text-[#036661] hover:underline"
                            >
                              Deschide în Google Maps
                            </a>
                          )}
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          <div>{organization?.name ?? "—"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {organization
                              ? getOrganizationStatusLabel(organization.status)
                              : "—"}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              link.status
                            )}`}
                          >
                            {getLinkStatusLabel(link.status)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                              clinic?.status ?? "pending"
                            )}`}
                          >
                            {getClinicStatusLabel(clinic?.status ?? "pending")}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-gray-700">
                          <div>{clinic?.phone ?? "Telefon indisponibil"}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {clinic?.email ?? clinic?.website ?? "—"}
                          </div>
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
    </div>
  );
}
