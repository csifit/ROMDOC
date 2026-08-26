import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  compareContractAndOperationalPrices,
  createEffectiveOperationalPriceTerms,
  hasAcceptedContractPriceTerms,
  normalizeAcceptedContractPriceTerms,
  type ContractPriceComparisonStatus,
  type ContractPriceDifference,
  type ContractPriceTerms,
  type EffectiveOperationalPriceTerms,
} from "@/lib/contracts/contract-price-comparison";

export type AdminContractLocale = "ro" | "en" | "de";
export type AdminContractClientType =
  | "independent_doctor"
  | "clinic_organization";

export type AdminContractDocument = {
  id: string;
  documentKey: string;
  documentType: string;
  audience: string;
  locale: AdminContractLocale;
  title: string;
  version: string;
  contentHtml: string;
  requiresAcceptance: boolean;
  unilateralNoticeAllowed: boolean;
  status: "draft" | "published";
  issueDate: string;
  effectiveAt: string | null;
  publishedAt: string | null;
  supersedesDocumentId: string | null;
};

export type AdminContractPackageDocument = {
  documentId: string;
  displayOrder: number;
  isRequired: boolean;
  sectionLabel: string | null;
};

export type AdminContractPackage = {
  id: string;
  packageKey: string;
  contractType: AdminContractClientType;
  locale: AdminContractLocale;
  title: string;
  version: string;
  status: "draft" | "published";
  requiresAcceptance: boolean;
  paymentDeadlineDays: number;
  effectiveAt: string | null;
  publishedAt: string | null;
  supersedesPackageId: string | null;
  documents: AdminContractPackageDocument[];
};

export type AdminContractClient = {
  id: string;
  clientType: AdminContractClientType;
  name: string;
  email: string | null;
};

export type AdminContractAssignment = {
  id: string;
  packageId: string;
  packageTitle: string;
  packageVersion: string;
  packageLocale: AdminContractLocale;
  clientType: AdminContractClientType;
  clientId: string;
  clientName: string;
  status: string;
  acceptanceRequired: boolean;
  commercialTerms: Record<string, unknown>;
  acceptedCommercialTerms: Record<string, unknown> | null;
  paymentDeadlineDays: number;
  assignedAt: string;
  notifiedAt: string | null;
  effectiveAt: string | null;
  supersedesAssignmentId: string | null;
  acceptedAt: string | null;
  pdfStatus: string | null;
  notificationSentCount: number;
  notificationFailedCount: number;
};

export type AdminContractAcceptanceLog = {
  id: string;
  assignmentId: string;
  clientName: string;
  clientType: AdminContractClientType;
  packageTitle: string;
  packageVersion: string;
  representativeName: string;
  representativeCapacity: string;
  acceptedAt: string;
  evidenceHash: string;
  pdfStatus: string | null;
};

export type AdminContractPriceUpdate = {
  assignmentId: string;
  clientId: string;
  clientType: AdminContractClientType;
  clientName: string;
  packageVersion: string;
  acceptedAt: string | null;
  comparisonStatus: ContractPriceComparisonStatus;
  acceptedTerms: ContractPriceTerms;
  operationalTerms: EffectiveOperationalPriceTerms;
  differences: ContractPriceDifference[];
  pricingHref: string;
  hasLegacyUnverifiedConfirmation: boolean;
};

export type AdminContractManagementData = {
  documents: AdminContractDocument[];
  packages: AdminContractPackage[];
  clients: AdminContractClient[];
  assignments: AdminContractAssignment[];
  acceptances: AdminContractAcceptanceLog[];
  priceUpdates: AdminContractPriceUpdate[];
};

type Row = Record<string, any>;

function locale(value: unknown): AdminContractLocale {
  return value === "en" || value === "de" ? value : "ro";
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function displayName(
  firstName: unknown,
  lastName: unknown,
  fallback: string
) {
  const value = [firstName, lastName]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    )
    .join(" ")
    .trim();

  return value || fallback;
}

function assertQuery(error: unknown, label: string) {
  if (error) {
    const message =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message?: unknown }).message ?? label)
        : label;

    throw new Error(`${label}: ${message}`);
  }
}

export async function loadAdminContractManagementData(
  admin: SupabaseClient
): Promise<AdminContractManagementData> {
  const [
    documentsResult,
    packagesResult,
    linksResult,
    doctorsResult,
    organizationsResult,
    organizationBillingResult,
    assignmentsResult,
    acceptancesResult,
    artifactsResult,
    eventsResult,
    deliveriesResult,
    billingTermsResult,
    billingSettingsResult,
  ] = await Promise.all([
    admin
      .from("contract_documents")
      .select(
        "id, document_key, document_type, audience, locale, title, version, content_html, requires_acceptance, unilateral_notice_allowed, status, issue_date, effective_at, published_at, supersedes_document_id, created_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("contract_packages")
      .select(
        "id, package_key, contract_type, locale, title, version, status, requires_acceptance, payment_deadline_days, effective_at, published_at, supersedes_package_id, created_at"
      )
      .order("created_at", { ascending: false }),
    admin
      .from("contract_package_documents")
      .select(
        "package_id, document_id, display_order, is_required, section_label"
      )
      .order("display_order", { ascending: true }),
    admin
      .from("doctors")
      .select("id, profile_id, slug, email, status, account_type")
      .eq("account_type", "independent")
      .eq("status", "active")
      .order("slug", { ascending: true }),
    admin
      .from("clinic_organizations")
      .select("id, name, status, contact_email")
      .eq("status", "active")
      .order("name", { ascending: true }),
    admin
      .from("clinic_organization_billing_profiles")
      .select("organization_id, billing_email"),
    admin
      .from("client_contract_assignments")
      .select(
        "id, package_id, client_type, doctor_id, clinic_organization_id, status, acceptance_required, commercial_terms, payment_deadline_days, assigned_at, notified_at, effective_at, supersedes_assignment_id"
      )
      .order("assigned_at", { ascending: false }),
    admin
      .from("contract_acceptances")
      .select(
        "id, assignment_id, representative_name, representative_capacity, commercial_terms_snapshot, accepted_at, acceptance_evidence_hash"
      )
      .order("accepted_at", { ascending: false }),
    admin
      .from("contract_acceptance_artifacts")
      .select("acceptance_id, status"),
    admin
      .from("contract_events")
      .select("assignment_id, event_type, event_data, created_at")
      .in("event_type", ["price_update_pending", "price_applied"])
      .order("created_at", { ascending: true }),
    admin
      .from("contract_assignment_email_deliveries")
      .select("assignment_id, status"),
    admin
      .from("client_billing_terms")
      .select(
        "id, client_type, doctor_id, clinic_organization_id, subscription_unit_price, currency, vat_rate, effective_from, effective_until, updated_at"
      ),
    admin
      .from("clinic_billing_settings")
      .select(
        "clinic_doctor_monthly_price_ron, vat_rate, billing_currency"
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);

  assertQuery(documentsResult.error, "Contract documents query failed");
  assertQuery(packagesResult.error, "Contract packages query failed");
  assertQuery(linksResult.error, "Contract package documents query failed");
  assertQuery(doctorsResult.error, "Independent Doctor clients query failed");
  assertQuery(
    organizationsResult.error,
    "Clinic Organisation clients query failed"
  );
  assertQuery(
    organizationBillingResult.error,
    "Clinic Organisation billing email query failed"
  );
  assertQuery(assignmentsResult.error, "Contract assignments query failed");
  assertQuery(acceptancesResult.error, "Contract acceptances query failed");
  assertQuery(artifactsResult.error, "Contract PDF artifacts query failed");
  assertQuery(eventsResult.error, "Contract price events query failed");
  assertQuery(deliveriesResult.error, "Contract notifications query failed");
  assertQuery(billingTermsResult.error, "Manual client pricing query failed");
  assertQuery(billingSettingsResult.error, "Global billing settings query failed");

  const doctorRows = (doctorsResult.data ?? []) as Row[];

  const profileIds = doctorRows
    .map((doctor) => String(doctor.profile_id ?? ""))
    .filter(Boolean);

  const profilesResult = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, first_name, last_name, account_status")
        .in("id", profileIds)
    : { data: [], error: null };

  assertQuery(profilesResult.error, "Doctor client profiles query failed");

  const profileMap = new Map(
    ((profilesResult.data ?? []) as Row[]).map((profile) => [
      String(profile.id),
      profile,
    ])
  );

  const organizationBillingMap = new Map(
    ((organizationBillingResult.data ?? []) as Row[]).map((row) => [
      String(row.organization_id),
      typeof row.billing_email === "string" ? row.billing_email : null,
    ])
  );

  const clients: AdminContractClient[] = [
    ...doctorRows
      .filter((doctor) => {
        const profile = profileMap.get(String(doctor.profile_id));
        return profile?.account_status === "active";
      })
      .map((doctor) => {
        const profile = profileMap.get(String(doctor.profile_id));

        return {
          id: String(doctor.id),
          clientType: "independent_doctor" as const,
          name: displayName(
            profile?.first_name,
            profile?.last_name,
            String(doctor.slug ?? "Doctor")
          ),
          email:
            typeof doctor.email === "string" && doctor.email.trim()
              ? doctor.email
              : null,
        };
      }),
    ...((organizationsResult.data ?? []) as Row[]).map((organization) => ({
      id: String(organization.id),
      clientType: "clinic_organization" as const,
      name: String(organization.name ?? "Clinic Organisation"),
      email:
        organizationBillingMap.get(String(organization.id)) ??
        (typeof organization.contact_email === "string"
          ? organization.contact_email
          : null),
    })),
  ].sort((a, b) => a.name.localeCompare(b.name));

  const clientMap = new Map(
    clients.map((client) => [`${client.clientType}:${client.id}`, client])
  );

  const documents: AdminContractDocument[] = (
    (documentsResult.data ?? []) as Row[]
  ).map((row) => ({
    id: String(row.id),
    documentKey: String(row.document_key),
    documentType: String(row.document_type),
    audience: String(row.audience),
    locale: locale(row.locale),
    title: String(row.title),
    version: String(row.version),
    contentHtml: String(row.content_html),
    requiresAcceptance: Boolean(row.requires_acceptance),
    unilateralNoticeAllowed: Boolean(row.unilateral_notice_allowed),
    status: row.status === "published" ? "published" : "draft",
    issueDate: String(row.issue_date),
    effectiveAt: row.effective_at ? String(row.effective_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    supersedesDocumentId: row.supersedes_document_id
      ? String(row.supersedes_document_id)
      : null,
  }));

  const linksByPackage = new Map<
    string,
    AdminContractPackageDocument[]
  >();

  for (const row of (linksResult.data ?? []) as Row[]) {
    const packageId = String(row.package_id);
    const current = linksByPackage.get(packageId) ?? [];

    current.push({
      documentId: String(row.document_id),
      displayOrder: Number(row.display_order),
      isRequired: Boolean(row.is_required),
      sectionLabel:
        typeof row.section_label === "string" ? row.section_label : null,
    });

    linksByPackage.set(packageId, current);
  }

  const packages: AdminContractPackage[] = (
    (packagesResult.data ?? []) as Row[]
  ).map((row) => ({
    id: String(row.id),
    packageKey: String(row.package_key),
    contractType:
      row.contract_type === "clinic_organization"
        ? "clinic_organization"
        : "independent_doctor",
    locale: locale(row.locale),
    title: String(row.title),
    version: String(row.version),
    status: row.status === "published" ? "published" : "draft",
    requiresAcceptance: Boolean(row.requires_acceptance),
    paymentDeadlineDays: Number(row.payment_deadline_days ?? 30),
    effectiveAt: row.effective_at ? String(row.effective_at) : null,
    publishedAt: row.published_at ? String(row.published_at) : null,
    supersedesPackageId: row.supersedes_package_id
      ? String(row.supersedes_package_id)
      : null,
    documents: (linksByPackage.get(String(row.id)) ?? []).sort(
      (a, b) => a.displayOrder - b.displayOrder
    ),
  }));

  const packageMap = new Map(
    packages.map((item) => [item.id, item])
  );

  const acceptanceMap = new Map(
    ((acceptancesResult.data ?? []) as Row[]).map((row) => [
      String(row.assignment_id),
      row,
    ])
  );

  const artifactMap = new Map(
    ((artifactsResult.data ?? []) as Row[]).map((row) => [
      String(row.acceptance_id),
      String(row.status),
    ])
  );

  const deliveryCounts = new Map<
    string,
    { sent: number; failed: number }
  >();

  for (const row of (deliveriesResult.data ?? []) as Row[]) {
    const assignmentId = String(row.assignment_id);

    const current = deliveryCounts.get(assignmentId) ?? {
      sent: 0,
      failed: 0,
    };

    if (row.status === "sent") current.sent += 1;
    if (row.status === "failed") current.failed += 1;

    deliveryCounts.set(assignmentId, current);
  }

  const assignments: AdminContractAssignment[] = (
    (assignmentsResult.data ?? []) as Row[]
  ).map((row) => {
    const clientType: AdminContractClientType =
      row.client_type === "clinic_organization"
        ? "clinic_organization"
        : "independent_doctor";

    const clientId = String(
      clientType === "clinic_organization"
        ? row.clinic_organization_id
        : row.doctor_id
    );

    const client = clientMap.get(`${clientType}:${clientId}`);
    const contractPackage = packageMap.get(String(row.package_id));
    const acceptance = acceptanceMap.get(String(row.id));

    const counts = deliveryCounts.get(String(row.id)) ?? {
      sent: 0,
      failed: 0,
    };

    return {
      id: String(row.id),
      packageId: String(row.package_id),
      packageTitle: contractPackage?.title ?? "RomDoc",
      packageVersion: contractPackage?.version ?? "—",
      packageLocale: contractPackage?.locale ?? "ro",
      clientType,
      clientId,
      clientName: client?.name ?? clientId,
      status: String(row.status),
      acceptanceRequired: Boolean(row.acceptance_required),
      commercialTerms: objectValue(row.commercial_terms),
      acceptedCommercialTerms: acceptance
        ? objectValue(acceptance.commercial_terms_snapshot)
        : null,
      paymentDeadlineDays: Number(row.payment_deadline_days ?? 30),
      assignedAt: String(row.assigned_at),
      notifiedAt: row.notified_at ? String(row.notified_at) : null,
      effectiveAt: row.effective_at ? String(row.effective_at) : null,
      supersedesAssignmentId: row.supersedes_assignment_id
        ? String(row.supersedes_assignment_id)
        : null,
      acceptedAt: acceptance?.accepted_at
        ? String(acceptance.accepted_at)
        : null,
      pdfStatus: acceptance?.id
        ? artifactMap.get(String(acceptance.id)) ?? null
        : null,
      notificationSentCount: counts.sent,
      notificationFailedCount: counts.failed,
    };
  });

  const assignmentMap = new Map(
    assignments.map((item) => [item.id, item])
  );

  const acceptances: AdminContractAcceptanceLog[] = (
    (acceptancesResult.data ?? []) as Row[]
  ).map((row) => {
    const assignment = assignmentMap.get(String(row.assignment_id));

    return {
      id: String(row.id),
      assignmentId: String(row.assignment_id),
      clientName: assignment?.clientName ?? String(row.assignment_id),
      clientType: assignment?.clientType ?? "independent_doctor",
      packageTitle: assignment?.packageTitle ?? "RomDoc",
      packageVersion: assignment?.packageVersion ?? "—",
      representativeName: String(row.representative_name),
      representativeCapacity: String(row.representative_capacity),
      acceptedAt: String(row.accepted_at),
      evidenceHash: String(row.acceptance_evidence_hash),
      pdfStatus: artifactMap.get(String(row.id)) ?? null,
    };
  });

  const priceState = new Map<
    string,
    {
      pending: boolean;
      verifiedApplied: boolean;
      legacyApplied: boolean;
    }
  >();

  for (const row of (eventsResult.data ?? []) as Row[]) {
    const assignmentId = String(row.assignment_id);

    const current = priceState.get(assignmentId) ?? {
      pending: false,
      verifiedApplied: false,
      legacyApplied: false,
    };

    if (row.event_type === "price_update_pending") {
      current.pending = true;
    }

    if (row.event_type === "price_applied") {
      const eventData = objectValue(row.event_data);

      if (eventData.comparisonVerified === true) {
        current.verifiedApplied = true;
      } else {
        current.legacyApplied = true;
      }
    }

    priceState.set(assignmentId, current);
  }

  const settings = (billingSettingsResult.data ?? {}) as Row;

  const globalSubscriptionUnitPrice = Number(
    settings.clinic_doctor_monthly_price_ron ?? 20
  );

  const globalVatRate = Number(
    settings.vat_rate ?? 0.21
  );

  const globalCurrency =
    settings.billing_currency === "RON"
      ? ("RON" as const)
      : ("EUR" as const);

  const operationalOverrideMap = new Map<
    string,
    {
      id: string;
      subscriptionUnitPrice: number | null;
      currency: "RON" | "EUR";
      vatRate: number | null;
      effectiveFrom: string | null;
      effectiveUntil: string | null;
      updatedAt: string | null;
    }
  >();

  for (const row of (billingTermsResult.data ?? []) as Row[]) {
    const clientType: AdminContractClientType =
      row.client_type === "clinic_organization"
        ? "clinic_organization"
        : "independent_doctor";

    const clientId = String(
      clientType === "clinic_organization"
        ? row.clinic_organization_id
        : row.doctor_id
    );

    if (!clientId || clientId === "null") continue;

    operationalOverrideMap.set(`${clientType}:${clientId}`, {
      id: String(row.id),
      subscriptionUnitPrice:
        row.subscription_unit_price === null
          ? null
          : Number(row.subscription_unit_price),
      currency: row.currency === "RON" ? "RON" : "EUR",
      vatRate: row.vat_rate === null ? null : Number(row.vat_rate),
      effectiveFrom: row.effective_from
        ? String(row.effective_from)
        : null,
      effectiveUntil: row.effective_until
        ? String(row.effective_until)
        : null,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    });
  }

  const priceUpdates: AdminContractPriceUpdate[] = assignments
    .filter((assignment) => {
      const state = priceState.get(assignment.id);

      return (
        state?.pending === true &&
        state.verifiedApplied === false
      );
    })
    .map((assignment) => {
      const acceptedTerms = normalizeAcceptedContractPriceTerms(
        assignment.acceptedCommercialTerms ??
          assignment.commercialTerms
      );

      if (!hasAcceptedContractPriceTerms(acceptedTerms)) {
        return null;
      }

      const comparisonDate = (
        assignment.effectiveAt ??
        assignment.acceptedAt ??
        new Date().toISOString()
      ).slice(0, 10);

      const operationalTerms = createEffectiveOperationalPriceTerms({
        comparisonDate,
        globalSubscriptionUnitPrice: Number.isFinite(
          globalSubscriptionUnitPrice
        )
          ? globalSubscriptionUnitPrice
          : 20,
        globalCurrency,
        globalVatRate: Number.isFinite(globalVatRate)
          ? globalVatRate
          : 0.21,
        override:
          operationalOverrideMap.get(
            `${assignment.clientType}:${assignment.clientId}`
          ) ?? null,
      });

      const differences = compareContractAndOperationalPrices(
        acceptedTerms,
        operationalTerms
      );

      const comparisonStatus: ContractPriceComparisonStatus =
        differences.length === 0
          ? "ready_to_confirm"
          : "needs_update";

      return {
        assignmentId: assignment.id,
        clientId: assignment.clientId,
        clientType: assignment.clientType,
        clientName: assignment.clientName,
        packageVersion: assignment.packageVersion,
        acceptedAt: assignment.acceptedAt,
        comparisonStatus,
        acceptedTerms,
        operationalTerms,
        differences,
        pricingHref: "/admin/invoices",
        hasLegacyUnverifiedConfirmation:
          priceState.get(assignment.id)?.legacyApplied === true,
      } satisfies AdminContractPriceUpdate;
    })
    .filter(
      (item): item is AdminContractPriceUpdate => item !== null
    )
    .sort((first, second) => {
      if (first.comparisonStatus !== second.comparisonStatus) {
        return first.comparisonStatus === "needs_update" ? -1 : 1;
      }

      return (second.acceptedAt ?? "").localeCompare(
        first.acceptedAt ?? ""
      );
    });

  return {
    documents,
    packages,
    clients,
    assignments,
    acceptances,
    priceUpdates,
  };
}
