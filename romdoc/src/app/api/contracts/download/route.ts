import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL_TTL_SECONDS = 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest
): Promise<Response> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        error: "Trebuie să fiți autentificat.",
        code: "unauthenticated",
      },
      { status: 401 }
    );
  }

  let body: {
    acceptanceId?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Cererea nu este validă.",
        code: "invalid_request",
      },
      { status: 400 }
    );
  }

  const acceptanceId =
    typeof body.acceptanceId === "string"
      ? body.acceptanceId.trim()
      : "";

  if (!UUID_PATTERN.test(acceptanceId)) {
    return NextResponse.json(
      {
        error: "Documentul contractual nu este valid.",
        code: "invalid_acceptance",
      },
      { status: 400 }
    );
  }

  const { data: mayAccess, error: accessError } =
    await supabase.rpc(
      "can_access_contract_acceptance",
      {
        target_acceptance_id: acceptanceId,
      }
    );

  if (accessError || !mayAccess) {
    return NextResponse.json(
      {
        error: "Nu aveți acces la acest document.",
        code: "forbidden",
      },
      { status: 403 }
    );
  }

  const admin = createAdminClient();

  const { data: artifact, error: artifactError } =
    await admin
      .from("contract_acceptance_artifacts")
      .select(`
        id,
        acceptance_id,
        status,
        storage_bucket,
        storage_path,
        file_name
      `)
      .eq("acceptance_id", acceptanceId)
      .maybeSingle();

  if (
    artifactError ||
    !artifact ||
    artifact.status !== "ready"
  ) {
    return NextResponse.json(
      {
        error:
          "PDF-ul contractual nu este încă disponibil.",
        code: "pdf_not_ready",
      },
      { status: 409 }
    );
  }

  const { data: acceptance } = await admin
    .from("contract_acceptances")
    .select("assignment_id")
    .eq("id", acceptanceId)
    .maybeSingle();

  const { data: signed, error: signedError } =
    await admin.storage
      .from(artifact.storage_bucket)
      .createSignedUrl(
        artifact.storage_path,
        URL_TTL_SECONDS,
        {
          download: artifact.file_name,
        }
      );

  if (signedError || !signed?.signedUrl) {
    return NextResponse.json(
      {
        error:
          "Linkul securizat nu a putut fi creat.",
        code: "signed_url_failed",
      },
      { status: 500 }
    );
  }

  if (acceptance?.assignment_id) {
    await admin.from("contract_events").insert({
      assignment_id: acceptance.assignment_id,
      acceptance_id: acceptanceId,
      event_type: "downloaded",
      actor_profile_id: user.id,
      event_data: {
        artifactId: artifact.id,
        fileName: artifact.file_name,
      },
    });
  }

  return NextResponse.json(
    {
      signedUrl: signed.signedUrl,
      fileName: artifact.file_name,
      expiresIn: URL_TTL_SECONDS,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
