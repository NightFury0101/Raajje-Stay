// Sends booking emails (Resend) and text messages (any HTTP SMS gateway).
// Connect it in Supabase: Database > Webhooks > new webhook on table "bookings",
// events INSERT and UPDATE, type "Supabase Edge Functions", function "notify".
import { adminClient, env, json } from '../_shared/util.ts';

type Booking = Record<string, any>;
const SITE = () => Deno.env.get('SITE_URL') ?? '';
const fmt = (b: Booking) => (b.currency === 'MVR' ? 'MVR ' : '$') + Number(b.pay_now).toLocaleString('en-US', { maximumFractionDigits: 2 });

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key || !to) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env('MAIL_FROM', 'Raajje Stay <bookings@raajjestay.mv>'), to, subject, html }),
  });
}

// Works with Dhiraagu or Ooredoo bulk SMS, or any provider that accepts JSON {to, message}.
// Adjust the body below to match your provider's API.
async function sendSms(to: string, message: string) {
  const url = Deno.env.get('SMS_GATEWAY_URL'), token = Deno.env.get('SMS_GATEWAY_TOKEN');
  if (!url || !token || !to) return;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: to.replace(/\s/g, ''), message, sender: Deno.env.get('SMS_SENDER') ?? 'RaajjeStay' }),
  });
}

function guestMessage(b: Booking, prop: Booking | null, event: string) {
  const where = b.kind === 'stay' ? prop?.name ?? 'your stay' : `your ${b.transfer?.mode ?? 'transfer'}`;
  const dates = b.kind === 'stay' ? `${b.check_in} to ${b.check_out}` : `${b.check_in} at ${b.transfer?.time}`;
  switch (event) {
    case 'awaiting_transfer': return { subject: `Pay for ${where} by bank transfer (${b.ref})`, text: `Transfer ${fmt(b)} and upload the slip in My trips within 24 hours to keep ${where}, ${dates}. Ref ${b.ref}.` };
    case 'confirmed': return { subject: `Booking confirmed: ${where} (${b.ref})`, text: `You're booked at ${where}, ${dates}. Ref ${b.ref}. Total ${fmt(b)}.${Number(b.green) ? ` Green Tax of $${b.green} is paid at check-out.` : ''}` };
    case 'slip_rejected': return { subject: `We couldn't match your bank slip (${b.ref})`, text: `${where} couldn't match your bank slip to a payment. Upload a clearer copy in My trips. Ref ${b.ref}.` };
    case 'cancelled': return { subject: `Booking cancelled (${b.ref})`, text: `Your booking at ${where}, ${dates}, is cancelled. Ref ${b.ref}.` };
    case 'refunded': return { subject: `Refund on its way (${b.ref})`, text: `We've refunded ${fmt(b)} for ${where}. It can take 5 to 10 working days to show on your card.` };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const { type, record: b, old_record: old } = await req.json();
    let event: string | null = null;
    if (type === 'INSERT') event = b.status === 'confirmed' ? 'confirmed' : b.pay_method === 'transfer' ? 'awaiting_transfer' : null;
    else if (type === 'UPDATE' && old?.status !== b.status) {
      if (b.status === 'confirmed') event = 'confirmed';
      else if (old?.status === 'slip_review' && b.status === 'awaiting_payment') event = 'slip_rejected';
      else if (b.status === 'cancelled' || b.status === 'refunded') event = b.status;
    }
    if (!event) return json({ skipped: true });

    const db = adminClient();
    const { data: prop } = b.property_id ? await db.from('properties').select('name, owner').eq('id', b.property_id).single() : { data: null };
    const m = guestMessage(b, prop, event);
    if (m) {
      const link = SITE() ? `<p><a href="${SITE()}#trips">Open My trips</a></p>` : '';
      await Promise.all([sendEmail(b.email, m.subject, `<p>Hi ${b.guest_name.split(' ')[0]},</p><p>${m.text}</p>${link}<p>Raajje Stay</p>`), sendSms(b.phone, m.text)]);
    }
    // tell the property about new bookings, cancellations and slips to check
    if (prop?.owner && (type === 'INSERT' || ['cancelled', 'slip_review'].includes(b.status))) {
      const { data: owner } = await db.auth.admin.getUserById(prop.owner);
      const what = type === 'INSERT' ? 'New booking' : b.status === 'slip_review' ? 'Bank slip to check' : 'Booking cancelled';
      await sendEmail(owner?.user?.email ?? '', `${what}: ${b.guest_name}, ${b.check_in} (${b.ref})`,
        `<p>${what} at ${prop.name}.</p><p>${b.guest_name} · ${b.room_name ?? ''} · ${b.check_in} to ${b.check_out} · ${b.adults + b.children} guests · ${fmt(b)}</p><p>Open your property dashboard to manage it.</p>`);
    }
    return json({ sent: event });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
