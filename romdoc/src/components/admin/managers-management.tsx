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
};

type ManagersResponse = {
  managers: ManagerRow[];
  invitations: InvitationRow[];
  error?: string;
};

function displayName(
  firstName: string | null,
  lastName: string | null
) {
  return (
    [
      firstName,
      lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Manager"
  );
}

export default function ManagersManagement() {
  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    managers,
    setManagers,
  ] =
    useState<ManagerRow[]>(
      []
    );

  const [
    invitations,
    setInvitations,
  ] =
    useState<
      InvitationRow[]
    >([]);

  const [
    firstName,
    setFirstName,
  ] =
    useState("");

  const [
    lastName,
    setLastName,
  ] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [message, setMessage] =
    useState<string | null>(
      null
    );

  const loadData =
    useCallback(async () => {
      setError(null);

      const response =
        await fetch(
          "/api/admin/managers",
          {
            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          ManagersResponse;

      if (!response.ok) {
        setError(
          payload.error ??
            "Managerii nu au putut fi încărcați."
        );
        return;
      }

      setManagers(
        payload.managers
      );
      setInvitations(
        payload.invitations
      );
    }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function inviteManager(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(null);
    setMessage(null);

    startTransition(
      async () => {
        const response =
          await fetch(
            "/api/admin/managers",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify({
                  firstName,
                  lastName,
                  email,
                }),
            }
          );

        const payload =
          (await response.json()) as {
            error?: string;
          };

        if (!response.ok) {
          setError(
            payload.error ??
              "Invitația nu a putut fi trimisă."
          );
          return;
        }

        setFirstName("");
        setLastName("");
        setEmail("");

        setMessage(
          "Invitația de manager a fost trimisă."
        );

        await loadData();
      }
    );
  }

  function performAction(
    body: {
      action: string;
      profileId?: string;
      invitationId?: string;
    }
  ) {
    setError(null);
    setMessage(null);

    startTransition(
      async () => {
        const response =
          await fetch(
            "/api/admin/managers",
            {
              method:
                "PATCH",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body:
                JSON.stringify(
                  body
                ),
            }
          );

        const payload =
          (await response.json()) as {
            error?: string;
          };

        if (!response.ok) {
          setError(
            payload.error ??
              "Acțiunea nu a putut fi finalizată."
          );
          return;
        }

        setMessage(
          "Modificarea a fost salvată."
        );

        await loadData();
      }
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Invită un manager
        </h2>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          Managerul primește un e-mail de invitație și trebuie să
          configureze Google Authenticator înainte de accesul la panoul
          operațional.
        </p>

        <form
          onSubmit={
            inviteManager
          }
          className="mt-6 grid gap-4 md:grid-cols-2"
        >
          <label>
            <span className="text-sm font-medium text-gray-700">
              Prenume
            </span>

            <input
              value={
                firstName
              }
              onChange={(
                event
              ) =>
                setFirstName(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label>
            <span className="text-sm font-medium text-gray-700">
              Nume
            </span>

            <input
              value={
                lastName
              }
              onChange={(
                event
              ) =>
                setLastName(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <label className="md:col-span-2">
            <span className="text-sm font-medium text-gray-700">
              E-mail
            </span>

            <input
              type="email"
              required
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={
                isPending
              }
              className="rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:opacity-60"
            >
              {isPending
                ? "Se trimite..."
                : "Trimite invitația"}
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
          Manageri activi și suspendați
        </h2>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-3 py-3">
                  Manager
                </th>
                <th className="px-3 py-3">
                  E-mail
                </th>
                <th className="px-3 py-3">
                  Confirmat
                </th>
                <th className="px-3 py-3">
                  Status
                </th>
                <th className="px-3 py-3 text-right">
                  Acțiune
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {managers.map(
                (manager) => (
                  <tr
                    key={
                      manager.id
                    }
                  >
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {displayName(
                        manager.first_name,
                        manager.last_name
                      )}
                    </td>

                    <td className="px-3 py-4 text-gray-600">
                      {manager.auth
                        ?.email ??
                        "—"}
                    </td>

                    <td className="px-3 py-4">
                      {manager.auth
                        ?.confirmed
                        ? "Da"
                        : "Nu"}
                    </td>

                    <td className="px-3 py-4">
                      {manager.account_status ===
                      "active"
                        ? "Activ"
                        : "Suspendat"}
                    </td>

                    <td className="px-3 py-4 text-right">
                      <button
                        type="button"
                        disabled={
                          isPending
                        }
                        onClick={() =>
                          performAction({
                            action:
                              manager.account_status ===
                              "active"
                                ? "suspend_manager"
                                : "activate_manager",
                            profileId:
                              manager.id,
                          })
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        {manager.account_status ===
                        "active"
                          ? "Suspendă"
                          : "Activează"}
                      </button>
                    </td>
                  </tr>
                )
              )}

              {managers.length ===
                0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-8 text-center text-gray-500"
                  >
                    Nu există manageri.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900">
          Invitații
        </h2>

        <div className="mt-5 space-y-3">
          {invitations.map(
            (invitation) => (
              <div
                key={
                  invitation.id
                }
                className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {invitation.email}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Status:{" "}
                    {invitation.status}
                  </p>
                </div>

                {invitation.status ===
                  "pending" && (
                  <button
                    type="button"
                    disabled={
                      isPending
                    }
                    onClick={() =>
                      performAction({
                        action:
                          "revoke_invitation",
                        invitationId:
                          invitation.id,
                      })
                    }
                    className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Revocă
                  </button>
                )}
              </div>
            )
          )}

          {invitations.length ===
            0 && (
            <p className="text-sm text-gray-500">
              Nu există invitații.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
