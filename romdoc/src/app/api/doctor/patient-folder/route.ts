import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createMedicalFolderDocument,
  deleteMedicalFolderDocument,
  isUuid,
  listMedicalFolderDocuments,
  type MedicalFolderAppointment,
} from "@/lib/medical-folder/folder-operations";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type DoctorAuthorization = {
  userId: string;
  doctorId: string;
};

async function requireDoctor():
  Promise<
    | {
        authorization:
          DoctorAuthorization;
        response: null;
      }
    | {
        authorization: null;
        response: NextResponse;
      }
  > {
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
      authorization: null,
      response:
        NextResponse.json(
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
    .select(
      "role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    profile?.role !==
      "doctor" ||
    profile.account_status !==
      "active"
  ) {
    return {
      authorization: null,
      response:
        NextResponse.json(
          {
            error:
              "Doar medicii cu un cont activ pot administra Dosarul medical.",
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
    .eq(
      "profile_id",
      user.id
    )
    .maybeSingle();

  if (
    doctorError ||
    !doctor
  ) {
    return {
      authorization: null,
      response:
        NextResponse.json(
          {
            error:
              "Contul nu este asociat unui profil de medic.",
          },
          { status: 403 }
        ),
    };
  }

  return {
    authorization: {
      userId: user.id,
      doctorId:
        doctor.id,
    },
    response: null,
  };
}

async function loadOwnedAppointment(
  appointmentId: string,
  doctorId: string
): Promise<
  MedicalFolderAppointment | null
> {
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      patient_profile_id,
      status
    `)
    .eq("id", appointmentId)
    .eq(
      "doctor_id",
      doctorId
    )
    .maybeSingle();

  if (
    error ||
    !data ||
    !data.patient_profile_id
  ) {
    return null;
  }

  return {
    id: data.id,
    doctor_id:
      data.doctor_id,
    patient_profile_id:
      data.patient_profile_id,
    status:
      data.status,
  };
}

export async function GET(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireDoctor();

  if (result.response) {
    return result.response;
  }

  const appointmentId =
    request.nextUrl.searchParams
      .get("appointmentId")
      ?.trim() ?? "";

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      {
        error:
          "Programarea nu este validă.",
      },
      { status: 400 }
    );
  }

  const appointment =
    await loadOwnedAppointment(
      appointmentId,
      result.authorization.doctorId
    );

  if (!appointment) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la Dosarul medical pentru această programare.",
      },
      { status: 403 }
    );
  }

  return listMedicalFolderDocuments(
    appointment,
    {
      actorProfileId:
        result.authorization.userId,
      actorRole: "doctor",
      doctorId:
        result.authorization.doctorId,
    },
    "own-profile"
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireDoctor();

  if (result.response) {
    return result.response;
  }
  let formData: FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return NextResponse.json(
      {
        error:
          "Datele trimise nu sunt valide.",
      },
      { status: 400 }
    );
  }

  const appointmentId =
    typeof formData.get(
      "appointmentId"
    ) === "string"
      ? String(
          formData.get(
            "appointmentId"
          )
        ).trim()
      : "";

  if (!isUuid(appointmentId)) {
    return NextResponse.json(
      {
        error:
          "Programarea nu este validă.",
      },
      { status: 400 }
    );
  }

  const appointment =
    await loadOwnedAppointment(
      appointmentId,
      result.authorization.doctorId
    );

  if (!appointment) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la această programare.",
      },
      { status: 403 }
    );
  }

  return createMedicalFolderDocument(
    formData,
    appointment,
    {
      actorProfileId:
        result.authorization.userId,
      actorRole: "doctor",
      doctorId:
        result.authorization.doctorId,
    }
  );
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireDoctor();

  if (result.response) {
    return result.response;
  }

  let body: {
    documentId?: unknown;
    appointmentId?: unknown;
  };

  try {
    body =
      await request.json() as {
        documentId?: unknown;
        appointmentId?: unknown;
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

  const documentId =
    typeof body.documentId ===
      "string"
      ? body.documentId.trim()
      : "";

  const appointmentId =
    typeof body.appointmentId ===
      "string"
      ? body.appointmentId.trim()
      : "";

  if (
    !isUuid(documentId) ||
    !isUuid(appointmentId)
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul sau programarea nu este validă.",
      },
      { status: 400 }
    );
  }

  const appointment =
    await loadOwnedAppointment(
      appointmentId,
      result.authorization.doctorId
    );

  if (!appointment) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la această programare.",
      },
      { status: 403 }
    );
  }

  return deleteMedicalFolderDocument(
    documentId,
    appointment,
    {
      actorProfileId:
        result.authorization.userId,
      actorRole: "doctor",
      doctorId:
        result.authorization.doctorId,
    },
    "own-profile"
  );
}
