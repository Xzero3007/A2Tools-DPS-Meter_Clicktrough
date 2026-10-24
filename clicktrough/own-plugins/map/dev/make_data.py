"""Builds the Map plugin's data.js and tiles/ from a checkout of SkeeveAN's
Aion-DPS-Meter (MIT, https://github.com/SkeeveAN/Aion-DPS-Meter) and of the
AION2 Interactive Map (its data CC BY-NC 4.0,
https://github.com/aion2-interactive-map/aion2-interactive-map).

    python3 -I dev/make_data.py <Aion-DPS-Meter checkout> <plugin folder> \
        [--aim <aion2-interactive-map checkout>] [--no-tiles]

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

From the AION2 Interactive Map (public/data, English names from
public/locales/en), with --aim: the Hidden Cube spots, the Monolith pieces,
the sealed dungeons, battlefields, outposts and villages, and the regions
(their names and outlines) of Verteron, Altgard and the Abyss. Its places are
pixels of the game's own map pictures, which SkeeveAN's tiles are cut from;
its Kibelisks, matched with SkeeveAN's (game coordinates), give how the
game's coordinates lie on the pictures (see calibrate()), better than the
fit SkeeveAN had by hand: about 2 % larger, off by up to 90 m towards the
edges of Altgard.

--no-tiles leaves tiles/ as it is (data.js only).

It writes dev/provenance.json with the revisions and a SHA-256 of every file
it read, so a rebuild can be checked against the same sources.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

from PIL import Image

args = sys.argv[1:]
NO_TILES = "--no-tiles" in args
AIM = args[args.index("--aim") + 1] if "--aim" in args else None
SRC, OUT = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--aim")][:2]
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
if not NO_TILES:
    shutil.rmtree(tiles_out, ignore_errors=True)

maps, zones, spawns, gather_points, kibelisks = {}, {}, {}, {}, {}
for key, m in maps_src.items():
    folder = os.path.join(ASSETS, "maps", key)
    names = sorted(f[:-4] for f in os.listdir(folder) if f.endswith(".jpg"))
    names = [n for n in names if os.path.exists(os.path.join(folder, f"{n}_a.png"))]
    if not names:
        continue
    if not NO_TILES:
        os.makedirs(os.path.join(tiles_out, key, "lo"), exist_ok=True)
    def tile(jpg, mask, size, out):
        if NO_TILES:
            return
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

# ---------- the AION2 Interactive Map (--aim) ----------
# Its map -> ours, and how many of our pixels one of its pixels is.
AIM_MAPS = {"verteron": ("World_L_A", 2), "altgard": ("World_D_A", 1), "abyss": ("Abyss_Reshanta_A", 1)}
AIM_PLACES = {"seal": "Sealed dungeon", "battlefield": "Battlefield", "occupation": "Outpost", "village": "Village"}
aim_commit = None
calibration = {}
cube_spots, monoliths, places, regions = {}, {}, {}, {}


def aim_load(rel):
    data = open(os.path.join(AIM, "public", rel), "rb").read()
    read[f"aion2-interactive-map:public/{rel}"] = hashlib.sha256(data).hexdigest()
    return yaml.safe_load(data) or {}


def calibrate(key, teleports, factor):
    """World -> pixel of a map from its Kibelisks: each of SkeeveAN's (game
    coordinates) paired with the nearest of the AION2 Interactive Map's
    (pixels of the game's map picture, y up) under the fit so far, starting
    from SkeeveAN's; one scale and offset fitted to the pairs by least squares,
    three times over. None when they don't agree (too few, or more than 15 m
    apart on average): SkeeveAN's fit stays."""
    m = maps[key]
    size = m["tile"] * m["grid"]
    tel = np.array([(x * factor, size - y * factor) for x, y in teleports], float)
    kib = np.array([(x, y) for _, x, y in kibelisks.get(key, [])], float)
    if len(tel) < 10 or len(kib) < 10:
        return None
    s, ox, oy = m["scale"], m["ox"], m["oy"]
    for _ in range(3):
        px = np.c_[ox + s * kib[:, 0], oy + s * kib[:, 1]]
        d = np.sqrt(((px[:, None, :] - tel[None, :, :]) ** 2).sum(-1))
        near, j = d.min(1), d.argmin(1)
        ok = near / s / 100 < 150  # metres
        n = int(ok.sum())
        if n < 10:
            return None
        a = np.zeros((2 * n, 3))
        b = np.zeros(2 * n)
        a[:n, 0], a[:n, 2], b[:n] = 1, kib[ok, 0], tel[j[ok], 0]
        a[n:, 1], a[n:, 2], b[n:] = 1, kib[ok, 1], tel[j[ok], 1]
        (ox, oy, s), *_ = np.linalg.lstsq(a, b, rcond=None)
        rms = float(np.sqrt(((b - a @ np.array([ox, oy, s])) ** 2).mean() * 2) / s / 100)
    if rms > 15:
        return None
    return {"scale": float(s), "ox": float(ox), "oy": float(oy), "pairs": n, "rmsMetres": round(rms, 1)}


def centroid(ring):
    """The middle of a polygon (by its area), for its name."""
    a = cx = cy = 0.0
    for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]):
        c = x0 * y1 - x1 * y0
        a += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    if abs(a) < 1e-9:
        return sum(p[0] for p in ring) / len(ring), sum(p[1] for p in ring) / len(ring)
    return cx / (3 * a), cy / (3 * a)


if AIM:
    import numpy as np
    import yaml

    for key, (name, factor) in AIM_MAPS.items():
        if key not in maps:
            continue
        markers = aim_load(f"data/markers/{name}.yaml").get("markers") or []
        words = aim_load(f"locales/en/markers/{name}.yaml")
        fit = calibrate(key, [(mk["x"], mk["y"]) for mk in markers if mk.get("subtype") == "teleport"], factor)
        if fit:
            calibration[key] = {"from": {k: maps[key][k] for k in ("scale", "ox", "oy")}, **fit}
            maps[key].update({k: fit[k] for k in ("scale", "ox", "oy")})
        m = maps[key]
        size = m["tile"] * m["grid"]

        def world(x, y):
            return [round((x * factor - m["ox"]) / m["scale"]), round((size - y * factor - m["oy"]) / m["scale"])]

        def english(mk):
            w = words.get(mk.get("id")) or words.get(mk.get("name")) or {}
            n = (w.get("name") if isinstance(w, dict) else None) or ""
            return n if n.isascii() else ""

        for mk in markers:
            kind = mk.get("subtype")
            if kind == "hiddenCube":
                cube_spots.setdefault(key, []).extend(world(mk["x"], mk["y"]))
            elif kind == "monolithMaterial":
                monoliths.setdefault(key, []).extend(world(mk["x"], mk["y"]))
            elif kind in AIM_PLACES:
                places.setdefault(key, []).append([kind, english(mk), *world(mk["x"], mk["y"])])
        region_words = aim_load(f"locales/en/regions/{name}.yaml") if os.path.exists(
            os.path.join(AIM, "public", "locales", "en", "regions", f"{name}.yaml")) else {}
        region_src = aim_load(f"data/regions/{name}.yaml").get("regions") if os.path.exists(
            os.path.join(AIM, "public", "data", "regions", f"{name}.yaml")) else None
        for r in region_src or []:
            w = region_words.get(r.get("name")) or {}
            label = (w.get("name") if isinstance(w, dict) else None) or ""
            rings = [[world(x, y) for x, y in ring] for ring in r.get("borders") or [] if len(ring) >= 3]
            if not label or not label.isascii() or not rings:
                continue
            big = max(rings, key=len)
            lx, ly = centroid(big)
            regions.setdefault(key, []).append([label, round(lx), round(ly), [[c for p in ring for c in p] for ring in rings]])
    try:
        aim_commit = subprocess.run(["git", "-C", AIM, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        pass

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
    "cubeSpots": cube_spots,
    "monoliths": monoliths,
    "places": places,
    "regions": regions,
    "calibration": calibration,
}
if AIM:
    data["aim"] = {"repo": "https://github.com/aion2-interactive-map/aion2-interactive-map", "commit": aim_commit,
                   "license": "CC BY-NC 4.0", "author": "Yihao Liu (tc-imba)"}
try:
    data["source"]["commit"] = subprocess.run(["git", "-C", SRC, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
except (OSError, subprocess.CalledProcessError):
    pass

with open(os.path.join(OUT, "data.js"), "w", encoding="utf8") as f:
    f.write("// Generated by dev/make_data.py from SkeeveAN's Aion-DPS-Meter (MIT) and, for cubeSpots,\n")
    f.write("// monoliths, places, regions and the calibration, the AION2 Interactive Map's data\n")
    f.write("// (CC BY-NC 4.0, Yihao Liu (tc-imba); see NOTICE-AION2-Interactive-Map.txt). Do not edit by hand.\n")
    f.write("// AION 2 names, maps and game data belong to their respective owners.\n")
    f.write("globalThis.MAP_DATA = ")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

with open(os.path.join(OUT, "dev", "provenance.json"), "w", encoding="utf8") as f:
    json.dump({"repo": data["source"]["repo"], "commit": data["source"]["commit"],
               **({"aim": {"repo": data["aim"]["repo"], "commit": aim_commit}} if AIM else {}),
               "calibration": calibration, "sha256": dict(sorted(read.items()))}, f, indent=1)
    f.write("\n")

print(f"{len(maps)} maps, {sum(len(v) for v in spawns.values())} monster kinds with spawn points, "
      f"{sum(len(p) // 2 for v in gather_points.values() for p in v.values())} gathering spots, "
      f"{len(data['npcNames'])} monster names, unused pets of spawned monsters: {len(spawned - set(npc_pets))}")
if AIM:
    print(f"calibration: {calibration}")
    print(f"cube spots {sum(len(v) // 2 for v in cube_spots.values())}, monoliths {sum(len(v) // 2 for v in monoliths.values())}, "
          f"places {sum(len(v) for v in places.values())}, regions {sum(len(v) for v in regions.values())}")
