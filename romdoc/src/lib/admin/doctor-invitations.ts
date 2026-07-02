export const DOCTOR_INVITATION_DEFAULT_MONTHS = 12;
export const DOCTOR_INVITATION_MAX_MESSAGE_LENGTH = 1000;
export const DOCTOR_INVITATION_MAX_NAME_LENGTH = 120;

export type DoctorInvitationLocale = "ro" | "en";

export type CreateDoctorInvitationInput = {
  email: string;
  firstName: string;
  lastName: string;
  locale: DoctorInvitationLocale;
  personalMessage: string | null;
  complimentaryMonths: number;
};

export type DoctorInvitationValidationResult =
  | {
      ok: true;
      value: CreateDoctorInvitationInput;
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

export function validateDoctorInvitationInput(
  body: unknown
): DoctorInvitationValidationResult {
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

  const email =
    normalizeEmail(input.email);

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
      DOCTOR_INVITATION_MAX_NAME_LENGTH
    );

  if (!firstName) {
    return {
      ok: false,
      field: "firstName",
      error:
        "Prenumele medicului este obligatoriu.",
    };
  }

  const lastName =
    normalizeString(
      input.lastName,
      DOCTOR_INVITATION_MAX_NAME_LENGTH
    );

  if (!lastName) {
    return {
      ok: false,
      field: "lastName",
      error:
        "Numele medicului este obligatoriu.",
    };
  }

  const locale: DoctorInvitationLocale =
    input.locale === "en"
      ? "en"
      : "ro";

  const rawMessage =
    normalizeString(
      input.personalMessage,
      DOCTOR_INVITATION_MAX_MESSAGE_LENGTH
    );

  if (
    rawMessage &&
    containsHtml(rawMessage)
  ) {
    return {
      ok: false,
      field: "personalMessage",
      error:
        "Mesajul personalizat trebuie să conțină numai text simplu, fără HTML.",
    };
  }

  if (
    rawMessage &&
    containsUnsafeControlCharacters(
      rawMessage
    )
  ) {
    return {
      ok: false,
      field: "personalMessage",
      error:
        "Mesajul personalizat conține caractere nepermise.",
    };
  }

  const requestedMonths =
    typeof input.complimentaryMonths ===
      "number"
      ? input.complimentaryMonths
      : Number(
          input.complimentaryMonths ??
            DOCTOR_INVITATION_DEFAULT_MONTHS
        );

  if (
    !Number.isInteger(requestedMonths) ||
    requestedMonths < 1 ||
    requestedMonths > 36
  ) {
    return {
      ok: false,
      field: "complimentaryMonths",
      error:
        "Perioada gratuită trebuie să fie între 1 și 36 de luni.",
    };
  }

  return {
    ok: true,
    value: {
      email,
      firstName,
      lastName,
      locale,
      personalMessage:
        rawMessage || null,
      complimentaryMonths:
        requestedMonths,
    },
  };
}

export function getDoctorInvitationRedirectUrl(): string {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!configuredSiteUrl) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not configured."
    );
  }

  const siteUrl =
    configuredSiteUrl.replace(
      /\/+$/,
      ""
    );

  return `${siteUrl}/auth/doctor-invitation/verify`;
}

export function getDoctorInvitationExpiryDate(): string {
  const expiry =
    new Date();

  expiry.setDate(
    expiry.getDate() + 7
  );

  return expiry.toISOString();
}

export function getSafeInvitationFailure(
  error: unknown
): {
  code: string;
  message: string;
} {
  if (
    error &&
    typeof error === "object"
  ) {
    const candidate =
      error as {
        code?: unknown;
        message?: unknown;
        status?: unknown;
      };

    const code =
      typeof candidate.code === "string"
        ? candidate.code.slice(0, 100)
        : typeof candidate.status ===
            "number"
          ? `HTTP_${candidate.status}`
          : "INVITATION_FAILED";

    const message =
      typeof candidate.message ===
        "string"
        ? candidate.message
            .trim()
            .slice(0, 500)
        : "Supabase Auth invitation failed.";

    return {
      code,
      message,
    };
  }

  return {
    code: "INVITATION_FAILED",
    message:
      "Supabase Auth invitation failed.",
  };
}
