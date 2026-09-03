import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type TelehealthOwnerContext = {
  profileId: string;
  profileRole: string;
  doctorId: string;
  doctorAccountType: "independent" | "clinic_invited";
  organizationId: string | null;
  ownerType: "doctor" | "clinic_organization";
  ownerId: string;
};

export async function authorizeTelehealthOwner(targetDoctorId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      context: null,
      response: NextResponse.json({ error: "Authentication required." }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: ownedDoctor }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role, account_status")
      .eq("id", user.id)
      .maybeSingle(),
    admin
      .from("doctors")
      .select("id, account_type, clinic_organization_id, profile_id")
      .eq(targetDoctorId ? "id" : "profile_id", targetDoctorId ?? user.id)
      .maybeSingle(),
  ]);

  if (!profile || profile.account_status !== "active") {
    return {
      context: null,
      response: NextResponse.json({ error: "An active account is required." }, { status: 403 }),
    };
  }

  const doctor = ownedDoctor as
    | {
        id: string;
        account_type: string;
        clinic_organization_id: string | null;
        profile_id: string | null;
      }
    | null;

  if (!doctor || !["independent", "clinic_invited"].includes(doctor.account_type)) {
    return {
      context: null,
      response: NextResponse.json({ error: "Doctor account not found." }, { status: 404 }),
    };
  }

  if (profile.role === "doctor" && doctor.profile_id === user.id) {
    if (doctor.account_type === "clinic_invited") {
      return {
        context: null,
        response: NextResponse.json(
          { error: "The Clinic Organisation controls commercial telehealth settings for this account." },
          { status: 403 }
        ),
      };
    }

    return {
      context: {
        profileId: user.id,
        profileRole: profile.role,
        doctorId: doctor.id,
        doctorAccountType: "independent",
        organizationId: null,
        ownerType: "doctor",
        ownerId: doctor.id,
      } satisfies TelehealthOwnerContext,
      response: null,
    };
  }

  if (
    profile.role === "clinic_manager" &&
    doctor.account_type === "clinic_invited" &&
    doctor.clinic_organization_id
  ) {
    const { data: membership } = await admin
      .from("clinic_organization_members")
      .select("id")
      .eq("organization_id", doctor.clinic_organization_id)
      .eq("profile_id", user.id)
      .eq("status", "active")
      .in("member_role", ["owner", "billing_manager"])
      .maybeSingle();

    if (membership) {
      return {
        context: {
          profileId: user.id,
          profileRole: profile.role,
          doctorId: doctor.id,
          doctorAccountType: "clinic_invited",
          organizationId: doctor.clinic_organization_id,
          ownerType: "clinic_organization",
          ownerId: doctor.clinic_organization_id,
        } satisfies TelehealthOwnerContext,
        response: null,
      };
    }
  }

  return {
    context: null,
    response: NextResponse.json({ error: "Telehealth settings access denied." }, { status: 403 }),
  };
}

