# Map (A2Tools plugin)

The map you are on, with where you are, and an overlay with a small map that
follows you over the game.

- **Your position**: the arrow points the way you walk (the game sends no
  facing). The meter knows your exact place only for a few seconds after an
  action, an effect you put on, or a teleport; in between it is the middle of
  the monsters and players around you (about 10 m off), shown with a ring.
  The header names the region you are in (Safe Haven, Black Claw Village ...).
- **Which map**: the game names your zone at login and at each teleport or
  zone change. Started after that, the meter hasn't heard it yet: the map
  then goes by what is around you (pet monsters, gathering spots, Hidden
  Cubes), else it is the map you were on last time, marked "map as last
  time" (and a "?" in the overlay) until your next teleport.
- **Pets**: the spawn points of the pets Pet Finder and Pet Soul Tracker
  follow, in red: Pet Finder's pinned pets and those not at rank 3 yet, Pet
  Soul Tracker's pinned ones and those you are farming (pinned with a gold
  ring, farmed with a white one). The pet monsters around you right now are
  the large dots. With no pet followed, or with **All pets**, every pet's
  spawn points show, small and white. At the bottom: the next pet to go for,
  which way and how far, and how many pets this map has and how many are
  around you.
- **Monsters**: the monsters around you right now, by name.
- **Gathering**: the gathering spots by kind, each kind on or off (hover a kind
  for what it holds); those there right now framed white:
  - Herbs: Aria, Targena, Azpha, Calendula
  - Ore: Orichalcum, Silver, Gold, Platinum, Mithril
  - Wood: Yggdrasil, Asvata
  - Fibers (for cloth): Ruko, Fess, Remi, Linon, Lapageria and more
  - Cooking: Mela, Coriolus, Inina, Kukuru and about 30 more
  - Gemstones: Sapphire, Diamond, Ruby, Aquamarine, Topaz and more
  - Odyle: Odyle, Splendent Odyle, Mysterious Odyle
  - Empyrean Traces: the traces to collect in Verteron
- **Hidden Cubes**: the spots where a cube is known to stand (gold outline,
  about 110 per map), and a cube in range right now (filled gold, it shows as
  soon as the game announces it).
- **Monoliths**: the Monolith pieces to collect (560 in Verteron and in
  Altgard, about 200 in the Abyss).
- **Kibelisks**: the Kibelisk camps.
- **Places**: sealed dungeons, battlefields, outposts and villages, with
  their names once zoomed in, and the names of the regions.

**Search** (two letters or more): gathering spots by name (Orichalcum, Aria
...), pets, the monsters that drop them, Kibelisk camps, **Hidden Cube**
(the known spots, or every place the game may put one: about 1,400 per map),
**Monolith**, sealed dungeons, battlefields, outposts and villages (each kind,
or one by its name) and regions, each with the maps it is on and how often. Picking one shows all its places with a gold ring,
the map framed around them (the bar above the map switches between its maps,
**×** stops it), and the nearest one as **Next**, which way and how far, in
the overlay too. A map link in Pet Finder or Pet Soul Tracker does the same
for that pet or monster and brings the Map forward.

Drag to move the map, the wheel zooms, a double-click goes back to following
you. **Overlay** opens the small map, always on the map you are on: drag it by
its title; **S, M, L, XL** in its title (shown while the pointer is on it) or
**Overlay size** here set its size, or drag one of its corners (the brackets)
for any other, which the window manager does as for any window; the wheel
zooms it; the slider in its title (or **Opacity** here) sets how much of the
game shows through (the marks stay solid); **Lock it** lets clicks through to
the game.

Maps: Verteron, Altgard, the Abyss and 25 instances. Other places have no map
here yet. The pictures are pieced together from the game's map as a player
had explored it: parts of Altgard (around Black Claw Village, Fafnite
Deposit, Western Gribade Highland, Immortal Isle and Spirit Isle) stayed dark
in it, so they are missing here, though the marks there are right. The complete pictures are on the community map sites, which don't
allow taking them.

## How it knows

The meter's `events:world` (Clicktrough patch 0010) reads where you and the
monsters, players and objects around you are from the game's own data, and the
pets to show come from other plugins through `events:shared` (patch 0011). The
map pictures come through the meter (`a2.file`, patch 0012): WebKitGTK 2.54
lets a plugin load no file of its own once its page has started. No network.

## Data

`data.js` and `tiles/` are generated from SkeeveAN's
[Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT, see
`NOTICE-SkeeveAN.txt`) and the data of the
[AION2 Interactive Map](https://github.com/aion2-interactive-map/aion2-interactive-map)
by Yihao Liu (tc-imba) (CC BY-NC 4.0: non-commercial use only, see
`NOTICE-AION2-Interactive-Map.txt`) with
`python3 -I dev/make_data.py <Aion-DPS-Meter checkout> . --aim <aion2-interactive-map checkout>`
(`--no-tiles` keeps `tiles/`); `dev/provenance.json` names the revisions,
the calibration and every file read.

The calibration of Verteron and Altgard (where a game coordinate lies on the
picture) is fitted to the Kibelisks: SkeeveAN's in game coordinates, the
AION2 Interactive Map's on the game's map picture, 60 and 61 pairs, 6 and 8 m
apart on average. It makes the maps about 2 % larger than SkeeveAN's own fit,
which was off by up to 90 m towards the edges of Altgard; with it 99 % of
Verteron's spawn points and gathering spots lie on land (96 % before), and the
Hidden Cube spots lie on places the game may put a cube (7 m apart on average).

The map pictures are the game's artwork; AION 2 names, maps and game material
belong to their respective owners.

Unofficial, not affiliated with NCSOFT or A2Tools. Third-party tools can put a
game account at risk.

The plugin's own code: GPL-3.0-or-later, see `LICENSE`.
