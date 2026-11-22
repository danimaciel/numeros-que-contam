// ===== Números que Contam — exportação MP4 no navegador (WebCodecs + mp4-muxer) =====
function exportSupported() { return typeof VideoEncoder !== 'undefined' && typeof AudioEncoder !== 'undefined' && typeof Mp4Muxer !== 'undefined'; }

async function pickVideoConfig(w = W, h = H) {
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.640033']) {
    for (const hardwareAcceleration of ['prefer-hardware', 'no-preference', 'prefer-software']) {
      const cfg = { codec, width: w, height: h, bitrate: 6e6, framerate: FPS, hardwareAcceleration, avc: { format: 'avc' } };
      try { if ((await VideoEncoder.isConfigSupported(cfg)).supported) return cfg; } catch (e) { }
    }
  }
  throw new Error('Este navegador não consegue gerar vídeo H.264. Use o Google Chrome ou o Microsoft Edge atualizados.');
}
async function pickAudioConfig() {
  for (const [codec, mux] of [['mp4a.40.2', 'aac'], ['opus', 'opus']]) {
    const cfg = { codec, sampleRate: SR, numberOfChannels: 2, bitrate: 192000 };
    try { if ((await AudioEncoder.isConfigSupported(cfg)).supported) return { cfg, mux }; } catch (e) { }
  }
  return null;
}

// codifica o áudio inteiro antes do vídeo e guarda os pedaços, para depois intercalá-los
async function encodeAudioChunks(audio, acfg) {
  if (!acfg) return [];
  const out = []; let err = null;
  const aenc = new AudioEncoder({ output: (c, m) => out.push([c, m]), error: e => err = e });
  aenc.configure(acfg.cfg);
  const L = audio.getChannelData(0), R = audio.getChannelData(1), step = 4800;
  for (let off = 0; off < L.length; off += step) {
    const n = Math.min(step, L.length - off), data = new Float32Array(n * 2);
    data.set(L.subarray(off, off + n), 0); data.set(R.subarray(off, off + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: SR, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round(off / SR * 1e6), data });
    aenc.encode(ad); ad.close();
  }
  await aenc.flush(); aenc.close();
  if (err) throw err;
  return out;
}
// intercala áudio e vídeo no MP4 (sem isso, o áudio fica todo no fim do arquivo e trava em muitos players)
function interleaver(muxer, aChunks) {
  let ai = 0;
  const flushTo = t => { while (ai < aChunks.length && aChunks[ai][0].timestamp <= t) { muxer.addAudioChunk(aChunks[ai][0], aChunks[ai][1]); ai++; } };
  return { video(c, m) { flushTo(c.timestamp); muxer.addVideoChunk(c, m); }, rest() { flushTo(Infinity); } };
}

// onProgress(fração, texto); retorna Blob
async function exportMP4(P, onProgress = () => { }, isCancelled = () => false) {
  if (!exportSupported()) throw new Error('Este navegador não tem os recursos de vídeo necessários. Use o Google Chrome ou o Microsoft Edge atualizados.');
  await waitImages();
  const TL = buildTimeline(P);
  onProgress(0, 'Preparando a trilha…');
  const audio = await mixAudio(TL, P);
  const vcfg = await pickVideoConfig();
  const acfg = await pickAudioConfig();
  const target = new Mp4Muxer.ArrayBufferTarget();
  const muxer = new Mp4Muxer.Muxer({
    target, fastStart: 'in-memory', firstTimestampBehavior: 'offset',
    video: { codec: 'avc', width: W, height: H, frameRate: FPS },
    audio: acfg ? { codec: acfg.mux, sampleRate: SR, numberOfChannels: 2 } : undefined,
  });
  let err = null;
  onProgress(.01, 'Codificando o áudio…');
  const mix = interleaver(muxer, await encodeAudioChunks(audio, acfg));
  const venc = new VideoEncoder({ output: (c, m) => mix.video(c, m), error: e => err = e });
  venc.configure(vcfg);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { alpha: false });
  const N = Math.round(TL.total * FPS), us = 1e6 / FPS;
  for (let i = 0; i < N; i++) {
    if (err) throw err;
    if (isCancelled()) { venc.close(); throw new Error('cancelado'); }
    render(ctx, i / FPS, TL, 1);
    const f = new VideoFrame(cv, { timestamp: Math.round(i * us), duration: Math.round(us) });
    venc.encode(f, { keyFrame: i % 60 === 0 }); f.close();
    while (venc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 2));
    if (i % 6 === 0) { onProgress(i / N * .95, `Gerando quadros… ${i}/${N}`); await new Promise(r => setTimeout(r, 0)); }
  }
  await venc.flush(); venc.close();
  if (err) throw err;
  mix.rest();
  muxer.finalize();
  onProgress(1, 'Pronto!');
  return new Blob([target.buffer], { type: 'video/mp4' });
}
