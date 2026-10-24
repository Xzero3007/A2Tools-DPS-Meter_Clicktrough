# Pet Finder (A2Tools plugin)

Three tabs beside the A2Tools DPS meter:

- **Nearby** – the pet mobs the game has shown you, grouped by pet, with your
  rank and souls, how far the nearest one is and which way (north up); pinned
  pets first, then the nearest, and a notice when a pinned pet's mob appears.
- **Search** – every pet by name, mob, region or source: your rank and souls,
  which mobs drop its souls, farming maps (aion2maps.com) and other sources.
- **Merchant** – a Black Cloud Merchant shopping list: the pets on offer that
  only chests and merchants give and you have not maxed, with price and
  discount; then those on offer you still need that mobs also drop; below, the
  pets to look out for. The button right of the tabs puts the three side by
  side, a column each, for a wide, low window.

It is the nearby, search and merchant parts of
[PetTracker](https://github.com/0Fox2Give/PetTracker) (GPLv3) brought into A2Tools:
the same packet layouts and checks, the same data.

## Install

The meter from [A2Tools-DPS-Meter_Clicktrough](https://github.com/Xzero3007/A2Tools-DPS-Meter_Clicktrough)
ships Pet Finder: nothing to install, it comes and updates with the meter.
Start the meter **before** logging into your character: the collection is read at login.

To try changes of your own: **Settings → Plugins → Plugin developer mode** on,
**Load plugin folder…** and pick this folder (the one with `manifest.json`). A
developer folder wins over the copy the meter ships; remove it from the list
to go back to that one. Your settings, pins and collection stay either way.

Needs A2Tools 2.0.65 or newer (plugin API 2).

## How it knows

- **Collection** – the login collection (`00 90`), souls gained and spent
  (`0D/0E 90`) and rank-ups (`14 90`), saved per character.
- **Nearby** – NPC appearances (`40/41/42 36`) whose NPC drops a pet's souls, until
  the game removes them (`42 36`) or after the time you keep them. The distance and
  direction come from the meter's `events:world` (Clicktrough): where you are (exact
  for a few seconds after an action, else about 10 m off) and where the mob stands.
  Changing map leaves old mobs until they time out; **Clear** empties the list.
- **Map** – your pinned pets, and once the collection is read every pet not at rank 3,
  go to the Map plugin (`share`), which shows where their monsters are.
- **Merchant** – the shop's stock (`91 56`), only in the layout PetTracker checked
  against the game; anything else is dropped. Open the shop after your collection is
  read; offers show for two minutes, as the stock may change.

The header counts the pets of the Global game: those with a Global map or a known
source (PetTracker's 208), plus any other you have progress on. The catalog also
holds the Asian release's pets; the meter's own Pet Soul Tracker uses its own list
(197 in October 2026), so the two totals differ a little.

### When the Merchant tab says the shop's layout is unknown

PetTracker checked the shop's stock message against two captures (US, October
2026) and reads only that layout; so does Pet Finder, with Europe's tab numbers
(201/204 where the US has 101/104) added from a capture of 2026-10-20. If yours differs, a sample
of it lets the layout be added:

1. A2Tools: **Settings → Advanced → Packet logging** on.
2. In game, open the Black Cloud Merchant and click its **Special** and **Pets** tabs.
3. **Packet logging** off again.
4. On your computer, keep only the shop's messages:
   `python3 merchant-capture.py ~/.local/share/com.a2tools.dps-meter/packets_*.txt > merchant.txt`
5. Share `merchant.txt` (offers, item ids, prices and refresh time; nothing else).
   Delete the `packets_*.txt` files afterwards: they hold all of the game's traffic.

Every frame type is read as numbers by A2Tools (the plugin never sees a packet);
each is checked as PetTracker checks it, and a frame that does not fit is dropped.

## Permissions

`storage` (settings, pins, your collection), `notify` (pinned pet nearby, merchant
offers), `events:character` (whose collection it is), `events:world` (distances),
`share` (the pets for the Map plugin), and one `decoder:` per frame type above. No
network.

## Data

`data.js` and `images.js` are generated from PetTracker
(`python3 -I dev/make_data.py <PetTracker checkout> .`); `data.js` names the commit.
Pet portraits and crystals are game artwork, included as PetTracker includes them;
Aion 2 names, portraits and game material belong to their respective owners.
Source relationships come from PetTracker, which assembled them from game data,
aion2.gaming.tools and aion2maps.com.

`dev/ci.sh <meter source>` runs the tests against the plugin decoder of that
meter version; the fork's build runs it for every package.

Unofficial, not affiliated with NCSOFT or A2Tools. Third-party tools can put a game
account at risk.

GPL-3.0-or-later, see `LICENSE`.
