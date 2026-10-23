# A2Tools DPS Meter · Clicktrough

Dieses Repo baut jede neue Version des [Original-Meters von taengu](https://github.com/taengu/A2Tools-DPS-Meter)
automatisch mit diesen Anpassungen neu:

| Patch | Was er macht |
|---|---|
| 0001 | **Schloss und Click-through für alle Meter-Fenster**, auch unter nativem Wayland (KDE): Ist das Meter gesperrt, lassen auch Details, Kampfverlauf, Plugin-Fenster und das Plugin-Dock Klicks durch. Einschalten: Einstellungen → Meter-Einstellungen → „Alle Meter-Fenster sperren“. |
| 0002 | **Das Meter-Fenster bleibt an seinem Platz**, wenn es wächst oder schrumpft (KDE). KWin hält sonst die Mitte eines Fensters fest, das seine Größe selbst ändert, und das Meter wandert. |
| 0003 | **Updates kommen aus diesem Repo** statt vom Original. Das offizielle Paket würde die Anpassungen sonst wieder ersetzen. |

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
