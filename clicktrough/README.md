# A2Tools DPS Meter · Clicktrough

This repo builds the Clicktrough version of the [original meter by taengu](https://github.com/taengu/A2Tools-DPS-Meter):
the original at the version in `clicktrough/BASE` (now v2.0.80) with these
changes. Newer versions of the original are not taken on by themselves: the
"Original watch" reports them, and they are taken only when something
fundamental changed and the decision is made (raise `BASE`, adapt the
patches).

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
| 0026 | **Left-out plugins don't run**: the original's plugins this repo leaves out (the plugins repo's `original/left-out.txt`: Pet Soul Tracker, whose list is Pet Finder's) never run, not even a copy installed earlier from the original. Their saved data stays. |
| 0027 | **Odyle energy only ever the playing character's**: after switching to a twink, the title kept showing the last character's energy (e.g. 390 (+50) where the game said 0) as if it were live. Now energy that belongs to another character is never shown as the current one's, and a character with no energy left (sent without a value) is read as 0 where it wasn't. A login whose list doesn't read is logged. |
| 0028 | **Character values with the time the game said them**: plugins (Roster) now learn when the game last reported each value (Odyle energy, content counts, shop limits, crafts, Kinah, Abyss Points), also when it reported one unchanged; before, the same count a week later looked a week old and showed as reset (≈0). **Shop limits and crafts are kept per character**: the game sends them only as the shop or crafting window opens, and the meter dropped them at every login; now they come back when that character plays again. A login's Kinah that comes after the game named who logged in is theirs at once instead of minutes later. |
| 0029 | **The plugins' order is yours**: Settings → Plugins → Installed has arrows ↑ ↓ per plugin, and the plugin window's tabs follow that order. Dragging a tab in the plugin window works now too (press, move, let go over another tab; on Linux the old way never moved one) and sets the same order; an open Settings shows it at once. Kept across restarts. |
| 0030 | **Two buttons beside the plugin window's opacity slider**: one makes the window **fully opaque** and goes back to the slider's value at the next press. The **lock** next to it is the plugin window's own: with every meter window locked it **frees the plugin window alone** (click and scroll in your plugins, the meter still lets clicks through), pressed again it is locked like the rest; with the windows free it locks the plugin window alone. When you lock or unlock all windows, the plugin window follows that again. Pressed, both show in gold; both stay clickable while locked. (The first release of it showed the two as plain white boxes: a style left open; fixed.) |
| 0031 | **The plugin window opens the tab you had open**: hidden with the plugins button (or its ×) and shown again, it opened the first plugin; it now opens the one open before. The same for a single plugin: open when you hid it, it is the open one again when it comes back. |

### Taken early from the original

`clicktrough/backports/` holds fixes the original's author has made but not
released in a version yet. They go before the patches. Once a new version of
the original contains the commit (it is on the first line of each patch), the
build leaves it out; the file can be deleted then.

None at the moment: the stuck-tooltip fixes taken early (2026-10-24) are in
the original's 2.0.79.

### Plugins

The plugins live in their own repo,
[A2Tools-Clicktrough-Plugins](https://github.com/Xzero3007/A2Tools-Clicktrough-Plugins):
this build's own (Map, Market, Pet Finder), its changes to the original's
(Daily Checklist, Event Timers, Roster, Enhanced Boss Telegraph), and the
commit the original's plugins are frozen at. Every release here puts them into
the package (that repo's `build/assemble.sh`), so they come through the green
button with the meter. Pet Soul Tracker is left out (patch 0026): its list is
Pet Finder's Pets tab.

## First install (Arch, CachyOS, EndeavourOS)

1. Close the meter.
2. From [Releases](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough/releases/latest) download `a2tools-dps-meter-….pkg.tar.zst`.
3. In a terminal:

       sudo pacman -U ~/Downloads/a2tools-dps-meter-*.pkg.tar.zst

After that, updates come through the **green button** in the meter's title.
It asks for the password as usual.

## How the automation works

* Every hour the [Clicktrough release](../.github/workflows/clicktrough-release.yml)
  workflow checks whether anything here or in the plugins repo changed
  (GitHub starts scheduled workflows late and drops many: in practice every
  few hours). A push to `clicktrough/` here starts it at once.
* If so, it takes the original at `clicktrough/BASE`, puts the fixes from
  `clicktrough/backports/` and the patches from `clicktrough/patches/` on it,
  adds the plugins as the plugins repo puts them together, builds the Arch
  package, checks it with the project's and the plugins' tests and publishes
  it as a release. The notes list the plugins that changed.
* If a patch no longer fits, **nothing** is published: your meter stays on the
  last working version, and an issue opens.
* Plugin updates come only with these releases (patch 0020).
* Every hour the [Original watch](../.github/workflows/plugin-watch.yml)
  looks at the original. A new version of the meter: an issue (label
  `original-watch`) with its changes, to decide whether to take it. A new
  plugin, a new version of one, one reaching the catalog or gone: an issue
  (label `plugin-watch`) with what it does and asks for. Nothing is taken in
  by itself. What it has seen stays on the branch `plugin-watch`
  (`clicktrough/watch/plugin_watch.py`).
* Every hour [Market prices](../.github/workflows/market-prices.yml) copies
  aion2.exchange's prices to the branch `market-data`, which the Market plugin
  reads first.

Build by hand: Actions → Clicktrough release → Run workflow (optionally with a
version, e.g. `v2.0.80`).

## Working on it

`CLAUDE.md` at the top of the repo holds the rules and the way of working for
Claude sessions (and anyone else); the plugins repo has its own.
`clicktrough/dev/setup-workspace.sh` makes the working clones in a few
seconds: the original meter with every patch (`../ct-src`), the plugins repo
and the original's plugins with theirs (`../ct-plugins`); `--build` adds a
debug build with the plugins in place, which `clicktrough/dev/run-meter.sh`
runs on a virtual screen.

## Building without GitHub

`clicktrough/a2tools-rebuild.sh` builds the same locally: fetch the original
at `BASE`, apply the fixes and patches, add the plugins from the plugins repo,
`makepkg`, install.

## License

GPL-3.0 like the original (see `LICENSE`). The source of every package is the
original at its version tag plus the fixes and patches in this folder, and the
plugins repo at the commit the release notes name. Patch 0010's layouts come
from SkeeveAN's Aion-DPS-Meter under the MIT licence. The plugins' licences
and sources are in the plugins repo. AION 2 names, maps and images belong to
their rights holders.
