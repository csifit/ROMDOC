"use client";

import {
  useTranslations,
} from "next-intl";

type PlatformOperatorRouteStateProps =
  | {
      mode:
        "loading";
      reset?:
        never;
    }
  | {
      mode:
        "error";
      reset:
        () => void;
    };

export default function PlatformOperatorRouteState(
  props:
    PlatformOperatorRouteStateProps
) {
  const t =
    useTranslations(
      "PlatformOperatorFoundation.states"
    );

  if (
    props.mode ===
    "loading"
  ) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-5"
      >
        <p className="text-sm font-semibold text-[#036661]">
          {t(
            "loading"
          )}
        </p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length:
              6,
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                aria-hidden="true"
                className="h-28 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm"
              />
            )
          )}
        </div>
      </div>
    );
  }

  return (
    <section
      role="alert"
      className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-950 shadow-sm"
    >
      <h1 className="text-2xl font-bold">
        {t(
          "errorTitle"
        )}
      </h1>

      <p className="mt-3 text-sm leading-6 text-red-900">
        {t(
          "errorDescription"
        )}
      </p>

      <button
        type="button"
        onClick={
          props.reset
        }
        className="romdoc-focus-ring mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800"
      >
        {t(
          "tryAgain"
        )}
      </button>
    </section>
  );
}
