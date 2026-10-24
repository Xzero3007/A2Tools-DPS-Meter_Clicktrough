// The Map plugin's window: the map you are on with where you are, the pets
// Pet Finder and Pet Soul Tracker follow, monsters around, gathering spots,
// Hidden Cubes and Kibelisk camps; and an overlay (a widget) with a small map
// that follows you.
(() => {
  const D = globalThis.MAP_DATA;
  const K = globalThis.MapKit;
  const M = globalThis.MapMarks;
  const $ = (s) => document.querySelector(s);

  const KINDS = ["Herb", "Ore", "Wood", "Cotton", "Food", "Gemstone", "Od", "Fragment"];
  const SIZES = { s: [220, 250], m: [300, 330], l: [400, 430] };
  const SIZE_NAMES = { s: "Small", m: "Medium", l: "Large" };

  let settings = {
    layers: { pets: true, monsters: false, gather: false, cubes: true, kibelisks: false },
    gatherKinds: {},
    petsMode: "tracked",
    follow: true,
    zoom: null, // screen px per map px while following
    overlay: false,
    overlaySize: "m",
    overlayZoom: 2.5, // the overlay's screen px per metre
    overlayLock: false,
    pick: "auto",
    lastKey: null,
  };
  let world = null;
  let shared = {};
  let tracked = new Map();
  let heading = 0;
  let headingFrom = null;
  let compact = false;

  const saveLater = (() => {
    let t = 0;
    return () => {
      clearTimeout(t);
      t = setTimeout(() => a2.storage.set("settings", settings).catch(() => {}), 400);
    };
  })();

  const view = K.MapView($(".mapBox"), {});
  $(".mapBox").addEventListener("mapdrag", () => {
    if (!settings.follow) return;
    settings.follow = false;
    saveLater();
    renderTools();
  });
  $(".mapBox").addEventListener("mapzoom", (e) => {
    if (settings.follow) {
      settings.zoom = e.detail;
      saveLater();
    }
  });

  // ---------- which map ----------
  function currentKey() {
    if (settings.pick !== "auto" && D.maps[settings.pick]) return settings.pick;
    return M.mapOf(world) || settings.lastKey || "verteron";
  }

  // ---------- the player's heading: the way he walks (the game sends no facing) ----------
  function followHeading(me) {
    if (!me) return;
    if (!headingFrom) {
      headingFrom = [me.x, me.y];
      return;
    }
    const d = Math.hypot(me.x - headingFrom[0], me.y - headingFrom[1]);
    if (d >= 800) {
      heading = K.bearing(headingFrom[0], headingFrom[1], me.x, me.y);
      headingFrom = [me.x, me.y];
    }
  }

  // ---------- drawing ----------
  let frameQueued = false;
  function render() {
    if (frameQueued) return;
    frameQueued = true;
    requestAnimationFrame(() => {
      frameQueued = false;
      draw();
    });
  }

  function draw() {
    const key = currentKey();
    const inZone = M.mapOf(world);
    if (inZone && inZone !== settings.lastKey) {
      settings.lastKey = inZone;
      saveLater();
    }
    view.setMap(key);
    const built = M.build({ key, world, tracked, heading, layers: settings.layers, gatherKinds: settings.gatherKinds, petsMode: settings.petsMode });
    view.setMarks(built.marks);
    const me = world?.me;
    const onThisMap = me && inZone === key;
    if (settings.follow && onThisMap) {
      // Following: the zoom picked last while following, else about 150 m
      // across a 300 px view.
      if (settings.zoom) view.setZoom(settings.zoom);
      else view.setPxPerMetre(2);
      view.centerOn(me.x, me.y);
    }
    renderHeader(key, onThisMap);
    renderStatus(built, onThisMap);
    sendOverlay(key, built, onThisMap);
  }

  function renderHeader(key, onThisMap) {
    $(".mapName").textContent = D.maps[key]?.title || "Map";
    const zoneName = world?.zone != null ? D.zoneNames[String(world.zone)] : null;
    let note = "";
    if (!world?.me) note = "Waiting for your position: log in with the meter running";
    else if (!M.mapOf(world)) note = zoneName ? `No map for ${zoneName}` : "This place has no map";
    else if (!onThisMap) note = `You are in ${D.maps[M.mapOf(world)]?.title || zoneName || "another map"}`;
    else note = world.me.exact ? "Your position" : "Your position (about, from what's around you)";
    $(".whereNote").textContent = note;
  }

  function renderStatus(built, onThisMap) {
    const n = built.next;
    $(".next").replaceChildren();
    if (n && onThisMap) {
      const label = document.createElement("span");
      label.className = "nextLabel";
      label.textContent = "Next";
      const name = document.createElement("strong");
      name.textContent = ` ${n.name} `;
      const dist = document.createElement("span");
      dist.className = "muted";
      dist.textContent = `${M.arrow(n.bearing)} ${Math.round(n.metres)} m${n.live ? "" : " (spawn point)"}`;
      $(".next").append(label, name, dist);
    }
    const parts = [];
    if (settings.layers.pets) parts.push(`${built.petsHere} pet${built.petsHere === 1 ? "" : "s"} on this map`, `${built.around} around you`);
    $(".counts").textContent = parts.join(" · ");
  }

  // ---------- the overlay (a widget) ----------
  let lastSent = 0;
  let sendTimer = 0;
  function sendOverlay(key, built, onThisMap) {
    if (!settings.overlay) return;
    const now = Date.now();
    const go = () => {
      lastSent = Date.now();
      a2.widgets.send("overlay", {
        key,
        world: world ? { me: world.me, zone: world.zone, npcs: world.npcs, objects: world.objects } : null,
        tracked: [...tracked].map(([id, t]) => [id, t.mark, t.name]),
        heading,
        layers: settings.layers,
        gatherKinds: settings.gatherKinds,
        petsMode: settings.petsMode,
        zoom: settings.overlayZoom,
        onThisMap: !!onThisMap,
        locked: settings.overlayLock,
      }).catch(() => {});
    };
    clearTimeout(sendTimer);
    if (now - lastSent >= 250) go();
    else sendTimer = setTimeout(go, 250 - (now - lastSent));
  }

  async function applyOverlay() {
    try {
      if (settings.overlay) {
        const [width, height] = SIZES[settings.overlaySize] || SIZES.m;
        await a2.widgets.open("overlay", { width, height });
        await a2.widgets.lock(!!settings.overlayLock);
        lastSent = 0;
        render();
      } else {
        await a2.widgets.close("overlay");
      }
    } catch (e) {
      console.error(e);
    }
  }

  a2.on("widget-message", ({ name, data }) => {
    if (name !== "overlay" || !data) return;
    if (data.type === "zoom" && Number.isFinite(data.value)) {
      settings.overlayZoom = Math.max(0.3, Math.min(12, data.value));
      saveLater();
      render();
    } else if (data.type === "close") {
      settings.overlay = false;
      saveLater();
      renderTools();
      applyOverlay();
    } else if (data.type === "ready") {
      lastSent = 0;
      render();
    }
  });

  // ---------- the controls ----------
  function renderTools() {
    $(".follow").setAttribute("aria-pressed", String(settings.follow));
    $(".overlayBtn").setAttribute("aria-pressed", String(settings.overlay));
    $(".overlaySettings").hidden = !settings.overlay || compact;
    for (const chip of document.querySelectorAll(".layers .chip[data-layer]")) {
      chip.setAttribute("aria-pressed", String(!!settings.layers[chip.dataset.layer]));
    }
    $(".petsMode").setAttribute("aria-pressed", String(settings.petsMode === "all"));
    $(".petsMode").hidden = !settings.layers.pets;
    const kinds = $(".kinds");
    kinds.hidden = !settings.layers.gather || compact;
    kinds.replaceChildren(...KINDS.map((k) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip kind";
      b.setAttribute("aria-pressed", String(settings.gatherKinds[k] !== false));
      const dot = document.createElement("i");
      dot.style.background = K.GATHER_COLORS[k];
      b.append(dot, k);
      b.addEventListener("click", () => {
        settings.gatherKinds = { ...settings.gatherKinds, [k]: settings.gatherKinds[k] === false };
        saveLater();
        renderTools();
        render();
      });
      return b;
    }));
    $(".overlaySize").value = settings.overlaySize;
    $(".overlayLock").checked = !!settings.overlayLock;
    const pick = $(".mapPick");
    if (!pick.options.length) {
      const opt = (value, text) => Object.assign(document.createElement("option"), { value, textContent: text });
      const world = Object.entries(D.maps).filter(([, m]) => !m.instance);
      const inst = Object.entries(D.maps).filter(([, m]) => m.instance).sort((a, b) => a[1].title.localeCompare(b[1].title));
      const g1 = Object.assign(document.createElement("optgroup"), { label: "World" });
      g1.append(...world.map(([k, m]) => opt(k, m.title)));
      const g2 = Object.assign(document.createElement("optgroup"), { label: "Instances" });
      g2.append(...inst.map(([k, m]) => opt(k, m.title)));
      pick.append(opt("auto", "Where you are"), g1, g2);
    }
    pick.value = D.maps[settings.pick] ? settings.pick : "auto";
  }

  for (const chip of document.querySelectorAll(".layers .chip[data-layer]")) {
    chip.addEventListener("click", () => {
      const layer = chip.dataset.layer;
      settings.layers = { ...settings.layers, [layer]: !settings.layers[layer] };
      saveLater();
      renderTools();
      render();
    });
  }
  $(".petsMode").addEventListener("click", () => {
    settings.petsMode = settings.petsMode === "all" ? "tracked" : "all";
    saveLater();
    renderTools();
    render();
  });
  $(".follow").addEventListener("click", () => {
    settings.follow = !settings.follow;
    saveLater();
    renderTools();
    if (!settings.follow) view.fit();
    render();
  });
  $(".overlayBtn").addEventListener("click", () => {
    settings.overlay = !settings.overlay;
    saveLater();
    renderTools();
    applyOverlay();
  });
  $(".overlaySize").replaceChildren(...Object.entries(SIZE_NAMES).map(([v, t]) => Object.assign(document.createElement("option"), { value: v, textContent: t })));
  $(".overlaySize").addEventListener("change", () => {
    settings.overlaySize = $(".overlaySize").value;
    saveLater();
    if (settings.overlay) a2.widgets.close("overlay").catch(() => {}).then(applyOverlay);
  });
  $(".overlayLock").addEventListener("change", () => {
    settings.overlayLock = $(".overlayLock").checked;
    saveLater();
    a2.widgets.lock(settings.overlayLock).catch(() => {});
    render();
  });
  $(".mapPick").addEventListener("change", () => {
    settings.pick = $(".mapPick").value;
    if (settings.pick !== "auto") settings.follow = false;
    saveLater();
    renderTools();
    view.setMap(currentKey());
    if (!settings.follow) view.fit();
    render();
  });
  // Double-click: back to following you.
  $(".mapBox").addEventListener("dblclick", () => {
    settings.follow = true;
    settings.pick = "auto";
    saveLater();
    renderTools();
    render();
  });

  // ---------- from the meter ----------
  a2.on("world", (w) => {
    world = w;
    followHeading(w?.me);
    render();
  });
  a2.on("shared", ({ plugin, value }) => {
    if (value == null) delete shared[plugin];
    else shared[plugin] = value;
    tracked = M.mergeTracked(shared);
    render();
  });
  a2.on("compact", (on) => {
    compact = !!on;
    document.body.classList.toggle("compact", compact);
    renderTools();
    view.redraw();
  });
  a2.on("locked", () => {});

  (async () => {
    try {
      const s = await a2.storage.get("settings");
      if (s && typeof s === "object") settings = { ...settings, ...s, layers: { ...settings.layers, ...(s.layers || {}) } };
    } catch {}
    renderTools();
    render();
    if (settings.overlay) applyOverlay();
    a2.ready();
  })();
})();
