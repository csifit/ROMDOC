import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is missing. Verification expiration cannot run safely."
    );

    return false;
  }

  return (
    request.headers.get("authorization") === `Bearer ${cronSecret}`
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { error: "Cerere neautorizată." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();

  const {
    data,
    error,
  } = await admin.rpc("expire_due_doctor_verifications");

  if (error) {
    console.error(
      "Automatic doctor verification expiration failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Verificările profesionale expirate nu au putut fi actualizate.",
      },
      { status: 500 }
    );
  }

  const expiredCount =
    typeof data === "number" ? data : Number(data ?? 0);

  return NextResponse.json(
    {
      success: true,
      expiredCount:
        Number.isFinite(expiredCount) ? expiredCount : 0,
      processedAt: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
