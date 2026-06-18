import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AppointmentRequestBody;

    const doctorId = body.doctorId?.trim();
    const clinicId = body.clinicId?.trim();
    const doctorName = body.doctorName?.trim();
    const clinicName = body.clinicName?.trim();
    const patientName = body.patientName?.trim();
    const patientEmail = body.patientEmail?.trim().toLowerCase();
    const patientPhone = body.patientPhone?.trim();
    const requestedDate = body.requestedDate?.trim();
    const requestedTime = body.requestedTime?.trim() || null;
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDate = new Date(`${requestedDate}T12:00:00`);

    if (
      Number.isNaN(appointmentDate.getTime()) ||
      appointmentDate < today
    ) {
      return NextResponse.json(
        {
          error: "Selectează o dată validă din viitor.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("id", doctorId)
      .eq("status", "active")
      .maybeSingle();

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

    const { data: doctorClinic } = await supabase
      .from("doctor_clinics")
      .select("doctor_id, clinic_id")
      .eq("doctor_id", doctorId)
      .eq("clinic_id", clinicId)
      .maybeSingle();

    if (!doctorClinic) {
      return NextResponse.json(
        {
          error: "Clinica selectată nu este disponibilă pentru acest medic.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        doctor_id: doctorId,
        clinic_id: clinicId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        requested_date: requestedDate,
        requested_time: requestedTime,
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
    const resendFromEmail = process.env.RESEND_FROM_EMAIL;

    if (!resendApiKey || !resendFromEmail) {
      console.error("Resend environment variables are missing.");

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

    const formattedDate = formatAppointmentDate(requestedDate);
    const formattedTime = requestedTime
      ? requestedTime.slice(0, 5)
      : "Ora nu a fost specificată";

    const { error: emailError } = await resend.emails.send({
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
                    <strong>Data solicitată:</strong> ${formattedDate}
                  </p>

                  <p style="margin: 0 0 10px;">
                    <strong>Ora preferată:</strong> ${formattedTime}
                  </p>

                  <p style="margin: 0;">
                    <strong>Telefon:</strong> ${safePatientPhone}
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
    console.error("Appointment API failed:", error);

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