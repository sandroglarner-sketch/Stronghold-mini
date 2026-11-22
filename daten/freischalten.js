  // ---------- Freischaltungen (EINE Stelle für alle Sperren) ----------
  // Spiel (Kartenbuch, Knöpfe, Story-Karte), Online-Kontrolle und Server (server.js) lesen alle diese Datei.
  // Regel = was man braucht (alles Angegebene muss erfüllt sein):
  //   konto: true        = angemeldet (Gratis-Konto)
  //   freunde: n         = mindestens n eingeladene Freunde, die über den Link gespielt haben (braucht ein Konto)
  //   besiegt: 'bot-id'  = diesen Story-Gegner besiegt (ids aus daten/botdatenbank.js, z. B. 'feldherr');
  //                        gilt auch ohne Konto (online meldet der Browser seinen Story-Stand)
  //   kaufen: n          = im Shop für n Edelsteine kaufen (braucht ein Konto; gekaufte Karten in spieler.gekauft)
  //   entwicklung: true  = noch in Entwicklung (für niemanden frei; nur von Hand über die Tabelle freischaltungen)
  // Karten ohne Eintrag sind gesperrt (noch in Entwicklung), ausser sie stehen in FREI.frei. Im Tester-Modus ist alles frei.
  CONFIG.FREI = {
    einheiten: {
      crossbow: { kaufen: 10 }, // Shop (22.11.)
      schwarzritter: { kaufen: 40 }, // Shop (22.11. 08:40: 40, vorher 25; Käufer zahlten einmalig die Differenz nach, server.js NACHZAHLEN)
      bank: { kaufen: 35 }, // Shop
      dieb: { kaufen: 30 }, // Shop (Diebeshaus)
      ladder: { besiegt: 'tollpatsch' }, // Belohnung für den ersten Story-Gegner
      shield: { besiegt: 'hauptmannschildwall' }, // Belohnung für den zweiten Story-Gegner
      catapult: { besiegt: 'prinz' }, // Belohnung für den Kleinen Prinzen
      schmiede: { besiegt: 'meisterglutfaust' }, // Belohnung für Meister Glutfaust (Story-Platz 4)
      baliste: { besiegt: 'feldherr' }, // Belohnung für den Feldherrn (Story-Platz 5)
      sword: { besiegt: 'loewenherz' }, // Belohnung für Löwenherz (Story-Platz 6, braucht ein Konto)
      holzfaeller: { besiegt: 'waldkoenig' }, // Belohnung für den Waldkönig (Story-Platz 8, braucht ein Konto)
      javelin: { besiegt: 'wolfsjarl' },
      kirche: { besiegt: 'fuerstbischofgerold' },
      digger: { besiegt: 'koenigrotbart' },
      trebuchet: { besiegt: 'jungkoenig' },
      mage: { besiegt: 'zarinfrostmantel' },
      onager: { besiegt: 'steinmetzbrocken' },
      adel: { besiegt: 'graefineisenhand' }, // Belohnung für Gräfin Eisenhand (Story-Platz 15, braucht ein Konto) // Belohnung für Steinmetz Brocken (Story-Platz 14, braucht ein Konto) // Belohnung für Zarin Frostmantel (Story-Platz 13, braucht ein Konto) // Belohnung für den Jungkönig (Story-Platz 12, braucht ein Konto) // Belohnung für König Rotbart (Story-Platz 11, braucht ein Konto) // Belohnung für Fürstbischof Gerold (Story-Platz 10, braucht ein Konto) // Belohnung für den Wolfsjarl (Story-Platz 9, braucht ein Konto)
      fackel: { besiegt: 'drachenkoenig' }, // Belohnung für den Drachenkönig (Story-Platz 16, braucht ein Konto)
      brand: { besiegt: 'strohkoenig' } // Belohnung für den Strohkönig (Story-Platz 7, braucht ein Konto)
    },
    // Story-Modus: kontoAb = ab diesem Gegner (bot-id, inklusive) braucht jeder weitere Gegner ein Konto ('' = nie);
    // gegner = Regeln für einzelne Gegner, z. B. { feldherr: { konto: true } } (zusätzlich zur Reihenfolge: zuerst den Gegner davor besiegen)
    story: { kontoAb: '', gegner: { drachenkoenig: { konto: true }, loewenherz: { konto: true }, waldkoenig: { konto: true }, strohkoenig: { konto: true }, wolfsjarl: { konto: true }, fuerstbischofgerold: { konto: true }, koenigrotbart: { konto: true }, jungkoenig: { konto: true }, zarinfrostmantel: { konto: true }, steinmetzbrocken: { konto: true }, graefineisenhand: { konto: true } } },
    // für alle frei (seit 20.11. 13:04): Mauer und die Karten aus dem Tutorial; alle anderen Karten brauchen einen Eintrag oben (Bot-Belohnung, Freunde ...)
    frei: ['wall', 'farmer', 'spear', 'archer', 'rider', 'knight', 'ram'],
    // Edelsteine (22.11., Währung für den Shop, nur mit Konto; der Server rechnet): Online-Partie Sieg / Niederlage (auch Unentschieden),
    // jeder besiegte Story-Gegner einmal, jeder eingeladene Freund (hat über den Link mind. 30 s gespielt). Online-Partien unter minPartie Sekunden zählen nicht.
    edel: { sieg: 2, niederlage: 1, bot: 1, freund: 20, minPartie: 30 },
    // Regel einer Karte: Eintrag oben, null = für alle frei, sonst { entwicklung: true } (Spiel, Online-Kontrolle und Server nutzen diese Funktion)
    regel: function (t) { return CONFIG.FREI.einheiten[t] || (CONFIG.FREI.frei.indexOf(t) >= 0 ? null : { entwicklung: true }); }
  };
