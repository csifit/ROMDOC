import {
  getTranslations,
} from "next-intl/server";

import DoctorInvitationsPanel from "@/components/clinic-manager/doctor-invitations-panel";
import {
  getStoredAppLocale,
} from "@/lib/i18n/server-app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

type ClinicOrganizationOption = {
  id: string;
  name: string;
  status: string;
};

type OrganizationMember = {
  organization_id: string;
};

type DoctorInvitation = {
  id: string;
  organization_id: string;

  invited_doctor_email:
    | string
    | null;

  invitation_status: string;
  payment_responsibility: string;
  coverage_status: string;

  expires_at:
    | string
    | null;

  created_at: string;
};

export default async function ClinicManagerInvitationsPage() {
  const locale =
    await getStoredAppLocale();

  const t =
    await getTranslations({
      locale,
      namespace:
        "ClinicOrganisationDashboard.invitationsPage",
    });

  const supabase =
    await createClient();

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser();

  const profileId =
    user?.id;

  const {
    data:
      memberships,
  } =
    profileId
      ? await supabase
          .from(
            "clinic_organization_members"
          )
          .select(
            "organization_id"
          )
          .eq(
            "profile_id",
            profileId
          )
          .eq(
            "status",
            "active"
          )
      : {
          data:
            [],
        };

  const activeMemberships =
    (
      memberships ??
      []
    ) as
      OrganizationMember[];

  const organizationIds =
    activeMemberships.map(
      (
        membership
      ) =>
        membership.organization_id
    );

  let organizations:
    ClinicOrganizationOption[] =
    [];

  let invitations:
    DoctorInvitation[] =
    [];

  if (
    organizationIds.length >
    0
  ) {
    const [
      organizationsResult,
      invitationsResult,
    ] =
      await Promise.all([
        supabase
          .from(
            "clinic_organizations"
          )
          .select(
            "id, name, status"
          )
          .in(
            "id",
            organizationIds
          )
          .order(
            "name",
            {
              ascending:
                true,
            }
          ),

        supabase
          .from(
            "clinic_doctor_relationships"
          )
          .select(`
            id,
            organization_id,
            invited_doctor_email,
            invitation_status,
            payment_responsibility,
            coverage_status,
            expires_at,
            created_at
          `)
          .in(
            "organization_id",
            organizationIds
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          ),
      ]);

    organizations =
      (
        organizationsResult.data ??
        []
      ) as
        ClinicOrganizationOption[];

    invitations =
      (
        invitationsResult.data ??
        []
      ) as
        DoctorInvitation[];
  }

  return (
    <div className="space-y-[21px]">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          {t(
            "eyebrow"
          )}
        </p>

        <h1 className="mt-[8px] text-3xl font-bold text-gray-900">
          {t(
            "title"
          )}
        </h1>

        <p className="mt-[13px] max-w-3xl text-sm leading-6 text-gray-600">
          {t(
            "description"
          )}
        </p>
      </header>

      <DoctorInvitationsPanel
        organizations={
          organizations
        }
        invitations={
          invitations
        }
      />
    </div>
  );
}
