"use client";

import Link from "next/link";
import type {
  ReactNode,
} from "react";

type FallbackTone =
  | "neutral"
  | "warning"
  | "error";

type FallbackAction = {
  href: string;
  label: string;
  primary?: boolean;
};

type PublicFallbackStateProps = {
  eyebrow?: string;
  title: string;
  description: string;
  details?: string;
  icon?: ReactNode;
  tone?: FallbackTone;
  actions?: FallbackAction[];
  onRetry?: () => void;
  retryLabel?: string;
};

const toneClasses:
  Record<
    FallbackTone,
    {
      icon: string;
      border: string;
    }
  > = {
    neutral: {
      icon:
        "bg-[#036661]/10 text-[#036661]",
      border:
        "border-gray-200",
    },
    warning: {
      icon:
        "bg-amber-100 text-amber-800",
      border:
        "border-amber-200",
    },
    error: {
      icon:
        "bg-red-100 text-red-800",
      border:
        "border-red-200",
    },
  };

export default function PublicFallbackState({
  eyebrow,
  title,
  description,
  details,
  icon = "!",
  tone = "neutral",
  actions = [],
  onRetry,
  retryLabel,
}: PublicFallbackStateProps) {
  const classes =
    toneClasses[tone];

  return (
    <section
      role={
        tone === "error"
          ? "alert"
          : "status"
      }
      className={[
        "romdoc-card mx-auto w-full max-w-2xl border p-[21px] text-center sm:p-[34px]",
        classes.border,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "mx-auto flex h-[55px] w-[55px] items-center justify-center rounded-full text-2xl font-bold",
          classes.icon,
        ].join(" ")}
      >
        {icon}
      </div>

      {eyebrow ? (
        <p className="mt-[21px] text-sm font-semibold uppercase tracking-[0.16em] text-[#036661]">
          {eyebrow}
        </p>
      ) : null}

      <h1
        className={[
          eyebrow
            ? "mt-[8px]"
            : "mt-[21px]",
          "text-3xl font-bold tracking-tight text-gray-900",
        ].join(" ")}
      >
        {title}
      </h1>

      <p className="mx-auto mt-[13px] max-w-xl text-base leading-7 text-gray-600">
        {description}
      </p>

      {details ? (
        <p className="mx-auto mt-[8px] max-w-xl text-sm leading-6 text-gray-500">
          {details}
        </p>
      ) : null}

      {onRetry ||
      actions.length > 0 ? (
        <div className="mt-[21px] flex flex-col justify-center gap-[8px] sm:flex-row sm:flex-wrap">
          {onRetry &&
          retryLabel ? (
            <button
              type="button"
              onClick={onRetry}
              className="romdoc-button romdoc-button-primary justify-center"
            >
              {retryLabel}
            </button>
          ) : null}

          {actions.map(
            (
              action
            ) => (
              <Link
                key={`${action.href}-${action.label}`}
                href={
                  action.href
                }
                className={[
                  "romdoc-button justify-center",
                  action.primary
                    ? "romdoc-button-primary"
                    : "romdoc-button-secondary",
                ].join(" ")}
              >
                {
                  action.label
                }
              </Link>
            )
          )}
        </div>
      ) : null}
    </section>
  );
}
