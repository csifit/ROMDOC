import {
  Resend,
} from "resend";

export type ComplimentaryAccessReminderType =
  | "30_days"
  | "7_days";

type SendComplimentaryAccessReminderEmailInput = {
  reminderType:
    ComplimentaryAccessReminderType;
  doctorName: string;
  doctorEmail: string;
  accessEndsAt: string;
  subscriptionUrl: string;
  idempotencyKey: string;
};

export type SendComplimentaryAccessReminderEmailResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId:
    | string
    | null;
  errorCode:
    | string
    | null;
  errorMessage:
    | string
    | null;
};

function escapeHtml(
  value: string
) {
  return value
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function formatDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(
    new Date(value)
  );
}

function normalizeError(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return {
      code:
        error.name ||
        "EMAIL_ERROR",
      message:
        error.message,
    };
  }

  if (
    typeof error ===
      "object" &&
    error !== null
  ) {
    const candidate =
      error as {
        name?: unknown;
        message?: unknown;
      };

    return {
      code:
        typeof candidate.name ===
        "string"
          ? candidate.name
          : "EMAIL_ERROR",
      message:
        typeof candidate.message ===
        "string"
          ? candidate.message
          : JSON.stringify(
              error
            ),
    };
  }

  return {
    code:
      "EMAIL_ERROR",
    message:
      String(error),
  };
}

export async function sendComplimentaryAccessReminderEmail(
  input: SendComplimentaryAccessReminderEmailInput
): Promise<SendComplimentaryAccessReminderEmailResult> {
  const apiKey =
    process.env.RESEND_API_KEY;

  const from =
    process.env.RESEND_FROM_EMAIL;

  if (
    !apiKey ||
    !from
  ) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "MISSING_CONFIGURATION",
      errorMessage:
        "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
    };
  }

  if (
    !input.doctorEmail.trim()
  ) {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "MISSING_RECIPIENT",
      errorMessage:
        "Doctor email is missing.",
    };
  }

  let subscriptionUrl: URL;

  try {
    subscriptionUrl =
      new URL(
        input.subscriptionUrl
      );
  } catch {
    return {
      sent: false,
      skipped: true,
      providerMessageId:
        null,
      errorCode:
        "INVALID_SUBSCRIPTION_URL",
      errorMessage:
        "The subscription URL is invalid.",
    };
  }

  const days =
    input.reminderType ===
    "30_days"
      ? 30
      : 7;

  const subject =
    input.reminderType ===
    "30_days"
      ? "Accesul gratuit RomDoc expiră în 30 de zile"
      : "Accesul gratuit RomDoc expiră în 7 zile";

  const resend =
    new Resend(apiKey);

  try {
    const result =
      await resend.emails.send(
        {
          from,
          to:
            input.doctorEmail,
          subject,
          html: `
            <!doctype html>
            <html lang="ro">
              <body style="margin:0;background:#f0eee9;font-family:Arial,sans-serif;color:#111827">
                <div style="max-width:640px;margin:0 auto;padding:32px 16px">
                  <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:32px">
                    <p style="margin:0 0 12px;color:#036661;font-size:16px;font-weight:700">
                      RomDoc
                    </p>

                    <h1 style="margin:0;color:#111827;font-size:28px;line-height:1.25">
                      Accesul gratuit expiră în ${days} zile
                    </h1>

                    <p style="margin:22px 0 0;line-height:1.7">
                      Bună ziua, Dr. ${escapeHtml(
                        input.doctorName
                      )}.
                    </p>

                    <p style="margin:14px 0 0;line-height:1.7">
                      Perioada de acces gratuit oferită de RomDoc se încheie la data de
                      <strong>${escapeHtml(
                        formatDate(
                          input.accessEndsAt
                        )
                      )}</strong>.
                    </p>

                    <p style="margin:14px 0 0;line-height:1.7">
                      Pentru a păstra accesul neîntrerupt la profilul de medic, programări și instrumentele din dashboard, poți activa un abonament înainte de această dată.
                    </p>

                    <div style="margin-top:26px">
                      <a
                        href="${escapeHtml(
                          subscriptionUrl.toString()
                        )}"
                        style="display:inline-block;border-radius:10px;background:#036661;padding:13px 20px;color:#ffffff;font-weight:700;text-decoration:none"
                      >
                        Vezi opțiunile de abonament
                      </a>
                    </div>

                    <p style="margin:22px 0 0;color:#6b7280;font-size:13px;line-height:1.6">
                      Abonamentele Stripe și accesul gratuit sunt gestionate separat. Un abonament Stripe activ continuă accesul chiar dacă perioada gratuită expiră.
                    </p>

                    <p style="margin:28px 0 0;color:#6b7280;font-size:13px">
                      RomDoc — găsește medicul potrivit.
                    </p>
                  </div>
                </div>
              </body>
            </html>
          `,
          text: [
            "RomDoc",
            "",
            `Bună ziua, Dr. ${input.doctorName}.`,
            "",
            `Accesul gratuit RomDoc expiră în ${days} zile.`,
            `Data expirării: ${formatDate(
              input.accessEndsAt
            )}`,
            "",
            "Pentru a păstra accesul neîntrerupt, activează un abonament înainte de data expirării.",
            "",
            `Opțiuni de abonament: ${subscriptionUrl.toString()}`,
            "",
            "Un abonament Stripe activ continuă accesul chiar dacă perioada gratuită expiră.",
          ].join("\n"),
        },
        {
          idempotencyKey:
            input.idempotencyKey,
        }
      );

    if (result.error) {
      const normalized =
        normalizeError(
          result.error
        );

      return {
        sent: false,
        skipped: false,
        providerMessageId:
          null,
        errorCode:
          normalized.code,
        errorMessage:
          normalized.message,
      };
    }

    return {
      sent: true,
      skipped: false,
      providerMessageId:
        result.data?.id ??
        null,
      errorCode:
        null,
      errorMessage:
        null,
    };
  } catch (error) {
    const normalized =
      normalizeError(error);

    return {
      sent: false,
      skipped: false,
      providerMessageId:
        null,
      errorCode:
        normalized.code,
      errorMessage:
        normalized.message,
    };
  }
}
