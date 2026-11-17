/* ================= v5.1c-2: the district and its scores stay on screen =================
   Loaded after v51c.js. Moves the district list and the five score tiles into a slim strip at the top of the sticky
   lens bar; adds ◀ ▶ (and the [ ] keys) to step through districts; flashes the tiles that change rating.
   Like every v5.1 layer, it changes no tier and no number. */
(function () {
  "use strict";
  const card = document.querySelector(".lenscard"), dist = document.querySelector(".v51dist"), stat = $("stat");
  if (!card || !dist || !stat) return;
  const dock = document.createElement("div");
  dock.className = "v51dock";
  const d = document.createElement("div");
  d.className = "v51dk-d";
  const sel = $("dist");
  d.append(dist.querySelector(".dl"));
  const row = document.createElement("div");
  row.className = "v51dk-row";
  row.innerHTML = `<button class="btn" id="v51prev" type="button" aria-label="Previous district" title="Previous district ( [ )">◀</button>`;
  row.append(sel);
  row.insertAdjacentHTML("beforeend", `<button class="btn" id="v51next" type="button" aria-label="Next district" title="Next district ( ] )">▶</button>`);
  d.append(row);
  dock.append(d, stat);
  card.prepend(dock);
  dist.classList.add("o-dist");

  // The map toolbar in two short rows: Settings, search and the Need tier / Walk time switch; then the scenario row.
  const seg = document.querySelector(".v51mapcard .bar2 .seg"), find = document.querySelector(".v51mapcard .find");
  if (seg && find) { seg.classList.add("v51seg"); find.append(seg); }

  // Step through the districts in the list's own order.
  const step = (k) => {
    const opts = [...sel.options].filter((o) => !o.disabled), i = opts.findIndex((o) => o.value === sel.value);
    const o = opts[(i + k + opts.length) % opts.length];
    if (!o) return;
    sel.value = o.value;
    sel.dispatchEvent(new Event("input", { bubbles: true }));
  };
  $("v51prev").onclick = () => step(-1);
  $("v51next").onclick = () => step(1);
  document.addEventListener("keydown", (e) => {
    if (e.target.closest && e.target.closest("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
    if ((location.hash || "#map") !== "#map") return;
    if (e.key === "[") step(-1);
    if (e.key === "]") step(1);
  });

  // When the district changes, briefly outline the tiles whose rating changed.
  let last = null, lastId = null;
  const _render = window.render;
  window.render = function () {
    _render.apply(this, arguments);
    // Short tile labels in the strip; the full sentence stays as a tooltip.
    try {
      const T = P().T, tiles = [...stat.children], m = (tiles[2] && tiles[2].textContent.match(/\((\d+)%\)/)) || [];
      const short = [`residents within ${T} min`, `within ${Math.round(T / 2)} min`, `blocks beyond ${T} min${m[1] ? " · " + m[1] + "%" : ""}`, "within 20 minutes", "blocks in tier 4–5"];
      tiles.forEach((t, i) => { const sp = t.querySelector(":scope > span"); if (sp && short[i]) { t.title = sp.textContent.trim(); sp.textContent = short[i]; } });
    } catch (e) {}
    const now = [...stat.children].map((t) => (t.className.match(/rag-(\w+)/) || [0, ""])[1]);
    if (last && D && D.id !== lastId) [...stat.children].forEach((t, i) => { if (now[i] !== last[i]) { t.classList.remove("v51flash"); void t.offsetWidth; t.classList.add("v51flash"); } });
    last = now; lastId = D && D.id;
    try { document.documentElement.style.setProperty("--lbh", (window.matchMedia("(min-width: 1200px)").matches ? card.offsetHeight : 0) + "px"); } catch (e) {}
  };
  if (D) { render(); fit(); render(); }
})();

