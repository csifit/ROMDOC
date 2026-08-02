"use client";

import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import EmergencyMedicalSummary from "@/components/medical-folder/emergency-medical-summary";
import {
  type AppLocale,
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  MEDICAL_PROFILE_FIELDS,
  calculateAge,
  emptyMedicalProfileValue,
  isClinicalMedicalProfileField,
  isPatientDeclarationField,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
  type MedicalProfileModifierRole,
  type MedicalProfilePatientIdentity,
  type MedicalProfilePermissions,
  type MedicalProfileValue,
  type OrganDonationPreference,
} from "@/lib/patient-medical-profile";

type Props = {
  appointmentId?: string;
  editable?: boolean;
};

type ProfileResponse = {
  entries?: MedicalProfileEntry[];
  patient?: MedicalProfilePatientIdentity;
  permissions?: MedicalProfilePermissions;
  message?: string;
  error?: string;
};

const inputClasses =
  "romdoc-focus-ring mt-[8px] w-full rounded-[13px] border border-gray-300 bg-white px-[13px] py-[13px] text-sm text-gray-900";

const INTL_LOCALE:
  Record<AppLocale, string> = {
    ro: "ro-RO",
    en: "en-GB",
    de: "de-DE",
  };

function formatDateValue(
  value: string,
  locale: AppLocale
) {
  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}

function formatAuditDate(
  value: string,
  locale: AppLocale
) {
  return new Intl.DateTimeFormat(
    INTL_LOCALE[locale],
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
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
  const t =
    useTranslations(
      "PatientPages.folder.profile"
    );

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
            {t(
              "fields.date_of_birth"
            )}
          </span>

          <input
            type="date"
            value={
              value.date ?? ""
            }
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
            {t(
              "fields.sex"
            )}
          </span>

          <select
            value={
              value.sex ?? ""
            }
            onChange={(event) =>
              setValue(
                "sex",
                event.target.value
              )
            }
            className={inputClasses}
          >
            <option value="">
              {t(
                "notCompletedShort"
              )}
            </option>

            <option value="male">
              {t("male")}
            </option>

            <option value="female">
              {t("female")}
            </option>
          </select>
        </label>
      );

    case "blood_group":
      return (
        <div className="grid gap-[13px] sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "fields.blood_group"
              )}
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
                {t(
                  "notCompletedShort"
                )}
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
                {t(
                  "unknownFeminine"
                )}
              </option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "rhFactor"
              )}
            </span>

            <select
              value={
                value.rh ?? ""
              }
              onChange={(event) =>
                setValue(
                  "rh",
                  event.target.value
                )
              }
              className={inputClasses}
            >
              <option value="">
                {t(
                  "notCompletedShort"
                )}
              </option>

              <option value="positive">
                {t("positive")}
              </option>

              <option value="negative">
                {t("negative")}
              </option>

              <option value="unknown">
                {t(
                  "unknownMasculine"
                )}
              </option>
            </select>
          </label>
        </div>
      );

    case "emergency_contact":
      return (
        <div className="grid gap-[13px] sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t("name")}
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
              {t(
                "relationship"
              )}
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
              {t("phone")}
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
        <div className="grid gap-[13px] sm:grid-cols-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t("name")}
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
              {t("clinic")}
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
              {t("phone")}
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

    case "organ_donation_preference":
      return (
        <div>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700">
              {t(
                "fields.organ_donation_preference"
              )}
            </span>

            <select
              value={
                value.preference ??
                "not_specified"
              }
              onChange={(event) =>
                setValue(
                  "preference",
                  event.target.value
                )
              }
              className={inputClasses}
            >
              <option value="not_specified">
                {t(
                  "organDonation.values.not_specified"
                )}
              </option>

              <option value="wishes_to_donate">
                {t(
                  "organDonation.values.wishes_to_donate"
                )}
              </option>

              <option value="does_not_wish_to_donate">
                {t(
                  "organDonation.values.does_not_wish_to_donate"
                )}
              </option>

              <option value="undecided">
                {t(
                  "organDonation.values.undecided"
                )}
              </option>
            </select>
          </label>

          <p className="mt-[8px] text-xs leading-5 text-blue-900">
            {t(
              "organDonation.declarationNotice"
            )}
          </p>
        </div>
      );

    default:
      return (
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">
            {t(
              `fields.${fieldKey}`
            )}
          </span>

          <textarea
            value={
              value.text ?? ""
            }
            onChange={(event) =>
              setValue(
                "text",
                event.target.value
              )
            }
            rows={
              fieldKey ===
              "medical_alerts"
                ? 4
                : 5
            }
            maxLength={5000}
            placeholder={
              fieldKey ===
              "medical_alerts"
                ? t(
                    "medicalAlertsPlaceholder"
                  )
                : t(
                    "listPlaceholder"
                  )
            }
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
  const locale =
    normalizeAppLocale(
      useLocale()
    );

  const t =
    useTranslations(
      "PatientPages.folder.profile"
    );

  const [
    entries,
    setEntries,
  ] = useState<
    MedicalProfileEntry[]
  >([]);

  const [
    patient,
    setPatient,
  ] = useState<
    MedicalProfilePatientIdentity | null
  >(null);

  const [
    permissions,
    setPermissions,
  ] = useState<
    MedicalProfilePermissions | null
  >(null);

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

  const legacyDoctorEditing =
    Boolean(
      editable &&
      appointmentId
    );

  const viewerRole =
    permissions?.viewerRole ??
    (
      legacyDoctorEditing
        ? "doctor"
        : appointmentId
          ? "staff"
          : "patient"
    );

  const canEditClinicalFields =
    permissions
      ?.canEditClinicalFields ??
    legacyDoctorEditing;

  const canEditOrganDonationPreference =
    permissions
      ?.canEditOrganDonationPreference ??
    false;

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
            locale === "ro" &&
            payload.error
              ? payload.error
              : t(
                  "loadError"
                )
          );
        }

        setEntries(
          payload.entries ?? []
        );

        setPatient(
          payload.patient ?? null
        );

        setPermissions(
          payload.permissions ??
          null
        );
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : t(
                "loadError"
              )
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      endpoint,
      locale,
      t,
    ]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function canEditField(
    fieldKey: MedicalProfileFieldKey
  ) {
    if (
      isPatientDeclarationField(
        fieldKey
      )
    ) {
      return (
        canEditOrganDonationPreference
      );
    }

    if (
      isClinicalMedicalProfileField(
        fieldKey
      )
    ) {
      return (
        canEditClinicalFields &&
        Boolean(appointmentId)
      );
    }

    return false;
  }

  function startEditing(
    entry: MedicalProfileEntry
  ) {
    if (
      !canEditField(
        entry.fieldKey
      )
    ) {
      return;
    }

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
      !canEditField(
        fieldKey
      )
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
          locale === "ro" &&
          payload.error
            ? payload.error
            : t(
                "saveError"
              )
        );
      }

      setEntries(
        payload.entries ?? []
      );

      setPatient(
        payload.patient ??
        patient
      );

      setPermissions(
        payload.permissions ??
        permissions
      );

      setEditingField(null);
      setDraftValue({});
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t(
              "saveError"
            )
      );
    } finally {
      setSavingField(null);
    }
  }

  function getOrganDonationLabel(
    value: MedicalProfileValue
  ) {
    const preference =
      (
        value.preference ??
        "not_specified"
      ) as
        OrganDonationPreference;

    return t(
      `organDonation.values.${preference}`
    );
  }

  function getSummary(
    fieldKey: MedicalProfileFieldKey,
    value: MedicalProfileValue
  ) {
    switch (fieldKey) {
      case "date_of_birth": {
        const date =
          value.date ?? "";

        if (!date) {
          return t(
            "notCompletedShort"
          );
        }

        const age =
          calculateAge(date);

        const formattedDate =
          formatDateValue(
            date,
            locale
          );

        return age === null
          ? formattedDate
          : t(
              "dateWithAge",
              {
                date:
                  formattedDate,
                age,
              }
            );
      }

      case "sex":
        if (
          value.sex === "male"
        ) {
          return t("male");
        }

        if (
          value.sex === "female"
        ) {
          return t("female");
        }

        return t(
          "notCompletedShort"
        );

      case "blood_group": {
        const group =
          value.group ?? "";

        const rh =
          value.rh ?? "";

        if (
          !group ||
          group === "unknown"
        ) {
          return t(
            "unknownFeminine"
          );
        }

        if (
          !rh ||
          rh === "unknown"
        ) {
          return t(
            "rhUnknown",
            {
              group,
            }
          );
        }

        return `${group}${
          rh === "positive"
            ? "+"
            : "-"
        }`;
      }

      case "emergency_contact":
      case "family_doctor":
        return (
          value.name ||
          t(
            "notCompletedShort"
          )
        );

      case "organ_donation_preference":
        return (
          getOrganDonationLabel(
            value
          )
        );

      default: {
        const text =
          value.text?.trim() ?? "";

        if (!text) {
          return t(
            "notCompletedShort"
          );
        }

        const firstLine =
          text.split("\n")[0];

        return firstLine.length > 90
          ? `${firstLine.slice(0, 87)}...`
          : firstLine;
      }
    }
  }

  function textOrEmpty(
    value: string | undefined
  ) {
    return (
      value?.trim() ||
      t(
        "notCompleted"
      )
    );
  }

  function renderFullValue(
    fieldKey: MedicalProfileFieldKey,
    value: MedicalProfileValue
  ) {
    switch (fieldKey) {
      case "date_of_birth":
        return (
          <div className="space-y-[5px]">
            <p className="text-gray-900">
              {getSummary(
                fieldKey,
                value
              )}
            </p>

            <p className="text-sm text-gray-500">
              {t(
                "ageAutomatic"
              )}
            </p>
          </div>
        );

      case "sex":
        return (
          <p className="text-gray-900">
            {getSummary(
              fieldKey,
              value
            )}
          </p>
        );

      case "blood_group": {
        const group =
          value.group ||
          t(
            "unknownFeminine"
          );

        const rh =
          value.rh === "positive"
            ? t("positive")
            : value.rh === "negative"
              ? t("negative")
              : t(
                  "unknownMasculine"
                );

        return (
          <dl className="grid gap-[13px] sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("group")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {group === "unknown"
                  ? t(
                      "unknownFeminine"
                    )
                  : group}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "rhFactor"
                )}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {rh}
              </dd>
            </div>
          </dl>
        );
      }

      case "emergency_contact":
        return (
          <dl className="grid gap-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("name")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.name
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t(
                  "relationship"
                )}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.relationship
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("phone")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.phone
                )}
              </dd>
            </div>
          </dl>
        );

      case "family_doctor":
        return (
          <dl className="grid gap-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("name")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.name
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("clinic")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.clinic
                )}
              </dd>
            </div>

            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {t("phone")}
              </dt>

              <dd className="mt-[5px] text-gray-900">
                {textOrEmpty(
                  value.phone
                )}
              </dd>
            </div>
          </dl>
        );

      case "medical_alerts": {
        const text =
          value.text?.trim() ?? "";

        return (
          <div
            className={
              text
                ? "rounded-[13px] border border-red-300 bg-red-50 p-[13px]"
                : "rounded-[13px] border border-emerald-200 bg-emerald-50 p-[13px]"
            }
          >
            <p
              className={
                text
                  ? "whitespace-pre-wrap text-sm font-semibold leading-6 text-red-950"
                  : "text-sm font-semibold leading-6 text-emerald-950"
              }
            >
              {text ||
                t(
                  "emergencySummary.noMedicalAlerts"
                )}
            </p>
          </div>
        );
      }

      case "organ_donation_preference":
        return (
          <div className="rounded-[13px] border border-blue-200 bg-blue-50 p-[13px]">
            <p className="font-semibold text-blue-950">
              {getOrganDonationLabel(
                value
              )}
            </p>

            <p className="mt-[8px] text-xs leading-5 text-blue-900">
              {t(
                "organDonation.declarationNotice"
              )}
            </p>
          </div>
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

  function modifierRoleLabel(
    role:
      MedicalProfileModifierRole
  ) {
    switch (role) {
      case "patient":
      case "doctor":
      case "staff":
      case "admin":
      case "manager":
      case "clinic_manager":
      case "doctor_applicant":
        return t(
          `modifierRoles.${role}`
        );

      default:
        return t(
          "modifierRoles.unknown"
        );
    }
  }

  const descriptionKey =
    canEditClinicalFields
      ? "doctorEditableDescription"
      : canEditOrganDonationPreference
        ? "patientEditableDescription"
        : "readOnlyDescription";

  return (
    <section className="mt-[34px] overflow-hidden rounded-[21px] border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-[21px] sm:p-[34px]">
        <p className="text-sm font-semibold text-[#036661]">
          {t("eyebrow")}
        </p>

        <h2 className="mt-[5px] text-2xl font-bold text-gray-900">
          {t("title")}
        </h2>

        <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}{" "}
          {t(
            descriptionKey
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="m-[21px] rounded-[13px] border border-red-200 bg-red-50 p-[13px] text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="p-[21px] text-sm text-gray-600">
          {t("loading")}
        </div>
      ) : (
        <>
          <EmergencyMedicalSummary
            entries={entries}
            patient={patient}
            locale={locale}
          />

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
                    lastModifiedByName:
                      null,
                    lastModifiedByRole:
                      null,
                    lastModifiedAt:
                      null,
                  };

                const isEditing =
                  editingField ===
                  field.key;

                const fieldIsEditable =
                  canEditField(
                    field.key
                  );

                const isMedicalAlert =
                  field.key ===
                  "medical_alerts";

                const isPatientDeclaration =
                  field.key ===
                  "organ_donation_preference";

                return (
                  <details
                    key={field.key}
                    className="group"
                  >
                    <summary
                      className={
                        isMedicalAlert
                          ? "flex cursor-pointer list-none items-center justify-between gap-[13px] bg-red-50 px-[21px] py-[13px] transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-600 [&::-webkit-details-marker]:hidden"
                          : isPatientDeclaration
                            ? "flex cursor-pointer list-none items-center justify-between gap-[13px] bg-blue-50 px-[21px] py-[13px] transition-colors hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 [&::-webkit-details-marker]:hidden"
                            : "flex cursor-pointer list-none items-center justify-between gap-[13px] px-[21px] py-[13px] transition-colors hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#036661] [&::-webkit-details-marker]:hidden"
                      }
                    >
                      <span className="min-w-0">
                        <span
                          className={
                            isMedicalAlert
                              ? "block font-semibold text-red-950"
                              : isPatientDeclaration
                                ? "block font-semibold text-blue-950"
                                : "block font-semibold text-gray-900"
                          }
                        >
                          {t(
                            `fields.${field.key}`
                          )}
                        </span>

                        <span
                          className={
                            isMedicalAlert
                              ? "mt-[5px] block truncate text-sm text-red-800"
                              : isPatientDeclaration
                                ? "mt-[5px] block truncate text-sm text-blue-800"
                                : "mt-[5px] block truncate text-sm text-gray-500"
                          }
                        >
                          {getSummary(
                            field.key,
                            entry.value
                          )}
                        </span>
                      </span>

                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="h-[21px] w-[21px] shrink-0 text-gray-500 transition-transform group-open:rotate-180"
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

                    <div className="border-t border-gray-100 bg-gray-50/60 px-[21px] py-[21px]">
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

                          <div className="mt-[13px] flex flex-wrap gap-[8px]">
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
                                ? t(
                                    "saving"
                                  )
                                : t(
                                    "save"
                                  )}
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
                              {t(
                                "cancel"
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {renderFullValue(
                            field.key,
                            entry.value
                          )}

                          <div className="mt-[13px] flex flex-col justify-between gap-[13px] border-t border-gray-200 pt-[13px] sm:flex-row sm:items-center">
                            <p className="text-xs text-gray-500">
                              {entry.lastModifiedAt
                                ? entry.lastModifiedByName
                                  ? t(
                                      "lastModifiedWithRole",
                                      {
                                        name:
                                          entry.lastModifiedByName,
                                        role:
                                          modifierRoleLabel(
                                            entry.lastModifiedByRole
                                          ),
                                        date:
                                          formatAuditDate(
                                            entry.lastModifiedAt,
                                            locale
                                          ),
                                      }
                                    )
                                  : t(
                                      "lastModified",
                                      {
                                        name:
                                          modifierRoleLabel(
                                            entry.lastModifiedByRole
                                          ),
                                        date:
                                          formatAuditDate(
                                            entry.lastModifiedAt,
                                            locale
                                          ),
                                      }
                                    )
                                : t(
                                    "noChanges"
                                  )}
                            </p>

                            {fieldIsEditable && (
                              <button
                                type="button"
                                onClick={() =>
                                  startEditing(
                                    entry
                                  )
                                }
                                className="w-fit text-sm font-semibold text-[#036661] underline-offset-4 hover:underline"
                              >
                                {t(
                                  "edit"
                                )}
                              </button>
                            )}
                          </div>

                          {isPatientDeclaration &&
                            viewerRole !==
                              "patient" && (
                              <p className="mt-[13px] text-xs leading-5 text-blue-900">
                                {t(
                                  "organDonation.readOnlyForProfessionals"
                                )}
                              </p>
                            )}
                        </>
                      )}
                    </div>
                  </details>
                );
              }
            )}
          </div>
        </>
      )}
    </section>
  );
}
