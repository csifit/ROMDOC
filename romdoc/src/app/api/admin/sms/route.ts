import {
  NextRequest,
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

type SmsSettingsBody = {
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
  event: string;
  status: string;
  created_at: string;
};

function boolFromUnknown(value: unknown) {
  return value === true;
}

function nameFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function GET(): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot gestiona serviciul SMS."
  );

  if (adminOnly) {
    return adminOnly;
  }

  const admin = createAdminClient();

  const [
    settingsResult,
    doctorsResult,
    logsResult,
  ] = await Promise.all([
    admin
      .from("sms_platform_settings")
      .select("sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at")
      .eq("id", 1)
      .maybeSingle(),

    admin
      .from("doctors")
      .select("id, slug, profile_id")
      .order("slug", { ascending: true }),

    admin
      .from("sms_delivery_logs")
      .select("doctor_id, event, status, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (settingsResult.error) {
    console.error("SMS settings query failed:", settingsResult.error);

    return NextResponse.json(
      { error: "Setările SMS nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  if (doctorsResult.error) {
    console.error("SMS doctors query failed:", doctorsResult.error);

    return NextResponse.json(
      { error: "Lista medicilor nu a putut fi încărcată." },
      { status: 500 }
    );
  }

  if (logsResult.error) {
    console.error("SMS logs query failed:", logsResult.error);

    return NextResponse.json(
      { error: "Statisticile SMS nu au putut fi încărcate." },
      { status: 500 }
    );
  }

  const doctors = (doctorsResult.data ?? []) as DoctorRow[];
  const logs = (logsResult.data ?? []) as SmsLogRow[];

  const profileIds = doctors
    .map((doctor) => doctor.profile_id)
    .filter((profileId): profileId is string => Boolean(profileId));

  const profileMap = new Map<string, ProfileRow>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", profileIds);

    if (profilesError) {
      console.error("SMS doctor profile query failed:", profilesError);
    }

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      profileMap.set(profile.id, profile);
    }
  }

  const logCounts = new Map<
    string,
    {
      total: number;
      sent: number;
      failed: number;
      skipped: number;
      confirmed: number;
      reminder24h: number;
      lastSentAt: string | null;
    }
  >();

  for (const log of logs) {
    if (!log.doctor_id) {
      continue;
    }

    const current = logCounts.get(log.doctor_id) ?? {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      confirmed: 0,
      reminder24h: 0,
      lastSentAt: null,
    };

    current.total += 1;

    if (log.status === "sent") {
      current.sent += 1;
      current.lastSentAt = current.lastSentAt ?? log.created_at;
    } else if (log.status === "failed") {
      current.failed += 1;
    } else if (log.status === "skipped") {
      current.skipped += 1;
    }

    if (log.event === "confirmed") {
      current.confirmed += 1;
    }

    if (log.event === "reminder_24_hours") {
      current.reminder24h += 1;
    }

    logCounts.set(log.doctor_id, current);
  }

  const doctorCounters = doctors.map((doctor) => {
    const profile = doctor.profile_id
      ? profileMap.get(doctor.profile_id)
      : null;

    const profileName = [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

    const counts = logCounts.get(doctor.id) ?? {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      confirmed: 0,
      reminder24h: 0,
      lastSentAt: null,
    };

    return {
      doctorId: doctor.id,
      doctorName: profileName || nameFromSlug(doctor.slug),
      slug: doctor.slug,
      ...counts,
    };
  });

  return NextResponse.json(
    {
      settings:
        settingsResult.data ?? {
          sms_enabled: false,
          confirmation_sms_enabled: true,
          reminder_24h_sms_enabled: false,
          provider: "twilio",
          updated_at: null,
        },
      doctorCounters,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization = await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const adminOnly = requireAdministratorCapability(
    authorization.role,
    "Numai administratorii pot modifica setările SMS."
  );

  if (adminOnly) {
    return adminOnly;
  }

  let body: SmsSettingsBody;

  try {
    body = (await request.json()) as SmsSettingsBody;
  } catch {
    return NextResponse.json(
      { error: "Cererea nu conține date JSON valide." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("sms_platform_settings")
    .upsert(
      {
        id: 1,
        sms_enabled: boolFromUnknown(body.smsEnabled),
        confirmation_sms_enabled: boolFromUnknown(body.confirmationSmsEnabled),
        reminder_24h_sms_enabled: boolFromUnknown(body.reminder24hSmsEnabled),
        provider: "twilio",
        updated_by_profile_id: authorization.profileId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("sms_enabled, confirmation_sms_enabled, reminder_24h_sms_enabled, provider, updated_at")
    .single();

  if (error) {
    console.error("SMS settings update failed:", error);

    return NextResponse.json(
      { error: "Setările SMS nu au putut fi salvate." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "Setările SMS au fost salvate.",
      settings: data,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
