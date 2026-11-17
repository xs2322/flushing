/* ================= FLUSHING v4: lenses =================
   A lens never changes a block's tier. It changes three things only: which letters on the left are highlighted,
   one or two extra map layers, and the results panel under the map. The map view (pan and zoom) is kept when the
   lens changes, and the whole district stays on screen. Lens layers are in <script id="lensdata">, built by
   pipeline/build_lens_data.py from the files listed in data/01_downloads/MANIFEST.md. */
var LENS = JSON.parse($("lensdata").textContent);
const LX = () => (D && LENS.d[D.id]) || null;
let gX = null; // lens overlay group, created in load()
const LENSES = [
  { id: "siting", g: "Need", name: "Siting", who: "Parks, DOT", q: "Where is a restroom needed, and where can one stand?", keys: ["U", "N", "H", "I", "C", "G"] },
  { id: "coverage", g: "Need", name: "Coverage / ADA", who: "Existing infrastructure, Operations, disability advocates", q: "Which existing restrooms are closed or out of service, and which really serve people: open all year and wheelchair accessible?", keys: ["N"] },
  { id: "closed", g: "Need", name: "Closed & planned", who: "Parks, DOT, Operations", q: "Which listed restrooms are closed, who loses a restroom while they stay closed, and what is already planned?", keys: ["U"] },
  { id: "food", g: "Need", name: "Restaurants (informal)", who: "Health, small business, outreach", q: "Where do restaurants and other food places offer an informal restroom, and where is there nothing at all?", keys: ["U"] },
  { id: "equity", g: "Need", name: "Evening & winter", who: "Equity, delivery workers", q: "Who loses a restroom after 8 pm, or when seasonal park restrooms close?", keys: ["N", "H", "I"] },
  { id: "zoning", g: "Land and zoning", name: "Zoning & BIDs", who: "Zoning, BIDs", q: "Which needy blocks sit in residential-with-commercial or commercial zoning inside a Business Improvement District that could be a partner?", keys: ["L", "K"] },
  { id: "zroute", g: "Land and zoning", name: "Zoning routes", who: "City Planning, zoning", q: "How could a restroom be approved on each block, is there an open land-use application to join, and what would a citywide text change open?", keys: ["L"] },
  { id: "cityprop", g: "Land and zoning", name: "City property", who: "DCAS, City Planning, Parks", q: "Where is there City-owned or leased land or a public building on a block that needs a restroom?", keys: ["L"] },
  { id: "landmarks", g: "Land and zoning", name: "Landmarks & special districts", who: "Design, LPC, City Planning", q: "Where does a site need Landmarks Preservation Commission review, or sit in a special purpose district?", keys: ["K"] },
  { id: "flood", g: "Land and zoning", name: "Flood risk", who: "Resilience, DOT", q: "Which needy blocks are in the flood plain, where a unit needs flood-proof siting?", keys: ["L", "K"] },
  { id: "publand", g: "Land and zoning", name: "Public land", who: "Parks, DCAS, DOT", q: "Where could a unit go on parks, plazas or other public land, without a lease?", keys: ["L"] },
  { id: "transit", g: "Land and zoning", name: "Transit & mobility", who: "MTA, DOT", q: "Which needy blocks are next to a subway station, bus shelter or bike-share dock?", keys: ["U", "K"] },
  { id: "maint", g: "Operations", name: "Operations & maintenance", who: "Procurement, Parks operations", q: "How many crews would keep the units clean, and how could contracts be bundled instead of written site by site?", keys: ["K", "G"] },
  { id: "coloc", g: "Operations", name: "Co-location & contacts", who: "Design, outreach", q: "What public uses are already next to each site, and who has to say yes?", keys: ["K"] },
  { id: "reps", g: "People and places", name: "Who represents here", who: "Outreach, elected offices", q: "Which council, State Senate and Assembly districts hold the need, and who to call?", keys: ["G"] },
  { id: "vuln", g: "People and places", name: "Equity", who: "Equity, Health, DHS", q: "Where is the need set by older, very young or disabled residents, poverty, public housing or homelessness?", keys: ["H", "I"] },
];
const ls = {
  id: "siting",
  zmode: "ab",
  zsort: "hi",
  eq: "eve",
  cv: { yr: true, acc: true, eve: false, cs: false, ag: false },
  m: { n: 8, every: 12, svc: 20, kmh: 15, shift: 420, crew: 95000, ringR: 1000, show: "ring" },
  co: { seat: true, link: true, shel: true, bike: true },
};
let LR = {}; // results of the open lens for this render
const RING_COL = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#E69F00", "#56B4E9", "#332288", "#882255", "#117733", "#AA4499"];
const ZTXT = (z) =>
  !z ? "No zoned lots on this block (street, park or water)" :
  [z & 2 ? "residential with a C1/C2 commercial overlay" : z & 1 ? "residential" : "", z & 4 ? "commercial" : "", z & 8 ? "manufacturing" : ""].filter(Boolean).join(", ");
const zMatch = (z, inBid, mode) =>
  mode === "a" ? !!(z & 2) && inBid :
  mode === "b" ? !!(z & 4) && inBid :
  mode === "d" ? !!(z & 2) :
  mode === "c" ? inBid :
  (!!(z & 2) || !!(z & 4)) && inBid; // "ab": residential + C1/C2, or commercial, inside a BID

/* ---------- the lens bar ---------- */
function lensBar() {
  const L = LENSES.find((x) => x.id === ls.id);
  $("lensbar").innerHTML =
    `<div class="lenstabs" role="tablist" aria-label="Lens">${[...new Set(LENSES.map((x) => x.g))].map((g) => `<div class="lgrp"><span class="lgl">${g}</span>${LENSES.filter((x) => x.g === g).map((x) => `<button role="tab" aria-selected="${x.id === ls.id}" data-lens="${x.id}">${x.name}</button>`).join("")}</div>`).join("")}</div>` +
    `<p class="lensq"><span class="lensl">This lens answers</span><b>${esc(L.q)}</b><span class="small">Most useful to: ${esc(L.who)}.</span></p>`;
  $("lensbar").querySelectorAll("button[data-lens]").forEach((b) => (b.onclick = () => setLens(b.dataset.lens)));
  document.querySelectorAll(".rail .let").forEach((e) => e.classList.toggle("lhl", ls.id !== "siting" && L.keys.includes(e.dataset.k)));
}
function setLens(id) {
  ls.id = id;
  try { localStorage.setItem("flushing-lens", id); } catch (e) {}
  lensBar();
  render(); // keeps the current pan and zoom
}

// The strict rule in the Coverage lens: operating, plus whichever of year-round, accessible, open to 8 pm, changing station, all-gender is ticked.
const strictO = () => ({ ...st, acc: ls.cv.acc, cs: ls.cv.cs, ag: ls.cv.ag, on: { ...st.on, S: ls.cv.yr || ls.cv.eve }, season: ls.cv.eve ? "eve" : "win" });

/* ---------- per-render preparation: the extra scorings each lens needs ---------- */
function lensPrep(p) {
  LR = {};
  const X = LX();
  if (!X) return;
  if (ls.id === "closed") { LR.closed = closedOf(D, p); return; }
  if (ls.id === "food") { LR.fd = fdPrep(D, p); return; }
  if (ls.id === "coverage") {
    const strict = strictO();
    // "Year-round" uses the winter scenario's rule (seasonal restrooms closed) without the winter subway ratio mattering to access.
    LR.strict = scoreAll(D, strict, st.picks, p);
  }
  if (ls.id === "equity") {
    const base = { ...st, on: { ...st.on, S: false } };
    LR.base = scoreAll(D, base, st.picks, p);
    LR.eve = scoreAll(D, { ...base, on: { ...base.on, S: true }, season: "eve" }, st.picks, p);
    LR.win = scoreAll(D, { ...base, on: { ...base.on, S: true }, season: "win" }, st.picks, p);
  }
  if (ls.id === "maint") LR.m = maintRun(p);
  if (ls.id === "coloc" || ls.id === "transit") nearAssets();
}
// Fill override for one block: {f: colour, o: opacity} or null for the normal tier colour.
function lensFill(i, r) {
  const X = LX();
  if (!X || st.view !== "need" || st.on.F) return null;
  if (ls.id === "food" && LR.fd) return r.g >= 4 && r.cls === 2 ? { f: LR.fd.near[i] ? "var(--g3)" : "var(--g5)", o: 1 } : { f: "var(--g0)", o: 0.55 };
  if (ls.id === "closed" && LR.closed) return LR.closed.pb.has(i) ? { f: "var(--g4)", o: 1 } : { f: "var(--g0)", o: 0.6 };
  if (ls.id === "coverage" && LR.strict) {
    const s = LR.strict[i];
    if (r.cls < 2 && s.cls === 2) return { f: "var(--paper)", o: 1 };
    return { o: 0.35 };
  }
  if (ls.id === "equity" && LR.base) {
    const a = LR.base[i], b = LR[ls.eq][i];
    if (a.cls < 2 && b.cls === 2) return { f: "var(--paper)", o: 1 };
    return { o: 0.35 };
  }
  if (ls.id === "zoning") {
    const m = zMatch(X.z[i], X.bid[i] >= 0, ls.zmode);
    return m ? null : { o: 0.18 };
  }
  if (ls.id === "coloc" && X._near) {
    const n = X._near[i];
    return r.g >= 3 && n.types >= 2 ? null : { o: 0.25 };
  }
  if (ls.id === "maint") return { o: 0.55 };
  if (ls.id === "landmarks") return X.hd[i] >= 0 || X.lm[i] > 0 || X.sp[i] >= 0 ? null : { o: 0.18 };
  if (ls.id === "flood") return X.fz[i] > 0 || D.blocks[i].fl ? null : { o: 0.18 };
  if (ls.id === "publand") { const lt = D.blocks[i].lt || 0; return lt === 1 ? { f: "var(--park)", o: 0.75 } : lt === 2 ? { f: "var(--paper)", o: 0.75 } : lt === 3 ? { o: 0.35 } : { o: 0.15 }; }
  if (ls.id === "transit" && X._near) { const n = X._near[i]; return D.blocks[i]._sub > 0 || n.shel || n.bike ? null : { o: 0.18 }; }
  if (ls.id === "vuln") { return r.g && (r.drv === 1 || r.drv === 2) || X.ny[i] || D.blocks[i].di ? null : { o: 0.18 }; }
  return null;
}
function lensLegend() {
  const X = LX();
  if (!X || ls.id === "siting") return "";
  const sw = (bg, t, extra) => `<span><i style="background:${bg};${extra || ""}"></i>${t}</span>`;
  if (ls.id === "closed") return `<b style="color:var(--ink)">Closed & planned</b>` + sw("var(--g4)", "Nearest listed restroom is closed") + `<span style="color:var(--no);font-weight:700">✕ closed restroom</span><span>◆ planned site (darker = further along)</span>`;
  if (ls.id === "zroute") return `<b style="color:var(--ink)">Zoning routes</b><span>Tiers as usual; click a block for its route</span>`;
  if (ls.id === "cityprop") return `<b style="color:var(--ink)">City property</b>` + Object.entries(CPNAME).map(([k2, v]) => sw(CPCOL[k2], v)).join("");
  if (ls.id === "food") return `<b style="color:var(--ink)">Restaurants (informal)</b>` + sw("var(--g5)", "Tier 4–5 gap, nothing within 100 m") + sw("var(--g3)", "Tier 4–5 gap, a food place within 100 m") + `<span><i style="background:#b0466e;border-radius:50%"></i>Food establishment</span>`;
  if (ls.id === "coverage") return `<b style="color:var(--ink)">Existing restrooms</b><span><i style="background:var(--cv-out);border-radius:2px"></i>Closed or out of service</span><span><span class="dot" style="background:var(--panel);border:2px dashed var(--cv-plan)"></span>Planned</span><span><span class="dot" style="background:var(--cv-lim);border:2px solid var(--cv-lim)"></span>Open, fails the rule (seasonal, access)</span><span><span class="dot" style="background:var(--cv-ok);border:2px solid var(--cv-ok)"></span>Open, meets the rule</span><span><span class="dot" style="background:var(--sub);border:2px solid var(--sub);border-radius:2px"></span>Subway restroom</span>` + sw("var(--paper)", "Block served on paper only");
  if (ls.id === "equity") return `<b style="color:var(--ink)">${ls.eq === "eve" ? "After 8 pm" : "Winter"}</b>` + sw("var(--paper)", "Served at peak, but not " + (ls.eq === "eve" ? "after 8 pm" : "in winter"));
  if (ls.id === "zoning") return `<b style="color:var(--ink)">Zoning & BIDs</b>` + sw("transparent", "BID boundary", "border:2px dashed var(--bid)") + `<span>Faded blocks do not match the zoning filter</span>`;
  if (ls.id === "maint") return `<b style="color:var(--ink)">Service rings</b><span>Coloured lines: one crew's loop</span>` + sw("var(--panel)", "Parks restroom used as a hub", "border:2px solid var(--park);border-radius:0");
  if (ls.id === "landmarks") return `<b style="color:var(--ink)">Landmarks & special districts</b><span>Bright blocks: in a historic district, with a landmark lot, or in a special purpose district</span>`;
  if (ls.id === "flood") return `<b style="color:var(--ink)">Flood risk</b><span>Bright blocks: some lots in the 2015 preliminary or 2007 effective FEMA flood plain</span>`;
  if (ls.id === "publand") return `<b style="color:var(--ink)">Public land</b>` + sw("var(--park)", "Park or plaza") + sw("var(--paper)", "Other public land") + `<span>Faded: private land (a unit would need the curb or sidewalk)</span>`;
  if (ls.id === "transit") return `<b style="color:var(--ink)">Transit & mobility</b><span>Bright blocks: a subway station within 150 m, or a bus shelter or Citi Bike dock within 100 m</span>` + [["shel", "#E69F00", "Bus shelter"], ["bike", "#CC79A7", "Citi Bike dock"]].map((x) => `<span><span class="dot" style="background:${x[1]};border:1.5px solid ${x[1]}"></span>${x[2]}</span>`).join("");
  if (ls.id === "vuln") return `<b style="color:var(--ink)">Equity</b><span>Bright blocks: tier set by vulnerable residents or poverty, public housing, or near a drop-in centre</span>`;
  if (ls.id === "reps") return "";
  if (ls.id === "coloc") return `<b style="color:var(--ink)">Nearby public uses</b>` +
    [["seat", "#009E73", "Seating"], ["link", "#0072B2", "LinkNYC kiosk"], ["shel", "#E69F00", "Bus shelter"], ["bike", "#CC79A7", "Citi Bike dock"]].map((x) => `<span><span class="dot" style="background:${x[1]};border:1.5px solid ${x[1]}"></span>${x[2]}</span>`).join("") + `<span>Bright blocks: tier 3+ with 2 or more kinds within 100 m</span>`;
  return "";
}

/* ---------- overlays (drawn after markers; redrawn on zoom) ---------- */
function lensOverlay() {
  if (!gX) return;
  gX.innerHTML = "";
  const X = LX();
  if (!X) return;
  const k = scale();
  if (ls.id === "closed") { v5Overlay(k); return; }
  if (ls.id === "cityprop" || ls.id === "food") { v5cOverlay(k); return; }
  if (ls.id === "coverage") {
    const o = strictO();
    allRest(D).forEach((r) => {
      if (r.t === "User" || r.t === "Subway") return;
      const c = condOf(D, r, o), x = r.x, y = -r.y, R = 7 * k;
      if (c === "out") {
        gX.appendChild(el("rect", { x: x - R, y: y - R, width: 2 * R, height: 2 * R, rx: 2 * k, fill: "var(--cv-out)", stroke: "var(--panel)", "stroke-width": 1.5 * k }));
        gX.appendChild(el("path", { d: `M${x - R * 0.55} ${y - R * 0.55}L${x + R * 0.55} ${y + R * 0.55}M${x + R * 0.55} ${y - R * 0.55}L${x - R * 0.55} ${y + R * 0.55}`, stroke: "#fff", "stroke-width": 2 * k }));
      } else if (c === "planned") gX.appendChild(el("circle", { cx: x, cy: y, r: R, fill: "var(--panel)", stroke: "var(--cv-plan)", "stroke-width": 2.4 * k, "stroke-dasharray": `${3 * k} ${2 * k}` }));
      else if (c === "limited") gX.appendChild(el("circle", { cx: x, cy: y, r: R * 0.85, fill: "var(--cv-lim)", stroke: "var(--panel)", "stroke-width": 1.5 * k }));
      else gX.appendChild(el("circle", { cx: x, cy: y, r: R * 0.85, fill: "var(--cv-ok)", stroke: "var(--panel)", "stroke-width": 1.5 * k }));
    });
    (D._sub || []).forEach((r) =>
      gX.appendChild(el("rect", { x: r.x - 6 * k, y: -r.y - 6 * k, width: 12 * k, height: 12 * k, rx: 2 * k, fill: isCounted(D, r) ? "var(--sub)" : "var(--panel)", stroke: "var(--sub)", "stroke-width": 2.2 * k })),
    );
  }
  if (ls.id === "zoning") {
    X.bids.forEach((bd) => {
      gX.appendChild(el("path", { d: pth(bd.g), fill: "var(--bid)", "fill-opacity": 0.06, stroke: "var(--bid)", "stroke-width": 2.2 * k, "stroke-dasharray": `${6 * k} ${4 * k}`, "fill-rule": "evenodd" }));
      const t = el("text", { x: bd.c[0], y: -bd.c[1], class: "lb bidl", "font-size": 13 * k, "text-anchor": "middle", "stroke-width": 3.4 * k });
      t.textContent = bd.n;
      gX.appendChild(t);
    });
  }
  if (ls.id === "transit") {
    const k2 = k;
    [["shel", "#E69F00"], ["bike", "#CC79A7"]].forEach(([t, c]) => X.pts[t].forEach(([x, y]) => gX.appendChild(el("circle", { cx: x, cy: -y, r: 3.4 * k2, fill: c, stroke: "var(--panel)", "stroke-width": 0.8 * k2 }))));
    (D._sub || []).forEach((r) => gX.appendChild(el("rect", { x: r.x - 6 * k, y: -r.y - 6 * k, width: 12 * k, height: 12 * k, rx: 2 * k, fill: "var(--sub)", stroke: "var(--panel)", "stroke-width": 1.5 * k })));
  }
  if (ls.id === "coloc") {
    const sh = { seat: ["circle", "#009E73", 3.2], link: ["rect", "#0072B2", 3.6], shel: ["tri", "#E69F00", 4.2], bike: ["dia", "#CC79A7", 4] };
    Object.keys(sh).forEach((t) => {
      if (!ls.co[t]) return;
      const [s, c, r0] = sh[t], r = r0 * k;
      X.pts[t].forEach(([x, y]) => {
        let e;
        if (s === "circle") e = el("circle", { cx: x, cy: -y, r });
        else if (s === "rect") e = el("rect", { x: x - r, y: -y - r, width: 2 * r, height: 2 * r });
        else if (s === "tri") e = el("path", { d: `M${x} ${-y - r}L${x + r} ${-y + r}L${x - r} ${-y + r}Z` });
        else e = el("path", { d: `M${x} ${-y - r}L${x + r} ${-y}L${x} ${-y + r}L${x - r} ${-y}Z` });
        e.setAttribute("fill", c);
        e.setAttribute("stroke", "var(--panel)");
        e.setAttribute("stroke-width", 0.8 * k);
        gX.appendChild(e);
      });
    });
  }
  if (ls.id === "maint" && LR.m) {
    const S = ls.m.show === "need" ? LR.m.need : LR.m.ring;
    S.rings.forEach((g, gi) => {
      const col = RING_COL[gi % RING_COL.length], pts = g.tour;
      if (pts.length > 1)
        gX.appendChild(el("path", { d: "M" + pts.map((q) => q[0] + " " + -q[1]).join("L") + "Z", fill: "none", stroke: col, "stroke-width": 3 * k, "stroke-dasharray": `${8 * k} ${5 * k}`, opacity: 0.9 }));
      if (g.hub) gX.appendChild(el("rect", { x: g.hub.x - 7 * k, y: -g.hub.y - 7 * k, width: 14 * k, height: 14 * k, fill: "var(--panel)", stroke: "var(--park)", "stroke-width": 3 * k }));
    });
    S.units.forEach((u, n) => {
      const b = D.blocks[u.i], col = RING_COL[u.ring % RING_COL.length];
      gX.appendChild(el("circle", { cx: b.c[0], cy: -b.c[1], r: 12 * k, fill: col, stroke: "var(--panel)", "stroke-width": 2.5 * k }));
      const t = el("text", { x: b.c[0], y: -b.c[1], "text-anchor": "middle", "dominant-baseline": "central", "font-size": 13 * k, "font-weight": 700, fill: "#fff", "font-family": "var(--body)" });
      t.textContent = n + 1;
      gX.appendChild(t);
    });
  }
}

/* ---------- shared: contacts and nearby uses for one block ---------- */
function nearAssets(K) {
  K = K || D;
  const X = LENS.d[K.id];
  if (!X || X._near) return;
  const R = 100, R2 = R * R;
  // bucket points on a 100 m grid so each block only checks its neighbourhood
  const grid = {};
  Object.keys(X.pts).forEach((t) => X.pts[t].forEach(([x, y]) => {
    const key = Math.floor(x / R) + "," + Math.floor(y / R);
    (grid[key] = grid[key] || []).push([t, x, y]);
  }));
  X._near = K.blocks.map((b) => {
    const c = { seat: 0, link: 0, shel: 0, bike: 0 }, gx = Math.floor(b.c[0] / R), gy = Math.floor(b.c[1] / R);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++)
      (grid[gx + i + "," + (gy + j)] || []).forEach(([t, x, y]) => { if ((x - b.c[0]) ** 2 + (y - b.c[1]) ** 2 <= R2) c[t]++; });
    c.types = ["seat", "link", "shel", "bike"].filter((t) => c[t]).length;
    return c;
  });
}
function nearText(i, K) {
  K = K || D;
  const X = LENS.d[K.id];
  if (!X) return "";
  nearAssets(K);
  const c = X._near[i], parts = [];
  if (c.seat) parts.push(c.seat + " seating");
  if (c.shel) parts.push(c.shel + " bus shelter" + (c.shel > 1 ? "s" : ""));
  if (c.link) parts.push(c.link + " LinkNYC kiosk" + (c.link > 1 ? "s" : ""));
  if (c.bike) parts.push(c.bike + " Citi Bike dock" + (c.bike > 1 ? "s" : ""));
  return parts.length ? parts.join(", ") : "none listed";
}
const phoneFmt = (s) => { const d = String(s || "").replace(/\D/g, ""); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : s || ""; };
const urlFix = (u) => (!u ? "" : /^https?:/.test(u) ? u : "https://" + u);
function contactsHtml(i) {
  const X = LX();
  if (!X) return "";
  const cb = X.cb, cn = X.co[i], bi = X.bid[i], bd = bi >= 0 ? X.bids[bi] : null;
  const rows = [];
  if (cb) rows.push(`<li><b>${esc(cb.n)}</b>${cb.dm ? `, district manager ${esc(cb.dm)}` : ""}. ${esc(cb.ph || "")}${cb.em ? ` · <a href="mailto:${esc(cb.em)}">${esc(cb.em)}</a>` : ""}${cb.web ? ` · <a href="${esc(urlFix(cb.web))}" target="_blank" rel="noopener">website</a>` : ""}${cb.meet ? `<br><span class="small">Board meets: ${esc(cb.meet)}</span>` : ""}</li>`);
  if (cn) rows.push(`<li><b>City Council District ${cn}</b>: <a href="https://council.nyc.gov/district-${cn}/" target="_blank" rel="noopener">council member's page</a></li>`);
  if (X.sen && (X.sen[i] || X.asm[i])) rows.push(`<li>${X.sen[i] ? `<b>State Senate District ${X.sen[i]}</b> (<a href="https://www.nysenate.gov/district/${X.sen[i]}" target="_blank" rel="noopener">senator's page</a>)` : ""}${X.sen[i] && X.asm[i] ? " · " : ""}${X.asm[i] ? `<b>Assembly District ${X.asm[i]}</b> (<a href="https://nyassembly.gov/mem/?ad=${String(X.asm[i]).padStart(3, "0")}" target="_blank" rel="noopener">member's page</a>)` : ""}</li>`);
  if (X.hd && (X.hd[i] >= 0 || X.lm[i] > 0)) rows.push(`<li><b>Landmarks Preservation Commission</b>: ${X.hd[i] >= 0 ? esc(X.hdN[X.hd[i]]) : "a designated landmark lot on this block"}; a unit needs LPC review.</li>`);
  if (bd) rows.push(`<li><b>${esc(bd.n)}</b> (Business Improvement District${bd.yr ? ", since " + esc(bd.yr) : ""})${bd.ph ? ". " + esc(phoneFmt(bd.ph)) : ""}${bd.em ? ` · <a href="mailto:${esc(bd.em)}">${esc(bd.em)}</a>` : ""}${bd.web ? ` · <a href="${esc(urlFix(bd.web))}" target="_blank" rel="noopener">website</a>` : ""}</li>`);
  else rows.push(`<li class="small">Not inside a Business Improvement District.</li>`);
  return `<div class="contacts"><h4 class="sub">Who to contact</h4><ul class="chk2">${rows.join("")}</ul><p class="small">${X.ntaN && X.nta[i] >= 0 ? "Neighborhood: " + esc(X.ntaN[X.nta[i]]) + ". " : ""}Zoning: ${esc(ZTXT(X.z[i]))}${X.sp && X.sp[i] >= 0 ? "; special district " + esc(X.spN[X.sp[i]]) : ""}. Public uses within 100 m: ${esc(nearText(i))}. Contacts are from NYC Open Data and may be out of date.</p></div>`;
}

/* ---------- Maintenance & contracts: service rings ---------- */
function hubs() {
  return allRest(D).filter((r) => r.ok && /Parks/.test(r.op || "") && r.t === "Park" && isCounted(D, r)).map((r) => ({ x: r.x, y: r.y, n: r.n }));
}
function tourOf(pts) {
  // nearest-neighbour loop from the first point (the hub when there is one)
  if (pts.length < 2) return pts.slice();
  const left = pts.slice(1), out = [pts[0]];
  while (left.length) {
    const a = out[out.length - 1];
    let bi = 0, bd = Infinity;
    left.forEach((q, i) => { const d = Math.hypot(q[0] - a[0], q[1] - a[1]); if (d < bd) { bd = d; bi = i; } });
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}
const tourLen = (t) => t.reduce((s, q, i) => s + Math.hypot(q[0] - t[(i + 1) % t.length][0], q[1] - t[(i + 1) % t.length][1]), 0);
function ringPlan(K, x, p) {
  const m = ls.m, H = hubs(), cap = m.shift, speed = (m.kmh * 1000) / 60; // metres a minute
  const units = x.picks.map((i, n) => {
    const v = Math.max(0, x.info[n].added), cl = v / m.every;
    return { i, v, cl, g: x.info[n].g, drv: x.info[n].drv, ring: -1 };
  });
  const rings = [];
  const work = (g) => {
    const pts = (g.hub ? [[g.hub.x, g.hub.y]] : []).concat(g.u.map((u) => K.blocks[u.i].c));
    const t = tourOf(pts), L = tourLen(t) * (p.det || DETOUR);
    const rounds = Math.max(1, Math.ceil(Math.max(...g.u.map((u) => u.cl))));
    const travel = rounds * (L / speed), service = g.u.reduce((s, u) => s + u.cl * m.svc, 0);
    return { tour: t, L, rounds, travel, service, total: travel + service };
  };
  units.forEach((u) => {
    const c = K.blocks[u.i].c;
    let best = -1, bd = Infinity;
    rings.forEach((g, gi) => {
      const d = Math.hypot(g.a[0] - c[0], g.a[1] - c[1]); // distance to the ring's anchor: its hub, or its first unit
      if (d <= m.ringR && d < bd) {
        const w = work({ ...g, u: g.u.concat([u]) });
        if (w.total <= cap * 2) { bd = d; best = gi; } // a ring is what two crew-shifts a day (7am to 10pm) can cover
      }
    });
    if (best < 0) {
      let hb = null, hd = m.ringR;
      H.forEach((h) => { const d = Math.hypot(h.x - c[0], h.y - c[1]); if (d <= hd) { hd = d; hb = h; } });
      rings.push({ u: [u], hub: hb, a: hb ? [hb.x, hb.y] : c });
      best = rings.length - 1;
    } else rings[best].u.push(u);
    u.ring = best;
  });
  let shifts = 0, travel = 0, total = 0;
  const R = rings.map((g) => {
    const w = work(g);
    const s = Math.max(1, Math.ceil(w.total / cap));
    shifts += s; travel += w.travel; total += w.total;
    return { ...w, hub: g.hub, n: g.u.length, shifts: s, visits: g.u.reduce((a, u) => a + u.v, 0) };
  });
  return { units, rings: R, shifts, travelShare: total ? travel / total : 0, visits: units.reduce((a, u) => a + u.v, 0) };
}
function newlyServed(K, picks, p) {
  const a = scoreAll(K, st, [], p), b = scoreAll(K, st, picks, p);
  let n = 0;
  K.blocks.forEach((bl, i) => { if (a[i].cls === 2 && b[i].cls < 2) n += bl.pop; });
  return n;
}
function maintRun(p) {
  const n = ls.m.n, H = hubs();
  const needX = pickSites(D, st, n, p);
  // Ring-aware: the same tiers in the same order, but within a tier prefer a block inside a ring (near a Parks hub or a unit
  // already picked). It never takes a lower tier over a higher one.
  const near = (i, picks) => {
    // 0..1: how close the block is to the service network. An already-picked unit counts fully, a Parks hub at 60%.
    const c = D.blocks[i].c, R = ls.m.ringR;
    let dp = Infinity, dh = Infinity;
    picks.forEach((j) => (dp = Math.min(dp, Math.hypot(D.blocks[j].c[0] - c[0], D.blocks[j].c[1] - c[1]))));
    H.forEach((h) => (dh = Math.min(dh, Math.hypot(h.x - c[0], h.y - c[1]))));
    return Math.max(Math.max(0, 1 - dp / R), 0.6 * Math.max(0, 1 - dh / R));
  };
  const ringX = pickSites(D, st, n, p, near);
  const pack = (x) => ({ x, ...ringPlan(D, x, p), served: newlyServed(D, x.picks, p) });
  return { need: pack(needX), ring: pack(ringX), hubs: H.length };
}
const MODULES = [
  ["Cleaning every " + 12 + " uses, set by door counts; restock and minor repair", "Base"],
  ["Extra cleaning rounds at peak hours; cleaning-first service level", "Foot traffic"],
  ["Changing table, grab bars and a longer time limit; level step-free entry", "Vulnerable residents"],
  ["Entry without a smartphone or card; a paid steward during peak hours", "Poverty"],
  ["Lighting and a paid steward; 311 follow-up reporting", "Complaints"],
];
function scopeFor(drv) {
  return [MODULES[0]].concat(drv >= 0 ? [MODULES[drv + 1]] : []);
}

