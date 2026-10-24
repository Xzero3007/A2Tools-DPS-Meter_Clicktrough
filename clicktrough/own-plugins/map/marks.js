// What the map shows, from the world around the player (a2.on("world")), the
// pets other plugins track (a2.on("shared")) and the layers picked: the marks,
// the next pet to go for and the counts. The map window and its overlay both
// build their marks here.
(() => {
  const D = globalThis.MAP_DATA;
  const K = globalThis.MapKit;
  const RANK = { pinned: 3, farming: 2, needed: 1 };
  const cubes = new Set(D.cubes.map(String));

  /** The pets the other plugins track, merged: id -> { mark, name }. */
  function mergeTracked(shared) {
    const out = new Map();
    for (const value of Object.values(shared || {})) {
      for (const p of Array.isArray(value?.pets) ? value.pets : []) {
        const id = String(p?.id ?? "");
        if (!id) continue;
        const mark = RANK[p.mark] ? p.mark : "needed";
        const prev = out.get(id);
        if (!prev || RANK[mark] > RANK[prev.mark]) out.set(id, { mark, name: p.name || prev?.name || null });
        else if (!prev.name && p.name) prev.name = p.name;
      }
    }
    return out;
  }

  const petName = (id, tracked) => tracked.get(String(id))?.name || D.pets[id]?.name || `Pet ${id}`;
  const npcName = (npc) => D.npcNames[npc] || `Monster ${npc}`;

  // The gathering kinds as the map names them, and what each holds (the names
  // the game gives its gathering spots).
  const KIND_ORDER = ["Herb", "Ore", "Wood", "Cotton", "Food", "Gemstone", "Od", "Fragment"];
  const KIND_LABELS = {
    Herb: "Herbs", Ore: "Ore", Wood: "Wood", Cotton: "Fibers", Food: "Cooking", Gemstone: "Gemstones",
    Od: "Odyle", Fragment: "Empyrean Traces", Cube: "Hidden Cube",
  };
  const kindItems = {};
  for (const o of Object.values(D.gather.objects)) {
    (kindItems[o.kind] ||= new Set()).add(o.name);
  }
  const kindLabel = (k) => KIND_LABELS[k] || k;
  // The places of the AION2 Interactive Map, by kind.
  const PLACE_LABELS = { seal: "Sealed dungeon", battlefield: "Battlefield", occupation: "Outpost", village: "Village" };
  const placeLabel = (k) => PLACE_LABELS[k] || k;
  const kindTitle = (k) => `${kindLabel(k)}: ${[...(kindItems[k] || [])].join(", ")}`;

  // ---------- what the search and other plugins ask for ("focus") ----------
  // { type: "gather" | "pet" | "npc" | "kibelisk" | "cube" | "monolith"
  //   | "place" | "region", ids: [...], label }
  // cube: ids ["spots"] (where one is known to stand) or ["all"] (every place
  // the game may put one); place: ids ["<kind>:<name>"] or ["<kind>:*"].

  /** The places of a focus on a map: [[x, y], ...] (spawn and gathering
   *  points, camps; not what is around right now). */
  function focusPoints(focus, key) {
    const out = [];
    if (!focus || !D.maps[key]) return out;
    const ids = new Set((focus.ids || []).map(String));
    if (focus.type === "gather") {
      for (const [env, pts] of Object.entries(D.gather.points[key] || {})) {
        if (!ids.has(env)) continue;
        for (let i = 0; i < pts.length; i += 2) out.push([pts[i], pts[i + 1]]);
      }
    } else if (focus.type === "pet" || focus.type === "npc") {
      for (const [npc, pts] of Object.entries(D.spawns[key] || {})) {
        const hit = focus.type === "npc" ? ids.has(npc) : ids.has(String(D.npcPets[npc]));
        if (!hit) continue;
        for (let i = 0; i < pts.length; i += 2) out.push([pts[i], pts[i + 1]]);
      }
    } else if (focus.type === "kibelisk") {
      for (const [name, x, y] of D.kibelisks[key] || []) if (ids.has(name)) out.push([x, y]);
    } else if (focus.type === "cube" || focus.type === "monolith") {
      const pts = focus.type === "monolith" ? D.monoliths?.[key]
        : ids.has("all") ? D.gather.points[key]?.cube : D.cubeSpots?.[key];
      for (let i = 0; i < (pts || []).length; i += 2) out.push([pts[i], pts[i + 1]]);
    } else if (focus.type === "place") {
      for (const [kind, name, x, y] of D.places?.[key] || []) {
        if (ids.has(`${kind}:*`) || ids.has(`${kind}:${name}`)) out.push([x, y]);
      }
    } else if (focus.type === "region") {
      for (const [name, x, y] of D.regions?.[key] || []) if (ids.has(name)) out.push([x, y]);
    }
    return out;
  }

  /** How many places a focus has on each map: { key: count }, most first. */
  function focusMaps(focus) {
    const out = {};
    for (const key of Object.keys(D.maps)) {
      const n = focusPoints(focus, key).length;
      if (n) out[key] = n;
    }
    return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
  }

  /** Whether something around right now is what the focus asks for. */
  function focusLive(focus, kind, id) {
    if (!focus) return false;
    const ids = (focus.ids || []).map(String);
    if (focus.type === "gather") return kind === "object" && ids.includes(String(id));
    if (focus.type === "npc") return kind === "npc" && ids.includes(String(id));
    if (focus.type === "pet") return kind === "npc" && ids.includes(String(D.npcPets[id]));
    if (focus.type === "cube") return kind === "object" && cubes.has(String(id));
    return false;
  }

  // ---------- the search ----------
  const fold = (t) => String(t).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  let index = null;
  function buildIndex() {
    const entries = [];
    // Gathering spots, by name (all the object ids of that name).
    const byName = new Map();
    for (const [env, o] of Object.entries(D.gather.objects)) {
      if (o.kind === "Cube") continue;
      const k = `${o.name}\u0000${o.kind}`;
      if (!byName.has(k)) byName.set(k, { name: o.name, kind: o.kind, ids: [] });
      byName.get(k).ids.push(env);
    }
    for (const g of byName.values()) {
      entries.push({ label: g.name, sub: kindLabel(g.kind), focus: { type: "gather", ids: g.ids, label: g.name }, gather: g.kind });
    }
    // Pets with spawn points, and the monsters that drop them.
    const spawned = new Set();
    for (const per of Object.values(D.spawns)) for (const npc of Object.keys(per)) spawned.add(npc);
    const petsWith = new Set([...spawned].map((n) => D.npcPets[n]).filter((p) => p != null).map(String));
    for (const pet of petsWith) {
      const name = D.pets[pet]?.name;
      if (name) entries.push({ label: name, sub: "Pet", focus: { type: "pet", ids: [pet], label: name } });
    }
    const npcsByName = new Map();
    for (const npc of spawned) {
      const name = D.npcNames[npc];
      if (!name) continue;
      if (!npcsByName.has(name)) npcsByName.set(name, []);
      npcsByName.get(name).push(npc);
    }
    for (const [name, npcs] of npcsByName) {
      const pets = [...new Set(npcs.map((n) => D.pets[D.npcPets[n]]?.name).filter(Boolean))];
      entries.push({ label: name, sub: pets.length ? `Monster · ${pets.join(", ")}` : "Monster", focus: { type: "npc", ids: npcs, label: name } });
    }
    // Kibelisk camps.
    const camps = new Set();
    for (const list of Object.values(D.kibelisks)) for (const [name] of list) camps.add(name);
    for (const name of camps) entries.push({ label: name, sub: "Kibelisk", focus: { type: "kibelisk", ids: [name], label: name } });
    // Hidden Cubes: where one is known to stand (AION2 Interactive Map), and
    // every place the game may put one (the client's own list, many more).
    entries.push({ label: "Hidden Cube", sub: "Known spots", focus: { type: "cube", ids: ["spots"], label: "Hidden Cube" }, extra: "cubes hidden box" });
    entries.push({ label: "Hidden Cube", sub: "Every place one can appear", focus: { type: "cube", ids: ["all"], label: "Hidden Cube (every place)" }, extra: "cubes hidden box all possible", after: 1 });
    entries.push({ label: "Monolith", sub: "Monolith pieces to collect", focus: { type: "monolith", ids: [], label: "Monolith" }, extra: "monoliths material collectible" });
    // Sealed dungeons, battlefields, outposts, villages: each kind, and each
    // by its name.
    const placeKinds = new Set();
    const placeNames = new Map();
    for (const list of Object.values(D.places || {})) {
      for (const [kind, name] of list) {
        placeKinds.add(kind);
        if (name) placeNames.set(`${kind}:${name}`, [kind, name]);
      }
    }
    for (const kind of placeKinds) {
      const label = `${placeLabel(kind)}s`;
      entries.push({ label, sub: "All of them", focus: { type: "place", ids: [`${kind}:*`], label } });
    }
    for (const [id, [kind, name]] of placeNames) {
      entries.push({ label: name, sub: placeLabel(kind), focus: { type: "place", ids: [id], label: name } });
    }
    // Regions, by name.
    const regionNames = new Set();
    for (const list of Object.values(D.regions || {})) for (const [name] of list) regionNames.add(name);
    for (const name of regionNames) entries.push({ label: name, sub: "Region", focus: { type: "region", ids: [name], label: name } });
    for (const e of entries) e.key = fold(`${e.label} ${e.sub} ${e.extra || ""}`);
    return entries;
  }

  /** What matches every word of `query`: [{ label, sub, focus, maps }],
   *  names starting with the query first. */
  function search(query, limit = 30) {
    const words = fold(query).split(/\s+/).filter(Boolean);
    if (!words.length || fold(query).trim().length < 2) return [];
    index ||= buildIndex();
    const q = fold(query).trim();
    const hits = index.filter((e) => words.every((w) => e.key.includes(w)));
    const scored = hits.map((e) => {
      const maps = focusMaps(e.focus);
      const total = Object.values(maps).reduce((a, b) => a + b, 0);
      const label = fold(e.label);
      const rank = label === q ? 0 : label.startsWith(q) ? 1 : 2;
      return { ...e, maps, total, rank };
    }).filter((e) => e.total > 0);
    scored.sort((a, b) => a.rank - b.rank || (a.after || 0) - (b.after || 0) || b.total - a.total || a.label.localeCompare(b.label));
    return scored.slice(0, limit);
  }

  /**
   * state: { key, world, tracked (Map), heading, layers, gatherKinds, petsMode, focus, nextFor }
   * -> { marks, next, petsHere, around, hits: [x, y, ...] }
   */
  function build({ key, world, tracked, heading, layers, gatherKinds, petsMode, focus, nextFor = "all" }) {
    const marks = [];
    const map = D.maps[key];
    if (!map) return { marks, next: null, petsHere: 0, around: 0, hits: [] };
    const me = world?.me || null;
    // With no plugin tracking pets, all of them.
    const all = petsMode === "all" || tracked.size === 0;
    const wanted = (pet) => all || tracked.has(String(pet));
    // Pets nobody tracks: small and white; the tracked ones red, pinned with
    // a gold ring, farmed with a white one.
    const style = (pet) => {
      const t = tracked.get(String(pet));
      if (!t) return { color: "rgba(255,255,255,0.85)", ring: null, small: true };
      if (t.mark === "pinned") return { color: K.PET_RED, ring: K.GOLD };
      if (t.mark === "farming") return { color: K.PET_RED, ring: "#ffffff" };
      return { color: K.PET_RED, ring: null };
    };

    // The next pet to go for: a pinned one before one being farmed, that
    // before one only still needed (Pet Finder shares every pet not at rank 3
    // yet, so many); among them one that is there right now, then the
    // nearest. nextFor "chosen": only pinned and farmed ones; "off": none.
    let next = null;
    const consider = (pet, x, y, live) => {
      if (!me || !tracked.size || nextFor === "off") return;
      const t = tracked.get(String(pet));
      if (!t) return;
      const rank = RANK[t.mark] || 1;
      if (nextFor === "chosen" && rank < RANK.farming) return;
      const d = K.metres(me.x, me.y, x, y);
      if (!next || rank > next.rank || (rank === next.rank && ((live && !next.live) || (live === next.live && d < next.metres)))) {
        next = { pet, name: petName(pet, tracked), metres: d, bearing: K.bearing(me.x, me.y, x, y), live, mark: t.mark, rank };
      }
    };

    const petsHere = new Set();
    if (layers.pets) {
      for (const [npc, pts] of Object.entries(D.spawns[key] || {})) {
        const pet = D.npcPets[npc];
        if (pet == null) continue;
        if (!all && !tracked.has(String(pet))) continue;
        petsHere.add(String(pet));
        const s = style(pet);
        const label = `${petName(pet, tracked)} · ${npcName(npc)}`;
        for (let i = 0; i < pts.length; i += 2) {
          marks.push({ kind: "petSpawn", x: pts[i], y: pts[i + 1], r: s.small ? 2.5 : s.ring ? 4.5 : 3.5, color: s.color, ring: s.ring, label, z: s.ring ? 3 : s.small ? 1 : 2 });
          consider(pet, pts[i], pts[i + 1], false);
        }
      }
    }

    let around = 0;
    for (const [, npc, x, y] of world?.npcs || []) {
      const pet = D.npcPets[npc];
      if (pet != null && layers.pets && wanted(pet)) {
        around++;
        const s = style(pet);
        const d = me ? ` · ${Math.round(K.metres(me.x, me.y, x, y))} m` : "";
        marks.push({ kind: "petLive", x, y, r: 6, color: s.color === K.PET_RED ? K.PET_RED : "#f2f2f2", ring: s.ring || "#ffffff", label: `${petName(pet, tracked)} · ${npcName(npc)}${d}`, z: 8 });
        consider(pet, x, y, true);
      } else if (layers.monsters) {
        marks.push({ kind: "monster", x, y, r: 2.5, label: npcName(npc), z: 4 });
      }
    }

    if (layers.gather) {
      for (const [env, pts] of Object.entries(D.gather.points[key] || {})) {
        const o = D.gather.objects[env];
        if (!o || o.kind === "Cube" || gatherKinds[o.kind] === false) continue;
        for (let i = 0; i < pts.length; i += 2) {
          marks.push({ kind: "gather", gather: o.kind, x: pts[i], y: pts[i + 1], r: 3, label: `${o.name} (${kindLabel(o.kind)})`, z: 2 });
        }
      }
    }
    for (const [, env, x, y] of world?.objects || []) {
      if (cubes.has(String(env))) {
        if (layers.cubes) marks.push({ kind: "cube", x, y, r: 6, label: "Hidden Cube", z: 9 });
        continue;
      }
      const o = D.gather.objects[env];
      if (o && layers.gather && gatherKinds[o.kind] !== false) {
        marks.push({ kind: "gather", gather: o.kind, live: true, x, y, r: 5, label: `${o.name} (${kindLabel(o.kind)}) · there now`, z: 7 });
      }
    }

    if (layers.kibelisks) {
      for (const [name, x, y] of D.kibelisks[key] || []) {
        marks.push({ kind: "kibelisk", x, y, r: 5, label: `Kibelisk: ${name}`, text: name, z: 5 });
      }
    }
    if (layers.cubes) {
      const pts = D.cubeSpots?.[key] || [];
      for (let i = 0; i < pts.length; i += 2) {
        marks.push({ kind: "cubeSpot", x: pts[i], y: pts[i + 1], r: 3.5, label: "Hidden Cube (known spot)", z: 3 });
      }
    }
    if (layers.monoliths) {
      const pts = D.monoliths?.[key] || [];
      for (let i = 0; i < pts.length; i += 2) {
        marks.push({ kind: "monolith", x: pts[i], y: pts[i + 1], r: 3, label: "Monolith piece", z: 2 });
      }
    }
    if (layers.places) {
      for (const [kind, name, x, y] of D.places?.[key] || []) {
        marks.push({ kind: "place", place: kind, x, y, r: 5, label: name ? `${name} (${placeLabel(kind)})` : placeLabel(kind), text: name || null, z: 4 });
      }
      for (const [name, x, y] of D.regions?.[key] || []) marks.push({ kind: "region", x, y, text: name, z: 0 });
    }

    // The focus: its places with a gold ring, and the nearest one is next
    // (one that is there right now first).
    const hits = [];
    if (focus) {
      let best = null;
      const near = (x, y, live) => {
        if (!me) return;
        const d = K.metres(me.x, me.y, x, y);
        if (!best || (live && !best.live) || (live === best.live && d < best.metres)) {
          best = { name: focus.label, metres: d, bearing: K.bearing(me.x, me.y, x, y), live, focus: true };
        }
      };
      const all = (focus.ids || []).includes("all");
      const placeOf = new Map((D.places?.[key] || []).map(([kind, name, x, y]) => [`${x},${y}`, [kind, name]]));
      const STYLES = {
        gather: (x, y) => ({ kind: "gather", gather: D.gather.objects[focus.ids[0]]?.kind, x, y, r: 4 }),
        kibelisk: (x, y) => ({ kind: "kibelisk", x, y, r: 6, text: focus.label }),
        cube: (x, y) => ({ kind: "cubeSpot", all, x, y, r: all ? 2.5 : 4.5 }),
        monolith: (x, y) => ({ kind: "monolith", x, y, r: 3.5 }),
        place: (x, y) => {
          const [kind, name] = placeOf.get(`${x},${y}`) || [];
          return { kind: "place", place: kind, x, y, r: 5.5, text: name || null, label: name ? `${name} (${placeLabel(kind)})` : focus.label };
        },
        region: (x, y) => ({ kind: "place", place: "village", x, y, r: 5, text: focus.label }),
      };
      const style = STYLES[focus.type] || ((x, y) => ({ kind: "petSpawn", x, y, r: 4.5, color: K.PET_RED }));
      for (const [x, y] of focusPoints(focus, key)) {
        hits.push(x, y);
        // Every place a cube may appear: many, so no gold ring each.
        marks.push({ label: focus.label, ...style(x, y), hit: !all, z: 50 });
        near(x, y, false);
      }
      for (const [, npc, x, y] of world?.npcs || []) {
        if (!focusLive(focus, "npc", npc)) continue;
        marks.push({ kind: "petLive", x, y, r: 6, color: K.PET_RED, ring: "#ffffff", hit: true, label: `${focus.label} · there now`, z: 60 });
        near(x, y, true);
      }
      for (const [, env, x, y] of world?.objects || []) {
        if (!focusLive(focus, "object", env)) continue;
        marks.push(focus.type === "cube"
          ? { kind: "cube", x, y, r: 6, hit: true, label: "Hidden Cube · there now", z: 60 }
          : { kind: "gather", gather: D.gather.objects[env]?.kind, live: true, x, y, r: 5, hit: true, label: `${focus.label} · there now`, z: 60 });
        near(x, y, true);
      }
      if (best) next = best;
    }

    if (me) marks.push({ kind: "me", x: me.x, y: me.y, exact: !!me.exact, heading: heading ?? 0, r: 6, label: me.exact ? "You" : "You (about here)", z: 100 });
    return { marks, next, petsHere: petsHere.size, around, hits };
  }

  /** The map the player is on: the zone's, else the one the pet monsters,
   *  gathering spots and Hidden Cubes around him stand on, else none. */
  function mapOf(world) {
    const byZone = world?.zone != null ? D.zones[String(world.zone)] : null;
    if (byZone) return byZone;
    return world?.npcs?.length || world?.objects?.length ? K.detectMap(world.npcs, world.objects) : null;
  }

  /** The region of a map a place lies in (AION2 Interactive Map), or null. */
  function regionAt(key, x, y) {
    for (const [name, , , rings] of D.regions?.[key] || []) {
      let inside = false;
      for (const ring of rings) {
        for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
          const [xi, yi, xj, yj] = [ring[i], ring[i + 1], ring[j], ring[j + 1]];
          if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
        }
      }
      if (inside) return name;
    }
    return null;
  }

  /** Why a pet is followed, as the next one says it. */
  const MARK_TEXT = { pinned: "pinned", farming: "being farmed (Pet Soul Tracker)", needed: "not at rank 3 yet (Pet Finder)" };
  const markText = (mark) => MARK_TEXT[mark] || MARK_TEXT.needed;

  /** The compass arrow for a bearing (0 = up). */
  const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const arrow = (deg) => ARROWS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

  globalThis.MapMarks = Object.freeze({
    build, mergeTracked, mapOf, regionAt, arrow, markText, petName, search, focusMaps, focusPoints, KIND_ORDER, kindLabel, kindTitle, placeLabel,
  });
})();
