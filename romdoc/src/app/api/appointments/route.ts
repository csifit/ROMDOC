import { NextRequest, NextResponse } from "next/server";

import { doctorCanUseClinic } from "@/lib/doctors/clinic-subaccount-scope";
import {
  sendAppointmentRequestEmail,
} from "@/lib/appointments/send-appointment-request-email";
import {
  resolveAppointmentNotificationLocale,
} from "@/lib/appointments/notification-locale";
import { createClient } from "@/lib/supabase/server";

import {
  PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
  getPublicMinimumBookingDate,
} from "@/lib/appointments/calculate-available-slots";

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
  notificationLocale?: unknown;
};

type AvailableSlotRow = {
  slot_time: string;
  duration_minutes: number;
};

type DoctorRow = {
  id: string;
  account_type: string | null;
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

  const parsedDate = new Date(`${value}T12:00:00`);

  return !Number.isNaN(parsedDate.getTime());
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getFriendlyAppointmentError(message: string | undefined) {
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (
    normalizedMessage.includes("appointments_no_doctor_overlap") ||
    normalizedMessage.includes("conflicting key value violates exclusion constraint") ||
    normalizedMessage.includes("exclusion constraint")
  ) {
    return "Intervalul selectat tocmai a fost ocupat. Alege o altă oră disponibilă.";
  }

  if (normalizedMessage.includes("outside the doctor's working hours")) {
    return "Ora selectată nu se află în programul de lucru al medicului.";
  }

  if (normalizedMessage.includes("overlaps a configured break")) {
    return "Ora selectată se suprapune cu o pauză din programul medicului.";
  }

  if (normalizedMessage.includes("doctor is unavailable")) {
    return "Medicul nu este disponibil în perioada selectată.";
  }

  if (normalizedMessage.includes("duration does not match")) {
    return "Durata programării nu corespunde intervalului configurat de medic.";
  }

  if (normalizedMessage.includes("selected clinic is not associated")) {
    return "Clinica selectată nu este asociată acestui medic.";
  }

  if (normalizedMessage.includes("row-level security")) {
    return "Contul nu are permisiunea necesară pentru a crea această programare.";
  }

  return "Intervalul selectat nu mai este disponibil. Reîncarcă orele și încearcă din nou.";
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    let body: AppointmentRequestBody;

    try {
      body = (await request.json()) as AppointmentRequestBody;
    } catch {
      return jsonError("Cererea nu conține date JSON valide.", 400);
    }

    const doctorId = body.doctorId?.trim();
    const clinicId = body.clinicId?.trim();
    const doctorName = body.doctorName?.trim();
    const clinicName = body.clinicName?.trim();
    const patientName = body.patientName?.trim();
    const patientPhone = body.patientPhone?.trim();
    const requestedDate = body.requestedDate?.trim();
    const requestedTime = body.requestedTime?.trim();
    const durationMinutes = Number(body.durationMinutes);
    const notes = body.notes?.trim() || null;
    const notificationLocale =
      resolveAppointmentNotificationLocale(
        body.notificationLocale
      );

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
      return jsonError("Medicul selectat nu este valid.", 400);
    }

    if (!isUuid(clinicId)) {
      return jsonError("Clinica selectată nu este validă.", 400);
    }

    if (patientName.length < 2 || patientName.length > 120) {
      return jsonError("Introdu un nume valid.", 400);
    }

    if (patientPhone.length < 7 || patientPhone.length > 40) {
      return jsonError("Introdu un număr de telefon valid.", 400);
    }

    if (doctorName.length > 160 || clinicName.length > 200) {
      return jsonError("Datele medicului sau clinicii nu sunt valide.", 400);
    }

    if (!isValidDate(requestedDate)) {
      return jsonError("Data programării nu este validă.", 400);
    }

    if (!isValidTime(requestedTime)) {
      return jsonError("Ora programării nu este validă.", 400);
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      return jsonError("Durata programării nu este validă.", 400);
    }

    if (notes && notes.length > 2000) {
      return jsonError("Mesajul pentru medic este prea lung.", 400);
    }

    const minimumBookingDate =
      getPublicMinimumBookingDate();
  
    if (requestedDate < minimumBookingDate) {
      return jsonError(
       `Programările online pot fi solicitate începând cu ${PUBLIC_BOOKING_MINIMUM_LEAD_DAYS} zile după data curentă.`,
       400
      );
    }

    const maximumDate = new Date();
    maximumDate.setDate(maximumDate.getDate() + 180);

    if (requestedDate > getLocalDateString(maximumDate)) {
      return jsonError(
        "Programările pot fi solicitate cu maximum 180 de zile în avans.",
        400
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return jsonError(
        "Trebuie să fii autentificat pentru a solicita o programare.",
        401
      );
    }

    if (!user.email_confirmed_at) {
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

    const { data: patientProfile, error: patientProfileError } = await supabase
      .from("profiles")
      .select("id, role, account_status")
      .eq("id", user.id)
      .maybeSingle();

    if (patientProfileError) {
      console.error("Patient profile lookup failed:", patientProfileError);

      return jsonError("Contul pacientului nu a putut fi verificat.", 500);
    }

    if (
      !patientProfile ||
      !["patient", "user"].includes(patientProfile.role) ||
      (patientProfile.account_status && patientProfile.account_status !== "active")
    ) {
      return jsonError(
        "Doar conturile active de pacient pot solicita programări.",
        403
      );
    }

    const patientEmail = user.email.trim().toLowerCase();

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, account_type")
      .eq("id", doctorId)
      .eq("status", "active")
      .maybeSingle();

    if (doctorError) {
      console.error("Appointment doctor lookup failed:", doctorError);

      return jsonError("Medicul selectat nu a putut fi verificat.", 500);
    }

    if (!doctor) {
      return jsonError("Medicul selectat nu este disponibil.", 400);
    }

    let doctorClinicIsAllowed = false;

    try {
      doctorClinicIsAllowed = await doctorCanUseClinic(
        supabase,
        doctor as DoctorRow,
        clinicId
      );
    } catch (scopeError) {
      console.error("Appointment doctor-clinic scope check failed:", scopeError);

      return jsonError("Clinica selectată nu a putut fi verificată.", 500);
    }

    if (!doctorClinicIsAllowed) {
      return jsonError(
        "Clinica selectată nu este disponibilă pentru acest medic.",
        400
      );
    }

    const { data: availableSlots, error: slotsError } = await supabase.rpc(
      "get_available_appointment_slots",
      {
        target_doctor_id: doctorId,
        target_clinic_id: clinicId,
        target_date: requestedDate,
      }
    );

    if (slotsError) {
      console.error("Appointment slot verification failed:", slotsError);

      return jsonError(
        "Ora selectată nu a putut fi verificată. Reîncarcă pagina și încearcă din nou.",
        500
      );
    }

    const slotRows = (availableSlots as AvailableSlotRow[] | null) ?? [];

    const selectedSlot = slotRows.find(
      (slot) =>
        slot.slot_time.slice(0, 5) === requestedTime &&
        Number(slot.duration_minutes) === durationMinutes
    );

    if (!selectedSlot) {
      return jsonError(
        "Intervalul selectat nu mai este disponibil. Alege o altă oră.",
        409
      );
    }

    const appointmentId = crypto.randomUUID();

    const { error: appointmentError } = await supabase
      .from("appointments")
      .insert({
        id: appointmentId,
        patient_profile_id: user.id,
        doctor_id: doctorId,
        clinic_id: clinicId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone,
        notification_locale:
          notificationLocale,
        requested_date: requestedDate,
        requested_time: requestedTime,
        duration_minutes: durationMinutes,
        notes,
        status: "pending",
        source: "online",
        created_by_profile_id: user.id,
      });

    if (appointmentError) {
      console.error("Appointment insert failed:", appointmentError);

      const isConflict =
        appointmentError.code === "23P01" ||
        appointmentError.message.toLowerCase().includes("exclusion constraint");

      return jsonError(
        getFriendlyAppointmentError(appointmentError.message),
        isConflict ? 409 : 500
      );
    }

    const emailResult =
      await sendAppointmentRequestEmail({
        appointmentId,
        locale:
          notificationLocale,
        patientName,
        patientEmail,
        patientPhone,
        doctorName,
        clinicName,
        requestedDate,
        requestedTime,
        notes,
      });

    if (
      !emailResult.sent &&
      !emailResult.skipped
    ) {
      console.error(
        "Patient appointment request email failed:",
        {
          errorCode:
            emailResult.errorCode,
          errorMessage:
            emailResult.errorMessage,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointmentId,
        emailSent:
          emailResult.sent,
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
    console.error("Appointment request API failed:", error);

    return jsonError("A apărut o eroare neașteptată.", 500);
  }
}
