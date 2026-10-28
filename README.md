# A2Tools DPS Meter · Clicktrough

A personal version of the A2Tools DPS Meter for AION 2, shared as a public
fork because it is one.

- **Built on the [A2Tools DPS Meter by taengu](https://github.com/taengu/A2Tools-DPS-Meter)**
  and its contributors: all credit for the meter goes to them. This repo
  builds the original's version 2.0.80 with its own changes (for Linux, KDE
  Plasma on Wayland above all) and publishes it as an Arch package. Newer
  versions of the original are taken only when something fundamental changed
  and it was decided.
- **The plugins** (this build's own and its changes to the original's) live
  in [A2Tools-Clicktrough-Plugins](https://github.com/Xzero3007/A2Tools-Clicktrough-Plugins)
  and come with every package here.
- **Pet Finder builds on [PetTracker by 0Fox2Give](https://github.com/0Fox2Give/PetTracker)**
  (its data and packet layouts) and on A2 Tools' Pet Soul Tracker (its pet
  list).
- Everything else it takes from others, and under which licence:
  [License and origin](#license-and-origin).

> [!NOTE]
> This is not the official project and not affiliated with A2 Tools or
> NCSOFT. It is made for my own use; no support is promised. Bugs in the
> meter itself belong to the
> [original](https://github.com/taengu/A2Tools-DPS-Meter/issues); problems
> with the changes made here go to the
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
- **A map with your position**: the Map plugin shows the map you are on (the
  game's own world maps, whole: Verteron, Altgard, the Abyss, Poeta,
  Ishalgen), where you are (steadied, with a ring for how far off it may
  be) and in which region, Pet Finder's favourite and farmed pets, monsters around, gathering spots by kind, Hidden Cubes, Monolith
  pieces, Kibelisk camps, sealed dungeons and other places, each layer on or
  off, and a search (e.g. "Orichalcum" or "Hidden Cube": all its spots and the
  nearest); and an overlay with a small map that follows you, the next pet to
  go for and how far, in four sizes or resized from its corners, with its own
  opacity (data from SkeeveAN's
  [Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) and the
  [AION2 Interactive Map](https://github.com/aion2-interactive-map/aion2-interactive-map)).
- **The plugins button** in the meter's header turns the plugin window and
  every plugin's widgets (the Map overlay) off and on.
- **Usable with the game closed**: "Hide when AION2 isn't focused" hides the
  meter only while AION2 runs.
- **Market**: your server's prices of the gathered materials (from
  [aion2.exchange](https://aion2.exchange), read from the fork's hourly copy
  of them, which is fast where the site is slow), what they cost made from
  Odyle (Substance Morph), what every recipe costs and brings with and
  without morphing, and which recipes need each material, with its cost.
- **Market, sorted your way**: Asmodian or Elyos items only, favourites
  with a star (listed first on request), headers that stay while scrolling,
  a click on a material for the recipes that need it, and a map button for
  where it is gathered.
- **The way there on the Map**: for a search, a field boss (map button in
  Event Timers) or a material (map button in the Market), the Kibelisk to
  teleport to and a line from it; field bosses on the map; larger marks
  (100–175 %); and the gathering spots and pets your meter sees are added
  and kept, so the map fills as you play.
- **Window sizes to switch between**: buttons 1, 2, 3 beside the text size
  of the plugin dock and of a plugin's window switch it between three sizes;
  a right-click keeps the window's size now under a button. Clickable while
  locked.
- **Pet Finder built in, one pet list**: the Pet Soul Tracker's list as its
  Pets tab (favourites ★ first everywhere and on the Map with the pet you
  farm), pet mobs near you with how far and which way, and a Black Cloud
  Merchant shopping list (data from
  [PetTracker](https://github.com/0Fox2Give/PetTracker)); the Merchant tab
  optionally in columns. The original's Pet Soul Tracker isn't shipped:
  Pet Finder replaces it.
- **Every plugin of the original, from this repo**: Settings → Plugins →
  Available installs any of them as this repo's build took them (tagged
  Clicktrough), test plugins too, such as Enhanced Boss Telegraph; a watch
  reports the original's new plugins, and they come in once chosen.
- **Nothing is sent, no account**: no A2 Tools account or sign-in prompt, no
  uploads, leaderboards or reports, no links to websites in the meter or its
  plugins. The meter only downloads: its updates from this repo, the market
  prices, and the world boss and Abyss siege timers players share.
- **Updates come from this repo**, so an official update doesn't replace the
  changes again; the green button looks for one every 20 minutes. Plugin
  updates too come only with a release here, never straight from the
  original's catalog.

Every setting, the patches one by one and how the automation works:
[clicktrough/README.md](clicktrough/README.md).

## Install (Arch, CachyOS, EndeavourOS)

1. Close the meter.
2. From [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest)
   download `a2tools-dps-meter-….pkg.tar.zst`.
3. In a terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

After that, updates come through the **green button** in the meter's title.

What the meter does in general and how to set it up (Proton, packet capture
…) is covered by the original (its account, uploads and stream overlay are
not in this build):
[README](https://github.com/taengu/A2Tools-DPS-Meter#readme) and
[Linux guide](https://github.com/taengu/A2Tools-DPS-Meter/blob/main/docs/linux.md).

## License and origin

- The meter is by taengu and the contributors of the
  [original](https://github.com/taengu/A2Tools-DPS-Meter) and is licensed under
  the GPL-3.0 ([LICENSE](LICENSE)). That holds for this repo and every package
  built from it.
- Only what lies in [`clicktrough/`](clicktrough/) is changed: the patches
  (each dated in its header), fixes taken early from the original and the
  build. The source of every package is the original at its version tag plus
  these patches, and the plugins repo at the commit its release notes name;
  every change is described in [clicktrough/README.md](clicktrough/README.md).
- Pet Finder (`plugins/pet-finder` in the plugins repo) takes its data and packet
  layouts from [PetTracker](https://github.com/0Fox2Give/PetTracker) by
  0Fox2Give (GPL-3.0) and its
  Pets tab from A2 Tools' Pet Soul Tracker
  ([A2Tools-Plugins](https://github.com/taengu/A2Tools-Plugins), GPL-3.0, see
  `NOTICE-PetSoulTracker.txt` there); its own parts are licensed under the
  GPL-3.0-or-later, the whole under the GPL-3.0. The Map plugin
  (`plugins/map` there, GPL-3.0-or-later) and the meter's position
  service (patch 0010) take their maps, map data, frame layouts and position
  estimate from SkeeveAN's
  [Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT, see
  `NOTICE-SkeeveAN.txt` there). The Map plugin's Hidden Cube spots, Monolith
  pieces, places, regions and its calibration of Verteron and Altgard come
  from the data of the
  [AION2 Interactive Map](https://github.com/aion2-interactive-map/aion2-interactive-map)
  by Yihao Liu (tc-imba), under CC BY-NC 4.0: that data may be used for
  non-commercial purposes only (see `NOTICE-AION2-Interactive-Map.txt`
  there). The world map pictures are the game's own (© NCSOFT), as the AION2
  Interactive Map publishes them. AION 2 names, maps and images belong to
  their rights holders.
- As in the original: parts of the parser come from
  [Daevalog](https://github.com/Seralth/Daevalog) by Seralth (GPL-3.0). The
  bundled fonts are under the SIL Open Font License 1.1; their licenses are
  with the fonts in `public/vendor/fonts/`.
