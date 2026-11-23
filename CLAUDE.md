# Stronghold Mini – Arbeitsregeln für Claude

## Antworten
- Kurz und auf Deutsch antworten.
- Annahmen immer ausdrücklich nennen.

## Zuerst: Repo mit dem Artifact abgleichen
Veröffentlichtes Spiel: https://claude.ai/artifact/5efX98MaDHM3U6imQTGn9c (= `build/artifact.html`).
1. Artifact lesen (Artifact-Tool, `action: read`).
2. `node werkzeuge/bauen.js` und die gebaute `build/artifact.html` mit der gelesenen Fassung vergleichen (`diff`).
3. Weicht etwas ab: dem Besitzer melden und klären, welche Fassung gilt, bevor etwas geändert wird.

Letzter Abgleich: 23.11. – identisch (Stand Commit 2b05417).

## Bots
- Bots werden im Bot-Editor bearbeitet (`build/bot-editor.html`, erzeugt aus `werkzeuge/bot-editor-vorlage.html`; Artifact https://claude.ai/artifact/4jmqnPCDZTpfPn9H8wVd7A), nicht von Hand vorgeschlagen.
- Exporte aus dem Bot-Editor (im Chat eingefügt) baust du ein: `daten/botdatenbank.js` (BOT_DB), `CONFIG.BOTS` / `daten/bots.js`, ggf. Story und Belohnungen (`daten/story.js`, `daten/freischalten.js`).
- Danach Regeltext (Karten-/Regeltexte im Spiel) und Notizen anpassen.
- Neue Bot-Parameter in `gemeinsam/bots.js` immer auch in den Bot-Editor aufnehmen.

## Nach jeder Änderung
1. `node werkzeuge/bauen.js` (erzeugt `index.html` und `build/…`; `index.html` nie von Hand ändern).
2. Tests: `node tests/pruefen.js` (braucht `google-chrome`). Fehler melden, nicht verschweigen.
3. Notizen aktualisieren: neuer Eintrag oben in `NOTIZEN.md` (Format `TITEL (TT.MM. HH:MM): …`, alte Werte als «vorher …»), bei Bedarf diese CLAUDE.md.
4. Committen und auf den Arbeitszweig pushen (`git push -u origin <zweig>`).

## Projekt
- Aufbau siehe `README.md`: `daten/` Werte, `gemeinsam/` Regeln/Simulation/Bots, `spiel/` Darstellung, `werkzeuge/` Bauen, `tests/` Prüfungen, `server.js` (Render).
- Repo ist öffentlich: keine E-Mail-Adressen, Schlüssel oder Secrets in den Code (z. B. `SUPABASE_SECRET_KEY` nur als Render-Umgebungsvariable).
- Shop-Preisänderungen ändern nie den Edelsteinstand der Spieler (Grundsatz Besitzer 22.11.).

## Projektnotizen
Die Projektnotizen (Kopf von `build/artifact.html`) stehen in `NOTIZEN.md`; `bauen.js` setzt sie als Kommentar in das Artifact. Sie werden hier eingebunden – nur dort pflegen, nicht hierher kopieren:

@NOTIZEN.md
