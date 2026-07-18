import {
  redirect,
} from "next/navigation";

import DoctorInboxList, {
  type DoctorInboxItem,
} from "@/components/doctor/doctor-inbox-list";
import {
  type DoctorAppointmentDetail,
} from "@/components/doctor/doctor-appointment-detail-panel";
import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorRow = {
  id: string;
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

type AppointmentRow = {
  id: string;
  patient_profile_id: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  requested_date: string;
  requested_time: string | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  reschedule_reason: string | null;
  notes: string | null;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
  clinics:
    | ClinicRelation
    | ClinicRelation[]
    | null;
};

type MessageRow = {
  id: string;
  appointment_id: string;
  sender_profile_id: string;
  body: string | null;
  created_at: string;
};

type ReadRow = {
  appointment_id: string;
  last_read_at: string;
};

function firstRelation<T>(
  relation:
    | T
    | T[]
    | null
): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(
    relation
  )
    ? relation[0] ??
        null
    : relation;
}

function clinicName(
  clinic:
    | ClinicRelation
    | null
) {
  if (!clinic) {
    return "Clinică indisponibilă";
  }

  return (
    clinic
      .clinic_translations
      ?.find(
        (item) =>
          item.locale ===
          "ro"
      )?.name ??
    clinic
      .clinic_translations?.[0]
      ?.name ??
    clinic.slug
  );
}

function appointmentDetail(
  appointment:
    AppointmentRow
): DoctorAppointmentDetail {
  return {
    id:
      appointment.id,
    patientProfileId:
      appointment.patient_profile_id,
    patientName:
      appointment.patient_name,
    patientEmail:
      appointment.patient_email,
    patientPhone:
      appointment.patient_phone,
    requestedDate:
      appointment.requested_date,
    requestedTime:
      appointment.requested_time,
    scheduledDate:
      appointment.scheduled_date,
    scheduledTime:
      appointment.scheduled_time,
    rescheduleReason:
      appointment.reschedule_reason,
    notes:
      appointment.notes,
    source:
      appointment.source,
    status:
      appointment.status,
    createdAt:
      appointment.created_at,
    clinicName:
      clinicName(
        firstRelation(
          appointment.clinics
        )
      ),
  };
}

function appointmentDateLabel(
  appointment:
    AppointmentRow
) {
  const date =
    appointment.scheduled_date ??
    appointment.requested_date;

  const time =
    appointment.scheduled_time ??
    appointment.requested_time;

  const formattedDate =
    new Intl.DateTimeFormat(
      "ro-RO",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }
    ).format(
      new Date(
        `${date}T12:00:00Z`
      )
    );

  return `${formattedDate}${
    time
      ? `, ${time.slice(
          0,
          5
        )}`
      : ""
  }`;
}

export default async function DoctorInboxPage() {
  const supabase =
    await createClient();

  const admin =
    createAdminClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    redirect(
      "/login?next=/doctor-dashboard/inbox"
    );
  }

  const {
    data:
      profile,
  } = await admin
    .from(
      "profiles"
    )
    .select(
      "role, account_status"
    )
    .eq(
      "id",
      user.id
    )
    .maybeSingle();

  if (
    !profile ||
    profile.role !==
      "doctor" ||
    profile.account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data:
      doctorData,
    error:
      doctorError,
  } = await admin
    .from(
      "doctors"
    )
    .select("id")
    .eq(
      "profile_id",
      user.id
    )
    .maybeSingle();

  if (
    doctorError ||
    !doctorData
  ) {
    redirect(
      "/doctor-dashboard"
    );
  }

  const doctor =
    doctorData as DoctorRow;

  const {
    data:
      appointmentData,
    error:
      appointmentError,
  } = await admin
    .from(
      "appointments"
    )
    .select(`
      id,
      patient_profile_id,
      patient_name,
      patient_email,
      patient_phone,
      requested_date,
      requested_time,
      scheduled_date,
      scheduled_time,
      reschedule_reason,
      notes,
      source,
      status,
      created_at,
      updated_at,
      clinics (
        slug,
        clinic_translations (
          locale,
          name
        )
      )
    `)
    .eq(
      "doctor_id",
      doctor.id
    )
    .order(
      "updated_at",
      {
        ascending:
          false,
      }
    )
    .limit(100);

  if (
    appointmentError
  ) {
    console.error(
      "Doctor inbox appointments query failed:",
      appointmentError
    );
  }

  const appointments =
    (appointmentData ??
      []) as unknown as
      AppointmentRow[];

  const appointmentIds =
    appointments.map(
      (item) =>
        item.id
    );

  let messages:
    MessageRow[] = [];

  let reads:
    ReadRow[] = [];

  if (
    appointmentIds.length >
    0
  ) {
    const [
      messageResult,
      readResult,
    ] =
      await Promise.all([
        admin
          .from(
            "appointment_messages"
          )
          .select(
            "id, appointment_id, sender_profile_id, body, created_at"
          )
          .in(
            "appointment_id",
            appointmentIds
          )
          .neq(
            "sender_profile_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
        admin
          .from(
            "appointment_message_reads"
          )
          .select(
            "appointment_id, last_read_at"
          )
          .eq(
            "profile_id",
            user.id
          )
          .in(
            "appointment_id",
            appointmentIds
          ),
      ]);

    if (
      messageResult.error
    ) {
      console.error(
        "Doctor inbox messages query failed:",
        messageResult.error
      );
    }

    if (
      readResult.error
    ) {
      console.error(
        "Doctor inbox read-state query failed:",
        readResult.error
      );
    }

    messages =
      (messageResult.data ??
        []) as MessageRow[];

    reads =
      (readResult.data ??
        []) as ReadRow[];
  }

  const appointmentById =
    new Map(
      appointments.map(
        (appointment) => [
          appointment.id,
          appointment,
        ]
      )
    );

  const readByAppointmentId =
    new Map(
      reads.map(
        (read) => [
          read.appointment_id,
          read.last_read_at,
        ]
      )
    );

  const latestMessageByAppointment =
    new Map<
      string,
      MessageRow
    >();

  for (
    const message of
    messages
  ) {
    if (
      !latestMessageByAppointment.has(
        message.appointment_id
      )
    ) {
      latestMessageByAppointment.set(
        message.appointment_id,
        message
      );
    }
  }

  const items:
    DoctorInboxItem[] = [];

  for (
    const appointment of
    appointments
  ) {
    const detail =
      appointmentDetail(
        appointment
      );

    if (
      appointment.status ===
      "pending"
    ) {
      items.push({
        id: `request-${appointment.id}`,
        type:
          "request",
        title: `Cerere nouă de la ${appointment.patient_name}`,
        description: `Programare solicitată pentru ${appointmentDateLabel(
          appointment
        )}.`,
        createdAt:
          appointment.created_at,
        unread: true,
        appointment:
          detail,
      });
    }

    if (
      [
        "rescheduled",
        "cancelled",
      ].includes(
        appointment.status
      )
    ) {
      items.push({
        id: `operational-${appointment.id}`,
        type:
          "operational",
        title:
          appointment.status ===
          "cancelled"
            ? `Programare anulată — ${appointment.patient_name}`
            : `Programare reprogramată — ${appointment.patient_name}`,
        description: `Actualizare pentru programarea din ${appointmentDateLabel(
          appointment
        )}.`,
        createdAt:
          appointment.updated_at,
        unread: false,
        appointment:
          detail,
      });
    }
  }

  for (
    const [
      appointmentId,
      message,
    ] of
    latestMessageByAppointment
  ) {
    const appointment =
      appointmentById.get(
        appointmentId
      );

    if (
      !appointment
    ) {
      continue;
    }

    const lastReadAt =
      readByAppointmentId.get(
        appointmentId
      );

    const unread =
      !lastReadAt ||
      new Date(
        message.created_at
      ).getTime() >
        new Date(
          lastReadAt
        ).getTime();

    items.push({
      id: `message-${message.id}`,
      type:
        "message",
      title: `Mesaj de la ${appointment.patient_name}`,
      description:
        message.body?.trim() ||
        "Mesaj cu atașament",
      createdAt:
        message.created_at,
      unread,
      appointment:
        appointmentDetail(
          appointment
        ),
    });
  }

  items.sort(
    (
      first,
      second
    ) =>
      new Date(
        second.createdAt
      ).getTime() -
      new Date(
        first.createdAt
      ).getTime()
  );

  const unreadCount =
    items.filter(
      (item) =>
        item.unread
    ).length;

  const pendingCount =
    items.filter(
      (item) =>
        item.type ===
        "request"
    ).length;

  const messageCount =
    items.filter(
      (item) =>
        item.type ===
        "message"
    ).length;

  return (
    <main>
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Panou medic
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Inbox
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Cereri noi, mesaje de la pacienți și actualizări operaționale într-un singur loc.
        </p>
      </header>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Necitite
          </p>

          <p className="mt-1 text-2xl font-bold text-gray-900">
            {
              unreadCount
            }
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
            Cereri noi
          </p>

          <p className="mt-1 text-2xl font-bold text-amber-950">
            {
              pendingCount
            }
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">
            Conversații
          </p>

          <p className="mt-1 text-2xl font-bold text-blue-950">
            {
              messageCount
            }
          </p>
        </div>
      </section>

      <section className="mt-6">
        <DoctorInboxList
          items={
            items
          }
        />
      </section>
    </main>
  );
}
