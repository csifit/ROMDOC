import { NextRequest, NextResponse } from "next/server";

import {
  BOOKING_TIME_ZONE,
  BOOKING_WINDOW_DAYS,
  MAXIMUM_AVAILABILITY_RANGE_DAYS,
  PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
  addDays,
  getAvailableDatesInRange,
  getAvailableSlotsForDate,
  getDateStringInTimeZone,
  getInclusiveDayCount,
  getPublicMinimumBookingDate,
  isIsoDate,
  isUuid,
} from "@/lib/appointments/calculate-available-slots";
import { doctorCanUseClinic } from "@/lib/doctors/clinic-subaccount-scope";
import { createClient } from "@/lib/supabase/server";

type DoctorRow = {
  id: string;
  account_type: string | null;
};

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
    console.error(
      "Available slots doctor lookup failed:",
      error
    );

    return {
      allowed: false,
      response: errorResponse(
        "Medicul selectat nu a putut fi verificat.",
        500
      ),
    };
  }

  if (!doctor) {
    return {
      allowed: false,
      response: errorResponse(
        "Medicul selectat nu este disponibil.",
        400
      ),
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
    console.error(
      "Available slots clinic scope check failed:",
      scopeError
    );

    return {
      allowed: false,
      response: errorResponse(
        "Clinica selectată nu a putut fi verificată.",
        500
      ),
    };
  }

  return {
    allowed: true,
    response: null,
  };
}

export async function GET(request: NextRequest) {
  try {
    const doctorId =
      request.nextUrl.searchParams.get("doctorId")?.trim() ??
      "";
    const clinicId =
      request.nextUrl.searchParams.get("clinicId")?.trim() ??
      "";
    const date =
      request.nextUrl.searchParams.get("date")?.trim() ?? "";
    const from =
      request.nextUrl.searchParams.get("from")?.trim() ?? "";
    const to =
      request.nextUrl.searchParams.get("to")?.trim() ?? "";

    if (!isUuid(doctorId)) {
      return errorResponse(
        "Medicul selectat nu este valid.",
        400
      );
    }

    if (!isUuid(clinicId)) {
      return errorResponse(
        "Clinica selectată nu este validă.",
        400
      );
    }

    const today = getDateStringInTimeZone(
      new Date(),
      BOOKING_TIME_ZONE
    );
    const minimumBookingDate =
      getPublicMinimumBookingDate();
    const maximumDate = addDays(
      today,
      BOOKING_WINDOW_DAYS
    );
    const supabase = await createClient();

    const clinicScope = await verifyDoctorClinicScope(
      supabase,
      doctorId,
      clinicId
    );

    if (!clinicScope.allowed) {
      return (
        clinicScope.response ??
        errorResponse(
          "Clinica selectată nu a putut fi verificată.",
          500
        )
      );
    }

    if (date) {
      if (!isIsoDate(date)) {
        return errorResponse(
          "Data selectată nu este validă.",
          400
        );
      }

      if (date < minimumBookingDate) {
        return errorResponse(
          `Programările online pot fi solicitate începând cu ${PUBLIC_BOOKING_MINIMUM_LEAD_DAYS} zile după data curentă.`,
          400
        );
      }

      if (date > maximumDate) {
        return errorResponse(
          `Programările pot fi făcute cu maximum ${BOOKING_WINDOW_DAYS} de zile în avans.`,
          400
        );
      }

      const slots = await getAvailableSlotsForDate(
        supabase,
        {
          doctorId,
          clinicId,
          date,
        }
      );

      return NextResponse.json(
        {
          minimumBookingDate,
          slots,
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store, max-age=0",
          },
        }
      );
    }

    if (!isIsoDate(from) || !isIsoDate(to)) {
      return errorResponse(
        "Intervalul calendarului nu este valid.",
        400
      );
    }

    if (from > to) {
      return errorResponse(
        "Data de început trebuie să fie înaintea datei de sfârșit.",
        400
      );
    }

    if (to < minimumBookingDate) {
      return NextResponse.json(
        {
          timezone: BOOKING_TIME_ZONE,
          bookingWindowDays: BOOKING_WINDOW_DAYS,
          minimumLeadDays:
            PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
          minimumBookingDate,
          dates: [],
        },
        {
          headers: {
            "Cache-Control":
              "private, no-store, max-age=0",
          },
        }
      );
    }

    if (to > maximumDate) {
      return errorResponse(
        `Calendarul poate afișa maximum ${BOOKING_WINDOW_DAYS} de zile în avans.`,
        400
      );
    }

    /*
     * A monthly calendar may request a range beginning today.
     * Clamp the calculation instead of returning an error.
     * Dates before minimumBookingDate remain unavailable.
     */
    const effectiveFrom =
      from < minimumBookingDate
        ? minimumBookingDate
        : from;

    const requestedDayCount = getInclusiveDayCount(
      effectiveFrom,
      to
    );

    if (
      requestedDayCount < 1 ||
      requestedDayCount >
        MAXIMUM_AVAILABILITY_RANGE_DAYS
    ) {
      return errorResponse(
        `Poți solicita maximum ${MAXIMUM_AVAILABILITY_RANGE_DAYS} de zile într-o singură cerere.`,
        400
      );
    }

    const dates = await getAvailableDatesInRange(
      supabase,
      {
        doctorId,
        clinicId,
        from: effectiveFrom,
        to,
      }
    );

    return NextResponse.json(
      {
        timezone: BOOKING_TIME_ZONE,
        bookingWindowDays: BOOKING_WINDOW_DAYS,
        minimumLeadDays:
          PUBLIC_BOOKING_MINIMUM_LEAD_DAYS,
        minimumBookingDate,
        dates,
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error(
      "Available slots API failed:",
      error
    );

    return errorResponse(
      "A apărut o eroare neașteptată.",
      500
    );
  }
}
