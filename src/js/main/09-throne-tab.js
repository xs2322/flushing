/* ---------- Throne check: would FLUSHING have seen the 17 announced sites, and is that better than chance? ---------- */
// Scored with the Throne units removed. Each test is compared with every block in the same districts,
// so "by chance" means: a site placed on a random block of those districts.
function throneLive() {
  // Always on the default settings, with the 17 Throne units left out, so the check is fixed and the same for everyone.
  const p = defP(),
    o = { ...defSt(), ops: { ...defSt().ops, Throne: false } },
    byCd = {};
  THRONE.forEach((t) => (byCd[t[3]] = byCd[t[3]] || []).push(t));
  const rows = [],
    all = { n: 0, hi: 0, pick: 0 },
    missing = [];
  for (const cd in byCd) {
    if (!DATA.d[cd]) {
      missing.push(cd);
      continue;
    }
    const K = prep(DATA.d[cd]),
      res = noEdits(K, () => scoreAll(K, o, [], p)),
      sites = byCd[cd];
    const nearest = (x, y) =>
      K.blocks.reduce(
        (m, b, i) =>
          Math.hypot(b.c[0] - x, b.c[1] - y) <
          Math.hypot(K.blocks[m].c[0] - x, K.blocks[m].c[1] - y)
            ? i
            : m,
        0,
      );
    // FLUSHING's own picks: as many units as the city placed in this district, on public land as the pilot was
    const picks = noEdits(K, () =>
        pickSites(K, { ...o, site: "public" }, sites.length, p),
      ).picks.map((i) => K.blocks[i].c),
      toPick = (x, y) =>
        picks.length
          ? Math.min(...picks.map((c) => Math.hypot(c[0] - x, c[1] - y)))
          : Infinity;
    for (const t of sites) {
      const [x, y] = toXY(K, t[2], t[1]),
        nb = nearest(x, y);
      rows.push({ t, cd, r: res[nb], blk: K.blocks[nb], pick: toPick(x, y) });
    }
    K.blocks.forEach((b, i) => {
      all.n++;
      if (res[i].g >= 3) all.hi++;
      if (toPick(b.c[0], b.c[1]) <= 400) all.pick++;
    });
  }
  const n = rows.length,
    hi = rows.filter((x) => x.r.g >= 3).length,
    share = all.n ? all.hi / all.n : 0,
    near = rows.filter((x) => x.pick <= 400).length,
    dist = (m) =>
      isFinite(m)
        ? m < 1000
          ? Math.round(m / 10) * 10 + " m"
          : (m / 1000).toFixed(1) + " km"
        : "–",
    chip = (g) =>
      `<i class="chip" style="background:var(--g${g})"></i>${TIERNAME[g]}`,
    bar = (v, max, lab, dark) =>
      `<div class="tbar"><span>${lab}</span><div><i style="width:${Math.round((v / max) * 100)}%;background:${dark ? "var(--g4)" : "var(--line)"}"></i></div><b>${v.toFixed ? (Number.isInteger(v) ? v : v.toFixed(1)) : v}</b></div>`;
  $("backtest").innerHTML =
    (n
      ? `<p><b>With the 17 Throne units left out, ${hi} of the ${n} Throne sites sit on blocks in tier 3 or higher.</b> Across all ${all.n.toLocaleString()} blocks in the same districts, ${Math.round(share * 100)}% are tier 3 or higher, so 17 sites dropped on random blocks would land about ${(share * n).toFixed(1)} on such blocks.</p>
<div class="tbars">${bar(hi, n, "Throne sites on tier 3+ blocks", true)}${bar(share * n, n, "Random placement, on average", false)}</div>
<p><b>If the map placed the same number of units in each district</b>, on public land as the pilot did, ${near} of its picks would fall within a 5-minute walk (400 m) of a Throne site. The map agrees with the city about where need is, and often chooses a different block nearby.</p>
<p class="small">This check always uses the default settings, so it reads the same for everyone. Tiers come from fixed thresholds that are the same in every district, not from ranking blocks against each other, so a tier means the same thing in the Bronx as in Midtown. It is a sense check, not proof: these districts were loaded because Throne is in them.</p>`
      : "") +
    `<div class="tw"><table class="t"><thead><tr><th>Announced site</th><th>District</th><th>Tier of its block</th><th>Deciding factor</th><th>Walk to nearest other restroom</th><th>Nearest map pick</th></tr></thead><tbody>${rows
      .map(
        (x) =>
          `<tr><td>${esc(x.t[0])}</td><td>${esc(cdName(x.cd).split(" · ")[0])}</td><td>${chip(x.r.g)}</td><td>${x.r.g && x.r.drv >= 0 ? DRV[x.r.drv] : "–"}</td><td class="n">${isFinite(x.r.walk) ? mins(x.r.walk) + " min" : "none in reach"}</td><td class="n">${dist(x.pick)}</td></tr>`,
      )
      .join(
        "",
      )}${missing.map((cd) => `<tr><td colspan="5">${esc(cdName(cd))}: not loaded.</td><td><button class="btn" data-build="${cd}">Build it</button></td></tr>`).join("")}</tbody></table></div>`;
  $("backtest")
    .querySelectorAll("[data-build]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          location.hash = "map";
          tab();
          $("datasec").open = true;
          $("cdpick").value = b.dataset.build;
          $("bbuild").click();
        }),
    );
}

