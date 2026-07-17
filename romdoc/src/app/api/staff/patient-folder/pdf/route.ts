import {
  NextRequest,
  NextResponse,
} from "next/server";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  Content,
  TDocumentDefinitions,
} from "pdfmake/interfaces";

import {
  isUuid,
  loadStaffMedicalFolderAppointment,
  requireActiveStaffMedicalFolderAccess,
  staffCanReadMedicalDocument,
} from "@/lib/medical-folder/staff-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

type PdfMakeWithVirtualFileSystem =
  typeof pdfMake & {
    addVirtualFileSystem: (
      virtualFileSystem: unknown
    ) => void;
  };

type ProfileRelation = {
  first_name: string | null;
  last_name: string | null;
};

type DoctorRelation = {
  slug: string;
  profiles:
    | ProfileRelation
    | ProfileRelation[]
    | null;
};

type ClinicTranslation = {
  locale: string;
  name: string;
};

type ClinicRelation = {
  slug: string;
  clinic_translations:
    | ClinicTranslation[]
    | null;
};

type AppointmentRelation = {
  requested_date: string;
  scheduled_date: string | null;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type PatientRelation = {
  first_name: string | null;
  last_name: string | null;
};

type MedicalDocumentRow = {
  id: string;
  patient_profile_id: string;
  appointment_id: string;
  document_type: string;
  title: string;
  description: string | null;
  content_format: "file" | "text";
  content_text: string | null;
  created_at: string;
  uploaded_by_doctor_id: string;
  doctors:
    | DoctorRelation
    | DoctorRelation[]
    | null;
  appointments:
    | AppointmentRelation
    | AppointmentRelation[]
    | null;
  patient:
    | PatientRelation
    | PatientRelation[]
    | null;
};

const pdfMakeWithVirtualFileSystem =
  pdfMake as PdfMakeWithVirtualFileSystem;

pdfMakeWithVirtualFileSystem
  .addVirtualFileSystem(
    pdfFonts
  );

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function safeFileName(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-zA-Z0-9-_]+/g,
      "-"
    )
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) ||
    "nota-medicala";
}

function formatRomanianDate(
  value: string
) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(
    new Date(value)
  );
}

function createPdfBuffer(
  definition:
    TDocumentDefinitions
): Promise<Buffer> {
  return new Promise(
    (resolve, reject) => {
      try {
        pdfMake
          .createPdf(definition)
          .getBuffer((buffer) => {
            resolve(
              Buffer.from(buffer)
            );
          });
      } catch (error) {
        reject(error);
      }
    }
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

  const staffAppointment =
    await loadStaffMedicalFolderAppointment(
      appointmentId,
      result.authorization
    );

  if (!staffAppointment) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la această programare.",
      },
      { status: 403 }
    );
  }

  const allowed =
    await staffCanReadMedicalDocument(
      documentId,
      staffAppointment
    );

  if (!allowed) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la acest document.",
      },
      { status: 403 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data,
    error: documentError,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .select(`
      id,
      patient_profile_id,
      appointment_id,
      document_type,
      title,
      description,
      content_format,
      content_text,
      created_at,
      uploaded_by_doctor_id,
      doctors:uploaded_by_doctor_id (
        slug,
        profiles (
          first_name,
          last_name
        )
      ),
      appointments (
        requested_date,
        scheduled_date,
        clinics (
          slug,
          clinic_translations (
            locale,
            name
          )
        )
      ),
      patient:patient_profile_id (
        first_name,
        last_name
      )
    `)
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    documentError ||
    !data
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul nu a fost găsit.",
      },
      { status: 404 }
    );
  }

  const medicalDocument =
    data as unknown as
      MedicalDocumentRow;

  if (
    medicalDocument.content_format !==
      "text" ||
    medicalDocument.document_type !==
      "consultation_note" ||
    !medicalDocument.content_text
  ) {
    return NextResponse.json(
      {
        error:
          "PDF-ul poate fi generat numai pentru o notă medicală text.",
      },
      { status: 409 }
    );
  }

  const doctor =
    firstRelation(
      medicalDocument.doctors
    );

  const doctorProfile =
    firstRelation(
      doctor?.profiles ?? null
    );

  const originalAppointment =
    firstRelation(
      medicalDocument.appointments
    );

  const clinic =
    firstRelation(
      originalAppointment?.clinics ??
        null
    );

  const patient =
    firstRelation(
      medicalDocument.patient
    );

  const doctorName =
    [
      doctorProfile?.first_name,
      doctorProfile?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    doctor?.slug
      ?.split("-")
      .map(
        (part: string) =>
          part.charAt(0).toUpperCase() +
          part.slice(1)
      )
      .join(" ") ||
    "Medic";

  const patientName =
    [
      patient?.first_name,
      patient?.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    staffAppointment.patient_name ||
    "Pacient";

  const clinicName =
    clinic?.clinic_translations?.find(
      (
        translation:
          ClinicTranslation
      ) =>
        translation.locale === "ro"
    )?.name ??
    clinic?.clinic_translations?.[0]
      ?.name ??
    clinic?.slug ??
    "Clinică";

  const consultationDate =
    originalAppointment?.scheduled_date ??
    originalAppointment?.requested_date ??
    staffAppointment.scheduled_date ??
    staffAppointment.requested_date;

  const content: Content[] = [
    {
      text: "RomDoc",
      style: "brand",
    },
    {
      text:
        medicalDocument.title,
      style: "title",
    },
    {
      text:
        "Notă medicală generată din Dosarul medical RomDoc",
      style: "subtitle",
    },
    {
      margin: [0, 18, 0, 0],
      table: {
        widths: [
          110,
          "*",
        ],
        body: [
          [
            {
              text: "Pacient",
              bold: true,
            },
            patientName,
          ],
          [
            {
              text: "Medic",
              bold: true,
            },
            doctorName,
          ],
          [
            {
              text: "Clinică",
              bold: true,
            },
            clinicName,
          ],
          [
            {
              text: "Consultație",
              bold: true,
            },
            formatRomanianDate(
              `${consultationDate}T12:00:00`
            ),
          ],
          [
            {
              text: "Notă creată",
              bold: true,
            },
            formatRomanianDate(
              medicalDocument.created_at
            ),
          ],
        ],
      },
      layout:
        "lightHorizontalLines",
    },
  ];

  if (
    medicalDocument.description
  ) {
    content.push({
      text:
        medicalDocument.description,
      margin: [0, 18, 0, 0],
      color: "#4B5563",
      italics: true,
    });
  }

  content.push(
    {
      text: "Conținut medical",
      style: "section",
    },
    {
      text:
        medicalDocument.content_text,
      style: "body",
    },
    {
      text:
        "Acest document a fost generat electronic din RomDoc. Conținutul medical aparține medicului responsabil.",
      style: "footerNote",
    }
  );

  const definition:
    TDocumentDefinitions = {
      pageSize: "A4",
      pageMargins: [
        48,
        48,
        48,
        54,
      ],
      defaultStyle: {
        font: "Roboto",
        fontSize: 10.5,
        lineHeight: 1.35,
      },
      content,
      styles: {
        brand: {
          fontSize: 14,
          bold: true,
          color: "#036661",
        },
        title: {
          margin: [
            0,
            10,
            0,
            0,
          ],
          fontSize: 22,
          bold: true,
          color: "#111827",
        },
        subtitle: {
          margin: [
            0,
            6,
            0,
            0,
          ],
          fontSize: 9,
          color: "#6B7280",
        },
        section: {
          margin: [
            0,
            24,
            0,
            8,
          ],
          fontSize: 13,
          bold: true,
          color: "#036661",
        },
        body: {
          fontSize: 10.5,
          color: "#1F2937",
          lineHeight: 1.45,
        },
        footerNote: {
          margin: [
            0,
            28,
            0,
            0,
          ],
          fontSize: 8,
          color: "#6B7280",
        },
      },
      footer: (
        currentPage,
        pageCount
      ) => ({
        margin: [
          48,
          0,
          48,
          0,
        ],
        columns: [
          {
            text:
              "RomDoc - Dosar medical",
            fontSize: 8,
            color: "#6B7280",
          },
          {
            text:
              `Pagina ${currentPage} din ${pageCount}`,
            alignment: "right",
            fontSize: 8,
            color: "#6B7280",
          },
        ],
      }),
      info: {
        title:
          medicalDocument.title,
        author:
          doctorName,
        subject:
          "Notă medicală RomDoc",
        creator:
          "RomDoc",
      },
    };

  let pdfBuffer: Buffer;

  try {
    pdfBuffer =
      await createPdfBuffer(
        definition
      );
  } catch (error) {
    console.error(
      "Staff medical note PDF generation failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "PDF-ul nu a putut fi generat.",
      },
      { status: 500 }
    );
  }

  await admin
    .from(
      "patient_medical_document_events"
    )
    .insert({
      document_id:
        medicalDocument.id,
      patient_profile_id:
        medicalDocument.patient_profile_id,
      appointment_id:
        medicalDocument.appointment_id,
      event_type:
        "pdf_generated",
      actor_profile_id:
        result.authorization.userId,
      actor_role:
        "staff",
      metadata: {
        file_size_bytes:
          pdfBuffer.length,
      },
    });

  const fileName =
    `${safeFileName(
      medicalDocument.title
    )}.pdf`;

  return new Response(
    new Uint8Array(pdfBuffer),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/pdf",
        "Content-Disposition":
          `attachment; filename="${fileName}"`,
        "Content-Length":
          String(
            pdfBuffer.length
          ),
        "Cache-Control":
          "private, no-store",
      },
    }
  );
}
