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
| 0006 | **Keine Spendenlinks**: Der Knopf „Support Me“ in den Einstellungen und sein Dialog (QR-Codes, Ko-fi, PayPal, Patreon, Krypto-Adressen) sind entfernt. |
| 0007 | **Gesperrt bleiben die Knöpfe klickbar**: Kopf- und Fußleiste des Meters (Schloss, Kampfverlauf, Einstellungen, Update, BOSS/DPS, Sortierung; nicht Zurücksetzen und Aufzeichnung), die Köpfe von Details (mit „History“ und Einstellungsmenü) und Kampfverlauf (mit Filtern), die Tabs und Leisten des Plugin-Docks und die Leisten der Plugins. Überall sonst gehen Klicks ins Spiel. Abschalten: Einstellungen → Meter-Einstellungen → „Gesperrt: Knöpfe bleiben klickbar“. |

### Angepasste Plugins

| Plugin | Was anders ist |
|---|---|
| Event Timers | **Eingeklappt** (Steuerung aus) zeigt es unter den nächsten Events auch die **Bosse**: geplante Bosse, die laufen oder bald beginnen, und Weltbosse, die gerade da sind, im Zeitfenster stehen oder bald zurückkommen. Wie weit voraus: Einstellungen → „Folded: bosses due within“ (Aus, 30 min, 1 h, 2 h, 3 h; anfangs 1 h). Die nächste **Artefakt-Belagerung** bleibt eingeklappt immer sichtbar, egal wie weit sie weg ist. |

Die Anpassungen liegen in `clicktrough/plugins/<id>/`. Ändert der Autor so ein
Plugin, baut der Automat das Paket neu, und das Update kommt über den grünen
Knopf. In den Einstellungen steht bei so einem Plugin „Dev“, weil es nicht aus
dem geprüften Katalog kommt.

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
* Gibt es eine, setzt er die Patches aus `clicktrough/patches/` darauf, baut das
  Arch-Paket, prüft es mit den Tests des Projekts und veröffentlicht es als Release.
* Passt ein Patch nicht mehr (der Original-Autor hat genau diese Stellen geändert),
  wird **nichts** veröffentlicht: Dein Meter bleibt auf der letzten
  funktionierenden Version, und es öffnet sich ein Issue. Dann wird der Patch
  angepasst; ein neuer Stand in `clicktrough/patches/` baut sofort neu.
* Plugins aktualisieren sich weiter aus dem offiziellen Katalog.

Von Hand bauen: Actions → Clicktrough release → Run workflow (optional mit einer
bestimmten Version, z. B. `v2.0.76`).

## Ohne GitHub bauen

`clicktrough/a2tools-rebuild.sh` baut dasselbe lokal: Original holen, Patches
anwenden, `makepkg`, installieren.

## Lizenz

Wie das Original GPL-3.0 (siehe `LICENSE`). Der Quellcode jedes Pakets ist das
Original zum jeweiligen Versions-Tag plus die Patches in diesem Ordner.
