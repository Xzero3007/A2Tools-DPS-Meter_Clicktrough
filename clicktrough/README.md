# A2Tools DPS Meter · Clicktrough

This repo rebuilds every new version of the [original meter by taengu](https://github.com/taengu/A2Tools-DPS-Meter)
automatically with these changes:

| Patch | What it does |
|---|---|
| 0001 | **Lock and click-through for every meter window**, on native Wayland (KDE) too: with the meter locked, Details, Battle History, plugin windows and the plugin dock let clicks through as well. Turn on: Settings → Meter settings → "Lock all meter windows". |
| 0002 | **The meter window stays in place** as it grows or shrinks (KDE). Otherwise KWin keeps the centre of a window that resizes itself, and the meter wanders. |
| 0003 | **Updates come from this repo** instead of the original. The official package would otherwise replace the changes again. |
| 0004 | **Changed plugins come with the package** (`data/ct-plugins`). They replace the installed copy of the same plugin, without developer mode too; your settings and alerts stay, as the id is the same. |
| 0005 | **Scrolling at the right edge when locked**: locked windows (Details, Battle History, plugin windows, dock) still take the mouse in a 24 px strip at their right edge, where the scroll bar is. The wheel scrolls there; everywhere else clicks go to the game. Locked, the windows offer no resizing at their edges, so the whole strip is there for scrolling. Turn off: Settings → Meter settings → "Locked: scroll at the right edge". |
| 0006 | **No supporter features and no links to the author**: gone are "Support Me" with its dialog (QR codes, Ko-fi, PayPal, Patreon, crypto addresses), the Discord and A2Tools.app buttons at the foot of Settings, golden supporter names with their switch and list (no longer loaded), "Supporter" after the account name, the supporter textures, "Send Logs to Dev" and the pop-up promoting an a2tools.app account. The version at the bottom of Settings opens this repo's releases. The online features themselves (account, uploads, boss timers, Discord status) stay. |
| 0007 | **Buttons stay clickable when locked**: the meter's header and footer (lock, Battle History, Settings, update, BOSS/DPS, sorting; not reset and recording), the headers of Details (with "History" and its settings menu) and Battle History (with its filters), the plugin dock's tabs and bars, and the plugins' bars. Everywhere else clicks go to the game. Turn off: Settings → Meter settings → "Locked: buttons stay clickable". |
| 0008 | **A plugins button on the meter**: the puzzle icon in the meter's header hides and shows the plugin window (dock), with the tabs that were open. It is a little brighter while the dock shows (no colour of its own) and missing while no plugin is in the dock. Locked, it stays clickable. |
| 0009 | **Text size per plugin**: two buttons (text smaller / larger) in the dock's bar and in a plugin's own window set the plugin's text size, 60 % to 125 %. Per plugin, the same in the dock and in its own window, and kept. The plugin gets correspondingly more room. |
| 0010 | **The world around the player for plugins** (permission `events:world`): at most four times a second, the zone, where you are, and the monsters and objects around you with their ids and places. The game sends your own position only with some actions, so it is the last exact report (an action pose, an effect you put on, a teleport) for 4 s, then the middle of the entities around you (about 10 m off). Frame layouts and estimate from SkeeveAN's Aion-DPS-Meter (MIT). |
| 0011 | **Plugins share with each other** (permissions `share` and `events:shared`): a plugin hands other plugins a value, e.g. Pet Finder and Pet Soul Tracker the pets they follow, which the Map plugin shows. |
| 0012 | **Plugins read their own files through the meter** (`a2.file`): an image or JSON file of the plugin's own folder as a `data:` URL, from its window, dock tab and widgets. WebKitGTK 2.54 refuses every file a plugin's sandboxed frame asks for once its page has started, so the Map plugin showed its marks without the map under them. |

### Taken early from the original

`clicktrough/backports/` holds fixes the original's author has made but not
released in a version yet. They go before the patches. Once a new version of
the original contains the commit (it is on the first line of each patch), the
build leaves it out; the file can be deleted then.

| Fix | What it does |
|---|---|
| 0001–0004 (taengu, 2026-10-24) | **Stuck tooltip on the meter**: the box that opens when you hover a row (damage, DPS, skills) stayed up on Linux/Wayland when the meter missed the pointer leaving the row, e.g. because it went straight into the game. It now closes as soon as the pointer leaves the window, after 4 s without pointer movement over the meter, and when its row goes away (new fight, reset, meter folded). |

### Changed plugins

| Plugin | What's different |
|---|---|
| Daily Checklist | **Side by side**: the button next to "Edit" puts Daily, Weekly and One-time side by side as columns, a wide bar. Too narrow for that, they wrap under each other. |
| Pet Soul Tracker | **For the Map plugin**: the pets pinned and those being farmed go to the map (`share`), which shows where their monsters are; a monster's map link shows its spawn points on the Map instead of opening the website. |
| Event Timers | **Folded**, with the controls off, it shows the **bosses** below the next events too: scheduled bosses running or starting soon, and world bosses that are up, in their window or back soon, in three parts: **now** (up, running, in their window), **soon** (within 15 min) and **later** (within Settings → "Folded: bosses due within": off, 30 min, 1 h, 2 h, 3 h; 1 h at first). The next **Artifact Siege** always stays visible folded, however far off. The bar at the top of the folded view has a button for each part (**Events, Now, Soon, Later**) to show or hide it, and the layout button (or Settings → "Folded: layout") puts the parts **side by side** as columns, a wide bar; too narrow for that, they wrap under each other. Side by side an empty part keeps its column. |

The changes live in `clicktrough/plugins/<id>/`. When the author changes such
a plugin, the build makes a new package, and the update comes through the
green button. In Settings such a plugin shows "Dev", as it doesn't come from
the reviewed catalogue.

### Own plugins

| Plugin | What it does |
|---|---|
| Map | The map you are on (Verteron, Altgard, the Abyss, 25 instances) with **your position**, the pets Pet Finder and Pet Soul Tracker follow (red; pinned with a gold ring, farmed with a white one), the pet monsters around you, **Monsters** around you, **Gathering** spots by kind, **Hidden Cubes** in range and **Kibelisk** camps, each layer on or off (the gathering kinds by kind: Herbs, Ore, Wood, Fibers, Cooking, Gemstones, Odyle, Empyrean Traces); the next pet to go for, which way and how far. **Search** for a gathering spot (Orichalcum, Aria ...), a pet, a monster or a Kibelisk camp: all its places with a gold ring and the nearest as Next. **Overlay** opens a small map that follows you over the game: resize it by its corner, its own opacity, the wheel zooms, lockable so clicks go to the game. Maps and data from SkeeveAN's [Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT). |
| Pet Finder | Pet mobs near you **with how far and which way**, a search over every pet (rank, souls, who drops the souls, maps) and a shopping list for the Black Cloud Merchant; data and packet layouts from [PetTracker](https://github.com/0Fox2Give/PetTracker) (GPLv3). Its pinned pets and those not at rank 3 go to the Map plugin; a pet's region links show its spawn points on the Map instead of a website. The button right of the tabs puts the **Merchant** tab's three lists side by side as columns, a wide bar; too narrow for that, they wrap under each other. English only, in the meter's neutral colours. |

They live complete in `clicktrough/own-plugins/<id>/` and come with every
package, with no install and no developer mode. What lies in `dev/` (data
generator, tests) stays out; `dev/ci.sh` checks the plugin on every build
against the plugin decoder of the meter version being built. If you loaded
such a plugin earlier through "Load plugin folder": a developer folder wins
over the bundled copy, so remove it there. Settings and saved data stay; they
belong to the id.

## First install (Arch, CachyOS, EndeavourOS)

1. Close the meter.
2. From [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest) download `a2tools-dps-meter-….pkg.tar.zst`.
3. In a terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

After that, updates come through the **green button** in the meter's title.
It asks for the password as usual.

## How the automation works

* Every two hours the [Clicktrough release](../.github/workflows/clicktrough-release.yml)
  workflow checks whether the original has a new version.
* If so, it puts the fixes from `clicktrough/backports/` (as far as the version
  doesn't have them yet) and the patches from `clicktrough/patches/` on it, adds
  the changed and own plugins, builds the Arch package, checks it with the
  project's and the plugins' tests and publishes it as a release.
* If a patch no longer fits (the original's author changed exactly those
  places), **nothing** is published: your meter stays on the last working
  version, and an issue opens. Then the patch gets adapted; a new state in
  `clicktrough/` builds right away.
* Plugins from the official catalogue keep updating from there.

Build by hand: Actions → Clicktrough release → Run workflow (optionally with a
version, e.g. `v2.0.77`).

## Building without GitHub

`clicktrough/a2tools-rebuild.sh` builds the same locally: fetch the original,
apply the fixes and patches, add the plugins, `makepkg`, install.

## License

GPL-3.0 like the original (see `LICENSE`). The source of every package is the
original at its version tag plus the fixes and patches in this folder. Pet
Finder and Map are licensed under the GPL-3.0-or-later (`own-plugins/*/LICENSE`);
Map's maps and data and patch 0010's layouts come from SkeeveAN's
Aion-DPS-Meter under the MIT licence (`own-plugins/map/NOTICE-SkeeveAN.txt`).
AION 2 names, maps and images belong to their rights holders.
