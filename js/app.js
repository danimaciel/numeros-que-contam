// ===== Números que Contam — interface =====
const $ = (s, r = document) => r.querySelector(s);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (k === 'class') e.className = attrs[k];
    else if (k in e) e[k] = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
};
const clone = o => JSON.parse(JSON.stringify(o));
const CORES = [['Dourado', '#E3B76F'], ['Verde', '#6FBF8A'], ['Azul-água', '#6FB7D9'], ['Terracota', '#E08E5B'], ['Trigo', '#EAD07A'], ['Lilás', '#B9A3E3'], ['Coral', '#EF8A80']];
const SIMBOLOS = [['circulos', 'Círculos'], ['grao', 'Grão'], ['folha', 'Folha'], ['gota', 'Gota'], ['espiga', 'Espiga'], ['nenhum', 'Nenhum']];
const STORE = 'nqc-projeto-v1';

// ---------- imagens ----------
const _imgs = new Map();
function IMG(src) {
  if (!src) return null;
  let im = _imgs.get(src);
  if (!im) { im = new Image(); im.onload = () => requestDraw(); im.src = src; _imgs.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
function waitImages() {
  const srcs = [];
  const walk = o => { for (const k in o) { const v = o[k]; if (typeof v === 'string' && (v.startsWith('data:image') || /\.(png|jpe?g|webp)$/i.test(v))) srcs.push(v); else if (v && typeof v === 'object') walk(v); } };
  walk(P);
  return Promise.all(srcs.map(s => new Promise(r => { IMG(s); const im = _imgs.get(s); if (im.complete) r(); else { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); } })));
}
function readImage(file, maxSide = 1600) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, maxSide / Math.max(im.width, im.height));
        if (k >= 1 && file.size < 1.5e6) return res(fr.result);
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        res(file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .9));
      };
      im.onerror = rej; im.src = fr.result;
    };
    fr.onerror = rej; fr.readAsDataURL(file);
  });
}

// ---------- estado ----------
let P = clone(EXEMPLO);
try { const s = localStorage.getItem(STORE); if (s) P = JSON.parse(s); } catch (e) { }
let TL = null, tNow = 0, playing = false, dirty = true;
let saveTimer = 0;
function changed(rebuildForm = false) {
  dirty = true;
  if (rebuildForm) renderForm();
  requestDraw();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { try { localStorage.setItem(STORE, JSON.stringify(P)); } catch (e) { } }, 600);
}

// ---------- prévia ----------
const cv = $('#preview'), pctx = cv.getContext('2d', { alpha: false });
const PREV_SCALE = cv.width / W;
let drawQueued = false;
function requestDraw() { if (!drawQueued) { drawQueued = true; requestAnimationFrame(drawNow); } }
function drawNow() {
  drawQueued = false;
  if (dirty) { TL = buildTimeline(P); dirty = false; updateTimes(); }
  render(pctx, tNow, TL, PREV_SCALE);
  $('#tempo').value = tNow; $('#tempoTxt').textContent = tNow.toFixed(1).replace('.', ',') + ' s';
}
let audioCtx = null, audioSrc = null, playT0 = 0, playStart = 0;
async function play() {
  if (playing) return;
  if (tNow >= TOTAL - .05) tNow = 0;
  playing = true; $('#play').textContent = '❚❚';
  if (dirty) { TL = buildTimeline(P); dirty = false; }
  try {
    audioCtx = audioCtx || new AudioContext();
    await audioCtx.resume();
    const buf = await mixAudio(TL, P);
    if (!playing) return;
    audioSrc = audioCtx.createBufferSource(); audioSrc.buffer = buf; audioSrc.connect(audioCtx.destination);
    audioSrc.start(0, tNow);
  } catch (e) { console.warn(e); }
  playT0 = performance.now(); playStart = tNow;
  const step = () => {
    if (!playing) return;
    tNow = playStart + (performance.now() - playT0) / 1000;
    if (tNow >= TOTAL) { tNow = TOTAL - 1 / 30; pause(); }
    drawNow();
    if (playing) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function pause() {
  playing = false; $('#play').textContent = '▶';
  try { audioSrc && audioSrc.stop(); } catch (e) { } audioSrc = null;
}
$('#play').onclick = () => playing ? pause() : play();
$('#tempo').oninput = e => { pause(); tNow = +e.target.value; requestDraw(); };
$('#inicio').onclick = () => { pause(); tNow = 0; requestDraw(); };

// ---------- formulário ----------
function field(obj, f, onAfter) {
  const id = 'f' + Math.random().toString(36).slice(2, 8);
  const lab = h('label', { for: id }, f.rotulo);
  const help = f.ajuda ? h('div', { class: 'ajuda' }, f.ajuda) : null;
  let input;
  if (f.tipo === 'texto-longo' || f.tipo === 'lista') {
    input = h('textarea', { id, rows: f.tipo === 'lista' ? 6 : 2, class: f.tipo === 'lista' ? 'mono' : '', value: obj[f.k] || '', oninput: e => { obj[f.k] = e.target.value; changed(); } });
  } else if (f.tipo === 'check') {
    input = h('input', { id, type: 'checkbox', checked: !!obj[f.k], onchange: e => { obj[f.k] = e.target.checked; changed(); } });
    return h('div', { class: 'campo check' }, input, lab, help);
  } else if (f.tipo === 'imagem') {
    const thumb = h('div', { class: 'thumb' });
    const paint = () => { thumb.innerHTML = ''; if (obj[f.k]) thumb.append(h('img', { src: obj[f.k], alt: '' })); else thumb.append(h('span', {}, 'sem imagem')); };
    paint();
    const file = h('input', {
      id, type: 'file', accept: 'image/*', onchange: async e => {
        const fl = e.target.files[0]; if (!fl) return;
        obj[f.k] = await readImage(fl, f.k === 'logo' ? 1000 : 1600); paint(); changed();
      }
    });
    const rm = h('button', { type: 'button', class: 'link', onclick: () => { obj[f.k] = ''; paint(); changed(); } }, 'remover');
    return h('div', { class: 'campo' }, lab, h('div', { class: 'imgrow' }, thumb, h('div', {}, file, rm)), help);
  } else {
    input = h('input', { id, type: 'text', value: obj[f.k] || '', oninput: e => { obj[f.k] = e.target.value; changed(); } });
  }
  return h('div', { class: 'campo' }, lab, input, help);
}
function select(opts, val, on) {
  const s = h('select', { onchange: e => on(e.target.value) }, opts.map(([v, t]) => h('option', { value: v }, t)));
  s.value = val; return s;
}
function colorPicker(key) {
  const inp = h('input', { type: 'color', value: P[key], oninput: e => { P[key] = e.target.value; changed(); sync(); } });
  const sel = select([...CORES.map(([n, c]) => [c, n]), ['', 'Outra…']], CORES.some(c => c[1] === P[key]) ? P[key] : '', v => { if (v) { P[key] = v; inp.value = v; changed(); } });
  const sync = () => { sel.value = CORES.some(c => c[1].toLowerCase() === P[key].toLowerCase()) ? P[key] : ''; };
  return h('div', { class: 'cor' }, sel, inp);
}
const timeLabels = [];
function updateTimes() {
  if (!TL) return;
  TL.scenes.forEach((s, i) => { if (timeLabels[i]) timeLabels[i].textContent = `${s.a.toFixed(1).replace('.', ',')}–${s.b.toFixed(1).replace('.', ',')} s`; });
  const w = $('#aviso');
  const n = (P.blocos || []).length;
  w.textContent = !n ? 'Adicione pelo menos uma cena.' : TL.minDur < 2.6 ? `Com ${n} cenas, cada uma fica curta (${TL.minDur.toFixed(1).replace('.', ',')} s). O ideal é de 4 a 7 cenas.` : '';
  w.hidden = !w.textContent;
}
function renderForm() {
  const root = $('#form'); root.innerHTML = ''; timeLabels.length = 0;
  // projeto
  root.append(h('section', { class: 'card' },
    h('h2', {}, 'Projeto'),
    field(P, { k: 'tema', rotulo: 'Tema do vídeo', ajuda: 'Aparece no topo de todas as cenas. Ex.: Trigo, Aquicultura, Feijão.' }),
    h('div', { class: 'grid2' },
      h('div', { class: 'campo' }, h('label', {}, 'Cor de destaque'), colorPicker('cor')),
      h('div', { class: 'campo' }, h('label', {}, 'Cor secundária'), colorPicker('cor2')),
    ),
    h('div', { class: 'grid2' },
      h('div', { class: 'campo' }, h('label', {}, 'Símbolo do fundo'), select(SIMBOLOS, P.simbolo || 'circulos', v => { P.simbolo = v; changed(); })),
      h('div', { class: 'campo' }, h('label', {}, 'Música'), select(MUSICAS.map(m => [m.id, m.nome]), P.musica || 'inovacao', v => { P.musica = v; changed(true); })),
    ),
    P.musica === 'propria' ? h('div', { class: 'grid2' },
      h('div', { class: 'campo' }, h('label', {}, 'Arquivo de música (mp3)'), h('input', {
        type: 'file', accept: 'audio/*', onchange: e => {
          const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { P.musicaArquivo = fr.result; changed(); }; fr.readAsDataURL(f);
        }
      }), h('div', { class: 'ajuda' }, P.musicaArquivo ? 'Arquivo carregado.' : 'Nenhum arquivo ainda.')),
      field(P, { k: 'musicaInicio', rotulo: 'Começar a música em (segundos)', ajuda: 'Ex.: 10' })) : null,
    field(P, { k: 'efeitos', tipo: 'check', rotulo: 'Efeitos sonoros nas transições' }),
  ));
  // cenas
  const list = h('div', { class: 'cenas' });
  P.blocos.forEach((b, i) => {
    const def = BLOCKS[b.tipo]; b.dados = b.dados || {};
    const tl = h('span', { class: 'tempo' }); timeLabels[i] = tl;
    const body = h('div', { class: 'corpo' }, h('p', { class: 'desc' }, def.desc), def.campos.map(f => field(b.dados, f)));
    const det = h('details', { class: 'cena', open: !!b._aberto, ontoggle: e => { b._aberto = e.target.open; } },
      h('summary', {},
        h('span', { class: 'num' }, String(i + 1)),
        h('span', { class: 'nome' }, def.nome), tl,
        h('span', { class: 'acoes' },
          h('button', { type: 'button', title: 'Ver na prévia', onclick: e => { e.preventDefault(); pause(); tNow = (TL?.scenes[i]?.a || 0) + .02; requestDraw(); } }, '👁'),
          h('button', { type: 'button', title: 'Subir', disabled: i === 0, onclick: e => { e.preventDefault(); [P.blocos[i - 1], P.blocos[i]] = [P.blocos[i], P.blocos[i - 1]]; changed(true); } }, '↑'),
          h('button', { type: 'button', title: 'Descer', disabled: i === P.blocos.length - 1, onclick: e => { e.preventDefault(); [P.blocos[i + 1], P.blocos[i]] = [P.blocos[i], P.blocos[i + 1]]; changed(true); } }, '↓'),
          h('button', { type: 'button', title: 'Duplicar', onclick: e => { e.preventDefault(); P.blocos.splice(i + 1, 0, clone(b)); changed(true); } }, '⧉'),
          h('button', { type: 'button', title: 'Remover', onclick: e => { e.preventDefault(); if (confirm('Remover esta cena?')) { P.blocos.splice(i, 1); changed(true); } } }, '✕'),
        )),
      body);
    list.append(det);
  });
  const add = select([['', '+ Adicionar cena…'], ...Object.entries(BLOCKS).map(([k, d]) => [k, d.nome])], '', v => {
    if (!v) return; P.blocos.push({ tipo: v, dados: {}, _aberto: true }); changed(true);
  });
  root.append(h('section', { class: 'card' },
    h('h2', {}, 'Cenas ', h('small', {}, 'o tempo de cada cena é ajustado sozinho para o vídeo ter 30 s')),
    h('div', { id: 'aviso', class: 'aviso', hidden: true }),
    list, h('div', { class: 'add' }, add),
    h('div', { class: 'dica' }, h('b', {}, 'Dica de texto: '), 'use ', h('code', {}, '*palavras*'), ' para destacar na cor principal, ', h('code', {}, '~palavras~'), ' na cor secundária, ', h('code', {}, '_palavras_'), ' em itálico e ', h('code', {}, '|'), ' para quebrar a linha.')
  ));
  // cartela
  const K = P.cartela = P.cartela || { ativa: true };
  root.append(h('section', { class: 'card' },
    h('h2', {}, 'Cartela final'),
    field(K, { k: 'ativa', tipo: 'check', rotulo: 'Terminar com a cartela (últimos 4 s)' }),
    h('div', { class: 'campo' }, h('button', { type: 'button', class: 'link', onclick: () => { pause(); tNow = END_A + .02; play(); } }, '▶ ver a cartela na prévia')),
    field(K, { k: 'chamada', rotulo: 'Chamada', ajuda: 'Ex.: Conheça o Brasil que produz café!' }),
    field(K, { k: 'titulo', rotulo: 'Nome do painel / projeto' }),
    field(K, { k: 'subtitulo', rotulo: 'Frase abaixo do nome' }),
    field(K, { k: 'logo', tipo: 'imagem', rotulo: 'Logo (PNG com fundo transparente)' }),
    field(K, { k: 'assinatura', rotulo: 'Unidades / assinatura', ajuda: 'Ex.: Embrapa Café | Embrapa Territorial' }),
    field(K, { k: 'link', rotulo: 'Link' }),
  ));
  updateTimes();
}

// ---------- arquivo ----------
function download(blob, name) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
const fileName = ext => `Números que Contam - ${(P.tema || 'vídeo').trim()}.${ext}`;
$('#salvar').onclick = () => { const o = clone(P); (o.blocos || []).forEach(b => delete b._aberto); download(new Blob([JSON.stringify(o, null, 1)], { type: 'application/json' }), fileName('json')); };
$('#abrir').onclick = () => $('#abrirArq').click();
$('#abrirArq').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const fr = new FileReader(); fr.onload = () => { try { P = JSON.parse(fr.result); pause(); tNow = 0; changed(true); } catch (err) { alert('Não consegui ler este arquivo de projeto.'); } }; fr.readAsText(f);
  e.target.value = '';
};
$('#exemplo').onclick = () => { if (confirm('Carregar o exemplo do café? O projeto atual será substituído (salve antes, se quiser).')) { P = clone(EXEMPLO); pause(); tNow = 0; changed(true); } };
$('#novo').onclick = () => { if (confirm('Começar um projeto em branco? O projeto atual será substituído (salve antes, se quiser).')) { P = clone(VAZIO); P.blocos.forEach(b => b._aberto = false); P.blocos[0]._aberto = true; pause(); tNow = 0; changed(true); } };

// ---------- exportar ----------
let cancel = false;
$('#gerar').onclick = async () => {
  pause();
  const dlg = $('#progresso'), bar = $('#pbar'), txt = $('#ptxt');
  cancel = false; dlg.showModal(); $('#pcancel').hidden = false; $('#pfechar').hidden = true;
  const t0 = performance.now();
  try {
    const blob = await exportMP4(P, (p, m) => { bar.value = p; txt.textContent = m; }, () => cancel);
    download(blob, fileName('mp4'));
    txt.textContent = `Vídeo pronto (${(blob.size / 1e6).toFixed(1).replace('.', ',')} MB, ${((performance.now() - t0) / 1000).toFixed(0)} s). O download começou.`;
  } catch (e) {
    txt.textContent = e.message === 'cancelado' ? 'Geração cancelada.' : 'Não foi possível gerar o vídeo: ' + e.message;
    console.error(e);
  }
  $('#pcancel').hidden = true; $('#pfechar').hidden = false;
};
$('#pcancel').onclick = () => { cancel = true; };
$('#pfechar').onclick = () => $('#progresso').close();
if (!exportSupported()) { $('#suporte').hidden = false; }

// ---------- início ----------
Promise.all([
  document.fonts.load('bold 40px "DejaVu Sans"'), document.fonts.load('40px "DejaVu Sans"'), document.fonts.load('italic 40px "DejaVu Serif"'),
]).catch(() => { }).then(() => { renderForm(); dirty = true; requestDraw(); window.APP_READY = true; });
