/* Raajje Stay data layer.
   Two modes behind one interface:
   - demo: a small database kept in localStorage, shared by the site, the property
     dashboard and the admin panel (they run on the same address).
   - live: Supabase (Postgres + Auth + Storage + Edge Functions), switched on by js/config.js.
   Call `await RS_API.init()` once, then read cached data synchronously and await writes. */
window.RS_API = (function () {
  const CFG = window.RS_CONFIG || {};
  const D = window.RS_DATA, P = window.RS_PRICE;
  const LIVE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
  const ACTIVE = ['awaiting_payment', 'slip_review', 'confirmed', 'checked_in'];
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const addDays = (s, n) => { const [y, m, d] = s.split('-').map(Number); const t = new Date(y, m - 1, d + n); return iso(t); };
  const today = iso(new Date());
  const clone = o => JSON.parse(JSON.stringify(o));
  const unitsOf = (p, idx) => p.rooms[idx].units != null ? p.rooms[idx].units : Math.max(1, Math.floor(p.roomsTotal / p.rooms.length));
  const newRef = () => 'RS-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  const overlaps = (b, day) => b.in <= day && day < b.out;

  let cache = { props: [], settings: Object.assign({}, P.defaults), user: null, bookings: [], blocks: {}, operators: [] };

  /* =====================================================================
     DEMO MODE
     ===================================================================== */
  const KEY = 'rs_db', VER = 4;
  let db = null, memoryOnly = false;
  function persist() { if (memoryOnly) return; try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { memoryOnly = true; } }
  function API_available(p, idx, inD, outD, list) {
    let min = unitsOf(p, idx);
    for (let d = inD; d < outD; d = addDays(d, 1)) {
      const used = list.filter(b => b.pid === p.id && b.roomIdx === idx && ACTIVE.concat(['checked_out']).includes(b.status) && b.in <= d && d < b.out).length;
      min = Math.min(min, unitsOf(p, idx) - used);
    }
    return min;
  }
  function seedSample(props) {
    let s = 20261029;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const names = ['Aishath Rasheed', 'Mohamed Shiham', 'Fathimath Nazeera', 'Ahmed Ibrahim', 'Hawwa Leena', 'Ibrahim Naseem',
      'Sofia Lombardi', 'Daniel Krause', 'Priya Venkat', 'James Okafor', 'Mei Tan', 'Anna Petrova', 'Lukas Meyer', 'Chloe Martin'];
    const out = [];
    let i = 0;
    // each property gets 6-9 bookings over the next few weeks, plus today's arrivals and departures
    props.forEach((p, pi) => {
      const n = 6 + Math.floor(r() * 4);
      for (let k = 0; k < n + 2; k++, i++) {
        const res = !p.tourist || r() < 0.45;
        const idx = Math.floor(r() * p.rooms.length);
        if (!res && p.rooms[idx].intl == null) continue;
        const len = 1 + Math.floor(r() * 4);
        let start = addDays(today, Math.floor(r() * 32) - 8);
        if (k === n) start = today;                     // arriving today
        if (k === n + 1) start = addDays(today, -len);  // leaving today
        const g = { in: start, out: addDays(start, len), adults: 1 + Math.floor(r() * 2), children: r() < 0.2 ? 1 : 0, infants: r() < 0.08 ? 1 : 0, rooms: 1 };
        if (API_available(p, idx, g.in, g.out, out) < 1) continue;
        const q = P.quote(p, idx, g, res);
        const name = res ? names[Math.floor(r() * 6)] : names[6 + Math.floor(r() * 8)];
        let status = 'confirmed', pay = r() < 0.6 ? 'card' : 'property', slip = null;
        if (g.out <= today && k !== n + 1) status = r() < 0.08 ? 'no_show' : 'checked_out';
        else if (g.in < today || k === n + 1) status = 'checked_in';
        else if (k !== n && res && r() < 0.3) { pay = 'transfer'; status = r() < 0.6 ? 'slip_review' : 'awaiting_payment'; if (status === 'slip_review') slip = 'bml-transfer-' + (1000 + i) + '.jpg'; }
        if (status === 'confirmed' && k < n && r() < 0.06) status = 'cancelled';
        out.push({
          ref: 'RS-S' + String(1000 + i * 37).slice(-4) + String.fromCharCode(65 + pi % 26), kind: 'stay', owner: 'sample', sample: true,
          pid: p.id, roomIdx: idx, room: p.rooms[idx].name, rooms: 1, in: g.in, out: g.out, nights: len,
          adults: g.adults, children: g.children, infants: g.infants, resident: res, name,
          phone: res ? '+960 7' + String(100000 + Math.floor(r() * 899999)) : '+44 7700 9' + String(10000 + Math.floor(r() * 89999)),
          email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@example.com',
          payNow: q.payNow, green: q.green, pay, slip, status, transfer: null,
          created: new Date(Date.now() - Math.floor(r() * 30) * 864e5).toISOString()
        });
      }
    });
    return out;
  }
  function seed() {
    const props = clone(D.properties).map(p => Object.assign(p, { status: 'live', owner: 'demo-partner' }));
    props.push({
      id: 'maafushi-coral-stay', name: 'Maafushi Coral Stay', type: 'guesthouse', island: 'maafushi', roomsTotal: 9,
      rating: 0, reviews: 0, tourist: true, route: 'maafushi', seed: 171, status: 'pending', owner: 'applicant',
      contact: 'Hussain Adam · +960 7712345', applied: addDays(today, -3),
      blurb: 'New nine-room guesthouse behind the Maafushi harbour, opened this season. Rooftop breakfast and a partnership with the local dive school.',
      amenities: ['Breakfast included', 'Rooftop terrace', 'Wi-Fi', 'Air conditioning'],
      rooms: [{ name: 'Standard double', beds: '1 queen', sleeps: 2, size: 17, local: 700, intl: 66 }]
    }, {
      id: 'addu-turtle-rooms', name: 'Addu Turtle Rooms', type: 'guesthouse', island: 'addu', roomsTotal: 6,
      rating: 0, reviews: 0, tourist: true, route: 'addu', seed: 181, status: 'pending', owner: 'applicant',
      contact: 'Mariyam Shifa · +960 9876543', applied: addDays(today, -1),
      blurb: 'Six rooms in Feydhoo, a short ride from Gan airport. Turtle snorkelling in the lagoon and bicycles for the causeway.',
      amenities: ['Bicycles', 'Airport pickup', 'Wi-Fi'],
      rooms: [{ name: 'Lagoon double', beds: '1 queen', sleeps: 2, size: 19, local: 650, intl: 60 }]
    });
    const bookings = seedSample(props.filter(p => p.status === 'live'));
    try { // carry over bookings made before the data layer existed
      const old = JSON.parse(localStorage.getItem('rs_bookings') || '[]');
      old.forEach(b => { b.owner = 'me'; if (b.status === 'confirmed' && b.pay === 'transfer' && !b.slip) b.status = 'awaiting_payment'; bookings.unshift(b); });
    } catch (e) { /* ignore */ }
    return {
      v: VER, props, bookings, blocks: {}, settings: Object.assign({}, P.defaults),
      operators: [
        { id: 'op1', name: 'Kaafu Speed Link', mode: 'speedboat', routes: 'Maafushi, Thulusdhoo, Kudafinolhu', phone: '+960 7790011', active: true },
        { id: 'op2', name: 'Public ferry (MTCC)', mode: 'ferry', routes: 'Maafushi, Thulusdhoo, Fulidhoo, Rasdhoo', phone: '+960 3000000', active: true },
        { id: 'op3', name: 'Ari Atoll Express', mode: 'speedboat', routes: 'Dhigurah, Ukulhas, Rasdhoo', phone: '+960 7790022', active: true },
        { id: 'op4', name: 'Raajje Seaplane Charter', mode: 'seaplane', routes: 'Fushi Velhi, Mas Huraa', phone: '+960 3330044', active: true },
        { id: 'op5', name: 'Southern Domestic Air', mode: 'flight', routes: 'Gan, Fuvahmulah, Dharavandhoo, Maamigili', phone: '+960 3330055', active: false }
      ],
      user: null, partner: null, admin: false
    };
  }
  function demoRefresh() {
    cache.props = db.props; cache.settings = db.settings; cache.user = db.user;
    cache.bookings = db.bookings; cache.blocks = db.blocks; cache.operators = db.operators;
  }

  /* =====================================================================
     LIVE MODE (Supabase)
     ===================================================================== */
  let sb = null;
  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => bad(new Error('Could not load ' + src)); document.head.appendChild(s); });
  }
  const fromProp = row => ({
    id: row.id, name: row.name, type: row.type, island: row.island, roomsTotal: row.rooms_total, rating: Number(row.rating || 0),
    reviews: row.reviews || 0, tourist: row.tourist, route: row.route, seed: row.seed, blurb: row.blurb, amenities: row.amenities || [],
    status: row.status, owner: row.owner, contact: row.contact, applied: row.created_at && row.created_at.slice(0, 10),
    rooms: (row.room_types || []).sort((a, b) => a.idx - b.idx).map(t => ({ id: t.id, name: t.name, beds: t.beds, sleeps: t.sleeps, size: t.size, local: Number(t.local_rate), intl: t.intl_rate == null ? null : Number(t.intl_rate), units: t.units }))
  });
  const fromBooking = b => ({
    ref: b.ref, kind: b.kind, owner: b.user_id, pid: b.property_id, roomIdx: b.room_idx, room: b.room_name, rooms: b.rooms,
    in: b.check_in, out: b.check_out, nights: b.nights, adults: b.adults, children: b.children, infants: b.infants,
    resident: b.resident, name: b.guest_name, phone: b.phone, email: b.email, payNow: Number(b.pay_now), green: Number(b.green || 0),
    pay: b.pay_method, slip: b.slip_path, status: b.status, transfer: b.transfer, created: b.created_at,
    to: b.transfer && b.transfer.to, mode: b.transfer && b.transfer.mode, from: b.transfer && b.transfer.from, date: b.check_in, time: b.transfer && b.transfer.time
  });
  async function liveRefresh(scope) {
    const [{ data: props }, { data: set }, { data: { user } }] = await Promise.all([
      sb.from('properties').select('*, room_types(*)'),
      sb.from('settings').select('value').eq('key', 'tax').maybeSingle(),
      sb.auth.getUser()
    ]);
    cache.props = (props || []).map(fromProp);
    cache.settings = Object.assign({}, P.defaults, set ? set.value : {});
    if (user) {
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
      cache.user = { id: user.id, name: (prof && prof.name) || user.email || user.phone, contact: user.email || user.phone, role: (prof && prof.role) || 'guest' };
    } else cache.user = null;
    // RLS returns only what this user may see: own bookings, own properties' bookings, or all for admins
    const { data: bk } = cache.user ? await sb.from('bookings').select('*').order('created_at', { ascending: false }) : { data: [] };
    cache.bookings = (bk || []).map(fromBooking);
    if (scope === 'staff') {
      const { data: bl } = await sb.from('blocks').select('*');
      cache.blocks = {}; (bl || []).forEach(x => { (cache.blocks[x.property_id] = cache.blocks[x.property_id] || []).push(x.room_idx + '|' + x.day); });
      const { data: ops } = await sb.from('operators').select('*').order('name');
      cache.operators = ops || [];
    }
  }
  const fail = e => ({ ok: false, error: (e && e.message) || String(e) });

  /* =====================================================================
     PUBLIC INTERFACE
     ===================================================================== */
  let scope = 'site';
  const api = {
    LIVE, ACTIVE, today, addDays, newRef,
    async init(opts) {
      scope = (opts && opts.scope) || 'site';
      if (LIVE) {
        await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js');
        sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
        await liveRefresh(scope);
      } else {
        try { const d = JSON.parse(localStorage.getItem(KEY)); db = d && d.v === VER ? d : null; } catch (e) { db = null; }
        if (!db) { db = seed(); persist(); }
        demoRefresh();
      }
      return api;
    },
    async reload() { if (LIVE) await liveRefresh(scope); else { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.v === VER) db = d; } catch (e) { /* keep memory */ } demoRefresh(); } },

    /* ---- reads (sync, from cache) ---- */
    props: () => cache.props.filter(p => p.status === 'live'),
    allProps: () => cache.props,
    prop: id => cache.props.find(p => p.id === id),
    settings: () => cache.settings,
    user: () => cache.user,
    myBookings: () => LIVE ? cache.bookings.filter(b => cache.user && b.owner === cache.user.id) : cache.bookings.filter(b => b.owner === 'me'),
    allBookings: () => cache.bookings,
    propBookings: pid => cache.bookings.filter(b => b.pid === pid && b.kind === 'stay'),
    blocks: pid => cache.blocks[pid] || [],
    operators: () => cache.operators,
    unitsOf,

    /* rooms of this type still free on every night of [in, out) */
    available(pid, idx, inD, outD) {
      const p = api.prop(pid); if (!p) return 0;
      const units = unitsOf(p, idx), bl = api.blocks(pid);
      let min = units;
      for (let d = inD; d < outD; d = addDays(d, 1)) {
        const used = cache.bookings.filter(b => b.pid === pid && b.roomIdx === idx && ACTIVE.includes(b.status) && overlaps(b, d)).reduce((s, b) => s + (b.rooms || 1), 0);
        const blocked = bl.includes(idx + '|' + d) ? units : 0;
        min = Math.min(min, units - used - blocked);
      }
      return Math.max(0, min);
    },
    /* live mode: availability needs everyone's bookings, which RLS hides, so ask the server */
    async availableLive(pid, idx, inD, outD) {
      if (!LIVE) return api.available(pid, idx, inD, outD);
      const { data, error } = await sb.rpc('rooms_left', { p_property: pid, p_room_idx: idx, p_in: inD, p_out: outD });
      return error ? null : data;
    },

    /* ---- guest actions ---- */
    async createBooking(b) {
      if (LIVE) {
        const { data, error } = await sb.rpc('create_booking', {
          p_property: b.pid, p_room_idx: b.roomIdx, p_rooms: b.rooms, p_in: b.in, p_out: b.out, p_adults: b.adults, p_children: b.children,
          p_infants: b.infants, p_resident: b.resident, p_pay_method: b.pay, p_guest_name: b.name, p_phone: b.phone, p_email: b.email,
          p_id_doc: b.idDoc || null, p_nationality: b.nat || null, p_note: b.note || null, p_transfer: b.transfer
        });
        if (error) return fail(error);
        await liveRefresh(scope);
        return { ok: true, booking: cache.bookings.find(x => x.ref === data) || { ref: data } };
      }
      const p = api.prop(b.pid);
      if (api.available(b.pid, b.roomIdx, b.in, b.out) < b.rooms) return { ok: false, error: 'sold_out' };
      const q = P.quote(p, b.roomIdx, b, b.resident, cache.settings);
      const rec = Object.assign({}, b, {
        ref: newRef(), kind: 'stay', owner: 'me', room: p.rooms[b.roomIdx].name, nights: q.nights,
        payNow: P.r2(q.payNow + (b.transfer ? b.transfer.cost : 0)), green: q.green,
        status: b.pay === 'transfer' ? 'awaiting_payment' : 'confirmed', created: new Date().toISOString()
      });
      delete rec.idDoc; delete rec.nat;   // the demo never stores ID or passport numbers
      db.bookings.unshift(rec); persist(); demoRefresh();
      return { ok: true, booking: rec };
    },
    async createTransfer(t) {
      if (LIVE) {
        const { data, error } = await sb.rpc('create_transfer', { p_to: t.to, p_option: t.option, p_date: t.date, p_time: t.time, p_adults: t.adults, p_children: t.children, p_infants: t.infants, p_resident: t.resident, p_guest_name: t.name, p_phone: t.phone });
        if (error) return fail(error);
        await liveRefresh(scope);
        return { ok: true, booking: cache.bookings.find(x => x.ref === data) || { ref: data } };
      }
      const rec = Object.assign({ ref: newRef(), kind: 'transfer', owner: 'me', status: 'confirmed', created: new Date().toISOString() }, t);
      db.bookings.unshift(rec); persist(); demoRefresh();
      return { ok: true, booking: rec };
    },
    async cancel(ref, by) {
      if (LIVE) { const { error } = await sb.rpc('cancel_booking', { p_ref: ref }); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      const b = db.bookings.find(x => x.ref === ref); if (!b) return fail('Booking not found');
      b.status = 'cancelled'; b.cancelledBy = by || 'guest'; persist(); demoRefresh(); return { ok: true };
    },
    async uploadSlip(ref, file) {
      if (LIVE) {
        const path = ref + '/' + Date.now() + '-' + file.name.replace(/[^\w.-]/g, '_');
        const up = await sb.storage.from('slips').upload(path, file); if (up.error) return fail(up.error);
        const { error } = await sb.rpc('submit_slip', { p_ref: ref, p_path: path }); if (error) return fail(error);
        await liveRefresh(scope); return { ok: true };
      }
      const b = db.bookings.find(x => x.ref === ref); if (!b) return fail('Booking not found');
      b.slip = file.name; b.status = 'slip_review'; persist(); demoRefresh(); return { ok: true };
    },
    /* Card payment through BML. Live: an Edge Function creates the BML transaction and
       returns the hosted payment page. Demo: nothing to do. */
    async startPayment(ref) {
      if (!LIVE) return { ok: true, url: null };
      const { data, error } = await sb.functions.invoke('bml-pay', { body: { ref, returnUrl: (CFG.siteUrl || location.origin + location.pathname) } });
      if (error) return fail(error);
      return { ok: true, url: data.url };
    },
    async verifyPayment(transactionId) {
      if (!LIVE) return { ok: true };
      const { data, error } = await sb.functions.invoke('bml-verify', { body: { transactionId } });
      if (error) return fail(error);
      await liveRefresh(scope);
      return { ok: true, ref: data.ref, state: data.state };
    },
    async applyProperty(a) {
      const id = a.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.floor(Math.random() * 900 + 100);
      if (LIVE) {
        const { error } = await sb.rpc('apply_property', { p: a });
        return error ? fail(error) : { ok: true };
      }
      db.props.push({
        id, name: a.name, type: a.type, island: a.island, roomsTotal: a.roomsTotal, rating: 0, reviews: 0, tourist: a.tourist,
        route: a.island, seed: 200 + Math.floor(Math.random() * 400), status: 'pending', owner: 'applicant', contact: a.contactName + ' · ' + a.contactPhone,
        applied: today, blurb: a.blurb, amenities: a.amenities,
        rooms: [{ name: a.roomName, beds: a.beds || '1 queen', sleeps: a.sleeps, size: a.size || 18, local: a.local, intl: a.tourist ? a.intl : null }]
      });
      persist(); demoRefresh(); return { ok: true, id };
    },

    /* ---- sign-in ---- */
    async sendCode(contact) {
      if (!LIVE) return { ok: true, demo: true };
      const isEmail = contact.includes('@');
      const { error } = await sb.auth.signInWithOtp(isEmail ? { email: contact } : { phone: contact.replace(/\s/g, '') });
      return error ? fail(error) : { ok: true };
    },
    async verifyCode(contact, code, name) {
      if (!LIVE) {
        if (code !== '123456') return fail('code');
        db.user = { id: 'me', name, contact, role: 'guest' }; persist(); demoRefresh(); return { ok: true };
      }
      const isEmail = contact.includes('@');
      const { data, error } = await sb.auth.verifyOtp(isEmail ? { email: contact, token: code, type: 'email' } : { phone: contact.replace(/\s/g, ''), token: code, type: 'sms' });
      if (error) return fail(error);
      if (name) await sb.from('profiles').update({ name }).eq('id', data.user.id);
      await liveRefresh(scope); return { ok: true };
    },
    async signOut() {
      if (LIVE) { await sb.auth.signOut(); await liveRefresh(scope); }
      else { db.user = null; persist(); demoRefresh(); }
    },

    /* ---- property dashboard ---- */
    partnerSession: () => LIVE ? (cache.user && cache.user.role !== 'guest' ? cache.user : null) : db.partner,
    async partnerSignIn(pid) { if (!LIVE) { db.partner = { pid }; persist(); } },
    async partnerSignOut() { if (LIVE) return api.signOut(); db.partner = null; persist(); },
    partnerProps: () => LIVE ? cache.props.filter(p => cache.user && (p.owner === cache.user.id || cache.user.role === 'admin')) : cache.props.filter(p => p.status !== 'pending'),
    async setStatus(ref, status) {
      if (LIVE) { const { error } = await sb.rpc('set_booking_status', { p_ref: ref, p_status: status }); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      const b = db.bookings.find(x => x.ref === ref); if (!b) return fail('Booking not found');
      b.status = status; persist(); demoRefresh(); return { ok: true };
    },
    async slipDecision(ref, accept) {
      if (LIVE) { const { error } = await sb.rpc('review_slip', { p_ref: ref, p_accept: accept }); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      const b = db.bookings.find(x => x.ref === ref);
      b.status = accept ? 'confirmed' : 'awaiting_payment'; if (!accept) { b.slipRejected = b.slip; b.slip = null; }
      persist(); demoRefresh(); return { ok: true };
    },
    async updateRoom(pid, idx, fields) {
      if (LIVE) {
        const p = api.prop(pid);
        const row = {}; if ('local' in fields) row.local_rate = fields.local; if ('intl' in fields) row.intl_rate = fields.intl; if ('units' in fields) row.units = fields.units; if ('sleeps' in fields) row.sleeps = fields.sleeps; if ('name' in fields) row.name = fields.name;
        const { error } = await sb.from('room_types').update(row).eq('id', p.rooms[idx].id); if (error) return fail(error);
        await liveRefresh(scope); return { ok: true };
      }
      Object.assign(api.prop(pid).rooms[idx], fields); persist(); demoRefresh(); return { ok: true };
    },
    async updateProperty(pid, fields) {
      if (LIVE) {
        const row = {}; if ('blurb' in fields) row.blurb = fields.blurb; if ('amenities' in fields) row.amenities = fields.amenities; if ('name' in fields) row.name = fields.name;
        const { error } = await sb.from('properties').update(row).eq('id', pid); if (error) return fail(error);
        await liveRefresh(scope); return { ok: true };
      }
      Object.assign(api.prop(pid), fields); persist(); demoRefresh(); return { ok: true };
    },
    async toggleBlock(pid, idx, day) {
      const key = idx + '|' + day;
      if (LIVE) {
        const has = api.blocks(pid).includes(key);
        const q = has ? sb.from('blocks').delete().match({ property_id: pid, room_idx: idx, day }) : sb.from('blocks').insert({ property_id: pid, room_idx: idx, day });
        const { error } = await q; if (error) return fail(error); await liveRefresh(scope); return { ok: true, blocked: !has };
      }
      const arr = db.blocks[pid] = db.blocks[pid] || [];
      const i = arr.indexOf(key); if (i >= 0) arr.splice(i, 1); else arr.push(key);
      persist(); demoRefresh(); return { ok: true, blocked: i < 0 };
    },

    /* ---- admin ---- */
    adminSession: () => LIVE ? (cache.user && cache.user.role === 'admin') : !!db.admin,
    async adminSignIn() { if (!LIVE) { db.admin = true; persist(); } },
    async adminSignOut() { if (LIVE) return api.signOut(); db.admin = false; persist(); },
    async setPropStatus(pid, status) {
      if (LIVE) { const { error } = await sb.from('properties').update({ status }).eq('id', pid); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      const p = api.prop(pid); p.status = status; if (status === 'live' && p.owner === 'applicant') p.owner = 'demo-partner';
      persist(); demoRefresh(); return { ok: true };
    },
    async refund(ref) {
      if (LIVE) { const { data, error } = await sb.functions.invoke('bml-refund', { body: { ref } }); if (error) return fail(error); await liveRefresh(scope); return { ok: true, data }; }
      const b = db.bookings.find(x => x.ref === ref); b.status = 'refunded'; b.refunded = new Date().toISOString(); persist(); demoRefresh(); return { ok: true };
    },
    async toggleOperator(id) {
      if (LIVE) { const op = cache.operators.find(o => o.id === id); const { error } = await sb.from('operators').update({ active: !op.active }).eq('id', id); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      const op = db.operators.find(o => o.id === id); op.active = !op.active; persist(); demoRefresh(); return { ok: true };
    },
    async saveSettings(s) {
      if (LIVE) { const { error } = await sb.from('settings').upsert({ key: 'tax', value: s }); if (error) return fail(error); await liveRefresh(scope); return { ok: true }; }
      db.settings = Object.assign({}, P.defaults, s); persist(); demoRefresh(); return { ok: true };
    },
    async resetDemo() { if (!LIVE) { try { localStorage.removeItem(KEY); localStorage.removeItem('rs_bookings'); } catch (e) { /* ignore */ } db = seed(); persist(); demoRefresh(); } }
  };
  return api;
})();
