  // Bot-Datenbank (Teil 2): alle Bots mit Name, König (Optik aus KOENIGE, auch Bild auf der Story-Karte), Story-Platz und Logik.
  // platz = Reihenfolge im Story-Modus (1 = zuerst; null = noch nicht im Spiel); die Lage auf der Story-Karte ergibt sich von selbst (4 Gegner pro Seite, dann wird geblättert);
  // logik = Schlüssel in CONFIG.BOTS (daten/bots.js) mit dem ganzen Verhalten; null = noch keine Logik (Bot ist dann nicht im Spiel).
  // Gegen einen Bot kämpft man im Story-Modus, sobald der Bot mit dem Platz davor besiegt ist. Ein Sieg schaltet seinen König frei.
  var BOT_DB = [
    { id: 'bandit2', name: 'Der Bandit', koenig: 'bandit', platz: null, logik: 'bauern', nr: 10 }, // 20.11. 14:11 zurückgesetzt: neue id und nr (alte id 'bandit' / nr 1 nie wieder verwenden), alte Siege zählen nicht mehr
    { id: 'prinz', name: 'Kleiner Prinz', koenig: 'prinz', platz: 3, logik: 'prinz', nr: 2 },
    { id: 'feldherr', name: 'Der Feldherr', koenig: 'feldherr', platz: 5, logik: 'feldherr', nr: 3 },
    { id: 'rabenstein2', name: 'Baron Rabenstein', koenig: 'rabenstein', platz: null, logik: 'baron', nr: 11 }, // 20.11. 14:11 zurückgesetzt: neue id und nr (alte id 'rabenstein' / nr 4 nie wieder verwenden), alte Siege zählen nicht mehr
    // frühere Spieler-Könige, jetzt Bots, noch ohne Logik
    { id: 'loewenherz', name: 'Löwenherz', koenig: 'loewenherz', platz: 6, logik: 'loewenherz', nr: 8 }, // seit 20.11. 13:58, braucht ein Konto
    { id: 'jungkoenig', name: 'Jungkönig', koenig: 'jungkoenig', platz: 12, logik: 'jungkoenig', nr: 16 }, // seit 20.11. 21:45, braucht ein Konto
    { id: 'waldkoenig', name: 'Waldkönig', koenig: 'waldkoenig', platz: 8, logik: 'waldkoenig', nr: 9 }, // seit 20.11. 13:58, braucht ein Konto
    // Anfänger-Bots (Vorschlag: vor dem Banditen), noch ohne Logik
    { id: 'strohkoenig', name: 'Der Strohkönig', koenig: 'strohkoenig', platz: 7, logik: 'strohkoenig', nr: 12 }, // seit 20.11. 14:21, braucht ein Konto
    { id: 'tollpatsch', name: 'Knappe Tollpatsch', koenig: 'tollpatsch', platz: 1, logik: 'tollpatsch', nr: 5 }, // seit 20.11. erster Story-Gegner
    // weitere Bots, noch ohne Logik
    { id: 'raubritterkuno', name: 'Raubritter Kuno', koenig: 'raubritterkuno', platz: null, logik: null },
    { id: 'graefineisenhand', name: 'Gräfin Eisenhand', koenig: 'graefineisenhand', platz: 15, logik: 'graefineisenhand', nr: 19 }, // seit 21.11. 16:09, braucht ein Konto
    { id: 'drachenkoenig', name: 'Der Drachenkönig', koenig: 'drachenkoenig', platz: 16, logik: 'drachenkoenig', nr: 20 }, // seit 21.11. 21:44, braucht ein Konto
    { id: 'baerenfuerst', name: 'Der Bärenfürst', koenig: 'baerenfuerst', platz: 18, logik: 'baerenfuerst', nr: 22 }, // seit 26.11., braucht ein Konto
    { id: 'herzognebelwald', name: 'Herzog Nebelwald', koenig: 'herzognebelwald', platz: 19, logik: 'herzognebelwald', nr: 23 }, // seit 26.11., braucht ein Konto
    { id: 'sumpfhexe', name: 'Die Sumpfhexe', koenig: 'sumpfhexe', platz: null, logik: null },
    { id: 'koenigrotbart', name: 'König Rotbart', koenig: 'koenigrotbart', platz: 11, logik: 'koenigrotbart', nr: 15 }, // seit 20.11. 16:56, braucht ein Konto
    { id: 'markgrafmoorstein', name: 'Markgraf Moorstein', koenig: 'markgrafmoorstein', platz: null, logik: null },
    { id: 'wolfsjarl', name: 'Der Wolfsjarl', koenig: 'wolfsjarl', platz: 9, logik: 'wolfsjarl', nr: 13 }, // seit 20.11. 16:23, braucht ein Konto
    { id: 'kalifsandsturm', name: 'Kalif Sandsturm', koenig: 'kalifsandsturm', platz: null, logik: null },
    { id: 'fuerstbischofgerold', name: 'Fürstbischof Gerold', koenig: 'fuerstbischofgerold', platz: 10, logik: 'fuerstbischofgerold', nr: 14 }, // seit 20.11. 16:41, braucht ein Konto
    { id: 'schwarzeritter', name: 'Der Schwarze Ritter', koenig: 'schwarzeritter', platz: null, logik: null },
    { id: 'zarinfrostmantel', name: 'Zarin Frostmantel', koenig: 'zarinfrostmantel', platz: 13, logik: 'zarinfrostmantel', nr: 17 }, // seit 21.11. 13:37, braucht ein Konto
    { id: 'junkerhabgier', name: 'Junker Habgier', koenig: 'junkerhabgier', platz: null, logik: null },
    { id: 'vogtgrimmbart', name: 'Vogt Grimmbart', koenig: 'vogtgrimmbart', platz: null, logik: null },
    { id: 'kaiseringoldfeder', name: 'Kaiserin Goldfeder', koenig: 'kaiseringoldfeder', platz: 17, logik: 'kaiseringoldfeder', nr: 21 }, // seit 22.11. 18:45, braucht ein Konto
    { id: 'pilzkoenig', name: 'Der Pilzkönig', koenig: 'pilzkoenig', platz: null, logik: null },
    { id: 'admiralsalzwind', name: 'Admiral Salzwind', koenig: 'admiralsalzwind', platz: null, logik: null },
    { id: 'khansteppensturm', name: 'Khan Steppensturm', koenig: 'khansteppensturm', platz: null, logik: null },
    { id: 'schattenkoenigin', name: 'Die Schattenkönigin', koenig: 'schattenkoenigin', platz: null, logik: null },
    // neue Bots (20.11.), noch ohne Logik. Idee: jeder Bot spielt selbst die Karte, die man durch einen Sieg gegen ihn freischaltet (Vorschlag in Klammern)
    { id: 'hauptmannschildwall', name: 'Hauptmann Schildwall', koenig: 'hauptmannschildwall', platz: 2, logik: 'hauptmannschildwall', nr: 6 }, // Belohnung: Belagerungsschild
    { id: 'glutmeisterin', name: 'Die Glutmeisterin', koenig: 'glutmeisterin', platz: null, logik: null }, // (Fackelwerfer)
    { id: 'haendlerfuerstgoldsand', name: 'Händlerfürst Goldsand', koenig: 'haendlerfuerstgoldsand', platz: 20, logik: 'haendlerfuerstgoldsand', nr: 24 }, // seit 27.11., braucht ein Konto (Belohnung: Bürger)
    { id: 'abtglockenklang', name: 'Abt Glockenklang', koenig: 'abtglockenklang', platz: null, logik: null }, // (Kirche)
    { id: 'steinmetzbrocken', name: 'Steinmetz Brocken', koenig: 'steinmetzbrocken', platz: 14, logik: 'steinmetzbrocken', nr: 18 }, // seit 21.11. 14:07, braucht ein Konto // (Onager)
    // neue Bots (28.11.), noch ohne Logik
    { id: 'wachtmeisterineulenauge', name: 'Wachtmeisterin Eulenauge', koenig: 'wachtmeisterineulenauge', platz: 21, logik: 'wachtmeisterineulenauge', nr: 25 }, // seit 28.11., braucht ein Konto (Belohnung: Wachposten)
    { id: 'kerzenfuerst', name: 'Der Kerzenfürst', koenig: 'kerzenfuerst', platz: null, logik: null },
    { id: 'bienenkoenigin', name: 'Die Bienenkönigin', koenig: 'bienenkoenigin', platz: null, logik: null },
    { id: 'narrenkoenig', name: 'Der Narrenkönig', koenig: 'narrenkoenig', platz: null, logik: null },
    { id: 'fuerstpfauenpracht', name: 'Fürst Pfauenpracht', koenig: 'fuerstpfauenpracht', platz: null, logik: null },
    { id: 'meisterglutfaust', name: 'Meister Glutfaust', koenig: 'meisterglutfaust', platz: 4, logik: 'meisterglutfaust', nr: 7 } // Belohnung: Schmiede (daten/freischalten.js)
  ];
  // Story-Fortschritt = WELCHE Gegner besiegt sind (nicht wie viele). nr = feste Nummer zum Speichern (nie ändern, neue Story-Bots bekommen die nächste freie Nummer; nur für die alte Speicherung in spieler.story, seit 20.11. steht die Liste in spieler.besiegt ohne Grenze).
  // Ein später weiter vorne eingefügter Bot gilt für bestehende Spieler NICHT als besiegt: er ist spielbar, trägt «neu», seine Belohnungskarte gibt es erst nach einem Sieg.
  // Alte Spielstände (nur Anzahl, je nach Story-Version) werden einmal umgerechnet: STORY_ALT[version] = Reihenfolge damals.
  var STORY_ALT = { 1: ['bandit', 'prinz', 'feldherr', 'rabenstein'], 2: ['tollpatsch', 'bandit', 'prinz', 'feldherr', 'rabenstein'], 3: ['tollpatsch', 'hauptmannschildwall', 'bandit', 'prinz', 'feldherr', 'rabenstein'] };
  // Story-Modus: alle Bots mit Platz und Logik, nach Platz sortiert (bot = Logik-Schlüssel). Lage auf der Karte automatisch: STORY_LAGE[i % 4], Seite = i / 4
  var STORY_PRO_SEITE = 4, STORY_LAGE = [{ x: 13, y: 73 }, { x: 34, y: 47 }, { x: 56, y: 69 }, { x: 80, y: 40 }]; // passt zum Weg in der SVG-Karte (spiel/index.html)
  var STORY = BOT_DB.filter(function (b) { return b.platz && b.logik; }).sort(function (a, b) { return a.platz - b.platz; })
    .map(function (b, i) { var l = STORY_LAGE[i % STORY_PRO_SEITE]; return { id: b.id, nr: b.nr, bot: b.logik, name: b.name, koenig: b.koenig, x: l.x, y: l.y, seite: Math.floor(i / STORY_PRO_SEITE) }; });
  // Name und König eines Bots aus seinem Logik-Schlüssel (für Sandbox, Tutorial usw.)
  function botEintrag(logik) { for (var i = 0; i < BOT_DB.length; i++) if (BOT_DB[i].logik === logik) return BOT_DB[i]; return { name: 'Gegner', koenig: 'standard' }; }
