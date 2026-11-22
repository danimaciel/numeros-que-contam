// ===== Cartela avulsa — interface e exportação =====
const $ = s => document.querySelector(s);
const CDUR = 5.0, CSTORE = 'nqc-cartela-v1';
const CPADRAO = {
  formato: 'v', serie: 'Números que Contam', chamada: '', titulo: '', subtitulo: '',
  logo: 'assets/exemplo/logo-embrapa.png', assinatura: 'Embrapa Territorial', link: 'www.embrapa.br/territorial', cor: '#E3B76F', fundo: '#0c1611', som: true
};
let K = Object.assign({}, CPADRAO);
try { const s = localStorage.getItem(CSTORE); if (s) K = Object.assign(K, JSON.parse(s)); } catch (e) { }

const _imgs = new Map();
function IMG(src) {
  if (!src) return null;
  let im = _imgs.get(src);
  if (!im) { im = new Image(); im.onload = () => requestDraw(); im.src = src; _imgs.set(src, im); }
  return im.complete && im.naturalWidth ? im : null;
}
const waitImg = src => new Promise(r => { if (!src) return r(); IMG(src); const im = _imgs.get(src); if (im.complete) r(); else { im.onload = () => { r(); requestDraw(); }; im.onerror = r; } });
const dims = () => K.formato === 'h' ? [1920, 1080] : [1080, 1920];

function renderCartela(ctx, t, scale) {
  SC = scale; ctx.setTransform(scale, 0, 0, scale, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none';
  T.accent = K.cor || '#E3B76F'; T.bg = K.fundo || '#0c1611';
  const KK = Object.assign({}, K, { serie: K.serie });
  (K.formato === 'h' ? drawEndcardH : drawEndcard)(ctx, t, KK);
}

// ---------- prévia ----------
const cv = $('#preview'); let pctx = cv.getContext('2d', { alpha: false });
let tNow = 0, playing = false, t0 = 0, tStart = 0, queued = false;
function sizePreview() {
  const [w, h] = dims(); cv.width = w / 2; cv.height = h / 2; pctx = cv.getContext('2d', { alpha: false });
  $('#main').classList.toggle('h', K.formato === 'h');
}
function requestDraw() { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; drawNow(); }); } }
function drawNow() { renderCartela(pctx, tNow, .5); $('#tempo').value = tNow; $('#tempoTxt').textContent = tNow.toFixed(1).replace('.', ',') + ' s'; }
function play() {
  if (tNow >= CDUR - .05) tNow = 0;
  playing = true; $('#play').textContent = '❚❚'; t0 = performance.now(); tStart = tNow;
  const step = () => { if (!playing) return; tNow = tStart + (performance.now() - t0) / 1000; if (tNow >= CDUR) { tNow = CDUR - 1 / 30; pause(); } drawNow(); if (playing) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function pause() { playing = false; $('#play').textContent = '▶'; }
$('#play').onclick = () => playing ? pause() : play();
$('#inicio').onclick = () => { pause(); tNow = 0; requestDraw(); };
$('#tempo').oninput = e => { pause(); tNow = +e.target.value; requestDraw(); };

// ---------- formulário ----------
function save() { try { localStorage.setItem(CSTORE, JSON.stringify(K)); } catch (e) { } }
function changed() { save(); requestDraw(); }
document.querySelectorAll('input[name=fmt]').forEach(r => {
  r.checked = r.value === K.formato;
  r.onchange = () => { K.formato = r.value; sizePreview(); changed(); };
});
const CAMPOS = [
  ['serie', 'Marca no topo', 'Deixe em branco para não mostrar. Ex.: Números que Contam'],
  ['chamada', 'Chamada (opcional)', 'Ex.: Conheça o Brasil que produz café!'],
  ['titulo', 'Nome do painel / projeto (opcional)', ''],
  ['subtitulo', 'Frase abaixo do nome (opcional)', ''],
  ['assinatura', 'Unidades / assinatura', 'Ex.: Embrapa Territorial'],
  ['link', 'Link', 'Ex.: www.embrapa.br/territorial'],
];
const box = $('#campos');
for (const [k, rot, aj] of CAMPOS) {
  const d = document.createElement('div'); d.className = 'campo';
  d.innerHTML = `<label for="c_${k}">${rot}</label><input id="c_${k}" type="text">${aj ? `<div class="ajuda">${aj}</div>` : ''}`;
  box.append(d);
  const inp = d.querySelector('input'); inp.value = K[k] || ''; inp.oninput = () => { K[k] = inp.value; changed(); };
}
{
  const d = document.createElement('div'); d.className = 'campo';
  d.innerHTML = `<label>Logo (PNG com fundo transparente)</label><div class="imgrow"><div class="thumb" id="lthumb"></div><div><input type="file" accept="image/*" id="lfile"> <button type="button" class="link" id="lpadrao">usar logo da Embrapa</button></div></div>`;
  box.append(d);
  const paint = () => { $('#lthumb').innerHTML = K.logo ? `<img src="${K.logo}" alt="" style="object-fit:contain">` : '<span>sem logo</span>'; };
  paint();
  $('#lfile').onchange = e => { const f = e.target.files[0]; if (!f) return; const fr = new FileReader(); fr.onload = () => { K.logo = fr.result; paint(); waitImg(K.logo).then(changed); }; fr.readAsDataURL(f); };
  $('#lpadrao').onclick = () => { K.logo = CPADRAO.logo; paint(); waitImg(K.logo).then(changed); };
  const c = document.createElement('div'); c.className = 'grid2';
  c.innerHTML = `<div class="campo"><label for="c_cor">Cor de destaque</label><input id="c_cor" type="color" style="width:60px;height:38px"></div><div class="campo"><label for="c_fundo">Cor de fundo</label><select id="c_fundo"></select></div><div class="campo check"><input id="c_som" type="checkbox"><label for="c_som">Efeito sonoro (whoosh)</label></div>`;
  box.append(c);
  const sf = $('#c_fundo'); FUNDOS.forEach(([n, c]) => sf.add(new Option(n, c))); sf.value = K.fundo || FUNDOS[0][1]; sf.onchange = () => { K.fundo = sf.value; changed(); };
  $('#c_cor').value = K.cor; $('#c_cor').oninput = e => { K.cor = e.target.value; changed(); };
  $('#c_som').checked = K.som !== false; $('#c_som').onchange = e => { K.som = e.target.checked; save(); };
}

// ---------- exportação ----------
async function exportCartela(onProgress = () => { }) {
  if (!exportSupported()) throw new Error('Use o Google Chrome ou o Microsoft Edge atualizados.');
  await waitImg(K.logo);
  const [w, h] = dims();
  const ac = new OfflineAudioContext(2, Math.round(SR * CDUR), SR);
  if (K.som !== false) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000; lp.connect(ac.destination);
    const bank = sfxBank();
    [[bank.rise, 0, .3], [bank.whoosh, 2.55, .22]].forEach(([data, t, v]) => {
      const b = ac.createBuffer(1, data.length, SR); b.copyToChannel(data, 0);
      const s = ac.createBufferSource(); s.buffer = b; const g = ac.createGain(); g.gain.value = v; s.connect(g).connect(lp); s.start(t);
    });
  }
  const audio = await ac.startRendering();
  const vcfg = await pickVideoConfig(w, h), acfg = await pickAudioConfig();
  const target = new Mp4Muxer.ArrayBufferTarget();
  const muxer = new Mp4Muxer.Muxer({ target, fastStart: 'in-memory', firstTimestampBehavior: 'offset', video: { codec: 'avc', width: w, height: h, frameRate: FPS }, audio: acfg ? { codec: acfg.mux, sampleRate: SR, numberOfChannels: 2 } : undefined });
  let err = null;
  const mix = interleaver(muxer, await encodeAudioChunks(audio, acfg));
  const venc = new VideoEncoder({ output: (c, m) => mix.video(c, m), error: e => err = e });
  venc.configure(vcfg);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d', { alpha: false });
  const N = Math.round(CDUR * FPS), us = 1e6 / FPS;
  for (let i = 0; i < N; i++) {
    if (err) throw err;
    renderCartela(ctx, i / FPS, 1);
    const f = new VideoFrame(c, { timestamp: Math.round(i * us), duration: Math.round(us) });
    venc.encode(f, { keyFrame: i % 60 === 0 }); f.close();
    while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
    if (i % 5 === 0) { onProgress(i / N * .95, `Gerando quadros… ${i}/${N}`); await new Promise(r => setTimeout(r, 0)); }
  }
  await venc.flush(); venc.close();
  mix.rest();
  if (err) throw err;
  muxer.finalize(); onProgress(1, 'Pronto!');
  return new Blob([target.buffer], { type: 'video/mp4' });
}
const cartelaNome = () => `Cartela ${K.formato === 'h' ? '16x9' : '9x16'} - ${(K.titulo || K.assinatura || 'Embrapa').replace(/[\\/:*?"<>|]/g, '')}.mp4`;
$('#gerar').onclick = async () => {
  pause(); const dlg = $('#progresso'); dlg.showModal();
  try {
    const blob = await exportCartela((p, m) => { $('#pbar').value = p; $('#ptxt').textContent = m; });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = cartelaNome(); document.body.append(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    $('#ptxt').textContent = 'Cartela pronta. O download começou.';
  } catch (e) { $('#ptxt').textContent = 'Não foi possível gerar: ' + e.message; console.error(e); }
};
$('#pfechar').onclick = () => $('#progresso').close();
if (!exportSupported()) $('#suporte').hidden = false;

Promise.all([document.fonts.load('bold 40px "DejaVu Sans"'), document.fonts.load('40px "DejaVu Sans"'), waitImg(K.logo)])
  .catch(() => { }).then(() => { sizePreview(); drawNow(); window.APP_READY = true; });
