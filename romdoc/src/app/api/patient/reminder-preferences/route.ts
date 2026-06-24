import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

type ReminderPreferencesBody = {
  emailRemindersEnabled?: unknown;
  reminder48HoursEnabled?: unknown;
  reminder24HoursEnabled?: unknown;
};

type ReminderPreferences = {
  emailRemindersEnabled: boolean;
  reminder48HoursEnabled: boolean;
  reminder24HoursEnabled: boolean;
};

const DEFAULT_PREFERENCES:
  ReminderPreferences = {
    emailRemindersEnabled: true,
    reminder48HoursEnabled: true,
    reminder24HoursEnabled: true,
  };

async function requireVerifiedPatient() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          { status: 401 }
        ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      supabase,
      user,
      response:
        NextResponse.json(
          {
            error:
              "Confirmă adresa de e-mail înainte de a administra preferințele.",
          },
          { status: 403 }
        ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "patient" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase,
      user,
      response:
        NextResponse.json(
          {
            error:
              "Doar pacienții cu un cont activ pot administra preferințele.",
          },
          { status: 403 }
        ),
    };
  }

  return {
    supabase,
    user,
    response: null,
  };
}

export async function GET(): Promise<Response> {
  const authorization =
    await requireVerifiedPatient();

  if (authorization.response) {
    return authorization.response;
  }

  const {
    data,
    error,
  } = await authorization.supabase
    .from(
      "patient_reminder_preferences"
    )
    .select(`
      email_reminders_enabled,
      reminder_48_hours_enabled,
      reminder_24_hours_enabled
    `)
    .eq(
      "patient_profile_id",
      authorization.user!.id
    )
    .maybeSingle();

  if (error) {
    console.error(
      "Patient reminder preferences lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Preferințele nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      preferences: data
        ? {
            emailRemindersEnabled:
              data.email_reminders_enabled,
            reminder48HoursEnabled:
              data.reminder_48_hours_enabled,
            reminder24HoursEnabled:
              data.reminder_24_hours_enabled,
          }
        : DEFAULT_PREFERENCES,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PUT(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireVerifiedPatient();

  if (authorization.response) {
    return authorization.response;
  }

  let body:
    ReminderPreferencesBody;

  try {
    body =
      (await request.json()) as
        ReminderPreferencesBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      { status: 400 }
    );
  }

  if (
    typeof body.emailRemindersEnabled !==
      "boolean" ||
    typeof body.reminder48HoursEnabled !==
      "boolean" ||
    typeof body.reminder24HoursEnabled !==
      "boolean"
  ) {
    return NextResponse.json(
      {
        error:
          "Toate preferințele trebuie să fie valori adevărat/fals.",
      },
      { status: 400 }
    );
  }

  const {
    data,
    error,
  } = await authorization.supabase
    .from(
      "patient_reminder_preferences"
    )
    .upsert(
      {
        patient_profile_id:
          authorization.user!.id,
        email_reminders_enabled:
          body.emailRemindersEnabled,
        reminder_48_hours_enabled:
          body.reminder48HoursEnabled,
        reminder_24_hours_enabled:
          body.reminder24HoursEnabled,
      },
      {
        onConflict:
          "patient_profile_id",
      }
    )
    .select(`
      email_reminders_enabled,
      reminder_48_hours_enabled,
      reminder_24_hours_enabled
    `)
    .single();

  if (error) {
    console.error(
      "Patient reminder preferences update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Preferințele nu au putut fi salvate.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    preferences: {
      emailRemindersEnabled:
        data.email_reminders_enabled,
      reminder48HoursEnabled:
        data.reminder_48_hours_enabled,
      reminder24HoursEnabled:
        data.reminder_24_hours_enabled,
    },
  });
}
