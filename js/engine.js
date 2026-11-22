// ===== Números que Contam — motor de animação em canvas (determinístico: render(t)) =====
const W = 1080, H = 1920, FPS = 30;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const E = {
  out: p => 1 - Math.pow(1 - p, 3),
  out5: p => 1 - Math.pow(1 - p, 5),
  inout: p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  in: p => p * p * p,
  back: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
const fmt = (v, d = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

// "1.855.894" -> 1855894 ; "17,2" -> 17.2 (1 casa) ; "3.5" -> 3.5
function parseNum(s) {
  let t = String(s ?? '').trim().replace(/\s/g, '');
  if (!t) return { v: 0, d: 0, ok: false };
  let d = 0;
  if (t.includes(',')) { t = t.replace(/\./g, '').replace(',', '.'); d = (t.split('.')[1] || '').length; }
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '');
  else if (t.includes('.')) d = (t.split('.')[1] || '').length;
  const v = parseFloat(t);
  return { v: isNaN(v) ? 0 : v, d, ok: !isNaN(v) };
}
// "Nome; valor" por linha
function parseList(txt) {
  return String(txt || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.lastIndexOf(';') >= 0 ? l.lastIndexOf(';') : l.lastIndexOf('\t');
    if (i < 0) return null;
    const n = parseNum(l.slice(i + 1));
    return n.ok ? { nome: l.slice(0, i).trim(), v: n.v, d: n.d } : null;
  }).filter(Boolean);
}

// ---------- tema ----------
const FUNDOS = [['Verde-floresta', '#0c1611'], ['Azul-petróleo', '#0b1d26'], ['Azul-noite', '#0d1530'], ['Grafite', '#141619'], ['Vinho', '#1f0e14'], ['Terra', '#1f150e'], ['Oliva', '#15190c']];
const T = { accent: '#E3B76F', accent2: '#6FBF8A', cream: '#F4ECDD', muted: '#9AA89F', bg: '#0c1611', symbol: 'circulos' };
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.substr(i, 2), 16)); }
function rgba(h, a) { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; }
function mixHex(a, b, p) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => clamp(Math.round(lerp(v, B[i], p)), 0, 255).toString(16).padStart(2, '0')).join(''); }
// clareia (p > 0) ou escurece (p < 0) uma cor
const shade = (h, p) => p >= 0 ? mixHex(h, '#ffffff', p) : mixHex(h, '#000000', -p);

// ---------- texto ----------
const FONT = { sans: '"DejaVu Sans", Verdana, sans-serif', serif: '"DejaVu Serif", Georgia, serif' };
const TXT = {
  big: { size: 84, bold: true, lh: 1.1, ls: -1, color: () => T.cream },
  md: { size: 56, bold: true, lh: 1.12, ls: -1, color: () => T.cream },
  sm: { size: 40, bold: false, lh: 1.3, ls: 0, color: () => '#d9d3c6' },
  xs: { size: 30, bold: false, lh: 1.35, ls: 0, color: () => '#B9C2BC' },
};
function setFont(ctx, size, bold, style, ls = 0) {
  ctx.font = style === 'it' ? `italic ${size}px ${FONT.serif}` : `${bold ? 'bold ' : ''}${size}px ${FONT.sans}`;
  ctx.letterSpacing = ls + 'px';
}
// marcação: *dourado*  _itálico_  ~verde~  | quebra de linha
function parseRich(text) {
  const MK = { '*': 'g', '_': 'it', '~': 's' };
  let mode = '';
  return String(text || '').split('|').map(line => {
    const out = [];
    line.split(/\s+/).forEach(wd => {
      if (!wd) return;
      if (MK[wd[0]] && wd.length > 1) { mode = MK[wd[0]]; wd = wd.slice(1); }
      const s = mode;
      const m = wd.match(/[*_~]([.,!?:;)”"]*)$/);
      if (m && mode) { wd = wd.slice(0, m.index) + m[1]; mode = ''; }
      if (wd) out.push({ t: wd, s });
    });
    return out;
  });
}
const _mc = document.createElement('canvas').getContext('2d');
// quebra e ajusta o tamanho até caber em w e maxLines
function layoutRich(text, o = {}) {
  const st = TXT[o.cls || 'big'];
  let size = o.size || st.size;
  const minS = o.minSize || Math.round(size * .55), maxL = o.maxLines || 99, w = o.w || 920;
  const src = parseRich(text);
  for (; ;) {
    const lines = []; let tooWide = false;
    for (const ln of src) {
      let cur = [], cw = 0;
      for (const wd of ln) {
        setFont(_mc, size, st.bold, wd.s, st.ls);
        const ww = _mc.measureText(wd.t).width;
        const sp = _mc.measureText(' ').width;
        if (ww > w) tooWide = true;
        if (cur.length && cw + sp + ww > w) { lines.push({ words: cur, width: cw }); cur = []; cw = 0; }
        wd.x = cur.length ? cw + sp : 0; wd.w = ww;
        cw = wd.x + ww; cur.push(Object.assign({}, wd));
      }
      if (cur.length || !ln.length) lines.push({ words: cur, width: cw });
    }
    if ((tooWide || lines.length > maxL) && size > minS) { size -= 2; continue; }
    const lh = size * st.lh;
    return { lines, size, lh, st, w, height: lines.length * lh, empty: !src.some(l => l.length) };
  }
}
function drawRich(ctx, L, x, y, lt, o = {}) {
  if (!L || L.empty) return;
  const st = o.stagger ?? .055, d = o.dur ?? .55, q = E.in(clamp(o.out || 0));
  const base = (L.lh - 1.17 * L.size) / 2 + .93 * L.size;
  let i = 0;
  L.lines.forEach((ln, li) => {
    const top = y + li * L.lh;
    const ox = o.align === 'center' ? x + (L.w - ln.width) / 2 : o.align === 'right' ? x + L.w - ln.width : x;
    ctx.save();
    ctx.beginPath(); ctx.rect(ox - 40, top - L.size * .08, ln.width + 80, L.lh + L.size * .2); ctx.clip();
    for (const wd of ln.words) {
      const p = E.out5(prog(lt, i * st, i * st + d)); i++;
      if (p <= 0) continue;
      setFont(ctx, L.size, L.st.bold, wd.s, L.st.ls);
      ctx.fillStyle = wd.s === 'g' || wd.s === 'it' ? T.accent : wd.s === 's' ? T.accent2 : (o.color || L.st.color());
      ctx.globalAlpha = (o.alpha ?? 1) * p * (1 - q);
      ctx.fillText(wd.t, ox + wd.x, top + base + ((1 - p) * 1.15 - q * 1.15) * L.lh);
    }
    ctx.restore();
  });
}
// texto simples numa linha (com quebra opcional)
function drawText(ctx, txt, x, y, o = {}) {
  setFont(ctx, o.size || 28, o.bold, o.style, o.ls || 0);
  ctx.fillStyle = o.color || T.cream; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  const lines = o.w ? wrapPlain(ctx, txt, o.w) : [txt];
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * (o.lh || (o.size || 28) * 1.3)));
  ctx.textAlign = 'left';
  return lines.length;
}
function wrapPlain(ctx, txt, w) {
  const out = [];
  String(txt || '').split('\n').forEach(par => {
    let cur = '';
    par.split(/\s+/).forEach(wd => { const t = cur ? cur + ' ' + wd : wd; if (cur && ctx.measureText(t).width > w) { out.push(cur); cur = wd; } else cur = t; });
    out.push(cur);
  });
  return out;
}
function fitSize(txt, size, maxW, bold = true, ls = 0) {
  for (; size > 20; size -= 2) { setFont(_mc, size, bold, '', ls * size / 200); if (_mc.measureText(txt).width <= maxW) break; }
  return size;
}

// ---------- contador ----------
// o: {a,b,to,dec,pre,suf,size,color,align}; y = topo do número
function drawCounter(ctx, x, y, lt, o) {
  const p = E.out5(prog(lt, o.a, o.b));
  const txt = (o.pre || '') + fmt(lerp(o.from || 0, o.to, p), o.dec || 0) + (o.suf || '');
  const punch = prog(lt, o.b - .05, o.b + .25), s = 1 + Math.sin(punch * Math.PI) * .06;
  const al = clamp(prog(lt, o.a - .1, o.a + .15));
  if (al <= 0) return;
  const size = o.size;
  setFont(ctx, size, true, '', -6 * size / 200);
  ctx.save();
  ctx.globalAlpha *= al;
  ctx.fillStyle = o.color || T.accent;
  ctx.textAlign = o.align || 'left';
  const cy = y + size / 2;
  ctx.translate(x, cy); ctx.scale(s, s); ctx.translate(-x, -cy);
  ctx.fillText(txt, x, y + .845 * size);
  ctx.restore();
}

// ---------- utilitários de desenho ----------
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); if (w <= 0 || h <= 0) return;
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function bar(ctx, x, y, w, h, p, color, track = true) {
  if (track) { ctx.fillStyle = 'rgba(255,255,255,.07)'; rrect(ctx, x, y, w, h, h / 2); ctx.fill(); }
  const fw = w * clamp(p); if (fw > 1) { ctx.fillStyle = color; rrect(ctx, x, y, Math.max(fw, h), h, h / 2); ctx.fill(); }
}
function pill(ctx, txt, x, y, p, o = {}) { // x,y = canto sup. esquerdo
  if (p <= 0) return;
  const size = o.size || 28;
  setFont(ctx, size, true); const w = ctx.measureText(txt).width + (o.padX ?? 28) * 2, h = size + (o.padY ?? 14) * 2;
  const s = E.back(clamp(p));
  ctx.save(); ctx.globalAlpha *= clamp(p * 2);
  const ox = o.origin === 'center' ? x + w / 2 : x;
  ctx.translate(ox, y + h / 2); ctx.scale(s, s); ctx.translate(-ox, -(y + h / 2));
  ctx.fillStyle = o.bg || T.accent; rrect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = o.color || T.bg; ctx.fillText(txt, x + (o.padX ?? 28), y + (o.padY ?? 14) + size * .86);
  ctx.restore();
  return w;
}
function fadeAlpha(lt, a, b) { return E.out5(prog(lt, a, b)); }

// ---------- camadas (offscreen) ----------
let SC = 1; const LAYERS = {};
function layer(name, lw = W, lh = H) {
  const cw = Math.round(lw * SC), chh = Math.round(lh * SC);
  let L = LAYERS[name];
  if (!L || L.c.width !== cw || L.c.height !== chh) { const c = document.createElement('canvas'); c.width = cw; c.height = chh; L = LAYERS[name] = { c, x: c.getContext('2d') }; }
  L.x.setTransform(1, 0, 0, 1, 0, 0); L.x.clearRect(0, 0, cw, chh); L.x.setTransform(SC, 0, 0, SC, 0, 0);
  L.x.globalAlpha = 1; L.x.filter = 'none'; L.x.globalCompositeOperation = 'source-over';
  return L;
}

// ---------- foto com movimento lento e fade no topo ----------
function drawPhoto(ctx, img, box, lt, dur, o = {}) {
  const L = layer('photo'), x = L.x;
  const p = lt / dur;
  const s = lerp(o.s0 ?? 1.18, o.s1 ?? 1.04, E.out(p));
  const tx = lerp(o.x0 ?? 0, o.x1 ?? 0, E.inout(p)), ty = lerp(o.y0 ?? 0, o.y1 ?? 0, E.inout(p));
  x.save(); x.beginPath(); x.rect(box.x, box.y, box.w, box.h); x.clip();
  if (img && img.naturalWidth) {
    const k = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight) * s;
    const iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    x.drawImage(img, box.x + (box.w - iw) / 2 + tx, box.y + (box.h - ih) / 2 + ty, iw, ih);
  } else { x.fillStyle = shade(T.bg, .07); x.fillRect(box.x, box.y, box.w, box.h); }
  x.restore();
  // fade topo
  if ((o.fadeTop ?? .3) > 0) {
  x.globalCompositeOperation = 'destination-in';
  const g = x.createLinearGradient(0, box.y, 0, box.y + box.h * (o.fadeTop ?? .3));
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  }
  const g2 = x.createLinearGradient(0, box.y + box.h * .55, 0, box.y + box.h);
  g2.addColorStop(0, rgba(T.bg, 0)); g2.addColorStop(1, rgba(T.bg, .92));
  x.fillStyle = g2; x.fillRect(box.x, box.y + box.h * .55, box.w, box.h * .45);
  ctx.drawImage(L.c, 0, 0, W, H);
}

// ---------- fundo ----------
const SYMBOLS = {
  nenhum: null,
  circulos: x => { for (let r = 40; r <= 130; r += 30) { x.beginPath(); x.arc(100, 150, r, 0, Math.PI * 2); x.stroke(); } },
  grao: x => { x.beginPath(); x.ellipse(100, 150, 88, 135, 0, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(100, 18); x.bezierCurveTo(60, 90, 140, 200, 100, 284); x.stroke(); },
  folha: x => { x.beginPath(); x.moveTo(100, 10); x.bezierCurveTo(200, 80, 190, 230, 100, 290); x.bezierCurveTo(10, 230, 0, 80, 100, 10); x.stroke(); x.beginPath(); x.moveTo(100, 30); x.lineTo(100, 280); for (let i = 0; i < 5; i++) { const yy = 80 + i * 40; x.moveTo(100, yy + 20); x.lineTo(150 - i * 4, yy - 10); x.moveTo(100, yy + 20); x.lineTo(50 + i * 4, yy - 10); } x.stroke(); },
  gota: x => { x.beginPath(); x.moveTo(100, 10); x.bezierCurveTo(130, 80, 190, 140, 190, 200); x.arc(100, 200, 90, 0, Math.PI); x.bezierCurveTo(10, 140, 70, 80, 100, 10); x.stroke(); },
  espiga: x => { x.beginPath(); x.moveTo(100, 290); x.lineTo(100, 20); x.stroke(); for (let i = 0; i < 6; i++) { const yy = 40 + i * 38; x.beginPath(); x.ellipse(76, yy + 14, 18, 30, -.5, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.ellipse(124, yy + 14, 18, 30, .5, 0, Math.PI * 2); x.stroke(); } },
};
function drawBg(ctx, t) {
  ctx.fillStyle = T.bg; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(.85 * W, .1 * H); ctx.scale(1, 1344 / 1296);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1296 * 1.05);
  g.addColorStop(0, shade(T.bg, .07)); g.addColorStop(.45, shade(T.bg, .03)); g.addColorStop(1, T.bg);
  ctx.fillStyle = g; ctx.fillRect(-2 * W, -2 * H, 4 * W, 4 * H); ctx.restore();
  ctx.strokeStyle = rgba(T.accent, .075); ctx.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    ctx.beginPath();
    const y0 = -200 + i * 150;
    for (let k = 0; k <= 24; k++) {
      const x = -60 + k * 50, y = y0 + Math.sin(k * .38 + i * .9 + t * .35) * 42 + Math.sin(k * .17 - i * .5 + t * .2) * 60 + k * 12;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  const sym = SYMBOLS[T.symbol];
  if (sym) {
    ctx.save();
    ctx.translate(1000 + Math.sin(t * .2) * 20, 910 + Math.cos(t * .15) * 30); ctx.rotate((18 + t * .6) * Math.PI / 180);
    ctx.scale(2.6, 2.6); ctx.translate(-100, -150);
    ctx.strokeStyle = rgba(T.accent, .06); ctx.lineWidth = 5; ctx.lineCap = 'round';
    sym(ctx); ctx.restore();
  }
}

// ---------- moldura: cabeçalho, rótulo, fonte, barra de progresso ----------
function drawChrome(ctx, t, total, P, label, source, srcAlpha, alpha) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha;
  setFont(ctx, 29, false, '', 1.5); ctx.fillStyle = T.accent;
  ctx.fillText((P.serie || 'NÚMEROS QUE CONTAM').toUpperCase(), 80, 108 + 29);
  const hl = E.out(prog(t, 0, .8)) * 920;
  const g = ctx.createLinearGradient(80, 0, 1000, 0); g.addColorStop(0, rgba(T.accent, .55)); g.addColorStop(1, rgba(T.accent, .08));
  ctx.fillStyle = g; ctx.fillRect(80, 158, hl, 2);
  if (label) { setFont(ctx, 22, false, '', 3); ctx.fillStyle = T.muted; ctx.fillText(label.toUpperCase(), 80, 184 + 22); }
  if (source && srcAlpha > 0) {
    ctx.globalAlpha = alpha * srcAlpha; setFont(ctx, 21, false); ctx.fillStyle = '#87958c';
    const lines = wrapPlain(ctx, source, 920).slice(0, 2);
    lines.forEach((l, i) => ctx.fillText(l, 80, 1736 + 21 + i * 28 - (lines.length - 1) * 28));
    ctx.globalAlpha = alpha;
  }
  ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(80, 1808, 920, 3);
  ctx.fillStyle = T.accent; ctx.fillRect(80, 1808, 920 * clamp(t / total), 3);
  ctx.restore();
}

// ---------- transições de cena ----------
function sceneXform(s, lt) {
  const dur = s.b - s.a;
  const pi = s.enter === 'cut' ? 1 : E.out5(prog(lt, 0, s.ein));
  const po = s.exit === 'none' ? 0 : E.in(prog(lt, dur - s.eout, dur));
  let tx = 0, ty = 0, sc = s.vinheta ? 1 : 1 + lt * .006, op = 1, blur = 0;
  switch (s.enter) {
    case 'up': ty += (1 - pi) * 220; op *= pi; blur += (1 - pi) * 14; break;
    case 'zoom': sc *= 1 + (1 - pi) * .35; op *= pi; blur += (1 - pi) * 18; break;
    case 'left': tx += (1 - pi) * 1080; blur += (1 - pi) * 10; break;
    case 'fade': op *= pi; break;
  }
  switch (s.exit) {
    case 'up': ty -= po * 260; op *= 1 - po; blur += po * 16; break;
    case 'zoom': sc *= 1 + po * .5; op *= 1 - po; blur += po * 20; break;
    case 'shrink': sc *= 1 - po * .2; op *= 1 - po; blur += po * 10; break;
    case 'left': tx -= po * 1080; blur += po * 10; break;
    case 'fade': op *= 1 - po; break;
  }
  return { tx, ty, sc, op, blur };
}

// ---------- render de um quadro ----------
// TL = {total, bodyEnd, scenes:[{a,b,enter,exit,ein,eout,label,src,draw(ctx,lt,dur)}], endcard:{a, draw(ctx,lt)} | null, P}
function render(ctx, t, TL, scale = 1) {
  SC = scale;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.globalAlpha = 1; ctx.filter = 'none';
  drawBg(ctx, t);
  let label = TL.P.tema || '', source = '', sa = 0;
  TL.scenes.forEach((s, idx) => {
    if (t < s.a || t >= s.b) return;
    const lt = t - s.a, dur = s.b - s.a;
    const L = layer('scene' + (idx % 2));
    s.draw(L.x, lt, dur);
    const X = sceneXform(s, lt);
    if (X.op <= .002) return;
    ctx.save();
    ctx.globalAlpha = X.op;
    if (X.blur > .6) ctx.filter = `blur(${(X.blur * scale).toFixed(1)}px)`;
    ctx.translate(540 + X.tx, 960 + X.ty); ctx.scale(X.sc, X.sc); ctx.translate(-540, -960);
    ctx.drawImage(L.c, 0, 0, W, H);
    ctx.restore();
    if (s.label) label = s.label;
    if (s.src) { source = s.src; sa = Math.max(sa, Math.min(prog(lt, .2, .6), 1 - prog(lt, dur - .3, dur))); }
  });
  let ca = 1;
  if (TL.vinEnd) ca = prog(t, TL.vinEnd - .25, TL.vinEnd);   // moldura entra depois da vinheta
  if (TL.endcard && t >= TL.endcard.a) ca = 1 - prog(t, TL.endcard.a, TL.endcard.a + .3);
  drawChrome(ctx, t, TL.bodyEnd, TL.P, label, source, sa, ca);
  if (TL.endcard && t >= TL.endcard.a) {
    const L = layer('end');
    TL.endcard.draw(L.x, t - TL.endcard.a);
    ctx.save(); ctx.globalAlpha = prog(t, TL.endcard.a, TL.endcard.a + .3); ctx.drawImage(L.c, 0, 0, W, H); ctx.restore();
  }
}
