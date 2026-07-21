import {
  getTranslations,
} from "next-intl/server";

import ClinicLocationRequestForm from "@/components/clinic-manager/clinic-location-request-form";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

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

  approved_at:
    | string
    | null;
};

type Clinic = {
  id: string;
  slug: string;
  status: string;

  formatted_address:
    | string
    | null;

  phone:
    | string
    | null;

  email:
    | string
    | null;

  website:
    | string
    | null;

  google_maps_uri:
    | string
    | null;
};

type ClinicTranslation = {
  clinic_id: string;
  locale: string;
  name: string;
};

function statusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "active":
    case "approved":
      return "border-green-200 bg-green-50 text-green-800";

    case "removed":
    case "rejected":
    case "suspended":
      return "border-red-200 bg-red-50 text-red-800";

    default:
      return "border-amber-200 bg-amber-50 text-amber-900";
  }
}

function DashboardStat({
  label,
  value,
  helper,
}: {
  label: string;

  value:
    | string
    | number;

  helper: string;
}) {
  return (
    <div className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p className="mt-[13px] text-3xl font-bold text-gray-900">
        {value}
      </p>

      <p className="mt-[8px] text-sm leading-6 text-gray-600">
        {helper}
      </p>
    </div>
  );
}

export default async function ClinicManagerLocationsPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.locations",
    });

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  const profileId =
    user?.id;

  const {
    data:
      memberships,
  } =
    profileId
      ? await supabase
          .from(
            "clinic_organization_members"
          )
          .select(
            "organization_id"
          )
          .eq(
            "profile_id",
            profileId
          )
          .eq(
            "status",
            "active"
          )
      : {
          data:
            [],
        };

  const activeMemberships =
    (
      memberships ??
      []
    ) as
      OrganizationMember[];

  const organizationIds =
    activeMemberships.map(
      (
        membership
      ) =>
        membership.organization_id
    );

  let organizations:
    ClinicOrganizationOption[] =
    [];

  let clinicLinks:
    OrganizationClinicLink[] =
    [];

  if (
    organizationIds.length >
    0
  ) {
    const [
      organizationsResult,
      clinicLinksResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "clinic_organizations"
          )
          .select(
            "id, name, status"
          )
          .in(
            "id",
            organizationIds
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          ),

        supabase
          .from(
            "clinic_organization_clinics"
          )
          .select(
            "organization_id, clinic_id, status, approved_at"
          )
          .in(
            "organization_id",
            organizationIds
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
      ]);

    organizations =
      (
        organizationsResult.data ??
        []
      ) as
        ClinicOrganizationOption[];

    clinicLinks =
      (
        clinicLinksResult.data ??
        []
      ) as
        OrganizationClinicLink[];
  }

  const clinicIds =
    Array.from(
      new Set(
        clinicLinks
          .map(
            (
              link
            ) =>
              link.clinic_id
          )
          .filter(
            Boolean
          )
      )
    );

  let clinics:
    Clinic[] =
    [];

  let clinicTranslations:
    ClinicTranslation[] =
    [];

  if (
    clinicIds.length >
    0
  ) {
    const [
      clinicsResult,
      translationsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "clinics"
          )
          .select(`
            id,
            slug,
            status,
            formatted_address,
            phone,
            email,
            website,
            google_maps_uri
          `)
          .in(
            "id",
            clinicIds
          ),

        supabase
          .from(
            "clinic_translations"
          )
          .select(
            "clinic_id, locale, name"
          )
          .in(
            "clinic_id",
            clinicIds
          ),
      ]);

    clinics =
      (
        clinicsResult.data ??
        []
      ) as
        Clinic[];

    clinicTranslations =
      (
        translationsResult.data ??
        []
      ) as
        ClinicTranslation[];
  }

  const organizationsById =
    new Map(
      organizations.map(
        (
          organization
        ) => [
          organization.id,
          organization,
        ]
      )
    );

  const clinicsById =
    new Map(
      clinics.map(
        (
          clinic
        ) => [
          clinic.id,
          clinic,
        ]
      )
    );

  const translationsByClinicId =
    new Map<
      string,
      ClinicTranslation[]
    >();

  for (
    const translation of
      clinicTranslations
  ) {
    const current =
      translationsByClinicId.get(
        translation.clinic_id
      ) ??
      [];

    current.push(
      translation
    );

    translationsByClinicId.set(
      translation.clinic_id,
      current
    );
  }

  const activeLocations =
    clinicLinks.filter(
      (
        link
      ) =>
        link.status ===
        "active"
    );

  const pendingLocations =
    clinicLinks.filter(
      (
        link
      ) =>
        link.status ===
        "pending"
    );

  function organizationStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "active",
        "suspended",
        "rejected",
        "archived",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.organization.${normalized}`
    );
  }

  function associationStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "active",
        "removed",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.association.${normalized}`
    );
  }

  function clinicStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "approved",
        "rejected",
        "suspended",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.clinic.${normalized}`
    );
  }

  function clinicName(
    clinicId:
      string
  ) {
    const clinic =
      clinicsById.get(
        clinicId
      );

    return (
      selectTranslation(
        translationsByClinicId.get(
          clinicId
        ),
        locale
      )?.name ??
      clinic?.slug ??
      t(
        "fallbackLocation"
      )
    );
  }

  function LocationStatus({
    status,
    label,
  }: {
    status: string;
    label: string;
  }) {
    return (
      <span
        className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
          status
        )}`}
      >
        {label}
      </span>
    );
  }

  return (
    <div className="space-y-[34px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      <div className="grid gap-[13px] md:grid-cols-3">
        <DashboardStat
          label={t(
            "stats.organizations"
          )}
          value={
            organizations.length
          }
          helper={t(
            "stats.organizationsHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.active"
          )}
          value={
            activeLocations.length
          }
          helper={t(
            "stats.activeHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.pending"
          )}
          value={
            pendingLocations.length
          }
          helper={t(
            "stats.pendingHelper"
          )}
        />
      </div>

      <ClinicLocationRequestForm
        organizations={
          organizations
        }
      />

      <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-[13px]">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t(
                "listTitle"
              )}
            </h2>

            <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
              {t(
                "listDescription"
              )}
            </p>
          </div>

          <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
            {t(
              "count",
              {
                count:
                  clinicLinks.length,
              }
            )}
          </span>
        </div>

        {clinicLinks.length ===
        0 ? (
          <div className="mt-[21px] rounded-[13px] border border-dashed border-gray-300 bg-gray-50 p-[21px] text-sm leading-6 text-gray-600">
            {t(
              "empty"
            )}
          </div>
        ) : (
          <>
            <div className="mt-[21px] space-y-[13px] md:hidden">
              {clinicLinks.map(
                (
                  link
                ) => {
                  const clinic =
                    clinicsById.get(
                      link.clinic_id
                    );

                  const organization =
                    organizationsById.get(
                      link.organization_id
                    );

                  return (
                    <article
                      key={`${link.organization_id}-${link.clinic_id}-mobile`}
                      className="rounded-[13px] border border-gray-200 p-[13px]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-[8px]">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {clinicName(
                              link.clinic_id
                            )}
                          </h3>

                          <p className="mt-[5px] text-xs leading-5 text-gray-500">
                            {clinic
                              ?.formatted_address ??
                              t(
                                "addressUnavailable"
                              )}
                          </p>
                        </div>

                        <LocationStatus
                          status={
                            link.status
                          }
                          label={associationStatusLabel(
                            link.status
                          )}
                        />
                      </div>

                      <dl className="mt-[13px] grid gap-[13px] text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t(
                              "organization"
                            )}
                          </dt>

                          <dd className="mt-[5px] text-gray-700">
                            {organization
                              ?.name ??
                              "—"}

                            {organization && (
                              <span className="mt-[5px] block text-xs text-gray-500">
                                {organizationStatusLabel(
                                  organization.status
                                )}
                              </span>
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t(
                              "clinicStatus"
                            )}
                          </dt>

                          <dd className="mt-[5px]">
                            <LocationStatus
                              status={
                                clinic
                                  ?.status ??
                                "pending"
                              }
                              label={clinicStatusLabel(
                                clinic
                                  ?.status ??
                                  "pending"
                              )}
                            />
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {t(
                              "contact"
                            )}
                          </dt>

                          <dd className="mt-[5px] text-gray-700">
                            {clinic
                              ?.phone ??
                              t(
                                "phoneUnavailable"
                              )}

                            <span className="mt-[5px] block break-all text-xs text-gray-500">
                              {clinic
                                ?.email ??
                                clinic
                                  ?.website ??
                                "—"}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      {clinic
                        ?.google_maps_uri && (
                        <a
                          href={
                            clinic.google_maps_uri
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="romdoc-focus-ring mt-[13px] inline-flex rounded-[8px] text-xs font-semibold text-[#036661] hover:underline"
                        >
                          {t(
                            "openMaps"
                          )}
                        </a>
                      )}
                    </article>
                  );
                }
              )}
            </div>

            <div className="mt-[21px] hidden overflow-hidden rounded-[13px] border border-gray-200 md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-[13px] py-[13px]">
                        {t(
                          "location"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "organization"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "associationStatus"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "clinicStatus"
                        )}
                      </th>

                      <th className="px-[13px] py-[13px]">
                        {t(
                          "contact"
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 bg-white">
                    {clinicLinks.map(
                      (
                        link
                      ) => {
                        const clinic =
                          clinicsById.get(
                            link.clinic_id
                          );

                        const organization =
                          organizationsById.get(
                            link.organization_id
                          );

                        return (
                          <tr
                            key={`${link.organization_id}-${link.clinic_id}`}
                            className="align-top"
                          >
                            <td className="px-[13px] py-[13px]">
                              <div className="font-semibold text-gray-900">
                                {clinicName(
                                  link.clinic_id
                                )}
                              </div>

                              <div className="mt-[5px] max-w-sm text-xs leading-5 text-gray-500">
                                {clinic
                                  ?.formatted_address ??
                                  t(
                                    "addressUnavailable"
                                  )}
                              </div>

                              {clinic
                                ?.google_maps_uri && (
                                <a
                                  href={
                                    clinic.google_maps_uri
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-[5px] inline-block text-xs font-semibold text-[#036661] hover:underline"
                                >
                                  {t(
                                    "openMaps"
                                  )}
                                </a>
                              )}
                            </td>

                            <td className="px-[13px] py-[13px] text-gray-700">
                              <div>
                                {organization
                                  ?.name ??
                                  "—"}
                              </div>

                              <div className="mt-[5px] text-xs text-gray-500">
                                {organization
                                  ? organizationStatusLabel(
                                      organization.status
                                    )
                                  : "—"}
                              </div>
                            </td>

                            <td className="px-[13px] py-[13px]">
                              <LocationStatus
                                status={
                                  link.status
                                }
                                label={associationStatusLabel(
                                  link.status
                                )}
                              />
                            </td>

                            <td className="px-[13px] py-[13px]">
                              <LocationStatus
                                status={
                                  clinic
                                    ?.status ??
                                  "pending"
                                }
                                label={clinicStatusLabel(
                                  clinic
                                    ?.status ??
                                    "pending"
                                )}
                              />
                            </td>

                            <td className="px-[13px] py-[13px] text-gray-700">
                              <div>
                                {clinic
                                  ?.phone ??
                                  t(
                                    "phoneUnavailable"
                                  )}
                              </div>

                              <div className="mt-[5px] max-w-xs break-all text-xs text-gray-500">
                                {clinic
                                  ?.email ??
                                  clinic
                                    ?.website ??
                                  "—"}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
