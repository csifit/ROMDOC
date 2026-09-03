import TelehealthRefundButton from "@/components/telehealth/telehealth-refund-button";
import TelehealthSettingsForm from "@/components/telehealth/telehealth-settings-form";
import { getStoredAppLocale } from "@/lib/i18n/server-app-locale";
import { createClient } from "@/lib/supabase/server";

type CoveredDoctor = {
  doctor_id: string | null;
  invited_doctor_email: string | null;
  doctors: { public_name: string | null } | Array<{ public_name: string | null }> | null;
};

type AppointmentRelation = {
  patient_name: string;
  requested_date: string;
  scheduled_date: string | null;
  doctors: { public_name: string | null } | Array<{ public_name: string | null }> | null;
};

type ClinicPayment = {
  id: string;
  appointment_id: string;
  status: string;
  amount_minor: number;
  currency: string;
  appointments: AppointmentRelation | AppointmentRelation[] | null;
};

function first<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function ClinicTelehealthPage() {
  const locale = await getStoredAppLocale();
  const copy = locale === "ro"
    ? { title: "Consultații video", description: "Organizația Clinică controlează prețul, durata, documentele Stripe și rambursările pentru Medicii invitați acoperiți.", noDoctors: "Nu există niciun Medic acoperit activ disponibil pentru configurarea telehealth.", payments: "Plăți și rambursări", paymentsHelp: "Doar Organizația Clinică ce a încasat plata Stripe o poate rambursa.", noPayments: "Nu există încă plăți pentru consultații video.", patient: "Pacient", doctor: "Medic", date: "Dată", amount: "Sumă", status: "Stare", action: "Acțiune" }
    : locale === "de"
      ? { title: "Videosprechstunden", description: "Die Klinikorganisation steuert Preis, Dauer, Stripe-Belege und Erstattungen für abgedeckte eingeladene Ärzte.", noDoctors: "Für die Telehealth-Konfiguration ist kein aktiver abgedeckter Arzt verfügbar.", payments: "Zahlungen und Erstattungen", paymentsHelp: "Nur die Klinikorganisation, die die Stripe-Zahlung erhalten hat, kann sie erstatten.", noPayments: "Noch keine Zahlungen für Videosprechstunden.", patient: "Patient", doctor: "Arzt", date: "Datum", amount: "Betrag", status: "Status", action: "Aktion" }
      : { title: "Video consultations", description: "The Clinic Organisation controls price, duration, Stripe receipts and refunds for covered clinic-invited Doctors.", noDoctors: "No active covered Doctor is available for telehealth configuration.", payments: "Payments and refunds", paymentsHelp: "Only the Clinic Organisation that received the Stripe payment can refund it.", noPayments: "No video consultation payments yet.", patient: "Patient", doctor: "Doctor", date: "Date", amount: "Amount", status: "Status", action: "Action" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: memberships } = user
    ? await supabase.from("clinic_organization_members").select("organization_id").eq("profile_id", user.id).eq("status", "active").in("member_role", ["owner", "billing_manager"])
    : { data: [] };
  const organizationIds = (memberships ?? []).map((item) => item.organization_id);

  const [{ data: relationshipData }, { data: paymentData }] = await Promise.all([
    organizationIds.length
      ? supabase.from("clinic_doctor_relationships").select("doctor_id, invited_doctor_email, doctors(public_name)").in("organization_id", organizationIds).eq("invitation_status", "accepted").eq("coverage_status", "active").not("doctor_id", "is", null)
      : Promise.resolve({ data: [] }),
    organizationIds.length
      ? supabase.from("telehealth_payments").select("id, appointment_id, status, amount_minor, currency, appointments(patient_name, requested_date, scheduled_date, doctors(public_name))").eq("recipient_type", "clinic_organization").in("recipient_id", organizationIds).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] }),
  ]);

  const relationships = (relationshipData ?? []) as unknown as CoveredDoctor[];
  const payments = (paymentData ?? []) as unknown as ClinicPayment[];

  return <div className="space-y-[21px]">
    <header>
      <p className="text-sm font-semibold text-[#9A4F35]">Telehealth</p>
      <h1 className="mt-[8px] text-3xl font-bold text-gray-900">{copy.title}</h1>
      <p className="mt-[8px] max-w-3xl text-sm leading-6 text-gray-600">{copy.description}</p>
    </header>

    {relationships.length === 0
      ? <div className="rounded-[13px] border border-dashed border-gray-300 bg-white p-[21px] text-sm text-gray-600">{copy.noDoctors}</div>
      : relationships.map((relationship) => {
          const doctor = first(relationship.doctors);
          return <section key={relationship.doctor_id} className="space-y-[13px]">
            <h2 className="text-xl font-bold text-gray-900">{doctor?.public_name ?? relationship.invited_doctor_email ?? "Doctor"}</h2>
            <TelehealthSettingsForm doctorId={relationship.doctor_id!} />
          </section>;
        })}

    <section className="rounded-[21px] border border-gray-200 bg-white p-[21px] shadow-sm">
      <h2 className="text-xl font-bold text-gray-900">{copy.payments}</h2>
      <p className="mt-[8px] text-sm text-gray-600">{copy.paymentsHelp}</p>
      {payments.length === 0 ? <p className="mt-[21px] text-sm text-gray-500">{copy.noPayments}</p> : <div className="mt-[21px] overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead><tr className="text-left text-xs uppercase tracking-wide text-gray-500"><th className="pb-[10px] pr-[13px]">{copy.patient}</th><th className="pb-[10px] pr-[13px]">{copy.doctor}</th><th className="pb-[10px] pr-[13px]">{copy.date}</th><th className="pb-[10px] pr-[13px]">{copy.amount}</th><th className="pb-[10px] pr-[13px]">{copy.status}</th><th className="pb-[10px]">{copy.action}</th></tr></thead>
          <tbody className="divide-y divide-gray-100">{payments.map((payment) => {
            const appointment = first(payment.appointments);
            const doctor = first(appointment?.doctors ?? null);
            return <tr key={payment.id}>
              <td className="py-[13px] pr-[13px] font-medium text-gray-900">{appointment?.patient_name ?? "—"}</td>
              <td className="py-[13px] pr-[13px] text-gray-600">{doctor?.public_name ?? "—"}</td>
              <td className="py-[13px] pr-[13px] text-gray-600">{appointment?.scheduled_date ?? appointment?.requested_date ?? "—"}</td>
              <td className="py-[13px] pr-[13px] text-gray-600">{new Intl.NumberFormat(locale === "ro" ? "ro-RO" : locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency: payment.currency }).format(payment.amount_minor / 100)}</td>
              <td className="py-[13px] pr-[13px] text-gray-600">{payment.status.replaceAll("_", " ")}</td>
              <td className="py-[13px]">{payment.status === "paid" ? <TelehealthRefundButton appointmentId={payment.appointment_id} /> : "—"}</td>
            </tr>;
          })}</tbody>
        </table>
      </div>}
    </section>
  </div>;
}
