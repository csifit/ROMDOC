"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";

type ClosureStatus = {
  request_id: string | null;
  status: string | null;
  requested_at: string | null;
  cooling_off_ends_at:
    | string
    | null;
  restricted_at: string | null;
  processing_started_at:
    | string
    | null;
  completed_at: string | null;
  cancelled_at: string | null;
  legal_hold_active:
    | boolean
    | null;
};

type ClosureResponse = {
  closure?: ClosureStatus | null;
  success?: boolean;
  message?: string;
  error?: string;
};

function formatDate(
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
      dateStyle: "long",
      timeStyle: "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(value)
  );
}

function statusLabel(
  status:
    | string
    | null
) {
  switch (status) {
    case "pending":
      return "Înregistrată";
    case "identity_verification_required":
      return "Verificare necesară";
    case "verified":
      return "Identitate verificată";
    case "cooling_off":
      return "Perioadă de așteptare";
    case "restricted":
      return "Cont restricționat";
    case "processing":
      return "În curs de procesare";
    case "completed":
      return "Finalizată";
    case "cancelled":
      return "Anulată";
    case "rejected":
      return "Respinsă";
    case "legal_hold":
      return "Păstrare obligatorie în analiză";
    default:
      return "Nicio cerere activă";
  }
}

function canCancel(
  closure:
    | ClosureStatus
    | null
) {
  return Boolean(
    closure &&
      [
        "pending",
        "identity_verification_required",
        "verified",
        "cooling_off",
      ].includes(
        closure.status ??
          ""
      )
  );
}

export default function PatientAccountSettings() {
  const [
    closure,
    setClosure,
  ] =
    useState<
      ClosureStatus | null
    >(null);

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(true);

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const loadStatus =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/patient/account-closure",
              {
                method:
                  "GET",
                cache:
                  "no-store",
              }
            );

          const payload =
            (await response.json()) as
              ClosureResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Starea contului nu a putut fi încărcată."
            );
          }

          setClosure(
            payload.closure ??
              null
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Starea contului nu a putut fi încărcată."
          );
        } finally {
          setIsLoading(
            false
          );
        }
      },
      []
    );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  function requestClosure() {
    setMessage(null);
    setError(null);

    if (
      confirmation.trim() !==
      "ÎNCHIDE CONTUL"
    ) {
      setError(
        'Scrie exact „ÎNCHIDE CONTUL” pentru confirmare.'
      );
      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/patient/account-closure",
              {
                method:
                  "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    {
                      reason:
                        reason.trim() ||
                        null,
                    }
                  ),
              }
            );

          const payload =
            (await response.json()) as
              ClosureResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Cererea nu a putut fi înregistrată."
            );
          }

          setMessage(
            payload.message ??
              "Cererea a fost înregistrată."
          );

          setReason("");
          setConfirmation("");

          await loadStatus();
        } catch (
          requestError
        ) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : "Cererea nu a putut fi înregistrată."
          );
        }
      }
    );
  }

  function cancelClosure() {
    setMessage(null);
    setError(null);

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/patient/account-closure",
              {
                method:
                  "DELETE",
              }
            );

          const payload =
            (await response.json()) as
              ClosureResponse;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Cererea nu a putut fi anulată."
            );
          }

          setMessage(
            payload.message ??
              "Cererea a fost anulată."
          );

          await loadStatus();
          window.location.reload();
        } catch (
          cancelError
        ) {
          setError(
            cancelError instanceof
              Error
              ? cancelError.message
              : "Cererea nu a putut fi anulată."
          );
        }
      }
    );
  }

  const activeRequest =
    closure &&
    ![
      "cancelled",
      "completed",
      "rejected",
    ].includes(
      closure.status ??
        ""
    );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          Cont pacient
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Cont și confidențialitate
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
          Poți gestiona aici solicitarea de închidere a contului. Nu este necesar să închizi contul pentru a opri mementourile; preferințele pentru mementouri pot fi gestionate separat.
        </p>

        <div className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5 text-sm leading-6 text-gray-700">
          <strong className="text-gray-900">
            Confidențialitate:
          </strong>{" "}
          RomDoc va șterge sau anonimiza datele care nu mai sunt necesare. Unele înregistrări pot fi păstrate în formă restricționată atunci când există obligații legale, medicale, contabile, de securitate sau pentru apărarea unor drepturi.
          {" "}
          <Link
            href="/confidentialitate"
            className="font-semibold text-[#036661] underline underline-offset-4"
          >
            Citește Politica de confidențialitate
          </Link>
          .
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          Starea cererii
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-600">
            Se încarcă...
          </p>
        ) : closure ? (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Stare
              </dt>
              <dd className="mt-2 font-semibold text-gray-900">
                {statusLabel(
                  closure.status
                )}
              </dd>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Solicitată la
              </dt>
              <dd className="mt-2 text-sm text-gray-900">
                {formatDate(
                  closure.requested_at
                )}
              </dd>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Poate fi anulată până la
              </dt>
              <dd className="mt-2 text-sm text-gray-900">
                {formatDate(
                  closure.cooling_off_ends_at
                )}
              </dd>
            </div>

            <div className="rounded-2xl bg-gray-50 p-4">
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Păstrare obligatorie
              </dt>
              <dd className="mt-2 text-sm text-gray-900">
                {closure.legal_hold_active
                  ? "Există o analiză internă de păstrare"
                  : "Nu este indicată"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            Nu există nicio cerere de închidere.
          </p>
        )}

        {canCancel(
          closure
        ) && (
          <button
            type="button"
            onClick={
              cancelClosure
            }
            disabled={
              isPending
            }
            className="mt-6 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending
              ? "Se anulează..."
              : "Păstrează contul și anulează cererea"}
          </button>
        )}
      </section>

      {!activeRequest && (
        <section className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-bold text-gray-900">
            Solicită închiderea contului
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Cererea pornește o perioadă de așteptare de 30 de zile. În acest interval o poți anula. După începerea procesării, contul și accesul pot fi restricționate.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            Închiderea contului nu înseamnă ștergerea imediată a tuturor programărilor sau documentelor medicale. Înregistrările care trebuie păstrate vor rămâne accesibile numai persoanelor autorizate și numai pentru scopul justificat.
          </p>

          <label className="mt-6 block">
            <span className="text-sm font-semibold text-gray-800">
              Motiv
            </span>

            <span className="ml-2 text-xs text-gray-500">
              Opțional
            </span>

            <textarea
              value={reason}
              onChange={(
                event
              ) =>
                setReason(
                  event.target.value
                )
              }
              rows={4}
              maxLength={2000}
              disabled={
                isPending
              }
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
              placeholder="Poți indica motivul, fără a include informații medicale."
            />
          </label>

          <label className="mt-5 block">
            <span className="text-sm font-semibold text-gray-800">
              Confirmare
            </span>

            <input
              type="text"
              value={
                confirmation
              }
              onChange={(
                event
              ) =>
                setConfirmation(
                  event.target.value
                )
              }
              disabled={
                isPending
              }
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-[#036661] focus:ring-2 focus:ring-[#036661]/20 disabled:opacity-60"
              placeholder="Scrie: ÎNCHIDE CONTUL"
            />

            <span className="mt-2 block text-xs text-gray-500">
              Scrie exact „ÎNCHIDE CONTUL”. Aceasta previne solicitările accidentale.
            </span>
          </label>

          <button
            type="button"
            onClick={
              requestClosure
            }
            disabled={
              isPending ||
              confirmation.trim() !==
                "ÎNCHIDE CONTUL"
            }
            className="mt-6 rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? "Se înregistrează..."
              : "Solicită închiderea contului"}
          </button>
        </section>
      )}

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-900"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900"
        >
          {error}
        </div>
      )}
    </div>
  );
}
