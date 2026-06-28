import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export type StaffMedicalFolderAssignment = {
  doctorId: string;
  clinicId: string;
};

export type StaffMedicalFolderAuthorization = {
  userId: string;
  assignments:
    StaffMedicalFolderAssignment[];
};

export type StaffMedicalFolderAppointment = {
  id: string;
  doctor_id: string;
  clinic_id: string;
  patient_profile_id: string;
  patient_name: string;
  status: string;
  requested_date: string;
  scheduled_date: string | null;
};

type StaffAuthorizationResult =
  | {
      authorization:
        StaffMedicalFolderAuthorization;
      response: null;
    }
  | {
      authorization: null;
      response: NextResponse;
    };

export function isUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function requireActiveStaffMedicalFolderAccess():
  Promise<StaffAuthorizationResult> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
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
    profile?.role !== "staff" ||
    profile.account_status !==
      "active"
  ) {
    return {
      authorization: null,
      response:
        NextResponse.json(
          {
            error:
              "Doar personalul activ poate administra Dosarul medical.",
          },
          { status: 403 }
        ),
    };
  }

  const admin =
    createAdminClient();

  const {
    data: assignments,
    error: assignmentError,
  } = await admin
    .from("doctor_staff")
    .select(
      "doctor_id, clinic_id"
    )
    .eq(
      "staff_profile_id",
      user.id
    )
    .eq("status", "active");

  if (assignmentError) {
    return {
      authorization: null,
      response:
        NextResponse.json(
          {
            error:
              "Atribuirile personalului nu au putut fi verificate.",
          },
          { status: 500 }
        ),
    };
  }

  return {
    authorization: {
      userId: user.id,
      assignments:
        (assignments ?? []).map(
          (assignment) => ({
            doctorId:
              assignment.doctor_id,
            clinicId:
              assignment.clinic_id,
          })
        ),
    },
    response: null,
  };
}

export async function loadStaffMedicalFolderAppointment(
  appointmentId: string,
  authorization:
    StaffMedicalFolderAuthorization
): Promise<
  StaffMedicalFolderAppointment | null
> {
  const admin =
    createAdminClient();

  const {
    data: appointment,
    error,
  } = await admin
    .from("appointments")
    .select(`
      id,
      doctor_id,
      clinic_id,
      patient_profile_id,
      patient_name,
      status,
      requested_date,
      scheduled_date
    `)
    .eq("id", appointmentId)
    .maybeSingle();

  if (
    error ||
    !appointment ||
    !appointment.clinic_id ||
    !appointment.patient_profile_id ||
    ![
      "confirmed",
      "rescheduled",
      "completed",
    ].includes(
      appointment.status
    )
  ) {
    return null;
  }

  const allowed =
    authorization.assignments.some(
      (assignment) =>
        assignment.doctorId ===
          appointment.doctor_id &&
        assignment.clinicId ===
          appointment.clinic_id
    );

  if (!allowed) {
    return null;
  }

  return {
    id:
      appointment.id,
    doctor_id:
      appointment.doctor_id,
    clinic_id:
      appointment.clinic_id,
    patient_profile_id:
      appointment.patient_profile_id,
    patient_name:
      appointment.patient_name,
    status:
      appointment.status,
    requested_date:
      appointment.requested_date,
    scheduled_date:
      appointment.scheduled_date,
  };
}

export async function staffCanReadMedicalDocument(
  documentId: string,
  appointment:
    StaffMedicalFolderAppointment
): Promise<boolean> {
  const admin =
    createAdminClient();

  const {
    data: document,
    error,
  } = await admin
    .from(
      "patient_medical_documents"
    )
    .select(`
      id,
      patient_profile_id,
      uploaded_by_doctor_id
    `)
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();

  if (
    error ||
    !document ||
    document.patient_profile_id !==
      appointment.patient_profile_id
  ) {
    return false;
  }

  if (
    document.uploaded_by_doctor_id ===
    appointment.doctor_id
  ) {
    return true;
  }

  const {
    data: activeShare,
    error: shareError,
  } = await admin
    .from(
      "patient_medical_document_shares"
    )
    .select("id")
    .eq(
      "document_id",
      documentId
    )
    .eq(
      "doctor_id",
      appointment.doctor_id
    )
    .is("revoked_at", null)
    .or(
      `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
    )
    .limit(1)
    .maybeSingle();

  return (
    !shareError &&
    Boolean(activeShare)
  );
}
