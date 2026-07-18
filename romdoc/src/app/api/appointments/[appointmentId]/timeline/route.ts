import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getAppointmentMessageAccess,
} from "@/lib/appointments/get-appointment-message-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type AuditEventRow = {
  id: string;
  event_type: string;
  previous_status: string | null;
  new_status: string;
  actor_profile_id: string | null;
  actor_role: string;
  reason: string | null;
  previous_scheduled_date: string | null;
  previous_scheduled_time: string | null;
  new_scheduled_date: string | null;
  new_scheduled_time: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
};

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      error,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

function getActorName(
  profile:
    | ProfileRow
    | undefined,
  fallbackRole: string
): string {
  if (!profile) {
    if (
      fallbackRole ===
      "system"
    ) {
      return "Sistem";
    }

    if (
      fallbackRole ===
      "doctor"
    ) {
      return "Medic";
    }

    if (
      fallbackRole ===
      "staff"
    ) {
      return "Personal medical";
    }

    if (
      fallbackRole ===
      "patient" ||
      fallbackRole ===
      "user"
    ) {
      return "Pacient";
    }

    return "Utilizator";
  }

  const fullName = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    getActorName(
      undefined,
      profile.role
    )
  );
}

function mapPatientEvent(
  event: AuditEventRow
) {
  const allowedTypes =
    new Set([
      "appointment_created",
      "confirmed",
      "rescheduled",
      "cancelled_by_patient",
      "cancelled_by_doctor",
      "cancelled_by_staff",
      "cancelled_by_admin",
      "cancelled_by_system",
      "completed",
      "marked_no_show",
      "schedule_changed",
      "status_changed",
    ]);

  if (
    !allowedTypes.has(
      event.event_type
    )
  ) {
    return null;
  }

  return {
    id:
      event.id,
    eventType:
      event.event_type,
    previousStatus:
      event.previous_status,
    newStatus:
      event.new_status,
    actorRole:
      event.actor_role,
    actorName:
      null,
    reason:
      event.reason,
    previousDate:
      event.previous_scheduled_date,
    previousTime:
      event.previous_scheduled_time,
    newDate:
      event.new_scheduled_date,
    newTime:
      event.new_scheduled_time,
    occurredAt:
      event.created_at,
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const {
    appointmentId,
  } =
    await context.params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const accessResult =
    await getAppointmentMessageAccess({
      supabase,
      admin,
      appointmentId,
    });

  if (
    !accessResult.access
  ) {
    return jsonError(
      accessResult.error,
      accessResult.status
    );
  }

  const {
    access,
  } =
    accessResult;

  const {
    data: auditData,
    error: auditError,
  } = await admin
    .from(
      "appointment_audit_events"
    )
    .select(
      "id, event_type, previous_status, new_status, actor_profile_id, actor_role, reason, previous_scheduled_date, previous_scheduled_time, new_scheduled_date, new_scheduled_time, created_at"
    )
    .eq(
      "appointment_id",
      appointmentId
    )
    .order(
      "created_at",
      {
        ascending:
          true,
      }
    );

  if (
    auditError
  ) {
    console.error(
      "Appointment timeline query failed:",
      auditError
    );

    return jsonError(
      "Istoricul programării nu a putut fi încărcat.",
      500
    );
  }

  const events =
    (auditData ??
      []) as AuditEventRow[];

  if (
    access.profile.role ===
    "patient"
  ) {
    return NextResponse.json(
      {
        mode:
          "patient",
        timeline:
          events
            .map(
              mapPatientEvent
            )
            .filter(
              (
                item
              ): item is NonNullable<
                ReturnType<
                  typeof mapPatientEvent
                >
              > =>
                item !==
                null
            ),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    );
  }

  const actorIds =
    Array.from(
      new Set(
        events
          .map(
            (
              event
            ) =>
              event.actor_profile_id
          )
          .filter(
            (
              value
            ): value is string =>
              Boolean(
                value
              )
          )
      )
    );

  const profilesById =
    new Map<
      string,
      ProfileRow
    >();

  if (
    actorIds.length >
    0
  ) {
    const {
      data:
        profileData,
      error:
        profileError,
    } = await admin
      .from("profiles")
      .select(
        "id, first_name, last_name, role"
      )
      .in(
        "id",
        actorIds
      );

    if (
      profileError
    ) {
      console.error(
        "Appointment timeline actor query failed:",
        profileError
      );
    }

    for (
      const profile of
      (profileData ??
        []) as ProfileRow[]
    ) {
      profilesById.set(
        profile.id,
        profile
      );
    }
  }

  return NextResponse.json(
    {
      mode:
        "operational",
      timeline:
        events.map(
          (
            event
          ) => ({
            id:
              event.id,
            eventType:
              event.event_type,
            previousStatus:
              event.previous_status,
            newStatus:
              event.new_status,
            actorRole:
              event.actor_role,
            actorName:
              getActorName(
                event.actor_profile_id
                  ? profilesById.get(
                      event.actor_profile_id
                    )
                  : undefined,
                event.actor_role
              ),
            reason:
              event.reason,
            previousDate:
              event.previous_scheduled_date,
            previousTime:
              event.previous_scheduled_time,
            newDate:
              event.new_scheduled_date,
            newTime:
              event.new_scheduled_time,
            occurredAt:
              event.created_at,
          })
        ),
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}
