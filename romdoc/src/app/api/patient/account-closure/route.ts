import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  validateSameOrigin,
  sameOriginErrorResponse,
} from "@/lib/security/same-origin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClosureStatusRow = {
  request_id: string | null;
  status: string | null;
  requested_at: string | null;
  cooling_off_ends_at:
    | string
    | null;
  restricted_at: string | null;
  processing_started_at:
    | string
    | null;
  completed_at: string | null;
  cancelled_at: string | null;
  legal_hold_active:
    | boolean
    | null;
};

type RequestClosureBody = {
  reason?: unknown;
};

function normalizeReason(
  value: unknown
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalized =
    value
      .trim()
      .slice(0, 2000);

  return normalized ||
    null;
}

async function requirePatient() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      supabase,
      user: null,
      response:
        NextResponse.json(
          {
            error:
              "Trebuie să fii autentificat.",
          },
          {
            status: 401,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(`
        id,
        role,
        account_status
      `)
      .eq(
        "id",
        user.id
      )
      .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !==
      "patient"
  ) {
    return {
      supabase,
      user,
      response:
        NextResponse.json(
          {
            error:
              "Contul nu are acces la setările pacientului.",
          },
          {
            status: 403,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        ),
    };
  }

  if (
    ![
      "active",
      "closure_requested",
    ].includes(
      profile.account_status
    )
  ) {
    return {
      supabase,
      user,
      response:
        NextResponse.json(
          {
            error:
              "Contul nu permite această acțiune.",
          },
          {
            status: 409,
            headers: {
              "Cache-Control":
                "no-store",
            },
          }
        ),
    };
  }

  return {
    supabase,
    user,
    response: null,
  };
}

export async function GET():
  Promise<Response> {
  const authorization =
    await requirePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const {
    data,
    error,
  } =
    await authorization.supabase
      .rpc(
        "get_own_account_closure_status"
      );

  if (error) {
    console.error(
      "Patient closure status lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Starea cererii de închidere nu a putut fi încărcată.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const rows =
    (data ??
      []) as ClosureStatusRow[];

  return NextResponse.json(
    {
      closure:
        rows[0] ??
        null,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  if (
    !validateSameOrigin(
      request
    )
  ) {
    return sameOriginErrorResponse();
  }

  const authorization =
    await requirePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  let body:
    RequestClosureBody;

  try {
    body =
      (await request.json()) as
        RequestClosureBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const reason =
    normalizeReason(
      body.reason
    );

  const {
    data,
    error,
  } =
    await authorization.supabase
      .rpc(
        "request_own_account_closure",
        {
          request_reason:
            reason,
        }
      );

  if (error) {
    console.error(
      "Patient account closure request failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Cererea de închidere nu a putut fi înregistrată.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      requestId: data,
      message:
        "Cererea a fost înregistrată. Ai la dispoziție 30 de zile pentru a o anula.",
    },
    {
      status: 201,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  if (
    !validateSameOrigin(
      request
    )
  ) {
    return sameOriginErrorResponse();
  }

  const authorization =
    await requirePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const {
    data,
    error,
  } =
    await authorization.supabase
      .rpc(
        "cancel_own_account_closure"
      );

  if (error) {
    console.error(
      "Patient account closure cancellation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Cererea de închidere nu a putut fi anulată.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error:
          "Nu există o cerere care poate fi anulată.",
      },
      {
        status: 409,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  return NextResponse.json(
    {
      success: true,
      message:
        "Cererea de închidere a fost anulată.",
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
