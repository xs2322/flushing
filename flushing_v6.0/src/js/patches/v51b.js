/* ================= v5.1b: tighter, cleaner opening screen =================
   Loaded after v51.js. Like v5.1, it changes no tier and no number.
   1. Headline in two lines   2. Fact boxes (Throne units counted inside the district only)
   3. Score tiles: good / fair / poor   4. Lens groups get a colour   5. Side panel: district list on top, steps closed
   6. Restrooms page: counts as a chip   7. Numbers: analyst sections fold away */
(function () {
  "use strict";
  const V = window.V51 || {};

  /* ---------- 1. headline: the City's figure on one line, the sandbox's on the next ---------- */
  window.headlineHtml = function () {
    const c = CCAL, X = 1 - c.best.within_10_min / 100, live = RLIST !== "nov";
    return `<p class="hl v51hl"><span class="l"><span class="k">The City:</span><b>20.1%</b> of New Yorkers live more than a 10-minute walk from a public restroom <span class="src">(LL58 report, p. 8)</span></span><span class="l"><span class="k">This sandbox:</span><b>${pc1(X)}</b> on the same restroom list · <b>${pc1(c.strict.share)}</b> counting only restrooms open today, all year, fully accessible · <a href="#numbers" data-tab="numbers">Why they differ</a>${live ? ` <span class="src">(for the City list of ${dmy(RL().nov.asOf)})</span>` : ""}</span></p>`;
  };

  /* ---------- 2. fact boxes ---------- */
  const WHY_SHORT = V.WHY_SHORT || ["Busy sidewalks", "Vulnerable residents", "Poverty", "311 reports", "Drop-in centre nearby"];
  const faqLink = (q, t) => `<a class="qm" href="#faq" data-faq="${q}" title="${esc(t)}" aria-label="${esc(t)}">?</a>`;
  const tierPill = (g) => `<span class="gpill" style="background:var(--g${g});color:${g >= 4 ? "#fff" : "var(--ink)"}">${TIERNAME[g]}</span>`;
  window.districtSummary = function (p) {
    let far = 0, ranked = 0, best = -1;
    const dc = [0, 0, 0, 0, 0];
    D.blocks.forEach((b, i) => {
      const r = RES[i];
      if (r.cls === 2) far += b.pop;
      if (r.g) { ranked++; if (r.drv >= 0) dc[r.drv]++; if (r.ok && (best < 0 || r.need > RES[best].need)) best = i; }
    });
    const nm = D.name.split(" · "), top = dc.indexOf(Math.max(...dc));
    // v5.1b fix: a district pack also carries restrooms just across its line; count only Throne units inside the district.
    const thr = allRest(D).filter((r) => r.t === "Throne" && inDist(D, r)).length;
    const facts = [
      ["Out of reach", `<b>${far.toLocaleString()} residents</b> live more than a ${p.T}-minute walk from an open restroom.`],
      ranked && dc[top] ? [`Main reason ${faqLink("q-reason", "Why does one reason set most tiers?")}`, `<b>${WHY_SHORT[top]}</b> set the tier on ${dc[top].toLocaleString()} of the ${ranked.toLocaleString()} blocks that need a restroom.`] : ["Main reason", "No block here is beyond the walk on these settings."],
      best >= 0 ? ["Best next spot", `<a href="#" data-sel="${best}">${esc(place(D.blocks[best]))}</a><br>${tierPill(RES[best].g)}${RES[best].drv >= 0 ? " · " + WHY_SHORT[RES[best].drv].toLowerCase() : ""}`] : ["Best next spot", "No block with unmet need."],
      [`Throne pilot ${faqLink("q-throne", "What is a Throne unit?")}`, thr ? `${thr === 1 ? "1 unit" : thr + " units"} placed in this district by the City in 2026.` : "No Throne unit in this district."],
    ];
    return `<div class="v51sum"><div class="v51h"><b>${esc(nm[0])}</b>${nm[1] ? `<span>${esc(nm[1])}</span>` : ""}</div><dl class="v51facts">${facts.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("")}</dl></div>`;
  };

  /* ---------- 3. score tiles: good / fair / poor ---------- */
  // [tile, good if at least, fair if at least]; shares in percent. Tile 3 is the share of blocks beyond the walk (lower is better).
  const RAG = { 0: [70, 40], 1: [40, 20], 3: [95, 80] };
  const rag = (v, g, f) => (v >= g ? "good" : v >= f ? "fair" : "poor");
  const WORD = { good: "Good", fair: "Fair", poor: "Poor" };
  function ragTiles() {
    const tiles = [...$("stat").children];
    if (tiles.length < 5 || !D) return;
    const pct = (el) => parseFloat(el.querySelector("b").textContent);
    const set = (el, k) => { el.classList.add("rag", "rag-" + k); el.querySelector("b").insertAdjacentHTML("beforeend", `<span class="ragw">${WORD[k]}</span>`); };
    Object.entries(RAG).forEach(([i, [g, f]]) => { const v = pct(tiles[i]); if (isFinite(v)) set(tiles[i], rag(v, g, f)); });
    const share = (+tiles[2].querySelector("b").textContent / D.blocks.length) * 100; // blocks beyond the walk
    set(tiles[2], share < 10 ? "good" : share <= 30 ? "fair" : "poor");
    tiles[2].querySelector("span:not(.ragw)").insertAdjacentText("beforeend", ` (${Math.round(share)}%)`);
    if (!$("ragkey")) $("stat").insertAdjacentHTML("afterend", `<details class="ragkey" id="ragkey"><summary>How the tiles are rated Good, Fair or Poor</summary><table><thead><tr><th>Tile</th><th>Good</th><th>Fair</th><th>Poor</th></tr></thead><tbody><tr><td>Within a 10-minute walk</td><td>70%+</td><td>40–69%</td><td>under 40%</td></tr><tr><td>Within 5 minutes</td><td>40%+</td><td>20–39%</td><td>under 20%</td></tr><tr><td>Within 20 minutes</td><td>95%+</td><td>80–94%</td><td>under 80%</td></tr><tr><td>Blocks beyond the walk</td><td>under 10%</td><td>10–30%</td><td>over 30%</td></tr></tbody></table><p>Blocks in tier 4 or 5 is a count of need, so it is not rated.</p></details>`);
  }
  const _render = window.render;
  window.render = function () { _render.apply(this, arguments); try { ragTiles(); } catch (e) {} };

  /* ---------- 4. lens groups get a colour ---------- */
  const GKEY = { Need: "need", "Land and zoning": "land", Operations: "ops", "People and places": "ppl" };
  const _lensBar = window.lensBar;
  window.lensBar = function () {
    _lensBar.apply(this, arguments);
    document.querySelectorAll("#lensbar .lgrp").forEach((g) => { const l = g.querySelector(".lgl"); if (l) g.dataset.g = GKEY[l.textContent.trim()] || ""; });
  };

  /* ---------- 5. side panel: the district list on top, steps closed ---------- */
  const s1 = $("step1"), dsel = $("dist");
  if (s1 && dsel && !document.querySelector(".v51dist")) {
    const box = dsel.closest("div");
    box.classList.add("v51dist");
    s1.parentNode.insertBefore(box, s1);
    box.querySelector(".dl").textContent = "Community district";
  }
  ["step1", "step2", "step3"].forEach((id) => { const d = $(id); if (d) d.open = false; });
  // shorter step titles, so each fits on one line in the side panel
  [["step1", "Where is the need?"], ["step2", "Where can one go?"], ["step3", "Where should it go?"]].forEach(([id, t]) => { const sm = $(id) && $(id).querySelector("summary"); if (sm) { const n = sm.querySelector(".sn"); sm.textContent = ""; if (n) sm.appendChild(n); sm.append(t); } });

  // The lens results panel spans the full width under the map, so its tables have room.
  const lensCard = $("lens"), app = document.querySelector("#tab-map .app");
  if (lensCard && app && lensCard.parentNode !== app.parentNode) { lensCard.classList.add("v51wide"); app.parentNode.insertBefore(lensCard, app.nextSibling); }

  /* ---------- 6. Restrooms page: counts as a chip ---------- */
  const _listRender = window.listRender;
  window.listRender = function () {
    _listRender.apply(this, arguments);
    $("listBox").querySelectorAll("tbody tr td:last-child").forEach((td) => {
      const t = td.firstChild && td.firstChild.nodeType === 3 ? td.firstChild : null;
      if (!t) return;
      const v = t.textContent.trim();
      if (v === "Yes" || v === "No") { const s = document.createElement("span"); s.className = "cchip " + v.toLowerCase(); s.textContent = v; td.replaceChild(s, t); }
    });
  };

  /* ---------- 7. Numbers: the City comparison and road mileage fold away ---------- */
  const _cc = window.cityCompareHtml;
  window.cityCompareHtml = function () {
    const h = _cc.apply(this, arguments), cut = h.indexOf('<h3 class="sp">Road mileage');
    const a = cut > 0 ? h.slice(0, cut) : h, b = cut > 0 ? h.slice(cut) : "";
    const fold = (title, sub, body, open) => `<details class="v51fold"${open ? " open" : ""}><summary>${title}<span>${sub}</span></summary>${body.replace(/^<h3 class="sp"[^>]*>[^<]*<\/h3>/, "")}</details>`;
    return fold("Matching the City's numbers (LL58 report, Tables 4 and 5)", "How close the sandbox comes to the City's 5-, 10- and 20-minute figures, and why they differ.", a) +
      (b ? fold("Road mileage by DOT corridor (City Table 5)", "Share of each street class's mileage within a 5- and 10-minute walk, against the City's.", b) : "");
  };
  if ((location.hash || "") === "#numbers") $("v5num").innerHTML = window.cityCompareHtml();

  // Picker results: keep each "a · b · c" part on one line, so no line ends with a stray word.
  const nw = () => document.querySelectorAll("#qpOut .qpm:not(.nwd)").forEach((m) => { m.classList.add("nwd"); m.innerHTML = m.innerHTML.split(" · ").map((x) => `<span class="nw">${x}</span>`).join(" · "); });
  if ($("qpOut")) new MutationObserver(nw).observe($("qpOut"), { childList: true });

  if (D) { lensBar(); render(); }
})();

