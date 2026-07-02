import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sendComplimentaryAccessReminderEmail,
  type ComplimentaryAccessReminderType,
} from "@/lib/doctors/send-complimentary-access-reminder-email";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime =
  "nodejs";
export const dynamic =
  "force-dynamic";
export const maxDuration =
  60;

type DoctorProfile = {
  first_name:
    | string
    | null;
  last_name:
    | string
    | null;
};

type DoctorRelation = {
  id: string;
  email:
    | string
    | null;
  slug: string;
  profiles:
    | DoctorProfile
    | DoctorProfile[]
    | null;
};

type AccessGrant = {
  id: string;
  doctor_id: string;
  invitation_id:
    | string
    | null;
  grant_type: string;
  status: string;
  starts_at: string;
  ends_at: string;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
};

function isAuthorizedCronRequest(
  request: NextRequest
) {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is missing. Complimentary access reminders cannot run safely."
    );

    return false;
  }

  return (
    request.headers.get(
      "authorization"
    ) ===
    `Bearer ${cronSecret}`
  );
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  return Array.isArray(
    value
  )
    ? value[0] ?? null
    : value;
}

function getDoctorName(
  doctor: DoctorRelation
) {
  const profile =
    firstRelation(
      doctor.profiles
    );

  const fullName = [
    profile?.first_name,
    profile?.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  return doctor.slug
    .split("-")
    .map(
      (part) =>
        part
          .charAt(0)
          .toUpperCase() +
        part.slice(1)
    )
    .join(" ");
}

function getBucharestDateKey(
  value: Date
) {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone:
        "Europe/Bucharest",
    }
  ).format(value);
}

function getCalendarDayDifference(
  futureValue: string
) {
  const nowKey =
    getBucharestDateKey(
      new Date()
    );

  const futureKey =
    getBucharestDateKey(
      new Date(
        futureValue
      )
    );

  const nowUtc =
    Date.parse(
      `${nowKey}T00:00:00Z`
    );

  const futureUtc =
    Date.parse(
      `${futureKey}T00:00:00Z`
    );

  return Math.round(
    (
      futureUtc -
      nowUtc
    ) /
      86_400_000
  );
}

function getSiteUrl() {
  const value =
    process.env
      .NEXT_PUBLIC_SITE_URL
      ?.trim()
      .replace(
        /\/+$/,
        ""
      );

  if (!value) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is not configured."
    );
  }

  return value;
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  if (
    !isAuthorizedCronRequest(
      request
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Cerere neautorizată.",
      },
      {
        status: 401,
      }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: expiredData,
    error: expirationError,
  } = await admin.rpc(
    "expire_due_complimentary_access"
  );

  if (expirationError) {
    console.error(
      "Complimentary access expiration failed:",
      expirationError
    );

    return NextResponse.json(
      {
        error:
          "Accesul gratuit expirat nu a putut fi actualizat.",
      },
      {
        status: 500,
      }
    );
  }

  const maximumDate =
    new Date();

  maximumDate.setDate(
    maximumDate.getDate() +
      31
  );

  const {
    data: grantsData,
    error: grantsError,
  } = await admin
    .from(
      "doctor_access_grants"
    )
    .select(`
      id,
      doctor_id,
      invitation_id,
      grant_type,
      status,
      starts_at,
      ends_at,
      doctors (
        id,
        email,
        slug,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq(
      "grant_type",
      "admin_complimentary"
    )
    .eq(
      "status",
      "active"
    )
    .gt(
      "ends_at",
      new Date().toISOString()
    )
    .lte(
      "ends_at",
      maximumDate.toISOString()
    )
    .order(
      "ends_at",
      {
        ascending: true,
      }
    )
    .limit(200);

  if (grantsError) {
    console.error(
      "Complimentary access reminder query failed:",
      grantsError
    );

    return NextResponse.json(
      {
        error:
          "Accesul gratuit apropiat de expirare nu a putut fi încărcat.",
      },
      {
        status: 500,
      }
    );
  }

  const grants =
    (grantsData ??
      []) as AccessGrant[];

  const summary = {
    expired:
      typeof expiredData ===
      "number"
        ? expiredData
        : Number(
            expiredData ??
              0
          ),
    eligible:
      grants.length,
    sent: 0,
    failed: 0,
    skipped: 0,
  };

  let siteUrl: string;

  try {
    siteUrl =
      getSiteUrl();
  } catch (error) {
    console.error(
      "Complimentary access site URL configuration failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "NEXT_PUBLIC_SITE_URL lipsește.",
      },
      {
        status: 500,
      }
    );
  }

  for (
    const grant of grants
  ) {
    const daysRemaining =
      getCalendarDayDifference(
        grant.ends_at
      );

    let reminderType:
      | ComplimentaryAccessReminderType
      | null = null;

    if (
      daysRemaining === 30
    ) {
      reminderType =
        "30_days";
    } else if (
      daysRemaining === 7
    ) {
      reminderType =
        "7_days";
    }

    if (!reminderType) {
      continue;
    }

    const doctor =
      firstRelation(
        grant.doctors
      );

    const email =
      doctor?.email
        ?.trim() ??
      "";

    if (
      !doctor ||
      !email
    ) {
      summary.skipped += 1;
      continue;
    }

    const scheduledFor =
      getBucharestDateKey(
        new Date()
      );

    const {
      data: reminder,
      error: reminderInsertError,
    } = await admin
      .from(
        "doctor_access_reminders"
      )
      .upsert(
        {
          access_grant_id:
            grant.id,
          doctor_id:
            grant.doctor_id,
          reminder_type:
            reminderType,
          scheduled_for:
            scheduledFor,
          recipient_email:
            email,
          status:
            "processing",
          claimed_at:
            new Date().toISOString(),
          attempt_count:
            1,
        },
        {
          onConflict:
            "access_grant_id,reminder_type",
          ignoreDuplicates:
            true,
        }
      )
      .select(`
        id,
        status,
        attempt_count
      `)
      .maybeSingle();

    if (
      reminderInsertError
    ) {
      console.error(
        "Complimentary reminder claim failed:",
        reminderInsertError
      );

      summary.failed += 1;
      continue;
    }

    if (!reminder) {
      summary.skipped += 1;
      continue;
    }

    const result =
      await sendComplimentaryAccessReminderEmail(
        {
          reminderType,
          doctorName:
            getDoctorName(
              doctor
            ),
          doctorEmail:
            email,
          accessEndsAt:
            grant.ends_at,
          subscriptionUrl:
            `${siteUrl}/doctor-dashboard/subscription`,
          idempotencyKey:
            `complimentary-access/${grant.id}/${reminderType}`,
        }
      );

    const finalStatus =
      result.sent
        ? "sent"
        : result.skipped
          ? "skipped"
          : "failed";

    const {
      error: updateError,
    } = await admin
      .from(
        "doctor_access_reminders"
      )
      .update({
        status:
          finalStatus,
        provider_message_id:
          result.providerMessageId,
        error_code:
          result.errorCode,
        error_message:
          result.errorMessage,
        sent_at:
          result.sent
            ? new Date().toISOString()
            : null,
      })
      .eq(
        "id",
        reminder.id
      );

    if (updateError) {
      console.error(
        "Complimentary reminder finalization failed:",
        updateError
      );
    }

    if (result.sent) {
      summary.sent += 1;
    } else if (
      result.skipped
    ) {
      summary.skipped += 1;
    } else {
      summary.failed += 1;
    }
  }

  return NextResponse.json(
    {
      success: true,
      ...summary,
      processedAt:
        new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
