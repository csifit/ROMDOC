import {
  NextResponse,
} from "next/server";

export type StableApiErrorPayload<
  Code extends string = string,
> = {
  success: false;
  code: Code;
  error: string;
  details?:
    Record<string, unknown>;
};

export type StableApiSuccessPayload<
  Code extends string = string,
  Data extends
    Record<string, unknown> =
      Record<string, never>,
> = {
  success: true;
  code: Code;
} & Data;

const NO_STORE_HEADERS = {
  "Cache-Control":
    "no-store",
} as const;

export function stableApiError<
  Code extends string,
>(
  code: Code,
  error: string,
  status: number,
  details?:
    Record<string, unknown>
) {
  const payload:
    StableApiErrorPayload<Code> = {
      success: false,
      code,
      error,
      ...(details
        ? {
            details,
          }
        : {}),
    };

  return NextResponse.json(
    payload,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}

export function stableApiSuccess<
  Code extends string,
  Data extends
    Record<string, unknown>,
>(
  code: Code,
  data: Data,
  status = 200
) {
  const payload:
    StableApiSuccessPayload<
      Code,
      Data
    > = {
      success: true,
      code,
      ...data,
    };

  return NextResponse.json(
    payload,
    {
      status,
      headers:
        NO_STORE_HEADERS,
    }
  );
}
