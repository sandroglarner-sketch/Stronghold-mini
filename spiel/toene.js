  // ---------- Akustik ----------
  // Alle Töne werden mit WebAudio erzeugt (keine Dateien). Der Ton startet erst nach dem ersten Tippen oder Klicken.
  var audio = { ctx: null, master: null, noise: null, on: true, last: {} };
  try { if (localStorage.getItem('kasernenkrieg-sound') === '0') audio.on = false; } catch (err) {}
  function audioInit() {
    if (audio.ctx) { if (audio.ctx.state === 'suspended') { try { audio.ctx.resume(); } catch (err) {} } return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      var c = new AC(), comp = c.createDynamicsCompressor();
      audio.master = c.createGain();
      audio.master.gain.value = 0.4;
      audio.master.connect(comp);
      comp.connect(c.destination);
      var buf = c.createBuffer(1, Math.floor(c.sampleRate * 0.6), c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      audio.noise = buf;
      audio.ctx = c;
    } catch (err) { audio.ctx = null; }
  }
  ['pointerdown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, audioInit, true); });
  function audioOn() { return audio.on && audio.ctx; }
  function audioOut(node, pan) {
    var c = audio.ctx;
    if (pan && c.createStereoPanner) {
      var p = c.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      node.connect(p);
      p.connect(audio.master);
    } else node.connect(audio.master);
  }
  function envelope(g, t, dur, vol) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  function tone(f0, f1, dur, type, vol, pan, delay) {
    var c = audio.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    envelope(g, t, dur, vol);
    o.connect(g);
    audioOut(g, pan);
    o.start(t);
    o.stop(t + dur + 0.03);
  }
  function hiss(dur, vol, f0, f1, q, pan, type) {
    var c = audio.ctx, t = c.currentTime, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = audio.noise;
    f.type = type || 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    envelope(g, t, dur, vol);
    s.connect(f);
    f.connect(g);
    audioOut(g, pan);
    s.start(t);
    s.stop(t + dur + 0.03);
  }
  // Pro Art höchstens alle gap Sekunden, damit große Heere kein Dauerrauschen erzeugen
  function gate(kind, gap) {
    var n = audio.ctx.currentTime;
    if (audio.last[kind] !== undefined && n - audio.last[kind] < gap) return false;
    audio.last[kind] = n;
    return true;
  }
  function sfx(e) {
    if (!audioOn()) return;
    var x = e.x1 !== undefined ? e.x1 : e.x, pan = x === undefined ? 0 : (x / W - 0.5) * 1.2;
    if (e.kind === 'arrow') { if (gate('arrow', 0.05)) { hiss(0.09, 0.22, 3600, 1300, 2, pan); tone(1300, 520, 0.08, 'triangle', 0.07, pan); } }
    else if (e.kind === 'block') { if (gate('block', 0.08)) { tone(1500, 900, 0.06, 'square', 0.05, pan); hiss(0.05, 0.14, 4000, 2500, 2, pan); } }
    else if (e.kind === 'bolthit') { if (gate('bolthit', 0.06)) { hiss(0.08, 0.3, 1800, 300, 1, pan); tone(260, 90, 0.09, 'square', 0.08, pan); } }
    else if (e.kind === 'oblast') { if (gate('oblast', 0.08)) { hiss(0.35, 0.45, 800, 90, 0.8, pan, 'lowpass'); tone(95, 35, 0.32, 'sine', 0.32, pan); tone(220, 70, 0.1, 'square', 0.08, pan); } }
    else if (e.kind === 'rock') { if (gate('rock', 0.1)) { tone(130, 60, 0.18, 'square', 0.06, pan); hiss(0.14, 0.16, 1600, 500, 1, pan); } }
    else if (e.kind === 'slam') { if (gate('slam', 0.1)) { hiss(0.12, 0.35, 500, 120, 0.8, pan, 'lowpass'); tone(110, 50, 0.14, 'square', 0.12, pan); } }
    else if (e.kind === 'stab') { if (gate('stab', 0.05)) { hiss(0.07, 0.28, 1000, 300, 1, pan); tone(190, 90, 0.07, 'square', 0.06, pan); } }
    else if (e.kind === 'orb') { if (gate('orb', 0.12)) tone(320, 950, 0.25, 'sine', 0.11, pan); }
    else if (e.kind === 'blast') { if (gate('blast', 0.1)) { hiss(0.4, 0.45, 700, 90, 0.7, pan, 'lowpass'); tone(120, 40, 0.35, 'sine', 0.32, pan); } }
    else if (e.kind === 'fball') { if (gate('fball', 0.15)) { hiss(0.35, 0.18, 900, 250, 1, pan, 'lowpass'); tone(240, 520, 0.3, 'sawtooth', 0.05, pan); } }
    else if (e.kind === 'fblast') { if (gate('fblast', 0.1)) { hiss(0.45, 0.5, 900, 80, 0.9, pan, 'lowpass'); tone(95, 38, 0.4, 'sine', 0.34, pan); } }
    else if (e.kind === 'dig') { if (gate('dig', 0.14)) { hiss(0.16, 0.13, 420, 110, 0.9, pan, 'lowpass'); tone(78, 52, 0.15, 'square', 0.035, pan); } }
    else if (e.kind === 'puff') { if (gate('puff', 0.06)) { tone(280, 90, 0.14, 'triangle', 0.11, pan); hiss(0.12, 0.1, 1600, 400, 1, pan); } }
    else if (e.kind === 'stone') { if (gate('treb', 0.6)) { // Trebuchet schleudert: Holz knarrt, Arm schlägt, Steine sausen los
      tone(95, 55, 0.35, 'sawtooth', 0.07, pan); hiss(0.18, 0.18, 300, 90, 0.8, pan, 'lowpass');
      hiss(0.5, 0.2, 700, 2600, 1.2, pan); tone(180, 110, 0.12, 'square', 0.05, pan, 0.05); } }
    else if (e.kind === 'sblast') { if (gate('sblast', 0.04)) { hiss(0.22, 0.26, 600, 110, 0.9, pan, 'lowpass'); tone(85, 45, 0.18, 'sine', 0.16, pan); } } // Einschlag: dumpfer Steinschlag mit Staub
    else if (e.kind === 'page') { hiss(0.32, 0.12, 2600, 700, 0.7, 0); }
    else if (e.kind === 'text' && e.x < W / 2 && !e.farmer) { if (gate('coin', 0.1)) { tone(988, 988, 0.09, 'square', 0.05, 0); tone(1319, 1319, 0.2, 'square', 0.05, 0, 0.08); } }
  }
  function sfxBuy(type, ok) {
    if (!audioOn()) return;
    if (!ok) { tone(150, 100, 0.14, 'sawtooth', 0.08, 0); return; }
    var f = 300 + TYPES.indexOf(type) * 45;
    tone(f, f * 1.5, 0.1, 'square', 0.06, 0);
    if (type === 'digger') hiss(0.25, 0.2, 400, 120, 1, 0, 'lowpass');
  }
  function jingle(kind) {
    if (!audioOn()) return;
    var seq = kind === 'win' ? [523, 659, 784, 1047] : kind === 'start' ? [392, 523] : [392, 330, 262, 196];
    seq.forEach(function (f, i) { tone(f, f, 0.22, kind === 'lose' ? 'sawtooth' : 'triangle', 0.1, 0, i * (kind === 'start' ? 0.12 : 0.15)); });
  }
  var soundBtn = $('soundBtn');
  function syncSoundBtn() {
    soundBtn.textContent = audio.on ? 'Ton an' : 'Ton aus';
    soundBtn.setAttribute('aria-pressed', audio.on ? 'true' : 'false');
  }
  syncSoundBtn();
  soundBtn.addEventListener('click', function (e) {
    audio.on = !audio.on;
    try { localStorage.setItem('kasernenkrieg-sound', audio.on ? '1' : '0'); } catch (err) {}
    syncSoundBtn();
    if (audio.on) jingle('start');
    if (e.detail > 0) soundBtn.blur();
  });

