"use client";

import Button from "@/components/ui/button";
import { useLocale } from "next-intl";
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getPlatformOperatorAccess,
  getPlatformOperatorAccessApiMessage,
  getPlatformOperatorAccountStatusLabel,
  getPlatformOperatorRoleLabel,
  PLATFORM_OPERATOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-access";

type ManagedUser = {
  id: string;
  email: string | null;
  phone: string | null;
  first_name: string | null;
  last_name: string | null;
  role: string;
  account_status: string;
  email_verified: boolean;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  blocked_at: string | null;
  blocked_reason: string | null;
  is_current_admin?: boolean;
  is_current_operator?: boolean;
};

type ApiResponse = {
  users?: ManagedUser[];
  operatorRole?: "admin" | "manager";
  capabilities?: {
    canSuspendUsers: boolean;
    canChangePrivilegedRoles: boolean;
  };
  code?: string;
  message?: string;
  error?: string;
};

type RoleFilter =
  | "all"
  | "patient"
  | "doctor_applicant"
  | "doctor"
  | "staff"
  | "clinic_manager"
  | "manager"
  | "admin";

type StatusFilter = "all" | "active" | "blocked";

function replaceTokens(
  template: string,
  values: Record<string, string | number>
) {
  return Object.entries(values).reduce(
    (result, [key, value]) =>
      result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function getFullName(user: ManagedUser, fallback: string) {
  return (
    [user.first_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || fallback
  );
}

function getRoleClasses(role: string) {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-800";
    case "manager":
      return "bg-violet-100 text-violet-800";
    case "clinic_manager":
      return "bg-orange-100 text-orange-800";
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
  value: string | null,
  locale: ReturnType<typeof normalizeAppLocale>
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(PLATFORM_OPERATOR_LOCALE_TAGS[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Bucharest",
  }).format(date);
}

export default function UsersManagement() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorAccess(locale);

  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");

  const [capabilities, setCapabilities] = useState({
    canSuspendUsers: false,
    canChangePrivilegedRoles: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [changingUserId, setChangingUserId] =
    useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resolveApiMessage = useCallback(
    (payload: ApiResponse, fallback: string) =>
      getPlatformOperatorAccessApiMessage(
        locale,
        payload.code,
        payload.error ?? payload.message ?? fallback
      ),
    [locale]
  );

  const loadUsers = useCallback(async () => {
    const currentCopy = getPlatformOperatorAccess(locale);

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/admin/users", {
        method: "GET",
        cache: "no-store",
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformOperatorAccessApiMessage(
            locale,
            result.code,
            result.error ?? currentCopy.users.messages.loadFailed
          )
        );
      }

      setUsers(result.users ?? []);
      setCapabilities(
        result.capabilities ?? {
          canSuspendUsers: false,
          canChangePrivilegedRoles: false,
        }
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : currentCopy.users.messages.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase(PLATFORM_OPERATOR_LOCALE_TAGS[locale]);

    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }

      if (
        statusFilter !== "all" &&
        user.account_status !== statusFilter
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        user.first_name,
        user.last_name,
        getFullName(user, copy.common.nameUnavailable),
        user.email,
        user.phone,
        getPlatformOperatorRoleLabel(locale, user.role),
      ]
        .filter(Boolean)
        .some((value) =>
          value
            ?.toLocaleLowerCase(PLATFORM_OPERATOR_LOCALE_TAGS[locale])
            .includes(normalizedSearch)
        );
    });
  }, [
    copy.common.nameUnavailable,
    locale,
    roleFilter,
    search,
    statusFilter,
    users,
  ]);

  async function changeUserStatus(user: ManagedUser) {
    const action =
      user.account_status === "blocked" ? "unblock" : "block";

    const account =
      user.email ?? getFullName(user, copy.common.nameUnavailable);

    let reason = "";

    if (action === "block") {
      const enteredReason = window.prompt(
        replaceTokens(copy.users.actions.blockPrompt, { account })
      );

      if (!enteredReason || enteredReason.trim().length < 3) {
        return;
      }

      reason = enteredReason.trim();
    } else {
      const confirmed = window.confirm(
        replaceTokens(copy.users.actions.unblockConfirm, { account })
      );

      if (!confirmed) {
        return;
      }
    }

    setError(null);
    setSuccess(null);
    setChangingUserId(user.id);

    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          action,
          reason,
        }),
      });

      const result = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          resolveApiMessage(
            result,
            copy.users.messages.statusUpdateFailed
          )
        );
      }

      setSuccess(
        resolveApiMessage(result, copy.users.messages.statusUpdated)
      );

      await loadUsers();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : copy.users.messages.statusUpdateFailed
      );
    } finally {
      setChangingUserId(null);
    }
  }

  const activeCount = users.filter(
    (user) => user.account_status === "active"
  ).length;

  const blockedCount = users.filter(
    (user) => user.account_status === "blocked"
  ).length;

  const filtersActive =
    Boolean(search.trim()) ||
    roleFilter !== "all" ||
    statusFilter !== "all";

  const roleOptions: Array<{
    value: Exclude<RoleFilter, "all">;
    label: string;
  }> = [
    {
      value: "patient",
      label: copy.users.filters.roleOptions.patient,
    },
    {
      value: "doctor_applicant",
      label: copy.users.filters.roleOptions.doctor_applicant,
    },
    {
      value: "doctor",
      label: copy.users.filters.roleOptions.doctor,
    },
    {
      value: "staff",
      label: copy.users.filters.roleOptions.staff,
    },
    {
      value: "clinic_manager",
      label: copy.users.filters.roleOptions.clinic_manager,
    },
    {
      value: "manager",
      label: copy.users.filters.roleOptions.manager,
    },
    {
      value: "admin",
      label: copy.users.filters.roleOptions.admin,
    },
  ];

  return (
    <div className="space-y-[21px]">
      <section className="grid gap-[13px] sm:grid-cols-3">
        <div className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            {copy.users.metrics.total}
          </p>
          <p className="mt-[8px] text-3xl font-bold text-gray-900">
            {users.length}
          </p>
        </div>

        <div className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            {copy.users.metrics.active}
          </p>
          <p className="mt-[8px] text-3xl font-bold text-green-700">
            {activeCount}
          </p>
        </div>

        <div className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
          <p className="text-sm font-semibold text-gray-500">
            {copy.users.metrics.blocked}
          </p>
          <p className="mt-[8px] text-3xl font-bold text-red-700">
            {blockedCount}
          </p>
        </div>
      </section>

      <section className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="grid gap-[13px] lg:grid-cols-[1fr_13rem_13rem_auto]">
          <label>
            <span className="sr-only">
              {copy.users.filters.searchLabel}
            </span>
            <input
              type="search"
              value={search}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setSearch(event.target.value)
              }
              placeholder={copy.users.filters.searchPlaceholder}
              className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 px-[13px] py-[13px]"
            />
          </label>

          <label>
            <span className="sr-only">
              {copy.users.filters.roleLabel}
            </span>
            <select
              value={roleFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
            >
              <option value="all">{copy.users.filters.allRoles}</option>
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="sr-only">
              {copy.users.filters.statusLabel}
            </span>
            <select
              value={statusFilter}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="romdoc-focus-ring w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px]"
            >
              <option value="all">
                {copy.users.filters.allStatuses}
              </option>
              <option value="active">
                {copy.users.filters.statusOptions.active}
              </option>
              <option value="blocked">
                {copy.users.filters.statusOptions.blocked}
              </option>
            </select>
          </label>

          <button
            type="button"
            disabled={!filtersActive}
            onClick={() => {
              setSearch("");
              setRoleFilter("all");
              setStatusFilter("all");
            }}
            className="romdoc-focus-ring rounded-[13px] border border-gray-300 px-[13px] py-[13px] text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copy.common.resetFilters}
          </button>
        </div>

        <p className="mt-[8px] text-xs text-gray-500">
          {replaceTokens(copy.users.filters.showing, {
            filtered: filteredUsers.length,
            total: users.length,
          })}
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="rounded-[13px] border border-green-200 bg-green-50 p-[13px] text-sm text-green-800"
        >
          {success}
        </div>
      )}

      <section className="overflow-hidden rounded-[13px] border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-[21px] text-sm text-gray-600">
            {copy.users.table.loading}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-[21px] text-sm text-gray-600">
            {copy.users.table.empty}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="text-gray-600">
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.user}
                  </th>
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.role}
                  </th>
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.emailVerified}
                  </th>
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.status}
                  </th>
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.registered}
                  </th>
                  <th className="px-[13px] py-[13px] font-semibold">
                    {copy.users.table.lastSignIn}
                  </th>
                  <th className="px-[13px] py-[13px] text-right font-semibold">
                    {copy.users.table.action}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => {
                  const isChanging = changingUserId === user.id;

                  const isProtectedRole =
                    user.role === "admin" || user.role === "manager";

                  const canChangeStatus =
                    capabilities.canSuspendUsers &&
                    !isProtectedRole &&
                    !user.is_current_operator &&
                    !user.is_current_admin;

                  return (
                    <tr
                      key={user.id}
                      className={
                        user.account_status === "blocked"
                          ? "bg-red-50/40"
                          : ""
                      }
                    >
                      <td className="px-[13px] py-[13px] align-top">
                        <p className="font-semibold text-gray-900">
                          {getFullName(
                            user,
                            copy.common.nameUnavailable
                          )}
                        </p>

                        <p className="mt-[5px] text-xs text-gray-600">
                          {user.email ?? copy.common.emailUnavailable}
                        </p>

                        {user.phone && (
                          <p className="mt-[5px] text-xs text-gray-500">
                            {user.phone}
                          </p>
                        )}

                        {user.blocked_reason && (
                          <p className="mt-[8px] max-w-xs text-xs leading-5 text-red-700">
                            {copy.common.reason}: {user.blocked_reason}
                          </p>
                        )}
                      </td>

                      <td className="px-[13px] py-[13px] align-top">
                        <span
                          className={`inline-flex rounded-full px-[13px] py-[5px] text-xs font-semibold ${getRoleClasses(
                            user.role
                          )}`}
                        >
                          {getPlatformOperatorRoleLabel(
                            locale,
                            user.role
                          )}
                        </span>
                      </td>

                      <td className="px-[13px] py-[13px] align-top">
                        <span
                          className={`inline-flex rounded-full px-[13px] py-[5px] text-xs font-semibold ${
                            user.email_verified
                              ? "bg-green-100 text-green-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {user.email_verified
                            ? copy.users.table.verified
                            : copy.users.table.unverified}
                        </span>
                      </td>

                      <td className="px-[13px] py-[13px] align-top">
                        <span
                          className={`inline-flex rounded-full px-[13px] py-[5px] text-xs font-semibold ${
                            user.account_status === "blocked"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {getPlatformOperatorAccountStatusLabel(
                            locale,
                            user.account_status
                          )}
                        </span>

                        {user.blocked_at && (
                          <p className="mt-[8px] text-xs text-gray-500">
                            {formatDateTime(user.blocked_at, locale)}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-[13px] py-[13px] align-top text-gray-600">
                        {formatDateTime(user.created_at, locale)}
                      </td>

                      <td className="whitespace-nowrap px-[13px] py-[13px] align-top text-gray-600">
                        {formatDateTime(user.last_sign_in_at, locale)}
                      </td>

                      <td className="px-[13px] py-[13px] text-right align-top">
                        {canChangeStatus ? (
                          <Button
                            type="button"
                            disabled={isChanging}
                            onClick={() => void changeUserStatus(user)}
                            variant={
                              user.account_status === "blocked"
                                ? "primary"
                                : "danger-outline"
                            }
                            size="sm"
                          >
                            {isChanging
                              ? copy.users.actions.updating
                              : user.account_status === "blocked"
                                ? copy.users.actions.unblock
                                : copy.users.actions.block}
                          </Button>
                        ) : (
                          <span
                            title={
                              copy.users.table.protectedExplanation
                            }
                            className="text-xs font-semibold text-gray-400"
                          >
                            {copy.common.protected}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
