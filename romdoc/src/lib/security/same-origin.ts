import {
  NextRequest,
  NextResponse,
} from "next/server";

function normalizedOrigin(
  value: string
) {
  return value
    .trim()
    .replace(/\/+$/, "");
}

function allowedOrigins(
  request: NextRequest
) {
  const origins =
    new Set<string>();

  origins.add(
    normalizedOrigin(
      request.nextUrl.origin
    )
  );

  const configured =
    process.env
      .NEXT_PUBLIC_SITE_URL;

  if (configured) {
    origins.add(
      normalizedOrigin(
        configured
      )
    );
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    origins.add(
      "http://localhost:3000"
    );
    origins.add(
      "http://127.0.0.1:3000"
    );
  }

  return origins;
}

export function
validateSameOrigin(
  request: NextRequest
) {
  const origin =
    request.headers.get(
      "origin"
    );

  if (!origin) {
    return false;
  }

  return allowedOrigins(
    request
  ).has(
    normalizedOrigin(
      origin
    )
  );
}

export function
sameOriginErrorResponse() {
  return NextResponse.json(
    {
      error:
        "Originea cererii nu este permisă.",
    },
    {
      status: 403,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
