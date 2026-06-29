"use client";

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
  return (
    <MedicalFolderManager
      appointmentId={appointmentId}
      appointmentStatus={
        appointmentStatus
      }
      apiEndpoint="/api/staff/patient-folder"
      downloadEndpoint="/api/staff/patient-folder/download"
      pdfEndpoint="/api/staff/patient-folder/pdf"
      standalone={standalone}
    />
  );
}
