/* ================= v5.1c: one-screen map, louder lens layers =================
   Loaded after v51b.js. Like v5.1 and v5.1b, it changes no tier and no number.
   1. One-screen layout: lens bar sticks to the top; the map fills the height on the left; a right-hand panel holds
      the district, the lens results, the clicked block and the fact boxes, and scrolls on its own.
   2. Settings drawer: the side panel (steps 1–3, key terms, your data) slides in from the left.
   3. Lens layers stand out: each lens paints its own colour (or hatching) and greys the rest; markers are bigger.
      "Show tiers underneath" brings the tier colours back.
   4. Lens panels open on their key numbers; long tables fold under "Show details".
   5. Your edits: a banner while restrooms are switched off or added, and "Reset to defaults". */
(function () {
  "use strict";
  const WIDE = window.matchMedia("(min-width: 1200px)");
  const wide = () => WIDE.matches;
  const root = document.documentElement;

  /* ---------- 1. the one-screen layout ---------- */
  const app = document.querySelector("#tab-map .app"), main = app.querySelector(".main"), side = $("side"), rail = app.querySelector(".rail");
  const mapCard = main.querySelector(".card"), lensCard = document.querySelector(".lenscard"), top = document.querySelector(".topstats");
  root.classList.add("v51c");
  // Right-hand panel, top to bottom: district list, your-edits banner, tour, lens results, clicked block, fact boxes, picks, note.
  const dist = document.querySelector(".v51dist");
  const banner = document.createElement("div"); banner.id = "v51edits"; banner.className = "v51edits"; banner.hidden = true;
  const facts = document.createElement("div"); facts.className = "card v51factcard"; facts.appendChild($("dsum"));
  side.prepend(dist, banner);
  side.append($("lens"), facts, $("picks"), main.querySelector(".note"));
  ["sopen", "guide", "lens", "detail"].forEach((id) => $(id) && $(id).classList.add("o-" + id));
  dist.classList.add("o-dist"); banner.classList.add("o-banner"); facts.classList.add("o-facts"); $("picks").classList.add("o-picks");
  // Map card: Settings button in the search row; the map box fills what is left of the column.
  mapCard.classList.add("v51mapcard");
  const find = mapCard.querySelector(".find");
  find.insertAdjacentHTML("afterbegin", `<button class="btn v51set" id="v51set" type="button" aria-controls="v51drawer" aria-expanded="false">⚙ Settings</button>`);

  // Keep the height the lens bar takes, so the map and panel fill exactly the rest of the screen.
  const measure = () => root.style.setProperty("--lbh", (wide() ? lensCard.offsetHeight : 0) + "px");
  // The map fills its box on wide screens (the original sizes it from the district's shape).
  const _fit = window.fit;
  window.fit = function () {
    if (!wide() || !D) return _fit.apply(this, arguments);
    const B = D._B, m = 140, mb = $("mapbox"), W = mb.clientWidth || 900, H = Math.max(320, mb.clientHeight || 600);
    svg.style.height = H + "px";
    fitW = W;
    let w = B[2] - B[0] + 2 * m, h = B[3] - B[1] + 2 * m;
    const cx = (B[0] + B[2]) / 2, cy = -(B[1] + B[3]) / 2;
    if (w / h < W / H) w = (h * W) / H; else h = (w * H) / W;
    VB0 = [cx - w / 2, cy - h / 2, w, h]; vb = VB0.slice(); setVB();
  };
  let rz = 0;
  const relayout = () => { measure(); if (D) { fit(); render(); } };
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(relayout, 150); });
  WIDE.addEventListener("change", relayout);

  // Picking a lens on a wide screen brings the map and panel fully into view.
  const _setLens = window.setLens;
  window.setLens = function (id) {
    _setLens.apply(this, arguments);
    if (wide() && (location.hash || "#map") === "#map") {
      const y = app.getBoundingClientRect().top + window.scrollY - lensCard.offsetHeight - 8;
      if (Math.abs(window.scrollY - y) > 30) window.scrollTo({ top: y, behavior: "smooth" });
    }
  };
  // The lens question moves from the lens bar to the top of the lens panel.
  const lensQ = () => { const L = LENSES.find((x) => x.id === ls.id); return L ? `<p class="v51q lensq"><span class="lensl">This lens answers</span><b>${esc(L.q)}</b><span class="small">Most useful to: ${esc(L.who)}.</span></p>` : ""; };

  /* ---------- 2. Settings drawer ---------- */
  rail.id = "v51drawer"; rail.classList.add("drawer"); rail.setAttribute("aria-label", "Settings");
  rail.insertAdjacentHTML("afterbegin", `<div class="dhead"><b>Settings</b><button class="btn" id="v51close" type="button" aria-label="Close settings">✕ Close</button></div>`);
  rail.insertAdjacentHTML("beforeend", `<div class="dfoot"><button class="btn" id="v51reset2" type="button">Reset to defaults</button><p class="small">Clears restrooms you switched off or added, your custom areas and saved choices, then reloads. Colours and text size stay.</p></div>`);
  const shade = document.createElement("div"); shade.className = "v51shade"; shade.hidden = true; document.body.appendChild(shade);
  const drawer = (open) => { rail.classList.toggle("open", open); shade.hidden = !open; $("v51set").setAttribute("aria-expanded", open); if (open) rail.querySelector("#v51close").focus(); };
  $("v51set").onclick = () => drawer(true);
  $("v51close").onclick = () => drawer(false);
  shade.onclick = () => drawer(false);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && rail.classList.contains("open")) drawer(false); });

  /* ---------- 3. lens layers stand out ---------- */
  // One colour (or hatching) per lens for the blocks it is about; everything else turns soft grey.
  let TIERS = false;
  try { TIERS = localStorage.getItem("v51-tiers") === "1"; } catch (e) {}
  const DIM = { f: "var(--g0)", o: 0.55 };
  const _lensFill = window.lensFill;
  window.lensFill = function (i, r) {
    const v = _lensFill.apply(this, arguments), X = LX();
    if (TIERS || !X || st.view !== "need" || st.on.F || ls.id === "siting" || ls.id === "zroute") return v;
    const b = D.blocks[i];
    switch (ls.id) {
      case "landmarks": return X.lm[i] > 0 ? { f: "var(--lc-lm)", o: 1 } : X.hd[i] >= 0 ? { f: "url(#v51hd)", o: 1 } : X.sp[i] >= 0 ? { f: "url(#v51sp)", o: 1 } : DIM;
      case "flood": return X.fz[i] > 0 || b.fl ? { f: "url(#v51fl)", o: 1 } : DIM;
      case "transit": return b._sub > 0 ? { f: "var(--lc-tr)", o: 1 } : X._near && (X._near[i].shel || X._near[i].bike) ? { f: "var(--lc-tr2)", o: 1 } : DIM;
      case "vuln": return r.g && (r.drv === 1 || r.drv === 2) ? { f: "var(--lc-vu)", o: 1 } : X.ny[i] || b.di ? { f: "url(#v51ny)", o: 1 } : DIM;
      case "zoning": return zMatch(X.z[i], X.bid[i] >= 0, ls.zmode) ? { f: "var(--lc-zo)", o: 1 } : DIM;
      case "coloc": return v ? DIM : { f: "var(--lc-co)", o: 1 };
      case "publand": { const lt = b.lt || 0; return lt === 1 ? { f: "var(--park)", o: 1 } : lt === 2 ? { f: "var(--paper)", o: 1 } : DIM; }
      case "closed": return LR.closed && LR.closed.pb.has(i) ? { f: "var(--g4)", o: 1 } : DIM;
      case "coverage": case "equity": return v && v.f ? { f: v.f, o: 1 } : DIM;
      case "food": return v && v.o === 1 ? v : DIM;
      case "maint": case "cityprop": case "reps": return DIM;
    }
    return v;
  };
  // The map key for each lens says what the new colours and symbols are.
  const sw = (bg, t, ex) => `<span><i style="background:${bg};${ex || ""}"></i>${t}</span>`;
  const KEY = {
    landmarks: () => sw("var(--lc-lm)", "Block with a landmark lot") + sw("transparent", "In a historic district", "background-image:repeating-linear-gradient(45deg,var(--lc-lm) 0 3px,transparent 3px 6px)") + sw("transparent", "In a special purpose district", "background-image:repeating-linear-gradient(-45deg,var(--lc-sp) 0 3px,transparent 3px 6px)"),
    flood: () => sw("transparent", "Some lots in the FEMA flood plain (2015 preliminary or 2007 effective)", "background-image:repeating-linear-gradient(45deg,var(--lc-fl) 0 3px,var(--lc-fl2) 3px 6px)"),
    transit: () => sw("var(--lc-tr)", "Subway station within 150 m") + sw("var(--lc-tr2)", "Bus shelter or Citi Bike dock within 100 m"),
    vuln: () => sw("var(--lc-vu)", "Tier set by vulnerable residents or poverty") + sw("transparent", "Public housing or near a drop-in centre", "background-image:repeating-linear-gradient(45deg,var(--lc-vu) 0 3px,transparent 3px 6px)"),
    zoning: () => sw("var(--lc-zo)", "Matches the zoning filter"),
    coloc: () => sw("var(--lc-co)", "High-need block with two or more public uses nearby"),
  };
  const _lensLegend = window.lensLegend;
  window.lensLegend = function () {
    const h = _lensLegend.apply(this, arguments);
    if (!h) return h;
    const extra = !TIERS && KEY[ls.id] ? KEY[ls.id]() : "";
    // With lens colours on, the old "Bright blocks …" and "Faded …" notes no longer describe the map.
    const hh = extra ? h.replace(/<span>(Bright blocks|Faded)[^<]*<\/span>/g, "") : h;
    const tiersSw = ls.id !== "siting" && ls.id !== "zroute" ? `<label class="v51tiers"><input type="checkbox" id="v51tiers" ${TIERS ? "checked" : ""}> Show tiers underneath</label>` : "";
    return `<div class="v51key"><span class="v51kl">On the map</span>${hh}${extra}${tiersSw}</div>`;
  };
  document.addEventListener("change", (e) => { if (e.target && e.target.id === "v51tiers") { TIERS = e.target.checked; try { localStorage.setItem("v51-tiers", TIERS ? "1" : "0"); } catch (x) {} render(); } });
  // Hatching patterns, scaled like the map's own (redrawn with each district).
  const addDefs = () => {
    const d = svg.querySelector("defs"); if (!d || d.querySelector("#v51fl")) return;
    const s = (vb[2] / 900).toFixed(3), hatch = (id, a, c1, c2, w) => `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(${a}) scale(${s})"><rect width="10" height="10" fill="${c2}"/><rect width="${w}" height="10" fill="${c1}"/></pattern>`;
    d.insertAdjacentHTML("beforeend", hatch("v51fl", 45, "var(--lc-fl)", "var(--lc-fl2)", 5) + hatch("v51hd", 45, "var(--lc-lm)", "var(--g0)", 5) + hatch("v51sp", -45, "var(--lc-sp)", "var(--g0)", 4) + hatch("v51ny", 45, "var(--lc-vu)", "var(--g0)", 4)); 
  };
  const _load = window.load;
  window.load = function () { const r = _load.apply(this, arguments); addDefs(); return r; };
  // Bigger lens markers with a light halo; they fade in when the lens changes.
  let lastLens = null;
  const _lensOverlay = window.lensOverlay;
  window.lensOverlay = function () {
    _lensOverlay.apply(this, arguments);
    if (!gX) return;
    gX.setAttribute("class", "lensov" + (ls.id !== lastLens ? " fresh" : ""));
    lastLens = ls.id;
  };

  /* ---------- 4. lens panels: key numbers first ---------- */
  const OPENF = {};
  const _lensPanel = window.lensPanel;
  window.lensPanel = function () {
    _lensPanel.apply(this, arguments);
    const box = $("lens");
    if (box.hidden) return;
    box.querySelector("h3") && box.querySelector("h3").insertAdjacentHTML("afterend", lensQ());
    // Fold tables and long lists that come before any existing "Show details".
    const kids = [...box.children], i0 = kids.findIndex((c) => c.matches("h4, .tw, ul"));
    if (i0 < 0 || box.querySelector("details.v51auto")) return;
    const fold = document.createElement("details"); fold.className = "lmore v51auto"; fold.open = !!OPENF[ls.id];
    fold.innerHTML = "<summary>Show details</summary>";
    fold.addEventListener("toggle", () => (OPENF[ls.id] = fold.open));
    kids[i0].before(fold);
    kids.slice(i0).forEach((c, k, a) => {
      if (c.matches("details, .lctl")) return;
      if (c.matches("p.small") && a[k + 1] && a[k + 1].matches(".lctl")) return; // the line that explains the controls stays with them
      fold.appendChild(c);
    });
  };

  /* ---------- the clicked block moves to the top of the panel, with a way back ---------- */
  let lastSel = null;
  const _detail = window.detail;
  window.detail = function () {
    _detail.apply(this, arguments);
    const has = st.sel != null || !!st.selR;
    side.classList.toggle("hassel", has);
    if (has && !$("v51back")) {
      $("detail").insertAdjacentHTML("afterbegin", `<button class="btn v51back" id="v51back" type="button">✕ Close${ls.id !== "siting" ? " and back to the lens" : ""}</button>`);
      $("v51back").onclick = () => { st.sel = null; st.selR = null; render(); $("detail").innerHTML = `<h3>Click a block</h3><p class="small" style="margin:0">Its tier, why, the site check and who to contact appear here.</p>`; side.classList.remove("hassel"); };
      const k = st.sel != null ? "b" + st.sel : st.selR;
      if (wide() && k !== lastSel) side.scrollTo({ top: 0, behavior: "smooth" });
      lastSel = k;
    }
  };

  /* ---------- 5. your edits: banner and reset ---------- */
  function edits() {
    let off = 0, add = 0;
    Object.values(DATA.d).forEach((K) => { if (!K) return; off += Object.keys(K.off || {}).length; add += (K.user || []).length; });
    return { off, add };
  }
  function bannerDraw() {
    const { off, add } = edits();
    banner.hidden = !(off || add);
    if (banner.hidden) return;
    const parts = [off ? `stopped counting ${off} restroom${off > 1 ? "s" : ""}` : "", add ? `added ${add} restroom${add > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ");
    banner.innerHTML = `<span>You've ${parts}. The map and lists use your changes.</span><button class="btn" id="v51reset" type="button">Reset to defaults</button>`;
    $("v51reset").onclick = reset;
  }
  async function reset() {
    try { await DB.tx("readwrite", (s) => s.clear()); } catch (e) {}
    try { ["flushing-lens", "flushing-guide", "v51-hidefar", "v51-tiers"].forEach((k) => localStorage.removeItem(k)); } catch (e) {}
    location.hash = "map";
    location.reload();
  }
  $("v51reset2").onclick = reset;
  const dm = document.querySelector(".dmenu");
  if (dm) { dm.insertAdjacentHTML("beforeend", `<fieldset><legend>For the next visitor</legend><button class="btn" id="v51reset3" type="button">Reset to defaults</button></fieldset>`); $("v51reset3").onclick = reset; }
  const _render = window.render;
  window.render = function () { _render.apply(this, arguments); try { bannerDraw(); } catch (e) {} };

  // First draw in the new layout.
  if (D) { addDefs(); measure(); fit(); lensBar(); render(); }
  setTimeout(relayout, 60);
})();

