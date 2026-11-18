  // ---------- Computergegner ----------
  // Alle Stufen spielen dieselbe Strategie, sie unterscheiden sich nur im Gold pro Auszahlung.
  // Der Computer entscheidet nur, was er wann kauft, seine Einheiten verhalten sich exakt wie deine.
  var ai = { think: 1.2, leadT: 0, defCool: 0, huntCool: 0, towerCool: 0, attackLock: 0, wave: null, queue: [], steps: [] };
  var level = 'normal';
  var botType = 'bauern';
  var botEl = $('botType');
  botEl.addEventListener('change', function () { botType = CONFIG.BOTS[botEl.value] ? botEl.value : 'bauern'; aiRoll(); });

  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function randomAffordable(types, budget) {
    var ok = types.filter(function (t) { return CONFIG.units[t].cost <= budget; });
    return ok.length ? pick(ok) : null;
  }
  function countFarmers(team) {
    var n = 0;
    for (var i = 0; i < units.length; i++) {
      if (units[i].team === team && units[i].type === 'farmer' && units[i].hp > 0) n++;
    }
    return n;
  }
  // Gold, das für die zweite Welle des Angriffs zurückgelegt ist
  function reserved() {
    var r = ai.wave ? ai.wave.gold : 0;
    if (ai.queue) for (var qi = 0; qi < ai.queue.length; qi++) r += planCost(ai.queue[qi].buy); // zeitversetzte Käufe der Jagd und Verteidigung
    return r;
  }
  function spendable() { return gold[1] - reserved(); }
  // Wurden seine Bauern, seine Einheiten auf den Türmen, seine Mauer oder seine Burg zuletzt angegriffen?
  function isAttacked() {
    var mem = CONFIG.AI.attackMemory, b = bases[1], i;
    if (clock - b.lastHit <= mem) return true;
    if (walls[1] && walls[1].built && clock - walls[1].lastHit <= mem) return true; // auch ein Angriff auf die Mauer
    for (i = 0; i < units.length; i++) {
      var f = units[i];
      if (f.team === 1 && (f.type === 'farmer' || f.tower) && f.hp > 0 && clock - f.lastHit <= mem) return true; // Bauern und Einheiten auf den Türmen
    }
    return false;
  }
  // Der Turm (die Kaserne) schafft es allein, wenn der Gegner nur noch Einheiten mit zusammen höchstens
  // weakHp Leben hat und weder Bogenschütze noch Magier noch Baliste noch Katapult dabei ist. Bauern und Tunnelgräber unterwegs zählen nicht.
  function enemyIsWeak() {
    var hp = 0, i, u;
    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.team !== 0 || u.hp <= 0 || u.dig || u.tower || CONFIG.units[u.type].passive || CONFIG.units[u.type].worker || CONFIG.units[u.type].king) continue;
      if (u.type === 'archer' || u.type === 'mage' || u.type === 'baliste' || u.type === 'catapult' || u.type === 'trebuchet') return false;
      hp += u.hp;
    }
    return hp <= CONFIG.AI.weakHp;
  }
  // Gilt für alle Gegner: fehlen der Mauer mehr als wallRepairLoss Leben bis zum Höchstwert ihrer Optik (40, 80, 120, 160, 200), wird sie repariert
  function wallWeak(w) {
    return !!(w && w.built && (w.stage || 0) >= 1 && WALL.stages[w.stage - 1] - w.hp > CONFIG.AI.wallRepairLoss);
  }
  // Steht ein sichtbarer Gegner in der Spielfeldhälfte des Computers (rechts)?
  function enemyInMyHalf() {
    for (var i = 0; i < units.length; i++) {
      var u = units[i];
      if (u.team === 0 && u.hp > 0 && !u.dig && !CONFIG.units[u.type].worker && !CONFIG.units[u.type].king && u.x > W / 2) return true;
    }
    return false;
  }
  // Wie viele Einheiten der Seite stehen auf den Türmen?
  // Bots, Verteidigung (alle Bots, für den Gegner und die eigenen Einheiten): Belagerungsmaschinen zählen als mehrere Einheiten
  var DEF_WEIGHT = { ram: 2, baliste: 2, catapult: 4, trebuchet: 6, belfry: 8 };
  function defW(type) { return DEF_WEIGHT[type] || 1; }
  function countTowerUnits(team) {
    var n = 0;
    for (var i = 0; i < units.length; i++) if (units[i].team === team && units[i].hp > 0 && units[i].tower) n += defW(units[i].type);
    return n;
  }
  // Wie viele Kampfeinheiten des Gegners (ohne Bauern, Arbeiter, König, Grabende) stehen in der Spielfeldhälfte des Computers?
  function countEnemiesInMyHalf() {
    var n = 0;
    for (var i = 0; i < units.length; i++) {
      var u = units[i], ud = CONFIG.units[u.type];
      if (u.team === 0 && u.hp > 0 && !u.dig && !ud.passive && !ud.worker && !ud.king && u.x > W / 2) n++;
    }
    return n;
  }
  // Kampfeinheiten (ohne Bauern); grabende Tunnelgräber des Gegners sieht die KI nicht
  function countFighters(team, noTower) { // noTower: Einheiten in Türmen zählen nicht mit
    var n = 0, i, u;
    for (i = 0; i < units.length; i++) {
      u = units[i];
      if (u.team === team && u.hp > 0 && !CONFIG.units[u.type].passive && !CONFIG.units[u.type].worker && !CONFIG.units[u.type].king && !(team === 0 && u.dig) && !(noTower && u.tower)) n += defW(u.type); // Rammbock/Baliste 2, Katapult 4, Trebuchet 6, Belagerungsturm 8
    }
    return n;
  }
  function aiRoll() {
    ai.think = 1.2;
    ai.leadT = 0;
    ai.defCool = 0;
    ai.wave = null;
    ai.huntCool = 0;
    ai.towerCool = 0;
    ai.attackLock = 0;
    ai.queue = [];
    ai.steps = [];
  }

  // ---------- Gegner «Bandit» ----------
  function planCost(list) { return list.reduce(function (a, b) { return a + CONFIG.units[b[0]].cost * b[1]; }, 0); }
  function botUpdate(dt) {
    var R = CONFIG.BOTS[botType], i, j, st;
    ai.defCool = Math.max(0, ai.defCool - dt);   // Sperre für Einheitenkäufe nach einer Verteidigung
    ai.huntCool = Math.max(0, ai.huntCool - dt);
    ai.towerCool = Math.max(0, ai.towerCool - dt);
    if (countFarmers(0) > countFarmers(1)) ai.leadT += dt; else ai.leadT = 0; // so lange hast du schon mehr Bauern
    // Zeitversetzte Käufe (Jagd, Verteidigung), immer pünktlich
    while (ai.queue.length && clock >= ai.queue[0].at) {
      st = ai.queue.shift();
      for (i = 0; i < st.buy.length; i++) for (j = 0; j < st.buy[i][1]; j++) if (!buy(1, st.buy[i][0])) break;
    }
    // Weitere Schritte des Angriffs, immer pünktlich (auch während einer Sperre)
    while (ai.steps.length && clock >= ai.steps[0].at) {
      st = ai.steps.shift();
      for (i = 0; i < st.buy.length; i++) for (j = 0; j < st.buy[i][1]; j++) if (!buy(1, st.buy[i][0])) break;
      ai.wave.gold -= planCost(st.buy);
      if (!ai.steps.length) ai.wave = null;
    }
    ai.think -= dt;
    if (ai.think > 0) return;
    var T = CONFIG.AI.think;
    ai.think = T[0] + Math.random() * (T[1] - T[0]);
    // Burg zerstört (gilt für alle Gegner): sobald das Gold reicht, wird sie mit dem Mauer-Knopf wieder aufgebaut (nicht doppelt, solange Arbeiter dran sind)
    if (bases[1].down && clock - bases[1].downAt >= CONFIG.AI.castleWait && gold[1] >= CONFIG.units.wall.cost && !units.some(function (w) { return w.team === 1 && w.castle && w.hp > 0; })) buy(1, 'wall');
    if (clock < ai.attackLock) return; // nach Beginn des Angriffs lockSecs Sekunden lang nichts kaufen, ausser den Schritten des Angriffs
    var free = ai.defCool <= 0;

    // Verteidigung: wird etwas angegriffen, so viele Einheiten wie du hast plus defPlus (erlaubte Einheiten), danach noOutput Sekunden keine Einheiten
    // (gilt für alle Gegner) auch ohne Angriff: stehen mindestens 2 gegnerische Einheiten in seiner Hälfte und hat der Gegner insgesamt mehr Einheiten (ohne Turmbesatzung) als er (mit Turmbesatzung)
    var invaded = countEnemiesInMyHalf() >= 2 && countFighters(0, true) > countFighters(1, false);
    // Spezialregel (alle Gegner): hat der Gegner auf dem Feld (nicht auf Türmen) nur noch Katapulte und wird irgendetwas von ihnen angegriffen, wird in jedem Fall verteidigt
    var catOnly = false;
    if (countFighters(0, true) >= 1 && (isAttacked() || units.some(function (o) { return o.team === 1 && o.hp > 0 && !CONFIG.units[o.type].worker && clock - o.lastHit <= CONFIG.AI.attackMemory; }))) {
      catOnly = units.every(function (e) { return e.team !== 0 || e.hp <= 0 || e.tower || e.dig || CONFIG.units[e.type].passive || CONFIG.units[e.type].worker || CONFIG.units[e.type].king || e.type === 'catapult'; });
    }
    var defHold = false; // Verteidigung geht vor: solange sie gebraucht wird, kein Gold für die Neubesetzung der Türme
    if (free && ((isAttacked() && !enemyIsWeak()) || invaded || catOnly)) {
      var nDef = Math.max(0, countFighters(0, true) - countTowerUnits(1) + R.defPlus), tDef, nBought = 0;
      var pool = nDef >= R.defMage || (R.defMageAtt && countFighters(0, true) >= R.defMageAtt) ? R.defPool.concat(['mage']) : R.defPool;
      if (R.defDiggerAt) { // Tunnelgräber nur, wenn du genug Bogenschützen und Magier hast
        var shooters = 0;
        for (i = 0; i < units.length; i++) if (units[i].team === 0 && units[i].hp > 0 && !units[i].dig && (units[i].type === 'archer' || units[i].type === 'mage')) shooters++;
        if (shooters >= R.defDiggerAt) pool = pool.concat(['digger']);
      }
      if (catOnly) nDef = Math.max(nDef, 1); // mindestens eine Einheit
      var iStart = 0;
      if (R.defDiggerVsCatapult && units.some(function (c) { return c.team === 0 && c.type === 'catapult' && c.hp > 0 && !c.tower; })) { // der Gegner hat ein Katapult auf dem Feld: mindestens 1 Tunnelgräber gehört zur Verteidigung
        nDef = Math.max(nDef, R.defDiggerVsCatapult);
        while (iStart < R.defDiggerVsCatapult && spendable() >= CONFIG.units.digger.cost && buy(1, 'digger')) { nBought++; iStart++; }
      }
      for (i = iStart; i < nDef && (tDef = randomAffordable(pool, spendable())); i += defW(tDef)) { if (!buy(1, tDef)) break; nBought++; } // eigene Belagerungsmaschinen zählen mehrfach
      defHold = nDef > 0;
      if (nBought) { ai.defCool = R.noOutput; free = false; } // die Sperre gilt nur, wenn wirklich verteidigt wurde
    }
    // Mauer (keine Einheit, die Sperre gilt hier nicht): ab wallGold Gold, nur ohne Gegner in seiner Hälfte; repariert wird nie, nur neu gebaut
    var aw = walls[1];
    if (!bases[1].down && (!aw || !aw.built || aw.hp <= R.repairAt || wallWeak(aw) || (R.wallStage && (aw.stage || 0) < R.wallStage)) && spendable() >= R.wallGold && countFighters(0) >= R.wallUnits && !(R.wallClear && enemyInMyHalf()) && !units.some(function (w) { return w.team === 1 && w.type === 'worker' && w.hp > 0; })) buy(1, 'wall');
    if (!free) return;

    // Wirtschaft: keine Bauern, solange du mehr Kampfeinheiten hast
    var guard = 0;
    while (guard++ < 3 && countFarmers(1) < R.farmers && countFighters(0, true) <= countFighters(1) && spendable() >= CONFIG.units.farmer.cost && findSpot(1, null)) buy(1, 'farmer');
    // Türme (gilt für alle Gegner): jeder freie Platz wird besetzt (nach einem Kauf 20 Sekunden Pause), mit Bogenschützen und Katapulten (nur, wenn die Mauer Türme hat)
    if (aw && aw.built && aw.sl && aw.tlv && ai.towerCool <= 0 && !defHold) {
      var need = {}, tl = aw.tlv.list, tt, tc, sty;
      for (tt = 0; tt < tl.length; tt++) for (tc = 0; tc < tl[tt].slots.length; tc++) if (slotFree(aw, tt + '_' + tc)) {
        sty = tl[tt].slots[tc].types[0]; if (sty === 'catapult' && R.towerSiege) sty = R.towerSiege; // Belagerungsplatz: z. B. Baron mit Trebuchet
        need[sty] = (need[sty] || 0) + 1;
      }
      [R.towerSiege || 'catapult', 'archer'].forEach(function (ty) {
        for (var nn = 0; nn < (need[ty] || 0) && spendable() >= CONFIG.units[ty].cost; nn++) if (buy(1, ty)) ai.towerCool = CONFIG.AI.towerCool; else break; // danach 20 Sekunden Pause
      });
    }
    // Jagd: hast du mehr Bauern, kommt alle huntEvery Sekunden der Jagdtrupp
    if (ai.leadT >= R.huntLead && ai.huntCool <= 0 && spendable() >= planCost(R.hunt) + (R.huntLater ? R.huntLater.reduce(function (a, h) { return a + planCost(h.buy); }, 0) : 0)) {
      for (i = 0; i < R.hunt.length; i++) for (j = 0; j < R.hunt[i][1]; j++) buy(1, R.hunt[i][0]);
      if (R.huntLater) R.huntLater.forEach(function (h) { ai.queue.push({ at: clock + h.after, buy: h.buy }); });
      ai.huntCool = R.huntEvery;
    }
    // Angriff: ab attackGold Gold; der erste Schritt sofort, die weiteren pünktlich danach (ihr Gold bleibt zurückgelegt)
    if (!ai.wave && spendable() >= R.attackGold) {
      var first = R.attack[0], later = R.attack.slice(1);
      for (i = 0; i < first.buy.length; i++) for (j = 0; j < first.buy[i][1]; j++) if (!buy(1, first.buy[i][0])) break;
      ai.attackLock = clock + R.lockSecs;
      ai.steps = later.map(function (x) { return { at: clock + x.after, buy: x.buy }; });
      ai.wave = ai.steps.length ? { at: 0, gold: later.reduce(function (a, x) { return a + planCost(x.buy); }, 0) } : null;
    }
  }


  // Der Computer entscheidet nur, was er wann kauft, seine Einheiten verhalten sich exakt wie deine.
  function aiUpdate(dt) {
    botUpdate(dt);
  }

