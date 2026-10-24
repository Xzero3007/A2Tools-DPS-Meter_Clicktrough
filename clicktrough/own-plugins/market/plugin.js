// The Market plugin's window: what the gathered materials bring on your
// server's market, what they cost made from Odyle (Substance Morph), what
// each recipe costs and brings, and where each material goes. Prices come
// from aion2.exchange's public API (through the meter, a2.web.get).
(() => {
  const D = globalThis.MARKET_DATA;
  const C = globalThis.MarketCalc;
  const $ = (s) => document.querySelector(s);
  const API = "https://aion2.exchange/api";
  const STALE_MS = 20 * 60_000; // prices older than this are fetched again on opening
  const AUTO_MS = 30 * 60_000; // and while the window stays open
  const BATCH = 150; // item keys per request

  let settings = {
    server: null, // aion2.exchange's server id
    tab: "gather",
    fee: 10, // % the market keeps of a sale
    npc: {}, // the player's own NPC prices: id -> Kina
    prof: "all",
    sort: "profit",
    priced: true,
    kind: "all",
    search: {},
  };
  let servers = []; // [{ id, game, name, region, faction, hasData }] (calc.js readServers)
  let prices = new Map();
  let fetchedAt = 0;
  let snapshot = null;
  let character = null;
  let busy = false;
  let error = "";
  const open = new Set(); // rows shown open: "r:<recipe>", "m:<material>"
  let shown = { recipes: 80, materials: 80 };

  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props);
    for (const k of kids) if (k != null) n.append(k);
    return n;
  };
  const kina = C.kina;
  const fold = (t) => String(t).toLowerCase();
  const saveLater = (() => {
    let t = 0;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => a2.storage.set("settings", settings).catch(() => {}), 400);
    };
  })();

  // ---------- the server and its prices ----------
  const server = () => servers.find((s) => s.id === settings.server) || null;
  const faction = () => server()?.faction || null;
  const npc = () => ({ ...D.npcPrices, ...settings.npc });

  async function loadServers() {
    try {
      const list = C.readServers(await a2.web.get(`${API}/servers`));
      if (list.length) {
        servers = list;
        error = "";
        a2.storage.set("servers", { at: Date.now(), servers }).catch(() => {});
      } else if (!servers.length) {
        error = "aion2.exchange: no servers in its answer";
      }
    } catch (e) {
      if (!servers.length) error = `aion2.exchange: ${e?.message || e}`;
    }
    pickServer();
    renderBar();
  }

  /** The player's server, once: aion2.exchange numbers it 10000 more than
   *  the game does (12305 = Marchutan, the game's 2305). */
  function pickServer() {
    if (settings.server != null && servers.some((s) => s.id === settings.server)) return;
    const mine = C.serverOf(servers, character?.serverId);
    if (mine) {
      settings.server = mine.id;
      saveLater();
    }
  }

  async function loadPrices(force = false) {
    const s = server();
    if (!s || busy) return;
    if (!force && fetchedAt && Date.now() - fetchedAt < STALE_MS && prices.size) return;
    busy = true;
    error = "";
    renderBar();
    try {
      // In parts; a part the service fails keeps the prices it had (the
      // site is often briefly down), the others are new.
      const keys = C.neededItems(s.faction);
      const rows = [];
      let failed = 0;
      let parts = 0;
      let lastError = null;
      for (let i = 0; i < keys.length; i += BATCH) {
        const part = keys.slice(i, i + BATCH);
        parts++;
        try {
          const res = await a2.web.get(`${API}/items?server=${s.id}&limit=${BATCH + 50}&keys=${part.join(",")}`);
          rows.push(...(Array.isArray(res?.items) ? res.items : []));
        } catch (e) {
          failed++;
          lastError = e;
        }
      }
      if (failed === parts) throw lastError;
      const fresh = C.readPrices(rows);
      prices = failed ? new Map([...prices, ...fresh]) : fresh;
      fetchedAt = Date.now();
      snapshot = rows.map((r) => r.captured_at).filter(Boolean).sort().pop() || snapshot;
      if (failed) error = `aion2.exchange: ${failed} of ${parts} parts kept their older prices: ${lastError?.message || lastError}`;
      const keep = [...prices].map(([id, p]) => [id, p.price, p.listings, p.sold, p.soldAvg, p.change]);
      a2.storage.set("prices", { server: s.id, at: fetchedAt, snapshot, rows: keep }).catch(() => {});
    } catch (e) {
      error = `aion2.exchange: ${e?.message || e}${prices.size ? " · showing the prices from before" : ""}`;
    } finally {
      busy = false;
    }
    render();
  }

  function restoreCache(c) {
    try {
      if (c?.server !== settings.server || !Array.isArray(c.rows)) return;
      prices = new Map(c.rows.map(([id, price, listings, sold, soldAvg, change]) => [String(id), { price, listings, sold, soldAvg, change }]));
      fetchedAt = c.at || 0;
      snapshot = c.snapshot || null;
    } catch {}
  }

  // ---------- the top bar ----------
  function renderBar() {
    const pick = $(".server");
    const regions = new Map();
    for (const s of servers) {
      if (!s.hasData) continue;
      const r = s.region || "Other";
      if (!regions.has(r)) regions.set(r, []);
      regions.get(r).push(s);
    }
    pick.replaceChildren(el("option", { value: "", textContent: servers.length ? "Pick your server" : "Servers …" }));
    for (const [region, list] of [...regions].sort((a, b) => a[0].localeCompare(b[0]))) {
      const g = el("optgroup", { label: region });
      for (const s of list.sort((a, b) => String(a.faction).localeCompare(String(b.faction)) || a.name.localeCompare(b.name))) {
        g.append(el("option", { value: String(s.id), textContent: `${s.name} · ${s.faction || ""}` }));
      }
      pick.append(g);
    }
    pick.value = settings.server != null ? String(settings.server) : "";
    const st = $(".status");
    st.classList.toggle("error", !!error);
    if (error) st.textContent = error;
    else if (busy) st.textContent = "Getting prices …";
    else if (!server()) st.textContent = "Pick your server for its prices.";
    else if (!fetchedAt) st.textContent = "No prices yet.";
    else {
      const when = new Date(snapshot || fetchedAt);
      const listed = [...prices.values()].filter((p) => p.price != null).length;
      st.textContent = `Prices of ${when.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${listed} items listed`;
    }
  }

  // ---------- the tabs ----------
  function render() {
    renderBar();
    for (const t of document.querySelectorAll(".tab")) t.setAttribute("aria-selected", String(t.dataset.tab === settings.tab));
    for (const p of document.querySelectorAll(".pane")) p.hidden = p.dataset.pane !== settings.tab;
    for (const s of document.querySelectorAll(".search")) if (document.activeElement !== s) s.value = settings.search[s.dataset.for] || "";
    if (settings.tab === "gather") renderGather();
    else if (settings.tab === "odyle") renderOdyle();
    else if (settings.tab === "recipes") renderRecipes();
    else renderMaterials();
  }

  const priceCell = (v) => el("td", { className: v == null ? "none" : "" }, kina(v));
  const changeCell = (v) => el("td", { className: v == null ? "none" : v > 0 ? "gain" : v < 0 ? "loss" : "" },
    v == null ? "—" : `${v > 0 ? "+" : ""}${Math.round(v)}%`);

  function renderGather() {
    const q = fold(settings.search.gather || "");
    const box = $(".gatherList");
    box.replaceChildren();
    const groups = [["Odyle", [D.odyle]], ...Object.entries(D.gather)];
    const titles = { Odyle: "Odyle", Ore: "Ore", Gemstone: "Gemstones", Log: "Logs", Herb: "Herbs", Cooking: "Cooking ingredients" };
    let any = false;
    for (const [kind, lists] of groups) {
      const ids = lists.flat().filter((id) => !q || fold(C.name(id)).includes(q));
      if (!ids.length) continue;
      any = true;
      const head = el("tr", {}, el("th", {}, "Material"), el("th", {}, "Lowest"), el("th", {}, "Listed"),
        el("th", { title: "Sold in the last 28 days, and their average price" }, "Sold 28 d"), el("th", {}, "Avg sold"), el("th", {}, "Change"));
      const rows = ids.map((id) => {
        const p = prices.get(String(id)) || {};
        return el("tr", {}, el("td", {}, C.name(id)), priceCell(p.price), el("td", {}, p.listings ? kina(p.listings) : "—"),
          el("td", {}, p.sold != null ? kina(p.sold) : "—"), priceCell(p.soldAvg), changeCell(p.change));
      });
      box.append(el("h3", {}, titles[kind] || kind), el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows)));
    }
    if (!any) box.append(el("p", { className: "empty", textContent: "Nothing matches." }));
  }

  function renderOdyle() {
    const e = C.energyMorphCost(prices);
    const box = $(".energy");
    box.replaceChildren(
      el("strong", {}, "Odyle Energy (Bound), +40: "),
      "25 Odyle, 5 Fine Odyle, 1 Pure Odyle and 50,000 Kina",
      e ? ` = ${kina(e.total)} Kina, ${kina(e.perEnergy)} per energy` : " (no Odyle prices yet)",
      el("span", { className: "sub" }, " · at most 4 a week per character, 16 per server"),
    );
    const head = el("tr", {}, el("th", {}, "Material"), el("th", {}, "Market"), el("th", {}, "Odyle used"),
      el("th", {}, "Odyle price"), el("th", { title: "What one morphed instead of bought saves" }, "Morph saves"));
    const rows = C.morphTable(prices).map((r) => {
      const save = r.saving == null ? el("td", { className: "none" }, "—")
        : el("td", { className: r.saving > 0 ? "gain" : "loss" },
          r.saving > 0 ? `${kina(r.saving)} (${Math.round(r.savingPct * 100)}%)` : `buy (${kina(-r.saving)} cheaper)`);
      return el("tr", {}, el("td", {}, C.name(r.item)), priceCell(r.market), el("td", { className: "sub" }, C.name(r.odyle)),
        priceCell(r.odylePrice), save);
    });
    $(".odyleList").replaceChildren(el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows)));
  }

  const PROFS = ["all", "Alchemy", "Blacksmithing", "Jewelcrafting", "Tailoring", "Cooking"];

  function sourceTag(cost) {
    if (cost.source === "morph") return el("span", { className: "tag morph", title: `Morphed from ${C.name(cost.via)}` }, "morph");
    if (cost.source === "npc") return el("span", { className: "tag npc" }, "NPC");
    return null;
  }

  function recipeDetail(sums, recipe) {
    const head = el("tr", {}, el("th", {}, "Material"), el("th", {}, "Count"), el("th", {}, "Market each"),
      el("th", {}, "Best each"), el("th", {}, "Total"));
    const rows = sums.lines.map((l) => el("tr", {},
      el("td", {}, C.name(l.item), sourceTag(l.best)),
      el("td", {}, `× ${l.count}`),
      priceCell(l.buy.source === "npc" ? l.buy.unit : C.market(prices, l.item)),
      priceCell(l.best.unit),
      priceCell(l.bestTotal)));
    const extra = [];
    if (recipe[9]) {
      const [pct, item, n] = recipe[9];
      const p = C.market(prices, item);
      extra.push(`Combo ${pct}%: ${n > 1 ? `${n} × ` : ""}${C.name(item)}${p != null ? ` (${kina(p)} each)` : ""}`);
    }
    if (recipe[4] > 0) extra.push(`Level ${recipe[4]}`);
    extra.push(recipe[5] === "Auto" ? "learnt by level" : recipe[5] === "Advancement" ? "mastery advancement" : recipe[5]);
    return el("div", {}, el("table", {}, el("thead", {}, head), el("tbody", {}, ...rows)), el("div", { className: "sub" }, extra.join(" · ")));
  }

  function renderRecipes() {
    $(".profs").replaceChildren(...PROFS.map((p) => {
      const b = el("button", { type: "button", className: "chip", textContent: p === "all" ? "All" : p });
      b.setAttribute("aria-pressed", String(settings.prof === p));
      b.addEventListener("click", () => {
        settings.prof = p;
        shown.recipes = 80;
        saveLater();
        renderRecipes();
      });
      return b;
    }));
    $(".priced").checked = !!settings.priced;
    $(".sort").value = settings.sort;
    if (document.activeElement !== $(".fee")) $(".fee").value = String(settings.fee);
    const box = $(".recipeList");
    if (!server()) {
      box.replaceChildren(el("p", { className: "empty", textContent: "Pick your server above: its faction's recipes and its prices." }));
      renderNpc();
      return;
    }
    const q = fold(settings.search.recipes || "");
    const fee = Math.max(0, Math.min(50, Number(settings.fee) || 0)) / 100;
    const n = npc();
    let list = C.recipesOf(faction())
      .filter((r) => settings.prof === "all" || r[2] === settings.prof)
      .filter((r) => !q || fold(C.name(r[6])).includes(q) || r[8].some(([i]) => fold(C.name(i)).includes(q)))
      .map((r) => ({ r, s: C.recipeSums(r, prices, n, { fee }) }));
    if (settings.priced) list = list.filter((x) => x.s.sell != null);
    const by = {
      profit: (a, b) => (b.s.profit ?? -Infinity) - (a.s.profit ?? -Infinity),
      margin: (a, b) => (b.s.margin ?? -Infinity) - (a.s.margin ?? -Infinity),
      level: (a, b) => a.r[4] - b.r[4],
      name: (a, b) => C.name(a.r[6]).localeCompare(C.name(b.r[6])),
    }[settings.sort] || (() => 0);
    list.sort((a, b) => by(a, b) || C.name(a.r[6]).localeCompare(C.name(b.r[6])));
    const head = el("tr", {}, el("th", {}, "Product"), el("th", { title: "Lowest listing × how many, less the fee" }, "Sells for"),
      el("th", { title: "Every material bought" }, "Cost: market"), el("th", { title: "Odyle morphed where cheaper" }, "Cost: morph"),
      el("th", { title: "Sells for − cost with morph" }, "Profit"));
    const body = el("tbody");
    for (const { r, s } of list.slice(0, shown.recipes)) {
      const key = `r:${r[0]}`;
      const isOpen = open.has(key);
      const profit = s.profit == null ? el("td", { className: "none" }, s.complete ? "—" : "prices missing")
        : el("td", { className: s.profit >= 0 ? "gain" : "loss" }, `${s.profit >= 0 ? "+" : ""}${kina(s.profit)}`,
          s.margin != null ? el("span", { className: "sub" }, ` ${Math.round(s.margin * 100)}%`) : null);
      const row = el("tr", { className: `click${isOpen ? " open" : ""}` },
        el("td", {}, C.name(r[6]), r[7] > 1 ? el("span", { className: "sub" }, ` × ${r[7]}`) : null, el("span", { className: "sub" }, ` · ${r[2]}`)),
        priceCell(s.net), priceCell(s.complete ? s.costBuy : null), priceCell(s.complete ? s.costBest : null), profit);
      row.addEventListener("click", () => {
        if (open.has(key)) open.delete(key);
        else open.add(key);
        renderRecipes();
      });
      body.append(row);
      if (isOpen) body.append(el("tr", { className: "detail" }, el("td", { colSpan: 5 }, recipeDetail(s, r))));
    }
    const kids = [el("table", {}, el("thead", {}, head), body)];
    if (!list.length) kids.push(el("p", { className: "empty", textContent: prices.size ? "Nothing matches." : "No prices yet." }));
    if (list.length > shown.recipes) {
      const more = el("button", { type: "button", className: "more", textContent: `Show more (${list.length - shown.recipes})` });
      more.addEventListener("click", () => {
        shown.recipes += 80;
        renderRecipes();
      });
      kids.push(more);
    }
    box.replaceChildren(...kids);
    renderNpc();
  }

  function renderNpc() {
    const box = $(".npcList");
    if (box.childElementCount) return;
    const ids = Object.keys(D.npcPrices).sort((a, b) => C.name(a).localeCompare(C.name(b)));
    for (const id of ids) {
      const input = el("input", { type: "number", min: "0", step: "10", value: String(settings.npc[id] ?? D.npcPrices[id]) });
      input.addEventListener("change", () => {
        const v = Number(input.value);
        if (Number.isFinite(v) && v > 0 && v !== D.npcPrices[id]) settings.npc[id] = v;
        else delete settings.npc[id];
        saveLater();
        render();
      });
      box.append(el("span", {}, C.name(id)), input);
    }
  }

  const KINDS = [["all", "All"], ["gathered", "Gathered"], ["crafted", "Crafted materials"], ["npc", "NPC tools"], ["gear", "Earlier tiers"]];
  function materialKind(id) {
    if (C.kindOf(id)) return "gathered";
    if (D.npcPrices[String(id)] != null) return "npc";
    const g = Number(String(id).slice(0, 2));
    return g >= 61 && g <= 63 ? "crafted" : "gear";
  }

  function renderMaterials() {
    $(".kinds").replaceChildren(...KINDS.map(([k, label]) => {
      const b = el("button", { type: "button", className: "chip", textContent: label });
      b.setAttribute("aria-pressed", String(settings.kind === k));
      b.addEventListener("click", () => {
        settings.kind = k;
        shown.materials = 80;
        saveLater();
        renderMaterials();
      });
      return b;
    }));
    const box = $(".materialList");
    if (!server()) {
      box.replaceChildren(el("p", { className: "empty", textContent: "Pick your server above." }));
      return;
    }
    const q = fold(settings.search.materials || "");
    const n = npc();
    const fee = Math.max(0, Math.min(50, Number(settings.fee) || 0)) / 100;
    const uses = C.usesOf(faction());
    const list = [...uses.entries()]
      .filter(([id]) => settings.kind === "all" || materialKind(id) === settings.kind)
      .filter(([id, us]) => !q || fold(C.name(id)).includes(q) || us.some((u) => fold(C.name(u.recipe[6])).includes(q)))
      .sort((a, b) => b[1].length - a[1].length || C.name(a[0]).localeCompare(C.name(b[0])));
    const head = el("tr", {}, el("th", {}, "Material"), el("th", {}, "Market"), el("th", {}, "Best"), el("th", {}, "Recipes"));
    const body = el("tbody");
    for (const [id, us] of list.slice(0, shown.materials)) {
      const key = `m:${id}`;
      const isOpen = open.has(key);
      const best = C.unitCost(prices, n, id);
      const row = el("tr", { className: `click${isOpen ? " open" : ""}` },
        el("td", {}, C.name(id), sourceTag(best)), priceCell(best.source === "npc" ? best.unit : C.market(prices, id)), priceCell(best.unit),
        el("td", {}, String(us.length)));
      row.addEventListener("click", () => {
        if (open.has(key)) open.delete(key);
        else open.add(key);
        renderMaterials();
      });
      body.append(row);
      if (isOpen) {
        const h = el("tr", {}, el("th", {}, "Used in"), el("th", {}, "Count"), el("th", { title: "Count × best price each" }, "Costs"),
          el("th", { title: "The product's lowest listing, less the fee" }, "Product sells for"));
        const rows = us.slice().sort((a, b) => b.count - a.count || C.name(a.recipe[6]).localeCompare(C.name(b.recipe[6]))).map((u) => {
          const s = C.recipeSums(u.recipe, prices, n, { fee });
          return el("tr", {}, el("td", {}, C.name(u.recipe[6]), el("span", { className: "sub" }, ` · ${u.recipe[2]}`)),
            el("td", {}, `× ${u.count}`), priceCell(best.unit == null ? null : best.unit * u.count), priceCell(s.net));
        });
        body.append(el("tr", { className: "detail" }, el("td", { colSpan: 4 }, el("table", {}, el("thead", {}, h), el("tbody", {}, ...rows)))));
      }
    }
    const kids = [el("table", {}, el("thead", {}, head), body)];
    if (!list.length) kids.push(el("p", { className: "empty", textContent: "Nothing matches." }));
    if (list.length > shown.materials) {
      const more = el("button", { type: "button", className: "more", textContent: `Show more (${list.length - shown.materials})` });
      more.addEventListener("click", () => {
        shown.materials += 80;
        renderMaterials();
      });
      kids.push(more);
    }
    box.replaceChildren(...kids);
  }

  // ---------- the controls ----------
  for (const t of document.querySelectorAll(".tab")) {
    t.addEventListener("click", () => {
      settings.tab = t.dataset.tab;
      saveLater();
      render();
    });
  }
  for (const s of document.querySelectorAll(".search")) {
    s.addEventListener("input", () => {
      settings.search[s.dataset.for] = s.value;
      shown = { recipes: 80, materials: 80 };
      saveLater();
      render();
    });
  }
  $(".server").addEventListener("change", () => {
    settings.server = $(".server").value ? Number($(".server").value) : null;
    prices = new Map();
    fetchedAt = 0;
    open.clear();
    saveLater();
    render();
    loadPrices(true);
  });
  $(".refresh").addEventListener("click", () => {
    if (!servers.length) loadServers().then(() => loadPrices(true));
    else loadPrices(true);
  });
  $(".priced").addEventListener("change", () => {
    settings.priced = $(".priced").checked;
    saveLater();
    renderRecipes();
  });
  $(".sort").addEventListener("change", () => {
    settings.sort = $(".sort").value;
    saveLater();
    renderRecipes();
  });
  $(".fee").addEventListener("input", () => {
    const v = Number($(".fee").value);
    if (!Number.isFinite(v)) return;
    settings.fee = Math.max(0, Math.min(50, v));
    saveLater();
    renderRecipes();
  });

  // ---------- from the meter ----------
  a2.on("character", (c) => {
    character = c || null;
    if (settings.server == null && servers.length) {
      pickServer();
      render();
      loadPrices();
    }
  });

  (async () => {
    try {
      const s = await a2.storage.get("settings");
      if (s && typeof s === "object") settings = { ...settings, ...s, npc: { ...(s.npc || {}) }, search: { ...(s.search || {}) } };
    } catch {}
    try {
      const c = await a2.storage.get("servers");
      if (Array.isArray(c?.servers)) servers = C.readServers(c);
    } catch {}
    try {
      const p = await a2.storage.get("prices");
      if (p) restoreCache(p);
    } catch {}
    render();
    a2.ready();
    await loadServers();
    render();
    await loadPrices();
    setInterval(() => loadPrices(true), AUTO_MS);
  })();
})();
