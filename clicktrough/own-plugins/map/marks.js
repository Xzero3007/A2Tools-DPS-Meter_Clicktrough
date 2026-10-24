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

  /**
   * state: { key, world, tracked (Map), heading, layers, gatherKinds, petsMode }
   * -> { marks, next, petsHere, around }
   */
  function build({ key, world, tracked, heading, layers, gatherKinds, petsMode }) {
    const marks = [];
    const map = D.maps[key];
    if (!map) return { marks, next: null, petsHere: 0, around: 0 };
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

    let next = null;
    const consider = (pet, x, y, live) => {
      if (!me || !tracked.size || !tracked.has(String(pet))) return;
      const d = K.metres(me.x, me.y, x, y);
      // A monster that is there beats a spawn point; then the nearest.
      if (!next || (live && !next.live) || (live === next.live && d < next.metres)) {
        next = { pet, name: petName(pet, tracked), metres: d, bearing: K.bearing(me.x, me.y, x, y), live };
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
          marks.push({ kind: "gather", gather: o.kind, x: pts[i], y: pts[i + 1], r: 3, label: `${o.name} (${o.kind})`, z: 2 });
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
        marks.push({ kind: "gather", gather: o.kind, live: true, x, y, r: 5, label: `${o.name} (${o.kind}) · there now`, z: 7 });
      }
    }

    if (layers.kibelisks) {
      for (const [name, x, y] of D.kibelisks[key] || []) {
        marks.push({ kind: "kibelisk", x, y, r: 5, label: `Kibelisk: ${name}`, text: name, z: 5 });
      }
    }

    if (me) marks.push({ kind: "me", x: me.x, y: me.y, exact: !!me.exact, heading: heading ?? 0, r: 6, label: me.exact ? "You" : "You (about here)", z: 100 });
    return { marks, next, petsHere: petsHere.size, around };
  }

  /** The map the player is on: the zone's, else the one the pet monsters
   *  around him stand on, else none. */
  function mapOf(world) {
    const byZone = world?.zone != null ? D.zones[String(world.zone)] : null;
    if (byZone) return byZone;
    return world?.npcs?.length ? K.detectMap(world.npcs) : null;
  }

  /** The compass arrow for a bearing (0 = up). */
  const ARROWS = ["↑", "↗", "→", "↘", "↓", "↙", "←", "↖"];
  const arrow = (deg) => ARROWS[Math.round((((deg % 360) + 360) % 360) / 45) % 8];

  globalThis.MapMarks = Object.freeze({ build, mergeTracked, mapOf, arrow, petName });
})();
