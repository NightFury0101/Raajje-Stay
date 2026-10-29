/* Raajje Stay — admin panel. Hash views: #overview #approvals #properties #bookings #operators #settings */
(function () {
  const D = window.RS_DATA, API = window.RS_API, PR = window.RS_PRICE, ART = window.RS_ART;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = API.today, addDays = API.addDays;
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const short = s => { const d = parse(s); return d.getDate() + ' ' + MON[d.getMonth()]; };
  const money = (n, res) => { const v = Math.round(n * 100) / 100; const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); return res ? 'MVR ' + s : '$' + s; };
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  const island = id => D.islands.find(i => i.id === id) || { code: '', name: id };
  const ST = { awaiting_payment: ['Awaiting payment', 'wait'], slip_review: ['Slip review', 'wait'], confirmed: ['Confirmed', 'ok'], checked_in: ['In house', 'live'], checked_out: ['Completed', ''], no_show: ['No-show', 'no'], cancelled: ['Cancelled', 'no'], refunded: ['Refunded', 'no'] };
  const pill = s => `<span class="pill ${(ST[s] || ['', ''])[1]}">${(ST[s] || [s])[0]}</span>`;
  const PST = { live: ['Live', 'live'], pending: ['Waiting for review', 'wait'], suspended: ['Suspended', 'no'], declined: ['Declined', 'no'] };
  const MODE = { speedboat: 'Speedboat', ferry: 'Public ferry', seaplane: 'Seaplane', flight: 'Domestic flight' };
  let bq = { q: '', status: 'all' };

  function toast(msg) {
    let el = $('.toast'); if (el) el.remove();
    el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); setTimeout(() => el.remove(), 2600);
  }
  const propName = id => (API.prop(id) || { name: id }).name;

  function renderLogin() {
    $('#top-right').innerHTML = '';
    app.innerHTML = `<div class="login"><h1 style="font-size:1.8rem">Admin panel</h1>
      <p class="muted">Approve properties, watch bookings across the platform, handle refunds and set tax rates.</p>
      ${API.LIVE ? `<form id="al" class="step" novalidate>
        <div class="field"><label for="al-email">Staff email</label><input class="input" id="al-email" type="email" autocomplete="email"></div>
        <div class="field" id="al-code-f" hidden><label for="al-code">Code</label><input class="input mono" id="al-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div>
        <span class="err-msg" id="al-err" role="alert"></span><button class="btn btn-primary" type="submit" id="al-go">Send code</button></form>`
      : `<form id="al" class="step" novalidate><button class="btn btn-primary" type="submit">Enter admin panel</button>
        <p class="demo-note">Demo mode: anyone can enter. With Supabase connected, only accounts marked as admin in the profiles table get in.</p></form>`}
      <a href="./" class="btn-link" style="justify-self:start">← Back to the public site</a></div>`;
  }

  const VIEWS = [['overview', 'Overview'], ['approvals', 'Approvals'], ['properties', 'Properties'], ['bookings', 'Bookings'], ['operators', 'Transfer operators'], ['settings', 'Taxes & settings']];
  function shell(view, inner) {
    const pending = API.allProps().filter(p => p.status === 'pending').length;
    $('#top-right').innerHTML = `<a class="btn btn-ghost btn-sm" href="./">Public site</a><button class="btn btn-ghost btn-sm" type="button" data-action="logout">Sign out</button>`;
    app.innerHTML = `<div class="dash"><aside class="rail">
      <nav aria-label="Admin">${VIEWS.map(([k, l]) => `<a href="#${k}" ${k === view ? 'aria-current="page"' : ''}>${l}${k === 'approvals' && pending ? `<span class="count">${pending}</span>` : ''}</a>`).join('')}</nav>
      <div class="rail-foot muted" style="font-size:.8rem">${API.LIVE ? 'Connected to Supabase' : 'Demo mode · data saved in this browser'}</div>
    </aside><section class="work">${inner}</section></div>`;
  }

  /* ---------- overview ---------- */
  function renderOverview() {
    const all = API.allBookings().filter(b => b.kind === 'stay');
    const month = today.slice(0, 7), mName = MON[parse(today).getMonth()];
    const inMonth = all.filter(b => b.created && b.created.slice(0, 7) === month);
    const earned = all.filter(b => ['confirmed', 'checked_in', 'checked_out'].includes(b.status) && b.in.slice(0, 7) === month);
    const mvr = earned.filter(b => b.resident).reduce((s, b) => s + b.payNow, 0);
    const usd = earned.filter(b => !b.resident).reduce((s, b) => s + b.payNow, 0);
    const green = earned.filter(b => !b.resident).reduce((s, b) => s + (b.green || 0), 0);
    const pending = API.allProps().filter(p => p.status === 'pending');
    const slips = all.filter(b => b.status === 'slip_review');
    const cx = inMonth.filter(b => ['cancelled', 'refunded'].includes(b.status)).length;
    const live = API.props();
    const byProp = live.map(p => ({ p, n: all.filter(b => b.pid === p.id && !['cancelled', 'refunded'].includes(b.status)).length })).sort((a, b) => b.n - a.n).slice(0, 8);
    const max = Math.max(1, ...byProp.map(x => x.n));
    const residentShare = all.length ? Math.round(all.filter(b => b.resident).length / all.length * 100) : 0;
    shell('overview', `
      <div class="work-head"><div><p class="eyebrow">${mName} ${today.slice(0, 4)}</p><h1>Platform overview</h1></div></div>
      <div class="kpis">
        <div class="kpi"><span class="k">Bookings made in ${mName}</span><span class="v">${inMonth.length}</span><span class="s">${cx} cancelled or refunded</span></div>
        <div class="kpi"><span class="k">Stay revenue, ${mName}</span><span class="v" style="font-size:1.1rem">${money(mvr, true)}</span><span class="s">+ ${money(usd, false)} visitors</span></div>
        <div class="kpi"><span class="k">Green Tax due, ${mName}</span><span class="v">${money(green, false)}</span><span class="s">Collected by properties for MIRA</span></div>
        <div class="kpi"><span class="k">Resident share</span><span class="v">${residentShare}%</span><span class="s">of all stays booked</span></div>
        <div class="kpi ${pending.length ? 'alert' : ''}"><span class="k">Properties to review</span><span class="v">${pending.length}</span><span class="s">${pending.length ? '<a href="#approvals">Review now</a>' : 'Queue is empty'}</span></div>
        <div class="kpi ${slips.length ? 'alert' : ''}"><span class="k">Bank slips waiting</span><span class="v">${slips.length}</span><span class="s">Checked by each property</span></div>
      </div>
      <div class="cols">
        <div class="panel"><div class="panel-head"><h2>Busiest properties</h2><span class="muted" style="font-size:.8rem">Active and completed stays</span></div>
          <div class="panel-body" style="display:grid;gap:10px">${byProp.map(x => `<div style="display:grid;grid-template-columns:minmax(0,170px) 1fr auto;gap:10px;align-items:center;font-size:.88rem"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(x.p.name)}</span><div style="background:var(--sunk);border-radius:3px;height:12px"><div style="background:var(--lagoon);height:100%;border-radius:3px;width:${x.n / max * 100}%"></div></div><span class="mono">${x.n}</span></div>`).join('')}</div></div>
        <div class="panel"><div class="panel-head"><h2>Latest bookings</h2><a href="#bookings" class="btn-link" style="font-size:.86rem">All bookings</a></div>
          <div class="rowlist">${API.allBookings().slice().sort((a, b) => (b.created || '').localeCompare(a.created || '')).slice(0, 7).map(b => `<div class="r"><div style="min-width:0"><div class="gname">${esc(b.name)}</div><div class="meta">${b.kind === 'stay' ? esc(propName(b.pid)) + ' · ' + short(b.in) : MODE[b.mode] + ' · ' + short(b.date)} · <span class="mono">${b.ref}</span></div></div><div style="text-align:end"><div class="mono" style="font-size:.86rem">${money(b.payNow, b.resident)}</div>${pill(b.status)}</div></div>`).join('')}</div></div>
      </div>`);
  }

  /* ---------- approvals ---------- */
  function renderApprovals() {
    const pending = API.allProps().filter(p => p.status === 'pending');
    shell('approvals', `
      <div class="work-head"><div><h1>Approvals</h1><p class="muted" style="margin-top:4px">New properties wait here until someone checks their tourism registration and rates.</p></div></div>
      ${pending.length ? pending.map(p => {
        const r = p.rooms[0];
        return `<article class="panel appcard"><div class="appcard-pic">${ART.draw(p.seed, p.type, { label: p.name }).replace('<svg ', '<svg style="position:absolute;inset:0;width:100%;height:100%" ')}</div>
          <div class="panel-body" style="display:grid;gap:8px">
            <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><span class="mono muted" style="font-size:.8rem">${island(p.island).code} ${esc(island(p.island).name)} · ${D.types[p.type].label} · ${p.roomsTotal} rooms</span><h2 style="font-size:1.25rem">${esc(p.name)}</h2></div><span class="muted" style="font-size:.82rem">Applied ${short(p.applied || today)}</span></div>
            <p style="max-width:70ch">${esc(p.blurb)}</p>
            <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:.88rem"><span><strong>${esc(r.name)}</strong> · sleeps ${r.sleeps}</span><span class="mono">${money(r.local, true)}${r.intl ? ' / ' + money(r.intl, false) : ''}</span><span>${p.tourist ? 'Tourist-registered' : '<span class="pill wait">Not tourist-registered: residents only</span>'}</span></div>
            <div class="muted" style="font-size:.86rem">Contact: ${esc(p.contact || '—')}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px"><button class="btn btn-primary btn-sm" data-action="pstat" data-id="${p.id}" data-value="live">Approve and publish</button><button class="btn btn-ghost btn-sm" data-action="pstat" data-id="${p.id}" data-value="declined">Decline</button></div>
          </div></article>`;
      }).join('') : `<div class="panel"><div class="rowlist"><div class="none">No properties waiting. New applications from <a href="./#list-property">List your property</a> appear here.</div></div></div>`}`);
  }

  /* ---------- properties ---------- */
  function renderProperties() {
    const list = API.allProps().filter(p => p.status !== 'pending').slice().sort((a, b) => a.name.localeCompare(b.name));
    shell('properties', `
      <div class="work-head"><div><h1>Properties</h1><p class="muted" style="margin-top:4px">${plural(list.filter(p => p.status === 'live').length, 'property', 'properties')} live.</p></div></div>
      <div class="panel"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Property</th><th>Island</th><th>Type</th><th style="text-align:end">Rooms</th><th style="text-align:end">From</th><th style="text-align:end">Rating</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${list.map(p => { const lo = Math.min(...p.rooms.map(r => r.local)); return `<tr><td><strong>${esc(p.name)}</strong>${p.tourist ? '' : '<div class="muted" style="font-size:.76rem">Residents only</div>'}</td><td class="mono" style="font-size:.84rem">${island(p.island).code} ${esc(island(p.island).name)}</td><td>${D.types[p.type].label}</td><td class="num">${p.roomsTotal}</td><td class="num">${money(lo, true)}</td><td class="num">${p.reviews ? p.rating.toFixed(1) : '—'}</td>
        <td><span class="pill ${PST[p.status][1]}">${PST[p.status][0]}</span></td>
        <td class="act">${p.status === 'live' ? `<button class="btn btn-ghost btn-sm" data-action="pstat" data-id="${p.id}" data-value="suspended">Suspend</button>` : `<button class="btn btn-ghost btn-sm" data-action="pstat" data-id="${p.id}" data-value="live">Reactivate</button>`}<a class="btn btn-ghost btn-sm" href="./#stay-${p.id}">View</a></td></tr>`; }).join('')}
      </tbody></table></div></div>`);
  }

  /* ---------- bookings ---------- */
  function renderBookings() {
    shell('bookings', `
      <div class="work-head"><div><h1>All bookings</h1><p class="muted" style="margin-top:4px">Stays and transfers across every property. Refunds go back through BML to the guest’s card.</p></div>
        <div class="toolbar"><label class="sr" for="aq">Search</label><input class="input" id="aq" placeholder="Name, reference or property" value="${esc(bq.q)}">
        <label class="sr" for="as">Status</label><select class="input" id="as"><option value="all">All statuses</option>${Object.keys(ST).map(k => `<option value="${k}">${ST[k][0]}</option>`).join('')}</select></div></div>
      <div class="panel"><div class="tbl-wrap" id="atable"></div></div>`);
    $('#as').value = bq.status;
    renderBTable();
  }
  function renderBTable() {
    const q = bq.q.toLowerCase();
    const list = API.allBookings().filter(b => (bq.status === 'all' || b.status === bq.status) && (!q || b.name.toLowerCase().includes(q) || b.ref.toLowerCase().includes(q) || (b.pid && propName(b.pid).toLowerCase().includes(q))))
      .slice().sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    $('#atable').innerHTML = list.length ? `<table class="tbl"><thead><tr><th>Ref</th><th>Guest</th><th>What</th><th>Dates</th><th>Paid by</th><th style="text-align:end">Amount</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead><tbody>
      ${list.map(b => {
        const refundable = b.pay === 'card' && ['cancelled', 'confirmed'].includes(b.status) && b.kind === 'stay';
        return `<tr><td class="mono" style="font-size:.8rem">${b.ref}${b.sample ? '<div class="muted" style="font-size:.7rem">sample</div>' : ''}</td><td><strong>${esc(b.name)}</strong><div class="muted" style="font-size:.76rem">${b.resident ? 'Resident' : 'Visitor'}</div></td>
          <td>${b.kind === 'stay' ? esc(propName(b.pid)) + `<div class="muted" style="font-size:.76rem">${esc(b.room)}</div>` : MODE[b.mode] || b.mode}</td>
          <td style="white-space:nowrap">${b.kind === 'stay' ? short(b.in) + ' – ' + short(b.out) : short(b.date) + ' ' + b.time}</td>
          <td>${{ card: 'Card', transfer: 'Bank transfer', property: 'At property' }[b.pay] || 'Card'}</td>
          <td class="num">${money(b.payNow, b.resident)}</td><td>${pill(b.status)}</td>
          <td class="act" data-act="${b.ref}">${refundable ? `<button class="btn btn-ghost btn-sm" data-action="ask-refund" data-ref="${b.ref}">Refund</button>` : ''}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="rowlist"><div class="none">No bookings match.</div></div>';
  }

  /* ---------- operators ---------- */
  function renderOperators() {
    const ops = API.operators();
    shell('operators', `
      <div class="work-head"><div><h1>Transfer operators</h1><p class="muted" style="margin-top:4px">Boats and flights guests can add to a booking. Turn an operator off to stop new transfer bookings with them.</p></div></div>
      <div class="panel"><div class="rowlist">${ops.map(o => `<div class="r"><div style="min-width:0"><div class="gname">${esc(o.name)} <span class="muted" style="font-weight:400;font-size:.84rem">· ${MODE[o.mode] || o.mode}</span></div><div class="meta">${esc(o.routes)} · <span class="mono">${esc(o.phone)}</span></div></div>
        <label class="check"><input type="checkbox" data-op="${o.id}" ${o.active ? 'checked' : ''}>${o.active ? 'Taking bookings' : 'Paused'}</label></div>`).join('')}</div></div>`);
  }

  /* ---------- settings ---------- */
  function renderSettings() {
    const s = API.settings();
    const f = (k, label, step, hint) => `<div class="field"><label for="s-${k}">${label}</label><input class="input mono" id="s-${k}" type="number" min="0" step="${step}" value="${s[k]}"><span class="muted" style="font-size:.78rem">${hint}</span></div>`;
    shell('settings', `
      <div class="work-head"><div><h1>Taxes &amp; settings</h1><p class="muted" style="margin-top:4px">Change these when MIRA changes the law. New rates apply to new bookings immediately; existing bookings keep the price they were booked at.</p></div></div>
      <form class="panel" id="sf" novalidate><div class="panel-body" style="display:grid;gap:16px">
        <div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
          ${f('service', 'Service charge (%)', '0.5', 'Added to the room rate at tourist-registered places')}
          ${f('tgst', 'T-GST (%)', '0.5', 'Tourism GST, on room + service charge. 17% since 1 Jul 2025')}
          ${f('gst', 'General GST (%)', '0.5', 'For apartments that aren’t tourist-registered')}
          ${f('greenHigh', 'Green Tax, resorts & hotels (USD)', '1', 'Per visitor per night. USD 12 since 1 Jan 2025')}
          ${f('greenLow', 'Green Tax, small guesthouses (USD)', '1', 'Inhabited-island guesthouses at or under the room limit')}
          ${f('greenRoomLimit', 'Small guesthouse room limit', '1', 'Guesthouses with this many rooms or fewer pay the lower rate')}
        </div>
        <span class="err-msg" id="sf-err" role="alert"></span>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" type="submit">Save tax settings</button><button class="btn btn-ghost" type="button" data-action="defaults">Restore 2026 rates</button></div>
      </div></form>
      ${API.LIVE ? '' : `<div class="panel"><div class="panel-head"><h2>Demo data</h2></div><div class="panel-body" style="display:grid;gap:10px;justify-items:start"><p class="muted" style="font-size:.9rem">Put back the sample properties and bookings and remove anything created while testing.</p><span id="reset-box"><button class="btn btn-ghost btn-sm" type="button" data-action="ask-reset">Reset demo data</button></span></div></div>`}`);
  }

  /* ---------- router & events ---------- */
  function render() {
    if (!API.adminSession()) { renderLogin(); return; }
    const v = location.hash.slice(1) || 'overview';
    ({ overview: renderOverview, approvals: renderApprovals, properties: renderProperties, bookings: renderBookings, operators: renderOperators, settings: renderSettings }[v] || renderOverview)();
    document.title = (VIEWS.find(x => x[0] === v) || VIEWS[0])[1] + ' · Raajje Stay Admin';
  }
  async function act(promise, msg) { const r = await promise; if (r && r.ok === false) { toast('That didn’t save: ' + r.error); return; } if (msg) toast(msg); render(); }

  document.addEventListener('click', async e => {
    const a = e.target.closest('[data-action]'); if (!a) return;
    const v = a.dataset.value;
    switch (a.dataset.action) {
      case 'pstat': await act(API.setPropStatus(a.dataset.id, v), { live: propName(a.dataset.id) + ' is live', declined: 'Application declined', suspended: propName(a.dataset.id) + ' suspended. It no longer shows on the site.' }[v]); break;
      case 'ask-refund': $('[data-act="' + a.dataset.ref + '"]').innerHTML = `<span class="muted" style="font-size:.8rem">Refund in full?</span> <button class="btn btn-sm btn-danger" data-action="refund" data-ref="${a.dataset.ref}">Refund</button><button class="btn btn-ghost btn-sm" data-action="re">Keep</button>`; break;
      case 'refund': {
        const r = await API.refund(a.dataset.ref);
        if (!r.ok) { toast('Refund failed: ' + r.error); break; }
        toast(API.LIVE && r.data && r.data.note ? r.data.note : 'Marked as refunded. In live mode you then return the money in the BML merchant portal.');
        render(); break;
      }
      case 're': render(); break;
      case 'defaults': PR && Object.keys(PR.defaults).forEach(k => { const el = $('#s-' + k); if (el) el.value = PR.defaults[k]; }); break;
      case 'ask-reset': $('#reset-box').innerHTML = `<span class="muted" style="font-size:.84rem">This deletes test bookings and applications.</span> <button class="btn btn-sm btn-danger" data-action="reset">Reset</button> <button class="btn btn-ghost btn-sm" data-action="re">Keep</button>`; break;
      case 'reset': await API.resetDemo(); await API.adminSignIn(); toast('Demo data reset'); render(); break;
      case 'logout': await API.adminSignOut(); location.hash = ''; render(); break;
    }
  });
  document.addEventListener('change', async e => {
    if (e.target.id === 'as') { bq.status = e.target.value; renderBTable(); }
    if (e.target.dataset.op) await act(API.toggleOperator(e.target.dataset.op), 'Operator updated');
  });
  document.addEventListener('input', e => { if (e.target.id === 'aq') { bq.q = e.target.value; renderBTable(); } });
  document.addEventListener('submit', async e => {
    e.preventDefault();
    if (e.target.id === 'al') {
      if (!API.LIVE) { await API.adminSignIn(); location.hash = 'overview'; render(); return; }
      const email = $('#al-email').value.trim(), cf = $('#al-code-f'), err = $('#al-err');
      if (cf.hidden) { const r = await API.sendCode(email); if (!r.ok) { err.textContent = r.error; return; } cf.hidden = false; $('#al-go').textContent = 'Sign in'; return; }
      const r = await API.verifyCode(email, $('#al-code').value.trim()); if (!r.ok) { err.textContent = 'That code didn’t work.'; return; }
      if (!API.adminSession()) { err.textContent = 'This account isn’t an admin.'; return; }
      render(); return;
    }
    if (e.target.id === 'sf') {
      const s = {}; let bad = false;
      Object.keys(PR.defaults).forEach(k => { const v = Number($('#s-' + k).value); if (!(v >= 0) || $('#s-' + k).value === '') bad = true; s[k] = v; });
      if (bad || s.tgst > 50 || s.service > 30) { $('#sf-err').textContent = 'Use numbers from 0 up. Percentages above 50% are almost certainly a typo.'; return; }
      await act(API.saveSettings(s), 'Tax settings saved. New bookings use these rates.');
    }
  });
  window.addEventListener('hashchange', render);
  window.addEventListener('storage', e => { if (e.key === 'rs_db') API.reload().then(render); });

  (async function boot() {
    app.innerHTML = '<div class="login"><p class="muted">Loading…</p></div>';
    try { await API.init({ scope: 'staff' }); } catch (err) { app.innerHTML = `<div class="login"><h2>Couldn’t load</h2><p class="muted">${esc(err.message)}</p></div>`; return; }
    render();
  })();
})();
