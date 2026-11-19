  // Bot-Datenbank (Teil 2): alle Bots mit Name, König (Optik aus KOENIGE, auch Bild auf der Story-Karte), Story-Platz und Logik.
  // platz = Reihenfolge im Story-Modus (1 = zuerst; null = noch nicht im Spiel); karte = Lage des Kreises auf der Story-Karte in Prozent;
  // logik = Schlüssel in CONFIG.BOTS (daten/bots.js) mit dem ganzen Verhalten; null = noch keine Logik (Bot ist dann nicht im Spiel).
  // Gegen einen Bot kämpft man im Story-Modus, sobald der Bot mit dem Platz davor besiegt ist. Ein Sieg schaltet seinen König frei.
  var BOT_DB = [
    { id: 'bandit', name: 'Der Bandit', koenig: 'bandit', platz: 1, karte: { x: 13, y: 73 }, logik: 'bauern' },
    { id: 'prinz', name: 'Kleiner Prinz', koenig: 'prinz', platz: 2, karte: { x: 34, y: 47 }, logik: 'prinz' },
    { id: 'feldherr', name: 'Der Feldherr', koenig: 'feldherr', platz: 3, karte: { x: 56, y: 69 }, logik: 'feldherr' },
    { id: 'rabenstein', name: 'Baron Rabenstein', koenig: 'rabenstein', platz: 4, karte: { x: 80, y: 40 }, logik: 'baron' },
    // Anfänger-Bots (Vorschlag: vor dem Banditen), noch ohne Logik
    { id: 'strohkoenig', name: 'Bauer Hannes, der Strohkönig', koenig: 'strohkoenig', platz: null, karte: null, logik: null },
    { id: 'tollpatsch', name: 'Knappe Tollpatsch', koenig: 'tollpatsch', platz: null, karte: null, logik: null },
    // weitere Bots, noch ohne Logik
    { id: 'raubritterkuno', name: 'Raubritter Kuno', koenig: 'raubritterkuno', platz: null, karte: null, logik: null },
    { id: 'graefineisenhand', name: 'Gräfin Eisenhand', koenig: 'graefineisenhand', platz: null, karte: null, logik: null },
    { id: 'baerenfuerst', name: 'Der Bärenfürst', koenig: 'baerenfuerst', platz: null, karte: null, logik: null },
    { id: 'herzognebelwald', name: 'Herzog Nebelwald', koenig: 'herzognebelwald', platz: null, karte: null, logik: null },
    { id: 'sumpfhexe', name: 'Die Sumpfhexe', koenig: 'sumpfhexe', platz: null, karte: null, logik: null },
    { id: 'koenigrotbart', name: 'König Rotbart', koenig: 'koenigrotbart', platz: null, karte: null, logik: null },
    { id: 'markgrafmoorstein', name: 'Markgraf Moorstein', koenig: 'markgrafmoorstein', platz: null, karte: null, logik: null },
    { id: 'wolfsjarl', name: 'Der Wolfsjarl', koenig: 'wolfsjarl', platz: null, karte: null, logik: null },
    { id: 'kalifsandsturm', name: 'Kalif Sandsturm', koenig: 'kalifsandsturm', platz: null, karte: null, logik: null },
    { id: 'fuerstbischofgerold', name: 'Fürstbischof Gerold', koenig: 'fuerstbischofgerold', platz: null, karte: null, logik: null },
    { id: 'schwarzeritter', name: 'Der Schwarze Ritter', koenig: 'schwarzeritter', platz: null, karte: null, logik: null },
    { id: 'zarinfrostmantel', name: 'Zarin Frostmantel', koenig: 'zarinfrostmantel', platz: null, karte: null, logik: null },
    { id: 'junkerhabgier', name: 'Junker Habgier', koenig: 'junkerhabgier', platz: null, karte: null, logik: null },
    { id: 'vogtgrimmbart', name: 'Vogt Grimmbart', koenig: 'vogtgrimmbart', platz: null, karte: null, logik: null },
    { id: 'kaiseringoldfeder', name: 'Kaiserin Goldfeder', koenig: 'kaiseringoldfeder', platz: null, karte: null, logik: null },
    { id: 'pilzkoenig', name: 'Der Pilzkönig', koenig: 'pilzkoenig', platz: null, karte: null, logik: null },
    { id: 'admiralsalzwind', name: 'Admiral Salzwind', koenig: 'admiralsalzwind', platz: null, karte: null, logik: null },
    { id: 'khansteppensturm', name: 'Khan Steppensturm', koenig: 'khansteppensturm', platz: null, karte: null, logik: null },
    { id: 'drachenkoenig', name: 'Der Drachenkönig', koenig: 'drachenkoenig', platz: null, karte: null, logik: null },
    { id: 'schattenkoenigin', name: 'Die Schattenkönigin', koenig: 'schattenkoenigin', platz: null, karte: null, logik: null }
  ];
  // Story-Modus: alle Bots mit Platz und Logik, nach Platz sortiert (bot = Logik-Schlüssel, x/y = Kartenlage)
  var STORY = BOT_DB.filter(function (b) { return b.platz && b.logik; }).sort(function (a, b) { return a.platz - b.platz; })
    .map(function (b) { return { id: b.id, bot: b.logik, name: b.name, koenig: b.koenig, x: b.karte.x, y: b.karte.y }; });
  // Name und König eines Bots aus seinem Logik-Schlüssel (für Sandbox, Tutorial usw.)
  function botEintrag(logik) { for (var i = 0; i < BOT_DB.length; i++) if (BOT_DB[i].logik === logik) return BOT_DB[i]; return { name: 'Gegner', koenig: 'standard' }; }
