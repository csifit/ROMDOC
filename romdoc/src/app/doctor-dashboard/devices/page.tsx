import {
  redirect,
} from "next/navigation";

import DoctorLinkedDevicesManager from "@/components/doctor/doctor-linked-devices-manager";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function DoctorDevicesPage() {
  const locale =
    await getStoredAppLocale();

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  if (!user) {
    const query =
      new URLSearchParams({
        locale,
        next:
          "/doctor-dashboard/devices",
      });

    redirect(
      `/login?${query.toString()}`
    );
  }

  const [
    profileResult,
    doctorResult,
  ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "role, account_status"
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("doctors")
        .select("status")
        .eq(
          "profile_id",
          user.id
        )
        .maybeSingle(),
    ]);

  if (
    !profileResult.data ||
    !doctorResult.data ||
    profileResult.data.role !==
      "doctor" ||
    profileResult.data
      .account_status !==
      "active" ||
    doctorResult.data.status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <DoctorLinkedDevicesManager />
  );
}
