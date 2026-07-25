import ClinicManagerReportsDashboard from "@/components/clinic-manager/clinic-manager-reports-dashboard";

type ClinicManagerReportsPageProps = {
  searchParams: Promise<{
    month?: string;
    clinicId?: string;
    doctorId?: string;
  }>;
};

function optionalValue(value: string | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function ClinicManagerReportsPage({
  searchParams,
}: ClinicManagerReportsPageProps) {
  const parameters = await searchParams;

  return (
    <ClinicManagerReportsDashboard
      initialMonth={optionalValue(parameters.month)}
      initialClinicId={optionalValue(parameters.clinicId)}
      initialDoctorId={optionalValue(parameters.doctorId)}
    />
  );
}
