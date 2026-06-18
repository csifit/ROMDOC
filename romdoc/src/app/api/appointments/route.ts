import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { authorizeAppointmentAccess } from "@/lib/appointments/authorize-appointment-access";

type AppointmentRequestBody = {
  doctorId?: string;
  clinicId?: string;
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  requestedDate?: string;
  requestedTime?: string;
  notes?: string;
};

type AppointmentUpdateStatus =
  | "confirmed"
  | "rescheduled"
  | "completed"
  | "cancelled";

type AppointmentUpdateBody = {
  appointmentId?: string;
  status?: AppointmentUpdateStatus;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  rescheduleReason?: string | null;
};

const allowedUpdateStatuses: AppointmentUpdateStatus[] = [
  "confirmed",
  "rescheduled",
  "completed",
  "cancelled",
];

function formatAppointmentDate(date: string) {
  return new Intl.DateTimeFormat("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidDateString(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00`);

  return !Number.isNaN(date.getTime());
}

function isTodayOrFuture(value: string) {
  if (!isValidDateString(value)) {
    return false;
  }

  const selectedDate = new Date(`${value}T12:00:00`);
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return selectedDate >= today;
}

function normalizeTime(value: string) {
  const trimmedValue = value.trim();

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(trimmedValue)) {
    return null;
  }

  const [hours, minutes, seconds = "00"] =
    trimmedValue.split(":");

  const hoursNumber = Number(hours);
  const minutesNumber = Number(minutes);
  const secondsNumber = Number(seconds);

  if (
    hoursNumber < 0 ||
    hoursNumber > 23 ||
    minutesNumber < 0 ||
    minutesNumber > 59 ||
    secondsNumber < 0 ||
    secondsNumber > 59
  ) {
    return null;
  }

  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Public appointment-request endpoint.
 *
 * This remains available to patients who are not authenticated.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AppointmentRequestBody;

    const doctorId = body.doctorId?.trim();
    const clinicId = body.clinicId?.trim();
    const doctorName = body.doctorName?.trim();
    const clinicName = body.clinicName?.trim();
    const patientName = body.patientName?.trim();
    const patientEmail = body.patientEmail
      ?.trim()
      .toLowerCase();
    const patientPhone = body.patientPhone?.trim();
    const requestedDate = body.requestedDate?.trim();
    const requestedTime =
      body.requestedTime?.trim() || null;
    const notes = body.notes?.trim() || null;

    if (
      !doctorId ||
      !clinicId ||
      !doctorName ||
      !clinicName ||
      !patientName ||
      !patientEmail ||
      !patientPhone ||
      !requestedDate
    ) {
      return NextResponse.json(
        {
          error: "Completează toate câmpurile obligatorii.",
        },
        {
          status: 400,
        }
      );
    }

    if (patientName.length < 2) {
      return NextResponse.json(
        {
          error: "Introdu un nume valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (!patientEmail.includes("@")) {
      return NextResponse.json(
        {
          error: "Introdu o adresă de e-mail validă.",
        },
        {
          status: 400,
        }
      );
    }

    if (patientPhone.length < 7) {
      return NextResponse.json(
        {
          error: "Introdu un număr de telefon valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isTodayOrFuture(requestedDate)) {
      return NextResponse.json(
        {
          error: "Selectează o dată validă din viitor.",
        },
        {
          status: 400,
        }
      );
    }

    let normalizedRequestedTime: string | null = null;

    if (requestedTime) {
      normalizedRequestedTime =
        normalizeTime(requestedTime);

      if (!normalizedRequestedTime) {
        return NextResponse.json(
          {
            error: "Selectează o oră validă.",
          },
          {
            status: 400,
          }
        );
      }
    }

    const supabase = await createClient();

    const { data: doctor, error: doctorError } =
      await supabase
        .from("doctors")
        .select("id")
        .eq("id", doctorId)
        .eq("status", "active")
        .maybeSingle();

    if (doctorError) {
      console.error(
        "Appointment doctor lookup failed:",
        doctorError
      );

      return NextResponse.json(
        {
          error:
            "Medicul selectat nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (!doctor) {
      return NextResponse.json(
        {
          error: "Medicul selectat nu este disponibil.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: doctorClinic,
      error: doctorClinicError,
    } = await supabase
      .from("doctor_clinics")
      .select("doctor_id, clinic_id")
      .eq("doctor_id", doctorId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (doctorClinicError) {
      console.error(
        "Appointment doctor clinic lookup failed:",
        doctorClinicError
      );

      return NextResponse.json(
        {
          error:
            "Clinica selectată nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    if (!doctorClinic) {
      return NextResponse.json(
        {
          error:
            "Clinica selectată nu este disponibilă pentru acest medic.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: appointment,
      error: appointmentError,
    } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        clinic_id: clinicId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        requested_date: requestedDate,
        requested_time: normalizedRequestedTime,
        notes,
        status: "pending",
      })
      .select("id")
      .single();

    if (appointmentError || !appointment) {
      console.error(
        "Appointment insert failed:",
        appointmentError
      );

      return NextResponse.json(
        {
          error:
            "Cererea nu a putut fi salvată. Încearcă din nou.",
        },
        {
          status: 500,
        }
      );
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFromEmail =
      process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !resendFromEmail) {
      console.error(
        "Resend environment variables are missing."
      );

      return NextResponse.json({
        success: true,
        appointmentId: appointment.id,
        emailSent: false,
      });
    }

    const resend = new Resend(resendApiKey);

    const safePatientName = escapeHtml(patientName);
    const safeDoctorName = escapeHtml(doctorName);
    const safeClinicName = escapeHtml(clinicName);
    const safePatientPhone = escapeHtml(patientPhone);
    const safeNotes = notes ? escapeHtml(notes) : null;

    const formattedDate =
      formatAppointmentDate(requestedDate);

    const formattedTime = normalizedRequestedTime
      ? normalizedRequestedTime.slice(0, 5)
      : "Ora nu a fost specificată";

    const { error: emailError } =
      await resend.emails.send({
        from: resendFromEmail,
        to: patientEmail,
        subject: `Cerere de programare primită – ${doctorName}`,
        html: `
          <!doctype html>
          <html lang="ro">
            <head>
              <meta charset="utf-8" />
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
                  <h1
                    style="
                      margin: 0;
                      font-size: 28px;
                      line-height: 1.3;
                    "
                  >
                    Cererea ta a fost primită
                  </h1>

                  <p style="margin-top: 20px; line-height: 1.7;">
                    Bună, ${safePatientName}.
                  </p>

                  <p style="line-height: 1.7;">
                    Am primit cererea ta de programare. Clinica te va
                    contacta pentru confirmarea datei și orei.
                  </p>

                  <div
                    style="
                      margin-top: 24px;
                      padding: 20px;
                      border-radius: 12px;
                      background-color: #f9fafb;
                    "
                  >
                    <p style="margin: 0 0 10px;">
                      <strong>Medic:</strong> ${safeDoctorName}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Clinică:</strong> ${safeClinicName}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Data solicitată:</strong>
                      ${formattedDate}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Ora preferată:</strong>
                      ${formattedTime}
                    </p>

                    <p style="margin: 0;">
                      <strong>Telefon:</strong>
                      ${safePatientPhone}
                    </p>
                  </div>

                  ${
                    safeNotes
                      ? `
                        <div style="margin-top: 24px;">
                          <p style="margin-bottom: 8px;">
                            <strong>Mesajul tău:</strong>
                          </p>

                          <p
                            style="
                              margin: 0;
                              line-height: 1.7;
                              white-space: pre-wrap;
                            "
                          >${safeNotes}</p>
                        </div>
                      `
                      : ""
                  }

                  <p
                    style="
                      margin-top: 28px;
                      color: #4b5563;
                      line-height: 1.7;
                    "
                  >
                    Aceasta nu este încă o confirmare finală a
                    programării.
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

    if (emailError) {
      console.error(
        "Appointment confirmation email failed:",
        emailError
      );

      return NextResponse.json({
        success: true,
        appointmentId: appointment.id,
        emailSent: false,
      });
    }

    return NextResponse.json({
      success: true,
      appointmentId: appointment.id,
      emailSent: true,
    });
  } catch (error) {
    console.error("Appointment POST API failed:", error);

    return NextResponse.json(
      {
        error:
          "A apărut o eroare neașteptată. Încearcă din nou.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * Protected appointment-management endpoint.
 *
 * Used by:
 * - /admin/appointments
 * - the future /doctor-dashboard/appointments
 */
export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as AppointmentUpdateBody;

    const appointmentId = body.appointmentId?.trim();
    const status = body.status;

    if (!appointmentId || !status) {
      return NextResponse.json(
        {
          error:
            "ID-ul programării și starea sunt obligatorii.",
        },
        {
          status: 400,
        }
      );
    }

    if (!allowedUpdateStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: "Starea programării nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const access = await authorizeAppointmentAccess(
      supabase,
      appointmentId
    );

    if (!access.authorized) {
      return NextResponse.json(
        {
          error: access.error,
        },
        {
          status: access.status,
        }
      );
    }

    const updateData: {
      status: AppointmentUpdateStatus;
      scheduled_date?: string;
      scheduled_time?: string;
      reschedule_reason?: string | null;
    } = {
      status,
    };

    if (
      status === "confirmed" ||
      status === "rescheduled"
    ) {
      const scheduledDate =
        body.scheduledDate?.trim() || "";

      const rawScheduledTime =
        body.scheduledTime?.trim() || "";

      if (!scheduledDate || !rawScheduledTime) {
        return NextResponse.json(
          {
            error:
              "Data și ora programării sunt obligatorii.",
          },
          {
            status: 400,
          }
        );
      }

      if (!isTodayOrFuture(scheduledDate)) {
        return NextResponse.json(
          {
            error:
              "Selectează o dată validă, începând de astăzi.",
          },
          {
            status: 400,
          }
        );
      }

      const scheduledTime =
        normalizeTime(rawScheduledTime);

      if (!scheduledTime) {
        return NextResponse.json(
          {
            error: "Ora programării nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      updateData.scheduled_date = scheduledDate;
      updateData.scheduled_time = scheduledTime;

      if (status === "rescheduled") {
        const rescheduleReason =
          body.rescheduleReason?.trim() || "";

        if (rescheduleReason.length < 3) {
          return NextResponse.json(
            {
              error:
                "Adaugă motivul reprogramării.",
            },
            {
              status: 400,
            }
          );
        }

        updateData.reschedule_reason =
          rescheduleReason;
      } else {
        updateData.reschedule_reason = null;
      }
    }

    const {
      data: updatedAppointment,
      error: updateError,
    } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", appointmentId)
      .select(
        `
          id,
          status,
          scheduled_date,
          scheduled_time,
          reschedule_reason
        `
      )
      .single();

    if (updateError || !updatedAppointment) {
      console.error(
        "Secure appointment update failed:",
        updateError
      );

      return NextResponse.json(
        {
          error:
            "Programarea nu a putut fi actualizată.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Appointment PATCH API failed:", error);

    return NextResponse.json(
      {
        error:
          "A apărut o eroare neașteptată. Încearcă din nou.",
      },
      {
        status: 500,
      }
    );
  }
}