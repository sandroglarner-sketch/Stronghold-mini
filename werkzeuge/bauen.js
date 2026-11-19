// Baut aus den Einzeldateien wieder EINE Datei:
//   build/artifact.html        -> fürs Claude-Artifact (mit Projektnotizen oben als Kommentar)
//   index.html (im Hauptordner) -> für GitHub/Render, server.js liefert sie aus (eigener Kopf, ohne Notizen, mit Statistik-Skript und Datenschutzzeile)
// Aufruf im Projektordner: node werkzeuge/bauen.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const lies = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const schreib = (p, s) => { fs.mkdirSync(path.dirname(path.join(root, p)), { recursive: true }); fs.writeFileSync(path.join(root, p), s); };

// Skriptteile in fester Reihenfolge (die Reihenfolge ist wichtig: so laufen sie auch ab)
const teile = lies('werkzeuge/reihenfolge.txt').split('\n').map((s) => s.trim()).filter(Boolean);
let skript = teile.map(lies).join('');
// Versionskennung: Prüfsumme des Spielcodes. Der Server kennt die Version seiner index.html; alte offene Seiten laden sich dann neu.
const version = require('crypto').createHash('sha1').update(skript).digest('hex').slice(0, 10);
if (skript.indexOf("var VERSION = 'dev';") < 0) throw new Error('VERSION-Platzhalter fehlt');
skript = skript.replace("var VERSION = 'dev';", "var VERSION = '" + version + "';");
const vorlage = lies('spiel/index.html');
const ersetze = (s, marke, inhalt) => { const i = s.indexOf(marke); if (i < 0) throw new Error('Marke fehlt: ' + marke); return s.slice(0, i) + inhalt + s.slice(i + marke.length); };

let artifact = vorlage;
artifact = ersetze(artifact, '<!--NOTIZEN-->\n', '<!--\n' + lies('NOTIZEN.md') + '-->\n');
artifact = ersetze(artifact, '<!--STIL-->\n', lies('spiel/stil.css'));
artifact = ersetze(artifact, '<!--SKRIPT-->', skript);
schreib('build/artifact.html', artifact);

// Online-Version (früher sim/build_site.py)
let body = artifact.slice(artifact.indexOf('<body>') + '<body>'.length);
body = body.replace(/^\s*<title>[\s\S]*?<\/title>\s*/, '');
body = body.replace(/^\s*<meta name="claude:[^>]*>\s*/, '');
body = body.replace(/<!--[\s\S]*?-->\s*/, (m) => (m.indexOf('PROJEKTNOTIZEN') >= 0 ? '' : m));
body = body.replace(/<\/body>\s*<\/html>\s*$/, '').replace(/\s+$/, '');
const kopf = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Stronghold Mini</title>
<meta name="description" content="Stronghold Mini – kleines Echtzeitstrategie-Spiel im Browser: Burg und Mauer bauen, Einheiten ausbilden, gegen Bots oder online gegen andere Spieler.">
<meta name="theme-color" content="#e9edef">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Stronghold">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="manifest" href="/manifest.webmanifest">
<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif}[hidden]:not([hidden=until-found i]){display:none!important}.privacy{text-align:center;font-size:11px;color:#8a979a;margin:6px 0 14px}html.phone .privacy{display:none}</style>
<script data-goatcounter="https://sandro.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
</head>
<body>
`;
const schwanz = '\n<p class="privacy">Anonyme Besucherstatistik ohne Cookies (GoatCounter). Gratis-Konten: E-Mail und Passwort werden verschlüsselt bei Supabase (EU, Frankfurt) gespeichert.</p>\n</body>\n</html>\n';
schreib('index.html', kopf + body + schwanz);
console.log('gebaut: build/artifact.html (' + artifact.length + ' Zeichen), index.html');

// Bot-Datenbank als eigene Seite (build/botdatenbank.html), erzeugt aus denselben Dateien wie das Spiel
{
  const fsx = require('fs'), px = require('path'), wurzel = px.join(__dirname, '..');
  const teile = ['daten/regeln.js', 'daten/bots.js', 'daten/einheiten.js', 'daten/koenige.js', 'daten/botdatenbank.js', 'spiel/koenig-optik.js'].map((f) => fsx.readFileSync(px.join(wurzel, f), 'utf8')).join('\n');
  const stand = new Date().toLocaleString('de-CH', { timeZone: 'Europe/Zurich', dateStyle: 'medium', timeStyle: 'short' });
  const seite = fsx.readFileSync(px.join(__dirname, 'datenbank-vorlage.html'), 'utf8').replace('/*DATEN*/', () => teile + '\n  var STAND = ' + JSON.stringify(stand) + ';');
  fsx.mkdirSync(px.join(wurzel, 'build'), { recursive: true });
  fsx.writeFileSync(px.join(wurzel, 'build', 'botdatenbank.html'), seite);
  console.log('gebaut: build/botdatenbank.html');
}
