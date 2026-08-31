export type AdminClinicOrganizationOnboardingLocale =
  | "ro"
  | "en"
  | "de";

export type AdminClinicOrganizationOnboardingInput = {
  organizationName: string;
  website: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  managerFirstName: string;
  managerLastName: string;
  managerEmail: string;
  managerPhone: string | null;
  invitationLocale: AdminClinicOrganizationOnboardingLocale;
  trialMonths: number;
  personalMessage: string | null;
};

export type AdminClinicOrganizationOnboardingValidationResult =
  | {
      ok: true;
      value: AdminClinicOrganizationOnboardingInput;
    }
  | {
      ok: false;
      error: string;
      field?: string;
    };

function normalizeText(
  value: unknown,
  maximumLength: number
) {
  return typeof value ===
    "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

function isEmail(
  value: string
) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function normalizeWebsite(
  value: unknown
): string | null {
  const raw =
    normalizeText(
      value,
      500
    );

  if (
    !raw
  ) {
    return null;
  }

  const candidate =
    /^https?:\/\//i.test(
      raw
    )
      ? raw
      : `https://${raw}`;

  try {
    const url =
      new URL(
        candidate
      );

    if (
      url.protocol !==
        "http:" &&
      url.protocol !==
        "https:"
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function containsHtml(
  value: string
) {
  return /<[^>]*>/.test(
    value
  );
}

export function validateAdminClinicOrganizationOnboardingInput(
  body: unknown
): AdminClinicOrganizationOnboardingValidationResult {
  if (
    !body ||
    typeof body !==
      "object" ||
    Array.isArray(
      body
    )
  ) {
    return {
      ok: false,
      error:
        "Cererea nu conține date valide.",
    };
  }

  const input =
    body as Record<
      string,
      unknown
    >;

  const organizationName =
    normalizeText(
      input.organizationName,
      200
    );

  if (
    organizationName.length <
    2
  ) {
    return {
      ok: false,
      field:
        "organizationName",
      error:
        "Numele organizației este obligatoriu.",
    };
  }

  const managerFirstName =
    normalizeText(
      input.managerFirstName,
      120
    );

  if (
    !managerFirstName
  ) {
    return {
      ok: false,
      field:
        "managerFirstName",
      error:
        "Prenumele managerului este obligatoriu.",
    };
  }

  const managerLastName =
    normalizeText(
      input.managerLastName,
      120
    );

  if (
    !managerLastName
  ) {
    return {
      ok: false,
      field:
        "managerLastName",
      error:
        "Numele managerului este obligatoriu.",
    };
  }

  const managerEmail =
    normalizeText(
      input.managerEmail,
      320
    ).toLowerCase();

  if (
    !isEmail(
      managerEmail
    )
  ) {
    return {
      ok: false,
      field:
        "managerEmail",
      error:
        "Adresa de e-mail a managerului nu este validă.",
    };
  }

  const managerPhone =
    normalizeText(
      input.managerPhone,
      50
    );

  const contactName =
    normalizeText(
      input.contactName,
      160
    );

  const contactEmail =
    normalizeText(
      input.contactEmail,
      320
    ).toLowerCase();

  if (
    contactEmail &&
    !isEmail(
      contactEmail
    )
  ) {
    return {
      ok: false,
      field:
        "contactEmail",
      error:
        "Adresa de e-mail de contact nu este validă.",
    };
  }

  const contactPhone =
    normalizeText(
      input.contactPhone,
      80
    );

  const rawWebsite =
    normalizeText(
      input.website,
      500
    );

  const website =
    normalizeWebsite(
      rawWebsite
    );

  if (
    rawWebsite &&
    !website
  ) {
    return {
      ok: false,
      field:
        "website",
      error:
        "Adresa website nu este validă.",
    };
  }

  const invitationLocale:
    AdminClinicOrganizationOnboardingLocale =
      input.invitationLocale ===
        "en"
        ? "en"
        : input.invitationLocale ===
            "de"
          ? "de"
          : "ro";

  const trialMonths =
    typeof input.trialMonths ===
      "number"
      ? input.trialMonths
      : Number(
          input.trialMonths ??
            3
        );

  if (
    !Number.isInteger(
      trialMonths
    ) ||
    trialMonths < 1 ||
    trialMonths > 3
  ) {
    return {
      ok: false,
      field:
        "trialMonths",
      error:
        "Perioada de test trebuie să fie între 1 și 3 luni.",
    };
  }

  const personalMessage =
    normalizeText(
      input.personalMessage,
      1000
    );

  if (
    personalMessage &&
    containsHtml(
      personalMessage
    )
  ) {
    return {
      ok: false,
      field:
        "personalMessage",
      error:
        "Mesajul personalizat trebuie să conțină numai text simplu.",
    };
  }

  return {
    ok: true,
    value: {
      organizationName,
      website,
      contactName:
        contactName ||
        null,
      contactEmail:
        contactEmail ||
        null,
      contactPhone:
        contactPhone ||
        null,
      managerFirstName,
      managerLastName,
      managerEmail,
      managerPhone:
        managerPhone ||
        null,
      invitationLocale,
      trialMonths,
      personalMessage:
        personalMessage ||
        null,
    },
  };
}
