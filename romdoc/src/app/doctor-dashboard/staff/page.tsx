import {
  redirect,
} from "next/navigation";

import DoctorStaffManager from "@/components/doctor/doctor-staff-manager";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

export default async function DoctorStaffPage() {
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
          "/doctor-dashboard/staff",
      });

    redirect(
      `/login?${query.toString()}`
    );
  }

  const {
    data:
      profile,
  } =
    await supabase
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
    profile
      .account_status !==
      "active"
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <DoctorStaffManager />
  );
}
