"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Button from "@/components/ui/button";

type VerificationStatus =
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";

type VerificationDocument = {
  id: string;
  document_type: string;
  original_file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type AdminNote = {
  id: string;
  note: string;
  created_at: string;
  author:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | null;
};


type AuditEvent = {
  id: string;
  event_type:
    | "draft_created"
    | "submitted"
    | "review_started"
    | "approved"
    | "rejected"
    | "expired_manual"
    | "expired_automatic"
    | "withdrawn";
  from_status: string | null;
  to_status: string;
  source: "application" | "admin" | "system";
  created_at: string;
  actor:
    | {
        first_name: string | null;
        last_name: string | null;
      }
    | null;
};

type Submission = {
  id: string;
  status: VerificationStatus;
  professional_registration_number: string | null;
  issuing_authority: string | null;
  professional_title: string | null;
  registration_country: string;
  registration_expires_at: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  doctor:
    | {
        id: string;
        slug: string;
        verification_status: string;
        name: string;
        title: string | null;
      }
    | null;
  documents: VerificationDocument[];
  admin_notes: AdminNote[];
  audit_events: AuditEvent[];
};

type ApiResponse = {
  submissions?: Submission[];
  signedUrl?: string;
  error?: string;
};

type StatusFilter =
  | "all"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "expired";

const statusLabels: Record<VerificationStatus, string> = {
  submitted: "Trimisă",
  under_review: "În analiză",
  verified: "Aprobată",
  rejected: "Respinsă",
  expired: "Expirată",
};

const statusClasses: Record<VerificationStatus, string> = {
  submitted: "bg-amber-100 text-amber-800",
  under_review: "bg-blue-100 text-blue-800",
  verified: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-gray-200 text-gray-700",
};

const documentTypeLabels: Record<string, string> = {
  identity_document: "Document de identitate",
  professional_certificate: "Certificat profesional",
  membership_certificate: "Certificat de membru",
  practice_authorization: "Autorizație de practică",
  other: "Alt document",
};


const auditEventLabels: Record<AuditEvent["event_type"], string> = {
  draft_created: "Ciornă creată",
  submitted: "Cerere trimisă",
  review_started: "Analiză începută",
  approved: "Verificare aprobată",
  rejected: "Cerere respinsă",
  expired_manual: "Verificare expirată manual",
  expired_automatic: "Verificare expirată automat",
  withdrawn: "Cerere retrasă",
};

function getAuditActorName(event: AuditEvent) {
  if (event.source === "system") {
    return "Sistem RomDoc";
  }

  const name = [
    event.actor?.first_name,
    event.actor?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) {
    return name;
  }

  return event.source === "admin"
    ? "Administrator"
    : "Medic";
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    dateStyle: "medium",
    timeStyle: value.includes("T") ? "short" : undefined,
  }).format(new Date(value));
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAuthorName(note: AdminNote) {
  const name = [
    note.author?.first_name,
    note.author?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Administrator";
}

export default function DoctorVerificationsManagement() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedSubmission = useMemo(
    () =>
      submissions.find((submission) => submission.id === selectedId) ??
      submissions[0] ??
      null,
    [selectedId, submissions]
  );

  const loadSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/verifications?status=${encodeURIComponent(statusFilter)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Cererile nu au putut fi încărcate."
        );
      }

      const nextSubmissions = payload.submissions ?? [];
      setSubmissions(nextSubmissions);
      setSelectedId((current) => {
        if (
          current &&
          nextSubmissions.some((submission) => submission.id === current)
        ) {
          return current;
        }

        return nextSubmissions[0]?.id ?? null;
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Cererile nu au putut fi încărcate."
      );
      setSubmissions([]);
      setSelectedId(null);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  async function openDocument(documentId: string) {
    setBusyAction(`document:${documentId}`);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/verifications?documentId=${encodeURIComponent(documentId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok || !payload.signedUrl) {
        throw new Error(
          payload.error ?? "Documentul nu a putut fi deschis."
        );
      }

      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (documentError) {
      setError(
        documentError instanceof Error
          ? documentError.message
          : "Documentul nu a putut fi deschis."
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function reviewSubmission(
    action:
      | "start_review"
      | "approve"
      | "reject"
      | "mark_expired"
  ) {
    if (!selectedSubmission || busyAction) {
      return;
    }

    if (
      action === "reject" &&
      !rejectionReason.trim()
    ) {
      setError("Introdu motivul respingerii.");
      return;
    }

    const confirmations: Partial<Record<typeof action, string>> = {
      approve:
        "Aprobi această verificare și publici insigna „Medic verificat de RomDoc”?",
      reject:
        "Respingi această cerere? Motivul va fi vizibil medicului.",
      mark_expired:
        "Marchezi această verificare ca expirată și elimini insigna publică?",
    };

    const confirmation = confirmations[action];

    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    setBusyAction(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/verifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionId: selectedSubmission.id,
          action,
          rejectionReason:
            action === "reject" ? rejectionReason.trim() : null,
          privateNote: privateNote.trim() || null,
        }),
      });

      const payload = (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Verificarea nu a putut fi actualizată."
        );
      }

      const successMessages = {
        start_review: "Cererea a fost preluată pentru analiză.",
        approve: "Medicul a fost verificat cu succes.",
        reject: "Cererea a fost respinsă.",
        mark_expired: "Verificarea a fost marcată ca expirată.",
      };

      setMessage(successMessages[action]);
      setRejectionReason("");
      setPrivateNote("");
      await loadSubmissions();
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Verificarea nu a putut fi actualizată."
      );
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label
              htmlFor="verification-status-filter"
              className="text-sm font-semibold text-gray-800"
            >
              Starea cererii
            </label>

            <select
              id="verification-status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="romdoc-focus-ring mt-2 block w-full min-w-56 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
            >
              <option value="all">Toate cererile</option>
              <option value="submitted">Trimise</option>
              <option value="under_review">În analiză</option>
              <option value="verified">Aprobate</option>
              <option value="rejected">Respinse</option>
              <option value="expired">Expirate</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => void loadSubmissions()}
            disabled={isLoading}
            className="romdoc-focus-ring rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Se încarcă..." : "Reîncarcă"}
          </button>
        </div>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-600 shadow-sm">
          Se încarcă cererile de verificare...
        </div>
      ) : submissions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Nu există cereri în această categorie
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Cererile trimise de medici vor apărea aici.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="space-y-3">
            {submissions.map((submission) => {
              const selected = submission.id === selectedSubmission?.id;

              return (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(submission.id);
                    setRejectionReason("");
                    setPrivateNote("");
                    setMessage("");
                    setError("");
                  }}
                  className={`romdoc-focus-ring w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                    selected
                      ? "border-[#036661] bg-emerald-50/50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {submission.doctor?.name ?? "Medic necunoscut"}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {submission.doctor?.title ?? "Profil medical"}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[submission.status]}`}
                    >
                      {statusLabels[submission.status]}
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Trimisă: {formatDate(submission.submitted_at)}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedSubmission && (
            <article className="space-y-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#036661]">
                    Cerere profesională
                  </p>

                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {selectedSubmission.doctor?.name ?? "Medic necunoscut"}
                  </h2>

                  {selectedSubmission.doctor && (
                    <Link
                      href={`/doctor/${selectedSubmission.doctor.slug}`}
                      target="_blank"
                      className="romdoc-focus-ring mt-2 inline-flex rounded-md text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                    >
                      Deschide profilul public
                    </Link>
                  )}
                </div>

                <span
                  className={`self-start rounded-full px-3 py-1.5 text-sm font-semibold ${statusClasses[selectedSubmission.status]}`}
                >
                  {statusLabels[selectedSubmission.status]}
                </span>
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-gray-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Număr profesional
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {selectedSubmission.professional_registration_number || "—"}
                  </dd>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Autoritate emitentă
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {selectedSubmission.issuing_authority || "—"}
                  </dd>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Titlu profesional
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {selectedSubmission.professional_title || "—"}
                  </dd>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Țară / expirare
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {selectedSubmission.registration_country} ·{" "}
                    {formatDate(selectedSubmission.registration_expires_at)}
                  </dd>
                </div>
              </dl>

              <section>
                <h3 className="text-lg font-semibold text-gray-900">
                  Documente
                </h3>

                {selectedSubmission.documents.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    Medicul nu a atașat documente.
                  </p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {selectedSubmission.documents.map((document) => (
                      <div
                        key={document.id}
                        className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {document.original_file_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {documentTypeLabels[document.document_type] ??
                              "Document"}{" "}
                            · {formatFileSize(document.file_size_bytes)}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => void openDocument(document.id)}
                          disabled={Boolean(busyAction)}
                          className="romdoc-focus-ring rounded-xl border border-[#036661] px-4 py-2 text-sm font-semibold text-[#036661] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyAction === `document:${document.id}`
                            ? "Se deschide..."
                            : "Deschide documentul"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {selectedSubmission.rejection_reason && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <h3 className="text-sm font-semibold text-red-900">
                    Motivul respingerii
                  </h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-red-800">
                    {selectedSubmission.rejection_reason}
                  </p>
                </section>
              )}


              <section>
                <h3 className="text-lg font-semibold text-gray-900">
                  Istoric de audit
                </h3>

                <p className="mt-1 text-sm text-gray-600">
                  Acest istoric este generat de baza de date și nu poate fi
                  modificat din interfața de administrare.
                </p>

                {selectedSubmission.audit_events.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                    Nu există încă evenimente de audit pentru această cerere.
                  </p>
                ) : (
                  <ol className="mt-4 space-y-4 border-l-2 border-gray-200 pl-5">
                    {selectedSubmission.audit_events.map((event) => (
                      <li
                        key={event.id}
                        className="relative"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-[#036661] shadow"
                        />

                        <p className="text-sm font-semibold text-gray-900">
                          {auditEventLabels[event.event_type]}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {getAuditActorName(event)} ·{" "}
                          {formatDate(event.created_at)}
                        </p>

                        {event.from_status &&
                          event.from_status !== event.to_status && (
                            <p className="mt-1 text-xs text-gray-500">
                              {event.from_status} → {event.to_status}
                            </p>
                          )}
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <section>
                <h3 className="text-lg font-semibold text-gray-900">
                  Observații interne
                </h3>

                {selectedSubmission.admin_notes.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {selectedSubmission.admin_notes.map((note) => (
                      <div
                        key={note.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                      >
                        <p className="whitespace-pre-wrap text-sm text-gray-800">
                          {note.note}
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          {getAuthorName(note)} · {formatDate(note.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {(selectedSubmission.status === "submitted" ||
                  selectedSubmission.status === "under_review" ||
                  selectedSubmission.status === "verified") && (
                  <textarea
                    value={privateNote}
                    onChange={(event) => setPrivateNote(event.target.value)}
                    maxLength={5000}
                    rows={4}
                    placeholder="Observație vizibilă numai administratorilor..."
                    className="romdoc-focus-ring mt-3 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                  />
                )}
              </section>

              {selectedSubmission.status === "rejected" ||
              selectedSubmission.status === "expired" ? null : (
                <section className="space-y-4 border-t border-gray-200 pt-6">
                  {selectedSubmission.status === "under_review" && (
                    <div>
                      <label
                        htmlFor="verification-rejection-reason"
                        className="text-sm font-semibold text-gray-800"
                      >
                        Motivul respingerii
                      </label>

                      <textarea
                        id="verification-rejection-reason"
                        value={rejectionReason}
                        onChange={(event) =>
                          setRejectionReason(event.target.value)
                        }
                        maxLength={2000}
                        rows={4}
                        placeholder="Explică medicului ce informații lipsesc sau trebuie corectate."
                        className="romdoc-focus-ring mt-2 block w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    {selectedSubmission.status === "submitted" && (
                      <Button
                        type="button"
                        onClick={() => void reviewSubmission("start_review")}
                        disabled={Boolean(busyAction)}
                      >
                        {busyAction === "start_review"
                          ? "Se preia..."
                          : "Începe analiza"}
                      </Button>
                    )}

                    {selectedSubmission.status === "under_review" && (
                      <>
                        <Button
                          type="button"
                          onClick={() => void reviewSubmission("approve")}
                          disabled={Boolean(busyAction)}
                        >
                          {busyAction === "approve"
                            ? "Se aprobă..."
                            : "Aprobă verificarea"}
                        </Button>

                        <button
                          type="button"
                          onClick={() => void reviewSubmission("reject")}
                          disabled={Boolean(busyAction)}
                          className="romdoc-focus-ring rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busyAction === "reject"
                            ? "Se respinge..."
                            : "Respinge cererea"}
                        </button>
                      </>
                    )}

                    {selectedSubmission.status === "verified" && (
                      <button
                        type="button"
                        onClick={() => void reviewSubmission("mark_expired")}
                        disabled={Boolean(busyAction)}
                        className="romdoc-focus-ring rounded-xl border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {busyAction === "mark_expired"
                          ? "Se actualizează..."
                          : "Marchează expirată"}
                      </button>
                    )}
                  </div>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
