import Link from "next/link";
import type {
  ReactNode,
} from "react";

type OverviewTone =
  | "default"
  | "attention"
  | "success";

type OverviewMetricCardProps = {
  label: string;
  value: number;
  description: string;
  href?: string;
  badge?: string;
  tone?: OverviewTone;
};

type OverviewAccordionProps = {
  title: string;
  description?: string;
  badge?: number | string;
  attention?: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
};

type OverviewActionCardProps = {
  href: string;
  title: string;
  description: string;
  actionLabel: string;
};

type OverviewActionLinkProps = {
  href: string;
  title: string;
  description: string;
  actionLabel: string;
};

function metricClasses(
  tone: OverviewTone
) {
  if (
    tone ===
    "attention"
  ) {
    return "border-amber-200 bg-amber-50";
  }

  if (
    tone ===
    "success"
  ) {
    return "border-emerald-200 bg-emerald-50";
  }

  return "border-gray-200 bg-white";
}

export function OverviewMetricCard({
  label,
  value,
  description,
  href,
  badge,
  tone = "default",
}: OverviewMetricCardProps) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-[13px]">
        <p className="text-sm font-semibold text-gray-700">
          {
            label
          }
        </p>

        {badge &&
          value > 0 && (
          <span className="shrink-0 rounded-full bg-amber-100 px-[13px] py-[5px] text-xs font-semibold text-amber-950">
            {
              badge
            }
          </span>
        )}
      </div>

      <p className="mt-[13px] text-3xl font-bold tracking-tight text-gray-950">
        {
          value
        }
      </p>

      <p className="mt-[8px] text-sm leading-[1.55] text-gray-600">
        {
          description
        }
      </p>
    </>
  );

  const className =
    `rounded-[13px] border p-[21px] shadow-sm ${metricClasses(tone)}`;

  if (
    href
  ) {
    return (
      <Link
        href={
          href
        }
        className={`romdoc-focus-ring block transition hover:-translate-y-0.5 hover:border-[#036661]/40 hover:shadow-md ${className}`}
      >
        {
          content
        }
      </Link>
    );
  }

  return (
    <div
      className={
        className
      }
    >
      {
        content
      }
    </div>
  );
}

export function OverviewAccordion({
  title,
  description,
  badge,
  attention = false,
  defaultOpen = false,
  children,
}: OverviewAccordionProps) {
  return (
    <details
      open={
        defaultOpen
      }
      className={`group rounded-[13px] border bg-white shadow-sm ${
        attention
          ? "border-amber-200"
          : "border-gray-200"
      }`}
    >
      <summary className="romdoc-focus-ring flex cursor-pointer list-none items-center justify-between gap-[13px] rounded-[13px] px-[21px] py-[13px] marker:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[8px]">
            <h2 className="text-lg font-bold text-gray-950">
              {
                title
              }
            </h2>

            {badge !==
              undefined && (
              <span
                className={`rounded-full px-[8px] py-[3px] text-xs font-semibold ${
                  attention
                    ? "bg-amber-100 text-amber-950"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {
                  badge
                }
              </span>
            )}
          </div>

          {description && (
            <p className="mt-[5px] text-sm leading-[1.55] text-gray-600">
              {
                description
              }
            </p>
          )}
        </div>

        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-[21px] w-[21px] shrink-0 text-gray-500 transition group-open:rotate-180"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m6 9 6 6 6-6"
          />
        </svg>
      </summary>

      <div className="border-t border-gray-100 px-[21px] py-[21px]">
        {
          children
        }
      </div>
    </details>
  );
}

export function OverviewActionCard({
  href,
  title,
  description,
  actionLabel,
}: OverviewActionCardProps) {
  return (
    <Link
      href={
        href
      }
      className="romdoc-focus-ring group rounded-[13px] border border-gray-200 bg-white p-[21px] shadow-sm transition hover:-translate-y-0.5 hover:border-[#036661]/40 hover:shadow-md"
    >
      <h2 className="text-lg font-bold text-gray-950">
        {
          title
        }
      </h2>

      <p className="mt-[8px] text-sm leading-[1.55] text-gray-600">
        {
          description
        }
      </p>

      <span className="mt-[13px] inline-flex items-center gap-[5px] text-sm font-semibold text-[#036661]">
        {
          actionLabel
        }

        <span
          aria-hidden="true"
          className="transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}

export function OverviewActionLink({
  href,
  title,
  description,
  actionLabel,
}: OverviewActionLinkProps) {
  return (
    <Link
      href={
        href
      }
      className="romdoc-focus-ring group flex flex-col gap-[8px] rounded-[13px] border border-gray-200 bg-gray-50 p-[13px] transition hover:border-[#036661]/40 hover:bg-white sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 className="font-semibold text-gray-950">
          {
            title
          }
        </h3>

        <p className="mt-[5px] text-sm leading-[1.55] text-gray-600">
          {
            description
          }
        </p>
      </div>

      <span className="shrink-0 text-sm font-semibold text-[#036661]">
        {
          actionLabel
        }{" "}
        <span
          aria-hidden="true"
          className="inline-block transition-transform group-hover:translate-x-0.5"
        >
          →
        </span>
      </span>
    </Link>
  );
}
