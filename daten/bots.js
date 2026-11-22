    // Gegner «Der Bandit» (Zahlen in BOTS.bauern):
    // income / incomeEvery = Grundeinkommen des Bots: so viel Gold alle so viele Sekunden (Standard 10 Gold alle 5 s, wie der Spieler);
    // farmers = höchstens so viele Bauern; huntLead = so viele Sekunden lang musst du mehr Bauern haben, bis die Jagd kommt; hunt = Jagdtrupp, huntEvery = Pause zwischen zwei Jagden;
    // wallGold = so viel Gold, dann baut er eine Mauer (repariert wird bei allen Bots gleich: fehlen mehr als 40 Leben zum Höchstwert der angestrebten Stufe), wallClear = nur, solange kein Gegner in seiner Spielfeldhälfte ist;
    // wallStage = Ausbau bis Stufe (0 = keine Mauer, 1 = Mauer ohne Türme, 2 = 2 Turmplätze, 3 = 4, 4 = 6, 5 = 6 + 2 Belagerungsplätze);
    // turm = angestrebte Turmbesatzung (Gesamtzahl je Einheit auf allen Türmen, z. B. { archer: 6, trebuchet: 2 }); Einheiten, die von selbst hinaufsteigen, bleiben; ein frei gewordener Platz wird mit der angestrebten Mischung besetzt;
    // defPlus kann auch negativ sein (verteidigt dann mit weniger Stärke als dein Angriff);
    // attackGold = ab so viel Gold beginnt der Angriff; attack = Schritte (after = Sekunden nach dem Beginn, buy = [Einheit, Anzahl]);
    // lockSecs = so lange nach Beginn des Angriffs wird sonst nichts gekauft; defPlus = Verteidigung mit (Stärkewert deiner Einheiten abzüglich seiner Turmbesatzung) plus so viel Stärke mehr als du hast (Stärkewert: CONFIG.units[..].staerke),
    // karawanen = so viele Karawanen strebt er an (wie die Bauern); holzfaeller = so viele Holzfäller strebt er an; gebaeude = Gebäudekäufe in Reihenfolge [{ type, gold }]: die n-te Zeile eines Gebäudes ist sein n-ter Kauf (Bau, Ausbaustufe, bei der Kirche ein Gebet), gekauft ab so viel freiem Gold und nur ohne gegnerische Einheit in seiner Spielfeldhälfte;
    // für die Jagd zählt auf beiden Seiten jede Karawane wie 2 Bauern (er jagt nur, wenn du mehr Wirtschaft hast); farmers und karawanen kauft er genau wie angegeben;
    // defMax = höchstens so viele je Einheit pro Verteidigung, z. B. { catapult: 1 };
    // defPool = erlaubte Einheiten, noOutput = danach so viele Sekunden keine Einheiten
  CONFIG.BOTS = {
      bauern: { income: 10, incomeEvery: 5, farmers: 5, huntLead: 20, hunt: [['spear', 2]], huntEvery: 30,
                wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true,
                attackGold: 130, lockSecs: 15,
                attack: [{ after: 0, buy: [['ram', 1]] }, { after: 4, buy: [['spear', 2]] }, { after: 6, buy: [['spear', 4]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 4]] }],
                defPlus: 1, defPool: ['spear', 'archer'], noOutput: 10 },
      // «Kleiner Prinz» (Story-Platz 3): 2 Bauern (seit 21.11.), Mauer bis Stufe 3 mit 4 Bogenschützen, Jagd alle 40 s, greift bei 200 Gold an,
      // spielt selbst das Katapult (Belohnung: Katapult), verteidigt auch mit Rittern und Katapult
      prinz: { income: 10, incomeEvery: 5, farmers: 2, huntLead: 20, hunt: [['archer', 1], ['spear', 1]], huntEvery: 40,
               wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true,
               attackGold: 200, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 2, buy: [['catapult', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 4]] }, { after: 9, buy: [['spear', 4]] }, { after: 10, buy: [['ladder', 10]] }],
               defPlus: 1, defPool: ['spear', 'archer', 'knight', 'catapult'], noOutput: 10, defMax: { catapult: 1 } }, // in einer Verteidigung höchstens 1 Katapult
      // «Der Feldherr» (Story-Platz 5): 10 Bauern, Mauer bis Stufe 2 mit 2 Bogenschützen, jagt nach 15 s Bauern-Vorsprung mit 1 Reiter (dann 30 s Pause),
      // greift bei 210 Gold an und spielt selbst die Baliste (Belohnung: Baliste); in einer Verteidigung höchstens 1 Baliste
      feldherr: { income: 10, incomeEvery: 5, farmers: 10, huntLead: 15, hunt: [['rider', 1]], huntEvery: 30,
               wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true,
               attackGold: 210, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['baliste', 1]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 5]] }, { after: 14, buy: [['rider', 8]] }],
               defPlus: 1, defPool: ['archer', 'spear', 'rider', 'baliste', 'knight'], noOutput: 10, defMax: { baliste: 1 } },
      // «Baron Rabenstein»: wie der Feldherr, aber 9 Bauern, Mauer bis Stufe 5 (die Türme besetzt er wie alle Gegner komplett: je 3 Bogenschützen und auf dem Belagerungsplatz ein Trebuchet, towerSiege),
      // jagt nach 20 s Bauern-Vorsprung (35 s Pause) mit 1 Ritter, 3 s später 2 Bogenschützen, 1 s danach 2 Speerkämpfer (huntLater, after = Sekunden nach dem Beginn der Jagd),
      // verteidigt mit Rittern, Bogenschützen, Speerkämpfern und Tunnelgräbern, greift bei 230 Gold an
      baron: { income: 10, incomeEvery: 5, farmers: 9, huntLead: 20, hunt: [['knight', 1]], huntEvery: 35,
               huntLater: [{ after: 3, buy: [['archer', 2]] }, { after: 4, buy: [['spear', 2]] }],
               wallGold: 60, wallUnits: 0, wallStage: 5, turm: { archer: 6, trebuchet: 2 }, wallClear: true,
               attackGold: 230, lockSecs: 15,
               attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 5, buy: [['spear', 2]] }, { after: 6, buy: [['knight', 2]] }, { after: 7, buy: [['archer', 6]] }, { after: 9, buy: [['spear', 8]] }],
               defPlus: 1, defPool: ['knight', 'archer', 'spear', 'digger'], noOutput: 10,
               defDiggerVsCatapult: 2 }, // hat der Gegner ein Katapult auf dem Feld (nicht auf dem Turm), sind mindestens so viele Tunnelgräber in der Verteidigung
      // «Knappe Tollpatsch» (erster Story-Gegner, seit 20.11.): 2 Bauern, Mauer ohne Türme, greift bei 120 Gold an, spielt selbst Leiterträger (Belohnung: Leiterträger)
      tollpatsch: { income: 10, incomeEvery: 5, farmers: 2, huntLead: 20, hunt: [['spear', 2]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true, attackGold: 120, lockSecs: 15,
                    attack: [{ after: 0, buy: [['knight', 1]] }, { after: 5, buy: [['spear', 6]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['ladder', 6]] }, { after: 9, buy: [['ladder', 10]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'knight'], noOutput: 10 },
      // «Hauptmann Schildwall» (zweiter Story-Gegner, seit 20.11.): 4 Bauern, Mauer bis Stufe 2 mit 2 Bogenschützen, jagt mit 1 Bogenschützen, greift bei 160 Gold an (mit 4 Leiterträgern),
      // spielt selbst den Belagerungsschild (Belohnung: Belagerungsschild)
      hauptmannschildwall: { income: 10, incomeEvery: 5, farmers: 4, huntLead: 20, hunt: [['archer', 1]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true, attackGold: 160, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['spear', 6]] }, { after: 8, buy: [['ladder', 4]] }, { after: 10, buy: [['spear', 10]] }],
                    defPlus: 1, defPool: ['spear', 'archer'], noOutput: 10 },
      // «Meister Glutfaust» (Story-Platz 4): 4 Bauern, baut ab 50 Gold eine Schmiede (Belohnung: Schmiede), Mauer bis Stufe 2 mit 2 Bogenschützen,
      // jagt nach 30 s Vorsprung mit 1 Ritter (3 s später 1 Bogenschütze), greift bei 180 Gold an; in einer Verteidigung höchstens 1 Katapult
      meisterglutfaust: { income: 10, incomeEvery: 5, farmers: 4, gebaeude: [{ type: 'schmiede', gold: 50 }], huntLead: 30, hunt: [['knight', 1]], huntEvery: 40, huntLater: [{ after: 3, buy: [['archer', 1]] }],
                    wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true, attackGold: 180, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['spear', 6]] }, { after: 12, buy: [['spear', 14]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'catapult', 'rider', 'knight'], noOutput: 10, defMax: { catapult: 1 } },
      // «Löwenherz» (Story-Platz 6, braucht ein Konto): 9 Bauern, Mauer bis Stufe 3 mit 4 Bogenschützen, jagt mit 2 Schwertkämpfern (alle 40 s), greift bei 200 Gold an (20 Leiterträger)
      // und spielt selbst den Schwertkämpfer (Belohnung: Schwertkämpfer); in einer Verteidigung höchstens 1 Katapult
      loewenherz: { income: 10, incomeEvery: 5, farmers: 9, huntLead: 20, hunt: [['sword', 2]], huntEvery: 40, wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true, attackGold: 200, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1], ['catapult', 1]] }, { after: 4, buy: [['sword', 6]] }, { after: 5, buy: [['archer', 4]] }, { after: 10, buy: [['ladder', 20]] }],
                    defPlus: 1, defPool: ['archer', 'sword', 'catapult', 'rider'], noOutput: 10, defMax: { catapult: 1 } },
      // «Waldkönig» (Story-Platz 7, braucht ein Konto): 6 Bauern und 4 Holzfäller (Belohnung: Holzfäller), Mauer ohne Türme, jagt mit 3 Speerkämpfern (alle 30 s),
      // greift bei 160 Gold an (6 Schwertkämpfer, 6 Bogenschützen, 8 Speerkämpfer, 15 Leiterträger)
      waldkoenig: { income: 10, incomeEvery: 5, farmers: 6, holzfaeller: 4, huntLead: 20, hunt: [['spear', 3]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true, attackGold: 160, lockSecs: 15,
                    attack: [{ after: 0, buy: [['sword', 6]] }, { after: 2, buy: [['archer', 6]] }, { after: 3, buy: [['spear', 8]] }, { after: 8, buy: [['ladder', 15]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'sword'], noOutput: 10 },
      // «Der Strohkönig» (Story-Platz 7, braucht ein Konto): 6 Bauern, baut ab 50 Gold ein Brandstifterhaus (Belohnung: Brandstifterhaus), Mauer ohne Türme,
      // jagt nach 15 s Vorsprung mit 2 Speerkämpfern (alle 30 s), greift bei 200 Gold an (2 Belagerungsschilde, 2 Rammböcke, 6 Bogenschützen, 6 + 15 Speerkämpfer); verteidigt mit Speer, Bogen, Baliste
      strohkoenig: { income: 10, incomeEvery: 5, farmers: 6, gebaeude: [{ type: 'brand', gold: 50 }], huntLead: 15, hunt: [['spear', 2]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true, attackGold: 200, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 2]] }, { after: 3, buy: [['ram', 2]] }, { after: 7, buy: [['archer', 6]] }, { after: 8, buy: [['spear', 6]] }, { after: 11, buy: [['spear', 15]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'baliste'], noOutput: 10 },
      // «Der Wolfsjarl» (Story-Platz 9, braucht ein Konto): 6 Bauern, baut ab 50 Gold eine Schmiede (nur Stufe 1, gebMax), Mauer ohne Türme, jagt nach 15 s Vorsprung mit 2 Speerwerfern (alle 30 s),
      // greift bei 150 Gold an (Belagerungsschild, 2 Ritter, 8 Speerkämpfer, 8 Speerwerfer, 15 Leiterträger), spielt selbst den Speerwerfer (Belohnung: Speerwerfer); in einer Verteidigung höchstens 1 Katapult
      wolfsjarl: { income: 10, incomeEvery: 5, farmers: 6, gebaeude: [{ type: 'schmiede', gold: 50 }], gebMax: { schmiede: 1 }, huntLead: 15, hunt: [['javelin', 2]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 1, turm: {}, wallClear: true, attackGold: 150, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 8, buy: [['spear', 8]] }, { after: 9, buy: [['javelin', 8]] }, { after: 13, buy: [['ladder', 15]] }],
                    defPlus: 1, defPool: ['catapult', 'spear', 'javelin'], defMax: { catapult: 1 }, noOutput: 10 },
      // «Fürstbischof Gerold» (Story-Platz 10, braucht ein Konto): greift nie an (keinAngriff); 6 Bauern und 6 Holzfäller, baut ab 70 Gold eine Kirche (Belohnung: Kirche)
      // und lässt danach immer, wenn er 70 Gold hat, einen Priester beten (gebetAb); Mauer bis Stufe 5 mit 6 Bogenschützen und 2 Katapulten, jagt mit 2 Bogenschützen (alle 40 s)
      fuerstbischofgerold: { income: 10, incomeEvery: 5, farmers: 6, holzfaeller: 6, gebaeude: [{ type: 'kirche', gold: 70 }], gebetAb: 70, keinAngriff: true, huntLead: 20, hunt: [['archer', 2]], huntEvery: 40,
                    wallGold: 60, wallUnits: 0, wallStage: 5, turm: { archer: 6, catapult: 2 }, wallClear: true, attackGold: 999, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 6, buy: [['archer', 4]] }, { after: 7, buy: [['spear', 6]] }, { after: 12, buy: [['spear', 14]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'knight'], defMax: { catapult: 1 }, noOutput: 10 },
      // «König Rotbart» (Story-Platz 11, braucht ein Konto): 8 Bauern, Schmiede ab 50 Gold (nur Stufe 1), Mauer bis Stufe 3 mit 4 Bogenschützen, jagt mit 2 Schwertkämpfern (15 s Vorsprung, alle 40 s),
      // greift bei 220 Gold an (Belagerungsschild, 2 Rammböcke, 8 Schwertkämpfer, 6 Bogenschützen, 8 Reiter); verteidigt mit Bogenschützen, Tunnelgräbern, Schwertkämpfern (Belohnung: Tunnelgräber)
      koenigrotbart: { income: 10, incomeEvery: 5, farmers: 8, gebaeude: [{ type: 'schmiede', gold: 50 }], gebMax: { schmiede: 1 }, huntLead: 15, hunt: [['sword', 2]], huntEvery: 40, wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true, attackGold: 220, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 2]] }, { after: 5, buy: [['sword', 8]] }, { after: 6, buy: [['archer', 6]] }, { after: 15, buy: [['rider', 8]] }],
                    defPlus: 1, defPool: ['archer', 'digger', 'sword'], defMax: { catapult: 1 }, noOutput: 10 },
      // «Jungkönig» (Story-Platz 12, braucht ein Konto): 10 Bauern und 4 Holzfäller, Mauer bis Stufe 3 mit 4 Bogenschützen, jagt mit 2 Reitern (alle 40 s), greift bei 200 Gold an
      // (2 Ritter, s2 Trebuchet, 4 Bogenschützen, 3x 4 Speerkämpfer, s18 15 Leiterträger), spielt selbst das Trebuchet (Belohnung: Trebuchet); verteidigt mit Speer, Bogen, Ritter, Reiter
      jungkoenig: { income: 10, incomeEvery: 5, farmers: 10, holzfaeller: 4, huntLead: 20, hunt: [['rider', 2]], huntEvery: 40, wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true, attackGold: 200, lockSecs: 15,
                    attack: [{ after: 0, buy: [['knight', 2]] }, { after: 2, buy: [['trebuchet', 1]] }, { after: 5, buy: [['archer', 4]] }, { after: 6, buy: [['spear', 4]] }, { after: 8, buy: [['spear', 4]] }, { after: 10, buy: [['spear', 4]] }, { after: 18, buy: [['ladder', 15]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'knight', 'rider'], noOutput: 10 },
      // «Zarin Frostmantel» (Story-Platz 13, braucht ein Konto): 8 Bauern, Schmiede ab 50 Gold (nur Stufe 1), Mauer bis Stufe 4 mit 6 Bogenschützen, jagt mit 1 Bogenschützen (alle 40 s),
      // greift bei 210 Gold an (Belagerungsschild, Rammbock, 4 Ritter, Eismagier, 8 Speerwerfer, 15 Leiterträger), spielt selbst den Eismagier (Belohnung: Eismagier)
      zarinfrostmantel: { income: 10, incomeEvery: 5, farmers: 8, gebaeude: [{ type: 'schmiede', gold: 50 }], gebMax: { schmiede: 1 }, huntLead: 20, hunt: [['archer', 1]], huntEvery: 40, wallGold: 60, wallUnits: 0, wallStage: 4, turm: { archer: 6 }, wallClear: true, attackGold: 210, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1]] }, { after: 4, buy: [['knight', 4]] }, { after: 6, buy: [['mage', 1]] }, { after: 8, buy: [['javelin', 8]] }, { after: 14, buy: [['ladder', 15]] }],
                    defPlus: 1, defPool: ['archer', 'knight', 'mage', 'spear', 'digger'], noOutput: 10 },
      // «Steinmetz Brocken» (Story-Platz 14, braucht ein Konto): 8 Bauern und 2 Holzfäller, Mauer bis Stufe 2 mit 2 Bogenschützen, jagt mit 2 Schwertkämpfern (15 s Vorsprung, alle 40 s), 3 s später 2 Speerwerfer,
      // greift bei 200 Gold an (Belagerungsschild, 2 Onager, 8 Schwertkämpfer, 8 Speerwerfer, 8 Reiter), spielt selbst den Onager (Belohnung: Onager); verteidigt mit Reitern, Speerwerfern, Schwertkämpfern
      steinmetzbrocken: { income: 10, incomeEvery: 5, farmers: 8, holzfaeller: 2, huntLead: 15, hunt: [['sword', 2]], huntEvery: 40, huntLater: [{ after: 3, buy: [['javelin', 2]] }], wallGold: 60, wallUnits: 0, wallStage: 2, turm: { archer: 2 }, wallClear: true, attackGold: 200, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 4, buy: [['onager', 2]] }, { after: 5, buy: [['sword', 8]] }, { after: 8, buy: [['javelin', 8]] }, { after: 16, buy: [['rider', 8]] }],
                    defPlus: 1, defPool: ['rider', 'javelin', 'sword'], noOutput: 10 },
      // «Gräfin Eisenhand» (Story-Platz 15, braucht ein Konto): 8 Bauern und 6 Holzfäller, Adelshaus ab 100 Gold (Belohnung: Adelshaus), Mauer bis Stufe 3 mit 4 Bogenschützen,
      // jagt mit 1 Reiter (15 s Vorsprung, alle 30 s), greift bei 240 Gold an (Belagerungsschild, Rammbock + Katapult, 2 Ritter, 6 Bogen, 8 Speer, 20 Leiterträger)
      graefineisenhand: { income: 10, incomeEvery: 5, farmers: 8, holzfaeller: 6, gebaeude: [{ type: 'adel', gold: 100 }], huntLead: 15, hunt: [['rider', 1]], huntEvery: 30, wallGold: 60, wallUnits: 0, wallStage: 3, turm: { archer: 4 }, wallClear: true, attackGold: 240, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['ram', 1], ['catapult', 1]] }, { after: 4, buy: [['knight', 2]] }, { after: 6, buy: [['archer', 6]] }, { after: 7, buy: [['spear', 8]] }, { after: 15, buy: [['ladder', 20]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'digger', 'knight', 'rider', 'mage'], noOutput: 10 },
      // «Der Drachenkönig» (Story-Platz 16, braucht ein Konto): 8 Bauern, Brandstifter ab 50 Gold, Schmiede ab 40 Gold (höchstens Stufe 2),
      // jagt mit 2 Fackelwerfern (20 s Vorsprung, alle 40 s), greift bei 240 Gold an (Belagerungsschild, Onager, 4 Ritter, 10 Fackelwerfer, 4 Speerträger, 20 Leitern)
      drachenkoenig: { income: 10, incomeEvery: 5, farmers: 8, gebaeude: [{ type: 'brand', gold: 50 }, { type: 'schmiede', gold: 40 }], gebMax: { schmiede: 2 }, huntLead: 20, hunt: [['fackel', 2]], huntEvery: 40, wallGold: 60, wallUnits: 0, wallStage: 4, turm: { archer: 6 }, wallClear: true, attackGold: 240, lockSecs: 15,
                    attack: [{ after: 0, buy: [['shield', 1]] }, { after: 3, buy: [['onager', 1]] }, { after: 4, buy: [['knight', 4]] }, { after: 8, buy: [['fackel', 10]] }, { after: 9, buy: [['spear', 4]] }, { after: 14, buy: [['ladder', 20]] }],
                    defPlus: 1, defPool: ['spear', 'fackel', 'knight'], noOutput: 10 },
      // «Kaiserin Goldfeder» (Story-Platz 17, braucht ein Konto, 22.11.): 10 Bauern und 3 Karawanen, Mauer bis Stufe 5 mit 6 Bogenschützen und 2 Balisten auf den Türmen,
      // baut die ersten 11 s keine Bauern (bauernAb), jagt mit 2 Speerträgern (5 s Vorsprung, alle 30 s), 1 s später 1 Bogenschütze, greift bei 240 Gold an (Welle 343: Trebuchet, 8+4+4+4+4 Speer, Baliste, 4 Bogen, 20 Leitern)
      kaiseringoldfeder: { income: 10, incomeEvery: 5, farmers: 10, bauernAb: 11, karawanen: 3, huntLead: 5, hunt: [['spear', 2]], huntEvery: 30, huntLater: [{ after: 1, buy: [['archer', 1]] }], wallGold: 60, wallUnits: 0, wallStage: 5, turm: { archer: 6, baliste: 2 }, wallClear: true, attackGold: 240, lockSecs: 17,
                    attack: [{ after: 0, buy: [['trebuchet', 1]] }, { after: 1, buy: [['spear', 4], ['baliste', 1]] }, { after: 2, buy: [['archer', 4]] }, { after: 3, buy: [['spear', 4]] }, { after: 6, buy: [['spear', 4]] }, { after: 9, buy: [['spear', 4]] }, { after: 12, buy: [['spear', 4]] }, { after: 16, buy: [['ladder', 20]] }],
                    defPlus: 1, defPool: ['spear', 'archer', 'rider'], noOutput: 10 }
  };
