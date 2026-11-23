# Stronghold Mini – Arbeitsregeln für Claude

## Antworten
- Kurz und auf Deutsch antworten.
- Annahmen immer ausdrücklich nennen.

## Zuerst: Repo mit dem Artifact abgleichen
Veröffentlichtes Spiel: https://claude.ai/artifact/5efX98MaDHM3U6imQTGn9c (= `build/artifact.html`).
1. Artifact lesen (Artifact-Tool, `action: read`; nur die Datei vergleichen, nicht ganz in den Kontext lesen).
2. `node werkzeuge/bauen.js` und die gebaute `build/artifact.html` mit der gelesenen Fassung vergleichen (`diff`).
3. Weicht etwas ab: dem Besitzer melden und klären, welche Fassung gilt, bevor etwas geändert wird.

Letzter Abgleich: 23.11. – identisch (Commit 2b05417). Seit dem Commit «Notizen aus dem Artifact» enthält der Build keine Notizen mehr; bis das Artifact neu veröffentlicht ist, ist der Notizen-Kommentar im Kopf der einzige erwartete Unterschied.

## Bots
- Bots werden im Bot-Editor bearbeitet (`build/bot-editor.html`, erzeugt aus `werkzeuge/bot-editor-vorlage.html`; Artifact https://claude.ai/artifact/4jmqnPCDZTpfPn9H8wVd7A), nicht von Hand vorgeschlagen.
- Exporte aus dem Bot-Editor (im Chat eingefügt) baust du ein: `daten/botdatenbank.js` (BOT_DB), `CONFIG.BOTS` / `daten/bots.js`, ggf. Belohnungen (`daten/freischalten.js`).
- Danach Regeltext (Karten-/Regeltexte im Spiel) und bei Bedarf `STAND.md` anpassen.
- Neue Bot-Parameter in `gemeinsam/bots.js` immer auch in den Bot-Editor aufnehmen.

## Nach jeder Änderung
1. `node werkzeuge/bauen.js` (erzeugt `index.html` und `build/…`; `index.html` nie von Hand ändern).
2. Tests: `node tests/pruefen.js` (braucht `google-chrome`). Fehler melden, nicht verschweigen.
3. `STAND.md` nur anpassen, wenn sich etwas Grundsätzliches ändert (Aufbau, Grundsätze, nächste freie Bot-nr, offene Punkte); kurz halten. Bei Bedarf diese CLAUDE.md.
   Einzelne Wertänderungen gehören in die Commit-Nachricht: Was, alte → neue Werte, warum (z. B. «Schwertkämpfer 8 → 9 Gold, 6 → 7 Leben»).
4. Committen und auf den Arbeitszweig pushen (`git push -u origin <zweig>`).

## Projekt und Notizen
@STAND.md

- `NOTIZEN.md` ist ein Archiv (bis 23.11.2026), wird nicht mehr fortgeschrieben und nicht automatisch geladen. Bei Fragen zur Vorgeschichte gezielt durchsuchen (`grep -n "BEGRIFF" NOTIZEN.md`) oder `git log -S…`.
