import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type ContractAudience = "doctor" | "clinic_organization";

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
  subjectId: string;
  subjectName: string;
  packageTitle: string;
  packageVersion: string;
  packageLocale: "ro" | "en" | "de";
  status: string;
  acceptanceRequired: boolean;
  paymentDeadlineDays: number;
  commercialTerms: Record<string, unknown>;
  assignedAt: string;
  notifiedAt: string | null;
  effectiveAt: string | null;
  acceptedAt: string | null;
  acceptedByName: string | null;
  representativeCapacity: string | null;
  pdfStatus: string | null;
  pdfFileName: string | null;
  documents: ContractDocumentView[];
  events: ContractEventView[];
};

export type ContractDashboardView = {
  audience: ContractAudience;
  subjectLabel: string;
  assignments: ContractAssignmentView[];
};

type RawRelation<T> = T | T[] | null;

function firstRelation<T>(value: RawRelation<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeLocale(value: unknown): "ro" | "en" | "de" {
  return value === "en" || value === "de" ? value : "ro";
}

function displayName(firstName: unknown, lastName: unknown, fallback: string) {
  const name = [firstName, lastName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();

  return name || fallback;
}

function mapAssignment(
  raw: Record<string, any>,
  subjectId: string,
  subjectName: string
): ContractAssignmentView {
  const contractPackage = firstRelation<Record<string, any>>(raw.contract_packages ?? null);
  const acceptance = firstRelation<Record<string, any>>(raw.contract_acceptances ?? null);
  const artifact = acceptance
    ? firstRelation<Record<string, any>>(acceptance.contract_acceptance_artifacts ?? null)
    : null;

  const packageDocuments = Array.isArray(contractPackage?.contract_package_documents)
    ? contractPackage.contract_package_documents
    : [];

  const documents = packageDocuments
    .map((link: Record<string, any>) => {
      const document = firstRelation<Record<string, any>>(link.contract_documents ?? null);
      if (!document) return null;

      return {
        id: String(document.id),
        title: String(document.title ?? ""),
        documentType: String(document.document_type ?? "other_annex"),
        version: String(document.version ?? ""),
        effectiveAt: document.effective_at ? String(document.effective_at) : null,
        requiresAcceptance: Boolean(document.requires_acceptance),
        status: String(document.status ?? "published"),
        contentHtml: String(document.content_html ?? ""),
        displayOrder: Number(link.display_order ?? 0),
        sectionLabel:
          typeof link.section_label === "string" ? link.section_label : null,
      } satisfies ContractDocumentView;
    })
    .filter((item: ContractDocumentView | null): item is ContractDocumentView => Boolean(item))
    .sort((a: ContractDocumentView, b: ContractDocumentView) => a.displayOrder - b.displayOrder);

  const events = (Array.isArray(raw.contract_events) ? raw.contract_events : [])
    .map((event: Record<string, any>) => ({
      id: String(event.id),
      eventType: String(event.event_type ?? "viewed"),
      eventData: objectValue(event.event_data),
      createdAt: String(event.created_at),
    }))
    .sort((a: ContractEventView, b: ContractEventView) =>
      b.createdAt.localeCompare(a.createdAt)
    );

  return {
    id: String(raw.id),
    subjectId,
    subjectName,
    packageTitle: String(contractPackage?.title ?? "RomDoc"),
    packageVersion: String(contractPackage?.version ?? "—"),
    packageLocale: normalizeLocale(contractPackage?.locale),
    status: String(raw.status ?? "assigned"),
    acceptanceRequired: Boolean(raw.acceptance_required),
    paymentDeadlineDays: Number(raw.payment_deadline_days ?? 30),
    commercialTerms: objectValue(raw.commercial_terms),
    assignedAt: String(raw.assigned_at),
    notifiedAt: raw.notified_at ? String(raw.notified_at) : null,
    effectiveAt: raw.effective_at ? String(raw.effective_at) : null,
    acceptedAt: acceptance?.accepted_at ? String(acceptance.accepted_at) : null,
    acceptedByName:
      typeof acceptance?.representative_name === "string"
        ? acceptance.representative_name
        : null,
    representativeCapacity:
      typeof acceptance?.representative_capacity === "string"
        ? acceptance.representative_capacity
        : null,
    pdfStatus: artifact?.status ? String(artifact.status) : null,
    pdfFileName: artifact?.file_name ? String(artifact.file_name) : null,
    documents,
    events,
  };
}

const ASSIGNMENT_SELECT = `
  id,
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
    accepted_at,
    representative_name,
    representative_capacity,
    contract_acceptance_artifacts (
      status,
      file_name
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
  const { data: doctor, error: doctorError } = await supabase
    .from("doctors")
    .select("id, slug, profiles(first_name,last_name)")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (doctorError) throw doctorError;
  if (!doctor) {
    return { audience: "doctor", subjectLabel: "Doctor", assignments: [] };
  }

  const profile = firstRelation<Record<string, any>>((doctor as any).profiles ?? null);
  const subjectName = displayName(
    profile?.first_name,
    profile?.last_name,
    String((doctor as any).slug ?? "Doctor")
  );

  const { data, error } = await supabase
    .from("client_contract_assignments")
    .select(ASSIGNMENT_SELECT)
    .eq("doctor_id", String((doctor as any).id))
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  return {
    audience: "doctor",
    subjectLabel: subjectName,
    assignments: ((data ?? []) as unknown as Record<string, any>[]).map((assignment) =>
      mapAssignment(assignment, String((doctor as any).id), subjectName)
    ),
  };
}

export async function loadClinicManagerContractDashboard(
  supabase: SupabaseClient,
  profileId: string
): Promise<ContractDashboardView> {
  const { data: memberships, error: membershipError } = await supabase
    .from("clinic_organization_members")
    .select("organization_id, can_sign_contracts, clinic_organizations(id,name,status)")
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (membershipError) throw membershipError;

  const organizations = (memberships ?? [])
    .map((membership: any) => {
      const organization = firstRelation<Record<string, any>>(
        membership.clinic_organizations ?? null
      );
      if (!organization) return null;

      return {
        id: String(organization.id),
        name: String(organization.name ?? "Clinic Organisation"),
      };
    })
    .filter((organization): organization is { id: string; name: string } => Boolean(organization));

  if (organizations.length === 0) {
    return {
      audience: "clinic_organization",
      subjectLabel: "Clinic Organisation",
      assignments: [],
    };
  }

  const organizationIds = organizations.map((organization) => organization.id);
  const organizationNames = new Map(
    organizations.map((organization) => [organization.id, organization.name])
  );

  const { data, error } = await supabase
    .from("client_contract_assignments")
    .select(`${ASSIGNMENT_SELECT}, clinic_organization_id`)
    .in("clinic_organization_id", organizationIds)
    .order("assigned_at", { ascending: false });

  if (error) throw error;

  const assignments = ((data ?? []) as unknown as Record<string, any>[]).map((assignment) => {
    const organizationId = String(assignment.clinic_organization_id);
    return mapAssignment(
      assignment,
      organizationId,
      organizationNames.get(organizationId) ?? "Clinic Organisation"
    );
  });

  return {
    audience: "clinic_organization",
    subjectLabel: organizations[0].name,
    assignments,
  };
}
