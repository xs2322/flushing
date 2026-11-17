/* ================= v5.2: ready for the public demo =================
   Loaded after v51c2.js. Changes no default tier and no number from v5.0c.
    1. Public safety: no loading of outside files or lists, no "save a copy with my edits", no dataset codes in text,
       and a "changed view" tag on the map whenever settings differ from the defaults.
    2. Score tiles re-rated, with stated reasons (residents and people on foot within 10 min, everyone within 20 min).
    3. "Evenly matched" tier-threshold preset.
    4. Lens bar: Siting is "Start here"; the rest "build the case"; each lens has its own colour in its group's family.
    5. Selected block: a red ring with a white halo, on every colour set and theme.
    6. Top 10 next sites for each district, made the FLUSH! way.
    7. Method: "One block, step by step" follows the block you clicked.
    8. Pip, the guide: a first-visit dialog box that replaces the one-minute story box.
    9. Restrooms page: data notes fold into a dropdown; Report a restroom (email, CSV or a printed form).
   10. Shortlists: every block or restroom named is a link to it on the map.
   11. Closed restrooms by district: shaded by the share out of service (green, yellow, red), with plain columns.
   12. Settings drawer: tidied (no Districts and your own data; key terms A to Z); Sources table without codes. */
(function () {
  "use strict";
  const root = document.documentElement;
  const V = window.V51 || {};
  const WHY = V.WHY_SHORT || ["Busy sidewalks", "Vulnerable residents", "Poverty", "311 reports", "Drop-in centre nearby"];
  const REPORT_TO = "xander.singh@nyu.edu";
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ls_get = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const ls_set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  root.classList.add("v52");

  /* ---------- 1. public safety ---------- */
  const rail = document.querySelector(".rail");
  const datasec = $("datasec");
  if (datasec) {
    // Block results stay downloadable (they are this map's own numbers); everything that loads, builds or re-saves goes.
    const src = $("srcsec");
    if (src && $("xcsv") && $("xgeo")) {
      const row = document.createElement("div");
      row.className = "btnrow";
      row.append($("xcsv"), $("xgeo"));
      src.append(Object.assign(document.createElement("p"), { className: "small", textContent: "Download this district's block results (opens in Excel, QGIS or ArcGIS):" }), row);
    }
    datasec.hidden = true;
    datasec.classList.add("v52gone");
  }
  ["rrPull", "rrSave", "rrLog"].forEach((id) => { const b = $(id); if (b) { b.hidden = true; b.classList.add("v52gone"); } });
  const rrFile = $("rrFile"); if (rrFile) { rrFile.disabled = true; const l = rrFile.closest("label"); if (l) l.classList.add("v52gone"); }
  ["fbound", "frest", "fpack"].forEach((id) => { const f = $(id); if (f) f.disabled = true; });
  if (st) st.adding = false;
  // Sources: the "keeping current" table, without dataset codes or in-map updating.
  window.feedsRender = function () {
    const box = $("feeds"); if (!box) return;
    box.innerHTML = `<div class="tw"><table class="t"><thead><tr><th>Dataset</th><th>Used for</th><th>This file has data from</th><th>Publisher last updated it</th></tr></thead><tbody>${FEEDS.map((f) => {
      const c = FEEDCHK[f[1]], mine = feedAsOf(f), newer = c && c.d && mine && c.d > mine.slice(-10);
      const when = f[4] === "live" ? "Loaded live, for the district on screen" : (mine.split(" to ").map(dmy).join(" to ") || "–");
      return `<tr><td><a href="https://${f[0]}/d/${f[1]}">${esc(f[2])}</a></td><td>${esc(f[3])}</td><td>${esc(when)}</td><td>${c ? (c.d ? dmy(c.d) + (newer ? ' <span class="nchip mid">newer</span>' : "") : esc(c.e)) : "–"}</td></tr>`;
    }).join("")}</tbody></table></div>`;
  };
  try { feedsRender(); } catch (e) {}

  // A tag on the map whenever the view differs from the defaults, so a screenshot can't pass for the default map.
  function changedFrom() {
    const out = [], p = P();
    const pre = $("thpreset") && $("thpreset").value;
    if (pre && pre !== "dot") out.push(pre === "custom" ? "custom cut-offs" : ($("thpreset").selectedOptions[0] || {}).textContent.toLowerCase() + " cut-offs");
    if (p.T !== 10) out.push(`${p.T}-minute standard`);
    if (p.speed !== 64) out.push(`${p.speed} m a minute`);
    if (Math.abs(p.det - 1.45) > 1e-9) out.push(`detour ${p.det}`);
    if (st.on && st.on.S) out.push(st.season === "eve" ? "evening" : "winter");
    if (st.on && st.on.U === false) out.push("residents only");
    if (st.acc) out.push("accessible restrooms only");
    if (st.ops && st.ops.Subway) out.push("subway restrooms counted");
    if (st.ops && Object.entries(st.ops).some(([k, v]) => k !== "Subway" && v === false)) out.push("some restroom types off");
    if (D && D.off && Object.keys(D.off).length) out.push(`${Object.keys(D.off).length} restroom${Object.keys(D.off).length > 1 ? "s" : ""} switched off`);
    if (D && D.user && D.user.length) out.push("added restrooms");
    if (st.site && st.site !== "curb") out.push("land rule changed");
    return out;
  }
  function tagDraw() {
    const box = $("mapbox"); if (!box) return;
    let t = $("v52tag");
    if (!t) { t = document.createElement("div"); t.id = "v52tag"; t.className = "v52tag"; t.setAttribute("role", "status"); box.appendChild(t); }
    const c = changedFrom();
    t.hidden = !c.length;
    t.innerHTML = c.length ? `<b>Changed view</b> · ${esc(c.join(" · "))}` : "";
  }

  /* ---------- 2. score tiles ---------- */
  const RATE = { res: [80, 60], foot: [80, 60], w20: [99, 95] };
  const WORD = { good: "Good", fair: "Fair", poor: "Poor" }, MARK = { good: "✓", fair: "~", poor: "✕" };
  const rate = (v, [g, f]) => (v >= g ? "good" : v >= f ? "fair" : "poor");
  let lastRates = null, lastTileId = null;
  function tiles() {
    const stat = $("stat"); if (!stat || !D || !RES) return;
    const p = P(), T = p.T;
    let pop = 0, pT = 0, pH = 0, p20 = 0, U = 0, UT = 0, hi = 0;
    D.blocks.forEach((b, i) => {
      const r = RES[i]; if (!r) return;
      const u = r.U || 0;
      pop += b.pop; U += u;
      if (r.cls < 2) { pT += b.pop; UT += u; }
      if (r.cls === 0) pH += b.pop;
      if (r.walk <= 20) p20 += b.pop;
      if (r.g >= 4) hi++;
    });
    const pc = (a, b) => (b ? (a / b) * 100 : NaN), fmt = (v) => (isFinite(v) ? Math.round(v) + "%" : "–");
    const v = { res: pc(pT, pop), foot: pc(UT, U), w20: pc(p20, pop), half: pc(pH, pop) };
    const rated = (k, label, full) => { const r = isFinite(v[k]) ? rate(v[k], RATE[k]) : null; return [r, `<div class="rag ${r ? "rag-" + r : ""}" title="${esc(full)}"><b>${fmt(v[k])}${r ? `<span class="ragw"><i aria-hidden="true">${MARK[r]}</i> ${WORD[r]}</span>` : ""}</b><span>${label}</span></div>`]; };
    const t = [
      rated("res", `residents within ${T} min`, `${fmt(v.res)} of ${pop.toLocaleString()} residents live within a ${T}-minute walk of a counted restroom`),
      rated("foot", `on foot within ${T} min`, `${fmt(v.foot)} of the people estimated to walk these blocks each day are within a ${T}-minute walk of a counted restroom (workers, shoppers and visitors as well as residents)`),
      rated("w20", "everyone within 20 minutes", `${fmt(v.w20)} of residents are within a 20-minute walk; the rest are left far behind`),
    ];
    const plain = (val, label, full) => `<div class="unr" title="${esc(full)}"><b>${val}</b><span>${label}</span></div>`;
    stat.innerHTML = t.map((x) => x[1]).join("") +
      plain(fmt(v.half), `within ${mins(T / 2)} min`, `${fmt(v.half)} of residents are within easy reach, ${mins(T / 2)} minutes (shown, not rated)`) +
      plain(hi.toLocaleString(), "blocks in tier 4–5", `${hi} of ${D.blocks.length} blocks are in tier 4 or 5 (a count of need, not rated)`);
    const now = t.map((x) => x[0]);
    if (lastRates && D.id !== lastTileId && !reduced()) [...stat.children].forEach((el, i) => { if (i < 3 && now[i] !== lastRates[i]) { el.classList.remove("v51flash"); void el.offsetWidth; el.classList.add("v51flash"); } });
    lastRates = now; lastTileId = D.id;
    const key = $("ragkey");
    if (key && !key.dataset.v52) {
      key.dataset.v52 = "1";
      key.innerHTML = `<summary>How the tiles are rated Good, Fair or Poor</summary>
<table><thead><tr><th>Tile</th><th>Good ✓</th><th>Fair ~</th><th>Poor ✕</th><th>Why this line</th></tr></thead><tbody>
<tr><td>Residents within a 10-minute walk</td><td>80%+</td><td>60–79%</td><td>under 60%</td><td rowspan="2">Good means the district does at least as well as the City says New York does overall (79.9%, LL58 report p. 8).</td></tr>
<tr><td>People on foot within 10 minutes</td><td>80%+</td><td>60–79%</td><td>under 60%</td></tr>
<tr><td>Everyone within 20 minutes</td><td>99%+</td><td>95–98%</td><td>under 95%</td><td>20 minutes is the "left far behind" line; almost nobody should be past it.</td></tr>
</tbody></table>
<p>Within 5 minutes and blocks in tier 4–5 are shown but not rated: 5 minutes is a convenience, not a standard, and rating it would mark the same low-density districts down twice. People on foot are estimated from DOT's pedestrian counts by street type, so busy places with few residents are judged fairly. The map's walks are a little stricter than the City's method, so ratings are cautious. <a href="#faq" data-faq="q-tiles">More</a></p>`;
    }
  }

  /* ---------- 3. Tier thresholds: a note on the default ---------- */
  // The default cut-offs are calibrated to DOT's street classes (core/03_state_and_constants.js, TH_PRESETS.dot).
  {
    const sel = $("thpreset"), box = sel && sel.closest("details");
    if (box && !box.querySelector(".v52even")) box.querySelector("label.row").insertAdjacentHTML("afterend", `<p class="small v52even"><b>The default</b> holds every reason to the same bar as DOT's Pedestrian Demand Map: each resident reason reaches each tier about as rarely as a block sits on the matching DOT street class (tier 5 about as rare as a Global street). Round numbers (the v5.3 default) are kept for comparison.</p>`);
  }

  /* ---------- 4. lens bar ---------- */
  if (typeof LENSES !== "undefined") { const s = LENSES.find((x) => x.id === "siting"); if (s) s.g = "Start here"; }
  const GKEY = { "Start here": "start", Need: "need", "Land and zoning": "land", Operations: "ops", "People and places": "ppl" };
  const _lensBar = window.lensBar;
  window.lensBar = function () {
    _lensBar.apply(this, arguments);
    const bar = $("lensbar"); if (!bar) return;
    bar.querySelectorAll(".lgrp").forEach((g) => { const l = g.querySelector(".lgl"); if (l) g.dataset.g = GKEY[l.textContent.trim()] || ""; });
    const start = bar.querySelector('.lgrp[data-g="start"]'), need = bar.querySelector('.lgrp[data-g="need"]');
    if (start && need && !bar.querySelector(".v52case")) {
      start.querySelector(".lgl").innerHTML = "Start here";
      // "Build the case" sits on the Need row, so the bar is no taller than before
      need.insertAdjacentHTML("afterbegin", `<span class="v52case" title="See what the City weighs when it sites restrooms in batches. A lens never changes a tier.">Build the case →</span>`);
      start.after(need);
    }
  };

  /* ---------- 5 & 6. selection ring, top 10, changed-view tag ---------- */
  const T10 = { key: "", list: null };
  function top10() {
    const p = P();
    const key = [D.id, JSON.stringify(p), JSON.stringify(st.on), st.site, st.season, st.acc, st.water, JSON.stringify(st.ops), Object.keys(D.off || {}).join(","), (D.user || []).length, $("thpreset") && $("thpreset").value].join("|");
    if (T10.key === key && T10.list) return T10.list;
    let x;
    try { x = pickSites(D, st, 10, p); } catch (e) { x = { picks: [], info: [] }; }
    T10.key = key;
    T10.list = x.picks.map((i, k) => ({ i, inf: x.info[k] }));
    T10.raw = x;
    return T10.list;
  }
  const pill = (g) => `<span class="gpill" style="background:var(--g${g});color:var(--gi${g})">${TIERNAME[g]}</span>`;
  const _sum = window.districtSummary;
  window.districtSummary = function (p) {
    let h = _sum.apply(this, arguments);
    if (!D) return h;
    const L = top10();
    if (L.length) {
      // the "Best next spot" box shows the first of the ten, so the two never disagree
      const f = L[0], b = D.blocks[f.i];
      h = h.replace(/(<dt>Best next spot<\/dt><dd>)[\s\S]*?(<\/dd>)/, `$1<a href="#" data-sel="${f.i}">${esc(place(b))}</a><br>${pill(f.inf.g)}${f.inf.drv >= 0 ? " · " + WHY[f.inf.drv].toLowerCase() : ""}$2`);
      h += `<div class="v52top"><div class="v52toph"><b>Top 10 next sites</b><a class="qm" href="#faq" data-faq="q-flush" title="How are these chosen?" aria-label="How are these chosen?">?</a></div>
<ol>${L.map(({ i, inf }, k) => `<li><a href="#" data-sel="${i}">${esc(place(D.blocks[i]))}</a> ${pill(inf.g)}<span class="small">${inf.drv >= 0 ? WHY[inf.drv].toLowerCase() : ""}${inf.moved ? ` · moved ${inf.moved} m to allowed land` : ""}</span></li>`).join("")}</ol>
<p class="small">Chosen the FLUSH! way on your current settings: each is counted as open before the next is picked, so they spread out. Every site still needs a visit.</p>
<div class="btnrow"><button class="btn pri flush" type="button" id="v52flush10">FLUSH! all 10 on the map</button><button class="btn" type="button" id="v52csv10">Save as a spreadsheet (CSV)</button></div></div>`;
    } else h += `<div class="v52top"><b>Top 10 next sites</b><p class="small">No block in this district has unmet need on these settings.</p></div>`;
    return h;
  };
  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t.id === "v52flush10" && T10.raw) { st.picks = T10.raw.picks.slice(); st.pickInfo = T10.raw.info.slice(); st.skipped = T10.raw.skipped || []; render(); }
    if (t.id === "v52csv10" && T10.list) download(`flushing-top-10-${D.name.split(" · ")[0].replace(/\s+/g, "-")}.csv`, csvOf(T10.list.map(({ i, inf }, k) => ({ rank: k + 1, site: place(D.blocks[i]), census_block: D.blocks[i].id, district: D.name.split(" · ")[0], tier: inf.g, main_reason: inf.drv >= 0 ? WHY[inf.drv] : "", moved_m: inf.moved || 0, settings: changedFrom().join("; ") || "defaults" }))), "text/csv");
  });

  function ring() {
    if (!D || st.sel == null || !gO || !D.blocks[st.sel]) return;
    const b = D.blocks[st.sel], d = pth(b.g);
    // a target circle as well as the outline, so even a sliver of a block can't be lost
    const xs = [], ys = [];
    b.g.forEach((r) => { for (let k = 0; k < r.length; k += 2) { xs.push(r[k]); ys.push(r[k + 1]); } });
    const ext = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    const px = (vb && vb[2] ? vb[2] : 2000) / Math.max(300, svg.clientWidth || 900);
    const rad = Math.max(ext * 0.62, 22 * px);
    ["v52r0", "v52r1", "v52r2"].forEach((c) => gO.appendChild(el("circle", { cx: b.c[0], cy: -b.c[1], r: rad, class: c + " v52rc", fill: "none", "vector-effect": "non-scaling-stroke" })));
    ["v52r0", "v52r1", "v52r2"].forEach((c) => gO.appendChild(el("path", { d, class: c, fill: "none", "vector-effect": "non-scaling-stroke" })));
  }
  // On the Sites lens, number the district's top 10 next sites on the map (1 = first pick), matching the list.
  function top10Marks() {
    if (!D || !gO || (typeof ls === "object" && ls.id !== "siting") || (st.picks && st.picks.length)) return;
    const L = top10(); if (!L.length) return;
    const px = (vb && vb[2] ? vb[2] : 2000) / Math.max(300, svg.clientWidth || 900), r = 10 * px;
    L.forEach(({ i }, k) => {
      const b = D.blocks[i], g = el("g", { class: "v55top" });
      g.appendChild(el("circle", { cx: b.c[0], cy: -b.c[1], r, fill: "#fff", stroke: "#111", "stroke-width": 1.6 * px }));
      const tx = el("text", { x: b.c[0], y: -b.c[1] + 3.6 * px, "text-anchor": "middle", "font-size": 10.5 * px, "font-weight": 700, fill: "#111" });
      tx.textContent = k + 1; g.appendChild(tx); gO.appendChild(g);
    });
  }
  const _render = window.render;
  window.render = function () {
    _render.apply(this, arguments);
    try { setLbh(); } catch (e) {}
    try { tiles(); } catch (e) { console.error(e); }
    try { top10Marks(); } catch (e) {}
    try { ring(); } catch (e) {}
    try { tagDraw(); } catch (e) {}
    try { if ((location.hash || "") === "#method") oneBlock(); } catch (e) {}
    try { const pk = $("pick"); if (pk && pk.textContent !== "FLUSH!") pk.textContent = "FLUSH!"; } catch (e) {}
  };

  /* ---------- 7. Method: one block, step by step, live ---------- */
  function oneBlock() {
    const box = $("v52oneblock"); if (!box || !D || !RES) return;
    const p = P();
    let i = st.sel, how = "the block you clicked";
    if (i == null) { const L = top10(); i = L.length ? L[0].i : RES.findIndex((r) => r.g > 0); how = "this district's first FLUSH! pick (click any block on the Map to see it here instead)"; }
    if (i == null || i < 0) { box.innerHTML = `<p>Open a district on the Map page and click a block to see its steps here.</p>`; return; }
    const b = D.blocks[i], r = RES[i];
    box.innerHTML = `<p><b>${esc(label(b))}</b>, ${esc(D.name.split(" · ")[0])}, ${b.pop.toLocaleString()} residents: ${how}. It updates when you change a setting.</p>
<p class="v52why">${plainWhy(b, r, p)}</p>
<div class="tw">${mathRows(D, b, r, p)}</div>
<p class="small">Each row is one letter of FLUSHING. Where each cut-off comes from, and which are the sandbox's own choices: <a href="#numbers" data-tab="numbers">Numbers</a>.</p>`;
  }
  window.addEventListener("hashchange", () => { if ((location.hash || "") === "#method") setTimeout(oneBlock, 30); });

  /* ---------- 8. Pip, the guide ---------- */
  const PIP = `<svg class="v52pipart" viewBox="0 0 24 21" shape-rendering="crispEdges" aria-hidden="true"><path class="h-pk" d="M10 0h4v1h-4zM8 1h2v1h-2zM14 1h1v1h-1zM7 2h1v1h-1zM15 2h1v1h-1zM6 3h1v1h-1zM16 3h1v1h-1zM6 4h1v1h-1zM16 4h1v1h-1zM6 5h1v1h-1zM10 5h1v1h-1zM16 5h1v1h-1zM6 6h1v1h-1zM16 6h1v1h-1zM6 7h1v1h-1zM16 7h1v1h-1zM6 8h1v1h-1zM17 8h1v1h-1zM7 9h1v1h-1zM18 9h1v1h-1zM6 10h1v1h-1zM19 10h1v1h-1zM5 11h1v1h-1zM20 11h1v1h-1zM5 12h1v1h-1zM21 12h1v1h-1zM5 13h1v1h-1zM22 13h1v1h-1zM5 14h1v1h-1zM23 14h1v1h-1zM6 15h1v1h-1zM22 15h1v1h-1zM7 16h1v1h-1zM20 16h2v1h-2zM8 17h2v1h-2zM17 17h2v1h-2zM10 18h1v1h-1zM16 18h1v1h-1z"/><path class="h-pg" d="M10 1h4v1h-4zM8 2h7v1h-7zM7 3h9v1h-9zM7 4h2v1h-2zM11 4h5v1h-5zM7 5h1v1h-1zM12 5h4v1h-4zM7 6h1v1h-1zM11 6h5v1h-5zM7 7h9v1h-9zM7 8h2v1h-2zM11 8h6v1h-6zM12 9h6v1h-6zM15 10h4v1h-4zM16 11h4v1h-4zM20 12h1v1h-1zM21 13h1v1h-1zM22 14h1v1h-1zM10 17h7v1h-7z"/><path class="h-pw" d="M9 4h2v1h-2zM8 5h1v1h-1zM11 5h1v1h-1zM8 6h3v1h-3z"/><path class="h-py" d="M4 5h2v1h-2zM3 6h3v1h-3zM4 7h2v1h-2zM10 19h1v1h-1zM16 19h1v1h-1zM9 20h2v1h-2zM15 20h2v1h-2z"/><path class="h-po" d="M9 5h1v1h-1z"/><path class="h-pt" d="M9 8h2v1h-2zM8 9h4v1h-4z"/><path class="h-pv" d="M7 10h8v1h-8zM6 11h2v1h-2zM10 11h6v1h-6zM6 12h4v1h-4zM12 12h5v1h-5zM6 13h6v1h-6zM14 13h3v1h-3zM6 14h12v1h-12zM7 15h12v1h-12zM8 16h12v1h-12z"/><path class="h-ps" d="M8 11h2v1h-2zM10 12h2v1h-2zM12 13h2v1h-2z"/><path class="h-pl" d="M17 12h3v1h-3zM17 13h4v1h-4zM18 14h4v1h-4zM19 15h3v1h-3z"/></svg>`;
  const STEPS = [
    { t: "Hi! I'm Pip.", p: "I scout New York for public restrooms. This map shows where the city needs more of them, block by block, in all five boroughs. Do you know how it works?", ask: true },
    { t: "1 · The gap", p: "The City says 1 in 5 New Yorkers live more than a 10-minute walk from a public restroom. Count only the ones that are open today, all year, and work for wheelchairs, and it's about half. The law asks for about 1,145 more by 2035." },
    { t: "2 · Read one block", p: "Every block gets a need tier from 1 to 5. 2 Times Square is on one of DOT's busiest street types, so busy sidewalks rate it 5. The nearest restroom is about 8 minutes' walk away, so it's partly served and drops one step: tier 4.", a: ["Show me Times Square", () => { storyBlock("105", "2 Times Square"); }] },
    { t: "3 · Where one can go", p: "Need never depends on land. Land only decides where a restroom is allowed: a park, a plaza, public land, or a wide-enough sidewalk. Each place gets a desk check: who owns it, the sidewalk, the flood plain, and who has to say yes.", a: ["Show public land", () => setLens("publand")] },
    { t: "4 · FLUSH!", p: "Press FLUSH! and the map places restrooms one at a time on the neediest allowed block, counting each as open before it picks the next, so they spread out. Every district also has its own Top 10 next sites beside the map.", a: ["FLUSH! 3 sites here", () => { setLens("siting"); $("npick").value = 3; pick(); }] },
    { t: "5 · Build the case", p: "Siting is where you start. The other lenses show what the City weighs when it sites restrooms in batches: zoning, flood risk, cleaning crews, who represents an area. They never change a tier; they help you argue for a site.", a: ["Try the Flood risk lens", () => setLens("flood")] },
    { t: "6 · Your turn", p: "The map can't see café or store restrooms, real walking routes or the exact spot on a block, so every site still needs a visit. Know a public restroom the map is missing? Tell us! Now explore: search an address, or click any block.", a: ["Report a restroom", () => openReport()], done: true },
  ];
  let at = 0, typing = null;
  const dlg = document.createElement("div");
  dlg.id = "v52pip"; dlg.className = "v52pip"; dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-label", "Pip, your guide"); dlg.hidden = true;
  document.body.appendChild(dlg);
  function type(p, txt) {
    clearInterval(typing);
    if (reduced()) { p.textContent = txt; return; }
    let n = 0; p.textContent = ""; p.classList.add("typing");
    typing = setInterval(() => { n += 3; p.textContent = txt.slice(0, n); if (n >= txt.length) { clearInterval(typing); typing = null; p.classList.remove("typing"); } }, 16);
  }
  function draw() {
    const s = STEPS[at];
    dlg.innerHTML = `<div class="v52pbox"><div class="v52pface">${PIP}<span>PIP</span></div><div class="v52ptext"><h3>${esc(s.t)}</h3><p id="v52ptxt" aria-hidden="true"></p><p class="sr" aria-live="polite">${esc(s.p)}</p>
<div class="v52pbtns">${s.ask ? `<button class="btn" data-v52="yes" type="button">Yes, let me explore</button><button class="btn pri" data-v52="no" type="button">No, show me (1 minute) ▶</button>`
      : `${s.a ? `<button class="btn act" data-v52="act" type="button">${esc(s.a[0])}</button>` : ""}<button class="btn" data-v52="back" type="button">◀ Back</button>${s.done ? `<button class="btn pri" data-v52="close" type="button">Start exploring</button>` : `<button class="btn pri" data-v52="next" type="button">Next ▼</button>`}`}
<button class="btn link v52px" data-v52="close" type="button" aria-label="Close the guide">✕</button></div>
<p class="v52pdots" aria-hidden="true">${s.ask ? "" : STEPS.slice(1).map((_, k) => `<i class="${k + 1 === at ? "on" : ""}"></i>`).join("")}</p></div></div>`;
    type($("v52ptxt"), s.p);
  }
  function guide(open) {
    dlg.hidden = !open;
    root.classList.toggle("v52pipopen", open);
    if (open) { draw(); const b = dlg.querySelector(".btn.pri"); if (b) b.focus({ preventScroll: true }); }
    else { clearInterval(typing); ls_set("v52-guide", "seen"); }
  }
  dlg.addEventListener("click", (e) => {
    const b = e.target.closest("[data-v52]");
    if (!b) { if (typing) { clearInterval(typing); typing = null; $("v52ptxt").textContent = STEPS[at].p; } return; }
    const k = b.dataset.v52;
    if (k === "yes" || k === "close") return guide(false);
    if (k === "no") { at = 1; location.hash = "map"; tab(); return draw(); }
    if (k === "next") { at = Math.min(STEPS.length - 1, at + 1); return draw(); }
    if (k === "back") { at = Math.max(at === 1 ? 0 : 1, at - 1); return draw(); }
    if (k === "act") { const a = STEPS[at].a; if (a) a[1](); }
  });
  document.addEventListener("keydown", (e) => { if (!dlg.hidden && e.key === "Escape") guide(false); });
  window.v52guide = (step) => { at = step || 0; location.hash = "map"; tab(); guide(true); };
  // the header link and a Guide button by Settings open Pip; the old story box and its button go
  ["guide", "sopen"].forEach((id) => { const n = $(id); if (n) { n.hidden = true; n.classList.add("v52gone"); } });
  const tourA = $("v51tour"); if (tourA) tourA.onclick = (e) => { e.preventDefault(); window.v52guide(0); };
  const setB = $("v51set");
  if (setB && !$("v52help")) setB.insertAdjacentHTML("afterend", `<button class="btn v52help" id="v52help" type="button" title="Open Pip, the guide">? Guide</button>`);
  if ($("v52help")) $("v52help").onclick = () => window.v52guide(1);
  // first visit: Pip says hello once the map has drawn
  if (ls_get("v52-guide") !== "seen") setTimeout(() => { if ((location.hash || "#map") === "#map") guide(true); }, 700);

  /* ---------- 9. Restrooms page: notes fold away; Report a restroom ---------- */
  const _listRender = window.listRender;
  window.listRender = function () {
    _listRender.apply(this, arguments);
    const ctl = $("listCtl"); if (!ctl) return;
    const p = ctl.querySelector(":scope > p.small");
    if (p && !p.closest("details")) {
      const html = p.innerHTML.replace(/Click a name to see it on the map\.?\s*$/, "");
      const n = (p.textContent.match(/^([\d,]+) restrooms shown/) || [])[1];
      const d = document.createElement("details");
      d.className = "v52notes";
      d.innerHTML = `<summary>${n ? `<b>${n} restrooms shown.</b> ` : ""}Notes about this data</summary><p class="small">${html}</p>`;
      p.replaceWith(d);
      d.insertAdjacentHTML("afterend", `<p class="small v52hint">Click a name to see it on the map. Know one that's missing or wrong? <a href="#" data-v52report="1">Report a restroom</a>.</p>`);
    }
  };
  const listLead = document.querySelector("#tab-list .lead");
  if (listLead && !document.querySelector(".v52reportbar")) listLead.insertAdjacentHTML("afterend", `<div class="v52reportbar"><button class="btn pri" type="button" data-v52report="1">＋ Report a restroom</button><span class="small">Missing, closed or listed wrong? Tell us in a minute. A person checks every report before the map changes.</span></div>`);

  // The report form: a dialog that ends in an email, a CSV row or a printed form. Nothing is stored by the page.
  const rep = document.createElement("div");
  rep.id = "v52report"; rep.className = "v52modal"; rep.hidden = true; rep.setAttribute("role", "dialog"); rep.setAttribute("aria-modal", "true"); rep.setAttribute("aria-labelledby", "v52rh");
  rep.innerHTML = `<div class="v52mbox"><button class="btn link v52mx" type="button" data-rx="1" aria-label="Close">✕</button>
<h2 id="v52rh">Report a restroom</h2>
<p class="small">For public restrooms anyone can use: in parks, libraries, transit, plazas, public buildings, or businesses that let the public in. Please don't include anyone's personal details.</p>
<form id="v52rf" novalidate>
<fieldset><legend>1. What are you reporting?</legend>
<label><input type="radio" name="kind" value="Missing from the map" checked> A restroom that's missing from the map</label>
<label><input type="radio" name="kind" value="Listed but closed or gone"> One on the map that's closed or gone</label>
<label><input type="radio" name="kind" value="Listed with wrong details"> One with wrong hours, access or details</label></fieldset>
<fieldset><legend>2. Where is it?</legend>
<label>Name of the place <input name="place" maxlength="120" placeholder="e.g. Queens Library, Flushing branch"></label>
<label>Address or cross streets <input name="address" maxlength="160" placeholder="e.g. 41-17 Main St, Queens"></label>
<div class="btnrow"><button class="btn" type="button" id="v52pin">📍 Drop a pin on the map</button><button class="btn" type="button" id="v52here">Use my location</button><span class="small" id="v52ll"></span></div></fieldset>
<fieldset><legend>3. What's it like? <span class="small">(skip anything you don't know)</span></legend>
<label>Type <select name="type"><option value="">Don't know</option><option>Park</option><option>Library</option><option>Subway or transit</option><option>Plaza</option><option>Public building</option><option>Business open to the public</option><option>Other</option></select></label>
<label>Hours <input name="hours" maxlength="80" placeholder="e.g. 8 am–8 pm daily, or 'dusk'"></label>
<label>Free to use? <select name="free"><option value="">Don't know</option><option>Yes</option><option>No, customers only</option><option>No, paid</option></select></label>
<label>Wheelchair accessible? <select name="access"><option value="">Don't know</option><option>Yes</option><option>Partly</option><option>No</option></select></label>
<label class="ck"><input type="checkbox" name="changing" value="yes"> Has a baby changing table</label>
<label class="ck"><input type="checkbox" name="allgender" value="yes"> All-gender or single-stall</label>
<label>Anything else? <textarea name="notes" maxlength="500" rows="2" placeholder="e.g. 'locked after 6 pm', 'ask at the front desk'"></textarea></label>
<label>Your email <span class="small">(optional, only if you'd like a reply)</span> <input name="email" type="email" maxlength="120"></label></fieldset>
<p class="small" id="v52rmsg" role="status"></p>
<div class="btnrow"><button class="btn pri" type="button" id="v52send">✉ Send by email</button><button class="btn" type="button" id="v52csv">Save as CSV</button><button class="btn" type="button" id="v52print">🖨 Print a paper form</button></div>
<p class="small">Email goes to the project team at <b>${REPORT_TO}</b>. This page stores nothing you type, and nothing appears on the map until a person has checked it against the City's list.</p>
</form></div>`;
  document.body.appendChild(rep);
  const RF = () => $("v52rf");
  let pinLL = null, pinMode = false, lastFocus = null;
  function openReport() {
    lastFocus = document.activeElement;
    if (!dlg.hidden) guide(false);
    rep.hidden = false; root.classList.add("v52modalopen");
    $("v52rmsg").textContent = "";
    setTimeout(() => RF().elements.place.focus(), 30);
  }
  function closeReport() { rep.hidden = true; root.classList.remove("v52modalopen"); pinMode = false; root.classList.remove("v52pinning"); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  window.v52report = openReport;
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-v52report]"); if (a) { e.preventDefault(); openReport(); } }, true);
  rep.addEventListener("click", (e) => { if (e.target === rep || e.target.closest("[data-rx]")) closeReport(); });
  document.addEventListener("keydown", (e) => {
    if (rep.hidden) return;
    if (e.key === "Escape") return closeReport();
    if (e.key === "Tab") { // keep keyboard focus inside the form while it is open
      const f = [...rep.querySelectorAll("button, a[href], input, select, textarea")].filter((x) => !x.disabled && x.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  });
  const showLL = () => { $("v52ll").textContent = pinLL ? `Pin: ${pinLL[1].toFixed(5)}, ${pinLL[0].toFixed(5)}${pinLL[2] ? " (" + pinLL[2] + ")" : ""}` : ""; };
  $("v52pin").onclick = () => {
    pinMode = true; rep.hidden = true; root.classList.add("v52pinning");
    location.hash = "map"; tab();
    const box = $("mapbox"); if (box) box.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
    $("v52tag") && ($("v52tag").hidden = false, $("v52tag").innerHTML = "<b>Click the map</b> where the restroom is · Esc to cancel");
  };
  // pin mode: the next click on the map becomes a location (the map's own metres east and north of the district origin)
  svg.addEventListener("click", (e) => {
    if (!pinMode || !D) return;
    e.preventDefault(); e.stopPropagation();
    const m = svg.getScreenCTM(); if (!m) return;
    const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const q = pt.matrixTransform(m.inverse()), kx = 111320 * Math.cos((D.o[1] * Math.PI) / 180), ky = 110574;
    pinLL = [D.o[0] + q.x / kx, D.o[1] + -q.y / ky, D.name.split(" · ")[0]];
    pinMode = false; root.classList.remove("v52pinning");
    tagDraw(); showLL(); rep.hidden = false; root.classList.add("v52modalopen");
  }, true);
  document.addEventListener("keydown", (e) => { if (pinMode && e.key === "Escape") { pinMode = false; root.classList.remove("v52pinning"); tagDraw(); rep.hidden = false; } });
  $("v52here").onclick = () => {
    if (!navigator.geolocation) { $("v52rmsg").textContent = "This browser can't share a location; type the address instead."; return; }
    $("v52rmsg").textContent = "Finding you…";
    navigator.geolocation.getCurrentPosition((g) => { pinLL = [g.coords.longitude, g.coords.latitude, "my location"]; showLL(); $("v52rmsg").textContent = ""; }, () => { $("v52rmsg").textContent = "Couldn't get your location; type the address instead."; }, { timeout: 8000 });
  };
  // Spreadsheet safety: a value that starts with = + - @ (and isn't a plain number) is opened by Excel as a formula,
  // so a report can't smuggle a formula or link into the team's spreadsheet.
  const cell = (x) => { const t = String(x == null ? "" : x).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim(); return /^[=+\-@\t\r]/.test(t) && !/^-?\d+(\.\d+)?$/.test(t) ? "'" + t : t; };
  function reportRow() {
    const f = RF().elements, v = (n) => cell(String((f[n] && f[n].value) || "").slice(0, 500));
    return { reported_on: new Date().toISOString().slice(0, 10), report: (RF().querySelector('input[name="kind"]:checked') || {}).value || "", place: v("place"), address: v("address"),
      lat: pinLL ? pinLL[1].toFixed(6) : "", lon: pinLL ? pinLL[0].toFixed(6) : "", district_on_map: D ? D.name.split(" · ")[0] : "", type: v("type"), hours: v("hours"), free: v("free"),
      wheelchair: v("access"), changing_table: f.changing.checked ? "yes" : "", all_gender: f.allgender.checked ? "yes" : "", notes: v("notes"), reply_to: v("email"), source: "FLUSHING report form" };
  }
  const enough = (r) => r.place || r.address || r.lat;
  // The email: short enough for every mail app. Windows hands a mailto link to the mail app through a call that fails on
  // links over about 2,000 characters, and long notes (or accented and non-Latin letters, which encode to 6–9 characters
  // each) used to push past it; the old body also repeated everything as a CSV row. Now: one readable copy, CRLF line
  // breaks (Outlook needs them), and if it is still too long the notes are trimmed and the full report downloads as a CSV.
  const MAX_MAILTO = 1800;
  const LABEL = { report: "Report", place: "Place", address: "Address", lat: "Latitude", lon: "Longitude", district_on_map: "District on the map", type: "Type", hours: "Hours", free: "Free to use", wheelchair: "Wheelchair accessible", changing_table: "Changing table", all_gender: "All-gender", notes: "Notes", reply_to: "Reply to", reported_on: "Reported on" };
  function mailParts(r, notes) {
    const rr = { ...r, notes: notes == null ? r.notes : notes };
    const lines = ["report", "place", "address", "lat", "lon", "district_on_map", "type", "hours", "free", "wheelchair", "changing_table", "all_gender", "notes", "reply_to", "reported_on"].filter((k) => rr[k]).map((k) => `${LABEL[k]}: ${rr[k]}`);
    const subject = `Restroom report: ${r.report} – ${r.place || r.address || "pin " + r.lat + ", " + r.lon}`.slice(0, 120);
    const body = lines.join("\r\n") + "\r\n\r\n(Sent from the FLUSHING report form)";
    return { subject, body, url: `mailto:${REPORT_TO}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` };
  }
  function fitMail(r) {
    let m = mailParts(r), trimmed = false;
    if (m.url.length > MAX_MAILTO && r.notes) {
      let n = r.notes;
      while (n.length > 0 && m.url.length > MAX_MAILTO) { n = n.slice(0, Math.floor(n.length * 0.8)); m = mailParts(r, n.trim() + "… (trimmed: the full report is in the attached CSV)"); }
      if (m.url.length > MAX_MAILTO) m = mailParts(r, "(see the attached CSV)");
      trimmed = true;
    }
    if (m.url.length > MAX_MAILTO) { // very long name, address or hours: send the essentials and the CSV
      const short = { ...r, place: r.place.slice(0, 120), address: r.address.slice(0, 160), hours: r.hours.slice(0, 80), notes: "(see the attached CSV)" };
      m = mailParts(short); trimmed = true;
    }
    return { ...m, trimmed };
  }
  function openLink(url, newTab) {
    // A clicked link, not location.href: if no mail app is set up, the page stays put instead of turning into an error page.
    const a = document.createElement("a");
    a.href = url; a.rel = "noopener";
    if (newTab) a.target = "_blank";
    a.style.display = "none"; document.body.appendChild(a);
    try { a.click(); } catch (e) {}
    setTimeout(() => a.remove(), 0);
  }
  async function copyText(t) {
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (e) {}
    const ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.cssText = "position:fixed;left:-9999px;top:0";
    document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (e) {} ta.remove(); return ok;
  }
  $("v52send").onclick = () => {
    const r = reportRow();
    if (!enough(r)) { $("v52rmsg").textContent = "Add a name, an address or a pin, so we can find it."; return; }
    const m = fitMail(r), full = mailParts(r);
    if (m.trimmed) download(`restroom-report-${r.reported_on}.csv`, csvOf([r]), "text/csv");
    openLink(m.url, false);
    const web = (base) => base + `&to=${encodeURIComponent(REPORT_TO)}&su=${encodeURIComponent(full.subject)}&subject=${encodeURIComponent(full.subject)}&body=${encodeURIComponent(full.body)}`;
    $("v52rmsg").innerHTML = `${m.trimmed ? "Your report was long, so the email has the short version and the full report just downloaded as a CSV: please attach it. " : ""}Your email app should open with the report filled in.
<span class="v52mailfb"><b>Didn't open?</b> <a href="#" data-mf="gmail">Open in Gmail</a> · <a href="#" data-mf="outlook">Open in Outlook.com</a> · <a href="#" data-mf="copy">Copy the report</a> and paste it into an email to <a href="#" data-mf="addr">${REPORT_TO}</a></span>`;
    $("v52rmsg").querySelectorAll("[data-mf]").forEach((a) => (a.onclick = async (e) => {
      e.preventDefault();
      const k = a.dataset.mf;
      if (k === "gmail") openLink(web("https://mail.google.com/mail/?view=cm&fs=1"), true);
      if (k === "outlook") openLink(`https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(REPORT_TO)}&subject=${encodeURIComponent(full.subject)}&body=${encodeURIComponent(full.body)}`, true);
      if (k === "copy" || k === "addr") { const ok = await copyText(k === "addr" ? REPORT_TO : `To: ${REPORT_TO}\r\nSubject: ${full.subject}\r\n\r\n${full.body}`); a.textContent = ok ? (k === "addr" ? "address copied ✓" : "Copied ✓") : "Couldn't copy: select the text by hand"; }
    }));
  };
  window.V52MAIL = { fitMail, mailParts, MAX_MAILTO };
  $("v52csv").onclick = () => { const r = reportRow(); if (!enough(r)) { $("v52rmsg").textContent = "Add a name, an address or a pin first."; return; } download(`restroom-report-${r.reported_on}.csv`, csvOf([r]), "text/csv"); };
  $("v52print").onclick = () => {
    const w = window.open("", "_blank"); if (!w) { $("v52rmsg").textContent = "Allow pop-ups to print the paper form."; return; }
    const line = (t, n) => `<div class="l"><b>${t}</b><span>${n || ""}</span></div>`, box = (t) => `<span class="cb">☐ ${t}</span>`;
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Report a public restroom</title><style>body{font:14px/1.4 system-ui,sans-serif;margin:28px;color:#111}h1{font-size:22px;margin:0 0 4px}p{margin:4px 0 12px}.l{display:flex;gap:10px;align-items:flex-end;margin:12px 0}.l b{white-space:nowrap}.l span{flex:1;border-bottom:1px solid #444;min-height:20px}.cb{margin-right:18px;white-space:nowrap}.card{border:2px solid #111;border-radius:10px;padding:16px 18px;max-width:720px;page-break-inside:avoid;margin-bottom:18px}.f{font-size:12px;color:#444}</style>
${[1, 2].map(() => `<div class="card"><h1>Report a public restroom</h1><p>NYC Bathroom Demand Sandbox · for restrooms anyone can use. Please don't write anyone's personal details.</p>
<p>${box("Missing from the map")}${box("On the map but closed or gone")}${box("Wrong hours or details")}</p>
${line("Name of the place")}${line("Address or cross streets")}
<p><b>Type:</b> ${box("Park")}${box("Library")}${box("Transit")}${box("Plaza")}${box("Public building")}${box("Business")}</p>
${line("Hours")}<p><b>Free?</b> ${box("Yes")}${box("Customers only")}${box("Paid")} &nbsp; <b>Wheelchair?</b> ${box("Yes")}${box("Partly")}${box("No")}</p>
<p>${box("Baby changing table")}${box("All-gender / single-stall")}</p>${line("Anything else")}${line("")}${line("Email, only if you'd like a reply")}
<p class="f">Hand this in to the organisers, or email the details to ${REPORT_TO}. A person checks every report before the map changes.</p></div>`).join("")}<script>print()<\/script>`);
    w.document.close();
  };
  // restroom details on the map get a "something wrong?" link
  const _detail = window.detail;
  window.detail = function () {
    _detail.apply(this, arguments);
    const d = $("detail");
    if (d && st.selR && !d.querySelector(".v52wrong")) d.insertAdjacentHTML("beforeend", `<p class="small v52wrong">Something wrong with this restroom? <a href="#" data-v52report="1">Report it</a>.</p>`);
  };

  /* ---------- 10. Shortlists: names are links ---------- */
  const DID = {};
  const did = (name) => { if (!Object.keys(DID).length) DATA.order.forEach((k) => { if (DATA.d[k]) DID[cdName(k).split(" · ")[0]] = k; }); return DID[String(name).split(" · ")[0]]; };
  function linkTables(scope) {
    scope.querySelectorAll("table").forEach((t) => {
      if (t.dataset.v52) return;
      const hs = [...t.querySelectorAll("thead th")].map((h) => h.textContent.trim().toLowerCase().replace(/\s*[⇅↑↓].*$/, ""));
      const dc = hs.findIndex((h) => h === "district"), nc = hs.findIndex((h) => ["site", "block", "restroom", "address"].includes(h));
      if (dc < 0 || nc < 0) return;
      t.dataset.v52 = "1";
      const kind = hs[nc] === "restroom" ? "r" : "b";
      t.querySelectorAll("tbody tr").forEach((tr) => {
        const a = tr.cells[nc], d = tr.cells[dc]; if (!a || !d || a.querySelector("a")) return;
        const id = did(d.textContent.trim()); if (!id) return;
        a.innerHTML = `<a href="#" class="v52go" data-d="${esc(id)}" data-k="${kind}" data-n="${esc(a.textContent.trim())}">${esc(a.textContent.trim())}</a>`;
        const dn = d.textContent.trim(); d.innerHTML = `<a href="#" class="v52go" data-d="${esc(id)}" data-k="d">${esc(dn)}</a>`;
      });
    });
  }
  function goTo(id, kind, name) {
    location.hash = "map"; tab();
    showDist(id); if (!D || D.id !== id) load(id);
    st.selR = null; st.sel = null;
    if (kind === "b") {
      const i = D.blocks.findIndex((b) => place(b) === name || label(b) === name || ("Block " + b.id.slice(-4)) === name.split(",")[0]);
      if (i >= 0) st.sel = i;
    } else if (kind === "r") {
      const nm = name.toLowerCase(), r = allRest(D).find((x) => String(x.n || x.name || "").toLowerCase() === nm) || allRest(D).find((x) => nm.startsWith(String(x.n || x.name || "~").toLowerCase()));
      if (r) { st.selR = r._k; vb = [r.x - VB0[2] / 6, -r.y - VB0[3] / 6, VB0[2] / 3, VB0[3] / 3]; setVB(); }
    }
    render();
    setTimeout(() => { const m = $("mapbox"); if (m) m.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" }); }, 40);
  }
  document.addEventListener("click", (e) => { const a = e.target.closest("a.v52go"); if (!a) return; e.preventDefault(); goTo(a.dataset.d, a.dataset.k, a.dataset.n || ""); });
  const SL = $("tab-shortlists");
  if (SL) new MutationObserver(() => linkTables(SL)).observe(SL, { childList: true, subtree: true });
  // the three-step picker: site names link too
  const qpOut = $("qpOut");
  if (qpOut) new MutationObserver(() => qpOut.querySelectorAll(".qpl li").forEach((li) => { const b = li.querySelector(":scope > div > b"), sb = li.querySelector("a[data-qp]"); if (b && sb && !b.querySelector("a")) { b.innerHTML = `<a href="#">${b.innerHTML}</a>`; b.querySelector("a").onclick = (e) => { e.preventDefault(); sb.click(); }; } })).observe(qpOut, { childList: true, subtree: true });

  /* ---------- 11. closed restrooms by district ---------- */
  function cdShare(rows) {
    const v = Object.fromEntries(rows.map((r) => [r.cd, r])), KX = 84300, KY = 110574, X0 = -74.26, Y1 = 40.92;
    const cls = (s) => (s < 10 ? "ok" : s <= 25 ? "mid" : "bad");
    let paths = "";
    DATA.order.filter((id) => DATA.d[id] && v[id]).forEach((id) => {
      const K = DATA.d[id], kx = 111320 * Math.cos((K.o[1] * Math.PI) / 180), ky = 110574, r = v[id];
      const d = (K.cd || []).filter((x) => x.length > 5).map((x) => "M" + x.reduce((a, c, i) => (i % 2 ? a : a.concat([[((K.o[0] + c / kx - X0) * KX) / 100, ((Y1 - (K.o[1] + x[i + 1] / ky)) * KY) / 100]])), []).map((p) => p[0].toFixed(0) + " " + p[1].toFixed(0)).join("L") + "Z").join("");
      paths += `<path d="${d}" class="v52cl-${cls(r.share)}${r.listed < 10 ? " few" : ""}" data-d="${id}"><title>${esc(r.district)}: ${r.out} of ${r.listed} out of service (${r.share}%)${r.listed < 10 ? " – few restrooms, so the share swings a lot" : ""}</title></path>`;
    });
    return `<div class="v52clmap"><svg class="cdmap" viewBox="0 0 640 480" role="img" aria-label="Community districts by share of listed restrooms out of service">${paths}</svg>
<div class="v52clkey"><b>Share of listed restrooms out of service</b><span><i class="v52cl-ok"></i>✓ under 10%</span><span><i class="v52cl-mid"></i>~ 10–25%</span><span><i class="v52cl-bad"></i>✕ over 25%</span><span><i class="v52cl-ok few"></i>dotted: fewer than 10 listed, so one closure swings the share</span>
<p class="small">A share, not a count, so big and small districts compare fairly. Status is what each operator reports to the City's list on one day (2 Nov 2026); 87 restrooms changed status in the month before, so read it as a snapshot. Click a district to open it.</p></div></div>`;
  }
  const clB = $("slClB");
  if (clB) clB.onclick = () => {
    $("slCl").innerHTML = "<p class='small'>Counting every district…</p>";
    setTimeout(() => {
      const raw = closedAll(P());
      const rows = raw.map((r) => { const out = r.not_operational + r.closed_for_construction + r.closed; return { district: r.district, cd: r.cd, listed: r.listed, out, share: r.listed ? +((out / r.listed) * 100).toFixed(1) : 0, not_operational: r.not_operational, closed_for_construction: r.closed_for_construction, closed: r.closed, per100k: r.closed_per_100k, paper: r.residents_served_on_paper_only, lose: r.residents_beyond_walk_while_closed }; })
        .sort((a, b) => b.share - a.share || b.out - a.out);
      const t = rows.reduce((a, r) => ((a.l += r.listed), (a.o += r.out), (a.no += r.not_operational), (a.cc += r.closed_for_construction), (a.cl += r.closed), a), { l: 0, o: 0, no: 0, cc: 0, cl: 0 });
      const band = (s) => (s < 10 ? ["ok", "✓"] : s <= 25 ? ["mid", "~"] : ["bad", "✕"]);
      $("slCl").innerHTML = `<p><b>Citywide: ${t.o} of ${t.l} listed restrooms are out of service (${((t.o / t.l) * 100).toFixed(1)}%)</b>: ${t.no} not operational, ${t.cc} closed for construction and ${t.cl} listed as "Closed", the City's own three categories (LL58 report, Table 7).</p>` + cdShare(rows) +
        `<div class="tw"><table class="mlist"><thead><tr><th>District</th><th>Listed</th><th>Out of service</th><th>Share out</th><th>Not operational</th><th>Closed for construction</th><th>"Closed"</th><th>Out per 100,000 residents</th><th>Residents whose nearest listed restroom is out</th><th>Of them, now beyond a 10-minute walk</th></tr></thead><tbody>${rows.map((r) => { const [c, m] = band(r.share); return `<tr><td class="nw"><a href="#" class="v52go" data-d="${esc(r.cd)}" data-k="d">${esc(r.district)}</a></td><td>${r.listed}</td><td>${r.out}</td><td><span class="v52chip v52cl-${c}">${m} ${r.share}%</span>${r.listed < 10 ? ' <span class="small" title="Fewer than 10 listed restrooms">few</span>' : ""}</td><td>${r.not_operational}</td><td>${r.closed_for_construction}</td><td>${r.closed}</td><td>${r.per100k}</td><td>${r.paper.toLocaleString()}</td><td>${r.lose.toLocaleString()}</td></tr>`; }).join("")}</tbody></table></div>
<div class="btnrow"><button class="btn" id="slClCsv">Save as a spreadsheet (CSV)</button></div>`;
      $("slClCsv").onclick = () => download("closed_by_cd__v5.2.csv", csvOf(rows.map((r) => ({ district: r.district, cd: r.cd, listed: r.listed, out_of_service: r.out, share_out_pct: r.share, not_operational: r.not_operational, closed_for_construction: r.closed_for_construction, closed: r.closed, out_per_100k: r.per100k, residents_nearest_listed_is_out: r.paper, residents_beyond_10_min_while_out: r.lose }))), "text/csv");
      $("slCl").querySelectorAll(".v52clmap path[data-d]").forEach((p) => (p.onclick = () => goTo(p.dataset.d, "d", "")));
    }, 30);
  };
  const clSum = clB && clB.closest("details") && clB.closest("details").querySelector("summary span");
  if (clSum) clSum.textContent = "What share of each district's listed restrooms is out of service, and who loses out while they stay that way. Click a column heading to sort.";

  /* ---------- 12. Settings drawer: tidy ---------- */
  const dl = document.querySelector("#terms dl.defs");
  if (dl) {
    const pairs = [];
    dl.querySelectorAll("dt").forEach((dt) => pairs.push([dt, dt.nextElementSibling]));
    pairs.sort((a, b) => a[0].textContent.localeCompare(b[0].textContent));
    pairs.forEach(([a, b]) => { dl.append(a); if (b) dl.append(b); });
  }
  const s3 = $("step3") && $("step3").querySelector(".base");
  if (s3) s3.innerHTML = `Press <b>FLUSH!</b> and the map places a restroom on the neediest allowed block, counts it as open, and repeats, so picks spread out. Each pick shows its site check and a suggested type of restroom.`;
  const unk = document.querySelector("#tab-unknowns");
  if (unk && !unk.querySelector(".v52unk")) {
    const h = unk.querySelector("h2");
    if (h) h.insertAdjacentHTML("afterend", `<div class="v52unk note"><b>Known biases, found in the v5.2 audit</b><ul>
<li><b>One detour factor for the whole city.</b> Staten Island's streets need about 1.59, not 1.45, so walks there look about 9% shorter than they are.</li>
<li><b>The cut-offs are calibrated, not exact.</b> Each reason is about as rare at each tier as DOT's street classes; 311 complaints can only be matched at tiers 4 and 5.</li>
<li><b>Survey shares are by tract.</b> Every block in a census tract gets the same age, disability and poverty shares, and small tracts are blended toward the city average.</li>
<li><b>Accessibility and status are reported by each operator</b>, not surveyed (LL58 report, p. 13), and status changes often.</li>
<li><b>311 reports show who reports</b> as much as what happens.</li>
<li><b>People with no home address</b> aren't in the census; the drop-in-centre rule is a stand-in.</li></ul></div>`);
  }

  /* ---------- 13. layout: the search row never hides; split-screen windows get the one-screen map ---------- */
  // (a) The search and scenario rows stick just under the lens bar, so scrolling down to the legend can't hide them.
  const mcard = document.querySelector(".v51mapcard");
  if (mcard && !mcard.querySelector(".v52tools")) {
    const tools = document.createElement("div");
    tools.className = "v52tools";
    const f = mcard.querySelector(".find"), q = $("qmsg"), b2 = mcard.querySelector(".bar2");
    if (f) { f.before(tools); tools.append(f); if (q) tools.append(q); if (b2) tools.append(b2); }
  }
  // (b) Split-screen windows (900–1199 px wide) get the same one-screen layout as wide ones, with a narrower panel.
  const MID = window.matchMedia("(min-width: 900px) and (max-width: 1199px)");
  const lensCard = document.querySelector(".lenscard");
  const setLbh = () => { if (MID.matches && lensCard) root.style.setProperty("--lbh", lensCard.offsetHeight + "px"); };
  const _fit2 = window.fit;
  window.fit = function () {
    if (!MID.matches || !D) return _fit2.apply(this, arguments);
    setLbh();
    const B = D._B, m = 140, mb = $("mapbox"), W = mb.clientWidth || 600, H = Math.max(300, mb.clientHeight || 500);
    svg.style.height = H + "px";
    fitW = W;
    let w = B[2] - B[0] + 2 * m, h = B[3] - B[1] + 2 * m;
    const cx = (B[0] + B[2]) / 2, cy = -(B[1] + B[3]) / 2;
    if (w / h < W / H) w = (h * W) / H; else h = (w * H) / W;
    VB0 = [cx - w / 2, cy - h / 2, w, h]; vb = VB0.slice(); setVB();
  };
  let rz2 = 0;
  const relayout2 = () => { setLbh(); if (D) { fit(); render(); } };
  window.addEventListener("resize", () => { clearTimeout(rz2); rz2 = setTimeout(relayout2, 180); });
  MID.addEventListener("change", relayout2);
  // (c) After a lens or district change, bring the map back to its docked place (as wide screens already do).
  const dock = () => {
    if (!(MID.matches || window.matchMedia("(min-width: 1200px)").matches) || (location.hash || "#map") !== "#map") return;
    const app = document.querySelector("#tab-map .app"); if (!app || !lensCard) return;
    const y = app.getBoundingClientRect().top + window.scrollY - lensCard.offsetHeight - 8;
    if (window.scrollY > y + 4) window.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" });
  };
  const _setLens2 = window.setLens;
  window.setLens = function () { _setLens2.apply(this, arguments); if (MID.matches) { const app = document.querySelector("#tab-map .app"); const y = app.getBoundingClientRect().top + window.scrollY - lensCard.offsetHeight - 8; if (Math.abs(window.scrollY - y) > 30) window.scrollTo({ top: y, behavior: reduced() ? "auto" : "smooth" }); } };
  const dsel = $("dist"); if (dsel) dsel.addEventListener("input", () => setTimeout(dock, 60));
  if (MID.matches) setTimeout(relayout2, 80);

  // first draw with everything above
  if (D) { lensBar(); render(); }
})();

