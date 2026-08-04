import {
  NextRequest,
  NextResponse,
} from "next/server";
import type {
  EmailOtpType,
} from "@supabase/supabase-js";

import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  Pragma: "no-cache",
};

type DoctorInvitationOtpType = "invite" | "magiclink";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeTokenHash(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, 1000);
}

function normalizeOtpType(value: unknown): DoctorInvitationOtpType | null {
  return value === "invite" || value === "magiclink" ? value : null;
}

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json(
      {
        error: "Cererea nu conține date valide.",
      },
      400
    );
  }

  const input = body as Record<string, unknown>;
  const tokenHash = normalizeTokenHash(input.tokenHash);
  const otpType = normalizeOtpType(input.otpType);

  if (!tokenHash) {
    return json(
      {
        error: "Tokenul invitației lipsește.",
        code: "invitation_token_missing",
      },
      400
    );
  }

  if (!otpType) {
    return json(
      {
        error: "Tipul linkului invitației nu este valid.",
        code: "invitation_type_invalid",
      },
      400
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: otpType as EmailOtpType,
  });

  if (error) {
    console.error(
      "Doctor invitation token verification failed:",
      error
    );

    return json(
      {
        error:
          "Linkul invitației nu mai este valid. Solicită administratorului retrimiterea invitației.",
        code: "doctor_invitation_token_invalid",
      },
      400
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return json(
      {
        error: "Sesiunea invitației nu a putut fi creată.",
        code: "doctor_invitation_session_failed",
      },
      500
    );
  }

  const invitationType = user.user_metadata?.invitation_type;

  if (invitationType !== "doctor") {
    await supabase.auth.signOut();

    return json(
      {
        error: "Linkul nu este o invitație validă pentru medic.",
        code: "not_doctor_invitation",
      },
      403
    );
  }

  return json({
    verified: true,
    next: "/auth/doctor-invitation",
  });
}
