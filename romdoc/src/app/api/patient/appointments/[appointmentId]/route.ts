import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type CancellationBody = {
  reason?: unknown;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function requireVerifiedPatient() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      response: NextResponse.json(
        { error: "Trebuie să fii autentificat." },
        { status: 401 }
      ),
    };
  }

  if (!user.email_confirmed_at) {
    return {
      supabase,
      response: NextResponse.json(
        {
          error:
            "Confirmă adresa de e-mail înainte de a administra programările.",
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
      response: NextResponse.json(
        {
          error:
            "Doar pacienții cu un cont activ pot administra această programare.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    response: null,
  };
}

function appointmentErrorResponse(
  message: string,
  code?: string
) {
  const normalized = message.toLowerCase();

  if (
    code === "P0002" ||
    normalized.includes("appointment_not_found")
  ) {
    return NextResponse.json(
      { error: "Programarea nu a fost găsită." },
      { status: 404 }
    );
  }

  if (
    code === "42501" ||
    normalized.includes("not_owned") ||
    normalized.includes("not_permitted")
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai permisiunea de a administra această programare.",
      },
      { status: 403 }
    );
  }

  if (
    normalized.includes("appointment_already_started")
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea nu mai poate fi anulată deoarece ora programată a început deja.",
      },
      { status: 409 }
    );
  }

  if (
    normalized.includes("patient_cannot_cancel_status") ||
    normalized.includes("invalid_appointment_transition")
  ) {
    return NextResponse.json(
      {
        error:
          "Programarea nu mai poate fi anulată în starea actuală.",
      },
      { status: 409 }
    );
  }

  if (
    code === "22001" ||
    normalized.includes("reason_too_long")
  ) {
    return NextResponse.json(
      {
        error:
          "Motivul anulării poate avea cel mult 1.000 de caractere.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json(
    {
      error:
        "Programarea nu a putut fi actualizată.",
    },
    { status: 500 }
  );
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const authorization =
    await requireVerifiedPatient();

  if (authorization.response) {
    return authorization.response;
  }

  const { appointmentId } =
    await context.params;

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      { error: "Identificatorul programării nu este valid." },
      { status: 400 }
    );
  }

  const {
    data,
    error,
  } = await authorization.supabase.rpc(
    "get_own_appointment_timeline",
    {
      target_appointment_id: appointmentId,
    }
  );

  if (error) {
    console.error(
      "Patient appointment timeline failed:",
      error
    );

    return appointmentErrorResponse(
      error.message,
      error.code
    );
  }

  return NextResponse.json(
    {
      timeline: data ?? [],
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const authorization =
    await requireVerifiedPatient();

  if (authorization.response) {
    return authorization.response;
  }

  const { appointmentId } =
    await context.params;

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      { error: "Identificatorul programării nu este valid." },
      { status: 400 }
    );
  }

  let body: CancellationBody;

  try {
    body = (await request.json()) as CancellationBody;
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const reason =
    typeof body.reason === "string"
      ? body.reason.trim()
      : "";

  if (reason.length > 1000) {
    return NextResponse.json(
      {
        error:
          "Motivul anulării poate avea cel mult 1.000 de caractere.",
      },
      { status: 400 }
    );
  }

  const {
    data,
    error,
  } = await authorization.supabase.rpc(
    "patient_cancel_own_appointment",
    {
      target_appointment_id: appointmentId,
      cancellation_reason: reason || null,
    }
  );

  if (error) {
    console.error(
      "Patient appointment cancellation failed:",
      error
    );

    return appointmentErrorResponse(
      error.message,
      error.code
    );
  }

  return NextResponse.json({
    success: true,
    appointment:
      Array.isArray(data) ? data[0] ?? null : data,
  });
}
