# A2Tools DPS Meter · Clicktrough

This repo rebuilds every new version of the [original meter by taengu](https://github.com/taengu/A2Tools-DPS-Meter)
automatically with these changes:

| Patch | What it does |
|---|---|
| 0001 | **Lock and click-through for every meter window**, on native Wayland (KDE) too: with the meter locked, Details, Battle History, plugin windows and the plugin dock let clicks through as well. Turn on: Settings → Meter settings → "Lock all meter windows". |
| 0002 | **The meter window stays in place** as it grows or shrinks (KDE). Otherwise KWin keeps the centre of a window that resizes itself, and the meter wanders. |
| 0003 | **Updates come from this repo** instead of the original. The official package would otherwise replace the changes again. (From 2.0.80 the meter checks for updates itself and only takes the original's signed ones from its own site; this build takes only this repo's releases and never installs a package from the original's site.) |
| 0004 | **Changed plugins come with the package** (`data/ct-plugins`). They replace the installed copy of the same plugin, without developer mode too; your settings and alerts stay, as the id is the same. |
| 0005 | **Scrolling at the right edge when locked**: locked windows (Details, Battle History, plugin windows, dock) still take the mouse in a 24 px strip at their right edge, where the scroll bar is. The wheel scrolls there; everywhere else clicks go to the game. Locked, the windows offer no resizing at their edges, so the whole strip is there for scrolling. Turn off: Settings → Meter settings → "Locked: scroll at the right edge". |
| 0006 | **No supporter features and no links to the author**: gone are "Support Me" with its dialog (QR codes, Ko-fi, PayPal, Patreon, crypto addresses), the Discord and A2Tools.app buttons at the foot of Settings, golden supporter names with their switch and list (no longer loaded), "Supporter" after the account name, the supporter textures, "Send Logs to Dev" and the pop-up promoting an a2tools.app account. The version at the bottom of Settings opens this repo's releases. The online features themselves (account, uploads, boss timers, Discord status) stay. |
| 0007 | **Buttons stay clickable when locked**: the meter's header and footer (lock, Battle History, Settings, update, BOSS/DPS, sorting; not reset and recording), the headers of Details (with "History" and its settings menu) and Battle History (with its filters), the plugin dock's tabs and bars, and the plugins' bars. Everywhere else clicks go to the game. Turn off: Settings → Meter settings → "Locked: buttons stay clickable". |
| 0008 | **A plugins button on the meter**: the puzzle icon in the meter's header hides and shows the plugin window (dock), with the tabs that were open. It is a little brighter while the dock shows (no colour of its own) and missing while no plugin is in the dock. Locked, it stays clickable. |
| 0009 | **Text size per plugin**: two buttons (text smaller / larger) in the dock's bar and in a plugin's own window set the plugin's text size, 60 % to 125 %. Per plugin, the same in the dock and in its own window, and kept. The plugin gets correspondingly more room. |
| 0010 | **The world around the player for plugins** (permission `events:world`): at most four times a second, the zone, where you are, and the monsters and objects around you with their ids and places. The game sends your own position only with some actions, so it is the last exact report (an action pose, an effect you put on, a teleport) for 4 s, then the middle of the entities around you (about 10 m off). Frame layouts and estimate from SkeeveAN's Aion-DPS-Meter (MIT). |
| 0011 | **Plugins share with each other** (permissions `share` and `events:shared`): a plugin hands other plugins a value, e.g. Pet Finder and Pet Soul Tracker the pets they follow, which the Map plugin shows. |
| 0012 | **Plugins read their own files through the meter** (`a2.file`): an image or JSON file of the plugin's own folder as a `data:` URL, from its window, dock tab and widgets. WebKitGTK 2.54 refuses every file a plugin's sandboxed frame asks for once its page has started, so the Map plugin showed its marks without the map under them. |
| 0013 | **Widgets resized from their corners** (`a2.widget.resize`): the window manager resizes a widget from the corner or edge the player drags, as the meter's own windows, and the widget hears its new size (`resized`). Before, a plugin could only open its widget again at a new size, step by step as the pointer moved: the Map overlay's corner was "buggy". |
| 0014 | **"Hide when AION2 isn't focused" only while AION2 runs**: with the game closed nothing counting as the game could be in front, so the meter hid 1.5 s after every start, Settings with it, and could hardly be used. It now stays (unless "Hide while AION2 is closed" is on), and a meter the auto-hide hid comes back when the game closes. |
| 0015 | **The plugins button turns the widgets off too**: the puzzle button in the meter's header hides the plugin window and every plugin's widgets (the Map overlay), also after a restart, until it turns them on again. |
| 0016 | **Plugins read a listed web service** (`a2.web.get`, permission `web:<host>`): the JSON answer of a service the meter lists, for now only aion2.exchange (its public API of the market prices players collect), for the Market plugin. On raw.githubusercontent.com only this fork's branch `market-data` (the hourly price copy). GET over https only, nothing else; one address at most once a minute, one host at most four times a second. A failed request says why ("could not connect: … Connection refused", "no answer in time", "the service is down right now"), not only "error sending request"; a failed connection is tried once more over IPv4 alone (an IPv6 path that leads nowhere or drops large packets, which the browser on HTTP/3 never notices), a 502–504 once more after two seconds. |
| 0017 | **Window sizes to switch between, set by the player**: three numbered buttons beside the text size, in the dock's panel bar and in a plugin window's bar: a click gives the window the size kept under that button, a right-click (or Shift+click) keeps the window's size now under it. The dock has its own three, each plugin window its own; the one the window has shows pressed. Clickable while locked, where the window can't be resized from its edges. |
| 0018 | **A link whose click the plugin took doesn't open the browser**: the plugin page's own link handling opened every https link clicked, even one the plugin had handled itself (Pet Soul Tracker's map links opened Aion 2 Timers' map next to the Map plugin). |
| 0019 | **The green button looks every 20 minutes**: the meter looked for an update at start and then only every 6 hours, and a check that failed at start (the meter's bridge not up yet, no network) waited as long, so the green button in the title seldom showed and updates came through Settings. Now it looks every 20 minutes, and a minute after a failed check. |
| 0020 | **Plugin updates only from this repo**: the plugin catalog no longer offers the original author's newer versions (the green button, Settings' "Update to …"). The package ships the original's other plugins as this repo's build took them (`data/ct-plugins`, listed in `installed-only.txt`); each runs from there only where it is installed, in place of the installed copy, and a new version comes with the next release here (a change to any of them makes one). Installing a plugin from the catalog still works. |
| 0021 | **This build's plugins can be removed**: Settings' Remove did nothing for a plugin the package ships (Map, Market, Pet Finder, the changed Pet Soul Tracker, Event Timers, Daily Checklist). Now they are tagged **Clicktrough** (not "Dev"); Remove takes one away and keeps it away, and **Available** lists it to install again, which brings it back with its saved data. |
| 0022 | **Every plugin of this build installs from Available**: the original's plugins the package ships (patch 0020) could only be installed from the catalog, and a **test plugin** of the original (e.g. Enhanced Boss Telegraph: it comes in a second catalog only meters from 2.0.78 read) not at all. Now **Available** lists every plugin of this build that isn't running, tagged **Clicktrough**, in place of the catalog's entry; **Install** runs this build's copy without a download, **Remove** takes it away again. |
| 0023 | **A teleport places you at once**: the world plugins hear (patch 0010) placed you exactly only with an action, an effect or a loading screen; after a Kibelisk the Map went on guessing. The teleport record (as A2 Tools' Pet Soul Tracker 0.5.0 reads it) is now an exact report too. |
| 0024 | **This build's plugin features keep working on 2.0.80**: the original's 2.0.80 lets plugin windows use only a fixed list of the meter's functions. The ones this build adds for plugins (shared values, own files, web prices, window sizes, resizable widgets, clickable buttons in locked windows) are on it now. |
| 0025 | **Nothing is sent, no account, no sign-in prompt**: the meter is built as the original's private build. Gone: the A2 Tools account and sign-in, sharing fights and the leaderboards ("Help build the leaderboards?"), reporting boss timers and supply requests, the live boss connection, the plugin catalog (plugins come only with this repo's releases, new ones too), the supporter list, Send Logs to Dev, Discord activity and the stream overlay, with their buttons and settings. **Downloaded only**: this repo's updates, the Market's prices, and the **world boss and Abyss siege timers** players share (the files, read; nothing is reported back). The meter's network client reaches only these places; any other address is refused. Skill icons still load from the game's own picture server (NCSoft), as in the original's private build. |
| 0026 | **Left-out plugins don't run**: the original's plugins this repo leaves out (`clicktrough/plugins-left-out.txt`: Pet Soul Tracker, whose list is Pet Finder's) never run, not even a copy installed earlier from the original. Their saved data stays. |

### Taken early from the original

`clicktrough/backports/` holds fixes the original's author has made but not
released in a version yet. They go before the patches. Once a new version of
the original contains the commit (it is on the first line of each patch), the
build leaves it out; the file can be deleted then.

None at the moment: the stuck-tooltip fixes taken early (2026-10-24) are in
the original's 2.0.79.

### Changed plugins

| Plugin | What's different |
|---|---|
| Daily Checklist | **Side by side**: the button next to "Edit" puts Daily, Weekly and One-time side by side as columns, a wide bar. Too narrow for that, they wrap under each other. |
| Pet Soul Tracker | **Not shipped and doesn't run** (patch 0026): its list is **Pet Finder's Pets tab**, with the changes for the Map. |
| Enhanced Boss Telegraph | **No link** to the original's issue tracker on GitHub. |
| Event Timers | **Folded**, with the controls off, it shows the **bosses** below the next events too: scheduled bosses running or starting soon, and world bosses that are up, in their window or back soon, in three parts: **now** (up, running), **soon** (in their spawn window, or within 15 min) and **later** (within Settings → "Folded: bosses due within": off, 30 min, 1 h, 2 h, 3 h; 1 h at first). The next **Artifact Siege** always stays visible folded, however far off. The bar at the top of the folded view has a button for each part (**Events, Now, Soon, Later**) to show or hide it, and the layout button (or Settings → "Folded: layout") puts the parts **side by side** as columns, a wide bar; too narrow for that, they wrap under each other. Side by side an empty part keeps its column. A **map button** beside each world boss (on the Bosses tab, and folded after its map's name) shows it on the Map plugin, with the Kibelisk to teleport to and the way there. The credit to Aion 2 Timers under the world bosses is text, not a link. |

The changes live in `clicktrough/plugins/<id>/`. When the author changes such
a plugin, the build makes a new package, and the update comes through the
green button. In Settings such a plugin is tagged "Clicktrough"; Remove takes
it away until it is installed again under Available (patch 0021).

### Own plugins

| Plugin | What it does |
|---|---|
| Map | The map you are on (Verteron, Altgard, the Abyss, Poeta, Ishalgen, whole as the game draws its world map; 25 instances) with **your position** (steadied: the meter hears your own place only now and then, so between the fixes the mark moves smoothly and a ring shows how far off it may be), the pets Pet Finder follows (red; favourites ★ with a gold ring, the one being farmed with a white one; Pet Soul Tracker's only without Pet Finder), the pet monsters around you, **Monsters** around you, **Gathering** spots by kind and **Kibelisk** camps, each layer on or off (the gathering kinds by kind: Herbs, Ore, Wood, Fibers, Cooking, Gemstones, Odyle, Empyrean Traces); the next pet to go for, which way and how far (pinned pets first, then farmed, then the ones still needed; or pinned and farmed only, or off). **Hidden Cubes** (the known spots, and one in range), **Monoliths**, **Places** (sealed dungeons, battlefields, outposts, villages, region names); the region you are in. **Field bosses** (in Places), marks 100–175 % (125 % at first), and the gathering spots, Hidden Cubes and pet monsters your meter sees added where the map had none and kept (the data knows few: Asvata 3 in Altgard; 0.6.0 fixed that they were never kept, and learns also where the map is only guessed). **Pets: favourites / not at level 3 / all** (pets not at level 3 in their genus colour, as the Pet Soul Tracker 0.5.0's map shows them), and under the map the **nearest monsters with souls you still need** (up to four: level, how many, which way and how far, the pet and its souls left). **Search** for a field boss, a gathering spot (Orichalcum, Aria ...), a pet, a monster, a Kibelisk camp, Hidden Cube (known spots or every place one can appear), Monolith, a place or a region: all its places with a gold ring and the way there: walking, or a teleport to the Kibelisk nearest the place and a line from it, whichever is shorter; Next says which ("teleport to <Kibelisk>, then 186 m"). Map buttons in Event Timers (world bosses) and the Market (gathered materials) do the same, until its × stops it (in the Map window or at the bottom of the overlay). Without the zone (the meter started after you logged in) the map goes by what is around you, else the map you were on last. **Overlay** opens a small map that follows you over the game: sizes S, M, L, XL or any size from its corners (patch 0013), its own opacity, the wheel zooms, lockable so clicks go to the game. The world maps are the game's own pictures as the [AION2 Interactive Map](https://github.com/aion2-interactive-map/aion2-interactive-map) publishes them, calibrated by the game's map bounds (2 % larger than before, up to 90 m better at Altgard's edges; the Kibelisks agree within 6–8 m); data from SkeeveAN's [Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT) and the AION2 Interactive Map (CC BY-NC 4.0, non-commercial). |
| Market | Your server's market prices ([aion2.exchange](https://aion2.exchange)'s, first from the fork's hourly copy of them on GitHub (branch `market-data`, workflow `market-prices.yml`: aion2.exchange is slow and often briefly down), else from its public API; through patch 0016) of the **gathered materials**: Odyle, ore, gemstones, logs, herbs, cooking ingredients, lowest listing, listings, sold in 28 days and average, change. **Odyle morph**: Substance Morph turns 1 Odyle into 1 gathered material of the same grade; each material's market price against its Odyle and what morphing saves (morphed materials are bound: for crafting only), and what Odyle Energy costs through morph. **Recipes** of your faction by profession: what the product sells for (less the market's fee, 10 % unless changed), the materials bought on the market or with Odyle morphed where cheaper, the profit; a click shows each material with count, price and total, and the combo. **Materials**: every material with its price and the recipes that need it, how many and what that costs. Every list in one column layout, its header kept at the top while scrolling; **Asmodian / Elyos** beside Update (remembered): only that side's materials and recipes; a **star** makes an item a favourite in every tab and **Favorites** lists them first; a click on a gathered material or an Odyle morph row lists the recipes that need it; a **map button** beside a gathered material shows where it is gathered on the Map plugin. Recipes and names from the game client via SkeeveAN's [Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT); NPC prices as MetaBot.GG lists them, changeable. The credit to aion2.exchange is text, not a link (0.3.1). |
| Pet Finder | **One pet list**: the **Pets** tab is the Pet Soul Tracker's list, whole (A2 Tools, GPL-3.0: levels, souls to level 3, where souls drop, Farming, filters, renaming, pop up while farming), with **favourites (☆/★)** that are first in every tab and go to the Map with the pet you are farming; Pet Soul Tracker's pins are taken over once. **Nearby**: pet mobs near you **with how far and which way** and a map button each; **Merchant**: a shopping list for the Black Cloud Merchant. Nearby and Merchant data and packet layouts from [PetTracker](https://github.com/0Fox2Give/PetTracker) (GPLv3). A monster's map link shows its spawn points on the Map instead of a website. **Nearest** sorts the Pets tab by the closest spawn on your map (from the Map). The button right of the tabs puts the **Merchant** tab's three lists side by side as columns, a wide bar; too narrow for that, they wrap under each other. English only, in the meter's neutral colours. Each place a soul drops has a **Map** button that shows the monster's spawn points in the Map plugin; nothing links to a website (0.4.2). |

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

* Every hour the [Clicktrough release](../.github/workflows/clicktrough-release.yml)
  workflow checks whether the original has a new version or changed plugins
  (GitHub starts scheduled workflows late and drops many: in practice every
  few hours).
* If so, it puts the fixes from `clicktrough/backports/` (as far as the version
  doesn't have them yet) and the patches from `clicktrough/patches/` on it, adds
  the changed and own plugins, builds the Arch package, checks it with the
  project's and the plugins' tests and publishes it as a release.
* If a patch no longer fits (the original's author changed exactly those
  places), **nothing** is published: your meter stays on the last working
  version, and an issue opens. Then the patch gets adapted; a new state in
  `clicktrough/` builds right away.
* Plugin updates come only with these releases (patch 0020): the build ships
  the original's plugins, and a change to any of them makes a new release.
* Every hour the [Plugin watch](../.github/workflows/plugin-watch.yml)
  workflow reads the original's plugins ([taengu/A2Tools-Plugins](https://github.com/taengu/A2Tools-Plugins)
  and the meter's catalog) and opens an issue (label `plugin-watch`) when a
  new plugin comes, one of the repo reaches the catalog, or one is gone: name,
  version, what it does and asks for, and whether Settings can install it;
  for a new plugin it starts the release build right away, so it comes with
  the next update and Available installs it.
  What it has seen stays on the branch `plugin-watch`
  (`clicktrough/watch/plugin_watch.py`).

Build by hand: Actions → Clicktrough release → Run workflow (optionally with a
version, e.g. `v2.0.77`).

## Working on it

`CLAUDE.md` at the top of the repo holds the rules and the way of working for
Claude sessions (and anyone else). `clicktrough/dev/setup-workspace.sh` makes
the working clones in a few seconds: the original meter with every patch
(`../ct-src`) and the original's plugins with theirs (`../ct-plugins`);
`--build` adds a debug build, which `clicktrough/dev/run-meter.sh` runs on a
virtual screen.

## Building without GitHub

`clicktrough/a2tools-rebuild.sh` builds the same locally: fetch the original,
apply the fixes and patches, add the plugins, `makepkg`, install.

## License

GPL-3.0 like the original (see `LICENSE`). The source of every package is the
original at its version tag plus the fixes and patches in this folder. Pet
Finder and Map are licensed under the GPL-3.0-or-later (`own-plugins/*/LICENSE`;
Pet Finder with the Pet Soul Tracker's list, GPL-3.0, as a whole under the GPL-3.0);
Map's maps and data and patch 0010's layouts come from SkeeveAN's
Aion-DPS-Meter under the MIT licence (`own-plugins/map/NOTICE-SkeeveAN.txt`).
AION 2 names, maps and images belong to their rights holders.
