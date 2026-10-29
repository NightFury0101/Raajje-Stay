/* Raajje Stay — property dashboard. Hash views: #today #bookings #calendar #rooms #property */
(function () {
  const D = window.RS_DATA, API = window.RS_API, PR = window.RS_PRICE;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const today = API.today, addDays = API.addDays;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = s => { const d = parse(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  const short = s => { const d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const money = (n, res) => { const v = Math.round(n * 100) / 100; const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); return res ? 'MVR ' + s : '$' + s; };
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  const ST = { awaiting_payment: ['Awaiting payment', 'wait'], slip_review: ['Slip to check', 'wait'], confirmed: ['Confirmed', 'ok'], checked_in: ['In house', 'live'], checked_out: ['Checked out', ''], no_show: ['No-show', 'no'], cancelled: ['Cancelled', 'no'], refunded: ['Refunded', 'no'] };
  const pill = s => `<span class="pill ${ST[s][1]}">${ST[s][0]}</span>`;
  const ACTIVE = API.ACTIVE;
  let pid = null, filter = { status: 'all', q: '' };

  function toast(msg) {
    let el = $('.toast'); if (el) el.remove();
    el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }
  const P = () => API.prop(pid);
  const bookings = () => API.propBookings(pid);
  const guests = b => b.adults + b.children + (b.infants ? ' +' + b.infants + ' inf' : '');

  /* ---------- login ---------- */
  function renderLogin() {
    $('#top-right').innerHTML = '';
    const props = API.partnerProps();
    app.innerHTML = API.LIVE ? `
      <div class="login"><h1 style="font-size:1.8rem">Property dashboard</h1>
        <p class="muted">Sign in with the email address you registered your property with. We’ll send you a 6-digit code.</p>
        <form id="pl" class="step" novalidate>
          <div class="field"><label for="pl-email">Email</label><input class="input" id="pl-email" type="email" autocomplete="email"></div>
          <div class="field" id="pl-code-f" hidden><label for="pl-code">Code</label><input class="input mono" id="pl-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>
          <span class="err-msg" id="pl-err" role="alert"></span>
          <button class="btn btn-primary" type="submit" id="pl-go">Send code</button>
        </form></div>` : `
      <div class="login"><h1 style="font-size:1.8rem">Property dashboard</h1>
        <p class="muted">Manage bookings, rates and availability for your guesthouse, hotel or resort.</p>
        <form id="pl" class="step" novalidate>
          <div class="field"><label for="pl-prop">Open the dashboard for</label>
            <select class="input" id="pl-prop">${props.map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div>
          <button class="btn btn-primary" type="submit">Open dashboard</button>
          <p class="demo-note">Demo mode: pick any property. With Supabase connected, owners sign in with an emailed code and only see their own property.</p>
        </form>
        <a href="index.html" class="btn-link" style="justify-self:start">← Back to the public site</a></div>`;
  }

  /* ---------- shell ---------- */
  const VIEWS = [['today', 'Today'], ['bookings', 'Bookings'], ['calendar', 'Availability'], ['rooms', 'Rooms & rates'], ['property', 'Property page']];
  function shell(view, inner) {
    const props = API.partnerProps();
    const slips = bookings().filter(b => b.status === 'slip_review').length;
    $('#top-right').innerHTML = `<a class="btn btn-ghost btn-sm" href="index.html#stay-${pid}">View public page</a><button class="btn btn-ghost btn-sm" type="button" data-action="logout">Sign out</button>`;
    app.innerHTML = `<div class="dash">
      <aside class="rail">
        ${props.length > 1 ? `<div class="prop-pick"><label class="eyebrow" for="prop-sw">Property</label><select class="input" id="prop-sw">${props.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>` : `<div><span class="eyebrow">Property</span><div style="font-weight:700;margin-top:4px">${esc(P().name)}</div></div>`}
        <nav aria-label="Dashboard">${VIEWS.map(([k, l]) => `<a href="#${k}" ${k === view ? 'aria-current="page"' : ''}>${l}${k === 'bookings' && slips ? `<span class="count" title="Bank slips to check">${slips}</span>` : ''}</a>`).join('')}</nav>
        <div class="rail-foot muted" style="font-size:.8rem">${API.LIVE ? '' : 'Demo data includes sample bookings so the dashboard has something to show.'}</div>
      </aside>
      <section class="work">${inner}</section>
    </div>`;
  }

  /* ---------- today ---------- */
  function occupancy(days) {
    const p = P(); const total = p.rooms.reduce((s, r, i) => s + API.unitsOf(p, i), 0);
    const bl = API.blocks(pid);
    return Array.from({ length: days }, (_, k) => {
      const d = addDays(today, k);
      const used = bookings().filter(b => ACTIVE.includes(b.status) && b.in <= d && d < b.out).reduce((s, b) => s + (b.rooms || 1), 0);
      const blocked = p.rooms.reduce((s, r, i) => s + (bl.includes(i + '|' + d) ? API.unitsOf(p, i) : 0), 0);
      return { d, pct: Math.min(100, Math.round((used + blocked) / total * 100)), used, total };
    });
  }
  function renderToday() {
    const all = bookings();
    const arrivals = all.filter(b => b.in === today && ['confirmed', 'awaiting_payment', 'slip_review'].includes(b.status));
    const departures = all.filter(b => b.out === today && b.status === 'checked_in');
    const inhouse = all.filter(b => b.status === 'checked_in');
    const slips = all.filter(b => b.status === 'slip_review');
    const late = all.filter(b => b.status === 'checked_in' && b.out < today);
    const occ = occupancy(14);
    const occ30 = occupancy(30); const avg = Math.round(occ30.reduce((s, o) => s + o.pct, 0) / occ30.length);
    const month = today.slice(0, 7);
    const rev = (res) => all.filter(b => b.resident === res && ['confirmed', 'checked_in', 'checked_out'].includes(b.status) && b.in.slice(0, 7) === month).reduce((s, b) => s + b.payNow, 0);
    const row = (b, btns) => `<div class="r"><div style="min-width:0"><div class="gname">${esc(b.name)} <span class="rt ${b.resident ? '' : 'v'}">${b.resident ? 'RES' : 'VIS'}</span></div>
      <div class="meta">${esc(b.room)} · ${short(b.in)}–${short(b.out)} · ${plural(b.adults + b.children, 'guest')} · <span class="mono">${b.ref}</span>${b.transfer ? ' · ' + b.transfer.mode + ' ' + b.transfer.time : ''}</div></div><div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${btns}</div></div>`;
    shell('today', `
      <div class="work-head"><div><p class="eyebrow">${fmtDate(today)}</p><h1>Good to see you. Here’s today.</h1></div></div>
      <div class="kpis">
        <div class="kpi"><span class="k">Arrivals today</span><span class="v">${arrivals.length}</span><span class="s">${plural(arrivals.reduce((s, b) => s + b.adults + b.children, 0), 'guest')}</span></div>
        <div class="kpi"><span class="k">Departures today</span><span class="v">${departures.length}</span><span class="s">${late.length ? late.length + ' overdue check-out' : 'Check-out by 12:00'}</span></div>
        <div class="kpi"><span class="k">In house</span><span class="v">${inhouse.length}</span><span class="s">${plural(inhouse.reduce((s, b) => s + b.adults + b.children, 0), 'guest')}</span></div>
        <div class="kpi"><span class="k">Occupancy, next 30 days</span><span class="v">${avg}%</span><span class="s">Booked and blocked rooms</span></div>
        <div class="kpi"><span class="k">Revenue, ${MON[parse(today).getMonth()]}</span><span class="v" style="font-size:1.1rem">${money(rev(true), true)}</span><span class="s">+ ${money(rev(false), false)} from visitors</span></div>
        <div class="kpi ${slips.length ? 'alert' : ''}"><span class="k">Bank slips to check</span><span class="v">${slips.length}</span><span class="s">${slips.length ? 'Guests are waiting' : 'All clear'}</span></div>
      </div>
      <div class="panel"><div class="panel-head"><h2>Occupancy, next 14 days</h2><span class="muted" style="font-size:.82rem">Weekends tinted</span></div>
        <div class="panel-body"><div class="bars" role="img" aria-label="Occupancy for the next 14 days: ${occ.map(o => o.pct + '%').join(', ')}">${occ.map(o => { const dw = parse(o.d).getDay(); return `<div class="b ${dw === 5 || dw === 6 ? 'wknd' : ''}" title="${fmtDate(o.d)}: ${o.pct}%"><span class="lbl">${o.pct}</span><div class="fill" style="height:${Math.max(2, o.pct)}%"></div><span class="lbl">${DOW[dw][0]}${parse(o.d).getDate()}</span></div>`; }).join('')}</div></div></div>
      <div class="cols">
        <div class="panel"><div class="panel-head"><h2>Arriving today</h2></div><div class="rowlist">${arrivals.length ? arrivals.map(b => row(b, b.status === 'confirmed' ? `<button class="btn btn-primary btn-sm" data-action="status" data-ref="${b.ref}" data-value="checked_in">Check in</button><button class="btn btn-ghost btn-sm" data-action="status" data-ref="${b.ref}" data-value="no_show">No-show</button>` : pill(b.status))).join('') : '<div class="none">No arrivals today.</div>'}</div></div>
        <div class="panel"><div class="panel-head"><h2>Leaving today</h2></div><div class="rowlist">${departures.concat(late).length ? departures.concat(late).map(b => row(b, `<button class="btn btn-primary btn-sm" data-action="status" data-ref="${b.ref}" data-value="checked_out">Check out</button>`)).join('') : '<div class="none">No departures today.</div>'}</div></div>
        <div class="panel"><div class="panel-head"><h2>Bank slips to check</h2></div><div class="rowlist">${slips.length ? slips.map(b => row(b, slipBtns(b))).join('') : '<div class="none">Nothing waiting. Slips appear here when guests pay by bank transfer.</div>'}</div></div>
      </div>`);
  }
  const slipBtns = b => `<span class="muted" style="font-size:.8rem;align-self:center">${money(b.payNow, b.resident)} · ${esc(String(b.slip || '').split('/').pop())}</span><button class="btn btn-primary btn-sm" data-action="slip" data-ref="${b.ref}" data-value="1">Payment received</button><button class="btn btn-ghost btn-sm" data-action="slip" data-ref="${b.ref}" data-value="0">Doesn’t match</button>`;

  /* ---------- bookings ---------- */
  function actions(b) {
    const s = b.status;
    if (s === 'slip_review') return `<button class="btn btn-primary btn-sm" data-action="slip" data-ref="${b.ref}" data-value="1">Accept slip</button><button class="btn btn-ghost btn-sm" data-action="slip" data-ref="${b.ref}" data-value="0">Reject</button>`;
    if (s === 'confirmed' && b.in <= today) return `<button class="btn btn-primary btn-sm" data-action="status" data-ref="${b.ref}" data-value="checked_in">Check in</button><button class="btn btn-ghost btn-sm" data-action="status" data-ref="${b.ref}" data-value="no_show">No-show</button>`;
    if (s === 'confirmed' || s === 'awaiting_payment') return `<button class="btn btn-ghost btn-sm" data-action="ask-cancel" data-ref="${b.ref}">Cancel</button>`;
    if (s === 'checked_in') return `<button class="btn btn-primary btn-sm" data-action="status" data-ref="${b.ref}" data-value="checked_out">Check out</button>`;
    return '';
  }
  function renderBookings() {
    shell('bookings', `
      <div class="work-head"><div><h1>Bookings</h1><p class="muted" style="margin-top:4px">Every stay at ${esc(P().name)}. Amounts are what the guest pays the property, before Green Tax.</p></div>
        <div class="toolbar"><label class="sr" for="bf-q">Search</label><input class="input" id="bf-q" placeholder="Name or reference" value="${esc(filter.q)}">
        <label class="sr" for="bf-s">Status</label><select class="input" id="bf-s"><option value="all">All statuses</option><option value="upcoming">Upcoming</option>${Object.keys(ST).map(k => `<option value="${k}" ${filter.status === k ? 'selected' : ''}>${ST[k][0]}</option>`).join('')}</select></div></div>
      <div class="panel"><div class="tbl-wrap" id="btable"></div></div>`);
    $('#bf-s').value = filter.status;
    renderTable();
  }
  function renderTable() {
    const q = filter.q.toLowerCase();
    const list = bookings().filter(b => (filter.status === 'all' || (filter.status === 'upcoming' ? b.in >= today && ACTIVE.includes(b.status) : b.status === filter.status)) && (!q || b.name.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q)))
      .sort((a, b) => a.in < b.in ? -1 : a.in > b.in ? 1 : 0);
    $('#btable').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>Guest</th><th>Ref</th><th>Room</th><th>Dates</th><th>Guests</th><th>Rate</th><th style="text-align:end">Amount</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${list.map(b => `<tr data-row="${b.ref}"><td><strong>${esc(b.name)}</strong><div class="muted" style="font-size:.78rem">${esc(b.phone || '')}</div></td><td class="mono" style="font-size:.8rem">${b.ref}</td><td>${b.rooms > 1 ? b.rooms + ' × ' : ''}${esc(b.room)}</td>
        <td style="white-space:nowrap">${short(b.in)} – ${short(b.out)}<div class="muted" style="font-size:.78rem">${plural(b.nights, 'night')}</div></td><td class="mono">${guests(b)}</td>
        <td><span class="rt ${b.resident ? '' : 'v'}">${b.resident ? 'RES' : 'VIS'}</span></td><td class="num">${money(b.payNow, b.resident)}${b.green ? `<div class="muted" style="font-size:.74rem">+ $${b.green} Green Tax</div>` : ''}</td>
        <td>${pill(b.status)}${b.pay === 'transfer' ? '<div class="muted" style="font-size:.74rem;margin-top:3px">Bank transfer</div>' : b.pay === 'property' ? '<div class="muted" style="font-size:.74rem;margin-top:3px">Pay on arrival</div>' : ''}</td>
        <td class="act" data-act="${b.ref}">${actions(b)}</td></tr>`).join('')}
      </tbody></table>` : `<div class="rowlist"><div class="none">No bookings match. Try another status or clear the search.</div></div>`;
  }

  /* ---------- calendar ---------- */
  let calStart = today;
  function renderCalendar() {
    const p = P(), days = Array.from({ length: 21 }, (_, k) => addDays(calStart, k));
    const bl = API.blocks(pid);
    shell('calendar', `
      <div class="work-head"><div><h1>Availability</h1><p class="muted" style="margin-top:4px">Rooms free each night. Tap a night to block it (for repairs or private use) or open it again.</p></div>
        <div class="toolbar"><button class="btn btn-ghost btn-sm" data-action="cal" data-value="-21" ${calStart <= today ? 'disabled' : ''}>← Earlier</button><button class="btn btn-ghost btn-sm" data-action="cal" data-value="0">Today</button><button class="btn btn-ghost btn-sm" data-action="cal" data-value="21">Later →</button></div></div>
      <div class="panel"><div class="panel-body cal-wrap">
        <table class="cal"><thead><tr><th class="rtn">Room type</th>${days.map(d => { const x = parse(d); return `<th>${DOW[x.getDay()].slice(0, 2)}<br>${x.getDate()}</th>`; }).join('')}</tr></thead>
        <tbody>${p.rooms.map((r, i) => `<tr><th class="rtn">${esc(r.name)}<div class="muted mono" style="font-size:.72rem;font-weight:400">${API.unitsOf(p, i)} rooms</div></th>${days.map(d => {
          const blocked = bl.includes(i + '|' + d);
          const left = API.available(pid, i, d, addDays(d, 1));
          const units = API.unitsOf(p, i);
          const cls = blocked ? 'blocked' : left === 0 ? 'full' : left < units ? 'some' : 'free';
          return `<td class="cell ${cls}" tabindex="0" role="button" data-action="block" data-idx="${i}" data-day="${d}" aria-label="${esc(r.name)}, ${fmtDate(d)}: ${blocked ? 'blocked' : left + ' of ' + units + ' free'}">${blocked ? '✕' : left}</td>`;
        }).join('')}</tr>`).join('')}</tbody></table>
        <div class="legend" style="margin-top:14px"><span><i style="background:color-mix(in srgb,var(--ok) 14%,var(--surface))"></i>All free</span><span><i style="background:color-mix(in srgb,var(--sun) 30%,var(--surface))"></i>Some booked</span><span><i style="background:color-mix(in srgb,var(--err) 14%,var(--surface))"></i>Full</span><span><i style="background:repeating-linear-gradient(45deg,var(--sunk),var(--sunk) 3px,var(--line) 3px,var(--line) 6px)"></i>Blocked by you</span></div>
      </div></div>`);
  }

  /* ---------- rooms & rates ---------- */
  function renderRooms() {
    const p = P(), s = API.settings();
    shell('rooms', `
      <div class="work-head"><div><h1>Rooms &amp; rates</h1><p class="muted" style="margin-top:4px">Nightly rates before service charge and tax. Guests see totals with ${s.service}% service charge and ${p.tourist ? s.tgst + '% T-GST' : s.gst + '% GST'} added.</p></div></div>
      ${p.tourist ? '' : '<p class="notice warn">This property isn’t tourist-registered, so only residents can book it and there is no visitor rate.</p>'}
      <div class="panel">${p.rooms.map((r, i) => {
        const q1 = p.tourist && r.intl ? PR.quote(p, i, { in: today, out: addDays(today, 1), adults: 2, children: 0, infants: 0, rooms: 1 }, false, s) : null;
        return `<form class="roomform" data-room="${i}" novalidate>
          <div class="field wide"><label for="rn${i}">Room type</label><input class="input" id="rn${i}" name="name" value="${esc(r.name)}"></div>
          <div class="field"><label for="rs${i}">Sleeps</label><input class="input" id="rs${i}" name="sleeps" type="number" min="1" max="12" value="${r.sleeps}"></div>
          <div class="field"><label for="ru${i}">Rooms</label><input class="input" id="ru${i}" name="units" type="number" min="0" max="500" value="${API.unitsOf(p, i)}"></div>
          <div class="field"><label for="rl${i}">Resident (MVR)</label><input class="input" id="rl${i}" name="local" type="number" min="1" step="10" value="${r.local}"></div>
          <div class="field"><label for="ri${i}">Visitor (USD)</label><input class="input" id="ri${i}" name="intl" type="number" min="1" step="1" value="${r.intl ?? ''}" ${p.tourist ? '' : 'disabled placeholder="Residents only"'}></div>
          <button class="btn btn-primary" type="submit">Save</button>
          ${q1 ? `<p class="muted wide" style="font-size:.8rem;grid-column:1/-1;margin:0">A visitor couple pays ${money(q1.payNow, false)} a night, plus ${money(q1.green, false)} Green Tax at check-out.</p>` : ''}
        </form>`;
      }).join('')}</div>`);
  }

  /* ---------- property page ---------- */
  const ALL_AMEN = [...new Set(D.properties.flatMap(p => p.amenities))].sort();
  function renderProperty() {
    const p = P();
    shell('property', `
      <div class="work-head"><div><h1>Property page</h1><p class="muted" style="margin-top:4px">What guests read on your listing.</p></div><a class="btn btn-ghost btn-sm" href="index.html#stay-${pid}">Preview</a></div>
      <form class="panel" id="pp" novalidate><div class="panel-body" style="display:grid;gap:16px">
        <div class="field"><label for="pp-name">Name</label><input class="input" id="pp-name" value="${esc(p.name)}"></div>
        <div class="field"><label for="pp-blurb">Description</label><textarea class="input" id="pp-blurb" rows="5">${esc(p.blurb)}</textarea><span class="muted" style="font-size:.8rem">The first sentence shows on search results.</span><span class="err-msg" data-err="pp"></span></div>
        <div class="field"><span class="lbl">Features</span><div class="amen-toggle">${ALL_AMEN.map(a => `<button type="button" class="chip" data-action="amen" aria-pressed="${p.amenities.includes(a)}" data-value="${esc(a)}">${esc(a)}</button>`).join('')}</div></div>
        <div class="field"><span class="lbl">Listing status</span><div>${p.status === 'live' ? '<span class="pill live">Live</span>' : `<span class="pill wait">${esc(p.status)}</span>`}</div></div>
        <button class="btn btn-primary" type="submit" style="justify-self:start">Save changes</button>
      </div></form>`);
  }

  /* ---------- router & events ---------- */
  function render() {
    if (!pid || !API.prop(pid)) { renderLogin(); return; }
    const v = location.hash.slice(1) || 'today';
    ({ today: renderToday, bookings: renderBookings, calendar: renderCalendar, rooms: renderRooms, property: renderProperty }[v] || renderToday)();
    document.title = (VIEWS.find(x => x[0] === v) || VIEWS[0])[1] + ' · ' + P().name;
  }
  async function act(promise, msg) { const r = await promise; if (r && r.ok === false) { toast('That didn’t save: ' + r.error); return false; } if (msg) toast(msg); render(); return true; }

  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    const v = a.dataset.value, ref = a.dataset.ref;
    switch (a.dataset.action) {
      case 'status': await act(API.setStatus(ref, v), { checked_in: 'Checked in', checked_out: 'Checked out', no_show: 'Marked as no-show' }[v]); break;
      case 'slip': await act(API.slipDecision(ref, v === '1'), v === '1' ? 'Payment accepted. The guest’s booking is confirmed.' : 'Slip rejected. The guest will be asked for a new one.'); break;
      case 'ask-cancel': $('[data-act="' + ref + '"]').innerHTML = `<span class="muted" style="font-size:.8rem">Cancel and tell the guest?</span> <button class="btn btn-sm btn-danger" data-action="do-cancel" data-ref="${ref}">Yes, cancel</button><button class="btn btn-ghost btn-sm" data-action="re-render">Keep</button>`; break;
      case 'do-cancel': await act(API.cancel(ref, 'property'), 'Booking ' + ref + ' cancelled'); break;
      case 're-render': render(); break;
      case 'cal': calStart = v === '0' ? today : addDays(calStart, Number(v)); if (calStart < today) calStart = today; render(); break;
      case 'block': { const r = await API.toggleBlock(pid, Number(a.dataset.idx), a.dataset.day); if (r.ok) { render(); const c = $(`[data-idx="${a.dataset.idx}"][data-day="${a.dataset.day}"]`); if (c) c.focus(); toast(r.blocked ? 'Night blocked' : 'Night opened'); } else toast(r.error); break; }
      case 'amen': a.setAttribute('aria-pressed', String(a.getAttribute('aria-pressed') !== 'true')); break;
      case 'logout': await API.partnerSignOut(); pid = null; location.hash = ''; render(); break;
    }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('td.cell')) { e.preventDefault(); e.target.click(); } });
  document.addEventListener('change', e => {
    if (e.target.id === 'prop-sw') { pid = e.target.value; API.partnerSignIn(pid); render(); }
    if (e.target.id === 'bf-s') { filter.status = e.target.value; renderTable(); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'bf-q') { filter.q = e.target.value; renderTable(); } });
  document.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target;
    if (f.id === 'pl') {
      if (!API.LIVE) { pid = $('#pl-prop').value; await API.partnerSignIn(pid); location.hash = 'today'; render(); return; }
      const email = $('#pl-email').value.trim(), cf = $('#pl-code-f'), err = $('#pl-err');
      if (cf.hidden) { const r = await API.sendCode(email); if (!r.ok) { err.textContent = r.error; return; } cf.hidden = false; $('#pl-go').textContent = 'Sign in'; $('#pl-code').focus(); return; }
      const r = await API.verifyCode(email, $('#pl-code').value.trim()); if (!r.ok) { err.textContent = 'That code didn’t work.'; return; }
      const mine = API.partnerProps(); if (!mine.length) { err.textContent = 'This email isn’t linked to a property yet. Contact Raajje Stay support.'; return; }
      pid = mine[0].id; render(); return;
    }
    if (f.dataset.room != null) {
      const i = Number(f.dataset.room), p = P(), val = n => f.elements[n].value;
      const fields = { name: val('name').trim(), sleeps: Number(val('sleeps')), units: Number(val('units')), local: Number(val('local')) };
      if (p.tourist) fields.intl = Number(val('intl'));
      if (!fields.name || !(fields.local > 0) || (p.tourist && !(fields.intl > 0)) || !(fields.sleeps > 0) || !(fields.units >= 0)) { toast('Fill in every field with a number above zero.'); return; }
      await act(API.updateRoom(pid, i, fields), fields.name + ' saved. New rates show on the site now.');
    }
    if (f.id === 'pp') {
      const blurb = $('#pp-blurb').value.trim(), name = $('#pp-name').value.trim();
      if (blurb.length < 30 || name.length < 3) { $('[data-err="pp"]').textContent = 'Write at least 30 characters, and keep a name.'; return; }
      await act(API.updateProperty(pid, { name, blurb, amenities: $$('[data-action="amen"][aria-pressed="true"]').map(x => x.dataset.value) }), 'Property page saved');
    }
  });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', e => { if (e.key === 'rs_db') API.reload().then(render); });

  (async function boot() {
    app.innerHTML = '<div class="login"><p class="muted">Loading…</p></div>';
    try { await API.init({ scope: 'staff' }); } catch (err) { app.innerHTML = `<div class="login"><h2>Couldn’t load the dashboard</h2><p class="muted">${esc(err.message)}</p></div>`; return; }
    const s = API.partnerSession();
    if (s) pid = API.LIVE ? (API.partnerProps()[0] || {}).id : s.pid;
    render();
  })();
})();
