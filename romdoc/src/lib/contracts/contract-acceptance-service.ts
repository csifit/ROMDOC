import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppLocale } from "@/lib/i18n/app-locale";
import type { ContractClientType } from "@/lib/contracts/contract-acceptance-copy";
import {
  generateAcceptedContractPdf,
  sha256Buffer,
  type AcceptedDocumentSnapshot,
} from "@/lib/contracts/generate-accepted-contract-pdf";
import { sendContractAcceptanceEmail } from "@/lib/contracts/send-contract-acceptance-email";

export type ExecuteContractAcceptanceInput = {
  admin: SupabaseClient;
  assignmentId: string;
  acceptedByProfileId: string;
  representedEntityName: string;
  representativeName: string;
  representativeCapacity: string;
  representedEntitySnapshot: Record<string, unknown>;
  checkboxText: string;
  ipAddress: string | null;
  userAgent: string | null;
  recipientEmail: string;
  recipientName: string;
  clientType: ContractClientType;
};

export type ExecuteContractAcceptanceResult = {
  acceptanceId: string;
  pdfStatus: "ready" | "failed";
  pdfFileName: string | null;
  emailStatus: "sent" | "already_sent" | "pending" | "failed";
  warnings: string[];
};

type AcceptanceRow = {
  id: string;
  assignment_id: string;
  represented_entity_name: string;
  representative_name: string;
  representative_capacity: string;
  accepted_locale: AppLocale;
  checkbox_text: string;
  package_version: string;
  package_manifest_hash: string;
  document_manifest: unknown;
  commercial_terms_snapshot: unknown;
  payment_deadline_days: number;
  acceptance_evidence_hash: string;
  accepted_at: string;
};

type AssignmentRow = {
  id: string;
  package_id: string;
  client_type: ContractClientType;
};

type PackageRow = {
  id: string;
  title: string;
  version: string;
};

type ArtifactRow = {
  id: string;
  acceptance_id: string;
  status: "pending" | "ready" | "failed";
  storage_bucket: string;
  storage_path: string;
  file_name: string;
  file_size_bytes: number | null;
  checksum_sha256: string | null;
  failure_reason: string | null;
};

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function booleanValue(value: unknown) {
  return value === true;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeLocale(value: unknown): AppLocale {
  return value === "en" || value === "de" ? value : "ro";
}

function normalizeDocumentManifest(value: unknown): AcceptedDocumentSnapshot[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): AcceptedDocumentSnapshot | null => {
      const source = objectValue(item);
      const id = stringValue(source.documentId);
      const title = stringValue(source.title);
      const contentHtml = stringValue(source.contentHtml);
      const contentHash = stringValue(source.contentHash);

      if (!id || !title || !contentHtml || !contentHash) return null;

      return {
        displayOrder: numberValue(source.displayOrder),
        sectionLabel: source.sectionLabel
          ? stringValue(source.sectionLabel)
          : null,
        documentId: id,
        documentKey: stringValue(source.documentKey),
        documentType: stringValue(source.documentType, "other_annex"),
        title,
        version: stringValue(source.version, "1.0"),
        contentHash,
        contentHtml,
        issueDate: source.issueDate ? stringValue(source.issueDate) : null,
        effectiveAt: source.effectiveAt
          ? stringValue(source.effectiveAt)
          : null,
        requiresAcceptance: booleanValue(source.requiresAcceptance),
      };
    })
    .filter(
      (item): item is AcceptedDocumentSnapshot => item !== null
    );
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1900);

  if (typeof error === "object" && error !== null) {
    const candidate = error as { message?: unknown };
    if (typeof candidate.message === "string") {
      return candidate.message.slice(0, 1900);
    }
  }

  return String(error).slice(0, 1900);
}

function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL;

  if (configured?.trim()) {
    return configured.trim().replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "https://www.romdoc.fit";
}

async function loadAcceptanceContext(
  admin: SupabaseClient,
  acceptanceId: string
) {
  const { data: acceptanceData, error: acceptanceError } = await admin
    .from("contract_acceptances")
    .select(`
      id,
      assignment_id,
      represented_entity_name,
      representative_name,
      representative_capacity,
      accepted_locale,
      checkbox_text,
      package_version,
      package_manifest_hash,
      document_manifest,
      commercial_terms_snapshot,
      payment_deadline_days,
      acceptance_evidence_hash,
      accepted_at
    `)
    .eq("id", acceptanceId)
    .single();

  if (acceptanceError) throw acceptanceError;

  const acceptance = acceptanceData as unknown as AcceptanceRow;

  const { data: assignmentData, error: assignmentError } = await admin
    .from("client_contract_assignments")
    .select("id, package_id, client_type")
    .eq("id", acceptance.assignment_id)
    .single();

  if (assignmentError) throw assignmentError;

  const assignment = assignmentData as unknown as AssignmentRow;

  const { data: packageData, error: packageError } = await admin
    .from("contract_packages")
    .select("id, title, version")
    .eq("id", assignment.package_id)
    .single();

  if (packageError) throw packageError;

  const contractPackage = packageData as unknown as PackageRow;

  const { data: artifactData, error: artifactError } = await admin
    .from("contract_acceptance_artifacts")
    .select(`
      id,
      acceptance_id,
      status,
      storage_bucket,
      storage_path,
      file_name,
      file_size_bytes,
      checksum_sha256,
      failure_reason
    `)
    .eq("acceptance_id", acceptance.id)
    .single();

  if (artifactError) throw artifactError;

  return {
    acceptance,
    assignment,
    contractPackage,
    artifact: artifactData as unknown as ArtifactRow,
  };
}

async function downloadArtifactBuffer(
  admin: SupabaseClient,
  artifact: ArtifactRow
) {
  const { data, error } = await admin.storage
    .from(artifact.storage_bucket)
    .download(artifact.storage_path);

  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

async function ensureAcceptedPdf(
  admin: SupabaseClient,
  context: Awaited<ReturnType<typeof loadAcceptanceContext>>
) {
  const { acceptance, artifact, contractPackage } = context;

  if (artifact.status === "ready") {
    return {
      status: "ready" as const,
      fileName: artifact.file_name,
      buffer: await downloadArtifactBuffer(admin, artifact),
      warning: null,
    };
  }

  if (artifact.status === "failed") {
    const { error: resetError } = await admin
      .from("contract_acceptance_artifacts")
      .update({
        status: "pending",
        file_size_bytes: null,
        checksum_sha256: null,
        generated_at: null,
        failure_reason: null,
      })
      .eq("id", artifact.id);

    if (resetError) throw resetError;
  }

  try {
    const documents = normalizeDocumentManifest(
      acceptance.document_manifest
    );

    if (documents.length === 0) {
      throw new Error(
        "The acceptance does not contain document HTML snapshots. Run migration 95 before accepting contracts."
      );
    }

    const buffer = await generateAcceptedContractPdf({
      locale: normalizeLocale(acceptance.accepted_locale),
      packageTitle: contractPackage.title,
      packageVersion: acceptance.package_version,
      representedEntityName: acceptance.represented_entity_name,
      representativeName: acceptance.representative_name,
      representativeCapacity: acceptance.representative_capacity,
      acceptedAt: acceptance.accepted_at,
      paymentDeadlineDays: acceptance.payment_deadline_days,
      acceptanceEvidenceHash: acceptance.acceptance_evidence_hash,
      packageManifestHash: acceptance.package_manifest_hash,
      checkboxText: acceptance.checkbox_text,
      commercialTerms: objectValue(
        acceptance.commercial_terms_snapshot
      ),
      documents,
    });

    const checksum = sha256Buffer(buffer);

    const { error: uploadError } = await admin.storage
      .from(artifact.storage_bucket)
      .upload(artifact.storage_path, buffer, {
        contentType: "application/pdf",
        cacheControl: "0",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: readyError } = await admin
      .from("contract_acceptance_artifacts")
      .update({
        status: "ready",
        file_size_bytes: buffer.byteLength,
        checksum_sha256: checksum,
        generated_at: new Date().toISOString(),
        failure_reason: null,
      })
      .eq("id", artifact.id);

    if (readyError) throw readyError;

    return {
      status: "ready" as const,
      fileName: artifact.file_name,
      buffer,
      warning: null,
    };
  } catch (error) {
    const message = safeErrorMessage(error);

    await admin
      .from("contract_acceptance_artifacts")
      .update({
        status: "failed",
        file_size_bytes: null,
        checksum_sha256: null,
        generated_at: null,
        failure_reason: message,
      })
      .eq("id", artifact.id);

    return {
      status: "failed" as const,
      fileName: null,
      buffer: null,
      warning: message,
    };
  }
}

async function sendConfirmation(
  admin: SupabaseClient,
  context: Awaited<ReturnType<typeof loadAcceptanceContext>>,
  input: ExecuteContractAcceptanceInput,
  pdf: Awaited<ReturnType<typeof ensureAcceptedPdf>>
) {
  const { data: claimData, error: claimError } = await admin.rpc(
    "claim_contract_confirmation_email_delivery",
    {
      target_acceptance_id: context.acceptance.id,
      target_recipient_email: input.recipientEmail,
    }
  );

  if (claimError) {
    return {
      status: "failed" as const,
      warning: safeErrorMessage(claimError),
    };
  }

  const claim = Array.isArray(claimData)
    ? (claimData[0] as
        | { delivery_id?: unknown; should_send?: unknown }
        | undefined)
    : (claimData as
        | { delivery_id?: unknown; should_send?: unknown }
        | null);

  const deliveryId =
    typeof claim?.delivery_id === "string"
      ? claim.delivery_id
      : null;
  const shouldSend = claim?.should_send === true;

  if (!deliveryId) {
    return {
      status: "failed" as const,
      warning: "Confirmation email delivery claim returned no delivery id.",
    };
  }

  if (!shouldSend) {
    const { data: delivery } = await admin
      .from("contract_confirmation_email_deliveries")
      .select("status")
      .eq("id", deliveryId)
      .maybeSingle();

    return {
      status:
        delivery?.status === "sent"
          ? ("already_sent" as const)
          : ("pending" as const),
      warning: null,
    };
  }

  const pagePath =
    input.clientType === "independent_doctor"
      ? "/doctor-dashboard/contract"
      : "/clinic-manager-dashboard/contract";

  const result = await sendContractAcceptanceEmail({
    locale: normalizeLocale(context.acceptance.accepted_locale),
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    representedEntityName:
      context.acceptance.represented_entity_name,
    packageTitle: context.contractPackage.title,
    packageVersion: context.acceptance.package_version,
    acceptedAt: context.acceptance.accepted_at,
    paymentDeadlineDays:
      context.acceptance.payment_deadline_days,
    contractPageUrl: `${getSiteUrl()}${pagePath}`,
    pdfFileName: pdf.fileName,
    pdfBuffer: pdf.buffer,
  });

  const sent = result.sent && Boolean(result.providerMessageId);
  const errorMessage =
    result.errorMessage ??
    (sent ? null : "The confirmation email provider returned no message id.");

  await admin.rpc("complete_contract_confirmation_email_delivery", {
    target_delivery_id: deliveryId,
    target_sent: sent,
    target_provider_message_id: sent
      ? result.providerMessageId
      : null,
    target_error: sent ? null : errorMessage,
  });

  return sent
    ? { status: "sent" as const, warning: null }
    : {
        status: "failed" as const,
        warning: errorMessage,
      };
}

export async function executeContractAcceptance(
  input: ExecuteContractAcceptanceInput
): Promise<ExecuteContractAcceptanceResult> {
  const { data, error } = await input.admin.rpc(
    "accept_contract_assignment_electronically",
    {
      target_assignment_id: input.assignmentId,
      target_accepted_by_profile_id: input.acceptedByProfileId,
      target_represented_entity_name: input.representedEntityName,
      target_representative_name: input.representativeName,
      target_representative_capacity: input.representativeCapacity,
      target_represented_entity_snapshot:
        input.representedEntitySnapshot,
      target_checkbox_text: input.checkboxText,
      target_ip_address: input.ipAddress,
      target_user_agent: input.userAgent,
    }
  );

  if (error) throw error;

  const acceptanceId =
    typeof data === "string"
      ? data
      : Array.isArray(data) && typeof data[0] === "string"
        ? data[0]
        : null;

  if (!acceptanceId) {
    throw new Error(
      "Electronic acceptance did not return an acceptance id."
    );
  }

  const context = await loadAcceptanceContext(
    input.admin,
    acceptanceId
  );
  const pdf = await ensureAcceptedPdf(input.admin, context);
  const email = await sendConfirmation(
    input.admin,
    context,
    input,
    pdf
  );

  const warnings = [pdf.warning, email.warning].filter(
    (value): value is string => Boolean(value)
  );

  return {
    acceptanceId,
    pdfStatus: pdf.status,
    pdfFileName: pdf.fileName,
    emailStatus: email.status,
    warnings,
  };
}
