import type {
  AdminClinicOrganizationLocationInput,
} from "@/lib/admin/create-clinic-organization-location";

export type AdminClinicOrganizationOnboardingLocale =
  | "ro"
  | "en"
  | "de";

export type AdminClinicOrganizationBillingInput = {
  companyName: string;
  taxId: string;
  tradeRegisterNumber: string | null;
  billingAddress: string;
  billingCity: string;
  billingCounty: string;
  billingCountry: string;
  billingEmail: string;
  isVatPayer: boolean;
  vatNumber: string | null;
};

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
  invitationLocale:
    AdminClinicOrganizationOnboardingLocale;
  trialMonths: number;
  personalMessage: string | null;
  billing:
    AdminClinicOrganizationBillingInput;
  locations:
    AdminClinicOrganizationLocationInput[];
};

export type AdminClinicOrganizationOnboardingValidationResult =
  | {
      ok: true;
      value:
        AdminClinicOrganizationOnboardingInput;
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
      ![
        "http:",
        "https:",
      ].includes(
        url.protocol
      )
    ) {
      return null;
    }

    return url
      .toString();
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

function optionalText(
  value: unknown,
  maximumLength: number
) {
  const text =
    normalizeText(
      value,
      maximumLength
    );

  return text ||
    null;
}

function validateBilling(
  value: unknown
):
  | {
      ok: true;
      value:
        AdminClinicOrganizationBillingInput;
    }
  | {
      ok: false;
      error: string;
      field: string;
    } {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value
    )
  ) {
    return {
      ok: false,
      field:
        "billing",
      error:
        "Completează datele de facturare.",
    };
  }

  const billing =
    value as Record<
      string,
      unknown
    >;

  const companyName =
    normalizeText(
      billing.companyName,
      240
    );

  const taxId =
    normalizeText(
      billing.taxId,
      80
    );

  const tradeRegisterNumber =
    optionalText(
      billing.tradeRegisterNumber,
      120
    );

  const billingAddress =
    normalizeText(
      billing.billingAddress,
      500
    );

  const billingCity =
    normalizeText(
      billing.billingCity,
      160
    );

  const billingCounty =
    normalizeText(
      billing.billingCounty,
      160
    );

  const billingCountry =
    normalizeText(
      billing.billingCountry,
      160
    );

  const billingEmail =
    normalizeText(
      billing.billingEmail,
      320
    )
      .toLowerCase();

  const isVatPayer =
    billing.isVatPayer ===
    true;

  const vatNumber =
    optionalText(
      billing.vatNumber,
      120
    );

  if (
    companyName.length <
    2
  ) {
    return {
      ok: false,
      field:
        "billing.companyName",
      error:
        "Denumirea juridică este obligatorie.",
    };
  }

  if (
    taxId.length <
    2
  ) {
    return {
      ok: false,
      field:
        "billing.taxId",
      error:
        "Codul fiscal / CUI este obligatoriu.",
    };
  }

  if (
    billingAddress.length <
    5
  ) {
    return {
      ok: false,
      field:
        "billing.billingAddress",
      error:
        "Adresa de facturare este obligatorie.",
    };
  }

  if (
    billingCity.length <
    2
  ) {
    return {
      ok: false,
      field:
        "billing.billingCity",
      error:
        "Localitatea de facturare este obligatorie.",
    };
  }

  if (
    billingCounty.length <
    2
  ) {
    return {
      ok: false,
      field:
        "billing.billingCounty",
      error:
        "Județul / regiunea este obligatorie.",
    };
  }

  if (
    billingCountry.length <
    2
  ) {
    return {
      ok: false,
      field:
        "billing.billingCountry",
      error:
        "Țara de facturare este obligatorie.",
    };
  }

  if (
    !isEmail(
      billingEmail
    )
  ) {
    return {
      ok: false,
      field:
        "billing.billingEmail",
      error:
        "Adresa de e-mail pentru facturare nu este validă.",
    };
  }

  if (
    isVatPayer &&
    !vatNumber
  ) {
    return {
      ok: false,
      field:
        "billing.vatNumber",
      error:
        "Introdu codul TVA pentru organizația plătitoare de TVA.",
    };
  }

  return {
    ok: true,
    value: {
      companyName,
      taxId,
      tradeRegisterNumber,
      billingAddress,
      billingCity,
      billingCounty,
      billingCountry,
      billingEmail,
      isVatPayer,
      vatNumber:
        isVatPayer
          ? vatNumber
          : null,
    },
  };
}

function validateLocations(
  value: unknown
):
  | {
      ok: true;
      value:
        AdminClinicOrganizationLocationInput[];
    }
  | {
      ok: false;
      error: string;
      field: string;
    } {
  if (
    !Array.isArray(
      value
    ) ||
    value.length ===
      0
  ) {
    return {
      ok: false,
      field:
        "locations",
      error:
        "Adaugă cel puțin o locație pentru organizație.",
    };
  }

  if (
    value.length >
    10
  ) {
    return {
      ok: false,
      field:
        "locations",
      error:
        "Poți adăuga maximum 10 locații într-un singur onboarding.",
    };
  }

  const locations:
    AdminClinicOrganizationLocationInput[] =
      [];

  for (
    let index = 0;
    index <
    value.length;
    index += 1
  ) {
    const raw =
      value[
        index
      ];

    if (
      !raw ||
      typeof raw !==
        "object" ||
      Array.isArray(
        raw
      )
    ) {
      return {
        ok: false,
        field:
          `locations.${index}`,
        error:
          `Locația ${index + 1} nu conține date valide.`,
      };
    }

    const item =
      raw as Record<
        string,
        unknown
      >;

    const name =
      normalizeText(
        item.name,
        200
      );

    const placeId =
      normalizeText(
        item.placeId,
        500
      );

    const addressLine2 =
      optionalText(
        item.addressLine2,
        300
      );

    const phone =
      optionalText(
        item.phone,
        50
      );

    const email =
      optionalText(
        item.email,
        320
      )
        ?.toLowerCase() ??
      null;

    const websiteRaw =
      optionalText(
        item.website,
        500
      );

    const website =
      websiteRaw
        ? normalizeWebsite(
            websiteRaw
          )
        : null;

    const description =
      optionalText(
        item.description,
        3000
      );

    if (
      name.length <
      2
    ) {
      return {
        ok: false,
        field:
          `locations.${index}.name`,
        error:
          `Introdu numele locației ${index + 1}.`,
      };
    }

    if (
      !placeId
    ) {
      return {
        ok: false,
        field:
          `locations.${index}.placeId`,
        error:
          `Selectează adresa Google pentru locația ${index + 1}.`,
      };
    }

    if (
      email &&
      !isEmail(
        email
      )
    ) {
      return {
        ok: false,
        field:
          `locations.${index}.email`,
        error:
          `Adresa de e-mail pentru locația ${index + 1} nu este validă.`,
      };
    }

    if (
      websiteRaw &&
      !website
    ) {
      return {
        ok: false,
        field:
          `locations.${index}.website`,
        error:
          `Website-ul locației ${index + 1} nu este valid.`,
      };
    }

    if (
      description &&
      containsHtml(
        description
      )
    ) {
      return {
        ok: false,
        field:
          `locations.${index}.description`,
        error:
          `Descrierea locației ${index + 1} trebuie să conțină numai text simplu.`,
      };
    }

    locations.push({
      name,
      placeId,
      addressLine2,
      phone,
      email,
      website,
      description,
    });
  }

  const uniquePlaceIds =
    new Set(
      locations.map(
        (
          location
        ) =>
          location.placeId
      )
    );

  if (
    uniquePlaceIds.size !==
    locations.length
  ) {
    return {
      ok: false,
      field:
        "locations",
      error:
        "Aceeași adresă Google nu poate fi adăugată de două ori.",
    };
  }

  return {
    ok: true,
    value:
      locations,
  };
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
    )
      .toLowerCase();

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
    optionalText(
      input.managerPhone,
      50
    );

  const contactName =
    optionalText(
      input.contactName,
      160
    );

  const contactEmail =
    optionalText(
      input.contactEmail,
      320
    )
      ?.toLowerCase() ??
    null;

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
    optionalText(
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

  const billing =
    validateBilling(
      input.billing
    );

  if (
    !billing.ok
  ) {
    return billing;
  }

  const locations =
    validateLocations(
      input.locations
    );

  if (
    !locations.ok
  ) {
    return locations;
  }

  return {
    ok: true,
    value: {
      organizationName,
      website,
      contactName,
      contactEmail,
      contactPhone,
      managerFirstName,
      managerLastName,
      managerEmail,
      managerPhone,
      invitationLocale,
      trialMonths,
      personalMessage:
        personalMessage ||
        null,
      billing:
        billing.value,
      locations:
        locations.value,
    },
  };
}
