"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

type ClosurePlanItem = {
  id: string;
  action_type: string;
  action_status: string;
  reason_code: string | null;
  completed_at: string | null;
};

type ClosureRecord = {
  id: string;
  profile_id: string;
  request_source: string;
  status: string;
  reason: string | null;
  requested_at: string;
  cooling_off_ends_at: string | null;
  restricted_at: string | null;
  processing_started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  processing_attempt_count: number;
  processing_last_error: string | null;
  profiles:
    | {
        first_name: string | null;
        last_name: string | null;
        role: string;
        account_status: string;
      }
    | {
        first_name: string | null;
        last_name: string | null;
        role: string;
        account_status: string;
      }[]
    | null;
  privacy_account_closure_plan_items:
    ClosurePlanItem[];
};

type LegalHoldRecord = {
  id: string;
  subject_profile_id: string | null;
  resource_type: string;
  resource_id: string | null;
  reason_category: string;
  reason: string;
  reference_number: string | null;
  status: string;
  starts_at: string;
  review_due_at: string;
  expires_at: string | null;
  released_at: string | null;
  release_reason: string | null;
  created_at: string;
};

type RetentionRunRecord = {
  id: string;
  run_type: string;
  status: string;
  worker_id: string;
  retention_class: string | null;
  started_at: string;
  completed_at: string | null;
  scanned_count: number;
  eligible_count: number;
  skipped_legal_hold_count: number;
  deleted_count: number;
  anonymized_count: number;
  retained_count: number;
  failed_count: number;
  error_summary: string | null;
};

type PrivacyPayload = {
  closures?: ClosureRecord[];
  legalHolds?: LegalHoldRecord[];
  retentionRuns?: RetentionRunRecord[];
  success?: boolean;
  message?: string;
  error?: string;
};

type Tab =
  | "closures"
  | "holds"
  | "runs";

const resourceTypes = [
  "profile",
  "all_subject_data",
  "appointment",
  "medical_document",
  "medical_note",
  "professional_verification",
  "review",
  "billing_record",
  "security_event",
  "support_case",
  "privacy_request",
];

const reasonCategories = [
  "legal_claim",
  "regulatory_request",
  "fraud_investigation",
  "security_incident",
  "medical_record_duty",
  "accounting_duty",
  "complaint",
  "other",
];

function formatDate(
  value: string | null
) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(value)
  );
}

function getProfile(
  closure: ClosureRecord
) {
  if (
    Array.isArray(
      closure.profiles
    )
  ) {
    return (
      closure.profiles[0] ??
      null
    );
  }

  return closure.profiles;
}

function profileLabel(
  closure: ClosureRecord
) {
  const profile =
    getProfile(closure);

  const name = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    name ||
    closure.profile_id
  );
}

export default function PrivacyOperationsManagement() {
  const [
    tab,
    setTab,
  ] =
    useState<Tab>(
      "closures"
    );

  const [
    closures,
    setClosures,
  ] =
    useState<
      ClosureRecord[]
    >([]);

  const [
    legalHolds,
    setLegalHolds,
  ] =
    useState<
      LegalHoldRecord[]
    >([]);

  const [
    retentionRuns,
    setRetentionRuns,
  ] =
    useState<
      RetentionRunRecord[]
    >([]);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    message,
    setMessage,
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

  const [
    holdForm,
    setHoldForm,
  ] =
    useState({
      subjectProfileId:
        "",
      resourceType:
        "all_subject_data",
      resourceId:
        "",
      reasonCategory:
        "legal_claim",
      reason:
        "",
      referenceNumber:
        "",
      reviewDueAt:
        "",
      expiresAt:
        "",
    });

  const [
    releaseReasons,
    setReleaseReasons,
  ] =
    useState<
      Record<
        string,
        string
      >
    >({});

  const loadData =
    useCallback(
      async () => {
        setIsLoading(true);
        setError(null);

        try {
          const response =
            await fetch(
              "/api/admin/privacy",
              {
                cache:
                  "no-store",
              }
            );

          const payload =
            (await response.json()) as
              PrivacyPayload;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Datele nu au putut fi încărcate."
            );
          }

          setClosures(
            payload.closures ??
              []
          );

          setLegalHolds(
            payload.legalHolds ??
              []
          );

          setRetentionRuns(
            payload.retentionRuns ??
              []
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : "Datele nu au putut fi încărcate."
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
    void loadData();
  }, [loadData]);

  const openClosures =
    useMemo(
      () =>
        closures.filter(
          (item) =>
            ![
              "completed",
              "cancelled",
              "rejected",
            ].includes(
              item.status
            )
        ).length,
      [closures]
    );

  const activeHolds =
    useMemo(
      () =>
        legalHolds.filter(
          (item) =>
            item.status ===
            "active"
        ).length,
      [legalHolds]
    );

  function createLegalHold() {
    setError(null);
    setMessage(null);

    if (
      !holdForm.subjectProfileId.trim() ||
      holdForm.reason.trim().length <
        3 ||
      !holdForm.reviewDueAt
    ) {
      setError(
        "Completează profilul, motivul și data revizuirii."
      );
      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/admin/privacy",
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
                      action:
                        "create_legal_hold",
                      ...holdForm,
                    }
                  ),
              }
            );

          const payload =
            (await response.json()) as
              PrivacyPayload;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Măsura nu a putut fi creată."
            );
          }

          setMessage(
            payload.message ??
              "Măsura a fost creată."
          );

          setHoldForm({
            subjectProfileId:
              "",
            resourceType:
              "all_subject_data",
            resourceId:
              "",
            reasonCategory:
              "legal_claim",
            reason:
              "",
            referenceNumber:
              "",
            reviewDueAt:
              "",
            expiresAt:
              "",
          });

          await loadData();
        } catch (
          createError
        ) {
          setError(
            createError instanceof
              Error
              ? createError.message
              : "Măsura nu a putut fi creată."
          );
        }
      }
    );
  }

  function releaseLegalHold(
    holdId: string
  ) {
    setError(null);
    setMessage(null);

    const reason =
      (
        releaseReasons[
          holdId
        ] ??
        ""
      ).trim();

    if (
      reason.length <
      3
    ) {
      setError(
        "Introdu motivul eliberării."
      );
      return;
    }

    startTransition(
      async () => {
        try {
          const response =
            await fetch(
              "/api/admin/privacy",
              {
                method:
                  "PATCH",
                headers: {
                  "Content-Type":
                    "application/json",
                },
                body:
                  JSON.stringify(
                    {
                      action:
                        "release_legal_hold",
                      legalHoldId:
                        holdId,
                      releaseReason:
                        reason,
                    }
                  ),
              }
            );

          const payload =
            (await response.json()) as
              PrivacyPayload;

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Măsura nu a putut fi eliberată."
            );
          }

          setMessage(
            payload.message ??
              "Măsura a fost eliberată."
          );

          setReleaseReasons(
            (current) => ({
              ...current,
              [holdId]:
                "",
            })
          );

          await loadData();
        } catch (
          releaseError
        ) {
          setError(
            releaseError instanceof
              Error
              ? releaseError.message
              : "Măsura nu a putut fi eliberată."
          );
        }
      }
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          Administrare
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
          Operațiuni de confidențialitate
        </h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-gray-600">
          Zonă rezervată administratorilor cu verificare AAL2. Aici pot fi revizuite cererile de închidere, măsurile de păstrare și execuțiile de retenție. Această pagină nu șterge direct date medicale sau conturi de autentificare.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Cereri deschise
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {openClosures}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Măsuri active
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {activeHolds}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            Execuții recente
          </p>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {retentionRuns.length}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        {(
          [
            [
              "closures",
              "Cereri",
            ],
            [
              "holds",
              "Măsuri de păstrare",
            ],
            [
              "runs",
              "Execuții",
            ],
          ] as const
        ).map(
          ([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setTab(value)
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === value
                  ? "bg-[#036661] text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

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

      {isLoading ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
          Se încarcă...
        </div>
      ) : tab ===
        "closures" ? (
        <div className="space-y-4">
          {closures.length ===
          0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-600">
              Nu există cereri.
            </div>
          ) : (
            closures.map(
              (closure) => {
                const profile =
                  getProfile(
                    closure
                  );

                return (
                  <article
                    key={
                      closure.id
                    }
                    className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-bold text-gray-900">
                          {profileLabel(
                            closure
                          )}
                        </h2>
                        <p className="mt-1 break-all text-xs text-gray-500">
                          {closure.profile_id}
                        </p>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                        {closure.status}
                      </span>
                    </div>

                    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-gray-500">
                          Rol
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {profile?.role ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-gray-500">
                          Stare cont
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {profile?.account_status ??
                            "—"}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-gray-500">
                          Solicitată
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {formatDate(
                            closure.requested_at
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-gray-500">
                          Sfârșit așteptare
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {formatDate(
                            closure.cooling_off_ends_at
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-gray-500">
                          Procesare
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {formatDate(
                            closure.processing_started_at
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-gray-500">
                          Încercări
                        </dt>
                        <dd className="font-medium text-gray-900">
                          {closure.processing_attempt_count}
                        </dd>
                      </div>
                    </dl>

                    {closure.reason && (
                      <p className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                        {closure.reason}
                      </p>
                    )}

                    {closure.processing_last_error && (
                      <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-900">
                        {closure.processing_last_error}
                      </p>
                    )}

                    {closure.privacy_account_closure_plan_items.length >
                      0 && (
                      <div className="mt-5">
                        <h3 className="text-sm font-bold text-gray-900">
                          Plan de execuție
                        </h3>

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {closure.privacy_account_closure_plan_items.map(
                            (
                              item
                            ) => (
                              <div
                                key={
                                  item.id
                                }
                                className="rounded-xl border border-gray-200 px-3 py-3 text-xs"
                              >
                                <p className="font-semibold text-gray-900">
                                  {item.action_type}
                                </p>
                                <p className="mt-1 text-gray-600">
                                  {item.action_status}
                                  {item.reason_code
                                    ? ` · ${item.reason_code}`
                                    : ""}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )
          )}
        </div>
      ) : tab ===
        "holds" ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900">
              Creează măsură de păstrare
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Folosește numai pentru un scop documentat, cu domeniu restrâns și dată de revizuire.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="text-sm font-semibold text-gray-800">
                  ID profil
                </span>
                <input
                  value={
                    holdForm.subjectProfileId
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        subjectProfileId:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Tip resursă
                </span>
                <select
                  value={
                    holdForm.resourceType
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        resourceType:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                >
                  {resourceTypes.map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  ID resursă
                </span>
                <input
                  value={
                    holdForm.resourceId
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        resourceId:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Categorie
                </span>
                <select
                  value={
                    holdForm.reasonCategory
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        reasonCategory:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                >
                  {reasonCategories.map(
                    (value) => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Referință
                </span>
                <input
                  value={
                    holdForm.referenceNumber
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        referenceNumber:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Revizuire la
                </span>
                <input
                  type="datetime-local"
                  value={
                    holdForm.reviewDueAt
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        reviewDueAt:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>

              <label>
                <span className="text-sm font-semibold text-gray-800">
                  Expiră la
                </span>
                <input
                  type="datetime-local"
                  value={
                    holdForm.expiresAt
                  }
                  onChange={(
                    event
                  ) =>
                    setHoldForm(
                      (
                        current
                      ) => ({
                        ...current,
                        expiresAt:
                          event.target.value,
                      })
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="text-sm font-semibold text-gray-800">
                Motiv documentat
              </span>
              <textarea
                value={
                  holdForm.reason
                }
                onChange={(
                  event
                ) =>
                  setHoldForm(
                    (
                      current
                    ) => ({
                      ...current,
                      reason:
                        event.target.value,
                    })
                  )
                }
                rows={4}
                maxLength={4000}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm"
              />
            </label>

            <button
              type="button"
              onClick={
                createLegalHold
              }
              disabled={
                isPending
              }
              className="mt-5 rounded-xl bg-[#036661] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#ff2800] disabled:opacity-50"
            >
              Creează măsura
            </button>
          </section>

          {legalHolds.map(
            (hold) => (
              <article
                key={hold.id}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">
                      {hold.reason_category}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {hold.resource_type}
                    </p>
                  </div>

                  <span className="inline-flex w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                    {hold.status}
                  </span>
                </div>

                <p className="mt-4 text-sm text-gray-700">
                  {hold.reason}
                </p>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-gray-500">
                      Profil
                    </dt>
                    <dd className="break-all font-medium">
                      {hold.subject_profile_id ??
                        "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      Revizuire
                    </dt>
                    <dd className="font-medium">
                      {formatDate(
                        hold.review_due_at
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">
                      Expirare
                    </dt>
                    <dd className="font-medium">
                      {formatDate(
                        hold.expires_at
                      )}
                    </dd>
                  </div>
                </dl>

                {hold.status ===
                  "active" && (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={
                        releaseReasons[
                          hold.id
                        ] ??
                        ""
                      }
                      onChange={(
                        event
                      ) =>
                        setReleaseReasons(
                          (
                            current
                          ) => ({
                            ...current,
                            [hold.id]:
                              event.target.value,
                          })
                        )
                      }
                      placeholder="Motivul eliberării"
                      className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        releaseLegalHold(
                          hold.id
                        )
                      }
                      disabled={
                        isPending
                      }
                      className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      Eliberează
                    </button>
                  </div>
                )}
              </article>
            )
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  Clasă
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Tip
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Stare
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Scanate
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Eligibile
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Păstrate
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Erori
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  Pornită
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {retentionRuns.map(
                (run) => (
                  <tr key={run.id}>
                    <td className="px-4 py-3">
                      {run.retention_class ??
                        "—"}
                    </td>
                    <td className="px-4 py-3">
                      {run.run_type}
                    </td>
                    <td className="px-4 py-3">
                      {run.status}
                    </td>
                    <td className="px-4 py-3">
                      {run.scanned_count}
                    </td>
                    <td className="px-4 py-3">
                      {run.eligible_count}
                    </td>
                    <td className="px-4 py-3">
                      {run.retained_count}
                    </td>
                    <td className="px-4 py-3">
                      {run.failed_count}
                    </td>
                    <td className="px-4 py-3">
                      {formatDate(
                        run.started_at
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
