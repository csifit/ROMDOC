import SaveDoctorButton from "@/components/patient/save-doctor-button";
import {
  createClient,
} from "@/lib/supabase/server";

type DoctorProfileSaveControlProps = {
  doctorId: string;
  doctorName: string;
};

function normalizeCount(
  value: unknown
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return Math.max(
      0,
      Math.trunc(value)
    );
  }

  if (
    typeof value === "string"
  ) {
    const parsed =
      Number(value);

    if (
      Number.isFinite(parsed)
    ) {
      return Math.max(
        0,
        Math.trunc(parsed)
      );
    }
  }

  return null;
}

export default async function DoctorProfileSaveControl({
  doctorId,
  doctorName,
}: DoctorProfileSaveControlProps) {
  const supabase =
    await createClient();

  const [
    savedCountResult,
    userResult,
  ] = await Promise.all([
    supabase.rpc(
      "get_doctor_saved_count",
      {
        target_doctor_id:
          doctorId,
      }
    ),
    supabase.auth.getUser(),
  ]);

  if (
    savedCountResult.error
  ) {
    console.error(
      "Doctor profile saved count failed:",
      savedCountResult.error
    );
  }

  const user =
    userResult.data.user;

  let initialIsSaved:
    boolean | null = null;

  if (
    user
  ) {
    const {
      data:
        savedDoctor,
      error:
        savedDoctorError,
    } = await supabase
      .from(
        "patient_saved_doctors"
      )
      .select(
        "doctor_id"
      )
      .eq(
        "patient_profile_id",
        user.id
      )
      .eq(
        "doctor_id",
        doctorId
      )
      .maybeSingle();

    if (
      savedDoctorError
    ) {
      console.error(
        "Doctor profile saved state failed:",
        savedDoctorError
      );
    } else {
      initialIsSaved =
        Boolean(
          savedDoctor
        );
    }
  }

  return (
    <SaveDoctorButton
      doctorId={doctorId}
      doctorName={doctorName}
      initialIsSaved={
        initialIsSaved
      }
      initialSavedCount={
        normalizeCount(
          savedCountResult.data
        )
      }
      showSavedCount
    />
  );
}
