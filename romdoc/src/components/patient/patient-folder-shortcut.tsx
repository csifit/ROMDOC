import Link from "next/link";

export default function PatientFolderShortcut() {
  return (
    <section className="mt-6 rounded-2xl border border-[#036661]/20 bg-[#036661]/5 p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-semibold text-[#036661]">
            Dosar medical
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Documentele și notele tale medicale
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-600">
            Consultă într-un singur loc documentele adăugate de medicii tăi.
          </p>
        </div>

        <Link
          href="/patient-dashboard/folder"
          className="romdoc-button romdoc-button-primary shrink-0"
        >
          Deschide Dosarul
        </Link>
      </div>
    </section>
  );
}
