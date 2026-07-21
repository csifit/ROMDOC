import Link from "next/link";
import {
  getTranslations,
} from "next-intl/server";

import DoctorLocationAssignmentControl from "@/components/clinic-manager/doctor-location-assignment-control";
import {
  type AppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

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

  clinic_id:
    | string
    | null;

  doctor_id:
    | string
    | null;

  accepted_profile_id:
    | string
    | null;

  accepted_account_email:
    | string
    | null;

  invited_doctor_email:
    | string
    | null;

  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;

  accepted_at:
    | string
    | null;

  expires_at:
    | string
    | null;

  created_at: string;
};

type Doctor = {
  id: string;
  slug: string;

  profile_id:
    | string
    | null;

  status:
    | string
    | null;
};

type DoctorTranslation = {
  doctor_id: string;
  locale: string;

  title:
    | string
    | null;
};

type Profile = {
  id: string;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  role:
    | string
    | null;

  account_status:
    | string
    | null;
};

type ClinicTranslation = {
  locale: string;

  name:
    | string
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;
  status: string;

  formatted_address:
    | string
    | null;

  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type ClinicOrganizationClinicRow = {
  organization_id: string;
  clinic_id: string;
  status: string;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type ApprovedClinicLocation = {
  organizationId: string;
  clinicId: string;
  clinicName: string;

  formattedAddress:
    | string
    | null;
};

const DOCTOR_MONTHLY_PRICE_RON =
  60;

const DATE_LOCALE:
  Record<
    AppLocale,
    string
  > = {
    ro:
      "ro-RO",
    en:
      "en-GB",
    de:
      "de-DE",
  };

function firstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (
    !relation
  ) {
    return null;
  }

  if (
    Array.isArray(
      relation
    )
  ) {
    return relation[0] ??
      null;
  }

  return relation;
}

function slugLabel(
  slug:
    string
) {
  return slug
    .split(
      "-"
    )
    .map(
      (
        part
      ) =>
        part.charAt(
          0
        )
          .toUpperCase() +
        part.slice(
          1
        )
    )
    .join(
      " "
    );
}

function statusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "active":
    case "accepted":
      return "border-green-200 bg-green-50 text-green-800";

    case "pending":
    case "none":
      return "border-amber-200 bg-amber-50 text-amber-900";

    case "paused":
      return "border-orange-200 bg-orange-50 text-orange-900";

    case "declined":
    case "expired":
    case "cancelled":
    case "ended":
    case "rejected":
      return "border-red-200 bg-red-50 text-red-800";

    default:
      return "border-gray-200 bg-gray-50 text-gray-700";
  }
}

function profileName(
  profile:
    | Profile
    | undefined
) {
  if (
    !profile
  ) {
    return "";
  }

  return [
    profile.first_name,
    profile.last_name,
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    )
    .trim();
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

export default async function ClinicManagerDoctorsPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.doctors",
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
    ClinicOrganization[] =
    [];

  let relationships:
    DoctorRelationship[] =
    [];

  let approvedLocations:
    ApprovedClinicLocation[] =
    [];

  if (
    organizationIds.length >
    0
  ) {
    const [
      organizationsResult,
      relationshipsResult,
      locationsResult,
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
            "clinic_doctor_relationships"
          )
          .select(`
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
          `)
          .in(
            "organization_id",
            organizationIds
          )
          .eq(
            "payment_responsibility",
            "clinic_paid"
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),

        supabase
          .from(
            "clinic_organization_clinics"
          )
          .select(`
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
          `)
          .in(
            "organization_id",
            organizationIds
          )
          .eq(
            "status",
            "active"
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
        ClinicOrganization[];

    relationships =
      (
        relationshipsResult.data ??
        []
      ) as
        DoctorRelationship[];

    const locationRows =
      (
        locationsResult.data ??
        []
      ) as unknown as
        ClinicOrganizationClinicRow[];

    approvedLocations =
      locationRows.flatMap(
        (
          location
        ):
          ApprovedClinicLocation[] => {
          const clinic =
            firstRelation(
              location.clinics
            );

          if (
            !clinic ||
            clinic.status !==
              "approved"
          ) {
            return [];
          }

          return [
            {
              organizationId:
                location.organization_id,

              clinicId:
                location.clinic_id,

              clinicName:
                selectTranslation(
                  clinic.clinic_translations,
                  locale
                )?.name ??
                slugLabel(
                  clinic.slug
                ),

              formattedAddress:
                clinic.formatted_address,
            },
          ];
        }
      );
  }

  const doctorIds =
    Array.from(
      new Set(
        relationships
          .map(
            (
              relationship
            ) =>
              relationship.doctor_id
          )
          .filter(
            (
              doctorId
            ):
              doctorId is
                string =>
              Boolean(
                doctorId
              )
          )
      )
    );

  const acceptedProfileIds =
    Array.from(
      new Set(
        relationships
          .map(
            (
              relationship
            ) =>
              relationship.accepted_profile_id
          )
          .filter(
            (
              acceptedProfileId
            ):
              acceptedProfileId is
                string =>
              Boolean(
                acceptedProfileId
              )
          )
      )
    );

  let doctors:
    Doctor[] =
    [];

  let doctorTranslations:
    DoctorTranslation[] =
    [];

  let profiles:
    Profile[] =
    [];

  if (
    doctorIds.length >
    0
  ) {
    const [
      doctorsResult,
      translationsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "doctors"
          )
          .select(
            "id, slug, profile_id, status"
          )
          .in(
            "id",
            doctorIds
          ),

        supabase
          .from(
            "doctor_translations"
          )
          .select(
            "doctor_id, locale, title"
          )
          .in(
            "doctor_id",
            doctorIds
          ),
      ]);

    doctors =
      (
        doctorsResult.data ??
        []
      ) as
        Doctor[];

    doctorTranslations =
      (
        translationsResult.data ??
        []
      ) as
        DoctorTranslation[];
  }

  const profileIds =
    Array.from(
      new Set([
        ...acceptedProfileIds,

        ...doctors
          .map(
            (
              doctor
            ) =>
              doctor.profile_id
          )
          .filter(
            (
              doctorProfileId
            ):
              doctorProfileId is
                string =>
              Boolean(
                doctorProfileId
              )
          ),
      ])
    );

  if (
    profileIds.length >
    0
  ) {
    const {
      data:
        profilesData,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(
          "id, first_name, last_name, role, account_status"
        )
        .in(
          "id",
          profileIds
        );

    profiles =
      (
        profilesData ??
        []
      ) as
        Profile[];
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

  const doctorsById =
    new Map(
      doctors.map(
        (
          doctor
        ) => [
          doctor.id,
          doctor,
        ]
      )
    );

  const profilesById =
    new Map(
      profiles.map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );

  const translationsByDoctorId =
    new Map<
      string,
      DoctorTranslation[]
    >();

  for (
    const translation of
      doctorTranslations
  ) {
    const current =
      translationsByDoctorId.get(
        translation.doctor_id
      ) ??
      [];

    current.push(
      translation
    );

    translationsByDoctorId.set(
      translation.doctor_id,
      current
    );
  }

  const openInvitations =
    relationships.filter(
      (
        relationship
      ) =>
        relationship.invitation_status ===
        "pending"
    );

  const acceptedInvitations =
    relationships.filter(
      (
        relationship
      ) =>
        relationship.invitation_status ===
        "accepted"
    );

  const activeCoveredDoctors =
    relationships.filter(
      (
        relationship
      ) =>
        relationship.invitation_status ===
          "accepted" &&
        relationship.coverage_status ===
          "active"
    );

  const completedDoctorProfiles =
    relationships.filter(
      (
        relationship
      ) =>
        Boolean(
          relationship.doctor_id
        )
    );

  const assignedDoctors =
    relationships.filter(
      (
        relationship
      ) =>
        Boolean(
          relationship.clinic_id
        )
    );

  const monthlyEstimateRon =
    activeCoveredDoctors.length *
    DOCTOR_MONTHLY_PRICE_RON;

  function formatDate(
    value:
      | string
      | null
  ) {
    if (
      !value
    ) {
      return "—";
    }

    return new Intl
      .DateTimeFormat(
        DATE_LOCALE[
          locale
        ],
        {
          day:
            "2-digit",

          month:
            "long",

          year:
            "numeric",
        }
      )
      .format(
        new Date(
          value
        )
      );
  }

  function organizationStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "active",
        "suspended",
        "rejected",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.organization.${normalized}`
    );
  }

  function invitationStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "pending",
        "accepted",
        "declined",
        "expired",
        "cancelled",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.invitation.${normalized}`
    );
  }

  function coverageStatusLabel(
    status:
      string
  ) {
    const normalized =
      [
        "active",
        "paused",
        "cancelled",
        "ended",
        "none",
      ].includes(
        status
      )
        ? status
        : "pending";

    return t(
      `statuses.coverage.${normalized}`
    );
  }

  function doctorDisplayName(
    relationship:
      DoctorRelationship
  ) {
    if (
      relationship.doctor_id
    ) {
      const translatedTitle =
        selectTranslation(
          translationsByDoctorId.get(
            relationship.doctor_id
          ),
          locale
        )?.title;

      if (
        translatedTitle
      ) {
        return translatedTitle;
      }

      const doctor =
        doctorsById.get(
          relationship.doctor_id
        );

      if (
        doctor?.profile_id
      ) {
        const name =
          profileName(
            profilesById.get(
              doctor.profile_id
            )
          );

        if (
          name
        ) {
          return name;
        }
      }

      if (
        doctor?.slug
      ) {
        return slugLabel(
          doctor.slug
        );
      }
    }

    if (
      relationship.accepted_profile_id
    ) {
      const name =
        profileName(
          profilesById.get(
            relationship.accepted_profile_id
          )
        );

      if (
        name
      ) {
        return name;
      }
    }

    return (
      relationship.accepted_account_email ??
      relationship.invited_doctor_email ??
      t(
        "invitedDoctor"
      )
    );
  }

  function doctorProfileHref(
    relationship:
      DoctorRelationship
  ) {
    if (
      !relationship.doctor_id
    ) {
      return null;
    }

    const doctor =
      doctorsById.get(
        relationship.doctor_id
      );

    if (
      !doctor?.slug
    ) {
      return null;
    }

    return locale ===
      "de"
      ? `/de/arzt/${doctor.slug}`
      : `/${locale}/doctor/${doctor.slug}`;
  }

  function StatusBadge({
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

  function ProfileState({
    relationship,
  }: {
    relationship:
      DoctorRelationship;
  }) {
    const href =
      doctorProfileHref(
        relationship
      );

    if (
      href
    ) {
      return (
        <Link
          href={
            href
          }
          className="font-semibold text-[#036661] underline-offset-4 hover:underline"
        >
          {t(
            "viewPublicProfile"
          )}
        </Link>
      );
    }

    if (
      relationship.accepted_profile_id
    ) {
      return (
        <span>
          {t(
            "profilePreparing"
          )}
        </span>
      );
    }

    return (
      <span>
        {t(
          "waitingRegistration"
        )}
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

      <div className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-5">
        <DashboardStat
          label={t(
            "stats.openInvitations"
          )}
          value={
            openInvitations.length
          }
          helper={t(
            "stats.openInvitationsHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.createdAccounts"
          )}
          value={
            acceptedInvitations.length
          }
          helper={t(
            "stats.createdAccountsHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.doctorProfiles"
          )}
          value={
            completedDoctorProfiles.length
          }
          helper={t(
            "stats.doctorProfilesHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.assignedLocations"
          )}
          value={
            assignedDoctors.length
          }
          helper={t(
            "stats.assignedLocationsHelper"
          )}
        />

        <DashboardStat
          label={t(
            "stats.monthlyEstimate"
          )}
          value={t(
            "monthlyPrice",
            {
              price:
                monthlyEstimateRon,
            }
          )}
          helper={t(
            "stats.monthlyEstimateHelper"
          )}
        />
      </div>

      {organizations.length ===
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
      ) : relationships.length ===
        0 ? (
        <section className="rounded-[21px] border border-dashed border-gray-300 bg-white p-[21px] shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t(
              "noDoctorsTitle"
            )}
          </h2>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {t(
              "noDoctorsDescription"
            )}
          </p>

          <Link
            href="/clinic-manager-dashboard/invitations"
            className="romdoc-focus-ring mt-[21px] inline-flex rounded-[13px] bg-[#036661] px-[21px] py-[13px] text-sm font-semibold text-white transition hover:bg-[#024d49]"
          >
            {t(
              "inviteDoctor"
            )}
          </Link>
        </section>
      ) : (
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

            <div className="flex flex-wrap items-center gap-[8px]">
              <span className="rounded-full bg-[#F0EEE9] px-[13px] py-[5px] text-sm font-semibold text-gray-700">
                {t(
                  "count",
                  {
                    count:
                      relationships.length,
                  }
                )}
              </span>

              <Link
                href="/clinic-manager-dashboard/locations"
                className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[8px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                {t(
                  "manageLocations"
                )}
              </Link>

              <Link
                href="/clinic-manager-dashboard/invitations"
                className="romdoc-focus-ring rounded-[13px] border border-[#036661] px-[13px] py-[8px] text-sm font-semibold text-[#036661] transition hover:bg-[#036661]/10"
              >
                {t(
                  "inviteNewDoctor"
                )}
              </Link>
            </div>
          </div>

          <div className="mt-[21px] space-y-[13px] lg:hidden">
            {relationships.map(
              (
                relationship
              ) => {
                const organization =
                  organizationsById.get(
                    relationship.organization_id
                  );

                const isActiveCovered =
                  relationship.invitation_status ===
                    "accepted" &&
                  relationship.coverage_status ===
                    "active";

                return (
                  <article
                    key={`${relationship.id}-mobile`}
                    className="rounded-[13px] border border-gray-200 p-[13px]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-[8px]">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900">
                          {doctorDisplayName(
                            relationship
                          )}
                        </h3>

                        <p className="mt-[5px] break-all text-xs text-gray-500">
                          {relationship.accepted_account_email ??
                            relationship.invited_doctor_email ??
                            t(
                              "emailUnavailable"
                            )}
                        </p>
                      </div>

                      <StatusBadge
                        status={
                          relationship.invitation_status
                        }
                        label={invitationStatusLabel(
                          relationship.invitation_status
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
                            t(
                              "unknownOrganization"
                            )}

                          <span className="mt-[5px] block">
                            <StatusBadge
                              status={
                                organization
                                  ?.status ??
                                "pending"
                              }
                              label={organizationStatusLabel(
                                organization
                                  ?.status ??
                                  "pending"
                              )}
                            />
                          </span>
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t(
                            "coverage"
                          )}
                        </dt>

                        <dd className="mt-[5px]">
                          <StatusBadge
                            status={
                              relationship.coverage_status
                            }
                            label={coverageStatusLabel(
                              relationship.coverage_status
                            )}
                          />
                        </dd>
                      </div>

                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t(
                            "approvedLocation"
                          )}
                        </dt>

                        <dd className="mt-[8px]">
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
                            locations={
                              approvedLocations
                            }
                          />
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t(
                            "profile"
                          )}
                        </dt>

                        <dd className="mt-[5px] text-gray-700">
                          <ProfileState
                            relationship={
                              relationship
                            }
                          />
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t(
                            "monthlyCost"
                          )}
                        </dt>

                        <dd className="mt-[5px] text-gray-700">
                          {isActiveCovered
                            ? t(
                                "monthlyPrice",
                                {
                                  price:
                                    DOCTOR_MONTHLY_PRICE_RON,
                                }
                              )
                            : "—"}
                        </dd>
                      </div>

                      <div className="sm:col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {t(
                            "dates"
                          )}
                        </dt>

                        <dd className="mt-[5px] space-y-[5px] text-xs leading-5 text-gray-600">
                          <p>
                            {t(
                              "invitedAt"
                            )}
                            :{" "}
                            {formatDate(
                              relationship.created_at
                            )}
                          </p>

                          <p>
                            {t(
                              "acceptedAt"
                            )}
                            :{" "}
                            {formatDate(
                              relationship.accepted_at
                            )}
                          </p>

                          <p>
                            {t(
                              "expiresAt"
                            )}
                            :{" "}
                            {formatDate(
                              relationship.expires_at
                            )}
                          </p>
                        </dd>
                      </div>
                    </dl>
                  </article>
                );
              }
            )}
          </div>

          <div className="mt-[21px] hidden overflow-hidden rounded-[13px] border border-gray-200 lg:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-[13px] py-[13px]">
                      {t(
                        "doctor"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "organization"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "invitation"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "coverage"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "approvedLocation"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "profile"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "monthlyCost"
                      )}
                    </th>

                    <th className="px-[13px] py-[13px]">
                      {t(
                        "dates"
                      )}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {relationships.map(
                    (
                      relationship
                    ) => {
                      const organization =
                        organizationsById.get(
                          relationship.organization_id
                        );

                      const isActiveCovered =
                        relationship.invitation_status ===
                          "accepted" &&
                        relationship.coverage_status ===
                          "active";

                      return (
                        <tr
                          key={
                            relationship.id
                          }
                          className="align-top"
                        >
                          <td className="px-[13px] py-[13px]">
                            <p className="font-medium text-gray-900">
                              {doctorDisplayName(
                                relationship
                              )}
                            </p>

                            <p className="mt-[5px] max-w-xs break-all text-xs text-gray-500">
                              {relationship.accepted_account_email ??
                                relationship.invited_doctor_email ??
                                t(
                                  "emailUnavailable"
                                )}
                            </p>
                          </td>

                          <td className="px-[13px] py-[13px] text-gray-700">
                            <p>
                              {organization
                                ?.name ??
                                t(
                                  "unknownOrganization"
                                )}
                            </p>

                            <span className="mt-[5px] inline-flex">
                              <StatusBadge
                                status={
                                  organization
                                    ?.status ??
                                  "pending"
                                }
                                label={organizationStatusLabel(
                                  organization
                                    ?.status ??
                                    "pending"
                                )}
                              />
                            </span>
                          </td>

                          <td className="px-[13px] py-[13px]">
                            <StatusBadge
                              status={
                                relationship.invitation_status
                              }
                              label={invitationStatusLabel(
                                relationship.invitation_status
                              )}
                            />
                          </td>

                          <td className="px-[13px] py-[13px]">
                            <StatusBadge
                              status={
                                relationship.coverage_status
                              }
                              label={coverageStatusLabel(
                                relationship.coverage_status
                              )}
                            />
                          </td>

                          <td className="px-[13px] py-[13px]">
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
                              locations={
                                approvedLocations
                              }
                            />
                          </td>

                          <td className="px-[13px] py-[13px] text-gray-700">
                            <ProfileState
                              relationship={
                                relationship
                              }
                            />
                          </td>

                          <td className="px-[13px] py-[13px] text-gray-700">
                            {isActiveCovered
                              ? t(
                                  "monthlyPrice",
                                  {
                                    price:
                                      DOCTOR_MONTHLY_PRICE_RON,
                                  }
                                )
                              : "—"}
                          </td>

                          <td className="px-[13px] py-[13px] text-xs leading-5 text-gray-600">
                            <p>
                              {t(
                                "invitedAt"
                              )}
                              :{" "}
                              {formatDate(
                                relationship.created_at
                              )}
                            </p>

                            <p>
                              {t(
                                "acceptedAt"
                              )}
                              :{" "}
                              {formatDate(
                                relationship.accepted_at
                              )}
                            </p>

                            <p>
                              {t(
                                "expiresAt"
                              )}
                              :{" "}
                              {formatDate(
                                relationship.expires_at
                              )}
                            </p>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-sm leading-6 text-amber-900">
            {t(
              "assignmentNotice"
            )}
          </div>
        </section>
      )}
    </div>
  );
}
