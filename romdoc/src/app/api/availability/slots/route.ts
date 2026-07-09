import { NextRequest, NextResponse } from "next/server";
import { doctorCanUseClinic } from "@/lib/doctors/clinic-subaccount-scope";
import { createClient } from "@/lib/supabase/server";

type SlotRow = {
  slot_time: string;
  duration_minutes: number;
};

type PublicSlot = {
  time: string;
  durationMinutes: number;
};

type AvailableDate = {
  date: string;
  availableSlotCount: number;
  slots: PublicSlot[];
};

type DoctorRow = {
  id: string;
  account_type: string | null;
};

const BOOKING_TIME_ZONE = "Europe/Bucharest";
const BOOKING_WINDOW_DAYS = 90;
const MAXIMUM_RANGE_DAYS = 42;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
}

function getDateStringInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("The booking date could not be calculated.");
  }

  return `${year}-${month}-${day}`;
}

function addDays(value: string, numberOfDays: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + numberOfDays);

  return date.toISOString().slice(0, 10);
}

function getInclusiveDayCount(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);

  return Math.floor((end - start) / 86_400_000) + 1;
}

function getDatesInRange(from: string, to: string) {
  const dates: string[] = [];
  let currentDate = from;

  while (currentDate <= to) {
    dates.push(currentDate);
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}

function mapSlots(rows: SlotRow[] | null): PublicSlot[] {
  return (rows ?? []).map((row: SlotRow) => ({
    time: row.slot_time.slice(0, 5),
    durationMinutes: row.duration_minutes,
  }));
}

function errorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

async function verifyDoctorClinicScope(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
  clinicId: string
) {
  const { data: doctor, error } = await supabase
    .from("doctors")
    .select("id, account_type")
    .eq("id", doctorId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("Available slots doctor lookup failed:", error);
    return {
      allowed: false,
      response: errorResponse("Medicul selectat nu a putut fi verificat.", 500),
    };
  }

  if (!doctor) {
    return {
      allowed: false,
      response: errorResponse("Medicul selectat nu este disponibil.", 400),
    };
  }

  try {
    const allowed = await doctorCanUseClinic(
      supabase,
      doctor as DoctorRow,
      clinicId
    );

    if (!allowed) {
      return {
        allowed: false,
        response: errorResponse(
          "Clinica selectată nu este disponibilă pentru acest medic.",
          400
        ),
      };
    }
  } catch (scopeError) {
    console.error("Available slots clinic scope check failed:", scopeError);
    return {
      allowed: false,
      response: errorResponse("Clinica selectată nu a putut fi verificată.", 500),
    };
  }

  return {
    allowed: true,
    response: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const doctorId = request.nextUrl.searchParams.get("doctorId")?.trim() ?? "";
    const clinicId = request.nextUrl.searchParams.get("clinicId")?.trim() ?? "";
    const date = request.nextUrl.searchParams.get("date")?.trim() ?? "";
    const from = request.nextUrl.searchParams.get("from")?.trim() ?? "";
    const to = request.nextUrl.searchParams.get("to")?.trim() ?? "";

    if (!isUuid(doctorId)) {
      return errorResponse("Medicul selectat nu este valid.", 400);
    }

    if (!isUuid(clinicId)) {
      return errorResponse("Clinica selectată nu este validă.", 400);
    }

    const today = getDateStringInTimeZone(new Date(), BOOKING_TIME_ZONE);
    const maximumDate = addDays(today, BOOKING_WINDOW_DAYS);
    const supabase = await createClient();

    const clinicScope = await verifyDoctorClinicScope(
      supabase,
      doctorId,
      clinicId
    );

    if (!clinicScope.allowed) {
      return clinicScope.response ?? errorResponse(
        "Clinica selectată nu a putut fi verificată.",
        500
      );
    }

    if (date) {
      if (!isDate(date)) {
        return errorResponse("Data selectată nu este validă.", 400);
      }

      if (date < today) {
        return errorResponse("Nu poți selecta o dată din trecut.", 400);
      }

      if (date > maximumDate) {
        return errorResponse(
          `Programările pot fi făcute cu maximum ${BOOKING_WINDOW_DAYS} de zile în avans.`,
          400
        );
      }

      const { data, error } = await supabase.rpc(
        "get_available_appointment_slots",
        {
          target_doctor_id: doctorId,
          target_clinic_id: clinicId,
          target_date: date,
        }
      );

      if (error) {
        console.error("Available slots RPC failed:", error);
        return errorResponse(
          "Intervalele disponibile nu au putut fi încărcate.",
          500
        );
      }

      return NextResponse.json(
        {
          slots: mapSlots((data as SlotRow[] | null) ?? []),
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        }
      );
    }

    if (!isDate(from) || !isDate(to)) {
      return errorResponse("Intervalul calendarului nu este valid.", 400);
    }

    if (from > to) {
      return errorResponse(
        "Data de început trebuie să fie înaintea datei de sfârșit.",
        400
      );
    }

    if (from < today) {
      return errorResponse("Calendarul nu poate solicita date din trecut.", 400);
    }

    if (to > maximumDate) {
      return errorResponse(
        `Calendarul poate afișa maximum ${BOOKING_WINDOW_DAYS} de zile în avans.`,
        400
      );
    }

    const requestedDayCount = getInclusiveDayCount(from, to);

    if (requestedDayCount < 1 || requestedDayCount > MAXIMUM_RANGE_DAYS) {
      return errorResponse(
        `Poți solicita maximum ${MAXIMUM_RANGE_DAYS} de zile într-o singură cerere.`,
        400
      );
    }

    const requestedDates = getDatesInRange(from, to);

    const dates: AvailableDate[] = await Promise.all(
      requestedDates.map(async (targetDate) => {
        const { data, error } = await supabase.rpc(
          "get_available_appointment_slots",
          {
            target_doctor_id: doctorId,
            target_clinic_id: clinicId,
            target_date: targetDate,
          }
        );

        if (error) {
          console.error(`Available slots RPC failed for ${targetDate}:`, error);
          throw new Error("AVAILABLE_SLOTS_RPC_FAILED");
        }

        const slots = mapSlots((data as SlotRow[] | null) ?? []);

        return {
          date: targetDate,
          availableSlotCount: slots.length,
          slots,
        };
      })
    );

    return NextResponse.json(
      {
        timezone: BOOKING_TIME_ZONE,
        bookingWindowDays: BOOKING_WINDOW_DAYS,
        dates,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("Available slots API failed:", error);

    return errorResponse("A apărut o eroare neașteptată.", 500);
  }
}
