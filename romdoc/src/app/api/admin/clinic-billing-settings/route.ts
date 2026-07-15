import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";
import {
  createClient,
} from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic =
  "force-dynamic";

type UpdateBody = {
  clinicDoctorMonthlyPriceRon?:
    unknown;
  smsUnitPriceRon?: unknown;
  vatPercent?: unknown;
};

function parseNonNegativeNumber(
  value: unknown
) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(value);

  return Number.isFinite(parsed) &&
    parsed >= 0
    ? parsed
    : null;
}

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}

export async function PUT(
  request: NextRequest
): Promise<Response> {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } =
    await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return json(
      {
        error:
          "Trebuie să fii autentificat.",
      },
      401
    );
  }

  const admin =
    createAdminClient();

  const {
    data: profile,
    error: profileError,
  } = await admin
    .from("profiles")
    .select(
      "role, account_status"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "admin" ||
    profile.account_status !==
      "active"
  ) {
    return json(
      {
        error:
          "Nu ai permisiunea necesară.",
      },
      403
    );
  }

  let body: UpdateBody;

  try {
    body =
      (await request
        .json()) as
        UpdateBody;
  } catch {
    return json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const doctorPrice =
    parseNonNegativeNumber(
      body.clinicDoctorMonthlyPriceRon
    );

  const smsPrice =
    parseNonNegativeNumber(
      body.smsUnitPriceRon
    );

  const vatPercent =
    parseNonNegativeNumber(
      body.vatPercent
    );

  if (doctorPrice === null) {
    return json(
      {
        error:
          "Prețul abonamentului medicului este invalid.",
      },
      400
    );
  }

  if (smsPrice === null) {
    return json(
      {
        error:
          "Prețul SMS este invalid.",
      },
      400
    );
  }

  if (
    vatPercent === null ||
    vatPercent > 100
  ) {
    return json(
      {
        error:
          "TVA trebuie să fie între 0% și 100%.",
      },
      400
    );
  }

  const now =
    new Date().toISOString();

  const {
    data: settings,
    error: updateError,
  } = await admin
    .from(
      "clinic_billing_settings"
    )
    .upsert(
      {
        id: 1,

        clinic_doctor_monthly_price_ron:
          Number(
            doctorPrice.toFixed(4)
          ),

        sms_unit_price_ron:
          Number(
            smsPrice.toFixed(4)
          ),

        vat_rate:
          Number(
            (
              vatPercent / 100
            ).toFixed(6)
          ),

        updated_at: now,

        updated_by_profile_id:
          user.id,
      },
      {
        onConflict: "id",
      }
    )
    .select(`
      clinic_doctor_monthly_price_ron,
      sms_unit_price_ron,
      vat_rate,
      updated_at
    `)
    .maybeSingle();

  if (
    updateError ||
    !settings
  ) {
    console.error(
      "Admin clinic billing settings update failed:",
      updateError
    );

    return json(
      {
        error:
          "Tarifele nu au putut fi salvate.",
      },
      500
    );
  }

  return json({
    settings,
    message:
      "Tarifele clinicii au fost actualizate.",
  });
}
