// ===== Números que Contam — cartela final: "mudança de escala" =====
// Começa num talhão (linhas de plantio, curvas de nível), afasta-se pela paisagem (rio, estrada, outras lavouras)
// até o contorno do Brasil. Ponto focal: Campinas (SP), sede da Embrapa Territorial.
// Unidades do mapa: viewBox 960x1000 (1 unidade ≈ 4,4 km).
const ESC = {
  focal: [662.3, 714.6], coords: '22°54′ S · 47°04′ O',
  S: .8, ox: 156, oy: 210,                 // posição final do mapa na tela (z = 1)
  z0: 1500, top: 170, bottom: 1050,        // zoom inicial; faixa vertical da arte
  cream: '#F4ECDD', river: '#8DB7D6', veg: '#7FB58F', footer: '#F4ECDD', ink: '#13241b', ink2: '#3F6B50'
};
const KM_PER_UNIT = 4.4;
// geometria da arte em cada formato
const GEO_V = { S: .8, ox: 156, oy: 210, top: 170, bottom: 1050, cx: 540, cy: 610, w: 1080, h: 1920, sb: [80, 1084, 1000] };
const GEO_H = { S: .72, ox: 150, oy: 92, top: 30, bottom: 870, cx: 500, cy: 450, w: 1920, h: 1080, sb: [70, 846, 960], fadeR: [860, 1060] };

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const r = (i, j) => hash(i * 157 + j * 311 + seed * 1013), s = t => t * t * (3 - 2 * t);
  return lerp(lerp(r(xi, yi), r(xi + 1, yi), s(xf)), lerp(r(xi, yi + 1), r(xi + 1, yi + 1), s(xf)), s(yf));
}
const smooth = (v, a, b) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)); return Math.hypot(px - ax - t * dx, py - ay - t * dy); }

// ---------- geração da paisagem (uma vez) ----------
let _land = null;
function landscape() {
  if (_land) return _land;
  const [fx, fy] = ESC.focal;
  const mkRiver = (x0, y0, x1, y1, amp, wav, seed, n = 260) => {
    const pts = [], nx0 = -(y1 - y0), ny0 = x1 - x0, L = Math.hypot(nx0, ny0);
    for (let i = 0; i <= n; i++) {
      const t = i / n, off = Math.sin(t * wav) * amp + (vnoise(t * 9, seed, seed) - .5) * amp * 1.6;
      pts.push([lerp(x0, x1, t) + nx0 / L * off, lerp(y0, y1, t) + ny0 / L * off]);
    }
    return pts;
  };
  const rivers = [
    { pts: mkRiver(fx - 4, fy - 1.0, fx + 4, fy + 1.4, .22, 26, 3), w: .008, main: true },
    { pts: mkRiver(fx + .6, fy + .35, fx + 2.2, fy + 4.5, .25, 14, 7, 160), w: .005 },
    { pts: mkRiver(fx - 14, fy - 9, fx - 3.6, fy - .9, 1.2, 9, 11), w: .012 },
    { pts: mkRiver(fx + 3.9, fy + 1.4, fx + 18, fy + 2.5, 1.1, 8, 13), w: .014 },
    { pts: mkRiver(fx + 6, fy - 12, fx + 9, fy + 1.9, 1.4, 7, 17), w: .01 },
  ];
  const road = { pts: mkRiver(fx - 3.5, fy + 2.6, fx + 3.5, fy - 2.2, .15, 3, 21, 80) };
  const rp = rivers[0].pts;
  const nearRiver = (x, y) => { let d = 1e9; for (let i = 0; i < rp.length - 1; i++) d = Math.min(d, distSeg(x, y, rp[i][0], rp[i][1], rp[i + 1][0], rp[i + 1][1])); return d; };
  // malha de talhões (vértices compartilhados, levemente irregulares)
  const cell = .12, N = 14, th = .42, c = Math.cos(th), s = Math.sin(th);
  const V = (i, j) => {
    const jx = (hash(i * 91 + j * 37 + 5) - .5) * .4, jy = (hash(i * 53 + j * 71 + 9) - .5) * .4;
    const u = (i + jx) * cell, v = (j + jy) * cell;
    return [fx + .1 + u * c - v * s, fy - .25 + u * s + v * c];
  };
  const parcels = [];
  for (let i = -N; i < N; i++) for (let j = -N; j < N; j++) {
    const q = [V(i, j), V(i + 1, j), V(i + 1, j + 1), V(i, j + 1)];
    const cx = (q[0][0] + q[2][0]) / 2, cy = (q[0][1] + q[2][1]) / 2;
    const r = Math.hypot(cx - fx, cy - fy), lim = 1.45 * (.75 + .5 * vnoise(cx * 3, cy * 3, 2));
    if (r > lim) continue;
    const h = hash(i * 13 + j * 29 + 1), dr = nearRiver(cx, cy);
    const type = dr < .055 ? 'veg' : h < .68 ? 'rows' : h < .94 ? 'pasto' : 'veg';
    const ang = th + (hash(i * 7 + j * 3) < .5 ? 0 : Math.PI / 2) + (hash(i + j * 17) - .5) * .25;
    parcels.push({ q, cx, cy, type, ang, seed: i * 1000 + j });
  }
  // curvas de nível em volta de um morro
  const hill = [fx + .55, fy - .45], contours = [];
  for (let k = 1; k <= 18; k++) {
    const rr = k * .085, pts = [];
    for (let a = 0; a <= 72; a++) {
      const t = a / 72 * Math.PI * 2, dist = rr * (1 + .28 * (vnoise(Math.cos(t) * 2 + k * .05, Math.sin(t) * 2, 4) - .5) * 2);
      pts.push([hill[0] + Math.cos(t) * dist * 1.25, hill[1] + Math.sin(t) * dist]);
    }
    contours.push(pts);
  }
  // outras lavouras espalhadas (textura em escala regional)
  const farms = [];
  for (let k = 0; k < 520; k++) {
    const a = hash(k * 3.1) * Math.PI * 2, r = 2.2 + Math.pow(hash(k * 7.7), .8) * 48;
    const cx = fx + Math.cos(a) * r, cy = fy + Math.sin(a) * r * .8;
    const rot = hash(k * 1.3) * Math.PI, n = 2 + Math.floor(hash(k * 5.3) * 3), sz = .1 + hash(k * 2.9) * .12;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (hash(k * 100 + i * 10 + j) < .2) continue;
      const u = (i - n / 2 + .5) * sz, v = (j - n / 2 + .5) * sz, cr = Math.cos(rot), sr = Math.sin(rot);
      farms.push({ x: cx + u * cr - v * sr, y: cy + u * sr + v * cr, s: sz * .92, rot, veg: hash(k * 31 + i + j) < .18 });
    }
  }
  return (_land = { rivers, road, parcels, contours, farms });
}
function polyPath(x, pts, close) { x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); if (close) x.closePath(); }

// ---------- arte animada ----------
function drawEscala(x, lt, G = GEO_V) {
  brPaths();
  const Ld = landscape(), [fx, fy] = ESC.focal;
  const p = E.inout(prog(lt, .15, 3.15));
  const lz0 = Math.log(ESC.z0), lz = lz0 * (1 - p), z = Math.exp(lz), u = 1 - lz / lz0;
  const k = G.S * z;                                      // px de tela por unidade do mapa
  const Fend = [G.ox + fx * G.S, G.oy + fy * G.S], Fst = [G.cx, (G.top + G.bottom) / 2];
  const ue = Math.pow(u, 2.2);
  const F = [lerp(Fst[0], Fend[0], ue), lerp(Fst[1], Fend[1], ue)];
  const rot = lerp(.38, 0, E.inout(u));
  const px = 1 / k;
  // centro da tela em coordenadas do mapa (para descartar o que está fora)
  const ddx = (G.cx - F[0]) / k, ddy = (G.cy - F[1]) / k, cr = Math.cos(-rot), sr = Math.sin(-rot);
  const vcx = fx + ddx * cr - ddy * sr, vcy = fy + ddx * sr + ddy * cr, VR = Math.max(G.w, G.h) * .42 / k;
  const inView = (cx, cy, rr = 0) => Math.hypot(cx - vcx, cy - vcy) < VR + rr;
  const M = layer('escala' + G.w, G.w, G.h), m = M.x;
  m.save();
  m.translate(F[0], F[1]); m.rotate(rot); m.scale(k, k); m.translate(-fx, -fy);
  m.lineJoin = m.lineCap = 'round';
  // estados e contorno do Brasil
  const aStates = smooth(-lz, -Math.log(60), -Math.log(10)), aBr = smooth(-lz, -Math.log(30), -Math.log(4));
  if (aStates > 0) { m.globalAlpha = aStates * .32; m.strokeStyle = ESC.cream; m.lineWidth = 1.1 * px; for (const uf in BR_PATHS) m.stroke(BR_PATHS[uf]); }
  if (aBr > 0) { m.globalAlpha = aBr * .07; m.fillStyle = ESC.cream; m.fill(BR_ALL); m.globalAlpha = aBr * .9; m.strokeStyle = ESC.cream; m.lineWidth = 2 * px; m.stroke(BR_ALL); }
  // outras lavouras
  const aFarm = smooth(z, 2.5, 9) * (1 - smooth(z, 250, 700));
  if (aFarm > 0) {
    for (const f of Ld.farms) {
      if (!inView(f.x, f.y, .5)) continue;
      m.save(); m.translate(f.x, f.y); m.rotate(f.rot);
      m.globalAlpha = aFarm * (f.veg ? .55 : .42); m.fillStyle = f.veg ? ESC.veg : T.accent; m.fillRect(-f.s / 2, -f.s / 2, f.s, f.s);
      if (z > 60) { m.globalAlpha = aFarm * .35 * smooth(z, 60, 150); m.strokeStyle = ESC.cream; m.lineWidth = px; m.strokeRect(-f.s / 2, -f.s / 2, f.s, f.s); }
      m.restore();
    }
  }
  // rios e estrada
  const aRiv = smooth(z, 2.5, 8);
  if (aRiv > 0) {
    Ld.rivers.forEach((r, i) => {
      m.globalAlpha = aRiv * (r.main ? .95 : .75); m.strokeStyle = ESC.river;
      m.lineWidth = clamp(r.w * k, i ? 1.3 : 1.8, 12) * px; polyPath(m, r.pts); m.stroke();
    });
    m.globalAlpha = aRiv * .7 * smooth(z, 12, 40); m.strokeStyle = ESC.cream; m.lineWidth = clamp(.006 * k, 1.2, 7) * px; polyPath(m, Ld.road.pts); m.stroke();
    if (z > 400) { m.globalAlpha = aRiv * .9 * smooth(z, 400, 900); m.strokeStyle = '#0c1611'; m.setLineDash([10 * px, 10 * px]); m.lineWidth = 1.2 * px; m.stroke(); m.setLineDash([]); }
  }
  // talhões
  const aParc = smooth(z, 6, 30), aEdge = smooth(z, 50, 160), aRows = smooth(z, 220, 600);
  if (aParc > 0) {
    for (const P of Ld.parcels) {
      if (!inView(P.cx, P.cy, .2)) continue;
      polyPath(m, P.q, true);
      m.globalAlpha = aParc * (P.type === 'veg' ? .38 : P.type === 'rows' ? .14 : .06);
      m.fillStyle = P.type === 'veg' ? ESC.veg : P.type === 'rows' ? T.accent : ESC.cream; m.fill();
      if (aEdge > 0) { m.globalAlpha = aEdge * .45; m.strokeStyle = ESC.cream; m.lineWidth = 1 * px; m.stroke(); }
      if (aRows > 0 && P.type === 'rows') {
        const sp = .006, step = Math.max(1, Math.ceil(3.2 / (sp * k)));
        const dx = Math.cos(P.ang), dy = Math.sin(P.ang), nx = -dy, ny = dx;
        const proj = P.q.map(v => (v[0] - P.cx) * nx + (v[1] - P.cy) * ny);
        const a0 = Math.ceil(Math.min(...proj) / sp), a1 = Math.floor(Math.max(...proj) / sp), L = .2;
        m.save(); m.clip();
        m.globalAlpha = aRows * .38; m.strokeStyle = ESC.cream; m.lineWidth = 1 * px; m.beginPath();
        for (let a = a0; a <= a1; a += step) { const ox = P.cx + nx * a * sp, oy = P.cy + ny * a * sp; m.moveTo(ox - dx * L, oy - dy * L); m.lineTo(ox + dx * L, oy + dy * L); }
        m.stroke(); m.restore();
      } else if (aRows > 0 && P.type === 'veg') {
        m.save(); m.clip(); m.globalAlpha = aRows * .6; m.fillStyle = ESC.veg;
        for (let i = 0; i < 40; i++) { const hx = P.cx + (hash(P.seed * 3 + i) - .5) * .14, hy = P.cy + (hash(P.seed * 7 + i * 13) - .5) * .14; m.beginPath(); m.arc(hx, hy, .003 + hash(P.seed + i * 5) * .004, 0, Math.PI * 2); m.fill(); }
        m.restore();
      }
    }
  }
  // curvas de nível
  const aCont = smooth(z, 70, 220);
  if (aCont > 0) {
    m.strokeStyle = T.accent; m.lineWidth = 1.2 * px;
    Ld.contours.forEach((c, i) => { m.globalAlpha = aCont * (i % 5 === 4 ? .55 : .28); polyPath(m, c, true); m.stroke(); });
  }
  m.restore();
  // ponto focal (Campinas) quando o Brasil aparece
  const aPin = smooth(-lz, -Math.log(12), -Math.log(2));
  if (aPin > 0) {
    const pu = (lt * .8) % 1;
    m.globalAlpha = aPin; m.fillStyle = T.accent; m.beginPath(); m.arc(F[0], F[1], 7, 0, Math.PI * 2); m.fill();
    m.strokeStyle = T.accent; m.lineWidth = 2; m.globalAlpha = aPin * (1 - pu); m.beginPath(); m.arc(F[0], F[1], 10 + pu * 34, 0, Math.PI * 2); m.stroke();
    m.globalAlpha = aPin * .8; m.lineWidth = 1.5;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { m.beginPath(); m.moveTo(F[0] + a * 16, F[1] + b * 16); m.lineTo(F[0] + a * 28, F[1] + b * 28); m.stroke(); });
  }
  m.globalAlpha = 1;
  // máscara suave nas bordas da faixa da arte
  m.globalCompositeOperation = 'destination-in';
  const g = m.createLinearGradient(0, G.top, 0, G.bottom);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.08, '#000'); g.addColorStop(.9, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
  m.fillStyle = g; m.fillRect(0, 0, G.w, G.h);
  if (G.fadeR) { const g2 = m.createLinearGradient(G.fadeR[0], 0, G.fadeR[1], 0); g2.addColorStop(0, '#000'); g2.addColorStop(1, 'rgba(0,0,0,0)'); m.fillStyle = g2; m.fillRect(0, 0, G.w, G.h); }
  m.globalCompositeOperation = 'source-over';
  x.drawImage(M.c, 0, 0, G.w, G.h);
  return { z, k };
}

// barra de escala que acompanha o zoom
function scaleBar(x, k, a, G = GEO_V) {
  const [bx, by, br] = G.sb;
  const kmPx = KM_PER_UNIT / k, target = 170 * kmPx;
  const nice = [.05, .1, .2, .5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
  let v = nice[0]; for (const n of nice) if (n <= target) v = n;
  const w = v / kmPx, lbl = v < 1 ? `${Math.round(v * 1000)} m` : `${fmt(v)} km`;
  x.save(); x.globalAlpha = a;
  x.fillStyle = ESC.cream; x.fillRect(bx, by, w, 3); x.fillRect(bx, by - 8, 2, 18); x.fillRect(bx + w - 2, by - 8, 2, 18);
  drawText(x, lbl, bx + w + 14, by + 10, { size: 22, color: ESC.cream });
  drawText(x, ESC.coords, br, by + 10, { size: 22, color: '#9AA89F', align: 'right' });
  x.restore();
}

const isBare = K => !(K.chamada || '').trim() && !(K.titulo || '').trim() && !(K.subtitulo || '').trim();
// marca grande, usada quando a cartela não tem chamada nem título
function bigMark(x, lt, K, cx, y, size) {
  const serie = (K.serie ?? 'NÚMEROS QUE CONTAM').toUpperCase(); if (!serie) return;
  const a = fadeAlpha(lt, 2.6, 3.2);
  x.save(); x.globalAlpha = a;
  drawText(x, serie, cx, y + (1 - a) * 24, { size: fitSize(serie, size, 860, true, 0), bold: true, color: T.accent, align: 'center', ls: size * .12 });
  x.fillStyle = rgba(T.accent, .6); const lw = 120 * E.out(prog(lt, 2.8, 3.5)); x.fillRect(cx - lw / 2, y + size * .7, lw, 3);
  x.restore();
}
function seriesMark(x, lt, K, cx, y) {
  if (isBare(K)) return;
  const serie = (K.serie ?? 'NÚMEROS QUE CONTAM').toUpperCase(); if (!serie) return;
  setFont(x, 30, true, '', 5); const sw = x.measureText(serie).width;
  drawText(x, serie, cx, y, { size: 30, bold: true, color: T.accent, align: 'center', ls: 5 });
  x.fillStyle = rgba(T.accent, .5); const lw = 90 * E.out(prog(lt, .2, 1));
  x.fillRect(cx - sw / 2 - 30 - lw, y - 10, lw, 2); x.fillRect(cx + sw / 2 + 30, y - 10, lw, 2);
}
// ---------- cartela completa ----------
function drawEndcard(x, lt, K) {
  K = K || {};
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#16291f'); g.addColorStop(1, '#0b1510');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // marca da série
  const ma = fadeAlpha(lt, .05, .6);
  x.save(); x.globalAlpha = ma;
  seriesMark(x, lt, K, 540, 120);
  x.restore();
  const { k } = drawEscala(x, lt);
  scaleBar(x, k, fadeAlpha(lt, .3, .8));
  // textos
  if (isBare(K)) bigMark(x, lt, K, 540, 1330, 50);
  const CH = layoutRich(K.chamada || '', { cls: 'big', size: 56, minSize: 40, maxLines: 2, w: 920 });
  drawRich(x, CH, 80, 1160, lt - 2.6, { align: 'center', color: ESC.cream, stagger: .05 });
  const ty = 1160 + (CH.empty ? 0 : CH.height + 40);
  const a = t0 => fadeAlpha(lt, t0, t0 + .5), dy = t0 => (1 - a(t0)) * 24;
  x.save();
  if (!isBare(K)) { x.globalAlpha = a(2.9); x.fillStyle = T.accent; x.fillRect(540 - 50 * a(2.9), ty, 100 * a(2.9), 3); }
  const tt = (K.titulo || '').toUpperCase();
  if (tt) { x.globalAlpha = a(3.0); drawText(x, tt, 540, ty + 70 + dy(3.0), { size: fitSize(tt, 40, 920), bold: true, color: ESC.cream, align: 'center', ls: 1 }); }
  if (K.subtitulo) { x.globalAlpha = a(3.15); drawText(x, K.subtitulo, 540, ty + 118 + dy(3.15), { size: fitSize(K.subtitulo, 28, 920, false), color: '#9AA89F', align: 'center' }); }
  x.restore();
  // faixa clara com logo, assinatura e link
  const fp = E.out5(prog(lt, 2.7, 3.4)), fy = lerp(1960, 1585, fp);
  x.fillStyle = ESC.footer; x.fillRect(0, fy, W, H - fy);
  const fa = t0 => fadeAlpha(lt, t0, t0 + .45);
  const logo = img(K.logo);
  x.save();
  if (logo && logo.naturalWidth) {
    const s = Math.min(380 / logo.naturalWidth, 105 / logo.naturalHeight), w = logo.naturalWidth * s, h = logo.naturalHeight * s;
    x.globalAlpha = fa(3.3); x.drawImage(logo, 540 - w / 2, fy + 95 - h / 2, w, h);
  }
  const as = (K.assinatura || '').toUpperCase();
  if (as) { x.globalAlpha = fa(3.2); drawText(x, as, 540, fy + 200, { size: fitSize(as, 24, 920, false), color: ESC.ink2, align: 'center', ls: 1.5 }); }
  if (K.link) { x.globalAlpha = fa(3.3); drawText(x, K.link, 540, fy + 262, { size: fitSize(K.link, 26, 940, true), bold: true, color: ESC.ink, align: 'center' }); }
  x.restore();
}

// ---------- cartela horizontal (16:9, 1920x1080) — usada na cartela avulsa ----------
function drawEndcardH(x, lt, K) {
  K = K || {};
  const G = GEO_H, g = x.createLinearGradient(0, 0, 0, G.h); g.addColorStop(0, '#16291f'); g.addColorStop(1, '#0b1510');
  x.fillStyle = g; x.fillRect(0, 0, G.w, G.h);
  const { k } = drawEscala(x, lt, G);
  scaleBar(x, k, fadeAlpha(lt, .3, .8), G);
  const cx = 1450, colW = 760;
  x.save(); x.globalAlpha = fadeAlpha(lt, .05, .6); seriesMark(x, lt, K, cx, 170); x.restore();
  if (isBare(K)) bigMark(x, lt, K, cx, 480, 46);
  const CH = layoutRich(K.chamada || '', { cls: 'big', size: 60, minSize: 40, maxLines: 3, w: colW });
  const tt = (K.titulo || '').toUpperCase();
  const blockH = (CH.empty ? 0 : CH.height + 50) + (tt || K.subtitulo ? 150 : 0);
  const y0 = Math.max(250, 520 - blockH / 2);
  drawRich(x, CH, cx - colW / 2, y0, lt - 2.6, { align: 'center', color: ESC.cream, stagger: .05 });
  const ty = y0 + (CH.empty ? 0 : CH.height + 40);
  const a = t0 => fadeAlpha(lt, t0, t0 + .5), dy = t0 => (1 - a(t0)) * 24;
  x.save();
  if (tt || K.subtitulo || !CH.empty) { x.globalAlpha = a(2.9); x.fillStyle = T.accent; x.fillRect(cx - 50 * a(2.9), ty, 100 * a(2.9), 3); }
  if (tt) { x.globalAlpha = a(3.0); drawText(x, tt, cx, ty + 70 + dy(3.0), { size: fitSize(tt, 40, colW), bold: true, color: ESC.cream, align: 'center', ls: 1 }); }
  if (K.subtitulo) { x.globalAlpha = a(3.15); drawText(x, K.subtitulo, cx, ty + 118 + dy(3.15), { size: fitSize(K.subtitulo, 28, colW, false), color: '#9AA89F', align: 'center' }); }
  x.restore();
  // faixa clara
  const fp = E.out5(prog(lt, 2.7, 3.4)), fy = lerp(1120, 900, fp);
  x.fillStyle = ESC.footer; x.fillRect(0, fy, G.w, G.h - fy);
  const fa = t0 => fadeAlpha(lt, t0, t0 + .45);
  const logo = img(K.logo);
  x.save();
  if (logo && logo.naturalWidth) {
    const s = Math.min(300 / logo.naturalWidth, 100 / logo.naturalHeight), w = logo.naturalWidth * s, h = logo.naturalHeight * s;
    x.globalAlpha = fa(3.1); x.drawImage(logo, 90, fy + 90 - h / 2, w, h);
  }
  const as = (K.assinatura || '').toUpperCase();
  if (as) { x.globalAlpha = fa(3.2); drawText(x, as, 1830, fy + 78, { size: fitSize(as, 26, 1200, false), color: ESC.ink2, align: 'right', ls: 1.5 }); }
  if (K.link) { x.globalAlpha = fa(3.3); drawText(x, K.link, 1830, fy + 128, { size: fitSize(K.link, 30, 1200, true), bold: true, color: ESC.ink, align: 'right' }); }
  x.restore();
}
