"use client";

import Button from "@/components/ui/button";

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

  return name || "Nume indisponibil";
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

function formatDateTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "â€”";
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
    useState<string | null>(null);

  const [success, setSuccess] =
    useState<string | null>(null);

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
              "Utilizatorii nu au putut fi Ã®ncÄƒrcaÈ›i."
          );
        }

        setUsers(
          result.users ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Utilizatorii nu au putut fi Ã®ncÄƒrcaÈ›i."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
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
            roleFilter !== "all" &&
            user.role !== roleFilter
          ) {
            return false;
          }

          if (
            statusFilter !== "all" &&
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
          `Introdu motivul blocÄƒrii contului ${user.email ?? getFullName(user)}:`
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
        actionError instanceof Error
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

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-3">
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
              CautÄƒ utilizator
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="CautÄƒ dupÄƒ nume, e-mail sau telefon..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label>
            <span className="sr-only">
              FiltreazÄƒ dupÄƒ rol
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
                PacienÈ›i
              </option>

              <option value="doctor_applicant">
                CandidaÈ›i medici
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
              FiltreazÄƒ dupÄƒ statut
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
            Se Ã®ncarcÄƒ utilizatorii...
          </div>
        ) : filteredUsers.length ===
          0 ? (
          <div className="p-8 text-sm text-gray-600">
            Nu existÄƒ utilizatori care corespund filtrelor.
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
                    Statut
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    ÃŽnregistrat
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Ultima autentificare
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    AcÈ›iune
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
                              {user.phone}
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

                        <td className="px-5 py-4 text-right">
                          {isAdmin ? (
                            <span className="text-xs font-semibold text-gray-400">
                              Protejat
                            </span>
                          ) : (
                            <Button
                              type="button"
                              disabled={
                                isChanging
                              }
                              onClick={() =>
                                changeUserStatus(
                                  user
                                )
                              }
                              variant={
                                user.account_status ===
                                "blocked"
                                  ? "primary"
                                  : "danger-outline"
                              }
                              size="sm"
                            >
                              {isChanging
                                ? "Se actualizeazÄƒ..."
                                : user.account_status ===
                                    "blocked"
                                  ? "DeblocheazÄƒ"
                                  : "BlocheazÄƒ"}
                            </Button>
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
