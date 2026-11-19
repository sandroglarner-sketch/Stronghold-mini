  // ---------- Spielzustand ----------
  var units, effects, bases, gold, payT, payT1 = 0, clock, nextId, produced; // payT1 = eigener Gold-Takt des Bots (income/incomeEvery)
  var walls = [null, null]; // pro Seite höchstens eine Mauer
  var shots = []; // Geschosse im Flug: der Schaden folgt erst nach delay Sekunden
  var state = 'ready'; // ready | playing | paused | over
  var winner = -1;

  function makeBase(team) {
    var x1 = team === 0 ? 0.6 : W - 2.6;
    return { team: team, x1: x1, x2: x1 + 2, y1: 3.5, y2: 6.5, hp: CONFIG.BASE_HP, flash: 0, cd: 0, lastHit: -99, down: false };
  }

  function reset() {
    deploys = [];
    units = [];
    effects = [];
    shots = [];
    bases = [makeBase(0), makeBase(1)];
    walls = [null, null];
    spawnKing(0); spawnKing(1);
    gold = [sandbox ? CONFIG.SANDBOX_GOLD : CONFIG.START_GOLD, sandbox ? CONFIG.SANDBOX_FOE_GOLD : CONFIG.START_GOLD];
    sandbox = false;
    payT = 0; payT1 = 0;
    clock = 0;
    nextId = 1;
    produced = 0;
    winner = -1;
    aiRoll();
    rec = [[], []];
    gaveUp = false;
  }

  // Standplatz eines Bauern: der Platz, der der eigenen Kaserne am nächsten liegt und
  //  - nicht hinter der vorderen Kante der eigenen Kaserne liegt,
  //  - mindestens FARMER_EDGE vom Spielfeldrand entfernt ist,
  //  - mindestens FARMER_RADIUS von jedem anderen Bauern (auch dem des Gegners) entfernt ist.
  // Gibt es keinen solchen Platz mehr, ist das Ergebnis null und der Bauer marschiert zur gegnerischen Kaserne.
  function findSpot(team, self) {
    var b = bases[team], E = CONFIG.FARMER_EDGE;
    var x0 = E, x1 = W - E, y0 = E, y1 = H - E;
    if (team === 0) x0 = Math.max(x0, b.x2); else x1 = Math.min(x1, b.x1);
    var others = [], i, ix, iy;
    for (i = 0; i < units.length; i++) {
      var o = units[i];
      if (o !== self && CONFIG.units[o.type].passive && o.tx !== null) others.push(o);
    }
    var best = null, bestScore = 1e9;
    var nx = Math.floor((x1 - x0) / 0.2 + 1e-6), ny = Math.floor((y1 - y0) / 0.2 + 1e-6);
    for (ix = 0; ix <= nx; ix++) {
      var x = x0 + ix * 0.2;
      for (iy = 0; iy <= ny; iy++) {
        var y = y0 + iy * 0.2;
        var dist = hyp(x - clamp(x, b.x1, b.x2), y - clamp(y, b.y1, b.y2));
        if (dist < 0.6 - 1e-6) continue; // nicht auf der Kaserne
        if (units.some(function (bo) { var BG = CONFIG.units[bo.type].gebaeude; return BG && bo.hp > 0 && Math.abs(bo.x - x) < BG.w / 2 + 0.3 && Math.abs(bo.y - y) < BG.h / 2 + 0.3; })) continue; // nicht auf einem Gebäude
        var ok = true;
        for (i = 0; i < others.length; i++) {
          if (hyp(others[i].tx - x, others[i].ty - y) < CONFIG.FARMER_RADIUS - 1e-6) { ok = false; break; }
        }
        if (!ok) continue;
        var score = dist + simRand() * 0.15; // kleine Streuung, damit nicht alles auf einer Linie liegt
        if (score < bestScore) { bestScore = score; best = { x: x, y: y }; }
      }
    }
    return best;
  }
  // Liegt der Standplatz (tx, ty) eines Bauern auf einer Mauer oder einem Turm (eigener oder gegnerischer, auch Gerüst), stellt er sich
  // an den nächsten freien Rand (steht er vor einer fertigen gegnerischen Mauer, an deren Außenrand). Das ist seine echte Position (Treffer, Online-Abgleich);
  // für den Abstand zu anderen Bauern zählt weiter nur der ursprüngliche Platz (tx, ty).
  function farmerStand(u) {
    var fr = CONFIG.units.farmer.r * 0.9, tx = u.tx, ty = u.ty, obs = [], wi, k, ti;
    // Hindernisse sammeln: Mauerband (so breit wie gezeichnet, Mauer 5 ist breiter) und Türme (Viereck oder Rund)
    for (wi = 0; wi < 2; wi++) {
      var w = walls[wi];
      if (!w) continue;
      var st = w.stage || 0, half = WALL_TH / 2 + [0, 1.5, 2, 2, 2, 6][st] / T;
      obs.push({ k: 'w', w: w, b: bases[wi], in: WALL.dist - half - fr, out: WALL.dist + half + fr, outOnly: wi !== u.team && w.built && wallOut(w, u.x, u.y) });
      if (st >= WALL.tower.from) {
        var tl = WALL.tower.levels[st].list;
        for (ti = 0; ti < tl.length; ti++) {
          var tw = tl[ti], c = wallPoint(wi, tw.f, WALL.dist + tw.out), an = towerAng(wi, tw.f);
          var pad = (st >= 5 ? 6 : 2) / T + fr; // Rahmen bzw. Zinnen
          if (tw.k === 'rd') obs.push({ k: 'rd', x: c.x, y: c.y, r: tw.r + pad });
          else obs.push({ k: 'sq', x: c.x, y: c.y, ca: dcos(an), sa: dsin(an), hw: tw.w / 2 + pad, hh: tw.h / 2 + pad });
        }
      }
    }
    for (var bi = 0; bi < units.length; bi++) { var bo = units[bi], BG = CONFIG.units[bo.type].gebaeude; if (BG && bo.hp > 0) { obs.push({ k: 'sq', x: bo.x, y: bo.y, ca: 1, sa: 0, hw: BG.w / 2 + fr, hh: BG.h / 2 + fr }); } } // Gebäude: Bauern stehen an ihrem Rand
    function inside(o, x, y) {
      if (o.k === 'w') { var d0 = wallD(o.w.team, x, y); return o.outOnly ? d0 < o.out : d0 > o.in && d0 < o.out; }
      if (o.k === 'rd') return hyp(x - o.x, y - o.y) < o.r - 1e-6;
      var dx = x - o.x, dy = y - o.y, lx = dx * o.ca + dy * o.sa, ly = -dx * o.sa + dy * o.ca;
      return Math.abs(lx) < o.hw - 1e-6 && Math.abs(ly) < o.hh - 1e-6;
    }
    function free(x, y) { for (var q = 0; q < obs.length; q++) if (inside(obs[q], x, y)) return false; return true; }
    // Kandidaten: von (x, y) aus die nächsten Punkte am Rand des Hindernisses o
    function exits(o, x, y) {
      var e = 0.01, res = [];
      if (o.k === 'w') {
        var px = clamp(x, o.b.x1, o.b.x2), py = clamp(y, o.b.y1, o.b.y2), dd = hyp(x - px, y - py);
        if (dd < 1e-6) return res;
        if (!o.outOnly) res.push({ x: px + (x - px) / dd * (o.in - e), y: py + (y - py) / dd * (o.in - e) });
        res.push({ x: px + (x - px) / dd * (o.out + e), y: py + (y - py) / dd * (o.out + e) });
      } else if (o.k === 'rd') {
        var rx = x - o.x, ry = y - o.y, rl = hyp(rx, ry);
        if (rl < 1e-6) { rx = 1; ry = 0; rl = 1; }
        res.push({ x: o.x + rx / rl * (o.r + e), y: o.y + ry / rl * (o.r + e) });
      } else {
        var dx = x - o.x, dy = y - o.y, lx = dx * o.ca + dy * o.sa, ly = -dx * o.sa + dy * o.ca;
        [[o.hw + e, ly], [-o.hw - e, ly], [lx, o.hh + e], [lx, -o.hh - e]].forEach(function (p) {
          res.push({ x: o.x + p[0] * o.ca - p[1] * o.sa, y: o.y + p[0] * o.sa + p[1] * o.ca });
        });
      }
      return res;
    }
    if (free(tx, ty)) return { x: tx, y: ty };
    // bis zu drei Schritte vom Platz weg zum nächsten freien Randpunkt (Mauer und Turm können sich überlappen)
    var front = [{ x: tx, y: ty }], best = null, bd = 1e9;
    for (var depth = 0; depth < 3 && !best; depth++) {
      var next = [];
      for (k = 0; k < front.length; k++) for (var q = 0; q < obs.length; q++) {
        if (!inside(obs[q], front[k].x, front[k].y)) continue;
        var ex = exits(obs[q], front[k].x, front[k].y);
        for (var m = 0; m < ex.length; m++) {
          var p = { x: clamp(ex[m].x, 0.3, W - 0.3), y: clamp(ex[m].y, 0.3, H - 0.3) }, pd = hyp(p.x - tx, p.y - ty);
          if (free(p.x, p.y)) { if (pd < bd) { bd = pd; best = p; } }
          else next.push(p);
        }
      }
      front = next;
    }
    return best || { x: tx, y: ty };
  }
  function pickSpot(u) {
    var spot = findSpot(u.team, u);
    u.tx = spot ? spot.x : null;
    u.ty = spot ? spot.y : null;
  }

  function spawn(team, type) {
    var d = CONFIG.units[type], b = bases[team];
    var x = team === 0 ? b.x2 + 0.5 : b.x1 - 0.5;
    var SPAWN_BAND = 2.8, y = (b.y1 + b.y2) / 2 - SPAWN_BAND / 2 + simRand() * SPAWN_BAND; // neue Einheiten: zufällig in einem Band von 2,8 Kacheln (Mitte = Burgmitte)
    units.push({
      id: nextId++, team: team, type: type,
      x: x + (simRand() - 0.5) * 0.2, y: y,
      hp: d.hp, max: d.hp, cd: 0.4 + simRand() * 0.4,
      face: team === 0 ? 1 : -1, hit: 0, slow: 0, lastHit: -99, tx: null, ty: null, settled: false, retry: 1
    });
    if (d.passive) pickSpot(units[units.length - 1]);
    if (d.range > 1.5 && !d.king && !d.ram) seekSlot(units[units.length - 1]); // Fernkämpfer: Turmplatz suchen (welche Typen wo stehen dürfen, steht in WALL.tower.levels)
    if (d.dig) units[units.length - 1].dig = pickDigTarget(team);
    if (d.ladder || d.belfry) { // läuft direkt zur gegnerischen Mauer
      var bu = units[units.length - 1];
      bu.goWall = pickWallSpot(team, d.r); if (d.belfry) bu.bfTower = true;
      if (d.belfry) for (var bi = 0; bi < d.belfry.archers; bi++) { // Bogenschützen oben auf dem Turm
        spawn(team, 'archer');
        var ba = units[units.length - 1];
        ba.gar = null; ba.bf = bu; ba.bfSlot = bi % 2 ? 1 : -1; ba.tower = true;
        ba.x = bu.x; ba.y = bu.y + ba.bfSlot * 0.22;
      }
    }
  }
  // Zufälliger Punkt an der gegnerischen Mauer zwischen den beiden Türmen (wo sie bei Mauer 5 stehen): außen (ox, oy) und innen (ix, iy)
  function pickWallSpot(team, r) {
    var en = 1 - team, f = 0.37 + simRand() * 0.26; // 0,37–0,63: zwischen den Türmen (bei 0,25 und 0,75), mit Abstand zu den Rundtürmen
    var o = wallPoint(en, f, WALL.dist + WALL_TH / 2 + r + 0.05), n = wallPoint(en, f, WALL.dist - WALL_TH / 2 - 0.35);
    return { f: f, ox: o.x, oy: o.y, ix: n.x, iy: n.y };
  }
  // Länge der Mauerlinie im Abstand R (wie wallPoint), um einen Abstand in Kacheln in einen Anteil f umzurechnen
  function wallLen(team, R) { var b = bases[team], a0 = dasin(Math.min(1, b.y1 / R)); return 2 * R * a0 + (b.y2 - b.y1); }
  // Belagerungsturm: ist sein Andockpunkt schon von einem eigenen angedockten Turm belegt, rückt er direkt daneben (auf die nähere Seite)
  function freeDockSpot(u, d) {
    var gv = u.goWall, en = 1 - u.team, R = WALL.dist + WALL_TH / 2 + d.r + 0.05, df = (2 * d.push + 0.02) / wallLen(en, R), dir = 0, tries = 0;
    for (;;) {
      var hit = null;
      for (var q = 0; q < units.length; q++) { var o = units[q]; if (o !== u && o.hp > 0 && o.dock && o.team === u.team && hyp(o.x - gv.ox, o.y - gv.oy) < 2 * d.push) { hit = o; break; } }
      if (!hit || tries++ > 12) return;
      if (!dir) { // nähere Seite: welcher Nachbarplatz liegt näher am anrückenden Turm?
        var pa = wallPoint(en, gv.f + df, R), pb = wallPoint(en, gv.f - df, R);
        dir = hyp(pa.x - u.x, pa.y - u.y) <= hyp(pb.x - u.x, pb.y - u.y) ? 1 : -1;
      }
      var nf = clamp(hit.goWall ? hit.goWall.f + dir * df : gv.f + dir * df, 0.02, 0.98);
      if (nf === gv.f) { dir = -dir; nf = clamp(gv.f + dir * df, 0.02, 0.98); }
      var o2 = wallPoint(en, nf, R), n2 = wallPoint(en, nf, WALL.dist - WALL_TH / 2 - 0.35);
      u.goWall = gv = { f: nf, ox: o2.x, oy: o2.y, ix: n2.x, iy: n2.y };
    }
  }
  // Trebuchet im Angriff: Zielpunkt (Mitte, spot.behind hinter der gegnerischen Mauer) und Standplatz spot.dist davor (zufällig, Richtung eigene Seite)
  function pickTrebSpot(team, d) {
    var en = 1 - team, tp = wallPoint(en, 0.5, WALL.dist - d.spot.behind), base = team === 0 ? PI_ : 0, an = base + (simRand() * 2 - 1) * d.spot.ang;
    return { tx: tp.x, ty: tp.y, x: clamp(tp.x + dcos(an) * d.spot.dist, 0.6, W - 0.6), y: clamp(tp.y + dsin(an) * d.spot.dist, H / 2 - d.spot.mid, H / 2 + d.spot.mid) };
  }
  // ein Schuss mit mehreren Steinen (multi): zufällig verteilt im Umkreis multi.spread um (tx, ty), nur Flächenschaden am Einschlagpunkt
  function fireMulti(u, d, tx, ty) {
    var lp = launchPt(u, d, tx, ty);
    for (var mk = 0; mk < d.multi.n; mk++) {
      var ma2 = simRand() * 2 * PI_, mr2 = d.multi.spread * Math.sqrt(simRand());
      var mpx = clamp(tx + dcos(ma2) * mr2, 0.2, W - 0.2), mpy = clamp(ty + dsin(ma2) * mr2, 0.2, H - 0.2);
      var mst = simRand() * d.multi.stagger, mfl = Math.max(0.2, hyp(mpx - u.x, mpy - u.y) / d.multi.speed); // jeder Stein: zufälliger Abwurf innerhalb von stagger s, fliegt mit speed Kacheln/s
      shots.push({ type: u.type, team: u.team, sx: u.x, sy: u.y, tx: mpx, ty: mpy, tgt: null, multi: true, t: mst + mfl });
      effects.push({ kind: 'stone', x1: lp.x, y1: lp.y, x2: mpx, y2: mpy, h0: 0, t: -mst, dur: mfl }); // startet von oben gesehen genau in der Mitte des Trebuchets
      effects.push({ kind: 'sblast', x: mpx, y: mpy, r: d.splash, t: -(mst + mfl), dur: 0.5 });
    }
  }
  function belfryManned(b) { for (var q = 0; q < units.length; q++) if (units[q].bf === b && units[q].hp > 0) return true; return false; }

  // Der König ist eine Einheit, die in der Burg sitzen kann (inCastle): oben Bogenschütze und unverwundbar, ohne Burg Nahkämpfer
  function spawnKing(team) {
    var kd = CONFIG.units.king, kb = bases[team];
    units.push({
      id: nextId++, team: team, type: 'king',
      x: (kb.x1 + kb.x2) / 2, y: (kb.y1 + kb.y2) / 2,
      hp: kd.hp, max: kd.hp, cd: 0.5, inCastle: true,
      face: team === 0 ? 1 : -1, hit: 0, slow: 0, lastHit: -99, tx: null, ty: null, settled: false, retry: 1
    });
  }

  // Ziel eines Tunnelgräbers: ein zufälliger Punkt im Umkreis einer zufälligen gegnerischen Einheit auf dem Feld, die weiter als 1 Kachel schiesst
  // (Bogenschütze, Magier, Baliste, Katapult, Trebuchet …) (gibt es keinen, ein Punkt in der Spielfeldmitte), nie näher als minBase an der gegnerischen Kaserne.
  function pickDigTarget(team) {
    var cfg = CONFIG.units.digger.dig, fb = bases[1 - team], list = [], i, o;
    for (i = 0; i < units.length; i++) {
      o = units[i];
      if (o.team !== team && o.hp > 0 && !o.dig && !o.tower && CONFIG.units[o.type].range > 1 && !CONFIG.units[o.type].king && !o.inCastle) list.push(o); // alle Fernkämpfer auf dem Feld (Reichweite > 1 Kachel, auch Belagerungsmaschinen); Einheiten auf Türmen/Belagerungsturm nicht
    }
    var cx, cy, rad = 0;
    if (list.length) { o = list[Math.floor(simRand() * list.length)]; cx = o.x; cy = o.y; rad = cfg.radius; }
    else { cx = W * (0.4 + simRand() * 0.2); cy = 1 + simRand() * (H - 2); }
    var a = simRand() * Math.PI * 2, r = rad * Math.sqrt(simRand());
    var x = clamp(cx + dcos(a) * r, 0.5, W - 0.5), y = clamp(cy + dsin(a) * r, 0.5, H - 0.5);
    for (i = 0; i < 40; i++) {
      var dd = hyp(x - clamp(x, fb.x1, fb.x2), y - clamp(y, fb.y1, fb.y2));
      if (dd >= cfg.minBase) break;
      x = clamp(x + (team === 0 ? -1 : 1) * (cfg.minBase - dd + 0.05), 0.5, W - 0.5);
    }
    return { x: x, y: y };
  }
  // Grabspur: kurze Stücke, die genau trail Sekunden sichtbar bleiben
  function trailStep(u, force) {
    if (u.lx === undefined) { u.lx = u.x; u.ly = u.y; }
    if (force || hyp(u.x - u.lx, u.y - u.ly) >= 0.2) {
      effects.push({ kind: 'dirt', x1: u.lx, y1: u.ly, x2: u.x, y2: u.y, t: 0, dur: CONFIG.units.digger.dig.trail });
      u.lx = u.x; u.ly = u.y;
    }
  }

  // Spielprotokoll: wann welche Seite was gekauft hat (f Bauer, s Speer, b Bogen, r Reiter, m Magier, k Ritter)
  var LOGKEY = { farmer: 'f', spear: 's', archer: 'b', rider: 'r', mage: 'm', knight: 'k', digger: 'g', wall: 'w', ram: 'x', shield: 'h', catapult: 'p', baliste: 'a', sword: 'v', ladder: 'l', belfry: 't', trebuchet: 'u', javelin: 'j', crossbow: 'c', onager: 'o', schmiede: 'n' };
  var rec = [[], []], gaveUp = false;

  // Mauer: Standort, Anlegen und die Arbeiter, die sie bauen oder reparieren
  // Die Mauer liegt im Abstand WALL.dist rund um die Kaserne (wie die gestrichelte Schusslinie, nur enger) und endet
  // am Spielfeldrand. Innen ist, was näher als dist an der Kaserne liegt.
  function wallD(team, x, y) {
    var b = bases[team];
    return hyp(x - clamp(x, b.x1, b.x2), y - clamp(y, b.y1, b.y2));
  }
  function wallOut(w, x, y) { return wallD(w.team, x, y) > WALL.dist; }
  // Blockiert die Mauer des Gegners den Weg oder Schuss? Nur fertige, nur von außen nach innen.
  function wallBlocks(shooterTeam, sx, sy, tx, ty) {
    var w = walls[1 - shooterTeam];
    return !!(w && w.built && wallOut(w, sx, sy) && !wallOut(w, tx, ty));
  }
  // Punkt auf der Mauer (f von 0 bis 1 vom oberen zum unteren Feldrand) im Abstand r von der Kaserne
  function wallPoint(team, f, r) {
    var b = bases[team], x2 = team === 0 ? b.x2 : W - b.x1, y1 = b.y1, y2 = b.y2;
    var a0 = dasin(Math.min(1, y1 / r)), l1 = r * a0, l2 = y2 - y1, s = f * (2 * l1 + l2), x, y, an;
    if (s < l1) { an = -a0 + s / r; x = x2 + r * dcos(an); y = y1 + r * dsin(an); }
    else if (s < l1 + l2) { x = x2 + r; y = y1 + (s - l1); }
    else { an = (s - l1 - l2) / r; x = x2 + r * dcos(an); y = y2 + r * dsin(an); }
    return { x: team === 0 ? x : W - x, y: y };
  }
  // Türme ab Mauer 2: Sie nehmen Einheiten auf (Plätze je Turm, WALL.tower.levels). Hat ein Turm für eine neu gekaufte Einheit noch einen
  // freien Platz, läuft sie dorthin statt nach vorne und bleibt dort stehen. Sie schießt von dort aus; Nahkämpfer greifen sie nicht an.
  function towerAng(team, f) {
    var p1 = wallPoint(team, clamp(f - 0.01, 0, 1), WALL.dist), p2 = wallPoint(team, clamp(f + 0.01, 0, 1), WALL.dist);
    return datan2(p2.y - p1.y, p2.x - p1.x) - Math.PI / 2;
  }
  function slotPos(team, tw, sl) {
    var p = wallPoint(team, tw.f, WALL.dist + tw.out), an = towerAng(team, tw.f), ox = sl.dx * (team === 0 ? 1 : -1), oy = sl.dy;
    return { x: p.x + ox * dcos(an) - oy * dsin(an), y: p.y + ox * dsin(an) + oy * dcos(an) };
  }
  // Liegt der Punkt (x, y) im Turm tw der Mauer von team? (Viereck w×h gedreht wie gezeichnet, Rundturm Radius r)
  function inTowerArea(team, tw, x, y) {
    var p = wallPoint(team, tw.f, WALL.dist + tw.out), dx = x - p.x, dy = y - p.y;
    if (tw.k === 'rd') return hyp(dx, dy) <= tw.r;
    var an = towerAng(team, tw.f), ca = dcos(an), sa = dsin(an);
    return Math.abs(dx * ca + dy * sa) <= tw.w / 2 && Math.abs(-dx * sa + dy * ca) <= tw.h / 2;
  }
  function slotFree(w, key) { var o = w.sl[key]; return !o || o.hp <= 0 || !o.gar || o.gar.key !== key; }
  // Platz für u suchen (abwechselnd links und rechts); setzt u.gar
  function seekSlot(u) {
    var w = walls[u.team];
    if (!w || !w.sl || !w.tlv || w.stage < WALL.tower.from) return false;
    var lv = WALL.tower.levels[w.stage], most = 0, ti, ci;
    for (ti = 0; ti < lv.list.length; ti++) most = Math.max(most, lv.list[ti].slots.length);
    for (ci = 0; ci < most; ci++) for (ti = 0; ti < lv.list.length; ti++) {
      var sl = lv.list[ti].slots[ci], key = ti + '_' + ci;
      if (sl && sl.types.indexOf(u.type) >= 0 && slotFree(w, key)) { w.sl[key] = u; u.gar = { key: key, ti: ti, ci: ci }; return true; }
    }
    return false;
  }
  // Hat u einen angreifbaren Gegner in Reichweite? Dann kämpft es zuerst, statt in den Turm zu laufen.
  function unitInFight(u, d) {
    for (var j = 0; j < units.length; j++) {
      var e = units[j];
      if (e.team === u.team || e.hp <= 0 || e.dig || e.inCastle || (e.tower && d.range <= 1.5)) continue;
      if (hyp(e.x - u.x, e.y - u.y) <= d.range) return true;
    }
    return false;
  }
  // Schaden an u: halbiert, wenn u in einem Turm einer Mauer ab Mauer 3 steht
  function hurt(v, amt, from) { // from = Werte des Angreifers (Einheit oder Kaserne mit range)
    var gw = v.tower ? walls[v.team] : null, vd = CONFIG.units[v.type];
    var blocked = false;
    if (vd.rangedTaken && from && from.range > 1.5) { amt *= vd.rangedTaken; blocked = true; } // Belagerungsschild und König: nur ein Teil des Schadens von Fernkämpfern
    if ((gw || v.bf) && from && from.range > 1.5) { amt *= WALL.tower.taken; blocked = true; } // in Türmen und auf dem Belagerungsturm: nur ein Teil des Schadens von Fernkämpfern
    if (blocked && clock - (v.blockT === undefined ? -9 : v.blockT) > 0.2) { // kleine Block-Animation
      v.blockT = clock;
      effects.push({ kind: 'block', x: v.x, y: v.y, dir: v.team === 0 ? 1 : -1, t: 0, dur: 0.3 });
    }
    v.hp -= amt;
  }
  function buyWall(team) {
    for (var wi = 0; wi < units.length; wi++) if (units[wi].team === team && units[wi].type === 'worker' && units[wi].hp > 0 && !units[wi].bank) return false; // solange eigene Arbeiter auf dem Feld sind, geht kein neuer Bau
    var cb = bases[team];
    if (cb.down) { // Burg zerstört: derselbe Knopf baut sie wieder auf
      for (var ci = 0; ci < WALL.workers; ci++) {
        spawn(team, 'worker');
        var cwk = units[units.length - 1];
        cwk.castle = true;
        cwk.bp = { x: team === 0 ? cb.x2 + 0.35 : cb.x1 - 0.35, y: cb.y1 + (ci + 0.5) / WALL.workers * (cb.y2 - cb.y1) };
      }
      return true;
    }
    var w = walls[team];
    if (!w) w = walls[team] = { team: team, hp: 0, built: false, hit: 0, lastHit: -99, stage: 0, peak: 0 };
    for (var i = 0; i < WALL.workers; i++) {
      spawn(team, 'worker');
      units[units.length - 1].bp = wallPoint(team, (i + 0.5) / WALL.workers, WALL.dist - WALL_TH / 2 - 0.3);
    }
    return true;
  }

  // Gebäude: 2 Plätze auf einem Bogen wie die Mauer (Abstand GEB_ABSTAND zur Burg), oben (f 0,2) und unten (f 0,8); die Mitte mit dem Weg bleibt frei
  var GEB_ABSTAND = 1.6, GEB_F = [0.2, 0.8];
  function gebPlaetze(team) {
    return GEB_F.map(function (f) { return wallPoint(team, f, GEB_ABSTAND); }).filter(function (p) {
      return !units.some(function (o) { return CONFIG.units[o.type].gebaeude && o.team === team && o.hp > 0 && hyp(o.x - p.x, o.y - p.y) < 0.2; });
    });
  }
  function meinGebaeude(team, type) { for (var i = 0; i < units.length; i++) if (units[i].type === type && units[i].team === team && units[i].hp > 0) return units[i]; return null; }
  // Preis des nächsten Kaufs: Gebäude = nächste Stufe (Infinity = schon höchste Stufe, im Bau oder kein Platz frei)
  function preisVon(team, type) {
    var d = CONFIG.units[type]; if (!d) return Infinity;
    if (!d.gebaeude) return d.cost;
    var g = meinGebaeude(team, type), st = d.gebaeude.stufen;
    if (!g) return gebPlaetze(team).length ? st[0].cost : Infinity;
    if (g.bau || g.stufe >= st.length) return Infinity;
    return st[g.stufe].cost;
  }
  function buyGebaeude(team, type) {
    var d = CONFIG.units[type], G = d.gebaeude, g = meinGebaeude(team, type), dir = team === 0 ? 1 : -1;
    if (g) { // nächste Stufe: Arbeiter baut die zusätzlichen Leben
      if (g.bau || g.stufe >= G.stufen.length) return false;
      g.ziel = g.stufe + 1; g.max = G.stufen[g.ziel - 1].hp; g.bau = true;
    } else {
      var frei = gebPlaetze(team); if (!frei.length) return false;
      var p = frei[Math.floor(simRand() * frei.length)];
      g = { id: nextId++, team: team, type: type, x: p.x, y: p.y, hp: 1, max: G.stufen[0].hp, cd: 0, face: dir, hit: 0, slow: 0, lastHit: -99, tx: null, ty: null, settled: false, retry: 1,
            bau: true, stufe: 0, ziel: 1, gT: 0, nx: 0, ny: p.y < H / 2 ? 1 : -1 }; // nx/ny = Vorderseite: zur Mitte (brauner Weg)
      units.push(g);
    }
    spawn(team, 'worker'); // ein Arbeiter baut (wie an der Mauer)
    var wk = units[units.length - 1]; wk.bank = g; wk.bp = { x: g.x - g.nx * (G.w / 2 + 0.25), y: g.y - g.ny * (G.h / 2 + 0.25) };
    return true;
  }
  function buy(team, type) {
    if (state !== 'playing') return false;
    var d = CONFIG.units[type];
    if (!d || d.hidden || gold[team] < preisVon(team, type)) return false;
    if (tut.on && team === 0 && tut.avail.indexOf(type) < 0) return false; // im Tutorial nur, was gerade verlangt ist
    if (d.wall) {
      if (!buyWall(team)) return false;
      gold[team] -= d.cost;
      if (tut.on && team === 0) tut.bought[type] = (tut.bought[type] || 0) + 1;
      rec[team].push(clock.toFixed(1) + LOGKEY[type]);
      return true;
    }
    var preis = preisVon(team, type);
    if (d.gebaeude && !buyGebaeude(team, type)) return false; // kein Platz frei / schon höchste Stufe
    gold[team] -= preis;
    if (tut.on && team === 0) tut.bought[type] = (tut.bought[type] || 0) + 1;
    rec[team].push(clock.toFixed(1) + LOGKEY[type]);
    if (!d.gebaeude) spawn(team, type);
    if (team === ME) produced++;
    return true;
  }

