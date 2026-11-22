  // ---------- Computergegner ----------
  // Alle Stufen spielen dieselbe Strategie, sie unterscheiden sich nur im Gold pro Auszahlung.
  // Der Computer entscheidet nur, was er wann kauft, seine Einheiten verhalten sich exakt wie deine.
  var ai = { think: 1.2, leadT: 0, defCool: 0, huntCool: 0, towerCool: 0, attackLock: 0, wave: null, queue: [], steps: [] };
  var level = 'normal';
  var botType = 'bauern';
  var botEl = $('botType');
  botEl.addEventListener('change', function () { botType = CONFIG.BOTS[botEl.value] ? botEl.value : 'bauern'; aiRoll(); });

  // Bots würfeln mit simRand (fester Startwert je Partie), damit Zuschauer die Partie samt Bot exakt nachrechnen können
  function randInt(a, b) { return a + Math.floor(simRand() * (b - a + 1)); }
  function pick(list) { return list[Math.floor(simRand() * list.length)]; }
  function randomAffordable(types, budget) {
    var ok = types.filter(function (t) { return CONFIG.units[t].cost <= budget; });
    return ok.length ? pick(ok) : null;
  }
  function countFarmers(team, jagd) { // jagd: eine Karawane zählt wie 2 Bauern, ein Holzfäller wie 1 (nur für den Jagd-Vergleich, auf beiden Seiten)
    var n = 0;
    for (var i = 0; i < units.length; i++) {
      if (units[i].team !== team || units[i].hp <= 0) continue;
      if (units[i].type === 'farmer') n++; else if (jagd && units[i].type === 'karawane') n += 2; else if (jagd && units[i].type === 'holzfaeller') n++; // Jagd: Holzfäller zählt wie 1 Bauer
    }
    return n;
  }
  function countType(team, type) { var n = 0; for (var i = 0; i < units.length; i++) if (units[i].team === team && units[i].type === type && units[i].hp > 0) n++; return n; }
  // Wie oft ein Gebäude schon gekauft ist: Bau und Ausbaustufen (auch im Bau), bei der Kirche zusätzlich jedes Gebet (fertig oder laufend); zerstört = 0
  function gebKaeufe(team, type) {
    var g = meinGebaeude(team, type); if (!g) return 0;
    if (CONFIG.units[type].gebaeude.gebet) return 1 + (g.gunst || 0) + (g.gebetT > 0 ? 1 : 0);
    return g.bau ? g.ziel : g.stufe;
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
  // Gilt für alle Gegner: fehlen der Mauer mehr als wallRepairLoss (50) Leben bis zum Höchstwert der angestrebten Stufe (50, 100, 150, 200, 250), wird sie repariert
  function wallWeak(w, ziel) {
    var st = Math.max(w && w.stage || 0, ziel || 1);
    return !!(w && w.built && WALL.stages[st - 1] - w.hp > CONFIG.AI.wallRepairLoss);
  }
  // Wirtschaftssperre (22.11., alle Bots): steht eine gegnerische Einheit über der Spielfeldmitte (in seiner Hälfte), kauft er keine Bauern, Karawanen, Holzfäller.
  // Zählt: sichtbare Einheiten des Spielers ausser Wirtschaft/Gebäuden (passive), Arbeitern, König und Tunnelgräbern unter der Erde.
  function gegnerUeberMitte() {
    for (var i = 0; i < units.length; i++) {
      var u = units[i], ud = CONFIG.units[u.type];
      if (u.team === 0 && u.hp > 0 && !u.dig && !ud.passive && !ud.worker && !ud.king && u.x > W / 2) return true;
    }
    return false;
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
  // Bots, Verteidigung (alle Bots, für den Gegner und die eigenen Einheiten): jede Einheit zählt mit ihrem Stärkewert (CONFIG.units[..].staerke, sonst 1)
  function defW(type) { var st = CONFIG.units[type] && CONFIG.units[type].staerke; return st === undefined ? 1 : st; }
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
      if (u.team === team && u.hp > 0 && !CONFIG.units[u.type].passive && !CONFIG.units[u.type].worker && !CONFIG.units[u.type].king && !(team === 0 && u.dig) && !(noTower && u.tower)) n += defW(u.type); // Stärkewert: Kampfeinheiten 1, Belagerungsmaschinen 2 bis 8
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

  // ---------- Gegner «Der Bandit» ----------
  function planCost(list) { return list.reduce(function (a, b) { return a + CONFIG.units[b[0]].cost * b[1]; }, 0); }
  function botUpdate(dt) {
    var R = CONFIG.BOTS[botType], i, j, st;
    ai.defCool = Math.max(0, ai.defCool - dt);   // Sperre für Einheitenkäufe nach einer Verteidigung
    ai.huntCool = Math.max(0, ai.huntCool - dt);
    ai.towerCool = Math.max(0, ai.towerCool - dt);
    if (countFarmers(0, true) > countFarmers(1, true)) ai.leadT += dt; else ai.leadT = 0; // so lange hast du schon mehr Bauern
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
    ai.think = T[0] + simRand() * (T[1] - T[0]);
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
      var pool = R.defPool; // Eismagier nur, wenn er in defPool steht (defMage/defMageAtt gibt es seit 21.11. nicht mehr)
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
      var dmZ = {}; // defMax: höchstens so viele je Einheit pro Verteidigung (z. B. { catapult: 1 })
      for (i = iStart; i < nDef && (tDef = randomAffordable(R.defMax ? pool.filter(function (t) { return !(R.defMax[t] !== undefined && (dmZ[t] || 0) >= R.defMax[t]); }) : pool, spendable())); i += defW(tDef)) { if (!buy(1, tDef)) break; nBought++; dmZ[tDef] = (dmZ[tDef] || 0) + 1; } // eigene Belagerungsmaschinen zählen mehrfach
      defHold = nDef > 0;
      if (nBought) { ai.defCool = R.noOutput; free = false; } // die Sperre gilt nur, wenn wirklich verteidigt wurde
    }
    // Mauer (keine Einheit, die Sperre gilt hier nicht): ab wallGold Gold, nur ohne Gegner in seiner Hälfte; repariert wird nie, nur neu gebaut
    var aw = walls[1];
    if (R.wallStage !== 0 && !bases[1].down && (!aw || !aw.built || wallWeak(aw, R.wallStage) || (R.wallStage > 1 && (aw.stage || 0) < R.wallStage)) && spendable() >= R.wallGold && countFighters(0) >= R.wallUnits && !(R.wallClear && enemyInMyHalf()) && !units.some(function (w) { return w.team === 1 && w.type === 'worker' && w.hp > 0; })) buy(1, 'wall');
    // Gebäude (keine Einheit, die Sperre gilt nicht): R.gebaeude = Liste von Käufen { type, gold } in Reihenfolge; die n-te Zeile eines Gebäudes ist sein n-ter Kauf
    // (1. = Bau, 2. = Stufe 2 …, bei der Kirche jede weitere Zeile = ein Gebet). Gekauft wird der nächste fällige Kauf, sobald er so viel Gold frei hat; wird ein Gebäude zerstört, baut er es wieder.
    if (R.gebaeude && R.gebaeude.length && !bases[1].down && !enemyInMyHalf()) { // nur ohne gegnerische Einheit in seiner Spielfeldhälfte
      var gn = {}, gl = R.gebaeude.slice(), gz = {};
      R.gebaeude.forEach(function (x) { gz[x.type] = x; }); // letzte Zeile je Gebäude
      Object.keys(gz).forEach(function (t) { // immer voll ausbauen: fehlende Stufen kommen hinten dazu (mit dem Gold der letzten Zeile; nicht bei der Kirche)
        var G = CONFIG.units[t] && CONFIG.units[t].gebaeude; if (!G || G.gebet) return;
        var n = R.gebaeude.filter(function (x) { return x.type === t; }).length, bis = R.gebMax && R.gebMax[t] ? Math.min(R.gebMax[t], G.stufen.length) : G.stufen.length; // gebMax { typ: höchste Stufe }
        for (; n < bis; n++) gl.push({ type: t, gold: gz[t].gold });
      });
      for (i = 0; i < gl.length; i++) {
        var ge = gl[i], gk = gn[ge.type] = (gn[ge.type] || 0) + 1;
        if (R.gebMax && R.gebMax[ge.type] && gk > R.gebMax[ge.type] && !CONFIG.units[ge.type].gebaeude.gebet) continue; // nicht über die erlaubte Stufe
        if (!CONFIG.units[ge.type] || gk !== gebKaeufe(1, ge.type) + 1) continue;
        if (spendable() >= Math.max(ge.gold || 0, preisVon(1, ge.type))) { buy(1, ge.type); break; }
      }
    }
    // Gebete: steht seine Kirche, lässt er einen Priester beten, sobald er gebetAb Gold frei hat (preisVon ist Infinity, solange gerade jemand betet oder die Gunst voll ist)
    if (R.gebetAb && gebKaeufe(1, 'kirche') >= 1 && spendable() >= Math.max(R.gebetAb, preisVon(1, 'kirche'))) buy(1, 'kirche');
    if (!free) return;

    // Wirtschaft (22.11.): keine Bauern, Karawanen, Holzfäller, solange eine gegnerische Einheit über der Mitte steht (vorher: solange du mehr Kampfeinheiten hattest)
    var wirtschaft = !gegnerUeberMitte(), guard = 0;
    while (guard++ < 3 && clock >= (R.bauernAb || 0) /* bauernAb = erst ab dieser Sekunde Bauern */ && countFarmers(1) < R.farmers && /* genau so viele Bauern wie angegeben (Karawanen zählen hier nicht) */ wirtschaft && spendable() >= CONFIG.units.farmer.cost && findSpot(1, null)) buy(1, 'farmer');
    // Karawanen: so viele strebt er an (R.karawanen), gleiche Bedingung wie bei den Bauern
    guard = 0;
    while (guard++ < 3 && countType(1, 'karawane') < (R.karawanen || 0) && wirtschaft && spendable() >= preisVon(1, 'karawane') && buy(1, 'karawane')) { /* weiter */ }
    // Holzfäller: so viele strebt er an (R.holzfaeller), gleiche Bedingung wie bei den Bauern
    guard = 0;
    while (guard++ < 3 && clock < 180 /* ab 180 s (3 min) Spielzeit keine neuen Holzfäller mehr (alle Bots; 22.11., vorher 120 s) */ && countType(1, 'holzfaeller') < (R.holzfaeller || 0) && wirtschaft && spendable() >= preisVon(1, 'holzfaeller') && buy(1, 'holzfaeller')) { /* weiter */ }
    // Türme (gilt für alle Gegner): ein freier Platz wird mit der angestrebten Turmbesatzung R.turm besetzt (Gesamtzahl je Einheit auf allen Türmen); was schon oben steht, zählt mit,
    // auch Einheiten, die von selbst hinaufgestiegen sind (die bleiben). Nach einem Kauf 20 Sekunden Pause. Ohne R.turm (alte Bots): Schützenplätze Bogenschützen, Belagerungsplätze Katapult/towerSiege.
    if (aw && aw.built && aw.sl && aw.tlv && ai.towerCool <= 0 && !defHold) {
      var tl = aw.tlv.list, tt, tc, ziel = R.turm, ist = {}, kauf = [], sk;
      for (sk in aw.sl) { var so = aw.sl[sk]; if (so && so.hp > 0 && so.gar && so.gar.key === sk) ist[so.type] = (ist[so.type] || 0) + 1; }
      for (tt = 0; tt < tl.length; tt++) for (tc = 0; tc < tl[tt].slots.length; tc++) if (slotFree(aw, tt + '_' + tc)) {
        var sTypes = tl[tt].slots[tc].types, wahl = null;
        if (ziel) { for (var zt in ziel) if (sTypes.indexOf(zt) >= 0 && (ist[zt] || 0) < ziel[zt]) { wahl = zt; break; } }
        else { wahl = sTypes[0]; if (wahl === 'catapult' && R.towerSiege) wahl = R.towerSiege; }
        if (wahl) { ist[wahl] = (ist[wahl] || 0) + 1; kauf.push(wahl); }
      }
      for (var ki = 0; ki < kauf.length && spendable() >= CONFIG.units[kauf[ki]].cost; ki++) if (buy(1, kauf[ki])) ai.towerCool = CONFIG.AI.towerCool; else break; // danach 20 Sekunden Pause
    }
    // Jagd: hast du mehr Bauern, kommt alle huntEvery Sekunden der Jagdtrupp
    if (ai.leadT >= R.huntLead && ai.huntCool <= 0 && spendable() >= planCost(R.hunt) + (R.huntLater ? R.huntLater.reduce(function (a, h) { return a + planCost(h.buy); }, 0) : 0)) {
      for (i = 0; i < R.hunt.length; i++) for (j = 0; j < R.hunt[i][1]; j++) buy(1, R.hunt[i][0]);
      if (R.huntLater) R.huntLater.forEach(function (h) { ai.queue.push({ at: clock + h.after, buy: h.buy }); });
      ai.huntCool = R.huntEvery;
    }
    // Angriff: ab attackGold Gold; der erste Schritt sofort, die weiteren pünktlich danach (ihr Gold bleibt zurückgelegt)
    if (!ai.wave && !R.keinAngriff && spendable() >= R.attackGold) { // keinAngriff: Bot greift nie an (nur Verteidigung und Jagd)
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

