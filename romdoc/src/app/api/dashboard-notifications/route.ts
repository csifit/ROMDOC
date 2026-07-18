import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createClient,
} from "@/lib/supabase/server";

export async function GET(): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        error:
          "Trebuie să fii autentificat.",
      },
      {
        status: 401,
      }
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from(
      "dashboard_notifications"
    )
    .select(
      "id, appointment_id, notification_type, title, body, href, read_at, created_at"
    )
    .eq(
      "recipient_profile_id",
      user.id
    )
    .order(
      "created_at",
      {
        ascending:
          false,
      }
    )
    .limit(30);

  if (error) {
    console.error(
      "Dashboard notifications query failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Notificările nu au putut fi încărcate.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json(
    {
      notifications:
        data ??
        [],
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return NextResponse.json(
      {
        error:
          "Trebuie să fii autentificat.",
      },
      {
        status: 401,
      }
    );
  }

  let body: {
    notificationId?: unknown;
    markAll?: unknown;
  };

  try {
    body =
      (await request.json()) as {
        notificationId?: unknown;
        markAll?: unknown;
      };
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date valide.",
      },
      {
        status: 400,
      }
    );
  }

  const readAt =
    new Date().toISOString();

  let query = supabase
    .from(
      "dashboard_notifications"
    )
    .update({
      read_at:
        readAt,
    })
    .eq(
      "recipient_profile_id",
      user.id
    )
    .is(
      "read_at",
      null
    );

  if (
    body.markAll !==
    true
  ) {
    const notificationId =
      typeof body.notificationId ===
      "string"
        ? body.notificationId
        : "";

    if (
      !notificationId
    ) {
      return NextResponse.json(
        {
          error:
            "Notificarea nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    query =
      query.eq(
        "id",
        notificationId
      );
  }

  const {
    error,
  } =
    await query;

  if (error) {
    console.error(
      "Dashboard notification update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Notificarea nu a putut fi actualizată.",
      },
      {
        status: 500,
      }
    );
  }

  return NextResponse.json({
    success:
      true,
    readAt,
  });
}
