import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type DoctorStatus =
  | "pending"
  | "active"
  | "suspended"
  | "rejected";

type DoctorAdminAction =
  | "update_status"
  | "assign_owner"
  | "remove_owner";

type DoctorAdminRequestBody = {
  doctorId?: string;
  action?: DoctorAdminAction;
  status?: DoctorStatus;
  profileId?: string;
};

const allowedStatuses: DoctorStatus[] = [
  "pending",
  "active",
  "suspended",
  "rejected",
];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function PATCH(request: Request) {
  try {
    const body =
      (await request.json()) as DoctorAdminRequestBody;

    const doctorId =
      body.doctorId?.trim();

    if (
      !doctorId ||
      !isUuid(doctorId)
    ) {
      return NextResponse.json(
        {
          error:
            "Identificatorul medicului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (!body.action) {
      return NextResponse.json(
        {
          error:
            "Acțiunea administrativă lipsește.",
        },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: adminProfile,
      error: adminProfileError,
    } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      console.error(
        "Admin doctor action profile lookup failed:",
        adminProfileError
      );

      return NextResponse.json(
        {
          error:
            "Rolul administratorului nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (
      !adminProfile ||
      adminProfile.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Nu ai permisiunea de a modifica medicii.",
        },
        {
          status: 403,
        }
      );
    }

    const {
      data: doctor,
      error: doctorError,
    } = await supabase
      .from("doctors")
      .select(
        "id, profile_id, status"
      )
      .eq("id", doctorId)
      .maybeSingle();

    if (doctorError) {
      console.error(
        "Admin doctor lookup failed:",
        doctorError
      );

      return NextResponse.json(
        {
          error:
            "Medicul nu a putut fi verificat.",
        },
        {
          status: 500,
        }
      );
    }

    if (!doctor) {
      return NextResponse.json(
        {
          error:
            "Medicul nu a fost găsit.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      body.action === "update_status"
    ) {
      if (
        !body.status ||
        !allowedStatuses.includes(
          body.status
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Starea medicului nu este validă.",
          },
          {
            status: 400,
          }
        );
      }

      const { error: updateError } =
        await supabase
          .from("doctors")
          .update({
            status: body.status,
          })
          .eq("id", doctorId);

      if (updateError) {
        console.error(
          "Admin doctor status update failed:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Starea medicului nu a putut fi actualizată.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (
      body.action === "remove_owner"
    ) {
      const { error: removeError } =
        await supabase
          .from("doctors")
          .update({
            profile_id: null,
          })
          .eq("id", doctorId);

      if (removeError) {
        console.error(
          "Admin doctor owner removal failed:",
          removeError
        );

        return NextResponse.json(
          {
            error:
              "Asocierea contului nu a putut fi eliminată.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    if (
      body.action === "assign_owner"
    ) {
      const profileId =
        body.profileId?.trim();

      if (
        !profileId ||
        !isUuid(profileId)
      ) {
        return NextResponse.json(
          {
            error:
              "UUID-ul profilului nu este valid.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: targetProfile,
        error: targetProfileError,
      } = await supabase
        .from("profiles")
        .select(
          "id, role, first_name, last_name"
        )
        .eq("id", profileId)
        .maybeSingle();

      if (targetProfileError) {
        console.error(
          "Admin target profile lookup failed:",
          targetProfileError
        );

        return NextResponse.json(
          {
            error:
              "Profilul selectat nu a putut fi verificat.",
          },
          {
            status: 500,
          }
        );
      }

      if (!targetProfile) {
        return NextResponse.json(
          {
            error:
              "Profilul selectat nu există.",
          },
          {
            status: 404,
          }
        );
      }

      if (
        targetProfile.role !== "doctor"
      ) {
        return NextResponse.json(
          {
            error:
              "Profilul selectat nu are rolul doctor.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        data: existingOwnership,
        error: ownershipError,
      } = await supabase
        .from("doctors")
        .select("id, slug")
        .eq("profile_id", profileId)
        .neq("id", doctorId)
        .maybeSingle();

      if (ownershipError) {
        console.error(
          "Admin doctor ownership check failed:",
          ownershipError
        );

        return NextResponse.json(
          {
            error:
              "Asocierea existentă nu a putut fi verificată.",
          },
          {
            status: 500,
          }
        );
      }

      if (existingOwnership) {
        return NextResponse.json(
          {
            error:
              "Acest profil este deja asociat unui alt medic.",
          },
          {
            status: 409,
          }
        );
      }

      const { error: assignError } =
        await supabase
          .from("doctors")
          .update({
            profile_id: profileId,
          })
          .eq("id", doctorId);

      if (assignError) {
        console.error(
          "Admin doctor owner assignment failed:",
          assignError
        );

        return NextResponse.json(
          {
            error:
              "Profilul nu a putut fi asociat medicului.",
          },
          {
            status: 500,
          }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      {
        error:
          "Acțiunea solicitată nu este acceptată.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Admin doctor API failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "A apărut o eroare neașteptată.",
      },
      {
        status: 500,
      }
    );
  }
}