// Called when the guest returns from the BML payment page. It asks BML for the real
// transaction state instead of trusting the address the browser came back with.
import { adminClient, bml, cors, json } from '../_shared/util.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { transactionId } = await req.json();
    if (!transactionId) return json({ error: 'Missing transactionId' }, 400);
    const res = await fetch(`${bml.base()}/transactions/${encodeURIComponent(transactionId)}`, { headers: bml.headers() });
    const tx = await res.json();
    if (!res.ok) return json({ error: 'BML lookup failed', detail: tx }, 502);

    const db = adminClient();
    const { data: b } = await db.from('bookings').select('*').eq('ref', tx.localId).single();
    if (!b || b.payment?.id !== tx.id) return json({ error: 'No booking for this transaction' }, 404);

    const paid = tx.state === 'CONFIRMED' && Number(tx.amount) === Math.round(Number(b.pay_now) * 100) && tx.currency === b.currency;
    if (paid && b.status === 'awaiting_payment') {
      await db.from('bookings').update({ status: 'confirmed', payment: { ...b.payment, state: tx.state, confirmed: new Date().toISOString() } }).eq('ref', b.ref);
    }
    return json({ ref: b.ref, state: tx.state });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
