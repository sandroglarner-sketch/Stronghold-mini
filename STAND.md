# Stand des Projekts (kurz, nur was heute gilt)

Verlauf: `git log` (Commit-Nachrichten) bzw. Archiv `NOTIZEN.md` (bis 23.11.2026) – nur bei Bedarf durchsuchen (`grep`), nicht ganz lesen.

## Spiel
- Top-Down-Echtzeitstrategie im Browser, Canvas 1100×500, 22×10 Kacheln (T = 50). Sieg = gegnerischer König tot.
- Online: https://stronghold-mini.onrender.com (Render Gratis, Frankfurt; schläft nach 15 min). Update = `index.html` auf GitHub, Render baut automatisch neu (laufende Partien brechen ab).
- Konten/Datenbank: Supabase (`datenbank/schema.sql`, SQL Editor: https://supabase.com/dashboard/project/odxpdyrwtvgicntbjlrh/sql/new). Server schreibt mit `SUPABASE_SECRET_KEY` (nur Render-Umgebungsvariable).
- Statistik: GoatCounter, nur in der Online-`index.html`.

## Code
- `daten/` Werte: `regeln.js` (CONFIG), `einheiten.js` (CONFIG.units, Kartentexte), `bots.js` (CONFIG.BOTS, Wellen), `botdatenbank.js` (BOT_DB, Story-Plätze), `freischalten.js` (CONFIG.FREI: Konto/Freunde/Sieg/Shop/Geschenk), `koenige.js`, `konto.js`.
- `gemeinsam/` Regeln ohne Bildschirm: `mathe.js`, `spielzustand.js` (reset, spawn, buy, `nurFernZiel`), `bots.js` (Computergegner), `simulation.js` (update, Kampf, Gold).
- `spiel/` Darstellung, Menüs, Shop, Online (`online.js`), Freunde/Zuschauen (`sozial.js`).
- `werkzeuge/reihenfolge.txt` = Reihenfolge der Skriptteile (wichtig, gemeinsamer Bereich). `bauen.js` erzeugt `index.html` (online), `build/artifact.html`, `build/bot-editor.html`, `build/botdatenbank.html`.
- `server.js`: Node ohne Abhängigkeiten, eigenes WebSocket, Paarung, Lockstep-Weiterleitung, Konto-API (`/api/konto`, `/api/kaufen`, `/api/geschenk` …), Elo, Edelsteine, Freunde, Zuschauen. Version = Prüfsumme des Spielcodes; nur gleiche Versionen werden gepaart.

## Technik, die man kennen muss
- Online und Bot-Partien sind deterministisch (Lockstep): `simRand` (mulberry32), Mathe nur über `hyp/dsin/dcos/datan/datan2/dasin` – nie `Math.random`/`Math.hypot` in der Simulation. Online STEP 0,05 s, PVP_DELAY 7; Bot-Partien BL_STEP 1/60 s.
- Bots verhalten sich exakt wie Spielereinheiten (gleiche Regeln).
- Neue Bot-Parameter in `gemeinsam/bots.js` immer auch in `werkzeuge/bot-editor-vorlage.html`.
- Bot-Editor: https://claude.ai/artifact/4jmqnPCDZTpfPn9H8wVd7A. Nächste freie Bot-nr: **22**.

## Grundsätze des Besitzers
- Muss der Besitzer selbst etwas tun (Supabase, Render, GitHub), gleich den direkten Link schicken.
- Repo ist öffentlich: keine E-Mail-Adressen, Schlüssel, Secrets im Code.
- Shop-Preisänderungen ändern nie den Edelsteinstand der Spieler (kein Abzug, keine Rückgabe); Nachzahlung nur auf ausdrücklichen Wunsch.
- Einladungen: 20 Edelsteine pro neuem Gerät – Lücke (privates Fenster = neues Gerät) bleibt bewusst offen.
- Story-Gegner ohne Beschreibung (man soll nicht wissen, wie der Bot spielt).
- Tutorial ohne Sprache, nur grüne Pfeile.
- Artifact-Veröffentlichungslabels max. 60 Zeichen.

## Offen / Ideen
- Eigene Domain, Google Search Console, Namenshinweis «Stronghold» (Firefly Studios), evtl. PWA/App.
