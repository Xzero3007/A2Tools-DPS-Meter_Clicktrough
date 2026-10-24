// The Europe shop (tabs 201/204), from a player's capture on 2026-10-20:
//   sed 's/^/91 56 /' eu-merchant.hex | decoder-check ../../manifest.json > eu-events.jsonl
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require(path.join(process.env.PLUGIN_DIR, "data.js"));
const L = require(path.join(process.env.PLUGIN_DIR, "logic.js"));
const ix = L.index(globalThis.PET_DATA);
const lines = fs.readFileSync(path.join(__dirname, "eu-events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const NOW = Date.parse("2026-10-20T17:30:00Z"); // half an hour before the stock changes

function stocks(now = NOW) {
  const out = [];
  let events = [];
  for (const e of lines) {
    if (e.event !== "--frame-end--") { events.push(e); continue; }
    const frames = new L.MarketFrames((parts) => out.push(L.stockFrom(parts, now, ix)));
    for (const ev of events) frames.push(ev.event.slice(8), ev.data, now);
    frames.flush();
    events = [];
  }
  return out;
}
const name = (id) => ix.pets.get(id).name;

test("Europe's Special (201) and Pets (204) tabs read, every price as the shop shows it", () => {
  const [special, pets] = stocks();
  assert.equal(special.tabName, "Special");
  assert.equal(pets.tabName, "Pets");
  assert.equal(special.refresh, Date.parse("2026-10-20T18:00:00Z"));
  const ursus = special.offers.find((o) => name(o.pet) === "Elite Ursus");
  assert.deepEqual([ursus.original, ursus.price, ursus.discount], [100000, 70000, 30]);
  assert.deepEqual(special.offers.map((o) => name(o.pet)).sort(), ["Black Smoke Murute", "Dracuni Herbalist", "Elite Ursus"]);
  assert.equal(pets.offers.length, 10);
  const skyray = pets.offers.find((o) => name(o.pet) === "Skyray");
  assert.deepEqual([skyray.price, skyray.discount], [50000, 50]);
});

test("what to buy: merchant-only pets first, the farmable ones apart", () => {
  const coll = new L.Collection();
  coll.snapshot({ ranks: Object.fromEntries(ix.list.map((p) => [p.id, 1])), souls: {} }, NOW);
  const s = stocks();
  assert.deepEqual(L.recommendations(s, coll, NOW, ix).map((o) => name(o.pet)), ["Elite Ursus", "Flame Stone Guardian Statue"]);
  const farm = L.recommendations(s, coll, NOW, ix, { farmable: true }).map((o) => name(o.pet));
  assert.equal(farm.length, 11);
  assert.ok(farm.includes("Skyray") && farm.includes("Dracuni Herbalist"));
  coll.rank(ix.list.find((p) => p.name === "Skyray").id, 3, NOW);
  assert.ok(!L.recommendations(s, coll, NOW, ix, { farmable: true }).some((o) => name(o.pet) === "Skyray"), "a maxed pet is not offered");
});

test("a stock read after its change time is not used", () => {
  assert.deepEqual(stocks(Date.parse("2026-10-20T18:00:01Z")), [null, null]);
});
