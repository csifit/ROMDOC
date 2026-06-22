import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SpecialtyRequestBody = {
  specialtyIds?: unknown;
};

function normalizeSpecialtyIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            item
          )
      )
    )
  );
}

async function requireActiveDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
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
    profile?.role !== "doctor" ||
    profile.account_status !== "active"
  ) {
    return {
      supabase,
      response: NextResponse.json(
        {
          error:
            "Doar medicii cu un cont activ își pot modifica specialitățile.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    supabase,
    response: null,
  };
}

export async function PATCH(request: Request): Promise<Response> {
  const authorization = await requireActiveDoctor();

  if (authorization.response) {
    return authorization.response;
  }

  let body: SpecialtyRequestBody;

  try {
    body = (await request.json()) as SpecialtyRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Datele trimise nu sunt valide." },
      { status: 400 }
    );
  }

  const specialtyIds = normalizeSpecialtyIds(body.specialtyIds);

  if (specialtyIds.length === 0) {
    return NextResponse.json(
      { error: "Selectează cel puțin o specialitate." },
      { status: 400 }
    );
  }

  if (specialtyIds.length > 5) {
    return NextResponse.json(
      { error: "Poți selecta cel mult cinci specialități." },
      { status: 400 }
    );
  }

  const {
    data,
    error,
  } = await authorization.supabase.rpc(
    "set_own_doctor_specialties",
    {
      requested_specialty_ids: specialtyIds,
    }
  );

  if (error) {
    console.error("Doctor specialty update failed:", error);

    const message = error.message ?? "";

    if (
      message.includes("at_least_one") ||
      message.includes("maximum_five") ||
      message.includes("invalid_or_inactive") ||
      error.code === "23514" ||
      error.code === "22023"
    ) {
      return NextResponse.json(
        {
          error:
            "Selecția conține o specialitate invalidă sau inactivă.",
        },
        { status: 400 }
      );
    }

    if (error.code === "42501") {
      return NextResponse.json(
        {
          error:
            "Nu ai permisiunea de a modifica aceste specialități.",
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Specialitățile nu au putut fi salvate." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    specialtyIds: Array.isArray(data)
      ? data.map((item) => item.specialty_id)
      : specialtyIds,
  });
}
