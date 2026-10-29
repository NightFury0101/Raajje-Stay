// Admin-only. Marks a card booking as refunded and records who did it.
// BML Connect refunds are issued from the BML merchant portal; if BML gives you a
// refund API for your account, call it here before updating the booking.
import { adminClient, caller, cors, json } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await caller(req);
    if (!user) return json({ error: 'Sign in first' }, 401);
    const db = adminClient();
    const { data: prof } = await db.from('profiles').select('role').eq('id', user.id).single();
    if (prof?.role !== 'admin') return json({ error: 'Admins only' }, 403);
    const { ref } = await req.json();
    const { data: b } = await db.from('bookings').select('*').eq('ref', ref).single();
    if (!b) return json({ error: 'Booking not found' }, 404);
    if (b.pay_method !== 'card' || !['cancelled', 'confirmed'].includes(b.status)) return json({ error: 'Only paid card bookings can be refunded here' }, 400);
    await db.from('bookings').update({
      status: 'refunded',
      payment: { ...(b.payment ?? {}), refunded: new Date().toISOString(), refunded_by: user.id },
    }).eq('ref', ref);
    return json({ ok: true, note: `Now issue ${b.currency} ${b.pay_now} back to the card in the BML merchant portal (transaction ${b.payment?.id ?? 'unknown'}).` });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
