import type {
  ReactNode,
} from "react";

import PublicFooter from "@/components/public/public-footer";

type PatientDashboardLayoutProps = {
  children: ReactNode;
};

export default function PatientDashboardLayout({
  children,
}: PatientDashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F0EEE9]">
      <div className="flex-1">
        {children}
      </div>

      <PublicFooter />
    </div>
  );
}
