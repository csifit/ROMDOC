"use client";

import PatientMedicalProfile from "@/components/medical-folder/patient-medical-profile";
import MedicalFolderManager from "@/components/medical-folder/medical-folder-manager";

type Props = {
  appointmentId: string;
  appointmentStatus: string;
  standalone?: boolean;
};

export default function StaffPatientFolderManager({
  appointmentId,
  appointmentStatus,
  standalone = false,
}: Props) {
  if (!standalone) {
    return (
      <MedicalFolderManager
        appointmentId={appointmentId}
        appointmentStatus={appointmentStatus}
        apiEndpoint="/api/staff/patient-folder"
        downloadEndpoint="/api/staff/patient-folder/download"
        pdfEndpoint="/api/staff/patient-folder/pdf"
        standalone={false}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <div className="min-w-0">
        <PatientMedicalProfile
          appointmentId={appointmentId}
        />
      </div>

      <div className="min-w-0">
        <MedicalFolderManager
          appointmentId={appointmentId}
          appointmentStatus={appointmentStatus}
          apiEndpoint="/api/staff/patient-folder"
          downloadEndpoint="/api/staff/patient-folder/download"
          pdfEndpoint="/api/staff/patient-folder/pdf"
          standalone
        />
      </div>
    </div>
  );
}
