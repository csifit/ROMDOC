import {
  NextRequest,
  NextResponse,
} from "next/server";

function getBearerToken(
  request: NextRequest
) {
  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    !authorization ||
    !authorization.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authorization
    .slice("Bearer ".length)
    .trim();
}

export function
validateCronRequest(
  request: NextRequest
) {
  const expected =
    process.env.CRON_SECRET;

  if (!expected) {
    console.error(
      "CRON_SECRET is not configured."
    );

    return false;
  }

  const supplied =
    getBearerToken(
      request
    );

  return supplied === expected;
}

export function
cronUnauthorizedResponse() {
  return NextResponse.json(
    {
      error:
        "Cron authorization failed.",
    },
    {
      status: 401,
      headers: {
        "Cache-Control":
          "no-store",
      },
    }
  );
}
