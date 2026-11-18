  // ---------- Zeichnen ----------

  // ---------- Angriffsanimationen ----------
  // ANIM[type] = { wind: Sekunden Ausholen vor dem Treffer, after: Sekunden Nachschwingen danach }.
  // attackPose liefert die Stellung für drawUnit; at = Sekunden relativ zum Treffer/Abschuss (undefined = Ruhe).
  var LAUNCH = { javelin: [1.2, -0.5], crossbow: [1.6, 0], trebuchet: [0, 0], // Trebuchet: Steine kommen mittig heraus (dort pendelt die Schlinge oben aus)
    archer: [1.4, 0], baliste: [1.6, 0], onager: [0.4, 0], mage: [1.9, 0.35], catapult: [1.2, 0] }; // Abschusspunkt der Geschosse (Vielfache von r, vor der Einheit)
  function launchPt(u, d, tx, ty) { var L = LAUNCH[u.type]; if (!L) return { x: u.x, y: u.y }; var a = Math.atan2(ty - u.y, tx - u.x), ca = Math.cos(a), sa = Math.sin(a); return { x: u.x + (ca * L[0] - sa * L[1]) * d.r, y: u.y + (sa * L[0] + ca * L[1]) * d.r }; } // nur Darstellung (Effekte)
  // Stellung für die Darstellung: kurz vor dem Treffer ausholen (u.ready = Ziel in Reichweite, u.cd = Restzeit), danach nachschwingen (u.atkT = Zeitpunkt des letzten Angriffs)
  function unitAt(u, type) {
    var a = ANIM[type]; if (!a) return undefined;
    if (u.ready && u.cd > 0 && u.cd <= a.wind) return -u.cd;
    if (u.atkT !== undefined && clock - u.atkT <= a.after) return clock - u.atkT;
    return undefined;
  }
  var ANIM = {
    spear: { wind: 0.3, after: 0.25 }, rider: { wind: 0.3, after: 0.25 }, knight: { wind: 0.32, after: 0.25 }, digger: { wind: 0.3, after: 0.25 },
    javelin: { wind: 0.35, after: 0.55 }, crossbow: { wind: 0.15, after: 1.2 }, trebuchet: { wind: 0.3, after: 2.3 }, sword: { wind: 0.32, after: 0.25 }, ladder: { wind: 0.32, after: 0.25 },
    king: { wind: 0.35, after: 0.3 }, kingbow: { wind: 0.45, after: 0.45 }, archer: { wind: 0.45, after: 0.45 }, mage: { wind: 0.45, after: 0.45 },
    ram: { wind: 0.4, after: 0.3 }, catapult: { wind: 0.7, after: 1.25 }, onager: { wind: 0.5, after: 1.3 }, baliste: { wind: 0.15, after: 1.6 }
  };
  function sm(k) { k = k < 0 ? 0 : k > 1 ? 1 : k; return k * k * (3 - 2 * k); }
  // Ausholen und Zuschlagen: back = Wert beim Ausholen, hitV = Wert beim Treffer; danach zurück zu 0
  function swing(at, W, Aft, back, hitV, split) {
    split = split || 0.7;
    if (at === undefined || at < -W || at > Aft) return 0;
    if (at < 0) { var k = (at + W) / W; return k < split ? back * sm(k / split) : lerp(back, hitV, sm((k - split) / (1 - split))); }
    return hitV * (1 - sm(at / Aft));
  }
  function attackPose(type, at, r) {
    var a = ANIM[type], P0 = { off: 0, rot: 0, lunge: 0, arm: Math.PI, ball: 1, str: 0, vib: 0, tens: 0, arrow: 1, bolt: 1, orb: 1, glow: 0, spin: 0 };
    if (type === 'archer') P0.arrow = 0; // der Bogenschütze legt den Pfeil erst beim Spannen auf
    if (type === 'crossbow') P0.str = 0; // Armbrust gespannt, Bolzen eingelegt
    if (type === 'archer') P0.str = 0; if (type === 'kingbow') P0.str = 0.5; if (type === 'baliste') { P0.str = -0.45; P0.tens = 1; }
    if (!a || at === undefined || at < -a.wind || at > a.after) return P0;
    var W = a.wind, F = a.after;
    if (type === 'spear') P0.off = swing(at, W, F, -0.5 * r, 0.75 * r);
    else if (type === 'rider') { P0.off = swing(at, W, F, -0.45 * r, 0.8 * r); P0.lunge = swing(at, W, F, -0.1 * r, 0.2 * r); }
    else if (type === 'ram') P0.off = swing(at, W, F, -0.7 * r, 0.45 * r);
    else if (type === 'knight' || type === 'sword') { P0.rot = swing(at, W, F, -1.15, 0.55); P0.off = swing(at, W, F, 0, 0.12 * r); }
    else if (type === 'ladder') P0.rot = swing(at, W, F, -1.15, 0.55);
    else if (type === 'king') P0.rot = swing(at, W, F, -1.0, 0.45);
    else if (type === 'digger') P0.rot = swing(at, W, F, 1.1, -0.35);
    else if (type === 'archer' || type === 'kingbow') {
      var rest = type === 'archer' ? 0 : 0.5, full = type === 'archer' ? -1.05 : 0.05, straight = type === 'archer' ? 0 : 0.95;
      if (at < 0) { var dk = sm((at + W) / W); P0.str = lerp(rest, full, dk); P0.tens = dk; P0.arrow = type === 'archer' ? Math.min(1, dk * 4) : 1; }
      else { var vk = at / F; P0.str = straight; P0.vib = Math.sin(at * 70) * 0.18 * Math.max(0, 1 - at / 0.2); P0.arrow = type === 'archer' || vk < 0.55 ? 0 : sm((vk - 0.55) / 0.45); if (type === 'kingbow' && vk > 0.55) P0.str = lerp(straight, rest, sm((vk - 0.55) / 0.45)); }
    }
    else if (type === 'mage') {
      if (at < 0) { var gk = sm((at + W) / W); P0.glow = gk; P0.off = 0.25 * r * gk; P0.spin = at * 9; }
      else { var mk = at / F; P0.orb = 0.25 + 0.75 * sm(mk); P0.off = 0.25 * r * (1 - sm(mk * 2)); }
    }
    else if (type === 'catapult') {
      var th0 = Math.PI;
      if (at < -0.22) { P0.arm = th0 + 0.18 * sm((at + W) / (W - 0.22)); } // spannt sich etwas nach unten
      else if (at <= 0) { P0.arm = lerp(th0 + 0.18, 0.25, sm((at + 0.22) / 0.22)); } // schnellt nach vorne über das Gestell
      else if (at < 0.25) { P0.arm = 0.25 - 0.15 * Math.sin(at / 0.25 * Math.PI); P0.ball = 0; } // schlägt an den Querbalken, federt
      else { var rk = sm((at - 0.25) / (F - 0.45)); P0.arm = lerp(0.25, th0, rk); P0.ball = sm((at - (F - 0.3)) / 0.3); } // wird zurückgekurbelt, Kugel nachgelegt
    }
    else if (type === 'onager') { // Arm liegt hinten (π), schnellt hoch gegen den Prellbalken (fast senkrecht), wird zurückgekurbelt, neuer Stein
      var oh0 = Math.PI, oh1 = 1.35;
      if (at < -0.15) { P0.arm = oh0 + 0.12 * sm((at + W) / (W - 0.15)); }
      else if (at <= 0) { P0.arm = lerp(oh0 + 0.12, oh1, sm((at + 0.15) / 0.15)); }
      else if (at < 0.2) { P0.arm = oh1 + 0.15 * Math.sin(at / 0.2 * Math.PI); P0.ball = 0; }
      else { P0.arm = lerp(oh1, oh0, sm((at - 0.2) / (F - 0.45))); P0.ball = sm((at - (F - 0.3)) / 0.3); }
    }
    else if (type === 'javelin') { // ausholen (Speer nach hinten), werfen; danach neuen Speer aus dem Köcher ziehen
      if (at < 0) { P0.off = swing(at, W, F, -0.55 * r, 0.3 * r, 0.75); P0.arrow = 1; }
      else { P0.off = 0.3 * r * (1 - sm(at / 0.15)); P0.arrow = at < 0.25 ? 0 : sm((at - 0.25) / 0.3); }
    }
    else if (type === 'crossbow') { // Abzug: Sehne schnellt vor, Bolzen weg; dann Sehne zurückkurbeln, neuer Bolzen
      if (at < 0) { P0.str = 0; P0.arrow = 1; P0.off = -0.05 * r * sm((at + W) / W); }
      else if (at < 0.15) { P0.str = 1; P0.arrow = 0; P0.vib = Math.sin(at * 90) * 0.15 * (1 - at / 0.15); P0.off = -0.12 * r * (1 - at / 0.15); }
      else { var xk = sm((at - 0.15) / (F - 0.4)); P0.str = 1 - xk; P0.arrow = sm((at - (F - 0.25)) / 0.25); P0.tens = xk; }
    }
    else if (type === 'trebuchet') { // Variante B: Arm (arm = Winkel des langen Arms, π+0,55 = hinten unten, π/2 = senkrecht oben) schnellt in W s hoch,
      // das Gegengewicht fällt unter der Achse durch; Schlinge (psi: π = hängt nach hinten, π/2 = genau über der Mitte = Abwurf, < 0 = pendelt nach vorne aus)
      var tb0 = Math.PI + 0.55, tbr = Math.PI / 2;
      P0.treb = true;
      if (at <= 0) { var tk = (at + W) / W; P0.arm = lerp(tb0, tbr, sm(tk)); P0.psi = lerp(Math.PI, Math.PI / 2, Math.pow(tk, 2.2)); }
      else if (at < 1.2) { var td2 = at / 1.2; P0.arm = tbr - 0.9 * Math.sin(td2 * 2.5 * Math.PI) * Math.exp(-td2 * 2.2) - 0.15 * sm(td2); P0.psi = lerp(Math.PI / 2, -1.2, sm(td2 * 2)); P0.ball = 0; }
      else { var tr2 = sm((at - 1.2) / (F - 1.3)); P0.arm = lerp(tbr - 0.15, tb0, tr2); P0.psi = lerp(-1.2, Math.PI, tr2); P0.ball = sm((at - (F - 0.3)) / 0.3); }
    }
    else if (type === 'baliste') {
      if (at < 0) { P0.str = -0.45 - 0.1 * sm((at + W) / W); } // letzter Ruck am Abzug
      else if (at < 0.25) { P0.str = 0.55; P0.tens = 0; P0.bolt = 0; P0.vib = Math.sin(at * 80) * 0.25 * (1 - at / 0.25); }
      else { var ck = sm((at - 0.25) / (F - 0.6)); P0.str = lerp(0.55, -0.45, ck); P0.tens = ck; P0.bolt = sm((at - (F - 0.35)) / 0.35); } // Sehne wird zurückgekurbelt, neuer Bolzen
    }
    return P0;
  }
  function drawUnit(c, type, x, y, r, team, face, hit, settled, at, ang) { // ang = Blickrichtung in Bogenmass (gedreht statt gespiegelt), sonst face = ±1 // at = Sekunden relativ zum Treffer (negativ = Ausholen, positiv = danach), undefined = keine Angriffsanimation
    var A = attackPose(type, at, r);
    if (type === 'knight') r *= 0.85; // Ritter optisch kleiner (nur Darstellung)
    var col = team === 0 ? P.me : P.foe;
    c.save();
    c.translate(x, y);
    c.fillStyle = P.shade;
    c.beginPath(); c.ellipse(1, r * 0.75, r * 0.95, r * 0.5, 0, 0, Math.PI * 2); c.fill();
    if (ang !== undefined) c.rotate(ang); else c.scale(face, 1);
    c.lineCap = 'round';

    if (type === 'rider') {
      // Pferd von oben: Körper, Kopf, Schweif
      c.translate(A.lunge, 0);
      c.fillStyle = P.wood;
      c.strokeStyle = 'rgba(0,0,0,0.45)';
      c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, 0, r * 1.3, r * 0.66, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.ellipse(r * 1.45, 0, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(-r * 1.25, 0); c.lineTo(-r * 1.8, r * 0.3); c.stroke();
    }

    var bodyR = type === 'knight' ? r * 0.9 : type === 'rider' ? r * 0.6 : (type === 'ram' || type === 'catapult' || type === 'shield' || type === 'baliste' || type === 'king' || type === 'kingbow' || type === 'belfry' || type === 'trebuchet' || type === 'onager') ? 0 : r * 0.9;
    c.fillStyle = col;
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, bodyR, 0, Math.PI * 2); c.fill(); c.stroke();

    if (type === 'spear') {
      c.fillStyle = '#8a6a44'; // brauner Lederhelm wie der Speerwerfer
      c.beginPath(); c.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.save(); c.translate(A.off, 0); // Stoss: Speer wird zurückgezogen und nach vorne geschoben
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(-r * 0.3, r * 0.5); c.lineTo(r * 2.0, r * 0.5); c.stroke();
      c.fillStyle = P.steel;
      c.beginPath(); c.moveTo(r * 2.35, r * 0.5); c.lineTo(r * 1.85, r * 0.22); c.lineTo(r * 1.85, r * 0.78); c.closePath(); c.fill();
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.35, r * 0.5, r * 0.15, 0, Math.PI * 2); c.fill(); // Hand
      c.restore();
    } else if (type === 'ram') {
      // Rammbock von oben: Karren mit Rädern, Dach in Teamfarbe, Balken mit Eisenkopf
      c.fillStyle = '#5e3b18'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
      [-1, 1].forEach(function (sg) {
        rr(c, -r * 0.8, sg * r * 0.88 - r * 0.14, r * 0.9, r * 0.28, 3); c.fill(); c.stroke();
        rr(c, r * 0.25, sg * r * 0.88 - r * 0.14, r * 0.9, r * 0.28, 3); c.fill(); c.stroke();
      });
      c.strokeStyle = P.wood; c.lineWidth = Math.max(3, r * 0.4);
      c.beginPath(); c.moveTo(-r * 0.9 + A.off, 0); c.lineTo(r * 2.1 + A.off, 0); c.stroke(); // Balken schwingt zurück und nach vorne
      c.fillStyle = '#a0763f';
      rr(c, -r * 1.0, -r * 0.75, r * 2.0, r * 1.5, 4); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.2)';
      c.fillRect(-r * 0.1, -r * 0.75, r * 0.12, r * 1.5);
      c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1.5;
      for (var pi = -3; pi <= 3; pi++) { c.beginPath(); c.moveTo(-r * 0.95, pi * r * 0.2); c.lineTo(r * 0.95, pi * r * 0.2); c.stroke(); }
      c.strokeStyle = col; c.lineWidth = r * 0.2; c.strokeRect(-r * 0.88, -r * 0.63, r * 1.76, r * 1.26); // Teamfarbe nur als Rand
      c.fillStyle = '#6f7680';
      [-0.5, 0.5].forEach(function (y) { c.beginPath(); c.arc(r * 0.8, y * r, r * 0.09, 0, Math.PI * 2); c.fill(); });
      c.fillStyle = P.steel; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(r * 2.7 + A.off, 0); c.lineTo(r * 2.0 + A.off, -r * 0.45); c.lineTo(r * 2.0 + A.off, r * 0.45); c.closePath(); c.fill(); c.stroke();
    } else if (type === 'shield') {
      // Belagerungsschild von oben (Schilddach): nach vorne gekippte Holzplatte mit Eisenrahmen und -kreuz,
      // hinten angehoben (breiter), vorne schmaler mit dunkler Kante; der Träger ist hinten nur halb verdeckt zu sehen
      var s = r * 1.2; // 20 % grösser dargestellt
      var poly = function (p) { c.beginPath(); for (var i = 0; i < p.length; i++) { if (i) c.lineTo(p[i][0] * s, p[i][1] * s); else c.moveTo(p[i][0] * s, p[i][1] * s); } c.closePath(); };
      // Träger: Schultern, Hände, Helm
      c.fillStyle = col;
      c.beginPath(); c.ellipse(-0.88 * s, 0, 0.3 * s, 0.78 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#d9a066';
      c.beginPath(); c.arc(-0.62 * s, -0.62 * s, 0.13 * s, 0, Math.PI * 2); c.arc(-0.62 * s, 0.62 * s, 0.13 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.steel;
      c.beginPath(); c.arc(-0.72 * s, 0, 0.3 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.beginPath(); c.arc(-0.77 * s, -0.05 * s, 0.14 * s, 0, Math.PI * 2); c.fill();
      // Schatten der Platte auf dem Boden
      c.fillStyle = 'rgba(0,0,0,0.27)';
      poly([[-0.55, -1.05], [1.25, -0.95], [1.25, 1.1], [-0.55, 1.2]]); c.fill();
      var SP = [[-0.8, -1.25], [0.8, -1.0], [0.8, 1.0], [-0.8, 1.25]];
      var sg = c.createLinearGradient(-0.8 * s, 0, 0.8 * s, 0);
      sg.addColorStop(0, '#b98a52'); sg.addColorStop(1, '#80582c');
      poly(SP); c.fillStyle = sg; c.fill();
      c.save(); poly(SP); c.clip();
      c.strokeStyle = 'rgba(70,40,15,0.75)'; c.lineWidth = Math.max(1, s * 0.04);
      for (var pl = 1; pl < 5; pl++) { var px = (-0.8 + 1.6 * pl / 5) * s; c.beginPath(); c.moveTo(px, -1.3 * s); c.lineTo(px, 1.3 * s); c.stroke(); }
      c.restore();
      c.strokeStyle = P.steel; c.lineJoin = 'round'; c.lineWidth = Math.max(2, s * 0.08);
      poly(SP); c.stroke();
      c.lineWidth = Math.max(2, s * 0.07);
      c.beginPath(); c.moveTo(-0.8 * s, -1.25 * s); c.lineTo(0.8 * s, 1.0 * s); c.moveTo(0.8 * s, -1.0 * s); c.lineTo(-0.8 * s, 1.25 * s); c.stroke();
      c.fillStyle = P.steel; c.beginPath(); c.arc(0, 0, 0.18 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-0.04 * s, -0.04 * s, 0.07 * s, 0, Math.PI * 2); c.fill();
      // Vorderkante (Dicke) mit Teamfarbe
      c.fillStyle = '#4a3218'; poly([[0.8, -1.0], [0.95, -0.95], [0.95, 0.95], [0.8, 1.0]]); c.fill();
      c.fillStyle = col; poly([[0.82, -0.55], [0.93, -0.53], [0.93, 0.53], [0.82, 0.55]]); c.fill();
    } else if (type === 'catapult') {
      // Katapult von oben: Holzrahmen auf Rädern, Wurfarm mit glühender Kugel
      c.fillStyle = '#3b2b1b';
      c.beginPath(); c.ellipse(-r * 0.55, -r * 0.8, r * 0.32, r * 0.16, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(-r * 0.55, r * 0.8, r * 0.32, r * 0.16, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 0.55, -r * 0.8, r * 0.32, r * 0.16, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 0.55, r * 0.8, r * 0.32, r * 0.16, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.wood;
      rr(c, -r * 1.0, -r * 0.7, r * 2.0, r * 1.4, 4); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = col;
      rr(c, r * 0.1, -r * 0.45, r * 0.7, r * 0.9, 3); c.fill(); // Teamkasten vorne
      // Wurfarm dreht um die Querstrebe (Drehpunkt -0.2r) nach vorne über das Gestell: von oben wird er kürzer, die Schale grösser (höher)
      var cpx = -r * 0.2, cth = A.arm, ctx2 = cpx + r * 1.45 * Math.cos(cth), chi = Math.max(0, Math.sin(cth)), csc = 1 + 0.25 * chi;
      if (chi > 0.05) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(ctx2 + chi * r * 0.5, chi * r * 0.6, r * 0.45, 0, Math.PI * 2); c.fill(); } // Schatten der erhobenen Schale
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.28 * (1 + 0.3 * chi));
      c.beginPath(); c.moveTo(cpx - r * 0.5 * Math.cos(cth), 0); c.lineTo(ctx2, 0); c.stroke();
      c.lineWidth = Math.max(3, r * 0.2);
      c.beginPath(); c.moveTo(-r * 0.2, -r * 0.75); c.lineTo(-r * 0.2, r * 0.75); c.stroke(); // Querstrebe
      c.fillStyle = '#4a3b2a';
      c.beginPath(); c.arc(ctx2 - r * 0.1 * Math.cos(cth), 0, r * 0.5 * csc, 0, Math.PI * 2); c.fill();
      if (A.ball > 0) { // Kugel in der Schale (fehlt nach dem Wurf, wird nachgeladen)
        c.globalAlpha = A.ball;
        c.fillStyle = '#ff7a1a';
        c.beginPath(); c.arc(ctx2 - r * 0.1 * Math.cos(cth), 0, r * 0.34 * csc, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffd34a';
        c.beginPath(); c.arc(ctx2 - r * 0.17 * Math.cos(cth), -r * 0.07, r * 0.16 * csc, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
      }
    } else if (type === 'onager') {
      // Onager von oben: kleiner Rahmen auf 4 Rädern, Torsionsbündel, ein Wurfarm mit Schlinge und grauem Stein.
      // settled = Aufbaugrad 0..1: fahrend zusammengebaut (Arm festgezurrt, kein Stein), aufgebaut mit seitlichen Stützen, Prellbalken und Stein
      var os = settled || 0;
      c.fillStyle = '#3b2b1b'; c.globalAlpha = 1 - (settled || 0); // Räder werden beim Aufbauen abgenommen (verschwinden)
      [[-0.55, -0.8], [-0.55, 0.8], [0.55, -0.8], [0.55, 0.8]].forEach(function (w) { c.beginPath(); c.ellipse(w[0] * r, w[1] * r, r * 0.32, r * 0.16, 0, 0, Math.PI * 2); c.fill(); });
      c.globalAlpha = 1;
      if (os > 0) { // seitliche Stützen klappen aus
        c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(2, r * 0.14);
        [-1, 1].forEach(function (sg) {
          c.beginPath(); c.moveTo(-r * 0.8, sg * r * 0.6); c.lineTo(-r * (0.8 + 0.4 * os), sg * r * (0.6 + 0.6 * os)); c.stroke();
          c.beginPath(); c.moveTo(r * 0.8, sg * r * 0.6); c.lineTo(r * (0.8 + 0.4 * os), sg * r * (0.6 + 0.6 * os)); c.stroke();
        });
      }
      c.fillStyle = P.wood;
      rr(c, -r * 1.0, -r * 0.7, r * 2.0, r * 1.4, 4); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2; c.stroke();
      c.fillStyle = col; rr(c, -r * 0.95, -r * 0.45, r * 0.45, r * 0.9, 3); c.fill(); // Teamkasten hinten
      c.fillStyle = '#6b5a3c'; rr(c, r * 0.05, -r * 0.8, r * 0.38, r * 1.6, 3); c.fill(); // Torsionsbündel (Seile)
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
      for (var oq = -0.7; oq <= 0.61; oq += 0.2) { c.beginPath(); c.moveTo(r * 0.05, oq * r); c.lineTo(r * 0.43, (oq + 0.1) * r); c.stroke(); }
      if (os > 0) { c.globalAlpha = os; c.fillStyle = '#5e3b18'; rr(c, r * 0.68, -r * 0.62, r * 0.24, r * 1.24, 2); c.fill(); c.fillStyle = '#a08356'; rr(c, r * 0.62, -r * 0.38, r * 0.12, r * 0.76, 2); c.fill(); c.globalAlpha = 1; } // Prellbalken mit Polster
      // Wurfarm: Drehpunkt im Bündel, liegt hinten (π); von oben wird er beim Hochschnellen kürzer, die Schlinge grösser
      var opx = r * 0.24, oth = A.arm, ochi = Math.max(0, Math.sin(oth)), oex = opx + r * 1.25 * Math.cos(oth), osc = 1 + 0.3 * ochi;
      if (ochi > 0.05) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.arc(oex + ochi * r * 0.4, ochi * r * 0.5, r * 0.3, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.26 * (1 + 0.3 * ochi));
      c.beginPath(); c.moveTo(opx, 0); c.lineTo(oex, 0); c.stroke();
      if (os < 1) { c.globalAlpha = 1 - os; c.strokeStyle = '#c9b48a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-r * 0.5, -r * 0.5); c.lineTo(-r * 0.5, r * 0.5); c.moveTo(-r * 0.2, -r * 0.5); c.lineTo(-r * 0.2, r * 0.5); c.stroke(); c.globalAlpha = 1; } // festgezurrt (Seile) beim Fahren
      c.fillStyle = '#4a3b2a'; c.beginPath(); c.arc(oex, 0, r * 0.42 * osc, 0, Math.PI * 2); c.fill(); // Schlinge
      var ob = A.ball * os;
      if (ob > 0) { c.globalAlpha = ob; c.fillStyle = '#878983'; c.beginPath(); c.arc(oex, 0, r * 0.32 * osc, 0, Math.PI * 2); c.fill(); c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(oex - r * 0.09, -r * 0.09, r * 0.11 * osc, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1; }
    } else if (type === 'baliste') {
      // Baliste von oben: Holzrahmen auf Rädern, zwei Bogenarme mit Sehne, Bolzen in der Rinne
      c.fillStyle = '#3b2b1b';
      c.beginPath(); c.ellipse(-r * 0.5, -r * 0.85, r * 0.3, r * 0.15, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(-r * 0.5, r * 0.85, r * 0.3, r * 0.15, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 0.5, -r * 0.85, r * 0.3, r * 0.15, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(r * 0.5, r * 0.85, r * 0.3, r * 0.15, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = P.wood;
      rr(c, -r * 1.0, -r * 0.3, r * 2.0, r * 0.6, 3); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2; c.stroke();
      var bsx = A.str * r, bay = r * (1.05 - 0.12 * A.tens); // Sehne: gespannt hinten (-0.45r), nach dem Schuss vorne gerade; gespannte Arme biegen sich stärker
      c.strokeStyle = P.wood; c.lineWidth = Math.max(3, r * 0.26); c.lineCap = 'round';
      c.beginPath(); c.moveTo(r * 0.55, -bay); c.quadraticCurveTo(r * (0.75 + 0.2 * A.tens), 0, r * 0.55, bay); c.stroke();
      c.strokeStyle = col; c.lineWidth = 2;
      c.beginPath(); c.moveTo(r * 0.55, -bay); c.lineTo(bsx, A.vib * r); c.lineTo(r * 0.55, bay); c.stroke();
      if (A.bolt > 0) {
        c.globalAlpha = A.bolt;
        c.strokeStyle = '#4a3b2a'; c.lineWidth = Math.max(3, r * 0.2);
        c.beginPath(); c.moveTo(-r * 0.45, 0); c.lineTo(r * 1.3, 0); c.stroke();
        c.fillStyle = P.steel;
        c.beginPath(); c.moveTo(r * 1.75, 0); c.lineTo(r * 1.2, -r * 0.3); c.lineTo(r * 1.2, r * 0.3); c.closePath(); c.fill();
        c.globalAlpha = 1;
      }
    } else if (type === 'king' || type === 'kingbow') {
      // König von oben: Umhang in Teamfarbe, Rüstung, Krone; mit Bogen (auf der Burg) oder großem Zweihänder (ohne Burg)
      var gold1 = '#d4a017';
      c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 2; // Umhang: schmal, gedeckt (Teamfarbe nur als Tönung)
      c.beginPath(); c.moveTo(-r * 0.1, -r * 0.75); c.lineTo(-r * 1.2, -r * 0.95); c.quadraticCurveTo(-r * 1.4, 0, -r * 1.2, r * 0.95); c.lineTo(-r * 0.1, r * 0.75); c.closePath();
      c.fillStyle = col; c.fill(); c.fillStyle = 'rgba(0,0,0,0.3)'; c.fill(); c.stroke(); // Umhang: Teamfarbe, etwas abgedunkelt
      c.fillStyle = '#7d8790'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(0, 0, r * 0.55, r * 0.88, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (type === 'king') {
        // Zweihänder: langes Blatt nach vorn, goldene Parierstange, beide Hände am Griff (Hieb: dreht um die Hände)
        c.save(); c.translate(r * 0.45, 0); c.rotate(A.rot); c.translate(-r * 0.45, 0);
        c.fillStyle = P.steel; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(r * 3.5, 0); c.lineTo(r * 3.1, -r * 0.2); c.lineTo(r * 0.9, -r * 0.2); c.lineTo(r * 0.9, r * 0.2); c.lineTo(r * 3.1, r * 0.2); c.closePath(); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r * 1.0, 0); c.lineTo(r * 3.2, 0); c.stroke();
        c.strokeStyle = gold1; c.lineWidth = Math.max(3, r * 0.22);
        c.beginPath(); c.moveTo(r * 0.85, -r * 0.62); c.lineTo(r * 0.85, r * 0.62); c.stroke();
        c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.2);
        c.beginPath(); c.moveTo(r * 0.2, 0); c.lineTo(r * 0.85, 0); c.stroke();
        c.fillStyle = '#d9a066';
        c.beginPath(); c.arc(r * 0.45, -r * 0.13, r * 0.14, 0, Math.PI * 2); c.arc(r * 0.7, r * 0.13, r * 0.14, 0, Math.PI * 2); c.fill();
        c.restore();
      } else {
        // Bogen mit aufgelegtem Pfeil
        c.strokeStyle = P.wood; c.lineWidth = Math.max(3, r * 0.22);
        c.beginPath(); c.moveTo(r * 0.95, -r * 1.15); c.quadraticCurveTo(r * 1.9, 0, r * 0.95, r * 1.15); c.stroke();
        var kmx = A.str * r; // Sehne: Ruhe 0.5r, voll gespannt 0.05r, nach dem Schuss gerade (0.95r) und schwingend
        c.strokeStyle = '#e8e0cc'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(r * 0.95, -r * 1.15); c.lineTo(kmx, A.vib * r); c.lineTo(r * 0.95, r * 1.15); c.stroke();
        if (A.arrow > 0) {
          c.globalAlpha = A.arrow;
          c.strokeStyle = P.wood; c.lineWidth = 2;
          c.beginPath(); c.moveTo(kmx, 0); c.lineTo(kmx + r * 1.1, 0); c.stroke();
          c.fillStyle = P.steel; c.beginPath(); c.moveTo(kmx + r * 1.4, 0); c.lineTo(kmx + r * 1.0, -r * 0.14); c.lineTo(kmx + r * 1.0, r * 0.14); c.closePath(); c.fill();
          c.globalAlpha = 1;
        }
        c.fillStyle = '#d9a066';
        c.beginPath(); c.arc(r * 0.95, 0, r * 0.14, 0, Math.PI * 2); c.arc(Math.min(kmx, r * 0.5), 0, r * 0.14, 0, Math.PI * 2); c.fill();
      }
      // Kopf mit goldener Krone
      c.fillStyle = '#d9a066'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
      c.beginPath(); c.arc(r * 0.05, 0, r * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = gold1; c.lineWidth = Math.max(2, r * 0.1); // runder Kopf, nur ein schmaler Kronreif
      c.beginPath(); c.arc(r * 0.05, 0, r * 0.38, -2.2, 2.2); c.stroke();
    } else if (type === 'sword') {
      // Schwertkämpfer: einfacher grauer Eisenhelm mit dunklem Rand (anders als der Ritter), runder Holzschild mit Eisenrand und Buckel, Schwert
      c.fillStyle = '#8d9399';
      c.beginPath(); c.arc(-r * 0.05, 0, r * 0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#5f666c'; c.lineWidth = Math.max(1.5, r * 0.1); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.beginPath(); c.arc(-r * 0.2, -r * 0.15, r * 0.2, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(r * 0.55, -r * 0.7); c.rotate(A.rot); c.translate(-r * 0.55, r * 0.7);
      c.strokeStyle = P.steel; c.lineWidth = Math.max(2.5, r * 0.2);
      c.beginPath(); c.moveTo(r * 0.5, -r * 0.7); c.lineTo(r * 1.7, -r * 0.7); c.stroke();
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2.5, r * 0.2);
      c.beginPath(); c.moveTo(r * 0.55, -r * 0.95); c.lineTo(r * 0.55, -r * 0.45); c.stroke();
      c.restore();
      var shx = r * 0.8 + A.off, shy = r * 0.5;
      c.fillStyle = '#8a6538'; c.beginPath(); c.arc(shx, shy, r * 0.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(60,35,10,0.6)'; c.lineWidth = 1;
      c.beginPath(); c.moveTo(shx - r * 0.45, shy - r * 0.17); c.lineTo(shx + r * 0.45, shy - r * 0.17); c.moveTo(shx - r * 0.45, shy + r * 0.17); c.lineTo(shx + r * 0.45, shy + r * 0.17); c.stroke();
      c.strokeStyle = '#6f7680'; c.lineWidth = Math.max(2, r * 0.12);
      c.beginPath(); c.arc(shx, shy, r * 0.5, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#9aa3a6'; c.beginPath(); c.arc(shx, shy, r * 0.14, 0, Math.PI * 2); c.fill();
    } else if (type === 'ladder') {
      // Leiterträger: Lederkappe; settled 0 = trägt die Leiter längs, 0.5 = klettert (Hände vorne), 1 = über der Mauer, kämpft mit Schwert (ohne Schild)
      c.fillStyle = '#7a5530';
      c.beginPath(); c.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      if (!settled) {
        c.strokeStyle = '#a07b4a'; c.lineWidth = Math.max(2, r * 0.13);
        c.beginPath(); c.moveTo(-r * 1.4, r * 0.4); c.lineTo(r * 1.6, r * 0.4); c.moveTo(-r * 1.4, r * 0.95); c.lineTo(r * 1.6, r * 0.95); c.stroke();
        c.lineWidth = Math.max(1.5, r * 0.09);
        c.beginPath(); for (var lr = -1.3; lr <= 1.55; lr += 0.36) { c.moveTo(r * lr, r * 0.4); c.lineTo(r * lr, r * 0.95); } c.stroke();
        c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.35, r * 0.55, r * 0.14, 0, Math.PI * 2); c.fill();
      } else if (settled < 1) {
        c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.55, -r * 0.4, r * 0.15, 0, Math.PI * 2); c.arc(r * 0.55, r * 0.4, r * 0.15, 0, Math.PI * 2); c.fill();
      } else {
        c.save(); c.translate(r * 0.55, -r * 0.7); c.rotate(A.rot); c.translate(-r * 0.55, r * 0.7);
        c.strokeStyle = P.steel; c.lineWidth = Math.max(2.5, r * 0.2);
        c.beginPath(); c.moveTo(r * 0.5, -r * 0.7); c.lineTo(r * 1.6, -r * 0.7); c.stroke();
        c.strokeStyle = P.wood; c.lineWidth = Math.max(2.5, r * 0.2);
        c.beginPath(); c.moveTo(r * 0.55, -r * 0.95); c.lineTo(r * 0.55, -r * 0.45); c.stroke();
        c.restore();
      }
    } else if (type === 'trebuchet') {
      // Trebuchet von oben: langes Gestell auf Rädern, A-Böcke, Wurfarm mit Gegengewicht (Teamfarbe) und Schlinge mit Steinen.
      // settled = 0..1 Aufbau (0 = Arm liegt nach vorne zusammengeklappt, 1 = Arm hinten, schussbereit); beim Angriff Stellung aus attackPose
      var tsp = Math.min(1, Math.max(0, settled === true ? 1 : (settled || 0))); // Aufbau 0..1
      if (tsp > 0) { // seitliche Stützen: schräge Streben von den A-Böcken nach aussen mit Fussplatten (werden beim Aufbauen ausgeklappt)
        var lo = r * (0.45 + 0.75 * tsp);
        c.strokeStyle = '#6b4a26'; c.lineWidth = Math.max(2.5, r * 0.16);
        [-1, 1].forEach(function (sg3) { [-1, 1].forEach(function (fx) {
          c.beginPath(); c.moveTo(0, sg3 * r * 0.45); c.lineTo(fx * r * 0.55 * tsp, sg3 * lo); c.stroke();
          c.fillStyle = '#4a3b2a'; c.fillRect(fx * r * 0.55 * tsp - r * 0.13, sg3 * lo - r * 0.09, r * 0.26, r * 0.18);
        }); });
        c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(2, r * 0.12);
        [-1, 1].forEach(function (sg3) { c.beginPath(); c.moveTo(-r * 0.55 * tsp, sg3 * lo); c.lineTo(r * 0.55 * tsp, sg3 * lo); c.stroke(); });
      }
      // Stellung: beim Angriff aus attackPose (Variante B), sonst Aufbau: 0 = Arm liegt nach vorne (Transport), 1 = Arm hinten unten, Gewicht oben vorne
      var tb0 = Math.PI + 0.55, tth = A.treb ? A.arm : tb0 * tsp, tps = A.treb ? A.psi : Math.PI;
      var L1 = r * 1.9, L2 = r * 0.6, tipx = L1 * Math.cos(tth), tiph = L1 * Math.sin(tth), cwx = -L2 * Math.cos(tth), cwh = -L2 * Math.sin(tth);
      var drawCw = function (under) { if ((cwh < 0) !== under) return; var sz = r * 0.3 * (1 + 0.3 * cwh / L1); c.fillStyle = under ? '#3a2e22' : '#4a3b2a'; c.fillRect(cwx - sz, -sz, sz * 2, sz * 2); c.globalAlpha = under ? 0.7 : 1; c.strokeStyle = col; c.lineWidth = Math.max(2, r * 0.1); c.strokeRect(cwx - sz, -sz, sz * 2, sz * 2); c.globalAlpha = 1; };
      var drawArm = function (under) { var low = Math.min(tiph, cwh) < 0 && Math.max(tiph, cwh) < r * 0.2; if (low !== under) return; c.strokeStyle = under ? '#5a3e20' : '#6b4a26'; c.lineWidth = Math.max(3, r * 0.2 * (1 + 0.25 * Math.max(tiph, 0) / L1)); c.beginPath(); c.moveTo(cwx, 0); c.lineTo(tipx, 0); c.stroke(); };
      drawCw(true); drawArm(true); // Teile unter der Achse zuerst (Gewicht fällt unter dem Holzbalken durch)
      c.fillStyle = '#3b2b1b';
      [[-0.85, -0.62], [0.85, -0.62], [-0.85, 0.62], [0.85, 0.62]].forEach(function (w) { c.beginPath(); c.ellipse(w[0] * r, w[1] * r, r * 0.26, r * 0.12, 0, 0, Math.PI * 2); c.fill(); });
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(3, r * 0.2);
      c.beginPath(); c.moveTo(-r * 1.2, -r * 0.45); c.lineTo(r * 1.2, -r * 0.45); c.moveTo(-r * 1.2, r * 0.45); c.lineTo(r * 1.2, r * 0.45);
      c.moveTo(-r * 1.1, -r * 0.45); c.lineTo(-r * 1.1, r * 0.45); c.moveTo(r * 1.1, -r * 0.45); c.lineTo(r * 1.1, r * 0.45); c.stroke();
      c.fillStyle = P.wood; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5;
      [-1, 1].forEach(function (sg2) { rr(c, -r * 0.18, sg2 * r * 0.45 - r * 0.14, r * 0.36, r * 0.28, 2); c.fill(); c.stroke(); });
      c.strokeStyle = '#3b2b1b'; c.lineWidth = Math.max(2.5, r * 0.15); c.beginPath(); c.moveTo(0, -r * 0.5); c.lineTo(0, r * 0.5); c.stroke(); // Achse (Holzbalken)
      drawArm(false); drawCw(false);
      if (tsp > 0.95 || A.treb) { // Schlinge mit Beutel und Steinen am Armende
        var Ls = r * 1.0, pbx = tipx + Ls * Math.cos(tps) * 0.9;
        c.strokeStyle = '#c8b48a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(tipx, 0); c.lineTo(pbx, 0); c.stroke();
        c.fillStyle = '#7a5530'; c.beginPath(); c.ellipse(pbx, 0, r * 0.14, r * 0.1, 0, 0, Math.PI * 2); c.fill();
        if (A.ball > 0) { var ss = r * 0.12; c.globalAlpha = A.ball; c.fillStyle = '#8a8f8c'; c.strokeStyle = 'rgba(60,65,68,0.5)'; c.lineWidth = 1;
          [[0, 0], [0.9, -0.9], [0.9, 0.9], [-0.9, 0.6]].forEach(function (q) { c.beginPath(); c.arc(pbx + q[0] * ss * 0.7, q[1] * ss * 0.7, ss * 0.75, 0, Math.PI * 2); c.fill(); c.stroke(); }); c.globalAlpha = 1; }
      }
    } else if (type === 'belfry') {
      // Belagerungsturm von oben: Räder, quadratischer Holzturm mit Plattform (Teamfarbe als Rand), vorne die Fallbrücke;
      // settled = 0..1 wie weit die Brücke auf die Mauer heruntergelassen ist. Die Bogenschützen oben sind eigene Einheiten.
      c.fillStyle = '#3b2b1b';
      [[-0.7, -1.05], [0.7, -1.05], [-0.7, 1.05], [0.7, 1.05]].forEach(function (w) { c.beginPath(); c.ellipse(w[0] * r, w[1] * r, r * 0.3, r * 0.14, 0, 0, Math.PI * 2); c.fill(); });
      var bl = (settled || 0) * r * 1.0;
      c.fillStyle = '#6b4a26'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2;
      rr(c, r * 0.85, -r * 0.45, r * 0.25 + bl, r * 0.9, 2); c.fill(); c.stroke(); // Fallbrücke
      c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1;
      for (var bp2 = 1; bp2 < 5; bp2++) { var bxp = r * 0.85 + (r * 0.25 + bl) * bp2 / 5; c.beginPath(); c.moveTo(bxp, -r * 0.45); c.lineTo(bxp, r * 0.45); c.stroke(); }
      c.fillStyle = '#7a5530'; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 2;
      rr(c, -r, -r, r * 2, r * 2, 4); c.fill(); c.stroke();
      c.fillStyle = P.wood; rr(c, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, 3); c.fill();
      c.strokeStyle = 'rgba(60,35,10,0.45)'; c.lineWidth = 1;
      for (var bp = -3; bp <= 3; bp++) { c.beginPath(); c.moveTo(-r * 0.8, bp * r * 0.22); c.lineTo(r * 0.8, bp * r * 0.22); c.stroke(); }
      c.strokeStyle = col; c.lineWidth = Math.max(2, r * 0.12); c.strokeRect(-r * 0.8, -r * 0.8, r * 1.6, r * 1.6);
      c.fillStyle = '#4a3218';
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (k2) { c.fillRect(k2[0] * r * 0.9 - r * 0.12, k2[1] * r * 0.9 - r * 0.12, r * 0.24, r * 0.24); });
    } else if (type === 'worker') {
      // Bauhelm und Hammer
      c.fillStyle = '#e8b81c';
      c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.22);
      c.beginPath(); c.moveTo(r * 0.2, r * 0.7); c.lineTo(r * 1.5, r * 0.7); c.stroke();
      c.fillStyle = P['stone-dark'];
      rr(c, r * 1.25, r * 0.38, r * 0.55, r * 0.64, 2); c.fill();
    } else if (type === 'mage') {
      // Kapuze, Stab mit leuchtender Kugel
      c.fillStyle = '#5b3fa8';
      c.beginPath(); c.arc(0, 0, r * 0.6, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#3a2575';
      c.beginPath(); c.moveTo(r * 0.55, 0); c.lineTo(-r * 0.25, -r * 0.4); c.lineTo(-r * 0.25, r * 0.4); c.closePath(); c.fill();
      c.save(); c.translate(A.off, -A.off * 0.5); // Stab wird beim Zaubern nach vorne gestreckt
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(-r * 0.2, r * 0.6); c.lineTo(r * 1.5, r * 0.6); c.stroke();
      c.fillStyle = 'rgba(155,107,255,' + (0.4 + 0.25 * A.glow) + ')'; // Kugel lädt sich auf (grösser, heller), ist nach dem Wurf klein
      c.beginPath(); c.arc(r * 1.65, r * 0.6, r * 0.6 * A.orb * (1 + 0.6 * A.glow), 0, Math.PI * 2); c.fill();
      c.fillStyle = A.glow > 0.5 ? '#e4d6ff' : '#b894ff';
      c.beginPath(); c.arc(r * 1.65, r * 0.6, r * 0.34 * A.orb * (1 + 0.3 * A.glow), 0, Math.PI * 2); c.fill();
      if (A.glow > 0) { c.strokeStyle = 'rgba(200,170,255,' + (0.8 * A.glow) + ')'; c.lineWidth = 1.5; for (var mi = 0; mi < 5; mi++) { var ma = mi * 1.257 + A.spin; c.beginPath(); c.moveTo(r * 1.65 + Math.cos(ma) * r * 0.75, r * 0.6 + Math.sin(ma) * r * 0.75); c.lineTo(r * 1.65 + Math.cos(ma) * r * 1.05, r * 0.6 + Math.sin(ma) * r * 1.05); c.stroke(); } }
      c.restore();
    } else if (type === 'farmer') {
      // Strohhut und Heugabel. Unterwegs blass, am Standplatz kräftig (dann zählt der Bonus).
      if (!settled) {
        c.fillStyle = 'rgba(255,255,255,0.4)';
        c.beginPath(); c.arc(0, 0, bodyR, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = settled ? '#c48a12' : '#ead58f';
      c.beginPath(); c.arc(0, 0, r * 0.75, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = P.wood;
      c.beginPath(); c.arc(0, 0, r * 0.28, 0, Math.PI * 2); c.fill();
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.18);
      c.beginPath(); c.moveTo(-r * 0.2, r * 0.9); c.lineTo(r * 1.6, r * 0.9); c.stroke();
      c.strokeStyle = P.steel; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(r * 1.6, r * 0.5); c.lineTo(r * 1.6, r * 1.3);
      c.moveTo(r * 1.6, r * 0.5); c.lineTo(r * 2.0, r * 0.5);
      c.moveTo(r * 1.6, r * 0.9); c.lineTo(r * 2.0, r * 0.9);
      c.moveTo(r * 1.6, r * 1.3); c.lineTo(r * 2.0, r * 1.3);
      c.stroke();
    } else if (type === 'digger') {
      // Gelber Helm mit Lampe und Spitzhacke
      c.fillStyle = '#e0b020';
      c.beginPath(); c.arc(0, 0, r * 0.66, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = '#fff6c8';
      c.beginPath(); c.arc(r * 0.45, 0, r * 0.2, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(r * 0.1, r * 0.7); c.rotate(A.rot); c.translate(-r * 0.1, -r * 0.7); // Hacke: ausholen und zuschlagen (dreht um die Hände)
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(-r * 0.2, r * 0.7); c.lineTo(r * 1.6, r * 0.7); c.stroke();
      c.strokeStyle = P.steel; c.lineWidth = Math.max(2.5, r * 0.22);
      c.beginPath(); c.moveTo(r * 1.5, r * 0.1); c.quadraticCurveTo(r * 1.9, r * 0.7, r * 1.5, r * 1.3); c.stroke();
      c.restore();
    } else if (type === 'javelin') {
      // Speerwerfer: Lederkappe, Köcher mit Wurfspeeren auf dem Rücken, ein Speer wurfbereit über der Schulter
      c.strokeStyle = P.wood; c.lineWidth = Math.max(1.5, r * 0.11);
      c.beginPath(); for (var jq = -1; jq <= 1; jq++) { c.moveTo(-r * 0.2, r * (0.35 + jq * 0.12)); c.lineTo(-r * 1.1, r * (0.45 + jq * 0.16)); } c.stroke();
      c.fillStyle = '#6b4a26'; rr(c, -r * 0.75, r * 0.2, r * 0.45, r * 0.45, 3); c.fill(); // Köcher
      c.fillStyle = '#8a6a44'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      if (A.arrow > 0) {
        c.save(); c.translate(A.off, 0); c.globalAlpha = A.arrow;
        c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.14);
        c.beginPath(); c.moveTo(-r * 0.5, -r * 0.5); c.lineTo(r * 1.35, -r * 0.5); c.stroke();
        c.fillStyle = P.steel; c.beginPath(); c.moveTo(r * 1.7, -r * 0.5); c.lineTo(r * 1.3, -r * 0.68); c.lineTo(r * 1.3, -r * 0.32); c.closePath(); c.fill();
        c.globalAlpha = 1; c.restore();
      }
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.25 + A.off, -r * 0.5, r * 0.14, 0, Math.PI * 2); c.fill(); // Wurfhand
    } else if (type === 'crossbow') {
      // Armbrustschütze: grauer Eisenhut mit Krempe, Armbrust nach vorne (Schaft, Bogen quer, Sehne, Bolzen)
      c.save(); c.translate(A.off, 0);
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(2.5, r * 0.2);
      c.beginPath(); c.moveTo(r * 0.1, r * 0.1); c.lineTo(r * 1.45, r * 0.1); c.stroke(); // Schaft
      var cbs = 1.0 - 0.1 * A.tens;
      c.strokeStyle = '#6f7680'; c.lineWidth = Math.max(2.5, r * 0.18);
      c.beginPath(); c.moveTo(r * 1.15, -r * 0.75); c.quadraticCurveTo(r * (1.55 - 0.1 * (1 - A.str)), r * 0.1, r * 1.15, r * 0.95); c.stroke(); // Bogen (Stahl)
      var cmx = r * (0.65 + 0.5 * A.str);
      c.strokeStyle = '#e8e0cc'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(r * 1.15, -r * 0.75); c.lineTo(cmx, r * 0.1 + A.vib * r); c.lineTo(r * 1.15, r * 0.95); c.stroke();
      if (A.arrow > 0) { c.globalAlpha = A.arrow; c.strokeStyle = '#4a3b2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cmx, r * 0.1); c.lineTo(r * 1.55, r * 0.1); c.stroke(); c.fillStyle = '#9aa3a6'; c.beginPath(); c.moveTo(r * 1.8, r * 0.1); c.lineTo(r * 1.5, -r * 0.05); c.lineTo(r * 1.5, r * 0.25); c.closePath(); c.fill(); c.globalAlpha = 1; }
      c.restore();
      c.fillStyle = '#8d9399'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.68, 0, Math.PI * 2); c.fill(); // Krempe
      c.strokeStyle = '#5f666c'; c.lineWidth = Math.max(1.5, r * 0.08); c.stroke();
      c.fillStyle = '#a3a9ae'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.42, 0, Math.PI * 2); c.fill(); // Hutkopf
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.55 + A.off, r * 0.1, r * 0.13, 0, Math.PI * 2); c.fill();
    } else if (type === 'archer') {
      c.fillStyle = '#8a6a44'; // brauner Lederhelm wie Speersoldat/Speerwerfer
      c.beginPath(); c.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      var bspan = 1.0 - 0.12 * A.tens; // gespannter Bogen biegt sich etwas mehr
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.arc(r * 0.3, 0, r * 1.2, -bspan, bspan); c.stroke();
      var bx0 = r * 0.3 + Math.cos(bspan) * r * 1.2, by0 = Math.sin(bspan) * r * 1.2, bmx = bx0 + A.str * r; // Sehne: Mitte wird nach hinten gezogen
      c.strokeStyle = P.steel; c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(bx0, -by0); c.lineTo(bmx, A.vib * r); c.lineTo(bx0, by0); c.stroke();
      if (A.arrow > 0) { // aufgelegter Pfeil
        c.globalAlpha = A.arrow;
        c.strokeStyle = P.wood; c.lineWidth = 2;
        c.beginPath(); c.moveTo(bmx, 0); c.lineTo(bmx + r * 1.5, 0); c.stroke();
        c.fillStyle = P.steel; c.beginPath(); c.moveTo(bmx + r * 1.85, 0); c.lineTo(bmx + r * 1.45, -r * 0.16); c.lineTo(bmx + r * 1.45, r * 0.16); c.closePath(); c.fill();
        c.globalAlpha = 1;
      }
      if (A.tens > 0) { c.fillStyle = '#d9a066'; c.beginPath(); c.arc(bmx, 0, r * 0.15, 0, Math.PI * 2); c.fill(); } // Zughand
    } else if (type === 'rider') {
      c.fillStyle = '#8a6a44'; // brauner Lederhelm wie Speersoldat (passend zum kleineren Reiterkörper)
      c.beginPath(); c.arc(-r * 0.03, 0, r * 0.37, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.save(); c.translate(A.off, 0); // Lanzenstoss
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.2);
      c.beginPath(); c.moveTo(r * 0.2, -r * 0.6); c.lineTo(r * 2.1, -r * 0.6); c.stroke();
      c.fillStyle = P.steel;
      c.beginPath(); c.moveTo(r * 2.45, -r * 0.6); c.lineTo(r * 2.0, -r * 0.85); c.lineTo(r * 2.0, -r * 0.35); c.closePath(); c.fill();
      c.restore();
    } else {
      // Ritter: grauer Topfhelm mit Sehschlitz, Schwert mit goldener Parierstange, grosser Wappenschild in Teamfarbe mit weissem Kreuz.
      // Der Schild ist nach vorne gekippt (Oberkante beim Helm, etwas breiter; Spitze vorne, verkürzt) und sitzt seitlich wie beim Schwertkämpfer.
      var kg = '#8d9399', kd = '#5f666c';
      c.fillStyle = kg; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = kd; c.lineWidth = Math.max(1.5, r * 0.1); c.stroke();
      c.strokeStyle = '#2b3135'; c.lineWidth = Math.max(2, r * 0.12); c.lineCap = 'butt'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.5, -0.75, 0.75); c.stroke(); c.lineCap = 'round';
      c.lineWidth = Math.max(1.5, r * 0.07); c.beginPath(); c.moveTo(r * 0.12, 0); c.lineTo(r * 0.5, 0); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.28)'; c.beginPath(); c.arc(-r * 0.25, -r * 0.18, r * 0.18, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(r * 0.55, -r * 0.75); c.rotate(A.rot); c.translate(-r * 0.55, r * 0.75); // Schwerthieb: ausholen nach aussen, Hieb nach vorne-innen
      c.strokeStyle = P.steel; c.lineWidth = Math.max(2.5, r * 0.22);
      c.beginPath(); c.moveTo(r * 0.5, -r * 0.75); c.lineTo(r * 1.9, -r * 0.75); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * 0.7, -r * 0.75); c.lineTo(r * 1.8, -r * 0.75); c.stroke();
      c.strokeStyle = '#d4a017'; c.lineWidth = Math.max(2.5, r * 0.22);
      c.beginPath(); c.moveTo(r * 0.55, -r * 1.02); c.lineTo(r * 0.55, -r * 0.48); c.stroke();
      c.restore();
      // Schild: Fläche (u quer, v Höhe 0 = Spitze .. KH = Oberkante) -> Bild: Oberkante bei x0, Spitze vorne (Kippung KK), oben etwas breiter
      var KW = 0.95, KH = 1.5, KK = 0.75, kx0 = 0.3 + A.off / r, kcy = 0.5;
      var km = function (u, v) { return [r * (kx0 + (KH - v) * KK), r * (kcy + u * (1 + 0.1 * v / KH))]; };
      var kpts = [[-KW / 2, KH], [KW / 2, KH], [KW / 2, KH * 0.5]], kb = function (a, b, q) { for (var ki = 1; ki <= 8; ki++) { var t2 = ki / 8; kpts.push([(1 - t2) * (1 - t2) * a[0] + 2 * (1 - t2) * t2 * q[0] + t2 * t2 * b[0], (1 - t2) * (1 - t2) * a[1] + 2 * (1 - t2) * t2 * q[1] + t2 * t2 * b[1]]); } };
      kb([KW / 2, KH * 0.5], [0, 0], [KW / 2, KH * 0.12]); kb([0, 0], [-KW / 2, KH * 0.5], [-KW / 2, KH * 0.12]);
      var kpath = function (pts) { c.beginPath(); for (var ki = 0; ki < pts.length; ki++) { var q = km(pts[ki][0], pts[ki][1]); if (ki) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); } c.closePath(); };
      c.save(); c.translate(r * 0.12, r * 0.12); kpath(kpts); c.fillStyle = 'rgba(0,0,0,0.22)'; c.fill(); c.restore();
      kpath(kpts); c.fillStyle = col; c.fill();
      c.save(); kpath(kpts); c.clip(); c.fillStyle = '#ffffff';
      kpath([[-0.1, -1], [0.1, -1], [0.1, 3], [-0.1, 3]]); c.fill();
      kpath([[-2, KH * 0.62], [2, KH * 0.62], [2, KH * 0.76], [-2, KH * 0.76]]); c.fill();
      c.restore();
      kpath(kpts); c.strokeStyle = kg; c.lineJoin = 'round'; c.lineWidth = Math.max(2, r * 0.12); c.stroke();
    }

    if (hit > 0) {
      c.fillStyle = 'rgba(255,255,255,' + (0.7 * hit / 0.15) + ')';
      c.beginPath(); c.arc(0, 0, bodyR || r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

