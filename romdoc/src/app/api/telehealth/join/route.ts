import { NextRequest, NextResponse } from "next/server";

import { validateSameOrigin, sameOriginErrorResponse } from "@/lib/security/same-origin";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isJoinableTelehealthPaymentStatus } from "@/lib/telehealth/constants";
import { createDailyMeetingToken, createDailyRoom, roomExpiryForAppointmentDate, updateDailyRoomExpiry } from "@/lib/telehealth/daily";

export async function POST(request: NextRequest) {
  if (!validateSameOrigin(request)) return sameOriginErrorResponse();
  const body = (await request.json().catch(() => null)) as { reference?: unknown; mobile?: unknown } | null;
  const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(reference)) return NextResponse.json({ error: "Invalid appointment video URL." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to join this consultation." }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: profile }, { data: appointment }] = await Promise.all([
    admin.from("profiles").select("id, role, account_status, first_name, last_name").eq("id", user.id).maybeSingle(),
    admin.from("appointments").select("id, doctor_id, patient_profile_id, patient_name, status, scheduled_date, requested_date, consultation_mode, doctors(profile_id, public_name)").eq("telehealth_public_reference", reference).maybeSingle(),
  ]);
  if (!profile || profile.account_status !== "active") return NextResponse.json({ error: "An active account is required." }, { status: 403 });
  if (!appointment || appointment.consultation_mode !== "video") return NextResponse.json({ error: "Video appointment not found." }, { status: 404 });

  const doctor = Array.isArray(appointment.doctors) ? appointment.doctors[0] : appointment.doctors;
  const isPatient = appointment.patient_profile_id === user.id;
  const isDoctor = doctor?.profile_id === user.id;
  if (!isPatient && !isDoctor) {
    await admin.from("telehealth_audit_events").insert({ appointment_id: appointment.id, doctor_id: appointment.doctor_id, event_type: "room_join_denied", actor_profile_id: user.id, metadata: { reason: "not_participant" } });
    return NextResponse.json({ error: "Only the Patient and Doctor for this appointment can join." }, { status: 403 });
  }

  if (!["confirmed", "rescheduled", "completed"].includes(appointment.status)) return NextResponse.json({ error: "This video consultation is not currently joinable." }, { status: 409 });

  const { data: payment } = await admin.from("telehealth_payments").select("id, status").eq("appointment_id", appointment.id).maybeSingle();
  if (!payment || !isJoinableTelehealthPaymentStatus(payment.status)) return NextResponse.json({ error: "Payment has not been confirmed." }, { status: 402 });

  const appointmentDate = appointment.scheduled_date ?? appointment.requested_date;
  if (!appointmentDate) return NextResponse.json({ error: "Appointment date is missing." }, { status: 409 });
  const expiresAt = roomExpiryForAppointmentDate(appointmentDate);
  if (Date.now() > expiresAt.getTime()) {
    const { data: expiredRoom } = await admin.from("appointment_video_rooms").update({ status: "expired", updated_at: new Date().toISOString() }).eq("appointment_id", appointment.id).eq("status", "available").select("id").maybeSingle();
    if (expiredRoom) await admin.from("telehealth_audit_events").insert({ appointment_id: appointment.id, doctor_id: appointment.doctor_id, event_type: "room_expired", actor_profile_id: user.id, metadata: { expires_at: expiresAt.toISOString() } });
    return NextResponse.json({ error: "This video room has expired." }, { status: 410 });
  }

  let { data: room } = await admin.from("appointment_video_rooms").select("id, provider_room_name, provider_room_url, status, expires_at").eq("appointment_id", appointment.id).maybeSingle();
  if (!room) {
    const dailyRoom = await createDailyRoom({ appointmentId: appointment.id, expiresAt });
    const { data, error } = await admin.from("appointment_video_rooms").insert({ appointment_id: appointment.id, provider_room_name: dailyRoom.name, provider_room_url: dailyRoom.url, status: "available", expires_at: expiresAt.toISOString() }).select("id, provider_room_name, provider_room_url, status, expires_at").single();
    if (error) throw error;
    room = data;
  } else if (new Date(room.expires_at).getTime() !== expiresAt.getTime()) {
    await updateDailyRoomExpiry(room.provider_room_name, expiresAt);
    await admin.from("appointment_video_rooms").update({ expires_at: expiresAt.toISOString(), status: "available", updated_at: new Date().toISOString() }).eq("id", room.id);
    room.expires_at = expiresAt.toISOString();
  }
  if (room.status !== "available") return NextResponse.json({ error: "This video room is unavailable." }, { status: 409 });

  const profileName = [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
  const displayName = profileName || (isDoctor ? doctor?.public_name : appointment.patient_name) || (isDoctor ? "Doctor" : "Patient");
  const token = await createDailyMeetingToken({ roomName: room.provider_room_name, profileId: user.id, displayName, expiresAt, closeTabOnExit: body?.mobile === true });

  await admin.from("telehealth_audit_events").insert({ appointment_id: appointment.id, doctor_id: appointment.doctor_id, event_type: "room_join_granted", actor_profile_id: user.id, metadata: { participant_role: isDoctor ? "doctor" : "patient" } });
  return NextResponse.json({ joinUrl: `${room.provider_room_url}?t=${encodeURIComponent(token)}`, expiresAt: expiresAt.toISOString() });
}
