  // ---------- Zeichnen ----------

  // ---------- Angriffsanimationen ----------
  // ANIM[type] = { wind: Sekunden Ausholen vor dem Treffer, after: Sekunden Nachschwingen danach }.
  // attackPose liefert die Stellung für drawUnit; at = Sekunden relativ zum Treffer/Abschuss (undefined = Ruhe).
  var LAUNCH = { javelin: [1.2, -0.5], fackel: [1.0, -0.5], crossbow: [1.6, 0], trebuchet: [0, 0], // Trebuchet: Steine kommen mittig heraus (dort pendelt die Schlinge oben aus)
    archer: [1.4, 0], baliste: [1.6, 0], onager: [0.4, 0], mage: [1.9, 0.35], catapult: [1.2, 0] }; // Abschusspunkt der Geschosse (Vielfache von r, vor der Einheit)
  function launchPt(u, d, tx, ty) { var L = LAUNCH[u.type]; if (!L) return { x: u.x, y: u.y }; var a = Math.atan2(ty - u.y, tx - u.x), ca = Math.cos(a), sa = Math.sin(a); return { x: u.x + (ca * L[0] - sa * L[1]) * d.r, y: u.y + (sa * L[0] + ca * L[1]) * d.r }; } // nur Darstellung (Effekte)
  // Stellung für die Darstellung: kurz vor dem Treffer ausholen (u.ready = Ziel in Reichweite, u.cd = Restzeit), danach nachschwingen (u.atkT = Zeitpunkt des letzten Angriffs)
  function unitAt(u, type) {
    if (type === 'farmer') return u.grabT !== undefined && clock - u.grabT <= GRAB ? clock - u.grabT : undefined; // Bauer: gräbt beim Gold-Bonus
    var a = ANIM[type]; if (!a) return undefined;
    if (u.ready && u.cd > 0 && u.cd <= a.wind) return -u.cd;
    if (u.atkT !== undefined && clock - u.atkT <= a.after) return clock - u.atkT;
    return undefined;
  }
  var GRAB = 0.8; // Sekunden: Bauer gräbt mit der Heugabel (zweimal zustechen)
  var ANIM = {
    spear: { wind: 0.3, after: 0.25 }, rider: { wind: 0.3, after: 0.25 }, knight: { wind: 0.32, after: 0.25 }, schwarzritter: { wind: 0.32, after: 0.25 }, raeuber: { wind: 0.22, after: 0.2 }, digger: { wind: 0.3, after: 0.25 },
    javelin: { wind: 0.35, after: 0.55 }, fackel: { wind: 0.35, after: 0.7 }, crossbow: { wind: 0.15, after: 1.2 }, trebuchet: { wind: 0.3, after: 2.3 }, sword: { wind: 0.32, after: 0.25 }, ladder: { wind: 0.32, after: 0.25 },
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
    else if (type === 'raeuber') { P0.off = swing(at, W, F, -0.3 * r, 0.45 * r); }
    else if (type === 'knight' || type === 'sword' || type === 'schwarzritter') { P0.rot = swing(at, W, F, -1.15, 0.55); P0.off = swing(at, W, F, 0, 0.12 * r); }
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
    else if (type === 'javelin' || type === 'fackel') { // ausholen (Speer nach hinten), werfen; danach neuen Speer aus dem Köcher ziehen
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
  // Betender Priester von oben (kniend, Kutte, weisser Kragen, gefaltete Hände); ang = Blickrichtung
  function priesterMalen(c, x, y, psm, ang) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = '#3b2f2a'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(-psm * 0.15, 0, psm * 0.75, psm * 0.7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); // Kutte
    c.fillStyle = '#f2ece0'; c.fillRect(psm * 0.05, -psm * 0.12, psm * 0.3, psm * 0.24); // Kragen
    c.fillStyle = '#e8b994'; c.beginPath(); c.arc(psm * 0.15, 0, psm * 0.36, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = '#e8b994'; c.beginPath(); c.arc(psm * 0.55, -psm * 0.08, psm * 0.13, 0, Math.PI * 2); c.arc(psm * 0.55, psm * 0.08, psm * 0.13, 0, Math.PI * 2); c.fill(); // gefaltete Hände
    c.restore();
  }
  function drawUnit(c, type, x, y, r, team, face, hit, settled, at, ang) { // ang = Blickrichtung in Bogenmass (gedreht statt gespiegelt), sonst face = ±1 // at = Sekunden relativ zum Treffer (negativ = Ausholen, positiv = danach), undefined = keine Angriffsanimation
    if (type === 'priester') { // nur Knopfbild der fertigen Kirche: betender Priester mit Schein und Kreuz
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(255,240,170,0.45)'; c.beginPath(); c.arc(0, 0, r * 1.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#e2b13c'; c.lineWidth = Math.max(2, r * 0.14); c.beginPath(); c.moveTo(r * 1.05, -r * 0.55); c.lineTo(r * 1.05, r * 0.55); c.moveTo(r * 0.75, -r * 0.2); c.lineTo(r * 1.35, -r * 0.2); c.stroke();
      c.restore(); priesterMalen(c, x - r * 0.15, y, r, 0); return;
    }
    var A = attackPose(type, at, r);
    if (type === 'knight' || type === 'schwarzritter') r *= 0.85; // Ritter optisch kleiner (nur Darstellung)
    var col = team === 0 ? P.me : P.foe;
    c.save();
    c.translate(x, y);
    c.fillStyle = P.shade;
    c.beginPath(); c.ellipse(1, r * 0.75, r * 0.95, r * 0.5, 0, 0, Math.PI * 2); c.fill();
    if (ang !== undefined) c.rotate(ang); else c.scale(face, 1);
    c.lineCap = 'round';

    if (type === 'karawane') {
      // Kamel von oben (Körper, Höcker, langer Hals, Kopf, Schweif) mit 4 Tontöpfen an den Seiten; volle Töpfe glänzen blau. settled = { voll 0..1, toepfe }
      var KS = settled && typeof settled === 'object' ? settled : { voll: 0, toepfe: 4 }, kvoll = KS.voll * KS.toepfe;
      c.fillStyle = '#c9a36a'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(-r * 0.1, 0, r * 1.3, r * 0.58, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#c9a36a'; c.lineWidth = Math.max(3, r * 0.34); c.beginPath(); c.moveTo(r * 0.95, 0); c.quadraticCurveTo(r * 1.45, 0, r * 1.75, 0); c.stroke(); // Hals
      c.fillStyle = '#c9a36a'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(r * 1.95, 0, r * 0.34, r * 0.22, 0, 0, Math.PI * 2); c.fill(); c.stroke(); // Kopf
      c.fillStyle = '#8a6a3e'; c.beginPath(); c.arc(r * 1.82, -r * 0.18, r * 0.07, 0, Math.PI * 2); c.arc(r * 1.82, r * 0.18, r * 0.07, 0, Math.PI * 2); c.fill(); // Ohren
      c.strokeStyle = '#8a6a3e'; c.lineWidth = Math.max(1.5, r * 0.1); c.beginPath(); c.moveTo(-r * 1.38, 0); c.lineTo(-r * 1.7, r * 0.12); c.stroke(); // Schweif
      c.fillStyle = '#dcbb85'; c.beginPath(); c.ellipse(-r * 0.55, 0, r * 0.42, r * 0.36, 0, 0, Math.PI * 2); c.fill(); // Höcker
      c.fillStyle = '#9c3b2e'; c.fillRect(-r * 0.15, -r * 0.62, r * 0.5, r * 1.24); // Satteldecke
      for (var tp = 0; tp < KS.toepfe; tp++) { // Töpfe: zwei auf jeder Seite
        var tpx = tp < 2 ? -r * 0.75 + tp * r * 0.75 : -r * 0.75 + (tp - 2) * r * 0.75, tpy = (tp < 2 ? -1 : 1) * r * 0.78, tf = Math.max(0, Math.min(1, kvoll - [0, 2, 1, 3][tp]));
        c.fillStyle = '#b5643a'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.beginPath(); c.arc(tpx, tpy, r * 0.3, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#5a2f1c'; c.beginPath(); c.arc(tpx, tpy, r * 0.17, 0, Math.PI * 2); c.fill(); // Öffnung
        if (tf > 0) { c.fillStyle = 'rgba(90,170,235,' + (0.5 + 0.5 * tf) + ')'; c.beginPath(); c.arc(tpx, tpy, r * 0.17 * tf, 0, Math.PI * 2); c.fill(); }
      }
    }
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

    var bodyR = type === 'knight' || type === 'schwarzritter' ? r * 0.9 : type === 'raeuber' ? r * 0.85 : type === 'rider' ? r * 0.6 : type === 'karawane' ? r * 0.5 : (type === 'ram' || type === 'catapult' || type === 'shield' || type === 'baliste' || type === 'king' || type === 'kingbow' || type === 'belfry' || type === 'trebuchet' || type === 'onager') ? 0 : CONFIG.units[type] && CONFIG.units[type].gebaeude ? 0 : type === 'farmer' || type === 'holzfaeller' ? r * 0.82 : r * 0.9; // Bauer: schmalerer Rand in Teamfarbe; Gebäude ohne Körper
    // Armbrustschütze beim Einrichten (settled = Aufbaugrad 0..1): kniet ab (Körper tiefer = kleiner, Knie vorne, Fuss hinten) und kurbelt die Armbrust
    var cbk = type === 'crossbow' && typeof settled === 'number' ? Math.min(1, settled * 4) : 0, cbc = type === 'crossbow' && typeof settled === 'number' && settled > 0 && settled < 1;
    if (cbk > 0) {
      bodyR *= 1 - 0.14 * cbk;
      c.fillStyle = '#4a3b2a'; c.beginPath(); c.ellipse(-r * 0.85 * cbk, -r * 0.42, r * 0.26, r * 0.15, 0, 0, Math.PI * 2); c.fill(); // hinterer Fuss
      c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(r * 0.55 * cbk, r * 0.62, r * 0.3, r * 0.22, 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); // Knie vorne
    }
    c.fillStyle = col;
    c.strokeStyle = 'rgba(0,0,0,0.45)';
    c.lineWidth = 2;
    c.beginPath(); c.arc(0, 0, bodyR, 0, Math.PI * 2); c.fill(); c.stroke();

    if (type === 'karawane') { // Treiber: heller Turban, Hände an den Zügeln
      c.fillStyle = '#efe6d2'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.beginPath(); c.arc(-r * 0.03, 0, r * 0.36, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = '#d6c7a6'; c.lineWidth = 1; c.beginPath(); c.arc(-r * 0.03, 0, r * 0.22, -0.5, 2.6); c.stroke();
      c.strokeStyle = '#5a3d22'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * 0.45, -r * 0.18); c.lineTo(r * 1.8, -r * 0.05); c.moveTo(r * 0.45, r * 0.18); c.lineTo(r * 1.8, r * 0.05); c.stroke(); // Zügel
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.45, -r * 0.2, r * 0.11, 0, Math.PI * 2); c.arc(r * 0.45, r * 0.2, r * 0.11, 0, Math.PI * 2); c.fill();
    } else if (type === 'spear') {
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
      // König von oben in der gewählten Optik (koenigTeam[team], siehe spiel/koenig-optik.js): mit Bogen (auf der Burg) oder seiner Waffe (ohne Burg)
      var kz = kZust[team]; // im Spiel: Bogen/Nahkampfwaffe hervorgeholt (sonst, z. B. im Buch: König mit Waffe)
      koenigMalen(c, koenigOptik(koenigTeam[team]), r, col, { bogen: true, kratz: type === 'kingbow' ? kKratz[team] : 0, zieh: kz ? kz.zieh : (type === 'kingbow' ? 1 : 0), nah: kz ? kz.nah : (type === 'king' ? 1 : 0), rot: A.rot, str: A.str, vib: A.vib, arrow: A.arrow });
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
    } else if (type === 'schmiede') {
      // Schmiede von oben (man sieht nur das Dach): 1 = Strohdach, kleine Lehm-Esse, Wimpel; 2 = Holzdach, Stein-Esse, Banner, Fass; 3 = Steindach (Schiefer) mit
      // Goldspitzen am First, zwei Essen, zwei Banner, Waffenständer. Vorne (nx/ny, zur Mitte/zum Weg) Amboss und Schmied (so gross wie ein Bauer).
      // settled = { bau 0..1, stufe, phase (Sekunden im 5-s-Takt, -1 = im Bau), nx, ny } im Spiel, sonst (Buch/Knopf) Stufe 1 ohne Schmied
      var SG = CONFIG.units.schmiede.gebaeude, sw = r * SG.w / CONFIG.units.schmiede.r, sh = r * SG.h / CONFIG.units.schmiede.r;
      var Z = typeof settled === 'object' && settled ? settled : { bau: 1, stufe: 1, phase: -1, nx: 0, ny: 1 }, now = performance.now() / 1000, L = Math.max(1, Math.min(3, Z.stufe || 1));
      c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -sw / 2 + 3, -sh / 2 + 4, sw, sh, 4); c.fill();
      if (Z.neu && Z.bau < 1) { // allererster Bau: Fundament und Gerüst
        c.fillStyle = '#a89c86'; rr(c, -sw / 2, -sh / 2, sw, sh, 3); c.fill();
        c.save(); c.beginPath(); c.rect(-sw / 2, -sh / 2, sw * Z.bau, sh); c.clip();
        c.fillStyle = '#d6b25a'; rr(c, -sw / 2, -sh / 2, sw, sh, 3); c.fill(); c.restore();
        c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -sw / 2, -sh / 2, sw, sh, 3); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(-sw / 2, -sh / 2); c.lineTo(sw / 2, sh / 2); c.moveTo(-sw / 2, sh / 2); c.lineTo(sw / 2, -sh / 2); c.stroke();
      } else { // Ausbau (1 -> 2 und 2 -> 3): das Gebäude bleibt, aussen gestrichelte Linie und Fortschritt
        var ins = L === 1 ? 0.08 : 0, hw = sw / 2 * (1 - ins), hh = sh / 2 * (1 - ins); // Stufe 1 etwas kleiner
        // Von oben sieht man nur das Dach: Stufe 1 Stroh, Stufe 2 Holz, Stufe 3 Stein (Schiefer)
        var rx0 = -hw, ry0 = -hh, rw = 2 * hw, rh = 2 * hh, k;
        c.save(); rr(c, rx0, ry0, rw, rh, L === 1 ? r * 0.18 : 3); c.clip();
        if (L === 1) { // Strohdach: gelblich, viele kurze Halme, ausgefranster Rand
          c.fillStyle = '#d6b25a'; c.fillRect(rx0, ry0, rw, rh);
          c.strokeStyle = 'rgba(140,100,40,0.55)'; c.lineWidth = 1;
          for (k = 0; k < 70; k++) { var hx = rx0 + ((k * 37) % 100) / 100 * rw, hy = ry0 + ((k * 61) % 100) / 100 * rh, hl = r * (0.15 + ((k * 13) % 7) / 30); c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + ((k % 3) - 1) * r * 0.03, hy + (hy < 0 ? -hl : hl)); c.stroke(); }
          c.fillStyle = 'rgba(0,0,0,0.16)'; c.fillRect(rx0, 0, rw, rh / 2);
          c.strokeStyle = '#a07a30'; c.lineWidth = Math.max(2, r * 0.1); c.beginPath(); c.moveTo(rx0, 0); c.lineTo(rx0 + rw, 0); c.stroke(); // First aus gebundenem Stroh
        } else if (L === 2) { // Holzdach: Bretter quer zum First, Traufbalken
          c.fillStyle = '#7a4f26'; c.fillRect(rx0, ry0, rw, rh);
          c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(rx0, 0, rw, rh / 2);
          c.strokeStyle = 'rgba(0,0,0,0.32)'; c.lineWidth = 1;
          for (k = 1; k < 9; k++) { var px2 = rx0 + rw * k / 9; c.beginPath(); c.moveTo(px2, ry0); c.lineTo(px2, ry0 + rh); c.stroke(); }
          c.strokeStyle = '#3e2a16'; c.lineWidth = Math.max(2, r * 0.13); c.beginPath(); c.moveTo(rx0, 0); c.lineTo(rx0 + rw, 0); c.stroke();
        } else { // Steindach: Schieferplatten in versetzten Reihen, Firststeine mit Goldspitzen
          c.fillStyle = '#7d8590'; c.fillRect(rx0, ry0, rw, rh);
          c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1;
          var tr = r * 0.2, tc = r * 0.28;
          for (var ty = 0; ty < rh / 2; ty += tr) for (var sd2 = -1; sd2 <= 1; sd2 += 2) {
            var yy = sd2 < 0 ? -ty - tr : ty; c.beginPath(); c.moveTo(rx0, yy); c.lineTo(rx0 + rw, yy); c.stroke();
            for (var tx2 = rx0 + ((Math.round(ty / tr) % 2) ? tc / 2 : 0); tx2 < rx0 + rw; tx2 += tc) { c.beginPath(); c.moveTo(tx2, yy); c.lineTo(tx2, yy + tr); c.stroke(); }
          }
          c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(rx0, 0, rw, rh / 2);
          c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(rx0, ry0, rw, rh / 2 * 0.35);
        }
        c.restore();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; rr(c, rx0, ry0, rw, rh, L === 1 ? r * 0.18 : 3); c.stroke();
        if (L === 3) { c.strokeStyle = '#4e555e'; c.lineWidth = Math.max(3, r * 0.16); c.beginPath(); c.moveTo(rx0, 0); c.lineTo(rx0 + rw, 0); c.stroke(); c.fillStyle = '#e2b13c'; [rx0 + r * 0.1, rx0 + rw - r * 0.1].forEach(function (gx) { c.beginPath(); c.arc(gx, 0, r * 0.1, 0, Math.PI * 2); c.fill(); }); }
        // Essen (Schornsteine): Stufe 3 zwei
        var drin = Z.phase < 0.5 || Z.phase >= 4.5, glut = drin && Z.phase >= 0 ? 0.6 + 0.4 * Math.sin(now * 12) : 0.25;
        (L === 3 ? [-0.3, 0.3] : [-0.28]).forEach(function (fx, ei) {
          var ex = sw * fx, ey = -sh * 0.2 + (ei ? sh * 0.4 : 0), es = r * (L === 1 ? 0.32 : 0.42);
          c.fillStyle = L === 1 ? '#8a5a3a' : L === 2 ? '#6e665c' : '#5a5f66'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 1.5; c.fillRect(ex - es / 2, ey - es / 2, es, es); c.strokeRect(ex - es / 2, ey - es / 2, es, es);
          c.fillStyle = 'rgba(255,' + Math.round(120 + 60 * glut) + ',40,' + (0.5 + 0.5 * glut) + ')'; c.fillRect(ex - es * 0.28, ey - es * 0.28, es * 0.56, es * 0.56);
          for (var sk = 0; sk < (drin ? 4 : 2); sk++) { var spp = ((now * 0.6 + sk / 4 + ei * 0.37) % 1); c.fillStyle = 'rgba(90,90,90,' + (0.45 * (1 - spp)) + ')'; c.beginPath(); c.arc(ex - spp * r * 0.5, ey - spp * r * 1.1, r * (0.12 + spp * 0.22), 0, Math.PI * 2); c.fill(); }
        });
        // Banner in Teamfarbe (Stufe 1 ein Wimpel, 2 ein Banner, 3 zwei Banner) an der Vorderseite
        var fvx = Z.nx || 0, fvy = Z.ny === undefined ? 1 : Z.ny, fqx = -fvy, fqy = fvx, fext = Math.abs(fvx) * hw + Math.abs(fvy) * hh;
        (L === 1 ? [0.35] : L === 2 ? [0.3] : [-0.3, 0.3]).forEach(function (bq) {
          var bx = fvx * fext + fqx * bq * sw, by = fvy * fext + fqy * bq * sw, bl = r * (L === 1 ? 0.28 : 0.42);
          c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1;
          c.beginPath(); c.moveTo(bx - fqx * r * 0.12, by - fqy * r * 0.12); c.lineTo(bx + fqx * r * 0.12, by + fqy * r * 0.12);
          if (L === 1) c.lineTo(bx + fvx * bl, by + fvy * bl); else { c.lineTo(bx + fqx * r * 0.12 + fvx * bl, by + fqy * r * 0.12 + fvy * bl); c.lineTo(bx + fvx * bl * 0.75, by + fvy * bl * 0.75); c.lineTo(bx - fqx * r * 0.12 + fvx * bl, by - fqy * r * 0.12 + fvy * bl); }
          c.closePath(); c.fill(); c.stroke();
          if (L === 3) { c.fillStyle = '#f0c63a'; c.beginPath(); c.arc(bx + fvx * bl * 0.4, by + fvy * bl * 0.4, r * 0.06, 0, Math.PI * 2); c.fill(); }
        });
        if (L >= 2) { // Wasserfass neben der Tür
          var fbx = fvx * (fext + r * 0.18) - fqx * sw * 0.38, fby = fvy * (fext + r * 0.18) - fqy * sw * 0.38;
          c.fillStyle = '#7a5230'; c.strokeStyle = '#3e2a16'; c.lineWidth = 1.5; c.beginPath(); c.arc(fbx, fby, r * 0.17, 0, Math.PI * 2); c.fill(); c.stroke();
          c.fillStyle = '#5aa0d0'; c.beginPath(); c.arc(fbx, fby, r * 0.1, 0, Math.PI * 2); c.fill();
        }
        if (L === 3) { // Waffenständer mit Schwertern
          var wrx = fvx * (fext + r * 0.12) + fqx * sw * 0.45, wry = fvy * (fext + r * 0.12) + fqy * sw * 0.45;
          c.strokeStyle = '#5a3d22'; c.lineWidth = Math.max(2, r * 0.08); c.beginPath(); c.moveTo(wrx - fqx * r * 0.2, wry - fqy * r * 0.2); c.lineTo(wrx + fqx * r * 0.2, wry + fqy * r * 0.2); c.stroke();
          c.strokeStyle = '#d6dde0'; c.lineWidth = Math.max(1.5, r * 0.05); [-0.12, 0, 0.12].forEach(function (o) { c.beginPath(); c.moveTo(wrx + fqx * r * o, wry + fqy * r * o); c.lineTo(wrx + fqx * r * o + fvx * r * 0.3, wry + fqy * r * o + fvy * r * 0.3); c.stroke(); });
        }
        if (Z.bau < 1) { // nächste Stufe im Bau: Gerüst und Fortschritt
          c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -sw / 2 - 3, -sh / 2 - 3, sw + 6, sh + 6, 4); c.stroke(); c.setLineDash([]);
          c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-sw / 2, -sh / 2 - 9, sw, 4); c.fillStyle = '#c98a12'; c.fillRect(-sw / 2, -sh / 2 - 9, sw * Z.bau, 4);
        }
        if (Z.phase >= 0) { // Amboss und Schmied vor dem Gebäude
          var vx = Z.nx, vy = Z.ny, ext = Math.abs(vx) * hw + Math.abs(vy) * hh, sm = r * CONFIG.units.farmer.r / CONFIG.units.schmiede.r * 1.1; // sm = Radius wie ein Bauer (5 % grösser wirkt gleich gross)
          var ax = vx * (ext + r * 0.45), ay = vy * (ext + r * 0.45), qx = -vy, qy = vx;
          var tx0 = vx * ext, ty0 = vy * ext, smx = ax + qx * sm * 1.6 + vx * sm * 0.3, smy = ay + qy * sm * 1.6 + vy * sm * 0.3, ph = Z.phase, sa = 1, sx2 = smx, sy2 = smy;
          // Ablauf (5 s): 0–0,5 drin, 0,5–0,75 kommt heraus, 0,75–4,25 schmiedet, 4,25–4,5 geht hinein, 4,5–5 drin, dann Gold
          if (ph < 0.5 || ph >= 4.5) sa = 0;
          else if (ph < 0.75) { var k1 = (ph - 0.5) / 0.25; sx2 = tx0 + (smx - tx0) * k1; sy2 = ty0 + (smy - ty0) * k1; sa = k1; }
          else if (ph >= 4.25) { var k2 = (ph - 4.25) / 0.25; sx2 = smx + (tx0 - smx) * k2; sy2 = smy + (ty0 - smy) * k2; sa = 1 - k2; }
          var aw2 = r * (L === 3 ? 0.36 : 0.3);
          c.save(); c.translate(ax, ay); c.rotate(Math.atan2(qy, qx)); c.fillStyle = '#3c3f44'; c.strokeStyle = L === 3 ? '#d9a441' : 'rgba(0,0,0,0.5)'; c.lineWidth = L === 3 ? 2 : 1; rr(c, -aw2, -r * 0.13, aw2 * 2, r * 0.26, 2); c.fill(); c.stroke(); c.restore(); // Amboss
          if (sa > 0) {
            c.save(); c.globalAlpha = sa; c.translate(sx2, sy2); c.rotate(Math.atan2(ay - sy2, ax - sx2));
            var hk = ph >= 0.75 && ph < 4.25 ? Math.abs(Math.sin((ph - 0.75) * Math.PI * 2.2)) : 0; // Hammer: hoch und runter
            c.fillStyle = '#6b4a2b'; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, 0, sm * 0.75, 0, Math.PI * 2); c.fill(); c.stroke(); // Lederschürze
            c.strokeStyle = '#5a3d22'; c.lineWidth = Math.max(2, sm * 0.18); c.beginPath(); c.moveTo(sm * 0.3, sm * 0.4); c.lineTo(sm * (1.1 + 0.5 * (1 - hk)), sm * (0.35 - 0.25 * hk)); c.stroke(); // Hammerstiel
            c.fillStyle = '#5c6066'; c.fillRect(sm * (1.0 + 0.5 * (1 - hk)), sm * (0.12 - 0.25 * hk), sm * 0.3, sm * 0.45); // Hammerkopf
            c.fillStyle = '#d9a066'; c.beginPath(); c.arc(sm * 0.05, 0, sm * 0.42, 0, Math.PI * 2); c.fill(); c.stroke(); // Kopf
            c.fillStyle = '#3b2a1c'; c.beginPath(); c.arc(-sm * 0.05, 0, sm * 0.36, Math.PI * 0.55, Math.PI * 1.45); c.fill(); // Haare
            c.restore();
            if (hk < 0.15 && ph >= 0.75 && ph < 4.25) { c.fillStyle = '#ffd24a'; for (var fk = 0; fk < 4; fk++) { var fa = fk * 1.7 + now * 9; c.beginPath(); c.arc(ax + Math.cos(fa) * r * 0.3, ay + Math.sin(fa) * r * 0.3, r * 0.05, 0, Math.PI * 2); c.fill(); } } // Funken
          }
        }
      }
    } else if (type === 'adel') {
      // Adelshaus von oben: Ziegeldach (Terrakotta) mit Rundturm (Kegeldach in Teamfarbe), Hecke und Banner vorne. Ein Adliger (violetter Mantel, Goldreif)
      // geht im 15-s-Takt in die Burg und zurück: 0–1 drin, 1–6,5 hin, 6,5–9,5 in der Burg, 9,5–15 zurück, beim Eintreten (15 s) +Gold.
      var AG = CONFIG.units.adel.gebaeude, aw = r * AG.w / CONFIG.units.adel.r, ah = r * AG.h / CONFIG.units.adel.r;
      var AZ = typeof settled === 'object' && settled ? settled : { bau: 1, stufe: 1, phase: -1, nx: 0, ny: 1, kx: 0, ky: 0 }, anow = performance.now() / 1000;
      c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -aw / 2 + 3, -ah / 2 + 4, aw, ah, 4); c.fill();
      if (AZ.neu && AZ.bau < 1) { // erster Bau: Fundament und Gerüst
        c.fillStyle = '#a89c86'; rr(c, -aw / 2, -ah / 2, aw, ah, 3); c.fill();
        c.save(); c.beginPath(); c.rect(-aw / 2, -ah / 2, aw * AZ.bau, ah); c.clip(); c.fillStyle = '#b5523a'; rr(c, -aw / 2, -ah / 2, aw, ah, 3); c.fill(); c.restore();
        c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -aw / 2, -ah / 2, aw, ah, 3); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(-aw / 2, -ah / 2); c.lineTo(aw / 2, ah / 2); c.moveTo(-aw / 2, ah / 2); c.lineTo(aw / 2, -ah / 2); c.stroke();
      } else {
        var ax0 = -aw / 2, ay0 = -ah / 2;
        c.save(); rr(c, ax0, ay0, aw, ah, 3); c.clip();
        c.fillStyle = '#b5523a'; c.fillRect(ax0, ay0, aw, ah); // Ziegel
        c.strokeStyle = 'rgba(80,20,10,0.35)'; c.lineWidth = 1;
        var zr = r * 0.16; for (var zy = 0; zy < ah; zy += zr) { c.beginPath(); c.moveTo(ax0, ay0 + zy); c.lineTo(ax0 + aw, ay0 + zy); c.stroke(); for (var zx = ax0 + ((Math.round(zy / zr) % 2) ? r * 0.12 : 0); zx < ax0 + aw; zx += r * 0.24) { c.beginPath(); c.arc(zx, ay0 + zy + zr, r * 0.12, Math.PI, 0); c.stroke(); } }
        c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(ax0, 0, aw, ah / 2);
        c.restore();
        c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; rr(c, ax0, ay0, aw, ah, 3); c.stroke();
        c.strokeStyle = '#7e3423'; c.lineWidth = Math.max(2, r * 0.12); c.beginPath(); c.moveTo(ax0, 0); c.lineTo(ax0 + aw, 0); c.stroke(); // First
        var tx3 = aw / 2 - r * 0.05, ty3 = -ah / 2 + r * 0.05, trr = r * 0.34; // Rundturm an der Ecke
        c.fillStyle = '#c9c0ad'; c.beginPath(); c.arc(tx3, ty3, trr, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = col; c.beginPath(); c.arc(tx3, ty3, trr * 0.78, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; for (var ta = 0; ta < 6; ta++) { var tA = ta * Math.PI / 3; c.beginPath(); c.moveTo(tx3, ty3); c.lineTo(tx3 + Math.cos(tA) * trr * 0.78, ty3 + Math.sin(tA) * trr * 0.78); c.stroke(); }
        c.fillStyle = '#e2b13c'; c.beginPath(); c.arc(tx3, ty3, r * 0.07, 0, Math.PI * 2); c.fill(); // Turmspitze
        var avx = AZ.nx || 0, avy = AZ.ny === undefined ? 1 : AZ.ny, aqx = -avy, aqy = avx, aext = Math.abs(avx) * aw / 2 + Math.abs(avy) * ah / 2;
        c.fillStyle = '#3f7a3a'; for (var hz = -2; hz <= 2; hz++) { if (!hz) continue; c.beginPath(); c.arc(avx * (aext + r * 0.14) + aqx * hz * r * 0.26, avy * (aext + r * 0.14) + aqy * hz * r * 0.26, r * 0.12, 0, Math.PI * 2); c.fill(); } // Hecke, Lücke vor der Tür
        if (AZ.bau < 1) { c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -aw / 2 - 3, -ah / 2 - 3, aw + 6, ah + 6, 4); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-aw / 2, -ah / 2 - 9, aw, 4); c.fillStyle = '#c98a12'; c.fillRect(-aw / 2, -ah / 2 - 9, aw * AZ.bau, 4); }
        if (AZ.phase >= 0) { // der Adlige
          var aph = AZ.phase, dx0 = avx * (aext + r * 0.3), dy0 = avy * (aext + r * 0.3), kx0 = (AZ.kx || 0) * T, ky0 = (AZ.ky || 0) * T, ak = -1;
          if (aph >= 1 && aph < 6.5) ak = (aph - 1) / 5.5; else if (aph >= 9.5 && aph < 15) ak = 1 - (aph - 9.5) / 5.5;
          if (ak >= 0) {
            var nxp = dx0 + (kx0 - dx0) * ak, nyp = dy0 + (ky0 - dy0) * ak, hin = aph < 8, nsm = r * CONFIG.units.farmer.r / CONFIG.units.adel.r * 1.1;
            var nal = Math.min(1, ak * 8, (1 - ak) * 8); // an Tür und Burg ein-/ausblenden
            c.save(); c.globalAlpha = nal; c.translate(nxp, nyp); c.rotate(Math.atan2(hin ? ky0 - dy0 : dy0 - ky0, hin ? kx0 - dx0 : dx0 - kx0)); c.translate(0, Math.sin(anow * 6) * nsm * 0.05);
            c.fillStyle = '#6a3d8a'; c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(-nsm * 0.15, 0, nsm * 0.85, nsm * 0.75, 0, 0, Math.PI * 2); c.fill(); c.stroke(); // Mantel
            c.fillStyle = '#f2ece0'; c.beginPath(); c.ellipse(nsm * 0.2, 0, nsm * 0.2, nsm * 0.55, 0, 0, Math.PI * 2); c.fill(); // Kragen
            c.fillStyle = '#e8b994'; c.beginPath(); c.arc(nsm * 0.1, 0, nsm * 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); // Kopf
            c.strokeStyle = '#e2b13c'; c.lineWidth = Math.max(1.5, nsm * 0.14); c.beginPath(); c.arc(nsm * 0.1, 0, nsm * 0.36, -2.2, 2.2); c.stroke(); // Goldreif
            c.restore();
          }
        }
      }
    } else if (type === 'bank' || type === 'dieb' || type === 'brand') {
      // Bank: viereckiges Steingebäude mit flachem Dach (Brüstung, Platten), Geschäftsmann geht zum König: 0–1 drin, 1–4 hin, 4–6 in der Burg, 6–9 zurück, 9–10 drin, dann +10 %.
      // Diebeshaus: dunkle Bretterhütte mit Laterne; der Dieb (Kapuze, mit Beute ein Sack) läuft halb durchsichtig (Deckkraft schwankt 5–50 %) am Spielfeldrand in die gegnerische Burg und zurück.
      var BGd = CONFIG.units[type].gebaeude, bw2 = r * BGd.w / CONFIG.units[type].r, bh2 = r * BGd.h / CONFIG.units[type].r;
      var BZ = typeof settled === 'object' && settled ? settled : { bau: 1, stufe: 1, phase: -1, nx: 0, ny: 1, kx: 0, ky: 0 }, bnow = performance.now() / 1000;
      c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -bw2 / 2 + 3, -bh2 / 2 + 4, bw2, bh2, 3); c.fill();
      if (BZ.neu && BZ.bau < 1) {
        c.fillStyle = '#a89c86'; rr(c, -bw2 / 2, -bh2 / 2, bw2, bh2, 3); c.fill();
        c.save(); c.beginPath(); c.rect(-bw2 / 2, -bh2 / 2, bw2 * BZ.bau, bh2); c.clip(); c.fillStyle = type === 'bank' ? '#b8b2a6' : type === 'brand' ? '#3a2e28' : '#4a3a2c'; rr(c, -bw2 / 2, -bh2 / 2, bw2, bh2, 3); c.fill(); c.restore();
        c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -bw2 / 2, -bh2 / 2, bw2, bh2, 3); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(-bw2 / 2, -bh2 / 2); c.lineTo(bw2 / 2, bh2 / 2); c.moveTo(-bw2 / 2, bh2 / 2); c.lineTo(bw2 / 2, -bh2 / 2); c.stroke();
      } else {
        var bx0 = -bw2 / 2, by0 = -bh2 / 2;
        if (type === 'bank') {
          c.fillStyle = '#c9c3b6'; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 2; c.fillRect(bx0, by0, bw2, bh2); c.strokeRect(bx0, by0, bw2, bh2); // Brüstung
          var bi2 = r * 0.16; c.fillStyle = '#a49e92'; c.fillRect(bx0 + bi2, by0 + bi2, bw2 - 2 * bi2, bh2 - 2 * bi2); // flaches Dach
          c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1;
          for (var gx2 = 1; gx2 < 4; gx2++) { c.beginPath(); c.moveTo(bx0 + bi2 + (bw2 - 2 * bi2) * gx2 / 4, by0 + bi2); c.lineTo(bx0 + bi2 + (bw2 - 2 * bi2) * gx2 / 4, by0 + bh2 - bi2); c.stroke(); c.beginPath(); c.moveTo(bx0 + bi2, by0 + bi2 + (bh2 - 2 * bi2) * gx2 / 4); c.lineTo(bx0 + bw2 - bi2, by0 + bi2 + (bh2 - 2 * bi2) * gx2 / 4); c.stroke(); }
          c.fillStyle = '#8f897d'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { c.fillRect(q[0] * (bw2 / 2 - bi2 * 0.5) - bi2 * 0.5, q[1] * (bh2 / 2 - bi2 * 0.5) - bi2 * 0.5, bi2, bi2); }); // Ecksteine
        } else if (type === 'brand') { // Brandstifterhaus: verkohlte Hütte, Russflecken, glühende Feuerschale mit Rauch, Fackeln an der Wand
          c.fillStyle = '#3a2e28'; c.strokeStyle = 'rgba(0,0,0,0.65)'; c.lineWidth = 2; rr(c, bx0, by0, bw2, bh2, 2); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1; for (var db3 = 1; db3 < 6; db3++) { c.beginPath(); c.moveTo(bx0 + bw2 * db3 / 6, by0); c.lineTo(bx0 + bw2 * db3 / 6, by0 + bh2); c.stroke(); }
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(bx0 + bw2 * 0.7, by0 + bh2 * 0.3, bw2 * 0.18, bh2 * 0.14, 0.4, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(bx0 + bw2 * 0.3, by0 + bh2 * 0.75, bw2 * 0.14, bh2 * 0.1, -0.3, 0, Math.PI * 2); c.fill(); // Russ
          var fg = 0.5 + 0.5 * Math.sin(bnow * 7), fx3 = bx0 + bw2 * 0.5, fy3 = by0 + bh2 * 0.5;
          c.fillStyle = '#555'; c.beginPath(); c.arc(fx3, fy3, r * 0.26, 0, Math.PI * 2); c.fill(); // Feuerschale
          c.fillStyle = 'rgba(255,120,30,' + (0.35 + 0.25 * fg) + ')'; c.beginPath(); c.arc(fx3, fy3, r * (0.32 + 0.06 * fg), 0, Math.PI * 2); c.fill();
          c.fillStyle = '#ffb02e'; c.beginPath(); c.arc(fx3, fy3, r * 0.15, 0, Math.PI * 2); c.fill(); c.fillStyle = '#fff1a8'; c.beginPath(); c.arc(fx3, fy3, r * 0.07, 0, Math.PI * 2); c.fill();
          for (var sm = 0; sm < 3; sm++) { var sk = (bnow * 0.6 + sm / 3) % 1; c.fillStyle = 'rgba(80,80,80,' + (0.35 * (1 - sk)) + ')'; c.beginPath(); c.arc(fx3 + Math.sin(bnow + sm * 2) * r * 0.15, fy3 - sk * r * 0.9, r * (0.12 + 0.18 * sk), 0, Math.PI * 2); c.fill(); } // Rauch
          c.fillStyle = col; c.fillRect(bx0 + bw2 - r * 0.25, by0, r * 0.25, r * 0.14); // kleines Tuch in Teamfarbe
        } else {
          c.fillStyle = '#4a3a2c'; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 2; rr(c, bx0, by0, bw2, bh2, 2); c.fill(); c.stroke();
          c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 1; for (var db = 1; db < 7; db++) { c.beginPath(); c.moveTo(bx0 + bw2 * db / 7, by0 + (db % 2 ? 2 : 0)); c.lineTo(bx0 + bw2 * db / 7, by0 + bh2 - (db % 3 ? 0 : 3)); c.stroke(); } // schiefe Bretter
          c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(bx0, 0, bw2, bh2 / 2);
          c.fillStyle = '#6b5a48'; c.fillRect(bx0 + bw2 * 0.55, by0 + bh2 * 0.15, bw2 * 0.25, bh2 * 0.2); // Flicken
          var lg = 0.5 + 0.5 * Math.sin(bnow * 3); c.fillStyle = 'rgba(255,190,80,' + (0.25 + 0.25 * lg) + ')'; c.beginPath(); c.arc(bx0 + bw2 * 0.2, by0 + bh2 * 0.25, r * 0.28, 0, Math.PI * 2); c.fill(); // Laterne
          c.fillStyle = '#ffcf6a'; c.beginPath(); c.arc(bx0 + bw2 * 0.2, by0 + bh2 * 0.25, r * 0.08, 0, Math.PI * 2); c.fill();
          c.fillStyle = col; c.fillRect(bx0 + bw2 - r * 0.25, by0, r * 0.25, r * 0.14); // kleines Tuch in Teamfarbe
        }
        if (BZ.bau < 1) { c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -bw2 / 2 - 3, -bh2 / 2 - 3, bw2 + 6, bh2 + 6, 4); c.stroke(); c.setLineDash([]); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fillRect(-bw2 / 2, -bh2 / 2 - 9, bw2, 4); c.fillStyle = '#c98a12'; c.fillRect(-bw2 / 2, -bh2 / 2 - 9, bw2 * BZ.bau, 4); }
        var fsm = r * CONFIG.units.farmer.r / CONFIG.units[type].r * 1.1, ph2 = BZ.phase;
        var figur = function (x, y, ang, art, alpha, sack) { // Geschäftsmann oder Dieb (von oben)
          c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang); c.translate(0, Math.sin(bnow * 6) * fsm * 0.05);
          c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5;
          if (art === 'bank') {
            c.fillStyle = '#2f5d4a'; c.beginPath(); c.ellipse(-fsm * 0.1, 0, fsm * 0.8, fsm * 0.72, 0, 0, Math.PI * 2); c.fill(); c.stroke(); // Mantel
            c.fillStyle = '#e8b994'; c.beginPath(); c.arc(fsm * 0.1, 0, fsm * 0.38, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = '#2a2420'; c.beginPath(); c.arc(fsm * 0.05, 0, fsm * 0.36, 0, Math.PI * 2); c.fill(); // flacher Hut
            c.fillStyle = '#c98a12'; c.beginPath(); c.arc(-fsm * 0.2, fsm * 0.62, fsm * 0.2, 0, Math.PI * 2); c.fill(); // Geldbeutel
          } else if (art === 'brand') { // Brandstifter: dunkelroter Umhang, Kapuze, brennende Fackel vorne
            c.fillStyle = '#5a1f1a'; c.beginPath(); c.ellipse(-fsm * 0.1, 0, fsm * 0.78, fsm * 0.7, 0, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = '#6e2a22'; c.beginPath(); c.arc(fsm * 0.08, 0, fsm * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
            c.fillStyle = '#c99a72'; c.beginPath(); c.arc(fsm * 0.32, 0, fsm * 0.15, 0, Math.PI * 2); c.fill();
            c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(1.5, fsm * 0.18); c.beginPath(); c.moveTo(fsm * 0.2, fsm * 0.5); c.lineTo(fsm * 0.95, fsm * 0.55); c.stroke(); // Fackel
            var ffl = 0.5 + 0.5 * Math.sin(bnow * 12); c.fillStyle = '#ff8a1e'; c.beginPath(); c.arc(fsm * 1.05, fsm * 0.55, fsm * (0.26 + 0.06 * ffl), 0, Math.PI * 2); c.fill(); c.fillStyle = '#ffe07a'; c.beginPath(); c.arc(fsm * 1.05, fsm * 0.55, fsm * 0.12, 0, Math.PI * 2); c.fill();
          } else {
            if (sack) { c.fillStyle = '#9c7a4a'; c.beginPath(); c.arc(-fsm * 0.7, 0, fsm * 0.45, 0, Math.PI * 2); c.fill(); c.stroke(); }
            c.fillStyle = '#2b2b33'; c.beginPath(); c.ellipse(-fsm * 0.1, 0, fsm * 0.78, fsm * 0.7, 0, 0, Math.PI * 2); c.fill(); c.stroke(); // dunkler Umhang
            c.fillStyle = '#3d3d48'; c.beginPath(); c.arc(fsm * 0.08, 0, fsm * 0.42, 0, Math.PI * 2); c.fill(); c.stroke(); // Kapuze
            c.fillStyle = '#c99a72'; c.beginPath(); c.arc(fsm * 0.32, 0, fsm * 0.15, 0, Math.PI * 2); c.fill(); // Gesicht unter der Kapuze
          }
          c.restore();
        };
        var rund = function (pts) { // Ecken abrunden (Kurven statt Knicke): jede Ecke wird durch einen Bogen ersetzt
          if (pts.length < 3) return pts;
          var out = [pts[0]], R0 = 0.7;
          for (var j = 1; j < pts.length - 1; j++) {
            var p0 = pts[j - 1], p1 = pts[j], p2 = pts[j + 1], l1 = hyp(p1.x - p0.x, p1.y - p0.y), l2 = hyp(p2.x - p1.x, p2.y - p1.y), rr2 = Math.min(R0, l1 / 2, l2 / 2);
            if (rr2 < 0.01) { out.push(p1); continue; }
            var a1 = { x: p1.x - (p1.x - p0.x) / l1 * rr2, y: p1.y - (p1.y - p0.y) / l1 * rr2 }, a3 = { x: p1.x + (p2.x - p1.x) / l2 * rr2, y: p1.y + (p2.y - p1.y) / l2 * rr2 };
            for (var q = 0; q <= 8; q++) { var tq = q / 8, mq = 1 - tq; out.push({ x: mq * mq * a1.x + 2 * mq * tq * p1.x + tq * tq * a3.x, y: mq * mq * a1.y + 2 * mq * tq * p1.y + tq * tq * a3.y }); }
          }
          out.push(pts[pts.length - 1]); return out;
        };
        var entlang = function (pts, k) { // Punkt und Richtung auf einem Weg (Kacheln, relativ) bei Anteil k
          pts = rund(pts);
          var L = 0, i, seg = []; for (i = 1; i < pts.length; i++) { var sl = hyp(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); seg.push(sl); L += sl; }
          var dd = Math.max(0, Math.min(1, k)) * L;
          for (i = 1; i < pts.length; i++) { if (dd <= seg[i - 1] || i === pts.length - 1) { var f2 = seg[i - 1] ? Math.min(1, dd / seg[i - 1]) : 0, a2 = pts[i - 1], b2 = pts[i]; return { x: (a2.x + (b2.x - a2.x) * f2) * T, y: (a2.y + (b2.y - a2.y) * f2) * T, ang: Math.atan2(b2.y - a2.y, b2.x - a2.x) }; } dd -= seg[i - 1]; }
          return { x: 0, y: 0, ang: 0 };
        };
        if (ph2 >= 0 && type === 'bank') {
          var dvx = BZ.nx || 0, dvy = BZ.ny === undefined ? 1 : BZ.ny, dext = Math.abs(dvx) * bw2 / 2 + Math.abs(dvy) * bh2 / 2;
          var tur = { x: dvx * (dext + r * 0.25) / T, y: dvy * (dext + r * 0.25) / T }, burg = { x: BZ.kx || 0, y: BZ.ky || 0 }, bk2 = -1, hin2 = true;
          if (ph2 >= 1 && ph2 < 4) bk2 = (ph2 - 1) / 3; else if (ph2 >= 6 && ph2 < 9) { bk2 = (ph2 - 6) / 3; hin2 = false; }
          if (bk2 >= 0) { var pp = entlang(hin2 ? [tur, burg] : [burg, tur], bk2); figur(pp.x, pp.y, pp.ang, 'bank', Math.min(1, bk2 * 8, (1 - bk2) * 8)); }
        }
        if (ph2 >= 0 && type === 'brand' && BZ.weg) { // 0–1 drin, 1–13 hin, 13–15 legt Feuer in der gegnerischen Burg, 15–28 zurück, 28–30 drin
          var W3 = BZ.weg, bp3 = null, bk3 = 0;
          if (ph2 >= 1 && ph2 < 13) { bk3 = (ph2 - 1) / 12; bp3 = entlang(W3.hin, bk3); }
          else if (ph2 >= 15 && ph2 < 28) { bk3 = (ph2 - 15) / 13; bp3 = entlang(W3.zur, bk3); }
          if (bp3) figur(bp3.x, bp3.y, bp3.ang, 'brand', (0.05 + 0.45 * (0.5 + 0.5 * Math.sin(bnow * 2.5))) * Math.min(1, bk3 * 10, (1 - bk3) * 10), false);
        }
        if (ph2 >= 0 && type === 'dieb' && BZ.weg) { // 0–1 drin, 1–13 hin, 13–15 in der gegnerischen Burg, 15–28 direkt zurück ins Haus (mit Sack), 28–30 drin
          var W2 = BZ.weg, dp = null, sack = false, dk = 0;
          if (ph2 >= 1 && ph2 < 13) { dk = (ph2 - 1) / 12; dp = entlang(W2.hin, dk); }
          else if (ph2 >= 15 && ph2 < 28) { dk = (ph2 - 15) / 13; dp = entlang(W2.zur, dk); sack = true; }
          if (dp) figur(dp.x, dp.y, dp.ang, 'dieb', (0.05 + 0.45 * (0.5 + 0.5 * Math.sin(bnow * 2.5))) * Math.min(1, dk * 10, (1 - dk) * 10), sack); // Deckkraft 5–50 %
        }
      }
    } else if (type === 'kirche') {
      // Kirche von oben: Schiff mit steilem Schieferdach, vorne ein Glockenturm (Pyramidendach, Kreuz), Banner; darüber der Gunst-Balken (5 Felder).
      // Betet der Priester (settled.gebet > 0), kniet er vor der Kirche, ein Schein pulsiert, das nächste Feld füllt sich.
      var KG2 = CONFIG.units.kirche.gebaeude, kw2 = r * KG2.w / CONFIG.units.kirche.r, kh2 = r * KG2.h / CONFIG.units.kirche.r;
      var KZ = typeof settled === 'object' && settled ? settled : { bau: 1, stufe: 1, phase: -1, nx: 0, ny: 1, gunst: 0, gebet: 0 }, know = performance.now() / 1000;
      c.fillStyle = 'rgba(0,0,0,0.18)'; rr(c, -kw2 / 2 + 3, -kh2 / 2 + 4, kw2, kh2, 3); c.fill();
      if (KZ.neu && KZ.bau < 1) {
        c.fillStyle = '#a89c86'; rr(c, -kw2 / 2, -kh2 / 2, kw2, kh2, 3); c.fill();
        c.save(); c.beginPath(); c.rect(-kw2 / 2, -kh2 / 2, kw2 * KZ.bau, kh2); c.clip(); c.fillStyle = '#5e6670'; rr(c, -kw2 / 2, -kh2 / 2, kw2, kh2, 3); c.fill(); c.restore();
        c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -kw2 / 2, -kh2 / 2, kw2, kh2, 3); c.stroke(); c.setLineDash([]);
        c.beginPath(); c.moveTo(-kw2 / 2, -kh2 / 2); c.lineTo(kw2 / 2, kh2 / 2); c.moveTo(-kw2 / 2, kh2 / 2); c.lineTo(kw2 / 2, -kh2 / 2); c.stroke();
      } else {
        var kvy = KZ.ny === undefined ? 1 : KZ.ny, kvx = KZ.nx || 0; // Vorderseite (zum Weg)
        var sw3 = kw2 * 0.62, sx3 = -sw3 / 2; // Schiff (quer zur Vorderseite)
        c.fillStyle = '#5e6670'; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 2; c.fillRect(sx3, -kh2 / 2, sw3, kh2); c.strokeRect(sx3, -kh2 / 2, sw3, kh2);
        c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(0, -kh2 / 2, sw3 / 2, kh2);
        c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 1; for (var ks = 1; ks < 7; ks++) { c.beginPath(); c.moveTo(sx3, -kh2 / 2 + kh2 * ks / 7); c.lineTo(sx3 + sw3, -kh2 / 2 + kh2 * ks / 7); c.stroke(); } // Schieferreihen
        c.strokeStyle = '#3c424a'; c.lineWidth = Math.max(2, r * 0.1); c.beginPath(); c.moveTo(0, -kh2 / 2); c.lineTo(0, kh2 / 2); c.stroke(); // First
        var tyk = kvy * (kh2 / 2 - r * 0.3), ts = r * 0.62; // Glockenturm an der Vorderseite
        c.fillStyle = '#b8b0a2'; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 2; c.fillRect(-ts / 2, tyk - ts / 2, ts, ts); c.strokeRect(-ts / 2, tyk - ts / 2, ts, ts);
        c.fillStyle = '#4e555e'; c.beginPath(); c.moveTo(-ts / 2, tyk - ts / 2); c.lineTo(ts / 2, tyk - ts / 2); c.lineTo(0, tyk); c.closePath(); c.fill(); c.beginPath(); c.moveTo(-ts / 2, tyk + ts / 2); c.lineTo(ts / 2, tyk + ts / 2); c.lineTo(0, tyk); c.closePath(); c.fill();
        c.fillStyle = '#6e767f'; c.beginPath(); c.moveTo(-ts / 2, tyk - ts / 2); c.lineTo(-ts / 2, tyk + ts / 2); c.lineTo(0, tyk); c.closePath(); c.fill(); c.beginPath(); c.moveTo(ts / 2, tyk - ts / 2); c.lineTo(ts / 2, tyk + ts / 2); c.lineTo(0, tyk); c.closePath(); c.fill();
        c.strokeStyle = '#e2b13c'; c.lineWidth = Math.max(2, r * 0.09); c.beginPath(); c.moveTo(0, tyk - r * 0.2); c.lineTo(0, tyk + r * 0.2); c.moveTo(-r * 0.12, tyk - r * 0.06); c.lineTo(r * 0.12, tyk - r * 0.06); c.stroke(); // Kreuz
        c.fillStyle = col; c.fillRect(sx3 + sw3 - r * 0.05, -kvy * kh2 * 0.15 - r * 0.15, r * 0.22, r * 0.3); // Banner
        if (KZ.bau < 1) { c.strokeStyle = '#7a5a34'; c.lineWidth = Math.max(1.5, r * 0.08); c.setLineDash([r * 0.25, r * 0.18]); rr(c, -kw2 / 2 - 3, -kh2 / 2 - 3, kw2 + 6, kh2 + 6, 4); c.stroke(); c.setLineDash([]); }
        if (KZ.phase >= 0) { // Gunst-Balken: 5 Felder über der Kirche, das laufende Gebet füllt das nächste
          var gb = KZ.gunst || 0, gmax = KG2.gunstMax, gw = kw2 + 6, gx0 = -gw / 2, gy0 = -kh2 / 2 - 22, gfw = gw / gmax;
          c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(gx0 - 1, gy0 - 1, gw + 2, 8);
          for (var gi = 0; gi < gmax; gi++) {
            var fill = gi < gb ? 1 : gi === gb && KZ.gebet > 0 ? 1 - KZ.gebet / KG2.gebet.dauer : 0;
            c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(gx0 + gi * gfw + 1, gy0, gfw - 2, 6);
            if (fill > 0) { c.fillStyle = gb >= gmax ? '#b9d4ff' : '#f0c63a'; c.fillRect(gx0 + gi * gfw + 1, gy0, (gfw - 2) * fill, 6); }
          }
          if (KZ.gebet > 0) { // Priester kniet vor der Kirche und betet
            var pext = Math.abs(kvy) * kh2 / 2 + Math.abs(kvx) * kw2 / 2, ppx = kvx * (pext + r * 0.4) + r * 0.35, ppy = kvy * (pext + r * 0.4), psm = r * CONFIG.units.farmer.r / CONFIG.units.kirche.r * 1.1, pg = 0.5 + 0.5 * Math.sin(know * 3);
            c.fillStyle = 'rgba(255,240,170,' + (0.18 + 0.2 * pg) + ')'; c.beginPath(); c.arc(ppx, ppy, psm * 1.6, 0, Math.PI * 2); c.fill(); // Schein
            priesterMalen(c, ppx, ppy, psm, Math.atan2(-kvy, -kvx)); // schaut zur Kirche
          }
        }
      }
    } else if (type === 'holzfaeller') {
      // Holzfäller: rote Wollmütze, Bart, Axt; beim Fällen schwingt er die Axt (settled.hackt)
      var HS = settled && typeof settled === 'object' ? settled : { hackt: false }, hsw = HS.hackt ? Math.sin(performance.now() / 1000 * Math.PI * 2 / 1.0) : 0;
      c.fillStyle = '#b8322a'; c.beginPath(); c.arc(0, 0, r * 0.62, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke(); // Mütze
      c.fillStyle = '#f2ece0'; c.beginPath(); c.arc(-r * 0.12, 0, r * 0.2, 0, Math.PI * 2); c.fill(); // Bommel
      c.fillStyle = '#6b4a2b'; c.beginPath(); c.arc(r * 0.45, 0, r * 0.22, -Math.PI / 2, Math.PI / 2); c.fill(); // Bart
      c.save(); c.translate(r * 0.2, r * 0.55); c.rotate(-0.9 * Math.max(0, hsw) + 0.5 * Math.max(0, -hsw)); // Axt schwingt
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.18); c.beginPath(); c.moveTo(0, 0); c.lineTo(r * 1.35, 0); c.stroke();
      c.fillStyle = P.steel; c.beginPath(); c.moveTo(r * 1.1, -r * 0.1); c.lineTo(r * 1.5, -r * 0.35); c.lineTo(r * 1.55, r * 0.15); c.lineTo(r * 1.1, r * 0.12); c.closePath(); c.fill();
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.15, 0, r * 0.14, 0, Math.PI * 2); c.fill(); // Hand
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
      // Heugabel; beim Gold-Bonus (at = Sekunden seit dem Bonus) sticht er zweimal in den Boden: Gabel nach vorn und schräg, kleine Erdbrocken
      var gp = at !== undefined ? Math.min(1, at / GRAB) : 1, gj = at !== undefined ? Math.max(0, Math.sin(gp * Math.PI * 4)) : 0; // zweimal zustechen
      c.save(); c.translate(r * 0.35 * gj, 0); c.translate(-r * 0.2, r * 0.9); c.rotate(0.25 * gj); c.translate(r * 0.2, -r * 0.9);
      c.strokeStyle = P.wood; c.lineWidth = Math.max(2, r * 0.18);
      c.beginPath(); c.moveTo(-r * 0.2, r * 0.9); c.lineTo(r * 1.6, r * 0.9); c.stroke();
      c.strokeStyle = P.steel; c.lineWidth = 2;
      c.beginPath();
      c.moveTo(r * 1.6, r * 0.5); c.lineTo(r * 1.6, r * 1.3);
      c.moveTo(r * 1.6, r * 0.5); c.lineTo(r * 2.0, r * 0.5);
      c.moveTo(r * 1.6, r * 0.9); c.lineTo(r * 2.0, r * 0.9);
      c.moveTo(r * 1.6, r * 1.3); c.lineTo(r * 2.0, r * 1.3);
      c.stroke();
      c.restore();
      if (at !== undefined && gp % 0.5 > 0.1) { // Erdbrocken fliegen bei jedem Stich auf
        c.fillStyle = '#7a5a3a';
        for (var gk = 0; gk < 4; gk++) { var gs = (gp % 0.5 - 0.1) / 0.4, ga = gk * 1.6 + 0.4; c.globalAlpha = Math.max(0, 1 - gs); c.beginPath(); c.arc(r * (2.1 + Math.cos(ga) * gs * 0.7), r * (0.9 + Math.sin(ga) * gs * 0.7), r * 0.1, 0, 7); c.fill(); }
        c.globalAlpha = 1;
      }
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
    } else if (type === 'fackel') {
      // Fackelwerfer: russgeschwärzte Lederkappe, Tasche mit Fackeln auf dem Rücken, eine brennende Fackel wurfbereit in der Hand
      c.strokeStyle = P.wood; c.lineWidth = Math.max(1.5, r * 0.12);
      c.beginPath(); for (var fq2 = -1; fq2 <= 1; fq2++) { c.moveTo(-r * 0.3, r * (0.35 + fq2 * 0.12)); c.lineTo(-r * 0.95, r * (0.45 + fq2 * 0.15)); } c.stroke();
      c.fillStyle = '#3a2e28'; for (var fq3 = -1; fq3 <= 1; fq3++) { c.beginPath(); c.arc(-r * 0.98, r * (0.45 + fq3 * 0.15), r * 0.1, 0, Math.PI * 2); c.fill(); } // verkohlte Fackelköpfe
      c.fillStyle = '#5a4636'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.55, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; c.stroke();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.arc(r * 0.1, -r * 0.15, r * 0.2, 0, Math.PI * 2); c.fill(); // Russfleck
      if (A.arrow > 0) {
        var fl2 = 0.85 + 0.15 * Math.sin(performance.now() / 70);
        c.save(); c.translate(A.off, 0); c.globalAlpha = A.arrow;
        c.strokeStyle = '#6b4a2a'; c.lineWidth = Math.max(2, r * 0.15); c.beginPath(); c.moveTo(-r * 0.1, -r * 0.5); c.lineTo(r * 0.9, -r * 0.5); c.stroke();
        c.fillStyle = 'rgba(255,150,40,0.35)'; c.beginPath(); c.arc(r * 1.05, -r * 0.5, r * 0.42 * fl2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#e8641e'; c.beginPath(); c.arc(r * 1.02, -r * 0.5, r * 0.24 * fl2, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffd25a'; c.beginPath(); c.arc(r * 1.04, -r * 0.5, r * 0.12, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1; c.restore();
      }
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.25 + A.off, -r * 0.5, r * 0.14, 0, Math.PI * 2); c.fill(); // Wurfhand
    } else if (type === 'crossbow') {
      // Armbrustschütze: grauer Eisenhut mit Krempe, Armbrust nach vorne (Schaft, Bogen quer, Sehne, Bolzen)
      c.save(); c.translate(A.off, 0);
      if (cbc) { c.translate(r * 0.55, r * 0.2); c.rotate(0.3); } // beim Kurbeln: Armbrust vorgeschoben und schräg vor sich auf dem Boden
      c.strokeStyle = '#5e3b18'; c.lineWidth = Math.max(2.5, r * 0.2);
      c.beginPath(); c.moveTo(r * 0.1, r * 0.1); c.lineTo(r * 1.45, r * 0.1); c.stroke(); // Schaft
      var cbs = 1.0 - 0.1 * A.tens;
      // Laufen (settled = 0): Bogenarme nach hinten an den Schaft geklappt, ohne Bolzen; beim Abknien klappt er sie auf
      var cfd = type === 'crossbow' && typeof settled === 'number' ? 1 - cbk : 0;
      var bax = r * lerp(1.15, 0.78, cfd), bay1 = r * lerp(-0.75, -0.12, cfd), bay2 = r * lerp(0.95, 0.32, cfd), bcx = r * lerp(1.55 - 0.1 * (1 - A.str), 1.42, cfd);
      c.strokeStyle = '#6f7680'; c.lineWidth = Math.max(2.5, r * 0.18);
      c.beginPath(); c.moveTo(bax, bay1); c.quadraticCurveTo(bcx, r * 0.1, bax, bay2); c.stroke(); // Bogen (Stahl)
      var cmx = r * lerp(0.65 + 0.5 * A.str, 0.95, cfd);
      c.strokeStyle = '#e8e0cc'; c.lineWidth = 1.2;
      c.beginPath(); c.moveTo(bax, bay1); c.lineTo(cmx, r * 0.1 + A.vib * r); c.lineTo(bax, bay2); c.stroke();
      if (A.arrow * (1 - cfd) > 0) { c.globalAlpha = A.arrow * (1 - cfd); c.strokeStyle = '#4a3b2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(cmx, r * 0.1); c.lineTo(r * 1.55, r * 0.1); c.stroke(); c.fillStyle = '#9aa3a6'; c.beginPath(); c.moveTo(r * 1.8, r * 0.1); c.lineTo(r * 1.5, -r * 0.05); c.lineTo(r * 1.5, r * 0.25); c.closePath(); c.fill(); c.globalAlpha = 1; }
      c.restore();
      c.fillStyle = '#8d9399'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.68, 0, Math.PI * 2); c.fill(); // Krempe
      c.strokeStyle = '#5f666c'; c.lineWidth = Math.max(1.5, r * 0.08); c.stroke();
      c.fillStyle = '#a3a9ae'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.42, 0, Math.PI * 2); c.fill(); // Hutkopf
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.55 + A.off, r * 0.1, r * 0.13, 0, Math.PI * 2); c.fill();
      if (cbc) { // Kurbel hinten am Schaft dreht sich (4 Umdrehungen während des Einrichtens), die Hand kurbelt mit
        c.save(); c.translate(A.off + r * 0.55, r * 0.2); c.rotate(0.3);
        var cka = settled * Math.PI * 8, ckx = r * 0.2, cky = r * 0.1, ckr = r * 0.32, hx = ckx + Math.cos(cka) * ckr, hy = cky + Math.sin(cka) * ckr;
        c.fillStyle = '#6f7680'; c.beginPath(); c.arc(ckx, cky, r * 0.13, 0, Math.PI * 2); c.fill();
        c.strokeStyle = '#4b5158'; c.lineWidth = Math.max(1.5, r * 0.1); c.beginPath(); c.moveTo(ckx, cky); c.lineTo(hx, hy); c.stroke();
        c.fillStyle = '#d9a066'; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.arc(hx, hy, r * 0.15, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
      }
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
    } else if (type === 'raeuber') {
      // Bandit: dunkle Kapuze, rotes Halstuch über Mund und Nase, Dolch (Stoss nach vorn)
      c.fillStyle = '#34302c'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.62, 0, Math.PI * 2); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.45)'; c.lineWidth = 1.5; c.stroke(); // Kapuze
      c.fillStyle = '#c99a72'; c.beginPath(); c.arc(r * 0.28, 0, r * 0.22, -Math.PI / 2, Math.PI / 2); c.fill(); // Gesicht
      c.fillStyle = '#a3271f'; c.beginPath(); c.arc(r * 0.32, 0, r * 0.2, -0.9, 0.9); c.lineTo(r * 0.32, 0); c.fill(); // Halstuch
      c.save(); c.translate(A.off, 0);
      c.strokeStyle = '#5a3d22'; c.lineWidth = Math.max(2, r * 0.16); c.beginPath(); c.moveTo(r * 0.35, r * 0.55); c.lineTo(r * 0.7, r * 0.55); c.stroke(); // Griff
      c.fillStyle = P.steel; c.beginPath(); c.moveTo(r * 0.7, r * 0.45); c.lineTo(r * 1.35, r * 0.55); c.lineTo(r * 0.7, r * 0.65); c.closePath(); c.fill(); // Klinge
      c.fillStyle = '#d9a066'; c.beginPath(); c.arc(r * 0.4, r * 0.55, r * 0.13, 0, Math.PI * 2); c.fill(); // Hand
      c.restore();
    } else {
      // Ritter: grauer Topfhelm mit Sehschlitz, Schwert mit goldener Parierstange, grosser Wappenschild in Teamfarbe mit weissem Kreuz.
      // Der Schild ist nach vorne gekippt (Oberkante beim Helm, etwas breiter; Spitze vorne, verkürzt) und sitzt seitlich wie beim Schwertkämpfer.
      var swz = type === 'schwarzritter', kg = swz ? '#2b2e33' : '#8d9399', kd = swz ? '#111316' : '#5f666c'; // Schwarzer Ritter: schwarzer Helm, stachelige Schulterpanzer, längeres Schwert; Schild wie Ritter, Kreuz schwarz
      if (swz) { c.fillStyle = '#22252a'; c.strokeStyle = '#000'; c.lineWidth = 1; for (var sp = -1; sp <= 1; sp += 2) { var py = sp * r * 0.6; [[-0.35, 1], [-0.05, 1.15], [0.25, 1]].forEach(function (q) { c.beginPath(); c.moveTo(r * (q[0] - 0.12), py); c.lineTo(r * q[0], sp * r * q[1]); c.lineTo(r * (q[0] + 0.12), py); c.fill(); c.stroke(); }); c.beginPath(); c.arc(-r * 0.05, py, r * 0.3, 0, Math.PI * 2); c.fill(); c.stroke(); } }
      c.fillStyle = kg; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.6, 0, Math.PI * 2); c.fill();
      c.strokeStyle = kd; c.lineWidth = Math.max(1.5, r * 0.1); c.stroke();
      c.strokeStyle = '#2b3135'; c.lineWidth = Math.max(2, r * 0.12); c.lineCap = 'butt'; c.beginPath(); c.arc(-r * 0.05, 0, r * 0.5, -0.75, 0.75); c.stroke(); c.lineCap = 'round';
      c.lineWidth = Math.max(1.5, r * 0.07); c.beginPath(); c.moveTo(r * 0.12, 0); c.lineTo(r * 0.5, 0); c.stroke();
      c.fillStyle = swz ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.28)'; c.beginPath(); c.arc(-r * 0.25, -r * 0.18, r * 0.18, 0, Math.PI * 2); c.fill();
      c.save(); c.translate(r * 0.55, -r * 0.75); c.rotate(A.rot); c.translate(-r * 0.55, r * 0.75); // Schwerthieb: ausholen nach aussen, Hieb nach vorne-innen
      c.strokeStyle = P.steel; c.lineWidth = Math.max(2.5, r * (swz ? 0.28 : 0.22));
      c.beginPath(); c.moveTo(r * 0.5, -r * 0.75); c.lineTo(r * (swz ? 2.4 : 1.9), -r * 0.75); c.stroke();
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
      c.save(); kpath(kpts); c.clip(); c.fillStyle = swz ? '#111316' : '#ffffff'; // Schwarzer Ritter: schwarzes Kreuz
      kpath([[-0.1, -1], [0.1, -1], [0.1, 3], [-0.1, 3]]); c.fill();
      kpath([[-2, KH * 0.62], [2, KH * 0.62], [2, KH * 0.76], [-2, KH * 0.76]]); c.fill();
      c.restore();
      kpath(kpts); c.strokeStyle = '#8d9399'; c.lineJoin = 'round'; c.lineWidth = Math.max(2, r * 0.12); c.stroke();
    }

    if (hit > 0) {
      c.fillStyle = 'rgba(255,255,255,' + (0.7 * hit / 0.15) + ')';
      c.beginPath(); c.arc(0, 0, bodyR || r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

