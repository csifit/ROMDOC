import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  canSendAppointmentMessage,
  getAppointmentMessageAccess,
  type MessageAccessProfile,
} from "@/lib/appointments/get-appointment-message-access";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime =
  "nodejs";

const BUCKET_NAME =
  "appointment-message-attachments";

const MAX_BODY_LENGTH =
  4000;

const MAX_FILE_SIZE_BYTES =
  10 * 1024 * 1024;

const MAX_FILES_PER_MESSAGE =
  5;

const SIGNED_URL_SECONDS =
  10 * 60;

const ALLOWED_ATTACHMENT_TYPES =
  new Set([
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

function jsonError(
  error: string,
  status: number
) {
  return NextResponse.json(
    {
      error,
    },
    {
      status,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

function getProfileDisplayName(
  profile: Pick<
    MessageAccessProfile,
    | "first_name"
    | "last_name"
    | "role"
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

  if (
    profile.role ===
    "doctor"
  ) {
    return "Medic";
  }

  if (
    profile.role ===
    "staff"
  ) {
    return "Personal medical";
  }

  return "Pacient";
}

function getRoleLabel(
  role: string
) {
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

function sanitizeFileName(
  fileName: string
) {
  const normalized =
    fileName
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      .replace(
        /-+/g,
        "-"
      )
      .replace(
        /^-|-$/g,
        ""
      )
      .slice(
        0,
        120
      );

  return (
    normalized ||
    "fisier"
  );
}

async function markConversationRead({
  appointmentId,
  profileId,
}: {
  appointmentId: string;
  profileId: string;
}) {
  const admin =
    createAdminClient();

  const {
    error,
  } = await admin
    .from(
      "appointment_message_reads"
    )
    .upsert(
      {
        appointment_id:
          appointmentId,
        profile_id:
          profileId,
        last_read_at:
          new Date().toISOString(),
      },
      {
        onConflict:
          "appointment_id,profile_id",
      }
    );

  if (error) {
    console.error(
      "Appointment message read-state update failed:",
      error
    );
  }
}

async function buildMessagesResponse({
  appointmentId,
  viewerProfileId,
  appointmentStatus,
}: {
  appointmentId: string;
  viewerProfileId: string;
  appointmentStatus: string;
}) {
  const admin =
    createAdminClient();

  const [
    messagesResult,
    attachmentsResult,
  ] = await Promise.all([
    admin
      .from(
        "appointment_messages"
      )
      .select(
        "id, appointment_id, sender_profile_id, body, created_at"
      )
      .eq(
        "appointment_id",
        appointmentId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      ),

    admin
      .from(
        "appointment_message_attachments"
      )
      .select(
        "id, message_id, appointment_id, storage_path, file_name, mime_type, file_size_bytes, created_at"
      )
      .eq(
        "appointment_id",
        appointmentId
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      ),
  ]);

  if (
    messagesResult.error
  ) {
    console.error(
      "Appointment messages query failed:",
      messagesResult.error
    );

    return jsonError(
      "Mesajele nu au putut fi încărcate.",
      500
    );
  }

  if (
    attachmentsResult.error
  ) {
    console.error(
      "Appointment message attachments query failed:",
      attachmentsResult.error
    );

    return jsonError(
      "Atașamentele nu au putut fi încărcate.",
      500
    );
  }

  const messages =
    (messagesResult.data ??
      []) as MessageRow[];

  const attachments =
    (attachmentsResult.data ??
      []) as AttachmentRow[];

  const senderIds =
    Array.from(
      new Set(
        messages.map(
          (message) =>
            message.sender_profile_id
        )
      )
    );

  const profilesById =
    new Map<
      string,
      MessageAccessProfile
    >();

  if (
    senderIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await admin
      .from("profiles")
      .select(
        "id, role, account_status, first_name, last_name"
      )
      .in(
        "id",
        senderIds
      );

    if (error) {
      console.error(
        "Appointment message sender profile query failed:",
        error
      );
    }

    for (
      const profile of
      (data ??
        []) as MessageAccessProfile[]
    ) {
      profilesById.set(
        profile.id,
        profile
      );
    }
  }

  const attachmentsByMessageId =
    new Map<
      string,
      Array<
        AttachmentRow & {
          signedUrl:
            string | null;
        }
      >
    >();

  for (
    const attachment of
    attachments
  ) {
    const {
      data,
      error,
    } =
      await admin.storage
        .from(
          BUCKET_NAME
        )
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
      signedUrl:
        data?.signedUrl ??
        null,
    });

    attachmentsByMessageId.set(
      attachment.message_id,
      list
    );
  }

  return NextResponse.json(
    {
      viewerProfileId,
      appointmentStatus,
      canSend:
        canSendAppointmentMessage(
          appointmentStatus
        ),
      messages:
        messages.map(
          (message) => {
            const sender =
              profilesById.get(
                message.sender_profile_id
              );

            return {
              id:
                message.id,
              appointmentId:
                message.appointment_id,
              senderProfileId:
                message.sender_profile_id,
              senderName:
                sender
                  ? getProfileDisplayName(
                      sender
                    )
                  : "Utilizator",
              senderRole:
                sender?.role ??
                null,
              senderRoleLabel:
                sender
                  ? getRoleLabel(
                      sender.role
                    )
                  : "Utilizator",
              body:
                message.body,
              createdAt:
                message.created_at,
              attachments: (
                attachmentsByMessageId.get(
                  message.id
                ) ?? []
              ).map(
                (
                  attachment
                ) => ({
                  id:
                    attachment.id,
                  fileName:
                    attachment.file_name,
                  mimeType:
                    attachment.mime_type,
                  fileSizeBytes:
                    attachment.file_size_bytes,
                  signedUrl:
                    attachment.signedUrl,
                  createdAt:
                    attachment.created_at,
                })
              ),
            };
          }
        ),
    },
    {
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    }
  );
}

async function cleanUpFailedMessage({
  messageId,
  storagePaths,
}: {
  messageId: string;
  storagePaths: string[];
}) {
  const admin =
    createAdminClient();

  if (
    storagePaths.length >
    0
  ) {
    const {
      error,
    } =
      await admin.storage
        .from(
          BUCKET_NAME
        )
        .remove(
          storagePaths
        );

    if (error) {
      console.error(
        "Appointment message attachment cleanup failed:",
        error
      );
    }
  }

  const {
    error: deleteError,
  } = await admin
    .from(
      "appointment_messages"
    )
    .delete()
    .eq(
      "id",
      messageId
    );

  if (deleteError) {
    console.error(
      "Appointment message cleanup failed:",
      deleteError
    );
  }
}

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const {
    appointmentId,
  } =
    await context.params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const accessResult =
    await getAppointmentMessageAccess({
      supabase,
      admin,
      appointmentId,
    });

  if (
    !accessResult.access
  ) {
    return jsonError(
      accessResult.error,
      accessResult.status
    );
  }

  const {
    access,
  } = accessResult;

  const response =
    await buildMessagesResponse({
      appointmentId,
      viewerProfileId:
        access.userId,
      appointmentStatus:
        access.appointment.status,
    });

  if (
    response.ok
  ) {
    await markConversationRead({
      appointmentId,
      profileId:
        accessResult.access.userId,
    });
  }

  return response;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const {
    appointmentId,
  } =
    await context.params;

  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const accessResult =
    await getAppointmentMessageAccess({
      supabase,
      admin,
      appointmentId,
    });

  if (
    !accessResult.access
  ) {
    return jsonError(
      accessResult.error,
      accessResult.status
    );
  }

  const {
    access,
  } = accessResult;

  if (
    !canSendAppointmentMessage(
      access.appointment.status
    )
  ) {
    return jsonError(
      "Mesajele nu sunt disponibile pentru starea actuală a programării.",
      409
    );
  }

  let formData:
    FormData;

  try {
    formData =
      await request.formData();
  } catch {
    return jsonError(
      "Cererea nu conține date valide.",
      400
    );
  }

  const body =
    String(
      formData.get(
        "body"
      ) ?? ""
    ).trim();

  const rawFiles =
    formData
      .getAll(
        "attachments"
      )
      .filter(
        (
          entry
        ): entry is File =>
          typeof File !==
            "undefined" &&
          entry instanceof
            File &&
          entry.size > 0
      );

  if (
    body.length === 0 &&
    rawFiles.length ===
      0
  ) {
    return jsonError(
      "Scrie un mesaj sau atașează cel puțin un fișier.",
      400
    );
  }

  if (
    body.length >
    MAX_BODY_LENGTH
  ) {
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

  for (
    const file of
    rawFiles
  ) {
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

    if (
      file.size >
      MAX_FILE_SIZE_BYTES
    ) {
      return jsonError(
        "Fiecare fișier poate avea maximum 10 MB.",
        400
      );
    }
  }

  const {
    data: message,
    error: messageError,
  } = await admin
    .from(
      "appointment_messages"
    )
    .insert({
      appointment_id:
        appointmentId,
      sender_profile_id:
        access.userId,
      body:
        body ||
        null,
    })
    .select("id")
    .single();

  if (
    messageError ||
    !message
  ) {
    console.error(
      "Appointment message insert failed:",
      messageError
    );

    return jsonError(
      "Mesajul nu a putut fi salvat.",
      500
    );
  }

  const messageId =
    String(
      message.id
    );

  const storagePaths:
    string[] = [];

  const attachmentRows:
    Array<{
      message_id: string;
      appointment_id: string;
      uploaded_by_profile_id: string;
      bucket_id: string;
      storage_path: string;
      file_name: string;
      mime_type: string;
      file_size_bytes: number;
    }> = [];

  for (
    const file of
    rawFiles
  ) {
    const safeFileName =
      sanitizeFileName(
        file.name
      );

    const storagePath =
      [
        appointmentId,
        messageId,
        `${crypto.randomUUID()}-${safeFileName}`,
      ].join("/");

    const fileBuffer =
      Buffer.from(
        await file.arrayBuffer()
      );

    const {
      error:
        uploadError,
    } =
      await admin.storage
        .from(
          BUCKET_NAME
        )
        .upload(
          storagePath,
          fileBuffer,
          {
            contentType:
              file.type,
            upsert: false,
          }
        );

    if (
      uploadError
    ) {
      console.error(
        "Appointment message attachment upload failed:",
        uploadError
      );

      await cleanUpFailedMessage({
        messageId,
        storagePaths,
      });

      return jsonError(
        "Atașamentul nu a putut fi încărcat. Mesajul nu a fost salvat.",
        500
      );
    }

    storagePaths.push(
      storagePath
    );

    attachmentRows.push({
      message_id:
        messageId,
      appointment_id:
        appointmentId,
      uploaded_by_profile_id:
        access.userId,
      bucket_id:
        BUCKET_NAME,
      storage_path:
        storagePath,
      file_name:
        file.name,
      mime_type:
        file.type,
      file_size_bytes:
        file.size,
    });
  }

  if (
    attachmentRows.length >
    0
  ) {
    const {
      error:
        attachmentError,
    } = await admin
      .from(
        "appointment_message_attachments"
      )
      .insert(
        attachmentRows
      );

    if (
      attachmentError
    ) {
      console.error(
        "Appointment message attachment metadata insert failed:",
        attachmentError
      );

      await cleanUpFailedMessage({
        messageId,
        storagePaths,
      });

      return jsonError(
        "Detaliile atașamentelor nu au putut fi salvate. Mesajul nu a fost salvat.",
        500
      );
    }
  }

  await markConversationRead({
    appointmentId,
    profileId:
      access.userId,
  });

  return buildMessagesResponse({
    appointmentId,
    viewerProfileId:
      access.userId,
    appointmentStatus:
      access.appointment.status,
  });
}
