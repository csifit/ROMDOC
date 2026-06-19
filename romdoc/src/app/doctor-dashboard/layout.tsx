import Link from "next/link";
import type { ReactNode } from "react";

type DoctorDashboardLayoutProps = {
  children: ReactNode;
};

export default function DoctorDashboardLayout({
  children,
}: DoctorDashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-6 py-4">
          <Link
            href="/doctor-dashboard/appointments"
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#F0EEE9] hover:text-gray-950"
          >
            Lista programărilor
          </Link>

          <Link
            href="/doctor-dashboard/calendar"
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-[#F0EEE9] hover:text-gray-950"
          >
            Calendar
          </Link>

          <Link
            href="/"
            className="ml-auto rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Pagina principală
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
}