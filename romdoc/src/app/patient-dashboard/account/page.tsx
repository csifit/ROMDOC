import type {
  Metadata,
} from "next";

import PatientAccountSettings from "@/components/patient/patient-account-settings";

export const metadata: Metadata = {
  title:
    "Cont și confidențialitate | RomDoc",
  description:
    "Setări pentru contul pacientului și solicitarea de închidere a contului RomDoc.",
};

export default function PatientAccountPage() {
  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <PatientAccountSettings />
      </div>
    </div>
  );
}
