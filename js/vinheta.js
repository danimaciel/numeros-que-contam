// ===== Números que Contam — vinheta de abertura (≈1,5 s) =====
// Dígitos que giram e se resolvem nas letras da série, sobre uma linha dourada e o contorno do Brasil.
const VIN_DUR = 1.5;

// desenha um texto letra a letra; cada letra mostra dígitos aleatórios até "travar" na letra certa
function decodeText(x, txt, cx, y, size, color, lt, t0, span, seed) {
  setFont(x, size, true, '', size * .06);
  const total = x.measureText(txt).width;
  let px = cx - total / 2;
  const chars = [...txt];
  chars.forEach((ch, i) => {
    const w = x.measureText(ch).width + size * .06;
    const lock = t0 + span * (i / Math.max(1, chars.length - 1));
    const appear = t0 - .12 + i * .018;
    if (lt >= appear && ch !== ' ') {
      const locked = lt >= lock;
      const frame = Math.floor(lt * 30);
      const glyph = locked ? ch : String(Math.floor(hash(frame * 31 + i * 7 + seed) * 10));
      const pop = locked ? 1 + .18 * Math.max(0, 1 - (lt - lock) / .12) : 1;
      x.save();
      x.globalAlpha *= locked ? 1 : .55 + .35 * hash(frame + i);
      x.fillStyle = locked ? color : rgba(T.accent, .9);
      x.textAlign = 'center';
      const gx = px + w / 2, gy = y;
      x.translate(gx, gy - size * .35); x.scale(pop, pop); x.translate(-gx, -(gy - size * .35));
      x.fillText(glyph, gx, gy);
      x.restore();
    }
    px += w;
  });
}

function drawVinheta(x, lt, K = {}) {
  brPaths();
  // fundo
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, shade(T.bg, .06)); g.addColorStop(1, shade(T.bg, -.08));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // contorno do Brasil ao fundo, crescendo de leve
  const ba = fadeAlpha(lt, 0, .5) * (1 - prog(lt, 1.15, 1.45));
  if (ba > 0) {
    const s = lerp(1.05, 1.18, E.out(prog(lt, 0, 1.5)));
    x.save(); x.globalAlpha = ba * .16;
    x.translate(540, 960); x.scale(s, s); x.translate(-480, -500);
    x.strokeStyle = ESC.cream; x.lineWidth = 2 / s; x.lineJoin = 'round'; x.stroke(BR_ALL);
    x.restore();
  }
  // linhas finas horizontais que passam rápido (leitura / varredura)
  for (let i = 0; i < 7; i++) {
    const yy = 300 + i * 220 + Math.sin(i * 2.1) * 40, p = E.out(prog(lt, .02 + i * .03, .5 + i * .03));
    const a = (1 - prog(lt, .9, 1.3)) * .12;
    if (p <= 0 || a <= 0) continue;
    x.fillStyle = rgba(T.accent, a); x.fillRect(i % 2 ? 1080 - 1080 * p : 0, yy, 1080 * p * .7, 1.5);
  }
  // saída: tudo sobe e desfoca levemente
  const out = E.in(prog(lt, 1.18, VIN_DUR));
  x.save();
  x.globalAlpha = 1 - out; x.translate(0, -out * 140);
  // linha dourada central
  const lp = E.out5(prog(lt, .05, .45)), lw = 860 * lp;
  x.fillStyle = T.accent; x.fillRect(540 - lw / 2, 958, lw, 4);
  // textos
  decodeText(x, 'NÚMEROS', 540, 920, 150, T.cream, lt, .22, .42, 1);
  decodeText(x, 'QUE CONTAM', 540, 1090, 92, T.accent, lt, .34, .40, 2);
  // tema / episódio
  const tema = [K.episodio ? 'Nº ' + String(K.episodio).padStart(2, '0') : '', (K.tema || '').toUpperCase()].filter(Boolean).join('  ·  ');
  if (tema) {
    const ta = E.out5(prog(lt, .78, 1.0));
    x.globalAlpha = (1 - out) * ta;
    drawText(x, tema, 540, 1215 + (1 - ta) * 20, { size: 42, bold: true, color: ESC.cream, align: 'center', ls: 6 });
  }
  x.restore();
  // flash sutil no momento em que tudo trava
  const fl = Math.max(0, 1 - Math.abs(lt - .78) / .08) * .08;
  if (fl > 0) { x.fillStyle = `rgba(255,255,255,${fl})`; x.fillRect(0, 0, W, H); }
}
