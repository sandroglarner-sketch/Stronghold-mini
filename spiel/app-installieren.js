  // ---------- Knopf «App installieren» (nur online, nicht in der installierten App) ----------
  // Chrome/Edge/Android: der Browser meldet «beforeinstallprompt» -> ein Klick öffnet direkt seinen Installieren-Dialog.
  // Sonst (iPhone/iPad, Safari, Firefox …): Fenster mit der passenden Anleitung für dieses Gerät.
  var appBtn = $('appBtn'), appDlg = $('appDlg'), appWarten = null;
  function appAnleitung() {
    var ua = navigator.userAgent || '';
    var ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    var android = /Android/.test(ua), firefox = /Firefox|FxiOS/.test(ua);
    var safariMac = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
    if (ios) return { text: 'So kommt das Spiel auf deinen Home-Bildschirm:', schritte: ['Auf <b>Teilen</b> tippen (Quadrat mit Pfeil nach oben □↑, unten oder oben in der Leiste).', 'Nach unten scrollen und <b>«Zum Home-Bildschirm»</b> wählen.', 'Den Schalter <b>«Als Web-App öffnen»</b> einschalten (falls vorhanden), dann <b>«Hinzufügen»</b>.', 'Das Spiel künftig über das neue Symbol starten: es öffnet sich ohne Safari-Leisten im Vollbild. Ein altes Symbol, das noch Safari öffnet, vorher löschen.'] };
    if (android) return { text: 'So kommt das Spiel auf deinen Startbildschirm:', schritte: ['Oben rechts das Browser-Menü <b>⋮</b> öffnen.', 'Auf <b>«App installieren»</b> oder <b>«Zum Startbildschirm hinzufügen»</b> tippen' + (firefox ? ' (Firefox: <b>«Installieren»</b>)' : '') + '.', 'Bestätigen und das Spiel künftig über das neue Symbol starten.'] };
    if (safariMac) return { text: 'In Safari am Mac:', schritte: ['Oben im Menü <b>Ablage</b> öffnen.', '<b>«Zum Dock hinzufügen …»</b> wählen und bestätigen.'] };
    if (firefox) return { text: 'Firefox am Computer kann keine Apps installieren.', schritte: ['Die Seite in <b>Chrome</b> oder <b>Edge</b> öffnen.', 'Dort rechts in der Adressleiste auf das <b>Installieren-Symbol</b> klicken.'] };
    return { text: 'So installierst du das Spiel auf diesem Computer:', schritte: ['Rechts in der Adressleiste auf das <b>Installieren-Symbol</b> klicken (Bildschirm mit Pfeil).', 'Oder im Browser-Menü <b>⋮</b> → <b>«Streamen, speichern und teilen»</b> → <b>«Seite als App installieren»</b>.', 'Bestätigen: das Spiel öffnet sich dann in einem eigenen Fenster.'] };
  }
  function appZeigen(an) {
    if (an) {
      var a = appAnleitung();
      $('appText').textContent = a.text;
      $('appSchritte').innerHTML = a.schritte.map(function (s) { return '<li>' + s + '</li>'; }).join('');
    }
    appDlg.hidden = !an;
  }
  function appKnopf() { appBtn.hidden = !ONLINE || fsStandalone(); }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); appWarten = e; appKnopf(); });
  window.addEventListener('appinstalled', function () { appWarten = null; appBtn.hidden = true; appZeigen(false); });
  appBtn.addEventListener('click', function () {
    appBtn.blur();
    if (appWarten) {
      var ev = appWarten; appWarten = null; // ein Ereignis kann nur einmal benutzt werden; der Browser schickt bei Bedarf ein neues
      try { ev.prompt(); ev.userChoice.then(function (w) { if (w && w.outcome === 'accepted') appBtn.hidden = true; }).catch(function () {}); } catch (err) { appZeigen(true); }
    } else appZeigen(true);
  });
  $('appOk').addEventListener('click', function () { appZeigen(false); });
  $('appZu').addEventListener('click', function () { appZeigen(false); });
  appKnopf();
