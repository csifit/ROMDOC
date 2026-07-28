import { NextRequest } from "next/server";

import {
  contractApiError,
  contractApiSuccess,
  errorMessage,
  requireAdminContractApi,
} from "@/lib/contracts/admin-contract-auth";

export const runtime = "nodejs";

function text(value: unknown, maximum = 10000) {
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

function timestamp(value: unknown) {
  const candidate = text(value, 100);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function documentIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map(uuid).filter((item): item is string => Boolean(item)))
  ).slice(0, 100);
}

async function jsonBody(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function validatePackage(body: Record<string, unknown>) {
  const packageKey = text(body.packageKey, 120);
  const contractType = text(body.contractType, 50);
  const locale = text(body.locale, 10);
  const title = text(body.title, 250);
  const version = text(body.version, 32);
  const effectiveAt = timestamp(body.effectiveAt);
  const selectedDocuments = documentIds(body.documentIds);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packageKey)) {
    return { error: "Cheia pachetului trebuie să folosească litere mici, cifre și cratime." } as const;
  }
  if (!new Set(["independent_doctor", "clinic_organization"]).has(contractType)) {
    return { error: "Tipul pachetului contractual nu este valid." } as const;
  }
  if (!new Set(["ro", "en", "de"]).has(locale)) {
    return { error: "Limba pachetului nu este validă." } as const;
  }
  if (title.length < 2 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$/.test(version)) {
    return { error: "Titlul sau versiunea pachetului nu este validă." } as const;
  }
  if (effectiveAt === undefined) {
    return { error: "Data intrării în vigoare nu este validă." } as const;
  }
  if (selectedDocuments.length === 0) {
    return { error: "Selectați cel puțin un document publicat." } as const;
  }

  return {
    value: {
      package_key: packageKey,
      contract_type: contractType,
      locale,
      title,
      version,
      requires_acceptance:
        typeof body.requiresAcceptance === "boolean"
          ? body.requiresAcceptance
          : true,
      payment_deadline_days: 30,
      effective_at: effectiveAt,
      metadata: {},
      documentIds: selectedDocuments,
    },
  } as const;
}

async function replaceComposition(input: {
  admin: any;
  packageId: string;
  documentIds: string[];
}) {
  const { data: previousLinks, error: previousError } = await input.admin
    .from("contract_package_documents")
    .select("document_id, display_order, is_required, section_label")
    .eq("package_id", input.packageId)
    .order("display_order", { ascending: true });

  if (previousError) throw previousError;

  const { error: deleteError } = await input.admin
    .from("contract_package_documents")
    .delete()
    .eq("package_id", input.packageId);

  if (deleteError) throw deleteError;

  const rows = input.documentIds.map((documentId, index) => ({
    package_id: input.packageId,
    document_id: documentId,
    display_order: index + 1,
    is_required: true,
  }));

  const { error: insertError } = await input.admin
    .from("contract_package_documents")
    .insert(rows);

  if (!insertError) return;

  if (previousLinks?.length) {
    await input.admin.from("contract_package_documents").insert(
      previousLinks.map((link: any) => ({
        package_id: input.packageId,
        document_id: link.document_id,
        display_order: link.display_order,
        is_required: link.is_required,
        section_label: link.section_label,
      }))
    );
  }

  throw insertError;
}

export async function POST(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;
  const body = await jsonBody(request);
  if (!body) return contractApiError("Datele trimise nu sunt valide.", 400);

  const action = text(body.action, 30) || "create";

  try {
    if (action === "clone") {
      const sourcePackageId = uuid(body.sourcePackageId);
      const title = text(body.title, 250);
      const version = text(body.version, 32);
      const effectiveAt = timestamp(body.effectiveAt);

      if (!sourcePackageId || title.length < 2 || !version) {
        return contractApiError("Pachetul sursă, titlul și versiunea sunt obligatorii.", 400);
      }
      if (effectiveAt === undefined) {
        return contractApiError("Data intrării în vigoare nu este validă.", 400);
      }

      const { data: source, error: sourceError } = await access.admin
        .from("contract_packages")
        .select(
          "package_key, contract_type, locale, metadata, requires_acceptance"
        )
        .eq("id", sourcePackageId)
        .eq("status", "published")
        .maybeSingle();
      if (sourceError) throw sourceError;
      if (!source) return contractApiError("Pachetul publicat sursă nu a fost găsit.", 404);

      const { data: created, error: createError } = await access.admin
        .from("contract_packages")
        .insert({
          ...source,
          title,
          version,
          status: "draft",
          payment_deadline_days: 30,
          effective_at: effectiveAt,
          supersedes_package_id: sourcePackageId,
          created_by_profile_id: access.profileId,
        })
        .select("id")
        .single();
      if (createError) throw createError;

      const { data: links, error: linksError } = await access.admin
        .from("contract_package_documents")
        .select("document_id, display_order, is_required, section_label")
        .eq("package_id", sourcePackageId)
        .order("display_order", { ascending: true });

      if (linksError) throw linksError;
      if (links?.length) {
        const { error: copyError } = await access.admin
          .from("contract_package_documents")
          .insert(
            links.map((link: {
              document_id: string;
              display_order: number;
              is_required: boolean;
              section_label: string | null;
            }) => ({
              package_id: created.id,
              document_id: link.document_id,
              display_order: link.display_order,
              is_required: link.is_required,
              section_label: link.section_label,
            }))
          );
        if (copyError) throw copyError;
      }

      return contractApiSuccess("Noua versiune a pachetului a fost creată ca draft.", { packageId: created.id }, 201);
    }

    const validated = validatePackage(body);
    if ("error" in validated) {
      return contractApiError(
        validated.error ?? "Datele contractuale nu sunt valide.",
        400
      );
    }
    const { documentIds: selectedDocuments, ...packageValues } = validated.value;

    const { data: created, error: createError } = await access.admin
      .from("contract_packages")
      .insert({
        ...packageValues,
        status: "draft",
        created_by_profile_id: access.profileId,
      })
      .select("id")
      .single();

    if (createError) throw createError;

    try {
      await replaceComposition({
        admin: access.admin,
        packageId: created.id,
        documentIds: selectedDocuments,
      });
    } catch (compositionError) {
      await access.admin.from("contract_packages").delete().eq("id", created.id);
      throw compositionError;
    }

    return contractApiSuccess("Draftul pachetului a fost creat.", { packageId: created.id }, 201);
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;
  const body = await jsonBody(request);
  if (!body) return contractApiError("Datele trimise nu sunt valide.", 400);

  const packageId = uuid(body.packageId);
  const action = text(body.action, 30) || "save";
  if (!packageId) return contractApiError("Pachetul nu este valid.", 400);

  try {
    if (action === "publish") {
      const { data, error } = await access.admin
        .from("contract_packages")
        .update({
          status: "published",
          published_by_profile_id: access.profileId,
        })
        .eq("id", packageId)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return contractApiError("Numai un draft poate fi publicat.", 409);
      return contractApiSuccess("Pachetul a fost publicat și a devenit imuabil.");
    }

    const validated = validatePackage(body);
    if ("error" in validated) {
      return contractApiError(
        validated.error ?? "Datele contractuale nu sunt valide.",
        400
      );
    }
    const { documentIds: selectedDocuments, package_key, contract_type, locale, ...editable } =
      validated.value;
    void package_key;
    void contract_type;
    void locale;

    const { data, error } = await access.admin
      .from("contract_packages")
      .update(editable)
      .eq("id", packageId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) return contractApiError("Numai un draft poate fi modificat.", 409);

    await replaceComposition({
      admin: access.admin,
      packageId,
      documentIds: selectedDocuments,
    });

    return contractApiSuccess("Draftul pachetului a fost salvat.");
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}

export async function DELETE(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;
  const body = await jsonBody(request);
  const packageId = body ? uuid(body.packageId) : null;
  if (!packageId) return contractApiError("Pachetul nu este valid.", 400);

  try {
    const { data: existing, error: existingError } = await access.admin
      .from("contract_packages")
      .select("id, status")
      .eq("id", packageId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing || existing.status !== "draft") {
      return contractApiError("Numai un draft poate fi șters.", 409);
    }

    const { error: linksError } = await access.admin
      .from("contract_package_documents")
      .delete()
      .eq("package_id", packageId);
    if (linksError) throw linksError;

    const { error } = await access.admin
      .from("contract_packages")
      .delete()
      .eq("id", packageId)
      .eq("status", "draft");
    if (error) throw error;

    return contractApiSuccess("Draftul pachetului a fost șters.");
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}
