/* ---------- site profiles: one standard page per site, in the same words in every district ---------- */
function profiles(S, p) {
  const X = LX(), when = new Date().toISOString().slice(0, 10);
  const pages = S.units.map((u, n) => {
    const b = D.blocks[u.i], r = RES[u.i], c = siteCheck(D, b, r), cb = X.cb, bd = X.bid[u.i] >= 0 ? X.bids[X.bid[u.i]] : null;
    return `<section class="pg"><p class="k">Bathroom Demand Sandbox site profile ${n + 1} of ${S.units.length} · ${esc(D.name.split(" · ")[0])} · ${when}</p>
    <h1>${esc(place(b))}</h1>
    <p class="lede">${TIERNAME[r.g]} of 5${r.drv >= 0 ? ", set by " + DRV[r.drv] : ""}. ${plainWhy(b, r, p).replace(/<br>/g, " ").replace(/<[^>]+>/g, "")}</p>
    <h2>1. Why here</h2><table><tr><td>Walk to nearest open restroom today</td><td>${isFinite(r.walk) ? f1(r.walk) + " min" : "none in reach"}</td></tr><tr><td>Residents on the block</td><td>${b.pop.toLocaleString()}</td></tr><tr><td>Factor ratings (foot traffic, vulnerable, poverty, complaints)</td><td>${r.T4.map((t) => t || "–").join(" · ")}</td></tr><tr><td>Visits a day (estimate, for contracts)</td><td>${Math.round(u.v)}</td></tr></table>
    <h2>2. Can it stand here (desk review)</h2><ul>${c.ok.map((x) => `<li>${x[0] ? "✓" : "✕"} ${x[1].replace(/<[^>]+>/g, "")}</li>`).join("")}</ul><p><b>Suggested type:</b> ${esc(c.type)}. <b>Approvals:</b> ${c.ap.join(" → ")}.</p>
    <h2>3. How it would run</h2><p>Service ring ${u.ring + 1}${S.rings[u.ring].hub ? ", hub " + esc(S.rings[u.ring].hub.n) : ""}; about ${f1(u.cl)} cleanings a day.</p><ul>${scopeFor(u.drv).map((x) => `<li><b>${x[1]}:</b> ${esc(x[0].replace("12", ls.m.every))}</li>`).join("")}</ul>
    <h2>4. Who to talk to</h2><ul>${cb ? `<li>${esc(cb.n)}${cb.dm ? ", district manager " + esc(cb.dm) : ""}. ${esc(cb.ph || "")} ${esc(cb.em || "")}</li>` : ""}${X.co[u.i] ? `<li>City Council District ${X.co[u.i]}: council.nyc.gov/district-${X.co[u.i]}/</li>` : ""}${bd ? `<li>${esc(bd.n)} (BID) ${esc(phoneFmt(bd.ph))} ${esc(bd.em || "")}</li>` : "<li>No BID</li>"}</ul><p>Zoning: ${esc(ZTXT(X.z[u.i]))}. Within 100 m: ${esc(nearText(u.i))}.</p>
    <h2>5. What the site visit must check</h2><ul>${c.visit.map((v) => `<li>☐ ${esc(v)}</li>`).join("")}<li>☐ Photos from each side; note benches, shelters, kiosks and doors within 30 m</li><li>☐ Comments from the community board and interviewees on this profile</li></ul>
    <p class="k">Screening only, from public data. Not a siting decision. Method and sources: NYC Bathroom Demand Sandbox, Numbers page.</p></section>`;
  });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Bathroom Demand Sandbox site profiles · ${esc(D.name.split(" · ")[0])}</title><style>body{font:15px/1.45 system-ui,Segoe UI,Arial,sans-serif;color:#14212b;margin:0}.pg{max-width:760px;margin:0 auto;padding:28px 32px;page-break-after:always;border-bottom:1px solid #ccc}h1{font-size:26px;margin:4px 0 8px}h2{font-size:15px;text-transform:uppercase;letter-spacing:.05em;margin:18px 0 6px;color:#0b5f8a}.k{font-size:12px;color:#56646f;margin:0}.lede{font-size:16px}table{border-collapse:collapse;width:100%}td{border-bottom:1px solid #e3e7ea;padding:5px 6px;vertical-align:top}td:last-child{text-align:right;font-weight:600}ul{margin:4px 0;padding-left:20px}@media print{.pg{border:0}}</style></head><body>${pages.join("")}</body></html>`;
  download("bathroom-sandbox-site-profiles-" + slug(D.name) + ".html", html, "text/html");
}

/* ---------- Numbers page: sensitivity of the results to each constant ---------- */
function sensRun() {
  const out = $("sensOut");
  out.innerHTML = `<p class="small">Running on ${esc(D.name.split(" · ")[0])}…</p>`;
  setTimeout(() => {
    const o = defSt(), base = defP();
    const V = [
      ["Defaults (detour 1.45, DOT's subway rule)", {}],
      ["Detour factor 1.3 (a near-perfect grid)", { det: 1.3 }],
      ["Detour factor 1.6 (the longest quarter of routed walks)", { det: 1.6 }],
      ["Walking speed 80 m/min (brisk adult)", { speed: 80 }],
      ["Earlier subway cut-offs (20,000 / 50,000 / 100,000 a day)", { th: { ...thDefault(), sub: TH_PRESETS.v3.sub } }],
      ["Equity first cut-offs", { th: { ...thDefault(), vul: TH_PRESETS.equity.vul.map((x) => x / 100), pov: TH_PRESETS.equity.pov.map((x) => x / 100), c311: TH_PRESETS.equity.c311 } }],
      ["Residents only (foot traffic switched off)", { noU: true }],
    ];
    let p0 = null, picks0 = null;
    const rows = V.map(([t, over]) => {
      const p = { ...base, ...over };
      const oo = over.noU ? { ...o, on: { ...o.on, U: false } } : o;
      const res = noEdits(D, () => scoreAll(D, oo, [], p));
      let far = 0, t5 = 0;
      D.blocks.forEach((b, i) => { if (res[i].cls === 2) far += b.pop; if (res[i].g === 5) t5++; });
      const pk = noEdits(D, () => pickSites(D, oo, 5, p)).picks;
      if (!p0) { p0 = far; picks0 = pk; }
      const same = pk.filter((i) => picks0.includes(i)).length;
      return `<tr><td>${t}</td><td>${n0(far)}</td><td>${far === p0 ? "–" : (far > p0 ? "+" : "") + n0(far - p0)}</td><td>${t5}</td><td>${same} of 5</td></tr>`;
    });
    out.innerHTML = `<div class="tw"><table class="t"><thead><tr><th>Change one number</th><th>Residents beyond 10 min</th><th>Change</th><th>Tier 5 blocks</th><th>First 5 picks unchanged</th></tr></thead><tbody>${rows.join("")}</tbody></table></div><p class="small">${esc(D.name)}. Default land rule (public land or a parking space), your added restrooms ignored. Open another district on the Map page and run again.</p>`;
  }, 30);
}


/* ---------- Coverage: fix-first shortlist of existing restrooms ----------
   Restrooms that exist (or are planned) but do not count under the strict rule, ranked by how many residents would be
   brought within the walk standard if that one restroom were fixed: reopened, kept open year-round, made accessible,
   given later hours or a changing station. Fixing is usually cheaper and faster than siting a new unit. */
function fixReasons(K, r, o) {
  const out = [];
  if (!r.ok) out.push(r.st && r.st !== "Operational" ? r.st.toLowerCase() : "not operational");
  if (r.fu) out.push("planned, not yet open");
  if (o.on.S && o.season === "win" && r.se) out.push("seasonal");
  if (o.on.S && o.season === "eve" && !r.ev) out.push("closes before 8 pm");
  if (o.acc && r.ac !== 2) out.push(r.ac === 1 ? "partly accessible" : r.ac === 0 ? "not accessible" : "accessibility not listed");
  if (o.cs && !(r.cs >= 1)) out.push("no changing station");
  if (o.ag && !r.ag) out.push("not all-gender");
  if (o.ops[r.t] === false) out.push(r.t === "Subway" ? "subway restroom (switched off)" : "type switched off");
  if (K.off[r._k]) out.push("you stopped counting it");
  return out;
}
function fixFirst(K, p, o, base) {
  const half = p.T, rows = [];
  allRest(K).forEach((r) => {
    if (r.t === "User" || isCounted(K, r, o)) return;
    let gain = 0, hi = 0, blocks = 0;
    K.blocks.forEach((b, i) => {
      if (base[i].cls !== 2) return;
      const w = (Math.hypot(r.x - b.c[0], r.y - b.c[1]) * (p.det || DETOUR)) / p.speed;
      if (w > half || cross(K, b, r, o)) return;
      gain += b.pop; blocks++; if (base[i].g >= 4) hi++;
    });
    if (gain > 0 || hi > 0) rows.push({ r, gain, hi, blocks, why: fixReasons(K, r, o) });
  });
  return rows.sort((a, b) => b.gain - a.gain || b.hi - a.hi);
}
let FIXLIST = [];
function fixFirstHtml(p) {
  const rows = fixFirst(D, p, strictO(), LR.strict).slice(0, 10);
  return `<h4 class="sub" style="margin-top:16px">Fix first: existing restrooms worth more than a new unit</h4>
  <p class="small" style="margin:0 0 6px">Restrooms that exist (or are planned) but fail the strict rule, ranked by residents who would gain a restroom within ${p.T} minutes if that one were fixed.</p>
  ${rows.length ? `<div class="tw"><table class="mlist"><thead><tr><th>#</th><th>Restroom</th><th>Why it does not count</th><th>Residents gained</th><th>Tier 4–5 blocks reached</th></tr></thead><tbody>${rows.map((x, k) => `<tr><td>${k + 1}</td><td><a href="#" data-selr="${x.r._k}">${esc(x.r.n)}</a><br><span class="small">${esc(x.r.op || x.r.t)}</span></td><td class="small">${esc(x.why.join("; ") || "–")}${x.r.nt ? `<br><i>${esc(x.r.nt)}</i>` : ""}</td><td>${n0(x.gain)}</td><td>${x.hi}</td></tr>`).join("")}</tbody></table></div>` : `<p class="small">Every restroom here already counts under the strict rule, or fixing one would not reach anyone new.</p>`}
  <p class="small">The citywide fix-first list is on the <a href="#shortlists" data-tab="shortlists">Shortlists</a> page.</p>`;
}
function fixFirstWire(p) {
  $("lens").querySelectorAll("a[data-selr]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); st.selR = a.dataset.selr; st.sel = null; render(); $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" }); }));
  $("lens").querySelectorAll("a[data-tab]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); location.hash = a.dataset.tab; tab(); window.scrollTo(0, 0); }));
  if (!$("fixAll")) return;
  $("fixAll").onclick = () => {
    $("fixList").innerHTML = `<p class="small">Scoring every district…</p>`;
    setTimeout(() => {
      FIXLIST = fixFirstAll(p);
      $("fixList").innerHTML = `<div class="tw"><table class="mlist"><thead><tr><th>#</th><th>Restroom</th><th>District</th><th>Why it does not count</th><th>Residents gained</th><th>Tier 4–5 blocks</th></tr></thead><tbody>${FIXLIST.slice(0, 15).map((x, k) => `<tr><td>${k + 1}</td><td><b>${esc(x.n)}</b><br><span class="small">${esc(x.op)}</span></td><td class="small">${esc(x.dist)}</td><td class="small">${esc(x.why)}</td><td>${n0(x.gain)}</td><td>${x.hi}</td></tr>`).join("")}</tbody></table></div><p class="small">Strict rule as ticked above; your other settings apply. A restroom shared by two districts is counted in each.</p>`;
      $("fixCsv").hidden = false;
      $("fixCsv").onclick = () => download("bathroom-sandbox-fix-first-shortlist.csv", csvOf(FIXLIST.map((x, k) => ({ rank: k + 1, restroom: x.n, operator: x.op, district: x.dist, why_it_does_not_count: x.why, residents_gained: Math.round(x.gain), tier45_blocks_reached: x.hi, notes: x.nt || "", lon: x.ll[0], lat: x.ll[1] }))), "text/csv");
    }, 30);
  };
}
function fixFirstAll(p) {
  const o = strictO(), out = [];
  DATA.order.forEach((id) => {
    if (!DATA.d[id]) return;
    const K = prep(DATA.d[id]), base = scoreAll(K, o, [], p);
    fixFirst(K, p, { ...o, ops: { ...o.ops } }, base).forEach((x) => out.push({ n: x.r.n, op: x.r.op || x.r.t, dist: K.name.split(" · ")[0], why: x.why.join("; "), gain: x.gain, hi: x.hi, nt: x.r.nt, ll: toLL(K, x.r.x, x.r.y) }));
  });
  return out.sort((a, b) => b.gain - a.gain || b.hi - a.hi);
}
const csvOf = (rows) => {
  if (!rows.length) return "";
  const q = (s) => '"' + String(s ?? "").replace(/"/g, '""') + '"', k = Object.keys(rows[0]);
  return [k.join(",")].concat(rows.map((r) => k.map((c) => q(r[c])).join(","))).join("\n");
};
// For scripts and the Numbers page: every shortlist as plain rows, on the current settings.
function shortlists() {
  const p = P(), save = { ...ls };
  const bid = (mode, sort) => {
    ls.zmode = mode; ls.zsort = sort;
    const by = {};
    DATA.order.forEach((id) => {
      const X = LENS.d[id]; if (!X || !DATA.d[id]) return;
      const K = prep(DATA.d[id]), res = scoreAll(K, st, [], p);
      bidStats(K, X, res, mode).forEach((o) => {
        const a = by[o.bd.n] || (by[o.bd.n] = { bid: o.bd.n, districts: new Set(), matching_blocks: 0, tier45_blocks: 0, residents_beyond_walk: 0, tier3plus_passing_desk_review: 0, best_block: "", best_tier: "", deciding_factor: "", _need: 0, phone: phoneFmt(o.bd.ph), email: o.bd.em || "", website: urlFix(o.bd.web) });
        a.districts.add(K.name.split(" · ")[0]); a.matching_blocks += o.m; a.tier45_blocks += o.hi; a.residents_beyond_walk += Math.round(o.far); a.tier3plus_passing_desk_review += o.okn;
        if (o.best >= 0 && o.bestNeed > a._need) { a._need = o.bestNeed; a.best_block = place(K.blocks[o.best]); a.best_tier = res[o.best].g; a.deciding_factor = res[o.best].drv >= 0 ? DRV[res[o.best].drv] : ""; }
      });
    });
    const key = sort === "far" ? "residents_beyond_walk" : sort === "ok" ? "tier3plus_passing_desk_review" : "tier45_blocks";
    return Object.values(by).sort((a, b) => b[key] - a[key] || b.tier45_blocks - a.tier45_blocks).map((a, k) => { const { _need, ...r } = a; return { rank: k + 1, ...r, districts: [...a.districts].join("; ") }; });
  };
  const out = {
    fix_first: fixFirstAll(p).map((x, k) => ({ rank: k + 1, restroom: x.n, operator: x.op, district: x.dist, why_it_does_not_count: x.why, residents_gained: Math.round(x.gain), tier45_blocks_reached: x.hi, notes: x.nt || "", lon: x.ll[0], lat: x.ll[1] })),
    bid_commercial_by_tier45: bid("b", "hi"),
    bid_commercial_by_residents: bid("b", "far"),
    bid_res_overlay_or_commercial_by_tier45: bid("ab", "hi"),
  };
  Object.assign(ls, save);
  return out;
}

