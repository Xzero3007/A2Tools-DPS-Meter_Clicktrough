// The Map plugin's overlay: a small map that follows you, north up, with the
// pets you follow, the next one to go for and how many are around. It hears
// the plugin's window (plugin.js) a few times a second; the wheel zooms.
(() => {
  const D = globalThis.MAP_DATA;
  const M = globalThis.MapMarks;
  const $ = (s) => document.querySelector(s);
  const box = $(".mapBox");
  const view = globalThis.MapKit.MapView(box, { interactive: false });
  let state = null;
  let locked = false;

  function draw() {
    if (!state) return;
    const tracked = new Map((state.tracked || []).map(([id, mark, name]) => [String(id), { mark, name }]));
    view.setMap(state.key);
    const built = M.build({ key: state.key, world: state.world, tracked, heading: state.heading, layers: state.layers, gatherKinds: state.gatherKinds || {}, petsMode: state.petsMode });
    view.setMarks(built.marks);
    const map = D.maps[state.key];
    const me = state.world?.me;
    if (map && me && state.onThisMap) {
      view.setZoom(state.zoom / (map.scale * 100));
      view.centerOn(me.x, me.y);
    } else {
      view.fit();
    }
    $(".title").textContent = `Map · ${map?.title || "—"}`;
    const chip = $(".nextChip");
    const n = built.next;
    chip.hidden = !(n && state.onThisMap);
    if (n && state.onThisMap) {
      chip.replaceChildren();
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = "Next";
      const name = document.createElement("span");
      name.textContent = ` ${n.name} `;
      const dist = document.createElement("span");
      dist.className = "dist";
      dist.textContent = `${M.arrow(n.bearing)} ${Math.round(n.metres)} m`;
      chip.append(label, name, dist);
    }
    const foot = $(".foot");
    foot.hidden = !state.layers?.pets;
    foot.textContent = `${built.petsHere} pet${built.petsHere === 1 ? "" : "s"} here · ${built.around} around you`;
    if (!me) foot.textContent = "Waiting for your position";
  }

  // The whole widget takes the mouse (unless the widgets are locked).
  const claim = () => a2.widget.area({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight }).catch(() => {});
  new ResizeObserver(claim).observe(document.body);

  $(".head").addEventListener("mousedown", (e) => {
    if (e.button !== 0 || e.target.closest("button") || locked) return;
    e.preventDefault();
    a2.widget.drag().catch(() => {});
  });
  $(".close").addEventListener("click", () => a2.widget.post({ type: "close" }).catch(() => {}));
  box.addEventListener("wheel", (e) => {
    if (!state) return;
    e.preventDefault();
    const next = Math.max(0.3, Math.min(12, state.zoom * (e.deltaY < 0 ? 1.25 : 0.8)));
    state.zoom = next;
    draw();
    a2.widget.post({ type: "zoom", value: next }).catch(() => {});
  }, { passive: false });

  a2.on("widget", (data) => {
    state = data;
    draw();
  });
  a2.on("locked", (on) => {
    locked = !!on;
    document.body.classList.toggle("locked", locked);
  });

  claim();
  a2.ready().then(() => a2.widget.post({ type: "ready" }).catch(() => {}));
})();
