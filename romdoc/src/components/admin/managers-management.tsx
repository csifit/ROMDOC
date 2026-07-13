"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

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
  managers: ManagerRow[];
  invitations: InvitationRow[];
  error?: string;
};

function displayName(firstName: string | null, lastName: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Manager";
}

function hasAccountingPermission(permissions: string[]) {
  return permissions.includes("accounting");
}

function managerTypeLabel(permissions: string[]) {
  return hasAccountingPermission(permissions) ? "Facturare" : "OperaÈ›ional";
}

function managerTypeBadgeClass(permissions: string[]) {
  return hasAccountingPermission(permissions)
    ? "border-blue-200 bg-blue-50 text-blue-800"
    : "border-gray-200 bg-gray-50 text-gray-700";
}

export default function ManagersManagement() {
  const [isPending, startTransition] = useTransition();
  const [managers, setManagers] = useState<ManagerRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [managerType, setManagerType] = useState<"operational" | "accounting">("operational");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);

    const response = await fetch("/api/admin/managers", {
      cache: "no-store",
    });

    const payload = (await response.json()) as ManagersResponse;

    if (!response.ok) {
      setError(payload.error ?? "Managerii nu au putut fi Ã®ncÄƒrcaÈ›i.");
      return;
    }

    setManagers(payload.managers);
    setInvitations(payload.invitations);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadData]);

  function inviteManager(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
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
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "InvitaÈ›ia nu a putut fi trimisÄƒ.");
        return;
      }

      setFirstName("");
      setLastName("");
      setEmail("");
      setManagerType("operational");
      setMessage(
        managerType === "accounting"
          ? "InvitaÈ›ia de manager Facturare a fost trimisÄƒ."
          : "InvitaÈ›ia de manager operaÈ›ional a fost trimisÄƒ."
      );

      await loadData();
    });
  }

  function performAction(
    body: {
      action: string;
      profileId?: string;
      invitationId?: string;
    },
    successMessage = "Modificarea a fost salvatÄƒ."
  ) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch("/api/admin/managers", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "AcÈ›iunea nu a putut fi finalizatÄƒ.");
        return;
      }

      setMessage(payload.message ?? successMessage);
      await loadData();
    });
  }

  function deleteManager(manager: ManagerRow) {
    const name = displayName(manager.first_name, manager.last_name);
    const confirmed = window.confirm(
      `È˜tergi managerul ${name} din lista de manageri?\n\nContul nu va fi È™ters fizic din istoricul RomDoc, dar rolul de manager va fi eliminat È™i accesul operaÈ›ional va fi blocat.`
    );

    if (!confirmed) {
      return;
    }

    performAction(
      {
        action: "delete_manager",
        profileId: manager.id,
      },
      "Managerul a fost È™ters din lista de manageri."
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          InvitÄƒ un manager
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Managerul primeÈ™te un e-mail de invitaÈ›ie È™i trebuie sÄƒ configureze Google Authenticator Ã®nainte de accesul la panoul operaÈ›ional.
        </p>

        <form onSubmit={inviteManager} className="mt-6 grid gap-4 md:grid-cols-2">
          <label>
            <span className="text-sm font-medium text-gray-700">Prenume</span>
            <input
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">Nume</span>
            <input
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-medium text-gray-700">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <fieldset className="md:col-span-2 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <legend className="px-1 text-sm font-semibold text-gray-900">
              Tip manager
            </legend>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer gap-3 rounded-xl border border-gray-200 bg-white p-4">
                <input
                  type="radio"
                  name="managerType"
                  value="operational"
                  checked={managerType === "operational"}
                  onChange={() => setManagerType("operational")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-gray-900">
                    OperaÈ›ional
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-gray-600">
                    Acces pentru administrare operaÈ›ionalÄƒ, fÄƒrÄƒ permisiuni de facturare SMS.
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <input
                  type="radio"
                  name="managerType"
                  value="accounting"
                  checked={managerType === "accounting"}
                  onChange={() => setManagerType("accounting")}
                  className="mt-1"
                />
                <span>
                  <span className="block font-semibold text-blue-900">
                    Facturare
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-blue-800">
                    Acces la facturare SMS, verificare facturi È™i informaÈ›ii de invoicing.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:opacity-60"
            >
              {isPending ? "Se trimite..." : "Trimite invitaÈ›ia"}
            </button>
          </div>
        </form>
      </section>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Manageri activi È™i suspendaÈ›i
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-3 py-3">Manager</th>
                <th className="px-3 py-3">E-mail</th>
                <th className="px-3 py-3">Tip</th>
                <th className="px-3 py-3">Confirmat</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">AcÈ›iuni</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {managers.map((manager) => {
                const isAccounting = hasAccountingPermission(manager.permissions);

                return (
                  <tr key={manager.id}>
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {displayName(manager.first_name, manager.last_name)}
                    </td>

                    <td className="px-3 py-4 text-gray-600">
                      {manager.auth?.email ?? "â€”"}
                    </td>

                    <td className="px-3 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${managerTypeBadgeClass(manager.permissions)}`}>
                        {managerTypeLabel(manager.permissions)}
                      </span>
                    </td>

                    <td className="px-3 py-4">
                      {manager.auth?.confirmed ? "Da" : "Nu"}
                    </td>

                    <td className="px-3 py-4">
                      {manager.account_status === "active" ? "Activ" : "Suspendat"}
                    </td>

                    <td className="px-3 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            performAction({
                              action: isAccounting
                                ? "revoke_accounting_permission"
                                : "grant_accounting_permission",
                              profileId: manager.id,
                            })
                          }
                          className="rounded-lg border border-blue-300 px-3 py-2 font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-60"
                        >
                          {isAccounting ? "EliminÄƒ Facturare" : "AcordÄƒ Facturare"}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            performAction({
                              action:
                                manager.account_status === "active"
                                  ? "suspend_manager"
                                  : "activate_manager",
                              profileId: manager.id,
                            })
                          }
                          className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {manager.account_status === "active" ? "SuspendÄƒ" : "ActiveazÄƒ"}
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => deleteManager(manager)}
                          className="rounded-lg border border-red-300 px-3 py-2 font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                        >
                          È˜terge
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {managers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Nu existÄƒ manageri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">InvitaÈ›ii</h2>

        <div className="mt-5 space-y-3">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900">{invitation.email}</p>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${managerTypeBadgeClass(invitation.permissions)}`}>
                    {managerTypeLabel(invitation.permissions)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  Status: {invitation.status}
                </p>
              </div>

              {invitation.status === "pending" && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    performAction({
                      action: "revoke_invitation",
                      invitationId: invitation.id,
                    })
                  }
                  className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  RevocÄƒ
                </button>
              )}
            </div>
          ))}

          {invitations.length === 0 && (
            <p className="text-sm text-gray-500">Nu existÄƒ invitaÈ›ii.</p>
          )}
        </div>
      </section>
    </div>
  );
}

