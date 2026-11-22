// ===== Números que Contam — trilha e efeitos sonoros =====
const SR = 48000;
const MUSICAS = [
  { id: 'inovacao', nome: 'Inovação — Dmitrii Kolesnikov (Pixabay)', arq: 'assets/musicas/inovacao.mp3', ini: 9.6 },
  { id: 'ambiente', nome: 'Ambiente — Dmitrii Kolesnikov (Pixabay)', arq: 'assets/musicas/ambiente.mp3', ini: 13 },
  { id: 'trailer', nome: 'Trailer — Dmitrii Kolesnikov (Pixabay)', arq: 'assets/musicas/trailer.mp3', ini: 10.5 },
  { id: 'propria', nome: 'Minha música (enviar arquivo)' },
  { id: 'nenhuma', nome: 'Sem música' },
];
const _decoded = new Map();
async function decodeAudio(src) {
  if (_decoded.has(src)) return _decoded.get(src);
  const buf = await (await fetch(src)).arrayBuffer();
  const ac = new OfflineAudioContext(2, SR, SR);
  const d = await ac.decodeAudioData(buf);
  _decoded.set(src, d); return d;
}
// ruído com filtro passa-baixa que varre a frequência (mesmo "whoosh" dos vídeos do café)
function makeWhoosh(dur, f0, f1, amp, seed) {
  const n = Math.floor(SR * dur), y = new Float32Array(n);
  let s = seed || 7, a = 0;
  // ruído gaussiano (Box-Muller), igual ao usado nos vídeos do café; ruído uniforme deixava o efeito ~8 dB mais alto e áspero
  const uni = () => { s = (s * 16807) % 2147483647; return (s + 1) / 2147483648; };
  let spare = null;
  const rnd = () => { if (spare !== null) { const v = spare; spare = null; return v; } const u = uni(), v = uni(), r = Math.sqrt(-2 * Math.log(u)); spare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v); };
  for (let i = 0; i < n; i++) {
    const t = i / SR, fc = f0 * Math.pow(f1 / f0, Math.pow(Math.sin(Math.PI * t / dur), 1.2));
    const k = 1 - Math.exp(-2 * Math.PI * fc / SR); a += k * (rnd() - a); y[i] = a;
  }
  // remove grave (subtrai média móvel)
  const out = new Float32Array(n); let acc = 0; const M = 40;
  for (let i = 0; i < n; i++) { acc += y[i] - (i >= M ? y[i - M] : 0); out[i] = y[i] - .6 * acc / M; }
  let mx = 0;
  for (let i = 0; i < n; i++) { const env = Math.pow(Math.sin(Math.PI * clamp(i / n)), 2); out[i] *= env; mx = Math.max(mx, Math.abs(out[i])); }
  for (let i = 0; i < n; i++) out[i] = amp * out[i] / (mx || 1);
  return out;
}
let _sfx = null;
// som da vinheta: tiques de contador que aceleram e fecham num acorde suave
function makeSting() {
  const n = Math.floor(SR * 1.9), y = new Float32Array(n);
  const tick = (t0, f, amp) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < SR * .03 && i0 + i < n; i++) { const t = i / SR; y[i0 + i] += amp * Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 180); } };
  let t = .2, dt = .06;
  for (let k = 0; t < .74; k++) { tick(t, 2300 + (k % 3) * 260, .22); t += dt; dt = Math.max(.028, dt * .9); }
  // acorde (lá menor com nona) quando as letras travam
  const lockT = .78, notes = [220, 329.63, 440, 493.88, 659.25];
  for (let i = Math.floor(lockT * SR); i < n; i++) {
    const tt = (i - lockT * SR) / SR, env = Math.min(1, tt / .015) * Math.exp(-tt * 2.4);
    let v = 0; notes.forEach((f, j) => { v += Math.sin(2 * Math.PI * f * tt + j) * (j ? .55 : .8); });
    y[i] += v * env * .085;
  }
  // sopro sutil até a trava
  const w = makeWhoosh(.8, 200, 3000, .18, 23); for (let i = 0; i < w.length && i < n; i++) y[i] += w[i];
  return y;
}
function sfxBank() { return _sfx || (_sfx = { whoosh: makeWhoosh(.55, 300, 3800, .5, 7), rise: makeWhoosh(1.2, 150, 2500, .45, 11), vinheta: makeSting() }); }

// mistura final (30 s, estéreo, 48 kHz)
async function mixAudio(TL, P) {
  const ac = new OfflineAudioContext(2, Math.round(SR * TL.total), SR);
  const m = MUSICAS.find(x => x.id === (P.musica || 'inovacao')) || MUSICAS[0];
  let src = m.arq, ini = m.ini || 0;
  if (m.id === 'propria') { src = P.musicaArquivo || null; ini = parseNum(P.musicaInicio).v || 0; }
  if (m.id !== 'nenhuma' && src) {
    try {
      const buf = await decodeAudio(src);
      const s = ac.createBufferSource(); s.buffer = buf;
      const g = ac.createGain();
      const v = .6, end = TL.total;
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(v, .25);
      g.gain.setValueAtTime(v, end - 1.8); g.gain.linearRampToValueAtTime(0, end);
      s.connect(g).connect(ac.destination);
      s.start(0, Math.min(ini, Math.max(0, buf.duration - 1)));
    } catch (e) { console.warn('música não carregou', e); }
  }
  if (P.efeitos !== false) {
    const bank = sfxBank();
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000; lp.connect(ac.destination);
    for (const c of TL.cues) {
      const data = bank[c.type] || bank.whoosh;
      const b = ac.createBuffer(1, data.length, SR); b.copyToChannel(data, 0);
      const s = ac.createBufferSource(); s.buffer = b;
      const g = ac.createGain(); g.gain.value = (c.type === 'vinheta' ? 1 : .32) * (c.amp || 1);
      s.connect(g).connect(lp);
      s.start(Math.max(0, c.t - (c.type === 'whoosh' ? .18 : 0)));
    }
  }
  const out = await ac.startRendering();
  // limitador simples
  for (let ch = 0; ch < 2; ch++) { const d = out.getChannelData(ch); for (let i = 0; i < d.length; i++) d[i] = Math.max(-.95, Math.min(.95, d[i])); }
  return out;
}
