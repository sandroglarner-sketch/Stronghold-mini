// Code-Regeln für die Simulation (gemeinsam/): Online- und Bot-Partien müssen in jedem Browser exakt gleich rechnen (Lockstep).
// Verboten: Math.random, Math.hypot, Uhrzeit, und Winkel-/Exponentialfunktionen des Browsers (die rechnen je nach Browser minimal anders).
// Erlaubt sind sie nur in Zeilen, die ausschliesslich die Zeichnung betreffen; diese tragen den Kommentar «nur Zeichnung» oder «nur für die Zeichnung».
// Aufruf: node tests/codepruefung.js
'use strict';
const fs = require('fs'), path = require('path');
const ordner = path.join(__dirname, '..', 'gemeinsam');
const IMMER = [[/Math\.random\b/, 'Math.random → simRand()'], [/Math\.hypot\b/, 'Math.hypot → hyp()'], [/\bDate\.now\b|\bnew Date\b|\bperformance\.now\b/, 'Uhrzeit → clock']];
const AUSSER_ZEICHNUNG = [[/Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|exp|expm1|log|log1p|log2|log10|pow|cbrt)\b/, 'Math.sin/cos/atan2/… → dsin/dcos/datan2/dasin (oder Zeile als «nur Zeichnung» kennzeichnen)'], [/\*\*/, '** → Multiplikation']];
const fehler = [];
for (const datei of fs.readdirSync(ordner).filter((f) => f.endsWith('.js'))) {
  fs.readFileSync(path.join(ordner, datei), 'utf8').split('\n').forEach((zeile, i) => {
    const code = zeile.replace(/\/\/.*$/, ''), zeichnung = /nur (für die )?Zeichnung/.test(zeile);
    for (const [re, tipp] of IMMER) if (re.test(code)) fehler.push(`gemeinsam/${datei}:${i + 1}  ${tipp}`);
    if (!zeichnung) for (const [re, tipp] of AUSSER_ZEICHNUNG) if (re.test(code)) fehler.push(`gemeinsam/${datei}:${i + 1}  ${tipp}`);
  });
}
if (fehler.length) { console.log('FEHLER  Code-Regeln (deterministische Simulation):\n  ' + fehler.join('\n  ')); process.exit(1); }
console.log('OK      Code-Regeln: gemeinsam/ ohne Math.random, Math.hypot, Uhrzeit und Browser-Winkelfunktionen');
