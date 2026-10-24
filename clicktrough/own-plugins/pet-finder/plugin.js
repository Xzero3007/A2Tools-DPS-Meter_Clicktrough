// Pet Finder's page: the pet mobs near you and a search over every pet, with
// your rank and souls from the login collection the meter reads.
(() => {
  const L = globalThis.PetLogic;
  const ix = L.index(globalThis.PET_DATA);
  const IMG = globalThis.PET_IMAGES || { portraits: {}, crystals: {} };
  const $ = (s) => document.querySelector(s);
  const MIN = 60 * 1000;

  const STRINGS = {
    en: {
      nearby: "Nearby", search: "Search", hideMaxed: "Hide maxed", clear: "Clear",
      keepFor: "Keep for", minutes: "{n} min", untilGone: "until gone",
      noNearby: "No pet mobs seen yet. They appear as the game shows them to you; changing map clears the list after a while.",
      searchPlaceholder: "Pet, mob, region or source…", allFamilies: "All",
      pets: "{n} pets", more: "Show {n} more",
      notSynced: "Collection not read yet: log into your character with the meter running.",
      synced: "Synced at login, {t}", live: "live",
      toGo: "{n} of {all} pets still to reach rank 3 · {souls} souls to go",
      rank: "Rank {r}", locked: "Not unlocked", max: "MAX", seen: "seen {t} ago", now: "just now",
      pin: "Pin", unpin: "Unpin", mobs: "Souls from", maps: "Maps", source: "Source",
      pinnedNearby: "Pinned pet nearby: {pet} ({mob})",
      character: "{name}", noData: "No data on this pet's sources yet.",
      merchant: "Merchant", kina: "{n} Kina", off: "−{n} %", bought: "✓ souls received",
      merchantHint: "Open the Black Cloud Merchant in game once your collection is read: the pets there you still need show here for two minutes.",
      merchantNone: "Nothing in this stock you still need.", merchantStale: "Stock seen {t}: open the shop again for current offers.",
      lookOut: "Look out for: only chests and merchants give these", merchantToast: "Black Cloud Merchant: {n} pet(s) you still need",
      alsoFarmable: "Also on offer, and mobs drop these too", onlyMerchant: "Only chests and merchants give these",
      merchantUnknown: "The shop was opened {t} ago, but its offer list is in a layout Pet Finder does not know yet (it reads only the one PetTracker checked). See the README: a short packet log helps add it.",
      sideBySide: "Side by side", belowEachOther: "Below each other",
    },
    de: {
      nearby: "In der Nähe", search: "Suche", hideMaxed: "Maximierte ausblenden", clear: "Leeren",
      keepFor: "Behalten", minutes: "{n} Min.", untilGone: "bis entfernt",
      noNearby: "Noch keine Pet-Mobs gesehen. Sie erscheinen, sobald das Spiel sie dir zeigt; nach einem Kartenwechsel leert sich die Liste nach einer Weile.",
      searchPlaceholder: "Pet, Mob, Region oder Quelle…", allFamilies: "Alle",
      pets: "{n} Pets", more: "{n} weitere zeigen",
      notSynced: "Sammlung noch nicht gelesen: mit laufendem Meter in deinen Charakter einloggen.",
      synced: "Beim Login gelesen, {t}", live: "live",
      toGo: "{n} von {all} Pets noch nicht auf Rang 3 · {souls} Seelen fehlen",
      rank: "Rang {r}", locked: "Nicht freigeschaltet", max: "MAX", seen: "vor {t} gesehen", now: "gerade eben",
      pin: "Anheften", unpin: "Lösen", mobs: "Seelen von", maps: "Karten", source: "Quelle",
      pinnedNearby: "Angeheftetes Pet in der Nähe: {pet} ({mob})",
      character: "{name}", noData: "Zu diesem Pet sind noch keine Quellen bekannt.",
      merchant: "Händler", kina: "{n} Kina", off: "−{n} %", bought: "✓ Seelen erhalten",
      merchantHint: "Öffne den Black Cloud Merchant im Spiel, nachdem deine Sammlung gelesen wurde: Die Pets dort, die dir noch fehlen, erscheinen hier für zwei Minuten.",
      merchantNone: "In diesem Angebot ist nichts, was dir noch fehlt.", merchantStale: "Angebot {t}: Öffne den Laden erneut für das aktuelle Angebot.",
      lookOut: "Darauf achten: Diese gibt es nur aus Truhen und bei Händlern", merchantToast: "Black Cloud Merchant: {n} Pet(s), die dir noch fehlen",
      alsoFarmable: "Ebenfalls im Angebot, auch farmbar", onlyMerchant: "Nur aus Truhen und bei Händlern",
      merchantUnknown: "Der Laden wurde vor {t} geöffnet, aber seine Angebotsliste hat ein Format, das Pet Finder noch nicht kennt (es liest nur das von PetTracker geprüfte). Siehe README: Ein kurzer Paketmitschnitt hilft, es zu ergänzen.",
      sideBySide: "Nebeneinander", belowEachOther: "Untereinander",
    },
  };
  let lang = "en";
  const t = (k, vars = {}) => (STRINGS[lang][k] ?? STRINGS.en[k] ?? k).replace(/\{(\w+)\}/g, (_, v) => vars[v] ?? "");
  const locale = () => (lang === "de" ? "de-DE" : "en-US");
  const fmtNum = (n) => Number(n).toLocaleString(locale());

  // ---------- state ----------
  let settings = { tab: "nearby", hideMaxedNearby: false, hideMaxedSearch: false, family: "", keepMin: 10, merchantColumns: false };
  let pinned = new Set();
  let character = null;
  let collection = new L.Collection();
  let compact = false;
  let query = "";
  let shown = 60;
  const nearby = new L.Nearby(ix);
  const frames = new L.Frames({
    spawn: ({ entity, npc }) => {
      const at = currentAt || Date.now();
      const isNew = nearby.spawn(entity, npc, at);
      if (isNew !== null && pinned.has(isNew) && Date.now() - at < 30000) {
        const pet = ix.pets.get(isNew);
        a2.notify(t("pinnedNearby", { pet: pet.name, mob: ix.npcNames.get(npc) || "" })).catch(() => {});
      }
      dirty();
    },
    remove: ({ entity }) => {
      if (nearby.remove(entity)) dirty();
    },
  });
  let currentAt = 0;
  let flushTimer = 0;
  const stocks = new Map(); // tab -> stock
  const bought = new Map(); // pet -> when its souls came after it was offered
  let toldOffers = "";
  const market = new L.MarketFrames((parts) => {
    const stock = L.stockFrom(parts, parts.at, ix);
    if (!stock) return;
    shopReadAt = parts.at;
    stocks.set(stock.tab, stock);
    const all = [...stocks.values()];
    const recs = [...L.recommendations(all, collection, Date.now(), ix), ...L.recommendations(all, collection, Date.now(), ix, { farmable: true })];
    const key = recs.map((r) => `${r.pet}:${r.stock.refresh}`).join(",");
    if (recs.length && key !== toldOffers) {
      toldOffers = key;
      a2.notify(t("merchantToast", { n: recs.length })).catch(() => {});
    }
    dirty();
  });
  let marketTimer = 0;
  let shopSeenAt = 0; // any stock response, understood or not
  let shopReadAt = 0; // the last one understood
  a2.on("decoded:market-seen", (data, meta) => {
    shopSeenAt = meta?.at || Date.now();
    dirty();
  });
  for (const name of ["market-a", "market-b", "market-c", "market-more"]) {
    a2.on(`decoded:${name}`, (data, meta) => {
      market.push(name, data, meta?.at || Date.now());
      clearTimeout(marketTimer);
      marketTimer = setTimeout(() => market.flush(), 250);
    });
  }

  // ---------- storage ----------
  const saveLater = (() => {
    const timers = {};
    return (key, value) => {
      clearTimeout(timers[key]);
      timers[key] = setTimeout(() => a2.storage.set(key, value).catch(() => {}), 400);
    };
  })();
  const saveCollection = () => saveLater(L.characterKey(character), collection.toJSON());
  const saveSettings = () => saveLater("settings", settings);
  const savePins = () => saveLater("pins", [...pinned]);

  async function loadCharacter(c) {
    const key = L.characterKey(c);
    let saved = null;
    try {
      saved = await a2.storage.get(key);
    } catch {}
    // Still the same character when the answer comes back, and no login
    // collection read meanwhile (that one is newer than anything saved).
    if (L.characterKey(character) === key && !collection.synced) {
      collection = new L.Collection(saved);
      render();
    }
  }

  // ---------- events from the meter ----------
  function sameCharacter(a, b) {
    return !!a && !!b && a.name === b.name && Number(a.serverId) === Number(b.serverId);
  }
  function setCharacter(c) {
    if (!c || !c.name) return;
    if (sameCharacter(c, character)) return;
    character = { name: c.name, serverId: c.serverId };
    collection = new L.Collection();
    nearby.clear();
    stocks.clear();
    bought.clear();
    loadCharacter(character);
  }

  a2.on("language", (code) => {
    lang = String(code).startsWith("de") ? "de" : "en";
    document.documentElement.lang = lang;
    render();
  });
  a2.on("compact", (on) => {
    compact = !!on;
    render();
  });
  a2.on("character", (c) => {
    setCharacter(c);
    render();
  });

  const npcEvents = ["npc-removed", "npc-removed-more"];
  for (const op of ["40", "41", "42"]) for (const v of ["a", "b"]) npcEvents.push(`npc-spawn-${op}${v}`);
  for (const name of npcEvents) {
    a2.on(`decoded:${name}`, (data, meta) => {
      currentAt = meta?.at || Date.now();
      frames.push(name, data);
      clearTimeout(flushTimer);
      flushTimer = setTimeout(() => frames.flush(), 250);
    });
  }

  // Collection events: filed under the character the meter says was playing.
  function forCharacter(meta) {
    if (meta?.character?.name) setCharacter(meta.character);
    return meta?.at || Date.now();
  }
  a2.on("decoded:pet-collection", (data, meta) => {
    frames.flush();
    const at = forCharacter(meta);
    const c = L.collectionFrom(data, ix.catalog);
    if (!c) return;
    collection.snapshot(c, at);
    nearby.clear(); // a login: what was near before is gone
    saveCollection();
    dirty();
  });
  a2.on("decoded:pet-souls", (data, meta) => {
    const at = forCharacter(meta);
    const items = L.batchFrom(data, ix.catalog);
    if (!items || !collection.synced) return;
    const all = [...stocks.values()];
    const offered = new Set([...L.recommendations(all, collection, at, ix), ...L.recommendations(all, collection, at, ix, { farmable: true })].map((r) => r.pet));
    for (const i of items) {
      collection.gain(i.pet, i.amount, at);
      if (offered.has(i.pet) && !bought.has(i.pet)) bought.set(i.pet, at);
    }
    saveCollection();
    dirty();
  });
  a2.on("decoded:pet-spent", (data, meta) => {
    const at = forCharacter(meta);
    const items = L.batchFrom(data, ix.catalog);
    if (!items || !collection.synced) return;
    for (const i of items) collection.spend(i.pet, i.amount, at);
    saveCollection();
    dirty();
  });
  a2.on("decoded:pet-rank", (data, meta) => {
    const at = forCharacter(meta);
    const r = L.rankFrom(data, ix.catalog);
    if (!r || !collection.synced) return;
    collection.rank(r.pet, r.rank, at);
    saveCollection();
    dirty();
  });

  // ---------- rendering ----------
  let renderQueued = false;
  function dirty() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      render();
    });
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function portrait(id) {
    const src = IMG.portraits[id];
    const box = el("span", "portrait");
    if (src) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      img.decoding = "async";
      box.append(img);
    }
    return box;
  }
  function familyTag(family) {
    const tag = el("span", `family f-${family.toLowerCase()}`);
    const src = IMG.crystals[family];
    if (src) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = src;
      tag.append(img);
    }
    tag.append(document.createTextNode(family));
    return tag;
  }
  function progressLine(id) {
    const p = collection.progress(id);
    const wrap = el("div", "progress");
    if (p.rank === null) return wrap;
    const label = el("span", "rankText", p.rank === 0 ? t("locked") : t("rank", { r: p.rank }));
    const count = el("span", "count", p.goal === null ? t("max") : `${p.souls}/${p.goal}`);
    const bar = el("div", "bar");
    const fill = el("div", "fill");
    fill.style.width = `${p.goal === null ? 100 : Math.min(100, (100 * p.souls) / p.goal)}%`;
    if (p.goal === null) bar.classList.add("maxed");
    bar.append(fill);
    wrap.append(label, count, bar);
    return wrap;
  }
  function pinButton(id) {
    const on = pinned.has(id);
    const b = el("button", on ? "pin on" : "pin", on ? "★" : "☆");
    b.title = on ? t("unpin") : t("pin");
    b.setAttribute("aria-pressed", String(on));
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (pinned.has(id)) pinned.delete(id);
      else pinned.add(id);
      savePins();
      render();
    });
    return b;
  }
  function span(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    return s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h`;
  }
  function ago(ms) {
    if (Date.now() - ms < 5000) return t("now");
    return t("seen", { t: span(ms) });
  }

  function renderHeader() {
    const h = $("#status");
    h.replaceChildren();
    if (!collection.synced) {
      h.append(el("div", "muted", t("notSynced")));
      return;
    }
    const time = new Date(collection.syncedAt).toLocaleString(locale(), { dateStyle: "short", timeStyle: "short" });
    const line = el("div", "muted", t("synced", { t: time }));
    if (character?.name) line.prepend(el("strong", "who", `${character.name} · `));
    h.append(line);
    const tot = L.totals(ix, collection);
    if (tot) h.append(el("div", "totals", t("toGo", { n: fmtNum(tot.notMax), all: fmtNum(tot.all), souls: fmtNum(tot.toMax) })));
  }

  function renderTabs() {
    const nav = $("#tabs");
    nav.hidden = compact;
    const count = nearby.view().length;
    const offers = [...merchantRows(Date.now()), ...merchantRows(Date.now(), true)].filter((r) => !r.done).length;
    nav.replaceChildren(
      ...[["nearby", `${t("nearby")}${count ? ` (${count})` : ""}`], ["search", t("search")], ["merchant", `${t("merchant")}${offers ? ` (${offers})` : ""}`]].map(([id, label]) => {
        const b = el("button", settings.tab === id ? "tab on" : "tab", label);
        b.addEventListener("click", () => {
          settings.tab = id;
          saveSettings();
          render();
          if (id === "search") $("#q")?.focus();
        });
        return b;
      }),
    );
    if (settings.tab === "merchant") nav.append(columnsButton());
  }

  // The Merchant tab's sections (only from chests and merchants, also
  // farmable, look out for) side by side, a column each, as a wide bar; too
  // narrow for that, they wrap under each other.
  function columnsButton() {
    const on = !!settings.merchantColumns;
    const b = el("button", "layoutBtn");
    b.type = "button";
    b.title = on ? t("belowEachOther") : t("sideBySide");
    b.setAttribute("aria-label", b.title);
    b.setAttribute("aria-pressed", String(on));
    b.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="M15 4v16"/></svg>';
    b.addEventListener("click", () => {
      settings.merchantColumns = !settings.merchantColumns;
      saveSettings();
      render();
    });
    return b;
  }

  function renderNearby() {
    const view = $("#view");
    const frag = [];
    if (!compact) {
      const bar = el("div", "controls");
      const hide = el("label", "check");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = settings.hideMaxedNearby;
      cb.addEventListener("change", () => { settings.hideMaxedNearby = cb.checked; saveSettings(); render(); });
      hide.append(cb, el("span", null, t("hideMaxed")));
      // Buttons, not a <select>: WebKitGTK draws a select in the desktop's
      // light theme, unreadable on the dark panel.
      const keep = el("div", "keep");
      keep.append(el("span", null, t("keepFor")));
      for (const m of [5, 10, 30, 0]) {
        const b = el("button", m === settings.keepMin ? "seg on" : "seg", m ? t("minutes", { n: m }) : t("untilGone"));
        b.addEventListener("click", () => { settings.keepMin = m; saveSettings(); render(); });
        keep.append(b);
      }
      const clear = el("button", "small", t("clear"));
      clear.addEventListener("click", () => { nearby.clear(); render(); });
      bar.append(hide, keep, clear);
      frag.push(bar);
    }
    nearby.prune(Date.now(), settings.keepMin * MIN);
    let groups = nearby.view();
    if (settings.hideMaxedNearby) groups = groups.filter((g) => collection.progress(g.pet).rank !== 3);
    groups.sort((a, b) => (pinned.has(b.pet) ? 1 : 0) - (pinned.has(a.pet) ? 1 : 0) || b.seen - a.seen);
    if (!groups.length) {
      frag.push(el("p", "empty", t("noNearby")));
    } else {
      const ul = el("ul", "rows");
      for (const g of groups) {
        const pet = ix.pets.get(g.pet);
        const li = el("li", pinned.has(g.pet) ? "row pinned" : "row");
        const main = el("div", "main");
        const title = el("div", "title");
        title.append(el("span", "name", pet.name), familyTag(pet.family));
        main.append(title, el("div", "mobs", g.mobs.map((m) => (m.count > 1 ? `${m.name} ×${m.count}` : m.name)).join(", ")), progressLine(g.pet));
        const side = el("div", "side");
        side.append(pinButton(g.pet), el("span", "seen", ago(g.seen)));
        li.append(portrait(g.pet), main, side);
        ul.append(li);
      }
      frag.push(ul);
    }
    view.replaceChildren(...frag);
  }

  let searchBox = null;
  function renderSearch() {
    const view = $("#view");
    if (!searchBox) {
      searchBox = el("div", "searchBox");
      const input = document.createElement("input");
      input.id = "q";
      input.type = "search";
      input.autocomplete = "off";
      input.spellcheck = false;
      let timer = 0;
      input.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => { query = input.value; shown = 60; renderResults(); }, 120);
      });
      const fams = el("div", "chips");
      const opts = el("label", "check");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.addEventListener("change", () => { settings.hideMaxedSearch = cb.checked; saveSettings(); shown = 60; renderResults(); });
      opts.append(cb, el("span", "hideLabel"));
      const results = el("div", "results");
      searchBox.append(input, fams, opts, results);
    }
    const [input, fams, opts] = searchBox.children;
    input.placeholder = t("searchPlaceholder");
    opts.querySelector("input").checked = settings.hideMaxedSearch;
    opts.querySelector(".hideLabel").textContent = t("hideMaxed");
    fams.replaceChildren(
      ...["", "Cogni", "Fera", "Natura", "Varian", "Special"].map((f) => {
        const b = el("button", settings.family === f ? "chip on" : "chip", f || t("allFamilies"));
        b.addEventListener("click", () => { settings.family = f; saveSettings(); shown = 60; render(); });
        return b;
      }),
    );
    if (view.firstChild !== searchBox) view.replaceChildren(searchBox);
    renderResults();
  }

  function renderResults() {
    if (!searchBox) return;
    const results = searchBox.querySelector(".results");
    const found = L.search(ix, query, collection, { family: settings.family, hideMaxed: settings.hideMaxedSearch, pinned });
    const frag = [el("div", "muted count", t("pets", { n: found.length }))];
    const ul = el("ul", "rows");
    for (const pet of found.slice(0, shown)) {
      const li = el("li", pinned.has(pet.id) ? "row pinned" : "row");
      const main = el("div", "main");
      const title = el("div", "title");
      title.append(el("span", "name", pet.name), familyTag(pet.family));
      main.append(title, progressLine(pet.id));
      if (pet.mobs.length) {
        const m = el("div", "mobs");
        m.append(el("span", "label", `${t("mobs")}: `), document.createTextNode(pet.mobs.join(", ")));
        main.append(m);
      }
      if (pet.maps.length) {
        const maps = el("div", "maps");
        for (const map of pet.maps) {
          const a = el("a", "mapLink", `${map.region} ↗`);
          a.href = map.url;
          maps.append(a);
        }
        main.append(maps);
      }
      if (pet.acq) {
        const s = el("div", "source");
        s.append(el("span", "label", `${pet.acq.kind}: `), document.createTextNode(pet.acq.how));
        if (pet.acq.window) s.append(el("div", "window", pet.acq.window));
        main.append(s);
      }
      if (!pet.mobs.length && !pet.maps.length && !pet.acq) main.append(el("div", "muted", t("noData")));
      const side = el("div", "side");
      side.append(pinButton(pet.id));
      li.append(portrait(pet.id), main, side);
      ul.append(li);
    }
    frag.push(ul);
    if (found.length > shown) {
      const more = el("button", "small more", t("more", { n: Math.min(60, found.length - shown) }));
      more.addEventListener("click", () => { shown += 60; renderResults(); });
      frag.push(more);
    }
    results.replaceChildren(...frag);
  }

  /** The shopping list: fresh offers you need; one you just got souls for stays 20 s, ticked. */
  function merchantRows(now, farmable = false) {
    const rows = [];
    for (const r of L.recommendations([...stocks.values()], collection, now, ix, { farmable })) {
      const at = bought.get(r.pet);
      if (at !== undefined && now - at > 20000) continue;
      rows.push({ ...r, done: at !== undefined });
    }
    return rows;
  }

  function renderMerchant() {
    const view = $("#view");
    const columns = !!settings.merchantColumns && !compact;
    const groups = [];
    let frag = [];
    const nextGroup = () => {
      if (frag.length) groups.push(frag);
      frag = [];
    };
    const now = Date.now();
    const rows = merchantRows(now);
    const farm = merchantRows(now, true);
    const latest = [...stocks.values()].sort((a, b) => b.seen - a.seen)[0];
    const offerList = (list) => {
      const ul = el("ul", "rows");
      for (const r of list) {
        const pet = ix.pets.get(r.pet);
        const li = el("li", r.done ? "row done" : "row offer");
        const main = el("div", "main");
        const title = el("div", "title");
        title.append(el("span", "name", pet.name), familyTag(pet.family));
        main.append(title, progressLine(r.pet));
        const side = el("div", "side");
        if (r.done) side.append(el("span", "bought", t("bought")));
        else {
          side.append(el("span", "price", t("kina", { n: fmtNum(r.price) })));
          side.append(el("span", "seen", `${r.stock.tabName}${r.discount ? ` · ${t("off", { n: r.discount })}` : ""}`));
        }
        li.append(portrait(r.pet), main, side);
        ul.append(li);
      }
      return ul;
    };
    if (rows.length) {
      if (farm.length || columns) frag.push(el("h3", "section first", t("onlyMerchant")));
      frag.push(offerList(rows));
    } else if (!collection.synced) {
      frag.push(el("p", "empty", t("notSynced")));
    } else if (shopSeenAt && now - shopSeenAt < 2 * 60 * 1000 && shopReadAt < shopSeenAt - 1000) {
      frag.push(el("p", "empty warn", t("merchantUnknown", { t: span(shopSeenAt) })));
    } else if (latest && L.freshStock(latest, now)) {
      if (!farm.length) frag.push(el("p", "empty", t("merchantNone")));
    } else if (latest) {
      frag.push(el("p", "empty", t("merchantStale", { t: ago(latest.seen) })));
    } else {
      frag.push(el("p", "empty", t("merchantHint")));
    }
    nextGroup();
    if (farm.length) {
      frag.push(el("h3", "section", `${t("alsoFarmable")} (${farm.length})`));
      frag.push(offerList(farm));
    }
    nextGroup();
    if (!compact && collection.synced) {
      const watch = L.watchlist(ix, collection);
      if (watch.length) {
        frag.push(el("h3", "section", `${t("lookOut")} (${watch.length})`));
        const ul = el("ul", "rows small");
        for (const pet of watch) {
          const li = el("li", "row");
          const main = el("div", "main");
          const title = el("div", "title");
          title.append(el("span", "name", pet.name), familyTag(pet.family));
          main.append(title, progressLine(pet.id));
          li.append(portrait(pet.id), main, el("div", "side"));
          ul.append(li);
        }
        frag.push(ul);
      }
    }
    nextGroup();
    if (!columns) {
      view.replaceChildren(...groups.flat());
      return;
    }
    const cols = el("div", "merchantCols");
    for (const g of groups) {
      const col = el("div", "merchantCol");
      col.append(...g);
      cols.append(col);
    }
    view.replaceChildren(cols);
  }

  function render() {
    renderHeader();
    renderTabs();
    document.body.classList.toggle("compact", compact);
    document.body.classList.toggle("merchantColumns", !compact && settings.tab === "merchant" && !!settings.merchantColumns);
    const tab = compact ? "nearby" : settings.tab;
    if (tab !== "search" && searchBox && searchBox.parentNode) searchBox.remove();
    if (tab === "nearby") renderNearby();
    else if (tab === "merchant") renderMerchant();
    else renderSearch();
  }

  // "seen 12s ago" and the keep-for limit, while nothing else changes.
  setInterval(() => {
    if (compact || settings.tab !== "search") dirty();
  }, 5000);

  (async () => {
    try {
      const s = await a2.storage.get("settings");
      if (s && typeof s === "object") settings = { ...settings, ...s };
      const p = await a2.storage.get("pins");
      if (Array.isArray(p)) pinned = new Set(p.filter((id) => ix.pets.has(id)));
    } catch {}
    render();
    a2.ready();
  })();
})();
