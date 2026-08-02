export const MEDICAL_PROFILE_FIELDS = [
  {
    key: "date_of_birth",
    label: "Data nașterii",
  },
  {
    key: "sex",
    label: "Sex",
  },
  {
    key: "blood_group",
    label: "Grupa sanguină",
  },
  {
    key: "medical_alerts",
    label: "Alerte medicale",
  },
  {
    key: "allergies",
    label: "Alergii",
  },
  {
    key: "current_medications",
    label: "Medicamente curente",
  },
  {
    key: "chronic_conditions",
    label: "Afecțiuni cronice",
  },
  {
    key: "previous_surgeries",
    label: "Intervenții chirurgicale anterioare",
  },
  {
    key: "implants_and_medical_devices",
    label: "Implanturi și dispozitive medicale",
  },
  {
    key: "emergency_contact",
    label: "Contact de urgență",
  },
  {
    key: "family_doctor",
    label: "Medic de familie",
  },
  {
    key: "organ_donation_preference",
    label: "Preferință privind donarea de organe",
  },
] as const;

/**
 * Backwards-compatible export retained for code installed during Step 88A.1.
 * New code should use MEDICAL_PROFILE_FIELDS.
 */
export const EXPANDED_MEDICAL_PROFILE_FIELDS =
  MEDICAL_PROFILE_FIELDS;

export type MedicalProfileFieldKey =
  (typeof EXPANDED_MEDICAL_PROFILE_FIELDS)[number]["key"];

export type MedicalProfileValue =
  Record<string, string>;

export type MedicalProfileModifierRole =
  | "patient"
  | "doctor"
  | "staff"
  | "admin"
  | "manager"
  | "clinic_manager"
  | "doctor_applicant"
  | null;

export type MedicalProfileEntry = {
  fieldKey: MedicalProfileFieldKey;
  value: MedicalProfileValue;
  lastModifiedByName: string | null;
  lastModifiedByRole: MedicalProfileModifierRole;
  lastModifiedAt: string | null;
};

export type MedicalProfilePatientIdentity = {
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  legalName: string;
};

export type MedicalProfileViewerRole =
  | "patient"
  | "doctor"
  | "staff";

export type MedicalProfilePermissions = {
  viewerRole: MedicalProfileViewerRole;
  canEditClinicalFields: boolean;
  canEditOrganDonationPreference: boolean;
};

export const ORGAN_DONATION_PREFERENCES = [
  "not_specified",
  "wishes_to_donate",
  "does_not_wish_to_donate",
  "undecided",
] as const;

export type OrganDonationPreference =
  (typeof ORGAN_DONATION_PREFERENCES)[number];

export const CLINICAL_MEDICAL_PROFILE_FIELD_KEYS =
  new Set<MedicalProfileFieldKey>([
    "date_of_birth",
    "sex",
    "blood_group",
    "medical_alerts",
    "allergies",
    "current_medications",
    "chronic_conditions",
    "previous_surgeries",
    "implants_and_medical_devices",
    "emergency_contact",
    "family_doctor",
  ]);

export const PATIENT_DECLARATION_FIELD_KEYS =
  new Set<MedicalProfileFieldKey>([
    "organ_donation_preference",
  ]);

const TEXT_FIELD_KEYS =
  new Set<MedicalProfileFieldKey>([
    "medical_alerts",
    "allergies",
    "current_medications",
    "chronic_conditions",
    "previous_surgeries",
    "implants_and_medical_devices",
  ]);

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      !Array.isArray(value)
  );
}

function cleanText(
  value: unknown,
  maximumLength: number
) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maximumLength);
}

function validDate(value: string) {
  if (!value) {
    return true;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const date =
    new Date(`${value}T12:00:00`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) ===
      value
  );
}

export function isMedicalProfileFieldKey(
  value: unknown
): value is MedicalProfileFieldKey {
  return (
    typeof value === "string" &&
    MEDICAL_PROFILE_FIELDS.some(
      (field) => field.key === value
    )
  );
}

export function isClinicalMedicalProfileField(
  fieldKey: MedicalProfileFieldKey
) {
  return CLINICAL_MEDICAL_PROFILE_FIELD_KEYS.has(
    fieldKey
  );
}

export function isPatientDeclarationField(
  fieldKey: MedicalProfileFieldKey
) {
  return PATIENT_DECLARATION_FIELD_KEYS.has(
    fieldKey
  );
}

export function emptyMedicalProfileValue(
  fieldKey: MedicalProfileFieldKey
): MedicalProfileValue {
  switch (fieldKey) {
    case "date_of_birth":
      return { date: "" };

    case "sex":
      return { sex: "" };

    case "blood_group":
      return {
        group: "",
        rh: "",
      };

    case "emergency_contact":
      return {
        name: "",
        relationship: "",
        phone: "",
      };

    case "family_doctor":
      return {
        name: "",
        clinic: "",
        phone: "",
      };

    case "organ_donation_preference":
      return {
        preference:
          "not_specified",
      };

    default:
      return { text: "" };
  }
}

export function validateMedicalProfileValue(
  fieldKey: MedicalProfileFieldKey,
  input: unknown
):
  | {
      value: MedicalProfileValue;
      error: null;
    }
  | {
      value: null;
      error: string;
    } {
  if (!isPlainObject(input)) {
    return {
      value: null,
      error:
        "Valoarea profilului medical nu este validă.",
    };
  }

  if (fieldKey === "date_of_birth") {
    const date =
      cleanText(input.date, 10);

    if (!validDate(date)) {
      return {
        value: null,
        error:
          "Data nașterii nu este validă.",
      };
    }

    if (
      date &&
      new Date(`${date}T12:00:00`) >
        new Date()
    ) {
      return {
        value: null,
        error:
          "Data nașterii nu poate fi în viitor.",
      };
    }

    return {
      value: { date },
      error: null,
    };
  }

  if (fieldKey === "sex") {
    const sex =
      cleanText(input.sex, 10);

    if (
      sex &&
      sex !== "male" &&
      sex !== "female"
    ) {
      return {
        value: null,
        error:
          "Sexul trebuie să fie masculin sau feminin.",
      };
    }

    return {
      value: { sex },
      error: null,
    };
  }

  if (fieldKey === "blood_group") {
    const group =
      cleanText(input.group, 10);
    const rh =
      cleanText(input.rh, 10);

    if (
      group &&
      ![
        "A",
        "B",
        "AB",
        "O",
        "unknown",
      ].includes(group)
    ) {
      return {
        value: null,
        error:
          "Grupa sanguină nu este validă.",
      };
    }

    if (
      rh &&
      ![
        "positive",
        "negative",
        "unknown",
      ].includes(rh)
    ) {
      return {
        value: null,
        error:
          "Factorul Rh nu este valid.",
      };
    }

    return {
      value: {
        group,
        rh,
      },
      error: null,
    };
  }

  if (TEXT_FIELD_KEYS.has(fieldKey)) {
    return {
      value: {
        text: cleanText(
          input.text,
          5000
        ),
      },
      error: null,
    };
  }

  if (fieldKey === "emergency_contact") {
    return {
      value: {
        name: cleanText(
          input.name,
          200
        ),
        relationship: cleanText(
          input.relationship,
          100
        ),
        phone: cleanText(
          input.phone,
          50
        ),
      },
      error: null,
    };
  }

  if (fieldKey === "family_doctor") {
    return {
      value: {
        name: cleanText(
          input.name,
          200
        ),
        clinic: cleanText(
          input.clinic,
          200
        ),
        phone: cleanText(
          input.phone,
          50
        ),
      },
      error: null,
    };
  }

  if (
    fieldKey ===
    "organ_donation_preference"
  ) {
    const preference =
      cleanText(
        input.preference,
        40
      ) ||
      "not_specified";

    if (
      !ORGAN_DONATION_PREFERENCES.includes(
        preference as
          OrganDonationPreference
      )
    ) {
      return {
        value: null,
        error:
          "Preferința privind donarea de organe nu este validă.",
      };
    }

    return {
      value: {
        preference,
      },
      error: null,
    };
  }

  return {
    value: null,
    error:
      "Secțiunea profilului medical nu este validă.",
  };
}

export function calculateAge(
  dateValue: string
) {
  if (!validDate(dateValue)) {
    return null;
  }

  const birthDate =
    new Date(`${dateValue}T12:00:00`);
  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const birthdayHasPassed =
    today.getMonth() >
      birthDate.getMonth() ||
    (
      today.getMonth() ===
        birthDate.getMonth() &&
      today.getDate() >=
        birthDate.getDate()
    );

  if (!birthdayHasPassed) {
    age -= 1;
  }

  return age >= 0
    ? age
    : null;
}

function formatDateValue(
  dateValue: string
) {
  if (!validDate(dateValue)) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${dateValue}T12:00:00`
    )
  );
}

export function medicalProfileSummary(
  fieldKey: MedicalProfileFieldKey,
  value: MedicalProfileValue
) {
  switch (fieldKey) {
    case "date_of_birth": {
      const date =
        value.date ?? "";

      if (!date) {
        return "Necompletat";
      }

      const age =
        calculateAge(date);

      return age === null
        ? formatDateValue(date)
        : `${formatDateValue(date)} · ${age} ani`;
    }

    case "sex":
      if (value.sex === "male") {
        return "Masculin";
      }

      if (value.sex === "female") {
        return "Feminin";
      }

      return "Necompletat";

    case "blood_group": {
      const group =
        value.group ?? "";
      const rh =
        value.rh ?? "";

      if (
        !group ||
        group === "unknown"
      ) {
        return "Necunoscută";
      }

      if (
        !rh ||
        rh === "unknown"
      ) {
        return `${group} · Rh necunoscut`;
      }

      return `${group}${rh === "positive" ? "+" : "-"}`;
    }

    case "emergency_contact":
      return (
        value.name ||
        "Necompletat"
      );

    case "family_doctor":
      return (
        value.name ||
        "Necompletat"
      );

    case "organ_donation_preference": {
      switch (
        value.preference as
          OrganDonationPreference
      ) {
        case "wishes_to_donate":
          return "Dorește să doneze";

        case "does_not_wish_to_donate":
          return "Nu dorește să doneze";

        case "undecided":
          return "Nehotărât";

        case "not_specified":
        default:
          return "Nespecificat";
      }
    }

    default: {
      const text =
        value.text?.trim() ?? "";

      if (!text) {
        return "Necompletat";
      }

      const firstLine =
        text.split("\n")[0];

      return firstLine.length > 90
        ? `${firstLine.slice(0, 87)}...`
        : firstLine;
    }
  }
}

export function medicalProfileFieldLabel(
  fieldKey: MedicalProfileFieldKey
) {
  return (
    MEDICAL_PROFILE_FIELDS.find(
      (field) =>
        field.key === fieldKey
    )?.label ?? fieldKey
  );
}
