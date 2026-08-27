import {
  createHash,
} from "crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

function safeToken(
  value: string | null
) {
  const token =
    value?.trim() ??
    "";

  return /^[A-Za-z0-9_-]{20,200}$/.test(
    token
  )
    ? token
    : "";
}

export async function GET(
  request: NextRequest
) {
  const url =
    new URL(
      request.url
    );

  const locale =
    normalizeAppLocale(
      url.searchParams.get(
        "locale"
      )
    );

  const token =
    safeToken(
      url.searchParams.get(
        "token"
      )
    );

  const patientDashboardUrl =
    new URL(
      "/patient-dashboard",
      url.origin
    );

  if (
    !token
  ) {
    patientDashboardUrl
      .searchParams
      .set(
        "patientInvite",
        "invalid"
      );

    return NextResponse.redirect(
      patientDashboardUrl
    );
  }

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
    error:
      userError,
  } =
    await supabase.auth
      .getUser();

  if (
    userError ||
    !user
  ) {
    const nextPath =
      `/auth/patient-invite-claim?token=${encodeURIComponent(
        token
      )}&locale=${locale}`;

    const loginUrl =
      new URL(
        "/login",
        url.origin
      );

    loginUrl.searchParams.set(
      "locale",
      locale
    );

    loginUrl.searchParams.set(
      "next",
      nextPath
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  if (
    !user.email_confirmed_at
  ) {
    const nextPath =
      `/auth/patient-invite-claim?token=${encodeURIComponent(
        token
      )}&locale=${locale}`;

    const checkEmailUrl =
      new URL(
        "/check-email",
        url.origin
      );

    checkEmailUrl.searchParams.set(
      "locale",
      locale
    );

    checkEmailUrl.searchParams.set(
      "type",
      "patient"
    );

    checkEmailUrl.searchParams.set(
      "next",
      nextPath
    );

    if (
      user.email
    ) {
      checkEmailUrl.searchParams.set(
        "email",
        user.email
      );
    }

    return NextResponse.redirect(
      checkEmailUrl
    );
  }

  const {
    data:
      profile,
    error:
      profileError,
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
    profileError ||
    profile?.role !==
      "patient" ||
    profile.account_status !==
      "active"
  ) {
    patientDashboardUrl
      .searchParams
      .set(
        "patientInvite",
        "wrong_account"
      );

    return NextResponse.redirect(
      patientDashboardUrl
    );
  }

  const tokenHash =
    createHash(
      "sha256"
    )
      .update(
        token
      )
      .digest(
        "hex"
      );

  const {
    error:
      claimError,
  } =
    await supabase
      .rpc(
        "claim_doctor_patient_invite",
        {
          target_token_hash:
            tokenHash,
        }
      );

  if (
    claimError
  ) {
    console.error(
      "Patient CRM invite claim failed:",
      claimError
    );

    patientDashboardUrl
      .searchParams
      .set(
        "patientInvite",
        "failed"
      );

    return NextResponse.redirect(
      patientDashboardUrl
    );
  }

  // Reuse the existing verified-email appointment claim so
  // pre-account appointments become associated with the same
  // Patient profile as well.
  const {
    error:
      appointmentClaimError,
  } =
    await supabase
      .rpc(
        "claim_patient_appointments_by_email"
      );

  if (
    appointmentClaimError
  ) {
    console.error(
      "Patient appointment email claim after CRM invite failed:",
      appointmentClaimError
    );
  }

  patientDashboardUrl
    .searchParams
    .set(
      "patientInvite",
      "linked"
    );

  return NextResponse.redirect(
    patientDashboardUrl
  );
}
