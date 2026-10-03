// Browser transport: plays the film against the Web Audio clock, renders at preview scale while playing.
import { makeBus, buildScore, VO, FADE } from './audio.js';

export function player({ frame, setScale, SHOTS, DUR }) {
  const $ = s => document.querySelector(s), SCORE = buildScore();
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  let playing = false, cur = 11.2, from = 0, wall0 = 0, poster = true, sound = true, hq = false, actx = null, bus = null, ctxStart = 0, evIdx = 0, timer = null, raf = 0;
  const chap = $('#chap');
  chap.innerHTML = SHOTS.map(s => `<li><button type="button" data-t="${s.a}"><b>${s.n}</b><span>${fmt(s.a)}</span></button></li>`).join('');
  const btns = [...chap.querySelectorAll('button')];
  const now = () => (!playing ? cur : actx && sound && bus ? from + (actx.currentTime - ctxStart) : from + (performance.now() - wall0) / 1000);
  function tick() {
    const hz = from + (actx.currentTime - ctxStart) + .5;
    while (evIdx < SCORE.length && SCORE[evIdx].t < hz) { const e = SCORE[evIdx++]; if (e.t >= from - .001) VO[e.fn](bus, ctxStart + (e.t - from), ...e.a); }
  }
  function startAudio(t) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)(); actx.resume();
      bus = makeBus(actx, actx.destination); ctxStart = actx.currentTime + .1;
      if (t < FADE[0]) { bus.master.gain.setValueAtTime(.9, ctxStart + FADE[0] - t); bus.master.gain.linearRampToValueAtTime(0, ctxStart + FADE[1] - t); }
      evIdx = SCORE.findIndex(e => e.t >= t - .001); if (evIdx < 0) evIdx = SCORE.length;
      tick(); timer = setInterval(tick, 50);
    } catch (e) { bus = null; }
  }
  function stopAudio() {
    clearInterval(timer); timer = null;
    if (bus) { const b = bus; b.master.gain.cancelScheduledValues(actx.currentTime); b.master.gain.setTargetAtTime(0, actx.currentTime, .03); setTimeout(() => b.master.disconnect(), 400); bus = null; }
  }
  function ui(t) {
    $('#time').textContent = `${fmt(t)} / ${fmt(DUR)}`; $('#scrub').value = t.toFixed(2);
    $('#play').textContent = playing ? 'Pause' : t >= DUR - .02 ? 'Replay' : 'Play';
    const k = SHOTS.findIndex(s => t >= s.a && t < s.b); btns.forEach((b, i) => b.setAttribute('aria-current', i === k ? 'true' : 'false'));
    $('#bigplay').hidden = playing || !(poster || t >= DUR - .02);
    $('#bigplayt').textContent = t >= DUR - .02 ? 'Replay' : 'Play with sound';
  }
  function loop() {
    if (!playing) return;
    const t = now();
    if (t >= DUR) { cur = DUR - .001; playing = false; stopAudio(); setScale(1); frame(cur); ui(DUR); return; }
    frame(t); ui(t); raf = requestAnimationFrame(loop);
  }
  function play() {
    if (cur >= DUR - .02) cur = 0;
    poster = false; playing = true; from = cur; wall0 = performance.now(); setScale(hq ? 1 : .5);
    if (sound) startAudio(cur);
    cancelAnimationFrame(raf); loop();
  }
  function pause() { cur = now(); playing = false; stopAudio(); cancelAnimationFrame(raf); setScale(1); frame(cur); ui(cur); }
  function seek(t) { const was = playing; if (was) pause(); cur = Math.min(DUR - .001, Math.max(0, t)); poster = false; setScale(1); frame(cur); ui(cur); if (was) play(); }
  $('#play').onclick = () => (playing ? pause() : play());
  $('#bigplay').onclick = () => { sound = true; syncSnd(); play(); };
  $('#scrub').oninput = e => seek(+e.target.value);
  const syncSnd = () => { const b = $('#snd'); b.textContent = sound ? 'Sound on' : 'Sound off'; b.setAttribute('aria-pressed', String(sound)); };
  $('#snd').onclick = () => { const was = playing; if (was) pause(); sound = !sound; syncSnd(); if (was) play(); };
  $('#hq').onclick = () => { hq = !hq; $('#hq').setAttribute('aria-pressed', String(hq)); $('#hq').textContent = hq ? 'Full res' : 'Preview res'; if (playing) setScale(hq ? 1 : .5); };
  $('#fs').onclick = () => { try { document.fullscreenElement ? document.exitFullscreen() : $('#frame').requestFullscreen().catch(() => {}); } catch (e) {} };
  chap.onclick = e => { const b = e.target.closest('button'); if (b) seek(+b.dataset.t + .01); };
  document.addEventListener('keydown', e => {
    if (e.target.closest('input,button') && e.code === 'Space') return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') seek(now() + 5);
    else if (e.code === 'ArrowLeft') seek(now() - 5);
  });
  ui(cur);
}
