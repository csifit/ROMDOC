import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createMedicalFolderDocument,
  deleteMedicalFolderDocument,
  isUuid,
  listMedicalFolderDocuments,
} from "@/lib/medical-folder/folder-operations";
import {
  loadStaffMedicalFolderAppointment,
  requireActiveStaffMedicalFolderAccess,
} from "@/lib/medical-folder/staff-access";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

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
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      result.authorization
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
      actorRole: "staff",
      doctorId:
        appointment.doctor_id,
    },
    "doctor-wide"
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

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
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      result.authorization
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
      actorRole: "staff",
      doctorId:
        appointment.doctor_id,
    }
  );
}

export async function DELETE(
  request: NextRequest
): Promise<Response> {
  const result =
    await requireActiveStaffMedicalFolderAccess();

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
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      result.authorization
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
      actorRole: "staff",
      doctorId:
        appointment.doctor_id,
    },
    "doctor-wide"
  );
}
