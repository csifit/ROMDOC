import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createClient } from "@/lib/supabase/server";
import { isSpokenLanguageCode } from "@/lib/telehealth/constants";

export async function PUT(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();
  const body = (await request.json().catch(() => null)) as { languages?: unknown } | null;
  const languages = Array.isArray(body?.languages)
    ? Array.from(new Set(body.languages.filter((value): value is string => typeof value === "string" && isSpokenLanguageCode(value))))
    : [];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const [{ data: profile }, { data: doctor }] = await Promise.all([
    supabase.from("profiles").select("role, account_status").eq("id", user.id).maybeSingle(),
    supabase.from("doctors").select("id").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profile || profile.role !== "doctor" || profile.account_status !== "active") return NextResponse.json({ error: "An active Doctor account is required." }, { status: 403 });
  if (!doctor) return NextResponse.json({ error: "Doctor account not found." }, { status: 404 });

  const { data: currentRows, error: currentError } = await supabase.from("doctor_spoken_languages").select("language_code").eq("doctor_id", doctor.id);
  if (currentError) return NextResponse.json({ error: "Languages could not be updated." }, { status: 500 });
  const current = new Set((currentRows ?? []).map((row) => row.language_code));
  const toInsert = languages.filter((languageCode) => !current.has(languageCode));
  const toDelete = Array.from(current).filter((languageCode) => !languages.includes(languageCode));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("doctor_spoken_languages")
      .insert(toInsert.map((languageCode) => ({ doctor_id: doctor.id, language_code: languageCode })));
    if (insertError) return NextResponse.json({ error: "Languages could not be updated." }, { status: 500 });
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase.from("doctor_spoken_languages").delete().eq("doctor_id", doctor.id).in("language_code", toDelete);
    if (deleteError) return NextResponse.json({ error: "Languages could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ success: true, languages });
}
