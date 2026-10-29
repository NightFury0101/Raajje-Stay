/* Shared pricing. The same rules run on the server in supabase/schema.sql
   (function rs_quote) so a booking total can't be changed from the browser. */
window.RS_PRICE = (function () {
  const defaults = { service: 10, tgst: 17, gst: 8, greenHigh: 12, greenLow: 6, greenRoomLimit: 50 };
  const toUTC = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const nights = (a, b) => Math.round((toUTC(b) - toUTC(a)) / 864e5);
  const r2 = n => Math.round(n * 100) / 100;

  function greenRate(p, s) {
    s = s || defaults;
    return ((p.type === 'guesthouse' || p.type === 'apartment') && p.roomsTotal <= s.greenRoomLimit) ? s.greenLow : s.greenHigh;
  }

  /* g: { in, out, adults, children, infants, rooms } ; res: resident? */
  function quote(p, roomIdx, g, res, s) {
    s = Object.assign({}, defaults, s || {});
    const room = p.rooms[roomIdx];
    const price = res ? room.local : room.intl;
    const n = Math.max(1, nights(g.in, g.out));
    const rooms = g.rooms || 1;
    const base = r2(price * n * rooms);
    const parts = [{ key: 'room', price, nights: n, rooms, v: base }];
    let service = 0, tax = 0;
    if (p.tourist) {
      service = r2(base * s.service / 100); parts.push({ key: 'service', rate: s.service, v: service });
      tax = r2((base + service) * s.tgst / 100); parts.push({ key: 'tgst', rate: s.tgst, v: tax });
    } else {
      tax = r2(base * s.gst / 100); parts.push({ key: 'gst', rate: s.gst, v: tax });
    }
    const payNow = r2(base + service + tax);
    let green = 0, greenPart = null;
    if (p.tourist) {
      if (res) greenPart = { key: 'green', exempt: true, v: null };
      else {
        const rate = greenRate(p, s), guests = g.adults + g.children;
        green = r2(rate * guests * n);
        greenPart = { key: 'green', rate, guests, nights: n, infants: g.infants, v: green };
      }
    }
    return { parts, greenPart, payNow, green, total: r2(payNow + green), nights: n, price, currency: res ? 'MVR' : 'USD' };
  }

  return { defaults, nights, greenRate, quote, r2 };
})();
