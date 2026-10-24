"""Builds the Map plugin's data.js and tiles/ from a checkout of SkeeveAN's
Aion-DPS-Meter (MIT, https://github.com/SkeeveAN/Aion-DPS-Meter).

    python3 -I dev/make_data.py <Aion-DPS-Meter checkout> <plugin folder>

What it takes (Client/assets/aion2/ of that repo), English names only:
  maps/maps.json, maps/instances.json  the maps: tiles, grid, world -> pixel
                                       (pixel = offset + scale * world)
  maps/<key>/<col>_<row>.jpg, _a.png   the map pictures and their masks (the
                                       sea transparent), as WebP with the mask
                                       as alpha (WebKitGTK draws no CSS masks
                                       from a plugin's own scheme), at full
                                       size and small for the zoomed-out view
                                       (tiles/<key>/lo/)
  pets/spawns.json, pets/pets.json     the spawn points of the pet monsters,
                                       the pets and which monsters drop them
  maps/gather.json                     gathering spots by kind
  maps/kibelisks.json                  Kibelisk camps
  npcs/npc_names.json                  monster names (for monsters around)
  zones/zones.json                     zone names

It writes dev/provenance.json with the revision and a SHA-256 of every file
it read, so a rebuild can be checked against the same source.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
ASSETS = os.path.join(SRC, "Client", "assets", "aion2")
LO = 512  # px per tile of the zoomed-out copies
QUALITY = 72  # WebP

read = {}


def load(rel):
    path = os.path.join(ASSETS, rel)
    data = open(path, "rb").read()
    read[rel] = hashlib.sha256(data).hexdigest()
    return json.loads(data)


def en(names):
    return (names or {}).get("en") or ""


# Hidden Cubes: the object ids the client names "Hidden Cube" (SkeeveAN,
# Aion2FrameDecoder.IsHiddenCube).
CUBES = [*range(1200036, 1200042), 1200667, 1200707, *range(1201502, 1201506), *range(1300081, 1300084), 1300754,
         1301199, 1301200, *range(1301242, 1301246), 1100056, 1100094]

# Open-world zone ids -> map (SkeeveAN Aion2Maps.OfZone; the Abyss's three
# layers from zones.json); instances bring their own.
WORLD_ZONES = {1010: "verteron", 902: "verteron", 1110: "altgard", 901: "altgard", 20: "abyss", 22: "abyss", 23: "abyss"}

maps_src = {**{k: {**v, "instance": False} for k, v in load("maps/maps.json")["maps"].items()},
            **{k: {**v, "instance": True} for k, v in load("maps/instances.json")["maps"].items()}}
spawns_src = load("pets/spawns.json")["maps"]
pets_src = load("pets/pets.json")
gather_src = load("maps/gather.json")
kib_src = load("maps/kibelisks.json")["maps"]
npc_src = load("npcs/npc_names.json")
zones_src = load("zones/zones.json")["zones"]

tiles_out = os.path.join(OUT, "tiles")
shutil.rmtree(tiles_out, ignore_errors=True)

maps, zones, spawns, gather_points, kibelisks = {}, {}, {}, {}, {}
for key, m in maps_src.items():
    folder = os.path.join(ASSETS, "maps", key)
    names = sorted(f[:-4] for f in os.listdir(folder) if f.endswith(".jpg"))
    names = [n for n in names if os.path.exists(os.path.join(folder, f"{n}_a.png"))]
    if not names:
        continue
    os.makedirs(os.path.join(tiles_out, key, "lo"), exist_ok=True)
    def tile(jpg, mask, size, out):
        im = Image.open(jpg).convert("RGB")
        if size:
            im = im.resize((size, size), Image.LANCZOS)
        im.putalpha(Image.open(mask).convert("L").resize(im.size, Image.LANCZOS))
        im.save(out, "WEBP", quality=QUALITY, method=6)

    for n in names:
        for suffix in (".jpg", "_a.png"):
            rel = f"maps/{key}/{n}{suffix}"
            read[rel] = hashlib.sha256(open(os.path.join(ASSETS, rel), "rb").read()).hexdigest()
        jpg, mask = os.path.join(folder, f"{n}.jpg"), os.path.join(folder, f"{n}_a.png")
        tile(jpg, mask, None, os.path.join(tiles_out, key, f"{n}.webp"))
        tile(jpg, mask, LO, os.path.join(tiles_out, key, "lo", f"{n}.webp"))
    tables = m.get("tables") or [m["table"]]
    maps[key] = {
        "title": m.get("title", key), "tile": m["tile"], "grid": m["grid"], "scale": m["scale"],
        "ox": m["offsetX"], "oy": m["offsetY"], "tiles": names, "lo": LO, "instance": m["instance"],
    }
    for z in m.get("zones") or []:
        zones[str(z)] = key
    # Spawn points of the pet monsters: each place once (an instance has a
    # table per difficulty with the same places).
    points = {}
    for table in tables:
        for npc, pts in (spawns_src.get(table) or {}).items():
            seen = points.setdefault(npc, [])
            for p in pts:
                xy = [round(p[0]), round(p[1])]
                if xy not in [seen[i:i + 2] for i in range(0, len(seen), 2)]:
                    seen += xy
    if points:
        spawns[key] = points
    g = {}
    for table in tables:
        for env, pts in (gather_src["maps"].get(table) or {}).items():
            g.setdefault(env, [])
            for p in pts:
                g[env] += [round(p[0]), round(p[1])]
    if g:
        gather_points[key] = g
    if key in kib_src:
        kibelisks[key] = [[en(k["names"]), round(k["x"]), round(k["y"])] for k in kib_src[key]]

for z, key in WORLD_ZONES.items():
    if key in maps:
        zones[str(z)] = key

npc_pets = {npc: pet for npc, pet in pets_src["monsters"].items()}
spawned = {npc for per in spawns.values() for npc in per}
data = {
    "source": {"repo": "https://github.com/SkeeveAN/Aion-DPS-Meter", "commit": None},
    "maps": maps,
    "zones": zones,
    "zoneNames": {str(z["id"]): en(z["names"]) for z in zones_src if en(z["names"])},
    "pets": {pid: {"name": en(p["names"]), "category": p.get("category", "")} for pid, p in pets_src["pets"].items()},
    "npcPets": npc_pets,
    "npcNames": {npc: en(n) for npc, n in npc_src.items() if en(n)},
    "spawns": spawns,
    "gather": {
        "objects": {env: {"kind": o["kind"], "name": en(o["names"])} for env, o in gather_src["objects"].items()},
        "points": gather_points,
    },
    "kibelisks": kibelisks,
    "cubes": CUBES,
}
try:
    data["source"]["commit"] = subprocess.run(["git", "-C", SRC, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
except (OSError, subprocess.CalledProcessError):
    pass

with open(os.path.join(OUT, "data.js"), "w", encoding="utf8") as f:
    f.write("// Generated by dev/make_data.py from SkeeveAN's Aion-DPS-Meter (MIT). Do not edit by hand.\n")
    f.write("// AION 2 names, maps and game data belong to their respective owners.\n")
    f.write("globalThis.MAP_DATA = ")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

with open(os.path.join(OUT, "dev", "provenance.json"), "w", encoding="utf8") as f:
    json.dump({"repo": data["source"]["repo"], "commit": data["source"]["commit"], "sha256": dict(sorted(read.items()))}, f, indent=1)
    f.write("\n")

print(f"{len(maps)} maps, {sum(len(v) for v in spawns.values())} monster kinds with spawn points, "
      f"{sum(len(p) // 2 for v in gather_points.values() for p in v.values())} gathering spots, "
      f"{len(data['npcNames'])} monster names, unused pets of spawned monsters: {len(spawned - set(npc_pets))}")
