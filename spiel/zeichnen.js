  function drawWallIcon(c) {
    c.fillStyle = P.stone;
    rr(c, 14, 20, 60, 50, 6); c.fill();
    c.strokeStyle = P['stone-dark']; c.lineWidth = 3; c.stroke();
    c.lineWidth = 2;
    for (var row = 0; row < 3; row++) {
      var yy = 20 + row * 50 / 3;
      c.beginPath(); c.moveTo(14, yy + 50 / 3); c.lineTo(74, yy + 50 / 3); c.stroke();
      var off = row % 2 ? 10 : 25;
      for (var xx = 14 + off; xx < 74; xx += 30) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx, yy + 50 / 3); c.stroke(); }
    }
  }

  // Mauerlinie im Abstand r um die Kaserne (für die linke Kaserne; die rechte wird gespiegelt gezeichnet)
  function wallPath(r) {
    var b = bases[0], x2 = b.x2 * T, y1 = b.y1 * T, y2 = b.y2 * T, rp = r * T, a0 = Math.asin(Math.min(1, b.y1 / r));
    ctx.beginPath();
    ctx.arc(x2, y1, rp, -a0, 0);
    ctx.lineTo(x2 + rp, y2);
    ctx.arc(x2, y2, rp, 0, a0);
  }
  // Bis 40 Leben nur ein Gerüst (blasser Bauplatz); ab 40, 80, 120, 160 und 200 Leben je eine neue Optik: Holzpfähle, Planken, Ziegel,
  // Ziegel mit Eisenbändern, Zinnenmauer. Die höchste erreichte Stufe bleibt, bis die Mauer zerstört ist.
  // Turm (Viereck oder Rund) im Stil der Mauer-Optik st
  function drawTower(w, tw, st, col) {
    var tp = wallPoint(w.team, tw.f, WALL.dist + tw.out), an = towerAng(w.team, tw.f), tk, iron = '#4f5963';
    var rd = tw.k === 'rd', hw = (rd ? tw.r : tw.w / 2) * T, hh = (rd ? tw.r : tw.h / 2) * T;
    var body = function (grow) { if (rd) { ctx.beginPath(); ctx.arc(0, 0, hw + grow, 0, Math.PI * 2); } else rr(ctx, -hw - grow, -hh - grow, 2 * (hw + grow), 2 * (hh + grow), 2 + grow); };
    ctx.save();
    ctx.translate(tp.x * T, tp.y * T);
    ctx.save(); ctx.translate(4, 5); ctx.fillStyle = P.shade; body(0); ctx.fill(); ctx.restore();
    ctx.rotate(an);
    var wood = st === 2;
    ctx.fillStyle = wood ? 'rgba(0,0,0,0.5)' : P['stone-dark']; body(2); ctx.fill();
    ctx.fillStyle = wood ? P.wood : P.stone; body(0); ctx.fill();
    ctx.save(); body(0); ctx.clip();
    ctx.lineWidth = 1.5; ctx.strokeStyle = wood ? 'rgba(0,0,0,0.4)' : P['stone-dark'];
    var n = wood ? 4 : 5;
    for (tk = 1; tk < n; tk++) { var yy = -hh + tk * 2 * hh / n; ctx.beginPath(); ctx.moveTo(-hw, yy); ctx.lineTo(hw, yy); ctx.stroke(); }
    if (st >= 4) { ctx.fillStyle = iron; ctx.fillRect(-hw, -hh + hh * 0.4 - 2, 2 * hw, 4); ctx.fillRect(-hw, hh * 0.5 - 2, 2 * hw, 4); }
    ctx.restore();
    if (st >= 5) { // Zinnen rundherum
      ctx.fillStyle = P['stone-dark'];
      if (rd) { var nz = Math.round(hw * 0.55); for (tk = 0; tk < nz; tk++) { var za = tk * Math.PI * 2 / nz; ctx.save(); ctx.translate(Math.cos(za) * (hw - 1), Math.sin(za) * (hw - 1)); ctx.rotate(za); ctx.fillRect(-3, -4, 7, 8); ctx.restore(); } }
      else for (tk = 0; tk < 3; tk++) { ctx.fillRect(-hw - 3, -hh + 1 + tk * (2 * hh - 9) / 2, 6, 8); ctx.fillRect(hw - 3, -hh + 1 + tk * (2 * hh - 9) / 2, 6, 8); }
    }
    ctx.strokeStyle = col; ctx.lineWidth = 3; body(-1.5); ctx.stroke();
    ctx.restore();
  }
  function drawWall(w) {
    var th = WALL_TH * T, col = w.team === 0 ? P.me : P.foe, R = WALL.dist, k, stg = 0;
    for (k = 0; k < WALL.stages.length; k++) if (w.hp >= WALL.stages[k]) stg++;
    w.stage = Math.max(w.stage || 0, stg);
    w.peak = Math.max(w.peak || 0, w.hp);
    var st = w.stage, bmax = WALL.bars[st], f = clamp(w.hp / bmax, 0, 1), ex = st >= 5 ? 12 : 0;
    ctx.save();
    if (w.team === 1) { ctx.translate(W * T, 0); ctx.scale(-1, 1); }
    ctx.lineCap = 'butt';
    ctx.save(); ctx.translate(5, 6); wallPath(R); ctx.strokeStyle = P.shade; ctx.lineWidth = th + ex; ctx.stroke(); ctx.restore();
    if (st === 0) { // nur das Gerüst, bis 40 Leben erreicht sind
      ctx.globalAlpha = 0.3 + 0.3 * f;
      wallPath(R); ctx.strokeStyle = P.stone; ctx.lineWidth = th; ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.setLineDash([8, 6]); ctx.lineWidth = 2; ctx.strokeStyle = col;
      wallPath(R + WALL_TH / 2); ctx.stroke();
      wallPath(R - WALL_TH / 2); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      var dark = 'rgba(0,0,0,0.5)', iron = '#4f5963', line = function (lw, color, dash, off) {
        wallPath(R); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.setLineDash(dash || []); ctx.lineDashOffset = off || 0; ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
      };
      if (st === 1) { // Holzpfähle
        line(th + 3, dark); line(th - 1, P.wood); line(th - 1, 'rgba(0,0,0,0.4)', [2, T * 0.17]);
      } else if (st === 2) { // Holzplanken
        line(th + 4, dark); line(th, P.wood);
        wallPath(R - th / 6 / T); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.stroke();
        wallPath(R + th / 6 / T); ctx.stroke();
        line(th, 'rgba(0,0,0,0.35)', [2, T * 0.55]);
      } else if (st === 3) { // Ziegel
        line(th + 4, P['stone-dark']); line(th - 2, P.stone); line(th - 2, P['stone-dark'], [2, T * 0.34]);
      } else if (st === 4) { // Ziegel mit Eisenbändern
        line(th + 4, P['stone-dark']); line(th - 2, P.stone); line(th - 2, P['stone-dark'], [2, T * 0.34]);
        line(th + 2, iron, [5, T * 0.8], T * 0.2); line(th - 4, 'rgba(255,255,255,0.18)', [2, T * 0.8 + 3], T * 0.2);
      } else { // Zinnenmauer
        line(th + 12, dark); line(th + 8, P['stone-dark']);
        line(th + 8, P.stone, [T * 0.26, T * 0.16]); // Zinnen
        line(th - 2, P.stone); line(th - 2, P['stone-dark'], [2, T * 0.34]);
        line(th + 4, iron, [5, T * 0.8], T * 0.2); line(th + 12, 'rgba(0,0,0,0.25)', [2, T * 0.42 - 2], T * 0.13);
      }
      wallPath(R - WALL_TH / 2 + 1.5 / T); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); // Farbe der eigenen Seite
      if (w.hit > 0) { wallPath(R); ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * w.hit / 0.15) + ')'; ctx.lineWidth = th + ex; ctx.stroke(); }
    }
    ctx.restore();
    if (st >= WALL.tower.from) {
      var tlist = WALL.tower.levels[st].list;
      for (i = 0; i < tlist.length; i++) drawTower(w, tlist[i], st, col);
    }
    // Risse und Lebensanzeige an der Spitze der Mauer
    var tb = bases[w.team], tip = { x: w.team === 0 ? tb.x2 + R : tb.x1 - R, y: tb.y1 }, i;
    if (st >= 1) {
      // je weniger Leben im Verhältnis zum Höchstwert der erreichten Optik (40, 80, 120, 160, 200), desto mehr Risse; beim Bauen keine
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      var cr = Math.floor((1 - clamp(w.hp / WALL.stages[st - 1], 0, 1)) * 20); // Höchstwert dieser Optik = Leben, ab denen sie erscheint
      for (i = 0; i < cr; i++) {
        var cp = wallPoint(w.team, ((i * 7 + 3) % 29 + 0.5) / 29.5, R + ((i % 3) - 1) * 0.1);
        var cx = cp.x * T, cy = cp.y * T, sgn = i % 2 ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(cx - 7, cy - 5 * sgn); ctx.lineTo(cx - 1, cy + 1); ctx.lineTo(cx + 3, cy - 3 * sgn); ctx.lineTo(cx + 8, cy + 4);
        ctx.moveTo(cx - 1, cy + 1); ctx.lineTo(cx + 1, cy + 7 * sgn); ctx.stroke();
      }
      ctx.restore();
    }
    var bw = 44, bx = tip.x * T - bw / 2, by = tip.y * T - 26;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 8);
    ctx.fillStyle = col; ctx.fillRect(bx, by, bw * f, 6);
    ctx.fillStyle = P.fg || '#fff';
    ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.strokeText(Math.ceil(w.hp) + '', tip.x * T, by + 19); ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(w.hp) + '', tip.x * T, by + 19);
    ctx.restore();
  }

  function drawCoin(c, x, y, r) { // gleiche Münze wie COIN_SVG (Radius r = 9,5 Einheiten)
    var k = r / 9.5;
    c.fillStyle = '#c98a12'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#f5c542'; c.beginPath(); c.arc(x, y, 7.4 * k, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#d9a21f'; c.lineWidth = 1.5 * k; c.beginPath(); c.arc(x, y, 4.8 * k, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#fff3c4'; c.lineWidth = 1.6 * k; c.lineCap = 'round'; c.beginPath(); c.arc(x, y, 4.8 * k, Math.PI * 1.08, Math.PI * 1.42); c.stroke();
  }
  // Text mit Münze davor (zentriert bei x), für Burg-Anzeige und +Gold
  function coinText(c, txt, x, y, px, fill, stroke) {
    c.font = '600 ' + px + 'px "Space Grotesk", system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'middle';
    var cr = px * 0.42, gap = px * 0.22, tw = c.measureText(txt).width, x0 = x - (cr * 2 + gap + tw) / 2;
    if (stroke) { c.fillStyle = stroke; c.beginPath(); c.arc(x0 + cr, y, cr + 2, 0, Math.PI * 2); c.fill(); c.lineWidth = Math.max(3, px * 0.18); c.strokeStyle = stroke; c.lineJoin = 'round'; c.strokeText(txt, x0 + cr * 2 + gap, y); }
    drawCoin(c, x0 + cr, y, cr);
    c.fillStyle = fill; c.fillText(txt, x0 + cr * 2 + gap, y);
    c.textBaseline = 'alphabetic'; c.textAlign = 'center';
  }
  function drawBase(b) {
    var col = b.team === 0 ? P.me : P.foe, dir = b.team === 0 ? 1 : -1;
    var x = b.x1 * T, y = b.y1 * T, w = (b.x2 - b.x1) * T, h = (b.y2 - b.y1) * T;
    var dead = b.down, i;

    var cx = x + w / 2, cy = y + h / 2, dk = '#585f63', st = '#8d9396'; // kräftiges Burggrau
    // Grundplatte (Burghof) und Schatten; die Burg ist 10 % kleiner als ihr Feld
    ctx.save(); ctx.translate(cx, cy); ctx.scale(0.9, 0.9); ctx.translate(-cx, -cy);
    ctx.fillStyle = P.shade; rr(ctx, x + 6, y + 8, w, h, 10); ctx.fill();
    ctx.fillStyle = dk; rr(ctx, x, y, w, h, 10); ctx.fill();
    ctx.fillStyle = st; rr(ctx, x + 4, y + 4, w - 8, h - 8, 8); ctx.fill();
    if (b.down) { // zerstört: Trümmer; im Wiederaufbau wird die Burg mit den Leben sichtbar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; rr(ctx, x, y, w, h, 10); ctx.fill();
      ctx.fillStyle = dk;
      for (i = 0; i < 9; i++) {
        ctx.beginPath(); ctx.arc(x + 12 + (i * 37) % (w - 24), y + 12 + (i * 53) % (h - 24), 6 + (i % 3) * 3, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (!b.down || b.hp > 0) {
      ctx.save();
      if (b.down) ctx.globalAlpha = clamp(b.hp, 0, 1) * 0.85;
      // Zinnen entlang der Mauer
      ctx.fillStyle = dk;
      for (i = 0; i < 5; i++) { ctx.fillRect(x + 10 + i * (w - 28) / 4, y + 1, 8, 7); ctx.fillRect(x + 10 + i * (w - 28) / 4, y + h - 8, 8, 7); }
      for (i = 0; i < 7; i++) { ctx.fillRect(x + 1, y + 10 + i * (h - 28) / 6, 7, 8); ctx.fillRect(x + w - 8, y + 10 + i * (h - 28) / 6, 7, 8); }
      // vier Ecktürme mit Dach in Teamfarbe
      [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]].forEach(function (tp) {
        ctx.fillStyle = st; ctx.strokeStyle = dk; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(tp[0], tp[1], 15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(tp[0], tp[1], 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(tp[0] - 3, tp[1] - 3, 3, 0, Math.PI * 2); ctx.fill();
      });
      // Bergfried in der Mitte (Dach in Teamfarbe, zwei Hälften)
      var kx = x + w * 0.24, ky = y + h * 0.3, kw = w * 0.52, kh = h * 0.4;
      ctx.fillStyle = P.shade; rr(ctx, kx + 4, ky + 5, kw, kh, 6); ctx.fill();
      ctx.fillStyle = st; rr(ctx, kx - 3, ky - 3, kw + 6, kh + 6, 7); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = dk; ctx.stroke();
      ctx.fillStyle = '#6a5a48'; rr(ctx, kx, ky, kw, kh, 5); ctx.fill(); // Standplatz des Königs: Holzboden, nicht in Teamfarbe
      ctx.save(); rr(ctx, kx, ky, kw, kh, 5); ctx.clip();
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1.5;
      for (i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(kx, ky + kh * i / 5); ctx.lineTo(kx + kw, ky + kh * i / 5); ctx.stroke(); }
      ctx.restore();
      // Tor zur Gegnerseite
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      rr(ctx, dir === 1 ? x + w - 10 : x, cy - 14, 10, 28, 3); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    if (b.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.55 * b.flash / 0.2) + ')';
      rr(ctx, x, y, w, h, 10); ctx.fill();
    }

    // Goldmenge in der Burg (unter dem Bergfried)
    if (gold && !(tut.on && b.team === 1)) coinText(ctx, String(Math.floor(gold[b.team] - (b.team === ME ? deployGold() : 0))), cx, y + h * 0.79, 14, '#ffffff', 'rgba(0,0,0,0.55)'); // im Tutorial keine Goldanzeige beim Gegner
    if (tut.on && tut.hlGold && b.team === 0) { // Tutorial: Schatzkammer (Gold in der Burg) grün umranden
      var gk = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.save(); ctx.strokeStyle = '#1fae4b'; ctx.lineWidth = 3 + 2 * gk;
      ctx.beginPath(); ctx.ellipse(cx, y + h * 0.79, 34 + 3 * gk, 16 + 2 * gk, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }

    // Lebensanzeige: klein wie bei der Mauer, oben in der Burg (Balken, Zahl darunter)
    var n = CONFIG.BASE_HP, bbw = 34, bbx = x + w / 2 - 25, bby = y + 9; // Zahl rechts neben dem Balken (darunter steigt das +Gold auf)
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bbx - 1, bby - 1, bbw + 2, 8);
    ctx.fillStyle = col; ctx.fillRect(bbx, bby, bbw * clamp(b.hp / n, 0, 1), 6);
    ctx.font = '600 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.textAlign = 'left'; ctx.strokeText(Math.ceil(b.hp) + '', bbx + bbw + 4, bby + 7); ctx.fillStyle = '#fff'; ctx.fillText(Math.ceil(b.hp) + '', bbx + bbw + 4, bby + 7); ctx.restore(); ctx.textAlign = 'center';
  }

  // Grabspur der Tunnelgräber: bleibt die volle Dauer sichtbar, nur das letzte Fünftel blendet aus
  function drawTrench() {
    ctx.lineCap = 'round';
    // zwei Durchgänge (erst der dunkle Rand, dann die Mitte), damit die Spur ohne Perlen-Muster zusammenhängt
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? 'rgba(80,56,36,0.5)' : 'rgba(140,104,70,0.5)';
      ctx.lineWidth = pass === 0 ? 9 : 5;
      for (var i = 0; i < effects.length; i++) {
        var e = effects[i];
        if (e.kind !== 'dirt') continue;
        var k = e.t / e.dur;
        ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
        ctx.beginPath(); ctx.moveTo(e.x1 * T, e.y1 * T); ctx.lineTo(e.x2 * T, e.y2 * T); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawMound(x, y, r) {
    // kleiner, flacher Erdhaufen (nur ein leichter Hinweis auf den Gräber)
    ctx.fillStyle = 'rgba(70,48,30,0.55)';
    ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,104,70,0.6)';
    ctx.beginPath(); ctx.arc(x - r * 0.1, y - r * 0.1, r * 0.4, 0, Math.PI * 2); ctx.fill();
  }

  function drawEffects(under) { // under = nur Leitern (unter den Einheiten), sonst alles andere
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i], k = e.t / e.dur;
      if ((e.kind === 'ladder') !== !!under) continue;
      if (e.t < 0 || e.kind === 'dirt') continue;
      if (e.kind === 'orb') {
        var ox = lerp(e.x1, e.x2, k) * T, oy = lerp(e.y1, e.y2, k) * T;
        ctx.fillStyle = 'rgba(155,107,255,0.35)';
        ctx.beginPath(); ctx.arc(ox, oy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#b894ff';
        ctx.beginPath(); ctx.arc(ox, oy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(ox - 1.5, oy - 1.5, 2, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'feuer') { // Brand in der Burg: flackernde Flammen auf dem Dach, Funken und Rauch; blendet ein und aus
        var fa = Math.min(1, k * 6, (1 - k) * 4), fnow = performance.now() / 1000;
        ctx.globalAlpha = fa;
        for (var fi = 0; fi < 7; fi++) {
          var fxx = (e.x + (((fi * 53) % 7) / 6 - 0.5) * e.w * 0.75) * T, fyy = (e.y + (((fi * 31) % 5) / 4 - 0.5) * e.h * 0.6) * T, ffr = T * (0.22 + 0.1 * Math.sin(fnow * 9 + fi * 1.7));
          ctx.fillStyle = 'rgba(70,70,70,0.35)'; ctx.beginPath(); ctx.arc(fxx + Math.sin(fnow + fi) * 4, fyy - T * (0.5 + ((fnow * 0.8 + fi * 0.13) % 1) * 0.8), ffr * 1.2, 0, Math.PI * 2); ctx.fill(); // Rauch
          ctx.fillStyle = 'rgba(230,70,20,0.85)'; ctx.beginPath(); ctx.moveTo(fxx - ffr, fyy); ctx.quadraticCurveTo(fxx - ffr * 0.3, fyy - ffr * 2.2, fxx, fyy - ffr * 2.6); ctx.quadraticCurveTo(fxx + ffr * 0.3, fyy - ffr * 2.2, fxx + ffr, fyy); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,190,50,0.95)'; ctx.beginPath(); ctx.moveTo(fxx - ffr * 0.55, fyy); ctx.quadraticCurveTo(fxx, fyy - ffr * 1.8, fxx + ffr * 0.55, fyy); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#ffe9a0'; ctx.beginPath(); ctx.arc(fxx + Math.sin(fnow * 7 + fi) * ffr, fyy - ffr * (1 + ((fnow * 2 + fi * 0.3) % 1) * 2), 1.6, 0, Math.PI * 2); ctx.fill(); // Funke
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'blitz') { // Blitz: Zickzack von oben bis zum Einschlag, kurzer heller Schein
        ctx.globalAlpha = Math.max(0, 1 - k * 1.3);
        var bxp = e.x * T, byp = e.y * T, bs = e.seed || 1, by0 = Math.max(0, byp - 260);
        ctx.strokeStyle = 'rgba(200,220,255,0.6)'; ctx.lineWidth = 9; ctx.lineJoin = 'round';
        var zick = function () { ctx.beginPath(); ctx.moveTo(bxp + ((bs * 7) % 40) - 20, by0); for (var zi = 1; zi <= 6; zi++) { var zf = zi / 6; ctx.lineTo(bxp + (zi < 6 ? (((bs * (zi + 3) * 13) % 36) - 18) * (1 - zf) : 0), by0 + (byp - by0) * zf); } ctx.stroke(); };
        zick(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; zick();
        ctx.fillStyle = 'rgba(255,255,220,' + (0.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(bxp, byp, T * 0.9, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'blast') {
        var br = e.r * T * (0.35 + 0.65 * Math.min(1, k * 2));
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = 'rgba(155,107,255,0.28)';
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, br, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#9b6bff'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, br, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'arrow') {
        var ax = lerp(e.x1, e.x2, k) * T, ay = lerp(e.y1, e.y2, k) * T;
        var ang = Math.atan2(e.y2 - e.y1, e.x2 - e.x1);
        ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
        if (e.heavy) ctx.scale(1.7, 1.7);
        ctx.strokeStyle = P.wood; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(8, 0); ctx.stroke();
        ctx.fillStyle = P.steel;
        ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(6, -4); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (e.kind === 'javelin' || e.kind === 'cbolt') { // Wurfspeer (leichter Bogen, lang) bzw. Armbrustbolzen (kurz, dunkel, gerade)
        var jv = e.kind === 'javelin', jx = lerp(e.x1, e.x2, k) * T, jy = lerp(e.y1, e.y2, k) * T - (jv ? Math.sin(k * Math.PI) * 14 : 0);
        var jang = Math.atan2(e.y2 - e.y1, e.x2 - e.x1) + (jv ? (0.5 - k) * -0.6 * Math.cos(Math.atan2(e.y2 - e.y1, e.x2 - e.x1)) : 0);
        ctx.save(); ctx.translate(jx, jy); ctx.rotate(jang); ctx.lineCap = 'round';
        if (jv) { ctx.strokeStyle = P.wood; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(10, 0); ctx.stroke(); ctx.fillStyle = P.steel; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(9, -3); ctx.lineTo(9, 3); ctx.closePath(); ctx.fill(); }
        else { ctx.strokeStyle = '#4a3b2a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#9aa3a6'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -3.5); ctx.lineTo(5, 3.5); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-9, 0); ctx.stroke(); }
        ctx.restore();
      } else if (e.kind === 'stab') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = P.steel; ctx.lineWidth = e.heavy ? 6 : 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(lerp(e.x1, e.x2, 0.35) * T, lerp(e.y1, e.y2, 0.35) * T); ctx.lineTo(e.x2 * T, e.y2 * T); ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(e.x2 * T, e.y2 * T, 6 + 14 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'fball') {
        // Feuerball (Variante A «Glühender Brocken»): dunkler, drehender Stein mit glühenden Rissen, dünner Feuersaum, kurzer Flammenschweif
        var fbp = function (kk) { return [lerp(e.x1, e.x2, kk) * T, lerp(e.y1, e.y2, kk) * T - Math.sin(kk * Math.PI) * 38]; };
        var fp = fbp(k), fx = fp[0], fy = fp[1];
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; // Schatten am Boden
        ctx.beginPath(); ctx.ellipse(lerp(e.x1, e.x2, k) * T, lerp(e.y1, e.y2, k) * T, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        for (var ft = 1; ft < 7; ft++) {
          var fq = fbp(Math.max(0, k - ft * 0.03));
          ctx.globalAlpha = 0.55 - ft * 0.07; ctx.fillStyle = ft < 3 ? '#ffb02e' : '#e0431a';
          ctx.beginPath(); ctx.arc(fq[0], fq[1], 7.5 - ft * 0.9, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        var ffl = 1 + 0.12 * Math.sin(e.t * 40);
        ctx.fillStyle = 'rgba(255,130,25,0.5)'; ctx.beginPath(); ctx.arc(fx, fy, 10.5 * ffl, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,60,0.55)'; ctx.beginPath(); ctx.arc(fx, fy, 8 * ffl, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(fx, fy);
        var frot = e.t * 3, FROCK = [1, 0.86, 1.05, 0.9, 1.08, 0.82, 0.97, 0.9];
        ctx.beginPath();
        for (var fr = 0; fr < 8; fr++) { var fra = frot + fr * Math.PI / 4, frr = 6 * FROCK[fr]; if (fr) ctx.lineTo(Math.cos(fra) * frr, Math.sin(fra) * frr); else ctx.moveTo(Math.cos(fra) * frr, Math.sin(fra) * frr); }
        ctx.closePath(); ctx.fillStyle = '#4e4a46'; ctx.fill(); ctx.strokeStyle = '#2c2926'; ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = '#ffb02e'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(Math.cos(frot) * -4, Math.sin(frot) * -4); ctx.lineTo(Math.cos(frot + 0.6), Math.sin(frot + 0.6)); ctx.lineTo(Math.cos(frot + 1.9) * 4, Math.sin(frot + 1.9) * 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(Math.cos(frot + 0.6), Math.sin(frot + 0.6)); ctx.lineTo(Math.cos(frot - 1.5) * 4.5, Math.sin(frot - 1.5) * 4.5); ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,200,0.35)'; ctx.beginPath(); ctx.arc(-2, -2.5, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      } else if (e.kind === 'fblast') {
        // Feuerexplosion mit Flammenzungen
        var fbr = e.r * T * (0.3 + 0.7 * Math.min(1, k * 2.2));
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = 'rgba(255,110,20,0.38)';
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, fbr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,205,70,0.55)';
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, fbr * 0.55, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#e0431a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, fbr, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ff9a1f';
        for (var fl = 0; fl < 9; fl++) {
          var fa = fl * Math.PI * 2 / 9 + 0.5, f0 = fbr * 0.55, f1 = fbr * (0.9 + 0.35 * Math.sin(fl * 3.1));
          ctx.beginPath();
          ctx.moveTo(e.x * T + Math.cos(fa - 0.18) * f0, e.y * T + Math.sin(fa - 0.18) * f0);
          ctx.lineTo(e.x * T + Math.cos(fa) * f1, e.y * T + Math.sin(fa) * f1);
          ctx.lineTo(e.x * T + Math.cos(fa + 0.18) * f0, e.y * T + Math.sin(fa + 0.18) * f0);
          ctx.closePath(); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'bolthit') { // Einschlag: Ring, Funken in Flugrichtung, Holzsplitter, steckender Bolzen
        ctx.save(); ctx.translate(e.x * T, e.y * T); ctx.lineCap = 'round';
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3 - 2 * k;
        ctx.beginPath(); ctx.arc(0, 0, 5 + 14 * k, 0, Math.PI * 2); ctx.stroke();
        for (var bh = 0; bh < 7; bh++) {
          var bha = e.ang + Math.PI + (bh - 3) * 0.42, bhr0 = 4 + 6 * k, bhr1 = 8 + 20 * k * (0.7 + 0.3 * ((bh * 7) % 3) / 2);
          ctx.strokeStyle = bh % 2 ? P.wood : '#ffd34a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(Math.cos(bha) * bhr0, Math.sin(bha) * bhr0); ctx.lineTo(Math.cos(bha) * bhr1, Math.sin(bha) * bhr1); ctx.stroke();
        }
        ctx.rotate(e.ang); ctx.globalAlpha = Math.min(1, 1.6 * (1 - k));
        ctx.strokeStyle = P.wood; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(2, 0); ctx.stroke();
        ctx.fillStyle = P.steel; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(1, -3); ctx.lineTo(1, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (e.kind === 'block') { // Schildblitz: ein Bogen vor der Einheit und kurze Funken
        ctx.save(); ctx.translate(e.x * T, e.y * T); ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
        var bra = 13 + 7 * k, bang = e.dir === 1 ? 0 : Math.PI;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 - 2 * k;
        ctx.beginPath(); ctx.arc(0, 0, bra, bang - 0.9, bang + 0.9); ctx.stroke();
        ctx.strokeStyle = '#ffd34a'; ctx.lineWidth = 2;
        for (var bsi = -1; bsi <= 1; bsi++) {
          var bsa = bang + bsi * 0.55;
          ctx.beginPath(); ctx.moveTo(Math.cos(bsa) * (bra + 2), Math.sin(bsa) * (bra + 2)); ctx.lineTo(Math.cos(bsa) * (bra + 6 + 8 * k), Math.sin(bsa) * (bra + 6 + 8 * k)); ctx.stroke();
        }
        ctx.restore();
      } else if (e.kind === 'slam') {
        var sx = e.x * T, sy = e.y * T, sk = Math.min(1, k * 1.6);
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = P.wood; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(sx, sy, 6 + 24 * sk, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = P.steel; ctx.lineWidth = 3;
        for (var sp = 0; sp < 8; sp++) {
          var sa = sp * Math.PI / 4 + 0.4, s0 = 8 + 8 * sk, s1 = 14 + 22 * sk;
          ctx.beginPath(); ctx.moveTo(sx + Math.cos(sa) * s0, sy + Math.sin(sa) * s0); ctx.lineTo(sx + Math.cos(sa) * s1, sy + Math.sin(sa) * s1); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'ladder') { // angelehnte Leiter über die Mauer (verblasst am Ende)
        ctx.save(); ctx.translate(e.x * T, e.y * T); ctx.rotate(e.ang); ctx.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
        var ll = e.len * T / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-ll + 3, -6, 2 * ll, 16);
        ctx.strokeStyle = '#a07b4a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-ll, -6); ctx.lineTo(ll, -6); ctx.moveTo(-ll, 6); ctx.lineTo(ll, 6); ctx.stroke();
        ctx.lineWidth = 2; ctx.beginPath(); for (var lx = -ll + 4; lx < ll; lx += 7) { ctx.moveTo(lx, -6); ctx.lineTo(lx, 6); } ctx.stroke();
        ctx.restore(); ctx.globalAlpha = 1;
      } else if (e.kind === 'stone') { // Trebuchet-Stein: hoher Bogen, Schatten am Boden
        var gx = lerp(e.x1, e.x2, k) * T, gy = lerp(e.y1, e.y2, k) * T, hgt = (e.h0 || 0) * (1 - k) + Math.sin(k * Math.PI) * 70; // h0 = Abwurfhöhe (Armspitze oben)
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(gx, gy, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
        for (var st3 = 9; st3 >= 1; st3--) { // langer Schweif aus Staub (wie beim Feuerball)
          var sk3 = Math.max(0, k - st3 * 0.03), sx3 = lerp(e.x1, e.x2, sk3) * T, sy3 = lerp(e.y1, e.y2, sk3) * T - ((e.h0 || 0) * (1 - sk3) + Math.sin(sk3 * Math.PI) * 70);
          ctx.globalAlpha = 0.55 - st3 * 0.05; ctx.fillStyle = st3 < 4 ? '#a39a86' : '#c9bea4';
          ctx.beginPath(); ctx.arc(sx3, sy3, 5 - st3 * 0.35, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#878983'; // Stein: klein, mittelgrau (18.11.), ohne Rand
        ctx.beginPath(); ctx.arc(gx, gy - hgt, 3 + 0.6 * Math.sin(k * Math.PI), 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'rock') { // Onager-Stein: fliegt gerade, kurzer Schweif
        for (var rt = 6; rt >= 1; rt--) {
          var rk2 = Math.max(0, k - rt * 0.045);
          ctx.globalAlpha = 0.6 - rt * 0.08; ctx.fillStyle = rt < 3 ? '#a39a86' : '#c9bea4';
          ctx.beginPath(); ctx.arc(lerp(e.x1, e.x2, rk2) * T, lerp(e.y1, e.y2, rk2) * T, 6 - rt * 0.6, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#878983'; ctx.beginPath(); ctx.arc(lerp(e.x1, e.x2, k) * T, lerp(e.y1, e.y2, k) * T, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(lerp(e.x1, e.x2, k) * T - 2, lerp(e.y1, e.y2, k) * T - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'oblast') { // Onager-Einschlag: Blitz, Druckwelle, Staubwolke, wegfliegende Steinbrocken
        var ox = e.x * T, oy = e.y * T, oR = e.r * T * (0.25 + 0.75 * Math.min(1, k * 2.2)), ofa = Math.max(0, 1 - k);
        if (k < 0.2) { ctx.globalAlpha = (1 - k / 0.2) * 0.8; ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(ox, oy, e.r * T * 0.55, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = ofa * 0.9; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 5 * ofa + 1; ctx.beginPath(); ctx.arc(ox, oy, oR * 1.2, 0, Math.PI * 2); ctx.stroke();
        for (var op = 0; op < 8; op++) { var opa = op * 0.785 + 0.4, opd = oR * (0.35 + 0.25 * (op % 2)); ctx.globalAlpha = ofa * 0.55; ctx.fillStyle = op % 2 ? '#9a8566' : '#b5a283'; ctx.beginPath(); ctx.arc(ox + Math.cos(opa) * opd, oy + Math.sin(opa) * opd, oR * (0.42 - 0.12 * k), 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = ofa * 0.6; ctx.fillStyle = '#7d6a4f'; ctx.beginPath(); ctx.arc(ox, oy, oR * 0.4, 0, Math.PI * 2); ctx.fill();
        for (var oc = 0; oc < 10; oc++) { var oca = oc * 0.628 + 0.2, ocd = e.r * T * (0.25 + 1.25 * Math.sqrt(k)) * (0.8 + 0.25 * ((oc * 7) % 3)), ocs = 8.5 - (oc % 3) * 1.8;
          ctx.globalAlpha = ofa; ctx.fillStyle = oc % 2 ? '#6e787b' : '#878983';
          ctx.save(); ctx.translate(ox + Math.cos(oca) * ocd, oy + Math.sin(oca) * ocd - Math.sin(k * Math.PI) * 10); ctx.rotate(oc + k * 8); ctx.fillRect(-ocs / 2, -ocs / 2, ocs, ocs * 0.8); ctx.restore(); }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'sblast') { // Einschlag: Staubwolke und Splitter
        var sr2 = e.r * T * (0.3 + 0.7 * Math.min(1, k * 2.5));
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = 'rgba(160,130,90,0.35)'; ctx.beginPath(); ctx.arc(e.x * T, e.y * T, sr2, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#8a6a44'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x * T, e.y * T, sr2, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#6e787b'; for (var sp2 = 0; sp2 < 6; sp2++) { var sa2 = sp2 * 1.047 + 0.3; ctx.fillRect(e.x * T + Math.cos(sa2) * sr2 * 0.8 - 2, e.y * T + Math.sin(sa2) * sr2 * 0.8 - 2, 4, 4); }
        ctx.globalAlpha = 1;
      } else if (e.kind === 'puff') {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.team === 0 ? P.me : P.foe; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(e.x * T, e.y * T, 8 + 22 * k, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (e.kind === 'text') { // +Gold: Zahl mit Münze, steigt auf und blendet aus (Burg gross, Bauer klein)
        ctx.globalAlpha = 1 - k * k;
        coinText(ctx, e.text, e.x * T, e.y * T - k * 24, 15, e.rot ? '#e0332a' : P['gold-fill'], P.shade); // rot = Gold verloren (Dieb)
        ctx.globalAlpha = 1;
      }
    }
  }

  // Blickrichtung (nur Darstellung): beim Angreifen zum Ziel, beim Laufen in Laufrichtung, im Stillstand gerade Richtung Gegner; dreht sich mit TURN Bogenmass pro Sekunde
  var TURN = Math.PI, TURN_SIEGE = Math.PI / 2, lastRender = 0, renderDt = 0; // halbe Umdrehung = 1 s, Belagerungsmaschinen 2 s
  function faceAngle(u) {
    var want, px = u.px === undefined ? u.x : u.px, py = u.py === undefined ? u.y : u.py, mx = u.x - px, my = u.y - py;
    if (u.type === 'rider' && renderDt > 0) { // Reiter: Laufrichtung geglättet (kein wildes Drehen nach einem Treffer, wenn er kurz zurückgeschoben wird oder ein neues Ziel sucht)
      var sk = Math.min(1, renderDt / 0.35); u.mvx = (u.mvx || 0) * (1 - sk) + mx * sk; u.mvy = (u.mvy || 0) * (1 - sk) + my * sk; mx = u.mvx; my = u.mvy;
    }
    if (u.aimX !== undefined && (u.ready || (u.atkT !== undefined && clock - u.atkT < 0.6))) want = Math.atan2(u.aimY - u.y, u.aimX - u.x);
    else if (renderDt > 0 && hyp(mx, my) > Math.max(0.0005, 0.2 * renderDt)) want = Math.atan2(my, mx);
    else if (renderDt > 0) want = u.team === 0 ? 0 : Math.PI; // steht still: gerade zum Gegner
    u.px = u.x; u.py = u.y;
    if (u.rang === undefined) u.rang = want !== undefined ? want : (u.face < 0 ? Math.PI : 0);
    if (want !== undefined) {
      var df = Math.atan2(Math.sin(want - u.rang), Math.cos(want - u.rang)), st = (CONFIG.units[u.type].cat === 'siege' ? TURN_SIEGE : u.type === 'rider' ? TURN * 0.6 : TURN) * renderDt;
      u.rang += Math.abs(df) <= st ? df : (df > 0 ? st : -st);
    }
    return u.rang;
  }
  function render() {
    var nowR = performance.now(); renderDt = lastRender ? Math.min(0.1, (nowR - lastRender) / 1000) : 0; lastRender = nowR;
    if (state !== 'playing') renderDt = state === 'paused' ? 0 : renderDt;
    ctx.drawImage(back, 0, 0);
    drawBase(bases[0]);
    drawBase(bases[1]);
    if (walls[0]) drawWall(walls[0]);
    if (walls[1]) drawWall(walls[1]);
    if (tut.on && tut.hl && walls[0] && walls[0].stage >= WALL.tower.from) { // Tutorial: eigene Türme grün umranden
      var hlv = WALL.tower.levels[walls[0].stage].list, hk = 0.5 + 0.5 * Math.sin(performance.now() / 180);
      ctx.save(); ctx.strokeStyle = '#1fae4b'; ctx.lineWidth = 4 + 2 * hk; ctx.setLineDash([]);
      for (var hi = 0; hi < hlv.length; hi++) {
        var htw = hlv[hi], hp = wallPoint(0, htw.f, WALL.dist + htw.out), hr = (htw.k === 'rd' ? htw.r : Math.max(htw.w, htw.h) / 2) + 0.3 + 0.06 * hk;
        ctx.beginPath(); ctx.arc(hp.x * T, hp.y * T, hr * T, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
    }
    drawTrench();
    drawEffects(true);
    var order = units.slice().sort(function (a, b) { return (a.y + (a.bf ? 50 : 0)) - (b.y + (b.bf ? 50 : 0)); }); // Bogenschützen auf dem Belagerungsturm oben drauf
    for (var i = 0; i < order.length; i++) {
      var u = order[i], d = CONFIG.units[u.type], r = d.r * T;
      if (u.dig) { drawMound(u.x * T, u.y * T, r); continue; }
      if (u.slow > 0) {
        ctx.fillStyle = 'rgba(96,170,255,0.35)';
        ctx.strokeStyle = 'rgba(96,170,255,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(u.x * T, u.y * T, r * 1.25, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      if (u.fade > 0) ctx.globalAlpha = Math.max(0, Math.min(1, u.fade / WALL.fade));
      if (u.type === 'king') kZust[u.team] = { zieh: u.bogenT || 0, nah: u.waffeZ || 0 }; // was der König gerade in der Hand hat
      if (u.type === 'king' && u.inCastle) { // oben auf der Burg: Bogenschütze, dreht sich zum Ziel
        var kwant = u.aimT !== undefined && clock - u.aimT < 1.5 ? u.aim : (u.team === 0 ? 0 : Math.PI);
        // alle 15 s kratzt er sich am Kopf (nur Darstellung, 2,4 s = halbes Tempo, nur mit leeren Händen; Team 1 um 5,3 s versetzt)
        var kz = (clock + u.team * 5.3) % KRATZ.alle;
        kKratz[u.team] = kz < KRATZ.dauer && !(u.bogenT > 0) && !(u.waffeZ > 0) ? kz / KRATZ.dauer : 0;
        if (u.ang === undefined) u.ang = kwant;
        u.ang += Math.atan2(Math.sin(kwant - u.ang), Math.cos(kwant - u.ang)) * 0.15;
        ctx.save(); ctx.translate(u.x * T, u.y * T); ctx.rotate(u.ang);
        drawUnit(ctx, 'kingbow', 0, 0, r, u.team, 1, u.hit, u.bogenT || 0, unitAt(u, 'kingbow')); // bogenT: Bogen hervorgeholt (0..1)
        ctx.restore();
      } else drawUnit(ctx, u.type, u.x * T, u.y * T, r, u.team, u.face, u.hit, u.type === 'belfry' ? (u.dock ? Math.min(1, u.dock.t / 0.6) : 0) : d.setup ? Math.min(1, (u.setupT || 0) / d.setup) : u.type === 'ladder' ? (u.climbed ? 1 : u.climb ? 0.5 : 0) : u.settled, unitAt(u, u.type), CONFIG.units[u.type].gebaeude ? 0 : faceAngle(u)); // Gebäude drehen sich nicht
      if (u.fade > 0) ctx.globalAlpha = 1;
      if (u.dummy) { ctx.save(); ctx.strokeStyle = P.gold; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.arc(u.x * T, u.y * T, r * 1.6, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
      if (u.hp < u.max && !(u.fade > 0)) {
        var bw = 30, bx = u.x * T - bw / 2, by = u.y * T - r - 12;
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7);
        ctx.fillStyle = u.team === 0 ? P.me : P.foe; ctx.fillRect(bx, by, bw * u.hp / u.max, 5);
      }
    }
    drawEffects();
    // Unwetter über dem gegnerischen Drittel (Kirche mit voller Gunst): dunkle, ziehende Wolken
    for (var wi2 = 0; wi2 < units.length; wi2++) {
      var ku = units[wi2], KG = CONFIG.units[ku.type].gebaeude;
      if (!KG || !KG.gunstMax || ku.hp <= 0 || (ku.gunst || 0) < KG.gunstMax) continue;
      var wx1 = ku.team === 0 ? W * 2 / 3 * T : 0, ww = W / 3 * T, wt = performance.now() / 1000;
      var auf = Math.min(1, (ku.sturmT || 0) / KG.blitz.auf), sauf = auf * auf * (3 - 2 * auf); // weich aufziehen
      ctx.save();
      var gr = ctx.createLinearGradient(wx1 + (ku.team === 0 ? 0 : ww), 0, wx1 + (ku.team === 0 ? 70 : ww - 70), 0); // weicher Rand zur Mitte
      gr.addColorStop(0, 'rgba(30,35,55,0)'); gr.addColorStop(1, 'rgba(30,35,55,' + (0.28 * sauf) + ')');
      ctx.fillStyle = gr; ctx.fillRect(wx1, 0, ww, H * T);
      ctx.fillStyle = 'rgba(55,60,80,' + (0.55 * sauf) + ')';
      for (var cw2 = 0; cw2 < 7; cw2++) { var cxw = wx1 + ((cw2 * 97 + wt * 18) % (ww + 120)) - 60, cyw = 18 + (cw2 % 3) * 22 - (1 - sauf) * 70; ctx.beginPath(); ctx.ellipse(cxw, cyw, 70 * (0.6 + 0.4 * sauf), 26, 0, 0, Math.PI * 2); ctx.fill(); } // Wolken sinken von oben herein
      ctx.restore();
    }
  }

