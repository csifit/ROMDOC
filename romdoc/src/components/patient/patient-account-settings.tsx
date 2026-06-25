"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useState,
} from "react";

type ClosureResponse = {
  success?: boolean;
  requestedAt?:
    | string
    | null;
  message?: string;
  error?: string;
};

function formatDate(
  value: string
) {
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

export default function PatientAccountSettings() {
  const [
    requestedAt,
    setRequestedAt,
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
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

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
                "Starea solicitării nu a putut fi încărcată."
            );
          }

          setRequestedAt(
            payload.requestedAt ??
              null
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Starea solicitării nu a putut fi încărcată."
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

  async function requestClosure() {
    const confirmed =
      window.confirm(
        "Trimiți administratorului solicitarea de închidere a contului?"
      );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/patient/account-closure",
          {
            method:
              "POST",
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
            "Solicitarea nu a putut fi trimisă."
        );
      }

      setRequestedAt(
        payload.requestedAt ??
          new Date().toISOString()
      );

      setMessage(
        payload.message ??
          "Solicitarea a fost trimisă."
      );
    } catch (
      requestError
    ) {
      setError(
        requestError instanceof
          Error
          ? requestError.message
          : "Solicitarea nu a putut fi trimisă."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  async function cancelRequest() {
    const confirmed =
      window.confirm(
        "Anulezi solicitarea de închidere a contului?"
      );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

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
            "Solicitarea nu a putut fi anulată."
        );
      }

      setRequestedAt(
        null
      );

      setMessage(
        payload.message ??
          "Solicitarea a fost anulată."
      );
    } catch (
      cancelError
    ) {
      setError(
        cancelError instanceof
          Error
          ? cancelError.message
          : "Solicitarea nu a putut fi anulată."
      );
    } finally {
      setIsSubmitting(
        false
      );
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          Cont pacient
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Cont și confidențialitate
        </h1>

        <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600">
          Poți solicita închiderea contului. Administratorul va analiza solicitarea și va bloca accesul la cont.
        </p>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Înregistrările care trebuie păstrate din motive medicale, contabile sau legale nu sunt șterse automat.
          {" "}
          <Link
            href="/confidentialitate"
            className="font-semibold text-[#036661] underline underline-offset-4"
          >
            Politica de confidențialitate
          </Link>
        </p>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900"
        >
          {error}
        </div>
      )}

      {message && (
        <div
          role="status"
          className="rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-900"
        >
          {message}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-gray-900">
          Închiderea contului
        </h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-gray-600">
            Se încarcă...
          </p>
        ) : requestedAt ? (
          <>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <p className="font-semibold text-amber-950">
                Închidere solicitată
              </p>

              <p className="mt-2 text-sm text-amber-900">
                Solicitarea a fost trimisă la{" "}
                {formatDate(
                  requestedAt
                )}.
              </p>

              <p className="mt-2 text-sm text-amber-900">
                Contul rămâne activ până când administratorul îl blochează.
              </p>
            </div>

            <button
              type="button"
              onClick={
                cancelRequest
              }
              disabled={
                isSubmitting
              }
              className="mt-5 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Se procesează..."
                : "Anulează solicitarea"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
              După trimitere, administratorul va vedea solicitarea în pagina Utilizatori și va folosi acțiunea existentă de blocare a contului.
            </p>

            <button
              type="button"
              onClick={
                requestClosure
              }
              disabled={
                isSubmitting
              }
              className="mt-5 rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Se trimite..."
                : "Solicită închiderea contului"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
