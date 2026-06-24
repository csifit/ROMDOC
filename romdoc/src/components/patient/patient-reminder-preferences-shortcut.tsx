import Link from "next/link";

export default function
PatientReminderPreferencesShortcut() {
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Notificări
          </p>

          <h2 className="mt-2 text-xl font-bold text-gray-900">
            Reamintiri pentru programări
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Activează sau dezactivează separat reamintirile
            trimise cu aproximativ 48 și 24 de ore înainte.
          </p>
        </div>

        <Link
          href="/patient-dashboard/reminders"
          className="romdoc-button romdoc-button-secondary shrink-0"
        >
          Preferințe reamintiri
        </Link>
      </div>
    </section>
  );
}
