import { NextResponse } from "next/server";
import {
  doctorCanUseClinic,
  isClinicSubAccountDoctor,
} from "@/lib/doctors/clinic-subaccount-scope";
import { createClient } from "@/lib/supabase/server";

type CreateResource = "availability" | "break" | "day_off";
type DeleteResource = "availability" | "break" | "day_off";

type CreateRequestBody = {
  resource?: CreateResource;
  clinicId?: string;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  isActive?: boolean;
  availabilityId?: string;
  label?: string;
  date?: string;
  isAllDay?: boolean;
  reason?: string;
};

type UpdateRequestBody = {
  availabilityId?: string;
  clinicId?: string;
  weekday?: number;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  isActive?: boolean;
};

type DeleteRequestBody = {
  resource?: DeleteResource;
  id?: string;
};

type AuthenticatedDoctor = {
  id: string;
  profile_id: string | null;
  status: string | null;
  account_type: string | null;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function isTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value);
}

function normalizeTime(value: string) {
  return value.length === 5 ? `${value}:00` : value;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function isDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00`);

  return !Number.isNaN(parsed.getTime());
}

async function getAuthenticatedDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error: "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "doctor") {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error: "Doar medicii își pot administra disponibilitatea.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, profile_id, status, account_type")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    console.error("Availability doctor lookup failed:", doctorError);

    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error: "Profilul medicului nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  if (doctor.status === "suspended") {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error: "Profilul medicului este suspendat și nu poate administra disponibilitatea.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    supabase,
    doctor: doctor as AuthenticatedDoctor,
    errorResponse: null,
  };
}

async function verifyClinic(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctor: AuthenticatedDoctor,
  clinicId: string
) {
  try {
    const valid = await doctorCanUseClinic(supabase, doctor, clinicId);

    return {
      valid,
      error: null,
    };
  } catch (error) {
    return {
      valid: false,
      error,
    };
  }
}

async function verifyClinicOrReturnResponse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctor: AuthenticatedDoctor,
  clinicId: string
) {
  const clinicCheck = await verifyClinic(supabase, doctor, clinicId);

  if (clinicCheck.error) {
    console.error("Availability clinic scope check failed:", clinicCheck.error);

    return NextResponse.json(
      {
        error: "Clinica selectată nu a putut fi verificată.",
      },
      {
        status: 500,
      }
    );
  }

  if (!clinicCheck.valid) {
    return NextResponse.json(
      {
        error: "Clinica nu este asociată sau atribuită profilului tău.",
      },
      {
        status: 403,
      }
    );
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateRequestBody;
    const { supabase, doctor, errorResponse } = await getAuthenticatedDoctor();

    if (errorResponse || !doctor) {
      return errorResponse;
    }

    if (body.resource === "availability") {
      const clinicId = body.clinicId?.trim();
      const weekday = Number(body.weekday);
      const durationMinutes = Number(body.durationMinutes);
      const rawStartTime = body.startTime?.trim();
      const rawEndTime = body.endTime?.trim();

      if (!clinicId || !isUuid(clinicId)) {
        return NextResponse.json(
          {
            error: "Clinica selectată nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
        return NextResponse.json(
          {
            error: "Ziua săptămânii nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      if (!rawStartTime || !rawEndTime || !isTime(rawStartTime) || !isTime(rawEndTime)) {
        return NextResponse.json(
          {
            error: "Orele de început și sfârșit nu sunt valide.",
          },
          {
            status: 400,
          }
        );
      }

      const startTime = normalizeTime(rawStartTime);
      const endTime = normalizeTime(rawEndTime);

      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return NextResponse.json(
          {
            error: "Ora de sfârșit trebuie să fie după ora de început.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes < 5 ||
        durationMinutes > 480
      ) {
        return NextResponse.json(
          {
            error: "Durata trebuie să fie între 5 și 480 de minute.",
          },
          {
            status: 400,
          }
        );
      }

      const clinicErrorResponse = await verifyClinicOrReturnResponse(
        supabase,
        doctor,
        clinicId
      );

      if (clinicErrorResponse) {
        return clinicErrorResponse;
      }

      const { data: existingIntervals, error: overlapQueryError } = await supabase
        .from("availability")
        .select("id, start_time, end_time")
        .eq("doctor_id", doctor.id)
        .eq("clinic_id", clinicId)
        .eq("weekday", weekday);

      if (overlapQueryError) {
        console.error("Availability overlap query failed:", overlapQueryError);

        return NextResponse.json(
          {
            error: "Programul existent nu a putut fi verificat.",
          },
          {
            status: 500,
          }
        );
      }

      const overlaps =
        existingIntervals?.some(
          (interval) =>
            timeToMinutes(startTime) < timeToMinutes(interval.end_time) &&
            timeToMinutes(endTime) > timeToMinutes(interval.start_time)
        ) ?? false;

      if (overlaps) {
        return NextResponse.json(
          {
            error: "Intervalul se suprapune peste un program existent.",
          },
          {
            status: 409,
          }
        );
      }

      const availabilityId = crypto.randomUUID();

      const { error } = await supabase.from("availability").insert({
        id: availabilityId,
        doctor_id: doctor.id,
        clinic_id: clinicId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        appointment_duration_minutes: durationMinutes,
        is_active: body.isActive ?? true,
      });

      if (error) {
        console.error("Availability insert failed:", error);

        return NextResponse.json(
          {
            error: "Programul nu a putut fi adăugat.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          availabilityId,
        },
        {
          status: 201,
        }
      );
    }

    if (body.resource === "break") {
      const availabilityId = body.availabilityId?.trim();
      const rawStartTime = body.startTime?.trim();
      const rawEndTime = body.endTime?.trim();

      if (!availabilityId || !isUuid(availabilityId)) {
        return NextResponse.json(
          {
            error: "Programul selectat nu este valid.",
          },
          {
            status: 400,
          }
        );
      }

      if (!rawStartTime || !rawEndTime || !isTime(rawStartTime) || !isTime(rawEndTime)) {
        return NextResponse.json(
          {
            error: "Intervalul pauzei nu este valid.",
          },
          {
            status: 400,
          }
        );
      }

      const startTime = normalizeTime(rawStartTime);
      const endTime = normalizeTime(rawEndTime);

      if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
        return NextResponse.json(
          {
            error: "Ora de sfârșit a pauzei trebuie să fie după ora de început.",
          },
          {
            status: 400,
          }
        );
      }

      const { data: availability, error: availabilityError } = await supabase
        .from("availability")
        .select("id, doctor_id, clinic_id, start_time, end_time")
        .eq("id", availabilityId)
        .eq("doctor_id", doctor.id)
        .maybeSingle();

      if (availabilityError || !availability) {
        return NextResponse.json(
          {
            error: "Programul nu există sau nu îți aparține.",
          },
          {
            status: 404,
          }
        );
      }

      const clinicErrorResponse = await verifyClinicOrReturnResponse(
        supabase,
        doctor,
        availability.clinic_id
      );

      if (clinicErrorResponse) {
        return clinicErrorResponse;
      }

      if (
        timeToMinutes(startTime) < timeToMinutes(availability.start_time) ||
        timeToMinutes(endTime) > timeToMinutes(availability.end_time)
      ) {
        return NextResponse.json(
          {
            error: "Pauza trebuie să fie în interiorul programului de lucru.",
          },
          {
            status: 400,
          }
        );
      }

      const { data: existingBreaks, error: breaksError } = await supabase
        .from("availability_breaks")
        .select("start_time, end_time")
        .eq("availability_id", availabilityId);

      if (breaksError) {
        return NextResponse.json(
          {
            error: "Pauzele existente nu au putut fi verificate.",
          },
          {
            status: 500,
          }
        );
      }

      const overlaps =
        existingBreaks?.some(
          (item) =>
            timeToMinutes(startTime) < timeToMinutes(item.end_time) &&
            timeToMinutes(endTime) > timeToMinutes(item.start_time)
        ) ?? false;

      if (overlaps) {
        return NextResponse.json(
          {
            error: "Pauza se suprapune peste o altă pauză.",
          },
          {
            status: 409,
          }
        );
      }

      const breakId = crypto.randomUUID();

      const { error } = await supabase.from("availability_breaks").insert({
        id: breakId,
        availability_id: availabilityId,
        start_time: startTime,
        end_time: endTime,
        label: body.label?.trim() || null,
      });

      if (error) {
        console.error("Availability break insert failed:", error);

        return NextResponse.json(
          {
            error: "Pauza nu a putut fi adăugată.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          breakId,
        },
        {
          status: 201,
        }
      );
    }

    if (body.resource === "day_off") {
      const clinicId = body.clinicId?.trim() || null;
      const date = body.date?.trim();
      const isAllDay = body.isAllDay ?? true;

      if (!date || !isDate(date)) {
        return NextResponse.json(
          {
            error: "Data indisponibilității nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      if (isClinicSubAccountDoctor(doctor) && !clinicId) {
        return NextResponse.json(
          {
            error: "Selectează locația aprobată pentru indisponibilitate.",
          },
          {
            status: 400,
          }
        );
      }

      if (clinicId && !isUuid(clinicId)) {
        return NextResponse.json(
          {
            error: "Clinica selectată nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      if (clinicId) {
        const clinicErrorResponse = await verifyClinicOrReturnResponse(
          supabase,
          doctor,
          clinicId
        );

        if (clinicErrorResponse) {
          return clinicErrorResponse;
        }
      }

      let startTime: string | null = null;
      let endTime: string | null = null;

      if (!isAllDay) {
        const rawStartTime = body.startTime?.trim();
        const rawEndTime = body.endTime?.trim();

        if (!rawStartTime || !rawEndTime || !isTime(rawStartTime) || !isTime(rawEndTime)) {
          return NextResponse.json(
            {
              error: "Orele indisponibilității nu sunt valide.",
            },
            {
              status: 400,
            }
          );
        }

        startTime = normalizeTime(rawStartTime);
        endTime = normalizeTime(rawEndTime);

        if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
          return NextResponse.json(
            {
              error: "Ora de sfârșit trebuie să fie după ora de început.",
            },
            {
              status: 400,
            }
          );
        }
      }

      const dayOffId = crypto.randomUUID();

      const { error } = await supabase.from("doctor_days_off").insert({
        id: dayOffId,
        doctor_id: doctor.id,
        clinic_id: clinicId,
        date,
        is_all_day: isAllDay,
        start_time: startTime,
        end_time: endTime,
        reason: body.reason?.trim() || null,
      });

      if (error) {
        console.error("Doctor day off insert failed:", error);

        return NextResponse.json(
          {
            error: "Indisponibilitatea nu a putut fi adăugată.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json(
        {
          success: true,
          dayOffId,
        },
        {
          status: 201,
        }
      );
    }

    return NextResponse.json(
      {
        error: "Tipul resursei nu este valid.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error("Doctor availability creation API failed:", error);

    return NextResponse.json(
      {
        error: "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UpdateRequestBody;
    const availabilityId = body.availabilityId?.trim();

    if (!availabilityId || !isUuid(availabilityId)) {
      return NextResponse.json(
        {
          error: "Programul selectat nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const { supabase, doctor, errorResponse } = await getAuthenticatedDoctor();

    if (errorResponse || !doctor) {
      return errorResponse;
    }

    const { data: current, error: currentError } = await supabase
      .from("availability")
      .select("id, doctor_id, clinic_id")
      .eq("id", availabilityId)
      .eq("doctor_id", doctor.id)
      .maybeSingle();

    if (currentError || !current) {
      return NextResponse.json(
        {
          error: "Programul nu există sau nu îți aparține.",
        },
        {
          status: 404,
        }
      );
    }

    const currentClinicResponse = await verifyClinicOrReturnResponse(
      supabase,
      doctor,
      current.clinic_id
    );

    if (currentClinicResponse) {
      return currentClinicResponse;
    }

    const clinicId = body.clinicId?.trim();
    const weekday = Number(body.weekday);
    const durationMinutes = Number(body.durationMinutes);
    const rawStartTime = body.startTime?.trim();
    const rawEndTime = body.endTime?.trim();

    if (
      !clinicId ||
      !isUuid(clinicId) ||
      !Number.isInteger(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      !rawStartTime ||
      !rawEndTime ||
      !isTime(rawStartTime) ||
      !isTime(rawEndTime) ||
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 5 ||
      durationMinutes > 480
    ) {
      return NextResponse.json(
        {
          error: "Datele programului nu sunt valide.",
        },
        {
          status: 400,
        }
      );
    }

    const startTime = normalizeTime(rawStartTime);
    const endTime = normalizeTime(rawEndTime);

    if (timeToMinutes(startTime) >= timeToMinutes(endTime)) {
      return NextResponse.json(
        {
          error: "Ora de sfârșit trebuie să fie după ora de început.",
        },
        {
          status: 400,
        }
      );
    }

    const clinicErrorResponse = await verifyClinicOrReturnResponse(
      supabase,
      doctor,
      clinicId
    );

    if (clinicErrorResponse) {
      return clinicErrorResponse;
    }

    const { data: otherIntervals, error: overlapError } = await supabase
      .from("availability")
      .select("id, start_time, end_time")
      .eq("doctor_id", doctor.id)
      .eq("clinic_id", clinicId)
      .eq("weekday", weekday)
      .neq("id", availabilityId);

    if (overlapError) {
      return NextResponse.json(
        {
          error: "Programul existent nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    const overlaps =
      otherIntervals?.some(
        (interval) =>
          timeToMinutes(startTime) < timeToMinutes(interval.end_time) &&
          timeToMinutes(endTime) > timeToMinutes(interval.start_time)
      ) ?? false;

    if (overlaps) {
      return NextResponse.json(
        {
          error: "Intervalul se suprapune peste un program existent.",
        },
        {
          status: 409,
        }
      );
    }

    const { error } = await supabase
      .from("availability")
      .update({
        clinic_id: clinicId,
        weekday,
        start_time: startTime,
        end_time: endTime,
        appointment_duration_minutes: durationMinutes,
        is_active: body.isActive ?? true,
      })
      .eq("id", availabilityId)
      .eq("doctor_id", doctor.id);

    if (error) {
      console.error("Availability update failed:", error);

      return NextResponse.json(
        {
          error: "Programul nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Doctor availability update API failed:", error);

    return NextResponse.json(
      {
        error: "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as DeleteRequestBody;
    const id = body.id?.trim();

    if (!id || !isUuid(id) || !body.resource) {
      return NextResponse.json(
        {
          error: "Resursa selectată nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const { supabase, doctor, errorResponse } = await getAuthenticatedDoctor();

    if (errorResponse || !doctor) {
      return errorResponse;
    }

    if (body.resource === "availability") {
      const { data: availability, error: lookupError } = await supabase
        .from("availability")
        .select("id, clinic_id")
        .eq("id", id)
        .eq("doctor_id", doctor.id)
        .maybeSingle();

      if (lookupError || !availability) {
        return NextResponse.json(
          {
            error: "Programul nu există sau nu îți aparține.",
          },
          {
            status: 404,
          }
        );
      }

      const clinicErrorResponse = await verifyClinicOrReturnResponse(
        supabase,
        doctor,
        availability.clinic_id
      );

      if (clinicErrorResponse) {
        return clinicErrorResponse;
      }

      const { error } = await supabase
        .from("availability")
        .delete()
        .eq("id", id)
        .eq("doctor_id", doctor.id);

      if (error) {
        return NextResponse.json(
          {
            error: "Programul nu a putut fi șters.",
          },
          {
            status: 500,
          }
        );
      }
    } else if (body.resource === "break") {
      const { data: ownedBreak, error: lookupError } = await supabase
        .from("availability_breaks")
        .select(
          `
            id,
            availability (
              doctor_id,
              clinic_id
            )
          `
        )
        .eq("id", id)
        .maybeSingle();

      const rawAvailability = ownedBreak?.availability;
      const availability = Array.isArray(rawAvailability)
        ? rawAvailability[0]
        : rawAvailability;

      if (lookupError || !availability || availability.doctor_id !== doctor.id) {
        return NextResponse.json(
          {
            error: "Pauza nu există sau nu îți aparține.",
          },
          {
            status: 404,
          }
        );
      }

      const clinicErrorResponse = await verifyClinicOrReturnResponse(
        supabase,
        doctor,
        availability.clinic_id
      );

      if (clinicErrorResponse) {
        return clinicErrorResponse;
      }

      const { error } = await supabase.from("availability_breaks").delete().eq("id", id);

      if (error) {
        return NextResponse.json(
          {
            error: "Pauza nu a putut fi ștearsă.",
          },
          {
            status: 500,
          }
        );
      }
    } else if (body.resource === "day_off") {
      const { data: dayOff, error: lookupError } = await supabase
        .from("doctor_days_off")
        .select("id, clinic_id")
        .eq("id", id)
        .eq("doctor_id", doctor.id)
        .maybeSingle();

      if (lookupError || !dayOff) {
        return NextResponse.json(
          {
            error: "Indisponibilitatea nu există sau nu îți aparține.",
          },
          {
            status: 404,
          }
        );
      }

      if (isClinicSubAccountDoctor(doctor)) {
        if (!dayOff.clinic_id) {
          return NextResponse.json(
            {
              error: "Indisponibilitatea nu este asociată locației atribuite.",
            },
            {
              status: 403,
            }
          );
        }

        const clinicErrorResponse = await verifyClinicOrReturnResponse(
          supabase,
          doctor,
          dayOff.clinic_id
        );

        if (clinicErrorResponse) {
          return clinicErrorResponse;
        }
      }

      const { error } = await supabase
        .from("doctor_days_off")
        .delete()
        .eq("id", id)
        .eq("doctor_id", doctor.id);

      if (error) {
        return NextResponse.json(
          {
            error: "Indisponibilitatea nu a putut fi ștearsă.",
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Doctor availability deletion API failed:", error);

    return NextResponse.json(
      {
        error: "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}
