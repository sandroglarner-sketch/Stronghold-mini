  // ---------- König zeichnen (Optik aus KOENIGE) ----------
  // koenigMalen(c, k, r, teamCol, o): von oben, Blick nach rechts (+x), Mittelpunkt bei 0,0, ohne Schatten.
  // o.ohneWaffe = nur der König mit leeren Händen (für Bilder); o.bogen = auf der Burg (o.zieh 0..1: Bogen hervorholen/verstauen) mit Bogen (o.str, o.vib, o.arrow wie attackPose), sonst Waffe der Optik (o.rot = Hieb-Drehung um die Hände)
  // Wird im Spiel (drawUnit, king/kingbow), auf der Story-Karte, in der Königswahl und in der Bot-Datenbank benutzt.
  var koenigTeam = ['standard', 'bandit', 'standard', 'standard']; // Optik der Könige in der laufenden Partie (Index = Spieler; 2, 3 nur im Duokampf)
  var kZust = [null, null, null, null]; // je Spieler im Spiel: { zieh: Bogen 0..1, nah: Nahkampfwaffe 0..1 }, gesetzt in zeichnen.js
  var KRATZ = { alle: 15, dauer: 2.4 }; // Kopfkratzen: alle 15 s, dauert 2,4 s (halbes Tempo)
  var kKratz = [0, 0, 0, 0]; // Kopfkratzen in der Burg je Spieler (0..1 = Ablauf, 0 = nicht), gesetzt in zeichnen.js
  var KSCHRAEG = -0.5; // Nahkampfwaffe schräg nach vorn gehalten (Bogenmass)
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
    // Was hält er? nah = Nahkampfwaffe hervorgeholt (0..1), zieh = Bogen hervorgeholt (0..1); beides 0 = leere Hände
    var nah = o.ohneWaffe ? 0 : o.nah !== undefined ? o.nah : (o.bogen ? 0 : 1), zieh = o.ohneWaffe ? 0 : o.bogen ? (o.zieh === undefined ? 1 : o.zieh) : 0;
    var kratzt = o.kratz > 0 && !(nah > 0) && !(zieh > 0);
    if (nah > 0) kNah(c, k, r, o, nah);
    else if (zieh > 0) kBogen(c, k, r, o);
    else kRuhe(c, k, r, kratzt); // leere Hände
    if (k.haar) { c.fillStyle = k.haar; c.beginPath(); c.arc(-r * 0.08, 0, r * 0.44, 0, 7); c.fill(); }
    c.fillStyle = k.haut; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
    c.beginPath(); c.arc(r * 0.05, 0, r * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
    if (k.haar) { c.fillStyle = k.haar; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.36, Math.PI * 0.55, Math.PI * 1.45); c.fill(); }
    kBart(c, k, r);
    kKrone(c, k, r);
    if (kratzt) kKratzHand(c, k, r, o.kratz);
    c.restore();
  }
  // Hände in Ruhe (vorne links und rechts am Körper)
  var KRUHE = [[0.38, -0.66], [0.38, 0.66]];
  function kRuhe(c, k, r, ohneLinks) { if (!ohneLinks) kHand(c, r * KRUHE[0][0], r * KRUHE[0][1], r, k.haut); kHand(c, r * KRUHE[1][0], r * KRUHE[1][1], r, k.haut); }
  // Kopfkratzen: eine Hand geht zum Kopf, kratzt (kleines Hin und Her) und geht zurück; wird nach Kopf und Krone gezeichnet
  function kKratzHand(c, k, r, p) {
    var hin = Math.min(1, p / 0.25), zur = Math.min(1, (1 - p) / 0.25), e = Math.min(hin, zur); e = e * e * (3 - 2 * e);
    var wackel = p > 0.25 && p < 0.75 ? Math.sin((p - 0.25) * 40) * r * 0.09 : 0;
    var hx = r * KRUHE[0][0] + (r * -0.02 - r * KRUHE[0][0]) * e + wackel, hy = r * KRUHE[0][1] + (r * -0.38 - r * KRUHE[0][1]) * e;
    c.fillStyle = k.haut; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(hx, hy, r * 0.16, 0, 7); c.fill(); c.stroke(); // Hand mit Rand, damit man sie auf dem Kopf sieht
  }
  // Verzierung des Königsbogens (B.deko), passend zum König; Punkte auf dem Bogen: t 0 = oberes Ende, 0.5 = Griff, 1 = unteres Ende
  function kBogenDeko(c, B, r, L) {
    var dc = B.dc || B.enden || '#d4a017', i, t;
    var pt = function (t) { var u = 1 - t; return { x: r * (0.95 * u * u + 2 * u * t * 1.9 + 0.95 * t * t), y: r * L * (t * t - u * u) }; };
    var tg = function (t) { var u = 1 - t; return Math.atan2(r * L * (2 * t + 2 * u), r * (2 * u * (1.9 - 0.95) + 2 * t * (0.95 - 1.9))); }; // Richtung entlang des Bogens
    var band = function (t, w, col) { var p = pt(t), a = tg(t); c.save(); c.translate(p.x, p.y); c.rotate(a); c.fillStyle = col; c.fillRect(-w / 2, -r * 0.17, w, r * 0.34); c.restore(); };
    var stern = function (x, y, rr, col) { c.fillStyle = col; c.beginPath(); for (var j = 0; j < 10; j++) { var aa = -Math.PI / 2 + j * Math.PI / 5, q = j % 2 ? rr * 0.45 : rr; c.lineTo(x + Math.cos(aa) * q, y + Math.sin(aa) * q); } c.closePath(); c.fill(); };
    var tips = [pt(0), pt(1)], grip = pt(0.5);
    c.save(); c.lineCap = 'round';
    switch (B.deko) {
      case 'gold': // goldene Bänder, Edelstein am Griff, Schnörkel an den Enden
        [0.2, 0.8].forEach(function (t) { band(t, r * 0.14, dc); }); band(0.5, r * 0.3, dc);
        c.fillStyle = '#c0283a'; c.beginPath(); c.arc(grip.x + r * 0.06, grip.y, r * 0.11, 0, 7); c.fill();
        c.strokeStyle = dc; c.lineWidth = Math.max(1.5, r * 0.08); tips.forEach(function (p, j) { var sg = j ? 1 : -1; c.beginPath(); c.arc(p.x + r * 0.16, p.y + sg * r * 0.05, r * 0.14, 0, Math.PI * 1.5 * sg, sg < 0); c.stroke(); });
        break;
      case 'baender': [0.22, 0.5, 0.78].forEach(function (t) { band(t, r * 0.12, dc); }); break;
      case 'ranken': // grüne Ranke mit Blättern
        c.strokeStyle = '#3f7a32'; c.lineWidth = Math.max(1.2, r * 0.06); c.beginPath();
        for (i = 0; i <= 24; i++) { t = i / 24; var p = pt(t), a = tg(t) + Math.PI / 2, o = Math.sin(t * Math.PI * 6) * r * 0.1; c.lineTo(p.x + Math.cos(a) * o, p.y + Math.sin(a) * o); } c.stroke();
        c.fillStyle = '#5aa043'; [0.12, 0.3, 0.7, 0.88].forEach(function (t, j) { var p = pt(t); c.beginPath(); c.ellipse(p.x + r * 0.14, p.y, r * 0.16, r * 0.08, (j % 2 ? 0.6 : -0.6), 0, 7); c.fill(); });
        break;
      case 'stroh': // mit Schnur umwickelt, Strohbüschel an den Enden
        [0.3, 0.5, 0.7].forEach(function (t) { band(t, r * 0.08, '#c9a24a'); });
        c.strokeStyle = '#e6c35c'; c.lineWidth = 1.2; tips.forEach(function (p, j) { var sg = j ? 1 : -1; for (var k2 = -2; k2 <= 2; k2++) { c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x + k2 * r * 0.07, p.y + sg * r * 0.3); c.stroke(); } });
        break;
      case 'flicken': // geflickt: Knoten und Klebestreifen
        band(0.33, r * 0.2, '#cdbb92'); band(0.5, r * 0.2, '#5a3d22');
        c.strokeStyle = '#3b2a1c'; c.lineWidth = 1; var pk = pt(0.68); c.beginPath(); c.moveTo(pk.x - r * 0.12, pk.y - r * 0.08); c.lineTo(pk.x + r * 0.12, pk.y + r * 0.08); c.moveTo(pk.x - r * 0.12, pk.y + r * 0.08); c.lineTo(pk.x + r * 0.12, pk.y - r * 0.08); c.stroke();
        break;
      case 'sterne': [0.18, 0.5, 0.82].forEach(function (t) { var p = pt(t); stern(p.x, p.y, r * 0.17, dc); }); break;
      case 'feder': // Federn an beiden Enden
        tips.forEach(function (p, j) { var sg = j ? 1 : -1; for (var k2 = 0; k2 < 3; k2++) { c.fillStyle = k2 === 1 ? dc : 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(p.x + r * (0.12 + k2 * 0.1), p.y + sg * r * (0.12 + k2 * 0.05), r * 0.24, r * 0.07, sg * (0.9 - k2 * 0.25), 0, 7); c.fill(); } c.fillStyle = dc; c.beginPath(); c.ellipse(p.x + r * 0.18, p.y + sg * r * 0.16, r * 0.26, r * 0.08, sg * 0.7, 0, 7); c.fill(); });
        break;
      case 'zacken': // Dornen nach aussen
        c.fillStyle = dc; [0.15, 0.3, 0.7, 0.85].forEach(function (t) { var p = pt(t), a = tg(t) - Math.PI / 2; c.save(); c.translate(p.x, p.y); c.rotate(a); c.beginPath(); c.moveTo(-r * 0.08, 0); c.lineTo(0, -r * 0.3); c.lineTo(r * 0.08, 0); c.closePath(); c.fill(); c.restore(); });
        break;
      case 'fell': c.fillStyle = '#6b4a2b'; [grip].concat(tips).forEach(function (p) { for (var k2 = 0; k2 < 5; k2++) { c.beginPath(); c.arc(p.x + Math.cos(k2 * 1.3) * r * 0.1, p.y + Math.sin(k2 * 1.3) * r * 0.1, r * 0.1, 0, 7); c.fill(); } }); break;
      case 'runen': // leuchtende Zeichen
        c.shadowColor = dc; c.shadowBlur = r * 0.5; c.fillStyle = dc;
        [0.15, 0.32, 0.68, 0.85].forEach(function (t) { var p = pt(t); c.fillRect(p.x - r * 0.05, p.y - r * 0.09, r * 0.1, r * 0.18); });
        c.beginPath(); c.arc(grip.x, grip.y, r * 0.1, 0, 7); c.fill();
        break;
      case 'zaehne': // Wolfszähne an der Sehnenseite
        c.fillStyle = '#f2ecdc'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.8;
        [0.12, 0.22, 0.78, 0.88].forEach(function (t) { var p = pt(t), a = tg(t) + Math.PI / 2; c.save(); c.translate(p.x, p.y); c.rotate(a); c.beginPath(); c.moveTo(-r * 0.06, 0); c.lineTo(0, -r * 0.24); c.lineTo(r * 0.06, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); });
        band(0.5, r * 0.22, '#5b3d24');
        break;
      case 'mond': // goldene Mondsichel am Griff
        c.fillStyle = dc; c.beginPath(); c.arc(grip.x + r * 0.1, grip.y, r * 0.24, 0, 7); c.fill();
        c.fillStyle = B.holz; c.beginPath(); c.arc(grip.x + r * 0.2, grip.y, r * 0.2, 0, 7); c.fill();
        [0.2, 0.8].forEach(function (t) { band(t, r * 0.1, dc); });
        break;
      case 'kreuz': c.strokeStyle = dc; c.lineWidth = Math.max(1.5, r * 0.09); [grip].concat(tips).forEach(function (p) { c.beginPath(); c.moveTo(p.x + r * 0.15, p.y - r * 0.2); c.lineTo(p.x + r * 0.15, p.y + r * 0.2); c.moveTo(p.x + r * 0.03, p.y - r * 0.07); c.lineTo(p.x + r * 0.27, p.y - r * 0.07); c.stroke(); }); break;
      case 'kristall': // Eiskristalle
        c.fillStyle = '#e8f7ff'; c.strokeStyle = '#7ec4ea'; c.lineWidth = 1;
        [tips[0], grip, tips[1]].forEach(function (p, j) { var s2 = j === 1 ? r * 0.2 : r * 0.26; c.beginPath(); c.moveTo(p.x, p.y - s2); c.lineTo(p.x + s2 * 0.55, p.y); c.lineTo(p.x, p.y + s2); c.lineTo(p.x - s2 * 0.55, p.y); c.closePath(); c.fill(); c.stroke(); });
        break;
      case 'muenzen': // Münzen baumeln an den Enden
        c.strokeStyle = '#7a5a3a'; c.lineWidth = 1; tips.forEach(function (p, j) { var sg = j ? 1 : -1, mx = p.x + r * 0.05, my = p.y + sg * r * 0.3; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(mx, my); c.stroke(); c.fillStyle = '#e5c04a'; c.beginPath(); c.arc(mx, my, r * 0.13, 0, 7); c.fill(); c.strokeStyle = '#a07a1a'; c.stroke(); c.strokeStyle = '#7a5a3a'; });
        band(0.5, r * 0.2, dc);
        break;
      case 'pilz': // rote Pilzhüte mit weissen Punkten an den Enden
        tips.forEach(function (p, j) { c.fillStyle = '#c8382c'; c.beginPath(); c.arc(p.x, p.y, r * 0.22, 0, 7); c.fill(); c.fillStyle = '#fff'; [[-0.08, -0.06], [0.07, 0.04], [0, 0.11]].forEach(function (q) { c.beginPath(); c.arc(p.x + q[0] * r, p.y + q[1] * r, r * 0.04, 0, 7); c.fill(); }); });
        break;
      case 'tau': // mit Seil umwickelt
        c.strokeStyle = '#c9b07a'; c.lineWidth = 1.2; for (i = 0; i < 6; i++) { t = 0.38 + i * 0.045; var p2 = pt(t), a2 = tg(t) + Math.PI / 2; c.beginPath(); c.moveTo(p2.x - Math.cos(a2) * r * 0.16, p2.y - Math.sin(a2) * r * 0.16 - r * 0.03); c.lineTo(p2.x + Math.cos(a2) * r * 0.16, p2.y + Math.sin(a2) * r * 0.16 + r * 0.03); c.stroke(); }
        break;
      case 'horn': // Hornbogen: helle Hornstreifen, dunkle Spitzen, Lederband
        c.strokeStyle = 'rgba(255,255,255,0.45)'; c.lineWidth = Math.max(1, r * 0.06); c.beginPath(); for (i = 0; i <= 20; i++) { var p3 = pt(i / 20); c.lineTo(p3.x - r * 0.04, p3.y); } c.stroke();
        c.fillStyle = '#3a2c20'; tips.forEach(function (p) { c.beginPath(); c.arc(p.x, p.y, r * 0.12, 0, 7); c.fill(); }); band(0.5, r * 0.26, '#8a5a2e');
        break;
      case 'flamme': // Flammen an den Enden
        tips.forEach(function (p, j) { var sg = j ? 1 : -1, fl = 0.85 + 0.15 * Math.sin(performance.now() / 90 + j); c.fillStyle = '#e07a2a'; c.beginPath(); c.moveTo(p.x - r * 0.12, p.y); c.quadraticCurveTo(p.x, p.y + sg * r * 0.5 * fl, p.x + r * 0.12, p.y); c.fill(); c.fillStyle = '#ffd25a'; c.beginPath(); c.moveTo(p.x - r * 0.06, p.y); c.quadraticCurveTo(p.x, p.y + sg * r * 0.3 * fl, p.x + r * 0.06, p.y); c.fill(); });
        [0.3, 0.7].forEach(function (t) { band(t, r * 0.1, '#e07a2a'); });
        break;
    }
    c.restore();
  }
  // Eigener Bogen des Königs (k.bogen). o.zieh 0..1 = Bogen hervorholen (0 = auf dem Rücken, 1 = schussbereit); o.str/o.vib/o.arrow = Sehne und Pfeil wie attackPose
  function kBogen(c, k, r, o) {
    var B = k.bogen || { holz: '#8a6538', enden: '', sehne: '#e8e0cc', form: 0 }, e = Math.max(0, Math.min(1, o.zieh === undefined ? 1 : o.zieh));
    var ee = e * e * (3 - 2 * e), L = B.form === 2 ? 1.3 : 1.15, bereit = e >= 1;
    var str = bereit ? (o.str === undefined ? 0.5 : o.str) : 0.95, kmx = str * r;
    // Bogen: kommt vom Rücken (schräg, hinten) nach vorn
    c.save();
    c.globalAlpha *= Math.min(1, e * 4);
    c.translate(r * 0.95, 0); c.translate(-r * 1.7 * (1 - ee), r * 0.15 * (1 - ee)); c.rotate(1.25 * (1 - ee)); c.translate(-r * 0.95, 0);
    c.strokeStyle = B.holz; c.lineWidth = Math.max(3, r * 0.22);
    c.beginPath(); c.moveTo(r * 0.95, -r * L); c.quadraticCurveTo(r * 1.9, 0, r * 0.95, r * L); c.stroke();
    if (B.form === 1) { c.lineWidth = Math.max(2, r * 0.15); c.beginPath(); c.moveTo(r * 0.95, -r * L); c.quadraticCurveTo(r * 0.85, -r * (L + 0.12), r * 1.12, -r * (L + 0.2)); c.moveTo(r * 0.95, r * L); c.quadraticCurveTo(r * 0.85, r * (L + 0.12), r * 1.12, r * (L + 0.2)); c.stroke(); }
    if (B.enden) { c.fillStyle = B.enden; c.beginPath(); c.arc(r * 0.95, -r * L, r * 0.12, 0, 7); c.arc(r * 0.95, r * L, r * 0.12, 0, 7); c.fill(); c.fillRect(r * 1.3, -r * 0.14, r * 0.16, r * 0.28); }
    if (B.deko) kBogenDeko(c, B, r, L);
    c.strokeStyle = B.sehne; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(r * 0.95, -r * L); c.lineTo(bereit ? kmx : r * 0.95, bereit ? (o.vib || 0) * r : 0); c.lineTo(r * 0.95, r * L); c.stroke();
    if (bereit && o.arrow > 0) {
      c.globalAlpha *= o.arrow;
      c.strokeStyle = B.holz; c.lineWidth = 2;
      c.beginPath(); c.moveTo(kmx, 0); c.lineTo(kmx + r * 1.1, 0); c.stroke();
      c.fillStyle = KSTAHL; c.beginPath(); c.moveTo(kmx + r * 1.4, 0); c.lineTo(kmx + r * 1.0, -r * 0.14); c.lineTo(kmx + r * 1.0, r * 0.14); c.closePath(); c.fill();
    }
    c.restore();
    // Hände: von der Ruhe zum Griff (vordere Hand) und zur Sehne (hintere Hand)
    var gx = r * 0.95 - r * 1.7 * (1 - ee), gy = r * 0.15 * (1 - ee);
    kHand(c, lerpK(r * KRUHE[1][0], gx, ee), lerpK(r * KRUHE[1][1], gy, ee), r, k.haut);
    kHand(c, lerpK(r * KRUHE[0][0], Math.min(kmx, r * 0.5), ee), lerpK(r * KRUHE[0][1], 0, ee), r, k.haut);
  }
  // Nahkampfwaffe hervorholen (e 0..1): kommt wie der Bogen vom Rücken nach vorn, dann immer etwas schräg; o.rot = Hieb
  function kNah(c, k, r, o, e) {
    var ee = e * e * (3 - 2 * e);
    c.save();
    c.globalAlpha *= Math.min(1, e * 4);
    c.translate(r * 0.45, 0); c.translate(-r * 1.2 * (1 - ee), r * 0.2 * (1 - ee)); c.rotate(KSCHRAEG + 1.9 * (1 - ee) + (e >= 1 ? (o.rot || 0) : 0)); c.translate(-r * 0.45, 0);
    kWaffe(c, k, r);
    c.restore();
    if (e < 1) kHand(c, r * KRUHE[1][0], r * KRUHE[1][1], r, k.haut); // die freie Hand bleibt am Körper, bis die Waffe vorne ist
  }
  function lerpK(a, b, t) { return a + (b - a) * t; }
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
    if (m === 'waben') { c.strokeStyle = 'rgba(255,230,140,0.5)'; c.lineWidth = Math.max(1, r * 0.05); var hs = r * 0.17; for (i = 0; i < 6; i++) for (j = -4; j <= 4; j++) { var hx = -r * 0.3 - i * hs * 1.5, hy = j * hs * 1.73 + (i % 2) * hs * 0.87; c.beginPath(); for (var q = 0; q < 6; q++) c.lineTo(hx + Math.cos(q * Math.PI / 3) * hs, hy + Math.sin(q * Math.PI / 3) * hs); c.closePath(); c.stroke(); } }
    if (m === 'rauten') { c.fillStyle = 'rgba(255,255,255,0.32)'; var d = r * 0.26; for (i = 0; i < 6; i++) for (j = -3; j <= 3; j++) { var rx = -r * 0.25 - i * d, ry = j * d * 2 + (i % 2) * d; c.beginPath(); c.moveTo(rx, ry - d); c.lineTo(rx + d * 0.5, ry); c.lineTo(rx, ry + d); c.lineTo(rx - d * 0.5, ry); c.closePath(); c.fill(); } }
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
    } else if (w === 'hellebarde') { // Stange mit Spitze, Beil nach links und Haken nach rechts (wie die Wächter)
      c.strokeStyle = '#6b4520'; c.lineWidth = Math.max(2.5, r * 0.16); c.beginPath(); c.moveTo(-r * 0.2, r * 0.3); c.lineTo(r * 3.3, r * 0.3); c.stroke();
      c.fillStyle = k.wf; c.strokeStyle = s; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(r * 3.9, r * 0.3); c.lineTo(r * 3.25, r * 0.17); c.lineTo(r * 3.25, r * 0.43); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 2.75, r * 0.24); c.quadraticCurveTo(r * 2.7, -r * 0.45, r * 3.05, -r * 0.55); c.quadraticCurveTo(r * 3.35, -r * 0.2, r * 3.25, r * 0.24); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(r * 2.9, r * 0.36); c.lineTo(r * 2.72, r * 0.75); c.lineTo(r * 3.1, r * 0.36); c.closePath(); c.fill(); c.stroke();
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
    else if (t === 'eule') { // Eulenhelm: Federohren hinten, grosse gelbe Augen und Schnabel vorn
      c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5;
      [-1, 1].forEach(function (s) { c.beginPath(); c.moveTo(cx - r * 0.05, s * r * 0.3); c.lineTo(cx - r * 0.4, s * r * 0.66); c.lineTo(cx - r * 0.32, s * r * 0.18); c.closePath(); c.fill(); c.stroke(); });
      kugel(f, 0.45); c.fillStyle = 'rgba(255,255,255,0.16)'; c.beginPath(); c.arc(cx - r * 0.12, 0, r * 0.24, 0, 7); c.fill();
      [-1, 1].forEach(function (s) { c.fillStyle = '#f2c230'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1; c.beginPath(); c.arc(cx + r * 0.24, s * r * 0.16, r * 0.12, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#1b1b1b'; c.beginPath(); c.arc(cx + r * 0.28, s * r * 0.16, r * 0.055, 0, 7); c.fill(); });
      c.fillStyle = '#d9822b'; c.beginPath(); c.moveTo(cx + r * 0.52, 0); c.lineTo(cx + r * 0.37, -r * 0.06); c.lineTo(cx + r * 0.37, r * 0.06); c.closePath(); c.fill();
    }
    else if (t === 'kerzen') { // Goldreif mit brennenden Kerzen
      ring(f, 0.12);
      for (i = 0; i < 6; i++) { a = i / 6 * Math.PI * 2 + 0.5; var kx = cx + Math.cos(a) * r * 0.36, ky = Math.sin(a) * r * 0.36;
        c.fillStyle = 'rgba(255,170,40,0.3)'; c.beginPath(); c.arc(kx, ky, r * 0.18, 0, 7); c.fill();
        c.fillStyle = '#f4efe0'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(kx, ky, r * 0.1, 0, 7); c.fill(); c.stroke();
        c.fillStyle = '#ffb52e'; c.beginPath(); c.arc(kx, ky, r * 0.055, 0, 7); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(kx, ky, r * 0.025, 0, 7); c.fill(); }
    }
    else if (t === 'bienenkorb') { // Strohkorb (Ringe von oben) mit drei Bienen
      kugel(f, 0.52); c.strokeStyle = 'rgba(120,80,20,0.5)'; c.lineWidth = Math.max(1, r * 0.05);
      for (i = 1; i <= 4; i++) { c.beginPath(); c.arc(cx - r * 0.02, 0, r * 0.12 * i, 0, 7); c.stroke(); }
      c.fillStyle = '#3a2a14'; c.beginPath(); c.arc(cx - r * 0.02, 0, r * 0.06, 0, 7); c.fill();
      [[0.55, -0.58, 0.5], [-0.45, 0.66, -0.8], [0.62, 0.52, 2.2]].forEach(function (p) {
        c.save(); c.translate(cx + p[0] * r, p[1] * r); c.rotate(p[2]);
        c.fillStyle = 'rgba(255,255,255,0.75)'; [-1, 1].forEach(function (s) { c.beginPath(); c.ellipse(-r * 0.02, s * r * 0.08, r * 0.06, r * 0.04, s * 0.5, 0, 7); c.fill(); });
        c.fillStyle = '#f2c230'; c.beginPath(); c.ellipse(0, 0, r * 0.11, r * 0.065, 0, 0, 7); c.fill();
        c.strokeStyle = '#1b1b1b'; c.lineWidth = Math.max(1, r * 0.035); [-0.03, 0.04].forEach(function (x) { c.beginPath(); c.moveTo(x * r, -r * 0.06); c.lineTo(x * r, r * 0.06); c.stroke(); });
        c.restore();
      });
    }
    else if (t === 'narrenkappe') { // Narrenkappe: drei Zipfel nach hinten (Farbe und Umhangfarbe) mit goldenen Schellen
      var nf = [f, k.umhang === 'team' ? '#f1ece0' : k.umhang, f];
      [Math.PI * 0.62, Math.PI, Math.PI * 1.38].forEach(function (a2, j) {
        var ex = cx + Math.cos(a2) * r * 0.95, ey = Math.sin(a2) * r * 0.95;
        c.fillStyle = nf[j]; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath();
        c.moveTo(cx + Math.cos(a2 - 0.7) * r * 0.38, Math.sin(a2 - 0.7) * r * 0.38);
        c.quadraticCurveTo(cx + Math.cos(a2 - 0.25) * r * 0.8, Math.sin(a2 - 0.25) * r * 0.8, ex, ey);
        c.quadraticCurveTo(cx + Math.cos(a2 + 0.25) * r * 0.8, Math.sin(a2 + 0.25) * r * 0.8, cx + Math.cos(a2 + 0.7) * r * 0.38, Math.sin(a2 + 0.7) * r * 0.38);
        c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#e8b830'; c.beginPath(); c.arc(ex, ey, r * 0.1, 0, 7); c.fill(); c.stroke();
      });
      kugel(f, 0.44); c.strokeStyle = '#e8b830'; c.lineWidth = r * 0.08; c.beginPath(); c.arc(cx, 0, r * 0.4, -1.3, 1.3); c.stroke();
    }
    else if (t === 'pfau') { // Pfauenfedern als Fächer hinter dem Kopf, schmaler Goldreif
      for (i = 0; i < 7; i++) { a = Math.PI + (i - 3) * 0.32;
        c.fillStyle = '#1f7a6a'; c.beginPath(); c.ellipse(cx + Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85, r * 0.4, r * 0.12, a, 0, 7); c.fill();
        var ox = cx + Math.cos(a) * r * 1.1, oy = Math.sin(a) * r * 1.1;
        c.fillStyle = '#2a8ad0'; c.beginPath(); c.arc(ox, oy, r * 0.13, 0, 7); c.fill(); c.fillStyle = '#e8b830'; c.beginPath(); c.arc(ox, oy, r * 0.08, 0, 7); c.fill(); c.fillStyle = '#1a2a6a'; c.beginPath(); c.arc(ox, oy, r * 0.045, 0, 7); c.fill(); }
      ring(f, 0.1); c.fillStyle = '#2a8ad0'; c.beginPath(); c.arc(cx + r * 0.38, 0, r * 0.08, 0, 7); c.fill();
    }
    else if (t === 'dreispitz') { c.fillStyle = f; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx + r * 0.55, 0); c.lineTo(cx - r * 0.45, -r * 0.6); c.lineTo(cx - r * 0.45, r * 0.6); c.closePath(); c.fill(); c.stroke(); c.strokeStyle = '#d4a017'; c.lineWidth = r * 0.06; c.stroke(); }
  }

