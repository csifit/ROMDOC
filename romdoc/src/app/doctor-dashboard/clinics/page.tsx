import {
  getTranslations,
} from "next-intl/server";
import {
  redirect,
} from "next/navigation";

import ClinicProposalForm from "@/components/clinic/clinic-proposal-form";
import {
  selectTranslation,
} from "@/lib/i18n/app-locale";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type ClinicTranslation = {
  locale: string;
  name: string;

  description:
    | string
    | null;
};

type ClinicRelation = {
  id: string;
  slug: string;

  formatted_address:
    | string
    | null;

  email:
    | string
    | null;

  phone:
    | string
    | null;

  website:
    | string
    | null;

  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type DoctorClinicRow = {
  clinic_id: string;

  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type DoctorAccount = {
  id: string;

  account_type:
    | string
    | null;

  clinic_organization_id:
    | string
    | null;
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
};

function first<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
}

function fallbackName(
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
        part
          .charAt(
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

export default async function DoctorClinicsPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "DoctorConfiguration.clinicsPage",
    });

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const query =
      new URLSearchParams({
        locale,
        next:
          "/doctor-dashboard/clinics",
      });

    redirect(
      `/login?${query.toString()}`
    );
  }

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role"
      )
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    !profile ||
    profile.role !==
      "doctor"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      doctorData,
    error:
      doctorError,
  } =
    await supabase
      .from(
        "doctors"
      )
      .select(`
        id,
        account_type,
        clinic_organization_id
      `)
      .eq(
        "profile_id",
        user.id
      )
      .maybeSingle();

  if (
    doctorError
  ) {
    console.error(
      "Doctor clinics account query failed:",
      doctorError
    );
  }

  const doctor =
    doctorData as
      | DoctorAccount
      | null;

  const isClinicInvitedDoctor =
    doctor
      ?.account_type ===
    "clinic_invited";

  if (
    !isClinicInvitedDoctor ||
    !doctor
  ) {
    return (
      <ClinicProposalForm />
    );
  }

  const [
    organizationResult,
    doctorClinicsResult,
  ] =
    await Promise.all([
      doctor
        .clinic_organization_id
        ? supabase
            .from(
              "clinic_organizations"
            )
            .select(`
              id,
              name,
              status,
              contact_email,
              contact_phone
            `)
            .eq(
              "id",
              doctor
                .clinic_organization_id
            )
            .maybeSingle()
        : Promise.resolve({
            data:
              null,

            error:
              null,
          }),

      supabase
        .from(
          "doctor_clinics"
        )
        .select(`
          clinic_id,
          clinics (
            id,
            slug,
            formatted_address,
            email,
            phone,
            website,
            clinic_translations (
              locale,
              name,
              description
            )
          )
        `)
        .eq(
          "doctor_id",
          doctor.id
        ),
    ]);

  if (
    organizationResult
      .error
  ) {
    console.error(
      "Clinic doctor organization query failed:",
      organizationResult
        .error
    );
  }

  if (
    doctorClinicsResult
      .error
  ) {
    console.error(
      "Clinic doctor assigned clinics query failed:",
      doctorClinicsResult
        .error
    );
  }

  const organization =
    organizationResult
      .data as
      | ClinicOrganization
      | null;

  const rows =
    (
      doctorClinicsResult
        .data as unknown as
        | DoctorClinicRow[]
        | null
    ) ??
    [];

  const clinics =
    rows
      .map(
        (
          row
        ) =>
          first(
            row.clinics
          )
      )
      .filter(
        (
          clinic
        ): clinic is
          ClinicRelation =>
          Boolean(
            clinic
          )
      );

  function clinicName(
    clinic:
      ClinicRelation
  ) {
    return (
      selectTranslation(
        clinic
          .clinic_translations,
        locale
      )?.name ??
      fallbackName(
        clinic.slug
      )
    );
  }

  function statusLabel(
    status:
      string
  ) {
    if (
      [
        "active",
        "suspended",
        "rejected",
        "archived",
        "pending",
      ].includes(
        status
      )
    ) {
      return t(
        `statuses.${status}`
      );
    }

    return status;
  }

  return (
    <main className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "clinicAccount"
          )}
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      <section className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm leading-6 text-green-900 shadow-sm sm:p-6">
        <h2 className="text-lg font-bold text-green-950">
          {t(
            "coveredTitle"
          )}
        </h2>

        <p className="mt-2">
          {t(
            "coveredDescription"
          )}
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">
          {t(
            "organization"
          )}
        </h2>

        {organization ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              [
                t(
                  "organizationName"
                ),
                organization.name,
              ],
              [
                t(
                  "organizationStatus"
                ),
                statusLabel(
                  organization.status
                ),
              ],
              [
                t(
                  "contactEmail"
                ),
                organization
                  .contact_email ??
                  "—",
              ],
              [
                t(
                  "contactPhone"
                ),
                organization
                  .contact_phone ??
                  "—",
              ],
            ].map(
              ([
                label,
                value,
              ]) => (
                <div
                  key={
                    label
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {label}
                  </p>

                  <p className="mt-2 font-semibold text-gray-900">
                    {value}
                  </p>
                </div>
              )
            )}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-gray-600">
            {t(
              "organizationMissing"
            )}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-xl font-bold text-gray-900">
          {t(
            "associatedClinics"
          )}
        </h2>

        {clinics.length ===
        0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm leading-6 text-gray-600">
            {t(
              "noClinics"
            )}
          </div>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {clinics.map(
              (
                clinic
              ) => (
                <article
                  key={
                    clinic.id
                  }
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <h3 className="font-semibold text-gray-900">
                    {clinicName(
                      clinic
                    )}
                  </h3>

                  <dl className="mt-3 space-y-2 text-sm text-gray-600">
                    {[
                      [
                        t(
                          "address"
                        ),
                        clinic
                          .formatted_address ??
                          "—",
                      ],
                      [
                        t(
                          "email"
                        ),
                        clinic.email ??
                          "—",
                      ],
                      [
                        t(
                          "phone"
                        ),
                        clinic.phone ??
                          "—",
                      ],
                      [
                        t(
                          "website"
                        ),
                        clinic.website ??
                          "—",
                      ],
                    ].map(
                      ([
                        label,
                        value,
                      ]) => (
                        <div
                          key={
                            label
                          }
                        >
                          <dt className="font-medium text-gray-800">
                            {label}
                          </dt>

                          <dd>
                            {value}
                          </dd>
                        </div>
                      )
                    )}
                  </dl>
                </article>
              )
            )}
          </div>
        )}
      </section>
    </main>
  );
}
