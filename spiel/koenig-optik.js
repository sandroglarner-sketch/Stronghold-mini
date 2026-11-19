  // ---------- König zeichnen (Optik aus KOENIGE) ----------
  // koenigMalen(c, k, r, teamCol, o): von oben, Blick nach rechts (+x), Mittelpunkt bei 0,0, ohne Schatten.
  // o.ohneWaffe = nur der König (für Bilder); o.bogen = auf der Burg mit Bogen (o.str, o.vib, o.arrow wie attackPose), sonst Waffe der Optik (o.rot = Hieb-Drehung um die Hände)
  // Wird im Spiel (drawUnit, king/kingbow), auf der Story-Karte, in der Königswahl und in der Bot-Datenbank benutzt.
  var koenigTeam = ['standard', 'bandit']; // Optik der beiden Könige in der laufenden Partie (Index = Team)
  var KSTAHL = '#e3eaec', KHOLZ = '#7a5230';
  function koenigOptik(id) { return KOENIGE[id] || KOENIGE.standard; }
  function koenigMalen(c, k, r, teamCol, o) {
    o = o || {};
    c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
    var std = k.umhang === 'team';
    var cape = function () { c.beginPath(); c.moveTo(-r * 0.1, -r * 0.75); c.lineTo(-r * 1.2, -r * 0.95); c.quadraticCurveTo(-r * 1.4, 0, -r * 1.2, r * 0.95); c.lineTo(-r * 0.1, r * 0.75); c.closePath(); };
    cape();
    if (std) { c.fillStyle = teamCol; c.fill(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fill(); c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2; c.stroke(); }
    else {
      c.fillStyle = k.umhang; c.fill();
      c.save(); cape(); c.clip(); kMuster(c, k, r); c.restore();
      cape(); c.strokeStyle = teamCol; c.lineWidth = Math.max(2, r * 0.16); c.stroke(); // Saum in Teamfarbe
    }
    if (k.muster === 'hermelin') {
      c.fillStyle = '#f4f1ea'; c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
      c.beginPath(); c.ellipse(-r * 0.2, 0, r * 0.32, r * 0.95, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#1b1b1b'; [-0.6, -0.2, 0.2, 0.6].forEach(function (t) { c.beginPath(); c.arc(-r * 0.22, r * t, r * 0.05, 0, 7); c.fill(); });
    }
    c.fillStyle = k.ruestung; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(0, 0, r * 0.55, r * 0.88, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    if (!std) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(-r * 0.1, -r * 0.35, r * 0.25, r * 0.3, 0, 0, 7); c.fill(); }
    if (o.ohneWaffe) { /* Bild (Auswahl, Karte, Datenbank): ohne Waffe */ }
    else if (o.bogen) kBogen(c, k, r, o);
    else { c.save(); c.translate(r * 0.45, 0); c.rotate(o.rot || 0); c.translate(-r * 0.45, 0); kWaffe(c, k, r); c.restore(); }
    if (k.haar) { c.fillStyle = k.haar; c.beginPath(); c.arc(-r * 0.08, 0, r * 0.44, 0, 7); c.fill(); }
    c.fillStyle = k.haut; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
    c.beginPath(); c.arc(r * 0.05, 0, r * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
    if (k.haar) { c.fillStyle = k.haar; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.36, Math.PI * 0.55, Math.PI * 1.45); c.fill(); }
    kBart(c, k, r);
    kKrone(c, k, r);
    c.restore();
  }
  function kBogen(c, k, r, o) { // Bogen mit aufgelegtem Pfeil (wie bisher)
    var str = o.str === undefined ? 0.5 : o.str;
    c.strokeStyle = KHOLZ; c.lineWidth = Math.max(3, r * 0.22);
    c.beginPath(); c.moveTo(r * 0.95, -r * 1.15); c.quadraticCurveTo(r * 1.9, 0, r * 0.95, r * 1.15); c.stroke();
    var kmx = str * r;
    c.strokeStyle = '#e8e0cc'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(r * 0.95, -r * 1.15); c.lineTo(kmx, (o.vib || 0) * r); c.lineTo(r * 0.95, r * 1.15); c.stroke();
    if (o.arrow > 0) {
      c.globalAlpha = o.arrow;
      c.strokeStyle = KHOLZ; c.lineWidth = 2;
      c.beginPath(); c.moveTo(kmx, 0); c.lineTo(kmx + r * 1.1, 0); c.stroke();
      c.fillStyle = KSTAHL; c.beginPath(); c.moveTo(kmx + r * 1.4, 0); c.lineTo(kmx + r * 1.0, -r * 0.14); c.lineTo(kmx + r * 1.0, r * 0.14); c.closePath(); c.fill();
      c.globalAlpha = 1;
    }
    c.fillStyle = k.haut;
    c.beginPath(); c.arc(r * 0.95, 0, r * 0.14, 0, Math.PI * 2); c.arc(Math.min(kmx, r * 0.5), 0, r * 0.14, 0, Math.PI * 2); c.fill();
  }
  function kMuster(c, k, r) {
    var m = k.muster, i, j;
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = Math.max(1.5, r * 0.09);
    if (m === 'streifen') for (i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(-r * 1.5, r * 0.38 * i); c.lineTo(0, r * 0.38 * i); c.stroke(); }
    if (m === 'kreuz') { c.lineWidth = r * 0.16; c.beginPath(); c.moveTo(-r * 0.65, -r * 0.5); c.lineTo(-r * 0.65, r * 0.5); c.moveTo(-r * 1.05, 0); c.lineTo(-r * 0.25, 0); c.stroke(); }
    if (m === 'punkte') for (i = 0; i < 9; i++) { c.beginPath(); c.arc(-r * (0.4 + (i % 3) * 0.32), r * (-0.6 + Math.floor(i / 3) * 0.6), r * 0.08, 0, 7); c.fill(); }
    if (m === 'sterne') { c.fillStyle = 'rgba(255,240,180,0.8)'; for (i = 0; i < 7; i++) { var sx = -r * (0.35 + ((i * 37) % 9) / 10), sy = r * (-0.75 + ((i * 53) % 15) / 10); kStern(c, sx, sy, r * 0.09); } }
    if (m === 'blaetter') { c.fillStyle = 'rgba(160,210,110,0.45)'; for (i = 0; i < 6; i++) { c.beginPath(); c.ellipse(-r * (0.45 + (i % 2) * 0.45), r * (-0.65 + Math.floor(i / 2) * 0.65), r * 0.16, r * 0.08, 0.6, 0, 7); c.fill(); } }
    if (m === 'flicken') { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(-r * 0.95, -r * 0.55, r * 0.35, r * 0.3); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(-r * 0.7, r * 0.2, r * 0.3, r * 0.35); }
    if (m === 'muenzen') { c.fillStyle = '#e5c04a'; for (i = 0; i < 6; i++) { c.beginPath(); c.arc(-r * (0.4 + (i % 2) * 0.5), r * (-0.6 + Math.floor(i / 2) * 0.6), r * 0.1, 0, 7); c.fill(); } }
    if (m === 'zacken') { c.beginPath(); for (i = 0; i <= 8; i++) c.lineTo(-r * 0.55 - (i % 2) * r * 0.25, -r + i * r * 0.25); c.stroke(); }
    if (m === 'schuppen') { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; for (i = 0; i < 4; i++) for (j = -3; j <= 3; j++) { c.beginPath(); c.arc(-r * (0.3 + i * 0.28), r * j * 0.28 + (i % 2) * r * 0.14, r * 0.14, Math.PI * 0.5, Math.PI * 1.5); c.stroke(); } }
  }
  function kStern(c, x, y, s) { c.beginPath(); for (var i = 0; i < 10; i++) { var a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function kHand(c, x, y, r, f) { c.fillStyle = f || '#d9a066'; c.beginPath(); c.arc(x, y, r * 0.14, 0, 7); c.fill(); }
  function kWaffe(c, k, r) {
    var w = k.waffe, s = 'rgba(0,0,0,0.5)';
    c.lineWidth = 1.5; c.strokeStyle = s;
    if (w === 'zweihaender' || w === 'schwert') {
      var L = w === 'zweihaender' ? 3.5 : 2.6;
      c.fillStyle = k.wf; c.beginPath(); c.moveTo(r * L, 0); c.lineTo(r * (L - 0.4), -r * 0.2); c.lineTo(r * 0.9, -r * 0.2); c.lineTo(r * 0.9, r * 0.2); c.lineTo(r * (L - 0.4), r * 0.2); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#d4a017'; c.lineWidth = Math.max(3, r * 0.22); c.beginPath(); c.moveTo(r * 0.85, -r * 0.62); c.lineTo(r * 0.85, r * 0.62); c.stroke();
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.2, 0); c.lineTo(r * 0.85, 0); c.stroke();
      kHand(c, r * 0.45, -r * 0.13, r, k.haut); kHand(c, r * 0.7, r * 0.13, r, k.haut);
    } else if (w === 'forke') {
      c.strokeStyle = '#8a6a3a'; c.lineWidth = Math.max(2.5, r * 0.16); c.beginPath(); c.moveTo(-r * 0.1, r * 0.3); c.lineTo(r * 2.9, r * 0.3); c.stroke();
      c.strokeStyle = k.wf; c.lineWidth = Math.max(2, r * 0.1); c.beginPath(); c.moveTo(r * 2.9, r * 0.0); c.lineTo(r * 2.9, r * 0.6); [0.0, 0.3, 0.6].forEach(function (y) { c.moveTo(r * 2.9, r * y); c.lineTo(r * 3.5, r * y); }); c.stroke();
      kHand(c, r * 0.5, r * 0.3, r, k.haut); kHand(c, r * 1.0, r * 0.3, r, k.haut);
    } else if (w === 'holzschwert') {
      c.fillStyle = k.wf; c.strokeStyle = 'rgba(80,50,20,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * 2.3, 0); c.lineTo(r * 2.1, -r * 0.18); c.lineTo(r * 0.9, -r * 0.18); c.lineTo(r * 0.9, r * 0.18); c.lineTo(r * 2.1, r * 0.18); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#7a5428'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.85, -r * 0.45); c.lineTo(r * 0.85, r * 0.45); c.stroke(); c.beginPath(); c.moveTo(r * 0.35, 0); c.lineTo(r * 0.85, 0); c.stroke();
      kHand(c, r * 0.6, 0, r, k.haut);
    } else if (w === 'saebel') {
      c.fillStyle = k.wf; c.beginPath(); c.moveTo(r * 0.9, -r * 0.18); c.quadraticCurveTo(r * 2.2, -r * 0.3, r * 2.9, r * 0.35); c.quadraticCurveTo(r * 2.1, r * 0.1, r * 0.9, r * 0.18); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = '#d4a017'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.85, -r * 0.45); c.lineTo(r * 0.85, r * 0.45); c.stroke();
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.35, 0); c.lineTo(r * 0.85, 0); c.stroke();
      kHand(c, r * 0.6, 0, r, k.haut);
    } else if (w === 'axt') {
      c.strokeStyle = '#6b4520'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.2, 0); c.lineTo(r * 2.7, 0); c.stroke();
      c.fillStyle = k.wf; c.strokeStyle = s; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * 2.2, -r * 0.1); c.quadraticCurveTo(r * 2.4, -r * 0.9, r * 2.9, -r * 0.85); c.quadraticCurveTo(r * 2.75, -r * 0.4, r * 2.75, -r * 0.1); c.closePath(); c.fill(); c.stroke();
      kHand(c, r * 0.45, 0, r, k.haut); kHand(c, r * 0.95, 0, r, k.haut);
    } else if (w === 'kolben') {
      c.strokeStyle = '#6b4520'; c.lineWidth = Math.max(3, r * 0.2); c.beginPath(); c.moveTo(r * 0.3, 0); c.lineTo(r * 2.0, 0); c.stroke();
      c.fillStyle = k.wf; c.strokeStyle = s; c.beginPath(); c.arc(r * 2.15, 0, r * 0.38, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#5a5f63'; for (var i = 0; i < 6; i++) { var a = i * Math.PI / 3; c.beginPath(); c.arc(r * 2.15 + Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.09, 0, 7); c.fill(); }
      kHand(c, r * 0.6, 0, r, k.haut);
    } else if (w === 'speer') {
      c.strokeStyle = '#6b4520'; c.lineWidth = Math.max(2.5, r * 0.16); c.beginPath(); c.moveTo(-r * 0.2, r * 0.3); c.lineTo(r * 3.2, r * 0.3); c.stroke();
      c.fillStyle = k.wf; c.strokeStyle = s; c.beginPath(); c.moveTo(r * 3.8, r * 0.3); c.lineTo(r * 3.15, r * 0.05); c.lineTo(r * 3.15, r * 0.55); c.closePath(); c.fill(); c.stroke();
      kHand(c, r * 0.5, r * 0.3, r, k.haut); kHand(c, r * 1.0, r * 0.3, r, k.haut);
    } else if (w === 'zepter') {
      c.strokeStyle = '#d4a017'; c.lineWidth = Math.max(3, r * 0.18); c.beginPath(); c.moveTo(r * 0.3, r * 0.15); c.lineTo(r * 1.9, r * 0.15); c.stroke();
      c.fillStyle = k.wf; c.strokeStyle = s; c.beginPath(); c.arc(r * 2.05, r * 0.15, r * 0.3, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(r * 1.98, r * 0.06, r * 0.1, 0, 7); c.fill();
      kHand(c, r * 0.6, r * 0.15, r, k.haut);
    }
  }
  function kBart(c, k, r) {
    var b = k.bart, col = k.haar || '#6b4a2b';
    if (!b) return;
    c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
    if (b === 'stoppel') { c.fillStyle = 'rgba(60,40,30,0.35)'; c.beginPath(); c.arc(r * 0.12, 0, r * 0.38, -1.1, 1.1); c.lineTo(r * 0.2, 0); c.closePath(); c.fill(); return; }
    if (b === 'schnauz') { c.beginPath(); c.ellipse(r * 0.38, -r * 0.14, r * 0.08, r * 0.2, 0.3, 0, 7); c.ellipse(r * 0.38, r * 0.14, r * 0.08, r * 0.2, -0.3, 0, 7); c.fill(); return; }
    var len = b === 'kurz' ? 0.55 : b === 'spitz' ? 0.75 : b === 'voll' ? 0.7 : 0.95;
    c.beginPath(); c.moveTo(r * 0.25, -r * 0.33);
    if (b === 'spitz') { c.lineTo(r * len, 0); }
    else c.quadraticCurveTo(r * len, -r * 0.3, r * len, 0), c.quadraticCurveTo(r * len, r * 0.3, r * 0.25, r * 0.33);
    c.lineTo(r * 0.25, r * 0.33); c.closePath(); c.fill(); c.stroke();
    if (b === 'zopf') { c.fillStyle = col; c.beginPath(); c.arc(r * 0.62, -r * 0.12, r * 0.09, 0, 7); c.arc(r * 0.62, r * 0.12, r * 0.09, 0, 7); c.fill(); c.strokeStyle = '#a0a6ab'; c.lineWidth = 2; c.beginPath(); c.moveTo(r * 0.55, -r * 0.2); c.lineTo(r * 0.55, r * 0.2); c.stroke(); }
  }
  function kKrone(c, k, r) {
    var t = k.krone, f = k.kf, cx = r * 0.05, i, a;
    var ring = function (col, w) { c.strokeStyle = col; c.lineWidth = Math.max(2, r * (w || 0.1)); c.beginPath(); c.arc(cx, 0, r * 0.38, -2.2, 2.2); c.stroke(); };
    var kugel = function (col, rad) { c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx - r * 0.02, 0, r * rad, 0, 7); c.fill(); c.stroke(); };
    if (t === 'reif') ring(f);
    else if (t === 'zacken') { c.fillStyle = f; for (i = 0; i < 7; i++) { a = i / 7 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a - 0.22) * r * 0.36, Math.sin(a - 0.22) * r * 0.36); c.lineTo(cx + Math.cos(a) * r * 0.58, Math.sin(a) * r * 0.58); c.lineTo(cx + Math.cos(a + 0.22) * r * 0.36, Math.sin(a + 0.22) * r * 0.36); c.fill(); } c.strokeStyle = f; c.lineWidth = r * 0.12; c.beginPath(); c.arc(cx, 0, r * 0.36, 0, 7); c.stroke(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(cx + r * 0.36, 0, r * 0.07, 0, 7); c.fill(); }
    else if (t === 'diadem') { ring(f, 0.07); c.fillStyle = '#5aa9e6'; c.beginPath(); c.arc(cx + r * 0.38, 0, r * 0.09, 0, 7); c.fill(); }
    else if (t === 'hoch') { kugel('#8a1f2a', 0.36); c.strokeStyle = f; c.lineWidth = r * 0.13; c.beginPath(); c.arc(cx, 0, r * 0.36, 0, 7); c.stroke(); c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(cx - r * 0.34, 0); c.lineTo(cx + r * 0.34, 0); c.moveTo(cx, -r * 0.34); c.lineTo(cx, r * 0.34); c.stroke(); c.fillStyle = f; c.beginPath(); c.arc(cx, 0, r * 0.1, 0, 7); c.fill(); }
    else if (t === 'helm') { kugel(k.kf === '#2a2a2e' ? '#3a3d42' : '#8d9399', 0.44); c.strokeStyle = f; c.lineWidth = r * 0.08; c.beginPath(); c.arc(cx, 0, r * 0.42, 0, 7); c.stroke(); c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = r * 0.07; c.beginPath(); c.moveTo(cx + r * 0.3, -r * 0.18); c.lineTo(cx + r * 0.3, r * 0.18); c.stroke(); }
    else if (t === 'kapuze') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx - r * 0.05, 0, r * 0.47, Math.PI * 0.35, Math.PI * 1.65); c.quadraticCurveTo(cx + r * 0.2, 0, cx + Math.cos(Math.PI * 0.35) * r * 0.47 - r * 0.05, Math.sin(Math.PI * 0.35) * r * 0.47); c.fill(); c.stroke(); }
    else if (t === 'turban') { kugel(f, 0.44); c.strokeStyle = 'rgba(0,0,0,0.15)'; c.lineWidth = r * 0.06; for (i = 1; i <= 3; i++) { c.beginPath(); c.arc(cx, 0, r * 0.11 * i, 0, 7); c.stroke(); } c.fillStyle = '#1f8a5a'; c.beginPath(); c.arc(cx + r * 0.36, 0, r * 0.09, 0, 7); c.fill(); c.fillStyle = '#d4a017'; c.beginPath(); c.arc(cx + r * 0.36, 0, r * 0.04, 0, 7); c.fill(); }
    else if (t === 'lorbeer') { c.fillStyle = f; for (i = 0; i < 12; i++) { a = -2.4 + i / 11 * 4.8; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4, r * 0.13, r * 0.06, a + 1.2, 0, 7); c.fill(); } }
    else if (t === 'hoerner') { kugel(f, 0.4); c.fillStyle = '#efe6cf'; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(cx - r * 0.1, s * r * 0.3); c.quadraticCurveTo(cx - r * 0.2, s * r * 0.85, cx + r * 0.35, s * r * 0.95); c.quadraticCurveTo(cx + r * 0.05, s * r * 0.6, cx + r * 0.15, s * r * 0.3); c.closePath(); c.fill(); c.stroke(); }); }
    else if (t === 'pelz' || t === 'wolf') { kugel(f, 0.47); c.fillStyle = 'rgba(0,0,0,0.15)'; for (i = 0; i < 8; i++) { a = i / 8 * 7; c.beginPath(); c.arc(cx + Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3, r * 0.08, 0, 7); c.fill(); } if (t === 'wolf') { c.fillStyle = f; [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(cx + r * 0.2, s * r * 0.25); c.lineTo(cx + r * 0.55, s * r * 0.5); c.lineTo(cx + r * 0.05, s * r * 0.45); c.fill(); }); c.fillStyle = '#2a2a2a'; c.beginPath(); c.arc(cx + r * 0.46, 0, r * 0.07, 0, 7); c.fill(); } }
    else if (t === 'spitzhut') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx - r * 0.05, 0, r * 0.62, r * 0.62, 0, 0, 7); c.fill(); c.stroke(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(cx - r * 0.1, r * 0.05, r * 0.3, 0, 7); c.fill(); c.fillStyle = f; c.beginPath(); c.arc(cx - r * 0.18, r * 0.1, r * 0.13, 0, 7); c.fill(); }
    else if (t === 'mitra') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(cx, 0, r * 0.3, r * 0.44, 0, 0, 7); c.fill(); c.stroke(); c.strokeStyle = '#d4a017'; c.lineWidth = r * 0.08; c.beginPath(); c.moveTo(cx, -r * 0.42); c.lineTo(cx, r * 0.42); c.stroke(); }
    else if (t === 'eis') { c.fillStyle = f; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 1; for (i = 0; i < 8; i++) { a = i / 8 * Math.PI * 2; c.beginPath(); c.moveTo(cx + Math.cos(a - 0.18) * r * 0.34, Math.sin(a - 0.18) * r * 0.34); c.lineTo(cx + Math.cos(a) * r * (i % 2 ? 0.55 : 0.7), Math.sin(a) * r * (i % 2 ? 0.55 : 0.7)); c.lineTo(cx + Math.cos(a + 0.18) * r * 0.34, Math.sin(a + 0.18) * r * 0.34); c.fill(); c.stroke(); } c.strokeStyle = f; c.lineWidth = r * 0.1; c.beginPath(); c.arc(cx, 0, r * 0.35, 0, 7); c.stroke(); }
    else if (t === 'federn') { ring(f, 0.12); var fc = ['#c0392b', '#e8b830', '#2a64b8', '#1f8a5a', '#e8b830']; for (i = 0; i < 5; i++) { a = Math.PI + (i - 2) * 0.35; c.fillStyle = fc[i]; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.32, r * 0.1, a, 0, 7); c.fill(); } }
    else if (t === 'pilz') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, 0, r * 0.7, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#fff'; [[0, 0, 0.14], [0.35, -0.3, 0.1], [-0.3, 0.32, 0.12], [0.3, 0.35, 0.09], [-0.35, -0.3, 0.1]].forEach(function (p) { c.beginPath(); c.arc(cx + p[0] * r, p[1] * r, p[2] * r, 0, 7); c.fill(); }); }
    else if (t === 'strohhut') { c.fillStyle = f; c.strokeStyle = 'rgba(120,80,20,0.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, 0, r * 0.75, 0, 7); c.fill(); c.stroke(); c.strokeStyle = 'rgba(150,100,30,0.45)'; c.lineWidth = 1; for (i = 0; i < 12; i++) { a = i / 12 * 7; c.beginPath(); c.moveTo(cx + Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42); c.lineTo(cx + Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74); c.stroke(); } c.fillStyle = '#d9b14a'; c.beginPath(); c.arc(cx, 0, r * 0.4, 0, 7); c.fill(); c.strokeStyle = '#a0402a'; c.lineWidth = r * 0.09; c.beginPath(); c.arc(cx, 0, r * 0.42, 0, 7); c.stroke(); }
    else if (t === 'topf') { kugel(f, 0.46); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(cx - r * 0.12, -r * 0.12, r * 0.15, 0, 7); c.fill(); c.strokeStyle = '#4a4f54'; c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(cx - r * 0.05, -r * 0.45); c.lineTo(cx - r * 0.05, -r * 0.8); c.stroke(); c.fillStyle = '#4a4f54'; c.beginPath(); c.arc(cx, 0, r * 0.08, 0, 7); c.fill(); }
    else if (t === 'dreispitz') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx + r * 0.55, 0); c.lineTo(cx - r * 0.45, -r * 0.6); c.lineTo(cx - r * 0.45, r * 0.6); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#d4a017'; c.lineWidth = r * 0.06; c.stroke(); }
  }

