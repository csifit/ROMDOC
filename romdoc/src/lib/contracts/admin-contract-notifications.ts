import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppLocale } from "@/lib/i18n/app-locale";
import { sendContractAssignmentEmail } from "@/lib/contracts/send-contract-assignment-email";

export type ContractNotificationSummary = {
  assignmentId: string;
  sent: number;
  alreadySent: number;
  failed: number;
  warnings: string[];
};

type AssignmentRow = {
  id: string;
  client_type: "independent_doctor" | "clinic_organization";
  doctor_id: string | null;
  clinic_organization_id: string | null;
  acceptance_required: boolean;
  effective_at: string | null;
  package_id: string;
};

type PackageRow = {
  id: string;
  title: string;
  version: string;
  locale: AppLocale;
};

type Recipient = {
  profileId: string | null;
  email: string;
  name: string;
};

type SignatoryProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

function getSiteUrl() {
  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL;

  if (configured?.trim()) return configured.trim().replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }
  return "https://www.romdoc.fit";
}

function safeError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message ?? "Unknown error");
  }
  return String(error);
}

function fullName(firstName: unknown, lastName: unknown, fallback: string) {
  const value = [firstName, lastName]
    .filter(
      (part): part is string =>
        typeof part === "string" && part.trim().length > 0
    )
    .join(" ")
    .trim();
  return value || fallback;
}

async function authEmail(
  admin: SupabaseClient,
  profileId: string
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.getUserById(profileId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function resolveDoctorRecipients(
  admin: SupabaseClient,
  doctorId: string
): Promise<{ clientName: string; recipients: Recipient[] }> {
  const { data: doctor, error } = await admin
    .from("doctors")
    .select("id, profile_id, slug, email, account_type")
    .eq("id", doctorId)
    .maybeSingle();

  if (error) throw error;
  if (!doctor || doctor.account_type !== "independent") {
    throw new Error("The contract target is not an independent Doctor account.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", doctor.profile_id)
    .maybeSingle();

  if (profileError) throw profileError;

  const clientName = fullName(
    profile?.first_name,
    profile?.last_name,
    doctor.slug ?? "Doctor"
  );
  const email =
    (await authEmail(admin, doctor.profile_id)) ?? doctor.email ?? null;

  return {
    clientName,
    recipients: email
      ? [
          {
            profileId: doctor.profile_id,
            email,
            name: clientName,
          },
        ]
      : [],
  };
}

async function resolveOrganizationRecipients(
  admin: SupabaseClient,
  organizationId: string,
  acceptanceRequired: boolean
): Promise<{ clientName: string; recipients: Recipient[] }> {
  const { data: organization, error } = await admin
    .from("clinic_organizations")
    .select("id, name, contact_email")
    .eq("id", organizationId)
    .maybeSingle();

  if (error) throw error;
  if (!organization) throw new Error("Clinic Organisation not found.");

  const { data: members, error: membersError } = await admin
    .from("clinic_organization_members")
    .select("profile_id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .eq("can_sign_contracts", true);

  if (membersError) throw membersError;

  const profileIds = (members ?? []).map((member: { profile_id: string }) => member.profile_id);
  const profilesResult = profileIds.length
    ? await admin
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", profileIds)
    : { data: [], error: null };

  if (profilesResult.error) throw profilesResult.error;

  const profileRows =
    (profilesResult.data ?? []) as
      SignatoryProfileRow[];

  const profileMap =
    new Map<string, SignatoryProfileRow>(
      profileRows.map((profile) => [
        profile.id,
        profile,
      ])
    );
  const recipients: Recipient[] = [];

  for (const profileId of profileIds) {
    const email = await authEmail(admin, profileId);
    if (!email) continue;
    const profile = profileMap.get(profileId);
    recipients.push({
      profileId,
      email,
      name: fullName(
        profile?.first_name,
        profile?.last_name,
        organization.name
      ),
    });
  }

  if (recipients.length === 0 && !acceptanceRequired) {
    const { data: billing } = await admin
      .from("clinic_organization_billing_profiles")
      .select("billing_email")
      .eq("organization_id", organizationId)
      .maybeSingle();

    const fallbackEmail = billing?.billing_email ?? organization.contact_email;
    if (fallbackEmail) {
      recipients.push({
        profileId: null,
        email: fallbackEmail,
        name: organization.name,
      });
    }
  }

  return {
    clientName: organization.name,
    recipients,
  };
}

async function claimDelivery(
  admin: SupabaseClient,
  assignmentId: string,
  recipient: Recipient,
  locale: AppLocale
) {
  const { data, error } = await admin.rpc(
    "claim_contract_assignment_email_delivery",
    {
      target_assignment_id: assignmentId,
      target_recipient_profile_id: recipient.profileId,
      target_recipient_email: recipient.email,
      target_locale: locale,
    }
  );

  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  return {
    deliveryId:
      row && typeof row.delivery_id === "string" ? row.delivery_id : null,
    shouldSend: row?.should_send === true,
  };
}

export async function notifyContractAssignments(input: {
  admin: SupabaseClient;
  adminProfileId: string;
  assignmentIds: string[];
}): Promise<ContractNotificationSummary[]> {
  const assignmentIds = Array.from(new Set(input.assignmentIds));
  if (assignmentIds.length === 0) return [];

  const { data: assignmentsData, error: assignmentsError } = await input.admin
    .from("client_contract_assignments")
    .select(
      "id, client_type, doctor_id, clinic_organization_id, acceptance_required, effective_at, package_id"
    )
    .in("id", assignmentIds);

  if (assignmentsError) throw assignmentsError;

  const assignments = (assignmentsData ?? []) as AssignmentRow[];
  const packageIds = Array.from(
    new Set(assignments.map((assignment) => assignment.package_id))
  );
  const { data: packagesData, error: packagesError } = await input.admin
    .from("contract_packages")
    .select("id, title, version, locale")
    .in("id", packageIds);

  if (packagesError) throw packagesError;

  const packageMap = new Map(
    ((packagesData ?? []) as PackageRow[]).map((item) => [item.id, item])
  );
  const summaries: ContractNotificationSummary[] = [];

  for (const assignment of assignments) {
    const summary: ContractNotificationSummary = {
      assignmentId: assignment.id,
      sent: 0,
      alreadySent: 0,
      failed: 0,
      warnings: [],
    };

    try {
      const contractPackage = packageMap.get(assignment.package_id);
      if (!contractPackage) throw new Error("Contract package not found.");

      const target =
        assignment.client_type === "independent_doctor"
          ? await resolveDoctorRecipients(
              input.admin,
              String(assignment.doctor_id)
            )
          : await resolveOrganizationRecipients(
              input.admin,
              String(assignment.clinic_organization_id),
              assignment.acceptance_required
            );

      if (target.recipients.length === 0) {
        summary.failed += 1;
        summary.warnings.push(
          assignment.acceptance_required
            ? "No authorised contract signatory with an account email was found."
            : "No contract notification email was found."
        );
        summaries.push(summary);
        continue;
      }

      const pagePath =
        assignment.client_type === "independent_doctor"
          ? "/doctor-dashboard/contract"
          : "/clinic-manager-dashboard/contract";

      for (const recipient of target.recipients) {
        try {
          const claim = await claimDelivery(
            input.admin,
            assignment.id,
            recipient,
            contractPackage.locale
          );

          if (!claim.deliveryId) {
            throw new Error("Contract notification delivery claim returned no id.");
          }

          if (!claim.shouldSend) {
            const { data: existing } = await input.admin
              .from("contract_assignment_email_deliveries")
              .select("status")
              .eq("id", claim.deliveryId)
              .maybeSingle();

            if (existing?.status === "sent") summary.alreadySent += 1;
            continue;
          }

          const result = await sendContractAssignmentEmail({
            locale: contractPackage.locale,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            clientName: target.clientName,
            packageTitle: contractPackage.title,
            packageVersion: contractPackage.version,
            acceptanceRequired: assignment.acceptance_required,
            effectiveAt: assignment.effective_at,
            contractPageUrl: `${getSiteUrl()}${pagePath}`,
          });

          const sent = result.sent && Boolean(result.providerMessageId);
          const { error: completionError } = await input.admin.rpc(
            "complete_contract_assignment_email_delivery",
            {
              target_delivery_id: claim.deliveryId,
              target_sent: sent,
              target_provider_message_id: sent
                ? result.providerMessageId
                : null,
              target_error: sent ? null : result.errorMessage,
            }
          );

          if (completionError) throw completionError;

          if (sent) {
            summary.sent += 1;
          } else {
            summary.failed += 1;
            summary.warnings.push(
              result.errorMessage ?? "Contract notification email failed."
            );
          }
        } catch (recipientError) {
          summary.failed += 1;
          summary.warnings.push(safeError(recipientError));
        }
      }

      const deliveredCount = summary.sent + summary.alreadySent;
      if (deliveredCount > 0) {
        const { error: statusError } = await input.admin.rpc(
          "admin_mark_contract_assignment_notified",
          {
            target_admin_profile_id: input.adminProfileId,
            target_assignment_id: assignment.id,
            target_sent_recipient_count: deliveredCount,
          }
        );
        if (statusError) summary.warnings.push(safeError(statusError));
      }
    } catch (assignmentError) {
      summary.failed += 1;
      summary.warnings.push(safeError(assignmentError));
    }

    summaries.push(summary);
  }

  return summaries;
}
