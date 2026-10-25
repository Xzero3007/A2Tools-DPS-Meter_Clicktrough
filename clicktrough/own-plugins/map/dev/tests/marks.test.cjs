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

test("the data has the five world maps, their zones and calibration", () => {
  for (const key of ["verteron", "altgard", "abyss", "poeta", "ishalgen"]) {
    const m = D.maps[key];
    assert.ok(m && m.tiles.length && m.scale > 0 && m.tile > 0, key);
    // The game's whole pictures: every tile of the grid.
    assert.equal(m.picture, "game", key);
    assert.equal(m.tiles.length, m.grid * m.grid, key);
  }
  assert.equal(D.zones["1010"], "verteron");
  assert.equal(D.zones["1110"], "altgard");
  assert.equal(D.zones["100001"], "poeta");
  assert.equal(D.zones["1100"], "ishalgen");
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

test("the next pet: a pinned one before a farmed one before one only needed, live first within them", () => {
  // Another pet monster of Verteron, of another pet.
  const npc2 = Object.keys(D.spawns.verteron).find((n) => D.npcPets[n] != null && String(D.npcPets[n]) !== pet);
  const pet2 = String(D.npcPets[npc2]);
  const [ox, oy] = D.spawns.verteron[npc2];
  const me = { x: ox + 500, y: oy, exact: true }; // 5 m from pet2's spawn point
  const world = { zone: 1010, me, npcs: [[7, Number(npc2), ox + 800, oy]] }; // pet2 there, 3 m off
  const at = (marks) => M.mergeTracked({ pf: { pets: [{ id: Number(pet), mark: marks[0], name: "First" }, { id: Number(pet2), mark: marks[1], name: "Second" }] } });
  const nextOf = (tracked, nextFor) => M.build({ key: "verteron", world, tracked, heading: 0, layers, gatherKinds: {}, petsMode: "tracked", nextFor }).next;
  // Both only needed: the one there now.
  assert.equal(nextOf(at(["needed", "needed"])).name, "Second");
  // The pinned one, however far, before a needed one there now.
  const pinned = nextOf(at(["pinned", "needed"]));
  assert.equal(pinned.name, "First");
  assert.equal(pinned.mark, "pinned");
  assert.equal(nextOf(at(["farming", "needed"])).name, "First");
  assert.equal(nextOf(at(["pinned", "farming"])).name, "First");
  assert.equal(nextOf(at(["needed", "farming"])).name, "Second");
  // "chosen": the needed ones are no next; "off": none.
  assert.equal(nextOf(at(["needed", "needed"]), "chosen"), null);
  assert.equal(nextOf(at(["needed", "farming"]), "chosen").name, "Second");
  assert.equal(nextOf(at(["pinned", "farming"]), "off"), null);
  assert.match(M.markText("needed"), /rank 3/);
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

test("the calibration is the game's map bounds, and the Kibelisks agree", () => {
  for (const key of ["verteron", "altgard", "abyss", "poeta", "ishalgen"]) {
    const m = D.maps[key];
    const [x0, y0, x1, y1] = D.calibration[key].bounds;
    // One map pixel of the game's picture is 99.6 cm everywhere.
    assert.ok(Math.abs((m.tile * m.grid) / m.scale / (x1 - x0) - 1) < 1e-9, key);
    assert.ok(Math.abs(((m.tile * m.grid) / (m.tile === 2048 ? 2 : 1)) / (x1 - x0) * 100 - 1.00392) < 1e-4, key);
    assert.ok(Math.abs(m.ox + m.scale * x0) < 1e-6 && Math.abs(m.oy + m.scale * y0) < 1e-6, key);
  }
  for (const key of ["verteron", "altgard"]) {
    const k = D.calibration[key].kibelisks;
    assert.ok(k && k.pairs >= 50 && k.rmsMetres < 10 && k.cornersApartMetres < 15, key);
  }
  assert.ok(Math.abs(D.maps.verteron.ox - 8192) < 1e-6 && Math.abs(D.maps.altgard.ox - 4096) < 1e-6);
});

test("the search finds Hidden Cubes, Monoliths, places and regions", () => {
  const cubes = M.search("hidden cube");
  const spots = cubes.find((r) => r.focus.type === "cube" && r.focus.ids[0] === "spots");
  const all = cubes.find((r) => r.focus.type === "cube" && r.focus.ids[0] === "all");
  assert.ok(spots && spots.maps.altgard > 50 && spots.maps.verteron > 50);
  assert.ok(all && all.maps.altgard > 1000, "every place the game may put one");
  assert.ok(M.search("cubes").length >= 2);
  const mono = M.search("monolith").find((r) => r.focus.type === "monolith");
  assert.ok(mono && mono.maps.altgard > 100 && mono.maps.abyss > 100);
  const seals = M.search("sealed dungeons").find((r) => r.focus.ids[0] === "seal:*");
  assert.ok(seals && seals.maps.altgard > 30);
  const one = M.search("Lagta Fafnite Storage").find((r) => r.focus.type === "place");
  assert.ok(one && one.total === 1);
  const region = M.search("Safe Haven").find((r) => r.focus.type === "region");
  assert.ok(region && region.maps.altgard === 1);
});

test("the Hidden Cubes layer shows the known spots, the Places layer places and region names", () => {
  const b = M.build({ key: "altgard", world: null, tracked: new Map(), layers: { cubes: true, places: true, monoliths: true }, gatherKinds: {}, petsMode: "all" });
  assert.equal(b.marks.filter((m) => m.kind === "cubeSpot").length, D.cubeSpots.altgard.length / 2);
  assert.ok(b.marks.filter((m) => m.kind === "place").length > 50);
  assert.ok(b.marks.some((m) => m.kind === "region" && m.text === "Safe Haven"));
  assert.ok(b.marks.filter((m) => m.kind === "monolith").length > 100);
  const off = M.build({ key: "altgard", world: null, tracked: new Map(), layers: {}, gatherKinds: {}, petsMode: "all" });
  assert.equal(off.marks.length, 0);
});

test("a Hidden Cube in range is the next one when searching for cubes", () => {
  const focus = M.search("hidden cube").find((r) => r.focus.ids[0] === "spots").focus;
  const [cx, cy] = M.focusPoints(focus, "altgard")[0];
  const world = { zone: 1110, me: { x: cx + 9000, y: cy, exact: true }, npcs: [], objects: [[5, D.cubes[0], cx + 9500, cy]] };
  const b = M.build({ key: "altgard", world, tracked: new Map(), heading: 0, layers: {}, gatherKinds: {}, petsMode: "tracked", focus });
  assert.equal(b.next.live, true);
  assert.equal(Math.round(b.next.metres), 5);
});

test("the region you are in, by its outline", () => {
  const [, x, y] = D.regions.altgard.find(([name]) => name === "Safe Haven");
  assert.equal(M.regionAt("altgard", x, y), "Safe Haven");
  assert.equal(M.regionAt("altgard", 10e6, 10e6), null);
});

test("without a zone, the map comes from the gathering spots and cubes around", () => {
  const [env, pts] = Object.entries(D.gather.points.altgard).find(([e]) => e !== "cube");
  assert.equal(M.mapOf({ zone: null, npcs: [], objects: [[1, Number(env), pts[0] + 200, pts[1]]] }), "altgard");
  const cube = D.gather.points.verteron.cube;
  assert.equal(M.mapOf({ zone: null, npcs: [], objects: [[2, D.cubes[0], cube[0], cube[1] + 100]] }), "verteron");
});

test("a material's gathering spots by the Market's name for it", () => {
  const asvata = M.gatherFor("Pure Asvata Log");
  assert.equal(asvata.type, "gather");
  assert.equal(asvata.label, "Asvata");
  assert.ok(asvata.ids.length >= 1 && asvata.ids.every((e) => D.gather.objects[e].name === "Asvata"));
  assert.equal(M.gatherFor("Fresh Aria").label, "Aria");
  assert.equal(M.gatherFor("Radiant Orichalcum Ore").label, "Orichalcum");
  assert.equal(M.gatherFor("Fine Odyle").label, "Odyle");
  assert.equal(M.gatherFor("Orichalcum Ingot")?.label, "Orichalcum");
  assert.equal(M.gatherFor("Wrathful Mind"), null);
});

test("field bosses: on the map, in the search, and a focus by their world-map id", () => {
  assert.equal(D.bosses.altgard.length, 24);
  assert.equal(D.bossIds["111001"], 2400017);
  const hit = M.search("Danar")[0];
  assert.equal(hit.label, "Melted Danar");
  assert.equal(hit.sub, "Field boss");
  assert.deepEqual(Object.keys(hit.maps), ["altgard"]);
  const [, , bx, by] = D.bosses.altgard.find(([npc]) => npc === 2400017);
  assert.deepEqual(M.focusPoints(hit.focus, "altgard"), [[bx, by]]);
  const places = M.build({ key: "altgard", world: null, tracked: new Map(), heading: 0, layers: { places: true }, gatherKinds: {}, petsMode: "tracked" });
  assert.equal(places.marks.filter((m) => m.kind === "boss").length, 24);
});

test("the way to a place: walk when it is near, else teleport to the Kibelisk nearest it", () => {
  const [kn, kx, ky] = D.kibelisks.altgard[0];
  const target = [kx + 3000, ky]; // 30 m from that Kibelisk
  // Far away: teleport, then 30 m.
  const far = { x: kx + 300000, y: ky + 300000 };
  const r1 = M.routeTo("altgard", far, [target]);
  assert.equal(r1.kib[0], kn);
  assert.equal(Math.round(r1.metres), 30);
  assert.deepEqual(r1.from, [kx, ky]);
  // Near: walk.
  const close = { x: target[0] + 5000, y: target[1] };
  const r2 = M.routeTo("altgard", close, [target]);
  assert.equal(r2.kib, null);
  assert.equal(Math.round(r2.walk), 50);
  // Of several places, the cheapest.
  const r3 = M.routeTo("altgard", close, [[close.x + 900000, close.y], target]);
  assert.deepEqual(r3.to, target);
  // Without a position: the Kibelisk nearest the only place.
  assert.equal(M.routeTo("altgard", null, [target]).kib[0], kn);
  assert.equal(M.routeTo("altgard", null, [target, target]), null);
  // In the marks: the route, the Kibelisk to teleport to, and next says so.
  const focus = { type: "boss", ids: ["2400017"], label: "Melted Danar" };
  const [, , bx, by] = D.bosses.altgard.find(([npc]) => npc === 2400017);
  const b = M.build({ key: "altgard", world: { zone: 1110, me: { x: bx + 400000, y: by, exact: true }, npcs: [], objects: [] }, tracked: new Map(), heading: 0, layers: {}, gatherKinds: {}, petsMode: "tracked", focus });
  assert.ok(b.marks.some((m) => m.kind === "route"));
  assert.ok(b.marks.some((m) => m.kind === "teleport"));
  assert.ok(b.next.via && b.next.via.name);
  assert.equal(b.next.name, "Melted Danar");
});

test("spots the meter sees are learnt, once each, and then shown", () => {
  M.setLearned({});
  const store = {};
  const env = Object.keys(D.gather.objects).find((e) => D.gather.objects[e].name === "Asvata");
  const before = M.focusPoints(M.gatherFor("Asvata Log"), "altgard").length;
  const far = [0, 0];
  const world = { zone: 1110, objects: [[1, Number(env), far[0], far[1]], [2, Number(env), far[0] + 300, far[1]]], npcs: [] };
  assert.equal(M.learnFrom(store, "altgard", world), 1, "the second is the same spot (3 m)");
  assert.equal(M.learnFrom(store, "altgard", world), 0, "known now");
  // A known data spot is not learnt again.
  const [dx, dy] = D.gather.points.altgard[env];
  assert.equal(M.learnFrom(store, "altgard", { objects: [[3, Number(env), dx + 200, dy]], npcs: [] }), 0);
  // A pet monster away from its spawn points.
  const npc = Object.keys(D.npcPets).find((n) => D.spawns.altgard?.[n]);
  assert.equal(M.learnFrom(store, "altgard", { objects: [], npcs: [[9, Number(npc), 1, 1]] }), 1);
  M.setLearned(store);
  assert.equal(M.focusPoints(M.gatherFor("Asvata Log"), "altgard").length, before + 1);
  assert.equal(M.learnFrom(store, "nowhere", world), 0);
  M.setLearned({});
});
