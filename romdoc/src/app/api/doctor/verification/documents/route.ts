import {
  randomUUID,
} from "node:crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  validateUploadFile,
} from "@/lib/security/upload-policy";

export const runtime = "nodejs";

const BUCKET_NAME =
  "doctor-verification-documents";
const allowedDocumentTypes = new Set([
  "identity_document",
  "professional_certificate",
  "membership_certificate",
  "practice_authorization",
  "other",
]);

function getFileExtension(file: File) {
  const extensionFromName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  if (extensionFromName) {
    return extensionFromName;
  }

  switch (file.type) {
    case "application/pdf":
      return "pdf";
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return "bin";
  }
}

async function requireDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      user: null,
      doctor: null,
      response: NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        { status: 401 }
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
    profile?.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase,
      user: null,
      doctor: null,
      response: NextResponse.json(
        {
          error:
            "Nu ai permisiunea de a gestiona documentele de verificare.",
        },
        { status: 403 }
      ),
    };
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    return {
      supabase,
      user: null,
      doctor: null,
      response: NextResponse.json(
        {
          error:
            "Contul nu este asociat unui profil de medic.",
        },
        { status: 404 }
      ),
    };
  }

  return {
    supabase,
    user,
    doctor,
    response: null,
  };
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireDoctor();

  if (authorization.response) {
    return authorization.response;
  }

  const {
    supabase,
    user,
    doctor,
  } = authorization;
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Documentul trimis nu este valid.",
      },
      { status: 400 }
    );
  }

  const fileValue = formData.get("file");
  const documentTypeValue =
    formData.get("documentType");

  if (!(fileValue instanceof File)) {
    return NextResponse.json(
      {
        error:
          "Selectează un document pentru încărcare.",
      },
      { status: 400 }
    );
  }

  const documentType =
    typeof documentTypeValue === "string"
      ? documentTypeValue
      : "other";

  if (
    !allowedDocumentTypes.has(
      documentType
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Tipul documentului nu este valid.",
      },
      { status: 400 }
    );
  }

  const validation =
    validateUploadFile({
      file: fileValue,
      allowedMimeTypes:
        ALLOWED_DOCUMENT_MIME_TYPES,
      emptyMessage:
        "Selectează un document pentru încărcare.",
      typeMessage:
        "Sunt acceptate numai fișiere PDF, JPEG, PNG sau WebP.",
    });

  if (!validation.ok) {
    return NextResponse.json(
      {
        error:
          validation.error,
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

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from(
      "doctor_verification_submissions"
    )
    .select("id, status")
    .eq("doctor_id", doctor.id)
    .eq("status", "draft")
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (submissionError) {
    console.error(
      "Verification draft query failed:",
      submissionError
    );

    return NextResponse.json(
      {
        error:
          "Ciorna de verificare nu a putut fi încărcată.",
      },
      { status: 500 }
    );
  }

  if (!submission) {
    return NextResponse.json(
      {
        error:
          "Salvează mai întâi ciorna verificării.",
      },
      { status: 409 }
    );
  }

  const extension =
    getFileExtension(fileValue);

  const storagePath = `${user.id}/${submission.id}/${randomUUID()}.${extension}`;

  const fileBuffer =
    Buffer.from(
      await fileValue.arrayBuffer()
    );

  const {
    error: uploadError,
  } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: fileValue.type,
      upsert: false,
    });

  if (uploadError) {
    console.error(
      "Verification document upload failed:",
      uploadError
    );

    return NextResponse.json(
      {
        error:
          "Documentul nu a putut fi încărcat.",
      },
      { status: 500 }
    );
  }

  const {
    data: document,
    error: metadataError,
  } = await supabase
    .from(
      "doctor_verification_documents"
    )
    .insert({
      submission_id: submission.id,
      uploaded_by_profile_id: user.id,
      document_type: documentType,
      storage_bucket: BUCKET_NAME,
      storage_path: storagePath,
      original_file_name:
        fileValue.name.slice(0, 255),
      mime_type: fileValue.type,
      file_size_bytes: fileValue.size,
    })
    .select(`
      id,
      document_type,
      original_file_name,
      mime_type,
      file_size_bytes,
      created_at
    `)
    .single();

  if (metadataError) {
    console.error(
      "Verification document metadata insert failed:",
      metadataError
    );

    await supabase.storage
      .from(BUCKET_NAME)
      .remove([storagePath]);

    return NextResponse.json(
      {
        error:
          "Documentul nu a putut fi înregistrat.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    document,
  });
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireDoctor();

  if (authorization.response) {
    return authorization.response;
  }

  const {
    supabase,
    user,
    doctor,
  } = authorization;

  let body: {
    documentId?: unknown;
  };

  try {
    body = (await request.json()) as {
      documentId?: unknown;
    };
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
    typeof body.documentId !== "string" ||
    !body.documentId.trim()
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul selectat nu este valid.",
      },
      { status: 400 }
    );
  }

  const {
    data: document,
    error: documentError,
  } = await supabase
    .from(
      "doctor_verification_documents"
    )
    .select(`
      id,
      storage_bucket,
      storage_path,
      submission:doctor_verification_submissions!inner (
        id,
        doctor_id,
        status
      )
    `)
    .eq("id", body.documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (documentError || !document) {
    return NextResponse.json(
      {
        error:
          "Documentul nu a fost găsit.",
      },
      { status: 404 }
    );
  }

  const submission = Array.isArray(
    document.submission
  )
    ? document.submission[0]
    : document.submission;

  if (
    !submission ||
    submission.doctor_id !== doctor.id ||
    submission.status !== "draft"
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul nu mai poate fi șters.",
      },
      { status: 409 }
    );
  }

  const {
    error: removeError,
  } = await supabase.storage
    .from(document.storage_bucket)
    .remove([document.storage_path]);

  if (removeError) {
    console.error(
      "Verification document removal failed:",
      removeError
    );

    return NextResponse.json(
      {
        error:
          "Fișierul nu a putut fi șters.",
      },
      { status: 500 }
    );
  }

  const {
    error: metadataUpdateError,
  } = await supabase
    .from(
      "doctor_verification_documents"
    )
    .update({
      deleted_at:
        new Date().toISOString(),
      deleted_by_profile_id:
        user.id,
    })
    .eq("id", document.id);

  if (metadataUpdateError) {
    console.error(
      "Verification document soft-delete failed:",
      metadataUpdateError
    );

    return NextResponse.json(
      {
        error:
          "Fișierul a fost șters, dar evidența documentului nu a putut fi actualizată.",
        partialSuccess: true,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
  });
}
