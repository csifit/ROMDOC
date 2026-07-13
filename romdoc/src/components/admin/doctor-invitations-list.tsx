"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type InvitationStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "expired"
  | "cancelled"
  | "failed";

type DoctorInvitation = {
  id: string;
  email: string;
  normalized_email: string;
  first_name: string;
  last_name: string;
  locale: "ro" | "en";
  personal_message:
    | string
    | null;
  complimentary_months: number;
  status: InvitationStatus;
  invited_by_profile_id: string;
  auth_user_id:
    | string
    | null;
  accepted_profile_id:
    | string
    | null;
  doctor_id:
    | string
    | null;
  sent_at:
    | string
    | null;
  accepted_at:
    | string
    | null;
  expires_at:
    | string
    | null;
  cancelled_at:
    | string
    | null;
  failure_code:
    | string
    | null;
  failure_message:
    | string
    | null;
  created_at: string;
  updated_at: string;
};

type InvitationsResponse = {
  invitations?: DoctorInvitation[];
  error?: string;
};

type DoctorInvitationsListProps = {
  refreshKey: number;
};

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
      dateStyle: "medium",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

function getStatusLabel(
  status: InvitationStatus
) {
  switch (status) {
    case "draft":
      return "CiornÄƒ";
    case "sent":
      return "TrimisÄƒ";
    case "accepted":
      return "AcceptatÄƒ";
    case "expired":
      return "ExpiratÄƒ";
    case "cancelled":
      return "AnulatÄƒ";
    case "failed":
      return "EÈ™uatÄƒ";
  }
}

function getStatusClasses(
  status: InvitationStatus
) {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-800";
    case "sent":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "expired":
      return "bg-amber-100 text-amber-800";
    case "cancelled":
      return "bg-gray-200 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function DoctorInvitationsList({
  refreshKey,
}: DoctorInvitationsListProps) {
  const [
    invitations,
    setInvitations,
  ] = useState<
    DoctorInvitation[]
  >([]);
  const [status, setStatus] =
    useState<
      "all" | InvitationStatus
    >("all");
  const [search, setSearch] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] =
    useState<string | null>(
      null
    );
  const [
    expandedInvitationId,
    setExpandedInvitationId,
  ] = useState<
    string | null
  >(null);

  const loadInvitations =
    useCallback(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query =
          status === "all"
            ? ""
            : `?status=${encodeURIComponent(
                status
              )}`;

        const response =
          await fetch(
            `/api/admin/doctors/invitations${query}`,
            {
              cache:
                "no-store",
            }
          );

        const result =
          (await response.json()) as
            InvitationsResponse;

        if (!response.ok) {
          throw new Error(
            result.error ??
              "InvitaÈ›iile nu au putut fi Ã®ncÄƒrcate."
          );
        }

        setInvitations(
          result.invitations ??
            []
        );
      } catch (loadError) {
        setError(
          loadError instanceof
            Error
            ? loadError.message
            : "InvitaÈ›iile nu au putut fi Ã®ncÄƒrcate."
        );
      } finally {
        setIsLoading(
          false
        );
      }
    }, [status]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadInvitations();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadInvitations,
    refreshKey,]);

  const filteredInvitations =
    useMemo(() => {
      const normalized =
        search
          .trim()
          .toLowerCase();

      if (!normalized) {
        return invitations;
      }

      return invitations.filter(
        (invitation) =>
          [
            invitation.first_name,
            invitation.last_name,
            invitation.email,
            invitation.personal_message,
          ]
            .filter(Boolean)
            .some((value) =>
              value
                ?.toLowerCase()
                .includes(
                  normalized
                )
            )
      );
    }, [
      invitations,
      search,
    ]);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-950">
              Istoric invitaÈ›ii
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              UrmÄƒreÈ™te invitaÈ›iile trimise, acceptate, expirate sau eÈ™uate.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem] lg:w-[34rem]">
            <input
              type="search"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target
                    .value
                )
              }
              placeholder="CautÄƒ nume sau e-mail..."
              className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-3"
            />

            <select
              value={status}
              onChange={(
                event
              ) =>
                setStatus(
                  event.target
                    .value as
                    | "all"
                    | InvitationStatus
                )
              }
              className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-4 py-3"
            >
              <option value="all">
                Toate
              </option>
              <option value="sent">
                Trimise
              </option>
              <option value="accepted">
                Acceptate
              </option>
              <option value="failed">
                EÈ™uate
              </option>
              <option value="expired">
                Expirate
              </option>
              <option value="cancelled">
                Anulate
              </option>
              <option value="draft">
                Ciorne
              </option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="p-8 text-sm text-gray-600">
          Se Ã®ncarcÄƒ invitaÈ›iile...
        </div>
      ) : filteredInvitations.length ===
        0 ? (
        <div className="p-8 text-sm text-gray-600">
          Nu existÄƒ invitaÈ›ii care corespund filtrelor.
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {filteredInvitations.map(
            (invitation) => {
              const expanded =
                expandedInvitationId ===
                invitation.id;

              return (
                <article
                  key={
                    invitation.id
                  }
                  className="p-5 sm:p-6"
                >
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_0.75fr_0.75fr_auto] lg:items-center">
                    <div>
                      <p className="font-semibold text-gray-950">
                        {
                          invitation.first_name
                        }{" "}
                        {
                          invitation.last_name
                        }
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {
                          invitation.email
                        }
                      </p>
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(
                          invitation.status
                        )}`}
                      >
                        {getStatusLabel(
                          invitation.status
                        )}
                      </span>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>
                        {
                          invitation.complimentary_months
                        }{" "}
                        luni gratuite
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        CreatÄƒ{" "}
                        {formatDateTime(
                          invitation.created_at
                        )}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInvitationId(
                          expanded
                            ? null
                            : invitation.id
                        )
                      }
                      className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {expanded
                        ? "Ascunde"
                        : "Detalii"}
                    </button>
                  </div>

                  {expanded ? (
                    <div className="mt-5 grid gap-5 rounded-2xl bg-[#F0EEE9] p-4 text-sm text-gray-700 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p>
                          <strong>
                            Limba:
                          </strong>{" "}
                          {invitation.locale ===
                          "en"
                            ? "English"
                            : "RomÃ¢nÄƒ"}
                        </p>
                        <p>
                          <strong>
                            TrimisÄƒ:
                          </strong>{" "}
                          {formatDateTime(
                            invitation.sent_at
                          )}
                        </p>
                        <p>
                          <strong>
                            ExpirÄƒ:
                          </strong>{" "}
                          {formatDateTime(
                            invitation.expires_at
                          )}
                        </p>
                        <p>
                          <strong>
                            AcceptatÄƒ:
                          </strong>{" "}
                          {formatDateTime(
                            invitation.accepted_at
                          )}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p>
                          <strong>
                            Auth user:
                          </strong>{" "}
                          {invitation.auth_user_id ??
                            "â€”"}
                        </p>
                        <p>
                          <strong>
                            Doctor:
                          </strong>{" "}
                          {invitation.doctor_id ??
                            "â€”"}
                        </p>

                        {invitation.failure_message ? (
                          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-800">
                            <strong>
                              Eroare:
                            </strong>{" "}
                            {
                              invitation.failure_message
                            }
                          </p>
                        ) : null}
                      </div>

                      {invitation.personal_message ? (
                        <div className="sm:col-span-2">
                          <p className="font-semibold text-gray-900">
                            Mesaj personalizat
                          </p>
                          <p className="mt-2 whitespace-pre-wrap leading-6">
                            {
                              invitation.personal_message
                            }
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

