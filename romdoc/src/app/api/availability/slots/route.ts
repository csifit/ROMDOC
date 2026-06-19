import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SlotRow = {
  slot_time: string;
  duration_minutes: number;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(
    `${value}T12:00:00`
  );

  return !Number.isNaN(
    parsedDate.getTime()
  );
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export async function GET(
  request: NextRequest
) {
  try {
    const doctorId =
      request.nextUrl.searchParams
        .get("doctorId")
        ?.trim() ?? "";

    const clinicId =
      request.nextUrl.searchParams
        .get("clinicId")
        ?.trim() ?? "";

    const date =
      request.nextUrl.searchParams
        .get("date")
        ?.trim() ?? "";

    if (!isUuid(doctorId)) {
      return NextResponse.json(
        {
          error:
            "Medicul selectat nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isUuid(clinicId)) {
      return NextResponse.json(
        {
          error:
            "Clinica selectată nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    if (!isDate(date)) {
      return NextResponse.json(
        {
          error:
            "Data selectată nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const today =
      getLocalDateString(new Date());

    if (date < today) {
      return NextResponse.json(
        {
          error:
            "Nu poți selecta o dată din trecut.",
        },
        {
          status: 400,
        }
      );
    }

    const maximumDate = new Date();

    maximumDate.setDate(
      maximumDate.getDate() + 180
    );

    if (
      date >
      getLocalDateString(maximumDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Programările pot fi făcute cu maximum 180 de zile în avans.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const {
      data,
      error,
    } = await supabase.rpc(
      "get_available_appointment_slots",
      {
        target_doctor_id:
          doctorId,
        target_clinic_id:
          clinicId,
        target_date:
          date,
      }
    );

    if (error) {
      console.error(
        "Available slots RPC failed:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Intervalele disponibile nu au putut fi încărcate.",
        },
        {
          status: 500,
        }
      );
    }

    const rows =
      (data as SlotRow[] | null) ?? [];

    const slots = rows.map(
      (row: SlotRow) => ({
        time:
          row.slot_time.slice(0, 5),

        durationMinutes:
          row.duration_minutes,
      })
    );

    return NextResponse.json({
      slots,
    });
  } catch (error) {
    console.error(
      "Available slots API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}