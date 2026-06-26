import {
  revalidatePath,
} from "next/cache";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireAdministratorCapability,
  requirePlatformOperatorAal2Api,
} from "@/lib/auth/require-platform-operator-aal2-api";
import {
  getLegalPageDefinition,
  isLegalPageKey,
} from "@/lib/legal/legal-pages";
import {
  sameOriginErrorResponse,
  validateSameOrigin,
} from "@/lib/security/same-origin";
import {
  createAdminClient,
} from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAXIMUM_CONTENT_LENGTH =
  100_000;

type UpdateLegalPageBody = {
  pageKey?: unknown;
  content?: unknown;
};

export async function PATCH(
  request: NextRequest
): Promise<Response> {
  if (!validateSameOrigin(request)) {
    return sameOriginErrorResponse();
  }

  const authorization =
    await requirePlatformOperatorAal2Api();

  if (authorization.response) {
    return authorization.response;
  }

  const administratorError =
    requireAdministratorCapability(
      authorization.role,
      "Doar administratorii pot modifica documentele legale."
    );

  if (administratorError) {
    return administratorError;
  }

  let body: UpdateLegalPageBody;

  try {
    body =
      (await request.json()) as
        UpdateLegalPageBody;
  } catch {
    return NextResponse.json(
      {
        error:
          "Cererea nu conține date JSON valide.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  if (!isLegalPageKey(body.pageKey)) {
    return NextResponse.json(
      {
        error:
          "Documentul legal selectat nu este valid.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  if (typeof body.content !== "string") {
    return NextResponse.json(
      {
        error:
          "Textul documentului lipsește.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const content =
    body.content.trim();

  if (content.length < 20) {
    return NextResponse.json(
      {
        error:
          "Textul documentului este prea scurt.",
      },
      {
        status: 400,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  if (
    content.length >
    MAXIMUM_CONTENT_LENGTH
  ) {
    return NextResponse.json(
      {
        error:
          "Textul documentului depășește limita de 100.000 de caractere.",
      },
      {
        status: 413,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const definition =
    getLegalPageDefinition(
      body.pageKey
    );
  const updatedAt =
    new Date().toISOString();
  const admin =
    createAdminClient();

  const {
    data,
    error,
  } = await admin
    .from("legal_pages")
    .upsert(
      {
        page_key:
          definition.key,
        title:
          definition.title,
        content,
        is_published: true,
        updated_at:
          updatedAt,
        updated_by_profile_id:
          authorization.profileId,
      },
      {
        onConflict: "page_key",
      }
    )
    .select(`
      page_key,
      content,
      updated_at
    `)
    .single();

  if (error || !data) {
    console.error(
      "Legal page update failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Documentul legal nu a putut fi salvat.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  revalidatePath(
    definition.route
  );
  revalidatePath(
    "/admin/privacy"
  );

  return NextResponse.json(
    {
      message:
        "Documentul legal a fost actualizat.",
      page: {
        key: definition.key,
        content: data.content,
        updatedAt:
          data.updated_at,
      },
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
