# Map (A2Tools plugin)

The map you are on, with where you are, and an overlay with a small map that
follows you over the game.

- **Your position**: the arrow points the way you walk (the game sends no
  facing). The meter knows your exact place only for a few seconds after an
  action, an effect you put on, or a teleport; in between it is the middle of
  the monsters and players around you (about 10 m off), shown with a ring.
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
- **Hidden Cubes**: a cube shows (gold) as soon as it is in range; no list
  knows where they will be.
- **Kibelisks**: the Kibelisk camps.

**Search** (two letters or more): gathering spots by name (Orichalcum, Aria
...), pets, the monsters that drop them and Kibelisk camps, each with the maps
it is on and how often. Picking one shows all its places with a gold ring,
the map framed around them (the bar above the map switches between its maps,
**×** stops it), and the nearest one as **Next**, which way and how far, in
the overlay too. A map link in Pet Finder or Pet Soul Tracker does the same
for that pet or monster and brings the Map forward.

Drag to move the map, the wheel zooms, a double-click goes back to following
you. **Overlay** opens the small map, always on the map you are on: drag it by
its title, its corner resizes it, the wheel zooms it, the slider in its title
(or **Overlay opacity** here) sets how much of the game shows through (the
marks stay solid); **Lock it** lets clicks through to the game.

Maps: Verteron, Altgard, the Abyss and 25 instances. Other places have no map
here yet.

## How it knows

The meter's `events:world` (Clicktrough patch 0010) reads where you and the
monsters, players and objects around you are from the game's own data, and the
pets to show come from other plugins through `events:shared` (patch 0011). The
map pictures come through the meter (`a2.file`, patch 0012): WebKitGTK 2.54
lets a plugin load no file of its own once its page has started. No network.

## Data

`data.js` and `tiles/` are generated from SkeeveAN's
[Aion-DPS-Meter](https://github.com/SkeeveAN/Aion-DPS-Meter) (MIT, see
`NOTICE-SkeeveAN.txt`) with `python3 -I dev/make_data.py <checkout> .`;
`dev/provenance.json` names the revision and every file read. The map pictures
are the game's artwork; AION 2 names, maps and game material belong to their
respective owners.

Unofficial, not affiliated with NCSOFT or A2Tools. Third-party tools can put a
game account at risk.

The plugin's own code: GPL-3.0-or-later, see `LICENSE`.
