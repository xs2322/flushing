/* ================= v5.1: public pop-up layer =================
   Loaded after the main script. It changes no tier and no number: it only changes how things are shown and explained.
   Each change wraps or replaces one function of the main script by assignment (window.name = ...), so the
   original code stays as it was and every call inside it reaches the new version.

   1. Plain words: reason names, scenario labels, the one-minute tour
   2. Map summary card (replaces districtSummary)
   3. Restroom dots: hover card, why not counted, fade or hide restrooms outside the district (wraps markers)
   4. Help links ("?") that open the FAQ at the right question
   5. Pages: Throne pilot (Throne check + Throne districts), FAQ, menus that close (wraps tab)
   6. Restrooms page: district picker, reasons in the Counts column, plain explainer (wraps listRender)
   7. Shortlists: the three-step picker, and lists that open and close
   8. Display: colour sets and large text
   (Small fixes, such as the Method page's "undefined" detour label, are text edits in edits_v51.py.) */
(function () {
  "use strict";

  /* ---------- 1. plain words ---------- */
  // The four reasons a block can take its tier from, in DRV order (foot traffic, vulnerable residents, poverty, complaints).
  const WHY_SHORT = ["Busy sidewalks", "Vulnerable residents", "Poverty", "311 reports", "Drop-in centre nearby"];
  const WHY_LONG = ["busy sidewalks (foot traffic)", "older, very young or disabled residents", "poverty", "311 public-urination reports", "a homeless drop-in centre nearby"];
  window.V51 = { WHY_SHORT, WHY_LONG };
  const tierPill = (g) => `<span class="gpill" style="background:var(--g${g});color:${g >= 4 ? "#fff" : "var(--ink)"}">${TIERNAME[g]}</span>`;
  const faqLink = (q, title) => `<a class="qm" href="#faq" data-faq="${q}" title="${esc(title || "What does this mean?")}" aria-label="${esc(title || "What does this mean?")}">?</a>`;

  // Scenario labels say what they do.
  const sc = $("scen");
  if (sc) {
    const lab = { peak: "Typical busy day", win: "Winter (seasonal restrooms closed)", eve: "Evening (open to 8 pm)" };
    [...sc.options].forEach((o) => lab[o.value] && (o.textContent = lab[o.value]));
  }

  // The one-minute tour, in shorter, plainer steps. The buttons do what they did.
  if (typeof STORY !== "undefined" && STORY.length >= 5) {
    STORY[0][0] = "The gap";
    STORY[0][1] = "The City finds that 1 in 5 New Yorkers live more than a 10-minute walk from a public restroom (LL58 report, p. 8). Count only restrooms that are open today, all year and fully accessible, and it is about half. The law asks for about 1,145 more by 2035.";
    STORY[1][0] = "Read one block";
    STORY[1][1] = "Every block gets a need tier from 1 to 5. If no restroom is within a 10-minute walk, the block takes its strongest reason: busy sidewalks, vulnerable residents, poverty or 311 reports. 870 Riverside Drive is tier 5 because about 4 in 10 residents are older, very young or disabled.";
    STORY[2][0] = "Where one could go";
    STORY[2][1] = "Need never depends on land: land only decides where a restroom may stand. Each pick gets a desk check of the land owner, the sidewalk, the flood plain and who must approve.";
    STORY[3][0] = "Let the map pick";
    STORY[3][1] = "On Shortlists, choose a district, what matters most and how many sites, then press one button. Ready-made citywide lists are there too.";
    STORY[4][0] = "Now explore";
    STORY[4][1] = "The map can't see café or store restrooms, real walking routes or the exact spot on a block, and every site still needs a visit. Search an address, or click any block to start.";
    try { storyDraw(); } catch (e) {}
  }
  // "New here? Take the 1-minute tour" in the header.
  const tour = $("v51tour");
  if (tour) tour.onclick = (e) => {
    e.preventDefault();
    location.hash = "map"; tab();
    storyAt = 0; $("guide").hidden = false; $("sopen").hidden = true; storyDraw();
    $("guide").scrollIntoView({ block: "center", behavior: "smooth" });
  };

  /* ---------- 2. the map summary card ---------- */
  window.districtSummary = function (p) {
    let far = 0, ranked = 0, best = -1;
    const dc = [0, 0, 0, 0, 0];
    D.blocks.forEach((b, i) => {
      const r = RES[i];
      if (r.cls === 2) far += b.pop;
      if (r.g) {
        ranked++;
        if (r.drv >= 0) dc[r.drv]++;
        if (r.ok && (best < 0 || r.need > RES[best].need)) best = i;
      }
    });
    const nm = D.name.split(" · "), top = dc.indexOf(Math.max(...dc)), thr = allRest(D).filter((r) => r.t === "Throne").length;
    const facts = [];
    facts.push(["Out of reach", `<b>${far.toLocaleString()} residents</b> live more than a ${p.T}-minute walk from an open restroom.`]);
    if (ranked && dc[top])
      facts.push([`Main reason ${faqLink("q-reason", "Why does one reason set most tiers?")}`, `<b>${WHY_SHORT[top]}</b> set the tier on ${dc[top].toLocaleString()} of the ${ranked.toLocaleString()} blocks that need a restroom.`]);
    else facts.push(["Main reason", "No block here is beyond the walk on these settings."]);
    if (best >= 0)
      facts.push(["Best next spot", `<a href="#" data-sel="${best}">${esc(place(D.blocks[best]))}</a> · ${tierPill(RES[best].g)}${RES[best].drv >= 0 ? " · " + WHY_SHORT[RES[best].drv].toLowerCase() : ""}`]);
    facts.push([`Throne pilot ${faqLink("q-throne", "What is a Throne unit?")}`, thr ? `${thr === 1 ? "1 unit" : thr + " units"} placed here by the City in 2026.` : "No Throne unit in this district."]);
    return `<div class="v51sum"><div class="v51h"><b>${esc(nm[0])}</b>${nm[1] ? `<span>${esc(nm[1])}</span>` : ""}</div><dl class="v51facts">${facts.map(([t, d]) => `<div><dt>${t}</dt><dd>${d}</dd></div>`).join("")}</dl></div>`;
  };

  /* ---------- 3. restroom dots ---------- */
  // Why a restroom does not count right now, in plain words. Mirrors isCounted() in the main script.
  function whyNot(K, r, o, short) {
    o = o || st;
    const w = [];
    if (!r.ok) w.push(r.fu ? "planned, not open yet" : r.st && r.st !== "Operational" ? r.st.toLowerCase() : "listed as not operating");
    if (o.ops[r.t] === false) w.push(r.t === "Subway" ? (short ? "subway restroom: off by default" : "subway station restrooms are off by default (switch on under Which restrooms count)") : "this type of restroom is switched off");
    if (o.on.S && o.season === "win" && r.se) w.push("seasonal, so closed in winter");
    if (o.on.S && o.season === "eve" && !r.ev) w.push("closes before 8 pm");
    if (o.acc && r.ac !== 2 && r.t !== "User") w.push("not listed as fully wheelchair accessible");
    if (o.cs && !(r.cs >= 1) && r.t !== "User") w.push("no changing station");
    if (o.ag && !r.ag && r.t !== "User") w.push("not all-gender");
    if (o.opx && o.opx[r.op || r.t] === false && r.t !== "User") w.push("its operator is switched off");
    if (K.off && K.off[r._k]) w.push("you stopped counting it");
    return w;
  }
  window.V51.whyNot = whyNot;
  const typeName = (t) => (OPS.find((o) => o[0] === t) || [0, t])[1];
  let HIDEFAR = false;
  try { HIDEFAR = localStorage.getItem("v51-hidefar") === "1"; } catch (e) {}

  const _markers = window.markers;
  window.markers = function () {
    _markers.apply(this, arguments);
    if (!D) return;
    const byK = new Map(allRest(D).map((r) => [r._k, r]));
    gM.querySelectorAll("circle.mk[data-r]").forEach((c) => {
      const r = byK.get(c.dataset.r);
      if (!r || r.t === "User" || inDist(D, r)) return;
      if (HIDEFAR && c.dataset.r !== st.selR) c.remove();
      else c.classList.add("v51far");
      const t = c.querySelector("title"); if (t) t.remove(); // the hover card replaces the plain title
    });
    gM.querySelectorAll("circle.mk[data-r] title").forEach((t) => t.remove());
  };

  // Hover card: name, type, hours, status, and whether it counts (and why not).
  const tipEl = $("tip");
  svg.addEventListener("mousemove", (e) => {
    const k = e.target.dataset && e.target.dataset.r;
    if (!k || drag) { tipEl.classList.remove("rtip"); return; }
    const r = allRest(D).find((x) => x._k === k);
    if (!r) return;
    const c = isCounted(D, r), w = c ? [] : whyNot(D, r), hi = r.h ? hoursInfo(r.h).txt : r.t === "Throne" ? "7 am–10 pm daily" : "";
    const status = r.li != null ? r.st || "" : r.t === "Throne" ? "Operational" : statusTxt(r);
    tipEl.classList.add("rtip");
    tipEl.innerHTML = `<b>${esc(r.n)}</b><div class="rt-m">${esc(typeName(r.t))}${r.op ? " · " + esc(r.op) : ""}</div>${hi ? `<div class="rt-m">Hours: ${esc(hi)}</div>` : ""}${status ? `<div class="rt-m">Status: ${esc(status)}</div>` : ""}${!inDist(D, r) && r.t !== "User" ? `<div class="rt-m">Just outside this district</div>` : ""}<div class="rt-c ${c ? "" : "no"}">${c ? "✓ Counts on the map" : "✕ Not counted: " + esc(w.join("; ") || "switched off")}</div><div class="rt-h">Click for details</div>`;
    tipEl.hidden = false;
    const bx = svg.parentNode.getBoundingClientRect();
    tipEl.style.left = Math.max(4, Math.min(e.clientX - bx.left + 14, bx.width - 310)) + "px";
    tipEl.style.top = e.clientY - bx.top + 14 + "px";
  });
  svg.addEventListener("mouseleave", () => tipEl.classList.remove("rtip"));

  // Layers: hide restrooms outside the district (they still count for blocks near the line).
  const lay = document.querySelector("#laydd .laylist");
  if (lay && !$("lyHide")) {
    lay.insertAdjacentHTML("beforeend", `<label title="Restrooms just outside the district are faded. They still count for blocks near the district line."><input type="checkbox" id="lyHide" ${HIDEFAR ? "checked" : ""}>Hide restrooms outside this district</label>`);
    $("lyHide").onchange = (e) => { HIDEFAR = e.target.checked; try { localStorage.setItem("v51-hidefar", HIDEFAR ? "1" : "0"); } catch (x) {} render(); };
  }

  // The restroom detail: say why a subway restroom is off.
  const _detail = window.detail;
  window.detail = function () {
    _detail.apply(this, arguments);
    if (!st.selR || !D) return;
    const r = allRest(D).find((x) => x._k === st.selR);
    if (r && r.t === "Subway" && st.ops.Subway === false) {
      const box = $("detail");
      box.innerHTML = box.innerHTML.replace("its type is switched off", "subway station restrooms are off by default: they come from a separate MTA list and keep shorter hours (7 am–7 pm). Switch them on under Which restrooms count");
    }
  };

  /* ---------- 4. help links ---------- */
  function openFaq(q) {
    location.hash = "faq"; tab(); window.scrollTo(0, 0);
    const d = q && document.getElementById(q);
    if (d) {
      document.querySelectorAll(".faq details.hit").forEach((x) => x.classList.remove("hit"));
      d.open = true; d.classList.add("hit");
      setTimeout(() => d.scrollIntoView({ block: "start", behavior: "smooth" }), 30);
    }
  }
  window.V51.openFaq = openFaq;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[data-faq]");
    if (a) { e.preventDefault(); e.stopPropagation(); openFaq(a.dataset.faq); return; }
    // "Why the figures differ" goes straight to the City comparison, now at the end of Numbers.
    const n = e.target.closest('#headline a[data-tab="numbers"]');
    if (n) { e.preventDefault(); e.stopPropagation(); location.hash = "numbers"; tab(); setTimeout(() => $("v5num").scrollIntoView({ block: "start" }), 30); return; }
    const t = e.target.closest("a.v51t[data-tab]");
    if (t) { e.preventDefault(); location.hash = t.dataset.tab; tab(); window.scrollTo(0, 0); }
  }, true);
  // "?" next to the controls people asked about.
  const addQ = (sel, q, title) => { const n = document.querySelector(sel); if (n && !n.parentNode.querySelector(`a[data-faq="${q}"]`)) n.insertAdjacentHTML("afterend", " " + faqLink(q, title)); };
  addQ("#scen", "q-scen", "What do Winter and Evening mean?");
  const roL = $("resOnly") && $("resOnly").closest("label");
  if (roL && !document.querySelector('a[data-faq="q-res"]')) roL.insertAdjacentHTML("afterend", faqLink("q-res", "What does Residents only do?"));
  const ro = $("resOnly"); if (ro && ro.parentNode.lastChild && ro.parentNode.lastChild.nodeType === 3) ro.parentNode.title = "Rank blocks for the people who live there: foot traffic is switched off.";

  /* ---------- 5. pages and menus ---------- */
  if (!TABS.includes("faq")) TABS.push("faq");
  const _tab = window.tab;
  window.removeEventListener("hashchange", _tab);
  window.tab = function () {
    if ((location.hash || "").slice(1) === "city") history.replaceState(null, "", "#throne"); // Throne districts now live on the Throne pilot page
    _tab.apply(this, arguments);
    const ok = (location.hash || "#map").slice(1);
    if (ok === "throne" && D) cityLive();
    if (ok === "shortlists") qpSync();
    $("more").classList.toggle("cur", ["about", "method", "throne", "faq", "unknowns", "sources"].includes(ok));
    document.querySelectorAll(".top details.more").forEach((d) => (d.open = false));
  };
  window.addEventListener("hashchange", () => window.tab());
  // Menus close when an item is picked or on a click elsewhere.
  document.querySelectorAll(".top details.more .menu a").forEach((a) => a.addEventListener("click", () => (a.closest("details").open = false)));
  document.addEventListener("click", (e) => { document.querySelectorAll(".top details.more[open]").forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });

  /* ---------- 6. Restrooms page ---------- */
  const _listRender = window.listRender;
  window.listRender = function () {
    _listRender.apply(this, arguments);
    if (!D) return;
    // a district picker next to the scope buttons, kept in step with the map
    const seg = $("lsD") && $("lsD").parentNode;
    if (seg && !$("lsDist")) {
      const ids = DATA.order.filter((k) => DATA.d[k]).sort(cdOrder);
      seg.insertAdjacentHTML("afterend", `<label class="small" style="display:inline-flex;gap:6px;align-items:center">District <select id="lsDist" aria-label="District">${ids.map((k) => `<option value="${esc(k)}" ${k === D.id ? "selected" : ""}>${esc(cdName(k))}</option>`).join("")}</select></label>`);
      $("lsDist").onchange = (e) => { const k = e.target.value; showDist(k); if (!D || D.id !== k) load(k); LST.scope = "district"; listRender(); };
    }
    // why a restroom does not count
    const packs = {};
    $("listBox").querySelectorAll("tbody tr").forEach((tr) => {
      const a = tr.querySelector("a[data-go]"), td = tr.lastElementChild;
      if (!a || !td || td.textContent.trim() !== "No") return;
      const [id, k] = a.dataset.go.split("|"), K = packs[id] || (packs[id] = prep(DATA.d[id])), r = allRest(K).find((x) => x._k === k);
      if (!r) return;
      const w = whyNot(K, r, st, true);
      if (w.length) td.innerHTML = `No<span class="v51why">${esc(w.join("; "))}</span>`;
    });
  };

  /* ---------- 7. Shortlists: the three-step picker ---------- */
  const QP = { where: null, pre: "bal", n: 10 };
  const thFrom = (t) => ({ sub: t.sub, vul: t.vul.map((x) => x / 100), pov: t.pov.map((x) => x / 100), c311: t.c311 });
  function qpSync() {
    const s = $("qpWhere");
    if (!s || !D) return;
    if (!s.options.length) {
      const ids = DATA.order.filter((k) => DATA.d[k] && /^[1-5]\d\d$/.test(k)).sort(cdOrder);
      s.innerHTML = `<optgroup label="One district">${ids.map((k) => `<option value="d:${esc(k)}">${esc(cdName(k))}</option>`).join("")}</optgroup><optgroup label="A borough">${Object.entries(BORO).map(([n, b]) => `<option value="b:${n}">All of ${b}</option>`).join("")}</optgroup><optgroup label="The whole city"><option value="all">All five boroughs</option></optgroup>`;
      const other = DATA.order.filter((k) => DATA.d[k] && !/^[1-5]\d\d$/.test(k));
      if (other.length) s.insertAdjacentHTML("afterbegin", `<optgroup label="Your areas">${other.map((k) => `<option value="d:${esc(k)}">${esc(DATA.d[k].name || k)}</option>`).join("")}</optgroup>`);
    }
    if (!QP.where) s.value = "d:" + D.id;
  }
  function qpButtons() {
    document.querySelectorAll("#qpPre button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === QP.pre));
    document.querySelectorAll("#qpN button").forEach((b) => b.setAttribute("aria-pressed", +b.dataset.v === QP.n));
    if ($("qpGo")) $("qpGo").textContent = `FLUSH! ${QP.n} sites`;
  }
  const PRE_NAME = { bal: "Balanced (your map settings)", foot: "Busy streets first", res: "Neighbours in need (residents only)", equity: "Equity first" };
  function qpRun() {
    const where = $("qpWhere").value, n = QP.n, parks = $("qpParks").checked, out = $("qpOut");
    const o = { ...st, on: { ...st.on }, picks: [] };
    let p = P();
    if (QP.pre === "foot") p = { ...p, th: thFrom(TH_PRESETS.foot) };
    if (QP.pre === "equity") p = { ...p, th: thFrom(TH_PRESETS.equity) };
    if (QP.pre === "res") o.on.U = false;
    if (parks) o.site = "open";
    const ids = where === "all" ? DATA.order.filter((k) => DATA.d[k] && /^[1-5]\d\d$/.test(k))
      : where.startsWith("b:") ? DATA.order.filter((k) => DATA.d[k] && k[0] === where.slice(2) && /^[1-5]\d\d$/.test(k))
      : [where.slice(2)];
    const one = ids.length === 1, per = one ? n : Math.min(n, ids.length > 20 ? 3 : 5);
    const placeName = one ? cdName(ids[0]) : where === "all" ? "all five boroughs" : BORO[where.slice(2)];
    out.innerHTML = `<p class="small">Scoring ${one ? esc(placeName) : ids.length + " districts"}…${ids.length > 20 ? " This takes a few seconds." : ""}</p>`;
    setTimeout(() => {
      const rows = [];
      ids.forEach((id) => {
        const K = prep(DATA.d[id]), x = pickSites(K, o, per, p);
        x.picks.forEach((i, k) => {
          const inf = x.info[k], sc2 = siteCheck(K, K.blocks[i]);
          rows.push({ id, i, need: inf.need, order: k, site: place(K.blocks[i]), block: label(K.blocks[i]), district: cdName(id), tier: inf.g, reason: inf.drv >= 0 ? WHY_SHORT[inf.drv] : "", type: sc2.type, visits: Math.round(inf.added), moved: inf.moved });
        });
      });
      const list = (one ? rows : rows.sort((a, b) => b.need - a.need)).slice(0, n);
      QP.rows = list;
      const note = one ? "Each site is placed, counted as open, and the district is scored again before the next, so picks spread out." : `The best ${per} in each district, then the top ${n} across ${esc(placeName)} by need.`;
      out.innerHTML = list.length ? `<div class="qpres"><h3>The next ${list.length} sites · ${esc(placeName)}</h3><p class="small">${esc(PRE_NAME[QP.pre])}${parks ? " · parks and plazas only" : ""}. ${note} Every site still needs a visit.</p>
<ol class="qpl">${list.map((r, k) => `<li><span class="qpk">${k + 1}</span><div><b>${esc(r.site)}</b><div class="qpm">${one ? "" : esc(r.district) + " · "}${tierPill(r.tier)}${r.reason ? " · " + esc(r.reason.toLowerCase()) : ""} · ${esc(r.type)} · about ${r.visits} visits a day${r.moved ? ` · moved ${r.moved} m to allowed land` : ""}</div></div><a href="#" class="btn" data-qp="${k}">Show on map</a></li>`).join("")}</ol>
<div class="btnrow"><button class="btn" id="qpCsv">Save as a spreadsheet (CSV)</button>${one ? `<button class="btn" id="qpMap">Put all ${list.length} on the map</button>` : ""}<button class="btn" id="qpClr">Clear</button></div></div>`
        : `<p class="small">No block in ${esc(placeName)} has unmet need${parks ? " on parks or plazas" : ""} on these settings. Try another choice in step 2.</p>`;
      out.querySelectorAll("a[data-qp]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); const r = list[+a.dataset.qp]; goBlock(r.id, r.i); }));
      if ($("qpCsv")) $("qpCsv").onclick = () => download(`bathroom-sandbox-next-${list.length}-sites.csv`, csvOf(list.map((r, k) => ({ rank: k + 1, site: r.site, census_block: r.block, district: r.district, tier: r.tier, main_reason: r.reason, suggested_type: r.type, visits_a_day: r.visits, moved_m: r.moved || 0, priority: PRE_NAME[QP.pre], parks_and_plazas_only: parks ? "yes" : "no" }))), "text/csv");
      if ($("qpMap")) $("qpMap").onclick = () => { const id = list[0].id; location.hash = "map"; tab(); showDist(id); if (!D || D.id !== id) load(id); st.picks = list.map((r) => r.i); st.pickInfo = list.map((r) => ({ from: r.i, moved: r.moved, need: r.need, added: r.visits, g: r.tier, drv: WHY_SHORT.indexOf(r.reason) })); st.skipped = []; render(); window.scrollTo(0, 0); };
      if ($("qpClr")) $("qpClr").onclick = () => { out.innerHTML = ""; };
    }, 30);
  }
  function goBlock(id, i) {
    location.hash = "map"; tab();
    showDist(id); if (!D || D.id !== id) load(id);
    st.sel = i; st.selR = null; render();
    setTimeout(() => $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  }
  if ($("qp")) {
    $("qpPre").onclick = (e) => { const b = e.target.closest("button"); if (b) { QP.pre = b.dataset.v; qpButtons(); } };
    $("qpN").onclick = (e) => { const b = e.target.closest("button"); if (b) { QP.n = +b.dataset.v; qpButtons(); } };
    $("qpWhere").onchange = (e) => (QP.where = e.target.value);
    $("qpGo").onclick = qpRun;
    qpButtons();
  }
  // Every list card has a Clear button.
  document.querySelectorAll("button.slclr").forEach((b) => (b.onclick = () => { const t = $(b.dataset.for); if (t) t.innerHTML = ""; }));

  /* ---------- 8. Display: colour sets and large text ---------- */
  function dispV51() {
    let pal = "std", big = "0";
    try { pal = localStorage.getItem("v51-palette") || "std"; big = localStorage.getItem("v51-big") || "0"; } catch (e) {}
    if (pal === "std") document.documentElement.removeAttribute("data-palette"); else document.documentElement.setAttribute("data-palette", pal);
    document.documentElement.classList.toggle("big", big === "1");
    document.querySelectorAll('input[name="palette"]').forEach((r) => (r.checked = r.value === pal));
    if ($("bigtext")) $("bigtext").checked = big === "1";
  }
  document.querySelectorAll('input[name="palette"]').forEach((r) => (r.onchange = () => { try { localStorage.setItem("v51-palette", r.value); } catch (e) {} dispV51(); if (D) render(); }));
  if ($("bigtext")) $("bigtext").onchange = () => { try { localStorage.setItem("v51-big", $("bigtext").checked ? "1" : "0"); } catch (e) {} dispV51(); if (D) { fit(); render(); } };
  dispV51();

  // Draw once with the new summary and dots.
  if (D) render();
  if ((location.hash || "").slice(1) && location.hash !== "#map") tab();
})();

