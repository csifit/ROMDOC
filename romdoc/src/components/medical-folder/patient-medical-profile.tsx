"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MEDICAL_PROFILE_FIELDS,
  emptyMedicalProfileValue,
  medicalProfileFieldLabel,
  medicalProfileSummary,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
  type MedicalProfileValue,
} from "@/lib/patient-medical-profile";

type Props = {
  appointmentId?: string;
  editable?: boolean;
};

type ProfileResponse = {
  entries?: MedicalProfileEntry[];
  message?: string;
  error?: string;
};

const inputClasses =
  "romdoc-focus-ring mt-2 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900";

function formatAuditDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(value));
}

function textOrEmpty(
  value: string | undefined
) {
  return value?.trim() ||
    "Nu este completat.";
}

function fullValue(
  fieldKey: MedicalProfileFieldKey,
  value: MedicalProfileValue
) {
  switch (fieldKey) {
    case "date_of_birth":
      return (
        <div className="space-y-1">
          <p className="text-gray-900">
            {medicalProfileSummary(
              fieldKey,
              value
            )}
          </p>

          <p className="text-sm text-gray-500">
            VÃ¢rsta este calculatÄƒ automat.
          </p>
        </div>
      );

    case "sex":
      return (
        <p className="text-gray-900">
          {medicalProfileSummary(
            fieldKey,
            value
          )}
        </p>
      );

    case "blood_group": {
      const group =
        value.group || "NecunoscutÄƒ";
      const rh =
        value.rh === "positive"
          ? "Pozitiv"
          : value.rh === "negative"
            ? "Negativ"
            : "Necunoscut";

      return (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Grupa
            </dt>
            <dd className="mt-1 text-gray-900">
              {group === "unknown"
                ? "NecunoscutÄƒ"
                : group}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Factor Rh
            </dt>
            <dd className="mt-1 text-gray-900">
              {rh}
            </dd>
          </div>
        </dl>
      );
    }

    case "emergency_contact":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nume
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.name
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              RelaÈ›ie
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.relationship
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Telefon
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.phone
              )}
            </dd>
          </div>
        </dl>
      );

    case "family_doctor":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Nume
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.name
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Cabinet / clinicÄƒ
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.clinic
              )}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Telefon
            </dt>
            <dd className="mt-1 text-gray-900">
              {textOrEmpty(
                value.phone
              )}
            </dd>
          </div>
        </dl>
      );

    default:
      return (
        <p className="whitespace-pre-wrap text-gray-900">
          {textOrEmpty(
            value.text
          )}
        </p>
      );
  }
}

function FieldEditor({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: MedicalProfileFieldKey;
  value: MedicalProfileValue;
  onChange:
    (value: MedicalProfileValue) =>
      void;
}) {
  function setValue(
    key: string,
    nextValue: string
  ) {
    onChange({
      ...value,
      [key]: nextValue,
    });
  }

  switch (fieldKey) {
    case "date_of_birth":
      return (
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Data naÈ™terii
          </span>
          <input
            type="date"
            value={value.date ?? ""}
            onChange={(event) =>
              setValue(
                "date",
                event.target.value
              )
            }
            max={
              new Date()
                .toISOString()
                .slice(0, 10)
            }
            className={inputClasses}
          />
        </label>
      );

    case "sex":
      return (
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            Sex
          </span>
          <select
            value={value.sex ?? ""}
            onChange={(event) =>
              setValue(
                "sex",
                event.target.value
              )
            }
            className={inputClasses}
          >
            <option value="">
              Necompletat
            </option>
            <option value="male">
              Masculin
            </option>
            <option value="female">
              Feminin
            </option>
          </select>
        </label>
      );

    case "blood_group":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Grupa sanguinÄƒ
            </span>
            <select
              value={
                value.group ?? ""
              }
              onChange={(event) =>
                setValue(
                  "group",
                  event.target.value
                )
              }
              className={inputClasses}
            >
              <option value="">
                NecompletatÄƒ
              </option>
              <option value="A">
                A
              </option>
              <option value="B">
                B
              </option>
              <option value="AB">
                AB
              </option>
              <option value="O">
                O
              </option>
              <option value="unknown">
                NecunoscutÄƒ
              </option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Factor Rh
            </span>
            <select
              value={value.rh ?? ""}
              onChange={(event) =>
                setValue(
                  "rh",
                  event.target.value
                )
              }
              className={inputClasses}
            >
              <option value="">
                Necompletat
              </option>
              <option value="positive">
                Pozitiv
              </option>
              <option value="negative">
                Negativ
              </option>
              <option value="unknown">
                Necunoscut
              </option>
            </select>
          </label>
        </div>
      );

    case "emergency_contact":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Nume
            </span>
            <input
              type="text"
              value={
                value.name ?? ""
              }
              onChange={(event) =>
                setValue(
                  "name",
                  event.target.value
                )
              }
              maxLength={200}
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              RelaÈ›ie
            </span>
            <input
              type="text"
              value={
                value.relationship ??
                ""
              }
              onChange={(event) =>
                setValue(
                  "relationship",
                  event.target.value
                )
              }
              maxLength={100}
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Telefon
            </span>
            <input
              type="tel"
              value={
                value.phone ?? ""
              }
              onChange={(event) =>
                setValue(
                  "phone",
                  event.target.value
                )
              }
              maxLength={50}
              className={inputClasses}
            />
          </label>
        </div>
      );

    case "family_doctor":
      return (
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Nume
            </span>
            <input
              type="text"
              value={
                value.name ?? ""
              }
              onChange={(event) =>
                setValue(
                  "name",
                  event.target.value
                )
              }
              maxLength={200}
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Cabinet / clinicÄƒ
            </span>
            <input
              type="text"
              value={
                value.clinic ?? ""
              }
              onChange={(event) =>
                setValue(
                  "clinic",
                  event.target.value
                )
              }
              maxLength={200}
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              Telefon
            </span>
            <input
              type="tel"
              value={
                value.phone ?? ""
              }
              onChange={(event) =>
                setValue(
                  "phone",
                  event.target.value
                )
              }
              maxLength={50}
              className={inputClasses}
            />
          </label>
        </div>
      );

    default:
      return (
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {medicalProfileFieldLabel(
              fieldKey
            )}
          </span>
          <textarea
            value={value.text ?? ""}
            onChange={(event) =>
              setValue(
                "text",
                event.target.value
              )
            }
            rows={5}
            maxLength={5000}
            placeholder="CÃ¢te un element pe rÃ¢nd, dacÄƒ este cazul."
            className={`${inputClasses} resize-y`}
          />
        </label>
      );
  }
}

export default function PatientMedicalProfile({
  appointmentId,
  editable = false,
}: Props) {
  const [
    entries,
    setEntries,
  ] = useState<
    MedicalProfileEntry[]
  >([]);

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  const [
    editingField,
    setEditingField,
  ] = useState<
    MedicalProfileFieldKey | null
  >(null);

  const [
    draftValue,
    setDraftValue,
  ] = useState<
    MedicalProfileValue
  >({});

  const [
    savingField,
    setSavingField,
  ] = useState<
    MedicalProfileFieldKey | null
  >(null);

  const [
    error,
    setError,
  ] = useState("");

  const endpoint =
    useMemo(() => {
      if (!appointmentId) {
        return "/api/medical-folder/profile";
      }

      return `/api/medical-folder/profile?appointmentId=${encodeURIComponent(
        appointmentId
      )}`;
    }, [appointmentId]);

  const loadProfile =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            endpoint,
            {
              method: "GET",
              cache: "no-store",
            }
          );

        const payload =
          await response.json() as
            ProfileResponse;

        if (!response.ok) {
          throw new Error(
            payload.error ??
              "Profilul medical nu a putut fi Ã®ncÄƒrcat."
          );
        }

        setEntries(
          payload.entries ?? []
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Profilul medical nu a putut fi Ã®ncÄƒrcat."
        );
      } finally {
        setIsLoading(false);
      }
    }, [endpoint]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadProfile]);

  function startEditing(
    entry: MedicalProfileEntry
  ) {
    setEditingField(
      entry.fieldKey
    );
    setDraftValue({
      ...entry.value,
    });
    setError("");
  }

  async function saveField(
    fieldKey: MedicalProfileFieldKey
  ) {
    if (
      !editable ||
      !appointmentId
    ) {
      return;
    }

    setSavingField(fieldKey);
    setError("");

    try {
      const response =
        await fetch(
          "/api/medical-folder/profile",
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              appointmentId,
              fieldKey,
              value: draftValue,
            }),
          }
        );

      const payload =
        await response.json() as
          ProfileResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "InformaÈ›ia medicalÄƒ nu a putut fi salvatÄƒ."
        );
      }

      setEntries(
        payload.entries ?? []
      );
      setEditingField(null);
      setDraftValue({});
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "InformaÈ›ia medicalÄƒ nu a putut fi salvatÄƒ."
      );
    } finally {
      setSavingField(null);
    }
  }

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-5 sm:p-6">
        <p className="text-sm font-semibold text-[#036661]">
          InformaÈ›ii esenÈ›iale
        </p>

        <h2 className="mt-1 text-2xl font-bold text-gray-900">
          Profil medical
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Deschide fiecare secÈ›iune pentru a vedea informaÈ›iile complete.
          {editable
            ? " PoÈ›i modifica fiecare secÈ›iune separat."
            : ""}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:m-6"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-6 text-sm text-gray-600">
          Se Ã®ncarcÄƒ profilul medical...
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {MEDICAL_PROFILE_FIELDS.map(
            (field) => {
              const entry =
                entries.find(
                  (item) =>
                    item.fieldKey ===
                    field.key
                ) ?? {
                  fieldKey:
                    field.key,
                  value:
                    emptyMedicalProfileValue(
                      field.key
                    ),
                  lastModifiedByDoctor:
                    null,
                  lastModifiedAt:
                    null,
                };

              const isEditing =
                editingField ===
                field.key;

              return (
                <details
                  key={field.key}
                  className="group"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#036661] sm:px-6 [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900">
                        {field.label}
                      </span>

                      <span className="mt-1 block truncate text-sm text-gray-500">
                        {medicalProfileSummary(
                          field.key,
                          entry.value
                        )}
                      </span>
                    </span>

                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="none"
                      className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-open:rotate-180"
                    >
                      <path
                        d="m5 7.5 5 5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </summary>

                  <div className="border-t border-gray-100 bg-gray-50/60 px-5 py-5 sm:px-6">
                    {isEditing ? (
                      <div>
                        <FieldEditor
                          fieldKey={
                            field.key
                          }
                          value={
                            draftValue
                          }
                          onChange={
                            setDraftValue
                          }
                        />

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              void saveField(
                                field.key
                              )
                            }
                            disabled={
                              savingField ===
                              field.key
                            }
                            className="romdoc-button romdoc-button-primary romdoc-button-sm"
                          >
                            {savingField ===
                            field.key
                              ? "Se salveazÄƒ..."
                              : "SalveazÄƒ"}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingField(
                                null
                              );
                              setDraftValue(
                                {}
                              );
                              setError("");
                            }}
                            disabled={
                              savingField ===
                              field.key
                            }
                            className="romdoc-button romdoc-button-secondary romdoc-button-sm"
                          >
                            RenunÈ›Äƒ
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {fullValue(
                          field.key,
                          entry.value
                        )}

                        <div className="mt-4 flex flex-col justify-between gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center">
                          <p className="text-xs text-gray-500">
                            {entry.lastModifiedByDoctor &&
                            entry.lastModifiedAt
                              ? `Ultima modificare de ${entry.lastModifiedByDoctor}, la ${formatAuditDate(
                                  entry.lastModifiedAt
                                )}.`
                              : "Nu existÄƒ Ã®ncÄƒ modificÄƒri Ã®nregistrate."}
                          </p>

                          {editable && (
                            <button
                              type="button"
                              onClick={() =>
                                startEditing(
                                  entry
                                )
                              }
                              className="w-fit text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                            >
                              EditeazÄƒ
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </details>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

