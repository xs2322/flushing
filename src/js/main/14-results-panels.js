/* ---------- results panels ---------- */
function lensPanel() {
  const box = $("lens"), X = LX();
  if (ls.id === "siting" || !X) { box.hidden = true; return; }
  box.hidden = false;
  const p = P();
  if (ls.id === "coverage") return panelCoverage(box, X, p);
  if (ls.id === "closed") return panelClosed(box, X, p);
  if (ls.id === "zroute") return panelZroute(box, X, p);
  if (ls.id === "cityprop") return panelCity(box, X, p);
  if (ls.id === "food") return panelFood(box, X, p);
  if (ls.id === "equity") return panelEquity(box, X, p);
  if (ls.id === "zoning") return panelZoning(box, X, p);
  if (ls.id === "maint") return panelMaint(box, X, p);
  if (ls.id === "coloc") return panelColoc(box, X, p);
  if (ls.id === "landmarks") return panelLandmarks(box, X, p);
  if (ls.id === "flood") return panelFlood(box, X, p);
  if (ls.id === "publand") return panelPubland(box, X, p);
  if (ls.id === "transit") return panelTransit(box, X, p);
  if (ls.id === "reps") return panelReps(box, X, p);
  if (ls.id === "vuln") return panelVuln(box, X, p);
}
const n0 = (v) => Math.round(v).toLocaleString();
// Condition of one restroom for the existing-infrastructure view.
const TEMPCLOSED = /temp(orarily)?\.?\s*closed|closed for (construction|renovation|repair)/i;
function condOf(K, r, o) {
  if (r.fu) return "planned";
  if (!r.ok || TEMPCLOSED.test(r.h || "") || TEMPCLOSED.test(r.nt || "")) return "out";
  return isCounted(K, r, o) ? "ok" : "limited";
}
// Inside the district boundary (packs also carry restrooms just across the line, for walking distances).
const inDist = (K, r) => (r._in != null ? r._in : (r._in = (K.cd || []).some((ring) => Geo.inRing(r.x, r.y, ring))));
const statusTxt = (r) => (r.fu ? "Planned" : r.st && r.st !== "Operational" ? r.st : !r.ok ? "Not operational" : TEMPCLOSED.test(r.h || "") ? "Temporarily closed (per hours)" : "Operational");
// Out-of-service and planned restrooms, with the residents who would regain a restroom within the walk standard if each reopened.
function outOfService(K, p, base) {
  const rows = [];
  allRest(K).forEach((r) => {
    if (r.t === "User" || !(r.t === "Subway" && r.cd ? r.cd[0] === K.id && !r.cd[1] : inDist(K, r))) return;
    const c = condOf(K, r, st);
    if (c !== "out" && c !== "planned") return;
    let gain = 0, hi = 0;
    const SO = r.t === "Subway" ? allRest(K).filter((s) => s.t === "Subway" && s.ok) : [];
    K.blocks.forEach((b, i) => {
      if (base[i].cls !== 2) return;
      const w = (Math.hypot(r.x - b.c[0], r.y - b.c[1]) * (p.det || DETOUR)) / p.speed;
      if (w > p.T || cross(K, b, r, st)) return;
      if (SO.some((s) => (Math.hypot(s.x - b.c[0], s.y - b.c[1]) * (p.det || DETOUR)) / p.speed <= p.T)) return;
      gain += b.pop; if (base[i].g >= 4) hi++;
    });
    rows.push({ r, c, gain, hi });
  });
  return rows.sort((a, b) => b.gain - a.gain || b.hi - a.hi);
}
function outAll(p) {
  const out = [];
  DATA.order.forEach((id) => {
    const K = prep(DATA.d[id]), base = scoreAll(K, st, [], p);
    outOfService(K, p, base).forEach((x) => { const ll = toLL(K, x.r.x, x.r.y); out.push({ restroom: x.r.n, district: K.name.split(" · ")[0], operator: x.r.op || x.r.t, status: statusTxt(x.r), notes: x.r.nt || "", residents_regained_if_reopened: Math.round(x.gain), tier45_blocks_reached: x.hi, lon: ll[0], lat: ll[1] }); });
  });
  return out
    .sort((a, b) => b.residents_regained_if_reopened - a.residents_regained_if_reopened).map((x, k) => ({ rank: k + 1, ...x }));
}
function panelCoverage(box, X, p) {
  const all = allRest(D).filter((r) => r.t !== "User" && inDist(D, r));
  const o = strictO();
  const cnt = { out: 0, planned: 0, limited: 0, ok: 0 };
  all.filter((r) => r.t !== "Subway").forEach((r) => cnt[condOf(D, r, o)]++);
  const OUT = outOfService(D, p, RES);
  const regain = (() => { const base = RES, add = new Set(); OUT.filter((x) => x.c === "out").forEach((x) => D.blocks.forEach((b, i) => { if (base[i].cls === 2 && (Math.hypot(x.r.x - b.c[0], x.r.y - b.c[1]) * (p.det || DETOUR)) / p.speed <= p.T && !cross(D, b, x.r, st)) add.add(i); })); let n = 0; add.forEach((i) => (n += D.blocks[i].pop)); return n; })();
  const types = [...new Set(all.map((r) => r.t))];
  const row = (t) => {
    const a = all.filter((r) => r.t === t);
    const u = (f) => (a.some((r) => r[f] != null) ? a.filter((r) => r.ok && r[f] >= 1).length : "–");
    return `<tr><td>${esc((OPS.find((x) => x[0] === t) || [0, t])[1])}</td><td>${a.length}</td><td>${a.filter((r) => condOf(D, r, o) === "out").length}</td><td>${a.filter((r) => r.fu).length}</td><td>${a.filter((r) => r.ok && !r.se).length}</td><td>${a.filter((r) => r.ok && r.ac === 2).length}</td><td>${a.filter((r) => r.ok && r.ev).length}</td><td>${u("cs")}</td><td>${u("ag")}</td></tr>`;
  };
  let pop = 0, now = 0, strict = 0, paper = 0, paperBlocks = 0;
  D.blocks.forEach((b, i) => {
    pop += b.pop;
    if (RES[i].cls < 2) now += b.pop;
    if (LR.strict[i].cls < 2) strict += b.pop;
    if (RES[i].cls < 2 && LR.strict[i].cls === 2) { paper += b.pop; paperBlocks++; }
  });
  const subOn = st.ops.Subway !== false;
  const noAcc = all.filter((r) => r.ok && r.ac == null && r.t !== "Throne" && r.t !== "Subway").length, accFilled = all.filter((r) => r.ok && r.src && r.src.ac).length;
  const outRows = OUT.filter((x) => x.c === "out"), planRows = OUT.filter((x) => x.c === "planned");
  const otab = (rows) => `<div class="tw"><table class="mlist"><thead><tr><th>Restroom</th><th>Status</th><th>Operator</th><th>Residents who would regain a restroom</th></tr></thead><tbody>${rows.map((x) => `<tr><td><a href="#" data-selr="${x.r._k}">${esc(x.r.n)}</a>${x.r.nt ? `<br><span class="small">${esc(x.r.nt)}</span>` : ""}</td><td><span class="cvs ${x.c}">${esc(statusTxt(x.r))}</span></td><td class="small">${esc(x.r.op || x.r.t)}</td><td>${n0(x.gain)}${x.hi ? ` <span class="small">(${x.hi} tier 4–5 blocks)</span>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
  box.innerHTML = `<h3>Coverage / ADA</h3>
  <p class="lline">${cnt.out ? `<b>${cnt.out} restroom${cnt.out > 1 ? "s" : ""}</b> here ${cnt.out > 1 ? "are" : "is"} closed or out of service.${regain ? ` Reopening ${cnt.out > 1 ? "them" : "it"} would bring <b>${n0(regain)} residents</b> back within ${p.T} minutes of a restroom.` : ""}` : "Every listed restroom here is in service."} ${paper ? `Another <b>${n0(paper)} residents</b> are served only on paper: their nearest restroom fails the rule below.` : ""}</p>
  ${stat3([[cnt.out, "closed or out of service"], [cnt.limited, "open but fail the rule below"], [cnt.ok, "open and meet the rule"]])}
  ${outRows.length ? `<h4 class="sub">Closed or out of service</h4>${otab(outRows.slice(0, 5))}${outRows.length > 5 ? `<details class="lmore"><summary>${outRows.length - 5} more</summary>${otab(outRows.slice(5))}</details>` : ""}` : ""}
  <div class="btnrow"><button class="btn" id="cvOutCsv">Out-of-service restrooms here (CSV)</button></div>
  <p class="small" style="margin:10px 0 6px">The rule counts only restrooms that are operating${ls.cv.yr ? ", open year-round" : ""}${ls.cv.acc ? ", listed fully accessible" : ""}${ls.cv.eve ? ", open to 8 pm or later" : ""}${ls.cv.cs ? ", with a changing station" : ""}${ls.cv.ag ? ", all-gender" : ""}.</p>
  <div class="lctl"><label><input type="checkbox" id="cvYr" ${ls.cv.yr ? "checked" : ""}> Year-round only</label><label><input type="checkbox" id="cvAcc" ${ls.cv.acc ? "checked" : ""}> Fully accessible only</label><label><input type="checkbox" id="cvEve" ${ls.cv.eve ? "checked" : ""}> Open to 8 pm</label><label><input type="checkbox" id="cvCs" ${ls.cv.cs ? "checked" : ""}> Has a changing station</label><label><input type="checkbox" id="cvAg" ${ls.cv.ag ? "checked" : ""}> All-gender</label><label><input type="checkbox" id="cvSub" ${subOn ? "checked" : ""}> Count the ${(D._sub || []).length} subway station restrooms here</label></div>
  <details class="lmore"><summary>Show details</summary>
  ${stat3([[(pop ? Math.round((now / pop) * 100) : 0) + "%", `of residents within ${p.T} min on today's settings`], [(pop ? Math.round((strict / pop) * 100) : 0) + "%", "under the rule"], [n0(paper), `residents served on paper only (${paperBlocks} blocks, shaded)`]])}
  ${planRows.length ? `<h4 class="sub">Planned, not yet open</h4>${otab(planRows)}` : ""}
  ${ls.cv.acc && noAcc ? `<p class="note" style="margin:0 0 10px">${noAcc} operating restrooms here have <b>no accessibility listed</b>. Under "Fully accessible only" they drop out, so part of this gap is missing data, not confirmed barriers. Checking those listings is the cheapest fix on this page.${accFilled ? ` Another ${accFilled} had none in the city's list and were filled from the operator's own page; the List shows the source.` : ""}</p>` : ""}
  <div class="tw"><table class="t" style="min-width:620px"><thead><tr><th>Type</th><th>Listed</th><th>Out of service</th><th>Planned</th><th>Year-round</th><th>Fully accessible</th><th>Open to 8 pm</th><th>Changing station</th><th>All-gender</th></tr></thead><tbody>${types.map(row).join("")}</tbody></table></div>
  ${fixFirstHtml(p)}
  <p class="small">Status (operational, not operational, closed, closed for construction, planned), hours, changing stations, all-gender rooms and notes come from the city's Public Restrooms list. A restroom whose listed hours or notes say it is temporarily closed is counted as out of service. Where the city's list leaves wheelchair access or hours blank, some are filled from the operator's own page (Queens Library, the National Park Service, Brooklyn Public Library, the High Line); each is marked with its source. Subway station restrooms come from two MTA sources: its list of bathrooms open to the public (open 7 am–7 pm, closed 12–1 for cleaning) and its register of public restrooms (115 rooms at 59 stations, September 2026). Seven stations in the register are not on the open list: 34 St-Penn Station (A C E), Broadway Junction, Norwood-205 St, Parkchester, Hunts Point Av, 86 St (4 5 6) and Grand Central-42 St. They are shown as not open to the public: closed since March 2020, or kept for staff. Before the pandemic the MTA had 133 restrooms at 69 stations; the record does not name the other three stations. Subway restrooms are off by default. The citywide out-of-service list is on <a href="#shortlists" data-tab="shortlists">Shortlists</a>.</p></details>`;
  $("cvYr").onchange = (e) => { ls.cv.yr = e.target.checked; render(); };
  $("cvAcc").onchange = (e) => { ls.cv.acc = e.target.checked; render(); };
  $("cvEve").onchange = (e) => { ls.cv.eve = e.target.checked; render(); };
  $("cvCs").onchange = (e) => { ls.cv.cs = e.target.checked; render(); };
  $("cvAg").onchange = (e) => { ls.cv.ag = e.target.checked; render(); };
  fixFirstWire(p);
  $("cvOutCsv").onclick = () => download("bathroom-sandbox-out-of-service-" + slug(D.name) + ".csv", csvOf(OUT.map((x) => { const ll = toLL(D, x.r.x, x.r.y); return { restroom: x.r.n, status: statusTxt(x.r), operator: x.r.op || x.r.t, notes: x.r.nt || "", hours_listed: x.r.h || "", residents_regained_if_reopened: Math.round(x.gain), tier45_blocks_reached: x.hi, lon: ll[0], lat: ll[1] }; })), "text/csv");
  $("cvSub").onchange = (e) => {
    const i = OPS.findIndex((x) => x[0] === "Subway");
    $("op" + i).checked = e.target.checked;
    changed();
  };
}
function panelEquity(box, X, p) {
  const S = { base: LR.base, eve: LR.eve, win: LR.win };
  const sum = (k) => {
    let far = 0, vul = 0, pov = 0;
    D.blocks.forEach((b, i) => {
      if (S[k][i].cls === 2) { far += b.pop; if (b._s65 != null) vul += b.pop * (b._s65 + b._s5 + (b._sd || 0)); if (b._pv != null) pov += b.pop * b._pv; }
    });
    return [far, vul, pov];
  };
  const r = { base: sum("base"), eve: sum("eve"), win: sum("win") };
  const lose = [];
  D.blocks.forEach((b, i) => { if (S.base[i].cls < 2 && S[ls.eq][i].cls === 2) lose.push(i); });
  lose.sort((a, b) => D.blocks[b].pop - D.blocks[a].pop);
  box.innerHTML = `<h3>Evening & winter</h3>
  <p class="lline"><b>${n0(r.eve[0] - r.base[0])} more residents</b> are beyond ${p.T} minutes of a restroom after 8 pm, and <b>${n0(r.win[0] - r.base[0])}</b> more in winter.</p>
  <div class="lctl"><div class="seg" role="group"><button id="eqE" aria-pressed="${ls.eq === "eve"}">After 8 pm</button><button id="eqW" aria-pressed="${ls.eq === "win"}">Winter</button></div></div>
  <div class="stat lstat"><div><b>${n0(r.base[0])}</b><span>beyond ${p.T} min at peak</span></div><div><b>${n0(r.eve[0])}</b><span>after 8 pm</span></div><div><b>${n0(r.win[0])}</b><span>in winter</span></div></div>
  <details class="lmore"><summary>Show details</summary>
  <div class="tw"><table class="t" style="min-width:520px"><thead><tr><th>Scenario</th><th>Residents beyond ${p.T} min</th><th>…of whom 65+, under 5 or disabled</th><th>…of whom in poverty</th></tr></thead><tbody>
  ${[["Peak (default)", "base"], ["After 8 pm", "eve"], ["Winter: seasonal restrooms closed", "win"]].map(([t, k]) => `<tr><td>${t}</td><td>${n0(r[k][0])}</td><td>${n0(r[k][1])}</td><td>${n0(r[k][2])}</td></tr>`).join("")}
  </tbody></table></div>
  <p class="small">Shaded blocks have a restroom within ${p.T} minutes at peak but not ${ls.eq === "eve" ? "after 8 pm" : "in winter"}${lose.length ? `; the largest: ${lose.slice(0, 5).map((i) => `<a href="#" data-sel="${i}">${esc(place(D.blocks[i]))}</a> (${D.blocks[i].pop.toLocaleString()})`).join(", ")}` : ""}. Evening hours are read from the list's free text; Throne units count as open 7 am to 10 pm. The Council found 1 in 9 park restrooms closed during posted hours, so real evening access is likely lower.</p></details>`;
  $("eqE").onclick = () => { ls.eq = "eve"; render(); };
  $("eqW").onclick = () => { ls.eq = "win"; render(); };
  box.querySelectorAll("a[data-sel]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.sel = +a.dataset.sel; st.selR = null; render(); $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
}
function bidStats(K, X, res, mode) {
  const out = X.bids.map((bd) => ({ bd, m: 0, hi: 0, far: 0, okn: 0, best: -1, bestNeed: 0 }));
  K.blocks.forEach((b, i) => {
    const j = X.bid[i];
    if (j < 0 || !zMatch(X.z[i], true, mode === "d" ? "ab" : mode)) return;
    const o = out[j], r = res[i];
    o.m++;
    if (r.g >= 4) o.hi++;
    if (r.cls === 2) o.far += b.pop;
    if (r.ok && r.g >= 3) o.okn++;
    if (r.ok && r.need > o.bestNeed) { o.bestNeed = r.need; o.best = i; }
  });
  return out.filter((o) => o.m);
}
function panelZoning(box, X, p) {
  let match = 0, matchHi = 0;
  D.blocks.forEach((b, i) => { if (zMatch(X.z[i], X.bid[i] >= 0, ls.zmode)) { match++; if (RES[i].g >= 4) matchHi++; } });
  const rows = bidStats(D, X, RES, ls.zmode).sort(bidSort);
  box.innerHTML = `<h3>Zoning & BIDs</h3>
  <p class="lline">${rows.length ? `<b>${matchHi} high-need blocks</b> (tier 4 or 5) are in matching zoning inside a BID. The strongest partner here: <b>${esc(rows[0].bd.n)}</b>.` : `No BID in this district has blocks in matching zoning.`}</p>
  <div class="lctl"><label for="zmode">Show blocks that are</label><select id="zmode">
   <option value="ab">Residential with a C1/C2 overlay, or commercial, inside a BID</option>
   <option value="a">Residential with a C1/C2 overlay inside a BID ("main street")</option>
   <option value="b">Commercial district inside a BID</option>
   <option value="c">Anything inside a BID</option>
   <option value="d">Residential with a C1/C2 overlay, anywhere</option></select>
   <label for="zsort">Rank BIDs by</label><select id="zsort"><option value="hi">Tier 4–5 blocks</option><option value="far">Residents beyond the walk standard</option><option value="ok">Blocks that pass the desk review</option></select></div>
  <div class="stat lstat"><div><b>${match}</b><span>blocks match</span></div><div><b>${matchHi}</b><span>of them are tier 4 or 5</span></div><div><b>${X.bids.length}</b><span>BIDs in or near this district</span></div></div>
  <details class="lmore"><summary>Show details</summary>
  ${rows.length ? `<div class="tw"><table class="mlist"><thead><tr><th>BID</th><th>Matching blocks</th><th>Tier 4–5 blocks</th><th>Residents beyond ${p.T} min</th><th>Best allowed block</th><th>Contact</th></tr></thead><tbody>${rows.map((o) => `<tr><td><b>${esc(o.bd.n)}</b></td><td>${o.m}</td><td>${o.hi}</td><td>${n0(o.far)}</td><td>${o.best >= 0 ? `<a href="#" data-sel="${o.best}">${esc(place(D.blocks[o.best]))}</a><br><span class="small">${TIERNAME[RES[o.best].g]}${RES[o.best].drv >= 0 ? ", " + DRV[RES[o.best].drv] : ""}</span>` : "–"}</td><td class="small">${esc(phoneFmt(o.bd.ph))}${o.bd.web ? `<br><a href="${esc(urlFix(o.bd.web))}" target="_blank" rel="noopener">website</a>` : ""}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small">No BID in this district has matching blocks.</p>`}
  <p class="small">The citywide BID shortlist is on the <a href="#shortlists" data-tab="shortlists">Shortlists</a> page.</p>
  <details class="math"><summary>Why zoning and BIDs matter for siting</summary><ul class="small">
   <li><b>Automatic public toilets</b>: DOT's Street Design Manual allows them on wide streets only in commercial, manufacturing or mixed-use districts, so zoning decides which restroom type is even possible on a sidewalk. The site check now says so.</li>
   <li><b>BIDs</b> already pay for supplementary sanitation and street upkeep, so they are natural maintenance partners and a route to the private partnerships the memo proposes.</li>
   <li><b>Incentives</b>: Manhattan CB4 backed a draft zoning text amendment (2023, not adopted) that would make public restrooms a required amenity in large privately owned public spaces built with a zoning bonus. Local Law 58 asks the city's strategic plan for "legislative, zoning, regulatory, or policy changes".</li>
   <li><b>Limit</b>: BIDs cluster on commercial corridors, so this lens skips most residential gaps (Staten Island, eastern Queens). Zoning is read from each tax lot's first district and overlay in PLUTO; a block counts as matching if any of its lots does.</li></ul></details></details>`;
  $("zmode").value = ls.zmode;
  $("zsort").value = ls.zsort;
  $("zsort").onchange = (e) => { ls.zsort = e.target.value; render(); };
  $("zmode").onchange = (e) => { ls.zmode = e.target.value; render(); };
  box.querySelectorAll("a[data-sel]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.sel = +a.dataset.sel; st.selR = null; render(); $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
  box.querySelectorAll("a[data-tab]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); location.hash = a.dataset.tab; tab(); window.scrollTo(0, 0); }));
}
let BIDLIST = [];
const ZMODE = { ab: "residential + C1/C2 overlay or commercial, inside a BID", a: "residential + C1/C2 overlay inside a BID", b: "commercial district inside a BID", c: "anything inside a BID", d: "residential + C1/C2 overlay, anywhere" };
const ZSORT = { hi: "tier 4–5 blocks", far: "residents beyond the walk standard", ok: "tier 3+ blocks that pass the desk review" };
const bidSort = (a, b) => (ls.zsort === "far" ? b.far - a.far || b.hi - a.hi : ls.zsort === "ok" ? b.okn - a.okn || b.hi - a.hi : b.hi - a.hi || b.far - a.far);
function bidShortlist(p) {
  $("bidList").innerHTML = `<p class="small">Scoring every district…</p>`;
  setTimeout(() => {
    const by = {};
    DATA.order.forEach((id) => {
      const X = LENS.d[id];
      if (!X || !DATA.d[id]) return;
      const K = prep(DATA.d[id]), res = K === D ? RES : scoreAll(K, st, [], p);
      bidStats(K, X, res, ls.zmode).forEach((o) => {
        const k = o.bd.n, a = by[k] || (by[k] = { n: k, bd: o.bd, m: 0, hi: 0, far: 0, okn: 0, best: null, dist: [] });
        a.m += o.m; a.hi += o.hi; a.far += o.far; a.okn += o.okn;
        a.dist.push(K.name.split(" · ")[0]);
        if (o.best >= 0 && (!a.best || o.bestNeed > a.best.need)) a.best = { need: o.bestNeed, id, i: o.best, place: place(K.blocks[o.best]), g: res[o.best].g, drv: res[o.best].drv };
      });
    });
    BIDLIST = Object.values(by).sort(bidSort).slice(0, 10);
    $("bidList").innerHTML = `<h4 class="sub" style="margin-top:14px">Top 10 BIDs: ${esc(ZMODE[ls.zmode])}, ranked by ${esc(ZSORT[ls.zsort])}</h4><div class="tw"><table class="mlist"><thead><tr><th>#</th><th>BID</th><th>District</th><th>Tier 4–5 blocks</th><th>Residents beyond ${p.T} min</th><th>Tier 3+ blocks passing desk review</th><th>Best allowed block</th><th>Phone · email</th></tr></thead><tbody>${BIDLIST.map((a, k) => `<tr><td>${k + 1}</td><td><b>${esc(a.n)}</b></td><td class="small">${esc([...new Set(a.dist)].join("; "))}</td><td>${a.hi}</td><td>${n0(a.far)}</td><td>${a.okn}</td><td>${a.best ? esc(a.best.place) + `<br><span class="small">${TIERNAME[a.best.g]}${a.best.drv >= 0 ? ", " + DRV[a.best.drv] : ""}</span>` : "–"}</td><td class="small">${esc(phoneFmt(a.bd.ph))}${a.bd.em ? "<br>" + esc(a.bd.em) : ""}</td></tr>`).join("")}</tbody></table></div><p class="small">Uses your current settings and the ${DATA.order.length} districts loaded; BIDs outside them are not scored. BID contacts are from the city's BID directory (last updated 2024); confirm before outreach.</p>`;
    $("bidCsv").hidden = false;
    $("bidCsv").onclick = () => {
      const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
      const rows = [["rank", "bid", "districts", "tier45_blocks", "residents_beyond_walk", "tier3plus_blocks_passing_desk_review", "best_block", "best_tier", "deciding_factor", "phone", "email", "website"]].concat(
        BIDLIST.map((a, k) => [k + 1, a.n, [...new Set(a.dist)].join("; "), a.hi, Math.round(a.far), a.okn, a.best ? a.best.place : "", a.best ? a.best.g : "", a.best && a.best.drv >= 0 ? DRV[a.best.drv] : "", phoneFmt(a.bd.ph), a.bd.em || "", urlFix(a.bd.web)]));
      download("bathroom-sandbox-bid-shortlist.csv", rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
    };
  }, 30);
}
function panelMaint(box, X, p) {
  const M = LR.m, m = ls.m, A = M.need, B = M.ring;
  const cell = (a, b, f, better) => `<td>${f(a)}</td><td>${f(b)}${better != null ? (better(a, b) ? ' <span class="up">better</span>' : "") : ""}</td>`;
  const tiers = (S) => [5, 4, 3, 2, 1].map((g) => S.units.filter((u) => u.g === g).length).map((v, k) => (v ? `${v}× tier ${5 - k}` : "")).filter(Boolean).join(", ");
  const S = m.show === "need" ? A : B;
  box.innerHTML = `<h3>Operations & maintenance</h3>
  <p class="lline">Choosing ${m.n} units with service in mind needs <b>${B.shifts} crew-shifts a day</b> instead of ${A.shifts}, ${B.served === A.served ? `and reaches the same <b>${n0(B.served)}</b> residents within ${p.T} minutes.` : `and brings <b>${n0(B.served)}</b> residents within ${p.T} minutes instead of ${n0(A.served)}.`}</p>
  <details class="lmore"><summary>Show details</summary>
  <p class="small" style="margin:0 0 10px">Two ways to choose the next ${m.n} units in this district, on your current settings. <b>Need only</b> is the FLUSH! button. <b>Ring-aware</b> keeps the same tiers in the same order, but inside a tier it prefers blocks closer to a unit already picked (or, less strongly, to a Parks restroom within ${(m.ringR / 1000).toFixed(1)} km), so one crew can loop through several. It never takes a lower tier over a higher one.</p>
  <div class="lctl"><label>Units <select id="mN">${[4, 8, 12, 20].map((v) => `<option ${v === m.n ? "selected" : ""}>${v}</option>`).join("")}</select></label>
   <div class="seg" role="group" aria-label="Show on map"><button id="mShowN" aria-pressed="${m.show === "need"}">Map: need only</button><button id="mShowR" aria-pressed="${m.show === "ring"}">Map: ring-aware</button></div></div>
  <div class="tw"><table class="t" style="min-width:560px"><thead><tr><th></th><th>Need only</th><th>Ring-aware</th></tr></thead><tbody>
   <tr><td>Units by tier</td><td>${tiers(A)}</td><td>${tiers(B)}</td></tr>
   <tr><td>Residents newly within ${p.T} min</td>${cell(A.served, B.served, n0, (a, b) => b > a)}</tr>
   <tr><td>Visits a day (estimate)</td>${cell(A.visits, B.visits, n0)}</tr>
   <tr><td>Service rings (one crew's loop)</td>${cell(A.rings.length, B.rings.length, String, (a, b) => b < a)}</tr>
   <tr><td>Crew-shifts a day</td>${cell(A.shifts, B.shifts, String, (a, b) => b < a)}</tr>
   <tr><td>Share of crew time spent travelling</td>${cell(A.travelShare, B.travelShare, (v) => Math.round(v * 100) + "%", (a, b) => b < a)}</tr>
   <tr><td>Labour a year (assumption below)</td>${cell(A.shifts * m.crew, B.shifts * m.crew, (v) => "$" + n0(v), (a, b) => b < a)}</tr>
   <tr><td>Vendor model a year (Throne rate, service included)</td>${cell(A.units.length * p.cost, B.units.length * p.cost, (v) => "$" + n0(v))}</tr>
  </tbody></table></div>
  <h4 class="sub" style="margin-top:14px">Contract: one master agreement, one task order per ring</h4>
  <p class="small" style="margin:0 0 6px">Instead of a contract per site, each ring is a task order under one master agreement. Every unit gets the base module plus the module for the factor that set its tier, so the scope is written from the map, not from scratch.</p>
  <div class="tw"><table class="mlist"><thead><tr><th>#</th><th>Site</th><th>Ring</th><th>Tier, set by</th><th>Visits / cleanings a day</th><th>Scope modules</th></tr></thead><tbody>${S.units.map((u, n) => `<tr><td>${n + 1}</td><td>${esc(place(D.blocks[u.i]))}</td><td><span class="rdot" style="background:${RING_COL[u.ring % RING_COL.length]}"></span>${u.ring + 1}${S.rings[u.ring].hub ? `<br><span class="small">hub: ${esc(S.rings[u.ring].hub.n)}</span>` : ""}</td><td>${TIERNAME[u.g]}${u.drv >= 0 ? ", " + DRV[u.drv] : ""}</td><td>${Math.round(u.v)} / ${f1(u.cl)}</td><td class="small">${scopeFor(u.drv).map((x) => `<b>${x[1]}:</b> ${esc(x[0].replace("12", m.every))}`).join("<br>")}</td></tr>`).join("")}</tbody></table></div>
  <div class="btnrow"><button class="btn pri" id="mProf">Site profiles for these ${S.units.length} sites (printable)</button></div>
  <details class="math"><summary>Assumptions (editable)</summary><div class="lgrid">
   <label>Cleaning every N uses<input id="mE" type="number" min="4" max="40" value="${m.every}"></label>
   <label>Minutes per cleaning<input id="mS" type="number" min="5" max="60" value="${m.svc}"></label>
   <label>Crew travel speed, km/h, incl. parking<input id="mK" type="number" min="3" max="40" value="${m.kmh}"></label>
   <label>Working minutes per crew-shift<input id="mW" type="number" min="120" max="600" value="${m.shift}"></label>
   <label>Ring radius, metres<input id="mR" type="number" min="200" max="5000" step="100" value="${m.ringR}"></label>
   <label>Yearly cost of one daily crew-shift ($)<input id="mC" type="number" min="10000" step="5000" value="${m.crew}"></label></div>
   <p class="small">Sourced: Throne cleans about every 12 uses (Throne Labs); the busiest Long Beach unit averaged 119 uses a day. Assumptions, not sourced: 20 minutes a cleaning, 15 km/h door to door, 420 working minutes a shift, and the crew cost. Each round visits every unit in the ring; rounds a day = the most cleanings any unit in it needs. Travel is straight line × the detour factor. Parks hubs are Parks-run restrooms counted on the map. ${M.hubs} in or near this district.</p></details></details>`;
  $("mN").onchange = (e) => { m.n = +e.target.value; render(); };
  $("mShowN").onclick = () => { m.show = "need"; render(); };
  $("mShowR").onclick = () => { m.show = "ring"; render(); };
  [["mE", "every"], ["mS", "svc"], ["mK", "kmh"], ["mW", "shift"], ["mR", "ringR"], ["mC", "crew"]].forEach(([id, k]) => ($(id).onchange = (e) => { const v = +e.target.value; if (v > 0) { m[k] = v; render(); } }));
  $("mProf").onclick = () => profiles(S, p);
}
function panelColoc(box, X, p) {
  nearAssets();
  const top = D.blocks.map((b, i) => i).filter((i) => RES[i].g >= 3 && RES[i].ok).sort((a, b) => RES[b].need - RES[a].need).slice(0, 12);
  const cb = X.cb, councils = [...new Set(X.co.filter(Boolean))].sort((a, b) => a - b);
  const withUse = top.filter((i) => X._near[i].types >= 1).length;
  box.innerHTML = `<h3>Co-location & contacts</h3>
  <p class="lline"><b>${withUse} of the ${top.length}</b> highest-need blocks where a unit is allowed already have seating, a bus shelter, a kiosk or a bike dock within 100 m.</p>
  <p class="small" style="margin:0 0 8px"><b>Who has to say yes:</b> ${cb ? esc(cb.n) : "the community board"}; City Council ${councils.map((c) => `<a href="https://council.nyc.gov/district-${c}/" target="_blank" rel="noopener">${c}</a>`).join(", ")}; DOT, the Public Design Commission, and Parks, the MTA or LPC where they apply.</p>
  <div class="lctl">${[["seat", "Seating"], ["link", "LinkNYC kiosks"], ["shel", "Bus shelters"], ["bike", "Citi Bike docks"]].map(([k, t]) => `<label><input type="checkbox" data-co="${k}" ${ls.co[k] ? "checked" : ""}> ${t} (${X.pts[k].length})</label>`).join("")}</div>
  <details class="lmore"><summary>Show details</summary>
  <p class="small" style="margin:0 0 8px">A unit next to existing seating, a bus shelter or a kiosk shares eyes on the street, lighting and sometimes power, and is easier to find.</p>
  <div class="tw"><table class="mlist"><thead><tr><th>Highest-tier allowed blocks</th><th>Tier, set by</th><th>Within 100 m</th><th>Council</th><th>BID</th></tr></thead><tbody>${top.map((i) => `<tr><td><a href="#" data-sel="${i}">${esc(place(D.blocks[i]))}</a></td><td>${TIERNAME[RES[i].g]}${RES[i].drv >= 0 ? ", " + DRV[RES[i].drv] : ""}</td><td class="small">${esc(nearText(i))}</td><td>${X.co[i] || "–"}</td><td class="small">${X.bid[i] >= 0 ? esc(X.bids[X.bid[i]].n) : "–"}</td></tr>`).join("")}</tbody></table></div>
  <div class="btnrow"><button class="btn" id="coCsv">Contact sheet for these blocks (CSV)</button></div></details>`;
  box.querySelectorAll("input[data-co]").forEach((c) => (c.onchange = () => { ls.co[c.dataset.co] = c.checked; markers(); }));
  box.querySelectorAll("a[data-sel]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.sel = +a.dataset.sel; st.selR = null; render(); $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
  $("coCsv").onclick = () => {
    const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"';
    const rows = [["block", "place", "tier", "deciding_factor", "nearby_uses_100m", "community_board", "cb_district_manager", "cb_phone", "cb_email", "council_district", "council_page", "bid", "bid_phone", "bid_website"]].concat(
      top.map((i) => { const bd = X.bid[i] >= 0 ? X.bids[X.bid[i]] : null; return [D.blocks[i].id, place(D.blocks[i]), RES[i].g, RES[i].drv >= 0 ? DRV[RES[i].drv] : "", nearText(i), cb ? cb.n : "", cb ? cb.dm : "", cb ? cb.ph : "", cb ? cb.em : "", X.co[i] || "", X.co[i] ? `https://council.nyc.gov/district-${X.co[i]}/` : "", bd ? bd.n : "", bd ? phoneFmt(bd.ph) : "", bd ? urlFix(bd.web) : ""]; }));
    download("bathroom-sandbox-contacts-" + slug(D.name) + ".csv", rows.map((r) => r.map(q).join(",")).join("\n"), "text/csv");
  };
}

