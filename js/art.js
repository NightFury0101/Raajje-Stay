/* Island postcards: seeded SVG illustrations so every listing has its own picture
   without loading external photos. kind: guesthouse | resort | hotel | apartment */
window.RS_ART = (function () {
  function rng(seed) {
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  const skies = [
    ['#8fd3ee', '#e6f6fb', '#fff7d6'],  // midday
    ['#f5c48a', '#fde6c8', '#fff1c2'],  // golden hour
    ['#ee9c7e', '#c9a7c7', '#ffd9a8'],  // dusk
    ['#a9dcef', '#f2f9fb', '#fffbe8']   // haze
  ];

  function palm(x, y, h, lean, r) {
    const tx = x + lean, ty = y - h;
    let out = `<path d="M${x} ${y} Q${x + lean * 0.2} ${y - h * 0.6} ${tx} ${ty}" stroke="#6b4f2a" stroke-width="${2 + h / 40}" fill="none" stroke-linecap="round"/>`;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.4;
      const len = h * (0.35 + r() * 0.15);
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.25;
      const cx = tx + Math.cos(a) * len * 0.5, cy = ty - len * 0.25;
      out += `<path d="M${tx} ${ty} Q${cx} ${cy} ${ex} ${ey}" stroke="${i % 2 ? '#2e7d4f' : '#3d9a5f'}" stroke-width="${2.2 + h / 50}" fill="none" stroke-linecap="round"/>`;
    }
    return out;
  }

  function dhoni(x, y, s) {
    return `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-30 0 Q0 10 30 0 L36 -10 Q0 -4 -26 -6 Z" fill="#f4efe4" stroke="#6b4f2a" stroke-width="1.2"/>
      <path d="M-30 0 Q0 10 30 0" stroke="#2a6f8f" stroke-width="2" fill="none"/>
      <rect x="-12" y="-16" width="20" height="9" fill="#e9dcc2"/>
      <path d="M8 -6 L8 -40" stroke="#6b4f2a" stroke-width="1.5"/>
    </g>`;
  }

  function draw(seed, kind, opts) {
    opts = opts || {};
    const W = 640, H = opts.wide ? 300 : 420;
    const r = rng(seed * 7 + (opts.variant || 0) * 131);
    const sky = skies[Math.floor(r() * skies.length)];
    const hz = H * (0.34 + r() * 0.06);
    const id = 'p' + seed + '_' + (opts.variant || 0) + (opts.wide ? 'w' : '');
    const ix = W * (0.3 + r() * 0.4), iy = hz + (H - hz) * 0.42;
    const iw = W * (0.28 + r() * 0.14), ih = (H - hz) * 0.16;
    const sunX = W * (0.15 + r() * 0.7), sunY = hz * (0.35 + r() * 0.35);

    let s = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${opts.label || 'Illustration'}">
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
      <linearGradient id="${id}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d6f9a"/><stop offset="1" stop-color="#1a8ea6"/></linearGradient>
      <radialGradient id="${id}l" cx="0.5" cy="0.5" r="0.5"><stop offset="0.35" stop-color="#c3f1e6"/><stop offset="0.75" stop-color="#5fd0c8"/><stop offset="1" stop-color="#2aa9b8" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${hz}" fill="url(#${id}s)"/>
    <circle cx="${sunX}" cy="${sunY}" r="${18 + r() * 14}" fill="${sky[2]}" opacity="0.9"/>`;
    // clouds
    for (let i = 0; i < 3; i++) {
      const cx = r() * W, cy = hz * (0.2 + r() * 0.5), cw = 40 + r() * 60;
      s += `<ellipse cx="${cx}" cy="${cy}" rx="${cw}" ry="${cw * 0.18}" fill="#ffffff" opacity="${0.45 + r() * 0.3}"/>`;
    }
    s += `<rect y="${hz}" width="${W}" height="${H - hz}" fill="url(#${id}o)"/>`;
    // distant island
    if (r() > 0.4) {
      const dx = r() * W;
      s += `<ellipse cx="${dx}" cy="${hz + 2}" rx="${30 + r() * 30}" ry="4" fill="#2e7d4f" opacity="0.55"/>`;
    }
    // lagoon
    s += `<ellipse cx="${ix}" cy="${iy + ih * 0.4}" rx="${iw * 1.25}" ry="${ih * 3.1}" fill="url(#${id}l)"/>`;
    // shimmer lines
    for (let i = 0; i < 9; i++) {
      const y = hz + 8 + r() * (H - hz - 10), x = r() * W, l = 12 + r() * 40;
      s += `<path d="M${x} ${y} h${l}" stroke="#ffffff" stroke-opacity="${0.18 + r() * 0.2}" stroke-width="1.5" stroke-linecap="round"/>`;
    }

    const groundY = iy;
    const back = [];
    const front = [];

    if (kind === 'hotel' || kind === 'apartment') {
      // dense, colourful town on reclaimed land with a harbour wall
      s += `<rect x="${ix - iw}" y="${groundY - 4}" width="${iw * 2}" height="${ih * 1.2}" fill="#d9d2c3"/>`;
      s += `<rect x="${ix - iw}" y="${groundY + ih * 1.2 - 4}" width="${iw * 2}" height="4" fill="#9aa3a6"/>`;
      const cols = ['#f2efe9', '#f6d7a7', '#cfe6e4', '#f3c2b3', '#e7e1f2', '#ffffff', '#d7ead0'];
      let x = ix - iw + 4;
      while (x < ix + iw - 10) {
        const bw = 18 + r() * 26;
        const tall = kind === 'apartment' ? 70 : 40;
        const bh = 30 + r() * (kind === 'apartment' ? 110 : 90) + (Math.abs(x - ix) < iw * 0.4 ? tall : 0);
        const c = cols[Math.floor(r() * cols.length)];
        s += `<rect x="${x}" y="${groundY - bh}" width="${bw}" height="${bh}" fill="${c}" stroke="#00000014"/>`;
        for (let wy = groundY - bh + 6; wy < groundY - 8; wy += 9) {
          for (let wx = x + 4; wx < x + bw - 5; wx += 7) {
            if (r() > 0.25) s += `<rect x="${wx}" y="${wy}" width="3.5" height="4" fill="#3b5a66" opacity="0.55"/>`;
          }
        }
        x += bw + 1.5;
      }
      for (let i = 0; i < 2; i++) back.push(palm(ix - iw + r() * iw * 2, groundY + 2, 34 + r() * 14, -10 + r() * 20, r));
      front.push(dhoni(ix + iw * (0.4 + r() * 0.7), groundY + ih * 2.2, 0.8));
    } else {
      // natural island: sand + vegetation
      s += `<ellipse cx="${ix}" cy="${groundY}" rx="${iw}" ry="${ih}" fill="#f3e6c8"/>`;
      s += `<ellipse cx="${ix}" cy="${groundY - ih * 0.5}" rx="${iw * 0.82}" ry="${ih * 0.9}" fill="#2f7d4a"/>`;
      for (let i = 0; i < 9; i++) {
        const bx = ix - iw * 0.75 + r() * iw * 1.5;
        s += `<circle cx="${bx}" cy="${groundY - ih * (0.9 + r() * 0.9)}" r="${10 + r() * 16}" fill="${i % 2 ? '#357f4c' : '#2a6e42'}"/>`;
      }
      const palms = 4 + Math.floor(r() * 4);
      for (let i = 0; i < palms; i++) {
        const px = ix - iw * 0.85 + r() * iw * 1.7;
        back.push(palm(px, groundY - ih * 0.2, 46 + r() * 34, -18 + r() * 36, r));
      }
      if (kind === 'guesthouse') {
        const n = 2 + Math.floor(r() * 2);
        for (let i = 0; i < n; i++) {
          const hx = ix - iw * 0.5 + i * (iw * 0.4) + r() * 10, hw = 34 + r() * 16, hh = 26 + r() * 22;
          const wall = ['#ffffff', '#f6e7cf', '#e2f1ee'][i % 3];
          front.push(`<rect x="${hx}" y="${groundY - ih * 0.2 - hh}" width="${hw}" height="${hh}" fill="${wall}" stroke="#00000018"/>
            <rect x="${hx - 2}" y="${groundY - ih * 0.2 - hh - 3}" width="${hw + 4}" height="4" fill="#b9a48a"/>
            <rect x="${hx + 6}" y="${groundY - ih * 0.2 - hh + 8}" width="7" height="8" fill="#2a6f8f" opacity="0.7"/>
            <rect x="${hx + hw - 14}" y="${groundY - ih * 0.2 - hh + 8}" width="7" height="8" fill="#2a6f8f" opacity="0.7"/>`);
        }
        front.push(dhoni(ix + iw * 1.05, groundY + ih * 1.9, 0.9));
      }
      if (kind === 'resort') {
        // jetty and overwater villas
        const jx = ix + iw * 0.2, jy = groundY + ih * 0.6;
        const len = iw * 1.1;
        const dir = r() > 0.5 ? 1 : -1;
        front.push(`<path d="M${jx} ${jy} L${jx + dir * len} ${jy + ih * 2.4}" stroke="#8a6a46" stroke-width="3"/>`);
        const v = 5;
        for (let i = 1; i <= v; i++) {
          const t = i / (v + 0.4);
          const vx = jx + dir * len * t, vy = jy + ih * 2.4 * t;
          const off = (i % 2 ? 1 : -1) * 18;
          front.push(`<g transform="translate(${vx + off} ${vy})">
            <path d="M-4 0 V10 M12 0 V10" stroke="#6b4f2a" stroke-width="1.5"/>
            <rect x="-8" y="-12" width="24" height="12" fill="#efe2c8"/>
            <path d="M-12 -12 L4 -24 L20 -12 Z" fill="#8a5a3c"/>
            <path d="M-8 ${10} h24" stroke="#ffffff" stroke-opacity="0.35"/>
          </g>`);
        }
      }
    }
    s += back.join('') + front.join('') + '</svg>';
    return s;
  }
  return { draw };
})();
