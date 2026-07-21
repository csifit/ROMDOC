"use client";

import PlatformOperatorRouteState from "@/components/dashboard/platform-operator-route-state";

type AdminErrorProps = {
  error:
    Error & {
      digest?:
        string;
    };
  reset:
    () => void;
};

export default function AdminError({
  error,
  reset,
}: AdminErrorProps) {
  console.error(
    "Admin dashboard route failed:",
    error
  );

  return (
    <PlatformOperatorRouteState
      mode="error"
      reset={
        reset
      }
    />
  );
}
