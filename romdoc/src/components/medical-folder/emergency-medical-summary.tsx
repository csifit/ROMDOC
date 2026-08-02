"use client";

import {
  useTranslations,
} from "next-intl";
import {
  useMemo,
} from "react";

import {
  calculateAge,
  type MedicalProfileEntry,
  type MedicalProfileFieldKey,
  type MedicalProfilePatientIdentity,
  type MedicalProfileValue,
  type OrganDonationPreference,
} from "@/lib/patient-medical-profile";
import {
  type AppLocale,
} from "@/lib/i18n/app-locale";

type Props = {
  entries: MedicalProfileEntry[];
  patient: MedicalProfilePatientIdentity | null;
  locale: AppLocale;
};

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

function compactText(
  value: string | undefined,
  fallback: string
) {
  const cleaned =
    value?.trim() ?? "";

  if (!cleaned) {
    return fallback;
  }

  const singleLine =
    cleaned
      .split("\n")
      .map(
        (line) =>
          line.trim()
      )
      .filter(Boolean)
      .join(" · ");

  return singleLine.length > 180
    ? `${singleLine.slice(0, 177)}...`
    : singleLine;
}

export default function EmergencyMedicalSummary({
  entries,
  patient,
  locale,
}: Props) {
  const t =
    useTranslations(
      "PatientPages.folder.profile"
    );

  const values =
    useMemo(() => {
      const map =
        new Map<
          MedicalProfileFieldKey,
          MedicalProfileValue
        >();

      for (const entry of entries) {
        map.set(
          entry.fieldKey,
          entry.value
        );
      }

      return map;
    }, [entries]);

  function valueFor(
    fieldKey: MedicalProfileFieldKey
  ) {
    return (
      values.get(fieldKey) ??
      {}
    );
  }

  function textFor(
    fieldKey: MedicalProfileFieldKey
  ) {
    return compactText(
      valueFor(fieldKey).text,
      t(
        "notCompletedShort"
      )
    );
  }

  const birthDate =
    valueFor(
      "date_of_birth"
    ).date ?? "";

  const birthDateSummary =
    birthDate
      ? (() => {
          const age =
            calculateAge(
              birthDate
            );

          const formatted =
            formatDateValue(
              birthDate,
              locale
            );

          return age === null
            ? formatted
            : t(
                "dateWithAge",
                {
                  date:
                    formatted,
                  age,
                }
              );
        })()
      : t(
          "notCompletedShort"
        );

  const sex =
    valueFor(
      "sex"
    ).sex ?? "";

  const sexSummary =
    sex === "male"
      ? t("male")
      : sex === "female"
        ? t("female")
        : t(
            "notCompletedShort"
          );

  const blood =
    valueFor(
      "blood_group"
    );

  const bloodSummary =
    !blood.group ||
    blood.group === "unknown"
      ? t(
          "unknownFeminine"
        )
      : !blood.rh ||
          blood.rh === "unknown"
        ? t(
            "rhUnknown",
            {
              group:
                blood.group,
            }
          )
        : `${blood.group}${
            blood.rh ===
            "positive"
              ? "+"
              : "-"
          }`;

  const medicalAlerts =
    valueFor(
      "medical_alerts"
    ).text?.trim() ?? "";

  const emergencyContact =
    valueFor(
      "emergency_contact"
    );

  const emergencyContactSummary =
    [
      emergencyContact.name,
      emergencyContact.relationship,
      emergencyContact.phone,
    ]
      .map(
        (item) =>
          item?.trim()
      )
      .filter(Boolean)
      .join(" · ") ||
    t(
      "notCompletedShort"
    );

  const familyDoctor =
    valueFor(
      "family_doctor"
    );

  const familyDoctorSummary =
    [
      familyDoctor.name,
      familyDoctor.clinic,
      familyDoctor.phone,
    ]
      .map(
        (item) =>
          item?.trim()
      )
      .filter(Boolean)
      .join(" · ") ||
    t(
      "notCompletedShort"
    );

  const donationPreference =
    (
      valueFor(
        "organ_donation_preference"
      ).preference ??
      "not_specified"
    ) as
      OrganDonationPreference;

  const donationSummary =
    t(
      `organDonation.values.${donationPreference}`
    );

  const summaryItems = [
    {
      label:
        t(
          "emergencySummary.legalName"
        ),
      value:
        patient?.legalName ||
        t(
          "notCompletedShort"
        ),
    },
    {
      label:
        t(
          "fields.date_of_birth"
        ),
      value:
        birthDateSummary,
    },
    {
      label:
        t(
          "fields.sex"
        ),
      value:
        sexSummary,
    },
    {
      label:
        t(
          "fields.blood_group"
        ),
      value:
        bloodSummary,
    },
    {
      label:
        t(
          "fields.allergies"
        ),
      value:
        textFor(
          "allergies"
        ),
    },
    {
      label:
        t(
          "fields.current_medications"
        ),
      value:
        textFor(
          "current_medications"
        ),
    },
    {
      label:
        t(
          "fields.chronic_conditions"
        ),
      value:
        textFor(
          "chronic_conditions"
        ),
    },
    {
      label:
        t(
          "fields.implants_and_medical_devices"
        ),
      value:
        textFor(
          "implants_and_medical_devices"
        ),
    },
    {
      label:
        t(
          "fields.emergency_contact"
        ),
      value:
        emergencyContactSummary,
    },
    {
      label:
        t(
          "fields.family_doctor"
        ),
      value:
        familyDoctorSummary,
    },
  ];

  return (
    <section className="border-b border-gray-200 bg-slate-50 px-[21px] py-[21px] sm:px-[34px] sm:py-[34px]">
      <div className="flex flex-col justify-between gap-[13px] sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            {t(
              "emergencySummary.eyebrow"
            )}
          </p>

          <h3 className="mt-[5px] text-xl font-bold text-gray-900">
            {t(
              "emergencySummary.title"
            )}
          </h3>

          <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">
            {t(
              "emergencySummary.description"
            )}
          </p>
        </div>
      </div>

      <div
        className={
          medicalAlerts
            ? "mt-[21px] rounded-[13px] border border-red-300 bg-red-50 p-[17px]"
            : "mt-[21px] rounded-[13px] border border-emerald-200 bg-emerald-50 p-[17px]"
        }
      >
        <p
          className={
            medicalAlerts
              ? "text-xs font-bold uppercase tracking-[0.12em] text-red-800"
              : "text-xs font-bold uppercase tracking-[0.12em] text-emerald-800"
          }
        >
          {t(
            "fields.medical_alerts"
          )}
        </p>

        <p
          className={
            medicalAlerts
              ? "mt-[8px] whitespace-pre-wrap text-sm font-semibold leading-6 text-red-950"
              : "mt-[8px] text-sm font-semibold leading-6 text-emerald-950"
          }
        >
          {medicalAlerts ||
            t(
              "emergencySummary.noMedicalAlerts"
            )}
        </p>
      </div>

      <dl className="mt-[21px] grid gap-[13px] sm:grid-cols-2 xl:grid-cols-3">
        {summaryItems.map(
          (item) => (
            <div
              key={item.label}
              className="rounded-[13px] border border-gray-200 bg-white p-[17px]"
            >
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {item.label}
              </dt>

              <dd className="mt-[8px] text-sm leading-6 text-gray-900">
                {item.value}
              </dd>
            </div>
          )
        )}

        <div className="rounded-[13px] border border-blue-200 bg-blue-50 p-[17px] sm:col-span-2 xl:col-span-1">
          <dt className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            {t(
              "fields.organ_donation_preference"
            )}
          </dt>

          <dd className="mt-[8px] text-sm font-semibold leading-6 text-blue-950">
            {donationSummary}
          </dd>

          <p className="mt-[8px] text-xs leading-5 text-blue-900">
            {t(
              "organDonation.declarationNotice"
            )}
          </p>
        </div>
      </dl>

      <div className="mt-[21px] rounded-[13px] border border-amber-200 bg-amber-50 p-[13px] text-xs leading-5 text-amber-950">
        {t(
          "emergencySummary.officialRecordDisclaimer"
        )}
      </div>
    </section>
  );
}
