import { Resend } from "resend";

export type PatientNotificationStatus =
  | "confirmed"
  | "rescheduled"
  | "cancelled";

type SendAppointmentStatusEmailInput = {
  status: PatientNotificationStatus;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  clinicName: string;
  scheduledDate: string | null;
  scheduledTime: string | null;
  rescheduleReason: string | null;
};

type SendAppointmentStatusEmailResult = {
  sent: boolean;
  error?: unknown;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatAppointmentDate(date: string | null) {
  if (!date) {
    return "Data nu este disponibilă";
  }

  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function formatAppointmentTime(time: string | null) {
  if (!time) {
    return "Ora nu este disponibilă";
  }

  return time.slice(0, 5);
}

function getEmailContent(status: PatientNotificationStatus) {
  switch (status) {
    case "confirmed":
      return {
        subjectPrefix: "Programare confirmată",
        heading: "Programarea ta a fost confirmată",
        message:
          "Medicul sau clinica a confirmat programarea ta.",
        accentColor: "#166534",
        boxColor: "#f0fdf4",
      };

    case "rescheduled":
      return {
        subjectPrefix: "Programare reprogramată",
        heading: "Programarea ta a fost reprogramată",
        message:
          "Data sau ora programării tale a fost modificată.",
        accentColor: "#1d4ed8",
        boxColor: "#eff6ff",
      };

    case "cancelled":
      return {
        subjectPrefix: "Programare anulată",
        heading: "Programarea ta a fost anulată",
        message:
          "Programarea a fost anulată. Pentru o nouă programare, poți trimite o altă cerere prin RomDoc.",
        accentColor: "#b91c1c",
        boxColor: "#fef2f2",
      };
  }
}

export async function sendAppointmentStatusEmail({
  status,
  patientName,
  patientEmail,
  doctorName,
  clinicName,
  scheduledDate,
  scheduledTime,
  rescheduleReason,
}: SendAppointmentStatusEmailInput): Promise<SendAppointmentStatusEmailResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    console.error(
      "Appointment status email was not sent because Resend environment variables are missing."
    );

    return {
      sent: false,
      error: "Missing Resend environment variables.",
    };
  }

  const resend = new Resend(resendApiKey);
  const content = getEmailContent(status);

  const safePatientName = escapeHtml(patientName);
  const safeDoctorName = escapeHtml(doctorName);
  const safeClinicName = escapeHtml(clinicName);

  const safeRescheduleReason = rescheduleReason
    ? escapeHtml(rescheduleReason)
    : null;

  const formattedDate = formatAppointmentDate(scheduledDate);
  const formattedTime = formatAppointmentTime(scheduledTime);

  const showScheduledSlot =
    status === "confirmed" || status === "rescheduled";

  const { error } = await resend.emails.send({
    from: resendFromEmail,
    to: patientEmail,
    subject: `${content.subjectPrefix} – ${doctorName}`,
    html: `
      <!doctype html>
      <html lang="ro">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width" />
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f0eee9;
            color: #111827;
            font-family: Arial, Helvetica, sans-serif;
          "
        >
          <div
            style="
              max-width: 640px;
              margin: 0 auto;
              padding: 32px 16px;
            "
          >
            <div
              style="
                background-color: #ffffff;
                border-radius: 16px;
                padding: 32px;
              "
            >
              <p
                style="
                  margin: 0 0 12px;
                  color: ${content.accentColor};
                  font-size: 14px;
                  font-weight: 700;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                "
              >
                RomDoc
              </p>

              <h1
                style="
                  margin: 0;
                  font-size: 28px;
                  line-height: 1.3;
                  color: #111827;
                "
              >
                ${content.heading}
              </h1>

              <p
                style="
                  margin-top: 20px;
                  line-height: 1.7;
                "
              >
                Bună, ${safePatientName}.
              </p>

              <p style="line-height: 1.7;">
                ${content.message}
              </p>

              <div
                style="
                  margin-top: 24px;
                  padding: 20px;
                  border-radius: 12px;
                  background-color: ${content.boxColor};
                "
              >
                <p style="margin: 0 0 10px;">
                  <strong>Medic:</strong>
                  ${safeDoctorName}
                </p>

                <p style="margin: 0${
                  showScheduledSlot ? " 0 10px" : ""
                };">
                  <strong>Clinică:</strong>
                  ${safeClinicName}
                </p>

                ${
                  showScheduledSlot
                    ? `
                      <p style="margin: 0 0 10px;">
                        <strong>Data programării:</strong>
                        ${formattedDate}
                      </p>

                      <p style="margin: 0;">
                        <strong>Ora programării:</strong>
                        ${formattedTime}
                      </p>
                    `
                    : ""
                }
              </div>

              ${
                status === "rescheduled" && safeRescheduleReason
                  ? `
                    <div
                      style="
                        margin-top: 24px;
                        padding: 20px;
                        border-left: 4px solid ${content.accentColor};
                        background-color: #f9fafb;
                      "
                    >
                      <p style="margin: 0 0 8px;">
                        <strong>Motivul reprogramării:</strong>
                      </p>

                      <p
                        style="
                          margin: 0;
                          line-height: 1.7;
                          white-space: pre-wrap;
                        "
                      >${safeRescheduleReason}</p>
                    </div>
                  `
                  : ""
              }

              <p
                style="
                  margin-top: 28px;
                  line-height: 1.7;
                  color: #4b5563;
                "
              >
                Pentru întrebări legate de programare, contactează
                direct clinica.
              </p>

              <p
                style="
                  margin-top: 28px;
                  font-size: 13px;
                  color: #6b7280;
                "
              >
                RomDoc — găsește medicul potrivit.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error(
      `Appointment ${status} email failed:`,
      error
    );

    return {
      sent: false,
      error,
    };
  }

  return {
    sent: true,
  };
}