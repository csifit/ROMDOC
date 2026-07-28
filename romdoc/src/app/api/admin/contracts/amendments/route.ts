import { NextRequest } from "next/server";

import {
  contractApiError,
  contractApiSuccess,
  errorMessage,
  requireAdminContractApi,
} from "@/lib/contracts/admin-contract-auth";
import { validateAdminContractCommercialTerms } from "@/lib/contracts/admin-contract-commercial-terms";
import { notifyContractAssignments } from "@/lib/contracts/admin-contract-notifications";
import { sanitizeAdminContractHtml } from "@/lib/contracts/admin-contract-html";

export const runtime = "nodejs";

function text(value: unknown, maximum = 500_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function uuid(value: unknown) {
  const candidate = text(value, 100);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    candidate
  )
    ? candidate
    : null;
}

function uuidArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map(uuid).filter((item): item is string => Boolean(item)))
  ).slice(0, 500);
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

export async function POST(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;

  let input: Record<string, unknown>;
  try {
    input = (await request.json()) as Record<string, unknown>;
  } catch {
    return contractApiError("Datele trimise nu sunt valide.", 400);
  }

  const sourceDocumentId = uuid(input.sourceDocumentId);
  const sourcePackageId = uuid(input.sourcePackageId);
  const clientIds = uuidArray(input.clientIds);
  const documentTitle = text(input.documentTitle, 250);
  const documentVersion = text(input.documentVersion, 32);
  const packageTitle = text(input.packageTitle, 250);
  const packageVersion = text(input.packageVersion, 32);
  const contentHtml = sanitizeAdminContractHtml(input.contentHtml);
  const documentEffectiveAt = timestamp(input.documentEffectiveAt);
  const packageEffectiveAt = timestamp(input.packageEffectiveAt);
  const requiresAcceptance = input.requiresAcceptance !== false;

  if (!sourceDocumentId || !sourcePackageId || clientIds.length === 0) {
    return contractApiError(
      "Selectați pachetul, documentul sursă și cel puțin un client.",
      400
    );
  }
  if (
    documentTitle.length < 2 ||
    packageTitle.length < 2 ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(documentVersion) ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(packageVersion)
  ) {
    return contractApiError("Titlurile sau versiunile noi nu sunt valide.", 400);
  }
  if (!contentHtml) {
    return contractApiError("Conținutul noii versiuni este obligatoriu.", 400);
  }
  if (documentEffectiveAt === undefined || packageEffectiveAt === undefined) {
    return contractApiError("Data intrării în vigoare nu este validă.", 400);
  }

  const commercialTerms =
    validateAdminContractCommercialTerms(
      input.commercialTerms
    );

  if (commercialTerms.error) {
    return contractApiError(
      commercialTerms.error,
      400
    );
  }

  try {
    const { data, error } = await access.admin.rpc(
      "admin_create_contract_amendment_batch",
      {
        target_admin_profile_id: access.profileId,
        target_source_document_id: sourceDocumentId,
        target_source_package_id: sourcePackageId,
        target_document_title: documentTitle,
        target_document_version: documentVersion,
        target_document_content_html: contentHtml,
        target_document_issue_date:
          date(input.documentIssueDate) ?? new Date().toISOString().slice(0, 10),
        target_document_effective_at: documentEffectiveAt,
        target_package_title: packageTitle,
        target_package_version: packageVersion,
        target_package_effective_at: packageEffectiveAt,
        target_requires_acceptance: requiresAcceptance,
        target_client_ids: clientIds,
        target_commercial_terms: commercialTerms.value,
        target_keep_existing_terms: input.keepExistingTerms !== false,
        target_internal_notes: text(input.internalNotes, 5000) || null,
      }
    );

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const assignmentIds = Array.isArray(row?.assignment_ids)
      ? row.assignment_ids.filter(
          (value: unknown): value is string => typeof value === "string"
        )
      : [];

    const notifications = await notifyContractAssignments({
      admin: access.admin,
      adminProfileId: access.profileId,
      assignmentIds,
    });

    const warningCount = notifications.reduce(
      (total, item) => total + item.failed + item.warnings.length,
      0
    );

    return contractApiSuccess(
      warningCount > 0
        ? "Noua versiune și atribuirile au fost create. Unele notificări necesită reîncercare."
        : "Noua versiune a fost publicată, atribuită și notificată.",
      {
        documentId:
          row && typeof row.document_id === "string" ? row.document_id : null,
        packageId:
          row && typeof row.package_id === "string" ? row.package_id : null,
        assignmentIds,
        notifications,
      },
      201
    );
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}
