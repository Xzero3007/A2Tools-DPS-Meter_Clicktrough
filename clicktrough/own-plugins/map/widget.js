// The Map plugin's overlay: a small map that follows you, north up, with the
// pets you follow (or what the search shows), the next one to go for and how
// many are around. It hears the plugin's window (plugin.js) a few times a
// second. The wheel zooms; the buttons S, M, L, XL set its size, or a corner
// dragged (the window manager resizes it); the slider sets how much of the
// game shows through.
(() => {
  const D = globalThis.MAP_DATA;
  const M = globalThis.MapMarks;
  const $ = (s) => document.querySelector(s);
  const box = $(".mapBox");
  const view = globalThis.MapKit.MapView(box, { interactive: false });
  let state = null;
  let locked = false;
  let opacityTouched = 0;

  function draw() {
    if (!state) return;
    const tracked = new Map((state.tracked || []).map(([id, mark, name]) => [String(id), { mark, name }]));
    view.setMap(state.key);
    const built = M.build({
      key: state.key, world: state.world, tracked, heading: state.heading, layers: state.layers,
      gatherKinds: state.gatherKinds || {}, petsMode: state.petsMode, focus: state.focus,
    });
    view.setMarks(built.marks);
    const map = D.maps[state.key];
    const me = state.world?.me;
    if (map && me && state.onThisMap) {
      view.setZoom(state.zoom / (map.scale * 100));
      view.centerOn(me.x, me.y);
    } else {
      view.fit();
    }
    $(".title").textContent = `${map?.title || "Map"}${state.region ? ` · ${state.region}` : ""}${state.guess ? "?" : ""}`;
    $(".title").title = $(".title").textContent;
    for (const b of document.querySelectorAll(".sizes button")) b.setAttribute("aria-pressed", String(b.dataset.size === state.size));
    // Not while the slider is in use: the plugin's answer lags behind it.
    if (Date.now() - opacityTouched > 1500) applyOpacity(state.opacity ?? 0.86);
    const chip = $(".nextChip");
    const n = built.next;
    chip.hidden = !(n && state.onThisMap);
    if (n && state.onThisMap) {
      const label = Object.assign(document.createElement("span"), { className: "label", textContent: "Next" });
      const name = Object.assign(document.createElement("span"), { textContent: ` ${n.name} ` });
      const dist = Object.assign(document.createElement("span"), { className: "dist", textContent: `${M.arrow(n.bearing)} ${Math.round(n.metres)} m` });
      chip.replaceChildren(label, name, dist);
    }
    const foot = $(".foot");
    foot.hidden = !state.layers?.pets && !state.focus;
    if (!me) foot.textContent = "Waiting for your position";
    else if (state.focus) foot.textContent = `${state.focus.label}: ${built.hits.length / 2} here`;
    else foot.textContent = `${built.petsHere} pet${built.petsHere === 1 ? "" : "s"} here · ${built.around} around you`;
  }

  function applyOpacity(value) {
    const v = Math.max(0.2, Math.min(1, Number(value) || 0.86));
    document.body.style.setProperty("--alpha", String(v));
    const slider = $(".opacity");
    if (document.activeElement !== slider) slider.value = String(Math.round(v * 100));
  }

  // The whole widget takes the mouse (unless the widgets are locked).
  const claim = () => a2.widget.area({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }).catch(() => {});
  new ResizeObserver(() => {
    claim();
    view.redraw();
  }).observe(document.body);

  $(".head").addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest("button, input") || locked) return;
    e.preventDefault();
    a2.widget.drag().catch(() => {});
  });
  $(".close").addEventListener("click", () => a2.widget.post({ type: "close" }).catch(() => {}));
  $(".opacity").addEventListener("input", () => {
    opacityTouched = Date.now();
    const v = Number($(".opacity").value) / 100;
    applyOpacity(v);
    a2.widget.post({ type: "opacity", value: v }).catch(() => {});
  });
  box.addEventListener("wheel", (e) => {
    if (!state) return;
    e.preventDefault();
    const next = Math.max(0.3, Math.min(12, state.zoom * (e.deltaY < 0 ? 1.25 : 0.8)));
    state.zoom = next;
    draw();
    a2.widget.post({ type: "zoom", value: next }).catch(() => {});
  }, { passive: false });

  // The sizes: the plugin opens the overlay at that size.
  for (const b of document.querySelectorAll(".sizes button")) {
    b.addEventListener("click", () => a2.widget.post({ type: "size", size: b.dataset.size }).catch(() => {}));
  }

  // A corner: the window manager resizes the widget while the button is down
  // (a meter without it: no corners); the plugin keeps the size it ends at.
  const canResize = typeof a2.widget.resize === "function";
  document.body.classList.toggle("noResize", !canResize);
  for (const c of document.querySelectorAll(".corner")) {
    c.addEventListener("mousedown", (e) => {
      if (e.button !== 0 || locked || !canResize) return;
      e.preventDefault();
      e.stopPropagation();
      a2.widget.resize(c.dataset.edge).catch(() => {});
    });
  }
  a2.on("resized", (size) => {
    if (Number.isFinite(size?.width) && Number.isFinite(size?.height)) {
      a2.widget.post({ type: "resized", width: size.width, height: size.height }).catch(() => {});
    }
  });

  a2.on("widget", (data) => {
    state = data;
    draw();
  });
  a2.on("locked", (on) => {
    locked = !!on;
    document.body.classList.toggle("locked", locked);
  });

  applyOpacity(0.86);
  claim();
  a2.ready().then(() => a2.widget.post({ type: "ready" }).catch(() => {}));
})();
