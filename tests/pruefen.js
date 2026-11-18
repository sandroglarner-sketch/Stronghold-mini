// Automatische Regel-Prüfungen: baut eine Testseite aus build/artifact.html und lässt sie in Chrome ohne Fenster laufen.
// Aufruf: node werkzeuge/bauen.js && node tests/pruefen.js   (braucht google-chrome)
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
let s = fs.readFileSync(path.join(root, 'build/artifact.html'), 'utf8');
// Zugriff auf das Spielinnere (nur in der Testseite)
s = s.replace('  function frame(ts) {', "  window.__X = { get units() { return units; }, spawn: spawn, upd: update, reset: reset, get walls() { return walls; }, get bases() { return bases; }, get gold() { return gold; }, CONFIG: CONFIG };\n  function frame(ts) {");
s = s.replace('    requestAnimationFrame(frame);\n  }\n  requestAnimationFrame(frame);', '  }');

const TESTS = {
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
};

const out = {};
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-test-'));
const page = s + '<script>setTimeout(function () { var R = {}, T = ' + '{' + Object.keys(TESTS).map((k) => JSON.stringify(k) + ':' + TESTS[k].toString()).join(',') + '};' +
  ' for (var k in T) { try { R[k] = T[k](window.__X); } catch (e) { R[k] = "Fehler: " + e.message; } } document.title = "RES " + JSON.stringify(R); }, 500);</script>';
fs.writeFileSync(path.join(dir, 'test.html'), page);
const dom = execFileSync('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--virtual-time-budget=10000', '--dump-dom', 'file://' + path.join(dir, 'test.html')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
const m = dom.match(/<title>RES ([^<]*)<\/title>/);
if (!m) { console.log('Keine Ergebnisse (Seite lief nicht durch)'); process.exit(1); }
const res = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
let ok = true;
for (const k in res) { const pass = res[k] === true; ok = ok && pass; console.log((pass ? 'OK    ' : 'FEHLER') + '  ' + k + (pass ? '' : '  -> ' + res[k])); }
process.exit(ok ? 0 : 1);
