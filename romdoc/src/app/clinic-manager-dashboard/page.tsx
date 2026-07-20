import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type OrganizationMember = {
  organization_id: string;
  member_role: string;
  status: string;
};

type ClinicOrganization = {
  id: string;
  name: string;
  status: string;

  contact_email:
    | string
    | null;

  contact_phone:
    | string
    | null;

  created_at: string;

  approved_at:
    | string
    | null;
};

type BillingProfile = {
  organization_id: string;
  company_name: string;
  tax_id: string;
  billing_email: string;
  is_vat_payer: boolean;
};

function statusClasses(
  status:
    string
) {
  switch (
    status
  ) {
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

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="romdoc-focus-ring group rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm transition hover:-translate-y-0.5 hover:border-[#036661]/35 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-[13px]">
        <div>
          <h3 className="font-bold text-gray-900">
            {title}
          </h3>

          <p className="mt-[8px] text-sm leading-6 text-gray-600">
            {description}
          </p>
        </div>

        <span
          aria-hidden="true"
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#036661]/10 font-bold text-[#036661] transition group-hover:bg-[#036661] group-hover:text-white"
        >
          →
        </span>
      </div>
    </Link>
  );
}

export default async function ClinicManagerDashboardPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.overview",
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
            "organization_id, member_role, status"
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

  const {
    data:
      organizations,
  } =
    organizationIds.length >
    0
      ? await supabase
          .from(
            "clinic_organizations"
          )
          .select(`
            id,
            name,
            status,
            contact_email,
            contact_phone,
            created_at,
            approved_at
          `)
          .in(
            "id",
            organizationIds
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
      : {
          data:
            [],
        };

  const {
    data:
      billingProfiles,
  } =
    organizationIds.length >
    0
      ? await supabase
          .from(
            "clinic_organization_billing_profiles"
          )
          .select(`
            organization_id,
            company_name,
            tax_id,
            billing_email,
            is_vat_payer
          `)
          .in(
            "organization_id",
            organizationIds
          )
      : {
          data:
            [],
        };

  const organizationRows =
    (
      organizations ??
      []
    ) as
      ClinicOrganization[];

  const billingByOrganization =
    new Map(
      (
        (
          billingProfiles ??
          []
        ) as
          BillingProfile[]
      ).map(
        (
          profile
        ) => [
          profile.organization_id,
          profile,
        ]
      )
    );

  const activeOrganizations =
    organizationRows.filter(
      (
        organization
      ) =>
        organization.status ===
        "active"
    ).length;

  const pendingOrganizations =
    organizationRows.filter(
      (
        organization
      ) =>
        organization.status ===
        "pending"
    ).length;

  function statusLabel(
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
      `statuses.${normalized}`
    );
  }

  const quickActions = [
    {
      href:
        "/clinic-manager-dashboard/invitations",

      title:
        t(
          "actions.inviteDoctor"
        ),

      description:
        t(
          "actions.inviteDoctorHelper"
        ),
    },
    {
      href:
        "/clinic-manager-dashboard/doctors",

      title:
        t(
          "actions.manageDoctors"
        ),

      description:
        t(
          "actions.manageDoctorsHelper"
        ),
    },
    {
      href:
        "/clinic-manager-dashboard/locations",

      title:
        t(
          "actions.manageLocations"
        ),

      description:
        t(
          "actions.manageLocationsHelper"
        ),
    },
    {
      href:
        "/clinic-manager-dashboard/billing",

      title:
        t(
          "actions.viewBilling"
        ),

      description:
        t(
          "actions.viewBillingHelper"
        ),
    },
  ];

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
            organizationRows.length
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
            activeOrganizations
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
            pendingOrganizations
          }
          helper={t(
            "stats.pendingHelper"
          )}
        />
      </div>

      <section>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {t(
              "quickActionsTitle"
            )}
          </h2>

          <p className="mt-[5px] text-sm text-gray-600">
            {t(
              "quickActionsDescription"
            )}
          </p>
        </div>

        <div className="mt-[13px] grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
          {quickActions.map(
            (
              action
            ) => (
              <QuickAction
                key={
                  action.href
                }
                {...action}
              />
            )
          )}
        </div>
      </section>

      {organizationRows.length ===
      0 ? (
        <section className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[21px] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(
              "noOrganizationsTitle"
            )}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {t(
              "noOrganizationsDescription"
            )}
          </p>
        </section>
      ) : (
        <section className="space-y-[13px]">
          {organizationRows.map(
            (
              organization
            ) => {
              const membership =
                activeMemberships.find(
                  (
                    item
                  ) =>
                    item.organization_id ===
                    organization.id
                );

              const billing =
                billingByOrganization.get(
                  organization.id
                );

              return (
                <article
                  key={
                    organization.id
                  }
                  className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-[21px]">
                    <div>
                      <div className="flex flex-wrap items-center gap-[8px]">
                        <h2 className="text-xl font-bold text-gray-900">
                          {
                            organization.name
                          }
                        </h2>

                        <span
                          className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${statusClasses(
                            organization.status
                          )}`}
                        >
                          {statusLabel(
                            organization.status
                          )}
                        </span>
                      </div>

                      <p className="mt-[8px] text-sm text-gray-600">
                        {t(
                          "yourRole"
                        )}
                        :{" "}
                        {membership
                          ?.member_role ??
                          t(
                            "managerRole"
                          )}
                      </p>
                    </div>

                    <div className="text-sm leading-6 text-gray-600">
                      <p>
                        {organization.contact_email ??
                          t(
                            "emailUnavailable"
                          )}
                      </p>

                      <p>
                        {organization.contact_phone ??
                          t(
                            "phoneUnavailable"
                          )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-[21px] grid gap-[13px] md:grid-cols-2">
                    <div className="rounded-[13px] border border-gray-200 bg-[#F0EEE9] p-[13px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t(
                          "billing"
                        )}
                      </p>

                      {billing ? (
                        <div className="mt-[8px] text-sm leading-6 text-gray-700">
                          <p className="font-semibold text-gray-900">
                            {
                              billing.company_name
                            }
                          </p>

                          <p>
                            {t(
                              "taxId"
                            )}
                            :{" "}
                            {
                              billing.tax_id
                            }
                          </p>

                          <p>
                            {
                              billing.billing_email
                            }
                          </p>

                          <p>
                            {t(
                              "vat"
                            )}
                            :{" "}
                            {billing.is_vat_payer
                              ? t(
                                  "vatPayer"
                                )
                              : t(
                                  "notVatPayer"
                                )}
                          </p>
                        </div>
                      ) : (
                        <p className="mt-[8px] text-sm text-gray-600">
                          {t(
                            "noBilling"
                          )}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[13px] border border-gray-200 bg-[#F0EEE9] p-[13px]">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {t(
                          "medicalAccess"
                        )}
                      </p>

                      <p className="mt-[8px] text-sm leading-6 text-gray-700">
                        {t(
                          "medicalAccessDescription"
                        )}
                      </p>
                    </div>
                  </div>
                </article>
              );
            }
          )}
        </section>
      )}
    </div>
  );
}
