import {
  createAdminClient,
} from "@/lib/supabase/admin";

function slugify(
  value: string
): string {
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
    );
}

export async function createUniqueInvitedDoctorSlug(
  firstName: string,
  lastName: string,
  profileId: string
): Promise<string> {
  const admin =
    createAdminClient();

  const fullName = [
    firstName,
    lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const baseSlug =
    slugify(
      fullName
        ? `dr-${fullName}`
        : `medic-${profileId.slice(
            0,
            8
          )}`
    ) || `medic-${profileId.slice(
      0,
      8
    )}`;

  let candidate =
    baseSlug;
  let suffix = 2;

  while (true) {
    const {
      data,
      error,
    } = await admin
      .from("doctors")
      .select("id")
      .eq(
        "slug",
        candidate
      )
      .maybeSingle();

    if (error) {
      throw new Error(
        `Doctor slug lookup failed: ${error.message}`
      );
    }

    if (!data) {
      return candidate;
    }

    candidate =
      `${baseSlug}-${suffix}`;

    suffix += 1;
  }
}

export function getInvitationIdFromUserMetadata(
  metadata: Record<
    string,
    unknown
  > | null | undefined
): string | null {
  const value =
    metadata?.doctor_invitation_id;

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}
