  // ---------- Oberfläche ----------
  var btns = {}, icons = {}, ui = { gm: -1, gf: -1, sec: -1, inc: -1 };

  BUY_TYPES.forEach(function (type) {
    var d = CONFIG.units[type];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'unit';
    b.setAttribute('data-type', type);
    // Auf dem Knopf stehen nur Bild und Kosten, die Werte erscheinen als Tooltip
    var info = d.name + ': ' + d.cost + ' Gold, Leben ' + d.hp + ', Angriff ' + d.atk + ', Reichweite ' + d.range +
      ', Marschtempo ' + d.speed.toFixed(1) +
      (d.bonus ? ', Gold-Bonus +' + d.bonus : '') + (d.ram && d.atk ? ', greift nur Mauern und Kasernen an' : '') + (type === 'shield' ? ', Fernkampfschaden ist um 75% reduziert' : '') +
      (d.splash ? ', Fläche Radius ' + d.splash + (d.slow ? ', bremst auf ' + Math.round(d.slow.factor * 100) + ' % für ' + d.slow.secs + ' s' : '') : '') +
      (d.delay && !d.fire ? ', schießt alle ' + d.cd + ' s, Bolzen trifft nach ' + d.delay + ' s' : '') + (d.minRange ? ', kann Ziele näher als ' + d.minRange + (d.minRange === 1 ? ' Kachel' : ' Kacheln') + ' nicht angreifen' : '') + (d.fire ? ', schießt Feuerbälle alle ' + d.cd + ' s, ignoriert Mauern' : '') +
      ' (Taste ' + d.key.toUpperCase() + ')';
    if (d.wall) info = d.name + ': ' + d.cost + ' Gold. ' + WALL.workers + ' Arbeiter (Leben ' + CONFIG.units.worker.hp + ', Tempo ' + CONFIG.units.worker.speed.toFixed(1) + ') bauen mit je ' + WALL.rate + ' Leben pro Sekunde und bringen je ' + WALL.add + ' Leben für eine gebogene Mauer ' + WALL.dist + ' Kacheln um deine Kaserne herum (höchstens ' + WALL.cap + ' Leben). Sie wirkt, sobald sie Leben hat, heilt 0,6 Leben pro Sekunde bis zum Höchstwert ihrer Optik und zeigt bis 40 Leben nur ein Gerüst und wird ab 40, 80, 120, 160 und 200 Leben stabiler. Ein weiterer Klick geht erst, wenn deine Arbeiter fertig sind, und bringt vier neue. Ist deine Burg zerstört, baut dieser Knopf sie wieder auf (bis 40 Leben, ab 1 Leben steht sie wieder, heilt wie die Mauer) (Taste ' + d.key + ')';
    b.title = info;
    b.setAttribute('aria-label', info);
    b.innerHTML = '<canvas width="88" height="88"></canvas><span class="cost">' + COIN_SVG + d.cost + '</span>';
    unitsEl.appendChild(b);
    btns[type] = b;
    icons[type] = b.querySelector('canvas');
  });

  // Ausdehnung der Figuren links und rechts vom Mittelpunkt (in Vielfachen des Radius), damit jedes Symbol groß und mittig steht
  var ICON_EXT = { schmiede: [1.25, 1.25], adel: [1.25, 1.25], bank: [1.2, 1.2], dieb: [1.2, 1.2], kirche: [1.2, 1.2], onager: [1.7, 1.5], javelin: [1.15, 1.75], crossbow: [0.75, 1.85], trebuchet: [2.4, 1.3], sword: [0.9, 2.0], ladder: [1.5, 1.7], belfry: [1.25, 1.4], farmer: [0.9, 2.0], spear: [0.9, 2.35], archer: [0.9, 1.5], rider: [1.8, 2.45], mage: [0.9, 2.25], knight: [0.85, 1.65], digger: [0.9, 2.1], ram: [1.0, 2.7], shield: [1.44, 1.2], catapult: [1.7, 1.5], baliste: [1.4, 1.2] };
  // Symbol des Mauer-Knopfs, solange die eigene Burg zerstört ist: eine kleine Burg (der Knopf baut sie dann wieder auf)
  function drawCastleIcon(c) {
    var col = P.me, st = '#8d9396', dk = '#585f63', x = 14, y = 12, w = 60, h = 64;
    c.fillStyle = 'rgba(0,0,0,0.25)'; rr(c, x + 3, y + 4, w, h, 7); c.fill();
    c.fillStyle = dk; rr(c, x, y, w, h, 7); c.fill();
    c.fillStyle = st; rr(c, x + 3, y + 3, w - 6, h - 6, 5); c.fill();
    c.fillStyle = dk;
    for (var i = 0; i < 4; i++) { c.fillRect(x + 12 + i * 12, y, 6, 5); c.fillRect(x + 12 + i * 12, y + h - 5, 6, 5); }
    [[x + 8, y + 8], [x + w - 8, y + 8], [x + 8, y + h - 8], [x + w - 8, y + h - 8]].forEach(function (tp) {
      c.fillStyle = st; c.strokeStyle = dk; c.lineWidth = 2;
      c.beginPath(); c.arc(tp[0], tp[1], 9, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = col; c.beginPath(); c.arc(tp[0], tp[1], 5, 0, Math.PI * 2); c.fill();
    });
    c.fillStyle = st; c.strokeStyle = dk; c.lineWidth = 2; rr(c, x + 17, y + 19, w - 34, h - 38, 4); c.fill(); c.stroke();
    c.fillStyle = '#6a5a48'; rr(c, x + 20, y + 22, w - 40, h - 44, 3); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.65)'; rr(c, x + w - 5, y + h / 2 - 7, 5, 14, 2); c.fill();
    drawUnit(c, 'kingbow', x + w / 2, y + h / 2, 9, 0, 1, 0, true);
  }

  function drawIcons() {
    BUY_TYPES.forEach(function (type) {
      var c = icons[type].getContext('2d');
      c.clearRect(0, 0, 88, 88);
      if (type === 'wall') { if (bases && bases[ME] && bases[ME].down) drawCastleIcon(c); else drawWallIcon(c); return; }
      var ext = ICON_EXT[type] || [1, 2], span = ext[0] + ext[1];
      var r = Math.min(24, 78 / span);
      drawUnit(c, type, (88 - span * r) / 2 + ext[0] * r, 44, r, 0, 1, 0, type !== 'ladder'); // Leiterträger mit Leiter
    });
  }

