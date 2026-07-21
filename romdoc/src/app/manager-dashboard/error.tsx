"use client";

import PlatformOperatorRouteState from "@/components/dashboard/platform-operator-route-state";

type ManagerDashboardErrorProps = {
  error:
    Error & {
      digest?:
        string;
    };
  reset:
    () => void;
};

export default function ManagerDashboardError({
  error,
  reset,
}: ManagerDashboardErrorProps) {
  console.error(
    "Manager dashboard route failed:",
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
