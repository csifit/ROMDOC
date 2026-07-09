export default function ClinicManagerInvitationsPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-[#9A4F35]">
          Clinic Manager
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          Invitații medici
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Această pagină va permite clinicii să invite medici, să urmărească
          statusul invitațiilor și să vadă când un medic acceptă asocierea.
        </p>
      </header>

      <section className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Fluxul de invitații va fi adăugat separat
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
          Pentru MVP, invitația va fi simplă: clinica introduce e-mailul
          medicului, RomDoc trimite invitația, iar medicul acceptă asocierea
          înainte ca administratorul să aprobe acoperirea plății.
        </p>
      </section>
    </div>
  );
}
