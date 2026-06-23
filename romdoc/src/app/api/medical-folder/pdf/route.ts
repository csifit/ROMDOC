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
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type PdfMakeWithVirtualFileSystem =
  typeof pdfMake & {
    addVirtualFileSystem: (
      virtualFileSystem: unknown
    ) => void;
  };

const pdfMakeWithVirtualFileSystem =
  pdfMake as PdfMakeWithVirtualFileSystem;

pdfMakeWithVirtualFileSystem
  .addVirtualFileSystem(pdfFonts);

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function safeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "nota-medicala";
}

function formatRomanianDate(value: string) {
  return new Intl.DateTimeFormat(
    "ro-RO",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date(value));
}

function firstRelation<T>(
  value: T | T[] | null
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function createPdfBuffer(
  definition: TDocumentDefinitions
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
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      {
        error:
          "Trebuie să fii autentificat.",
      },
      { status: 401 }
    );
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(`
      role,
      account_status,
      first_name,
      last_name
    `)
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active" ||
    ![
      "patient",
      "doctor",
      "admin",
    ].includes(profile.role)
  ) {
    return NextResponse.json(
      {
        error:
          "Nu ai permisiunea de a genera acest PDF.",
      },
      { status: 403 }
    );
  }

  let body: {
    documentId?: unknown;
  };

  try {
    body =
      await request.json() as {
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

  const documentId =
    typeof body.documentId ===
      "string"
      ? body.documentId.trim()
      : "";

  if (!isUuid(documentId)) {
    return NextResponse.json(
      {
        error:
          "Documentul nu este valid.",
      },
      { status: 400 }
    );
  }

  const admin =
    createAdminClient();

  const {
    data: document,
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
        id,
        slug,
        profiles (
          first_name,
          last_name
        )
      ),
      appointments (
        id,
        scheduled_date,
        requested_date,
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
    !document
  ) {
    return NextResponse.json(
      {
        error:
          "Documentul nu a fost găsit.",
      },
      { status: 404 }
    );
  }

  let authorized = false;

  if (
    profile.role === "patient"
  ) {
    authorized =
      document.patient_profile_id ===
      user.id;
  } else if (
    profile.role === "doctor"
  ) {
    const {
      data: doctorAllowed,
      error: doctorAccessError,
    } = await supabase.rpc(
      "doctor_can_read_medical_document",
      {
        target_document_id:
          documentId,
      }
    );

    authorized =
      !doctorAccessError &&
      Boolean(doctorAllowed);
  } else if (
    profile.role === "admin"
  ) {
    authorized = true;
  }

  if (!authorized) {
    return NextResponse.json(
      {
        error:
          "Nu ai acces la acest document.",
      },
      { status: 403 }
    );
  }

  if (
    document.content_format !==
      "text" ||
    document.document_type !==
      "consultation_note" ||
    !document.content_text
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
      document.doctors
    );

  const doctorProfile =
    firstRelation(
      doctor?.profiles ?? null
    );

  const appointment =
    firstRelation(
      document.appointments
    );

  const clinic =
    firstRelation(
      appointment?.clinics ?? null
    );

  const patient =
    firstRelation(
      document.patient
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
    "Pacient";

  const clinicName =
    clinic?.clinic_translations?.find(
      (translation: {
        locale: string;
        name: string;
      }) =>
        translation.locale === "ro"
    )?.name ??
    clinic?.clinic_translations?.[0]
      ?.name ??
    clinic?.slug ??
    "Clinică";

  const consultationDate =
    appointment?.scheduled_date ??
    appointment?.requested_date ??
    null;

  const content: Content[] = [
    {
      text: "RomDoc",
      style: "brand",
    },
    {
      text:
        document.title,
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
            consultationDate
              ? formatRomanianDate(
                  `${consultationDate}T12:00:00`
                )
              : "Nespecificată",
          ],
          [
            {
              text: "Notă creată",
              bold: true,
            },
            formatRomanianDate(
              document.created_at
            ),
          ],
        ],
      },
      layout: "lightHorizontalLines",
    },
  ];

  if (document.description) {
    content.push({
      text:
        document.description,
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
        document.content_text,
      style: "body",
    },
    {
      text:
        "Acest document a fost generat electronic din RomDoc. Conținutul medical aparține medicului care a creat nota.",
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
          margin: [0, 10, 0, 0],
          fontSize: 22,
          bold: true,
          color: "#111827",
        },
        subtitle: {
          margin: [0, 6, 0, 0],
          fontSize: 9,
          color: "#6B7280",
        },
        section: {
          margin: [0, 24, 0, 8],
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
          margin: [0, 28, 0, 0],
          fontSize: 8,
          color: "#6B7280",
        },
      },
      footer: (
        currentPage,
        pageCount
      ) => ({
        margin: [48, 0, 48, 0],
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
          document.title,
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
      "Medical note PDF generation failed:",
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
        document.id,
      patient_profile_id:
        document.patient_profile_id,
      appointment_id:
        document.appointment_id,
      event_type:
        "pdf_generated",
      actor_profile_id:
        user.id,
      actor_role:
        profile.role,
      metadata: {
        file_size_bytes:
          pdfBuffer.length,
      },
    });

  const fileName =
    `${safeFileName(
      document.title
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
