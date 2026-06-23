import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type StaffAssignment = {
  id: string;
  doctor_id: string;
  clinic_id: string;
};

async function requireStaff() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (userError || !user) {
    return {
      assignments: [] as StaffAssignment[],
      response: NextResponse.json(
        { error: "Trebuie să fii autentificat." },
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
    profile?.role !== "staff" ||
    profile.account_status !== "active"
  ) {
    return {
      assignments: [] as StaffAssignment[],
      response: NextResponse.json(
        {
          error:
            "Doar personalul activ poate accesa programările.",
        },
        { status: 403 }
      ),
    };
  }

  const admin = createAdminClient();

  const {
    data: assignments,
    error: assignmentError,
  } = await admin
    .from("doctor_staff")
    .select("id, doctor_id, clinic_id")
    .eq("staff_profile_id", user.id)
    .eq("status", "active");

  if (assignmentError) {
    return {
      assignments: [] as StaffAssignment[],
      response: NextResponse.json(
        {
          error:
            "Atribuirile personalului nu au putut fi verificate.",
        },
        { status: 500 }
      ),
    };
  }

  return {
    assignments:
      (assignments ?? []) as StaffAssignment[],
    response: null,
  };
}

export async function GET() {
  const authorization =
    await requireStaff();

  if (authorization.response) {
    return authorization.response;
  }

  if (authorization.assignments.length === 0) {
    return NextResponse.json({
      appointments: [],
      assignments: [],
    });
  }

  const admin = createAdminClient();

  const results = await Promise.all(
    authorization.assignments.map(
      (assignment) =>
        admin
          .from("appointments")
          .select(`
            id,
            doctor_id,
            clinic_id,
            patient_name,
            patient_email,
            patient_phone,
            requested_date,
            requested_time,
            scheduled_date,
            scheduled_time,
            duration_minutes,
            status,
            notes,
            reschedule_reason,
            source,
            created_at,
            doctors (
              id,
              slug,
              doctor_translations (
                locale,
                title
              )
            ),
            clinics (
              id,
              slug,
              formatted_address,
              clinic_translations (
                locale,
                name
              )
            )
          `)
          .eq("doctor_id", assignment.doctor_id)
          .eq("clinic_id", assignment.clinic_id)
          .order("requested_date", {
            ascending: true,
          })
          .order("requested_time", {
            ascending: true,
          })
    )
  );

  const failed =
    results.find((result) => result.error);

  if (failed?.error) {
    console.error(
      "Staff appointment query failed:",
      failed.error
    );

    return NextResponse.json(
      {
        error:
          "Programările nu au putut fi încărcate.",
      },
      { status: 500 }
    );
  }

  const uniqueAppointments =
    new Map<string, unknown>();

  for (const result of results) {
    for (const appointment of result.data ?? []) {
      uniqueAppointments.set(
        appointment.id,
        appointment
      );
    }
  }

  return NextResponse.json({
    appointments:
      Array.from(uniqueAppointments.values()),
    assignments:
      authorization.assignments,
  });
}
