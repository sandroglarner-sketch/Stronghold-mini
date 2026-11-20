    // splash = Radius des Flächenschadens in Kacheln, slow = Tempo-Faktor und Dauer für getroffene Einheiten
    // passive = sucht sich einen Platz nahe der eigenen Kaserne und bleibt dort stehen,
    // bonus = Gold mehr bei jeder Auszahlung (erst wenn er steht)
  // staerke = interner Stärkewert (nur für die Bots): Kampfeinheiten 1, Belagerungsmaschinen mindestens 2 (Katapult 4, Trebuchet 6, Belagerungsturm 8), Bauer 0.
  //   Die Bots verteidigen mit Stärke des Angriffs (ohne seine Turmbesatzung) + defPlus (= 1); eigene Einheiten zählen dabei mit ihrem Stärkewert.
  // Gesperrte Karten (Konto, Freunde, Story-Siege): siehe daten/freischalten.js
  CONFIG.units = {
      farmer: { cat: 'eco', name: 'Bauer',         cost: 4, staerke: 0,  hp: 2,  atk: 0, range: 1, speed: 1.0, cd: 1, r: 0.26, key: '1', passive: true, bonus: 1, bonusEvery: 5 }, // bonus Gold alle bonusEvery Sekunden, Takt startet beim Niederlassen
      // Karawane (Wirtschaft): 1. kostet 5 Gold, jede weitere 5 mehr (stirbt eine, sinkt der Preis wieder); geht (Tempo 0.8) zur Mitte unterhalb des Teichs, füllt in 3 s (Annahme) alle 4 Töpfe mit Wasser, geht zurück zur Burg: +10 Gold; dann wieder von vorn.
      karawane: { cat: 'eco', name: 'Karawane', cost: 5, staerke: 0, hp: 3, atk: 0, range: 0, speed: 0.8, cd: 1, r: 0.34, passive: true, karawane: { gold: 10, fuellen: 3, toepfe: 4 }, steigt: 5 }, // Preis: 5 Gold + 5 pro lebende eigene Karawane
      // Holzfäller (Wirtschaft): 6 Gold, hat einen Körper (steht anderen im Weg), höchstens 2 pro Baum; geht zum nächsten freien Baum (CONFIG.BAEUME) und fällt ihn: alle 5 s +2 Gold; ein Baum gibt höchstens 20 Gold, dann bleibt der Stumpf (für den Rest des Spiels)
      holzfaeller: { cat: 'eco', name: 'Holzfäller', cost: 6, staerke: 0, hp: 2, atk: 0, range: 0, speed: 0.8, cd: 1, r: 0.27, passive: true, holz: { alle: 5, gold: 2, proBaum: 2 } },
      spear: { cat: 'melee', name: 'Speersoldat',   cost: 5, staerke: 1,  hp: 3,  atk: 1, range: 1, speed: 1.0, cd: 1, r: 0.30, key: '2' },
      archer: { cat: 'ranged', name: 'Bogenschütze',  cost: 12, staerke: 1, hp: 1,  atk: 1, range: 4, speed: 0.8, cd: 1, r: 0.28, key: '3', delay: 0.5 },
      rider:  { cat: 'melee', name: 'Reiter',        cost: 15, staerke: 1, hp: 8,  atk: 1, range: 1, speed: 1.8, cd: 1, r: 0.34, key: '4' },
      mage:   { cat: 'ranged', name: 'Magier',        cost: 25, staerke: 1, hp: 1,  atk: 1, range: 3.5, speed: 0.8, cd: 1, r: 0.30, key: '7', delay: 0.5, splash: 1, slow: { factor: 0.5, secs: 3 } },
      // Schwarzer Ritter: 18 Leben, Angriff 2 (Optik: schwarzer Helm, stachelige Schulterpanzer, längeres Schwert, Ritterschild mit schwarzem Kreuz)
      schwarzritter: { cat: 'melee', name: 'Schwarzer Ritter', cost: 25, staerke: 1, hp: 18, atk: 2, range: 1, speed: 0.7, cd: 1, r: 0.38 },
      // Bandit: unsichtbar (kann nicht anvisiert werden, Flächenschaden trifft ihn trotzdem); nach einem eigenen Angriff mindestens 1 s sichtbar
      raeuber: { cat: 'melee', name: 'Bandit', cost: 8, staerke: 1, hp: 3, atk: 1, range: 1, speed: 1.2, cd: 1, r: 0.29, unsichtbar: { sichtbar: 1 } },
      knight: { cat: 'melee', name: 'Ritter',        cost: 20, staerke: 1, hp: 20, atk: 1, range: 1, speed: 0.7, cd: 1, r: 0.38, key: '6' },
      // dig = gräbt sich unsichtbar (speed Kacheln pro Sekunde) zu einem Punkt im Umkreis radius um einen zufälligen
      // gegnerischen Bogenschützen oder Magier, nie näher als minBase Kacheln an der gegnerischen Kaserne.
      // Die Grabspur bleibt trail Sekunden sichtbar. Danach ist er eine normale Einheit mit Marschtempo speed.
      digger: { cat: 'melee', name: 'Tunnelgräber', cost: 10, staerke: 1, hp: 4,  atk: 1, range: 1, speed: 1.2, cd: 1, r: 0.30, key: '5', dig: { speed: 3, radius: 1.5, minBase: 6, trail: 1 } },
      // ram = greift nur Mauern und Kasernen an, keine Einheiten
      ram: { cat: 'siege', name: 'Rammbock', cost: 35, staerke: 2, hp: 20, atk: 20, range: 1, speed: 0.6, cd: 1, r: 0.36, key: '9', ram: true, mass: 6 }, // mass = beim Gedränge schiebt er andere Einheiten so viel stärker zur Seite (alle anderen 1)
      // wall = Mauer: im Abstand dist Kacheln um die eigene Kaserne herum gebogen, workers Arbeiter, die mit rate Leben pro Sekunde bis zu add Leben bringen
      // rate Leben pro Sekunde bauen (jeder). Erst wenn sie einmal fertig ist, blockiert sie gegnerische Einheiten.
      wall: { name: 'Mauer',     cost: 20, hp: 0, atk: 0, range: 0, speed: 0, cd: 1, r: 0.3, key: '8',
              wall: { dist: 3, thick: 0.5, workers: 4, rate: 3, add: 10, cap: 200, heal: 0.6, fade: 1, tower: { from: 2, takeDist: 4, // takeDist = so nah (in Kacheln) an der Kaserne muss eine Einheit sein, damit sie einen freien Turmplatz nimmt
              taken: 0.25, // Einheiten in einem Turm erleiden von Fernkämpfern (auch von der Kaserne) nur diesen Anteil des Schadens
              // Türme ab Mauer 2: links und rechts (f = Stelle auf der Mauer, 0 oben bis 1 unten) je ein Turm; k = sq (Viereck) oder rd (Rund), w/h bzw. r = Grösse in Kacheln,
              // out = Abstand vor der Mauer; slots = Plätze (types = erlaubte Einheitentypen, dx/dy = Versatz in Kacheln)
              levels: {
                2: { list: [
                  { k: 'sq', f: 0.25, w: 0.7, h: 0.9, out: 0.5, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: 0 }] },
                  { k: 'sq', f: 0.75, w: 0.7, h: 0.9, out: 0.5, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: 0 }] }] },
                3: { list: [
                  { k: 'sq', f: 0.25, w: 0.85, h: 1.2, out: 0.55, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: -0.28 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: 0.28 }] },
                  { k: 'sq', f: 0.75, w: 0.85, h: 1.2, out: 0.55, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: -0.28 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0, dy: 0.28 }] }] },
                4: { list: [
                  { k: 'rd', f: 0.25, r: 0.8, out: 0.6, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.38, dy: 0 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.2, dy: -0.38 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.2, dy: 0.38 }] },
                  { k: 'rd', f: 0.75, r: 0.8, out: 0.6, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.38, dy: 0 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.2, dy: -0.38 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.2, dy: 0.38 }] }] },
                5: { list: [
                  { k: 'rd', f: 0.25, r: 1.05, out: 0.7, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.5, dy: -0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.5, dy: 0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.05, dy: -0.62 }, { types: ['catapult', 'baliste', 'trebuchet'], dx: -0.4, dy: 0.3 }] },
                  { k: 'rd', f: 0.75, r: 1.05, out: 0.7, slots: [{ types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.5, dy: -0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: 0.5, dy: 0.4 }, { types: ['archer', 'mage', 'crossbow', 'javelin', 'fackel'], dx: -0.05, dy: -0.62 }, { types: ['catapult', 'baliste', 'trebuchet'], dx: -0.4, dy: 0.3 }] }] }
              } }, stages: [40, 80, 120, 160, 200], bars: [40, 40, 80, 120, 160, 200] } }, // rate = Leben pro Sekunde je Arbeiter, add = Leben, die jeder Arbeiter insgesamt bringt, cap = höchstes Leben der Mauer; stages = ab so viel Leben erscheint die nächste der 5 Optiken (davor nur ein Gerüst), bars = Maximum der Lebensleiste je Stufe (Gerüst, Optik 1 bis 5) = Leben, ab denen die Optik erscheint; heal = Leben pro Sekunde, die eine Mauer unter dem Höchstwert ihrer Optik von selbst heilt (erst ab der ersten Optik)
      // shield = Belagerungsschild: greift nur Mauern und Kasernen an (wie der Rammbock), richtet aber keinen Schaden an
      shield: { cat: 'siege', name: 'Belagerungsschild', cost: 25, staerke: 2, hp: 12, atk: 0, range: 1, speed: 0.6, cd: 1, r: 0.34, key: '0', ram: true, rangedTaken: 0.25 }, // rangedTaken = Anteil des Schadens, den es von Fernkämpfern erleidet
      // delay = Flugzeit des Geschosses: der Treffer erfolgt erst so viele Sekunden nach dem Schuss (auch wenn der Schütze inzwischen gefallen ist)
      // fire = Katapult: Feuerbälle mit Flächenschaden (splash), ignoriert Mauern (nichts blockiert Ziel oder Schuss), schießt nur alle cd Sekunden
      catapult: { cat: 'siege', name: 'Katapult', cost: 50, staerke: 4, hp: 2, atk: 2, range: 6, speed: 0.6, cd: 3, r: 0.34, key: 'q', delay: 1, splash: 1.2, fire: true, minRange: 2 },
      // baliste = Kriegsmaschine: ein schwerer Bolzen auf ein Ziel, trifft nach delay Sekunden, wird von Mauern aufgehalten wie ein Pfeil; passt wie das Katapult auf den großen Turm
      baliste: { cat: 'siege', name: 'Baliste', cost: 45, staerke: 2, hp: 4, atk: 12, range: 4, speed: 0.6, cd: 2, r: 0.34, key: 'e', delay: 0.5, minRange: 2 },
      // onager = kleines Belagerungskatapult: greift nur Mauern und Burgen an (ram), fährt zusammengebaut, muss setup Sekunden stillstehen (aufbauen),
      // dann wirft er alle cd Sekunden einen Stein, der gerade (ohne Bogen) fliegt und nach delay Sekunden trifft; Mauern blockieren ihn nicht (Ziel ist die Mauer selbst)
      onager: { cat: 'siege', name: 'Onager', cost: 30, staerke: 2, hp: 2, atk: 20, range: 5, speed: 0.6, cd: 3, r: 0.34, delay: 0.5, ram: true, setup: 2, blast: { r: 1.2, atk: 1 } }, // blast = zusätzlicher Flächenschaden am Einschlagpunkt (trifft alles: Einheiten, Mauer, Burg)
      // Schwertkämpfer: Helm wie der Ritter, Holzschild mit Eisenrand
      // Schmiede (Typ Gebäude, cat 'building'; höchstens 2 Gebäude im Deck, 2 Gebäudeplätze): steht auf einem von 2 Gebäudeplätzen (auf einem Bogen wie die Mauer, oben und unten, die Mitte mit dem Weg bleibt frei); ein Arbeiter baut sie
      // (gleich schnell wie die Mauer: WALL.rate Leben pro Sekunde). Nochmals kaufen = nächste Stufe (stufen: Preis, Leben, Gold). Fertig: alle «alle» Sekunden Gold (der Schmied schmiedet 3 s vor dem
      // Gebäude, ist 2 s drin, dann gibt es das Gold); heilt wie die Mauer (WALL.heal). Kann angegriffen werden; Bauern weichen an ihren Rand aus. passive = zählt nicht als Kampfeinheit.
      schmiede: { cat: 'building', name: 'Schmiede', cost: 40, staerke: 0, hp: 10, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
                  gebaeude: { w: 1.2, h: 1.0, alle: 5, stufen: [{ cost: 40, hp: 10, gold: 5 }, { cost: 80, hp: 10, gold: 10 }, { cost: 120, hp: 10, gold: 15 }] } },
      // Adelshaus (Typ Gebäude): eine Stufe; 100 Gold, 20 Leben, alle 15 s Gold: zuerst 5, jedes Mal 5 mehr (5, 10, 15 …). Darstellung: 1 s drin, ein Adliger geht in die Burg, bleibt 3 s, geht zurück; sobald er wieder drin ist, kommt die Auszahlung.
      adel: { cat: 'building', name: 'Adelshaus', cost: 100, staerke: 0, hp: 20, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
              gebaeude: { w: 1.2, h: 1.0, alle: 15, steigt: 5, stufen: [{ cost: 100, hp: 20, gold: 5 }] } }, // 1. Auszahlung 5 Gold, jede weitere 5 mehr
      // Bank (Typ Gebäude): 80 Gold, 20 Leben; alle 10 s +10 % deines Goldes (aufgerundet). Ein Geschäftsmann geht zum König (2 s), zurück, 1 s in der Bank.
      bank: { cat: 'building', name: 'Bank', cost: 80, staerke: 0, hp: 20, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
              gebaeude: { w: 1.1, h: 1.1, alle: 10, art: 'zins', prozent: 10, stufen: [{ cost: 80, hp: 20, gold: 0 }] } },
      // Diebeshaus (Typ Gebäude): 50 Gold, 10 Leben; alle 30 s klaut ein Dieb 30 % des gegnerischen Goldes (aufgerundet): er geht seitlich durch die Mauern am Spielfeldrand
      // entlang in die gegnerische Burg (dort wird geklaut) und denselben Weg zurück direkt ins Diebeshaus (dort kommt das Gold an).
      dieb: { cat: 'building', name: 'Diebeshaus', cost: 60, staerke: 0, hp: 10, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
              gebaeude: { w: 1.1, h: 1.0, alle: 40, art: 'dieb', prozent: 40, klauen: 15, abladen: 28, stufen: [{ cost: 60, hp: 10, gold: 0 }] } },
      // Brandstifterhaus (Typ Gebäude): 40 Gold, 10 Leben; alle 30 s geht ein Brandstifter (halb durchsichtig wie der Dieb, mit Fackel) am Spielfeldrand zur gegnerischen Burg,
      // legt dort Feuer (13–15 s Brand), danach verliert der Gegner 40 % seines Goldes (aufgerundet; das Gold ist weg); dann zurück ins Haus.
      brand: { cat: 'building', name: 'Brandstifterhaus', cost: 40, staerke: 0, hp: 10, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
               gebaeude: { w: 1.1, h: 1.0, alle: 40, art: 'brand', prozent: 40, zuenden: 14, klauen: 15, stufen: [{ cost: 40, hp: 10, gold: 0 }] } },
      // Kirche (Typ Gebäude): 120 Gold, 30 Leben (Annahme). Fertig: nochmals kaufen = ein Priester betet 20 s (50 Gold), danach Gunst +1 (Balken über der Kirche).
      // Bei Gunst 5 kommt ein Unwetter über das gegnerische Drittel: jede Sekunde ein Blitz an einer zufälligen Stelle, 20 Schaden im Umkreis 1 an allem vom Gegner
      // (Einheiten, Gebäude, Mauer, Burg), bis die Kirche zerstört oder ein König tot ist.
      kirche: { cat: 'building', name: 'Kirche', cost: 120, staerke: 0, hp: 30, atk: 0, range: 0, speed: 0, cd: 1, r: 0.5, passive: true,
                gebaeude: { w: 1.1, h: 1.2, alle: 0, art: 'kirche', gebet: { cost: 50, dauer: 20 }, gunstMax: 5, blitz: { alle: 1, schaden: 20, radius: 1, koenig: 4, auf: 3 }, stufen: [{ cost: 120, hp: 30, gold: 0 }] } },
      sword: { cat: 'melee', name: 'Schwertkämpfer', cost: 8, staerke: 1, hp: 7, atk: 1, range: 1, speed: 0.8, cd: 1, r: 0.32 },
      // ladder = Leiterträger: rennt zu einem zufälligen Punkt der gegnerischen Mauer zwischen den Türmen (f 0,37–0,63), stellt die Leiter an
      // (bleibt show Sekunden sichtbar, nur für ihn) und klettert in climb Sekunden hinüber (fest, unabhängig von der Mauer); danach normale Einheit mit Schwert (ohne Schild)
      ladder: { cat: 'melee', name: 'Leiterträger', cost: 4, staerke: 1, hp: 4, atk: 1, range: 1, speed: 1.2, cd: 1, r: 0.3, massRun: 5, pushRun: 0.08, ladder: { climb: 1.5, show: 3 } }, // massRun = drängt sich auf dem Weg zur Mauer fast so stark durch wie der Rammbock (6); pushRun 0,08 = sehr kleiner Körper im Gedränge, nur bis er über die Mauer ist (Optik gleich), schlängelt sich vorbei
      // belfry = Belagerungsturm: fährt wie der Leiterträger an die gegnerische Mauer und dockt an (bleibt dort stehen); innerhalb von
      // troops × every Sekunden klettern troops Schwertkämpfer über die Mauer. Oben archers Bogenschützen (25 % Fernkampfschaden,
      // nur von Fernkämpfern angreifbar, werden von gegnerischen Fernkämpfern vor dem Turm anvisiert). mass wie der Rammbock; push = Druckradius im Gedränge
      // (Standard 0,275 je Einheit): drückt Einheiten aus seiner Fläche, Türme überlappen sich nie; angedockt bewegt er sich nicht mehr
      belfry: { cat: 'siege', name: 'Belagerungsturm', cost: 80, staerke: 8, hp: 40, atk: 0, range: 1, speed: 0.6, cd: 1, r: 0.55, mass: 40, push: 0.65, belfry: { stay: 5, troops: 8, every: 0.5, archers: 2 } },
      // Trebuchet: muss setup Sekunden stillstehen (aufbauen), bevor es schiesst; ein Schuss = multi.n Steine, die sich zufällig im Umkreis
      // multi.spread um das Ziel verteilen (je Flächenschaden splash), fliegen über Mauern (fire). Zwei Arten: bekommt es beim Kauf einen Platz auf dem grossen Turm (Mauer 5),
      // baut es sich dort auf und schiesst auf Gegner in Reichweite. Sonst (spot): fährt es zu einem zufälligen Punkt spot.dist vom Zielpunkt entfernt (Richtung eigene Seite,
      // ± spot.ang), baut sich auf und schiesst immer auf denselben Punkt: Mitte, spot.behind Kacheln hinter der gegnerischen Mauer
      trebuchet: { cat: 'siege', name: 'Trebuchet', cost: 70, staerke: 6, hp: 4, atk: 1, range: 7, speed: 0.5, cd: 4, r: 0.4, delay: 2, splash: 0.8, fire: true, minRange: 3, setup: 2, multi: { n: 8, spread: 3, speed: 3.5, stagger: 0.5 }, spot: { dist: 8, behind: 1, ang: 0.26, mid: 2 } }, // Angriff: steht dist (= Reichweite im Angriff) vom Zielpunkt; mid = höchstens so viele Kacheln über/unter der Feldmitte; range 7 gilt auf dem Turm
      // Speerwerfer: wirft Wurfspeere (kurze Reichweite); Armbrustschütze: Bolzen, stark aber langsam nachladen
      // Fackelwerfer: wirft brennende Fackeln (kurze Reichweite) mit Flächenschaden; darf wie der Speerwerfer auf die Schützenplätze der Türme
      fackel: { cat: 'ranged', name: 'Fackelwerfer', cost: 8, staerke: 1, hp: 2, atk: 1, range: 2.5, speed: 1, cd: 1.5, r: 0.3, delay: 0.45, splash: 0.8, fackel: true },
      javelin: { cat: 'ranged', name: 'Speerwerfer', cost: 6, staerke: 1, hp: 2, atk: 1, range: 2.5, speed: 1, cd: 1, r: 0.3, delay: 0.35 },
      crossbow: { cat: 'ranged', name: 'Armbrustschütze', cost: 20, staerke: 1, hp: 3, atk: 3, range: 4, speed: 0.8, cd: 1.5, r: 0.3, delay: 0.3, setup: 2 }, // setup: muss nach jedem Stillstand erst 2 s einrichten (auch im Turm)
      worker: { name: 'Arbeiter', cost: 0,  hp: 2,  atk: 0, range: 0, speed: 1.6, cd: 1, r: 0.26, worker: true, hidden: true },
      // king = König: sitzt auf der Burg (dann nur Bogen, unverwundbar); ist sie zerstört, kämpft er mit dem Zweihänder, höchstens leash Kacheln von der Burg entfernt
      king: { name: 'König', cost: 0, hp: 20, atk: 3, range: 1, speed: 1, cd: 1, r: 0.4, hidden: true, rangedTaken: 0.25, king: { leash: 5 } }
  };
