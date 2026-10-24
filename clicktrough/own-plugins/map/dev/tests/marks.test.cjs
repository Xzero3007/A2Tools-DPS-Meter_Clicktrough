// The Map plugin's marks (marks.js): which map, the pets tracked, the next
// pet and the counts, with the generated data.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const dir = process.env.PLUGIN_DIR || path.join(__dirname, "..", "..");
globalThis.requestAnimationFrame = (f) => f();
require(path.join(dir, "data.js"));
require(path.join(dir, "render.js"));
require(path.join(dir, "marks.js"));
const D = globalThis.MAP_DATA;
const M = globalThis.MapMarks;
const layers = { pets: true, monsters: true, gather: true, cubes: true, kibelisks: true };

// A pet monster with spawn points in Verteron.
const npc = Object.keys(D.spawns.verteron).find((n) => D.npcPets[n] != null && D.spawns.verteron[n].length >= 4);
const pet = String(D.npcPets[npc]);
const [sx, sy] = D.spawns.verteron[npc];

test("the data has the three world maps, their zones and calibration", () => {
  for (const key of ["verteron", "altgard", "abyss"]) {
    const m = D.maps[key];
    assert.ok(m && m.tiles.length && m.scale > 0 && m.tile > 0, key);
  }
  assert.equal(D.zones["1010"], "verteron");
  assert.equal(D.zones["1110"], "altgard");
  assert.ok(Object.keys(D.npcNames).length > 10000);
  assert.ok(D.cubes.includes(1200036));
});

test("the map is the zone's, else the one the pet monsters around stand on", () => {
  assert.equal(M.mapOf({ zone: 1110, npcs: [] }), "altgard");
  assert.equal(M.mapOf({ zone: 999999, npcs: [[1, Number(npc), sx + 100, sy - 100]] }), "verteron");
  assert.equal(M.mapOf({ zone: null, npcs: [] }), null);
});

test("tracked pets merge: pinned beats farming beats needed", () => {
  const t = M.mergeTracked({
    a: { pets: [{ id: 1001, mark: "needed", name: "A" }, { id: 1002, mark: "farming" }] },
    b: { pets: [{ id: 1001, mark: "pinned" }, { id: 1002, mark: "needed" }, { id: 1003 }] },
  });
  assert.equal(t.get("1001").mark, "pinned");
  assert.equal(t.get("1001").name, "A");
  assert.equal(t.get("1002").mark, "farming");
  assert.equal(t.get("1003").mark, "needed");
});

test("with a pet tracked: only its spawn points, the next one and the counts", () => {
  const tracked = M.mergeTracked({ pf: { pets: [{ id: Number(pet), mark: "pinned", name: "Mine" }] } });
  const world = {
    zone: 1010, me: { x: sx + 1000, y: sy, exact: true },
    npcs: [[7, Number(npc), sx + 3000, sy], [8, 2000000, sx, sy + 500]],
    objects: [[9, D.cubes[0], sx, sy - 500]],
  };
  const b = M.build({ key: "verteron", world, tracked, heading: 0, layers, gatherKinds: {}, petsMode: "tracked" });
  const spawns = b.marks.filter((m) => m.kind === "petSpawn");
  assert.equal(spawns.length, D.spawns.verteron[npc].length / 2 + Object.entries(D.spawns.verteron).filter(([n]) => n !== npc && String(D.npcPets[n]) === pet).reduce((s, [, p]) => s + p.length / 2, 0));
  assert.ok(spawns.every((m) => m.ring), "pinned: a ring");
  assert.equal(b.petsHere, 1);
  assert.equal(b.around, 1);
  // The live monster (20 m off) beats the nearer spawn point (10 m off).
  assert.equal(b.next.name, "Mine");
  assert.equal(b.next.live, true);
  assert.equal(Math.round(b.next.metres), 20);
  assert.ok(b.marks.some((m) => m.kind === "cube"));
  assert.ok(b.marks.some((m) => m.kind === "monster"));
  assert.ok(b.marks.some((m) => m.kind === "me" && m.exact));
});

test("with nothing tracked: every pet's spawn points, small and white, and no next", () => {
  const b = M.build({ key: "verteron", world: { zone: 1010, me: { x: sx, y: sy, exact: false }, npcs: [], objects: [] }, tracked: new Map(), heading: 0, layers: { ...layers, gather: false }, gatherKinds: {}, petsMode: "tracked" });
  const spawns = b.marks.filter((m) => m.kind === "petSpawn");
  assert.ok(spawns.length > 1000);
  assert.ok(spawns.every((m) => m.r < 3 && !m.ring));
  assert.equal(b.next, null);
  assert.ok(b.petsHere > 50);
});

test("gathering kinds can be switched off", () => {
  const on = M.build({ key: "verteron", world: null, tracked: new Map(), layers: { pets: false, gather: true }, gatherKinds: {}, petsMode: "all" });
  const kinds = new Set(on.marks.map((m) => m.gather));
  assert.ok(kinds.has("Herb") && kinds.has("Ore"));
  const off = M.build({ key: "verteron", world: null, tracked: new Map(), layers: { pets: false, gather: true }, gatherKinds: { Herb: false }, petsMode: "all" });
  assert.ok(!off.marks.some((m) => m.gather === "Herb"));
});

test("the compass arrow", () => {
  assert.equal(M.arrow(0), "↑");
  assert.equal(M.arrow(90), "→");
  assert.equal(M.arrow(-90), "←");
  assert.equal(M.arrow(181), "↓");
});

test("the search finds gathering spots, pets, monsters and camps, with their maps", () => {
  const ore = M.search("orichalcum");
  assert.equal(ore[0].label, "Orichalcum");
  assert.equal(ore[0].focus.type, "gather");
  assert.ok(ore[0].maps.verteron > 0);
  assert.ok(M.search("orich ore").length >= 1, "every word, in name or kind");
  const pet = M.search(D.pets[pet1()].name).find((r) => r.focus.type === "pet");
  assert.ok(pet && pet.total > 0);
  assert.ok(M.search("guide rest").some((r) => r.focus.type === "kibelisk"));
  assert.deepEqual(M.search("x"), [], "one letter is no search");
  assert.deepEqual(M.search("zzzqqq"), []);
});
function pet1() { return pet; }

test("a focus rings its places, and the nearest is next (one there now first)", () => {
  const focus = M.search("orichalcum")[0].focus;
  const pts = M.focusPoints(focus, "verteron");
  const [fx, fy] = pts[0];
  const world = { zone: 1010, me: { x: fx + 500, y: fy, exact: true }, npcs: [], objects: [] };
  const b = M.build({ key: "verteron", world, tracked: new Map(), heading: 0, layers: { pets: false }, gatherKinds: {}, petsMode: "tracked", focus });
  assert.equal(b.hits.length / 2, pts.length);
  assert.ok(b.marks.filter((m) => m.hit).length >= pts.length);
  assert.equal(b.next.name, "Orichalcum");
  assert.equal(Math.round(b.next.metres), 5);
  // One that is there right now wins, though further away.
  const live = M.build({ key: "verteron", world: { ...world, objects: [[1, Number(focus.ids[0]), fx + 3000, fy]] }, tracked: new Map(), heading: 0, layers: { pets: false }, gatherKinds: {}, petsMode: "tracked", focus });
  assert.equal(live.next.live, true);
  assert.equal(Math.round(live.next.metres), 25);
});

test("the gathering kinds have plain names and say what they hold", () => {
  assert.equal(M.kindLabel("Cotton"), "Fibers");
  assert.equal(M.kindLabel("Fragment"), "Empyrean Traces");
  assert.ok(M.kindTitle("Ore").includes("Orichalcum"));
});
