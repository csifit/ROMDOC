import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupportedCurrency =
  | "RON"
  | "EUR";

type CreateServiceRequestBody = {
  name?: string;
  price?: number;
  currency?: SupportedCurrency;
  sortOrder?: number;
};

type UpdateServiceRequestBody = {
  serviceId?: string;
  name?: string;
  price?: number;
  currency?: SupportedCurrency;
  sortOrder?: number;
  isActive?: boolean;
};

type DeleteServiceRequestBody = {
  serviceId?: string;
};

const allowedCurrencies:
  SupportedCurrency[] = [
    "RON",
    "EUR",
  ];

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validateServiceName(
  value: unknown
) {
  if (typeof value !== "string") {
    return null;
  }

  const name = value.trim();

  if (
    name.length < 2 ||
    name.length > 200
  ) {
    return null;
  }

  return name;
}

function validatePrice(
  value: unknown
) {
  const price = Number(value);

  if (
    !Number.isFinite(price) ||
    price < 0 ||
    price > 100000
  ) {
    return null;
  }

  return Math.round(price * 100) / 100;
}

function validateSortOrder(
  value: unknown
) {
  const sortOrder = Number(value);

  if (
    !Number.isInteger(sortOrder) ||
    sortOrder < 0 ||
    sortOrder > 10000
  ) {
    return null;
  }

  return sortOrder;
}

async function getAuthenticatedDoctor() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Trebuie să fii autentificat.",
        },
        {
          status: 401,
        }
      ),
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "doctor"
  ) {
    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Doar medicii își pot administra serviciile.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  const {
    data: doctor,
    error: doctorError,
  } = await supabase
    .from("doctors")
    .select("id, profile_id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (doctorError || !doctor) {
    console.error(
      "Doctor services ownership lookup failed:",
      doctorError
    );

    return {
      supabase,
      errorResponse: NextResponse.json(
        {
          error:
            "Profilul medicului nu a putut fi verificat.",
        },
        {
          status: 403,
        }
      ),
    };
  }

  return {
    supabase,
    doctor,
    errorResponse: null,
  };
}

async function verifyOwnedService(
  serviceId: string
) {
  const {
    supabase,
    doctor,
    errorResponse,
  } = await getAuthenticatedDoctor();

  if (errorResponse || !doctor) {
    return {
      supabase,
      doctor: null,
      service: null,
      errorResponse,
    };
  }

  const {
    data: service,
    error: serviceError,
  } = await supabase
    .from("doctor_services")
    .select(
      "id, doctor_id, is_active"
    )
    .eq("id", serviceId)
    .eq("doctor_id", doctor.id)
    .maybeSingle();

  if (serviceError) {
    console.error(
      "Doctor service ownership verification failed:",
      serviceError
    );

    return {
      supabase,
      doctor,
      service: null,
      errorResponse:
        NextResponse.json(
          {
            error:
              "Serviciul nu a putut fi verificat.",
          },
          {
            status: 500,
          }
        ),
    };
  }

  if (!service) {
    return {
      supabase,
      doctor,
      service: null,
      errorResponse:
        NextResponse.json(
          {
            error:
              "Serviciul nu există sau nu îți aparține.",
          },
          {
            status: 404,
          }
        ),
    };
  }

  return {
    supabase,
    doctor,
    service,
    errorResponse: null,
  };
}

export async function POST(
  request: Request
) {
  try {
    const body =
      (await request.json()) as CreateServiceRequestBody;

    const name =
      validateServiceName(body.name);

    const price =
      validatePrice(body.price);

    const currency =
      body.currency ?? "RON";

    const sortOrder =
      body.sortOrder === undefined
        ? 0
        : validateSortOrder(
            body.sortOrder
          );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Numele serviciului trebuie să conțină între 2 și 200 de caractere.",
        },
        {
          status: 400,
        }
      );
    }

    if (price === null) {
      return NextResponse.json(
        {
          error:
            "Prețul serviciului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedCurrencies.includes(
        currency
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Moneda selectată nu este acceptată.",
        },
        {
          status: 400,
        }
      );
    }

    if (sortOrder === null) {
      return NextResponse.json(
        {
          error:
            "Ordinea serviciului nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      supabase,
      doctor,
      errorResponse,
    } = await getAuthenticatedDoctor();

    if (errorResponse || !doctor) {
      return errorResponse;
    }

    const serviceId =
      crypto.randomUUID();

    const {
      error: serviceInsertError,
    } = await supabase
      .from("doctor_services")
      .insert({
        id: serviceId,
        doctor_id: doctor.id,
        price,
        currency,
        sort_order: sortOrder,
        is_active: true,
      });

    if (serviceInsertError) {
      console.error(
        "Doctor service insert failed:",
        serviceInsertError
      );

      return NextResponse.json(
        {
          error:
            "Serviciul nu a putut fi adăugat.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: translationInsertError,
    } = await supabase
      .from(
        "doctor_service_translations"
      )
      .insert({
        doctor_service_id:
          serviceId,
        locale: "ro",
        name,
      });

    if (translationInsertError) {
      console.error(
        "Doctor service translation insert failed:",
        translationInsertError
      );

      const {
        error: cleanupError,
      } = await supabase
        .from("doctor_services")
        .delete()
        .eq("id", serviceId)
        .eq(
          "doctor_id",
          doctor.id
        );

      if (cleanupError) {
        console.error(
          "Doctor service cleanup failed:",
          cleanupError
        );
      }

      return NextResponse.json(
        {
          error:
            "Denumirea serviciului nu a putut fi salvată.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        serviceId,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Doctor service creation API failed:",
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

export async function PATCH(
  request: Request
) {
  try {
    const body =
      (await request.json()) as UpdateServiceRequestBody;

    const serviceId =
      body.serviceId?.trim();

    if (
      !serviceId ||
      !isUuid(serviceId)
    ) {
      return NextResponse.json(
        {
          error:
            "Identificatorul serviciului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const name =
      validateServiceName(body.name);

    const price =
      validatePrice(body.price);

    const currency =
      body.currency ?? "RON";

    const sortOrder =
      body.sortOrder === undefined
        ? 0
        : validateSortOrder(
            body.sortOrder
          );

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Numele serviciului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (price === null) {
      return NextResponse.json(
        {
          error:
            "Prețul serviciului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !allowedCurrencies.includes(
        currency
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Moneda selectată nu este acceptată.",
        },
        {
          status: 400,
        }
      );
    }

    if (sortOrder === null) {
      return NextResponse.json(
        {
          error:
            "Ordinea serviciului nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body.isActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          error:
            "Starea serviciului nu este validă.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      supabase,
      doctor,
      errorResponse,
    } = await verifyOwnedService(
      serviceId
    );

    if (
      errorResponse ||
      !doctor
    ) {
      return errorResponse;
    }

    const {
      error: serviceUpdateError,
    } = await supabase
      .from("doctor_services")
      .update({
        price,
        currency,
        sort_order: sortOrder,
        is_active: body.isActive,
      })
      .eq("id", serviceId)
      .eq(
        "doctor_id",
        doctor.id
      );

    if (serviceUpdateError) {
      console.error(
        "Doctor service update failed:",
        serviceUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Serviciul nu a putut fi actualizat.",
        },
        {
          status: 500,
        }
      );
    }

    const {
      error: translationUpdateError,
    } = await supabase
      .from(
        "doctor_service_translations"
      )
      .upsert(
        {
          doctor_service_id:
            serviceId,
          locale: "ro",
          name,
        },
        {
          onConflict:
            "doctor_service_id,locale",
        }
      );

    if (translationUpdateError) {
      console.error(
        "Doctor service translation update failed:",
        translationUpdateError
      );

      return NextResponse.json(
        {
          error:
            "Prețul a fost salvat, dar denumirea serviciului nu a putut fi actualizată.",
          partialSuccess: true,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Doctor service update API failed:",
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

export async function DELETE(
  request: Request
) {
  try {
    const body =
      (await request.json()) as DeleteServiceRequestBody;

    const serviceId =
      body.serviceId?.trim();

    if (
      !serviceId ||
      !isUuid(serviceId)
    ) {
      return NextResponse.json(
        {
          error:
            "Identificatorul serviciului nu este valid.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      supabase,
      doctor,
      errorResponse,
    } = await verifyOwnedService(
      serviceId
    );

    if (
      errorResponse ||
      !doctor
    ) {
      return errorResponse;
    }

    const {
      error: deleteError,
    } = await supabase
      .from("doctor_services")
      .delete()
      .eq("id", serviceId)
      .eq(
        "doctor_id",
        doctor.id
      );

    if (deleteError) {
      console.error(
        "Doctor service deletion failed:",
        deleteError
      );

      return NextResponse.json(
        {
          error:
            "Serviciul nu a putut fi șters.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Doctor service deletion API failed:",
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