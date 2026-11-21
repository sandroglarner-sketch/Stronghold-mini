  // ---------- Simulation ----------
  // Grundeinkommen pro Auszahlung (Bauern zahlen seit 18.11. selbst, mit eigenem Takt)
  function income(team) {
    return team === 1 ? (CONFIG.levels[level] || CONFIG.levels.normal).income : CONFIG.GOLD_AMOUNT;
  }

  function nearestOnRect(u, b) {
    return { x: clamp(u.x, b.x1, b.x2), y: clamp(u.y, b.y1, b.y2) };
  }

  // Flächenschaden um (cx, cy): alle Gegner im Umkreis, außer exclude (schon getroffen). Die Mauer hält Flächenschaden nie auf (auch Einheiten
  // hinter der Mauer oder im Turm werden getroffen, Turm: nur 25 %). Grundprinzip: alle gegnerischen Einheiten UND Gebäude (Mauer, Burg) im Radius
  // nehmen Schaden, ausser das Gebäude war selbst das Ziel des Schusses (wallHit/baseHit, dann nicht doppelt).
  function applySplash(team, sx, sy, cx, cy, d, exclude, wallHit, baseHit) {
    var sb = bases[1 - team];
    if (!baseHit && d.atk > 0 && sb && !sb.down && sb.hp > 0 && hyp(cx - clamp(cx, sb.x1, sb.x2), cy - clamp(cy, sb.y1, sb.y2)) <= d.splash) {
      sb.hp = Math.max(0, sb.hp - d.atk); sb.flash = 0.2; sb.lastHit = clock;
    }
    if (!wallHit && d.atk > 0) {
      var ew = walls[1 - team], eb = bases[1 - team];
      if (ew && ew.hp > 0 && (ew.team === 0 ? cx > eb.x2 - d.splash : cx < eb.x1 + d.splash) && Math.abs(wallD(ew.team, cx, cy) - WALL.dist) <= d.splash + WALL_TH / 2) {
        ew.hit = 0.15; ew.lastHit = clock;
        ew.hp -= d.atk;
        if (ew.hp <= 0) { walls[ew.team] = null; effects.push({ kind: 'blast', x: cx, y: cy, r: 1.2, t: 0, dur: 0.45 }); }
      }
    }
    for (var j = 0; j < units.length; j++) {
      var sv = units[j];
      if (sv.team === team || sv.hp <= 0 || sv.dig || sv.inCastle) continue;
      var sG = CONFIG.units[sv.type] && CONFIG.units[sv.type].gebaeude; // Gebäude: Abstand zum Rand (w x h), nicht zur Mitte (wie bei der Burg)
      if ((sG ? hyp(Math.max(0, Math.abs(sv.x - cx) - sG.w / 2), Math.max(0, Math.abs(sv.y - cy) - sG.h / 2)) : hyp(sv.x - cx, sv.y - cy)) > d.splash) continue;
      if (sv !== exclude) { hurt(sv, d.atk, d); sv.hit = 0.15; sv.lastHit = clock; }
      if (d.slow) sv.slow = d.slow.secs;
    }
  }
  // Ein Geschoss schlägt ein: das Ziel wird getroffen, wenn es noch da ist (der Schütze muss nicht mehr leben)
  function landShot(s) {
    if (s.base) { // Pfeil der Kaserne
      var bv = s.tgt;
      if (bv.hp > 0 && !bv.dig && !bv.inCastle) { hurt(bv, CONFIG.BASE_ATK, { range: CONFIG.BASE_RANGE }); bv.hit = 0.15; bv.lastHit = clock; }
      return;
    }
    var d = CONFIG.units[s.type], tgt = s.tgt, cx = s.tx, cy = s.ty, aimBase = !s.tgt && !s.wall;
    if (d.fire) { // Feuerball: schlägt an der Stelle ein, auf die gezielt wurde; wer bis dahin aus dem Umkreis ist, bleibt unverletzt
      if (!tgt && !s.multi) { var fb0 = bases[1 - s.team]; fb0.hp = Math.max(0, fb0.hp - d.atk); fb0.flash = 0.2; fb0.lastHit = clock; } // Ziel war die Kaserne
      applySplash(s.team, s.sx, s.sy, s.tx, s.ty, d, null, false, !tgt && !s.multi); // Trebuchet-Steine (multi): nur Flächenschaden am Einschlagpunkt
      return;
    }
    if (tgt) {
      if (tgt.hp > 0 && !tgt.dig && !tgt.inCastle) { hurt(tgt, d.atk, d); tgt.hit = 0.15; tgt.lastHit = clock; cx = tgt.x; cy = tgt.y; }
      else tgt = null;
    } else if (s.wall) {
      var sw = s.wall;
      if (walls[sw.team] === sw) {
        sw.hit = 0.15; sw.lastHit = clock;
        sw.hp -= d.atk;
        if (sw.hp <= 0) {
          walls[sw.team] = null;
          effects.push({ kind: 'blast', x: s.tx, y: s.ty, r: 1.2, t: 0, dur: 0.45 });
        }
      }
    } else {
      var fb = bases[1 - s.team];
      fb.hp = Math.max(0, fb.hp - d.atk); fb.flash = 0.2; fb.lastHit = clock;
    }
    if (s.type === 'baliste') effects.push({ kind: 'bolthit', x: cx, y: cy, ang: Math.atan2(cy - s.sy, cx - s.sx), t: 0, dur: 0.35 }); // Einschlag des Bolzens
    if (d.splash) applySplash(s.team, s.sx, s.sy, cx, cy, d, tgt, !!s.wall, aimBase);
    if (d.blast) applySplash(s.team, s.sx, s.sy, s.tx, s.ty, { atk: d.blast.atk, splash: d.blast.r, range: d.range }, null, false, false); // Onager: zusätzlich Flächenschaden um den Einschlagpunkt, trifft alles (auch die getroffene Mauer/Burg nochmals)
  }

  // Grundeinkommen des Bots (CONFIG.BOTS[..].income Gold alle incomeEvery s); null = kein Bot (Online-Partie)
  function botEinkommen() {
    if (pvp && pvp.on && !pvp.bot) return null; // Online-Partie: kein Bot (Zuschauer einer Bot-Partie: doch)
    var R = CONFIG.BOTS[botType]; if (!R) return null;
    return { gold: R.income === undefined ? income(1) : R.income, alle: Math.max(0.5, R.incomeEvery || CONFIG.GOLD_EVERY) };
  }
  function update(dt) {
    clock += dt;
    var be = botEinkommen();
    if (be && !tut.on) {
      payT1 += dt;
      if (payT1 >= be.alle) {
        payT1 -= be.alle;
        gold[1] = Math.min(CONFIG.GOLD_MAX, gold[1] + be.gold);
        var bb1 = bases[1];
        if (be.gold) effects.push({ kind: 'text', text: '+' + be.gold, x: (bb1.x1 + bb1.x2) / 2, y: bb1.y1 + 0.55, t: 0, dur: 1.2 });
      }
    }
    payT += dt;
    if (payT >= CONFIG.GOLD_EVERY) {
      payT -= CONFIG.GOLD_EVERY;
      for (var t = 0; t < 2; t++) {
        if (tut.on && t === 1) continue; // der Trainingsgegner bekommt kein Gold
        if (t === 1 && botEinkommen()) continue; // Bot: eigenes Grundeinkommen (unten)
        var amt = income(t);
        gold[t] = Math.min(CONFIG.GOLD_MAX, gold[t] + amt);
        var bb = bases[t];
        effects.push({ kind: 'text', text: '+' + amt, x: (bb.x1 + bb.x2) / 2, y: bb.y1 + 0.55, t: 0, dur: 1.2 }); // Grundeinkommen im oberen Bereich der Burg
      }
    }
    for (var gi = 0; gi < units.length; gi++) { // Bauern: jeder bringt alle bonusEvery Sekunden bonus Gold, sein Takt startet beim Niederlassen
      var gu = units[gi], gd = CONFIG.units[gu.type];
      if (!gd.bonus || !gu.settled || gu.hp <= 0 || (tut.on && gu.team === 1)) continue;
      gu.gT = (gu.gT || 0) + dt;
      if (gu.gT >= gd.bonusEvery) {
        gu.gT -= gd.bonusEvery;
        gold[gu.team] = Math.min(CONFIG.GOLD_MAX, gold[gu.team] + gd.bonus);
        effects.push({ kind: 'text', text: '+' + gd.bonus, x: gu.x, y: gu.y - 0.55, farmer: true, t: 0, dur: 1.1 });
        gu.grabT = clock; // nur für die Darstellung: gräbt kurz mit der Heugabel
      }
    }
    if (!tut.on && (!pvp.on || pvp.bot)) aiUpdate(dt);

    var i, j;
    for (i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.hp <= 0) continue;
      var d = CONFIG.units[u.type];
      var ewIn = walls[1 - u.team]; u.inFoe = !!(ewIn && ewIn.built && !wallOut(ewIn, u.x, u.y)); // steht hinter der fertigen gegnerischen Mauer
      if (u.dummy) { u.hit = Math.max(0, u.hit - dt); u.slow = Math.max(0, u.slow - dt); continue; } // Trainingspuppe: steht still
      if (d.gebaeude) { // Gebäude (Schmiede): steht still; fertig bringt es Gold (Stufe) und heilt wie die Mauer
        u.hit = Math.max(0, u.hit - dt); u.slow = 0;
        if (!u.bau) {
          if (u.hp < u.max) u.hp = Math.round(Math.min(u.max, u.hp + WALL.heal * dt) * 1e6) / 1e6;
          var GD = d.gebaeude, galt = u.gT; u.gT += dt;
          if (GD.art === 'dieb' && !tut.on) { // Dieb: klaut in der gegnerischen Burg, liefert in der eigenen ab
            var fb = bases[1 - u.team], ob = bases[u.team];
            if (galt < GD.klauen && u.gT >= GD.klauen) { var kl = Math.ceil(Math.max(0, gold[1 - u.team]) * GD.prozent / 100); gold[1 - u.team] -= kl; u.beute = (u.beute || 0) + kl; if (kl) effects.push({ kind: 'text', text: '-' + kl, x: (fb.x1 + fb.x2) / 2, y: fb.y1 + 0.9, farmer: true, rot: true, t: 0, dur: 1.4 }); }
            if (galt < GD.abladen && u.gT >= GD.abladen && u.beute) { gold[u.team] = Math.min(CONFIG.GOLD_MAX, gold[u.team] + u.beute); effects.push({ kind: 'text', text: '+' + u.beute, x: u.x, y: u.y - 0.7, farmer: true, t: 0, dur: 1.4 }); u.beute = 0; } // kommt im Diebeshaus an
          }
          if (GD.art === 'brand' && !tut.on) { // Brandstifter: legt in der gegnerischen Burg Feuer, der Gegner verliert Gold
            var bfb = bases[1 - u.team];
            if (galt < GD.zuenden && u.gT >= GD.zuenden) effects.push({ kind: 'feuer', x: (bfb.x1 + bfb.x2) / 2, y: (bfb.y1 + bfb.y2) / 2, w: bfb.x2 - bfb.x1, h: bfb.y2 - bfb.y1, t: 0, dur: GD.klauen - GD.zuenden + 0.5 }); // kurzer, kleiner Brand (1,5 s)
            if (galt < GD.klauen && u.gT >= GD.klauen) { var vb = Math.ceil(Math.max(0, gold[1 - u.team]) * GD.prozent / 100); gold[1 - u.team] -= vb; if (vb) effects.push({ kind: 'text', text: '-' + vb, x: (bfb.x1 + bfb.x2) / 2, y: bfb.y1 + 0.9, farmer: true, rot: true, t: 0, dur: 1.4 }); }
          }
          if (GD.art === 'kirche') { // Gebet und Unwetter
            u.gT = 0;
            if (u.gebetT > 0) { u.gebetT = Math.max(0, u.gebetT - dt); if (u.gebetT <= 0) { u.gunst = (u.gunst || 0) + 1; effects.push({ kind: 'puff', x: u.x, y: u.y - 0.5, team: u.team, t: 0, dur: 0.6 }); } }
            if ((u.gunst || 0) >= GD.gunstMax) {
              u.sturmT = (u.sturmT || 0) + dt; // Unwetter zieht auf (Zeichnung blendet ein)
              u.blitzT = (u.blitzT || 0) + (u.sturmT < GD.blitz.auf ? 0 : dt); // Blitze erst, wenn das Unwetter aufgezogen ist
              while (u.blitzT >= GD.blitz.alle) {
                u.blitzT -= GD.blitz.alle;
                var bx1 = u.team === 0 ? W * 2 / 3 : 0.3, bx2 = u.team === 0 ? W - 0.3 : W / 3, blx = bx1 + simRand() * (bx2 - bx1), bly = 0.4 + simRand() * (H - 0.8);
                u.blitzN = (u.blitzN || 0) + 1;
                if (u.blitzN % GD.blitz.koenig === 0) { // jeder 4. Blitz zielt genau auf den gegnerischen König
                  for (var kb = 0; kb < units.length; kb++) { var kgu = units[kb]; if (kgu.type === 'king' && kgu.team !== u.team && kgu.hp > 0) { blx = kgu.x; bly = kgu.y; if (!kgu.inCastle) { hurt(kgu, GD.blitz.schaden, { range: 99 }); /* Fernkampf: König nimmt nur 25 % */ kgu.hit = 0.15; kgu.lastHit = clock; } break; } } // zielt auf den König; in der Burg ist er geschützt, sonst voller Schaden
                }
                applySplash(u.team, blx, -1, blx, bly, { atk: GD.blitz.schaden, splash: GD.blitz.radius, range: 99 }, null, false, false); // trifft alles vom Gegner im Umkreis
                effects.push({ kind: 'blitz', x: blx, y: bly, t: 0, dur: 0.45, seed: Math.floor(simRand() * 1000) });
                effects.push({ kind: 'blast', x: blx, y: bly, r: GD.blitz.radius, t: 0, dur: 0.45 });
              }
            }
          }
          else if (u.gT >= GD.alle) {
            u.gT -= GD.alle;
            var gg = GD.art === 'zins' ? Math.ceil(Math.max(0, gold[u.team]) * GD.prozent / 100) : GD.art === 'dieb' || GD.art === 'brand' ? 0 : GD.stufen[u.stufe - 1].gold + (GD.steigt || 0) * (u.zahl || 0); // Bank: Prozent des Goldes, aufgerundet; Adelshaus: jedes Mal steigt mehr
            u.zahl = (u.zahl || 0) + 1;
            if (gg > 0 && !(tut.on && u.team === 1)) { gold[u.team] = Math.min(CONFIG.GOLD_MAX, gold[u.team] + gg); effects.push({ kind: 'text', text: '+' + gg, x: u.x, y: u.y - 0.7, farmer: true, t: 0, dur: 1.1 }); }
          }
        }
        var kbp = bases[u.team], kpx = clamp(u.x, kbp.x1 + 0.3, kbp.x2 - 0.3), kpy = clamp(u.y, kbp.y1 + 0.3, kbp.y2 - 0.3);
        if ((d.gebaeude.art === 'dieb' || d.gebaeude.art === 'brand') && !u.weg) { // Weg: seitlich zum Spielfeldrand, am Rand entlang in die gegnerische Burg (relativ zum Gebäude)
          var ey = u.y < H / 2 ? 0.55 : H - 1.15, efb = bases[1 - u.team], eob = bases[u.team], ecx = (efb.x1 + efb.x2) / 2, ocx = (eob.x1 + eob.x2) / 2;
          var tuer = { x: u.x, y: u.y + (ey < u.y ? -1 : 1) * (d.gebaeude.h / 2 + 0.15) };
          var rel = function (p) { return { x: p.x - u.x, y: p.y - u.y }; };
          u.weg = { hin: [tuer, { x: u.x, y: ey }, { x: ecx, y: ey }, { x: ecx, y: clamp(ey, efb.y1 + 0.4, efb.y2 - 0.4) }].map(rel),
                    zur: [{ x: ecx, y: clamp(ey, efb.y1 + 0.4, efb.y2 - 0.4) }, { x: ecx, y: ey }, { x: u.x, y: ey }, tuer].map(rel) }; // direkt zurück ins Haus
        }
        u.settled = { gunst: u.gunst || 0, gebet: u.gebetT || 0, weg: u.weg, beute: u.beute || 0, kx: kpx - u.x, ky: kpy - u.y, neu: u.stufe === 0, bau: u.bau ? Math.min(1, u.stufe > 0 ? (u.werk || 0) / u.max : u.hp / u.max) : 1, stufe: u.bau ? Math.max(u.stufe, 1) : u.stufe, phase: u.bau ? -1 : u.gT, nx: u.nx, ny: u.ny }; // nur für die Zeichnung
        continue;
      }
      u.cd = Math.max(0, u.cd - dt);
      u.hit = Math.max(0, u.hit - dt);
      u.slow = Math.max(0, u.slow - dt);
      if (u.hp < u.max && !d.worker && clock - u.lastHit >= CONFIG.UNIT_HEAL.delay) u.hp = Math.min(u.max, u.hp + CONFIG.UNIT_HEAL.rate * dt);
      var spd = d.speed * (u.slow > 0 ? 0.5 : 1);
      if (d.king) { // König ohne Burg: kämpft nur nahe der Burg und kehrt zurück
        var kb = bases[u.team], kcx = (kb.x1 + kb.x2) / 2, kcy = (kb.y1 + kb.y2) / 2, KL = d.king.leash, kdx, kdy, kdl;
        if (u.inCastle) {
          if (kb.down) u.inCastle = false;
          else { // oben auf der Burg: unverwundbar, schießt wie ein Bogenschütze auf den nächsten Gegner in Reichweite
            u.x = kcx; u.y = kcy;
            if (u.waffeZ > 0) { u.waffeZ = Math.max(0, u.waffeZ - dt / CONFIG.KING_SWAP.stow); continue; } // zurück auf der Burg: erst die Nahkampfwaffe versorgen
            u.ready = u.aimT !== undefined && clock - u.aimT < CONFIG.BASE_CD + 0.3; // schießt gerade: nächsten Pfeil schon spannen (Animation)
            // Gegner in Reichweite? Dann Bogen hervorholen (KING_BOW.draw s), erst danach schießen; sonst Bogen wieder verstauen (KING_BOW.stow s)
            var vic = null, vd = 1e9;
            for (j = 0; j < units.length; j++) {
              var en = units[j];
              if (en.team === u.team || en.hp <= 0 || en.dig || en.inCastle || unsichtbar(en) || wallBlocks(u.team, kcx, kcy, en.x, en.y) || (en.bfTower && belfryManned(en))) continue;
              var np = nearestOnRect(en, kb), nd = hyp(np.x - en.x, np.y - en.y);
              if (nd <= CONFIG.BASE_RANGE && nd < vd) { vd = nd; vic = en; }
            }
            u.bogenT = u.bogenT || 0;
            if (vic) u.bogenT = Math.min(1, u.bogenT + dt / CONFIG.KING_BOW.draw);
            else u.bogenT = Math.max(0, u.bogenT - dt / CONFIG.KING_BOW.stow);
            if (vic && u.bogenT >= 1 && u.cd <= 0) {
              shots.push({ base: true, team: u.team, tgt: vic, t: CONFIG.BASE_DELAY });
              u.cd = CONFIG.BASE_CD; u.atkT = clock;
              u.aim = Math.atan2(vic.y - kcy, vic.x - kcx); u.aimT = clock; // dreht sich zum Ziel
              effects.push({ kind: 'arrow', x1: kcx + Math.cos(u.aim) * 0.35, y1: kcy + Math.sin(u.aim) * 0.35, x2: vic.x, y2: vic.y, t: 0, dur: CONFIG.BASE_DELAY }); // der Pfeil startet beim König (Bogen), nicht am Burgrand
            } else if (vic && u.bogenT < 1) { u.aim = Math.atan2(vic.y - kcy, vic.x - kcx); u.aimT = clock - CONFIG.BASE_CD * 0.5; } // dreht sich schon beim Hervorholen zum Ziel
            continue;
          }
        }
        if (!u.draussen) { u.draussen = true; u.wechselT = CONFIG.KING_SWAP.time; } // Burg kaputt: Bogen versorgen, Nahkampfwaffe hervorholen
        if (u.wechselT > 0) { // solange steht er und kämpft nicht
          u.wechselT = Math.max(0, u.wechselT - dt);
          var kwt = CONFIG.KING_SWAP.time - u.wechselT;
          u.bogenT = Math.max(0, (u.bogenT || 0) - dt / CONFIG.KING_SWAP.bow);
          u.waffeZ = kwt < CONFIG.KING_SWAP.bow ? 0 : Math.min(1, (kwt - CONFIG.KING_SWAP.bow) / (CONFIG.KING_SWAP.time - CONFIG.KING_SWAP.bow));
          if (u.wechselT <= 0) { u.waffeZ = 1; u.bogenT = 0; }
          continue;
        }
        if (!kb.down) { // Burg steht wieder (ab 1 Leben): sofort zurück (Waffe bleibt in der Hand), oben versorgt er sie und wird wieder zum Fernkämpfer
          kdx = kcx - u.x; kdy = kcy - u.y; kdl = hyp(kdx, kdy);
          if (kdl <= 0.15) { u.inCastle = true; u.draussen = false; u.x = kcx; u.y = kcy; }
          else { var krs = Math.min(spd * dt, kdl), kgv = umGebaeude(u, kdx / kdl, kdy / kdl, null); u.x += kgv.x * krs; u.y += kgv.y * krs; if (Math.abs(kdx) > 0.1) u.face = kdx > 0 ? 1 : -1; }
          continue;
        }
        var kt = null, kdd = 1e9;
        for (j = 0; j < units.length; j++) {
          var ke = units[j];
          if (ke.team === u.team || ke.hp <= 0 || ke.dig || ke.tower || unsichtbar(ke)) continue;
          if (hyp(ke.x - kcx, ke.y - kcy) > KL + d.range) continue; // weiter als 5 Kacheln von der Burg: ignoriert
          var kde = hyp(ke.x - u.x, ke.y - u.y);
          if (kde < kdd) { kdd = kde; kt = ke; }
        }
        var kgx = kt ? kt.x : kcx, kgy = kt ? kt.y : kcy, kstop = kt ? d.range - 0.1 : 0.05;
        kdx = kgx - u.x; kdy = kgy - u.y; kdl = hyp(kdx, kdy);
        if (kdl > kstop) {
          var kst = Math.min(spd * dt, kdl - kstop);
          u.x += kdx / kdl * kst; u.y += kdy / kdl * kst;
          if (Math.abs(kdx) > 0.1) u.face = kdx > 0 ? 1 : -1;
        }
        var khx = u.x - kcx, khy = u.y - kcy, khl = hyp(khx, khy);
        if (khl > KL) { u.x = kcx + khx / khl * KL; u.y = kcy + khy / khl * KL; }
        u.ready = !!kt && hyp(kt.x - u.x, kt.y - u.y) <= d.range + 0.001;
        if (u.ready) { u.aimX = kt.x; u.aimY = kt.y; }
        if (kt && hyp(kt.x - u.x, kt.y - u.y) <= d.range + 0.001 && u.cd <= 0) {
          u.cd = d.cd; u.atkT = clock;
          if (Math.abs(kt.x - u.x) > 0.05) u.face = kt.x > u.x ? 1 : -1;
          hurt(kt, d.atk, d); kt.hit = 0.15; kt.lastHit = clock;
          effects.push({ kind: 'stab', heavy: true, x1: u.x, y1: u.y, x2: kt.x, y2: kt.y, t: 0, dur: 0.16 });
        }
        continue;
      }
      if (!u.gar && !u.dig && !u.bf && !u.tSpot && d.range > 1.5 && !d.king && wallD(u.team, u.x, u.y) <= WALL.tower.takeDist) seekSlot(u); // sobald ein Platz frei ist, solange die Einheit höchstens 4 Kacheln von der Kaserne entfernt ist
      var ow = walls[1 - u.team];
      u.o = !!(ow && ow.built && wallOut(ow, u.x, u.y)); // steht vor der fertigen gegnerischen Mauer
      if (u.gar) { // Besatzung eines Turms: läuft zu ihrem Platz und bleibt dort stehen
        var gw = walls[u.team];
        if (!gw || !gw.sl || gw.sl[u.gar.key] !== u) { u.gar = null; u.tower = false; u.seat = false; } // Mauer weg oder Platz verloren: marschiert normal los
        else if (!u.tower && !d.spot && unitInFight(u, d)) { /* Angreifen hat Vorrang: erst kämpfen, dann in den Turm (nicht das Trebuchet: es baut sich erst auf dem Turm auf) */ }
        else if (!u.seat) { // läuft zu ihrem Platz; sobald ihr Mittelpunkt im Turm liegt, gilt sie als «im Turm» (u.tower: nur 25 % Fernkampfschaden usw.)
          var gtw = gw.tlv.list[u.gar.ti], gp = slotPos(u.team, gtw, gtw.slots[u.gar.ci]), gdx2 = gp.x - u.x, gdy2 = gp.y - u.y, gd2 = hyp(gdx2, gdy2);
          if (gd2 > 0.04) {
            var gs2 = Math.min(spd * dt, gd2);
            u.x += gdx2 / gd2 * gs2; u.y += gdy2 / gd2 * gs2;
            if (Math.abs(gdx2) > 0.1) u.face = gdx2 > 0 ? 1 : -1;
            u.tower = inTowerArea(u.team, gtw, u.x, u.y);
            continue;
          }
          u.x = gp.x; u.y = gp.y; u.tower = true; u.seat = true;
        } else {
          var gp3 = slotPos(u.team, gw.tlv.list[u.gar.ti], gw.tlv.list[u.gar.ti].slots[u.gar.ci]);
          u.x = gp3.x; u.y = gp3.y; u.o = false; spd = 0;
        }
      }
      if (d.spot && !u.gar && !u.tSpot) u.tSpot = pickTrebSpot(u.team, d); // kein Turmplatz (oder verloren): Angriffsmodus
      if (u.tSpot && !u.gar) { // Trebuchet im Angriff: zum Standplatz, aufbauen, immer denselben Punkt beschiessen
        var tsp2 = u.tSpot, tdx = tsp2.x - u.x, tdy = tsp2.y - u.y, tdl = hyp(tdx, tdy);
        u.ready = false;
        if (!u.atSpot && wallD(u.team, u.x, u.y) <= WALL.dist + WALL_TH / 2 && seekSlot(u)) { u.tSpot = null; u.setupT = 0; continue; } // noch nicht über die eigene Mauerlinie: wird ein Turmplatz frei, geht es auf den Turm
        if (!u.atSpot && tdl > 0.05) { var tst = Math.min(spd * dt, tdl); u.x += tdx / tdl * tst; u.y += tdy / tdl * tst; if (Math.abs(tdx) > 0.1) u.face = tdx > 0 ? 1 : -1; u.setupT = 0; continue; }
        u.atSpot = true; u.setupT = (u.setupT || 0) + dt;
        if (u.setupT >= d.setup) {
          u.ready = true; u.aimX = tsp2.tx; u.aimY = tsp2.ty;
          if (u.cd <= 0) { u.cd = d.cd * (u.cdm || 1); u.atkT = clock; u.face = tsp2.tx > u.x ? 1 : -1; fireMulti(u, d, tsp2.tx, tsp2.ty); }
        }
        continue;
      }
      if (u.bf) { // Bogenschütze auf dem Belagerungsturm: fährt mit, schießt über die Mauer; fällt der Turm, stirbt er mit
        if (u.bf.hp <= 0) { u.hp = 0; continue; }
        else { u.x = u.bf.x - 0.12 * (u.team === 0 ? 1 : -1); u.y = u.bf.y + u.bfSlot * 0.22; u.o = false; spd = 0; }
      }
      if (u.goWall) { // Leiterträger und Belagerungsturm: direkt zur gegnerischen Mauer
        var gv = u.goWall, ewl = walls[1 - u.team];
        u.ready = false;
        if (!u.dock && !u.climb) {
          if (d.belfry) { freeDockSpot(u, d); gv = u.goWall; }
          var gdx3 = gv.ox - u.x, gdy3 = gv.oy - u.y, gd3 = hyp(gdx3, gdy3);
          if (gd3 > 0.03) { var gs3 = Math.min(spd * dt, gd3); u.x += gdx3 / gd3 * gs3; u.y += gdy3 / gd3 * gs3; if (Math.abs(gdx3) > 0.1) u.face = gdx3 > 0 ? 1 : -1; continue; }
          u.x = gv.ox; u.y = gv.oy;
          var hasW = !!(ewl && ewl.built);
          if (d.ladder) {
            if (hasW) { u.climb = { t: 0 }; effects.push({ kind: 'ladder', x: (gv.ox + gv.ix) / 2, y: (gv.oy + gv.iy) / 2, ang: Math.atan2(gv.iy - gv.oy, gv.ix - gv.ox), len: hyp(gv.ix - gv.ox, gv.iy - gv.oy) + 0.3, team: u.team, t: 0, dur: d.ladder.show }); }
            else { u.goWall = null; u.climbed = true; } // keine fertige Mauer: kämpft gleich normal
          } else if (d.belfry) { u.dock = { t: 0, n: 0, wall: hasW }; }
          continue;
        }
        if (u.climb) { // klettert über die Leiter auf die andere Seite
          u.climb.t += dt;
          var ck3 = Math.min(1, u.climb.t / d.ladder.climb); // klettert immer genau climb Sekunden
          u.x = lerp(gv.ox, gv.ix, ck3); u.y = lerp(gv.oy, gv.iy, ck3);
          if (ck3 >= 1) { u.climb = null; u.goWall = null; u.climbed = true; u.cd = Math.max(u.cd, 0.3); }
          continue;
        }
        if (u.dock) { // angedockt: Schwertkämpfer strömen über die Mauer (ohne fertige Mauer direkt vor dem Turm)
          var bc = d.belfry, sg = u.team === 0 ? 1 : -1;
          u.dock.t += dt;
          while (u.dock.n < bc.troops && u.dock.t >= u.dock.n * bc.every) {
            spawn(u.team, 'sword');
            var sw = units[units.length - 1], so = ((u.dock.n % 3) - 1) * 0.25;
            if (u.dock.wall) { sw.x = gv.ix - sg * 0.1; sw.y = gv.iy + so; } else { sw.x = u.x + sg * 0.7; sw.y = u.y + so; }
            sw.face = sg; sw.fromBf = true;
            effects.push({ kind: 'puff', x: sw.x, y: sw.y, team: u.team, t: 0, dur: 0.4 });
            u.dock.n++;
          }
          continue;
        }
      }
      if (u.dig) {
        // Unter der Erde: geradeaus zum Ziel, greift nicht an, kann nicht getroffen werden und wird nicht gesehen
        var gdx = u.dig.x - u.x, gdy = u.dig.y - u.y, gl = hyp(gdx, gdy), gs = Math.min(d.dig.speed * dt, gl);
        if (gl > 1e-6) {
          u.x += gdx / gl * gs;
          u.y += gdy / gl * gs;
          if (Math.abs(gdx) > 0.2) u.face = gdx > 0 ? 1 : -1;
        }
        trailStep(u, false);
        u.digSnd = (u.digSnd || 0) - dt;
        if (u.digSnd <= 0) { u.digSnd = 0.2; sfx({ kind: 'dig', x: u.x }); }
        if (hyp(u.dig.x - u.x, u.dig.y - u.y) <= 0.02) {
          trailStep(u, true);
          u.dig = null;
          u.cd = 0.4;
          effects.push({ kind: 'puff', x: u.x, y: u.y, team: u.team, t: 0, dur: 0.5 });
        }
        continue;
      }
      if (d.holz) { // Holzfäller: zum nächsten Baum mit Holz, fällen (alle 3 s +1 Gold), ist der Baum leer, zum nächsten
        var HZ = d.holz, hb = u.baum !== undefined ? baeume[u.baum] : null;
        if (!hb || hb.holz <= 0) { // neuen Baum suchen: der nächste mit Holz und freiem Platz (höchstens proBaum Holzfäller, beide Teams zusammen)
          u.baum = undefined; u.hackT = 0; var hbd = 1e9, hpl = 0;
          for (var hi = 0; hi < baeume.length; hi++) {
            var hbb = baeume[hi]; if (hbb.holz <= 0) continue;
            var hbes = [], hdd; for (var hj = 0; hj < units.length; hj++) { var ho = units[hj]; if (ho !== u && ho.hp > 0 && ho.baum === hi && CONFIG.units[ho.type].holz) hbes.push(ho.platz); }
            if (hbes.length >= (HZ.proBaum || 2)) continue;
            hdd = hyp(hbb.x - u.x, hbb.y - u.y); if (hdd < hbd - 1e-9) { hbd = hdd; u.baum = hi; hpl = hbes.indexOf(0) < 0 ? 0 : 1; }
          }
          u.platz = hpl;
          hb = u.baum !== undefined ? baeume[u.baum] : null;
        }
        u.hackt = false;
        if (hb) {
          var hw = u.platz ? 0 : Math.PI, hsx = hb.x + Math.cos(hw) * (hb.r + 0.32), hsy = hb.y; // Platz links (0) oder rechts (1) vom Stamm
          var hdx = hsx - u.x, hdy = hsy - u.y, hdl = hyp(hdx, hdy);
          if (hdl > 0.05) { var hv = umGebaeude(u, hdx / hdl, hdy / hdl, null), hs = Math.min(spd * dt, hdl); u.x += hv.x * hs; u.y += hv.y * hs; if (Math.abs(hv.x) > 0.1) u.face = hv.x > 0 ? 1 : -1; u.hackT = 0; }
          else {
            u.hackt = true; u.face = hb.x > u.x ? 1 : -1; u.hackT = (u.hackT || 0) + dt;
            if (u.hackT >= HZ.alle) {
              u.hackT -= HZ.alle;
              var hg = Math.min(HZ.gold, hb.holz); hb.holz -= hg;
              gold[u.team] = Math.min(CONFIG.GOLD_MAX, gold[u.team] + hg);
              effects.push({ kind: 'text', text: '+' + hg, x: u.x, y: u.y - 0.55, farmer: true, t: 0, dur: 1.1 });
              effects.push({ kind: 'spaene', x: hb.x, y: hb.y, t: 0, dur: 0.5 });
              if (hb.holz <= 0) effects.push({ kind: 'puff', x: hb.x, y: hb.y, team: u.team, t: 0, dur: 0.6 }); // Baum fällt
            }
          }
        }
        u.settled = { hackt: u.hackt, ziel: hb ? Math.atan2(hb.y - u.y, hb.x - u.x) : 0 }; // nur für die Zeichnung
        continue;
      }
      if (d.karawane) { // Karawane: zum Teich, Töpfe füllen, zurück zur Burg, Gold abliefern, von vorn
        var KW = d.karawane, kb0 = bases[u.team], ksg = u.team === 0 ? -1 : 1, kof = ((u.id * 37) % 7 - 3) * 0.12;
        if (!u.kz) { u.kz = 'hin'; u.voll = 0; }
        var kzx = u.kz === 'zurueck' ? (u.team === 0 ? kb0.x2 + 0.45 : kb0.x1 - 0.45) : W / 2 + ksg * 0.35 + kof, kzy = u.kz === 'zurueck' ? (kb0.y1 + kb0.y2) / 2 + kof * 1.5 : 2.6; // Teich: in der Mitte unterhalb andocken (dort sieht der Gegner sie)
        if (u.kz === 'fuellen') {
          u.voll = Math.min(1, u.voll + dt / KW.fuellen);
          if (u.voll >= 1) u.kz = 'zurueck';
        } else {
          var kdx = kzx - u.x, kdy = kzy - u.y, kdd = hyp(kdx, kdy);
          if (kdd > 0.05) { var kv = umGebaeude(u, kdx / kdd, kdy / kdd, null), ks = Math.min(spd * dt, kdd); u.x += kv.x * ks; u.y += kv.y * ks; if (Math.abs(kv.x) > 0.1) u.face = kv.x > 0 ? 1 : -1; }
          else if (u.kz === 'hin') u.kz = 'fuellen';
          else { // an der Burg: Wasser verkauft
            gold[u.team] = Math.min(CONFIG.GOLD_MAX, gold[u.team] + KW.gold);
            effects.push({ kind: 'text', text: '+' + KW.gold, x: u.x, y: u.y - 0.55, farmer: true, t: 0, dur: 1.1 });
            u.kz = 'hin'; u.voll = 0;
          }
        }
        u.settled = { voll: u.voll, toepfe: KW.toepfe }; // nur für die Zeichnung
        continue;
      }
      if (d.worker && u.bank) { // Arbeiter am Gebäude: hingehen und mit WALL.rate Leben pro Sekunde bauen, bis die Stufe fertig ist
        if (u.fade > 0) { u.fade -= dt; if (u.fade <= 0) { u.hp = 0; u.gone = true; } continue; }
        var bk = u.bank;
        if (bk.hp <= 0 || !bk.bau) { u.fade = WALL.fade; continue; }
        var bdx = u.bp.x - u.x, bdy = u.bp.y - u.y, bdd = hyp(bdx, bdy);
        if (bdd > 0.05) { var bs = Math.min(spd * dt, bdd); u.x += bdx / bdd * bs; u.y += bdy / bdd * bs; if (Math.abs(bdx) > 0.1) u.face = bdx > 0 ? 1 : -1; }
        else {
          var ausbau = bk.stufe > 0;
          if (ausbau) bk.werk = Math.round(((bk.werk || 0) + WALL.rate * dt) * 1e6) / 1e6; // Ausbau: Arbeit, die Leben bleiben gleich
          else bk.hp = Math.round(Math.min(bk.max, bk.hp + WALL.rate * dt) * 1e6) / 1e6;
          if (ausbau ? bk.werk >= bk.max - 1e-6 : bk.hp >= bk.max - 1e-6) { bk.hp = bk.max; bk.bau = false; bk.stufe = bk.ziel; bk.gT = 0; u.fade = WALL.fade; effects.push({ kind: 'puff', x: bk.x, y: bk.y, team: bk.team, t: 0, dur: 0.5 }); }
        }
        continue;
      }
      if (d.worker) {
        // Arbeiter: zum Bauplatz gehen, mit rate Leben pro Sekunde bis zu add Leben bringen und verschwinden.
        var wl = u.castle ? bases[u.team] : walls[u.team], wcap = u.castle ? CONFIG.BASE_HP : WALL.cap;
        if (u.fade > 0) {
          u.fade -= dt;
          if (u.fade <= 0) { u.hp = 0; u.gone = true; }
          continue;
        }
        if (!wl) { u.fade = WALL.fade; continue; }
        var wdx = u.bp.x - u.x, wdy = u.bp.y - u.y, wd = hyp(wdx, wdy);
        if (wd > 0.05) {
          var ws = Math.min(spd * dt, wd);
          u.x += wdx / wd * ws;
          u.y += wdy / wd * ws;
          if (Math.abs(wdx) > 0.1) u.face = wdx > 0 ? 1 : -1;
        } else {
          // angekommen: baut mit rate Leben pro Sekunde, bis er add Leben gebracht hat oder die Mauer voll ist
          if (u.left === undefined) u.left = WALL.add;
          var wg = Math.min(WALL.rate * dt, u.left, wcap - wl.hp);
          if (wg > 0) { wl.hp = Math.round((wl.hp + wg) * 1e6) / 1e6; u.left = Math.round((u.left - wg) * 1e6) / 1e6; if (!u.castle) wl.built = true; } // gerundet, sonst kann 40,0000001 als 41 erscheinen
          if (u.left <= 1e-6 || wl.hp >= wcap - 1e-6) u.fade = WALL.fade; // löst sich ohne Ton auf
        }
        continue;
      }
      if (d.passive) {
        // Bauern gehen zu ihrem Standplatz und bleiben dort. Ohne Platz marschieren sie zur
        // gegnerischen Kaserne und suchen unterwegs jede Sekunde erneut.
        if (!u.settled) {
          if (u.tx === null) {
            u.retry -= dt;
            if (u.retry <= 0) { u.retry = 1; pickSpot(u); }
          }
          var gx, gy, gd, stopAt;
          if (u.tx !== null) { var fsp = farmerStand(u); gx = fsp.x; gy = fsp.y; stopAt = 0.03; }
          else { var fbp = nearestOnRect(u, bases[1 - u.team]); gx = fbp.x; gy = fbp.y; stopAt = 0.9; }
          var fdx = gx - u.x, fdy = gy - u.y, fd = hyp(fdx, fdy);
          if (fd > stopAt) {
            var fs = Math.min(spd * dt, fd - (u.tx !== null ? 0 : stopAt));
            u.x += fdx / fd * fs;
            u.y += fdy / fd * fs;
            if (Math.abs(fdx) > 0.2) u.face = fdx > 0 ? 1 : -1;
          }
          if (u.tx !== null && hyp(gx - u.x, gy - u.y) <= 0.03) {
            u.x = gx; u.y = gy;
            u.settled = true; u.gT = 0; // Gold-Takt des Bauern startet jetzt
            effects.push({ kind: 'puff', x: u.x, y: u.y, team: u.team, t: 0, dur: 0.35 });
          }
        } else { // steht schon: entsteht oder verschwindet eine Mauer an seinem Platz, geht er an ihren Rand bzw. zurück
          var fst2 = farmerStand(u), fdx2 = fst2.x - u.x, fdy2 = fst2.y - u.y, fd2 = hyp(fdx2, fdy2);
          if (fd2 > 1e-6) {
            var fs2 = Math.min(spd * dt, fd2);
            u.x += fdx2 / fd2 * fs2; u.y += fdy2 / fd2 * fs2;
            if (Math.abs(fdx2) > 0.2) u.face = fdx2 > 0 ? 1 : -1;
          }
        }
        continue;
      }
      var foeBase = bases[1 - u.team];

      // Alle Einheiten beider Seiten verhalten sich gleich: auf die gegnerische Kaserne zumarschieren und
      // auf den nächsten Gegner in Reichweite schießen. Eine fertige gegnerische Mauer ist im Weg: Was dahinter
      // steht (auch die Kaserne), ist nicht erreichbar, die Mauer selbst wird zum Ziel.
      var outside = u.o && !d.fire, dw = outside ? wallD(ow.team, u.x, u.y) - WALL.dist - WALL_TH / 2 : 1e9;
      var best = null, bd = 1e9, bt = null, btd = 1e9, rngd = d.range > 1.5 && !d.ram; // bt = nächster Gegner im Turm (nur für Fernkämpfer)
      for (j = 0; j < units.length; j++) {
        var e = units[j];
        if ((d.ram && !CONFIG.units[e.type].gebaeude) || e.team === u.team || e.hp <= 0 || e.dig || e.inCastle || unsichtbar(e) || (e.tower && d.range <= 1.5)) continue; // Rammbock, Schild, Onager sehen nur Mauern, Burgen und Gebäude
        if (rngd && e.bfTower && belfryManned(e)) continue; // Fernkämpfer: erst die Bogenschützen oben, dann den Belagerungsturm
        if (outside && !wallOut(ow, e.x, e.y)) continue;
        if (u.inFoe && d.range <= 1.5 && wallOut(ow, e.x, e.y)) continue; // hinter der gegnerischen Mauer: Nahkämpfer erreichen niemanden draussen
        var dd = hyp(e.x - u.x, e.y - u.y);
        if (d.minRange && dd < d.minRange) continue; // zu nah: das Katapult kann dieses Ziel nicht angreifen
        if (dd < bd) { bd = dd; best = e; }
        if (rngd && e.tower && dd < btd) { btd = dd; bt = e; }
      }
      var foeDown = foeBase.down, fk = null;
      if (foeDown) for (j = 0; j < units.length; j++) if (units[j].type === 'king' && units[j].team !== u.team && units[j].hp > 0) { fk = units[j]; break; }
      var bp = foeDown && fk ? { x: fk.x, y: fk.y } : nearestOnRect(u, foeBase);
      var db = hyp(bp.x - u.x, bp.y - u.y);
      var sight = Math.max(4, d.range + 1.5);

      var dbe = outside || foeDown || (d.minRange && db < d.minRange) ? 1e9 : db, wallT = false;
      var tgt = null, tx, ty, td;
      if (best && bd <= d.range && (dbe > d.range || bd <= dbe)) { tgt = best; tx = best.x; ty = best.y; td = bd; }
      else if (dbe <= d.range) { tx = bp.x; ty = bp.y; td = db; }
      else if (outside && dw <= d.range && !bt) { // Fernkämpfer greifen die Mauer erst an, wenn keine Gegner mehr in den Türmen stehen
        // nächster Punkt auf der Außenkante der Mauer
        var wb = bases[ow.team], wpx = clamp(u.x, wb.x1, wb.x2), wpy = clamp(u.y, wb.y1, wb.y2), wl2 = hyp(u.x - wpx, u.y - wpy) || 1;
        wallT = true;
        tx = wpx + (u.x - wpx) / wl2 * (WALL.dist + WALL_TH / 2);
        ty = wpy + (u.y - wpy) / wl2 * (WALL.dist + WALL_TH / 2);
        td = Math.max(dw, 0);
      }
      else if (bt) { tgt = bt; tx = bt.x; ty = bt.y; td = btd; } // zuerst die Besatzung der Türme
      else if (best && bd <= sight) { tgt = best; tx = best.x; ty = best.y; td = bd; }
      else { tx = bp.x; ty = bp.y; td = db; }

      var stop = d.range - 0.1;
      if (wallT && d.range <= 1.5) stop = Math.min(stop, 0.5); // Nahkämpfer gehen dicht an die Mauer, damit die Kaserne sie trifft
      if (td > stop && td > 1e-6) {
        var step = Math.min(spd * dt, td - stop);
        var vx = (tx - u.x) / td, vy = (ty - u.y) / td, gv = umGebaeude(u, vx, vy, tgt); // um Gebäude herum
        vx = gv.x; vy = gv.y;
        u.x += vx * step;
        u.y += vy * step;
        if (Math.abs(vx) > 0.2) u.face = vx > 0 ? 1 : -1;
      }

      var reach = wallT && d.range <= 1.5 ? 0.55 : d.range; // Nahkämpfer schlagen erst direkt an der Mauer zu
      if (d.setup) { // Trebuchet: zählt, wie lange es stillsteht (aufbauen); jede Bewegung baut es wieder ab
        var mvd = u.lx === undefined || hyp(u.x - u.lx, u.y - u.ly) > 0.01;
        u.lx = u.x; u.ly = u.y;
        if (d.setupFrei && u.sax !== undefined) { // aufgebaut: bis setupFrei Kacheln vom Aufbaupunkt bleibt er aufgebaut, weiter weg packt er ein
          if (hyp(u.x - u.sax, u.y - u.say) > d.setupFrei) { u.sax = undefined; u.setupT = 0; } else u.setupT += dt;
        } else {
          u.setupT = mvd ? 0 : (u.setupT || 0) + dt;
          if (d.setupFrei && u.setupT >= d.setup) { u.sax = u.x; u.say = u.y; } // fertig aufgebaut: Aufbaupunkt merken
        }
      }
      var built = !d.setup || u.setupT >= d.setup;
      u.ready = built && td <= reach + 0.001 && (tgt || wallT || !foeDown) && !(d.minRange && td < d.minRange) && d.atk > 0; // nur für die Darstellung (Ausholen, Blickrichtung)
      if (u.ready) { u.aimX = tx; u.aimY = ty; }
      if (built && td <= reach + 0.001 && u.cd <= 0 && (tgt || wallT || !foeDown) && !(d.minRange && td < d.minRange)) {
        u.cd = d.cd * (u.cdm || 1);
        u.atkT = clock; var lp = launchPt(u, d, tx, ty);
        if (Math.abs(tx - u.x) > 0.05) u.face = tx > u.x ? 1 : -1;
        if (d.delay) {
          // Geschoss fliegt: der Schaden folgt erst nach delay Sekunden (landShot), auch wenn der Schütze bis dahin fällt
          if (d.multi) fireMulti(u, d, tx, ty); // mehrere Steine, zufällig verteilt im Umkreis multi.spread um das Ziel
          else shots.push({ type: u.type, team: u.team, sx: u.x, sy: u.y, tx: tx, ty: ty, tgt: tgt, wall: (!tgt && wallT) ? ow : null, t: d.delay });
        } else {
          if (tgt) { hurt(tgt, d.atk, d); tgt.hit = 0.15; tgt.lastHit = clock; }
          else if (wallT) {
            if (d.atk > 0) { ow.hit = 0.15; ow.lastHit = clock; }
            ow.hp -= d.atk;
            if (ow.hp <= 0) {
              walls[ow.team] = null;
              effects.push({ kind: 'blast', x: tx, y: ty, r: 1.2, t: 0, dur: 0.45 });
            }
          }
          else { foeBase.hp = Math.max(0, foeBase.hp - d.atk); if (d.atk > 0) { foeBase.flash = 0.2; foeBase.lastHit = clock; } }
          if (d.splash) applySplash(u.team, u.x, u.y, tx, ty, d, tgt, wallT, !tgt && !wallT);
        }
        if (d.fackel) { // Fackelwerfer: brennende Fackel fliegt im Bogen und dreht sich, kleiner Brand am Einschlag
          effects.push({ kind: 'fackel', x1: lp.x, y1: lp.y, x2: tx, y2: ty, t: 0, dur: d.delay });
          effects.push({ kind: 'fbrand', x: tx, y: ty, r: d.splash, t: -d.delay, dur: 0.6 });
        }
        else if (d.multi) { /* Trebuchet: Steine und Einschläge zeichnet fireMulti, keine Stich-/Ziellinie */ }
        else if (u.type === 'onager') { // Onager: grauer Stein fliegt gerade, Einschlag mit Staub
          effects.push({ kind: 'rock', x1: lp.x, y1: lp.y, x2: tx, y2: ty, t: 0, dur: d.delay });
          effects.push({ kind: 'oblast', x: tx, y: ty, r: (d.blast ? d.blast.r : 1) * 0.8, t: -d.delay, dur: 0.7 }); // Optik 20 % kleiner als der Schadensradius
        }
        else if (d.splash) {
          if (d.fire) {
            effects.push({ kind: 'fball', x1: lp.x, y1: lp.y, x2: tx, y2: ty, t: 0, dur: d.delay });
            effects.push({ kind: 'fblast', x: tx, y: ty, r: d.splash, t: -d.delay, dur: 0.55 });
          } else {
            effects.push({ kind: 'orb', x1: lp.x, y1: lp.y, x2: tx, y2: ty, t: 0, dur: 0.5 });
            effects.push({ kind: 'blast', x: tx, y: ty, r: d.splash, t: -0.5, dur: 0.45 });
          }
        } else if (d.ram) {
          if (d.atk > 0) effects.push({ kind: 'slam', x: tx, y: ty, t: 0, dur: 0.4 }); // Rammbock: Einschlag mit Staub und Splittern
        } else {
          effects.push({
            kind: u.type === 'javelin' ? 'javelin' : u.type === 'crossbow' ? 'cbolt' : (u.type === 'archer' || u.type === 'baliste') ? 'arrow' : 'stab', heavy: d.atk >= 2,
            x1: lp.x, y1: lp.y, x2: tx, y2: ty, t: 0, dur: d.delay ? d.delay : (u.type === 'archer' ? 0.5 : 0.16)
          });
        }
      }
    }

    // Geschosse im Flug: landen nach ihrer Flugzeit
    var restShots = [];
    for (var si = 0; si < shots.length; si++) {
      shots[si].t -= dt;
      if (shots[si].t <= 0) landShot(shots[si]); else restShots.push(shots[si]);
    }
    shots = restShots;

    // Einheiten voneinander trennen
    var k = Math.min(1, dt * 12);
    for (i = 0; i < units.length; i++) {
      var a = units[i];
      if (a.hp <= 0 || a.dummy || a.dig || a.tower || a.inCastle || a.climb || (CONFIG.units[a.type].passive && !CONFIG.units[a.type].holz) || CONFIG.units[a.type].worker) continue; // Holzfäller haben einen Körper
      for (j = i + 1; j < units.length; j++) {
        var b = units[j];
        if (b.hp <= 0 || b.dummy || b.dig || b.tower || b.inCastle || b.climb || (CONFIG.units[b.type].passive && !CONFIG.units[b.type].holz) || CONFIG.units[b.type].worker) continue; // Holzfäller haben einen Körper
        var dx = b.x - a.x, dy = b.y - a.y, dist = hyp(dx, dy), sep = ((a.goWall && CONFIG.units[a.type].pushRun) || CONFIG.units[a.type].push || 0.275) + ((b.goWall && CONFIG.units[b.type].pushRun) || CONFIG.units[b.type].push || 0.275); // pushRun: Körper nur unterwegs zur Mauer
        if (dist < sep) {
          if (dist < 1e-4) { dx = simRand() - 0.5; dy = simRand() - 0.5; dist = hyp(dx, dy) || 1; }
          var push = (sep - dist) * k; // zusammen, verteilt nach Masse: Rammbock und Belagerungsturm drücken sich durch, die anderen weichen aus
          var ma = a.dock || a.atSpot || a.hackt || a.setupT > 0 ? 1e6 : ((a.goWall && CONFIG.units[a.type].massRun) || CONFIG.units[a.type].mass || 1), mb = b.dock || b.atSpot || b.hackt || b.setupT > 0 ? 1e6 : ((b.goWall && CONFIG.units[b.type].massRun) || CONFIG.units[b.type].mass || 1), pa = push * mb / (ma + mb), pb = push * ma / (ma + mb); // angedockt: unverrückbar
          var nx = dx / dist, ny = dy / dist;
          a.x -= nx * pa; a.y -= ny * pa;
          b.x += nx * pb; b.y += ny * pb;
        }
      }
    }

    // Einheiten hinter der gegnerischen Mauer ignorieren die Mauer, kommen aber nicht durch sie hindurch nach draussen
    for (i = 0; i < units.length; i++) {
      var cu = units[i];
      if (!cu.inFoe || cu.hp <= 0 || cu.climb || cu.dig || cu.tower || cu.inCastle) continue;
      var cw = walls[1 - cu.team];
      if (!cw || !cw.built) continue;
      var cb = bases[cw.team], cpx = clamp(cu.x, cb.x1, cb.x2), cpy = clamp(cu.y, cb.y1, cb.y2), cdd = hyp(cu.x - cpx, cu.y - cpy), clim = WALL.dist - WALL_TH / 2 - CONFIG.units[cu.type].r * 0.8;
      if (cdd > clim && cdd > 1e-6) { cu.x = cpx + (cu.x - cpx) / cdd * clim; cu.y = cpy + (cu.y - cpy) / cdd * clim; }
    }

    // König gefallen? (nur möglich, wenn die Burg zerstört ist; ein heimkehrender König, der oben ankommt, zählt nicht)
    var kdead = [false, false];
    for (i = 0; i < units.length; i++) if (units[i].type === 'king' && units[i].hp <= 0) kdead[units[i].team] = true;

    // Gebäude: niemand steht darin (Bauern regeln das selbst über farmerStand)
    for (i = 0; i < units.length; i++) {
      var gb = units[i], GB = CONFIG.units[gb.type].gebaeude; if (!GB || gb.hp <= 0) continue;
      for (j = 0; j < units.length; j++) {
        var gu2 = units[j], gd2 = CONFIG.units[gu2.type];
        if (gu2 === gb || gu2.hp <= 0 || gd2.passive || gu2.tower || gu2.inCastle || gu2.dig || gu2.bf || gd2.worker) continue;
        var hw2 = GB.w / 2 + gd2.r * 0.8, hh2 = GB.h / 2 + gd2.r * 0.8, ox = gu2.x - gb.x, oy = gu2.y - gb.y;
        if (Math.abs(ox) < hw2 && Math.abs(oy) < hh2) { if (hw2 - Math.abs(ox) < hh2 - Math.abs(oy)) gu2.x = gb.x + (ox >= 0 ? hw2 : -hw2); else gu2.y = gb.y + (oy >= 0 ? hh2 : -hh2); }
      }
    }
    // Gefallene entfernen
    var alive = [];
    for (i = 0; i < units.length; i++) {
      var q = units[i];
      if (q.hp <= 0) {
        if (!q.gone) effects.push({ kind: 'puff', x: q.x, y: q.y, team: q.team, t: 0, dur: 0.5 });
        var qbf = CONFIG.units[q.type].belfry;
        if (qbf && !q.bfOut) { // Belagerungsturm zerstört: die Bogenschützen oben sterben mit, es steigen keine weiteren Schwertkämpfer mehr aus
          q.bfOut = true;
          for (var qa = 0; qa < units.length; qa++) if (units[qa].bf === q && units[qa].hp > 0) units[qa].hp = 0;
        }
      } else {
        var cw = walls[1 - q.team];
        if (q.o && cw && cw.built && !q.dig && !q.climb) { // (der Leiterträger auf der Leiter darf hinüber)
          // durch eine fertige gegnerische Mauer kommt keiner
          var lim = WALL.dist + WALL_TH / 2 + CONFIG.units[q.type].r * 0.8;
          if (wallD(cw.team, q.x, q.y) < lim) {
            var cb = bases[cw.team], cdy = Math.max(0, cb.y1 - q.y, q.y - cb.y2);
            if (cdy < lim) {
              var need = Math.sqrt(lim * lim - cdy * cdy);
              if (cw.team === 0) q.x = Math.max(q.x, cb.x2 + need); else q.x = Math.min(q.x, cb.x1 - need);
            }
          }
        }
        q.x = clamp(q.x, 0.25, W - 0.25);
        q.y = clamp(q.y, 0.3, H - 0.3);
        alive.push(q);
      }
    }
    units = alive;

    for (i = 0; i < 2; i++) {
      var hw = walls[i];
      if (!hw) continue;
      hw.hit = Math.max(0, hw.hit - dt);
      // Heilung: erst ab der ersten Optik, nur bis zum Höchstwert der erreichten Optik (40, 80, 120, 160, 200)
      var hs = 0, hk;
      for (hk = 0; hk < WALL.stages.length; hk++) if (hw.hp >= WALL.stages[hk]) hs++;
      hw.stage = Math.max(hw.stage || 0, hs);
      if (hw.stage >= WALL.tower.from) {
        var tlv = WALL.tower.levels[hw.stage];
        if (hw.tlv !== tlv) { // neue Optik: die Türme werden umgebaut, die Besatzung sucht sich neue Plätze
          var olds = [], okey;
          if (hw.sl) for (okey in hw.sl) if (hw.sl[okey] && hw.sl[okey].hp > 0) olds.push(hw.sl[okey]);
          hw.sl = {}; hw.tlv = tlv;
          for (var oi = 0; oi < olds.length; oi++) { olds[oi].gar = null; olds[oi].tower = false; olds[oi].seat = false; seekSlot(olds[oi]); }
        }
      }
      if (hw.stage >= 1 && hw.hp < WALL.stages[hw.stage - 1]) hw.hp = Math.round(Math.min(WALL.stages[hw.stage - 1], hw.hp + WALL.heal * dt) * 1e6) / 1e6;
    }
    bases[0].flash = Math.max(0, bases[0].flash - dt);
    bases[1].flash = Math.max(0, bases[1].flash - dt);
    // Burgen: zerstört (0 Leben) -> der König kommt herab; ab 1 Leben gilt sie als errichtet (er kehrt zurück); sonst heilt sie wie die Mauer
    for (i = 0; i < 2; i++) {
      var cs = bases[i];
      if (!cs.down && cs.hp <= 0) {
        cs.hp = 0; cs.down = true; cs.downAt = clock;
        for (j = 0; j < units.length; j++) if (units[j].type === 'king' && units[j].team === i) units[j].inCastle = false; // der König steigt herab
        effects.push({ kind: 'blast', x: (cs.x1 + cs.x2) / 2, y: (cs.y1 + cs.y2) / 2, r: 1.6, t: 0, dur: 0.6 });
      } else if (cs.down && cs.hp >= 1) cs.down = false;
      if (!cs.down) {
        if (cs.hp < CONFIG.BASE_HP) cs.hp = Math.round(Math.min(CONFIG.BASE_HP, cs.hp + WALL.heal * dt) * 1e6) / 1e6;
      }
    }
    if (kdead[0] || kdead[1]) finish(kdead[0] && kdead[1] ? -1 : (kdead[0] ? 1 : 0));
  }

  function updateEffects(dt) {
    var keep = [];
    for (var i = 0; i < effects.length; i++) {
      var e = effects[i];
      e.t += dt;
      if (!e.snd && e.t >= 0) { e.snd = 1; sfx(e); }
      if (e.t < e.dur) keep.push(e);
    }
    effects = keep;
    if (state === 'over') {
      bases[0].flash = Math.max(0, bases[0].flash - dt);
      bases[1].flash = Math.max(0, bases[1].flash - dt);
    }
  }

