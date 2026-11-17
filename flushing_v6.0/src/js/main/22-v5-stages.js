/* ================= v5 stages 2-7 (HANDOFF_v5.md). Data embedded by edits_v5.py: CCAL, ROAD, PIPE, ZAP ================= */
const pc1 = (v, d = 1) => (v * 100).toFixed(d) + "%";
const CITY4 = { w5: 0.275, w10: 0.799, w20: 0.985, road5: 0.203, road10: 0.66, road20: 0.941 }; // LL58 report, Table 4, p. 8
const CITY5 = { Global: [0.6, 58.2, 99.9], Regional: [3.2, 44.9, 97.4], Neighborhood: [15.9, 39.0, 85.0], Community: [24.6, 28.6, 77.2], Baseline: [55.6, 12.3, 57.0] }; // Table 5, p. 9
const CITY9 = { ag: 326, mf: 35, cs: 754 }; // Table 9, p. 14

/* ---- stage 2: the headline, on the City's own list ---- */
function headlineHtml() {
  const c = CCAL, X = 1 - c.best.within_10_min / 100, live = RLIST !== "nov";
  return `<p class="hl"><b>The City finds 20.1% of New Yorkers beyond a 10-minute walk of a public restroom</b> (LL58 report, p. 8). On the same restroom list, the sandbox finds <b>${pc1(X)}</b>; counting only restrooms open today, year-round and fully accessible, <b>${pc1(c.strict.share)}</b>. <a href="#numbers" data-tab="numbers">Why the figures differ</a>.${live ? ` <span class="small">(Figures are for the City list of ${dmy(RL().nov.asOf)}; the map now uses another list.)</span>` : ""}</p>`;
}
function cityCompareHtml() {
  const c = CCAL, b = c.best, cats = ROAD.cats, tot = Object.values(cats).reduce((a, v) => a + v[0], 0);
  const roadAll = [1, 2, 3].map((k) => Object.values(cats).reduce((a, v) => a + v[k], 0) / tot);
  const rows5 = Object.entries(CITY5).map(([k, cv]) => { const v = cats[k]; const s = [v[0] / tot * 100, v[1] / v[0] * 100, v[2] / v[0] * 100]; const gap = Math.max(Math.abs(s[1] - cv[1]), Math.abs(s[2] - cv[2])); return `<tr><td>${k}</td><td class="n">${cv[0].toFixed(1)}%</td><td class="n">${s[0].toFixed(1)}%</td><td class="n">${cv[1].toFixed(1)}%</td><td class="n">${s[1].toFixed(1)}%</td><td class="n">${cv[2].toFixed(1)}%</td><td class="n">${s[2].toFixed(1)}%${gap > 5 ? ' <span class="nchip mid">gap ' + gap.toFixed(1) + "</span>" : ""}</td></tr>`; }).join("");
  return `<h3 class="sp" id="citycmp">Matching the City's numbers (LL58 report, Tables 4 and 5)</h3>
<p>The City's report measures walks on a street network (Parks' Vital Parks Explorer) to the restrooms on its list run by Parks, DOT, libraries, POPS and some MTA transit, whatever the season or hours (p. 8). The sandbox walks a straight line × a detour factor at a set speed. The <b>City-comparable</b> setting is the one closest to all three of the City's figures in a grid of ${c.gridRows || 72} settings (<code>city_comparable_calibration__v5.csv</code>): every row of the City's list except Future rows counts, closed rows included, Port Authority and Hudson River Park left out as in the City's analysis, ${b.speed_m_per_min} m a minute, detour ${b.detour}.</p>
<div class="tw"><table class="t"><thead><tr><th>Residents within a walk of a restroom</th><th>5 min</th><th>10 min</th><th>20 min</th></tr></thead><tbody>
<tr><td>City, LL58 report Table 4 (p. 8)</td><td class="n">27.5%</td><td class="n">79.9%</td><td class="n">98.5%</td></tr>
<tr><td>Sandbox, City-comparable</td><td class="n">${b.within_5_min.toFixed(1)}%</td><td class="n">${b.within_10_min.toFixed(1)}%</td><td class="n">${b.within_20_min.toFixed(1)}%</td></tr>
<tr><td>Road mileage: City / sandbox</td><td class="n">20.3% / ${pc1(roadAll[0])}</td><td class="n">66.0% / ${pc1(roadAll[1])}</td><td class="n">94.1% / ${pc1(roadAll[2])}</td></tr></tbody></table></div>
<p><b>Why the sandbox and the City differ</b> (beyond 10 minutes: City 20.1%, sandbox ${pc1(1 - b.within_10_min / 100)}). No single detour factor matches all three walk bands, because a street network does not scale a straight line evenly.</p>
<div class="tw"><table class="t"><thead><tr><th>Difference</th><th>City</th><th>Sandbox</th></tr></thead><tbody>
<tr><td>Walking distance</td><td>Street network (Vital Parks Explorer)</td><td>Straight line × ${b.detour}; open water blocks a walk</td></tr>
<tr><td>Speed</td><td>Not stated (asked of Parks)</td><td>${b.speed_m_per_min} m a minute</td></tr>
<tr><td>Who is counted</td><td>Not stated for Table 4 (the report's population tables use the 2024 ACS 5-year)</td><td>2020 census block residents (${c.pop.toLocaleString()}), at block centres</td></tr>
<tr><td>Restrooms</td><td>Parks, DOT, libraries, POPS, some MTA; no State or federal</td><td>Every row of the City list except Future rows; Port Authority and Hudson River Park out</td></tr>
<tr><td>Hours and seasons</td><td>Ignored</td><td>Ignored in this setting; the map's own default counts operating restrooms only</td></tr></tbody></table></div>
<h3 class="sp">Road mileage by DOT corridor (City Table 5, p. 9)</h3>
<p>The City also measures coverage along streets, sorted by DOT's five street types, from the busiest (Global, such as Times Square) to the quietest (Baseline, most side streets). The sandbox does the same: it takes the middle point of each of DOT's ${(ROAD.n || 127277).toLocaleString()} street pieces and walks from there to the nearest restroom, on the City-comparable setting.</p>
<p>How to read the table: "Share of streets" is how much of the city's street length is of that type, and the two columns agree almost exactly, which shows both sides are measuring the same streets. The 5- and 10-minute columns are the share of that street length within a 5- or 10-minute walk of a restroom. The sandbox is within 5 points of the City except where a gap is marked.</p>
<div class="tw"><table class="t"><thead><tr><th>Street type</th><th>Share of streets: City</th><th>Sandbox</th><th>Within 5 min: City</th><th>Sandbox</th><th>Within 10 min: City</th><th>Sandbox</th></tr></thead><tbody>${rows5}</tbody></table></div>
<p class="small">The biggest difference is on Baseline (quiet residential) streets at 10 minutes: those streets are often in big blocks with few ways through, where one detour factor fits least well. Only the middle point of each street piece is tested, not its whole length.</p>`;
}

/* ---- stage 3: closed restrooms, funded reopenings, the pipeline and a 2030 network ---- */
function closedOf(K, p) {
  const seen = new Set(), R = [];
  K.rest.forEach((r) => { if (r.li != null && r.cd && r.cd[0] === K.id && !seen.has(r.li)) { seen.add(r.li); R.push(r); } });
  const c = { listed: R.length, no: 0, cc: 0, cl: 0, rows: R.filter((r) => r.st && r.st !== "Operational") };
  R.forEach((r) => { if (r.st === "Not Operational") c.no++; else if (r.st === "Closed for Construction") c.cc++; else if (r.st === "Closed") c.cl++; });
  const L = K.rest.filter((r) => r.li != null && r.op4 !== "Future"), det = p.det || DETOUR;
  let pop = 0, paper = 0, lose = 0; const pb = new Set();
  K.blocks.forEach((b, i) => {
    if (!b.pop) return; pop += b.pop;
    let bA = Infinity, bO = Infinity, nc = false;
    L.forEach((r) => { const d = Math.hypot(r.x - b.c[0], r.y - b.c[1]); if (d < bA && !cross(K, b, r, st)) { bA = d; nc = r.st !== "Operational"; } if (r.st === "Operational" && d < bO && !cross(K, b, r, st)) bO = d; });
    if (nc && isFinite(bA)) { paper += b.pop; pb.add(i); }
    if ((bA * det) / p.speed <= p.T && !((bO * det) / p.speed <= p.T)) lose += b.pop;
  });
  return { ...c, pop, paper, lose, pb };
}
const FUNDED = {}; // filled when Parks shares the 16 funded reopenings (LL58 report p. 5); until then "unknown"
const fundedTxt = (r) => (FUNDED[r.n] === 1 ? "funded" : FUNDED[r.n] === 0 ? "not funded" : /Parks/.test(r.op || "") ? "unknown (ask Parks)" : "–");
const PIPE_BUILT = /^(approved|in progress)$/;
const pipeIn = (K) => PIPE.filter((q) => q[7] !== "").map((q) => { const [x, y] = toXY(prep(K), +q[8], +q[7]); return { q, x, y }; }).filter((o) => o.x > K._B[0] - 300 && o.x < K._B[2] + 300 && o.y > K._B[1] - 300 && o.y < K._B[3] + 300);
function beyondPipe(K, p, withPipe) {
  const R = counted(K, st, []);
  if (withPipe) pipeIn(K).forEach((o, i) => { if (PIPE_BUILT.test(o.q[5])) R.push({ x: o.x, y: o.y, n: o.q[2], _k: "pp" + i }); });
  let n = 0; K.blocks.forEach((b) => { const r = calc(K, b, R, p, st); if (!(r.walk <= p.T)) n += b.pop; });
  return n;
}
function panelClosed(box, X, p) {
  const c = LR.closed, pi = pipeIn(D), now = beyondPipe(D, p, false), y30 = beyondPipe(D, p, true);
  const nm = D.name.split(" · ")[0], sc = (s) => (s === "approved" ? "var(--g5)" : s === "in progress" ? "var(--g4)" : s === "planned" ? "var(--g3)" : s === "no longer feasible" ? "var(--muted)" : "var(--g2)");
  box.innerHTML = `<h3>Closed and planned restrooms · ${esc(nm)}</h3>
<div class="stat"><div><b>${c.no + c.cc + c.cl} of ${c.listed}</b><span>listed restrooms here are not operational, closed for construction or closed (${c.listed ? pc1((c.no + c.cc + c.cl) / c.listed, 0) : "–"})</span></div><div><b>${n0(c.paper)}</b><span>residents whose nearest listed restroom is closed ("served on paper only")</span></div><div><b>${n0(c.lose)}</b><span>residents beyond ${p.T} minutes while those stay closed</span></div><div><b>${n0(now)} → ${n0(y30)}</b><span>residents beyond ${p.T} minutes now, and in a 2030 network with approved and in-progress sites built</span></div></div>
<p class="small">Shaded blocks: the nearest listed restroom is closed. Parks has 71 non-operational restrooms and funded capital projects for 16 (LL58 report, p. 5); which 16 is not public yet, so funding reads "unknown" until Parks shares the list. Tiers do not change in this view.</p>
${c.rows.length ? `<div class="tw"><table class="mlist"><thead><tr><th>Closed restroom</th><th>Status (City list)</th><th>Operator</th><th>Funded reopening</th></tr></thead><tbody>${c.rows.map((r) => `<tr><td>${esc(r.n)}</td><td>${esc(r.st)}</td><td>${esc(r.op)}</td><td>${fundedTxt(r)}</td></tr>`).join("")}</tbody></table></div>` : "<p>No closed restrooms are listed in this district.</p>"}
<h4 class="sub">Planned restrooms near this district (LL114/2022 sites, LL58 report Appendix A, and DOT's APT alternates)</h4>
${pi.length ? `<div class="tw"><table class="mlist"><thead><tr><th>Site</th><th>Entity</th><th>Status</th><th>Note</th></tr></thead><tbody>${pi.map((o) => `<tr><td><i class="chip" style="background:${sc(o.q[5])}"></i>${esc(o.q[2])}</td><td>${esc(o.q[3])}</td><td>${esc(o.q[5])}</td><td class="small">${esc(o.q[10] || "")}</td></tr>`).join("")}</tbody></table></div>` : "<p>No planned restrooms in or near this district.</p>"}
<p class="small">Parks' 41 funded new builds and DOT's other planned APT sites are not public yet.</p>`;
}

/* ---- stage 4: zoning routes, open land-use actions, one vocabulary ---- */
const ZGLOSS = {
  R: ["Residential", "A residential district (R1–R10). Homes are the main use; a public restroom is not a listed use (LL58 report, p. 24)."],
  RC: ["Residential with shops on the ground floor", "A residential district with a C1 or C2 commercial overlay: shops are allowed on the ground floor along this street, usually the first 100–200 ft. It is zoned differently from a full commercial district."],
  C: ["Commercial", "A commercial district (C1–C8): commercial use covers the whole lot and is the main use. Public restrooms are not listed as a permitted use here; DCP will review this (LL58 report, p. 24)."],
  M: ["Manufacturing", "A manufacturing district (M1–M3): industry and some commercial uses."],
  X: ["Mixed", "A mix of the families above on the same block."],
  N: ["No zoned lots", "Street, park or water: no zoning lot on this block."],
};
const zFam = (z) => { if (!z) return "N"; const f = [z & 2 ? "RC" : z & 1 ? "R" : "", z & 4 ? "C" : "", z & 8 ? "M" : ""].filter(Boolean); return f.length > 1 ? "X" : f[0]; };
function zRoute(K, b, z) {
  if ((b.lt || 0) === 1) return ["park", "Park or public place: no zoning question; Parks or Public Design Commission review"];
  if (b.sw != null && b.sw >= SIDEWALK_FT) return ["sidewalk", "Sidewalk: a DOT franchise or revocable consent" + (!(z & 2) && !(z & 4) && !(z & 8) ? "; an automatic toilet also needs commercial, manufacturing or mixed-use zoning (Street Design Manual)" : "")];
  if ((b.lt || 0) === 2) return ["public", "Other public land: agency approval (DCAS or the owning agency); no zoning question for City use"];
  if (z & 4 || z & 2) return ["czone", "Zoning lot in a commercial district or a C1/C2 overlay: needs a zoning change or a DCP interpretation (LL58 report, p. 24)"];
  if (z & 1) return ["rzone", "Zoning lot in a residential district: not a listed use; needs a zoning action"];
  if (z & 8) return ["mzone", "Zoning lot in a manufacturing district: not addressed in the City's report"];
  return ["none", "No zoning lot"];
}
const zLabel = (r) => r[1] + (r[0] === "czone" || r[0] === "rzone" || r[0] === "mzone" ? " · per the City's report; DCP to confirm" : "");
const zapKey = (b) => { const id = String(b.id || ""); const co = { "005": "2", "047": "3", "061": "1", "081": "4", "085": "5" }[id.slice(2, 5)]; return co ? [co + id.slice(5, 11), id.slice(11, 15)] : null; };
function zapOf(b) {
  const k = zapKey(b); if (!k) return [];
  const t = ZAP.tr[k[0]]; if (!t) return [];
  const e = t.find((s) => s.split(":")[0] === k[1]); if (!e) return [];
  return e.split(":")[1].split(".").map((i) => ZAP.proj[+i]);
}
const ZSTAT = { F: "filed", N: "noticed", R: "in public review", C: "completed in the last 3 years" };
const zapTxt = (p) => `<a href="https://zap.planning.nyc.gov/projects/${esc(p[0])}">${esc(p[1].trim())}${p[1].length >= 34 ? "…" : ""}</a>${p[2] ? " · " + esc(p[2]) : ""} · ${ZSTAT[p[3]]}`;
// Shortlist rows for one district (only zoning and land-use eligibility; no trade-off against cost, upkeep or sidewalk width).
function zoningRows(K, res, X) {
  const out = [];
  K.blocks.forEach((b, i) => {
    const r = res[i]; if (r.g < 1) return;
    const z = X && X.z ? X.z[i] : 0, rt = zRoute(K, b, z);
    if (rt[0] === "rzone" || rt[0] === "none") return;
    const zp = zapOf(b);
    out.push({ block: place(b), district: K.name.split(" · ")[0], tier: r.g, deciding_factor: r.drv >= 0 ? DRV[r.drv] : "", residents_beyond_walk: r.cls === 2 ? b.pop : 0, people_on_foot: Math.round(r.U || 0), zoning: ZGLOSS[zFam(z)][0], overlay: z & 2 ? "C1/C2" : "", route: rt[1], open_land_use_action: zp.map((p) => p[1].trim() + (p[2] ? " (" + p[2] + ")" : "") + ", " + ZSTAT[p[3]]).join("; "), bid: X && X.bid && X.bid[i] >= 0 ? (X.bids[X.bid[i]] || {}).n || "" : "", council_district: X && X.co ? X.co[i] || "" : "", _r: rt[0], _g: r.g, _gap: r.cls === 2 });
  });
  return out.sort((a, b) => b.tier - a.tier || b.residents_beyond_walk - a.residents_beyond_walk || b.people_on_foot - a.people_on_foot);
}
// Policy routes: a citywide text change would open the C and C1/C2 tier 4-5 gap blocks (N); park, plaza, public-land and sidewalk blocks can move now (M).
const policyCount = (rows) => ({ N: rows.filter((r) => r._g >= 4 && r._gap && r._r === "czone").length, M: rows.filter((r) => r._g >= 4 && r._gap && /^(park|sidewalk|public)$/.test(r._r)).length });
function panelZroute(box, X, p) {
  const rows = zoningRows(D, RES, X), pc = policyCount(rows), fam = {};
  D.blocks.forEach((b, i) => { const f = zFam(X.z ? X.z[i] : 0); fam[f] = (fam[f] || 0) + 1; });
  const zp = new Map(); D.blocks.forEach((b) => zapOf(b).forEach((q) => zp.set(q[0], q)));
  box.innerHTML = `<h3>Zoning routes · ${esc(D.name.split(" · ")[0])}</h3>
<div class="stat"><div><b>${pc.N}</b><span>tier 4–5 gap blocks a citywide text change could open (restrooms as a listed use in C and C1/C2 zoning)</span></div><div><b>${pc.M}</b><span>tier 4–5 gap blocks that can move now: park, plaza, public land or a wide sidewalk</span></div><div><b>${zp.size}</b><span>open or recent land-use applications (ZAP) touch this district's blocks</span></div></div>
<p class="small">The City's report says zoning does not list public bathrooms as a permitted use in commercial districts, and DCP will review this (p. 24). Routes below follow that reading; DCP to confirm. Flags only: tiers do not change.</p>
<div class="tw"><table class="t"><thead><tr><th>Zoning (same words in every district)</th><th>Blocks</th><th>What it means</th></tr></thead><tbody>${Object.entries(ZGLOSS).filter(([k]) => fam[k]).map(([k, v]) => `<tr><td><b>${v[0]}</b></td><td class="n">${fam[k]}</td><td class="small">${v[1]}</td></tr>`).join("")}</tbody></table></div>
${zp.size ? `<h4 class="sub">Open land-use applications here</h4><ul class="small">${[...zp.values()].slice(0, 12).map((q) => `<li>${zapTxt(q)}</li>`).join("")}</ul><p class="small">A restroom can be added to an open process. Source: ZAP (<code>hgx4-8ukb</code>, <code>2iga-a6mk</code>), joined to blocks through PLUTO.</p>` : ""}
<h4 class="sub">Zoning shortlist (no balancing act): top 12</h4>
<div class="tw"><table class="mlist"><thead><tr><th>Block</th><th>Tier</th><th>Zoning</th><th>Route</th><th>Open action</th></tr></thead><tbody>${rows.slice(0, 12).map((r) => `<tr><td>${esc(r.block)}</td><td>${r.tier}${r.deciding_factor ? " (" + esc(r.deciding_factor) + ")" : ""}</td><td>${esc(r.zoning)}${r.overlay ? " + " + r.overlay : ""}</td><td class="small">${esc(r.route)}</td><td class="small">${esc(r.open_land_use_action || "–")}</td></tr>`).join("")}</tbody></table></div>
<p class="small">Citywide list and the per-borough counts: <a href="#shortlists" data-tab="shortlists">Shortlists</a>.</p>`;
}

/* ---- stage 5: Parks management geography, cost, type and approvals ---- */
// NYC Parks Districts (mebz-ditc, updated 2026-10-03): each Parks district follows a community board; a sector groups districts
// to share daily maintenance. Blocks take the district of their community district; large parks have their own districts.
const PARKSD = {"B-01":"B-S1","B-02":"B-S2","B-03":"B-S3.4","B-04":"B-S3.4","B-05":"B-S5.16","B-06":"B-S6.7","B-07":"B-S6.7","B-08":"B-S8.9","B-09":"B-S8.9","B-10":"B-S10.12","B-11":"B-S11.15","B-12":"B-S10.12","B-13":"B-S13","B-14":"B-S14.19","B-15":"B-S11.15","B-16":"B-S5.16","B-17":"B-S17.18","B-18":"B-S17.18","M-01":"M-S1.2","M-02":"M-S1.2","M-03":"M-S3","M-04":"M-S4.5","M-05":"M-S4.5","M-06":"M-S6.8.15","M-07":"M-S7.9","M-08":"M-S6.8.15","M-09":"M-S7.9","M-10":"M-S10.11","M-11":"M-S10.11","M-12":"M-S12.12A","Q-01":"Q-S1.2","Q-02":"Q-S1.2","Q-03":"Q-S3.4","Q-04":"Q-S3.4","Q-05":"Q-S5.6","Q-06":"Q-S5.6","Q-07":"Q-S7","Q-08":"Q-S8.9","Q-09":"Q-S8.9","Q-10":"Q-S10.12","Q-11":"Q-S11.13","Q-12":"Q-S10.12","Q-13":"Q-S11.13","Q-14":"Q-S14","R-01":"R-S1","R-02":"R-S2.2B","R-03":"R-S3","X-01":"X-S1.2","X-02":"X-S1.2","X-03":"X-S3.6","X-04":"X-S4.5","X-05":"X-S4.5","X-06":"X-S3.6","X-07":"X-S7.8","X-08":"X-S7.8","X-09":"X-S9.10","X-10":"X-S9.10","X-11":"X-S11.12.14","X-12":"X-S11.12.14"};
const BLET = { 1: "M", 2: "X", 3: "B", 4: "Q", 5: "R" }, BNAME = { 1: "Manhattan", 2: "Bronx", 3: "Brooklyn", 4: "Queens", 5: "Staten Island" };
function parksOf(K) { const id = String(K.id); if (!/^[1-5]\d\d$/.test(id)) return null; const d = BLET[id[0]] + "-" + id.slice(1); return { d, s: PARKSD[d] || "–", region: BNAME[id[0]] }; }
const parksTxt = (K) => { const q = parksOf(K); return q ? `Parks district ${q.d}, sector ${q.s}` : ""; };
function v5Site(K, b, r, ok, visit, ap) {
  const X = typeof LENS === "object" && LENS.d[K.id], z = X && X.z && b._i != null ? X.z[b._i] : 0, rt = zRoute(K, b, z);
  ok.push([rt[0] === "rzone" || rt[0] === "mzone" ? 0 : 1, "Approval route: " + zLabel(rt).replace(": ", ", ")]);
  zapOf(b).forEach((p) => ok.push([1, "Inside an open land-use application: " + zapTxt(p)]));
  const near = pipeIn(K).find((o) => Math.hypot(o.x - b.c[0], o.y - b.c[1]) <= 400);
  if (near) ok.push([0, `Already planned nearby: ${esc(near.q[2])} (${esc(near.q[5])}) within 400 m`]);
  const pk = parksTxt(K); if (pk) ok.push([1, pk]);
  const apt = (b.lt || 0) === 0 && b.sw != null && b.sw >= SIDEWALK_FT && ((z & 2) || (z & 4) || (z & 8));
  if (apt) {
    ok.push([0, "Automatic toilet: needs water, sewer and power, and clear space below ground (below-ground clearance unknown until a site visit). Units 9–20 are paid by JCDecaux up to $400,000; units 21–40 by the City (LL58 report, p. 17)"]);
    ["Council Member", "Speaker's Office", "Mayor's Office"].forEach((a) => { if (!ap.includes(a)) ap.push(a); });
  }
  const res = typeof RES !== "undefined" && K === D && b._i != null ? RES[b._i] : null;
  if (res && res.drv >= 0 && /urination|homeless|drop-in|complaint/i.test(DRV[res.drv] + " " + (res.dropin ? "drop-in" : ""))) ok.push([1, "Suggested upkeep: an attended model, like San Francisco's Pit Stop (LL58 report, p. 30)"]);
}
function siteNeeds(K, b) {
  const lt = b.lt || 0, wide = b.sw != null && b.sw >= SIDEWALK_FT;
  return lt === 1 ? "Space for a small building on public land → a modular building, or a Throne unit while it is planned" : wide ? "Water, sewer, power, a clear sidewalk and clear space below ground → an automatic toilet or a Portland Loo; if any is missing → a Throne unit (off-grid)" : "None of these known → a Throne unit (off-grid)";
}

/* ---- stage 7: is this an area of identified need? (LL58 report p. 24) ---- */
function areaNeedHtml(i) {
  if (i == null || !RES || !RES[i]) return "";
  const b = D.blocks[i], r = RES[i], X = LX(), z = X && X.z ? X.z[i] : 0, rt = zRoute(D, b, z);
  const pi = pipeIn(D).map((o) => [Math.hypot(o.x - b.c[0], o.y - b.c[1]), o.q]).sort((a, c) => a[0] - c[0])[0];
  const need = r.g >= 4 && r.cls === 2, ans = need ? "Yes" : r.g >= 3 ? "Partly" : "No";
  const walk = isFinite(r.walk) ? `${mins(r.walk)} min` : "none within reach";
  const why = r.g === 0 ? `A restroom is ${walk} away, so this block is already served.`
    : need ? `Tier ${r.g} and more than a 10-minute walk from a restroom.`
    : r.cls === 2 ? `More than a 10-minute walk from a restroom, but only tier ${r.g}.`
    : `Tier ${r.g}, but a restroom is ${walk} away.`;
  const dist = (m) => (m < 1000 ? Math.round(m / 10) * 10 + " m" : (m / 1000).toFixed(1) + " km");
  const q = parksOf(D), row = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : "");
  const route = rt[1].split(/: |; /);
  return `<div class="aon ${need ? "yes" : "no"}"><b>Area of identified need? ${ans}</b><p>${esc(why)}</p><dl>`
    + row("Need tier", r.g === 0 ? "Served (no tier)" : `Tier ${r.g}` + (r.drv >= 0 ? `, set by ${esc(DRV[r.drv])}` : ""))
    + row("Nearest restroom", (r.nm ? esc(r.nm) + ", " : "") + walk)
    + row("Nearest planned site", pi ? `${esc(pi[1][2])}, ${dist(pi[0])} (${esc(pi[1][5])})` : "None listed")
    + row("Approval route", esc(route[0]) + (route[1] ? ": " + esc(route[1]) : "") + (/zone$/.test(rt[0]) ? ". DCP to confirm." : ""))
    + row("Parks district", q ? `${esc(q.d)}, sector ${esc(q.s)}` : "")
    + row("Suggested unit", esc(siteCheck(D, b).type))
    + `</dl></div>`;
}

/* ---- citywide tables for Shortlists: closed by district, zoning shortlist, CD rollup ---- */
function closedAll(p) {
  return DATA.order.filter((id) => DATA.d[id]).map((id) => { const K = prep(DATA.d[id]), c = closedOf(K, p), cl = c.no + c.cc + c.cl;
    return { district: K.name.split(" · ")[0], cd: id, listed: c.listed, not_operational: c.no, closed_for_construction: c.cc, closed: c.cl, share_closed: c.listed ? +(cl / c.listed * 100).toFixed(1) : 0, closed_per_100k: c.pop ? +(cl / c.pop * 1e5).toFixed(1) : 0, residents_served_on_paper_only: c.paper, residents_beyond_walk_while_closed: c.lose }; })
    .sort((a, b) => b.residents_beyond_walk_while_closed - a.residents_beyond_walk_while_closed);
}
function zoningAll(p) {
  const all = [], byB = {};
  DATA.order.filter((id) => DATA.d[id]).forEach((id) => { const K = prep(DATA.d[id]), X = LENS.d[id], res = scoreAll(K, st, [], p), rows = zoningRows(K, res, X), pc = policyCount(rows), bo = BNAME[String(id)[0]] || "Other";
    const o = (byB[bo] = byB[bo] || { borough: bo, text_change_opens_N: 0, site_by_site_now_M: 0 }); o.text_change_opens_N += pc.N; o.site_by_site_now_M += pc.M; all.push(...rows); });
  all.sort((a, b) => b.tier - a.tier || b.residents_beyond_walk - a.residents_beyond_walk || b.people_on_foot - a.people_on_foot);
  return { rows: all.map(({ _r, _g, _gap, ...x }, k) => ({ rank: k + 1, ...x })), boroughs: Object.values(byB) };
}
function cdRollup(p) {
  const cl = Object.fromEntries(closedAll(p).map((r) => [r.cd, r]));
  return DATA.order.filter((id) => DATA.d[id]).map((id) => {
    const K = prep(DATA.d[id]), X = LENS.d[id], res = scoreAll(K, st, [], p), pc = policyCount(zoningRows(K, res, X)), cc = CCAL.byCd[id] || {}, rd = ROAD.cd[id] || [0, 0, 0], pk = parksOf(K) || {};
    let gap45 = 0; res.forEach((r) => { if (r.g >= 4 && r.cls === 2) gap45++; });
    return { cd: id, district: K.name.split(" · ")[0], residents: cc.pop || 0, residents_within_5: cc.w5 || 0, residents_within_10: cc.w10 || 0, residents_within_20: cc.w20 || 0, high_demand_road_miles: rd[0], road_miles_within_5: rd[1], road_miles_within_10: rd[2], closed_restrooms: cl[id] ? cl[id].not_operational + cl[id].closed_for_construction + cl[id].closed : 0, tier45_gap_blocks: gap45, zoning_text_change_N: pc.N, zoning_site_by_site_M: pc.M, parks_district: pk.d || "", parks_sector: pk.s || "" };
  });
}
// A one-file choropleth of the 59 districts, shaded by one column of a table.
function cdMap(rows, key) {
  const v = Object.fromEntries(rows.map((r) => [r.cd, r[key]])), vals = rows.map((r) => r[key]).sort((a, b) => a - b), q = (x) => vals.length ? Math.min(5, 1 + Math.floor((vals.filter((y) => y < x).length / vals.length) * 5)) : 1;
  const KX = 84300, KY = 110574, X0 = -74.26, Y1 = 40.92; let paths = "";
  DATA.order.filter((id) => DATA.d[id]).forEach((id) => { const K = DATA.d[id], kx = 111320 * Math.cos((K.o[1] * Math.PI) / 180), ky = 110574;
    const d = (K.cd || []).filter((r) => r.length > 5).map((r) => "M" + r.reduce((a, c, i) => (i % 2 ? a : a.concat([[((K.o[0] + c / kx - X0) * KX) / 100, ((Y1 - (K.o[1] + r[i + 1] / ky)) * KY) / 100]])), []).map((p) => p[0].toFixed(0) + " " + p[1].toFixed(0)).join("L") + "Z").join("");
    paths += `<path d="${d}" fill="var(--g${v[id] != null ? q(v[id]) : 0})" stroke="var(--panel)" stroke-width="3"><title>${esc(K.name.split(" · ")[0])}: ${v[id]}</title></path>`; });
  return `<svg class="cdmap" viewBox="0 0 640 480" role="img" aria-label="Community districts shaded by ${esc(colLabel(key))}">${paths}</svg><p class="small">Shaded by ${esc(colLabel(key))}, in fifths (darker = higher).</p>`;
}
function v5Lists() {
  const p = P(), mk = (rows) => { const cols = Object.keys(rows[0] || {}); return `<div class="tw"><table class="mlist"><thead><tr>${cols.map((c) => `<th>${esc(colLabel(c))}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; };
  $("slClB").onclick = () => { $("slCl").innerHTML = "<p class='small'>Counting every district…</p>"; setTimeout(() => { const rows = closedAll(p), t = rows.reduce((a, r) => (["listed", "not_operational", "closed_for_construction", "closed"].forEach((k) => (a[k] = (a[k] || 0) + r[k])), a), {});
    $("slCl").innerHTML = `<p><b>Citywide: ${t.not_operational} not operational, ${t.closed_for_construction} closed for construction, ${t.closed} closed (${t.not_operational + t.closed_for_construction + t.closed} of ${t.listed})</b>, as in the LL58 report's Table 7.</p>` + cdMap(rows, "residents_beyond_walk_while_closed") + mk(rows) + `<div class="btnrow"><button class="btn" id="slClCsv">Save closed_by_cd (CSV)</button></div>`;
    $("slClCsv").onclick = () => download("closed_by_cd__v5.csv", csvOf(rows), "text/csv"); }, 30); };
  $("slZoB").onclick = () => { $("slZo").innerHTML = "<p class='small'>Scoring every district…</p>"; setTimeout(() => { const z = zoningAll(p);
    $("slZo").innerHTML = `<h4 class="sub">Policy routes, by borough</h4>${mk(z.boroughs)}<p class="small"><b>N</b>: tier 4–5 gap blocks in C or C1/C2 zoning that a citywide text change (restrooms as a listed use, or a bonus like the POPS rules) would open. <b>M</b>: tier 4–5 gap blocks that can move now on a park, plaza, public land or a wide sidewalk.</p><h4 class="sub">Top 50</h4>${mk(z.rows.slice(0, 50))}<div class="btnrow"><button class="btn" id="slZoCsv">Save zoning_shortlist (CSV, all ${z.rows.length})</button></div>`;
    $("slZoCsv").onclick = () => download("zoning_shortlist__v5.csv", csvOf(z.rows), "text/csv"); }, 30); };
  $("slRuB").onclick = () => { $("slRu").innerHTML = "<p class='small'>Building the rollup…</p>"; setTimeout(() => { const rows = cdRollup(p); $("slRu").innerHTML = mk(rows) + `<div class="btnrow"><button class="btn" id="slRuCsv">Save cd_rollup (CSV)</button></div>`; $("slRuCsv").onclick = () => download("cd_rollup__v5.csv", csvOf(rows), "text/csv"); }, 30); };
}

/* ---- stage 6: the LL58 factors and the equity counts ---- */
function equityCounts() {
  const seen = new Set(), c = { ag: 0, mf: 0, cs: 0, n: 0 };
  DATA.order.forEach((id) => { const K = DATA.d[id], ra = LENS.d[id] && LENS.d[id].ra; (K._rn || K.rest).forEach((r, i) => { if (r.li == null || seen.has(r.li)) return; seen.add(r.li); c.n++; const a = (ra && ra[i]) || []; if (a[1] === 1) c.ag++; if (r.mf === 1) c.mf++; if (a[0] >= 1) c.cs++; }); });
  return c;
}
function factorsHtml() {
  const e = equityCounts(), F = [
    ["Population density", "Residents per block (2020 census) set who is counted; vulnerable residents and poverty set tiers.", "Covered"],
    ["Daily foot traffic", "DOT Pedestrian Mobility Plan street class and subway entries set the foot-traffic rating; DOT peak counts break ties.", "Covered (peak, not 24-hour)"],
    ["Public transportation routes", "Subway stations within 150 m set foot traffic; the Transit & mobility lens shows bus shelters and bike share. High-volume SBS routes, major bus–subway transfers, multimodal hubs and greenways (report p. 22) are not yet loaded.", "Partly: SBS routes and greenways to add"],
    ["Distance by walking or mobility device", "Walk time to the nearest counted restroom; a mobility-device preset (50 m a minute, fully accessible restrooms only) is under Walk and contract assumptions.", "Covered; 50 m a minute is our choice, to be sourced"],
    ["Land use, incl. commercial and tourist corridors", "Zoning family per block (PLUTO) in the Zoning lenses. No public tourist-corridor dataset was found.", "Partly: tourist corridors unknown"],
    ["Equity", `Older, very young and disabled residents, poverty, homelessness (drop-in centres), public housing. Restroom equity features on the City list: gender neutral ${e.ag} (City: ${CITY9.ag}), menstrual friendly ${e.mf} (City: ${CITY9.mf}), changing station ${e.cs} (City: ${CITY9.cs}), of ${e.n} rows (LL58 report Table 9, p. 14). ${e.ag === CITY9.ag && e.mf === CITY9.mf && e.cs === CITY9.cs ? "All three match the City's counts." : "They differ from the City's counts: the sandbox counts \"All Gender\" in the restroom type."}`, "Covered"],
  ];
  return `<h3 class="sp" id="ll58factors">The LL58 factors (report p. 8): where each one is covered</h3><div class="tw"><table class="t"><thead><tr><th>Factor named in the law</th><th>Where the sandbox covers it</th><th>Status</th></tr></thead><tbody>${F.map((f) => `<tr><td><b>${f[0]}</b></td><td>${f[1]}</td><td>${f[2]}</td></tr>`).join("")}</tbody></table></div>`;
}
function mobilityPreset() { $("speed").value = 50; $("acc").checked = true; changed(); }
function v5Overlay(k) {
  pipeIn(D).forEach((o) => { const R = 7 * k, x = o.x, y = -o.y, s = o.q[5], col = s === "approved" ? "var(--g5)" : s === "in progress" ? "var(--g4)" : s === "planned" ? "var(--g3)" : s === "no longer feasible" ? "var(--muted)" : "var(--g2)";
    const t = el("path", { d: `M${x} ${y - R}L${x + R} ${y}L${x} ${y + R}L${x - R} ${y}Z`, fill: col, stroke: "var(--ink)", "stroke-width": 1.4 * k }); t.innerHTML = `<title>${esc(o.q[2])}: ${esc(s)}</title>`; gX.appendChild(t); });
  (LR.closed ? LR.closed.rows : []).forEach((r) => { const R = 6 * k, x = r.x, y = -r.y; gX.appendChild(el("path", { d: `M${x - R} ${y - R}L${x + R} ${y + R}M${x + R} ${y - R}L${x - R} ${y + R}`, stroke: "var(--no)", "stroke-width": 3 * k })); });
}


