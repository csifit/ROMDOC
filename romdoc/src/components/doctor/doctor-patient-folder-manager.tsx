"use client";

import MedicalFolderManager from "@/components/medical-folder/medical-folder-manager";

type Props = {
  appointmentId: string;
  appointmentStatus: string;
  standalone?: boolean;
};

export default function DoctorPatientFolderManager({
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
      apiEndpoint="/api/doctor/patient-folder"
      downloadEndpoint="/api/doctor/patient-folder/download"
      pdfEndpoint="/api/medical-folder/pdf"
      standalone={standalone}
    />
  );
}
