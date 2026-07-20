import type {
  EmailOtpType,
} from "@supabase/supabase-js";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  normalizeAppLocale,
} from "@/lib/i18n/app-locale";
import {
  createClient,
} from "@/lib/supabase/server";

function getSafeNextPath(
  value:
    | string
    | null
) {
  if (
    !value ||
    !value.startsWith(
      "/"
    ) ||
    value.startsWith(
      "//"
    )
  ) {
    return "/dashboard";
  }

  return value;
}

export async function GET(
  request: NextRequest
) {
  const requestUrl =
    new URL(
      request.url
    );

  const locale =
    normalizeAppLocale(
      requestUrl
        .searchParams
        .get("locale")
    );

  const code =
    requestUrl
      .searchParams
      .get("code");

  const tokenHash =
    requestUrl
      .searchParams
      .get(
        "token_hash"
      );

  const type =
    requestUrl
      .searchParams
      .get(
        "type"
      ) as
        | EmailOtpType
        | null;

  const nextPath =
    getSafeNextPath(
      requestUrl
        .searchParams
        .get("next")
    );

  const supabase =
    await createClient();

  if (code) {
    const {
      error,
    } =
      await supabase
        .auth
        .exchangeCodeForSession(
          code
        );

    if (!error) {
      return NextResponse
        .redirect(
          new URL(
            nextPath,
            requestUrl.origin
          )
        );
    }

    console.error(
      "Confirmation code exchange failed:",
      error
    );
  }

  if (
    tokenHash &&
    type
  ) {
    const {
      error,
    } =
      await supabase
        .auth
        .verifyOtp({
          token_hash:
            tokenHash,

          type,
        });

    if (!error) {
      return NextResponse
        .redirect(
          new URL(
            nextPath,
            requestUrl.origin
          )
        );
    }

    console.error(
      "Confirmation OTP failed:",
      error
    );
  }

  const errorUrl =
    new URL(
      "/login",
      requestUrl.origin
    );

  errorUrl.searchParams
    .set(
      "locale",
      locale
    );

  errorUrl.searchParams
    .set(
      "error",
      "confirmation_failed"
    );

  errorUrl.searchParams
    .set(
      "next",
      nextPath
    );

  return NextResponse
    .redirect(
      errorUrl
    );
}
