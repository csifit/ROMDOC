import { NextRequest } from "next/server";

import {
  contractApiError,
  contractApiSuccess,
  errorMessage,
  requireAdminContractApi,
} from "@/lib/contracts/admin-contract-auth";
import { sanitizeAdminContractHtml } from "@/lib/contracts/admin-contract-html";

export const runtime = "nodejs";

const DOCUMENT_TYPES = new Set([
  "doctor_contract",
  "clinic_contract",
  "pricing_annex",
  "consolidated_billing_annex",
  "data_processing_annex",
  "security_annex",
  "operational_annex",
  "individual_amendment",
  "other_annex",
]);
const AUDIENCES = new Set(["doctor", "clinic_organization", "shared"]);
const LOCALES = new Set(["ro", "en", "de"]);

function text(value: unknown, maximum = 10000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function bool(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function uuid(value: unknown) {
  const candidate = text(value, 100);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate
  )
    ? candidate
    : null;
}

function date(value: unknown) {
  const candidate = text(value, 20);
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
}

function timestamp(value: unknown) {
  const candidate = text(value, 100);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function jsonBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function validateCommon(body: Record<string, unknown>) {
  const documentKey = text(body.documentKey, 120);
  const documentType = text(body.documentType, 80);
  const audience = text(body.audience, 80);
  const locale = text(body.locale, 10);
  const title = text(body.title, 250);
  const version = text(body.version, 32);
  const contentHtml = sanitizeAdminContractHtml(body.contentHtml);
  const issueDate = date(body.issueDate) ?? new Date().toISOString().slice(0, 10);
  const effectiveAt = timestamp(body.effectiveAt);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(documentKey)) {
    return { error: "Cheia documentului trebuie să folosească litere mici, cifre și cratime." } as const;
  }
  if (!DOCUMENT_TYPES.has(documentType)) {
    return { error: "Tipul documentului nu este valid." } as const;
  }
  if (!AUDIENCES.has(audience)) {
    return { error: "Audiența documentului nu este validă." } as const;
  }
  if (!LOCALES.has(locale)) {
    return { error: "Limba documentului nu este validă." } as const;
  }
  if (title.length < 2 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(version)) {
    return { error: "Titlul sau versiunea documentului nu este validă." } as const;
  }
  if (!contentHtml) {
    return { error: "Conținutul documentului este obligatoriu." } as const;
  }
  if (effectiveAt === undefined) {
    return { error: "Data intrării în vigoare nu este validă." } as const;
  }

  return {
    value: {
      document_key: documentKey,
      document_type: documentType,
      audience,
      locale,
      title,
      version,
      content_html: contentHtml,
      requires_acceptance: bool(body.requiresAcceptance, true),
      unilateral_notice_allowed: bool(body.unilateralNoticeAllowed, false),
      issue_date: issueDate,
      effective_at: effectiveAt,
      metadata: {},
    },
  } as const;
}

export async function POST(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;

  const body = await jsonBody(request);
  if (!body) return contractApiError("Datele trimise nu sunt valide.", 400);
  const action = text(body.action, 30) || "create";

  try {
    if (action === "clone") {
      const sourceDocumentId = uuid(body.sourceDocumentId);
      const version = text(body.version, 32);
      const title = text(body.title, 250);

      if (!sourceDocumentId || !version || title.length < 2) {
        return contractApiError("Documentul sursă, titlul și versiunea sunt obligatorii.", 400);
      }

      const { data: source, error: sourceError } = await access.admin
        .from("contract_documents")
        .select(
          "document_key, document_type, audience, locale, content_html, metadata, requires_acceptance, unilateral_notice_allowed"
        )
        .eq("id", sourceDocumentId)
        .eq("status", "published")
        .maybeSingle();

      if (sourceError) throw sourceError;
      if (!source) return contractApiError("Documentul publicat sursă nu a fost găsit.", 404);

      const { data, error } = await access.admin
        .from("contract_documents")
        .insert({
          ...source,
          title,
          version,
          status: "draft",
          issue_date: date(body.issueDate) ?? new Date().toISOString().slice(0, 10),
          effective_at: timestamp(body.effectiveAt) ?? null,
          supersedes_document_id: sourceDocumentId,
          created_by_profile_id: access.profileId,
        })
        .select("id")
        .single();

      if (error) throw error;
      return contractApiSuccess("Noua versiune a fost creată ca draft.", { documentId: data.id }, 201);
    }

    const validated = validateCommon(body);
    if ("error" in validated) {
      return contractApiError(
        validated.error ?? "Datele contractuale nu sunt valide.",
        400
      );
    }

    const { data, error } = await access.admin
      .from("contract_documents")
      .insert({
        ...validated.value,
        status: "draft",
        created_by_profile_id: access.profileId,
      })
      .select("id")
      .single();

    if (error) throw error;
    return contractApiSuccess("Draftul documentului a fost creat.", { documentId: data.id }, 201);
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;

  const body = await jsonBody(request);
  if (!body) return contractApiError("Datele trimise nu sunt valide.", 400);
  const documentId = uuid(body.documentId);
  const action = text(body.action, 30) || "save";

  if (!documentId) return contractApiError("Documentul nu este valid.", 400);

  try {
    if (action === "publish") {
      const { data, error } = await access.admin
        .from("contract_documents")
        .update({
          status: "published",
          published_by_profile_id: access.profileId,
        })
        .eq("id", documentId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return contractApiError("Numai un draft poate fi publicat.", 409);
      return contractApiSuccess("Documentul a fost publicat și a devenit imuabil.");
    }

    const validated = validateCommon(body);
    if ("error" in validated) {
      return contractApiError(
        validated.error ?? "Datele contractuale nu sunt valide.",
        400
      );
    }

    const { document_key, audience, locale, ...editable } = validated.value;
    void document_key;
    void audience;
    void locale;

    const { data, error } = await access.admin
      .from("contract_documents")
      .update(editable)
      .eq("id", documentId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return contractApiError("Numai un draft poate fi modificat.", 409);
    return contractApiSuccess("Draftul documentului a fost salvat.");
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;

  const body = await jsonBody(request);
  const documentId = body ? uuid(body.documentId) : null;
  if (!documentId) return contractApiError("Documentul nu este valid.", 400);

  try {
    const { data, error } = await access.admin
      .from("contract_documents")
      .delete()
      .eq("id", documentId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return contractApiError("Numai un draft neutilizat poate fi șters.", 409);
    return contractApiSuccess("Draftul documentului a fost șters.");
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}
