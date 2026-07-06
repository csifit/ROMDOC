"use client";

import PatientMedicalProfile from "@/components/medical-folder/patient-medical-profile";
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
  if (!standalone) {
    return (
      <>
        <PatientMedicalProfile
          appointmentId={appointmentId}
          editable
        />

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
      </>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)] lg:items-start">
      <div className="lg:sticky lg:top-6">
        <PatientMedicalProfile
          appointmentId={appointmentId}
          editable
        />
      </div>

      <div>
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
      </div>
    </div>
  );
}
