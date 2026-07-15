import crypto from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE,
  CLINIC_INVITED_DOCTOR_REGISTRATION_SOURCE,
} from "@/lib/doctors/clinic-invited-doctor-registration";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RegisterInviteBody = {
  token?: unknown;
  userId?: unknown;
  email?: unknown;
};

type ClinicDoctorInvitation = {
  id: string;
  organization_id: string;
  clinic_id: string | null;
  doctor_id: string | null;
  invited_doctor_email:
    | string
    | null;
  invitation_status: string;
  accepted_profile_id:
    | string
    | null;
  expires_at: string | null;
};

type AuthUserMetadata = {
  registration_type?: unknown;
  doctor_account_type?: unknown;
  registration_source?: unknown;
  clinic_invite_token?: unknown;
  first_name?: unknown;
  last_name?: unknown;
  phone?: unknown;
  specialty_id?: unknown;
  professional_registration_number?: unknown;
};

function normalizeString(
  value: unknown,
  maximumLength = 500
) {
  return typeof value === "string"
    ? value
        .trim()
        .slice(
          0,
          maximumLength
        )
    : "";
}

function normalizeEmail(
  value: unknown
) {
  return normalizeString(
    value,
    320
  ).toLowerCase();
}

function hashInvitationToken(
  token: string
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function slugify(
  value: string
) {
  return value
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 80);
}

function getMetadataText(
  metadata: AuthUserMetadata,
  key: keyof AuthUserMetadata
) {
  return normalizeString(
    metadata[key],
    200
  );
}

async function createUniqueDoctorSlug({
  admin,
  firstName,
  lastName,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;
  firstName: string;
  lastName: string;
}) {
  const baseSlug =
    slugify(
      `dr-${firstName}-${lastName}`
    ) ||
    `dr-${crypto
      .randomUUID()
      .slice(0, 8)}`;

  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const candidate =
      attempt === 0
        ? baseSlug
        : `${baseSlug}-${attempt + 1}`;

    const {
      data:
        existingDoctor,
      error,
    } = await admin
      .from("doctors")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!existingDoctor) {
      return candidate;
    }
  }

  return `${baseSlug}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
}

async function resolveSingleActiveClinicId({
  admin,
  invitation,
}: {
  admin:
    ReturnType<
      typeof createAdminClient
    >;
  invitation:
    ClinicDoctorInvitation;
}) {
  if (invitation.clinic_id) {
    return invitation.clinic_id;
  }

  const {
    data:
      activeClinicLinks,
    error,
  } = await admin
    .from(
      "clinic_organization_clinics"
    )
    .select("clinic_id")
    .eq(
      "organization_id",
      invitation.organization_id
    )
    .eq("status", "active")
    .order("created_at", {
      ascending: true,
    })
    .limit(2);

  if (error) {
    console.error(
      "Clinic invited doctor active clinic lookup failed:",
      error
    );
    return null;
  }

  if (
    (activeClinicLinks ?? [])
      .length === 1
  ) {
    return (
      activeClinicLinks?.[0]
        ?.clinic_id ??
      null
    );
  }

  return null;
}

function json(
  body: unknown,
  status = 200
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}

export async function POST(
  request: NextRequest
): Promise<Response> {
  let body:
    RegisterInviteBody;

  try {
    body =
      (await request
        .json()) as
        RegisterInviteBody;
  } catch {
    return json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      400
    );
  }

  const token =
    normalizeString(
      body.token,
      500
    );

  const userId =
    normalizeString(
      body.userId,
      100
    );

  const email =
    normalizeEmail(
      body.email
    );

  if (
    !token ||
    !userId ||
    !email
  ) {
    return json(
      {
        error:
          "Datele invitației sunt incomplete.",
      },
      400
    );
  }

  const admin =
    createAdminClient();

  const tokenHash =
    hashInvitationToken(token);

  const {
    data:
      invitationData,
    error:
      invitationError,
  } = await admin
    .from(
      "clinic_doctor_relationships"
    )
    .select(`
      id,
      organization_id,
      clinic_id,
      doctor_id,
      invited_doctor_email,
      invitation_status,
      accepted_profile_id,
      expires_at
    `)
    .eq(
      "invitation_token_hash",
      tokenHash
    )
    .maybeSingle();

  const invitation =
    invitationData as
      | ClinicDoctorInvitation
      | null;

  if (
    invitationError ||
    !invitation
  ) {
    return json(
      {
        error:
          "Invitația nu a fost găsită sau linkul nu este valid.",
      },
      404
    );
  }

  if (
    invitation
      .invitation_status ===
      "accepted" &&
    invitation
      .accepted_profile_id ===
      userId &&
    invitation.doctor_id
  ) {
    return json({
      doctorId:
        invitation.doctor_id,

      invitation,

      message:
        "Contul este deja conectat la invitația clinicii.",
    });
  }

  if (
    invitation
      .invitation_status !==
      "pending"
  ) {
    return json(
      {
        error:
          "Această invitație nu mai este disponibilă.",
      },
      409
    );
  }

  if (
    invitation.expires_at &&
    new Date(
      invitation.expires_at
    ) < new Date()
  ) {
    await admin
      .from(
        "clinic_doctor_relationships"
      )
      .update({
        invitation_status:
          "expired",
      })
      .eq(
        "id",
        invitation.id
      );

    return json(
      {
        error:
          "Această invitație a expirat.",
      },
      409
    );
  }

  const invitedEmail =
    invitation
      .invited_doctor_email
      ?.toLowerCase();

  if (
    !invitedEmail ||
    invitedEmail !== email
  ) {
    return json(
      {
        error:
          "Această invitație a fost trimisă pentru o altă adresă de e-mail.",
      },
      403
    );
  }

  const {
    data:
      authUser,
    error:
      authUserError,
  } =
    await admin.auth.admin
      .getUserById(userId);

  if (
    authUserError ||
    !authUser.user
  ) {
    return json(
      {
        error:
          "Contul creat nu a putut fi verificat.",
      },
      404
    );
  }

  if (
    authUser.user.email
      ?.toLowerCase() !==
    email
  ) {
    return json(
      {
        error:
          "E-mailul contului creat nu corespunde invitației.",
      },
      403
    );
  }

  const metadata =
    (authUser.user
      .user_metadata ??
      {}) as
      AuthUserMetadata;

  if (
    getMetadataText(
      metadata,
      "registration_type"
    ) !==
      "clinic_invited_doctor" ||
    getMetadataText(
      metadata,
      "doctor_account_type"
    ) !==
      CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE ||
    getMetadataText(
      metadata,
      "registration_source"
    ) !==
      CLINIC_INVITED_DOCTOR_REGISTRATION_SOURCE ||
    getMetadataText(
      metadata,
      "clinic_invite_token"
    ) !== token
  ) {
    return json(
      {
        error:
          "Metadatele contului nu corespund unei înregistrări valide prin invitația clinicii.",
      },
      403
    );
  }

  const firstName =
    getMetadataText(
      metadata,
      "first_name"
    );

  const lastName =
    getMetadataText(
      metadata,
      "last_name"
    );

  const phone =
    getMetadataText(
      metadata,
      "phone"
    ) || null;

  const specialtyId =
    getMetadataText(
      metadata,
      "specialty_id"
    );

  const professionalRegistrationNumber =
    getMetadataText(
      metadata,
      "professional_registration_number"
    ) || null;

  if (
    firstName.length < 2 ||
    lastName.length < 2
  ) {
    return json(
      {
        error:
          "Numele medicului lipsește din datele contului.",
      },
      400
    );
  }

  if (!specialtyId) {
    return json(
      {
        error:
          "Specialitatea medicului lipsește din datele contului.",
      },
      400
    );
  }

  const {
    data: specialty,
    error:
      specialtyError,
  } = await admin
    .from("specialties")
    .select("id")
    .eq("id", specialtyId)
    .maybeSingle();

  if (
    specialtyError ||
    !specialty
  ) {
    return json(
      {
        error:
          "Specialitatea selectată nu mai este disponibilă.",
      },
      400
    );
  }

  const {
    data:
      existingDoctor,
    error:
      existingDoctorError,
  } = await admin
    .from("doctors")
    .select(
      "id, slug, account_type"
    )
    .eq(
      "profile_id",
      userId
    )
    .maybeSingle();

  if (
    existingDoctorError
  ) {
    console.error(
      "Clinic invited doctor existing doctor lookup failed:",
      existingDoctorError
    );

    return json(
      {
        error:
          "Profilul de medic existent nu a putut fi verificat.",
      },
      500
    );
  }

  if (existingDoctor) {
    return json(
      {
        error:
          "Acest utilizator are deja un profil de medic. Invitația clinicii necesită o adresă de e-mail și un ID de utilizator separate.",
      },
      409
    );
  }

  const clinicId =
    await resolveSingleActiveClinicId({
      admin,
      invitation,
    });

  const slug =
    await createUniqueDoctorSlug({
      admin,
      firstName,
      lastName,
    });

  const now =
    new Date()
      .toISOString();

  const {
    error:
      profileUpdateError,
  } = await admin
    .from("profiles")
    .update({
      role: "doctor",
      account_status:
        "active",
      first_name: firstName,
      last_name: lastName,
    })
    .eq("id", userId);

  if (
    profileUpdateError
  ) {
    console.error(
      "Clinic invited doctor profile activation failed:",
      profileUpdateError
    );

    return json(
      {
        error:
          "Contul medicului nu a putut fi activat.",
      },
      500
    );
  }

  const {
    data: doctor,
    error:
      doctorInsertError,
  } = await admin
    .from("doctors")
    .insert({
      profile_id: userId,
      slug,
      phone,
      email,

      professional_registration_number:
        professionalRegistrationNumber,

      verification_status:
        "not_submitted",

      account_type:
        CLINIC_INVITED_DOCTOR_ACCOUNT_TYPE,

      clinic_organization_id:
        invitation.organization_id,

      clinic_doctor_relationship_id:
        invitation.id,
    })
    .select("id, slug")
    .maybeSingle();

  if (
    doctorInsertError ||
    !doctor
  ) {
    console.error(
      "Clinic invited doctor profile creation failed:",
      doctorInsertError
    );

    return json(
      {
        error:
          "Profilul medicului invitat de clinică nu a putut fi creat.",
      },
      500
    );
  }

  const {
    error:
      translationError,
  } = await admin
    .from(
      "doctor_translations"
    )
    .upsert(
      {
        doctor_id:
          doctor.id,

        locale: "ro",

        title:
          `Dr. ${firstName} ${lastName}`,

        biography: null,
      },
      {
        onConflict:
          "doctor_id,locale",
      }
    );

  if (translationError) {
    console.error(
      "Clinic invited doctor translation creation failed:",
      translationError
    );
  }

  const {
    error:
      specialtyLinkError,
  } = await admin
    .from(
      "doctor_specialties"
    )
    .upsert(
      {
        doctor_id:
          doctor.id,

        specialty_id:
          specialtyId,
      },
      {
        onConflict:
          "doctor_id,specialty_id",
      }
    );

  if (
    specialtyLinkError
  ) {
    console.error(
      "Clinic invited doctor specialty link failed:",
      specialtyLinkError
    );
  }

  if (clinicId) {
    const {
      error:
        doctorClinicError,
    } = await admin
      .from("doctor_clinics")
      .upsert(
        {
          doctor_id:
            doctor.id,

          clinic_id:
            clinicId,
        },
        {
          onConflict:
            "doctor_id,clinic_id",
        }
      );

    if (
      doctorClinicError
    ) {
      console.error(
        "Clinic invited doctor clinic link failed:",
        doctorClinicError
      );
    }
  }

  const {
    data:
      updatedInvitation,
    error:
      updateError,
  } = await admin
    .from(
      "clinic_doctor_relationships"
    )
    .update({
      doctor_id:
        doctor.id,

      clinic_id:
        clinicId,

      accepted_profile_id:
        userId,

      accepted_account_email:
        email,

      invitation_status:
        "accepted",

      accepted_at: now,

      payment_responsibility:
        "clinic_paid",

      coverage_status:
        "active",

      coverage_started_at:
        now,
    })
    .eq(
      "id",
      invitation.id
    )
    .eq(
      "invitation_status",
      "pending"
    )
    .select(`
      id,
      organization_id,
      clinic_id,
      doctor_id,
      invited_doctor_email,
      accepted_profile_id,
      accepted_account_email,
      invitation_status,
      payment_responsibility,
      coverage_status,
      accepted_at,
      coverage_started_at
    `)
    .maybeSingle();

  if (
    updateError ||
    !updatedInvitation
  ) {
    console.error(
      "Clinic invited doctor registration link failed:",
      updateError
    );

    return json(
      {
        error:
          "Profilul medicului a fost creat, dar invitația clinicii nu a putut fi actualizată. Contactează RomDoc.",
      },
      500
    );
  }

  return json({
    doctor,

    invitation:
      updatedInvitation,

    message:
      "Contul de medic invitat de clinică a fost creat, iar acoperirea plătită de clinică este activă.",
  });
}
