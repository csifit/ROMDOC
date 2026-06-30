import DoctorVerificationsManagement from "@/components/admin/doctor-verifications-management";

export default function ManagerVerificationsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-[#036661]">
          Management operațional
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Verificări profesionale
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Examinează cererile și documentele profesionale ale medicilor
          folosind fluxul securizat RomDoc.
        </p>
      </header>

      <DoctorVerificationsManagement />
    </div>
  );
}
