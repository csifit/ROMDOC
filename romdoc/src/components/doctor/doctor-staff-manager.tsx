"use client";

import Button from "@/components/ui/button";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

type ClinicTranslation = {
  locale: string;
  name: string;
};

type Clinic = {
  id: string;
  slug: string;
  formatted_address: string | null;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type StaffProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type StaffAssignment = {
  id: string;
  invited_email: string;
  status: string;
  invited_at: string;
  accepted_at: string | null;
  clinic_id: string;
  staff_profile_id: string | null;

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
  assignments?: StaffAssignment[];
  clinics?: Clinic[];
  message?: string;
  error?: string;
};

type StaffAction =
  | "activate"
  | "suspend"
  | "revoke";

function getFirstRelation<T>(
  relation:
    | T
    | T[]
    | null
    | undefined
) {
  if (!relation) {
    return null;
  }

  if (Array.isArray(relation)) {
    return relation[0] ?? null;
  }

  return relation;
}

function getClinicName(
  clinic:
    | Clinic
    | null
) {
  if (!clinic) {
    return "Clinică";
  }

  return (
    clinic.clinic_translations
      ?.find(
        (translation) =>
          translation.locale === "ro"
      )?.name ??
    clinic.clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function getStaffName(
  assignment: StaffAssignment
) {
  const profile =
    getFirstRelation(
      assignment.profiles
    );

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    assignment.invited_email
  );
}

function getStatusLabel(
  status: string
) {
  switch (status) {
    case "active":
      return "Activ";

    case "invited":
      return "Invitat";

    case "suspended":
      return "Suspendat";

    case "revoked":
      return "Revocat";

    default:
      return status;
  }
}

function getStatusClasses(
  status: string
) {
  switch (status) {
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

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(value));
}

export default function DoctorStaffManager() {
  const [
    isSubmitting,
    startTransition,
  ] = useTransition();

  const [isLoading, setIsLoading] =
    useState(true);

  const [email, setEmail] =
    useState("");

  const [clinicId, setClinicId] =
    useState("");

  const [clinics, setClinics] =
    useState<Clinic[]>([]);

  const [
    assignments,
    setAssignments,
  ] = useState<
    StaffAssignment[]
  >([]);

  const [error, setError] =
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

  const [
    changingAssignmentId,
    setChangingAssignmentId,
  ] = useState<string | null>(
    null
  );

  const loadStaff =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/doctor/staff",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            StaffApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Personalul nu a putut fi încărcat."
          );
        }

        setAssignments(
          result.assignments ?? []
        );

        setClinics(
          result.clinics ?? []
        );

        if (
          !clinicId &&
          result.clinics?.length
        ) {
          setClinicId(
            result.clinics[0].id
          );
        }
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Personalul nu a putut fi încărcat."
        );
      } finally {
        setIsLoading(false);
      }
    }, [clinicId]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  function handleInvite(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setSuccess(null);

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes("@")
    ) {
      setError(
        "Introdu o adresă de e-mail validă."
      );

      return;
    }

    if (!clinicId) {
      setError(
        "Selectează clinica."
      );

      return;
    }

    startTransition(async () => {
      try {
        const response =
          await fetch(
            "/api/doctor/staff",
            {
              method: "POST",

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

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Invitația nu a putut fi trimisă."
          );
        }

        setSuccess(
          result.message ??
            "Invitația a fost trimisă."
        );

        setEmail("");

        await loadStaff();
      } catch (inviteError) {
        setError(
          inviteError instanceof Error
            ? inviteError.message
            : "Invitația nu a putut fi trimisă."
        );
      }
    });
  }

  async function updateAssignment(
    assignmentId: string,
    action: StaffAction
  ) {
    setError(null);
    setSuccess(null);
    setChangingAssignmentId(
      assignmentId
    );

    try {
      const response =
        await fetch(
          "/api/doctor/staff",
          {
            method: "PATCH",

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

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Statutul personalului nu a putut fi actualizat."
        );
      }

      setSuccess(
        result.message ??
          "Statutul a fost actualizat."
      );

      await loadStaff();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Statutul personalului nu a putut fi actualizat."
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
          Personal
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Personalul cabinetului
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Personalul poate administra numai
          programările tale din clinica
          selectată. Nu primește acces la
          profil, servicii, disponibilitate,
          clinici sau facturare.
        </p>

        {clinics.length === 0 ? (
          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Pentru a invita personal trebuie
            să ai cel puțin o clinică aprobată
            asociată profilului tău.
          </div>
        ) : (
          <form
            onSubmit={handleInvite}
            className="mt-8 space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Adresa de e-mail
                </span>

                <input
                  type="email"
                  required
                  value={email}
                  disabled={
                    isSubmitting
                  }
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="receptie@exemplu.ro"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Clinica
                </span>

                <select
                  required
                  value={clinicId}
                  disabled={
                    isSubmitting
                  }
                  onChange={(event) =>
                    setClinicId(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
                >
                  {clinics.map(
                    (clinic) => (
                      <option
                        key={clinic.id}
                        value={clinic.id}
                      >
                        {getClinicName(
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
                ? "Se trimite invitația..."
                : "Invită membru al personalului"}
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
          Membrii personalului
        </h2>

        {isLoading ? (
          <p className="mt-5 text-sm text-gray-500">
            Se încarcă personalul...
          </p>
        ) : assignments.length ===
          0 ? (
          <p className="mt-5 text-sm text-gray-600">
            Nu ai invitat încă niciun membru
            al personalului.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {assignments.map(
              (assignment) => {
                const clinic =
                  getFirstRelation(
                    assignment.clinics
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
                            assignment.invited_email
                          }
                        </p>

                        <p className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">
                            Clinică:
                          </span>{" "}
                          {getClinicName(
                            clinic
                          )}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          Invitat la{" "}
                          {formatDate(
                            assignment.invited_at
                          )}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          assignment.status
                        )}`}
                      >
                        {getStatusLabel(
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
                          Activează accesul
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
                          Suspendă
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
                        Revocă
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