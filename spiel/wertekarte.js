  // ---------- Werte-Karte: lange auf einen Einheiten-Knopf drücken ----------
  var SPECIAL = {
    farmer: 'Bringt alle 5 s +1 Gold, sobald er an seinem Platz steht.',
    archer: 'Setzt sich in Türme (ab Mauer 2) und nimmt dort nur 25 % Fernkampfschaden.',
    feuerbogen: 'Brennende Pfeile mit Flächenschaden (Radius 0,8). Setzt sich in Türme.',
    mage: 'Flächenschaden (Radius 1) und bremst Getroffene 3 s lang auf halbes Tempo und halbe Angriffsgeschwindigkeit. Setzt sich in Türme.',
    rider: 'Sehr schnell.',
    knight: 'Hält am meisten aus.',
    digger: 'Gräbt sich unsichtbar zu einem gegnerischen Fernkämpfer (nicht auf Türmen, nie näher als 6 Kacheln an der Burg).',
    ram: 'Greift nur Mauern und Burgen an.',
    shield: 'Fernkampfschaden ist um 75% reduziert',
    catapult: 'Feuerball mit Flächenschaden (Radius 1,2). Kann Ziele unter 2 Kacheln nicht treffen. Setzt sich in Türme der Stufe 5.',
    baliste: 'Mächtiger Bolzen, trifft nach 0,5 s. Kann Ziele unter 2 Kacheln nicht treffen. Setzt sich in Türme der Stufe 5.',
    wall: 'Vier Arbeiter bauen sie in Stufen (40, 80 … Leben). Ab Mauer 2 mit Türmen. Ist die Burg gefallen, baut der Knopf die Burg neu.'
  };
  var statCard = $('statCard'), lpTimer = 0, lpFired = false, lpX = 0, lpY = 0;
  function num(v) { return String(Math.round(v * 10) / 10).replace('.', ','); }
  function showStats(type, btn) {
    var d = CONFIG.units[type], rows;
    if (d.wall) rows = [['Kosten', d.cost + ' Gold'], ['Arbeiter', WALL.workers], ['Leben', 'bis ' + WALL.cap]];
    else {
      rows = [['Kosten', d.cost + ' Gold'], ['Leben', d.hp], ['Tempo', num(d.speed)],
        ['Angriff', d.atk > 0 ? d.atk : 'keiner'], ['Reichweite', d.range <= 1 ? 'Nahkampf' : num(d.range) + ' Kacheln']];
      if (d.atk > 0) rows.push(['Angriffstempo', 'alle ' + num(d.cd) + ' s']);
    }
    var h = '<b>' + d.name + '</b><dl>' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
    if (SPECIAL[type]) h += '<p class="spec">' + SPECIAL[type] + '</p>';
    statCard.innerHTML = h;
    statCard.hidden = false;
    var fr = $('field').getBoundingClientRect(), cr = statCard.getBoundingClientRect(); // mittig im Spielfeld, damit der Finger nichts verdeckt
    statCard.style.left = Math.max(8, Math.min(window.innerWidth - cr.width - 8, fr.left + fr.width / 2 - cr.width / 2)) + 'px';
    statCard.style.top = Math.max(8, fr.top + fr.height / 2 - cr.height / 2) + 'px';
  }
  function hideStats() { clearTimeout(lpTimer); statCard.hidden = true; }
  unitsEl.addEventListener('pointerdown', function (e) {
    var b = e.target.closest ? e.target.closest('button.unit') : null;
    lpFired = false;
    if (!b) return;
    lpX = e.clientX; lpY = e.clientY;
    clearTimeout(lpTimer);
    lpTimer = setTimeout(function () { lpFired = true; showStats(b.getAttribute('data-type'), b); }, 450);
  });
  unitsEl.addEventListener('pointermove', function (e) { if (hyp(e.clientX - lpX, e.clientY - lpY) > 12 && !lpFired) clearTimeout(lpTimer); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { unitsEl.addEventListener(n, hideStats); });
  unitsEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  unitsEl.addEventListener('click', function (e) { if (lpFired) { lpFired = false; e.stopPropagation(); } }, true); // der Klick nach dem langen Drücken kauft nichts

  unitsEl.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button.unit') : null;
    if (!b) return;
    tryBuy(b.getAttribute('data-type'), b);
    if (e.detail > 0) b.blur();
  });
  ovBtn.addEventListener('click', function () {
    if (pvp.searching) { pvpCancel(); return; }
    if (sozial.forderungRaus) { forderungAbbrechen(); return; }
    if (ovZumMenu) { zeigeMenu(); return; }
    if (pvp.ended) { pvpLeave(); return; }
    if (state === 'paused') setPaused(false); else start();
  });
  sandBtn.addEventListener('click', function () {
    if (state === 'paused') return;
    sandbox = true; spielArt = 'sandbox';
    start();
    sozialStatus('story', 'Sandbox');
  });
  pauseBtn.addEventListener('click', function (e) {
    if (state === 'playing') setPaused(true); else if (state === 'paused') setPaused(false);
    if (e.detail > 0) pauseBtn.blur();
  });
  document.addEventListener('keydown', function (e) {
    var k = e.key;
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; // beim Tippen des Codes nichts kaufen
    if (k === 'p' || k === 'P') {
      if (state === 'playing') setPaused(true); else if (state === 'paused') setPaused(false);
      return;
    }
    for (var i = 0; i < BUY_TYPES.length; i++) {
      if (CONFIG.units[BUY_TYPES[i]].key === String(k).toLowerCase()) tryBuy(BUY_TYPES[i], btns[BUY_TYPES[i]]);
    }
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && state === 'playing') setPaused(true);
  });

  function themeChanged() {
    readPalette();
    buildBackdrop();
    drawIcons();
  }
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', themeChanged);
    new MutationObserver(themeChanged).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  } catch (err) {}

