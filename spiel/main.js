  // ---------- Start ----------
  readPalette();
  buildBackdrop();
  drawIcons();
  reset();

  var last = 0;
  function frame(ts) {
    var rdt = Math.min(0.25, (ts - last) / 1000 || 0), dt = Math.min(0.05, rdt);
    last = ts;
    if (intro.t > 0 && state === 'playing') { // Namen zu Beginn: Spiel steht noch
      intro.t = Math.max(0, intro.t - rdt); updateEffects(dt); render(); zeichneIntro(); syncUi(); syncFsBar();
      requestAnimationFrame(frame); return;
    }
    if (pvp.on && state === 'playing') { for (var dk = 0; dk < deploys.length; dk++) deploys[dk].t += rdt; pvpFrame(rdt); updateEffects(dt); }
    else if (state === 'playing' && bl.on) { blFrame(rdt); updateEffects(dt); } // Bot-Partie in festen Schritten (wie online)
    else if (state === 'playing') {
      for (var dj = 0; dj < deploys.length; dj++) { // offline: fällige Käufe ausführen (Echtzeit, unabhängig vom Tutorial-Zeitlupentempo)
        var dpl = deploys[dj]; dpl.t += rdt;
        if (dpl.t >= DEPLOY) { deploys.splice(dj, 1); dj--; buy(0, dpl.type); }
      }
      var gdt = dt * tutScale(); // im Tutorial läuft das Spiel bei Hinweisen und Kaufschritten stark verlangsamt
      update(gdt); updateEffects(gdt);
      if (tut.on) tutTick(gdt);
    }
    else if (state === 'over') updateEffects(dt);
    if (bl.live && state === 'over') blStop(gaveUp ? 'aufgegeben' : 'fertig');
    if ((pvp.on || bl.on) && state === 'playing') pvpRender(); else render();
    syncUi(); syncFsBar();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
