"use client";

import Button from "@/components/ui/button";
import { useLocale } from "next-intl";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { normalizeAppLocale } from "@/lib/i18n/app-locale";
import {
  getManagerInvitationStatusLabel,
  getPlatformOperatorAccess,
  getPlatformOperatorAccessApiMessage,
  getPlatformOperatorAccountStatusLabel,
  PLATFORM_OPERATOR_LOCALE_TAGS,
} from "@/lib/i18n/platform-operator-access";

type ManagerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  account_status: string;
  created_at: string;
  permissions: string[];
  auth: {
    email: string | null;
    confirmed: boolean;
    lastSignInAt: string | null;
  } | null;
};

type InvitationRow = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  permissions: string[];
};

type ManagersResponse = {
  managers?: ManagerRow[];
  invitations?: InvitationRow[];
  code?: string;
  error?: string;
  message?: string;
};

type StatusFilter = "all" | "active" | "blocked";
type TypeFilter = "all" | "operational" | "accounting";
type ManagerType = "operational" | "accounting";

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

function displayName(
  firstName: string | null,
  lastName: string | null,
  fallback: string
) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || fallback;
}

function hasAccountingPermission(permissions: string[]) {
  return permissions.includes("accounting");
}

function formatDateTime(
  value: string | null,
  locale: ReturnType<typeof normalizeAppLocale>
) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(PLATFORM_OPERATOR_LOCALE_TAGS[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Bucharest",
  }).format(date);
}

export default function ManagersManagement() {
  const locale = normalizeAppLocale(useLocale());
  const copy = getPlatformOperatorAccess(locale);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [managerType, setManagerType] =
    useState<ManagerType>("operational");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const resolveApiMessage = useCallback(
    (payload: ManagersResponse, fallback: string) =>
      getPlatformOperatorAccessApiMessage(
        locale,
        payload.code,
        payload.error ?? payload.message ?? fallback
      ),
    [locale]
  );

  const loadData = useCallback(async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/managers", {
        cache: "no-store",
      });
      const payload = (await response.json()) as ManagersResponse;

      if (!response.ok) {
        throw new Error(
          getPlatformOperatorAccessApiMessage(
            locale,
            payload.code,
            payload.error ?? copy.managers.messages.loadFailed
          )
        );
      }

      setManagers(payload.managers ?? []);
      setInvitations(payload.invitations ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : copy.managers.messages.loadFailed
      );
    } finally {
      setIsLoading(false);
    }
  }, [copy.managers.messages.loadFailed, locale]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredManagers = useMemo(() => {
    const normalizedSearch = search
      .trim()
      .toLocaleLowerCase(PLATFORM_OPERATOR_LOCALE_TAGS[locale]);

    return managers.filter((manager) => {
      const accounting = hasAccountingPermission(manager.permissions);

      if (
        statusFilter !== "all" &&
        manager.account_status !== statusFilter
      ) {
        return false;
      }

      if (
        typeFilter === "accounting" &&
        !accounting
      ) {
        return false;
      }

      if (
        typeFilter === "operational" &&
        accounting
      ) {
        return false;
      }

      if (!normalizedSearch) return true;

      return [
        displayName(
          manager.first_name,
          manager.last_name,
          copy.common.nameUnavailable
        ),
        manager.auth?.email,
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
    managers,
    search,
    statusFilter,
    typeFilter,
  ]);

  const activeCount = managers.filter(
    (manager) => manager.account_status === "active"
  ).length;
  const suspendedCount = managers.length - activeCount;
  const pendingInvitations = invitations.filter(
    (invitation) => invitation.status === "pending"
  ).length;

  function inviteManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/managers", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName,
            lastName,
            email,
            managerType,
            locale,
          }),
        });
        const payload = (await response.json()) as ManagersResponse;

        if (!response.ok) {
          setError(
            resolveApiMessage(
              payload,
              copy.managers.messages.invitationFailed
            )
          );
          return;
        }

        setFirstName("");
        setLastName("");
        setEmail("");
        setManagerType("operational");
        setMessage(
          resolveApiMessage(
            payload,
            getPlatformOperatorAccessApiMessage(
              locale,
              "manager_invited",
              copy.managers.messages.genericSuccess
            )
          )
        );
        await loadData();
      } catch {
        setError(copy.managers.messages.invitationFailed);
      }
    });
  }

  function performAction(
    body: {
      action: string;
      profileId?: string;
      invitationId?: string;
    },
    fallbackCode?: string
  ) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/managers", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as ManagersResponse;

        if (!response.ok) {
          setError(
            resolveApiMessage(payload, copy.managers.messages.actionFailed)
          );
          return;
        }

        setMessage(
          resolveApiMessage(
            payload,
            fallbackCode
              ? getPlatformOperatorAccessApiMessage(
                  locale,
                  fallbackCode,
                  copy.managers.messages.genericSuccess
                )
              : copy.managers.messages.genericSuccess
          )
        );
        await loadData();
      } catch {
        setError(copy.managers.messages.actionFailed);
      }
    });
  }

  function deleteManager(manager: ManagerRow) {
    const name = displayName(
      manager.first_name,
      manager.last_name,
      copy.common.nameUnavailable
    );
    const confirmed = window.confirm(
      replaceTokens(copy.managers.actions.deleteConfirm, { name })
    );

    if (!confirmed) return;

    performAction(
      {
        action: "delete_manager",
        profileId: manager.id,
      },
      "manager_deleted"
    );
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  const filterActive =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    typeFilter !== "all";

  return (
    <div className="space-y-[21px]">
      <section className="grid gap-[13px] sm:grid-cols-2 xl:grid-cols-4">
        {[
          [copy.managers.metrics.total, managers.length, "text-gray-900"],
          [copy.managers.metrics.active, activeCount, "text-green-700"],
          [copy.managers.metrics.suspended, suspendedCount, "text-red-700"],
          [
            copy.managers.metrics.pendingInvitations,
            pendingInvitations,
            "text-amber-700",
          ],
        ].map(([label, value, valueClass]) => (
          <div
            key={String(label)}
            className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm"
          >
            <p className="text-sm font-semibold text-gray-500">
              {label}
            </p>
            <p className={`mt-[8px] text-3xl font-bold ${valueClass}`}>
              {value}
            </p>
          </div>
        ))}
      </section>

      <details className="rounded-[13px] border border-gray-200 bg-white shadow-sm">
        <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[13px] p-[21px] marker:hidden">
          <div className="flex items-start justify-between gap-[13px]">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {copy.managers.invite.title}
              </h2>
              <p className="mt-[5px] text-sm leading-6 text-gray-600">
                {copy.managers.invite.description}
              </p>
            </div>
            <span aria-hidden="true" className="text-xl text-gray-500">
              +
            </span>
          </div>
        </summary>

        <form
          onSubmit={inviteManager}
          className="grid gap-[13px] border-t border-gray-200 p-[21px] md:grid-cols-2"
        >
          <label>
            <span className="text-sm font-medium text-gray-700">
              {copy.managers.invite.firstName}
            </span>
            <input
              value={firstName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFirstName(event.target.value)
              }
              className="mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              {copy.managers.invite.lastName}
            </span>
            <input
              value={lastName}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setLastName(event.target.value)
              }
              className="mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              {copy.managers.invite.email}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setEmail(event.target.value)
              }
              className="mt-[8px] w-full rounded-xl border border-gray-300 px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
            />
          </label>

          <fieldset className="rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] md:col-span-2">
            <legend className="px-[5px] text-sm font-semibold text-gray-900">
              {copy.managers.invite.type}
            </legend>
            <div className="mt-[8px] grid gap-[13px] sm:grid-cols-2">
              <label className="flex cursor-pointer gap-[13px] rounded-[13px] border border-gray-200 bg-white p-[13px]">
                <input
                  type="radio"
                  name="managerType"
                  value="operational"
                  checked={managerType === "operational"}
                  onChange={() => setManagerType("operational")}
                  className="mt-[5px]"
                />
                <span>
                  <span className="block font-semibold text-gray-900">
                    {copy.managers.invite.operational}
                  </span>
                  <span className="mt-[5px] block text-sm leading-5 text-gray-600">
                    {copy.managers.invite.operationalDescription}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-[13px] rounded-[13px] border border-blue-200 bg-blue-50 p-[13px]">
                <input
                  type="radio"
                  name="managerType"
                  value="accounting"
                  checked={managerType === "accounting"}
                  onChange={() => setManagerType("accounting")}
                  className="mt-[5px]"
                />
                <span>
                  <span className="block font-semibold text-blue-900">
                    {copy.managers.invite.accounting}
                  </span>
                  <span className="mt-[5px] block text-sm leading-5 text-blue-800">
                    {copy.managers.invite.accountingDescription}
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="md:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending
                ? copy.managers.invite.sending
                : copy.managers.invite.send}
            </Button>
          </div>
        </form>
      </details>

      {message && (
        <div
          role="status"
          className="rounded-[13px] border border-green-200 bg-green-50 px-[13px] py-[13px] text-sm text-green-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[13px] border border-red-200 bg-red-50 px-[13px] py-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      <section className="rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm">
        <div className="flex flex-col gap-[13px] xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {copy.managers.table.title}
            </h2>
            <p className="mt-[5px] text-sm text-gray-500">
              {replaceTokens(copy.managers.filters.showing, {
                filtered: filteredManagers.length,
                total: managers.length,
              })}
            </p>
          </div>

          <div className="grid gap-[8px] sm:grid-cols-3 xl:w-[46rem]">
            <label>
              <span className="sr-only">
                {copy.managers.filters.searchLabel}
              </span>
              <input
                type="search"
                value={search}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearch(event.target.value)
                }
                placeholder={copy.managers.filters.searchPlaceholder}
                className="w-full rounded-xl border border-gray-300 px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              />
            </label>

            <label>
              <span className="sr-only">
                {copy.managers.filters.statusLabel}
              </span>
              <select
                value={statusFilter}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              >
                <option value="all">
                  {copy.managers.filters.allStatuses}
                </option>
                <option value="active">
                  {copy.managers.filters.active}
                </option>
                <option value="blocked">
                  {copy.managers.filters.suspended}
                </option>
              </select>
            </label>

            <label>
              <span className="sr-only">
                {copy.managers.filters.typeLabel}
              </span>
              <select
                value={typeFilter}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  setTypeFilter(event.target.value as TypeFilter)
                }
                className="w-full rounded-xl border border-gray-300 bg-white px-[13px] py-[13px] outline-none focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20"
              >
                <option value="all">
                  {copy.managers.filters.allTypes}
                </option>
                <option value="operational">
                  {copy.managers.filters.operational}
                </option>
                <option value="accounting">
                  {copy.managers.filters.accounting}
                </option>
              </select>
            </label>
          </div>
        </div>

        {filterActive && (
          <button
            type="button"
            onClick={resetFilters}
            className="romdoc-focus-ring mt-[8px] text-sm font-semibold text-[#036661] hover:underline"
          >
            {copy.common.resetFilters}
          </button>
        )}

        <div className="mt-[13px] overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.manager}
                </th>
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.type}
                </th>
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.confirmed}
                </th>
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.status}
                </th>
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.created}
                </th>
                <th className="px-[13px] py-[13px] font-semibold">
                  {copy.managers.table.lastSignIn}
                </th>
                <th className="px-[13px] py-[13px] text-right font-semibold">
                  {copy.managers.table.actions}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="px-[13px] py-[34px] text-center text-gray-500">
                    {copy.managers.table.loading}
                  </td>
                </tr>
              )}

              {!isLoading &&
                filteredManagers.map((manager) => {
                  const accounting = hasAccountingPermission(
                    manager.permissions
                  );
                  const typeLabel = accounting
                    ? copy.managers.types.accounting
                    : copy.managers.types.operational;

                  return (
                    <tr key={manager.id}>
                      <td className="px-[13px] py-[13px]">
                        <p className="font-semibold text-gray-900">
                          {displayName(
                            manager.first_name,
                            manager.last_name,
                            copy.common.nameUnavailable
                          )}
                        </p>
                        <p className="mt-[5px] text-xs text-gray-500">
                          {manager.auth?.email ?? copy.common.emailUnavailable}
                        </p>
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <span
                          className={`inline-flex rounded-full border px-[8px] py-[5px] text-xs font-semibold ${
                            accounting
                              ? "border-blue-200 bg-blue-50 text-blue-800"
                              : "border-gray-200 bg-gray-50 text-gray-700"
                          }`}
                        >
                          {typeLabel}
                        </span>
                      </td>
                      <td className="px-[13px] py-[13px] text-gray-700">
                        {manager.auth?.confirmed
                          ? copy.common.yes
                          : copy.common.no}
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <span
                          className={`rounded-full px-[8px] py-[5px] text-xs font-semibold ${
                            manager.account_status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {getPlatformOperatorAccountStatusLabel(
                            locale,
                            manager.account_status === "active"
                              ? "active"
                              : "suspended"
                          )}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-[13px] py-[13px] text-gray-600">
                        {formatDateTime(manager.created_at, locale)}
                      </td>
                      <td className="whitespace-nowrap px-[13px] py-[13px] text-gray-600">
                        {formatDateTime(
                          manager.auth?.lastSignInAt ?? null,
                          locale
                        )}
                      </td>
                      <td className="px-[13px] py-[13px]">
                        <div className="flex min-w-[20rem] flex-wrap justify-end gap-[8px]">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              performAction(
                                {
                                  action: accounting
                                    ? "revoke_accounting_permission"
                                    : "grant_accounting_permission",
                                  profileId: manager.id,
                                },
                                accounting
                                  ? "accounting_permission_revoked"
                                  : "accounting_permission_granted"
                              )
                            }
                          >
                            {accounting
                              ? copy.managers.actions.revokeAccounting
                              : copy.managers.actions.grantAccounting}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              performAction(
                                {
                                  action:
                                    manager.account_status === "active"
                                      ? "suspend_manager"
                                      : "activate_manager",
                                  profileId: manager.id,
                                },
                                manager.account_status === "active"
                                  ? "manager_suspended"
                                  : "manager_activated"
                              )
                            }
                          >
                            {manager.account_status === "active"
                              ? copy.managers.actions.suspend
                              : copy.managers.actions.activate}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="danger-outline"
                            disabled={isPending}
                            onClick={() => deleteManager(manager)}
                          >
                            {copy.managers.actions.delete}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

              {!isLoading && filteredManagers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-[13px] py-[34px] text-center text-gray-500">
                    {copy.managers.table.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="rounded-[13px] border border-gray-200 bg-white shadow-sm">
        <summary className="romdoc-focus-ring cursor-pointer list-none rounded-[13px] p-[21px] marker:hidden">
          <div className="flex items-center justify-between gap-[13px]">
            <h2 className="text-xl font-bold text-gray-900">
              {copy.managers.invitations.title}
            </h2>
            <span className="rounded-full bg-amber-100 px-[8px] py-[5px] text-xs font-semibold text-amber-900">
              {replaceTokens(copy.managers.invitations.pendingCount, {
                count: pendingInvitations,
              })}
            </span>
          </div>
        </summary>

        <div className="space-y-[8px] border-t border-gray-200 p-[21px]">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col gap-[13px] rounded-[13px] border border-gray-200 p-[13px] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-[8px]">
                  <p className="font-medium text-gray-900">
                    {invitation.email}
                  </p>
                  <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-[8px] py-[5px] text-xs font-semibold text-gray-700">
                    {hasAccountingPermission(invitation.permissions)
                      ? copy.managers.types.accounting
                      : copy.managers.types.operational}
                  </span>
                </div>
                <p className="mt-[5px] text-xs text-gray-500">
                  {replaceTokens(copy.managers.invitations.status, {
                    status: getManagerInvitationStatusLabel(
                      locale,
                      invitation.status
                    ),
                  })}
                </p>
                <p className="mt-[5px] text-xs text-gray-500">
                  {replaceTokens(copy.managers.invitations.expires, {
                    date: formatDateTime(invitation.expires_at, locale),
                  })}
                </p>
              </div>

              {invitation.status === "pending" && (
                <Button
                  type="button"
                  size="sm"
                  variant="danger-outline"
                  disabled={isPending}
                  onClick={() =>
                    performAction(
                      {
                        action: "revoke_invitation",
                        invitationId: invitation.id,
                      },
                      "invitation_revoked"
                    )
                  }
                >
                  {copy.managers.actions.revokeInvitation}
                </Button>
              )}
            </div>
          ))}

          {invitations.length === 0 && (
            <p className="text-sm text-gray-500">
              {copy.managers.invitations.empty}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
