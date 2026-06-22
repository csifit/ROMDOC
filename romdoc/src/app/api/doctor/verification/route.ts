import {
  NextRequest,
  NextResponse,
} from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type VerificationAction =
  | "save"
  | "submit";

type VerificationBody = {
  action?: unknown;
  professionalRegistrationNumber?: unknown;
  issuingAuthority?: unknown;
  professionalTitle?: unknown;
  registrationCountry?: unknown;
  registrationExpiresAt?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength: number
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .slice(0, maximumLength);
}

function normalizeOptionalString(
  value: unknown,
  maximumLength: number
): string | null {
  const normalized = normalizeString(
    value,
    maximumLength
  );

  return normalized || null;
}

function isValidCountryCode(
  value: string
): boolean {
  return /^[A-Z]{2}$/.test(value);
}

function isValidDate(
  value: string
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    value
  );
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
            "Nu ai permisiunea de a gestiona verificarea profesională.",
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
    .select(`
      id,
      verification_status,
      professional_registration_number,
      verification_expires_at
    `)
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

export async function GET(): Promise<Response> {
  const authorization =
    await requireDoctor();

  if (authorization.response) {
    return authorization.response;
  }

  const { supabase, doctor } =
    authorization;

  const {
    data: submission,
    error: submissionError,
  } = await supabase
    .from(
      "doctor_verification_submissions"
    )
    .select(`
      id,
      status,
      professional_registration_number,
      issuing_authority,
      professional_title,
      registration_country,
      registration_expires_at,
      submitted_at,
      reviewed_at,
      rejection_reason,
      created_at,
      updated_at
    `)
    .eq("doctor_id", doctor.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (submissionError) {
    console.error(
      "Doctor verification submission query failed:",
      submissionError
    );

    return NextResponse.json(
      {
        error:
          "Cererea de verificare nu a putut fi încărcată.",
      },
      { status: 500 }
    );
  }

  let documents: unknown[] = [];

  if (submission) {
    const {
      data: documentRows,
      error: documentsError,
    } = await supabase
      .from(
        "doctor_verification_documents"
      )
      .select(`
        id,
        document_type,
        original_file_name,
        mime_type,
        file_size_bytes,
        created_at
      `)
      .eq("submission_id", submission.id)
      .is("deleted_at", null)
      .order("created_at", {
        ascending: true,
      });

    if (documentsError) {
      console.error(
        "Doctor verification documents query failed:",
        documentsError
      );

      return NextResponse.json(
        {
          error:
            "Documentele de verificare nu au putut fi încărcate.",
        },
        { status: 500 }
      );
    }

    documents = documentRows ?? [];
  }

  return NextResponse.json({
    verificationStatus:
      doctor.verification_status,
    submission,
    documents,
  });
}

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  const authorization =
    await requireDoctor();

  if (authorization.response) {
    return authorization.response;
  }

  const { supabase, doctor } =
    authorization;

  let body: VerificationBody;

  try {
    body =
      (await request.json()) as VerificationBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      { status: 400 }
    );
  }

  const action = body.action;

  if (
    action !== "save" &&
    action !== "submit"
  ) {
    return NextResponse.json(
      {
        error:
          "Acțiunea solicitată nu este validă.",
      },
      { status: 400 }
    );
  }

  const professionalRegistrationNumber =
    normalizeOptionalString(
      body.professionalRegistrationNumber,
      150
    );

  const issuingAuthority =
    normalizeOptionalString(
      body.issuingAuthority,
      250
    );

  const professionalTitle =
    normalizeOptionalString(
      body.professionalTitle,
      250
    );

  const registrationCountry =
    normalizeString(
      body.registrationCountry,
      2
    ).toUpperCase() || "RO";

  const registrationExpiresAt =
    normalizeOptionalString(
      body.registrationExpiresAt,
      10
    );

  if (
    !isValidCountryCode(
      registrationCountry
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Codul țării trebuie să conțină două litere.",
      },
      { status: 400 }
    );
  }

  if (
    registrationExpiresAt &&
    !isValidDate(registrationExpiresAt)
  ) {
    return NextResponse.json(
      {
        error:
          "Data expirării nu este validă.",
      },
      { status: 400 }
    );
  }

  if (action === "submit") {
    if (
      !professionalRegistrationNumber ||
      professionalRegistrationNumber.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Numărul de înregistrare profesională este obligatoriu.",
        },
        { status: 400 }
      );
    }

    if (
      !issuingAuthority ||
      issuingAuthority.length < 2
    ) {
      return NextResponse.json(
        {
          error:
            "Autoritatea emitentă este obligatorie.",
        },
        { status: 400 }
      );
    }
  }

  const {
    data: currentSubmission,
    error: currentSubmissionError,
  } = await supabase
    .from(
      "doctor_verification_submissions"
    )
    .select("id, status")
    .eq("doctor_id", doctor.id)
    .in("status", [
      "draft",
      "submitted",
      "under_review",
    ])
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (currentSubmissionError) {
    console.error(
      "Current verification submission query failed:",
      currentSubmissionError
    );

    return NextResponse.json(
      {
        error:
          "Cererea de verificare nu a putut fi verificată.",
      },
      { status: 500 }
    );
  }

  if (
    currentSubmission &&
    currentSubmission.status !== "draft"
  ) {
    return NextResponse.json(
      {
        error:
          "Cererea trimisă nu mai poate fi modificată.",
      },
      { status: 409 }
    );
  }

  const submissionValues = {
    doctor_id: doctor.id,
    status:
      action === "submit"
        ? "submitted"
        : "draft",
    professional_registration_number:
      professionalRegistrationNumber,
    issuing_authority:
      issuingAuthority,
    professional_title:
      professionalTitle,
    registration_country:
      registrationCountry,
    registration_expires_at:
      registrationExpiresAt,
    submitted_at:
      action === "submit"
        ? new Date().toISOString()
        : null,
    reviewed_at: null,
    reviewed_by_profile_id: null,
    rejection_reason: null,
  };

  const submissionQuery =
    currentSubmission
      ? supabase
          .from(
            "doctor_verification_submissions"
          )
          .update(submissionValues)
          .eq("id", currentSubmission.id)
          .select(`
            id,
            status,
            professional_registration_number,
            issuing_authority,
            professional_title,
            registration_country,
            registration_expires_at,
            submitted_at,
            reviewed_at,
            rejection_reason,
            created_at,
            updated_at
          `)
          .single()
      : supabase
          .from(
            "doctor_verification_submissions"
          )
          .insert(submissionValues)
          .select(`
            id,
            status,
            professional_registration_number,
            issuing_authority,
            professional_title,
            registration_country,
            registration_expires_at,
            submitted_at,
            reviewed_at,
            rejection_reason,
            created_at,
            updated_at
          `)
          .single();

  const {
    data: submission,
    error: submissionError,
  } = await submissionQuery;

  if (submissionError) {
    console.error(
      "Doctor verification save failed:",
      submissionError
    );

    return NextResponse.json(
      {
        error:
          "Cererea de verificare nu a putut fi salvată.",
      },
      { status: 500 }
    );
  }

  if (action === "submit") {
    const {
      error: doctorUpdateError,
    } = await supabase
      .from("doctors")
      .update({
        verification_status: "pending",
        professional_registration_number:
          professionalRegistrationNumber,
        verification_expires_at:
          registrationExpiresAt,
      })
      .eq("id", doctor.id);

    if (doctorUpdateError) {
      console.error(
        "Doctor verification summary update failed:",
        doctorUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Cererea a fost salvată, dar starea publică nu a putut fi actualizată.",
          partialSuccess: true,
          submission,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    success: true,
    submission,
    message:
      action === "submit"
        ? "Cererea a fost trimisă pentru verificare."
        : "Ciorna a fost salvată.",
  });
}
