import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET_NAME =
  "appointment-message-attachments";

const MAX_BODY_LENGTH = 4000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_MESSAGE = 5;
const SIGNED_URL_SECONDS = 10 * 60;

const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type RouteContext = {
  params: Promise<{
    appointmentId: string;
  }>;
};

type ProfileRow = {
  id: string;
  role: string;
  account_status: string | null;
  first_name: string | null;
  last_name: string | null;
};

type AppointmentRow = {
  id: string;
  doctor_id: string;
  patient_profile_id: string | null;
  status: string;
};

type MessageRow = {
  id: string;
  appointment_id: string;
  sender_profile_id: string;
  body: string | null;
  created_at: string;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  appointment_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  created_at: string;
};

type AccessResult = {
  userId: string;
  profile: ProfileRow;
  appointment: AppointmentRow;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    { error },
    { status }
  );
}

function getProfileDisplayName(
  profile: Pick<
    ProfileRow,
    "first_name" | "last_name" | "role"
  >
) {
  const name = [
    profile.first_name,
    profile.last_name,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (name) {
    return name;
  }

  if (profile.role === "doctor") {
    return "Medic";
  }

  if (profile.role === "staff") {
    return "Personal medical";
  }

  return "Pacient";
}

function getRoleLabel(role: string) {
  switch (role) {
    case "doctor":
      return "Medic";
    case "staff":
      return "Personal medical";
    case "patient":
      return "Pacient";
    default:
      return "Utilizator";
  }
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);

  return normalized || "fisier";
}

function canSendMessage(
  appointment: AppointmentRow
) {
  return [
    "pending",
    "confirmed",
    "rescheduled",
    "completed",
  ].includes(appointment.status);
}

async function staffCanAccessAppointment(
  staffProfileId: string,
  doctorId: string
) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("doctor_staff")
    .select("id")
    .eq("staff_profile_id", staffProfileId)
    .eq("doctor_id", doctorId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      "Appointment messaging staff access lookup failed:",
      error
    );
  }

  return Boolean(data) && !error;
}

async function getAppointmentAccess(
  appointmentId: string
): Promise<
  | {
      access: AccessResult;
      response: null;
    }
  | {
      access: null;
      response: NextResponse;
    }
> {
  if (!isUuid(appointmentId)) {
    return {
      access: null,
      response: jsonError(
        "Identificatorul programării nu este valid.",
        400
      ),
    };
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      access: null,
      response: jsonError(
        "Trebuie să fii autentificat.",
        401
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "id, role, account_status, first_name, last_name"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      access: null,
      response: jsonError(
        "Profilul utilizatorului nu a putut fi verificat.",
        403
      ),
    };
  }

  const typedProfile = profile as ProfileRow;

  if (
    typedProfile.account_status &&
    typedProfile.account_status !== "active"
  ) {
    return {
      access: null,
      response: jsonError(
        "Contul nu este activ.",
        403
      ),
    };
  }

  const {
    data: appointment,
    error: appointmentError,
  } = await admin
    .from("appointments")
    .select(
      "id, doctor_id, patient_profile_id, status"
    )
    .eq("id", appointmentId)
    .maybeSingle();

  if (appointmentError || !appointment) {
    return {
      access: null,
      response: jsonError(
        "Programarea nu a fost găsită.",
        404
      ),
    };
  }

  const typedAppointment =
    appointment as AppointmentRow;

  let hasAccess =
    typedProfile.role === "patient" &&
    typedAppointment.patient_profile_id === user.id;

  if (!hasAccess && typedProfile.role === "doctor") {
    const {
      data: doctor,
      error: doctorError,
    } = await admin
      .from("doctors")
      .select("id, profile_id")
      .eq("id", typedAppointment.doctor_id)
      .maybeSingle();

    if (doctorError) {
      console.error(
        "Appointment messaging doctor access lookup failed:",
        doctorError
      );
    }

    hasAccess =
      !!doctor && doctor.profile_id === user.id;
  }

  if (!hasAccess && typedProfile.role === "staff") {
    hasAccess = await staffCanAccessAppointment(
      user.id,
      typedAppointment.doctor_id
    );
  }

  if (!hasAccess) {
    return {
      access: null,
      response: jsonError(
        "Nu ai acces la mesajele acestei programări.",
        403
      ),
    };
  }

  return {
    access: {
      userId: user.id,
      profile: typedProfile,
      appointment: typedAppointment,
    },
    response: null,
  };
}

async function buildMessagesResponse(
  appointmentId: string
) {
  const admin = createAdminClient();

  const [
    messagesResult,
    attachmentsResult,
  ] = await Promise.all([
    admin
      .from("appointment_messages")
      .select(
        "id, appointment_id, sender_profile_id, body, created_at"
      )
      .eq("appointment_id", appointmentId)
      .order("created_at", {
        ascending: true,
      }),

    admin
      .from("appointment_message_attachments")
      .select(
        "id, message_id, appointment_id, storage_path, file_name, mime_type, file_size_bytes, created_at"
      )
      .eq("appointment_id", appointmentId)
      .order("created_at", {
        ascending: true,
      }),
  ]);

  if (messagesResult.error) {
    console.error(
      "Appointment messages query failed:",
      messagesResult.error
    );

    return {
      response: jsonError(
        "Mesajele nu au putut fi încărcate.",
        500
      ),
    };
  }

  if (attachmentsResult.error) {
    console.error(
      "Appointment message attachments query failed:",
      attachmentsResult.error
    );

    return {
      response: jsonError(
        "Atașamentele nu au putut fi încărcate.",
        500
      ),
    };
  }

  const messages =
    (messagesResult.data ?? []) as MessageRow[];
  const attachments =
    (attachmentsResult.data ?? []) as AttachmentRow[];

  const senderIds = Array.from(
    new Set(
      messages.map(
        (message) => message.sender_profile_id
      )
    )
  );

  const profilesById = new Map<
    string,
    ProfileRow
  >();

  if (senderIds.length > 0) {
    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, role, account_status, first_name, last_name"
      )
      .in("id", senderIds);

    if (error) {
      console.error(
        "Appointment message sender profile query failed:",
        error
      );
    }

    for (const profile of
      (data ?? []) as ProfileRow[]) {
      profilesById.set(profile.id, profile);
    }
  }

  const attachmentsByMessageId = new Map<
    string,
    Array<
      AttachmentRow & {
        signedUrl: string | null;
      }
    >
  >();

  for (const attachment of attachments) {
    const { data, error } = await admin.storage
      .from(BUCKET_NAME)
      .createSignedUrl(
        attachment.storage_path,
        SIGNED_URL_SECONDS
      );

    if (error) {
      console.error(
        "Appointment message signed URL creation failed:",
        error
      );
    }

    const list =
      attachmentsByMessageId.get(
        attachment.message_id
      ) ?? [];

    list.push({
      ...attachment,
      signedUrl: data?.signedUrl ?? null,
    });

    attachmentsByMessageId.set(
      attachment.message_id,
      list
    );
  }

  return {
    response: NextResponse.json(
      {
        messages: messages.map((message) => {
          const sender = profilesById.get(
            message.sender_profile_id
          );

          return {
            id: message.id,
            appointmentId:
              message.appointment_id,
            senderProfileId:
              message.sender_profile_id,
            senderName: sender
              ? getProfileDisplayName(sender)
              : "Utilizator",
            senderRole: sender?.role ?? null,
            senderRoleLabel: sender
              ? getRoleLabel(sender.role)
              : "Utilizator",
            body: message.body,
            createdAt: message.created_at,
            attachments: (
              attachmentsByMessageId.get(
                message.id
              ) ?? []
            ).map((attachment) => ({
              id: attachment.id,
              fileName: attachment.file_name,
              mimeType: attachment.mime_type,
              fileSizeBytes:
                attachment.file_size_bytes,
              signedUrl: attachment.signedUrl,
              createdAt: attachment.created_at,
            })),
          };
        }),
      },
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      }
    ),
  };
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { appointmentId } =
    await context.params;

  const accessResult =
    await getAppointmentAccess(
      appointmentId
    );

  if (accessResult.response) {
    return accessResult.response;
  }

  const { response } =
    await buildMessagesResponse(
      appointmentId
    );

  return response;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { appointmentId } =
    await context.params;

  const accessResult =
    await getAppointmentAccess(
      appointmentId
    );

  if (accessResult.response) {
    return accessResult.response;
  }

  const { access } = accessResult;

  if (!canSendMessage(access.appointment)) {
    return jsonError(
      "Mesajele pot fi trimise doar pentru programări active sau finalizate.",
      409
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError(
      "Cererea nu conține date valide.",
      400
    );
  }

  const body = String(
    formData.get("body") ?? ""
  ).trim();

  const rawFiles = formData
    .getAll("attachments")
    .filter(
      (entry): entry is File =>
        typeof File !== "undefined" &&
        entry instanceof File &&
        entry.size > 0
    );

  if (
    body.length === 0 &&
    rawFiles.length === 0
  ) {
    return jsonError(
      "Scrie un mesaj sau atașează cel puțin un fișier.",
      400
    );
  }

  if (body.length > MAX_BODY_LENGTH) {
    return jsonError(
      `Mesajul poate avea maximum ${MAX_BODY_LENGTH} de caractere.`,
      400
    );
  }

  if (
    rawFiles.length >
    MAX_FILES_PER_MESSAGE
  ) {
    return jsonError(
      `Poți atașa maximum ${MAX_FILES_PER_MESSAGE} fișiere la un mesaj.`,
      400
    );
  }

  for (const file of rawFiles) {
    if (
      !ALLOWED_ATTACHMENT_TYPES.has(
        file.type
      )
    ) {
      return jsonError(
        "Poți atașa doar PDF, JPG, PNG sau WEBP.",
        400
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return jsonError(
        "Fiecare fișier poate avea maximum 10 MB.",
        400
      );
    }
  }

  const admin = createAdminClient();

  const {
    data: message,
    error: messageError,
  } = await admin
    .from("appointment_messages")
    .insert({
      appointment_id: appointmentId,
      sender_profile_id: access.userId,
      body: body || null,
    })
    .select("id")
    .single();

  if (messageError || !message) {
    console.error(
      "Appointment message insert failed:",
      messageError
    );

    return jsonError(
      "Mesajul nu a putut fi salvat.",
      500
    );
  }

  const messageId = String(message.id);

  const attachmentRows: Array<{
    message_id: string;
    appointment_id: string;
    uploaded_by_profile_id: string;
    bucket_id: string;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
  }> = [];

  for (const file of rawFiles) {
    const safeFileName = sanitizeFileName(
      file.name
    );

    const storagePath = [
      appointmentId,
      messageId,
      `${crypto.randomUUID()}-${safeFileName}`,
    ].join("/");

    const fileBuffer = Buffer.from(
      await file.arrayBuffer()
    );

    const { error: uploadError } =
      await admin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Appointment message attachment upload failed:",
        uploadError
      );

      return jsonError(
        "Atașamentul nu a putut fi încărcat.",
        500
      );
    }

    attachmentRows.push({
      message_id: messageId,
      appointment_id: appointmentId,
      uploaded_by_profile_id: access.userId,
      bucket_id: BUCKET_NAME,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size_bytes: file.size,
    });
  }

  if (attachmentRows.length > 0) {
    const { error: attachmentError } =
      await admin
        .from(
          "appointment_message_attachments"
        )
        .insert(attachmentRows);

    if (attachmentError) {
      console.error(
        "Appointment message attachment metadata insert failed:",
        attachmentError
      );

      return jsonError(
        "Detaliile atașamentelor nu au putut fi salvate.",
        500
      );
    }
  }

  const { response } =
    await buildMessagesResponse(
      appointmentId
    );

  return response;
}
