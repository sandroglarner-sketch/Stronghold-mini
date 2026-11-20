  // ---------- Freischaltungen (EINE Stelle für alle Sperren) ----------
  // Spiel (Kartenbuch, Knöpfe, Story-Karte), Online-Kontrolle und Server (server.js) lesen alle diese Datei.
  // Regel = was man braucht (alles Angegebene muss erfüllt sein):
  //   konto: true        = angemeldet (Gratis-Konto)
  //   freunde: n         = mindestens n eingeladene Freunde, die über den Link gespielt haben (braucht ein Konto)
  //   besiegt: 'bot-id'  = diesen Story-Gegner besiegt (ids aus daten/botdatenbank.js, z. B. 'feldherr');
  //                        gilt auch ohne Konto (online meldet der Browser seinen Story-Stand)
  // Karten ohne Eintrag sind für alle frei. Im Tester-Modus ist alles frei.
  CONFIG.FREI = {
    einheiten: {
      mage: { konto: true },
      sword: { konto: true },
      bank: { konto: true },
      dieb: { konto: true },
      belfry: { konto: true },
      trebuchet: { konto: true },
      crossbow: { konto: true, freunde: 1 },
      ladder: { besiegt: 'tollpatsch' }, // Belohnung für den ersten Story-Gegner
      shield: { besiegt: 'hauptmannschildwall' }, // Belohnung für den zweiten Story-Gegner
      schmiede: { besiegt: 'meisterglutfaust' } // gilt erst, wenn Meister Glutfaust einen Story-Platz hat
    },
    // Story-Modus: kontoAb = ab diesem Gegner (bot-id, inklusive) braucht jeder weitere Gegner ein Konto ('' = nie);
    // gegner = Regeln für einzelne Gegner, z. B. { feldherr: { konto: true } } (zusätzlich zur Reihenfolge: zuerst den Gegner davor besiegen)
    story: { kontoAb: '', gegner: {} }
  };
