import {
  type NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type SmsPatchBody = {
  smsEnabled?: unknown;
  confirmationSmsEnabled?: unknown;
  reminder24hSmsEnabled?: unknown;
};

type DoctorRow = {
  id: string;
  slug: string;
  profile_id: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type SmsLogRow = {
  doctor_id: string | null;
  event: string | null;
  status: string | null;
  delivery_report_status: string | null;
  created_at: string;
};

function json(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function boolFromUnknown(value: unknown) {
  return value === true;
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

async function requireAdmin() {
  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return {
      response:
        authorization.response,
      profileId: null,
    };
  }

  const administratorError =
    requireAdministratorCapability(
      authorization.role,
      "Numai administratorii pot accesa administrarea SMS."
    );

  if (administratorError) {
    return {
      response:
        administratorError,
      profileId: null,
    };
  }

  return {
    response: null,
    profileId:
      authorization.profileId,
  };
}

export async function GET(): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  const admin = createAdminClient();

  const [
    settingsResult,
    doctorsResult,
    logsResult,
  ] = await Promise.all([
    admin
      .from("sms_platform_settings")
      .select(
        "sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at"
      )
      .eq("id", 1)
      .maybeSingle(),
    admin
      .from("doctors")
      .select(
        "id, slug, profile_id"
      )
      .order("slug", {
        ascending: true,
      }),
    admin
      .from("sms_delivery_logs")
      .select(
        "doctor_id, event, status, delivery_report_status, created_at"
      )
      .order("created_at", {
        ascending: false,
      }),
  ]);

  const firstError =
    settingsResult.error ??
    doctorsResult.error ??
    logsResult.error;

  if (firstError) {
    console.error(
      "SMS administration query failed:",
      firstError
    );

    return json(
      {
        code:
          "sms_administration_load_failed",
        error:
          "Datele SMS nu au putut fi încărcate.",
      },
      500
    );
  }

  const doctors =
    (doctorsResult.data ??
      []) as DoctorRow[];

  const logs =
    (logsResult.data ??
      []) as SmsLogRow[];

  const profileIds =
    Array.from(
      new Set(
        doctors
          .map(
            (doctor) =>
              doctor.profile_id
          )
          .filter(
            (
              profileId
            ): profileId is string =>
              Boolean(profileId)
          )
      )
    );

  const profileMap =
    new Map<
      string,
      ProfileRow
    >();

  if (
    profileIds.length > 0
  ) {
    const {
      data: profiles,
      error,
    } = await admin
      .from("profiles")
      .select(
        "id, first_name, last_name"
      )
      .in(
        "id",
        profileIds
      );

    if (error) {
      console.error(
        "SMS Doctor profile query failed:",
        error
      );
    }

    for (
      const profile
      of (profiles ??
        []) as ProfileRow[]
    ) {
      profileMap.set(
        profile.id,
        profile
      );
    }
  }

  const doctorIdentity =
    new Map<
      string,
      {
        doctorName: string;
        slug: string;
      }
    >();

  for (
    const doctor
    of doctors
  ) {
    const profile =
      doctor.profile_id
        ? profileMap.get(
            doctor.profile_id
          )
        : undefined;

    const profileName = [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    doctorIdentity.set(
      doctor.id,
      {
        doctorName:
          profileName ||
          nameFromSlug(
            doctor.slug
          ),
        slug:
          doctor.slug,
      }
    );
  }

  type Counter = {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    skipped: number;
    confirmed: number;
    reminder24h: number;
    lastSentAt:
      | string
      | null;
  };

  const counts =
    new Map<
      string,
      Counter
    >();

  for (
    const log
    of logs
  ) {
    if (
      !log.doctor_id
    ) {
      continue;
    }

    const current =
      counts.get(
        log.doctor_id
      ) ?? {
        total: 0,
        sent: 0,
        delivered: 0,
        failed: 0,
        skipped: 0,
        confirmed: 0,
        reminder24h: 0,
        lastSentAt: null,
      };

    current.total += 1;

    if (
      log.status === "sent"
    ) {
      current.sent += 1;

      current.lastSentAt =
        current.lastSentAt ??
        log.created_at;

      if (
        log.event ===
        "confirmed"
      ) {
        current.confirmed += 1;
      }

      if (
        log.event ===
        "reminder_24_hours"
      ) {
        current.reminder24h += 1;
      }
    }

    if (
      log.delivery_report_status ===
      "delivered"
    ) {
      current.delivered += 1;
    }

    if (
      log.status ===
        "failed" ||
      log.delivery_report_status ===
        "failed" ||
      log.delivery_report_status ===
        "expired"
    ) {
      current.failed += 1;
    }

    if (
      log.status ===
      "skipped"
    ) {
      current.skipped += 1;
    }

    counts.set(
      log.doctor_id,
      current
    );
  }

  const doctorCounters =
    doctors.map(
      (doctor) => ({
        doctorId:
          doctor.id,
        doctorName:
          doctorIdentity.get(
            doctor.id
          )?.doctorName ??
          nameFromSlug(
            doctor.slug
          ),
        slug:
          doctor.slug,
        ...(counts.get(
          doctor.id
        ) ?? {
          total: 0,
          sent: 0,
          delivered: 0,
          failed: 0,
          skipped: 0,
          confirmed: 0,
          reminder24h: 0,
          lastSentAt: null,
        }),
      })
    );

  return json({
    code:
      "sms_administration_loaded",
    settings:
      settingsResult.data ?? {
        sms_enabled: false,
        confirmation_sms_enabled:
          true,
        reminder_24h_sms_enabled:
          false,
        provider:
          "smslink",
        updated_at:
          null,
      },
    doctorCounters,
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireAdmin();

  if (authorization.response) {
    return authorization.response;
  }

  let body: SmsPatchBody;

  try {
    body =
      (await request.json()) as
        SmsPatchBody;
  } catch {
    return json(
      {
        code:
          "invalid_json",
        error:
          "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from(
      "sms_platform_settings"
    )
    .upsert(
      {
        id: 1,
        sms_enabled:
          boolFromUnknown(
            body.smsEnabled
          ),
        confirmation_sms_enabled:
          boolFromUnknown(
            body.confirmationSmsEnabled
          ),
        reminder_24h_sms_enabled:
          boolFromUnknown(
            body.reminder24hSmsEnabled
          ),
        provider:
          "smslink",
        updated_by_profile_id:
          authorization.profileId,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: "id",
      }
    )
    .select(
      "sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at"
    )
    .single();

  if (error) {
    console.error(
      "SMS settings update failed:",
      error
    );

    return json(
      {
        code:
          "sms_settings_save_failed",
        error:
          "Setările SMS nu au putut fi salvate.",
      },
      500
    );
  }

  return json({
    code:
      "sms_settings_saved",
    message:
      "Setările SMS au fost salvate.",
    settings:
      data,
  });
}
