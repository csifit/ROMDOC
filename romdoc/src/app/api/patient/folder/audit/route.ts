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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Trebuie să fii autentificat." },
      { status: 401 }
    );
  }

  const documentId =
    request.nextUrl.searchParams
      .get("documentId")
      ?.trim() ?? "";

  if (!isUuid(documentId)) {
    return NextResponse.json(
      { error: "Documentul nu este valid." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const {
    data: document,
  } = await admin
    .from("patient_medical_documents")
    .select("id")
    .eq("id", documentId)
    .eq(
      "patient_profile_id",
      user.id
    )
    .maybeSingle();

  if (!document) {
    return NextResponse.json(
      { error: "Documentul nu a fost găsit." },
      { status: 404 }
    );
  }

  const {
    data,
    error,
  } = await admin
    .from(
      "patient_medical_document_events"
    )
    .select(`
      id,
      event_type,
      actor_role,
      metadata,
      created_at
    `)
    .eq("document_id", documentId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return NextResponse.json(
      {
        error:
          "Istoricul documentului nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    events: data ?? [],
  });
}
