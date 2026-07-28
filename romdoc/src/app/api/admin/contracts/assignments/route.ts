import { NextRequest } from "next/server";

import {
  contractApiError,
  contractApiSuccess,
  errorMessage,
  requireAdminContractApi,
} from "@/lib/contracts/admin-contract-auth";
import { validateAdminContractCommercialTerms } from "@/lib/contracts/admin-contract-commercial-terms";
import { notifyContractAssignments } from "@/lib/contracts/admin-contract-notifications";

export const runtime = "nodejs";

function text(value: unknown, maximum = 5000) {
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

function timestamp(value: unknown) {
  const candidate = text(value, 100);
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function body(request: NextRequest) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;
  const input = await body(request);
  if (!input) return contractApiError("Datele trimise nu sunt valide.", 400);

  const packageId = uuid(input.packageId);
  const clientIds = uuidArray(input.clientIds);
  const effectiveAt = timestamp(input.effectiveAt);

  if (!packageId || clientIds.length === 0) {
    return contractApiError("Selectați un pachet publicat și cel puțin un client.", 400);
  }
  if (effectiveAt === undefined) {
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
      "admin_assign_contract_package_batch",
      {
        target_admin_profile_id: access.profileId,
        target_package_id: packageId,
        target_client_ids: clientIds,
        target_commercial_terms: commercialTerms.value,
        target_keep_existing_terms: input.keepExistingTerms === true,
        target_effective_at: effectiveAt,
        target_internal_notes: text(input.internalNotes, 5000) || null,
      }
    );

    if (error) throw error;

    const rows = Array.isArray(data) ? data : data ? [data] : [];
    const assignmentIds = rows
      .map((row) =>
        row && typeof row.assignment_id === "string"
          ? row.assignment_id
          : null
      )
      .filter((value): value is string => Boolean(value));

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
        ? "Atribuirile au fost create. Unele notificări necesită reîncercare."
        : "Pachetul a fost atribuit și notificările au fost trimise.",
      {
        assignmentIds,
        notifications,
      },
      201
    );
  } catch (error) {
    return contractApiError(errorMessage(error), 500);
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdminContractApi();
  if (!access.ok) return access.response;
  const input = await body(request);
  if (!input) return contractApiError("Datele trimise nu sunt valide.", 400);

  const assignmentId = uuid(input.assignmentId);
  const action = text(input.action, 50);
  if (!assignmentId) return contractApiError("Atribuirea nu este validă.", 400);

  try {
    if (action === "notify") {
      const notifications = await notifyContractAssignments({
        admin: access.admin,
        adminProfileId: access.profileId,
        assignmentIds: [assignmentId],
      });
      return contractApiSuccess("Notificarea contractuală a fost procesată.", {
        notifications,
      });
    }

    if (action === "mark_effective") {
      const { error } = await access.admin.rpc(
        "admin_mark_notice_contract_effective",
        {
          target_admin_profile_id: access.profileId,
          target_assignment_id: assignmentId,
        }
      );
      if (error) throw error;
      return contractApiSuccess("Amendamentul transmis prin informare este acum în vigoare.");
    }

    if (action === "cancel") {
      const { error } = await access.admin.rpc(
        "admin_cancel_contract_assignment",
        {
          target_admin_profile_id: access.profileId,
          target_assignment_id: assignmentId,
          target_reason: text(input.reason, 1000) || null,
        }
      );
      if (error) throw error;
      return contractApiSuccess("Atribuirea în așteptare a fost anulată.");
    }

    if (action === "mark_price_applied") {
      const { error } = await access.admin.rpc(
        "admin_mark_contract_price_applied",
        {
          target_admin_profile_id: access.profileId,
          target_assignment_id: assignmentId,
          target_note: text(input.note, 1000) || null,
        }
      );
      if (error) throw error;
      return contractApiSuccess(
        "Aplicarea manuală a tarifului operațional a fost confirmată."
      );
    }

    return contractApiError("Acțiunea solicitată nu este validă.", 400);
  } catch (error) {
    const message = errorMessage(error);
    const status =
      message.includes("still differ from the accepted contractual price") ||
      message.includes("does not contain accepted contractual price values") ||
      message.includes("does not contain contractual price values") ||
      message.includes("accepted contract evidence could not be found")
        ? 409
        : 500;
    return contractApiError(message, status);
  }
}
