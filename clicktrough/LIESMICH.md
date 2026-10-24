# A2Tools DPS Meter · Clicktrough

Dieses Repo baut jede neue Version des [Original-Meters von taengu](https://github.com/taengu/A2Tools-DPS-Meter)
automatisch mit diesen Anpassungen neu:

| Patch | Was er macht |
|---|---|
| 0001 | **Schloss und Click-through für alle Meter-Fenster**, auch unter nativem Wayland (KDE): Ist das Meter gesperrt, lassen auch Details, Kampfverlauf, Plugin-Fenster und das Plugin-Dock Klicks durch. Einschalten: Einstellungen → Meter-Einstellungen → „Alle Meter-Fenster sperren“. |
| 0002 | **Das Meter-Fenster bleibt an seinem Platz**, wenn es wächst oder schrumpft (KDE). KWin hält sonst die Mitte eines Fensters fest, das seine Größe selbst ändert, und das Meter wandert. |
| 0003 | **Updates kommen aus diesem Repo** statt vom Original. Das offizielle Paket würde die Anpassungen sonst wieder ersetzen. |
| 0004 | **Angepasste Plugins kommen mit dem Paket** (`data/ct-plugins`). Sie ersetzen die installierte Kopie desselben Plugins, auch ohne Entwicklermodus; deine Einstellungen und Alarme bleiben, weil die ID gleich ist. |
| 0005 | **Gesperrt am rechten Rand scrollen**: Gesperrte Fenster (Details, Kampfverlauf, Plugin-Fenster, Dock) nehmen die Maus noch in einem 24 px breiten Streifen an ihrem rechten Rand an, wo die Bildlaufleiste ist. Dort scrollt das Mausrad, überall sonst gehen Klicks ins Spiel. Gesperrt bieten die Fenster an ihren Rändern keine Größenänderung an, damit der ganze Streifen zum Scrollen da ist. Abschalten: Einstellungen → Meter-Einstellungen → „Gesperrt: am rechten Rand scrollen“. |
| 0006 | **Keine Supporter-Funktionen und keine Links zum Autor**: Weg sind „Support Me“ mit seinem Dialog (QR-Codes, Ko-fi, PayPal, Patreon, Krypto-Adressen), die Knöpfe Discord und A2Tools.app im Fuß der Einstellungen, goldene Supporter-Namen samt Schalter und Liste (wird nicht mehr geladen), „Supporter“ hinter dem Kontonamen, die Supporter-Texturen, „Send Logs to Dev“ und das Werbe-Popup für ein a2tools.app-Konto. Die Version unten in den Einstellungen öffnet die Releases dieses Repos. Die Online-Funktionen selbst (Konto, Uploads, Boss-Timer, Discord-Status) bleiben. |
| 0007 | **Gesperrt bleiben die Knöpfe klickbar**: Kopf- und Fußleiste des Meters (Schloss, Kampfverlauf, Einstellungen, Update, BOSS/DPS, Sortierung; nicht Zurücksetzen und Aufzeichnung), die Köpfe von Details (mit „History“ und Einstellungsmenü) und Kampfverlauf (mit Filtern), die Tabs und Leisten des Plugin-Docks und die Leisten der Plugins. Überall sonst gehen Klicks ins Spiel. Abschalten: Einstellungen → Meter-Einstellungen → „Gesperrt: Knöpfe bleiben klickbar“. |
| 0008 | **Plugin-Knopf am Meter**: Das Puzzle-Symbol im Kopf des Meters blendet das Plugin-Fenster (Dock) aus und wieder ein, mit den Tabs, die offen waren. Es ist etwas heller, solange das Dock zu sehen ist (keine eigene Farbe), und fehlt, solange kein Plugin im Dock ist. Gesperrt bleibt es klickbar. |
| 0009 | **Schriftgröße je Plugin**: Zwei Knöpfe (Schrift kleiner / größer) in der Leiste des Docks und im eigenen Plugin-Fenster stellen die Schriftgröße des Plugins ein, 60 % bis 125 %. Gilt pro Plugin, im Dock wie im eigenen Fenster gleich, und bleibt gespeichert. Das Plugin bekommt dabei entsprechend mehr Platz. |

### Vorgezogen aus dem Original

`clicktrough/backports/` enthält Korrekturen, die der Original-Autor schon
gemacht, aber noch in keiner Version veröffentlicht hat. Sie kommen vor die
Patches. Enthält eine neue Version des Originals den Commit schon (er steht in
der ersten Zeile jedes Patches), lässt der Build ihn weg; danach kann die Datei
gelöscht werden.

| Korrektur | Was sie macht |
|---|---|
| 0001–0004 (taengu, 24.10.2026) | **Hängender Tooltip am Meter**: Das Info-Fenster beim Drüberfahren über eine Zeile (Schaden, DPS, Fähigkeiten) blieb unter Linux/Wayland stehen, wenn das Meter das Verlassen der Zeile nicht mitbekam, etwa weil die Maus ins Spiel ging. Jetzt schließt es, sobald die Maus das Fenster verlässt, nach 4 s ohne Mausbewegung über dem Meter und wenn seine Zeile verschwindet (neuer Kampf, Zurücksetzen, Meter eingeklappt). |

### Angepasste Plugins

| Plugin | Was anders ist |
|---|---|
| Daily Checklist | **Nebeneinander**: Der Knopf neben „Edit“ stellt Daily, Weekly und One-time als Spalten nebeneinander, als breiter Balken. Zu schmal dafür, rutschen sie untereinander. |
| Event Timers | **Eingeklappt nebeneinander**: Der Knopf oben rechts in der eingeklappten Ansicht (oder Einstellungen → „Folded: layout“) stellt Events, Bosse jetzt & gleich (bis 15 min) und spätere Bosse als Spalten nebeneinander, als breiter Balken. Zu schmal dafür, rutschen sie untereinander. **Eingeklappt** (Steuerung aus) zeigt es unter den nächsten Events auch die **Bosse**: geplante Bosse, die laufen oder bald beginnen, und Weltbosse, die gerade da sind, im Zeitfenster stehen oder bald zurückkommen. Wie weit voraus: Einstellungen → „Folded: bosses due within“ (Aus, 30 min, 1 h, 2 h, 3 h; anfangs 1 h). Die nächste **Artefakt-Belagerung** bleibt eingeklappt immer sichtbar, egal wie weit sie weg ist. |

Die Anpassungen liegen in `clicktrough/plugins/<id>/`. Ändert der Autor so ein
Plugin, baut der Automat das Paket neu, und das Update kommt über den grünen
Knopf. In den Einstellungen steht bei so einem Plugin „Dev“, weil es nicht aus
dem geprüften Katalog kommt.

### Eigene Plugins

| Plugin | Was es macht |
|---|---|
| Pet Finder | Pet-Mobs in der Nähe, Suche über alle Pets (Rang, Seelen, wer die Seelen droppt, Karten) und eine Einkaufsliste für den Black Cloud Merchant; Daten und Paket-Layouts aus [PetTracker](https://github.com/0Fox2Give/PetTracker) (GPLv3). Der Knopf rechts neben den Tabs stellt im **Händler**-Tab die drei Listen als Spalten nebeneinander, als breiter Balken; zu schmal dafür, rutschen sie untereinander. |

Sie liegen vollständig in `clicktrough/own-plugins/<id>/` und kommen mit jedem
Paket, ohne Installation und ohne Entwicklermodus. Was in `dev/` liegt
(Datengenerator, Tests), bleibt draußen; `dev/ci.sh` prüft das Plugin bei jedem
Build gegen den Plugin-Decoder der gebauten Meter-Version. Wer so ein Plugin
früher über „Plugin-Ordner laden“ eingebunden hat: Der Entwicklerordner hat
Vorrang vor der mitgelieferten Kopie, also dort entfernen. Einstellungen und
gespeicherte Daten bleiben, sie hängen an der ID.

## Erstinstallation (Arch, CachyOS, EndeavourOS)

1. Meter schließen.
2. Unter [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest) die Datei `a2tools-dps-meter-….pkg.tar.zst` herunterladen.
3. Im Terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

Danach kommen Updates über den **grünen Knopf** im Titel des Meters. Er fragt
wie gewohnt nach dem Passwort.

## So läuft die Automatik

* Alle zwei Stunden sieht der Workflow [Clicktrough release](../.github/workflows/clicktrough-release.yml)
  nach, ob das Original eine neue Version hat.
* Gibt es eine, setzt er die vorgezogenen Korrekturen aus `clicktrough/backports/`
  (soweit die Version sie noch nicht hat) und die Patches aus `clicktrough/patches/`
  darauf, legt die angepassten und eigenen Plugins dazu, baut das Arch-Paket,
  prüft es mit den Tests des Projekts und der Plugins und veröffentlicht es als
  Release.
* Passt ein Patch nicht mehr (der Original-Autor hat genau diese Stellen geändert),
  wird **nichts** veröffentlicht: Dein Meter bleibt auf der letzten
  funktionierenden Version, und es öffnet sich ein Issue. Dann wird der Patch
  angepasst; ein neuer Stand in `clicktrough/patches/` baut sofort neu.
* Plugins aktualisieren sich weiter aus dem offiziellen Katalog.

Von Hand bauen: Actions → Clicktrough release → Run workflow (optional mit einer
bestimmten Version, z. B. `v2.0.76`).

## Ohne GitHub bauen

`clicktrough/a2tools-rebuild.sh` baut dasselbe lokal: Original holen,
Korrekturen und Patches anwenden, Plugins dazulegen, `makepkg`, installieren.

## Lizenz

Wie das Original GPL-3.0 (siehe `LICENSE`). Der Quellcode jedes Pakets ist das
Original zum jeweiligen Versions-Tag plus die Korrekturen und Patches in diesem
Ordner. Pet Finder steht unter GPL-3.0-or-later (`own-plugins/pet-finder/LICENSE`);
Namen und Bilder aus Aion 2 gehören ihren Rechteinhabern.
