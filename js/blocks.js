// ===== Números que Contam — blocos (tipos de cena) e cartela final =====
TXT.unit = { size: 40, bold: true, lh: 1.25, ls: 0, color: () => T.cream };

// imagens: o app define IMG(src) -> HTMLImageElement carregado (ou null)
const img = src => (src && typeof IMG === 'function') ? IMG(src) : null;
const TITLE_Y = 250;
const title = (txt, maxLines = 3) => layoutRich(txt, { cls: 'big', maxLines, w: 920 });
const tBottom = L => L.empty ? TITLE_Y : TITLE_Y + L.height;
// "R$ 338,8 bi" -> {pre:'R$ ', v:338.8, d:1, suf:' bi'}
function parseFig(s) {
  const m = String(s ?? '').trim().match(/^(.*?)(-?\d[\d.,]*)(.*)$/);
  if (!m) return { pre: '', v: 0, d: 0, suf: '', ok: false };
  let num = m[2], suf = m[3];
  if (/[.,]$/.test(num)) { suf = num.slice(-1) + suf; num = num.slice(0, -1); }
  const n = parseNum(num);
  return { pre: m[1], v: n.v, d: n.d, suf, ok: n.ok };
}
const figStr = f => f.pre + fmt(f.v, f.d) + f.suf;
const noAccent = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
function niceMax(v) { const p = Math.pow(10, Math.floor(Math.log10(v || 1))); for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p; return 10 * p; }

const BLOCKS = {};

// ---------------------------------------------------------------- ABERTURA
BLOCKS.abertura = {
  nome: 'Abertura com foto', desc: 'Foto com movimento lento e uma pergunta ou título forte.',
  dur: 2.8, enter: 'cut', exit: 'zoom', eout: .42, cue: 'rise',
  campos: [
    { k: 'etiqueta', tipo: 'texto', rotulo: 'Etiqueta acima do título (opcional)', ajuda: 'Ex.: CAPACITAÇÃO ON-LINE · LANÇAMENTO' },
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título', ajuda: 'Curto, 2 a 4 linhas. Use | para quebrar linha.' },
    { k: 'foto', tipo: 'imagem', rotulo: 'Foto (vertical ou horizontal)' },
    { k: 'credito', tipo: 'texto', rotulo: 'Crédito da foto' },
    { k: 'subtitulo', tipo: 'texto', rotulo: 'Subtítulo (opcional)' },
  ],
  make(d) {
    const tag = (d.etiqueta || '').trim().toUpperCase();
    const L = layoutRich(d.titulo, { cls: 'big', maxLines: tag ? 5 : 4, w: 920 });
    const S = d.subtitulo ? layoutRich(d.subtitulo, { cls: 'sm', maxLines: 2, w: 920 }) : null;
    const ty = tag ? TITLE_Y + 100 : TITLE_Y;
    const cr = (d.credito || '').trim();
    return {
      src: cr ? (/^foto/i.test(cr) ? cr : 'Foto: ' + cr) : '',
      draw(x, lt, dur) {
        drawPhoto(x, img(d.foto), { x: 0, y: 655, w: W, h: 1265 }, lt, dur, { s0: 1.25, s1: 1.02, x0: 30, x1: -20 });
        if (tag) pill(x, tag, 80, TITLE_Y, prog(lt, .02, .4), { size: 30, padX: 26, padY: 14 });
        drawRich(x, L, 80, ty, lt - (tag ? .25 : .1), { stagger: tag ? .045 : .07 });
        if (S) drawRich(x, S, 80, 1560, lt - .9, { stagger: .03 });
      }
    };
  }
};

// ---------------------------------------------------------------- NÚMERO
BLOCKS.numero = {
  nome: 'Número em destaque', desc: 'Um número grande que sobe na tela. Se terminar em %, vira um anel.',
  dur: 4.0, enter: 'zoom', exit: 'left', cue: 'whoosh',
  campos: [
    { k: 'intro', tipo: 'texto-longo', rotulo: 'Frase de introdução', ajuda: 'Ex.: De 2014 a 2024,|o Brasil colheu' },
    { k: 'numero', tipo: 'texto', rotulo: 'Número', ajuda: 'Pode ter R$, %, etc. Ex.: 572,2 · R$ 338,8 · 17,2%' },
    { k: 'legenda', tipo: 'texto', rotulo: 'O que o número representa', ajuda: 'Ex.: milhões de sacas de 60 kg' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)', ajuda: 'Ex.: Em média, *R$ 30,8 bilhões* por safra.' },
    { k: 'foto', tipo: 'imagem', rotulo: 'Foto na parte de baixo (opcional)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const I = layoutRich(d.intro, { cls: 'md', maxLines: 3, w: 920 });
    const f = parseFig(d.numero);
    const pct = f.suf.trim() === '%' && f.v >= 0 && f.v <= 100;
    const top = (I.empty ? TITLE_Y : TITLE_Y + I.height) + 60;
    const U = layoutRich(d.legenda, { cls: 'unit', maxLines: 2, w: pct ? 920 : 920 });
    const C = layoutRich(d.complemento, { cls: 'md', maxLines: 3, w: 920 });
    const foto = !!d.foto, coins = /R\$/.test(f.pre) && !foto;
    const area = foto ? 1180 : 1680;
    let size, numY, R, cy, unitY, lineY, compY, coinY;
    if (pct) {
      R = 250; size = fitSize(figStr(f), 170, 2 * R - 130, true, -6);
      const hgt = 2 * R + 40 + (U.empty ? 0 : U.height + 30) + (C.empty ? 0 : C.height + 50);
      const y0 = foto ? top : Math.max(top, (top + area) / 2 - hgt / 2);
      cy = y0 + R; numY = cy - size * .5; unitY = cy + R + 60; compY = unitY + (U.empty ? 0 : U.height) + 50;
    } else {
      size = fitSize(figStr(f), 250, 930, true, -6);
      const hgt = size + 20 + (U.empty ? 0 : U.height + 30) + 40 + (C.empty ? 0 : C.height + 40) + (coins ? 160 : 0);
      const y0 = foto ? top : Math.max(top, (top + area) / 2 - hgt / 2 - 40);
      numY = y0; unitY = y0 + size * 1.02 + 20; lineY = unitY + (U.empty ? 0 : U.height) + 40; compY = lineY + 50;
      coinY = compY + (C.empty ? 0 : C.height) + 70;
    }
    return {
      src: d.fonte,
      draw(x, lt, dur) {
        if (foto) { const ph = 1920 - (compY + (C.empty ? 0 : C.height) + 40); const y = Math.max(1000, 1920 - Math.max(ph, 700)); drawPhoto(x, img(d.foto), { x: 0, y, w: W, h: 1920 - y }, lt, dur, { s0: 1.15, s1: 1.02, y0: 20, y1: -20, fadeTop: .45 }); }
        drawRich(x, I, 80, TITLE_Y, lt - .05);
        if (pct) {
          const p = E.out5(prog(lt, .3, 1.8));
          x.lineCap = 'round'; x.lineWidth = 52;
          x.strokeStyle = 'rgba(255,255,255,.07)'; x.beginPath(); x.arc(540, cy, R, 0, Math.PI * 2); x.stroke();
          if (p > 0) { x.strokeStyle = T.accent; x.beginPath(); x.arc(540, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f.v / 100 * p); x.stroke(); }
          drawCounter(x, 540, numY, lt, { a: .3, b: 1.8, to: f.v, dec: f.d, pre: f.pre, suf: f.suf, size, align: 'center' });
          drawRich(x, U, 80, unitY, lt - .9, { align: 'center', stagger: .03 });
        } else {
          drawCounter(x, 72, numY, lt, { a: .25, b: 1.7, to: f.v, dec: f.d, pre: f.pre, suf: f.suf, size });
          drawRich(x, U, 84, unitY, lt - .6, { stagger: .03 });
          x.fillStyle = rgba(T.accent, .4); x.fillRect(84, lineY, 912 * E.out5(prog(lt, 1.2, 1.9)), 3);
          if (coins) for (let i = 0; i < 11; i++) {
            const p = E.back(prog(lt, 1.9 + i * .06, 2.3 + i * .06)); if (p <= 0) continue;
            x.save(); x.globalAlpha = clamp(p * 2); x.translate(115 + i * 84, coinY + (1 - p) * -200); x.scale(p, p);
            x.beginPath(); x.arc(0, 0, 29, 0, Math.PI * 2); x.fillStyle = rgba(T.accent, .15); x.fill(); x.lineWidth = 4; x.strokeStyle = T.accent; x.stroke();
            drawText(x, 'R$', 0, 9, { size: 24, bold: true, color: T.accent, align: 'center' }); x.restore();
          }
        }
        drawRich(x, C, pct ? 80 : 80, compY, lt - (pct ? 1.6 : 1.5), { align: pct ? 'center' : 'left' });
      }
    };
  }
};

// ---------------------------------------------------------------- DOIS NÚMEROS
BLOCKS.dois = {
  nome: 'Dois números lado a lado', desc: 'Compara duas grandezas, como % da área e % do valor.',
  dur: 3.8, enter: 'left', exit: 'up', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'a_numero', tipo: 'texto', rotulo: 'Número da esquerda', ajuda: 'Ex.: 1,9%' },
    { k: 'a_legenda', tipo: 'texto', rotulo: 'Legenda da esquerda' },
    { k: 'b_numero', tipo: 'texto', rotulo: 'Número da direita' },
    { k: 'b_legenda', tipo: 'texto', rotulo: 'Legenda da direita' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const L = title(d.titulo);
    const A = parseFig(d.a_numero), B = parseFig(d.b_numero);
    const size = Math.min(fitSize(figStr(A), 200, 430, true, -6), fitSize(figStr(B), 200, 430, true, -6));
    const LA = layoutRich(d.a_legenda, { cls: 'unit', size: 38, maxLines: 4, w: 430 }), LB = layoutRich(d.b_legenda, { cls: 'unit', size: 38, maxLines: 4, w: 430 });
    const C = layoutRich(d.complemento, { cls: 'md', maxLines: 3, w: 920 });
    const capH = Math.max(LA.height, LB.height);
    const bothPct = [A, B].every(f => f.suf.trim() === '%' && f.v <= 100);
    const hgt = size + 30 + capH + (bothPct ? 90 : 0) + (C.empty ? 0 : C.height + 90);
    const y0 = Math.max(tBottom(L) + 110, (tBottom(L) + 1680) / 2 - hgt / 2);
    const capY = y0 + size + 30, barY = capY + capH + 40, compY = (bothPct ? barY + 50 : capY + capH) + 90;
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        drawCounter(x, 72, y0, lt, { a: .3, b: 1.5, to: A.v, dec: A.d, pre: A.pre, suf: A.suf, size, color: T.accent2 });
        drawCounter(x, 572, y0, lt, { a: .6, b: 1.8, to: B.v, dec: B.d, pre: B.pre, suf: B.suf, size });
        drawRich(x, LA, 80, capY, lt - .8, { stagger: .03 });
        drawRich(x, LB, 580, capY, lt - 1.1, { stagger: .03 });
        const dl = E.out5(prog(lt, .4, 1.2)); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(538, y0, 2, (capY + capH - y0) * dl);
        if (bothPct) { bar(x, 80, barY, 420, 18, E.out5(prog(lt, .6, 1.8)) * A.v / 100, T.accent2); bar(x, 580, barY, 420, 18, E.out5(prog(lt, .9, 2.1)) * B.v / 100, T.accent); }
        drawRich(x, C, 80, compY, lt - 1.7);
      }
    };
  }
};

// ---------------------------------------------------------------- PROPORÇÃO
function person(x, cx, cy, s) {
  x.beginPath(); x.arc(cx, cy - s * .3, s * .17, 0, Math.PI * 2); x.fill();
  x.beginPath(); x.moveTo(cx - s * .34, cy + s * .42); x.lineTo(cx - s * .34, cy + s * .08);
  x.quadraticCurveTo(cx - s * .34, cy - s * .08, cx - s * .16, cy - s * .08); x.lineTo(cx + s * .16, cy - s * .08);
  x.quadraticCurveTo(cx + s * .34, cy - s * .08, cx + s * .34, cy + s * .08); x.lineTo(cx + s * .34, cy + s * .42); x.closePath(); x.fill();
}
BLOCKS.proporcao = {
  nome: 'Proporção (1 em cada N)', desc: 'Bonecos que mostram “1 em cada 6”, “3 em cada 10” etc.',
  dur: 4.0, enter: 'zoom', exit: 'up', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'parte', tipo: 'texto', rotulo: 'Parte (ex.: 1)' },
    { k: 'total', tipo: 'texto', rotulo: 'Total (ex.: 6) — até 100' },
    { k: 'legenda', tipo: 'texto-longo', rotulo: 'Legenda', ajuda: 'Ex.: produtores no café é *mulher*' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const L = title(d.titulo);
    const k = Math.max(0, Math.round(parseNum(d.parte).v)), n = clamp(Math.round(parseNum(d.total).v) || 1, 1, 100);
    const cols = n <= 8 ? n : 10, rows = Math.ceil(n / cols);
    const s = Math.min(175, 940 / cols, 560 / rows);
    const F = layoutRich(`*${k}* em cada *${n}*`, { cls: 'big', size: 130, maxLines: 1, w: 920 });
    const G = layoutRich(d.legenda, { cls: 'md', size: 50, maxLines: 3, w: 920 });
    const gh = rows * s * 1.05;
    const hgt = gh + 70 + F.height + 20 + (G.empty ? 0 : G.height);
    const y0 = Math.max(tBottom(L) + 90, (tBottom(L) + 1680) / 2 - hgt / 2);
    const fy = y0 + gh + 70, gy = fy + F.height + 20;
    const x0 = 540 - cols * s / 2;
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        const st = Math.min(.08, 1.1 / n);
        for (let i = 0; i < n; i++) {
          const r = Math.floor(i / cols), c = i % cols;
          const p = E.back(prog(lt, .3 + i * st, .7 + i * st)); if (p <= 0) continue;
          const hl = i < k ? E.out5(prog(lt, 1.3 + i * .05, 1.7 + i * .05)) : 0;
          const cx = x0 + (c + .5) * s, cy = y0 + (r + .5) * s * 1.05;
          x.save(); x.globalAlpha = clamp(p * 2); x.translate(cx, cy); x.scale(p, p);
          x.fillStyle = hl > 0 ? mixHex(shade(T.bg, .12), T.accent, hl) : shade(T.bg, .12);
          person(x, 0, 0, s * .92);
          if (hl > 0 && hl < 1) { x.globalAlpha = 1 - hl; x.strokeStyle = T.accent; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, s * (.5 + hl * .25), 0, Math.PI * 2); x.stroke(); }
          x.restore();
        }
        drawRich(x, F, 80, fy, lt - 1.4, { align: 'center' });
        drawRich(x, G, 80, gy, lt - 1.8, { align: 'center', stagger: .04 });
      }
    };
  }
};

// ---------------------------------------------------------------- RANKING
BLOCKS.ranking = {
  nome: 'Ranking (barras)', desc: 'Até 8 itens com barras que crescem. O primeiro ganha destaque.',
  dur: 4.8, enter: 'up', exit: 'shrink', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'itens', tipo: 'lista', rotulo: 'Itens (um por linha: Nome; valor)', ajuda: 'Ex.:\nMinas Gerais; 47,2\nEspírito Santo; 23,6' },
    { k: 'sufixo', tipo: 'texto', rotulo: 'Unidade dos valores (opcional)', ajuda: 'Ex.: %  ·  mil t  ·  mi' },
    { k: 'destaques', tipo: 'texto', rotulo: 'Quantos itens destacar', ajuda: 'Padrão: 1' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const L = title(d.titulo);
    const items = parseList(d.itens).slice(0, 8), n = Math.max(1, items.length);
    const max = Math.max(...items.map(i => i.v), 1e-9);
    const dec = Math.max(0, ...items.map(i => i.d));
    let suf = d.sufixo || ''; if (suf && !/^[%\s]/.test(suf)) suf = ' ' + suf;
    const nh = d.destaques === undefined || d.destaques === '' ? 1 : Math.round(parseNum(d.destaques).v);
    const y0 = tBottom(L) + 80;
    const gap = clamp((1690 - y0) / n, 96, 160);
    const lab = clamp(gap * .3, 30, 40);
    const yy = y0 + Math.max(0, (1690 - y0 - gap * n) / 2);
    const labSize = Math.min(lab, ...items.map(i => fitSize(i.nome, lab, 640)));
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        items.forEach((it, i) => {
          const y = yy + i * gap, t0 = .5 + i * .18;
          const p = E.out5(prog(lt, t0, t0 + 1.1)), pl = E.out5(prog(lt, t0 - .1, t0 + .4));
          if (pl <= 0) return;
          const hi = i < nh;
          x.save(); x.globalAlpha = pl;
          setFont(x, labSize * .65, false); x.fillStyle = T.accent; x.fillText(String(i + 1).padStart(2, '0'), 80 + (1 - pl) * -60, y + labSize * .9);
          drawText(x, it.nome, 80 + labSize * 1.25 + (1 - pl) * -60, y + labSize * .9, { size: labSize, bold: true, color: hi ? T.cream : '#d9d3c6' });
          drawText(x, fmt(it.v * p, dec) + suf, 1000, y + labSize * .9, { size: labSize * .94, color: T.accent, align: 'right', bold: hi });
          x.restore();
          bar(x, 80, y + labSize * 1.45, 920, clamp(gap * .14, 14, 22), p * it.v / max, hi ? T.accent : T.accent2);
        });
      }
    };
  }
};

// ---------------------------------------------------------------- FRASE
BLOCKS.frase = {
  nome: 'Frase de impacto', desc: 'Uma frase grande, palavra por palavra. Bom para respirar entre números.',
  dur: 3.0, enter: 'zoom', exit: 'zoom', cue: 'whoosh',
  campos: [
    { k: 'frase', tipo: 'texto-longo', rotulo: 'Frase', ajuda: 'Ex.: Mais de *1 milhão* de famílias|vivem do *café.*' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)' },
    { k: 'foto', tipo: 'imagem', rotulo: 'Foto de fundo (opcional, fica escurecida)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte ou crédito (opcional)' },
  ],
  make(d) {
    const F = layoutRich(d.frase, { cls: 'big', size: 100, maxLines: 7, w: 900 });
    const C = layoutRich(d.complemento, { cls: 'sm', maxLines: 4, w: 880 });
    const hgt = F.height + (C.empty ? 0 : C.height + 50);
    const y0 = Math.max(TITLE_Y + 40, 940 - hgt / 2);
    return {
      src: d.fonte,
      draw(x, lt, dur) {
        if (d.foto) {
          drawPhoto(x, img(d.foto), { x: 0, y: 0, w: W, h: H }, lt, dur, { s0: 1.2, s1: 1.05, x0: -20, x1: 20, fadeTop: 0 });
          const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, rgba(T.bg, .85)); g.addColorStop(.5, rgba(T.bg, .6)); g.addColorStop(1, rgba(T.bg, .9));
          x.fillStyle = g; x.fillRect(0, 0, W, H);
        }
        const p = E.out5(prog(lt, .1, .9));
        x.fillStyle = T.accent; x.fillRect(60, y0 + 10, 8, (F.height - 10) * p);
        drawRich(x, F, 100, y0, lt - .15, { stagger: .07 });
        drawRich(x, C, 100, y0 + F.height + 50, lt - .9, { stagger: .03 });
      }
    };
  }
};

// ---------------------------------------------------------------- LINHA DO TEMPO
BLOCKS.linha = {
  nome: 'Evolução no tempo (linha)', desc: 'Série anual desenhada aos poucos, com o pico destacado.',
  dur: 5.0, enter: 'up', exit: 'shrink', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'serie', tipo: 'lista', rotulo: 'Valores (um por linha: Ano; valor)', ajuda: 'Ex.:\n2014; 46,8\n2015; 44,3' },
    { k: 'sufixo', tipo: 'texto', rotulo: 'Unidade (opcional)', ajuda: 'Aparece no destaque. Ex.: mi sacas' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const L = title(d.titulo);
    const pts = parseList(d.serie).slice(0, 40), n = pts.length;
    const C = layoutRich(d.complemento, { cls: 'md', maxLines: 3, w: 920 });
    const top = Math.max(tBottom(L) + 110, 560), ch = 620;
    const maxV = niceMax(Math.max(...pts.map(p => p.v), 1)), minV = Math.min(0, ...pts.map(p => p.v));
    const X = i => 150 + (n > 1 ? i * 830 / (n - 1) : 415), Y = v => top + ch - (v - minV) / (maxV - minV) * ch;
    const dec = Math.max(0, ...pts.map(p => p.d));
    let pk = 0; pts.forEach((p, i) => { if (p.v > pts[pk].v) pk = i; });
    let suf = (d.sufixo || '').trim(); suf = suf ? (suf === '%' ? '%' : ' ' + suf) : '';
    const pkTxt = n ? `${pts[pk].nome} · ${fmt(pts[pk].v, dec)}${suf}` : '';
    const ticks = [0, .25, .5, .75, 1].map(k => minV + (maxV - minV) * k);
    const tdec = maxV - minV < 5 ? 1 : 0;
    const labs = n <= 6 ? pts.map((_, i) => i) : [0, Math.round((n - 1) / 2), n - 1];
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        if (!n) return;
        const ga = fadeAlpha(lt, .1, .6);
        x.save(); x.globalAlpha = ga;
        ticks.forEach(v => { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(130, Y(v), 870, 2); drawText(x, fmt(v, tdec), 115, Y(v) + 9, { size: 24, color: '#7d8b82', align: 'right' }); });
        labs.forEach(i => drawText(x, pts[i].nome, X(i), top + ch + 55, { size: 24, color: '#7d8b82', align: 'center' }));
        x.restore();
        const p = E.inout(prog(lt, .4, 2.6)), f = p * (n - 1), i0 = Math.min(n - 2, Math.floor(f)), r = f - i0;
        x.strokeStyle = T.accent; x.lineWidth = 7; x.lineJoin = x.lineCap = 'round';
        x.beginPath(); x.moveTo(X(0), Y(pts[0].v));
        for (let i = 1; i <= i0; i++) x.lineTo(X(i), Y(pts[i].v));
        let hx = X(0), hy = Y(pts[0].v);
        if (n > 1) { hx = lerp(X(i0), X(i0 + 1), r); hy = lerp(Y(pts[i0].v), Y(pts[i0 + 1].v), r); x.lineTo(hx, hy); }
        // área
        x.stroke();
        x.save(); x.globalAlpha = .12 * p; x.fillStyle = T.accent; x.lineTo(hx, top + ch); x.lineTo(X(0), top + ch); x.closePath(); x.fill(); x.restore();
        if (ga > 0) { x.beginPath(); x.arc(hx, hy, 12, 0, Math.PI * 2); x.fillStyle = T.accent; x.fill(); x.lineWidth = 4; x.strokeStyle = T.bg; x.stroke(); }
        const pkp = prog(lt, 2.0 + .0, 2.5);
        if (pkp > 0 && f >= pk - .01) {
          x.beginPath(); x.arc(X(pk), Y(pts[pk].v), 18 + E.back(pkp) * 14 + Math.sin(lt * 7) * 3 * pkp, 0, Math.PI * 2);
          x.globalAlpha = pkp; x.strokeStyle = T.accent; x.lineWidth = 4; x.stroke(); x.globalAlpha = 1;
          setFont(x, 28, true); const pw = x.measureText(pkTxt).width + 56;
          pill(x, pkTxt, clamp(X(pk) - pw / 2, 80, 1000 - pw), Y(pts[pk].v) - 110, E.out5(prog(lt, 2.1, 2.5)), { origin: 'center' });
        }
        drawRich(x, C, 80, top + ch + 130, lt - 2.7);
      }
    };
  }
};

// ---------------------------------------------------------------- MAPA
const BR_PATHS = {};
let BR_ALL = null;
function brPaths() {
  if (BR_ALL) return BR_PATHS;
  BR_ALL = new Path2D();
  for (const uf in GEO_BR) { BR_PATHS[uf] = new Path2D(GEO_BR[uf].d); BR_ALL.addPath(BR_PATHS[uf]); }
  return BR_PATHS;
}
function findUF(nome) {
  const k = noAccent(nome);
  for (const uf in GEO_BR) if (noAccent(uf) === k || noAccent(GEO_BR[uf].n) === k) return uf;
  return null;
}
BLOCKS.mapa = {
  nome: 'Mapa do Brasil por estado', desc: 'Estados se acendem conforme o valor; o maior ganha destaque.',
  dur: 5.0, enter: 'up', exit: 'zoom', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'valores', tipo: 'lista', rotulo: 'Valores (um por linha: UF ou nome do estado; valor)', ajuda: 'Ex.:\nMG; 47,2\nES; 23,6\nSão Paulo; 9,8' },
    { k: 'sufixo', tipo: 'texto', rotulo: 'Unidade (opcional)', ajuda: 'Ex.: %  ·  mil t' },
    { k: 'zoom', tipo: 'check', rotulo: 'Aproximar no estado de maior valor' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte dos dados' },
  ],
  make(d) {
    const L = title(d.titulo);
    brPaths();
    const vals = parseList(d.valores).map(r => ({ uf: findUF(r.nome), v: r.v, d: r.d })).filter(r => r.uf).sort((a, b) => b.v - a.v);
    const max = Math.max(...vals.map(v => v.v), 1e-9), min = vals.length > 1 ? Math.min(...vals.map(v => v.v)) : 0, dec = Math.max(0, ...vals.map(v => v.d));
    let suf = (d.sufixo || '').trim(); suf = suf ? (suf === '%' ? '%' : ' ' + suf) : '';
    const top = Math.max(tBottom(L) + 50, 540), bottom = 1660;
    const ms = Math.min(1, (bottom - top - 60) / 1000), mw = 960 * ms;
    const mx = 540 - mw / 2, my = top + 20;
    const best = vals[0], st = Math.min(.12, 1.6 / Math.max(1, vals.length));
    const bestTxt = best ? `${GEO_BR[best.uf].n} · ${fmt(best.v, dec)}${suf}` : '';
    const zoom = !!d.zoom && best;
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        const M = layer('map'), m = M.x;
        const zp = zoom ? E.inout(prog(lt, 2.7, 3.9)) : 0, z = lerp(1, 1.9, zp);
        const c = best ? GEO_BR[best.uf].c : [480, 500];
        const cx = lerp(480, c[0], zp), cy = lerp(500, c[1], zp);
        m.save();
        m.translate(540, my + 500 * ms); m.scale(ms * z, ms * z); m.translate(-cx, -cy);
        const lw = 1 / (ms * z);
        const ma = fadeAlpha(lt, .05, .5);
        m.globalAlpha = ma;
        for (const uf in BR_PATHS) { m.fillStyle = 'rgba(255,255,255,.045)'; m.fill(BR_PATHS[uf]); }
        vals.forEach((r, i) => {
          const p = E.out5(prog(lt, .5 + i * st, .9 + i * st)); if (p <= 0) return;
          m.globalAlpha = ma * p; m.fillStyle = mixHex(shade(T.bg, .1), T.accent, .15 + .85 * (max > min ? (r.v - min) / (max - min) : 1)); m.fill(BR_PATHS[r.uf]);
        });
        m.globalAlpha = ma; m.strokeStyle = 'rgba(244,236,221,.25)'; m.lineWidth = 1.6 * lw; m.lineJoin = 'round';
        for (const uf in BR_PATHS) m.stroke(BR_PATHS[uf]);
        if (best) {
          const hp = prog(lt, 2.2, 2.6);
          if (hp > 0) { m.globalAlpha = hp; m.strokeStyle = T.cream; m.lineWidth = (3 + Math.sin(lt * 6) * 1.2) * lw; m.stroke(BR_PATHS[best.uf]); }
        }
        m.restore();
        // máscara suave nas bordas da área do mapa
        m.globalCompositeOperation = 'destination-in';
        const g = m.createLinearGradient(0, top - 20, 0, bottom);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.06, '#000'); g.addColorStop(.94, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        m.fillStyle = g; m.fillRect(0, 0, W, H);
        x.drawImage(M.c, 0, 0, W, H);
        if (best) {
          const px = 540 + (c[0] - cx) * ms * z, py = my + 500 * ms + (c[1] - cy) * ms * z;
          setFont(x, 30, true); const pw = x.measureText(bestTxt).width + 60;
          pill(x, bestTxt, clamp(px - pw / 2, 80, 1000 - pw), clamp(py - 130, top, bottom - 80), E.out5(prog(lt, 2.3, 2.7)), { size: 30, origin: 'center' });
        }
        // legenda
        const la = fadeAlpha(lt, 1.2, 1.7);
        if (la > 0 && vals.length > 1) {
          x.save(); x.globalAlpha = la;
          const lg = x.createLinearGradient(640, 0, 1000, 0); lg.addColorStop(0, mixHex(shade(T.bg, .1), T.accent, .15)); lg.addColorStop(1, T.accent);
          x.fillStyle = lg; rrect(x, 640, 1640, 360, 14, 7); x.fill();
          drawText(x, 'menor', 640, 1690, { size: 22, color: '#9AA89F' }); drawText(x, 'maior', 1000, 1690, { size: 22, color: '#9AA89F', align: 'right' });
          x.restore();
        }
      }
    };
  }
};

// ---------------------------------------------------------------- FECHAMENTO (chamada)
BLOCKS.fechamento = {
  nome: 'Chamada final (link)', desc: 'Convite para acessar o painel ou site, com print opcional.',
  dur: 3.8, enter: 'up', exit: 'fade', eout: .25, cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título', ajuda: 'Ex.: Explore os dados|do seu *município.*' },
    { k: 'imagem', tipo: 'imagem', rotulo: 'Print do painel/site (opcional)' },
    { k: 'chamada', tipo: 'texto', rotulo: 'Chamada acima do link', ajuda: 'Ex.: Acesse o painel' },
    { k: 'link', tipo: 'texto', rotulo: 'Link', ajuda: 'Ex.: embrapa.br/...' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Rodapé (opcional)' },
  ],
  make(d) {
    const L = title(d.titulo);
    const im = () => img(d.imagem);
    const linkSize = fitSize(d.link || '', 30, 860, true);
    const linkBig = fitSize(d.link || '', 46, 820, true);
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        const I = im(), has = I && I.naturalWidth;
        let cardBottom = tBottom(L) + 40;
        if (has) {
          const cw = 940, top = Math.max(tBottom(L) + 70, 600);
          const chh = Math.min(cw * I.naturalHeight / I.naturalWidth, 1480 - top);
          const p = E.out5(prog(lt, .1, .9));
          x.save(); x.globalAlpha = clamp(p * 2);
          x.translate(540, top + chh / 2 + (1 - p) * 520); x.rotate((1 - p) * -5 * Math.PI / 180); x.scale(1, 1 - (1 - p) * .25); x.translate(-540, -(top + chh / 2));
          x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 80; x.shadowOffsetY = 30;
          x.fillStyle = '#fff'; rrect(x, 70, top, cw, chh, 22); x.fill(); x.shadowColor = 'transparent';
          x.save(); rrect(x, 70, top, cw, chh, 22); x.clip();
          const z = lerp(1, 1.12, E.inout(prog(lt, 1, 3.5)));
          const iw = cw * z, ih = iw * I.naturalHeight / I.naturalWidth;
          x.drawImage(I, 70 + (cw - iw) / 2, top + (chh - ih) / 2, iw, ih);
          x.restore(); x.restore();
          cardBottom = top + chh;
        }
        const ly = has ? Math.min(cardBottom + 90, 1560) : Math.max(cardBottom + 160, 900);
        if (d.chamada) { x.save(); x.globalAlpha = prog(lt, 1.1, 1.5); drawText(x, d.chamada.toUpperCase(), 84, ly - (has ? 24 : 36), { size: has ? 24 : 32, color: T.accent, ls: 3 }); x.restore(); }
        if (d.link) { const ls = has ? linkSize : linkBig; pill(x, d.link, 80, ly, prog(lt, .9, 1.35), { size: ls, padX: ls, padY: ls * .55 }); }
      }
    };
  }
};

// ---------------------------------------------------------------- LISTA
BLOCKS.lista = {
  nome: 'Lista numerada', desc: 'De 2 a 6 itens que entram um a um, ligados por uma linha. Bom para módulos, etapas, perfis ou elos de uma cadeia.',
  dur: 4.6, enter: 'up', exit: 'up', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'itens', tipo: 'lista', rotulo: 'Itens (um por linha: Título; detalhe opcional)', ajuda: 'Ex.:\nMódulo 1; Panorama da cadeia do trigo\nMódulo 2; Acesso aos dados' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte ou rodapé (opcional)' },
  ],
  make(d) {
    const L = title(d.titulo);
    const items = String(d.itens || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 6).map(l => {
      const i = l.indexOf(';'); return i < 0 ? { t: l, s: '' } : { t: l.slice(0, i).trim(), s: l.slice(i + 1).trim() };
    });
    const n = Math.max(1, items.length), y0 = tBottom(L) + 90;
    const anyS = items.some(it => it.s);
    const gap = clamp((1680 - y0) / n, 130, anyS ? 300 : 210);
    const yy = y0 + Math.max(0, (1680 - y0 - gap * n) / 2);
    const big = n <= 4 ? 56 : 48;
    const ts = Math.min(big, ...items.map(it => fitSize(it.t, big, 820)));
    const ss = Math.min(36, ...items.map(it => it.s ? fitSize(it.s, 36, 820, false) : 36));
    const ty = it => it.s ? -ts * .35 : ts * .35;
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        if (!items.length) return;
        const st = Math.min(.3, 1.8 / n);
        const lp = E.inout(prog(lt, .4, .4 + st * (n - 1) + .3));
        if (n > 1) { x.fillStyle = rgba(T.accent, .35); x.fillRect(112, yy, 3, (n - 1) * gap * lp); }
        items.forEach((it, i) => {
          const t0 = .45 + i * st, cy = yy + i * gap;
          const pc = E.back(prog(lt, t0, t0 + .35)), pt = E.out5(prog(lt, t0 + .08, t0 + .6));
          if (pc > 0) {
            x.save(); x.translate(114, cy); x.scale(pc, pc);
            x.beginPath(); x.arc(0, 0, 42, 0, Math.PI * 2); x.fillStyle = T.accent; x.fill();
            drawText(x, String(i + 1), 0, 14, { size: 38, bold: true, color: T.bg, align: 'center' });
            x.restore();
          }
          if (pt > 0) {
            x.save(); x.globalAlpha = pt; x.translate((1 - pt) * 50, 0);
            drawText(x, it.t, 190, cy + ty(it), { size: ts, bold: true, color: T.cream });
            if (it.s) drawText(x, it.s, 190, cy + ty(it) + ss * 1.5, { size: ss, color: '#B9C2BC' });
            x.restore();
          }
        });
      }
    };
  }
};

// ---------------------------------------------------------------- ETIQUETAS
BLOCKS.etiquetas = {
  nome: 'Etiquetas (público, temas)', desc: 'Palavras ou expressões curtas que surgem como etiquetas. Bom para “para quem é” ou temas.',
  dur: 3.6, enter: 'zoom', exit: 'up', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título', ajuda: 'Ex.: Para quem *é?*' },
    { k: 'itens', tipo: 'lista', rotulo: 'Etiquetas (uma por linha, até 10)', ajuda: 'Ex.:\nGestores públicos\nCooperativas\nEstudantes' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Rodapé (opcional)' },
  ],
  make(d) {
    const L = title(d.titulo);
    const items = String(d.itens || '').split('\n').map(l => l.trim()).filter(Boolean).slice(0, 10);
    const C = layoutRich(d.complemento, { cls: 'sm', maxLines: 3, w: 920 });
    let size = 42, rows;
    const lay = sz => {
      const out = [[]]; let w = 0;
      setFont(_mc, sz, true);
      items.forEach(t => { const pw = _mc.measureText(t).width + sz * 1.3; if (w && w + 24 + pw > 920) { out.push([]); w = 0; } out[out.length - 1].push({ t, pw }); w += (w ? 24 : 0) + pw; });
      return out;
    };
    for (size = 56; size > 26; size -= 2) { rows = lay(size); if (rows.length * (size * 2.1 + 26) < 1000 && rows.every(r => r.every(c => c.pw <= 940))) break; }
    const rh = size * 2.1 + 26, gh = rows.length * rh;
    const y0 = Math.max(tBottom(L) + 100, (tBottom(L) + 1660) / 2 - (gh + (C.empty ? 0 : C.height + 60)) / 2);
    let k = 0;
    const chips = [];
    rows.forEach((r, ri) => { const tw = r.reduce((a, c) => a + c.pw, 0) + 24 * (r.length - 1); let x0 = 540 - tw / 2; r.forEach(c => { chips.push({ ...c, x: x0, y: y0 + ri * rh, i: k++ }); x0 += c.pw + 24; }); });
    return {
      src: d.fonte,
      draw(x, lt) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        const st = Math.min(.14, 1.4 / Math.max(1, chips.length));
        chips.forEach(c => {
          const p = E.back(prog(lt, .35 + c.i * st, .75 + c.i * st)); if (p <= 0) return;
          const h = size * 2.1, cx = c.x + c.pw / 2, cy = c.y + h / 2 + Math.sin(lt * 1.6 + c.i) * 4;
          x.save(); x.globalAlpha = clamp(p * 2); x.translate(cx, cy); x.scale(p, p); x.translate(-cx, -cy);
          rrect(x, c.x, cy - h / 2, c.pw, h, h / 2); x.fillStyle = rgba(T.accent, c.i % 3 === 0 ? .9 : .12); x.fill();
          x.lineWidth = 2.5; x.strokeStyle = rgba(T.accent, .8); x.stroke();
          drawText(x, c.t, cx, cy + size * .36, { size, bold: true, color: c.i % 3 === 0 ? T.bg : T.cream, align: 'center' });
          x.restore();
        });
        drawRich(x, C, 80, y0 + gh + 50, lt - 1.4, { align: 'center', stagger: .03 });
      }
    };
  }
};

// ---------------------------------------------------------------- TELA (print com zoom)
BLOCKS.tela = {
  nome: 'Tela com zoom (print)', desc: 'Um print de painel ou site entra em cena e a câmera se aproxima de um ponto.',
  dur: 4.4, enter: 'up', exit: 'shrink', cue: 'whoosh',
  campos: [
    { k: 'titulo', tipo: 'texto-longo', rotulo: 'Título' },
    { k: 'imagem', tipo: 'imagem', rotulo: 'Print (imagem horizontal funciona melhor)' },
    { k: 'foco_x', tipo: 'texto', rotulo: 'Ponto de zoom: horizontal (0 a 100)', ajuda: '0 = borda esquerda, 50 = centro, 100 = borda direita' },
    { k: 'foco_y', tipo: 'texto', rotulo: 'Ponto de zoom: vertical (0 a 100)', ajuda: '0 = topo, 100 = base' },
    { k: 'zoom', tipo: 'texto', rotulo: 'Aproximação (1 = sem zoom, 2 = dobro)', ajuda: 'Padrão: 1,6' },
    { k: 'legenda', tipo: 'texto', rotulo: 'Etiqueta (opcional)', ajuda: 'Aparece em destaque sobre a tela. Ex.: Painel de exportação' },
    { k: 'complemento', tipo: 'texto-longo', rotulo: 'Complemento (opcional)' },
    { k: 'fonte', tipo: 'texto', rotulo: 'Fonte ou rodapé (opcional)' },
  ],
  make(d) {
    const L = title(d.titulo);
    const fx = clamp((parseNum(d.foco_x).ok ? parseNum(d.foco_x).v : 50) / 100), fy = clamp((parseNum(d.foco_y).ok ? parseNum(d.foco_y).v : 50) / 100);
    const zm = clamp(parseNum(d.zoom).ok ? parseNum(d.zoom).v : 1.6, 1, 4);
    const C = layoutRich(d.complemento, { cls: 'md', size: 48, maxLines: 3, w: 920 });
    const lsz = d.legenda ? fitSize(d.legenda, 30, 820) : 30;
    return {
      src: d.fonte,
      draw(x, lt, dur) {
        drawRich(x, L, 80, TITLE_Y, lt - .05);
        const I = img(d.imagem);
        const cw = 940, top = Math.max(tBottom(L) + 80, 560);
        const ratio = I && I.naturalWidth ? I.naturalHeight / I.naturalWidth : .6;
        const maxH = 1560 - top - (C.empty ? 0 : C.height + 60);
        const chh = Math.min(cw * ratio * 1.25, maxH);
        const p = E.out5(prog(lt, .1, .9));
        x.save(); x.globalAlpha = clamp(p * 2);
        x.translate(540, top + chh / 2 + (1 - p) * 420); x.rotate((1 - p) * -4 * Math.PI / 180); x.scale(1, 1 - (1 - p) * .2); x.translate(-540, -(top + chh / 2));
        x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 70; x.shadowOffsetY = 26;
        x.fillStyle = '#fff'; rrect(x, 70, top, cw, chh, 20); x.fill(); x.shadowColor = 'transparent';
        if (I && I.naturalWidth) {
          x.save(); rrect(x, 70, top, cw, chh, 20); x.clip();
          const z = lerp(1, zm, E.inout(prog(lt, 1.0, Math.max(1.6, dur - .7))));
          const base = Math.max(cw / I.naturalWidth, chh / I.naturalHeight), k = base * z;
          const iw = I.naturalWidth * k, ih = I.naturalHeight * k;
          let ix = 70 + cw / 2 - fx * iw, iy = top + chh / 2 - fy * ih;
          ix = clamp(ix, 70 + cw - iw, 70); iy = clamp(iy, top + chh - ih, top);
          x.drawImage(I, ix, iy, iw, ih);
          x.restore();
        }
        x.restore();
        if (d.legenda) { setFont(x, lsz, true); const pw = x.measureText(d.legenda).width + 60; pill(x, d.legenda, 540 - pw / 2, top + chh - 40, E.out5(prog(lt, 1.1, 1.5)), { size: lsz, padX: 30, padY: 16, origin: 'center' }); }
        drawRich(x, C, 80, top + chh + 70, lt - 1.4);
      }
    };
  }
};

// ---------------------------------------------------------------- LINHA DO TEMPO DO VÍDEO
const TOTAL = 30, END_A = 25.2, BODY_END = 25.5, OV = .1;
function buildTimeline(P) {
  T.accent = P.cor || '#E3B76F'; T.accent2 = P.cor2 || '#6FBF8A'; T.bg = P.fundo || '#0c1611'; T.symbol = P.simbolo || 'circulos';
  const list = (P.blocos || []).filter(b => BLOCKS[b.tipo]);
  const hasEnd = !!(P.cartela && P.cartela.ativa);
  const bodyEnd = hasEnd ? BODY_END : TOTAL;
  const base = list.map(b => BLOCKS[b.tipo].dur);
  const sum = base.reduce((s, v) => s + v, 0) - OV * Math.max(0, list.length - 1);
  const k = sum > 0 ? bodyEnd / sum : 1;
  let a = 0, prevExit = '';
  const scenes = list.map((b, i) => {
    const def = BLOCKS[b.tipo], d = base[i] * k;
    let inst; try { inst = def.make(b.dados || {}, P); } catch (e) { console.error(e); inst = { draw() { } }; }
    const s = {
      a, b: i === list.length - 1 ? bodyEnd : a + d, enter: prevExit === 'left' && i ? 'left' : (i === 0 ? 'cut' : def.enter), exit: def.exit,
      ein: .5, eout: def.eout || .38, cue: def.cue, src: inst.src || '', label: P.tema || '', draw: inst.draw, dur: d
    };
    if (i === list.length - 1 && hasEnd) { s.exit = 'none'; }
    prevExit = s.exit; a += d - OV;
    return s;
  });
  const minDur = Math.min(...scenes.map(s => s.b - s.a));
  return {
    P, total: TOTAL, bodyEnd, scenes, minDur,
    endcard: hasEnd ? { a: END_A, draw: (x, lt) => drawEndcard(x, lt, Object.assign({ serie: P.serie }, P.cartela)) } : null,
    cues: scenes.map(s => ({ t: s.a, type: s.cue || 'whoosh' })).concat(hasEnd ? [{ t: END_A - .1, type: 'whoosh', amp: .8 }] : [])
  };
}
