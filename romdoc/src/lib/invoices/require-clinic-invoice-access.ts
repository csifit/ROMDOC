import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { type ClinicInvoiceActor } from "@/lib/invoices/clinic-invoices";

export type ClinicInvoiceAccessResult =
  | { ok: true; actor: ClinicInvoiceActor }
  | {
      ok: false;
      status: 401 | 403;
      code:
        | "authentication_required"
        | "account_inactive"
        | "invoice_access_denied";
    };

export async function requireClinicInvoiceAccess(): Promise<ClinicInvoiceAccessResult> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      code: "authentication_required",
    };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.account_status !== "active"
  ) {
    return {
      ok: false,
      status: 403,
      code: "account_inactive",
    };
  }

  if (profile.role === "admin") {
    return {
      ok: true,
      actor: {
        profileId: profile.id,
        role: "admin",
      },
    };
  }

  if (profile.role !== "manager") {
    return {
      ok: false,
      status: 403,
      code: "invoice_access_denied",
    };
  }

  const { data: permission, error: permissionError } = await admin
    .from("manager_permissions")
    .select("profile_id")
    .eq("profile_id", profile.id)
    .eq("permission_key", "accounting")
    .is("revoked_at", null)
    .maybeSingle();

  if (permissionError || !permission) {
    return {
      ok: false,
      status: 403,
      code: "invoice_access_denied",
    };
  }

  return {
    ok: true,
    actor: {
      profileId: profile.id,
      role: "manager",
    },
  };
}
