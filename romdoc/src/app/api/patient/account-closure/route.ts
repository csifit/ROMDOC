import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  sameOriginErrorResponse,
  validateSameOrigin,
} from "@/lib/security/same-origin";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireActivePatient() {
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
    profile?.role !==
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    return {
      user: null,
      response:
        NextResponse.json(
          {
            error:
              "Contul de pacient nu este activ.",
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

  return {
    user,
    response: null,
  };
}

export async function GET():
  Promise<Response> {
  const authorization =
    await requireActivePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    data: profile,
    error,
  } =
    await admin
      .from("profiles")
      .select(`
        account_closure_requested_at
      `)
      .eq(
        "id",
        authorization.user.id
      )
      .maybeSingle();

  if (error) {
    console.error(
      "Patient closure status lookup failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Starea solicitării nu a putut fi încărcată.",
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
      requestedAt:
        profile
          ?.account_closure_requested_at ??
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
    await requireActivePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const requestedAt =
    new Date().toISOString();

  const {
    data: profile,
    error,
  } =
    await admin
      .from("profiles")
      .update({
        account_closure_requested_at:
          requestedAt,
        updated_at:
          requestedAt,
      })
      .eq(
        "id",
        authorization.user.id
      )
      .eq(
        "role",
        "patient"
      )
      .eq(
        "account_status",
        "active"
      )
      .is(
        "account_closure_requested_at",
        null
      )
      .select(`
        account_closure_requested_at
      `)
      .maybeSingle();

  if (error) {
    console.error(
      "Patient closure request failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Solicitarea nu a putut fi înregistrată.",
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

  if (!profile) {
    return NextResponse.json(
      {
        error:
          "Solicitarea este deja înregistrată.",
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
      requestedAt:
        profile.account_closure_requested_at,
      message:
        "Solicitarea de închidere a contului a fost trimisă administratorului.",
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
    await requireActivePatient();

  if (
    authorization.response
  ) {
    return authorization.response;
  }

  const admin =
    createAdminClient();

  const {
    error,
  } =
    await admin
      .from("profiles")
      .update({
        account_closure_requested_at:
          null,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        authorization.user.id
      )
      .eq(
        "role",
        "patient"
      )
      .eq(
        "account_status",
        "active"
      );

  if (error) {
    console.error(
      "Patient closure cancellation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Solicitarea nu a putut fi anulată.",
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
      requestedAt:
        null,
      message:
        "Solicitarea de închidere a contului a fost anulată.",
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
