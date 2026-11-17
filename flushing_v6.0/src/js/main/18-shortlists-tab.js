/* ---------- Shortlists: the memo's 30, citywide next sites, fix first, BIDs ---------- */
let SL = {};
function slRender() {
  if ($("slMemo")) $("slMemo").innerHTML = `<div class="tw"><table class="mlist"><thead><tr><th>#</th><th>Site</th><th>District</th><th>Tier (set by)</th><th>Walk then</th><th>Suggested type</th></tr></thead><tbody>${MEMO30.map((r) => `<tr>${r.map((c) => `<td>${esc(c.trim())}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function slRun(kind) {
  const out = $("sl" + kind), p = P();
  out.innerHTML = `<p class="small">Scoring all ${DATA.order.length} districts…</p>`;
  setTimeout(() => {
    let rows = [];
    if (kind === "Next") {
      const o = st, all = [];
      DATA.order.forEach((id) => {
        const K = prep(DATA.d[id]), x = pickSites(K, o, 2, p);
        x.picks.forEach((i, n) => all.push({ need: x.info[n].need, rank: 0, site: label(K.blocks[i]), district: K.name.split(" · ")[0], tier: x.info[n].g, set_by: x.info[n].drv >= 0 ? DRV[x.info[n].drv] : "", suggested_type: siteCheck(K, K.blocks[i]).type, visits_a_day: Math.round(x.info[n].added) }));
      });
      rows = all.sort((a, b) => b.need - a.need).slice(0, 30).map((r, k) => { const { need, ...x } = r; return { ...x, rank: k + 1 }; });
    }
    if (kind === "Out") rows = outAll(p);
    if (kind === "Fix") rows = fixFirstAll(p).slice(0, 30).map((x, k) => ({ rank: k + 1, restroom: x.n, operator: x.op, district: x.dist, why_it_does_not_count: x.why, residents_gained: Math.round(x.gain), tier45_blocks_reached: x.hi }));
    if (kind === "Bid") { const save = { ...ls }; ls.zmode = $("slZm").value; ls.zsort = $("slZs").value; rows = bidAllRows(ls.zmode, ls.zsort, p).slice(0, 15); Object.assign(ls, save); }
    SL[kind] = rows;
    const cols = rows.length ? Object.keys(rows[0]) : [];
    out.innerHTML = rows.length ? `<div class="tw"><table class="mlist"><thead><tr>${cols.map((c) => `<th>${esc(colLabel(c))}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="btnrow"><button class="btn" id="sl${kind}Csv">Save (CSV)</button></div>` : `<p class="small">Nothing to list on these settings.</p>`;
    if ($("sl" + kind + "Csv")) $("sl" + kind + "Csv").onclick = () => download("bathroom-sandbox-" + kind.toLowerCase() + "-shortlist.csv", csvOf(rows), "text/csv");
  }, 30);
}
function bidAllRows(mode, sort, p) {
  const by = {};
  DATA.order.forEach((id) => {
    const X = LENS.d[id];
    if (!X || !DATA.d[id]) return;
    const K = prep(DATA.d[id]), res = scoreAll(K, st, [], p);
    bidStats(K, X, res, mode).forEach((o) => {
      const a = by[o.bd.n] || (by[o.bd.n] = { bid: o.bd.n, districts: new Set(), tier45_blocks: 0, residents_beyond_walk: 0, passing_desk_review: 0, best_block: "", _need: 0, phone: phoneFmt(o.bd.ph), email: o.bd.em || "" });
      a.districts.add(K.name.split(" · ")[0]); a.tier45_blocks += o.hi; a.residents_beyond_walk += Math.round(o.far); a.passing_desk_review += o.okn;
      if (o.best >= 0 && o.bestNeed > a._need) { a._need = o.bestNeed; a.best_block = place(K.blocks[o.best]) + " (tier " + res[o.best].g + ")"; }
    });
  });
  const key = sort === "far" ? "residents_beyond_walk" : sort === "ok" ? "passing_desk_review" : "tier45_blocks";
  return Object.values(by).sort((a, b) => b[key] - a[key] || b.tier45_blocks - a.tier45_blocks).map((a, k) => { const { _need, districts, ...r } = a; return { rank: k + 1, bid: r.bid, districts: [...districts].join("; "), ...r }; });
}

