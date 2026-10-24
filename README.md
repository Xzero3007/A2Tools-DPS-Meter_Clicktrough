# A2Tools DPS Meter · Clicktrough

An unofficial fork of the [A2Tools DPS Meter by taengu](https://github.com/taengu/A2Tools-DPS-Meter).
This repo rebuilds every new version of the original automatically with a few
changes for Linux (KDE Plasma on Wayland above all) and publishes it as an Arch
package.

> [!NOTE]
> This is not the official project. Bugs in the meter itself belong to the
> [original](https://github.com/taengu/A2Tools-DPS-Meter/issues). Problems with
> the changes made here go to the
> [issues of this repo](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/issues).

## What's different

- **Lock and click-through for every meter window**, on native Wayland too:
  with the meter locked, Details, Battle History, plugin windows and the plugin
  dock let clicks through to the game as well. (Since 2.0.77 the original locks
  the meter window on Wayland itself; here it covers every window.)
- **Buttons stay clickable when locked**: Battle History, Settings, BOSS/DPS
  on the meter, the headers of Details and Battle History, the plugin dock's
  tabs. Everywhere else clicks go to the game.
- **A plugins button on the meter** shows and hides the plugin window.
- **Text size per plugin**: smaller / larger right in the plugin window's bar.
- **Scrolling at the right edge when locked**: locked windows take the mouse
  wheel in a 24 px strip at their right edge; locked, there is no resize edge
  there.
- **The meter stays in place** as it grows or shrinks (KDE).
- **Event Timers folded** also shows the bosses up or due soon and always the
  next Artifact Siege, below each other or side by side in columns (Events,
  bosses now, soon and later), each part shown or hidden with a button. The
  **Daily Checklist** the same way: Daily, Weekly and One-time as columns.
- **Pet Finder built in**: pet mobs near you, a search over every pet and a
  Black Cloud Merchant shopping list (data from
  [PetTracker](https://github.com/0Fox2Give/PetTracker)); the Merchant tab
  optionally in columns.
- **No stuck tooltip**: the box that opens when you hover a row closes
  reliably on Linux (the original's fix, here before its next version).
- **No supporter features and no links to the author** in the app.
- **Updates come from this repo**, so an official update doesn't replace the
  changes again.

Every setting, the patches one by one and how the automation works:
[clicktrough/README.md](clicktrough/README.md).

## Install (Arch, CachyOS, EndeavourOS)

1. Close the meter.
2. From [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest)
   download `a2tools-dps-meter-….pkg.tar.zst`.
3. In a terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

After that, updates come through the **green button** in the meter's title.

What the meter does in general and how to set it up (Proton, packet capture,
OBS overlay …) is covered by the original:
[README](https://github.com/taengu/A2Tools-DPS-Meter#readme) and
[Linux guide](https://github.com/taengu/A2Tools-DPS-Meter/blob/main/docs/linux.md).

## License and origin

- The meter is by taengu and the contributors of the
  [original](https://github.com/taengu/A2Tools-DPS-Meter) and is licensed under
  the GPL-3.0 ([LICENSE](LICENSE)). That holds for this repo and every package
  built from it.
- Only what lies in [`clicktrough/`](clicktrough/) is changed: the patches
  (each dated in its header), fixes taken early from the original, the plugins
  and the build. The source of every package is the original at its version
  tag plus these patches.
- Pet Finder (`clicktrough/own-plugins/pet-finder`) takes its data and packet
  layouts from [PetTracker](https://github.com/0Fox2Give/PetTracker) and is
  licensed under the GPL-3.0-or-later. AION 2 names and images belong to their
  rights holders.
- As in the original: parts of the parser come from
  [Daevalog](https://github.com/Seralth/Daevalog) by Seralth (GPL-3.0). The
  bundled fonts are under the SIL Open Font License 1.1; their licenses are
  with the fonts in `public/vendor/fonts/`.
