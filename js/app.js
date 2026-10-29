/* Raajje Stay — public site. Hash routes:
   #home  #stays  #stay-<id>  #transfers  #trips  #checkout  #done-<ref>  #list-property */
(function () {
  const D = window.RS_DATA, ART = window.RS_ART, API = window.RS_API, PR = window.RS_PRICE, I = window.RS_I18N;
  const t = k => I.t(k);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app'), layer = $('#layer');

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const nightsBetween = PR.nights;
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = s => { const d = parse(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  const today = iso(new Date());

  /* ---------- prefs ---------- */
  const pref = {
    get(k, d) { try { const v = localStorage.getItem('rs_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rs_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- state ---------- */
  const S = {
    resident: pref.get('resident', false),
    search: { where: 'any', in: addDays(today, 14), out: addDays(today, 17), adults: 2, children: 0, infants: 0 },
    filters: { types: [], atolls: [], max: null, amen: [], sort: 'rec' },
    sel: null, pending: null, filtersOpen: false, busy: false,
    tr: { to: 'maafushi', date: addDays(today, 14), adults: 2, children: 0, infants: 0, pick: null },
    left: {}  // live-mode availability results: key pid|idx|in|out -> number
  };

  /* ---------- money & lookups ---------- */
  function money(n, res = S.resident) {
    const v = Math.round(n * 100) / 100;
    const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return res ? 'MVR ' + s : '$' + s;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const island = id => D.islands.find(i => i.id === id);
  const live = () => API.props();
  const prop = id => { const p = API.prop(id); return p && p.status === 'live' ? p : null; };
  const anyProp = id => API.prop(id);
  const roomPrice = (room, res = S.resident) => res ? room.local : room.intl;
  const bookable = (p, res = S.resident) => res || (p.tourist && p.rooms.some(r => r.intl != null));
  const fromPrice = (p, res = S.resident) => { const v = p.rooms.map(r => roomPrice(r, res)).filter(v => v != null); return v.length ? Math.min(...v) : null; };
  const locLine = p => { const i = island(p.island) || { code: '', name: p.island }; return i.code + ' ' + (i.private ? i.atoll + ' Atoll' : i.name); };
  const guestCount = g => g.adults + g.children;
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));
  const quote = (p, idx, g, res = S.resident) => PR.quote(p, idx, g, res, API.settings());
  function partLabel(x, res = S.resident) {
    if (x.key === 'room') return money(x.price, res) + ' × ' + plural(x.nights, 'night') + (x.rooms > 1 ? ' × ' + x.rooms + ' rooms' : '');
    if (x.key === 'service') return 'Service charge ' + x.rate + '%';
    if (x.key === 'tgst') return 'T-GST ' + x.rate + '%';
    if (x.key === 'gst') return 'GST ' + x.rate + '%';
    if (x.key === 'green') return x.exempt ? 'Green Tax' : 'Green Tax $' + x.rate + ' × ' + plural(x.guests, 'guest') + ' × ' + plural(x.nights, 'night');
    return x.key;
  }
  const ledgerRows = (q, res = S.resident) => q.parts.map(x => `<div><span>${partLabel(x, res)}</span><span class="v">${money(x.v, res)}</span></div>`).join('');
  const greenRow = (q, res = S.resident, note) => q.greenPart ? `<div><span>${partLabel(q.greenPart, res)}${note ? `<br><small class="muted">${note}</small>` : ''}</span><span class="v">${q.greenPart.exempt ? 'Exempt' : money(q.greenPart.v, res)}</span></div>` : '';

  /* rooms left: sync in demo, fetched in live mode */
  function roomsLeft(pid, idx, inD, outD) {
    if (!API.LIVE) return API.available(pid, idx, inD, outD);
    const k = [pid, idx, inD, outD].join('|');
    if (!(k in S.left)) {
      S.left[k] = null;
      API.availableLive(pid, idx, inD, outD).then(v => { S.left[k] = v; const p = prop(pid); if (p && location.hash === '#stay-' + pid) { renderRooms(p); renderBook(p); } });
    }
    return S.left[k];
  }

  /* ---------- icons ---------- */
  const IC = {
    speedboat: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 16h17l3-4H9L6 9H3l1 4"/><path d="M2 20q2.5-1.5 5 0t5 0 5 0 5 0"/></svg>',
    ferry: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 15h18l-2 4H5z"/><path d="M6 15V9h12v6M9 9V6h6v3"/><path d="M2 21q2.5-1.5 5 0t5 0 5 0 5 0"/></svg>',
    seaplane: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 11h15l3-3M7 11l-2-4M10 7h6"/><path d="M6 11v4M15 11v4M4 15h14"/><path d="M2 20q2.5-1.5 5 0t5 0 5 0 5 0"/></svg>',
    flight: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 14l20-6-3 6-8 1-4 5H5l2-5z"/></svg>',
    car: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 16v-4l2-5h14l2 5v4H3z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',
    bus: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 21v-3M16 21v-3"/></svg>',
    check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12l5 5 9-10"/></svg>'
  };
  const MODE = { speedboat: 'Speedboat', ferry: 'Public ferry', seaplane: 'Seaplane', flight: 'Domestic flight', car: 'Taxi', bus: 'Bus' };
  const dur = m => m < 60 ? m + ' min' : Math.floor(m / 60) + 'h' + (m % 60 ? ' ' + pad(m % 60) : '');
  function runsOn(opt, dateStr) {
    const d = parse(dateStr).getDay();
    if (/^Daily/.test(opt.days)) return true;
    if (opt.days === 'Sat–Thu') return d !== 5;
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return opt.days.split(',').map(s => map[s.trim()]).includes(d);
  }
  const fastest = key => (D.routes[key] || []).slice().sort((a, b) => a.mins - b.mins)[0];
  const routeName = key => {
    const p = live().find(x => x.route === key && island(x.island) && island(x.island).private);
    if (p) return p.name + ' (' + island(p.island).code + ')';
    const i = island(key); return i ? i.name + ' (' + i.code + ')' : key;
  };

  /* ---------- UI helpers ---------- */
  let toastT;
  function toast(msg) {
    let el = $('.toast'); if (el) el.remove();
    el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status'); el.textContent = msg;
    document.body.appendChild(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), 2800);
  }
  function syncHeader() {
    $('#who-res').setAttribute('aria-pressed', S.resident ? 'true' : 'false');
    $('#who-vis').setAttribute('aria-pressed', S.resident ? 'false' : 'true');
    const u = API.user();
    $('#signin-label').textContent = u ? u.name.split(' ')[0] : t('signin');
    $('#signin-btn').setAttribute('aria-label', u ? 'Account: ' + u.name : t('signin'));
    $('#lang-btn').textContent = t('lang');
    $('#lang-btn').setAttribute('lang', I.lang === 'dv' ? 'en' : 'dv');
  }
  function setResident(v) {
    if (S.resident === v) return;
    S.resident = v; pref.set('resident', v); S.filters.max = null;
    syncHeader(); render(false);
    toast(v ? 'Showing resident rates in MVR' : 'Showing visitor rates in USD');
  }
  const statusLabel = s => t('st.' + s);
  const statusClass = s => ({ confirmed: 'ok', checked_in: 'ok', checked_out: 'done', awaiting_payment: 'wait', slip_review: 'wait', cancelled: 'no', no_show: 'no', refunded: 'no' }[s] || '');

  /* ---------- shared pieces ---------- */
  function whereOptions(sel) {
    const groups = {};
    D.islands.forEach(i => { (groups[i.code + ' ' + i.atoll] = groups[i.code + ' ' + i.atoll] || []).push(i); });
    let o = `<option value="any"${sel === 'any' ? ' selected' : ''}>${t('search.anywhere')}</option>`;
    Object.keys(groups).forEach(g => {
      o += `<optgroup label="${esc(g)} Atoll">` + groups[g].map(i => {
        const label = i.private ? (live().find(p => p.island === i.id) || {}).name || i.name : i.name;
        return `<option value="${i.id}"${sel === i.id ? ' selected' : ''}>${esc(label)}${i.private ? ' (resort island)' : ''}</option>`;
      }).join('') + '</optgroup>';
    });
    return o;
  }
  const guestsLabel = g => I.lang === 'dv'
    ? t('adults') + ' ' + g.adults + (g.children ? '\u060c ' + t('children') + ' ' + g.children : '') + (g.infants ? '\u060c ' + t('infants') + ' ' + g.infants : '')
    : plural(g.adults, 'adult') + (g.children ? ', ' + plural(g.children, 'child', 'children') : '') + (g.infants ? ', ' + plural(g.infants, 'infant') : '');

  function steppers(g, scope) {
    const row = (k, min, max) => `
      <div class="stepper">
        <div><div style="font-weight:600">${t(k)}</div><div class="muted" style="font-size:.8rem">${t(k + '.s')}</div></div>
        <div class="ctr">
          <button type="button" data-action="step" data-scope="${scope}" data-k="${k}" data-d="-1" aria-label="Fewer ${k}" ${g[k] <= min ? 'disabled' : ''}>−</button>
          <output data-out="${scope}-${k}">${g[k]}</output>
          <button type="button" data-action="step" data-scope="${scope}" data-k="${k}" data-d="1" aria-label="More ${k}" ${g[k] >= max ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    return row('adults', 1, 12) + row('children', 0, 8) + row('infants', 0, 4);
  }

  function searchPanel() {
    const s = S.search, ty = S.filters.types;
    const chip = v => `<button type="button" class="chip" data-action="type-chip" data-value="${v}" aria-pressed="${(v === 'all' ? ty.length === 0 : ty.length === 1 && ty[0] === v)}">${t('chip.' + v)}</button>`;
    return `<form class="search" id="search-form" autocomplete="off">
      <div class="search-types" role="group" aria-label="${t('f.type')}">${['all', 'guesthouse', 'resort', 'hotel', 'apartment'].map(chip).join('')}</div>
      <div class="search-row">
        <div class="field field-where"><label for="s-where">${t('search.where')}</label>
          <select class="input" id="s-where" data-bind="where">${whereOptions(s.where)}</select></div>
        <div class="field"><label for="s-in">${t('search.in')}</label><input class="input" type="date" id="s-in" data-bind="in" value="${s.in}" min="${today}"></div>
        <div class="field"><label for="s-out">${t('search.out')}</label><input class="input" type="date" id="s-out" data-bind="out" value="${s.out}" min="${addDays(s.in, 1)}"></div>
        <div class="field" style="position:relative"><span class="lbl" id="s-guests-l">${t('search.guests')}</span>
          <button type="button" class="input guests-btn" id="s-guests" data-action="guests-pop" aria-expanded="false" aria-labelledby="s-guests-l s-guests"><span data-glabel="search">${guestsLabel(s)}</span><span aria-hidden="true">▾</span></button>
          <div class="pop" id="guests-pop" hidden>${steppers(s, 'search')}<button type="button" class="btn btn-primary btn-sm" data-action="guests-close">${t('done')}</button></div>
        </div>
        <button class="btn btn-primary search-go" type="submit" style="min-height:46px">${t('search.go')}</button>
      </div>
    </form>`;
  }

  function ratingBlock(p) {
    if (!p.reviews) return `<div class="score"><span class="tag">New</span></div>`;
    const word = p.rating >= 9.2 ? 'Exceptional' : p.rating >= 8.8 ? 'Excellent' : p.rating >= 8.4 ? 'Very good' : 'Good';
    return `<div class="score"><b>${p.rating.toFixed(1)}</b><span>${word} · ${p.reviews} reviews</span></div>`;
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    const res = S.resident, set = API.settings();
    const inhabited = D.islands.filter(i => !i.private);
    const boardRows = inhabited.map(i => {
      const props = live().filter(p => p.island === i.id);
      const f = fastest(i.id);
      const prices = props.filter(p => bookable(p)).map(p => fromPrice(p)).filter(v => v != null);
      return `<button type="button" class="board-row" data-action="go-island" data-value="${i.id}">
        <span class="code">${i.code}</span><span class="isl">${esc(i.name)}</span>
        <span class="m how">${f ? MODE[f.mode] + ' · ' + dur(f.mins) : '—'}</span>
        <span class="m n">${plural(props.length, 'stay')}</span>
        <span class="go">${prices.length ? t('from') + ' ' + money(Math.min(...prices)) : t('residentsOnly')}</span>
      </button>`;
    }).join('');

    const types = Object.keys(D.types).map((k, i) => {
      const ps = live().filter(p => p.type === k && bookable(p));
      const min = ps.length ? Math.min(...ps.map(p => fromPrice(p))) : null;
      return `<button type="button" class="typecard" data-action="go-type" data-value="${k}">
        <div class="pic">${ART.draw([11, 97, 131, 163][i], k, { label: D.types[k].plural })}</div>
        <div class="body"><h3>${D.types[k].plural}</h3><p>${D.types[k].note}</p>
        <span class="from">${min != null ? t('from') + ' ' + money(min) + ' / night' : t('residentsOnly')}</span></div>
      </button>`;
    }).join('');

    const ex = prop('ocean-sand-inn') || live().find(p => p.type === 'guesthouse' && p.tourist);
    const g = { in: '2026-12-01', out: '2026-12-04', adults: 2, children: 0, infants: 0, rooms: 1 };
    const ledger = r => { const q = quote(ex, 0, g, r); return ledgerRows(q, r) + greenRow(q, r) + `<div class="tot"><span>${t('total')}</span><span class="v">${money(q.total, r)}</span></div>`; };
    const top = live().filter(p => bookable(p)).sort((a, b) => b.rating - a.rating).slice(0, 3);

    app.innerHTML = `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">${t('hero.eyebrow')}</p>
          <h1 style="margin-top:14px">${t('hero.h1a')}<br><em>${t('hero.h1b')}</em></h1>
          <p class="hero-lede">${t('hero.lede')}</p>
          <div class="who-big" role="group" aria-label="Who is booking">
            <button type="button" data-action="set-resident" data-value="1" aria-pressed="${res}"><strong>${t('who.local')}</strong><span>${t('who.local.s')}</span></button>
            <button type="button" data-action="set-resident" data-value="0" aria-pressed="${!res}"><strong>${t('who.visit')}</strong><span>${t('who.visit.s')}</span></button>
          </div>
        </div>
        <div class="hero-art">${ART.draw(37, 'guesthouse', { label: 'Island with a guesthouse and a dhoni boat in the lagoon', variant: 2 })}
          <div class="stamp" dir="ltr">ADh. DHIGURAH<br>3.53°N 72.92°E</div>
        </div>
      </div>
      <div class="wrap" style="padding-block:0 28px">${searchPanel()}</div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>${t('types.t')}</h2><p>${t('types.p')}</p></div></div>
      <div class="typegrid">${types}</div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>${t('board.t')}</h2><p>${t('board.p')}</p></div>
        <a class="btn btn-ghost btn-sm" href="#transfers">${t('allTransfers')}</a></div>
      <div class="board">
        <div class="board-head"><span>${t('board.atoll')}</span><span>${t('board.island')}</span><span>${t('board.fastest')}</span><span>${t('board.stays')}</span><span style="text-align:end">${t('board.night')}</span></div>
        ${boardRows}
      </div>
    </section>

    ${ex ? `<section class="section wrap">
      <div class="section-head"><div><h2>${t('rates.t')}</h2><p>Three nights in a ${esc(ex.rooms[0].name.toLowerCase())} at ${esc(ex.name)}, ${esc(island(ex.island).name)}, for two adults. Visitors pay Green Tax at the property; residents don’t pay it at all.</p></div></div>
      <div class="split">
        <div class="rates"><h3><span class="tag">${t('resident')}</span> Maldivians &amp; work permit holders</h3><div class="ledger">${ledger(true)}</div></div>
        <div class="rates"><h3><span class="tag tag-sun">${t('visitor')}</span> Tourists</h3><div class="ledger">${ledger(false)}</div></div>
      </div>
    </section>` : ''}

    <section class="section wrap">
      <div class="section-head"><div><h2>${t('top.t')}</h2></div><a class="btn btn-ghost btn-sm" href="#stays" data-action="sort-rating">${t('seeAll')}</a></div>
      <div class="list">${top.map(card).join('')}</div>
    </section>

    <section class="section wrap">
      <div class="owner-band">
        <div><p class="eyebrow">For guesthouses, hotels and resorts</p><h2 style="margin-top:8px">Run a guesthouse? List it here.</h2>
        <p class="muted" style="margin-top:8px;max-width:56ch">Set your own resident and visitor rates, see arrivals for the week, check bank transfer slips and block dates when you’re full.</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#list-property">${t('lp.nav')}</a><a class="btn btn-ghost" href="partner.html">${t('foot.dash')}</a></div>
      </div>
    </section>

    <section class="section wrap" id="faq">
      <div class="section-head"><div><h2>${t('faq.t')}</h2></div></div>
      <div class="faq">
        <details><summary>Who can book resident rates?</summary><p>Maldivian citizens and foreigners living here on a work permit or residence visa. We ask for your ID card or work permit number at checkout, and the property checks it when you arrive.</p></details>
        <details><summary>What is Green Tax and how much is it?</summary><p>Visitors pay Green Tax for every night they stay: USD ${set.greenHigh} per person at resorts, hotels and larger guesthouses, and USD ${set.greenLow} at guesthouses on inhabited islands with ${set.greenRoomLimit} rooms or fewer. Children under two are exempt, and so are Maldivians and residents. You pay it to the property when you check out.</p></details>
        <details><summary>Which taxes are already in the price?</summary><p>Every total includes the ${set.service}% service charge and ${set.tgst}% T-GST at tourist-registered places. Apartments that aren’t tourist-registered charge ${set.gst}% GST instead and are only open to residents.</p></details>
        <details><summary>How do I pay by bank transfer?</summary><p>Choose bank transfer at checkout, transfer the amount from your BML or MIB app, and upload the slip from My trips within 24 hours. The property checks the slip and confirms your booking.</p></details>
        <details><summary>Do public ferries run on Fridays?</summary><p>Most public ferry routes don’t run on Fridays, and some only sail two or three days a week. The transfer search hides sailings that don’t run on your date. Speedboats, seaplanes and domestic flights run daily.</p></details>
        <details><summary>Can I drink alcohol at a guesthouse?</summary><p>No. Alcohol is only served at resorts, liveaboards and a few licensed hotels. Guesthouses on inhabited islands are alcohol free, and many islands ask visitors to cover shoulders and knees away from the bikini beach.</p></details>
        <details><summary>How do cancellations work?</summary><p>Guesthouses, hotels and apartments are free to cancel up to 3 days before check-in. Resorts are free to cancel up to 14 days before. You can cancel from My trips.</p></details>
      </div>
    </section>`;
  }

  /* ---------- STAYS ---------- */
  function card(p) {
    const ok = bookable(p), fp = fromPrice(p);
    let side;
    if (ok) {
      const ri = p.rooms.findIndex(r => roomPrice(r) === fp);
      const q = quote(p, ri, { ...S.search, rooms: 1 });
      side = `<div><div class="price-big">${money(fp)}</div><div class="price-note">${t('perNight')} · ${money(q.total)} for ${plural(q.nights, 'night')} ${t('inclTaxes')}</div></div>`;
    } else side = `<div><span class="tag tag-grey">${t('residentsOnly')}</span><div class="price-note" style="margin-top:6px">Not open to tourist bookings</div></div>`;
    return `<a class="card" href="#stay-${p.id}">
      <div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
      <div class="body">
        <span class="loc">${esc(locLine(p))} · ${D.types[p.type].label}</span>
        <h3>${esc(p.name)}</h3>
        <p class="muted" style="font-size:.93rem">${esc(p.blurb.split('. ')[0].replace(/\.$/, ''))}.</p>
        <div class="am">${p.amenities.slice(0, 3).map(a => `<span>${esc(a)}</span>`).join('')}</div>
      </div>
      <div class="side">${ratingBlock(p)}${side}</div>
    </a>`;
  }

  const AMEN = ['Breakfast included', 'Bikini beach nearby', 'Airport pickup', 'House reef', 'Overwater villas', 'Full kitchen'];
  function filtered() {
    const f = S.filters, s = S.search;
    const list = live().filter(p => {
      if (s.where !== 'any' && p.island !== s.where) return false;
      if (f.types.length && !f.types.includes(p.type)) return false;
      if (f.atolls.length && !f.atolls.includes((island(p.island) || {}).code)) return false;
      if (f.amen.length && !f.amen.every(a => p.amenities.includes(a))) return false;
      if (f.max != null && bookable(p) && fromPrice(p) > f.max) return false;
      return true;
    });
    const key = { rec: p => -(p.rating * 10 + p.reviews / 100), price: p => fromPrice(p) ?? 1e9, rating: p => -p.rating }[f.sort];
    return list.sort((a, b) => (bookable(a) === bookable(b) ? 0 : bookable(a) ? -1 : 1) || key(a) - key(b));
  }
  const priceCeil = () => Math.max(...live().filter(p => bookable(p)).map(p => fromPrice(p)));

  function renderStays() {
    app.innerHTML = `
      <section class="hero" style="padding-block:18px"><div class="wrap">${searchPanel()}</div></section>
      <div class="wrap results">
        <aside class="filters" id="filters" data-closed="${!S.filtersOpen}" aria-label="${t('filters')}"></aside>
        <div style="min-width:0">
          <div class="list-head">
            <div><h2 id="res-count" style="font-size:1.3rem"></h2><p class="muted" id="res-sub" style="font-size:.9rem"></p></div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-ghost btn-sm filter-toggle" type="button" data-action="toggle-filters" aria-controls="filters">${t('filters')}</button>
              <label class="sr" for="sort">Sort by</label>
              <select class="input" id="sort" style="min-height:38px;padding:7px 10px;width:auto">
                <option value="rec">${t('sort.rec')}</option><option value="price">${t('sort.price')}</option><option value="rating">${t('sort.rating')}</option>
              </select>
            </div>
          </div>
          <div class="list" id="list"></div>
        </div>
      </div>`;
    $('#sort').value = S.filters.sort;
    renderFilters(); renderList();
  }
  function renderFilters() {
    const f = S.filters;
    const count = pred => live().filter(pred).length;
    const atolls = [...new Set(D.islands.map(i => i.code))];
    const ceil = priceCeil(), max = f.max == null ? ceil : f.max;
    $('#filters').innerHTML = `
      <fieldset><legend>${t('f.type')}</legend>
        ${Object.keys(D.types).map(k => `<label class="check"><input type="checkbox" data-filter="types" value="${k}" ${f.types.includes(k) ? 'checked' : ''}>${D.types[k].label}<span class="n">${count(p => p.type === k)}</span></label>`).join('')}
      </fieldset>
      <fieldset><legend>${t('f.max')}</legend>
        <input type="range" id="f-max" min="${S.resident ? 500 : 50}" max="${ceil}" step="${S.resident ? 50 : 5}" value="${max}" aria-describedby="f-max-v">
        <div class="mono" id="f-max-v" style="font-size:.88rem">${f.max == null ? t('f.any') : 'Up to ' + money(max)}</div>
      </fieldset>
      <fieldset><legend>${t('f.atoll')}</legend>
        ${atolls.map(c => { const i = D.islands.find(x => x.code === c); return `<label class="check"><input type="checkbox" data-filter="atolls" value="${c}" ${f.atolls.includes(c) ? 'checked' : ''}><span class="mono" style="min-width:3.2ch">${c}</span>${i.atoll}<span class="n">${count(p => (island(p.island) || {}).code === c)}</span></label>`; }).join('')}
      </fieldset>
      <fieldset><legend>${t('f.features')}</legend>
        ${AMEN.map(a => `<label class="check"><input type="checkbox" data-filter="amen" value="${esc(a)}" ${f.amen.includes(a) ? 'checked' : ''}>${a}</label>`).join('')}
      </fieldset>
      <button type="button" class="btn-link" data-action="clear-filters" style="justify-self:start">${t('f.clear')}</button>`;
  }
  function renderList() {
    const list = filtered(), s = S.search;
    const where = s.where === 'any' ? null : island(s.where);
    $('#res-count').textContent = plural(list.length, 'stay') + (where ? ' on ' + (where.private ? (live().find(p => p.island === s.where) || {}).name : where.name) : ' across the Maldives');
    $('#res-sub').textContent = fmtDate(s.in) + ' – ' + fmtDate(s.out) + ' · ' + guestsLabel(s) + ' · ' + (S.resident ? 'resident rates (MVR)' : 'visitor rates (USD)');
    $('#list').innerHTML = list.length ? list.map(card).join('') :
      `<div class="empty"><h3>No stays match these filters</h3><p class="muted">Try another island, raise the price limit or clear the filters.</p><button class="btn btn-ghost" type="button" data-action="clear-all">Clear search and filters</button></div>`;
  }

  /* ---------- STAY DETAIL ---------- */
  function seededReviews(p) {
    let s = p.seed;
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    return [0, 1, 2].map(() => {
      const who = D.reviewers[Math.floor(r() * D.reviewers.length)];
      const tx = D.reviewText[Math.floor(r() * D.reviewText.length)];
      const sc = Math.min(10, Math.round((p.rating - 0.6 + r() * 1.2) * 10) / 10);
      return { who, t: tx, sc, m: MON[(8 + Math.floor(r() * 3)) % 12] };
    });
  }
  const h2 = (k, extra) => `<h2 style="font-size:1.3rem;margin-bottom:${extra || 14}px">${t(k)}</h2>`;

  function renderStay(id) {
    const p = prop(id);
    if (!p) { app.innerHTML = `<div class="wrap confirm"><h2>We couldn’t find that stay</h2><p class="muted">It may have been removed or not approved yet.</p><a class="btn btn-primary" href="#stays">Browse all stays</a></div>`; return; }
    const i = island(p.island) || {};
    if (!S.sel || S.sel.pid !== id) {
      const fp = fromPrice(p);
      S.sel = { pid: id, room: Math.max(0, p.rooms.findIndex(r => roomPrice(r) === fp)), rooms: 1 };
    }
    const routes = D.routes[p.route] || [];
    const isResort = p.type === 'resort';
    const rules = [
      ['Check-in', isResort ? 'from 14:00' : 'from 13:00'], ['Check-out', 'by 12:00'],
      ['Free cancellation', isResort ? 'until 14 days before arrival' : 'until 3 days before arrival'],
      ['Alcohol', isResort || (p.type === 'hotel' && p.island === 'hulhumale') ? 'Served on site' : 'Not served (inhabited island)'],
      ['Dress', i.private ? 'Swimwear anywhere on the island' : 'Bikini beach for swimwear; cover shoulders and knees in the village']
    ];
    app.innerHTML = `
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#home">${t('nav.home')}</a><span>/</span><a href="#stays">${t('nav.stays')}</a><span>/</span><span>${esc(p.name)}</span></nav>
        <div class="detail-title">
          <span class="loc mono muted" style="font-size:.85rem">${esc(locLine(p))} · ${D.types[p.type].label} · ${p.roomsTotal} rooms</span>
          <h1 style="font-size:clamp(1.8rem,4vw,2.8rem)">${esc(p.name)}</h1>
          ${ratingBlock(p)}
        </div>
        <div class="gallery">
          <div>${ART.draw(p.seed, p.type, { label: p.name, variant: 0 })}</div>
          <div>${ART.draw(p.seed, p.type, { label: p.name + ' view 2', variant: 1, wide: true })}</div>
          <div>${ART.draw(p.seed, p.type, { label: p.name + ' view 3', variant: 2, wide: true })}</div>
        </div>
      </div>
      <div class="wrap detail">
        <div class="detail-main">
          <section>${h2('about', 10)}<p style="max-width:68ch">${esc(p.blurb)}</p></section>
          <section>${h2('here')}<div class="amen">${p.amenities.map(a => `<div>${IC.check}${esc(a)}</div>`).join('')}</div></section>
          <section>${h2('chooseRoom', 6)}
            <p class="muted" style="margin-bottom:14px;font-size:.92rem">${S.resident ? 'Resident rates in MVR, per room per night before tax.' : 'Visitor rates in USD, per room per night before tax.'} Availability is for ${fmtDate(S.search.in)} – ${fmtDate(S.search.out)}.</p>
            <div class="rooms" id="rooms"></div></section>
          ${routes.length ? `<section>${h2('gettingThere', 6)}
            <p class="muted" style="margin-bottom:14px;font-size:.92rem">Add any of these at checkout. Fares are per person, one way, ${S.resident ? 'resident' : 'visitor'} rate.</p>
            <div class="transfer-list">${routes.map(o => `
              <div class="tline"><div class="ic">${IC[o.mode]}</div>
                <div style="min-width:0"><strong>${MODE[o.mode]}</strong> <span class="muted" style="font-size:.88rem">· ${dur(o.mins)} from ${D.origins[o.from]}</span>
                  ${o.via ? `<div class="muted" style="font-size:.85rem">${esc(o.via)}</div>` : ''}
                  <div class="times">${o.times.map(x => `<span>${x}</span>`).join('')}<span style="background:none;color:var(--muted)">${o.days}</span></div></div>
                <div class="mono" style="font-weight:600;text-align:end">${money(S.resident ? o.local : o.intl)}</div></div>`).join('')}</div></section>` : ''}
          <section>${h2('rules')}<div class="ledger" style="max-width:620px">${rules.map(r => `<div><span>${r[0]}</span><span style="text-align:end">${r[1]}</span></div>`).join('')}</div></section>
          ${p.reviews ? `<section>${h2('reviews')}
            <div class="reviews">${seededReviews(p).map(r => `<div class="review"><div class="who-r"><strong>${esc(r.who.n)}</strong><span class="mono">${r.sc.toFixed(1)}</span></div>
              <span class="muted" style="font-size:.8rem">${esc(r.who.c)}${r.who.resident ? ' · resident' : ''} · stayed ${r.m} 2026</span><p>${esc(r.t)}</p></div>`).join('')}</div></section>` : ''}
        </div>
        <aside class="book" id="book" aria-label="Your booking"></aside>
      </div>
      <div class="mbar" id="mbar"></div>`;
    renderRooms(p); renderBook(p);
  }
  function renderRooms(p) {
    const need = guestCount(S.search), s = S.search;
    $('#rooms').innerHTML = p.rooms.map((r, idx) => {
      const pr = roomPrice(r);
      const cap = r.sleeps * S.sel.rooms;
      const left = roomsLeft(p.id, idx, s.in, s.out);
      const leftTxt = left == null ? '' : left === 0 ? `<span class="left none">${t('soldOut')}</span>` : left <= 3 ? `<span class="left">${left} ${t('left')}</span>` : '';
      return `<label class="room${cap < need || left === 0 ? ' cap-bad' : ''}">
        <input type="radio" name="room" value="${idx}" ${S.sel.room === idx ? 'checked' : ''} ${pr == null ? 'disabled' : ''}>
        <div style="min-width:0"><strong>${esc(r.name)}</strong> ${leftTxt}<div class="meta">${esc(r.beds)} · sleeps ${r.sleeps} · ${r.size} m²${cap < need ? ' · too small for ' + plural(need, 'guest') + ' in ' + plural(S.sel.rooms, 'room') : ''}</div></div>
        <div class="rp">${pr == null ? `<span class="tag tag-grey">${t('residentsOnly')}</span>` : `<div class="v">${money(pr)}</div><div class="meta">${t('perNight')}</div>`}</div>
      </label>`;
    }).join('');
  }
  function renderBook(p) {
    const s = S.search, sel = S.sel, box = $('#book');
    const mbar = $('#mbar');
    if (!bookable(p)) {
      box.innerHTML = `<h3>${t('residentsOnly')}</h3>
        <p class="notice warn">${esc(p.name)} isn’t registered as a tourist establishment, so only Maldivians and work permit or residence visa holders can stay here.</p>
        <button class="btn btn-primary btn-block" type="button" data-action="set-resident" data-value="1">${t('who.local')}</button>
        <a class="btn btn-ghost btn-block" href="#stays">See places open to visitors</a>`;
      if (mbar) mbar.innerHTML = '';
      return;
    }
    const q = quote(p, sel.room, { ...s, rooms: sel.rooms });
    const room = p.rooms[sel.room];
    const fits = room.sleeps * sel.rooms >= guestCount(s);
    const left = roomsLeft(p.id, sel.room, s.in, s.out);
    const enough = left == null || left >= sel.rooms;
    if (mbar) mbar.innerHTML = `<div style="min-width:0"><div class="mono" style="font-weight:600">${money(q.total)}</div><div class="price-note">${plural(q.nights, 'night')} · ${esc(room.name)}</div></div>
      <button class="btn btn-primary" type="button" data-action="to-book">${t('book')}</button>`;
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div><span class="price-big">${money(q.price)}</span> <span class="muted">/ night</span></div><span class="tag ${S.resident ? '' : 'tag-sun'}">${S.resident ? t('resident') : t('visitor')}</span></div>
      <div class="two">
        <div class="field"><label for="b-in">${t('search.in')}</label><input class="input" type="date" id="b-in" data-bind="in" value="${s.in}" min="${today}"></div>
        <div class="field"><label for="b-out">${t('search.out')}</label><input class="input" type="date" id="b-out" data-bind="out" value="${s.out}" min="${addDays(s.in, 1)}"></div>
      </div>
      <div style="display:grid;gap:10px;padding:12px;border:1px solid var(--line);border-radius:var(--r-s)">${steppers(s, 'book')}</div>
      <div class="field"><label for="b-rooms">${t('rooms')}</label>
        <select class="input" id="b-rooms">${[1, 2, 3, 4].map(n => `<option value="${n}" ${sel.rooms === n ? 'selected' : ''}>${plural(n, 'room')} · ${esc(room.name)}</option>`).join('')}</select></div>
      <div class="ledger">${ledgerRows(q)}${greenRow(q, S.resident, q.greenPart && q.greenPart.infants ? 'Infants under 2 are exempt' : (q.greenPart && q.greenPart.exempt ? 'Exempt for Maldivians and residents' : ''))}
        <div class="tot"><span>${t('total')}</span><span class="v">${money(q.total)}</span></div></div>
      ${q.green ? `<p class="notice">Pay ${money(q.payNow)} now. Green Tax of ${money(q.green)} is paid to the property at check-out.</p>` : ''}
      ${fits ? '' : `<p class="notice warn">${esc(room.name)} sleeps ${room.sleeps}. Add a room or pick a larger one for ${plural(guestCount(s), 'guest')}.</p>`}
      ${enough ? '' : `<p class="notice warn">${left === 0 ? 'No ' + esc(room.name.toLowerCase()) + ' rooms are free on these dates. Try other dates or another room.' : 'Only ' + plural(left, 'room') + ' of this type left on these dates.'}</p>`}
      <button class="btn btn-primary btn-block" type="button" data-action="reserve" ${fits && enough ? '' : 'disabled'}>${t('reserve')}</button>
      <p class="muted" style="font-size:.82rem;text-align:center">You won’t be charged yet. Free cancellation ${p.type === 'resort' ? '14' : '3'} days before arrival.</p>`;
  }

  /* ---------- CHECKOUT ---------- */
  const NATIONS = ['India', 'China', 'Russia', 'United Kingdom', 'Italy', 'Germany', 'United States', 'Poland', 'France', 'Spain', 'Switzerland', 'Japan', 'Australia', 'Sri Lanka', 'Other'];
  function renderCheckout() {
    const pd = S.pending;
    if (!pd) { location.hash = 'stays'; return; }
    const p = prop(pd.pid), res = S.resident;
    if (!p || !bookable(p)) { location.hash = p ? 'stay-' + p.id : 'stays'; return; }
    const room = p.rooms[pd.room];
    const routes = D.routes[p.route] || [];
    const u = API.user() || {};
    const pays = res
      ? [['card', t('pay.card'), 'BML, MIB or any Visa / Mastercard'], ['transfer', t('pay.transfer'), 'Upload the slip within 24 hours'], ['property', t('pay.property'), 'Card or cash on arrival']]
      : [['card', t('pay.card'), 'Visa, Mastercard, Amex, UnionPay'], ['property', t('pay.property'), 'Card on arrival, in USD']];
    if (!pd.pay || !pays.some(x => x[0] === pd.pay)) pd.pay = 'card';
    if (pd.transfer == null) pd.transfer = -1;
    const f = pd.form || {};
    app.innerHTML = `
      <div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#stay-${p.id}">← ${esc(p.name)}</a></nav><h1 style="font-size:clamp(1.7rem,3.6vw,2.4rem)">${t('co.title')}</h1></div>
      <form class="wrap checkout" id="co" novalidate>
        <div style="display:grid;gap:16px;min-width:0">
          <section class="step"><h2><span class="mono">1</span> ${t('co.details')}</h2>
            <div class="grid2">
              <div class="field full"><label for="c-name">${t('f.name')} (as on ${res ? 'ID card' : 'passport'})</label><input class="input" id="c-name" autocomplete="name" value="${esc(f.name ?? u.name ?? '')}" required><span class="err-msg" data-err="name"></span></div>
              <div class="field"><label for="c-phone">${t('f.mobile')}</label><input class="input" id="c-phone" type="tel" autocomplete="tel" dir="ltr" placeholder="${res ? '+960 7xx xxxx' : '+44 7700 900123'}" value="${esc(f.phone ?? (u.contact && !u.contact.includes('@') ? u.contact : ''))}" required><span class="err-msg" data-err="phone"></span></div>
              <div class="field"><label for="c-email">${t('f.email')}</label><input class="input" id="c-email" type="email" autocomplete="email" dir="ltr" value="${esc(f.email ?? (u.contact && u.contact.includes('@') ? u.contact : ''))}" required><span class="err-msg" data-err="email"></span></div>
              ${res ? `
              <div class="field full"><label for="c-id">${t('f.id')}</label><input class="input" id="c-id" dir="ltr" placeholder="A123456 or WP number" value="${esc(f.id ?? '')}" required><span class="muted" style="font-size:.8rem">The property checks this on arrival to apply the resident rate.</span><span class="err-msg" data-err="id"></span></div>` : `
              <div class="field"><label for="c-nat">${t('f.nat')}</label><select class="input" id="c-nat" required><option value="">Select</option>${NATIONS.map(n => `<option ${f.nat === n ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="err-msg" data-err="nat"></span></div>
              <div class="field"><label for="c-pass">${t('f.passport')}</label><input class="input" id="c-pass" dir="ltr" value="${esc(f.pass ?? '')}" required><span class="err-msg" data-err="pass"></span></div>`}
              <div class="field full"><label for="c-note">${t('f.requests')} <span class="muted">(${t('optional')})</span></label><textarea class="input" id="c-note" rows="2" placeholder="Arrival time, dietary needs, cot for a baby">${esc(f.note ?? '')}</textarea></div>
            </div>
          </section>
          <section class="step"><h2><span class="mono">2</span> ${t('co.getting')}</h2>
            <p class="muted" style="font-size:.92rem">Fares for ${plural(guestCount(pd), 'passenger')}, one way on ${fmtDate(pd.in)}. Infants travel free.</p>
            <div style="display:grid;gap:10px" id="co-transfers">
              <label class="opt"><input type="radio" name="tr" value="-1" ${pd.transfer === -1 ? 'checked' : ''}><div><strong>${t('ownTransfer')}</strong><small>You can book one later from the Transfers page.</small></div><span></span></label>
              ${routes.map((o, k) => {
                const runs = runsOn(o, pd.in);
                return `<label class="opt" ${runs ? '' : 'style="opacity:.55"'}><input type="radio" name="tr" value="${k}" ${pd.transfer === k ? 'checked' : ''} ${runs ? '' : 'disabled'}>
                <div><strong>${MODE[o.mode]} · ${dur(o.mins)}</strong><small>${runs ? 'From ' + D.origins[o.from] + (o.via ? ' · ' + esc(o.via) : '') : 'Doesn’t run on ' + DOW[parse(pd.in).getDay()] + 's (' + o.days + ')'}</small>
                ${pd.transfer === k && o.times.length > 1 ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" role="group" aria-label="Departure time">${o.times.map(x => `<button type="button" class="time-chip" data-action="pick-time" data-value="${x}" aria-pressed="${pd.time === x}">${x}</button>`).join('')}</div>` : ''}</div>
                <span class="mono" style="font-weight:600">${money((res ? o.local : o.intl) * guestCount(pd))}</span></label>`;
              }).join('')}
            </div>
          </section>
          <section class="step"><h2><span class="mono">3</span> ${t('co.payment')}</h2>
            <div style="display:grid;gap:10px">${pays.map(([v, l, d]) => `<label class="opt"><input type="radio" name="pay" value="${v}" ${pd.pay === v ? 'checked' : ''}><div><strong>${l}</strong><small>${d}</small></div><span></span></label>`).join('')}</div>
            ${API.LIVE ? `<p class="notice">Card payments open the Bank of Maldives secure payment page. Card details never touch this site.</p>`
                       : `<p class="notice">Demo booking: no payment is taken and no card details are collected. In live mode, card payments go to the Bank of Maldives payment page.</p>`}
            <label class="check" style="align-items:flex-start"><input type="checkbox" id="c-agree" ${f.agree ? 'checked' : ''}><span>I accept the cancellation policy: free until ${p.type === 'resort' ? '14' : '3'} days before arrival, then the first night is charged.</span></label>
            <span class="err-msg" data-err="agree"></span>
            <span class="err-msg" data-err="server" role="alert"></span>
            <button class="btn btn-primary btn-block" type="submit" id="co-go" style="min-height:52px;font-size:1.05rem">${t('co.confirm')}</button>
          </section>
        </div>
        <aside class="summary" id="co-sum"></aside>
      </form>`;
    renderSummary();
  }
  function trCost(pd) {
    if (pd.transfer == null || pd.transfer < 0) return null;
    const p = prop(pd.pid), o = D.routes[p.route][pd.transfer];
    return { o, cost: (S.resident ? o.local : o.intl) * guestCount(pd) };
  }
  function renderSummary() {
    const pd = S.pending, p = prop(pd.pid), room = p.rooms[pd.room];
    const q = quote(p, pd.room, pd), tr = trCost(pd);
    const now = q.payNow + (tr ? tr.cost : 0);
    $('#co-sum').innerHTML = `<div class="ticket">
      <div class="ticket-top"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
        <div class="t"><span class="mono muted" style="font-size:.78rem">${esc(locLine(p))}</span><strong style="font-family:var(--f-display);font-size:1.1rem">${esc(p.name)}</strong><span style="font-size:.88rem">${pd.rooms > 1 ? pd.rooms + ' × ' : ''}${esc(room.name)}</span></div></div>
      <div class="ticket-body"><div class="ledger">
        <div><span>${t('search.in')}</span><span class="v">${fmtDate(pd.in)}</span></div>
        <div><span>${t('search.out')}</span><span class="v">${fmtDate(pd.out)}</span></div>
        <div><span>${t('search.guests')}</span><span>${guestsLabel(pd)}</span></div>
      </div></div>
      <div class="perf"></div>
      <div class="ticket-body"><div class="ledger">
        ${ledgerRows(q)}
        ${tr ? `<div><span>${MODE[tr.o.mode]}${pd.time ? ' ' + pd.time : ''} × ${guestCount(pd)}</span><span class="v">${money(tr.cost)}</span></div>` : ''}
        <div class="tot"><span>${pd.pay === 'property' ? t('payAtProperty') : t('payNow')}</span><span class="v">${money(now)}</span></div>
        ${greenRow(q, S.resident, q.greenPart ? (q.greenPart.exempt ? 'Exempt for Maldivians and residents' : 'Paid at check-out') : '')}
      </div></div></div>`;
  }
  function readForm() {
    const v = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
    S.pending.form = { name: v('c-name'), phone: v('c-phone'), email: v('c-email'), id: v('c-id'), nat: v('c-nat'), pass: v('c-pass'), note: v('c-note'), agree: $('#c-agree') ? $('#c-agree').checked : false };
  }
  const PHONE = /^\+?[\d\s-]{7,}$/, EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function validate() {
    readForm();
    const f = S.pending.form, errs = {};
    if (f.name.length < 3) errs.name = 'Enter your full name.';
    if (!PHONE.test(f.phone)) errs.phone = 'Enter a phone number with country code, for example +960 7771234.';
    if (!EMAIL.test(f.email)) errs.email = 'Enter an email address like name@example.com.';
    if (S.resident) { if (!/^(A\d{6}|[A-Z]{1,3}\d{5,10})$/i.test(f.id.replace(/\s/g, ''))) errs.id = 'Enter an ID card number like A123456, or your work permit number.'; }
    else { if (!f.nat) errs.nat = 'Choose your nationality.'; if (f.pass.length < 5) errs.pass = 'Enter your passport number.'; }
    if (!f.agree) errs.agree = 'Tick the box to accept the cancellation policy.';
    const tr = trCost(S.pending);
    if (tr && tr.o.times.length > 1 && !S.pending.time) errs.time = 1;
    $$('[data-err]').forEach(e => { if (e.dataset.err !== 'server') e.textContent = errs[e.dataset.err] || ''; });
    ['name', 'phone', 'email', 'id', 'nat', 'pass'].forEach(k => { const el = $('#c-' + k); if (el) el.classList.toggle('bad', !!errs[k]); });
    if (errs.time) toast('Choose a departure time for your ' + MODE[tr.o.mode].toLowerCase());
    const first = Object.keys(errs)[0];
    if (first && first !== 'time') { const el = $('#c-' + first); if (el) el.focus(); }
    return !first;
  }
  async function confirmBooking() {
    if (S.busy || !validate()) return;
    if (API.LIVE && !API.user()) { openSignin(); toast('Sign in to finish booking. Your details are kept.'); return; }
    const pd = S.pending, tr = trCost(pd), f = pd.form;
    S.busy = true; const btn = $('#co-go'); btn.disabled = true; btn.textContent = 'Confirming…';
    const r = await API.createBooking({
      pid: pd.pid, roomIdx: pd.room, rooms: pd.rooms, in: pd.in, out: pd.out, adults: pd.adults, children: pd.children, infants: pd.infants,
      resident: S.resident, pay: pd.pay, name: f.name, phone: f.phone, email: f.email, idDoc: S.resident ? f.id : f.pass, nat: f.nat, note: f.note,
      transfer: tr ? { mode: tr.o.mode, time: pd.time || tr.o.times[0], mins: tr.o.mins, cost: tr.cost, from: tr.o.from, option: pd.transfer } : null
    });
    S.busy = false;
    if (!r.ok) {
      btn.disabled = false; btn.textContent = t('co.confirm');
      $('[data-err="server"]').textContent = r.error === 'sold_out' || /sold/i.test(r.error)
        ? 'Someone booked the last room while you were filling this in. Go back and choose another room or other dates.'
        : 'We couldn’t save the booking: ' + r.error + '. Check your connection and try again.';
      return;
    }
    S.pending = null; S.left = {};
    if (API.LIVE && r.booking.pay === 'card') {
      const pay = await API.startPayment(r.booking.ref);
      if (pay.ok && pay.url) { location.href = pay.url; return; }
      toast('Booking saved, but the payment page didn’t open. Pay from My trips.');
    }
    location.hash = 'done-' + r.booking.ref;
  }

  /* ---------- CONFIRMATION ---------- */
  function renderDone(ref) {
    const b = API.myBookings().find(x => x.ref === ref);
    if (!b) { app.innerHTML = `<div class="wrap confirm"><h2>Booking not found</h2><p class="muted">Sign in on the device you booked from to see it.</p><a class="btn btn-primary" href="#trips">${t('nav.trips')}</a></div>`; return; }
    const res = b.resident;
    if (b.kind === 'transfer') {
      app.innerHTML = `<div class="wrap confirm"><p class="eyebrow">Transfer booked</p><div class="ref">${b.ref}</div>
        <h2>${MODE[b.mode]} to ${esc(routeName(b.to))}</h2>
        <div class="rates"><div class="ledger"><div><span>${t('tr.date')}</span><span class="v">${fmtDate(b.date)}</span></div><div><span>Departs</span><span class="v">${b.time} from ${D.origins[b.from]}</span></div><div><span>Passengers</span><span>${guestsLabel(b)}</span></div><div class="tot"><span>${t('total')}</span><span class="v">${money(b.payNow, res)}</span></div></div></div>
        <p class="muted">Be at the departure point 30 minutes before. Show this reference to the crew.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#trips">${t('nav.trips')}</a><a class="btn btn-ghost" href="#stays">Find a place to stay</a></div></div>`;
      return;
    }
    const p = anyProp(b.pid);
    const next = [];
    if (b.status === 'awaiting_payment' && b.pay === 'transfer') next.push('Transfer ' + money(b.payNow, res) + ' and upload the slip from My trips within 24 hours, or the booking is released.');
    else if (b.status === 'awaiting_payment') next.push('Your card payment hasn’t gone through yet. Open My trips to try again.');
    else if (b.pay === 'property') next.push('Pay ' + money(b.payNow, res) + ' to the property when you check in.');
    else next.push('Your card was charged ' + money(b.payNow, res) + '.');
    if (b.green) next.push('Green Tax of ' + money(b.green, false) + ' is collected by the property at check-out.');
    if (res) next.push('Bring your ID card or work permit; the property checks it to apply the resident rate.');
    if (b.transfer) next.push('Your ' + MODE[b.transfer.mode].toLowerCase() + ' leaves ' + D.origins[b.transfer.from] + ' at ' + b.transfer.time + ' on ' + fmtDate(b.in) + '. Arrive 30 minutes early.');
    else next.push('You haven’t added a transfer. The property can help arrange one, or book it from the Transfers page.');
    const isl = island(p.island) || {};
    app.innerHTML = `<div class="wrap confirm">
      <div><p class="eyebrow">${b.status === 'awaiting_payment' ? 'Booking held, waiting for payment' : 'Booking confirmed'}</p><div class="ref" style="margin-top:8px">${b.ref}</div></div>
      <h2>See you on ${esc(isl.private ? p.name : isl.name)}, ${esc(b.name.split(' ')[0])}.</h2>
      <div class="ticket"><div class="ticket-top"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name, variant: 1 })}</div>
        <div class="t"><span class="mono muted" style="font-size:.78rem">${esc(locLine(p))}</span><strong style="font-family:var(--f-display);font-size:1.15rem">${esc(p.name)}</strong><span>${b.rooms > 1 ? b.rooms + ' × ' : ''}${esc(b.room)}</span></div></div>
        <div class="perf"></div>
        <div class="ticket-body"><div class="ledger">
          <div><span>Dates</span><span class="v">${fmtDate(b.in)} – ${fmtDate(b.out)}</span></div>
          <div><span>${t('search.guests')}</span><span>${guestsLabel(b)}</span></div>
          <div class="tot"><span>${b.pay === 'property' ? 'Due at property' : t('total')}</span><span class="v">${money(b.payNow, res)}</span></div>
        </div></div></div>
      <div><h3 style="margin-bottom:10px">What happens next</h3><ul style="margin:0;padding-inline-start:20px;display:grid;gap:8px">${next.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#trips">${t('nav.trips')}</a>${b.transfer ? '' : `<a class="btn btn-ghost" href="#transfers" data-action="tr-for" data-value="${p.route}" data-date="${b.in}">Book a transfer</a>`}</div>
    </div>`;
  }

  /* ---------- TRANSFERS ---------- */
  function renderTransfers() {
    const tr = S.tr, keys = Object.keys(D.routes);
    app.innerHTML = `
      <section class="hero"><div class="wrap" style="padding-block:28px 24px;display:grid;gap:18px">
        <div><p class="eyebrow">Speedboats · ferries · seaplanes · flights</p><h1 style="font-size:clamp(1.8rem,4vw,2.6rem);margin-top:10px">${t('tr.title')}</h1>
        <p class="muted" style="margin-top:8px;max-width:60ch">Book the boat or flight on its own, or add it when you book a stay. Times are sample departures.</p></div>
        <form class="search" id="tr-form">
          <div class="search-row" style="grid-template-columns:1.4fr 1fr 1fr 1fr">
            <div class="field field-where"><label for="t-to">${t('tr.to')}</label><select class="input" id="t-to">${keys.map(k => `<option value="${k}" ${tr.to === k ? 'selected' : ''}>${esc(routeName(k))}</option>`).join('')}</select></div>
            <div class="field"><label for="t-date">${t('tr.date')}</label><input class="input" type="date" id="t-date" value="${tr.date}" min="${today}"></div>
            <div class="field"><label for="t-ad">${t('tr.pax')}</label><select class="input" id="t-ad">${Array.from({ length: 10 }, (_, i) => `<option ${tr.adults + tr.children === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
            <div class="field"><label for="t-inf">${t('tr.inf')}</label><select class="input" id="t-inf">${[0, 1, 2, 3].map(i => `<option ${tr.infants === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>
          </div>
        </form>
      </div></section>
      <div class="wrap" style="padding-block:24px 48px;display:grid;gap:14px" id="tr-results"></div>`;
    renderTrResults();
  }
  function renderTrResults() {
    const tr = S.tr, res = S.resident, opts = D.routes[tr.to] || [];
    const pax = tr.adults + tr.children, day = DOW[parse(tr.date).getDay()];
    const u = API.user();
    $('#tr-results').innerHTML = `<h2 style="font-size:1.25rem">${plural(opts.length, 'option')} to ${esc(routeName(tr.to))} · ${fmtDate(tr.date)}</h2>` + opts.map((o, k) => {
      const runs = runsOn(o, tr.date), picked = tr.pick && tr.pick.k === k;
      const fare = res ? o.local : o.intl;
      return `<div class="tline" style="align-items:start;${runs ? '' : 'opacity:.6'}">
        <div class="ic">${IC[o.mode]}</div>
        <div style="min-width:0;display:grid;gap:4px"><div><strong>${MODE[o.mode]}</strong> <span class="muted" style="font-size:.88rem">· ${dur(o.mins)} · from ${D.origins[o.from]}</span></div>
          ${o.via ? `<div class="muted" style="font-size:.86rem">${esc(o.via)}</div>` : ''}
          ${runs ? `<div class="times" role="group" aria-label="Departure time">${o.times.map(x => `<button type="button" class="time-chip" data-action="tr-time" data-k="${k}" data-value="${x}" aria-pressed="${picked && tr.pick.time === x}">${x}</button>`).join('')}</div>`
                 : `<div class="notice warn" style="margin-top:4px">No sailings on ${day}s. Runs ${o.days}.</div>`}
          ${picked ? `<form class="grid2" data-trbook="${k}" style="margin-top:10px" novalidate>
            <div class="field"><label for="tb-name">Lead passenger</label><input class="input" id="tb-name" value="${esc(u ? u.name : '')}" autocomplete="name"><span class="err-msg" data-err="tb-name"></span></div>
            <div class="field"><label for="tb-phone">${t('f.mobile')}</label><input class="input" id="tb-phone" type="tel" dir="ltr" placeholder="${res ? '+960 7xx xxxx' : '+44 7700 900123'}"><span class="err-msg" data-err="tb-phone"></span></div>
            <button class="btn btn-primary full" type="submit">${t('book')} ${MODE[o.mode].toLowerCase()} · ${tr.pick.time} · ${money(fare * pax)}</button></form>` : ''}
        </div>
        <div style="text-align:end"><div class="mono" style="font-weight:600">${money(fare)}</div><div class="price-note">${t('perPerson')}</div><div class="mono" style="font-size:.86rem;margin-top:6px">${money(fare * pax)}</div><div class="price-note">${plural(pax, 'passenger')}</div></div>
      </div>`;
    }).join('') + `<p class="muted" style="font-size:.86rem">${res ? 'Resident fares shown in MVR.' : 'Visitor fares shown in USD and include T-GST.'} Seaplanes fly in daylight only, so late international arrivals may need a night in Hulhumalé first.</p>`;
  }
  async function bookTransfer(k, form) {
    const tr = S.tr, o = D.routes[tr.to][k];
    const name = $('#tb-name', form).value.trim(), phone = $('#tb-phone', form).value.trim();
    $('[data-err="tb-name"]', form).textContent = name.length < 3 ? 'Enter the lead passenger’s name.' : '';
    $('[data-err="tb-phone"]', form).textContent = !PHONE.test(phone) ? 'Enter a phone number with country code.' : '';
    if (name.length < 3 || !PHONE.test(phone)) return;
    if (API.LIVE && !API.user()) { openSignin(); toast('Sign in to book the transfer.'); return; }
    const r = await API.createTransfer({ to: tr.to, option: k, mode: o.mode, from: o.from, date: tr.date, time: tr.pick.time, adults: tr.adults, children: tr.children, infants: tr.infants, resident: S.resident, name, phone, payNow: (S.resident ? o.local : o.intl) * (tr.adults + tr.children) });
    if (!r.ok) { toast('Couldn’t book the transfer: ' + r.error); return; }
    tr.pick = null; location.hash = 'done-' + r.booking.ref;
  }

  /* ---------- TRIPS ---------- */
  function renderTrips() {
    const list = API.myBookings();
    if (!list.length) {
      app.innerHTML = `<div class="wrap trips"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${t('trips.t')}</h1>
        <div class="empty"><h3>No trips yet</h3><p class="muted" style="max-width:44ch">Stays and transfers you book ${API.LIVE ? 'while signed in' : 'on this device'} appear here, with your reference number and what to bring.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn btn-primary" href="#stays">Find a stay</a><a class="btn btn-ghost" href="#transfers">Book a transfer</a></div></div></div>`;
      return;
    }
    const activeSt = ['awaiting_payment', 'slip_review', 'confirmed', 'checked_in'];
    const up = list.filter(b => activeSt.includes(b.status)), past = list.filter(b => !activeSt.includes(b.status));
    const row = b => {
      const off = !activeSt.includes(b.status);
      const stat = `<span class="status ${statusClass(b.status)}">${statusLabel(b.status)} · ${b.ref}</span>`;
      if (b.kind === 'transfer') {
        return `<article class="trip${off ? ' cancelled' : ''}"><div class="pic tr">${IC[b.mode].replace('width="20" height="20"', 'width="44" height="44"')}</div>
          <div class="body">${stat}<h3>${MODE[b.mode]} to ${esc(routeName(b.to))}</h3>
          <span class="muted" style="font-size:.9rem">${fmtDate(b.date)} · ${b.time} from ${D.origins[b.from]} · ${guestsLabel(b)}</span></div>
          <div class="act"><span class="mono" style="font-weight:600">${money(b.payNow, b.resident)}</span>${off ? '' : cancelCtl(b)}</div></article>`;
      }
      const p = anyProp(b.pid) || { seed: 1, type: 'guesthouse', name: b.pid, id: b.pid };
      let payLine = '';
      if (b.status === 'awaiting_payment' && b.pay === 'transfer') payLine = `<label class="btn-link" style="font-size:.88rem;justify-self:start;cursor:pointer">${t('uploadSlip')}<input type="file" accept="image/*,.pdf" data-slip="${b.ref}" hidden></label>${b.slipRejected ? `<span class="err-msg">The property couldn’t match your last slip. Upload a clearer copy.</span>` : ''}`;
      else if (b.status === 'awaiting_payment' && API.LIVE) payLine = `<button type="button" class="btn-link" style="font-size:.88rem;justify-self:start" data-action="pay-again" data-value="${b.ref}">Pay by card</button>`;
      else if (b.status === 'slip_review') payLine = `<span class="muted" style="font-size:.84rem">Slip received${b.slip ? ': ' + esc(String(b.slip).split('/').pop()) : ''}. The property usually checks it within a few hours.</span>`;
      return `<article class="trip${off ? ' cancelled' : ''}"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
        <div class="body">${stat}<h3><a href="#stay-${p.id}" style="text-decoration:none">${esc(p.name)}</a></h3>
        <span class="muted" style="font-size:.9rem">${fmtDate(b.in)} – ${fmtDate(b.out)} · ${b.rooms > 1 ? b.rooms + ' × ' : ''}${esc(b.room)} · ${guestsLabel(b)}</span>
        ${b.transfer ? `<span style="font-size:.88rem">${MODE[b.transfer.mode]} at ${b.transfer.time} from ${D.origins[b.transfer.from]}</span>` : ''}
        ${payLine}</div>
        <div class="act"><span class="mono" style="font-weight:600">${money(b.payNow, b.resident)}</span>${off || b.status === 'checked_in' ? '' : cancelCtl(b)}</div></article>`;
    };
    app.innerHTML = `<div class="wrap trips"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">${t('trips.t')}</h1>
      ${up.length ? `<h2 style="font-size:1.15rem">${t('upcoming')}</h2>${up.map(row).join('')}` : '<p class="muted">No upcoming trips.</p>'}
      ${past.length ? `<h2 style="font-size:1.15rem;margin-top:12px">${t('past')}</h2>${past.map(row).join('')}` : ''}
      ${API.LIVE ? '' : '<p class="muted" style="font-size:.85rem">Demo mode: trips are saved in this browser. In live mode they’re kept in your account.</p>'}</div>`;
  }
  const cancelCtl = b => `<span data-cancel-box="${b.ref}"><button type="button" class="btn btn-ghost btn-sm" data-action="cancel-ask" data-value="${b.ref}">${t('cancel')}</button></span>`;

  /* ---------- LIST YOUR PROPERTY ---------- */
  function renderListProperty(done) {
    if (done) {
      app.innerHTML = `<div class="wrap confirm"><p class="eyebrow">Application sent</p><h2>Thanks. We’ll review ${esc(done)} within two working days.</h2>
        <p class="muted" style="max-width:60ch">We check your tourism registration and room photos, then call to set up your dashboard login. Once approved, your listing goes live and bookings appear in the property dashboard.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#home">${t('nav.home')}</a><a class="btn btn-ghost" href="partner.html">${t('foot.dash')}</a></div></div>`;
      return;
    }
    const opts = D.islands.filter(i => !i.private).map(i => `<option value="${i.id}">${i.code} ${esc(i.name)}</option>`).join('');
    app.innerHTML = `
      <div class="wrap" style="padding-block:28px 10px"><p class="eyebrow">Partners</p><h1 style="font-size:clamp(1.8rem,4vw,2.6rem);margin-top:10px">${t('lp.t')}</h1>
        <p class="muted" style="margin-top:8px;max-width:62ch">No sign-up fee. You set resident and visitor rates, and we take a commission only on completed stays.</p></div>
      <form class="wrap checkout" id="lp" novalidate style="grid-template-columns:1fr">
        <section class="step"><h2><span class="mono">1</span> The property</h2>
          <div class="grid2">
            <div class="field full"><label for="lp-name">Property name</label><input class="input" id="lp-name"><span class="err-msg" data-err="lp-name"></span></div>
            <div class="field"><label for="lp-type">Type</label><select class="input" id="lp-type">${Object.keys(D.types).map(k => `<option value="${k}">${D.types[k].label}</option>`).join('')}</select></div>
            <div class="field"><label for="lp-island">Island</label><select class="input" id="lp-island">${opts}</select></div>
            <div class="field"><label for="lp-rooms">Number of rooms</label><input class="input" id="lp-rooms" type="number" min="1" max="500" value="8"><span class="err-msg" data-err="lp-rooms"></span></div>
            <div class="field" style="align-content:end"><label class="check"><input type="checkbox" id="lp-tourist" checked>Registered with the Ministry of Tourism</label></div>
            <div class="field full"><label for="lp-blurb">Describe it for guests</label><textarea class="input" id="lp-blurb" rows="3" placeholder="Where it is, what’s nearby, what guests love about it"></textarea><span class="err-msg" data-err="lp-blurb"></span></div>
            <div class="field full"><span class="lbl">What you offer</span><div style="display:flex;flex-wrap:wrap;gap:8px 18px">${['Breakfast included', 'Airport pickup', 'Bikini beach nearby', 'House reef', 'Full kitchen', 'Air conditioning', 'Wi-Fi', 'Excursions desk'].map(a => `<label class="check"><input type="checkbox" data-amen value="${a}">${a}</label>`).join('')}</div></div>
          </div>
        </section>
        <section class="step"><h2><span class="mono">2</span> Your first room type</h2>
          <div class="grid2">
            <div class="field"><label for="lp-rname">Room name</label><input class="input" id="lp-rname" placeholder="Standard double"><span class="err-msg" data-err="lp-rname"></span></div>
            <div class="field"><label for="lp-sleeps">Sleeps</label><input class="input" id="lp-sleeps" type="number" min="1" max="10" value="2"></div>
            <div class="field"><label for="lp-local">Resident rate (MVR per night)</label><input class="input" id="lp-local" type="number" min="1" placeholder="750"><span class="err-msg" data-err="lp-local"></span></div>
            <div class="field"><label for="lp-intl">Visitor rate (USD per night)</label><input class="input" id="lp-intl" type="number" min="1" placeholder="70"><span class="err-msg" data-err="lp-intl"></span></div>
          </div>
          <p class="muted" style="font-size:.86rem">Add more room types and photos from your dashboard after approval.</p>
        </section>
        <section class="step"><h2><span class="mono">3</span> Contact</h2>
          <div class="grid2">
            <div class="field"><label for="lp-cname">Your name</label><input class="input" id="lp-cname" autocomplete="name"><span class="err-msg" data-err="lp-cname"></span></div>
            <div class="field"><label for="lp-cphone">Mobile</label><input class="input" id="lp-cphone" type="tel" dir="ltr" placeholder="+960 7xx xxxx"><span class="err-msg" data-err="lp-cphone"></span></div>
          </div>
          <button class="btn btn-primary" type="submit" style="justify-self:start">Send application</button>
        </section>
      </form>`;
  }
  async function submitListProperty() {
    const v = id => $('#' + id).value.trim(), n = id => Number($('#' + id).value);
    const tourist = $('#lp-tourist').checked;
    const errs = {};
    if (v('lp-name').length < 3) errs['lp-name'] = 'Enter the property name.';
    if (!(n('lp-rooms') >= 1)) errs['lp-rooms'] = 'Enter how many rooms you have.';
    if (v('lp-blurb').length < 30) errs['lp-blurb'] = 'Write at least a sentence or two (30 characters) for guests.';
    if (v('lp-rname').length < 2) errs['lp-rname'] = 'Name the room type.';
    if (!(n('lp-local') > 0)) errs['lp-local'] = 'Enter the resident rate in MVR.';
    if (tourist && !(n('lp-intl') > 0)) errs['lp-intl'] = 'Enter the visitor rate in USD.';
    if (v('lp-cname').length < 2) errs['lp-cname'] = 'Enter your name.';
    if (!PHONE.test(v('lp-cphone'))) errs['lp-cphone'] = 'Enter a phone number with country code.';
    $$('#lp [data-err]').forEach(e => { e.textContent = errs[e.dataset.err] || ''; });
    const first = Object.keys(errs)[0]; if (first) { $('#' + first).focus(); return; }
    const r = await API.applyProperty({
      name: v('lp-name'), type: v('lp-type'), island: v('lp-island'), roomsTotal: n('lp-rooms'), tourist, blurb: v('lp-blurb'),
      amenities: $$('[data-amen]:checked').map(x => x.value), roomName: v('lp-rname'), sleeps: n('lp-sleeps') || 2, local: n('lp-local'), intl: tourist ? n('lp-intl') : null,
      contactName: v('lp-cname'), contactPhone: v('lp-cphone')
    });
    if (!r.ok) { toast('Couldn’t send: ' + r.error); return; }
    renderListProperty(v('lp-name'));
    window.scrollTo(0, 0);
  }

  /* ---------- SIGN IN ---------- */
  function openSignin() {
    const u = API.user();
    layer.innerHTML = `<div class="scrim" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <div class="modal-head"><h2 id="m-title" style="font-size:1.3rem">${u ? 'Your account' : 'Sign in or create an account'}</h2><button class="x" type="button" data-action="close-modal" aria-label="Close">×</button></div>
      ${u ? `<p>Signed in as <strong>${esc(u.name)}</strong><br><span class="muted">${esc(u.contact)}</span></p>
        <a class="btn btn-ghost" href="#trips" data-action="close-modal">${t('nav.trips')}</a>
        <button class="btn btn-ghost" type="button" data-action="sign-out">Sign out</button>` : `
      <form id="si" novalidate style="display:grid;gap:12px">
        <div class="field"><label for="si-name">Your name</label><input class="input" id="si-name" autocomplete="name"></div>
        <div class="field"><label for="si-contact">Mobile number or email</label><input class="input" id="si-contact" dir="ltr" placeholder="${S.resident ? '+960 7771234' : 'you@example.com'}" autocomplete="username"></div>
        <div class="field" id="si-code-f" hidden><label for="si-code">6-digit code</label><input class="input mono" id="si-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><span class="muted" style="font-size:.8rem" id="si-hint">${API.LIVE ? 'We sent a code to you. It expires in 10 minutes.' : 'Demo: use 123456'}</span></div>
        <span class="err-msg" id="si-err" role="alert"></span>
        <button class="btn btn-primary" type="submit" id="si-go">Send code</button>
      </form>`}
    </div></div>`;
    const first = $('.modal input, .modal .btn', layer); if (first) first.focus();
  }
  const closeModal = () => { layer.innerHTML = ''; };
  async function submitSignin() {
    const name = $('#si-name').value.trim(), contact = $('#si-contact').value.trim(), codeF = $('#si-code-f'), err = $('#si-err'), go = $('#si-go');
    if (name.length < 2) { err.textContent = 'Enter your name.'; $('#si-name').focus(); return; }
    if (!PHONE.test(contact) && !EMAIL.test(contact)) { err.textContent = 'Enter a mobile number with country code or an email address.'; $('#si-contact').focus(); return; }
    go.disabled = true;
    if (codeF.hidden) {
      const r = await API.sendCode(contact); go.disabled = false;
      if (!r.ok) { err.textContent = 'Couldn’t send the code: ' + r.error; return; }
      codeF.hidden = false; err.textContent = ''; go.textContent = t('signin'); $('#si-code').focus(); return;
    }
    const r = await API.verifyCode(contact, $('#si-code').value.trim(), name); go.disabled = false;
    if (!r.ok) { err.textContent = API.LIVE ? 'That code didn’t work. Check it or send a new one.' : 'That code doesn’t match. Use 123456 in the demo.'; return; }
    syncHeader(); closeModal(); toast('Signed in as ' + name.split(' ')[0]);
    if (location.hash !== '#checkout') render(false);
  }

  /* ---------- router ---------- */
  let lastRoute = '';
  function render(scrollTop = true) {
    const h = decodeURIComponent(location.hash.slice(1)) || 'home';
    const main = h.startsWith('stay-') ? 'stays' : h.startsWith('done-') || h === 'checkout' ? '' : h;
    $$('[data-nav]').forEach(a => { if (a.dataset.nav === main) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (h === 'home') renderHome();
    else if (h === 'stays') renderStays();
    else if (h.startsWith('stay-')) renderStay(h.slice(5));
    else if (h === 'transfers') renderTransfers();
    else if (h === 'trips') renderTrips();
    else if (h === 'checkout') renderCheckout();
    else if (h === 'list-property') renderListProperty();
    else if (h.startsWith('done-')) renderDone(h.slice(5));
    else renderHome();
    const titles = { home: 'Raajje Stay', stays: 'Stays · Raajje Stay', transfers: 'Transfers · Raajje Stay', trips: 'My trips · Raajje Stay', checkout: 'Checkout · Raajje Stay', 'list-property': 'List your property · Raajje Stay' };
    const sp = h.startsWith('stay-') && prop(h.slice(5));
    document.title = titles[h] || (sp ? sp.name + ' · Raajje Stay' : 'Raajje Stay');
    if (scrollTop && h !== lastRoute) window.scrollTo(0, 0);
    lastRoute = h;
  }
  const go = h => { if (location.hash.slice(1) === h) render(); else location.hash = h; };

  /* ---------- events ---------- */
  function rerenderAfterGuests() {
    const h = location.hash.slice(1);
    if (h.startsWith('stay-')) { const p = prop(h.slice(5)); if (p) { renderRooms(p); renderBook(p); } }
  }
  document.addEventListener('click', async e => {
    const typeLink = e.target.closest('[data-type-link]');
    if (typeLink) { S.filters.types = [typeLink.dataset.typeLink]; S.search.where = 'any'; if (location.hash === '#stays') { e.preventDefault(); render(); } return; }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); go('home'); setTimeout(() => { const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 30); return; }
    const pop = $('#guests-pop');
    if (pop && !pop.hidden && !e.target.closest('#guests-pop') && !e.target.closest('#s-guests')) { pop.hidden = true; $('#s-guests').setAttribute('aria-expanded', 'false'); }
    const a = e.target.closest('[data-action]');
    if (!a) return;
    const act = a.dataset.action, val = a.dataset.value;
    switch (act) {
      case 'set-resident': setResident(val === '1'); break;
      case 'lang': I.set(I.lang === 'dv' ? 'en' : 'dv'); syncHeader(); render(false); break;
      case 'type-chip':
        S.filters.types = val === 'all' ? [] : [val];
        $$('[data-action="type-chip"]').forEach(c => c.setAttribute('aria-pressed', c === a ? 'true' : 'false'));
        if (location.hash === '#stays') { renderFilters(); renderList(); }
        break;
      case 'guests-pop': { const p = $('#guests-pop'); p.hidden = !p.hidden; a.setAttribute('aria-expanded', String(!p.hidden)); break; }
      case 'guests-close': $('#guests-pop').hidden = true; $('#s-guests').setAttribute('aria-expanded', 'false'); break;
      case 'step': {
        const g = S.search, k = a.dataset.k, lim = { adults: [1, 12], children: [0, 8], infants: [0, 4] }[k];
        g[k] = Math.min(lim[1], Math.max(lim[0], g[k] + Number(a.dataset.d)));
        $$('[data-out$="-' + k + '"]').forEach(o => { o.textContent = g[k]; });
        $$('[data-action="step"][data-k="' + k + '"]').forEach(b => { b.disabled = (b.dataset.d === '-1' ? g[k] <= lim[0] : g[k] >= lim[1]); });
        $$('[data-glabel]').forEach(l => { l.textContent = guestsLabel(g); });
        rerenderAfterGuests();
        if (location.hash === '#stays') renderList();
        break;
      }
      case 'go-type': S.filters.types = [val]; S.search.where = 'any'; go('stays'); break;
      case 'go-island': S.search.where = val; S.filters = { types: [], atolls: [], max: null, amen: [], sort: 'rec' }; go('stays'); break;
      case 'sort-rating': S.filters.sort = 'rating'; break;
      case 'toggle-filters': S.filtersOpen = !S.filtersOpen; $('#filters').dataset.closed = String(!S.filtersOpen); a.setAttribute('aria-expanded', String(S.filtersOpen)); break;
      case 'clear-filters': S.filters = { types: [], atolls: [], max: null, amen: [], sort: S.filters.sort }; renderStays(); break;
      case 'clear-all': S.filters = { types: [], atolls: [], max: null, amen: [], sort: 'rec' }; S.search.where = 'any'; renderStays(); break;
      case 'reserve': {
        const s = S.search;
        S.pending = { pid: S.sel.pid, room: S.sel.room, rooms: S.sel.rooms, in: s.in, out: s.out, adults: s.adults, children: s.children, infants: s.infants, transfer: -1, time: null, pay: null, form: null };
        go('checkout'); break;
      }
      case 'to-book': $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'pick-time': S.pending.time = val; readForm(); $$('[data-action="pick-time"]').forEach(c => c.setAttribute('aria-pressed', c === a ? 'true' : 'false')); renderSummary(); break;
      case 'tr-time': S.tr.pick = { k: Number(a.dataset.k), time: val }; renderTrResults(); { const f = $('#tb-name'); if (f) f.focus(); } break;
      case 'tr-for': S.tr.to = val; S.tr.date = a.dataset.date; break;
      case 'pay-again': { const r = await API.startPayment(val); if (r.ok && r.url) location.href = r.url; else toast('Couldn’t open the payment page. Try again in a minute.'); break; }
      case 'cancel-ask':
        $('[data-cancel-box="' + val + '"]').innerHTML = `<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="muted" style="font-size:.84rem;align-self:center">Cancel this booking?</span><button type="button" class="btn btn-sm btn-danger" data-action="cancel-yes" data-value="${val}">${t('yesCancel')}</button><button type="button" class="btn btn-ghost btn-sm" data-action="cancel-no" data-value="${val}">${t('keep')}</button></span>`;
        break;
      case 'cancel-yes': { const r = await API.cancel(val); if (r.ok) { S.left = {}; renderTrips(); toast('Booking ' + val + ' cancelled'); } else toast('Couldn’t cancel: ' + r.error); break; }
      case 'cancel-no': renderTrips(); break;
      case 'open-signin': openSignin(); break;
      case 'close-modal': if (e.target === a || a.classList.contains('x') || a.tagName === 'A') closeModal(); break;
      case 'sign-out': await API.signOut(); syncHeader(); closeModal(); toast('Signed out'); render(false); break;
    }
  });

  document.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset.bind) {
      const s = S.search;
      s[el.dataset.bind] = el.value;
      if (el.dataset.bind === 'in' && el.value) { if (s.in < today) s.in = today; if (nightsBetween(s.in, s.out) < 1) s.out = addDays(s.in, 1); }
      if (el.dataset.bind === 'out' && el.value && nightsBetween(s.in, s.out) < 1) s.out = addDays(s.in, 1);
      if (!s.in) s.in = today; if (!s.out) s.out = addDays(s.in, 1);
      $$('[data-bind="in"]').forEach(i => { i.value = s.in; });
      $$('[data-bind="out"]').forEach(i => { i.value = s.out; i.min = addDays(s.in, 1); });
      rerenderAfterGuests();
      if (location.hash === '#stays') renderList();
      return;
    }
    if (el.dataset.filter) {
      const arr = S.filters[el.dataset.filter];
      if (el.checked) arr.push(el.value); else arr.splice(arr.indexOf(el.value), 1);
      if (el.dataset.filter === 'types') $$('[data-action="type-chip"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.value === 'all' ? !S.filters.types.length : S.filters.types.length === 1 && S.filters.types[0] === c.dataset.value)));
      renderList(); return;
    }
    if (el.id === 'sort') { S.filters.sort = el.value; renderList(); return; }
    if (el.id === 'b-rooms') { S.sel.rooms = Number(el.value); const p = prop(S.sel.pid); renderRooms(p); renderBook(p); return; }
    if (el.name === 'room') { S.sel.room = Number(el.value); renderBook(prop(S.sel.pid)); return; }
    if (el.name === 'tr') { readForm(); S.pending.transfer = Number(el.value); const o = trCost(S.pending); S.pending.time = o ? (o.o.times.length === 1 ? o.o.times[0] : null) : null; renderCheckout(); return; }
    if (el.name === 'pay') { S.pending.pay = el.value; renderSummary(); return; }
    if (el.id === 't-to') { S.tr.to = el.value; S.tr.pick = null; renderTransfers(); return; }
    if (el.id === 't-date') { S.tr.date = el.value && el.value >= today ? el.value : today; S.tr.pick = null; renderTransfers(); return; }
    if (el.id === 't-ad') { S.tr.adults = Number(el.value); S.tr.children = 0; renderTrResults(); return; }
    if (el.id === 't-inf') { S.tr.infants = Number(el.value); renderTrResults(); return; }
    if (el.dataset.slip && el.files[0]) {
      const file = el.files[0];
      if (file.size > 8 * 1024 * 1024) { toast('That file is over 8 MB. Upload a photo or PDF under 8 MB.'); return; }
      const r = await API.uploadSlip(el.dataset.slip, file);
      if (r.ok) { renderTrips(); toast('Slip uploaded. The property will check it.'); } else toast('Upload failed: ' + r.error);
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'f-max') { S.filters.max = Number(e.target.value); $('#f-max-v').textContent = 'Up to ' + money(S.filters.max); renderList(); }
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'search-form') { const pop = $('#guests-pop'); if (pop) pop.hidden = true; go('stays'); }
    else if (f.id === 'co') confirmBooking();
    else if (f.id === 'lp') submitListProperty();
    else if (f.dataset.trbook != null) bookTransfer(Number(f.dataset.trbook), f);
    else if (f.id === 'si') submitSignin();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (layer.innerHTML) closeModal(); const p = $('#guests-pop'); if (p && !p.hidden) { p.hidden = true; $('#s-guests').focus(); } }
  });
  window.addEventListener('hashchange', () => render());
  // another tab (dashboard or admin) changed the demo database
  window.addEventListener('storage', e => { if (e.key === 'rs_db') API.reload().then(() => render(false)); });

  /* ---------- boot ---------- */
  (async function boot() {
    I.apply();
    app.innerHTML = '<div class="wrap" style="padding-block:60px"><p class="muted">Loading stays…</p></div>';
    try { await API.init({ scope: 'site' }); }
    catch (err) { app.innerHTML = `<div class="wrap confirm"><h2>We couldn’t load Raajje Stay</h2><p class="muted">${esc(err.message)}. Check your connection and reload.</p></div>`; return; }
    // returning from the BML payment page
    const qs = new URLSearchParams(location.search);
    const txn = qs.get('transactionId');
    if (txn) {
      const r = await API.verifyPayment(txn);
      history.replaceState(null, '', location.pathname + (r.ref ? '#done-' + r.ref : '#trips'));
      if (r.ok && r.state !== 'CONFIRMED') setTimeout(() => toast('The payment didn’t complete. You can try again from My trips.'), 300);
    }
    syncHeader();
    render();
  })();
})();
