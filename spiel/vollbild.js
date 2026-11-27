  // ---------- Vollbild (früher Handymodus) ----------
  // Querformat: Spielfeld so gross wie möglich, Einheitenknöpfe in einer Reihe darunter, Gold oben links, oben rechts ✕ zum Verlassen.
  // Wer das Vollbild verlässt (✕ oder Zurück-Geste), sieht wieder Pause, Aufgeben usw.; ein Offline-Spiel wird dabei pausiert.
  var phoneBtn = $('phoneBtn');
  function setPhone(on, goFull) {
    document.documentElement.classList.toggle('phone', on);
    phoneBtn.textContent = on ? 'Normal' : 'Vollbild';
    phoneBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    try {
      if (goFull && on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(function () {});
      else if (goFull && !on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    } catch (err) {}
    try { window.scrollTo(0, 0); } catch (err) {}
  }
  // Handy quer (Touch, wenig Höhe): automatisch das kompakte Vollbild-Layout, auch ohne Knopf (iPhone-Safari kennt kein echtes Vollbild).
  // Wer es mit ✕ verlässt, behält bis zum Neuladen die normale Ansicht; hochkant gibt es wieder die normale Ansicht.
  var autoPhone = { on: false, off: false };
  var landMq = window.matchMedia ? window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 520px)') : null;
  function checkAutoPhone() {
    if (!landMq) return;
    var isPhone = document.documentElement.classList.contains('phone');
    if (landMq.matches && !isPhone && !autoPhone.off) { autoPhone.on = true; setPhone(true, false); }
    else if (!landMq.matches && isPhone && autoPhone.on) { autoPhone.on = false; setPhone(false, false); }
  }
  try { landMq.addEventListener('change', checkAutoPhone); } catch (err) { try { landMq.addListener(checkAutoPhone); } catch (e2) {} }
  phoneBtn.addEventListener('click', function (e) {
    autoPhone.on = false;
    setPhone(!document.documentElement.classList.contains('phone'), true);
    if (e.detail > 0) phoneBtn.blur();
  });
  $('fsExit').addEventListener('click', function () {
    autoPhone.on = false; autoPhone.off = true;
    if (state === 'playing' && !pvp.on) setPaused(true);
    setPhone(false, true);
  });
  // Knopf ⛶ oben rechts im Vollbild-Layout (auch automatisch im Querformat): schaltet das echte Vollbild des Browsers ein (Android/Chrome).
  // iPhone-Safari kennt kein echtes Vollbild für Webseiten: dort zeigt der Knopf den Hinweis «Zum Home-Bildschirm». Als Home-Bildschirm-App ausgeblendet.
  var fsFull = $('fsFull'), fsHint = $('fsHint'), deEl = document.documentElement;
  var isIPhone = /iPhone|iPod/.test(navigator.userAgent || '');
  function fsActive() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
  // Installierte App: das Manifest startet sie mit display «fullscreen» (Android), am iPhone/PC «standalone».
  // iPhone/iPad: nur navigator.standalone ist zuverlässig (Safari meldet display-mode teils auch im normalen Browser -> Knopf «App installieren» fehlte).
  var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent || '') || (/Macintosh/.test(navigator.userAgent || '') && navigator.maxTouchPoints > 1);
  function fsStandalone() { try { if (isIOS) return window.navigator.standalone === true; return !!(window.navigator.standalone || (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches))); } catch (err) { return false; } }
  deEl.classList.toggle('app', fsStandalone()); // installierte App: kein ✕ (Vollbild verlassen) und kein ⛶, dafür mehr Platz oben rechts im Menü
  function fsCan() { return !!(deEl.requestFullscreen || deEl.webkitRequestFullscreen); }
  function updFsFull() { var hide = fsActive() || fsStandalone() || (!fsCan() && !isIPhone); if (fsFull.hidden !== hide) fsFull.hidden = hide; if (hide) fsHint.hidden = true; }
  fsFull.addEventListener('click', function () {
    fsFull.blur();
    if (fsCan()) {
      try {
        var pr = deEl.requestFullscreen ? deEl.requestFullscreen() : deEl.webkitRequestFullscreen();
        if (pr && pr.then) pr.then(function () { try { screen.orientation.lock('landscape').catch(function () {}); } catch (e2) {} }).catch(function () { if (isIPhone) fsHint.hidden = false; });
      } catch (err) { if (isIPhone) fsHint.hidden = false; }
    } else { fsHint.hidden = !fsHint.hidden; if (!fsHint.hidden) setTimeout(function () { fsHint.hidden = true; }, 9000); }
  });
  fsHint.addEventListener('click', function () { fsHint.hidden = true; });
  function onFsChange() {
    updFsFull();
    if (!fsActive() && deEl.classList.contains('phone') && !autoPhone.on) { // Zurück-Geste beendet das Vollbild (im automatischen Querformat bleibt das Layout)
      if (state === 'playing' && !pvp.on) setPaused(true);
      setPhone(false, false);
    }
  }
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);
  updFsFull();
  // Pause und Aufgeben auch im Vollbild (oben rechts): sie lösen die normalen Knöpfe aus und zeigen deren Zustand
  var fsPause = $('fsPause'), fsGive = $('fsGive');
  fsPause.addEventListener('click', function () { pauseBtn.click(); fsPause.blur(); });
  fsGive.addEventListener('click', function () { giveBtn.click(); fsGive.blur(); });
  var fsTut = $('fsTut');
  fsTut.addEventListener('click', function () { $('tutEnd').click(); });
  function syncFsBar() {
    if (fsPause.textContent !== pauseBtn.textContent) fsPause.textContent = pauseBtn.textContent;
    if (fsPause.hidden !== pauseBtn.hidden) fsPause.hidden = pauseBtn.hidden;
    var pOff = !(state === 'playing' || state === 'paused');
    if (fsPause.disabled !== pOff) fsPause.disabled = pOff;
    if (fsGive.textContent !== giveBtn.textContent) fsGive.textContent = giveBtn.textContent;
    if (fsGive.disabled !== giveBtn.disabled) fsGive.disabled = giveBtn.disabled;
    fsGive.classList.toggle('armed', giveBtn.classList.contains('armed'));
    if (fsTut.hidden !== tutPanelEl.hidden) fsTut.hidden = tutPanelEl.hidden;
  }
  // Beim Laden immer im normalen Modus starten (echtes Vollbild geht nur nach einem Tippen); alter gespeicherter Handymodus wird gelöscht
  try { localStorage.removeItem('kasernenkrieg-phone'); } catch (err) {}
  checkAutoPhone();

