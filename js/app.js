/* Raajje Stay — single-page app. Hash routes:
   #home  #stays  #stay-<id>  #transfers  #trips  #checkout  #done-<ref> */
(function () {
  const D = window.RS_DATA, ART = window.RS_ART;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $('#app'), layer = $('#layer');

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('rs_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('rs_' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };

  /* ---------- dates ---------- */
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  const nightsBetween = (a, b) => Math.round((Date.UTC(...b.split('-').map((v, i) => i === 1 ? v - 1 : +v)) - Date.UTC(...a.split('-').map((v, i) => i === 1 ? v - 1 : +v))) / 864e5);
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtDate = s => { const d = parse(s); return DOW[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()]; };
  const today = iso(new Date());

  /* ---------- state ---------- */
  const S = {
    resident: store.get('resident', false),
    search: { where: 'any', in: addDays(today, 14), out: addDays(today, 17), adults: 2, children: 0, infants: 0 },
    filters: { types: [], atolls: [], max: null, amen: [], sort: 'rec' },
    sel: null,
    pending: null,
    user: store.get('user', null),
    bookings: store.get('bookings', []),
    tr: { to: 'maafushi', date: addDays(today, 14), adults: 2, children: 0, infants: 0, pick: null },
    filtersOpen: false
  };
  const saveBookings = () => store.set('bookings', S.bookings);

  /* ---------- money & lookups ---------- */
  function money(n, res = S.resident) {
    const v = Math.round(n * 100) / 100;
    const s = v.toLocaleString('en-US', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 });
    return res ? 'MVR ' + s : '$' + s;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const island = id => D.islands.find(i => i.id === id);
  const prop = id => D.properties.find(p => p.id === id);
  const roomPrice = (room, res = S.resident) => res ? room.local : room.intl;
  const bookable = (p, res = S.resident) => res || (p.tourist && p.rooms.some(r => r.intl != null));
  const fromPrice = (p, res = S.resident) => {
    const v = p.rooms.map(r => roomPrice(r, res)).filter(v => v != null);
    return v.length ? Math.min(...v) : null;
  };
  const locLine = p => { const i = island(p.island); return i.code + ' ' + (i.private ? i.atoll + ' Atoll' : i.name); };
  const guestCount = g => g.adults + g.children;
  const plural = (n, w, ws) => n + ' ' + (n === 1 ? w : (ws || w + 's'));

  function greenRate(p) {
    return ((p.type === 'guesthouse' || p.type === 'apartment') && p.roomsTotal <= 50) ? 6 : 12;
  }

  /* Price breakdown for a stay. Returns lines payable now and at property. */
  function quote(p, roomIdx, g, res = S.resident) {
    const room = p.rooms[roomIdx];
    const price = roomPrice(room, res);
    const nights = Math.max(1, nightsBetween(g.in, g.out));
    const rooms = g.rooms || 1;
    const lines = [];
    const base = price * nights * rooms;
    lines.push({ k: money(price, res) + ' × ' + plural(nights, 'night') + (rooms > 1 ? ' × ' + rooms + ' rooms' : ''), v: base });
    let service = 0, tax = 0;
    if (p.tourist) {
      service = base * 0.10; lines.push({ k: 'Service charge 10%', v: service });
      tax = (base + service) * 0.17; lines.push({ k: 'T-GST 17%', v: tax });
    } else {
      tax = base * 0.08; lines.push({ k: 'GST 8%', v: tax });
    }
    const payNow = base + service + tax;
    let green = 0, greenLine = null;
    if (p.tourist) {
      if (res) greenLine = { k: 'Green Tax', v: null, note: 'Exempt for Maldivians and residents' };
      else {
        const r = greenRate(p), gc = guestCount(g);
        green = r * gc * nights;
        greenLine = { k: 'Green Tax $' + r + ' × ' + plural(gc, 'guest') + ' × ' + plural(nights, 'night'), v: green, note: g.infants ? 'Infants under 2 are exempt' : '' };
      }
    }
    return { lines, payNow, green, greenLine, total: payNow + green, nights, price };
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
    const p = D.properties.find(x => x.route === key && island(x.island).private);
    if (p) return p.name + ' (' + island(p.island).code + ')';
    const i = island(key); return i ? i.name + ' (' + i.code + ')' : key;
  };

  /* ---------- UI helpers ---------- */
  let toastT;
  function toast(msg) {
    let t = $('.toast'); if (t) t.remove();
    t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), 2800);
  }
  function syncHeader() {
    $('#who-res').setAttribute('aria-pressed', S.resident ? 'true' : 'false');
    $('#who-vis').setAttribute('aria-pressed', S.resident ? 'false' : 'true');
    $('#signin-label').textContent = S.user ? S.user.name.split(' ')[0] : 'Sign in';
    $('#signin-btn').setAttribute('aria-label', S.user ? 'Account: ' + S.user.name : 'Sign in');
  }
  function setResident(v) {
    if (S.resident === v) return;
    S.resident = v; store.set('resident', v); S.filters.max = null;
    syncHeader(); render(false);
    toast(v ? 'Showing resident rates in MVR' : 'Showing visitor rates in USD');
  }

  /* ---------- shared pieces ---------- */
  function whereOptions(sel) {
    const groups = {};
    D.islands.forEach(i => { (groups[i.code + ' ' + i.atoll] = groups[i.code + ' ' + i.atoll] || []).push(i); });
    let o = `<option value="any"${sel === 'any' ? ' selected' : ''}>Anywhere in the Maldives</option>`;
    Object.keys(groups).forEach(g => {
      o += `<optgroup label="${esc(g)} Atoll">` + groups[g].map(i => {
        const label = i.private ? (D.properties.find(p => p.island === i.id) || {}).name || i.name : i.name;
        return `<option value="${i.id}"${sel === i.id ? ' selected' : ''}>${esc(label)}${i.private ? ' (resort island)' : ''}</option>`;
      }).join('') + '</optgroup>';
    });
    return o;
  }
  const guestsLabel = g => plural(g.adults, 'adult') + (g.children ? ', ' + plural(g.children, 'child', 'children') : '') + (g.infants ? ', ' + plural(g.infants, 'infant') : '');

  function steppers(g, scope) {
    const row = (k, label, sub, min, max) => `
      <div class="stepper">
        <div><div style="font-weight:600">${label}</div><div class="muted" style="font-size:.8rem">${sub}</div></div>
        <div class="ctr">
          <button type="button" data-action="step" data-scope="${scope}" data-k="${k}" data-d="-1" aria-label="Fewer ${label.toLowerCase()}" ${g[k] <= min ? 'disabled' : ''}>−</button>
          <output data-out="${scope}-${k}">${g[k]}</output>
          <button type="button" data-action="step" data-scope="${scope}" data-k="${k}" data-d="1" aria-label="More ${label.toLowerCase()}" ${g[k] >= max ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
    return row('adults', 'Adults', '12 and over', 1, 12) + row('children', 'Children', '2 to 11', 0, 8) + row('infants', 'Infants', 'Under 2, travel free', 0, 4);
  }

  function searchPanel() {
    const s = S.search, t = S.filters.types;
    const chip = (v, l) => `<button type="button" class="chip" data-action="type-chip" data-value="${v}" aria-pressed="${(v === 'all' ? t.length === 0 : t.length === 1 && t[0] === v)}">${l}</button>`;
    return `<form class="search" id="search-form" autocomplete="off">
      <div class="search-types" role="group" aria-label="Type of stay">
        ${chip('all', 'All stays')}${chip('guesthouse', 'Guesthouses')}${chip('resort', 'Resorts')}${chip('hotel', 'City hotels')}${chip('apartment', 'Apartments')}
      </div>
      <div class="search-row">
        <div class="field field-where"><label for="s-where">Island or atoll</label>
          <select class="input" id="s-where" data-bind="where">${whereOptions(s.where)}</select></div>
        <div class="field"><label for="s-in">Check-in</label><input class="input" type="date" id="s-in" data-bind="in" value="${s.in}" min="${today}"></div>
        <div class="field"><label for="s-out">Check-out</label><input class="input" type="date" id="s-out" data-bind="out" value="${s.out}" min="${addDays(s.in, 1)}"></div>
        <div class="field" style="position:relative"><span class="lbl" id="s-guests-l">Guests</span>
          <button type="button" class="input guests-btn" id="s-guests" data-action="guests-pop" aria-expanded="false" aria-labelledby="s-guests-l s-guests"><span data-glabel="search">${guestsLabel(s)}</span><span aria-hidden="true">▾</span></button>
          <div class="pop" id="guests-pop" hidden>${steppers(s, 'search')}<button type="button" class="btn btn-primary btn-sm" data-action="guests-close">Done</button></div>
        </div>
        <button class="btn btn-primary search-go" type="submit" style="min-height:46px">Search stays</button>
      </div>
    </form>`;
  }

  function ratingBlock(p) {
    const word = p.rating >= 9.2 ? 'Exceptional' : p.rating >= 8.8 ? 'Excellent' : p.rating >= 8.4 ? 'Very good' : 'Good';
    return `<div class="score"><b>${p.rating.toFixed(1)}</b><span>${word} · ${p.reviews} reviews</span></div>`;
  }

  /* ---------- HOME ---------- */
  function renderHome() {
    const res = S.resident;
    const inhabited = D.islands.filter(i => !i.private);
    const boardRows = inhabited.map(i => {
      const props = D.properties.filter(p => p.island === i.id);
      const f = fastest(i.id);
      const prices = props.filter(p => bookable(p)).map(p => fromPrice(p)).filter(v => v != null);
      return `<button type="button" class="board-row" data-action="go-island" data-value="${i.id}">
        <span class="code">${i.code}</span>
        <span class="isl">${esc(i.name)}</span>
        <span class="m how">${f ? MODE[f.mode] + ' · ' + dur(f.mins) : '—'}</span>
        <span class="m n">${plural(props.length, 'stay')}</span>
        <span class="go">${prices.length ? 'from ' + money(Math.min(...prices)) : 'Residents only'}</span>
      </button>`;
    }).join('');

    const types = Object.keys(D.types).map((k, i) => {
      const ps = D.properties.filter(p => p.type === k && bookable(p));
      const min = ps.length ? Math.min(...ps.map(p => fromPrice(p))) : null;
      return `<button type="button" class="typecard" data-action="go-type" data-value="${k}">
        <div class="pic">${ART.draw([11, 97, 131, 163][i], k, { label: D.types[k].plural })}</div>
        <div class="body"><h3>${D.types[k].plural}</h3><p>${D.types[k].note}</p>
        <span class="from">${min != null ? 'from ' + money(min) + ' / night' : 'Residents only'}</span></div>
      </button>`;
    }).join('');

    // worked example: Ocean Sand Inn, 3 nights, 2 adults
    const ex = prop('ocean-sand-inn');
    const g = { in: '2026-12-01', out: '2026-12-04', adults: 2, children: 0, infants: 0, rooms: 1 };
    const ledger = (r) => {
      const q = quote(ex, 0, g, r);
      return q.lines.map(l => `<div><span>${l.k}</span><span class="v">${money(l.v, r)}</span></div>`).join('') +
        (q.greenLine ? `<div><span>${q.greenLine.k}</span><span class="v">${q.greenLine.v == null ? 'Exempt' : money(q.greenLine.v, r)}</span></div>` : '') +
        `<div class="tot"><span>Total</span><span class="v">${money(q.total, r)}</span></div>`;
    };

    const top = D.properties.filter(p => bookable(p)).sort((a, b) => b.rating - a.rating).slice(0, 3);

    app.innerHTML = `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <p class="eyebrow">1,192 islands · 26 atolls · one booking</p>
          <h1 style="margin-top:14px">Book the island first.<br><em>We’ll sort the boat.</em></h1>
          <p class="hero-lede">Guesthouses, resorts, city hotels and apartments across the Maldives, with the speedboat, ferry or seaplane added to the same booking.</p>
          <div class="who-big" role="group" aria-label="Who is booking">
            <button type="button" data-action="set-resident" data-value="1" aria-pressed="${res}"><strong>I live in the Maldives</strong><span>Resident rates in MVR, no Green Tax</span></button>
            <button type="button" data-action="set-resident" data-value="0" aria-pressed="${!res}"><strong>I’m visiting</strong><span>Visitor rates in USD, all taxes shown</span></button>
          </div>
        </div>
        <div class="hero-art">${ART.draw(37, 'guesthouse', { label: 'Island with a guesthouse and a dhoni boat in the lagoon', variant: 2 })}
          <div class="stamp">ADh. DHIGURAH<br>4.07°N 72.87°E</div>
        </div>
      </div>
      <div class="wrap" style="padding-block:0 28px">${searchPanel()}</div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>Four ways to stay</h2><p>From a family-run guesthouse on Thulusdhoo to a water villa in Baa, each priced for who you are.</p></div></div>
      <div class="typegrid">${types}</div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>Island board</h2><p>Every inhabited island we cover, with the quickest way there from Velana International Airport.</p></div>
        <a class="btn btn-ghost btn-sm" href="#transfers">All transfers</a></div>
      <div class="board">
        <div class="board-head"><span>Atoll</span><span>Island</span><span>Fastest from MLE</span><span>Stays</span><span style="text-align:right">Per night</span></div>
        ${boardRows}
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>Same room, two prices</h2><p>Three nights in a standard double at ${esc(ex.name)}, Maafushi, for two adults. Visitors pay Green Tax at the property; residents don’t pay it at all.</p></div></div>
      <div class="split">
        <div class="rates"><h3><span class="tag">Resident</span> Maldivians &amp; work permit holders</h3><div class="ledger">${ledger(true)}</div></div>
        <div class="rates"><h3><span class="tag tag-sun">Visitor</span> Tourists</h3><div class="ledger">${ledger(false)}</div></div>
      </div>
    </section>

    <section class="section wrap">
      <div class="section-head"><div><h2>Highest rated this season</h2></div><a class="btn btn-ghost btn-sm" href="#stays" data-action="sort-rating">See all</a></div>
      <div class="list">${top.map(card).join('')}</div>
    </section>

    <section class="section wrap" id="faq">
      <div class="section-head"><div><h2>Good to know</h2></div></div>
      <div class="faq">
        <details><summary>Who can book resident rates?</summary><p>Maldivian citizens and foreigners living here on a work permit or residence visa. We ask for your ID card or work permit number at checkout, and the property checks it when you arrive.</p></details>
        <details><summary>What is Green Tax and how much is it?</summary><p>Visitors pay Green Tax for every night they stay: USD 12 per person at resorts, hotels and larger guesthouses, and USD 6 at guesthouses on inhabited islands with 50 rooms or fewer. Children under two are exempt, and so are Maldivians and residents. You pay it to the property when you check out.</p></details>
        <details><summary>Which taxes are already in the price?</summary><p>Every total includes the 10% service charge and 17% T-GST at tourist-registered places. Apartments that aren’t tourist-registered charge 8% GST instead and are only open to residents.</p></details>
        <details><summary>Do public ferries run on Fridays?</summary><p>Most public ferry routes don’t run on Fridays, and some only sail two or three days a week. The transfer search hides sailings that don’t run on your date. Speedboats, seaplanes and domestic flights run daily.</p></details>
        <details><summary>Can I drink alcohol at a guesthouse?</summary><p>No. Alcohol is only served at resorts, liveaboards and a few licensed hotels. Guesthouses on inhabited islands are alcohol free, and many islands ask visitors to cover shoulders and knees away from the bikini beach.</p></details>
        <details><summary>How do cancellations work?</summary><p>Guesthouses, hotels and apartments are free to cancel up to 3 days before check-in. Resorts are free to cancel up to 14 days before. You can cancel from My trips.</p></details>
      </div>
    </section>`;
  }

  /* ---------- STAYS ---------- */
  function card(p) {
    const ok = bookable(p);
    const fp = fromPrice(p);
    let total = '';
    if (ok) {
      const ri = p.rooms.findIndex(r => roomPrice(r) === fp);
      const q = quote(p, ri, { ...S.search, rooms: 1 });
      total = `<div><div class="price-big">${money(fp)}</div><div class="price-note">per night · ${money(q.total)} for ${plural(q.nights, 'night')} incl. taxes</div></div>`;
    } else {
      total = `<div><span class="tag tag-grey">Residents only</span><div class="price-note" style="margin-top:6px">Not open to tourist bookings</div></div>`;
    }
    return `<a class="card" href="#stay-${p.id}">
      <div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
      <div class="body">
        <span class="loc">${esc(locLine(p))} · ${D.types[p.type].label}</span>
        <h3>${esc(p.name)}</h3>
        <p class="muted" style="font-size:.93rem">${esc(p.blurb.split('. ')[0])}.</p>
        <div class="am">${p.amenities.slice(0, 3).map(a => `<span>${esc(a)}</span>`).join('')}</div>
      </div>
      <div class="side">${ratingBlock(p)}${total}</div>
    </a>`;
  }

  const AMEN = ['Breakfast included', 'Bikini beach nearby', 'Airport pickup', 'House reef', 'Overwater villas', 'Full kitchen'];
  function filtered() {
    const f = S.filters, s = S.search;
    let list = D.properties.filter(p => {
      if (s.where !== 'any' && p.island !== s.where) return false;
      if (f.types.length && !f.types.includes(p.type)) return false;
      if (f.atolls.length && !f.atolls.includes(island(p.island).code)) return false;
      if (f.amen.length && !f.amen.every(a => p.amenities.includes(a))) return false;
      if (f.max != null && bookable(p) && fromPrice(p) > f.max) return false;
      return true;
    });
    const key = { rec: p => -(p.rating * 10 + p.reviews / 100), price: p => fromPrice(p) ?? 1e9, rating: p => -p.rating }[f.sort];
    list.sort((a, b) => (bookable(a) === bookable(b) ? 0 : bookable(a) ? -1 : 1) || key(a) - key(b));
    return list;
  }
  function priceCeil() { return Math.max(...D.properties.filter(p => bookable(p)).map(p => fromPrice(p))); }

  function renderStays() {
    app.innerHTML = `
      <section class="hero" style="padding-block:18px"><div class="wrap">${searchPanel()}</div></section>
      <div class="wrap results">
        <aside class="filters" id="filters" data-closed="${!S.filtersOpen}" aria-label="Filters"></aside>
        <div style="min-width:0">
          <div class="list-head">
            <div><h2 id="res-count" style="font-size:1.3rem"></h2><p class="muted" id="res-sub" style="font-size:.9rem"></p></div>
            <div style="display:flex;gap:8px;align-items:center">
              <button class="btn btn-ghost btn-sm filter-toggle" type="button" data-action="toggle-filters" aria-controls="filters">Filters</button>
              <label class="sr" for="sort">Sort by</label>
              <select class="input" id="sort" style="min-height:38px;padding:7px 10px;width:auto">
                <option value="rec">Recommended</option><option value="price">Lowest price</option><option value="rating">Top rated</option>
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
    const count = (pred) => D.properties.filter(pred).length;
    const atolls = [...new Set(D.islands.map(i => i.code))];
    const ceil = priceCeil();
    const max = f.max == null ? ceil : f.max;
    const step = S.resident ? 50 : 5;
    $('#filters').innerHTML = `
      <fieldset><legend>Type of stay</legend>
        ${Object.keys(D.types).map(k => `<label class="check"><input type="checkbox" data-filter="types" value="${k}" ${f.types.includes(k) ? 'checked' : ''}>${D.types[k].label}<span class="n">${count(p => p.type === k)}</span></label>`).join('')}
      </fieldset>
      <fieldset><legend>Max price per night</legend>
        <input type="range" id="f-max" min="${S.resident ? 500 : 50}" max="${ceil}" step="${step}" value="${max}" aria-describedby="f-max-v">
        <div class="mono" id="f-max-v" style="font-size:.88rem">${f.max == null ? 'Any price' : 'Up to ' + money(max)}</div>
      </fieldset>
      <fieldset><legend>Atoll</legend>
        ${atolls.map(c => { const i = D.islands.find(x => x.code === c); return `<label class="check"><input type="checkbox" data-filter="atolls" value="${c}" ${f.atolls.includes(c) ? 'checked' : ''}><span class="mono" style="min-width:3.2ch">${c}</span>${i.atoll}<span class="n">${count(p => island(p.island).code === c)}</span></label>`; }).join('')}
      </fieldset>
      <fieldset><legend>Features</legend>
        ${AMEN.map(a => `<label class="check"><input type="checkbox" data-filter="amen" value="${esc(a)}" ${f.amen.includes(a) ? 'checked' : ''}>${a}</label>`).join('')}
      </fieldset>
      <button type="button" class="btn-link" data-action="clear-filters" style="justify-self:start">Clear filters</button>`;
  }
  function renderList() {
    const list = filtered();
    const s = S.search;
    $('#res-count').textContent = plural(list.length, 'stay') + (s.where !== 'any' ? ' on ' + (island(s.where).private ? (D.properties.find(p => p.island === s.where) || {}).name : island(s.where).name) : ' across the Maldives');
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
      const t = D.reviewText[Math.floor(r() * D.reviewText.length)];
      const sc = Math.min(10, Math.round((p.rating - 0.6 + r() * 1.2) * 10) / 10);
      const m = MON[(8 + Math.floor(r() * 3)) % 12];
      return { who, t, sc, m };
    });
  }

  function renderStay(id) {
    const p = prop(id);
    if (!p) { app.innerHTML = `<div class="wrap confirm"><h2>We couldn’t find that stay</h2><a class="btn btn-primary" href="#stays">Browse all stays</a></div>`; return; }
    const i = island(p.island);
    if (!S.sel || S.sel.pid !== id) {
      const fp = fromPrice(p);
      S.sel = { pid: id, room: Math.max(0, p.rooms.findIndex(r => roomPrice(r) === fp)), rooms: 1 };
    }
    const routes = D.routes[p.route] || [];
    const isResort = p.type === 'resort';
    const rules = [
      ['Check-in', isResort ? 'from 14:00' : 'from 13:00'],
      ['Check-out', 'by 12:00'],
      ['Free cancellation', isResort ? 'until 14 days before arrival' : 'until 3 days before arrival'],
      ['Alcohol', isResort || p.type === 'hotel' && p.island === 'hulhumale' ? 'Served on site' : 'Not served (inhabited island)'],
      ['Dress', i.private ? 'Swimwear anywhere on the island' : 'Bikini beach for swimwear; cover shoulders and knees in the village']
    ];
    app.innerHTML = `
      <div class="wrap">
        <nav class="crumbs" aria-label="Breadcrumb"><a href="#home">Home</a><span>/</span><a href="#stays">Stays</a><span>/</span><span>${esc(p.name)}</span></nav>
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
          <section><h2 style="font-size:1.3rem;margin-bottom:10px">About</h2><p style="max-width:68ch">${esc(p.blurb)}</p></section>
          <section><h2 style="font-size:1.3rem;margin-bottom:14px">What’s here</h2>
            <div class="amen">${p.amenities.map(a => `<div>${IC.check}${esc(a)}</div>`).join('')}</div></section>
          <section><h2 style="font-size:1.3rem;margin-bottom:6px">Choose a room</h2>
            <p class="muted" style="margin-bottom:14px;font-size:.92rem">${S.resident ? 'Resident rates in MVR, per room per night before tax.' : 'Visitor rates in USD, per room per night before tax.'}</p>
            <div class="rooms" id="rooms"></div></section>
          <section><h2 style="font-size:1.3rem;margin-bottom:6px">Getting there</h2>
            <p class="muted" style="margin-bottom:14px;font-size:.92rem">Add any of these at checkout. Fares are per person, one way, ${S.resident ? 'resident' : 'visitor'} rate.</p>
            <div class="transfer-list">${routes.map(o => `
              <div class="tline"><div class="ic">${IC[o.mode]}</div>
                <div style="min-width:0"><strong>${MODE[o.mode]}</strong> <span class="muted" style="font-size:.88rem">· ${dur(o.mins)} from ${D.origins[o.from]}</span>
                  ${o.via ? `<div class="muted" style="font-size:.85rem">${esc(o.via)}</div>` : ''}
                  <div class="times">${o.times.map(t => `<span>${t}</span>`).join('')}<span style="background:none;color:var(--muted)">${o.days}</span></div></div>
                <div class="mono" style="font-weight:600;text-align:right">${money(S.resident ? o.local : o.intl)}</div></div>`).join('')}</div></section>
          <section><h2 style="font-size:1.3rem;margin-bottom:14px">House rules</h2>
            <div class="ledger" style="max-width:620px">${rules.map(r => `<div><span>${r[0]}</span><span style="text-align:right">${r[1]}</span></div>`).join('')}</div></section>
          <section><h2 style="font-size:1.3rem;margin-bottom:14px">Guest reviews</h2>
            <div class="reviews">${seededReviews(p).map(r => `<div class="review"><div class="who-r"><strong>${esc(r.who.n)}</strong><span class="mono">${r.sc.toFixed(1)}</span></div>
              <span class="muted" style="font-size:.8rem">${esc(r.who.c)}${r.who.resident ? ' · resident' : ''} · stayed ${r.m} 2026</span><p>${esc(r.t)}</p></div>`).join('')}</div></section>
        </div>
        <aside class="book" id="book" aria-label="Your booking"></aside>
      </div>
      <div class="mbar" id="mbar"></div>`;
    renderRooms(p); renderBook(p);
  }
  function renderRooms(p) {
    const need = guestCount(S.search);
    $('#rooms').innerHTML = p.rooms.map((r, idx) => {
      const pr = roomPrice(r);
      const cap = r.sleeps * S.sel.rooms;
      return `<label class="room${cap < need ? ' cap-bad' : ''}">
        <input type="radio" name="room" value="${idx}" ${S.sel.room === idx ? 'checked' : ''} ${pr == null ? 'disabled' : ''}>
        <div style="min-width:0"><strong>${esc(r.name)}</strong><div class="meta">${esc(r.beds)} · sleeps ${r.sleeps} · ${r.size} m²${cap < need ? ' · too small for ' + plural(need, 'guest') + ' in ' + plural(S.sel.rooms, 'room') : ''}</div></div>
        <div class="rp">${pr == null ? '<span class="tag tag-grey">Residents only</span>' : `<div class="v">${money(pr)}</div><div class="meta">per night</div>`}</div>
      </label>`;
    }).join('');
  }
  function renderBook(p) {
    const s = S.search, sel = S.sel;
    const box = $('#book');
    if (!bookable(p)) {
      box.innerHTML = `<h3>Residents only</h3>
        <p class="notice warn">${esc(p.name)} isn’t registered as a tourist establishment, so only Maldivians and work permit or residence visa holders can stay here.</p>
        <button class="btn btn-primary btn-block" type="button" data-action="set-resident" data-value="1">I live in the Maldives</button>
        <a class="btn btn-ghost btn-block" href="#stays">See places open to visitors</a>`;
      return;
    }
    const g = { ...s, rooms: sel.rooms };
    const q = quote(p, sel.room, g);
    const room = p.rooms[sel.room];
    const fits = room.sleeps * sel.rooms >= guestCount(s);
    const mbar = $('#mbar');
    if (mbar) mbar.innerHTML = `<div style="min-width:0"><div class="mono" style="font-weight:600">${money(q.total)}</div><div class="price-note">${plural(q.nights, 'night')} · ${esc(room.name)}</div></div>
      <button class="btn btn-primary" type="button" data-action="to-book">Book</button>`;
    box.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px"><div><span class="price-big">${money(q.price)}</span> <span class="muted">/ night</span></div><span class="tag ${S.resident ? '' : 'tag-sun'}">${S.resident ? 'Resident' : 'Visitor'}</span></div>
      <div class="two">
        <div class="field"><label for="b-in">Check-in</label><input class="input" type="date" id="b-in" data-bind="in" value="${s.in}" min="${today}"></div>
        <div class="field"><label for="b-out">Check-out</label><input class="input" type="date" id="b-out" data-bind="out" value="${s.out}" min="${addDays(s.in, 1)}"></div>
      </div>
      <div style="display:grid;gap:10px;padding:12px;border:1px solid var(--line);border-radius:var(--r-s)">${steppers(s, 'book')}</div>
      <div class="field"><label for="b-rooms">Rooms</label>
        <select class="input" id="b-rooms">${[1, 2, 3, 4].map(n => `<option value="${n}" ${sel.rooms === n ? 'selected' : ''}>${plural(n, 'room')} · ${esc(room.name)}</option>`).join('')}</select></div>
      <div class="ledger">
        ${q.lines.map(l => `<div><span>${l.k}</span><span class="v">${money(l.v)}</span></div>`).join('')}
        ${q.greenLine ? `<div><span>${q.greenLine.k}${q.greenLine.note ? `<br><small class="muted">${q.greenLine.note}</small>` : ''}</span><span class="v">${q.greenLine.v == null ? 'Exempt' : money(q.greenLine.v)}</span></div>` : ''}
        <div class="tot"><span>Total</span><span class="v">${money(q.total)}</span></div>
      </div>
      ${q.green ? `<p class="notice">Pay ${money(q.payNow)} now. Green Tax of ${money(q.green)} is paid to the property at check-out.</p>` : ''}
      ${fits ? '' : `<p class="notice warn">${esc(room.name)} sleeps ${room.sleeps}. Add a room or pick a larger one for ${plural(guestCount(s), 'guest')}.</p>`}
      <button class="btn btn-primary btn-block" type="button" data-action="reserve" ${fits ? '' : 'disabled'}>Reserve</button>
      <p class="muted" style="font-size:.82rem;text-align:center">You won’t be charged yet. Free cancellation ${p.type === 'resort' ? '14' : '3'} days before arrival.</p>`;
  }

  /* ---------- CHECKOUT ---------- */
  const NATIONS = ['India', 'China', 'Russia', 'United Kingdom', 'Italy', 'Germany', 'United States', 'Poland', 'France', 'Spain', 'Switzerland', 'Japan', 'Australia', 'Sri Lanka', 'Other'];
  function renderCheckout() {
    const pd = S.pending;
    if (!pd) { location.hash = 'stays'; return; }
    const p = prop(pd.pid), room = p.rooms[pd.room], res = S.resident;
    if (!bookable(p)) { location.hash = 'stay-' + p.id; return; }
    const routes = D.routes[p.route] || [];
    const u = S.user || {};
    const pays = res
      ? [['card', 'Card', 'BML, MIB or any Visa / Mastercard'], ['transfer', 'Bank transfer', 'Upload the slip within 24 hours'], ['property', 'Pay at the property', 'Card or cash on arrival']]
      : [['card', 'Card', 'Visa, Mastercard, Amex, UnionPay'], ['property', 'Pay at the property', 'Card on arrival, in USD']];
    if (!pd.pay) pd.pay = 'card';
    if (pd.transfer == null) pd.transfer = -1;
    app.innerHTML = `
      <div class="wrap"><nav class="crumbs" aria-label="Breadcrumb"><a href="#stay-${p.id}">← Back to ${esc(p.name)}</a></nav><h1 style="font-size:clamp(1.7rem,3.6vw,2.4rem)">Confirm your stay</h1></div>
      <form class="wrap checkout" id="co" novalidate>
        <div style="display:grid;gap:16px;min-width:0">
          <section class="step"><h2><span class="mono">1</span> Your details</h2>
            <div class="grid2">
              <div class="field full"><label for="c-name">Full name (as on ${res ? 'ID card' : 'passport'})</label><input class="input" id="c-name" autocomplete="name" value="${esc(pd.form?.name ?? u.name ?? '')}" required><span class="err-msg" data-err="name"></span></div>
              <div class="field"><label for="c-phone">Mobile</label><input class="input" id="c-phone" type="tel" autocomplete="tel" placeholder="${res ? '+960 7xx xxxx' : '+44 7700 900123'}" value="${esc(pd.form?.phone ?? (u.contact && u.contact.startsWith('+') ? u.contact : ''))}" required><span class="err-msg" data-err="phone"></span></div>
              <div class="field"><label for="c-email">Email</label><input class="input" id="c-email" type="email" autocomplete="email" value="${esc(pd.form?.email ?? (u.contact && u.contact.includes('@') ? u.contact : ''))}" required><span class="err-msg" data-err="email"></span></div>
              ${res ? `
              <div class="field full"><label for="c-id">National ID card or work permit number</label><input class="input" id="c-id" placeholder="A123456 or WP number" value="${esc(pd.form?.id ?? '')}" required><span class="muted" style="font-size:.8rem">The property checks this on arrival to apply the resident rate.</span><span class="err-msg" data-err="id"></span></div>` : `
              <div class="field"><label for="c-nat">Nationality</label><select class="input" id="c-nat" required><option value="">Select</option>${NATIONS.map(n => `<option ${pd.form?.nat === n ? 'selected' : ''}>${n}</option>`).join('')}</select><span class="err-msg" data-err="nat"></span></div>
              <div class="field"><label for="c-pass">Passport number</label><input class="input" id="c-pass" value="${esc(pd.form?.pass ?? '')}" required><span class="err-msg" data-err="pass"></span></div>`}
              <div class="field full"><label for="c-note">Requests for the property <span class="muted">(optional)</span></label><textarea class="input" id="c-note" rows="2" placeholder="Arrival time, dietary needs, cot for a baby">${esc(pd.form?.note ?? '')}</textarea></div>
            </div>
          </section>
          <section class="step"><h2><span class="mono">2</span> Getting there</h2>
            <p class="muted" style="font-size:.92rem">Fares for ${plural(guestCount(pd), 'passenger')}, one way on ${fmtDate(pd.in)}. Infants travel free.</p>
            <div style="display:grid;gap:10px" id="co-transfers">
              <label class="opt"><input type="radio" name="tr" value="-1" ${pd.transfer === -1 ? 'checked' : ''}><div><strong>I’ll arrange my own</strong><small>You can add a transfer later from My trips.</small></div><span></span></label>
              ${routes.map((o, k) => {
                const runs = runsOn(o, pd.in);
                return `<label class="opt" ${runs ? '' : 'style="opacity:.55"'}><input type="radio" name="tr" value="${k}" ${pd.transfer === k ? 'checked' : ''} ${runs ? '' : 'disabled'}>
                <div><strong>${MODE[o.mode]} · ${dur(o.mins)}</strong><small>${runs ? 'From ' + D.origins[o.from] + (o.via ? ' · ' + esc(o.via) : '') : 'Doesn’t run on ' + DOW[parse(pd.in).getDay()] + 's (' + o.days + ')'}</small>
                ${pd.transfer === k && o.times.length > 1 ? `<div class="times" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px" role="group" aria-label="Departure time">${o.times.map(t => `<button type="button" class="time-chip" data-action="pick-time" data-value="${t}" aria-pressed="${pd.time === t}">${t}</button>`).join('')}</div>` : ''}</div>
                <span class="mono" style="font-weight:600">${money((res ? o.local : o.intl) * guestCount(pd))}</span></label>`;
              }).join('')}
            </div>
          </section>
          <section class="step"><h2><span class="mono">3</span> Payment</h2>
            <div style="display:grid;gap:10px">${pays.map(([v, l, d]) => `<label class="opt"><input type="radio" name="pay" value="${v}" ${pd.pay === v ? 'checked' : ''}><div><strong>${l}</strong><small>${d}</small></div><span></span></label>`).join('')}</div>
            <p class="notice">Demo booking: no payment is taken and no card details are collected. A live site connects the payment gateway here.</p>
            <label class="check" style="align-items:flex-start"><input type="checkbox" id="c-agree" ${pd.form?.agree ? 'checked' : ''}><span>I accept the cancellation policy: free until ${p.type === 'resort' ? '14' : '3'} days before arrival, then the first night is charged.</span></label>
            <span class="err-msg" data-err="agree"></span>
            <button class="btn btn-primary btn-block" type="submit" style="min-height:52px;font-size:1.05rem">Confirm booking</button>
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
    const q = quote(p, pd.room, pd);
    const tr = trCost(pd);
    const now = q.payNow + (tr ? tr.cost : 0);
    $('#co-sum').innerHTML = `<div class="ticket">
      <div class="ticket-top"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
        <div class="t"><span class="mono muted" style="font-size:.78rem">${esc(locLine(p))}</span><strong style="font-family:var(--f-display);font-size:1.1rem">${esc(p.name)}</strong><span style="font-size:.88rem">${pd.rooms > 1 ? pd.rooms + ' × ' : ''}${esc(room.name)}</span></div></div>
      <div class="ticket-body">
        <div class="ledger">
          <div><span>Check-in</span><span class="v">${fmtDate(pd.in)}</span></div>
          <div><span>Check-out</span><span class="v">${fmtDate(pd.out)}</span></div>
          <div><span>Guests</span><span>${guestsLabel(pd)}</span></div>
        </div>
      </div>
      <div class="perf"></div>
      <div class="ticket-body">
        <div class="ledger">
          ${q.lines.map(l => `<div><span>${l.k}</span><span class="v">${money(l.v)}</span></div>`).join('')}
          ${tr ? `<div><span>${MODE[tr.o.mode]}${pd.time ? ' ' + pd.time : ''} × ${guestCount(pd)}</span><span class="v">${money(tr.cost)}</span></div>` : ''}
          <div class="tot"><span>${pd.pay === 'property' ? 'Pay at property' : 'Pay now'}</span><span class="v">${money(now)}</span></div>
          ${q.greenLine ? `<div><span>${q.greenLine.k}<br><small class="muted">${q.greenLine.v == null ? q.greenLine.note : 'Paid at check-out'}</small></span><span class="v">${q.greenLine.v == null ? 'Exempt' : money(q.greenLine.v)}</span></div>` : ''}
        </div>
      </div></div>`;
  }
  function readForm() {
    const v = id => { const el = $('#' + id); return el ? el.value.trim() : ''; };
    S.pending.form = { name: v('c-name'), phone: v('c-phone'), email: v('c-email'), id: v('c-id'), nat: v('c-nat'), pass: v('c-pass'), note: v('c-note'), agree: $('#c-agree') ? $('#c-agree').checked : false };
  }
  function validate() {
    readForm();
    const f = S.pending.form, errs = {};
    if (f.name.length < 3) errs.name = 'Enter your full name.';
    if (!/^\+?[\d\s-]{7,}$/.test(f.phone)) errs.phone = 'Enter a phone number with country code, for example +960 7771234.';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)) errs.email = 'Enter an email address like name@example.com.';
    if (S.resident) { if (!/^(A\d{6}|[A-Z]{1,3}\d{5,10})$/i.test(f.id.replace(/\s/g, ''))) errs.id = 'Enter an ID card number like A123456, or your work permit number.'; }
    else { if (!f.nat) errs.nat = 'Choose your nationality.'; if (f.pass.length < 5) errs.pass = 'Enter your passport number.'; }
    if (!f.agree) errs.agree = 'Tick the box to accept the cancellation policy.';
    const pd = S.pending, tr = trCost(pd);
    if (tr && tr.o.times.length > 1 && !pd.time) errs.time = 1;
    $$('[data-err]').forEach(e => { e.textContent = errs[e.dataset.err] || ''; });
    ['name', 'phone', 'email', 'id', 'nat', 'pass'].forEach(k => { const el = $('#c-' + k); if (el) el.classList.toggle('bad', !!errs[k]); });
    if (errs.time) toast('Choose a departure time for your ' + MODE[tr.o.mode].toLowerCase());
    const first = Object.keys(errs)[0];
    if (first && first !== 'time') { const el = $('#c-' + first); if (el) el.focus(); }
    return !first;
  }
  const newRef = () => 'RS-' + Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
  function confirmBooking() {
    if (!validate()) return;
    const pd = S.pending, p = prop(pd.pid), q = quote(p, pd.room, pd), tr = trCost(pd);
    const b = {
      ref: newRef(), kind: 'stay', pid: p.id, room: p.rooms[pd.room].name, rooms: pd.rooms, in: pd.in, out: pd.out, nights: q.nights,
      adults: pd.adults, children: pd.children, infants: pd.infants, resident: S.resident, name: pd.form.name,
      payNow: q.payNow + (tr ? tr.cost : 0), green: q.green, pay: pd.pay,
      transfer: tr ? { mode: tr.o.mode, time: pd.time || tr.o.times[0], mins: tr.o.mins, cost: tr.cost, from: tr.o.from } : null,
      status: 'confirmed', created: new Date().toISOString()
    };
    S.bookings.unshift(b); saveBookings(); S.pending = null;
    location.hash = 'done-' + b.ref;
  }

  /* ---------- CONFIRMATION ---------- */
  function renderDone(ref) {
    const b = S.bookings.find(x => x.ref === ref);
    if (!b) { app.innerHTML = `<div class="wrap confirm"><h2>Booking not found on this device</h2><a class="btn btn-primary" href="#trips">Go to My trips</a></div>`; return; }
    const res = b.resident;
    if (b.kind === 'transfer') {
      app.innerHTML = `<div class="wrap confirm"><p class="eyebrow">Transfer booked</p><div class="ref">${b.ref}</div>
        <h2>${MODE[b.mode]} to ${esc(routeName(b.to))}</h2>
        <div class="rates"><div class="ledger"><div><span>Date</span><span class="v">${fmtDate(b.date)}</span></div><div><span>Departs</span><span class="v">${b.time} from ${D.origins[b.from]}</span></div><div><span>Passengers</span><span>${guestsLabel(b)}</span></div><div class="tot"><span>Paid</span><span class="v">${money(b.payNow, res)}</span></div></div></div>
        <p class="muted">Be at the departure point 30 minutes before. Show this reference to the crew.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#trips">View my trips</a><a class="btn btn-ghost" href="#stays">Find a place to stay</a></div></div>`;
      return;
    }
    const p = prop(b.pid);
    const next = [];
    if (b.pay === 'transfer') next.push('Upload your bank transfer slip from My trips within 24 hours, or the booking is released.');
    else if (b.pay === 'property') next.push('Pay ' + money(b.payNow, res) + ' to the property when you check in.');
    else next.push('Your card will be charged ' + money(b.payNow, res) + ' once the property confirms, usually within an hour.');
    if (b.green) next.push('Green Tax of ' + money(b.green, false) + ' is collected by the property at check-out.');
    if (res) next.push('Bring your ID card or work permit; the property checks it to apply the resident rate.');
    if (b.transfer) next.push('Your ' + MODE[b.transfer.mode].toLowerCase() + ' leaves ' + D.origins[b.transfer.from] + ' at ' + b.transfer.time + ' on ' + fmtDate(b.in) + '. Arrive 30 minutes early.');
    else next.push('You haven’t added a transfer. The property can help arrange one, or book it from the Transfers page.');
    app.innerHTML = `<div class="wrap confirm">
      <div><p class="eyebrow">Booking confirmed</p><div class="ref" style="margin-top:8px">${b.ref}</div></div>
      <h2>See you on ${esc(island(p.island).private ? p.name : island(p.island).name)}, ${esc(b.name.split(' ')[0])}.</h2>
      <div class="ticket"><div class="ticket-top"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name, variant: 1 })}</div>
        <div class="t"><span class="mono muted" style="font-size:.78rem">${esc(locLine(p))}</span><strong style="font-family:var(--f-display);font-size:1.15rem">${esc(p.name)}</strong><span>${b.rooms > 1 ? b.rooms + ' × ' : ''}${esc(b.room)}</span></div></div>
        <div class="perf"></div>
        <div class="ticket-body"><div class="ledger">
          <div><span>Dates</span><span class="v">${fmtDate(b.in)} – ${fmtDate(b.out)}</span></div>
          <div><span>Guests</span><span>${guestsLabel(b)}</span></div>
          <div class="tot"><span>${b.pay === 'property' ? 'Due at property' : 'Total charged'}</span><span class="v">${money(b.payNow, res)}</span></div>
        </div></div></div>
      <div><h3 style="margin-bottom:10px">What happens next</h3><ul style="margin:0;padding-left:20px;display:grid;gap:8px">${next.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn btn-primary" href="#trips">View my trips</a>${b.transfer ? '' : '<a class="btn btn-ghost" href="#transfers" data-action="tr-for" data-value="' + p.route + '" data-date="' + b.in + '">Book a transfer</a>'}</div>
    </div>`;
  }

  /* ---------- TRANSFERS ---------- */
  function renderTransfers() {
    const t = S.tr;
    const keys = Object.keys(D.routes);
    app.innerHTML = `
      <section class="hero"><div class="wrap" style="padding-block:28px 24px;display:grid;gap:18px">
        <div><p class="eyebrow">Speedboats · ferries · seaplanes · flights</p><h1 style="font-size:clamp(1.8rem,4vw,2.6rem);margin-top:10px">Transfers from Velana</h1>
        <p class="muted" style="margin-top:8px;max-width:60ch">Book the boat or flight on its own, or add it when you book a stay. Times are sample departures.</p></div>
        <form class="search" id="tr-form">
          <div class="search-row" style="grid-template-columns:1.4fr 1fr 1fr 1fr">
            <div class="field field-where"><label for="t-to">To</label><select class="input" id="t-to">${keys.map(k => `<option value="${k}" ${t.to === k ? 'selected' : ''}>${esc(routeName(k))}</option>`).join('')}</select></div>
            <div class="field"><label for="t-date">Date</label><input class="input" type="date" id="t-date" value="${t.date}" min="${today}"></div>
            <div class="field"><label for="t-ad">Adults &amp; children</label><select class="input" id="t-ad">${Array.from({ length: 10 }, (_, i) => `<option ${t.adults + t.children === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div>
            <div class="field"><label for="t-inf">Infants (free)</label><select class="input" id="t-inf">${[0, 1, 2, 3].map(i => `<option ${t.infants === i ? 'selected' : ''}>${i}</option>`).join('')}</select></div>
          </div>
        </form>
      </div></section>
      <div class="wrap" style="padding-block:24px 48px;display:grid;gap:14px" id="tr-results"></div>`;
    renderTrResults();
  }
  function renderTrResults() {
    const t = S.tr, res = S.resident, opts = D.routes[t.to] || [];
    const pax = t.adults + t.children;
    const day = DOW[parse(t.date).getDay()];
    $('#tr-results').innerHTML = `<h2 style="font-size:1.25rem">${plural(opts.length, 'option')} to ${esc(routeName(t.to))} · ${fmtDate(t.date)}</h2>` + opts.map((o, k) => {
      const runs = runsOn(o, t.date);
      const picked = t.pick && t.pick.k === k;
      return `<div class="tline" style="grid-template-columns:40px 1fr auto;align-items:start;${runs ? '' : 'opacity:.6'}">
        <div class="ic">${IC[o.mode]}</div>
        <div style="min-width:0;display:grid;gap:4px"><div><strong>${MODE[o.mode]}</strong> <span class="muted" style="font-size:.88rem">· ${dur(o.mins)} · from ${D.origins[o.from]}</span></div>
          ${o.via ? `<div class="muted" style="font-size:.86rem">${esc(o.via)}</div>` : ''}
          ${runs ? `<div class="times" role="group" aria-label="Departure time">${o.times.map(tm => `<button type="button" class="time-chip" data-action="tr-time" data-k="${k}" data-value="${tm}" aria-pressed="${picked && t.pick.time === tm}">${tm}</button>`).join('')}</div>`
                 : `<div class="notice warn" style="margin-top:4px">No sailings on ${day}s. Runs ${o.days}.</div>`}
          ${picked ? `<form class="grid2" data-trbook="${k}" style="margin-top:10px" novalidate>
            <div class="field"><label for="tb-name">Lead passenger</label><input class="input" id="tb-name" value="${esc(S.user ? S.user.name : '')}" autocomplete="name"><span class="err-msg" data-err="tb-name"></span></div>
            <div class="field"><label for="tb-phone">Mobile</label><input class="input" id="tb-phone" type="tel" placeholder="${res ? '+960 7xx xxxx' : '+44 7700 900123'}"><span class="err-msg" data-err="tb-phone"></span></div>
            <button class="btn btn-primary full" type="submit">Book ${MODE[o.mode].toLowerCase()} at ${t.pick.time} · ${money((res ? o.local : o.intl) * pax)}</button></form>` : ''}
        </div>
        <div style="text-align:right"><div class="mono" style="font-weight:600">${money(res ? o.local : o.intl)}</div><div class="price-note">per person</div><div class="mono" style="font-size:.86rem;margin-top:6px">${money((res ? o.local : o.intl) * pax)}</div><div class="price-note">${plural(pax, 'passenger')}</div></div>
      </div>`;
    }).join('') + `<p class="muted" style="font-size:.86rem">${res ? 'Resident fares shown in MVR.' : 'Visitor fares shown in USD and include T-GST.'} Seaplanes fly in daylight only, so late international arrivals may need a night in Hulhumalé first.</p>`;
  }
  function bookTransfer(k, form) {
    const t = S.tr, o = D.routes[t.to][k];
    const name = $('#tb-name', form).value.trim(), phone = $('#tb-phone', form).value.trim();
    let ok = true;
    $('[data-err="tb-name"]', form).textContent = name.length < 3 ? 'Enter the lead passenger’s name.' : '';
    $('[data-err="tb-phone"]', form).textContent = !/^\+?[\d\s-]{7,}$/.test(phone) ? 'Enter a phone number with country code.' : '';
    if (name.length < 3 || !/^\+?[\d\s-]{7,}$/.test(phone)) ok = false;
    if (!ok) return;
    const b = { ref: newRef(), kind: 'transfer', to: t.to, mode: o.mode, from: o.from, date: t.date, time: t.pick.time, adults: t.adults, children: t.children, infants: t.infants, resident: S.resident, name, payNow: (S.resident ? o.local : o.intl) * (t.adults + t.children), status: 'confirmed', created: new Date().toISOString() };
    S.bookings.unshift(b); saveBookings(); t.pick = null;
    location.hash = 'done-' + b.ref;
  }

  /* ---------- TRIPS ---------- */
  function renderTrips() {
    const list = S.bookings;
    if (!list.length) {
      app.innerHTML = `<div class="wrap trips"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">My trips</h1>
        <div class="empty"><h3>No trips yet</h3><p class="muted" style="max-width:44ch">Stays and transfers you book on this device appear here, with your reference number and what to bring.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center"><a class="btn btn-primary" href="#stays">Find a stay</a><a class="btn btn-ghost" href="#transfers">Book a transfer</a></div></div></div>`;
      return;
    }
    const up = list.filter(b => b.status === 'confirmed'), cx = list.filter(b => b.status !== 'confirmed');
    const row = b => {
      const cancelled = b.status !== 'confirmed';
      if (b.kind === 'transfer') {
        return `<article class="trip${cancelled ? ' cancelled' : ''}"><div class="pic tr">${IC[b.mode].replace('width="20" height="20"', 'width="44" height="44"')}</div>
          <div class="body"><span class="status ${cancelled ? 'no' : 'ok'}">${cancelled ? 'Cancelled' : 'Confirmed'} · ${b.ref}</span><h3>${MODE[b.mode]} to ${esc(routeName(b.to))}</h3>
          <span class="muted" style="font-size:.9rem">${fmtDate(b.date)} · ${b.time} from ${D.origins[b.from]} · ${guestsLabel(b)}</span></div>
          <div class="act"><span class="mono" style="font-weight:600">${money(b.payNow, b.resident)}</span>${cancelled ? '' : cancelCtl(b)}</div></article>`;
      }
      const p = prop(b.pid);
      return `<article class="trip${cancelled ? ' cancelled' : ''}"><div class="pic">${ART.draw(p.seed, p.type, { label: p.name })}</div>
        <div class="body"><span class="status ${cancelled ? 'no' : 'ok'}">${cancelled ? 'Cancelled' : 'Confirmed'} · ${b.ref}</span><h3><a href="#stay-${p.id}" style="text-decoration:none">${esc(p.name)}</a></h3>
        <span class="muted" style="font-size:.9rem">${fmtDate(b.in)} – ${fmtDate(b.out)} · ${b.rooms > 1 ? b.rooms + ' × ' : ''}${esc(b.room)} · ${guestsLabel(b)}</span>
        ${b.transfer ? `<span style="font-size:.88rem">${MODE[b.transfer.mode]} at ${b.transfer.time} from ${D.origins[b.transfer.from]}</span>` : ''}
        ${!cancelled && b.pay === 'transfer' ? `<label class="btn-link" style="font-size:.88rem;justify-self:start;cursor:pointer">Upload bank slip<input type="file" accept="image/*,.pdf" data-slip="${b.ref}" hidden></label>${b.slip ? `<span class="muted" style="font-size:.84rem">Slip received: ${esc(b.slip)}</span>` : ''}` : ''}</div>
        <div class="act"><span class="mono" style="font-weight:600">${money(b.payNow, b.resident)}</span>${cancelled ? '' : cancelCtl(b)}</div></article>`;
    };
    app.innerHTML = `<div class="wrap trips"><h1 style="font-size:clamp(1.8rem,4vw,2.6rem)">My trips</h1>
      ${up.length ? `<h2 style="font-size:1.15rem">Upcoming</h2>${up.map(row).join('')}` : '<p class="muted">No upcoming trips.</p>'}
      ${cx.length ? `<h2 style="font-size:1.15rem;margin-top:12px">Cancelled</h2>${cx.map(row).join('')}` : ''}
      <p class="muted" style="font-size:.85rem">Trips are saved in this browser for the demo. A live build keeps them in your account.</p></div>`;
  }
  const cancelCtl = b => `<span data-cancel-box="${b.ref}"><button type="button" class="btn btn-ghost btn-sm" data-action="cancel-ask" data-value="${b.ref}">Cancel</button></span>`;

  /* ---------- SIGN IN ---------- */
  function openSignin() {
    const u = S.user;
    layer.innerHTML = `<div class="scrim" data-action="close-modal"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="m-title">
      <div class="modal-head"><h2 id="m-title" style="font-size:1.3rem">${u ? 'Your account' : 'Sign in or create an account'}</h2><button class="x" type="button" data-action="close-modal" aria-label="Close">×</button></div>
      ${u ? `<p>Signed in as <strong>${esc(u.name)}</strong><br><span class="muted">${esc(u.contact)}</span></p>
        <a class="btn btn-ghost" href="#trips" data-action="close-modal">My trips</a>
        <button class="btn btn-ghost" type="button" data-action="sign-out">Sign out</button>` : `
      <form id="si" novalidate style="display:grid;gap:12px">
        <div class="field"><label for="si-name">Your name</label><input class="input" id="si-name" autocomplete="name"></div>
        <div class="field"><label for="si-contact">Mobile number or email</label><input class="input" id="si-contact" placeholder="${S.resident ? '+960 7771234' : 'you@example.com'}" autocomplete="username"></div>
        <div class="field" id="si-code-f" hidden><label for="si-code">6-digit code</label><input class="input mono" id="si-code" inputmode="numeric" maxlength="6"><span class="muted" style="font-size:.8rem">Demo: use 123456</span></div>
        <span class="err-msg" id="si-err" role="alert"></span>
        <button class="btn btn-primary" type="submit" id="si-go">Send code</button>
      </form>`}
    </div></div>`;
    const first = $('.modal input, .modal .btn', layer); if (first) first.focus();
  }
  const closeModal = () => { layer.innerHTML = ''; };

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
    else if (h.startsWith('done-')) renderDone(h.slice(5));
    else renderHome();
    const titles = { home: 'Raajje Stay', stays: 'Stays · Raajje Stay', transfers: 'Transfers · Raajje Stay', trips: 'My trips · Raajje Stay', checkout: 'Checkout · Raajje Stay' };
    document.title = titles[h] || (h.startsWith('stay-') && prop(h.slice(5)) ? prop(h.slice(5)).name + ' · Raajje Stay' : 'Raajje Stay');
    if (scrollTop && h !== lastRoute) window.scrollTo(0, 0);
    lastRoute = h;
  }
  const go = h => { if (location.hash.slice(1) === h) render(); else location.hash = h; };

  /* ---------- events ---------- */
  function rerenderAfterGuests() {
    const h = location.hash.slice(1);
    if (h.startsWith('stay-')) { const p = prop(h.slice(5)); renderRooms(p); renderBook(p); }
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-action]');
    const typeLink = e.target.closest('[data-type-link]');
    if (typeLink) { S.filters.types = [typeLink.dataset.typeLink]; if (location.hash === '#stays') { e.preventDefault(); render(); } return; }
    const sc = e.target.closest('[data-scroll]');
    if (sc) { e.preventDefault(); go('home'); setTimeout(() => { const el = document.getElementById(sc.dataset.scroll); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 30); return; }
    // close guests popover on outside click
    const pop = $('#guests-pop');
    if (pop && !pop.hidden && !e.target.closest('#guests-pop') && !e.target.closest('#s-guests')) { pop.hidden = true; $('#s-guests').setAttribute('aria-expanded', 'false'); }
    if (!a) return;
    const act = a.dataset.action, val = a.dataset.value;
    switch (act) {
      case 'set-resident': setResident(val === '1'); break;
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
        $$('[data-out$="-' + k + '"]').forEach(o => o.textContent = g[k]);
        $$('[data-action="step"][data-k="' + k + '"]').forEach(b => b.disabled = (b.dataset.d === '-1' ? g[k] <= lim[0] : g[k] >= lim[1]));
        $$('[data-glabel]').forEach(l => l.textContent = guestsLabel(g));
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
      case 'pick-time': S.pending.time = val; readForm(); $$('[data-action="pick-time"]').forEach(c => c.setAttribute('aria-pressed', c === a ? 'true' : 'false')); renderSummary(); break;
      case 'tr-time': S.tr.pick = { k: Number(a.dataset.k), time: val }; renderTrResults(); { const f = $('#tb-name'); if (f) f.focus(); } break;
      case 'tr-for': S.tr.to = val; S.tr.date = a.dataset.date; break;
      case 'cancel-ask': {
        const box = $('[data-cancel-box="' + val + '"]');
        box.innerHTML = `<span style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"><span class="muted" style="font-size:.84rem;align-self:center">Cancel this booking?</span><button type="button" class="btn btn-sm" style="background:var(--err);color:#fff" data-action="cancel-yes" data-value="${val}">Yes, cancel</button><button type="button" class="btn btn-ghost btn-sm" data-action="cancel-no" data-value="${val}">Keep</button></span>`;
        break;
      }
      case 'cancel-yes': { const b = S.bookings.find(x => x.ref === val); if (b) { b.status = 'cancelled'; saveBookings(); renderTrips(); toast('Booking ' + val + ' cancelled'); } break; }
      case 'cancel-no': renderTrips(); break;
      case 'to-book': $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
      case 'open-signin': openSignin(); break;
      case 'close-modal': if (e.target === a || a.classList.contains('x') || a.tagName === 'A') closeModal(); break;
      case 'sign-out': S.user = null; store.set('user', null); syncHeader(); closeModal(); toast('Signed out'); break;
    }
  });

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.dataset.bind) {
      const s = S.search;
      s[t.dataset.bind] = t.value;
      if (t.dataset.bind === 'in' && t.value) {
        if (s.in < today) s.in = today;
        if (nightsBetween(s.in, s.out) < 1) s.out = addDays(s.in, 1);
      }
      if (t.dataset.bind === 'out' && t.value && nightsBetween(s.in, s.out) < 1) s.out = addDays(s.in, 1);
      if (!s.in) s.in = today; if (!s.out) s.out = addDays(s.in, 1);
      $$('[data-bind="in"]').forEach(i => i.value = s.in);
      $$('[data-bind="out"]').forEach(i => { i.value = s.out; i.min = addDays(s.in, 1); });
      rerenderAfterGuests();
      if (location.hash === '#stays') renderList();
      return;
    }
    if (t.dataset.filter) {
      const arr = S.filters[t.dataset.filter];
      if (t.checked) arr.push(t.value); else arr.splice(arr.indexOf(t.value), 1);
      if (t.dataset.filter === 'types') $$('[data-action="type-chip"]').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.value === 'all' ? !S.filters.types.length : S.filters.types.length === 1 && S.filters.types[0] === c.dataset.value)));
      renderList(); return;
    }
    if (t.id === 'sort') { S.filters.sort = t.value; renderList(); return; }
    if (t.id === 'b-rooms') { S.sel.rooms = Number(t.value); const p = prop(S.sel.pid); renderRooms(p); renderBook(p); return; }
    if (t.name === 'room') { S.sel.room = Number(t.value); renderBook(prop(S.sel.pid)); return; }
    if (t.name === 'tr') { readForm(); S.pending.transfer = Number(t.value); const o = trCost(S.pending); S.pending.time = o ? (o.o.times.length === 1 ? o.o.times[0] : null) : null; renderCheckout(); return; }
    if (t.name === 'pay') { S.pending.pay = t.value; renderSummary(); return; }
    if (t.id === 't-to') { S.tr.to = t.value; S.tr.pick = null; renderTransfers(); return; }
    if (t.id === 't-date') { S.tr.date = t.value && t.value >= today ? t.value : today; S.tr.pick = null; renderTransfers(); return; }
    if (t.id === 't-ad') { S.tr.adults = Number(t.value); S.tr.children = 0; renderTrResults(); return; }
    if (t.id === 't-inf') { S.tr.infants = Number(t.value); renderTrResults(); return; }
    if (t.dataset.slip && t.files[0]) {
      const b = S.bookings.find(x => x.ref === t.dataset.slip); b.slip = t.files[0].name; saveBookings(); renderTrips(); toast('Bank slip uploaded for ' + b.ref);
    }
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'f-max') {
      S.filters.max = Number(e.target.value);
      $('#f-max-v').textContent = 'Up to ' + money(S.filters.max);
      renderList();
    }
  });
  document.addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (f.id === 'search-form') { const pop = $('#guests-pop'); if (pop) pop.hidden = true; go('stays'); }
    else if (f.id === 'co') confirmBooking();
    else if (f.dataset.trbook != null) bookTransfer(Number(f.dataset.trbook), f);
    else if (f.id === 'si') {
      const name = $('#si-name').value.trim(), contact = $('#si-contact').value.trim(), codeF = $('#si-code-f'), err = $('#si-err');
      if (name.length < 2) { err.textContent = 'Enter your name.'; $('#si-name').focus(); return; }
      if (!/^\+?[\d\s-]{7,}$/.test(contact) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) { err.textContent = 'Enter a mobile number with country code or an email address.'; $('#si-contact').focus(); return; }
      if (codeF.hidden) { codeF.hidden = false; err.textContent = ''; $('#si-go').textContent = 'Sign in'; $('#si-code').focus(); return; }
      if ($('#si-code').value.trim() !== '123456') { err.textContent = 'That code doesn’t match. Use 123456 in the demo.'; return; }
      S.user = { name, contact }; store.set('user', S.user); syncHeader(); closeModal(); toast('Signed in as ' + name.split(' ')[0]);
    }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (layer.innerHTML) closeModal(); const p = $('#guests-pop'); if (p && !p.hidden) { p.hidden = true; $('#s-guests').focus(); } }
  });
  window.addEventListener('hashchange', () => render());

  syncHeader();
  render();
})();
