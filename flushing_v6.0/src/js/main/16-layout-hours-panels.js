/* ================= FLUSHING v4.2: layout, more lenses, List, Shortlists, Numbers ================= */
// The memo's 30 sites exactly as published (October 2026, 17 districts). Kept as a fixed record.
const MEMO30 = []; // v5b: the memo's 30 sites are no longer shown

/* ---------- small tracts are steadied toward the city average (v4.2; was the district average) ---------- */
let CITYAVG = null;
function cityAvg() {
  if (CITYAVG) return CITYAVG;
  const T = {};
  Object.values(DATA.d).forEach((K) => K.blocks.forEach((b) => { const t = b.id.slice(0, 11); if (!T[t]) T[t] = b; }));
  const mean = (f) => { let n = 0, d = 0; for (const t in T) { const x = T[t]; if (x[f] != null && x.tp > 0) { n += x[f] * x.tp; d += x.tp; } } return d ? n / d : null; };
  return (CITYAVG = { s65: mean("s65"), s5: mean("s5"), sd: mean("sd"), pv: mean("pv") });
}

/* ---------- opening hours: free text in the city list, read into a weekly schedule ---------- */
const DAYN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const hh = (x) => { const h = Math.floor(x) % 24, m = Math.round((x % 1) * 60); return `${h % 12 || 12}${m ? ":" + String(m).padStart(2, "0") : ""} ${h < 12 ? "am" : "pm"}`; };
function hoursInfo(h) {
  if (!h) return { ok: false, txt: "Not listed" };
  const s = h.toLowerCase().replace(/\t/g, " ");
  if (/24\s*hours/.test(s)) return { ok: true, txt: "24 hours", close: 24 };
  const D3 = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const one = (w) => (/^weekday/.test(w) ? [1, 2, 3, 4, 5] : /^weekend/.test(w) ? [0, 6] : D3.indexOf(w.slice(0, 3)) >= 0 ? [D3.indexOf(w.slice(0, 3))] : []);
  const days = (spec) => {
    const m = spec.match(/^([a-z]+)\.?\s*(-|–|to|&|and)\s*([a-z]+)/);
    if (!m) return one(spec);
    const a = one(m[1]), b = one(m[3]);
    if (/&|and/.test(m[2]) || a.length !== 1 || b.length !== 1) return a.concat(b);
    const out = []; for (let d = a[0]; ; d = (d + 1) % 7) { out.push(d); if (d === b[0] || out.length > 7) break; } return out;
  };
  const hr = (x, mm, ap) => (+x % 12) + (+mm || 0) / 60 + (ap === "p" ? 12 : 0);
  const DS = "(?:sun|mon|tue|wed|thu|fri|sat|weekday|weekend)[a-z]*\\.?(?:\\s*(?:-|–|to|&|and)\\s*(?:sun|mon|tue|wed|thu|fri|sat|weekday|weekend)[a-z]*\\.?)?";
  const TR = "(\\d{1,2})(?::(\\d\\d))?\\s*([ap])?\\.?\\s*m?\\.?\\s*(?:-|–|to)\\s*(\\d{1,2})(?::(\\d\\d))?\\s*([ap])\\.?\\s*m";
  const re = new RegExp("(" + DS + ")(?:\\s*&\\s*holidays)?(?:\\s|:|-|–|,)*(?:" + TR + "|(closed))", "g");
  const week = Array(7).fill(undefined);
  let m, named = false;
  while ((m = re.exec(s))) {
    named = true;
    const ds = days(m[1].replace(/\.$/, ""));
    let v = "closed";
    if (!m[8]) { const ap2 = m[7], ap1 = m[4] || (+m[2] % 12 < +m[5] % 12 ? ap2 : "a"); v = [hr(m[2], m[3], ap1), hr(m[5], m[6], ap2)]; if (v[1] === 0) v[1] = 24; if (v[1] <= v[0]) v[1] += 12; }
    ds.forEach((d) => (week[d] = v));
  }
  if (!named) {
    const m1 = s.match(new RegExp(TR));
    if (!m1) return { ok: false, txt: h.trim().slice(0, 70) };
    const ap1 = m1[3] || "a", r = [hr(m1[1], m1[2], ap1), hr(m1[4], m1[5], m1[6])];
    if (r[1] <= r[0]) r[1] += 12;
    return { ok: true, close: r[1], txt: `${hh(r[0])}–${hh(r[1] % 24)} daily${/season|later/.test(s) ? ", later in summer" : ""}` };
  }
  const open = week.filter(Array.isArray);
  if (!open.length) return { ok: false, txt: h.trim().slice(0, 70) };
  const close = Math.max(...open.map((w) => w[1])), shut = 7 - open.length;
  return { ok: true, close, txt: `${open.length} days a week, closing by ${hh(close % 24)}${shut ? `; closed ${shut} day${shut > 1 ? "s" : ""}` : ""}` };
}

/* ---------- which restrooms count: by operator, within each type ---------- */
function opxRender() {
  const box = $("opx");
  if (!box || !D) return;
  const by = {};
  allRest(D).forEach((r) => { if (r.t === "User" || r.t === "Throne") return; const k = r.op || r.t; (by[k] = by[k] || { n: 0, ok: 0 }).n++; if (r.ok) by[k].ok++; });
  const ops = Object.keys(by).sort((a, b) => by[b].n - by[a].n);
  box.innerHTML = `<details class="sec sub"><summary>By operator (${ops.length})</summary><div class="chk">${ops.map((k) => `<label><input type="checkbox" data-opx="${esc(k)}" ${st.opx[k] === false ? "" : "checked"}><span>${esc(k)} <span>(${by[k].ok} open)</span></span></label>`).join("")}</div><p>Every operator in the city's Public Restrooms list for this area, plus MTA subway restrooms. Switch one off to see the map without it.</p></details>`;
  box.querySelectorAll("input[data-opx]").forEach((c) => c.addEventListener("input", () => { st.opx[c.dataset.opx] = c.checked; repick(); }));
}

/* ---------- layout B: stats above, map in the middle, a side panel for the story and block details ---------- */
function layoutV42() {
  const app = document.querySelector("#tab-map .app");
  const statCard = $("dsum").closest(".card");
  statCard.classList.add("topstats");
  app.parentNode.insertBefore(statCard, app);
  const side = document.createElement("aside");
  side.className = "side";
  side.id = "side";
  side.append($("sopen"), $("guide"), $("detail"));
  app.appendChild(side);
  const lc = document.createElement("div");
  lc.className = "card lenscard";
  lc.appendChild($("lensbar"));
  app.parentNode.insertBefore(lc, app);
  $("detail").innerHTML = `<h3>Click a block</h3><p class="small" style="margin:0">Its tier, why, the desk review and who to contact appear here.</p>`;
}

/* ---------- shared panel helpers ---------- */
function wireSel(box) {
  box.querySelectorAll("a[data-sel]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.sel = +a.dataset.sel; st.selR = null; render(); }));
  box.querySelectorAll("a[data-tab]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); location.hash = a.dataset.tab; tab(); window.scrollTo(0, 0); }));
}
const stat3 = (S) => `<div class="stat lstat">${S.map((x) => `<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join("")}</div>`;
const blockLink = (i) => `<a href="#" data-sel="${i}">${esc(place(D.blocks[i]))}</a>`;
const tierTxt = (i) => `${TIERNAME[RES[i].g]}${RES[i].drv >= 0 ? ", " + DRV[RES[i].drv] : ""}`;
function topBlocks(f, n) { return D.blocks.map((b, i) => i).filter((i) => RES[i].g >= 3 && f(i)).sort((a, b) => RES[b].need - RES[a].need).slice(0, n || 10); }
const blockTable = (ids, extra) => ids.length ? `<div class="tw"><table class="mlist"><thead><tr><th>Block</th><th>Tier, set by</th>${extra ? `<th>${extra[0]}</th>` : ""}</tr></thead><tbody>${ids.map((i) => `<tr><td>${blockLink(i)}</td><td>${tierTxt(i)}</td>${extra ? `<td class="small">${extra[1](i)}</td>` : ""}</tr>`).join("")}</tbody></table></div>` : `<p class="small">None.</p>`;

function panelLandmarks(box, X, p) {
  const isH = (i) => X.hd[i] >= 0, isL = (i) => X.lm[i] > 0, isS = (i) => X.sp[i] >= 0;
  const any = (i) => isH(i) || isL(i) || isS(i);
  const need = D.blocks.map((b, i) => i).filter((i) => RES[i].g >= 3 && (isH(i) || isL(i))).length;
  const hd = {}; D.blocks.forEach((b, i) => { if (isH(i)) { const k = X.hdN[X.hd[i]]; (hd[k] = hd[k] || [0, 0])[0]++; if (RES[i].g >= 4) hd[k][1]++; } });
  const sp = {}; D.blocks.forEach((b, i) => { if (isS(i)) { const k = X.spN[X.sp[i]]; (sp[k] = sp[k] || [0, 0])[0]++; if (RES[i].g >= 4) sp[k][1]++; } });
  box.innerHTML = `<h3>Landmarks & special districts</h3>
  <p class="lline">${need ? `<b>${need} blocks</b> rated tier 3 or higher here would need Landmarks Preservation Commission review on top of the usual approvals.` : "No tier 3+ block here is in a historic district or holds a landmark."}</p>
  ${stat3([[D.blocks.filter((b, i) => isH(i)).length, "blocks in a historic district"], [D.blocks.filter((b, i) => isL(i)).length, "blocks with a landmark lot"], [D.blocks.filter((b, i) => isS(i)).length, "blocks in a special purpose district"]])}
  <details class="lmore"><summary>Show details</summary>
  ${Object.keys(hd).length ? `<div class="tw"><table class="mlist"><thead><tr><th>Historic district</th><th>Blocks</th><th>Tier 4–5</th></tr></thead><tbody>${Object.entries(hd).sort((a, b) => b[1][1] - a[1][1] || b[1][0] - a[1][0]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v[0]}</td><td>${v[1]}</td></tr>`).join("")}</tbody></table></div>` : ""}
  ${Object.keys(sp).length ? `<div class="tw"><table class="mlist"><thead><tr><th>Special purpose district (code)</th><th>Blocks</th><th>Tier 4–5</th></tr></thead><tbody>${Object.entries(sp).sort((a, b) => b[1][0] - a[1][0]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v[0]}</td><td>${v[1]}</td></tr>`).join("")}</tbody></table></div>` : ""}
  <p class="small">From PLUTO: each tax lot's historic district, landmark flag and first special purpose district. Work on a landmark or in a historic district needs an LPC permit; special districts can add design rules. Full names and boundaries are on <a href="https://zola.planninglabs.nyc/" target="_blank" rel="noopener">ZoLa</a>.</p></details>`;
  wireSel(box);
}
function panelFlood(box, X, p) {
  const inF = (i) => X.fz[i] > 0 || D.blocks[i].fl;
  let far = 0; D.blocks.forEach((b, i) => { if (inF(i) && RES[i].cls === 2) far += b.pop; });
  const top = topBlocks(inF, 10);
  box.innerHTML = `<h3>Flood risk</h3>
  <p class="lline"><b>${t3(D.blocks.map((b, i) => i).filter((i) => inF(i) && RES[i].g >= 3).length, "are")} at least partly in the flood plain.</p>
  ${stat3([[D.blocks.filter((b, i) => inF(i)).length, "blocks with lots in the flood plain"], [n0(far), "of their residents are beyond " + p.T + " min"], [D.blocks.filter((b, i) => X.fz[i] >= 50).length, "blocks mostly in the flood plain"]])}
  <details class="lmore"><summary>Show details</summary>${blockTable(top, ["Lots in flood plain", (i) => X.fz[i] + "%"])}
  <p class="small">From PLUTO's flags for FEMA's 2015 preliminary and 2007 effective flood maps. A unit can still go here with flood-proof siting; to leave these blocks out, tick "Leave out the flood plain" under Where can they go.</p></details>`;
  wireSel(box);
}
function panelPubland(box, X, p) {
  const c = [0, 0, 0, 0]; D.blocks.forEach((b) => c[b.lt || 0]++);
  const top = topBlocks((i) => (D.blocks[i].lt || 0) >= 1 && (D.blocks[i].lt || 0) <= 2, 10);
  box.innerHTML = `<h3>Public land</h3>
  <p class="lline"><b>${t3(D.blocks.map((b, i) => i).filter((i) => RES[i].g >= 3 && [1, 2].includes(D.blocks[i].lt)).length, "have")} a park, plaza or other public lot where a unit could stand without a lease.</p>
  ${stat3([[c[1], "blocks with a park or plaza"], [c[2], "with other public land"], [c[3], "public but secured (schools, depots)"]])}
  <details class="lmore"><summary>Show details</summary>${blockTable(top, ["Public land", (i) => esc(D.blocks[i].pl || LAND[D.blocks[i].lt])])}
  <p class="small">From PLUTO owner names and types, park and plaza outlines. Public land still needs the owning agency's agreement; parkland needs Parks.</p></details>`;
  wireSel(box);
}
function panelTransit(box, X, p) {
  nearAssets();
  const nearT = (i) => D.blocks[i]._sub > 0 || X._near[i].shel > 0 || X._near[i].bike > 0;
  const top = topBlocks(nearT, 10);
  box.innerHTML = `<h3>Transit & mobility</h3>
  <p class="lline"><b>${t3(D.blocks.map((b, i) => i).filter((i) => RES[i].g >= 3 && nearT(i)).length, "are")} next to a subway station, bus shelter or Citi Bike dock. Local Law 58 asks for restrooms near transit and micromobility hubs.</p>
  ${stat3([[D.st.length, "subway stations in or near the district"], [X.pts.shel.length, "bus shelters"], [X.pts.bike.length, "Citi Bike docks"]])}
  <details class="lmore"><summary>Show details</summary>${blockTable(top, ["Nearby", (i) => [D.blocks[i]._sub > 0 ? "subway within 150 m" : "", X._near[i].shel ? X._near[i].shel + " bus shelter" + (X._near[i].shel > 1 ? "s" : "") : "", X._near[i].bike ? "Citi Bike" : ""].filter(Boolean).join(", ")])}
  <p class="small">${(D._sub || []).length} MTA subway restrooms are in or near this district (shown as blue squares). NYC Ferry and Staten Island Ferry landings are not in the open data used here.</p></details>`;
  wireSel(box);
}
function panelReps(box, X, p) {
  const groups = [["co", "City Council", (n) => `https://council.nyc.gov/district-${n}/`], ["sen", "State Senate", (n) => `https://www.nysenate.gov/district/${n}`], ["asm", "Assembly", (n) => `https://nyassembly.gov/mem/?ad=${String(n).padStart(3, "0")}`]];
  const tabOf = ([k, label, url]) => {
    const g = {};
    D.blocks.forEach((b, i) => { const n = X[k][i]; if (!n) return; const a = (g[n] = g[n] || { hi: 0, far: 0, best: -1 }); if (RES[i].g >= 4) a.hi++; if (RES[i].cls === 2) a.far += b.pop; if (RES[i].ok && RES[i].g && (a.best < 0 || RES[i].need > RES[a.best].need)) a.best = i; });
    return Object.entries(g).sort((a, b) => b[1].hi - a[1].hi || b[1].far - a[1].far);
  };
  const T = groups.map((G) => [G, tabOf(G)]);
  const lead = T[0][1][0];
  box.innerHTML = `<h3>Who represents here</h3>
  <p class="lline">${lead ? `Most of the need here is in <b>City Council District ${lead[0]}</b> (${lead[1].hi} tier 4–5 blocks, ${n0(lead[1].far)} residents beyond ${p.T} min).` : "No council district data for this area."}</p>
  ${stat3(T.map(([G, rows]) => [rows.length, G[1] + " districts"]))}
  <details class="lmore"><summary>Show details</summary>
  ${T.map(([G, rows]) => `<div class="tw"><table class="mlist"><thead><tr><th>${G[1]} district</th><th>Tier 4–5 blocks</th><th>Residents beyond ${p.T} min</th><th>Highest-need allowed block</th></tr></thead><tbody>${rows.map(([n, a]) => `<tr><td><a href="${G[2](n)}" target="_blank" rel="noopener">${n}</a></td><td>${a.hi}</td><td>${n0(a.far)}</td><td>${a.best >= 0 ? blockLink(a.best) : "–"}</td></tr>`).join("")}</tbody></table></div>`).join("")}
  <p class="small">${X.cb ? esc(X.cb.n) + (X.cb.dm ? ", district manager " + esc(X.cb.dm) : "") + ". " : ""}Districts are assigned by the block's centre (State Senate and Assembly) or its tax lots (Council). Links go to each office's page.</p>
  <div class="btnrow"><button class="btn" id="repCsv">Outreach sheet (CSV)</button></div></details>`;
  wireSel(box);
  $("repCsv").onclick = () => download("bathroom-sandbox-outreach-" + slug(D.name) + ".csv", csvOf(T.flatMap(([G, rows]) => rows.map(([n, a]) => ({ body: G[1], district: n, tier45_blocks: a.hi, residents_beyond_walk: Math.round(a.far), highest_need_block: a.best >= 0 ? place(D.blocks[a.best]) : "", page: G[2](n) })))), "text/csv");
}
function panelVuln(box, X, p) {
  let vul = 0, pov = 0, nyFar = 0, dc = 0;
  D.blocks.forEach((b, i) => { if (RES[i].cls === 2) { if (b._s65 != null) vul += b.pop * (b._s65 + b._s5 + (b._sd || 0)); if (b._pv != null) pov += b.pop * b._pv; if (X.ny[i]) nyFar++; } if (b.di) dc++; });
  const top = topBlocks((i) => RES[i].drv === 1 || RES[i].drv === 2 || X.ny[i] > 0 || D.blocks[i].di, 10);
  box.innerHTML = `<h3>Equity</h3>
  <p class="lline">Beyond ${p.T} minutes of a restroom here: about <b>${n0(vul)}</b> residents who are 65+, under 5 or disabled, and <b>${n0(pov)}</b> in poverty.</p>
  ${stat3([[D.blocks.map((b, i) => i).filter((i) => RES[i].g && (RES[i].drv === 1 || RES[i].drv === 2)).length, "blocks whose tier is set by residents or poverty"], [nyFar, "public housing blocks beyond " + p.T + " min"], [dc, "blocks near a homeless drop-in centre"]])}
  <details class="lmore"><summary>Show details</summary>${blockTable(top, ["Why", (i) => [RES[i].drv === 1 ? "vulnerable residents" : RES[i].drv === 2 ? "poverty" : "", X.ny[i] ? "NYCHA" : "", D.blocks[i].di ? "drop-in centre" : ""].filter(Boolean).join(", ")])}
  <p class="small">Resident shares are Census tract estimates. Public housing is read from PLUTO owner names (NYC Housing Authority). Shelter addresses are not published.</p></details>`;
  wireSel(box);
}

