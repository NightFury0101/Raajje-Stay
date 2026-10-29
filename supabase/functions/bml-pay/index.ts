// Creates a BML Connect transaction for a booking and returns the hosted payment page URL.
// The amount comes from the database, never from the browser.
import { adminClient, bml, caller, cors, json } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const user = await caller(req);
    if (!user) return json({ error: 'Sign in first' }, 401);
    const { ref, returnUrl } = await req.json();
    const db = adminClient();
    const { data: b } = await db.from('bookings').select('*').eq('ref', ref).single();
    if (!b || b.user_id !== user.id) return json({ error: 'Booking not found' }, 404);
    if (b.status !== 'awaiting_payment' || b.pay_method !== 'card') return json({ error: 'This booking is not waiting for a card payment' }, 400);

    const res = await fetch(`${bml.base()}/transactions`, {
      method: 'POST',
      headers: bml.headers(),
      body: JSON.stringify({
        amount: Math.round(Number(b.pay_now) * 100), // BML takes minor units: 1000 = 10.00
        currency: b.currency,                         // your merchant account must accept USD for visitor bookings
        redirectUrl: returnUrl,                       // BML adds transactionId and state to this address
        localId: b.ref,
        customerReference: b.ref,
      }),
    });
    const tx = await res.json();
    if (!res.ok || !tx.url) return json({ error: 'BML did not create the payment', detail: tx }, 502);
    await db.from('bookings').update({ payment: { provider: 'bml', id: tx.id, started: new Date().toISOString() } }).eq('ref', ref);
    return json({ url: tx.url });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
