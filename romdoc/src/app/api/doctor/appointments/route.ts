import { NextResponse } from "next/server";
import { doctorCanUseClinic } from "@/lib/doctors/clinic-subaccount-scope";
import { sendAppointmentStatusEmail } from "@/lib/appointments/send-appointment-status-email";
import { createClient } from "@/lib/supabase/server";

type AppointmentSource = "phone" | "walk_in" | "email" | "other";

type DoctorAppointmentRequestBody = {
  clinicId?: string;
  patientName?: string;
  patientEmail?: string;
  patientPhone?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  source?: AppointmentSource;
  notes?: string;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  id: string;
  slug: string;
  clinic_translations: ClinicTranslation[] | null;
};

type DoctorRow = {
  id: string;
  slug: string;
  profile_id: string | null;
  status: string | null;
  account_type: string | null;
};

const allowedSources: AppointmentSource[] = ["phone", "walk_in", "email", "other"];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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

  const [hours, minutes, seconds = "00"] = trimmedValue.split(":");
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

function formatNameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getClinicName(clinic: ClinicRelation) {
  const romanianTranslation = clinic.clinic_translations?.find(
    (translation: ClinicTranslation) => translation.locale === "ro"
  );

  const fallbackTranslation = clinic.clinic_translations?.[0];

  return (
    romanianTranslation?.name ??
    fallbackTranslation?.name ??
    formatNameFromSlug(clinic.slug)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DoctorAppointmentRequestBody;

    const clinicId = body.clinicId?.trim();
    const patientName = body.patientName?.trim();
    const patientEmail = body.patientEmail?.trim().toLowerCase();
    const patientPhone = body.patientPhone?.trim();
    const scheduledDate = body.scheduledDate?.trim();
    const rawScheduledTime = body.scheduledTime?.trim();
    const source = body.source;
    const notes = body.notes?.trim() || null;

    if (
      !clinicId ||
      !patientName ||
      !patientEmail ||
      !patientPhone ||
      !scheduledDate ||
      !rawScheduledTime ||
      !source
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

    if (!isValidEmail(patientEmail)) {
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

    if (!isTodayOrFuture(scheduledDate)) {
      return NextResponse.json(
        {
          error: "Selectează o dată validă, începând de astăzi.",
        },
        {
          status: 400,
        }
      );
    }

    const scheduledTime = normalizeTime(rawScheduledTime);

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

    if (!allowedSources.includes(source)) {
      return NextResponse.json(
        {
          error: "Sursa programării nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    if (notes && notes.length > 5000) {
      return NextResponse.json(
        {
          error: "Observațiile sunt prea lungi.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Trebuie să fii autentificat pentru a crea o programare.",
        },
        {
          status: 401,
        }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, first_name, last_name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Doctor appointment profile lookup failed:", profileError);

      return NextResponse.json(
        {
          error: "Profilul utilizatorului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (!profile || profile.role !== "doctor") {
      return NextResponse.json(
        {
          error: "Doar medicii pot adăuga programări prin această pagină.",
        },
        {
          status: 403,
        }
      );
    }

    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .select("id, slug, profile_id, status, account_type")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (doctorError) {
      console.error("Doctor appointment doctor lookup failed:", doctorError);

      return NextResponse.json(
        {
          error: "Profilul medicului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (!doctor) {
      return NextResponse.json(
        {
          error: "Contul tău nu este asociat unui profil de medic.",
        },
        {
          status: 403,
        }
      );
    }

    if (doctor.status === "suspended") {
      return NextResponse.json(
        {
          error: "Profilul medicului este suspendat și nu poate crea programări.",
        },
        {
          status: 403,
        }
      );
    }

    let clinicIsAllowed = false;

    try {
      clinicIsAllowed = await doctorCanUseClinic(
        supabase,
        doctor as DoctorRow,
        clinicId
      );
    } catch (scopeError) {
      console.error("Doctor appointment clinic scope check failed:", scopeError);

      return NextResponse.json(
        {
          error: "Clinica selectată nu a putut fi verificată.",
        },
        {
          status: 500,
        }
      );
    }

    if (!clinicIsAllowed) {
      return NextResponse.json(
        {
          error: "Nu poți crea o programare pentru o clinică neasociată sau neatribuită profilului tău.",
        },
        {
          status: 403,
        }
      );
    }

    const { data: clinicData, error: clinicError } = await supabase
      .from("clinics")
      .select(
        `
          id,
          slug,
          clinic_translations (
            locale,
            name
          )
        `
      )
      .eq("id", clinicId)
      .maybeSingle();

    if (clinicError) {
      console.error("Doctor appointment clinic lookup failed:", clinicError);

      return NextResponse.json(
        {
          error: "Datele clinicii selectate nu sunt disponibile.",
        },
        {
          status: 500,
        }
      );
    }

    if (!clinicData) {
      return NextResponse.json(
        {
          error: "Datele clinicii selectate nu sunt disponibile.",
        },
        {
          status: 500,
        }
      );
    }

    const clinic = clinicData as ClinicRelation;
    const appointmentId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const appointment = {
      id: appointmentId,
      doctor_id: doctor.id,
      clinic_id: clinicId,
      created_by_profile_id: user.id,
      source,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      requested_date: scheduledDate,
      requested_time: scheduledTime,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      reschedule_reason: null,
      notes,
      status: "confirmed" as const,
      created_at: createdAt,
    };

    const { error: appointmentError } = await supabase
      .from("appointments")
      .insert(appointment);

    if (appointmentError) {
      console.error("Doctor-created appointment insert failed:", appointmentError);

      return NextResponse.json(
        {
          error: "Programarea nu a putut fi creată.",
        },
        {
          status: 500,
        }
      );
    }

    const profileName = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    const doctorName = profileName || formatNameFromSlug(doctor.slug);
    const clinicName = getClinicName(clinic);

    const emailResult = await sendAppointmentStatusEmail({
      status: "confirmed",
      patientName,
      patientEmail,
      doctorName,
      clinicName,
      scheduledDate,
      scheduledTime,
      rescheduleReason: null,
    });

    if (!emailResult.sent) {
      console.error(
        `Doctor-created appointment ${appointmentId} was saved, but its confirmation email was not sent.`
      );
    }

    return NextResponse.json(
      {
        success: true,
        appointment,
        emailSent: emailResult.sent,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Doctor-created appointment API failed:", error);

    return NextResponse.json(
      {
        error: "A apărut o eroare neașteptată. Încearcă din nou.",
      },
      {
        status: 500,
      }
    );
  }
}
