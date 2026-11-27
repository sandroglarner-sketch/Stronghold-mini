// Automatische Regel-Prüfungen: baut eine Testseite aus build/artifact.html und lässt sie in Chrome ohne Fenster laufen.
// Aufruf: node werkzeuge/bauen.js && node tests/pruefen.js   (braucht google-chrome)
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
// Zuerst die Code-Regeln (ohne Browser)
let codeOk = true;
try { process.stdout.write(execFileSync('node', [path.join(__dirname, 'codepruefung.js')], { encoding: 'utf8' })); } catch (e) { process.stdout.write(e.stdout || String(e)); codeOk = false; }
const root = path.join(__dirname, '..');
let s = fs.readFileSync(path.join(root, 'build/artifact.html'), 'utf8');
// Zugriff auf das Spielinnere (nur in der Testseite)
s = s.replace('  function frame(ts) {', "  window.__X = { get units() { return units; }, spawn: spawn, upd: update, reset: reset, get walls() { return walls; }, get bases() { return bases; }, get gold() { return gold; }, CONFIG: CONFIG, buy: buy, hash: pvpHash, mulberry32: mulberry32, get state() { return state; }, get winner() { return winner; }, get clock() { return clock; }, setRand: function (f) { simRand = f; }, setState: function (z) { state = z; }, setBot: function (b) { botType = b; } };\n  function frame(ts) {");
s = s.replace('    requestAnimationFrame(frame);\n  }\n  requestAnimationFrame(frame);', '  }');

// Eine ganze Bot-Partie mit festem Startwert (wie im Spiel: Schritte von 1/60 s). Links kauft ein fester Plan, rechts spielt der Bot.
// Ergebnis = Prüfsummen des Spielzustands alle 10 s, am Schluss Sieger und Dauer. mr ersetzt Math.random während der Partie.
function botPartie(X, bot, seed, mr, sek) {
  var altMR = Math.random; Math.random = mr;
  try {
    X.setRand(X.mulberry32(seed)); X.setBot(bot); X.reset(); X.setState('playing');
    var plan = ['farmer', 'farmer', 'spear', 'archer', 'farmer', 'sword', 'wall', 'knight', 'catapult', 'shield', 'rider', 'mage', 'ram'], k = 0, h = [];
    for (var t = 0; t < 60 * sek && X.state === 'playing'; t++) {
      if (t % 90 === 0 && X.buy(0, plan[k % plan.length])) k++;
      X.upd(1 / 60);
      if (t % 600 === 0) h.push(X.hash());
    }
    h.push(X.hash(), X.state, X.winner, t);
    return h.join(',');
  } finally { Math.random = altMR; X.setState('ready'); }
}

const TESTS = {
  'Determinismus: gleiche Bot-Partien bei gleichem Startwert, unabhängig von Math.random (alle Bots)': function (X) {
    var falsch = [];
    Object.keys(X.CONFIG.BOTS).forEach(function (bot, i) {
      var a = botPartie(X, bot, 1000 + i, X.mulberry32(11), 150);
      var b = botPartie(X, bot, 1000 + i, X.mulberry32(22), 150);
      if (a !== b) falsch.push(bot);
    });
    var c = botPartie(X, 'bauern', 7, Math.random, 30), d = botPartie(X, 'bauern', 8, Math.random, 30);
    if (c === d) return 'verschiedene Startwerte ergeben dieselbe Partie – der Test prüft nichts';
    return falsch.length ? 'Partie läuft je nach Math.random anders (online würden die Spieler auseinanderlaufen): ' + falsch.join(', ') : true;
  },
  'Onager: 20 Direktschaden + 1 Flächenschaden an der Mauer': function (X) {
    X.reset(); X.units.length = 0;
    X.walls[1] = { team: 1, hp: 120, built: true, hit: 0, lastHit: -99, stage: 3, peak: 120 };
    X.spawn(0, 'onager'); var hp = [];
    for (var i = 0; i < 20 * 22; i++) { X.upd(0.05); if (X.walls[1]) hp.push(X.walls[1].hp); }
    var drops = []; for (i = 1; i < hp.length; i++) if (hp[i - 1] - hp[i] > 5) drops.push(Math.round(hp[i - 1] - hp[i]));
    return drops.length >= 2 && drops.every(function (d) { return d === 21; }) ? true : 'Treffer: ' + drops.join(',');
  },
  'Bauer: +1 Gold alle 5 s ab dem Niederlassen': function (X) {
    X.reset(); X.spawn(0, 'farmer'); var f = X.units[X.units.length - 1], t = 0, ts = null, plus1 = [], g = X.gold[0];
    for (var i = 0; i < 20 * 30; i++) { X.upd(0.05); t += 0.05; if (f.settled && ts === null) ts = t; var d = X.gold[0] - g; if (d === 1 || d === 11) plus1.push(+(t - ts).toFixed(2)); g = X.gold[0]; }
    var okT = plus1.length >= 4 && plus1.every(function (x, k) { return Math.abs(x - 5 * (k + 1)) < 0.11; });
    return okT ? true : 'Bauern-Gold bei ' + plus1.join(', ') + ' s nach dem Niederlassen';
  },
  'Belagerungsturm zerstört: Bogenschützen oben sterben mit': function (X) {
    X.reset(); X.units.length = 0; X.spawn(0, 'belfry');
    var b = X.units.filter(function (u) { return u.type === 'belfry'; })[0];
    for (var i = 0; i < 20; i++) X.upd(0.05);
    b.hp = 0; X.upd(0.05); X.upd(0.05);
    return X.units.length === 0 ? true : 'übrig: ' + X.units.map(function (u) { return u.type; }).join(',');
  },
  'Schwarzer Ritter: Morgenstern trifft im 120°-Bogen, 1 Kachel weit': function (X) {
    X.reset(); X.units.length = 0;
    X.spawn(0, 'schwarzritter'); X.spawn(1, 'spear'); X.spawn(1, 'spear'); X.spawn(1, 'spear'); X.spawn(1, 'spear');
    var k = X.units[0], z = X.units[1], seite = X.units[2], hinten = X.units[3], weit = X.units[4];
    k.x = 11; k.y = 5; z.x = 11.85; z.y = 5; seite.x = 11.45; seite.y = 5.65; hinten.x = 10.05; hinten.y = 5; weit.x = 12.9; weit.y = 5.9;
    X.units.forEach(function (u) { u.cd = 9; u.settled = false; }); k.cd = 0; k.warBereit = true; // schon ausgeholt
    var hp = X.units.map(function (u) { return u.hp; });
    X.upd(0.02);
    var d = X.units.map(function (u, i) { return +(hp[i] - u.hp).toFixed(2); });
    return d[1] === 1 && d[2] === 1 && d[3] === 0 && d[4] === 0 ? true : 'Schaden Ziel/Seite/hinten/weit: ' + d.slice(1).join('/');
  },
  'Schwarzer Ritter: holt vor dem ersten Schlag 0,5 s aus, dann jede Sekunde': function (X) {
    X.reset(); X.units.length = 0;
    X.spawn(0, 'schwarzritter'); X.spawn(1, 'shield');
    var k = X.units[0], z = X.units[1]; k.x = 11; k.y = 5; z.x = 11.85; z.y = 5; z.hp = 999; k.cd = 0; var treffer = [], hp = z.hp;
    for (var i = 0; i < 200; i++) { z.x = 11.85; z.y = 5; k.x = 11; k.y = 5; X.upd(0.02); if (z.hp < hp) { treffer.push(+((i + 1) * 0.02).toFixed(2)); hp = z.hp; } }
    return treffer.length >= 2 && Math.abs(treffer[0] - 0.5) < 0.05 && Math.abs(treffer[1] - treffer[0] - 1) < 0.05 ? true : 'Treffer bei ' + treffer.join(', ') + ' s';
  },
  'Prinzessin: Gegner im 60°-Trichter bis 5 Kacheln wechseln die Seite': function (X) {
    X.reset(); X.units.length = 0;
    X.spawn(0, 'prinzessin'); X.spawn(1, 'spear'); X.spawn(1, 'spear'); X.spawn(1, 'spear'); X.spawn(1, 'spear');
    var p = X.units[0], z = X.units[1], drin = X.units[2], aussen = X.units[3], weit = X.units[4];
    p.x = 8; p.y = 5; z.x = 10.5; z.y = 5; drin.x = 12; drin.y = 6; aussen.x = 9.8; aussen.y = 7.8; weit.x = 14.2; weit.y = 5;
    X.units.forEach(function (u) { u.cd = 9; }); p.cd = 0;
    X.upd(0.02);
    var t = X.units.map(function (u) { return u.team; });
    return t[1] === 0 && t[2] === 0 && t[3] === 1 && t[4] === 1 && z.hp === z.max ? true : 'Teams Ziel/drin/aussen/weit: ' + t.slice(1).join('/');
  },
  'Bürger: 2 Gold, jeder weitere +2, bleibt im Mauerbereich, alle 5 s +1 Gold': function (X) {
    X.reset(); X.units.length = 0; X.setState('playing'); X.gold[0] = 100;
    var g0 = X.gold[0]; X.buy(0, 'buerger'); X.buy(0, 'buerger'); X.buy(0, 'buerger');
    var bez = g0 - X.gold[0], b = X.bases[0], R = X.CONFIG.units.wall.wall.dist, maxD = 0, steht = 0;
    var bs = X.units.filter(function (u) { return u.type === 'buerger'; }); X.gold[0] = 0; X.setState('playing'); var ga = X.CONFIG.GOLD_AMOUNT; X.CONFIG.GOLD_AMOUNT = 0;
    for (var i = 0; i < 61 * 60; i++) { X.upd(1 / 60); bs.forEach(function (u) {
      var dx = u.x - Math.max(b.x1, Math.min(b.x2, u.x)), dy = u.y - Math.max(b.y1, Math.min(b.y2, u.y)); maxD = Math.max(maxD, Math.sqrt(dx * dx + dy * dy)); if (u.settled.z !== 'geht') steht++; }); }
    X.CONFIG.GOLD_AMOUNT = ga; var gold = X.gold[0], leben = bs.filter(function (u) { return u.hp > 0; }).length; // Grundeinkommen war ausgeschaltet
    return bez === 12 && maxD <= R && steht > 0 && gold === 36 && leben === 3 ? true : 'bezahlt ' + bez + ', weitester Abstand ' + maxD.toFixed(2) + ', Steh-Schritte ' + steht + ', Gold der Bürger ' + gold + ', leben ' + leben;
  },
  'Prinzessin: zielt nur auf bekehrbare Gegner und erst ab 3 Kacheln': function (X) {
    X.reset(); X.units.length = 0;
    X.spawn(0, 'prinzessin'); X.spawn(1, 'farmer'); X.spawn(1, 'spear');
    var p = X.units[0], f = X.units[1], s = X.units[2];
    var setz = function (sx) { p.x = 8; p.y = 5; f.x = 9.5; f.y = 5; s.x = sx; s.y = 5; f.cd = s.cd = 9; };
    setz(12); p.cd = 0; X.upd(0.02);
    var vorher = [p.cd > 0, f.team, s.team].join('/');
    setz(10.8); X.upd(0.02);
    var nachher = [f.team, s.team].join('/');
    return vorher === 'false/1/1' && nachher === '1/0' ? true : 'bei 4 Kacheln (zaubert?/Bauer/Speer): ' + vorher + ', bei 2,8: ' + nachher;
  },
};

const out = {};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-test-'));
const page = s + '<script>setTimeout(function () { ' + botPartie.toString() + ' var R = {}, T = ' + '{' + Object.keys(TESTS).map((k) => JSON.stringify(k) + ':' + TESTS[k].toString()).join(',') + '};' +
  ' for (var k in T) { try { R[k] = T[k](window.__X); } catch (e) { R[k] = "Fehler: " + e.message; } } document.title = "RES " + JSON.stringify(R); }, 500);</script>';
fs.writeFileSync(path.join(dir, 'test.html'), page);
const dom = execFileSync('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=10000', '--dump-dom', 'file://' + path.join(dir, 'test.html')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const m = dom.match(/<title>RES ([^<]*)<\/title>/);
if (!m) { console.log('Keine Ergebnisse (Seite lief nicht durch)'); process.exit(1); }
const res = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
let ok = codeOk;
for (const k in res) { const pass = res[k] === true; ok = ok && pass; console.log((pass ? 'OK    ' : 'FEHLER') + '  ' + k + (pass ? '' : '  -> ' + res[k])); }
process.exit(ok ? 0 : 1);
