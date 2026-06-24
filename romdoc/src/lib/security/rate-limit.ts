import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

type RateLimitRpcRow = {
  allowed: boolean;
  remaining: number;
  retry_after_seconds: number;
};

export type RateLimitOptions = {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function normalizeKeyPart(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9:_@.\-]/g,
      "_"
    )
    .slice(0, 180);
}

export function getRequestIp(
  request: NextRequest
) {
  const forwarded =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwarded) {
    return (
      forwarded
        .split(",")[0]
        ?.trim() ||
      "unknown"
    );
  }

  return (
    request.headers.get(
      "x-real-ip"
    ) ||
    request.headers.get(
      "cf-connecting-ip"
    ) ||
    "unknown"
  );
}

export async function
consumeRateLimit({
  namespace,
  identifier,
  limit,
  windowSeconds,
}: RateLimitOptions):
  Promise<RateLimitResult> {
  const admin =
    createAdminClient();

  const key =
    [
      normalizeKeyPart(
        namespace
      ),
      normalizeKeyPart(
        identifier
      ),
    ].join(":");

  const {
    data,
    error,
  } = await admin.rpc(
    "consume_api_rate_limit",
    {
      p_key: key,
      p_limit: limit,
      p_window_seconds:
        windowSeconds,
    }
  );

  if (error) {
    console.error(
      "Rate-limit RPC failed:",
      error
    );

    // Fail closed for mutation endpoints.
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    };
  }

  const row =
    Array.isArray(data)
      ? (
          data[0] as
            | RateLimitRpcRow
            | undefined
        )
      : (
          data as
            | RateLimitRpcRow
            | null
        );

  return {
    allowed:
      row?.allowed === true,
    remaining:
      Number(
        row?.remaining ?? 0
      ),
    retryAfterSeconds:
      Number(
        row
          ?.retry_after_seconds ??
          0
      ),
  };
}

export function
rateLimitResponse(
  result: RateLimitResult
) {
  return NextResponse.json(
    {
      error:
        "Ai trimis prea multe cereri. Încearcă din nou mai târziu.",
      retryAfterSeconds:
        result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After":
          String(
            Math.max(
              result
                .retryAfterSeconds,
              1
            )
          ),
        "Cache-Control":
          "no-store",
        "X-RateLimit-Remaining":
          String(
            Math.max(
              result.remaining,
              0
            )
          ),
      },
    }
  );
}
