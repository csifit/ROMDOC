import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const CLINIC_ORGANIZATION_INVITATION_DEFAULT_TRIAL_MONTHS = 3;
export const CLINIC_ORGANIZATION_INVITATION_MAX_MESSAGE_LENGTH = 1000;
export const CLINIC_ORGANIZATION_INVITATION_MAX_NAME_LENGTH = 120;
export const CLINIC_ORGANIZATION_INVITATION_MAX_ORGANIZATION_NAME_LENGTH = 200;

export type ClinicOrganizationInvitationLocale =
  | "ro"
  | "en"
  | "de";

export type CreateClinicOrganizationInvitationInput = {
  organizationName: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  locale: ClinicOrganizationInvitationLocale;
  personalMessage: string | null;
  trialMonths: number;
  organizationId: string | null;
};

export type ClinicOrganizationInvitationValidationResult =
  | {
      ok: true;
      value: CreateClinicOrganizationInvitationInput;
    }
  | {
      ok: false;
      error: string;
      field?: string;
    };

function normalizeString(
  value: unknown,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeEmail(
  value: unknown
): string {
  return normalizeString(
    value,
    320
  ).toLowerCase();
}

function isValidEmail(
  value: string
): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function containsHtml(
  value: string
): boolean {
  return /<[^>]*>/.test(value);
}

function containsUnsafeControlCharacters(
  value: string
): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(
    value
  );
}

function isUuid(
  value: string
): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function validateClinicOrganizationInvitationInput(
  body: unknown
): ClinicOrganizationInvitationValidationResult {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return {
      ok: false,
      error:
        "Cererea nu conține date valide.",
    };
  }

  const input =
    body as Record<string, unknown>;

  const organizationName =
    normalizeString(
      input.organizationName,
      CLINIC_ORGANIZATION_INVITATION_MAX_ORGANIZATION_NAME_LENGTH
    );

  if (
    organizationName.length < 2
  ) {
    return {
      ok: false,
      field: "organizationName",
      error:
        "Numele organizației este obligatoriu.",
    };
  }

  const email =
    normalizeEmail(
      input.email
    );

  if (!isValidEmail(email)) {
    return {
      ok: false,
      field: "email",
      error:
        "Adresa de e-mail nu este validă.",
    };
  }

  const firstName =
    normalizeString(
      input.firstName,
      CLINIC_ORGANIZATION_INVITATION_MAX_NAME_LENGTH
    );

  if (!firstName) {
    return {
      ok: false,
      field: "firstName",
      error:
        "Prenumele persoanei de contact este obligatoriu.",
    };
  }

  const lastName =
    normalizeString(
      input.lastName,
      CLINIC_ORGANIZATION_INVITATION_MAX_NAME_LENGTH
    );

  if (!lastName) {
    return {
      ok: false,
      field: "lastName",
      error:
        "Numele persoanei de contact este obligatoriu.",
    };
  }

  const phone =
    normalizeString(
      input.phone,
      50
    );

  if (
    phone &&
    phone.length < 3
  ) {
    return {
      ok: false,
      field: "phone",
      error:
        "Numărul de telefon nu este valid.",
    };
  }

  const locale:
    ClinicOrganizationInvitationLocale =
      input.locale === "en"
        ? "en"
        : input.locale === "de"
          ? "de"
          : "ro";

  const personalMessage =
    normalizeString(
      input.personalMessage,
      CLINIC_ORGANIZATION_INVITATION_MAX_MESSAGE_LENGTH
    );

  if (
    personalMessage &&
    containsHtml(
      personalMessage
    )
  ) {
    return {
      ok: false,
      field: "personalMessage",
      error:
        "Mesajul personalizat trebuie să conțină numai text simplu, fără HTML.",
    };
  }

  if (
    personalMessage &&
    containsUnsafeControlCharacters(
      personalMessage
    )
  ) {
    return {
      ok: false,
      field: "personalMessage",
      error:
        "Mesajul personalizat conține caractere nepermise.",
    };
  }

  const requestedTrialMonths =
    typeof input.trialMonths ===
      "number"
      ? input.trialMonths
      : Number(
          input.trialMonths ??
            CLINIC_ORGANIZATION_INVITATION_DEFAULT_TRIAL_MONTHS
        );

  if (
    !Number.isInteger(
      requestedTrialMonths
    ) ||
    requestedTrialMonths < 1 ||
    requestedTrialMonths > 3
  ) {
    return {
      ok: false,
      field: "trialMonths",
      error:
        "Perioada de test pentru organizație trebuie să fie între 1 și 3 luni.",
    };
  }

  const organizationId =
    normalizeString(
      input.organizationId,
      100
    );

  if (
    organizationId &&
    !isUuid(
      organizationId
    )
  ) {
    return {
      ok: false,
      field: "organizationId",
      error:
        "Organizația selectată nu este validă.",
    };
  }

  return {
    ok: true,
    value: {
      organizationName,
      email,
      firstName,
      lastName,
      phone:
        phone || null,
      locale,
      personalMessage:
        personalMessage ||
        null,
      trialMonths:
        requestedTrialMonths,
      organizationId:
        organizationId ||
        null,
    },
  };
}

export function getClinicOrganizationInvitationRedirectUrl(): string {
  const configuredSiteUrl =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim();

  if (
    !configuredSiteUrl
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not configured."
    );
  }

  const siteUrl =
    configuredSiteUrl.replace(
      /\/+$/,
      ""
    );

  return `${siteUrl}/auth/clinic-organization-invitation/verify`;
}

export function getClinicOrganizationInvitationExpiryDate(): string {
  const expiry =
    new Date();

  expiry.setDate(
    expiry.getDate() + 7
  );

  return expiry.toISOString();
}

export function getSafeClinicOrganizationInvitationFailure(
  error: unknown
): {
  code: string;
  message: string;
} {
  if (
    error &&
    typeof error ===
      "object"
  ) {
    const candidate =
      error as {
        code?: unknown;
        message?: unknown;
        status?: unknown;
      };

    const code =
      typeof candidate.code ===
        "string"
        ? candidate.code.slice(
            0,
            100
          )
        : typeof candidate.status ===
              "number"
          ? `HTTP_${candidate.status}`
          : "CLINIC_ORGANIZATION_INVITATION_FAILED";

    const message =
      typeof candidate.message ===
        "string"
        ? candidate.message
            .trim()
            .slice(
              0,
              500
            )
        : "Clinic Organisation invitation failed.";

    return {
      code,
      message,
    };
  }

  return {
    code:
      "CLINIC_ORGANIZATION_INVITATION_FAILED",
    message:
      "Clinic Organisation invitation failed.",
  };
}

export function getClinicOrganizationInvitationIdFromUserMetadata(
  metadata:
    | Record<
        string,
        unknown
      >
    | null
    | undefined
): string | null {
  const value =
    metadata
      ?.clinic_organization_invitation_id;

  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function slugify(
  value: string
): string {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(
      0,
      80
    );
}

export async function createUniqueClinicOrganizationSlug(
  organizationName: string,
  invitationId: string
): Promise<string> {
  const admin =
    createAdminClient();

  const fallback =
    `organizatie-${invitationId.slice(
      0,
      8
    )}`;

  const baseSlug =
    slugify(
      organizationName
    ) ||
    fallback;

  let candidate =
    baseSlug;
  let suffix = 2;

  while (true) {
    const {
      data,
      error,
    } = await admin
      .from(
        "clinic_organizations"
      )
      .select("id")
      .eq(
        "slug",
        candidate
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Clinic Organisation slug lookup failed: ${error.message}`
      );
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug.slice(
        0,
        72
      )}-${suffix}`;

    suffix += 1;
  }
}
