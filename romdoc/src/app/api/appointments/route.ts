import {
  NextRequest,
  NextResponse,
} from "next/server";
import { Resend } from "resend";

import { createClient } from "@/lib/supabase/server";

type AppointmentRequestBody = {
  doctorId?: string;
  clinicId?: string;
  doctorName?: string;
  clinicName?: string;
  patientName?: string;
  patientPhone?: string;
  requestedDate?: string;
  requestedTime?: string;
  durationMinutes?: number;
  notes?: string | null;
};

type AvailableSlotRow = {
  slot_time: string;
  duration_minutes: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate =
    new Date(
      `${value}T12:00:00`
    );

  return !Number.isNaN(
    parsedDate.getTime()
  );
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value
  );
}

function getLocalDateString(
  date: Date
) {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAppointmentDate(
  date: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(
      `${date}T12:00:00`
    )
  );
}

function escapeHtml(
  value: string
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getFriendlyAppointmentError(
  message: string | undefined
) {
  const normalizedMessage =
    message?.toLowerCase() ??
    "";

  if (
    normalizedMessage.includes(
      "appointments_no_doctor_overlap"
    ) ||
    normalizedMessage.includes(
      "conflicting key value violates exclusion constraint"
    ) ||
    normalizedMessage.includes(
      "exclusion constraint"
    )
  ) {
    return "Intervalul selectat tocmai a fost ocupat. Alege o altă oră disponibilă.";
  }

  if (
    normalizedMessage.includes(
      "outside the doctor's working hours"
    )
  ) {
    return "Ora selectată nu se află în programul de lucru al medicului.";
  }

  if (
    normalizedMessage.includes(
      "overlaps a configured break"
    )
  ) {
    return "Ora selectată se suprapune cu o pauză din programul medicului.";
  }

  if (
    normalizedMessage.includes(
      "doctor is unavailable"
    )
  ) {
    return "Medicul nu este disponibil în perioada selectată.";
  }

  if (
    normalizedMessage.includes(
      "duration does not match"
    )
  ) {
    return "Durata programării nu corespunde intervalului configurat de medic.";
  }

  if (
    normalizedMessage.includes(
      "selected clinic is not associated"
    )
  ) {
    return "Clinica selectată nu este asociată acestui medic.";
  }

  if (
    normalizedMessage.includes(
      "row-level security"
    )
  ) {
    return "Contul nu are permisiunea necesară pentru a crea această programare.";
  }

  return "Intervalul selectat nu mai este disponibil. Reîncarcă orele și încearcă din nou.";
}

function jsonError(
  message: string,
  status: number
) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  try {
    let body:
      AppointmentRequestBody;

    try {
      body =
        (await request.json()) as
          AppointmentRequestBody;
    } catch {
      return jsonError(
        "Cererea nu conține date JSON valide.",
        400
      );
    }

    const doctorId =
      body.doctorId?.trim();

    const clinicId =
      body.clinicId?.trim();

    const doctorName =
      body.doctorName?.trim();

    const clinicName =
      body.clinicName?.trim();

    const patientName =
      body.patientName?.trim();

    const patientPhone =
      body.patientPhone?.trim();

    const requestedDate =
      body.requestedDate?.trim();

    const requestedTime =
      body.requestedTime?.trim();

    const durationMinutes =
      Number(
        body.durationMinutes
      );

    const notes =
      body.notes?.trim() ||
      null;

    if (
      !doctorId ||
      !clinicId ||
      !doctorName ||
      !clinicName ||
      !patientName ||
      !patientPhone ||
      !requestedDate ||
      !requestedTime
    ) {
      return jsonError(
        "Completează toate câmpurile obligatorii și selectează o oră disponibilă.",
        400
      );
    }

    if (!isUuid(doctorId)) {
      return jsonError(
        "Medicul selectat nu este valid.",
        400
      );
    }

    if (!isUuid(clinicId)) {
      return jsonError(
        "Clinica selectată nu este validă.",
        400
      );
    }

    if (
      patientName.length < 2 ||
      patientName.length > 120
    ) {
      return jsonError(
        "Introdu un nume valid.",
        400
      );
    }

    if (
      patientPhone.length < 7 ||
      patientPhone.length > 40
    ) {
      return jsonError(
        "Introdu un număr de telefon valid.",
        400
      );
    }

    if (
      doctorName.length > 160 ||
      clinicName.length > 200
    ) {
      return jsonError(
        "Datele medicului sau clinicii nu sunt valide.",
        400
      );
    }

    if (
      !isValidDate(
        requestedDate
      )
    ) {
      return jsonError(
        "Data programării nu este validă.",
        400
      );
    }

    if (
      !isValidTime(
        requestedTime
      )
    ) {
      return jsonError(
        "Ora programării nu este validă.",
        400
      );
    }

    if (
      !Number.isInteger(
        durationMinutes
      ) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      return jsonError(
        "Durata programării nu este validă.",
        400
      );
    }

    if (
      notes &&
      notes.length > 2000
    ) {
      return jsonError(
        "Mesajul pentru medic este prea lung.",
        400
      );
    }

    const today =
      getLocalDateString(
        new Date()
      );

    if (
      requestedDate < today
    ) {
      return jsonError(
        "Nu poți solicita o programare pentru o dată din trecut.",
        400
      );
    }

    const maximumDate =
      new Date();

    maximumDate.setDate(
      maximumDate.getDate() +
        180
    );

    if (
      requestedDate >
      getLocalDateString(
        maximumDate
      )
    ) {
      return jsonError(
        "Programările pot fi solicitate cu maximum 180 de zile în avans.",
        400
      );
    }

    const supabase =
      await createClient();

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      return jsonError(
        "Trebuie să fii autentificat pentru a solicita o programare.",
        401
      );
    }

    if (
      !user.email_confirmed_at
    ) {
      return jsonError(
        "Confirmă adresa de e-mail înainte de a solicita o programare.",
        403
      );
    }

    if (!user.email) {
      return jsonError(
        "Contul autentificat nu are o adresă de e-mail validă.",
        400
      );
    }

    const {
      data:
        patientProfile,
      error:
        patientProfileError,
    } =
      await supabase
        .from("profiles")
        .select(`
          id,
          role,
          account_status
        `)
        .eq(
          "id",
          user.id
        )
        .maybeSingle();

    if (
      patientProfileError
    ) {
      console.error(
        "Patient profile lookup failed:",
        patientProfileError
      );

      return jsonError(
        "Contul pacientului nu a putut fi verificat.",
        500
      );
    }

    if (
      !patientProfile ||
      ![
        "patient",
        "user",
      ].includes(
        patientProfile.role
      ) ||
      (
        patientProfile
          .account_status &&
        patientProfile
          .account_status !==
          "active"
      )
    ) {
      return jsonError(
        "Doar conturile active de pacient pot solicita programări.",
        403
      );
    }

    const patientEmail =
      user.email
        .trim()
        .toLowerCase();

    const {
      data: doctor,
      error: doctorError,
    } =
      await supabase
        .from("doctors")
        .select("id")
        .eq(
          "id",
          doctorId
        )
        .eq(
          "status",
          "active"
        )
        .maybeSingle();

    if (doctorError) {
      console.error(
        "Appointment doctor lookup failed:",
        doctorError
      );

      return jsonError(
        "Medicul selectat nu a putut fi verificat.",
        500
      );
    }

    if (!doctor) {
      return jsonError(
        "Medicul selectat nu este disponibil.",
        400
      );
    }

    const {
      data: doctorClinic,
      error:
        doctorClinicError,
    } =
      await supabase
        .from(
          "doctor_clinics"
        )
        .select(`
          doctor_id,
          clinic_id
        `)
        .eq(
          "doctor_id",
          doctorId
        )
        .eq(
          "clinic_id",
          clinicId
        )
        .maybeSingle();

    if (
      doctorClinicError
    ) {
      console.error(
        "Appointment doctor-clinic lookup failed:",
        doctorClinicError
      );

      return jsonError(
        "Clinica selectată nu a putut fi verificată.",
        500
      );
    }

    if (!doctorClinic) {
      return jsonError(
        "Clinica selectată nu este disponibilă pentru acest medic.",
        400
      );
    }

    const {
      data:
        availableSlots,
      error: slotsError,
    } =
      await supabase.rpc(
        "get_available_appointment_slots",
        {
          target_doctor_id:
            doctorId,
          target_clinic_id:
            clinicId,
          target_date:
            requestedDate,
        }
      );

    if (slotsError) {
      console.error(
        "Appointment slot verification failed:",
        slotsError
      );

      return jsonError(
        "Ora selectată nu a putut fi verificată. Reîncarcă pagina și încearcă din nou.",
        500
      );
    }

    const slotRows =
      (
        availableSlots as
          | AvailableSlotRow[]
          | null
      ) ?? [];

    const selectedSlot =
      slotRows.find(
        (slot) =>
          slot.slot_time
            .slice(0, 5) ===
            requestedTime &&
          Number(
            slot.duration_minutes
          ) ===
            durationMinutes
      );

    if (!selectedSlot) {
      return jsonError(
        "Intervalul selectat nu mai este disponibil. Alege o altă oră.",
        409
      );
    }

    const appointmentId =
      crypto.randomUUID();

    const {
      error:
        appointmentError,
    } =
      await supabase
        .from(
          "appointments"
        )
        .insert({
          id:
            appointmentId,
          patient_profile_id:
            user.id,
          doctor_id:
            doctorId,
          clinic_id:
            clinicId,
          patient_name:
            patientName,
          patient_email:
            patientEmail,
          patient_phone:
            patientPhone,
          requested_date:
            requestedDate,
          requested_time:
            requestedTime,
          duration_minutes:
            durationMinutes,
          notes,
          status:
            "pending",
          source:
            "online",
          created_by_profile_id:
            user.id,
        });

    if (
      appointmentError
    ) {
      console.error(
        "Appointment insert failed:",
        appointmentError
      );

      const isConflict =
        appointmentError.code ===
          "23P01" ||
        appointmentError.message
          .toLowerCase()
          .includes(
            "exclusion constraint"
          );

      return jsonError(
        getFriendlyAppointmentError(
          appointmentError.message
        ),
        isConflict
          ? 409
          : 500
      );
    }

    const resendApiKey =
      process.env
        .RESEND_API_KEY;

    const resendFromEmail =
      process.env
        .RESEND_FROM_EMAIL;

    if (
      !resendApiKey ||
      !resendFromEmail
    ) {
      console.error(
        "Resend environment variables are missing."
      );

      return NextResponse.json(
        {
          success: true,
          appointmentId,
          emailSent: false,
        },
        {
          status: 201,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    const resend =
      new Resend(
        resendApiKey
      );

    const safePatientName =
      escapeHtml(
        patientName
      );

    const safeDoctorName =
      escapeHtml(
        doctorName
      );

    const safeClinicName =
      escapeHtml(
        clinicName
      );

    const safePatientPhone =
      escapeHtml(
        patientPhone
      );

    const safeNotes =
      notes
        ? escapeHtml(
            notes
          )
        : null;

    const formattedDate =
      formatAppointmentDate(
        requestedDate
      );

    const formattedTime =
      requestedTime.slice(
        0,
        5
      );

    const {
      error: emailError,
    } =
      await resend.emails.send({
        from:
          resendFromEmail,
        to:
          patientEmail,
        subject:
          `Cerere de programare primită – ${doctorName}`,
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

                  <p
                    style="
                      margin-top: 20px;
                      line-height: 1.7;
                    "
                  >
                    Bună, ${safePatientName}.
                  </p>

                  <p style="line-height: 1.7;">
                    Am primit cererea ta de programare.
                    Clinica te va contacta pentru confirmare.
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
                      <strong>Medic:</strong>
                      ${safeDoctorName}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Clinică:</strong>
                      ${safeClinicName}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Data solicitată:</strong>
                      ${formattedDate}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Ora solicitată:</strong>
                      ${formattedTime}
                    </p>

                    <p style="margin: 0 0 10px;">
                      <strong>Durata:</strong>
                      ${durationMinutes} minute
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
                    Aceasta nu este încă o confirmare finală
                    a programării.
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
        "Appointment request email failed:",
        emailError
      );

      return NextResponse.json(
        {
          success: true,
          appointmentId,
          emailSent: false,
        },
        {
          status: 201,
          headers: {
            "Cache-Control":
              "no-store",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointmentId,
        emailSent: true,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "Appointment API failed:",
      error
    );

    return jsonError(
      "A apărut o eroare neașteptată. Încearcă din nou.",
      500
    );
  }
}
