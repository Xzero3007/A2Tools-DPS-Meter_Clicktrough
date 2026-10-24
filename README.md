# A2Tools DPS Meter · Clicktrough

Inoffizieller Fork des [A2Tools DPS Meter von taengu](https://github.com/taengu/A2Tools-DPS-Meter).
Dieses Repo baut jede neue Version des Originals automatisch mit ein paar
Anpassungen für Linux (vor allem KDE Plasma unter Wayland) neu und
veröffentlicht sie als Arch-Paket.

> [!NOTE]
> Das hier ist nicht das offizielle Projekt. Fehler im Meter selbst gehören zum
> [Original](https://github.com/taengu/A2Tools-DPS-Meter/issues). Probleme mit den
> Anpassungen hier bitte in die
> [Issues dieses Repos](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/issues).

## Was anders ist

- **Schloss und Click-through für alle Meter-Fenster**, auch unter nativem
  Wayland: Ist das Meter gesperrt, lassen auch Details, Kampfverlauf,
  Plugin-Fenster und das Plugin-Dock Klicks ins Spiel durch. (Das Original kann
  seit 2.0.77 das Schloss für das Meter-Fenster unter Wayland selbst; hier gilt
  es für alle Fenster.)
- **Gesperrt bleiben die Knöpfe klickbar**: Kampfverlauf, Einstellungen,
  BOSS/DPS am Meter, die Köpfe von Details und Kampfverlauf, die Tabs des
  Plugin-Docks. Überall sonst gehen Klicks ins Spiel.
- **Gesperrt am rechten Rand scrollen**: Gesperrte Fenster nehmen das Mausrad in
  einem 24 px breiten Streifen an ihrem rechten Rand an; gesperrt gibt es dort
  keinen Resize-Rand.
- **Das Meter bleibt an seinem Platz**, wenn es wächst oder schrumpft (KDE).
- **Event Timers zeigt eingeklappt auch die Bosse**, die laufen oder bald
  beginnen, und immer die nächste Artefakt-Belagerung.
- **Keine Spendenlinks** in den Einstellungen.
- **Updates kommen aus diesem Repo**, damit ein offizielles Update die
  Anpassungen nicht wieder ersetzt.

Alle Einstellungen, die Patches im Einzelnen und wie die Automatik arbeitet:
[clicktrough/LIESMICH.md](clicktrough/LIESMICH.md).

## Installieren (Arch, CachyOS, EndeavourOS)

1. Meter schließen.
2. Unter [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest)
   die Datei `a2tools-dps-meter-….pkg.tar.zst` herunterladen.
3. Im Terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

Danach kommen Updates über den **grünen Knopf** im Titel des Meters.

Was das Meter allgemein kann und wie man es einrichtet (Proton, Netzwerk-Mitschnitt,
OBS-Overlay …), steht beim Original:
[README](https://github.com/taengu/A2Tools-DPS-Meter#readme) und
[Linux-Anleitung](https://github.com/taengu/A2Tools-DPS-Meter/blob/main/docs/linux.md).

## Lizenz und Herkunft

- Das Meter stammt von taengu und den Mitwirkenden des
  [Originals](https://github.com/taengu/A2Tools-DPS-Meter) und steht unter der
  GPL-3.0 ([LICENSE](LICENSE)). Das gilt für dieses Repo und jedes Paket daraus
  genauso.
- Geändert ist nur, was in [`clicktrough/`](clicktrough/) liegt: die Patches
  (jeder mit Datum im Kopf) und der Bauablauf. Der Quellcode jedes Pakets ist
  das Original zum jeweiligen Versions-Tag plus diese Patches.
- Wie im Original: Teile des Parsers stammen aus
  [Daevalog](https://github.com/Seralth/Daevalog) von Seralth (GPL-3.0). Die
  mitgelieferten Schriften stehen unter der SIL Open Font License 1.1; ihre
  Lizenzen liegen bei den Schriften in `public/vendor/fonts/`.
