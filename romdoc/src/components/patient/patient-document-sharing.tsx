"use client";

import {
  useEffect,
  useCallback,
  useState,
} from "react";

type DoctorOption = {
  id: string;
  name: string;
};

type Share = {
  id: string;
  doctor_id: string;
  doctor_name: string;
  expires_at: string | null;
  revoked_at: string | null;
  active: boolean;
};

type ResponsePayload = {
  doctors?: DoctorOption[];
  shares?: Share[];
  uploaderDoctorId?: string;
  events?: Array<{
    id: string;
    event_type: string;
    actor_role: string;
    metadata: Record<string, unknown>;
    created_at: string;
  }>;
  error?: string;
};

type Props = {
  documentId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(new Date(value));
}

const eventLabels:
  Record<string, string> = {
    created: "Document creat",
    shared: "Document partajat",
    share_revoked:
      "Partajare revocatÄƒ",
    viewed: "Document consultat",
    downloaded:
      "Document descÄƒrcat",
    soft_deleted:
      "Document È™ters",
  };

export default function PatientDocumentSharing({
  documentId,
}: Props) {
  const [open, setOpen] =
    useState(false);
  const [doctors, setDoctors] =
    useState<DoctorOption[]>([]);
  const [shares, setShares] =
    useState<Share[]>([]);
  const [events, setEvents] =
    useState<ResponsePayload["events"]>(
      []
    );
  const [doctorId, setDoctorId] =
    useState("");
  const [expiresAt, setExpiresAt] =
    useState("");
  const [error, setError] =
    useState("");
  const [isSaving, setIsSaving] =
    useState(false);

  const load = useCallback(async () => {
    setError("");

    const [shareResponse, auditResponse] =
      await Promise.all([
        fetch(
          `/api/patient/folder/shares?documentId=${documentId}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/patient/folder/audit?documentId=${documentId}`,
          { cache: "no-store" }
        ),
      ]);

    const sharePayload =
      (await shareResponse.json()) as ResponsePayload;
    const auditPayload =
      (await auditResponse.json()) as ResponsePayload;

    if (!shareResponse.ok) {
      setError(
        sharePayload.error ??
          "PartajÄƒrile nu au putut fi Ã®ncÄƒrcate."
      );
      return;
    }

    setDoctors(
      sharePayload.doctors ?? []
    );
    setShares(
      sharePayload.shares ?? []
    );

    if (auditResponse.ok) {
      setEvents(
        auditPayload.events ?? []
      );
    }
  }, [documentId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [load, open]);

  async function createShare() {
    if (!doctorId) {
      setError(
        "SelecteazÄƒ un medic."
      );
      return;
    }

    setIsSaving(true);
    setError("");

    const response =
      await fetch(
        "/api/patient/folder/shares",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            documentId,
            doctorId,
            expiresAt:
              expiresAt
                ? new Date(
                    `${expiresAt}T23:59:59`
                  ).toISOString()
                : null,
          }),
        }
      );

    const payload =
      (await response.json()) as ResponsePayload;

    if (!response.ok) {
      setError(
        payload.error ??
          "Documentul nu a putut fi partajat."
      );
      setIsSaving(false);
      return;
    }

    setDoctorId("");
    setExpiresAt("");
    await load();
    setIsSaving(false);
  }

  async function revokeShare(
    shareId: string
  ) {
    setIsSaving(true);
    setError("");

    const response =
      await fetch(
        "/api/patient/folder/shares",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            shareId,
          }),
        }
      );

    const payload =
      (await response.json()) as ResponsePayload;

    if (!response.ok) {
      setError(
        payload.error ??
          "Partajarea nu a putut fi revocatÄƒ."
      );
    } else {
      await load();
    }

    setIsSaving(false);
  }

  return (
    <div className="mt-5 border-t border-gray-200 pt-5">
      <button
        type="button"
        onClick={() =>
          setOpen((value) => !value)
        }
        className="romdoc-button romdoc-button-secondary romdoc-button-sm"
      >
        {open
          ? "Ascunde accesul"
          : "Partajare È™i istoric"}
      </button>

      {open && (
        <div className="mt-4 space-y-5">
          <div className="rounded-xl bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">
              PartajeazÄƒ cu un medic
            </h3>

            <p className="mt-1 text-xs leading-5 text-gray-600">
              PoÈ›i selecta numai medici asociaÈ›i consultaÈ›iilor din contul tÄƒu.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <select
                value={doctorId}
                onChange={(event) =>
                  setDoctorId(
                    event.target.value
                  )
                }
                className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">
                  SelecteazÄƒ medicul
                </option>

                {doctors.map(
                  (doctor) => (
                    <option
                      key={doctor.id}
                      value={doctor.id}
                    >
                      {doctor.name}
                    </option>
                  )
                )}
              </select>

              <input
                type="date"
                value={expiresAt}
                min={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
                onChange={(event) =>
                  setExpiresAt(
                    event.target.value
                  )
                }
                className="romdoc-focus-ring rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"
              />
            </div>

            <button
              type="button"
              disabled={
                isSaving ||
                !doctorId
              }
              onClick={() =>
                void createShare()
              }
              className="romdoc-button romdoc-button-primary romdoc-button-sm mt-3"
            >
              PartajeazÄƒ documentul
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Acces acordat
            </h3>

            <div className="mt-3 space-y-2">
              {shares.filter(
                (share) =>
                  share.active
              ).length === 0 ? (
                <p className="text-sm text-gray-600">
                  Documentul nu este partajat cu alÈ›i medici.
                </p>
              ) : (
                shares
                  .filter(
                    (share) =>
                      share.active
                  )
                  .map((share) => (
                    <div
                      key={share.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {
                            share.doctor_name
                          }
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {share.expires_at
                            ? `ExpirÄƒ la ${formatDate(
                                share.expires_at
                              )}`
                            : "FÄƒrÄƒ datÄƒ de expirare"}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={
                          isSaving
                        }
                        onClick={() =>
                          void revokeShare(
                            share.id
                          )
                        }
                        className="text-sm font-semibold text-red-700 hover:underline"
                      >
                        RevocÄƒ
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900">
              Istoric acces
            </h3>

            <ol className="mt-3 space-y-3 border-l-2 border-gray-200 pl-5">
              {(events ?? []).map(
                (event) => (
                  <li
                    key={event.id}
                    className="relative"
                  >
                    <span className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#036661]" />

                    <p className="text-sm font-semibold text-gray-900">
                      {eventLabels[
                        event.event_type
                      ] ??
                        event.event_type}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(
                        event.created_at
                      )}
                      {" Â· "}
                      {event.actor_role}
                    </p>

                    {typeof event.metadata
                      ?.doctor_name ===
                      "string" && (
                      <p className="mt-1 text-xs text-gray-600">
                        {
                          event.metadata
                            .doctor_name
                        }
                      </p>
                    )}
                  </li>
                )
              )}
            </ol>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


