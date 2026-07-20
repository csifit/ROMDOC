"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

import Button from "@/components/ui/button";
import {
  type AppLocale,
  normalizeAppLocale,
  selectTranslation,
} from "@/lib/i18n/app-locale";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type Clinic = {
  id: string;
  slug: string;

  formatted_address:
    | string
    | null;

  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type StaffProfile = {
  id: string;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;
};

type StaffAssignment = {
  id: string;
  invited_email: string;
  status: string;
  invited_at: string;

  accepted_at:
    | string
    | null;

  clinic_id: string;

  staff_profile_id:
    | string
    | null;

  clinics:
    | Clinic
    | Clinic[]
    | null;

  profiles:
    | StaffProfile
    | StaffProfile[]
    | null;
};

type StaffApiResponse = {
  assignments?:
    StaffAssignment[];

  clinics?:
    Clinic[];

  message?: string;
  error?: string;
};

type StaffAction =
  | "activate"
  | "suspend"
  | "revoke";

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

function getStaffName(
  assignment:
    StaffAssignment
) {
  const profile =
    first(
      assignment.profiles
    );

  const fullName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
      .trim();

  return (
    fullName ||
    assignment.invited_email
  );
}

function getStatusClasses(
  status:
    string
) {
  switch (
    status
  ) {
    case "active":
      return "bg-green-100 text-green-800";

    case "suspended":
      return "bg-amber-100 text-amber-900";

    case "revoked":
      return "bg-red-100 text-red-800";

    default:
      return "bg-blue-100 text-blue-800";
  }
}

export default function DoctorStaffManager() {
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "DoctorConfiguration.staff"
    );

  const [
    isSubmitting,
    startTransition,
  ] =
    useTransition();

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      true
    );

  const [
    email,
    setEmail,
  ] =
    useState(
      ""
    );

  const [
    clinicId,
    setClinicId,
  ] =
    useState(
      ""
    );

  const [
    clinics,
    setClinics,
  ] =
    useState<
      Clinic[]
    >(
      []
    );

  const [
    assignments,
    setAssignments,
  ] =
    useState<
      StaffAssignment[]
    >(
      []
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    changingAssignmentId,
    setChangingAssignmentId,
  ] =
    useState<
      string | null
    >(
      null
    );

  function clinicName(
    clinic:
      | Clinic
      | null
  ) {
    if (!clinic) {
      return t(
        "clinicFallback"
      );
    }

    return (
      selectTranslation(
        clinic
          .clinic_translations,
        locale
      )?.name ??
      clinic.slug
    );
  }

  function statusLabel(
    status:
      string
  ) {
    if (
      [
        "active",
        "invited",
        "suspended",
        "revoked",
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

  const loadStaff =
    useCallback(
      async () => {
        try {
          setIsLoading(
            true
          );

          setError(
            null
          );

          const response =
            await fetch(
              "/api/doctor/staff",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          const result =
            (await response.json()) as
              StaffApiResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "loadError"
                  )
            );
          }

          setAssignments(
            result.assignments ??
            []
          );

          setClinics(
            result.clinics ??
            []
          );

          setClinicId(
            (
              current
            ) =>
              current ||
              result.clinics?.[0]
                ?.id ||
              ""
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : t(
                  "loadError"
                )
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      [
        locale,
        t,
      ]
    );

  useEffect(() => {
    void loadStaff();
  }, [
    loadStaff,
  ]);

  function handleInvite(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    setSuccess(
      null
    );

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes(
        "@"
      )
    ) {
      setError(
        t(
          "emailError"
        )
      );

      return;
    }

    if (
      !clinicId
    ) {
      setError(
        t(
          "clinicError"
        )
      );

      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/doctor/staff",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    email:
                      normalizedEmail,

                    clinicId,
                  }),
              }
            );

          const result =
            (await response.json()) as
              StaffApiResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              locale ===
                "ro" &&
              result.error
                ? result.error
                : t(
                    "inviteError"
                  )
            );
          }

          setSuccess(
            locale ===
              "ro" &&
            result.message
              ? result.message
              : t(
                  "invited"
                )
          );

          setEmail(
            ""
          );

          await loadStaff();
        } catch (
          inviteError
        ) {
          setError(
            inviteError instanceof
              Error
              ? inviteError.message
              : t(
                  "inviteError"
                )
          );
        }
      }
    );
  }

  async function updateAssignment(
    assignmentId:
      string,
    action:
      StaffAction
  ) {
    setError(
      null
    );

    setSuccess(
      null
    );

    setChangingAssignmentId(
      assignmentId
    );

    try {
      const response =
        await fetch(
          "/api/doctor/staff",
          {
            method:
              "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                assignmentId,
                action,
              }),
          }
        );

      const result =
        (await response.json()) as
          StaffApiResponse;

      if (
        !response.ok
      ) {
        throw new Error(
          locale ===
            "ro" &&
          result.error
            ? result.error
            : t(
                "statusError"
              )
        );
      }

      setSuccess(
        locale ===
          "ro" &&
        result.message
          ? result.message
          : t(
              "statusUpdated"
            )
      );

      await loadStaff();
    } catch (
      updateError
    ) {
      setError(
        updateError instanceof
          Error
          ? updateError.message
          : t(
              "statusError"
            )
      );
    } finally {
      setChangingAssignmentId(
        null
      );
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
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

        {clinics.length ===
        0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            {t(
              "noClinics"
            )}
          </div>
        ) : (
          <form
            onSubmit={
              handleInvite
            }
            className="mt-8 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "email"
                  )}
                </span>

                <input
                  type="email"
                  required
                  value={
                    email
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="reception@example.com"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  {t(
                    "clinic"
                  )}
                </span>

                <select
                  required
                  value={
                    clinicId
                  }
                  disabled={
                    isSubmitting
                  }
                  onChange={(
                    event
                  ) =>
                    setClinicId(
                      event.target
                        .value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                >
                  {clinics.map(
                    (
                      clinic
                    ) => (
                      <option
                        key={
                          clinic.id
                        }
                        value={
                          clinic.id
                        }
                      >
                        {clinicName(
                          clinic
                        )}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <Button
              type="submit"
              disabled={
                isSubmitting
              }
            >
              {isSubmitting
                ? t(
                    "sendingInvite"
                  )
                : t(
                    "invite"
                  )}
            </Button>
          </form>
        )}

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
          >
            {success}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          {t(
            "members"
          )}
        </h2>

        {isLoading ? (
          <p className="mt-5 text-sm text-gray-500">
            {t(
              "loading"
            )}
          </p>
        ) : assignments.length ===
          0 ? (
          <p className="mt-5 text-sm text-gray-600">
            {t(
              "empty"
            )}
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {assignments.map(
              (
                assignment
              ) => {
                const clinic =
                  first(
                    assignment
                      .clinics
                  );

                const isChanging =
                  changingAssignmentId ===
                  assignment.id;

                return (
                  <article
                    key={
                      assignment.id
                    }
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {getStaffName(
                            assignment
                          )}
                        </h3>

                        <p className="mt-1 text-sm text-gray-600">
                          {
                            assignment
                              .invited_email
                          }
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">
                            {t(
                              "clinic"
                            )}
                            :
                          </span>{" "}
                          {clinicName(
                            clinic
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {t(
                            "invitedAt",
                            {
                              date:
                                new Intl
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
                                      assignment
                                        .invited_at
                                    )
                                  ),
                            }
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          assignment.status
                        )}`}
                      >
                        {statusLabel(
                          assignment.status
                        )}
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {assignment.status !==
                        "active" && (
                        <Button
                          type="button"
                          disabled={
                            isChanging
                          }
                          onClick={() =>
                            updateAssignment(
                              assignment.id,
                              "activate"
                            )
                          }
                          size="sm"
                        >
                          {t(
                            "activate"
                          )}
                        </Button>
                      )}

                      {assignment.status ===
                        "active" && (
                        <Button
                          type="button"
                          disabled={
                            isChanging
                          }
                          onClick={() =>
                            updateAssignment(
                              assignment.id,
                              "suspend"
                            )
                          }
                          variant="secondary"
                          size="sm"
                        >
                          {t(
                            "suspend"
                          )}
                        </Button>
                      )}

                      <Button
                        type="button"
                        disabled={
                          isChanging
                        }
                        onClick={() =>
                          updateAssignment(
                            assignment.id,
                            "revoke"
                          )
                        }
                        variant="danger-outline"
                        size="sm"
                      >
                        {t(
                          "revoke"
                        )}
                      </Button>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}
