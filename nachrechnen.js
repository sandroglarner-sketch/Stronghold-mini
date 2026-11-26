'use strict';
// Story-Sieg prüfen (26.11.): der Server rechnet eine Bot-Partie aus Startwert und Käufen selbst nach (ohne Browser).
// Grundlage: Bot-Partien sind deterministisch (simRand, hyp/dsin …, feste Schritte BL_STEP). Der Browser meldet bstart (seed, bot)
// und je Schritt seine Käufe ('bt', mit Prüfsumme h alle 60 Schritte). Hier laufen dieselben Dateien wie im Spiel:
// daten/*, spiel/grundlagen.js (nur Werte; Bildschirm durch Platzhalter ersetzt), gemeinsam/* und pvpHash aus spiel/online.js.
// nachrechnen({ bot, seed, log: [[team, t, cmds, h], …], letzte }) -> { ok, winner, ticks, grund }
// server.js ruft es über pruefen() in einem eigenen Thread auf (eine Partie dauert einige 100 ms), damit Online-Partien nicht stocken.
const fs = require('fs'), path = require('path');
const { Worker, parentPort, isMainThread } = require('worker_threads');
let FABRIK = null;
function fabrik() { // Funktion, die bei jedem Aufruf einen frischen Spielzustand baut und die Prüf-Funktion zurückgibt
  if (FABRIK) return FABRIK;
  const lies = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
  const teile = lies('werkzeuge/reihenfolge.txt').split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((f) => f.startsWith('daten/') || f.startsWith('gemeinsam/') || f === 'spiel/grundlagen.js');
  const online = lies('spiel/online.js');
  const a = online.indexOf('  function pvpHash()'), b = online.indexOf('  function pvpDesync()');
  const step = /BL_STEP = ([^,;]+)[,;]/.exec(online);
  if (a < 0 || b < a || !step) throw new Error('pvpHash/BL_STEP in spiel/online.js nicht gefunden');
  const vorne = [
    // Platzhalter für den Bildschirm (spiel/grundlagen.js beim Laden) und für Ton/Darstellung, die die Simulation aufruft
    '  var __s = new Proxy(function () {}, { get: function (t, k) { return k === Symbol.toPrimitive ? function () { return 0; } : __s; }, set: function () { return true; }, apply: function () { return __s; } });',
    '  var document = { getElementById: function () { return __s; }, documentElement: __s }, localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };',
    '  function launchPt(u) { return { x: u.x, y: u.y }; } // nur Darstellung (Startpunkt der Geschosse)',
    '  function sfx() {} // Ton',
    '  function finish(w) { state = \'over\'; winner = w; } // Spielende ohne Ergebnisfenster',
  ].join('\n') + '\n';
  const hinten = `
  var BL_STEP_N = ${step[1]};
  return function (bot, seed, log, bis) {
    var cmds = {}, hs = {}, letzte = bis | 0; // bis = letzter gemeldeter Schritt (auch Meldungen ohne Kauf)
    for (var i = 0; i < log.length; i++) { var e = log[i]; if (e[0] !== 0) continue; if (e[2] && e[2].length) cmds[e[1]] = (cmds[e[1]] || []).concat(e[2]); if (typeof e[3] === 'number') hs[e[1]] = e[3]; if (e[1] > letzte) letzte = e[1]; }
    simRand = mulberry32(seed); botType = bot; sandbox = false; tut.on = false; pvp.on = false; ME = 0;
    reset(); state = 'playing';
    for (var T = 0; T <= letzte && state === 'playing'; T++) {
      var c = cmds[T]; if (c) for (var j = 0; j < c.length; j++) buy(0, c[j]);
      update(BL_STEP_N);
      if (hs[T] !== undefined && hs[T] !== pvpHash()) return { ok: false, grund: 'pruefsumme', ticks: T };
    }
    return { ok: true, winner: state === 'over' ? winner : -1, ticks: T };
  };`;
  FABRIK = new Function(vorne + teile.map(lies).join('\n') + online.slice(a, b) + hinten); // eslint-disable-line no-new-func
  return FABRIK;
}
function nachrechnen(p) {
  try { return fabrik()()(String(p.bot), p.seed | 0, Array.isArray(p.log) ? p.log : [], p.letzte | 0); }
  catch (e) { return { ok: false, grund: 'fehler: ' + e.message }; }
}
// Im Server: ein Hilfs-Thread für alle Prüfungen (nacheinander); hängt eine Prüfung länger als ZEIT_MAX, wird der Thread neu gestartet.
// 26.11.: früher 60 s – zu kurz für Render Gratis (0,1 CPU): eine 5-min-Partie braucht lokal ~10 s, dort ~100 s. Der Thread läuft mit tiefer Priorität (Online-Partien zuerst).
const ZEIT_MAX = 20 * 60000;
let worker = null, naechste = 1;
const offen = new Map();
function pruefen(p) {
  return new Promise((ok) => {
    if (!worker) {
      worker = new Worker(__filename);
      worker.on('message', (m) => { const o = offen.get(m.id); if (o) { clearTimeout(o.zeit); offen.delete(m.id); o.ok(m.r); } });
      worker.on('error', (e) => { for (const o of offen.values()) { clearTimeout(o.zeit); o.ok({ ok: false, grund: 'fehler: ' + e.message }); } offen.clear(); worker = null; });
      worker.unref();
    }
    const id = naechste++;
    const zeit = setTimeout(() => { offen.delete(id); ok({ ok: false, grund: 'zeit' }); if (worker) { worker.terminate(); worker = null; } }, ZEIT_MAX);
    offen.set(id, { ok, zeit });
    worker.postMessage({ id, p });
  });
}
module.exports = { nachrechnen, pruefen };
if (!isMainThread && parentPort) {
  try { require('os').setPriority(19); } catch (e) { /* egal */ } // Linux: nur dieser Thread
  parentPort.on('message', (m) => { const t0 = Date.now(), r = nachrechnen(m.p); r.ms = Date.now() - t0; parentPort.postMessage({ id: m.id, r }); });
}
