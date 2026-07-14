import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requireAdministratorCapability, requirePlatformOperatorAal2Api } from "@/lib/auth/require-platform-operator-aal2-api";
import { getLegalPageDefinition, isLegalLocale, isLegalPageKey } from "@/lib/legal/legal-pages";
import { sameOriginErrorResponse, validateSameOrigin } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const MAXIMUM_CONTENT_LENGTH = 100_000;

type Body = { pageKey?: unknown; locale?: unknown; content?: unknown };

export async function PATCH(request: NextRequest): Promise<Response> {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();
  const authorization = await requirePlatformOperatorAal2Api();
  if (authorization.response) return authorization.response;
  const administratorError = requireAdministratorCapability(authorization.role, "Doar administratorii pot modifica documentele legale.");
  if (administratorError) return administratorError;

  let body: Body;
  try { body = (await request.json()) as Body; }
  catch { return NextResponse.json({ error: "Cererea nu conține date JSON valide." }, { status: 400 }); }

  if (!isLegalPageKey(body.pageKey) || !isLegalLocale(body.locale)) return NextResponse.json({ error: "Documentul sau limba selectată nu este validă." }, { status: 400 });
  if (typeof body.content !== "string") return NextResponse.json({ error: "Textul documentului lipsește." }, { status: 400 });

  const content = body.content.trim();
  if (content.length < 20) return NextResponse.json({ error: "Textul documentului este prea scurt." }, { status: 400 });
  if (content.length > MAXIMUM_CONTENT_LENGTH) return NextResponse.json({ error: "Textul depășește limita de 100.000 de caractere." }, { status: 413 });

  const definition = getLegalPageDefinition(body.pageKey, body.locale);
  const updatedAt = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin.from("legal_pages").upsert({
    page_key: body.pageKey,
    locale: body.locale,
    title: definition.title,
    content,
    is_published: true,
    updated_at: updatedAt,
    updated_by_profile_id: authorization.profileId,
  }, { onConflict: "page_key,locale" }).select("page_key, locale, content, updated_at").single();

  if (error || !data) {
    console.error("Localized legal page update failed:", error);
    return NextResponse.json({ error: "Documentul legal nu a putut fi salvat." }, { status: 500 });
  }

  revalidatePath(definition.route);
  revalidatePath(`/${body.locale}${definition.route}`);
  revalidatePath("/admin/privacy");

  return NextResponse.json({
    message: "Traducerea documentului legal a fost actualizată.",
    page: { key: body.pageKey, locale: body.locale, content: data.content, updatedAt: data.updated_at },
  }, { headers: { "Cache-Control": "no-store" } });
}
