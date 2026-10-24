// The Market plugin's sums: prices as aion2.exchange gives them, what
// Substance Morph makes from Odyle, and what a recipe costs and brings.
// No page here: the window (plugin.js) and the tests use it.
(() => {
  const D = globalThis.MARKET_DATA;

  const name = (id) => D.items[String(id)]?.[0] || `Item ${id}`;
  const grade = (id) => D.items[String(id)]?.[1] || 0;
  const FACTION_RACE = { Elyos: "L", Asmodian: "D" };

  // The gathered materials Substance Morph makes: one Odyle of the same
  // grade each (its output is bound: for crafting, not for the market).
  const MORPH = new Map();
  const KIND = new Map();
  for (const [kind, groups] of Object.entries(D.gather)) {
    for (const group of groups) {
      for (const id of group) {
        KIND.set(String(id), kind);
        const g = grade(id);
        if (g >= 1 && g <= 4) MORPH.set(String(id), D.odyle[g - 1]);
      }
    }
  }
  for (const id of D.odyle) KIND.set(String(id), "Odyle");

  /** aion2.exchange's item rows -> Map(id -> { price, listings, sold,
   *  soldAvg, soldMin, soldMax, change, at }); price null while none is
   *  listed. */
  function readPrices(rows) {
    const out = new Map();
    for (const it of rows || []) {
      const id = it?.item_key ?? it?.id ?? it?.item_id;
      if (id == null) continue;
      const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
      const listed = it.listed !== false && num(it.price) > 0;
      out.set(String(id), {
        price: listed ? num(it.price) : null,
        listings: listed ? num(it.listings) ?? 0 : 0,
        sold: num(it.units_sold),
        soldAvg: num(it.sold_avg_price),
        soldMin: num(it.sold_min_price),
        soldMax: num(it.sold_max_price),
        change: num(it.change_pct),
        at: it.captured_at || null,
        name: it.name || null,
      });
    }
    return out;
  }

  const market = (prices, id) => prices.get(String(id))?.price ?? null;
  const npcPrice = (npc, id) => {
    const v = Number(npc?.[String(id)]);
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  /** The Odyle Substance Morph makes `id` from, or null. */
  const morphFrom = (id) => MORPH.get(String(id)) ?? null;
  const morphPrice = (prices, id) => {
    const o = morphFrom(id);
    return o == null ? null : market(prices, o);
  };

  /** What one of `id` costs: an NPC's price for the bound tools, else the
   *  cheaper of the market and (with `morph`) the Odyle it can be morphed
   *  from. { unit, source: "npc" | "market" | "morph" | null, via }. */
  function unitCost(prices, npc, id, { morph = true } = {}) {
    const n = npcPrice(npc, id);
    if (n != null) return { unit: n, source: "npc" };
    const m = market(prices, id);
    const o = morph ? morphPrice(prices, id) : null;
    if (o != null && (m == null || o < m)) return { unit: o, source: "morph", via: morphFrom(id) };
    if (m != null) return { unit: m, source: "market" };
    return { unit: null, source: null };
  }

  /** The recipes of a faction ("Elyos", "Asmodian"; else all). */
  function recipesOf(faction) {
    const race = FACTION_RACE[faction];
    return race ? D.recipes.filter((r) => r[1] === race) : D.recipes.slice();
  }

  /**
   * One craft of `recipe`, all of it succeeding (no failures, no combo):
   * { lines: [{ item, count, buy, best, buyTotal, bestTotal }], costBuy,
   *   costBest, complete, sell, gross, net, profit, profitBuy, margin }.
   * costBuy pays the market for everything; costBest morphs Odyle where that
   * is cheaper. The product sells at its lowest listing, less the fee.
   */
  function recipeSums(recipe, prices, npc, { fee = 0.1 } = {}) {
    const [, , , , , , product, n, mats] = recipe;
    let costBuy = 0;
    let costBest = 0;
    let complete = true;
    const lines = mats.map(([item, count]) => {
      const buy = unitCost(prices, npc, item, { morph: false });
      const best = unitCost(prices, npc, item, { morph: true });
      const buyTotal = buy.unit == null ? null : buy.unit * count;
      const bestTotal = best.unit == null ? null : best.unit * count;
      if (bestTotal == null) complete = false;
      costBuy += buyTotal ?? bestTotal ?? 0;
      costBest += bestTotal ?? 0;
      return { item, count, buy, best, buyTotal, bestTotal };
    });
    const sell = market(prices, product);
    const gross = sell == null ? null : sell * n;
    const net = gross == null ? null : gross * (1 - fee);
    const profit = net != null && complete ? net - costBest : null;
    const profitBuy = net != null && complete ? net - costBuy : null;
    return {
      product, n, lines, costBuy, costBest, complete, sell, gross, net, profit, profitBuy,
      margin: profit != null && costBest > 0 ? profit / costBest : null,
    };
  }

  /** Where each material goes: Map(material -> [{ recipe, count }]),
   *  for a faction's recipes. */
  function usesOf(faction) {
    const out = new Map();
    for (const r of recipesOf(faction)) {
      for (const [item, count] of r[8]) {
        const key = String(item);
        if (!out.has(key)) out.set(key, []);
        out.get(key).push({ recipe: r, count });
      }
    }
    return out;
  }

  /** The morphable materials against their Odyle: [{ item, odyle, market,
   *  odylePrice, saving, savingPct }], biggest saving first. */
  function morphTable(prices) {
    const rows = [];
    for (const [id, odyle] of MORPH) {
      const m = market(prices, id);
      const o = market(prices, odyle);
      const saving = m != null && o != null ? m - o : null;
      rows.push({ item: Number(id), odyle, market: m, odylePrice: o, saving, savingPct: saving != null && m > 0 ? saving / m : null });
    }
    rows.sort((a, b) => (b.saving ?? -Infinity) - (a.saving ?? -Infinity) || name(a.item).localeCompare(name(b.item)));
    return rows;
  }

  /** What Odyle Energy (Bound) costs through Substance Morph, from the
   *  Odyle at the market: { total, perEnergy, energy } or null. */
  function energyMorphCost(prices) {
    const e = D.energyMorph;
    let total = e.kina;
    for (const [id, count] of e.materials) {
      const p = market(prices, id);
      if (p == null) return null;
      total += p * count;
    }
    return { total, energy: e.energy, perEnergy: total / e.energy };
  }

  /** Every item a faction's recipes, the gathered materials and Odyle
   *  need a price for. */
  function neededItems(faction) {
    const ids = new Set();
    for (const id of KIND.keys()) ids.add(id);
    for (const r of recipesOf(faction)) {
      ids.add(String(r[6]));
      if (r[9]) ids.add(String(r[9][1]));
      for (const [item] of r[8]) ids.add(String(item));
    }
    for (const id of Object.keys(D.npcPrices)) ids.delete(id);
    return [...ids];
  }

  /** "12,345" (or "—" for nothing). */
  const kina = (v) => (v == null || !Number.isFinite(v) ? "—" : Math.round(v).toLocaleString("en-US"));

  globalThis.MarketCalc = Object.freeze({
    name, grade, readPrices, market, unitCost, morphFrom, recipesOf, recipeSums, usesOf, morphTable,
    energyMorphCost, neededItems, kina, kindOf: (id) => KIND.get(String(id)) || null, FACTION_RACE,
  });
})();
