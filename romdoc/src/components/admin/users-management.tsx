"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type ManagedUser = {
  id: string;
  email: string | null;
  phone: string | null;

  first_name:
    | string
    | null;

  last_name:
    | string
    | null;

  role: string;
  account_status: string;
  email_verified: boolean;

  email_confirmed_at:
    | string
    | null;

  last_sign_in_at:
    | string
    | null;

  created_at: string;

  blocked_at:
    | string
    | null;

  blocked_reason:
    | string
    | null;

  is_current_admin: boolean;

  subscription_status:
    | string
    | null;

  subscription_doctor_id:
    | string
    | null;

  stripe_subscription_id:
    | string
    | null;

  subscription_period_end:
    | string
    | null;

  can_activate_doctor: boolean;
};

type ApiResponse = {
  users?: ManagedUser[];
  message?: string;
  error?: string;
};

type RoleFilter =
  | "all"
  | "patient"
  | "doctor_applicant"
  | "doctor"
  | "staff"
  | "admin";

type StatusFilter =
  | "all"
  | "active"
  | "blocked";

function getFullName(
  user: ManagedUser
) {
  const name = [
    user.first_name,
    user.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name ||
    "Nume indisponibil";
}

function getRoleLabel(
  role: string
) {
  switch (role) {
    case "admin":
      return "Administrator";

    case "doctor":
      return "Medic";

    case "doctor_applicant":
      return "Candidat medic";

    case "staff":
      return "Personal";

    case "patient":
      return "Pacient";

    default:
      return role;
  }
}

function getRoleClasses(
  role: string
) {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800";

    case "doctor":
      return "bg-blue-100 text-blue-800";

    case "doctor_applicant":
      return "bg-cyan-100 text-cyan-800";

    case "staff":
      return "bg-indigo-100 text-indigo-800";

    case "patient":
      return "bg-teal-100 text-teal-800";

    default:
      return "bg-gray-200 text-gray-700";
  }
}

function getSubscriptionLabel(
  status:
    | string
    | null
) {
  switch (status) {
    case "active":
      return "Abonament activ";

    case "trialing":
      return "Perioadă de probă";

    case "past_due":
      return "Plată restantă";

    case "unpaid":
      return "Neplătit";

    case "canceled":
      return "Anulat";

    case "incomplete":
      return "Plată incompletă";

    case "incomplete_expired":
      return "Plată expirată";

    case "paused":
      return "Suspendat";

    case "pending":
      return "În așteptare";

    default:
      return "Fără abonament";
  }
}

function getSubscriptionClasses(
  status:
    | string
    | null
) {
  switch (status) {
    case "active":
    case "trialing":
      return "bg-green-100 text-green-800";

    case "past_due":
    case "incomplete":
    case "pending":
      return "bg-amber-100 text-amber-900";

    case "unpaid":
    case "canceled":
    case "incomplete_expired":
      return "bg-red-100 text-red-800";

    default:
      return "bg-gray-200 text-gray-700";
  }
}

function formatDateTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

export default function UsersManagement() {
  const [users, setUsers] =
    useState<ManagedUser[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] =
    useState<RoleFilter>(
      "all"
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "all"
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    changingUserId,
    setChangingUserId,
  ] =
    useState<string | null>(
      null
    );

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [success, setSuccess] =
    useState<string | null>(
      null
    );

  const loadUsers =
    useCallback(async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response =
          await fetch(
            "/api/admin/users",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const result =
          (await response.json()) as
            ApiResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "Utilizatorii nu au putut fi încărcați."
          );
        }

        setUsers(
          result.users ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "Utilizatorii nu au putut fi încărcați."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (user) => {
          if (
            roleFilter !==
              "all" &&
            user.role !==
              roleFilter
          ) {
            return false;
          }

          if (
            statusFilter !==
              "all" &&
            user.account_status !==
              statusFilter
          ) {
            return false;
          }

          if (!normalizedSearch) {
            return true;
          }

          return [
            user.first_name,
            user.last_name,
            getFullName(user),
            user.email,
            user.phone,
            getRoleLabel(
              user.role
            ),
            getSubscriptionLabel(
              user.subscription_status
            ),
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(
                  normalizedSearch
                )
            );
        }
      );
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ]);

  async function activateDoctor(
    user: ManagedUser
  ) {
    const confirmed =
      window.confirm(
        `Activezi contul ${user.email ?? getFullName(user)} ca medic? Această acțiune acordă acces la platforma medicilor.`
      );

    if (!confirmed) {
      return;
    }

    setError(null);
    setSuccess(null);

    setChangingUserId(
      user.id
    );

    try {
      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                action:
                  "activate_doctor",
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Candidatul nu a putut fi activat ca medic."
        );
      }

      setSuccess(
        result.message ??
          "Candidatul a fost activat ca medic."
      );

      await loadUsers();
    } catch (activationError) {
      setError(
        activationError instanceof
          Error
          ? activationError.message
          : "Candidatul nu a putut fi activat ca medic."
      );
    } finally {
      setChangingUserId(
        null
      );
    }
  }

  async function changeUserStatus(
    user: ManagedUser
  ) {
    const action =
      user.account_status ===
      "blocked"
        ? "unblock"
        : "block";

    let reason = "";

    if (action === "block") {
      const enteredReason =
        window.prompt(
          `Introdu motivul blocării contului ${user.email ?? getFullName(user)}:`
        );

      if (
        !enteredReason ||
        enteredReason.trim()
          .length < 3
      ) {
        return;
      }

      reason =
        enteredReason.trim();
    } else {
      const confirmed =
        window.confirm(
          `Deblochezi contul ${user.email ?? getFullName(user)}?`
        );

      if (!confirmed) {
        return;
      }
    }

    setError(null);
    setSuccess(null);

    setChangingUserId(
      user.id
    );

    try {
      const response =
        await fetch(
          "/api/admin/users",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                userId:
                  user.id,

                action,

                reason,
              }),
          }
        );

      const result =
        (await response.json()) as
          ApiResponse;

      if (!response.ok) {
        throw new Error(
          result.error ??
            "Statutul utilizatorului nu a putut fi actualizat."
        );
      }

      setSuccess(
        result.message ??
          "Statutul utilizatorului a fost actualizat."
      );

      await loadUsers();
    } catch (actionError) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : "Statutul utilizatorului nu a putut fi actualizat."
      );
    } finally {
      setChangingUserId(
        null
      );
    }
  }

  const activeCount =
    users.filter(
      (user) =>
        user.account_status ===
        "active"
    ).length;

  const blockedCount =
    users.filter(
      (user) =>
        user.account_status ===
        "blocked"
    ).length;

  const applicantCount =
    users.filter(
      (user) =>
        user.role ===
        "doctor_applicant"
    ).length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            Total utilizatori
          </p>

          <p className="mt-3 text-3xl font-bold text-gray-900">
            {users.length}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            Conturi active
          </p>

          <p className="mt-3 text-3xl font-bold text-green-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            Candidați medici
          </p>

          <p className="mt-3 text-3xl font-bold text-cyan-700">
            {applicantCount}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            Conturi blocate
          </p>

          <p className="mt-3 text-3xl font-bold text-red-700">
            {blockedCount}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_14rem_14rem]">
          <label>
            <span className="sr-only">
              Caută utilizator
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Caută după nume, e-mail sau telefon..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label>
            <span className="sr-only">
              Filtrează după rol
            </span>

            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target
                    .value as RoleFilter
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            >
              <option value="all">
                Toate rolurile
              </option>

              <option value="patient">
                Pacienți
              </option>

              <option value="doctor_applicant">
                Candidați medici
              </option>

              <option value="doctor">
                Medici
              </option>

              <option value="staff">
                Personal
              </option>

              <option value="admin">
                Administratori
              </option>
            </select>
          </label>

          <label>
            <span className="sr-only">
              Filtrează după statut
            </span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target
                    .value as StatusFilter
                )
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            >
              <option value="all">
                Toate statuturile
              </option>

              <option value="active">
                Active
              </option>

              <option value="blocked">
                Blocate
              </option>
            </select>
          </label>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-sm text-gray-600">
            Se încarcă utilizatorii...
          </div>
        ) : filteredUsers.length ===
          0 ? (
          <div className="p-8 text-sm text-gray-600">
            Nu există utilizatori care corespund filtrelor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-5 py-4 font-semibold">
                    Utilizator
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Rol
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    E-mail verificat
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Abonament
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Statut cont
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Înregistrat
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Ultima autentificare
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Acțiuni
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map(
                  (user) => {
                    const isChanging =
                      changingUserId ===
                      user.id;

                    const isAdmin =
                      user.role ===
                      "admin";

                    const isApplicant =
                      user.role ===
                      "doctor_applicant";

                    return (
                      <tr
                        key={user.id}
                        className={
                          user.account_status ===
                          "blocked"
                            ? "bg-red-50/40"
                            : ""
                        }
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {getFullName(
                              user
                            )}
                          </p>

                          <p className="mt-1 text-xs text-gray-600">
                            {user.email ??
                              "E-mail indisponibil"}
                          </p>

                          {user.phone && (
                            <p className="mt-1 text-xs text-gray-500">
                              {
                                user.phone
                              }
                            </p>
                          )}

                          {user.blocked_reason && (
                            <p className="mt-2 max-w-xs text-xs leading-5 text-red-700">
                              Motiv:{" "}
                              {
                                user.blocked_reason
                              }
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleClasses(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(
                              user.role
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.email_verified
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-900"
                            }`}
                          >
                            {user.email_verified
                              ? "Verificat"
                              : "Neverificat"}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSubscriptionClasses(
                              user.subscription_status
                            )}`}
                          >
                            {getSubscriptionLabel(
                              user.subscription_status
                            )}
                          </span>

                          {user.subscription_period_end && (
                            <p className="mt-2 whitespace-nowrap text-xs text-gray-500">
                              Până la{" "}
                              {formatDateTime(
                                user.subscription_period_end
                              )}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              user.account_status ===
                              "blocked"
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {user.account_status ===
                            "blocked"
                              ? "Blocat"
                              : "Activ"}
                          </span>

                          {user.blocked_at && (
                            <p className="mt-2 text-xs text-gray-500">
                              {formatDateTime(
                                user.blocked_at
                              )}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDateTime(
                            user.created_at
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDateTime(
                            user.last_sign_in_at
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {isAdmin ? (
                            <div className="text-right">
                              <span className="text-xs font-semibold text-gray-400">
                                Protejat
                              </span>
                            </div>
                          ) : (
                            <div className="flex min-w-40 flex-col items-end gap-2">
                              {isApplicant &&
                                user.account_status ===
                                  "active" && (
                                  <>
                                    <button
                                      type="button"
                                      disabled={
                                        isChanging ||
                                        !user.can_activate_doctor
                                      }
                                      onClick={() =>
                                        activateDoctor(
                                          user
                                        )
                                      }
                                      title={
                                        user.can_activate_doctor
                                          ? "Acordă rolul de medic"
                                          : !user.email_verified
                                            ? "E-mailul candidatului nu este verificat"
                                            : user.subscription_status !==
                                                  "active" &&
                                                user.subscription_status !==
                                                  "trialing"
                                              ? "Candidatul nu are un abonament activ"
                                              : "Candidatul nu poate fi activat"
                                      }
                                      className="rounded-xl bg-[#036661] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
                                    >
                                      {isChanging
                                        ? "Se activează..."
                                        : "Activează medic"}
                                    </button>

                                    {!user.can_activate_doctor && (
                                      <p className="max-w-44 text-right text-[11px] leading-4 text-gray-500">
                                        {!user.email_verified
                                          ? "E-mail neverificat"
                                          : user.subscription_status !==
                                                "active" &&
                                              user.subscription_status !==
                                                "trialing"
                                            ? "Necesită abonament activ"
                                            : "Activarea nu este disponibilă"}
                                      </p>
                                    )}
                                  </>
                                )}

                              <button
                                type="button"
                                disabled={
                                  isChanging
                                }
                                onClick={() =>
                                  changeUserStatus(
                                    user
                                  )
                                }
                                className={`rounded-xl px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                  user.account_status ===
                                  "blocked"
                                    ? "bg-[#036661] text-white hover:bg-[#ff2800]"
                                    : "border border-red-300 bg-red-50 text-red-800 hover:bg-red-100"
                                }`}
                              >
                                {isChanging
                                  ? "Se actualizează..."
                                  : user.account_status ===
                                      "blocked"
                                    ? "Deblochează"
                                    : "Blochează"}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}