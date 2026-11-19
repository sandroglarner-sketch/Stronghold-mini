  // ---------- Tutorial ----------
  // Geführte Partie gegen einen Trainingsgegner mit König und Burg. Er tut nur das, was das Tutorial verlangt.
  // Grüne Pfeile zeigen, welchen Knopf man drücken soll. Das Gold läuft ganz normal (es gibt nie extra Gold).
  // Sobald das Gold für den Kaufschritt reicht (oder ein Hinweisfeld offen ist), läuft das Spiel nur noch mit 20 % Tempo.
  var TUT_SLOW = 0.2;
  function eb(type, n) { for (var k = 0; k < n; k++) { gold[1] += CONFIG.units[type].cost; buy(1, type); } }
  function noWorkers(team) { return !units.some(function (u) { return u.team === team && u.type === 'worker' && u.hp > 0; }); }
  function wallDone(team, hp) { var w = walls[team]; return !!(w && w.hp >= hp && noWorkers(team)); }
  function noFoe() { return !units.some(function (u) { return u.team === 1 && u.type !== 'king' && !u.tower && u.hp > 0; }); } // Besatzung der gegnerischen Türme zählt nicht
  function towerCount(team) { return units.filter(function (u) { return u.team === team && u.tower && u.hp > 0; }).length; }
  // keine Kampfeinheit mehr auf dem Feld, auf beiden Seiten (Könige, Bauern, Arbeiter und Turmbesatzungen zählen nicht)
  function noFighters() { return !units.some(function (u) { var d = CONFIG.units[u.type]; return u.hp > 0 && !u.tower && !d.king && !d.passive && !d.worker; }); }
  function knightNearWall() { return units.some(function (u) { return u.team === 1 && u.type === 'knight' && u.hp > 0 && wallD(0, u.x, u.y) <= WALL.dist + 3; }); } // höchstens 3 Kacheln vor deiner Mauer
  function farmersSettled() { return units.filter(function (u) { return u.team === 0 && u.type === 'farmer' && u.settled && u.hp > 0; }).length; }
  var TUT = [
    { mode: 'info', avail: [], box: 'Ziel des Spiels ist es, den gegnerischen König zu besiegen.' },
    { mode: 'run', avail: [], check: function () { return tut.st >= 1; } }, // 1 s Pause, dann die Schatzkammer zeigen
    { mode: 'info', avail: [], hlGold: true, box: 'Hier ist deine Schatzkammer. Sie wird laufend mit Gold aufgefüllt. Gold benötigst du, um Einheiten zu kaufen.' },
    { mode: 'buy', avail: ['spear'], need: { spear: 4 } },
    { mode: 'run', avail: [], check: function () { // erst 1 s nachdem alle eigenen Einheiten (ausser dem König) gefallen sind
      if (units.some(function (u) { return u.team === 0 && u.type !== 'king' && u.hp > 0; })) { tut.qt = tut.st; return false; }
      return tut.st - tut.qt >= 1; } },
    { mode: 'buy', avail: ['farmer'], need: { farmer: 12 }, box: 'Bauern erhöhen deine Einnahmen.' },
    { mode: 'run', avail: [], check: function () { return farmersSettled() >= 12; } },
    { mode: 'run', avail: [], start: function () { eb('archer', 2); }, check: function () { return countFarmers(0) < 12; } },
    { mode: 'buy', avail: ['rider'], need: { rider: 1 } },
    { mode: 'run', avail: [], check: function () { return tut.st > 0.5 && !units.some(function (u) { return u.team === 0 && u.type === 'rider' && u.hp > 0; }); } }, // fertig, sobald der Reiter gefallen ist
    { mode: 'buy', avail: ['wall'], need: { wall: 1 } },
    { mode: 'run', avail: [], check: function () { return wallDone(0, 40); } },
    { mode: 'buy', avail: ['wall'], need: { wall: 1 } },
    { mode: 'run', avail: [], check: function () { return wallDone(0, 80); } },
    { mode: 'buy', avail: ['archer'], need: { archer: 2 } },
    { mode: 'run', avail: [], // der Gegner baut Mauer 1, danach Mauer 2, und besetzt dann ihre Türme mit 2 Bogenschützen
      // gleichzeitig (ohne Verlangsamung): 2 s nach Beginn ein Erklärfenster, 1 s nach dem Schliessen ein zweites; solange sind deine Türme grün umrandet
      notes: [{ after: 2, hl: true, box: 'Fernkampfeinheiten besetzen zuerst die Türme und sind dort geschützter.' },
              { after: 1, hl: true, box: 'Mit dem Ausbau der Mauer werden die Türme mächtiger. Auf den grössten Türmen können sogar Kriegsmaschinen positioniert werden.' }],
      script: [{ do: function () { eb('wall', 1); } },
               { until: function () { return wallDone(1, 40); }, do: function () { eb('wall', 1); } },
               { until: function () { var w = walls[1]; return wallDone(1, 80) && !!(w.sl && w.tlv); }, do: function () { eb('archer', 2); } }],
      check: function () { return towerCount(1) >= 2; } },
    { mode: 'run', avail: [], start: function () { eb('knight', 1); },
      script: [{ after: 5, do: function () { eb('spear', 4); } }, { after: 1, do: function () { eb('archer', 2); } }],
      check: function () { return knightNearWall(); } },
    { mode: 'buy', avail: ['archer'], need: { archer: 2 } },
    { mode: 'run', avail: [], check: function () { // 5 s nachdem der Angriff vorbei ist (alle Gegner auf dem Feld tot; seine Turmbesatzung zählt nicht)
      if (!noFoe()) { tut.qt = tut.st; return false; }
      return tut.st - tut.qt >= 5; } },
    { mode: 'buy', avail: ['ram'], need: { ram: 1 }, box: 'Mit dem Rammbock reissen wir die gegnerische Mauer ein.' },
    { mode: 'run', avail: [], check: function () { return tut.st >= 1; } },
    { mode: 'buy', avail: ['knight'], need: { knight: 4 } },
    { mode: 'run', avail: [], check: function () { return tut.st >= 4; } },
    { mode: 'buy', avail: ['archer'], need: { archer: 4 } },
    { mode: 'run', avail: [], check: function () { return false; } }
  ];
  var tutPanelEl = $('tutPanel'), tutBoxEl = $('tutBox');
  function tutNeed(s) { var ok = true; for (var t in s.need) if ((tut.bought[t] || 0) < s.need[t]) ok = false; return ok; }
  function tutCost(s) { var c = 0; for (var t in s.need) c += Math.max(0, s.need[t] - (tut.bought[t] || 0)) * CONFIG.units[t].cost; return c; }
  function tutArrow(t) { var s = TUT[tut.i]; return tut.on && s.mode === 'buy' && s.need[t] !== undefined && (tut.bought[t] || 0) < s.need[t]; }
  // Tempo des Spiels: bei offenem Hinweisfeld oder wenn das Gold für den Kaufschritt reicht nur 20 %
  function tutScale() {
    if (!tut.on) return 1;
    var s = TUT[tut.i];
    if ((tut.boxOpen && !tut.noSlow) || (s.mode === 'buy' && gold[0] >= tutCost(s))) return TUT_SLOW; // Erklärfenster aus notes verlangsamen nicht
    return 1;
  }
  function tutBox(text, noSlow) {
    tut.boxOpen = !!text;
    tut.noSlow = !!(text && noSlow);
    if (!text) tut.hlGold = false;
    if (!text && !(tut.notes && tut.notes.length)) tut.hl = false; // grüne Turm-Umrandung endet mit dem letzten Erklärfenster
    tutBoxEl.hidden = !text;
    if (text) $('tutBoxText').textContent = text;
  }
  function tutEnter(n) {
    var s = TUT[n];
    tut.i = n; tut.bought = {}; tut.script = (s.script || []).slice(); tut.si = 0; tut.rt = 0; tut.st = 0; tut.qt = 0;
    tut.avail = s.avail || [];
    ui.gm = ui.gf = -1;
    if (s.start) s.start();
    tut.hlGold = !!s.hlGold; // grüne Umrandung des Golds in der eigenen Burg
    if (s.notes) { tut.notes = s.notes.slice(); tut.nt = 0; }
    if (s.box || !(tut.boxOpen && tut.noSlow)) tutBox(s.box || ''); // ein offenes Erklärfenster aus notes bleibt beim Schrittwechsel offen
  }
  function tutNextStep() { if (tut.i < TUT.length - 1) tutEnter(tut.i + 1); }
  function tutGo() { spielArt = 'tut'; sozialStatus('tutorial', 'Tutorial'); tut.on = true; tut.notes = []; tut.hl = false; start(true); tutEnter(0); }
  // gdt = Spielzeit dieses Bildes
  function tutTick(gdt) {
    if (!tut.on) return;
    gold[1] = 0; // der Trainingsgegner kauft nur auf Befehl des Tutorials
    if (tut.notes && tut.notes.length && !tut.boxOpen) { // Erklärfenster, die parallel zu den Schritten erscheinen
      tut.nt += gdt;
      if (tut.nt >= tut.notes[0].after) { var nn = tut.notes.shift(); tut.nt = 0; tut.hl = !!nn.hl; tutBox(nn.box, true); }
    }
    var s = TUT[tut.i];
    if (s.mode === 'buy') { if (tutNeed(s)) tutNextStep(); return; }
    if (s.mode === 'info') { if (!tut.boxOpen) tutNextStep(); return; }
    tut.rt += gdt; tut.st += gdt;
    while (tut.si < tut.script.length) {
      var it = tut.script[tut.si];
      if (tut.rt >= (it.after || 0) && (!it.until || it.until())) { it.do(); tut.si++; tut.rt = 0; } else break;
    }
    if (tut.si >= tut.script.length && s.check && s.check()) tutNextStep();
  }
  function tutExit() {
    tut.on = false; state = 'over'; pauseBtn.textContent = 'Pause';
    tutBox('');
    showOverlay('Tutorial beendet', 'Du kannst es jederzeit im Startmenü wieder aufrufen.', 'Zum Menü');
    ovZumMenu = true; $('menuBtn').hidden = true;
  }
  $('tutBtn').addEventListener('click', function () { tutGo(); });
  $('tutEnd').addEventListener('click', tutExit);
  $('tutOk').addEventListener('click', function () { tutBox(''); });

