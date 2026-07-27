import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ContractClientType,
} from "@/lib/contracts/contract-acceptance-copy";

export type ContractAudience =
  | "doctor"
  | "clinic_organization";

export type ContractAcceptanceBlockReason =
  | "billing_details_missing"
  | "not_authorized"
  | null;

export type ContractDocumentView = {
  id: string;
  title: string;
  documentType: string;
  version: string;
  effectiveAt: string | null;
  requiresAcceptance: boolean;
  status: string;
  contentHtml: string;
  displayOrder: number;
  sectionLabel: string | null;
};

export type ContractEventView = {
  id: string;
  eventType: string;
  eventData: Record<string, unknown>;
  createdAt: string;
};

export type ContractAssignmentView = {
  id: string;
  clientType: ContractClientType;
  subjectId: string;
  subjectName: string;
  packageTitle: string;
  packageVersion: string;
  packageLocale: "ro" | "en" | "de";
  status: string;
  acceptanceRequired: boolean;
  canAccept: boolean;
  acceptanceBlockReason: ContractAcceptanceBlockReason;
  billingSettingsHref: string;
  paymentDeadlineDays: number;
  commercialTerms: Record<string, unknown>;
  assignedAt: string;
  notifiedAt: string | null;
  effectiveAt: string | null;
  acceptanceId: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  representativeCapacity: string | null;
  pdfStatus: string | null;
  pdfFileName: string | null;
  pdfFailureReason: string | null;
  documents: ContractDocumentView[];
  events: ContractEventView[];
};

export type ContractDashboardView = {
  audience: ContractAudience;
  subjectLabel: string;
  assignments: ContractAssignmentView[];
};

type RawRelation<T> = T | T[] | null;

type SubjectAcceptanceContext = {
  canSignContracts: boolean;
  billingDetailsComplete: boolean;
  billingSettingsHref: string;
};

function firstRelation<T>(
  value: RawRelation<T>
): T | null {
  return Array.isArray(value)
    ? value[0] ?? null
    : value;
}

function objectValue(
  value: unknown
): Record<string, unknown> {
  return value &&
    typeof value === "object" &&
    !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLocale(
  value: unknown
): "ro" | "en" | "de" {
  return value === "en" || value === "de"
    ? value
    : "ro";
}

function displayName(
  firstName: unknown,
  lastName: unknown,
  fallback: string
) {
  const name = [firstName, lastName]
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(" ")
    .trim();

  return name || fallback;
}

function nonEmpty(value: unknown) {
  return (
    typeof value === "string" &&
    value.trim().length > 0
  );
}

function validEmail(value: unknown) {
  return (
    typeof value === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim()
    )
  );
}

function mapAssignment(
  raw: Record<string, any>,
  subjectId: string,
  subjectName: string,
  context: SubjectAcceptanceContext
): ContractAssignmentView {
  const contractPackage =
    firstRelation<Record<string, any>>(
      raw.contract_packages ?? null
    );
  const acceptance =
    firstRelation<Record<string, any>>(
      raw.contract_acceptances ?? null
    );
  const artifact = acceptance
    ? firstRelation<Record<string, any>>(
        acceptance
          .contract_acceptance_artifacts ??
          null
      )
    : null;

  const packageDocuments = Array.isArray(
    contractPackage?.contract_package_documents
  )
    ? contractPackage.contract_package_documents
    : [];

  const documents = packageDocuments
    .map((link: Record<string, any>) => {
      const document =
        firstRelation<Record<string, any>>(
          link.contract_documents ?? null
        );

      if (!document) return null;

      return {
        id: String(document.id),
        title: String(document.title ?? ""),
        documentType: String(
          document.document_type ??
            "other_annex"
        ),
        version: String(document.version ?? ""),
        effectiveAt: document.effective_at
          ? String(document.effective_at)
          : null,
        requiresAcceptance: Boolean(
          document.requires_acceptance
        ),
        status: String(
          document.status ?? "published"
        ),
        contentHtml: String(
          document.content_html ?? ""
        ),
        displayOrder: Number(
          link.display_order ?? 0
        ),
        sectionLabel:
          typeof link.section_label === "string"
            ? link.section_label
            : null,
      } satisfies ContractDocumentView;
    })
    .filter(
      (
        item: ContractDocumentView | null
      ): item is ContractDocumentView =>
        Boolean(item)
    )
    .sort(
      (
        a: ContractDocumentView,
        b: ContractDocumentView
      ) =>
        a.displayOrder - b.displayOrder
    );

  const events = (
    Array.isArray(raw.contract_events)
      ? raw.contract_events
      : []
  )
    .map((event: Record<string, any>) => ({
      id: String(event.id),
      eventType: String(
        event.event_type ?? "viewed"
      ),
      eventData: objectValue(
        event.event_data
      ),
      createdAt: String(event.created_at),
    }))
    .sort(
      (
        a: ContractEventView,
        b: ContractEventView
      ) =>
        b.createdAt.localeCompare(a.createdAt)
    );

  const status = String(raw.status ?? "assigned");
  const acceptanceRequired = Boolean(
    raw.acceptance_required
  );
  const isPending = [
    "assigned",
    "notified",
    "awaiting_acceptance",
  ].includes(status);

  let acceptanceBlockReason:
    ContractAcceptanceBlockReason = null;

  if (
    isPending &&
    acceptanceRequired &&
    !context.canSignContracts
  ) {
    acceptanceBlockReason = "not_authorized";
  } else if (
    isPending &&
    acceptanceRequired &&
    !context.billingDetailsComplete
  ) {
    acceptanceBlockReason =
      "billing_details_missing";
  }

  return {
    id: String(raw.id),
    clientType:
      raw.client_type === "clinic_organization"
        ? "clinic_organization"
        : "independent_doctor",
    subjectId,
    subjectName,
    packageTitle: String(
      contractPackage?.title ?? "RomDoc"
    ),
    packageVersion: String(
      contractPackage?.version ?? "—"
    ),
    packageLocale: normalizeLocale(
      contractPackage?.locale
    ),
    status,
    acceptanceRequired,
    canAccept:
      isPending &&
      acceptanceRequired &&
      context.canSignContracts &&
      context.billingDetailsComplete,
    acceptanceBlockReason,
    billingSettingsHref:
      context.billingSettingsHref,
    paymentDeadlineDays: Number(
      raw.payment_deadline_days ?? 30
    ),
    commercialTerms: objectValue(
      raw.commercial_terms
    ),
    assignedAt: String(raw.assigned_at),
    notifiedAt: raw.notified_at
      ? String(raw.notified_at)
      : null,
    effectiveAt: raw.effective_at
      ? String(raw.effective_at)
      : null,
    acceptanceId: acceptance?.id
      ? String(acceptance.id)
      : null,
    acceptedAt: acceptance?.accepted_at
      ? String(acceptance.accepted_at)
      : null,
    acceptedByName:
      typeof acceptance?.representative_name ===
      "string"
        ? acceptance.representative_name
        : null,
    representativeCapacity:
      typeof acceptance
        ?.representative_capacity === "string"
        ? acceptance.representative_capacity
        : null,
    pdfStatus: artifact?.status
      ? String(artifact.status)
      : null,
    pdfFileName: artifact?.file_name
      ? String(artifact.file_name)
      : null,
    pdfFailureReason:
      typeof artifact?.failure_reason === "string"
        ? artifact.failure_reason
        : null,
    documents,
    events,
  };
}

const ASSIGNMENT_SELECT = `
  id,
  client_type,
  status,
  acceptance_required,
  commercial_terms,
  payment_deadline_days,
  assigned_at,
  notified_at,
  effective_at,
  contract_packages (
    id,
    title,
    version,
    locale,
    contract_package_documents (
      display_order,
      section_label,
      contract_documents (
        id,
        title,
        document_type,
        version,
        effective_at,
        requires_acceptance,
        status,
        content_html
      )
    )
  ),
  contract_acceptances (
    id,
    accepted_at,
    representative_name,
    representative_capacity,
    contract_acceptance_artifacts (
      status,
      file_name,
      failure_reason
    )
  ),
  contract_events (
    id,
    event_type,
    event_data,
    created_at
  )
`;

export async function loadDoctorContractDashboard(
  supabase: SupabaseClient,
  profileId: string
): Promise<ContractDashboardView> {
  const { data: doctor, error: doctorError } =
    await supabase
      .from("doctors")
      .select(`
        id,
        slug,
        account_type,
        owner_profile:profiles!doctors_profile_id_fkey(
          first_name,
          last_name
        )
      `)
      .eq("profile_id", profileId)
      .maybeSingle();

  if (doctorError) throw doctorError;

  if (
    !doctor ||
    doctor.account_type !== "independent"
  ) {
    return {
      audience: "doctor",
      subjectLabel: "Doctor",
      assignments: [],
    };
  }

  const profile =
    firstRelation<Record<string, any>>(
      (doctor as any).owner_profile ?? null
    );
  const subjectName = displayName(
    profile?.first_name,
    profile?.last_name,
    String((doctor as any).slug ?? "Doctor")
  );

  const {
    data: billingProfile,
    error: billingError,
  } = await supabase
    .from("doctor_billing_profiles")
    .select(`
      legal_name,
      billing_address,
      billing_email
    `)
    .eq("doctor_id", String((doctor as any).id))
    .maybeSingle();

  if (billingError) throw billingError;

  const billingDetailsComplete = Boolean(
    billingProfile &&
      nonEmpty(billingProfile.legal_name) &&
      nonEmpty(billingProfile.billing_address) &&
      validEmail(billingProfile.billing_email)
  );

  const { data, error } = await supabase
    .from("client_contract_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("doctor_id", String((doctor as any).id))
    .order("assigned_at", {
      ascending: false,
    });

  if (error) throw error;

  const context: SubjectAcceptanceContext = {
    canSignContracts: true,
    billingDetailsComplete,
    billingSettingsHref:
      "/doctor-dashboard/billing",
  };

  return {
    audience: "doctor",
    subjectLabel: subjectName,
    assignments: (
      (data ?? []) as unknown as Record<
        string,
        any
      >[]
    ).map((assignment) =>
      mapAssignment(
        assignment,
        String((doctor as any).id),
        subjectName,
        context
      )
    ),
  };
}

export async function loadClinicManagerContractDashboard(
  supabase: SupabaseClient,
  profileId: string
): Promise<ContractDashboardView> {
  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("clinic_organization_members")
    .select(`
      organization_id,
      can_sign_contracts,
      clinic_organizations(
        id,
        name,
        status
      )
    `)
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (membershipError) throw membershipError;

  const organizations = (memberships ?? [])
    .map((membership: any) => {
      const organization =
        firstRelation<Record<string, any>>(
          membership.clinic_organizations ??
            null
        );

      if (!organization) return null;

      return {
        id: String(organization.id),
        name: String(
          organization.name ??
            "Clinic Organisation"
        ),
        canSignContracts:
          membership.can_sign_contracts === true,
      };
    })
    .filter(
      (
        organization
      ): organization is {
        id: string;
        name: string;
        canSignContracts: boolean;
      } => Boolean(organization)
    );

  if (organizations.length === 0) {
    return {
      audience: "clinic_organization",
      subjectLabel: "Clinic Organisation",
      assignments: [],
    };
  }

  const organizationIds = organizations.map(
    (organization) => organization.id
  );
  const organizationNames = new Map(
    organizations.map((organization) => [
      organization.id,
      organization.name,
    ])
  );
  const canSignByOrganization = new Map(
    organizations.map((organization) => [
      organization.id,
      organization.canSignContracts,
    ])
  );

  const {
    data: billingProfiles,
    error: billingError,
  } = await supabase
    .from(
      "clinic_organization_billing_profiles"
    )
    .select(`
      organization_id,
      company_name,
      tax_id,
      billing_address,
      billing_email
    `)
    .in("organization_id", organizationIds);

  if (billingError) throw billingError;

  const billingCompleteByOrganization = new Map(
    (billingProfiles ?? []).map((billing) => [
      String(billing.organization_id),
      nonEmpty(billing.company_name) &&
        nonEmpty(billing.tax_id) &&
        nonEmpty(billing.billing_address) &&
        validEmail(billing.billing_email),
    ])
  );

  const { data, error } = await supabase
    .from("client_contract_assignments")
    .select(
      `${ASSIGNMENT_SELECT}, clinic_organization_id`
    )
    .in(
      "clinic_organization_id",
      organizationIds
    )
    .order("assigned_at", {
      ascending: false,
    });

  if (error) throw error;

  const assignments = (
    (data ?? []) as unknown as Record<
      string,
      any
    >[]
  ).map((assignment) => {
    const organizationId = String(
      assignment.clinic_organization_id
    );

    return mapAssignment(
      assignment,
      organizationId,
      organizationNames.get(organizationId) ??
        "Clinic Organisation",
      {
        canSignContracts:
          canSignByOrganization.get(
            organizationId
          ) === true,
        billingDetailsComplete:
          billingCompleteByOrganization.get(
            organizationId
          ) === true,
        billingSettingsHref:
          "/clinic-manager-dashboard/billing",
      }
    );
  });

  return {
    audience: "clinic_organization",
    subjectLabel: organizations[0].name,
    assignments,
  };
}
