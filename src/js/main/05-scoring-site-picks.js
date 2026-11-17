/* ---------- scoring ---------- */
// Current assumptions from the Map page; `over` replaces any of them (used to score the defaults).
function P(over) {
  if (over) return { ...P(), ...over };
  const v = (id, d, lo) => Math.max(lo, +$(id).value || d);
  return {
    rate: v("rate", 1, 0.001) / 100,
    cap: v("cap", 215, 1),
    cost: v("cost", 235000, 1),
    T: v("tmin", 10, 1),
    speed: v("speed", 64, 10),
    det: v("det", 1.45, 1),
    th: readTh(),
  };
}
// Reads the tier-threshold table on the Map page (falls back to the defaults).
// The default settings, used for the fixed reference results (the memo's 30 sites and the Throne check)
// so they do not move when a viewer changes a threshold or a restroom.
const defSt = () => ({
  ...st,
  on: { F: false, L: false, U: true, S: false, H: true, I: true, C: true },
  site: "curb",
  season: "win",
  flood: false,
  acc: false,
  water: false,
  ops: Object.fromEntries(OPS.map((o) => [o[0], o[0] !== "Subway"])), opx: {},
});
const defP = () =>
  P({
    rate: DEFAULTS.rate / 100,
    cap: DEFAULTS.cap,
    cost: DEFAULTS.cost,
    T: DEFAULTS.tmin,
    speed: DEFAULTS.speed,
    det: DEFAULTS.det,
    th: thDefault(),
  });
function noEdits(K, f) {
  const { off, user } = K;
  K.off = {};
  K.user = [];
  try {
    return f();
  } finally {
    K.off = off;
    K.user = user;
  }
}
const thDefault = () => {
  const d = TH_PRESETS.dot;
  return {
    sub: d.sub,
    vul: d.vul.map((x) => x / 100),
    pov: d.pov.map((x) => x / 100),
    c311: d.c311,
  };
};
function readTh() {
  const d = TH_PRESETS.dot,
    g = (id, def) => {
      const e = $(id),
        x = e ? parseFloat(e.value) : NaN;
      return isFinite(x) ? x : def;
    };
  return {
    // v5.3b: cut-offs are sorted, so a tier is never reached without passing the tier below it
    sub: [3, 4, 5].map((t, i) => g("thsub" + t, d.sub[i] / 1000) * 1000).sort((a, b) => a - b),
    vul: [2, 3, 4, 5].map((t, i) => g("thvul" + t, d.vul[i]) / 100).sort((a, b) => a - b),
    pov: [2, 3, 4, 5].map((t, i) => g("thpov" + t, d.pov[i]) / 100).sort((a, b) => a - b),
    c311: [2, 3, 4, 5].map((t, i) => g("thc" + t, d.c311[i])).sort((a, b) => a - b),
  };
}
function isCounted(K, r, o) {
  o = o || st;
  const win = o.on.S && o.season === "win",
    eve = o.on.S && o.season === "eve";
  return !!(
    r.ok &&
    o.ops[r.t] !== false &&
    !(win && r.se) &&
    !(eve && !r.ev) &&
    !(o.acc && r.ac !== 2 && r.t !== "User") &&
    !(o.cs && !(r.cs >= 1) && r.t !== "User") &&
    !(o.ag && !r.ag && r.t !== "User") &&
    !(o.opx && o.opx[r.op || r.t] === false && r.t !== "User") &&
    !K.off[r._k]
  );
}
const allRest = (K) => K.rest.concat(K._thr, (K._sub || []).filter((s) => !(s._dupList && st.ops.Transit !== false)), K.user);
function counted(K, o, picks) {
  const a = allRest(K).filter((r) => isCounted(K, r, o));
  (picks || []).forEach((i, n) =>
    a.push({
      x: K.blocks[i].c[0],
      y: K.blocks[i].c[1],
      n: "Suggested site " + (n + 1),
      _k: "b" + i,
    }),
  );
  return a;
}
function cross(K, b, r, o) {
  if ((o || st).water || !K._ras) return false;
  const k = b._i + "|" + r._k;
  let v = K._wc.get(k);
  if (v === undefined) {
    v = Geo.waterRun(K._ras, b.c[0], b.c[1], r.x, r.y) > WATER;
    K._wc.set(k, v);
  }
  return v;
}
function feasible(b, o) {
  o = o || st;
  if (o.flood && b.fl) return false;
  switch (o.site) {
    case "open":
      return b.lt === 1;
    case "public":
      return b.lt === 1 || b.lt === 2;
    case "sidewalk":
      return b.lt === 1 || b.lt === 2 || b.sw >= SIDEWALK_FT;
    default:
      return true;
  }
}
const siteName = (o) =>
  SITE.find((x) => x[0] === (o || st).site)[1].toLowerCase();
function calc(K, b, R, p, o) {
  o = o || st;
  let best = 1e9,
    nm = null;
  const wd = [];
  for (const r of R) {
    const d = Math.hypot(r.x - b.c[0], r.y - b.c[1]);
    if (d >= best) continue;
    if (cross(K, b, r, o)) {
      wd.push(d);
      continue;
    }
    best = d;
    nm = r.n;
  }
  const wet = wd.filter((d) => d < best).length;
  const none = best >= 1e9,
    walk = none ? Infinity : (best * (p.det || DETOUR)) / p.speed,
    half = p.T / 2,
    N = none ? 1 : Math.max(0, Math.min(1, (walk - half) / half));
  const win = o.on.S && o.season === "win",
    tr = b.tr * (win ? b.wr : 1),
    street = CAL[b.pd],
    U = o.on.U ? Math.max(street, tr) : K._umed;
  const hasH = b._s65 != null,
    hasI = b._pv != null,
    th = p.th,
    cut = (v, c) => c.reduce((t, x, k) => (v >= x ? k + 2 : t), 1),
    sub = b._sub, // v5.3b: DOT's corridor class is year-round, so the subway rule uses the yearly average in every scenario
    subT = !(sub > 0)
      ? 0
      : sub >= th.sub[2] ? 5 : sub >= th.sub[1] ? 4 : sub >= th.sub[0] ? 3 : 0,
    share = hasH ? b._s65 + b._s5 + (b._sd || 0) : null,
    T4 = [
      o.on.U ? Math.max(6 - b.pd, subT) : 0,
      o.on.H && hasH && b.pop >= MIN_RES ? cut(share, th.vul) : 0,
      o.on.I && hasI && b.pop >= MIN_RES ? cut(b._pv, th.pov) : 0,
      (o.on.C ?? o.on.I) ? cut(b.c3 || 0, th.c311) : 0,
      // v5.3b: its own reason, whoever lives here (people without a home are not residents in the census)
      o.on.H && b.di ? 4 : 0,
    ],
    top = Math.max(1, ...T4),
    drv = Math.max(...T4) > 0 ? T4.indexOf(Math.max(...T4)) : -1,
    tie = drv >= 0 ? T4.map((t, k) => (t === T4[drv] ? k : -1)).filter((k) => k >= 0) : [], // v5.3b: every reason at the top tier
    cls = walk <= half ? 0 : walk <= p.T ? 1 : 2,
    g = cls === 0 ? 0 : cls === 1 ? Math.max(1, top - 1) : top;
  // Visits a day are kept for contracts and cost; they do not rank blocks.
  const demand = U * p.rate,
    uses = Math.min(demand, p.cap),
    added = uses * N,
    need = g ? g * 1e7 + Math.min(U, 9e6) + b.pop / 1e4 : 0; // rank: tier, then people on foot, then residents
  return {
    walk,
    N,
    nm,
    wet,
    cls,
    U,
    tr,
    street,
    sub,
    subT,
    share,
    T4,
    top,
    drv,
    tie,
    hasH,
    hasI,
    demand,
    uses,
    added,
    need,
    g,
    cpu: added >= 0.5 ? p.cost / (added * 365) : null,
    ok: feasible(b, o),
  };
}
const cpuBin = (c) =>
  c == null ? 0 : c <= 5 ? 5 : c <= 10 ? 4 : c <= 20 ? 3 : c <= 50 ? 2 : 1;
function scoreAll(K, o, picks, p = P()) {
  const R = counted(K, o, picks);
  return K.blocks.map((b) => calc(K, b, R, p, o));
}

/* Pick sites. Each round: score every block, take the one with the most need, put the unit on the nearest block that passes Land
   (itself, or one within SNAP metres), count that unit as built, and score again. Stops when no block is left with a gap. */
function pickSites(K, o, n, pIn, near) {
  const p = pIn || P(),
    picks = [],
    info = [],
    skipped = [],
    skip = new Set();
  for (let k = 0; k < n; ) {
    const R = counted(K, o, picks),
      res = K.blocks.map((b) => calc(K, b, R, p, o));
    let bi = -1,
      bv = 0;
    res.forEach((r, i) => {
      if (skip.has(i) || picks.includes(i)) return;
      // near(i, picks): ring-aware picking. Same tier order; inside a tier, blocks in a service ring come first.
      const v = near
        ? Math.floor(r.need / 1e7) * 1e8 + (r.need >= 1 ? Math.round(5e7 * near(i, picks)) : 0) + (r.need % 1e7) + r.demand * 1e-6
        : r.need + r.demand * 1e-6;
      if (r.need >= 1 && v > bv) {
        bv = v;
        bi = i;
      }
    });
    if (bi < 0) break;
    const b = K.blocks[bi];
    let site = bi,
      moved = 0;
    if (!res[bi].ok) {
      site = -1;
      let bd = SNAP;
      K.blocks.forEach((q, i) => {
        if (!res[i].ok || picks.includes(i)) return;
        const d = Math.hypot(q.c[0] - b.c[0], q.c[1] - b.c[1]);
        if (d <= bd) {
          bd = d;
          site = i;
        }
      });
      moved = Math.round(bd);
    }
    if (site < 0) {
      skip.add(bi);
      if (skipped.length < 4) skipped.push({ i: bi, need: res[bi].need });
      continue;
    }
    picks.push(site);
    info.push({
      from: bi,
      moved: site === bi ? 0 : moved,
      need: res[bi].need,
      added: res[bi].added,
      cpu: res[bi].cpu,
      g: res[bi].g,
      drv: res[bi].drv,
    });
    k++;
  }
  return { picks, info, skipped };
}
// The memo's list: every built district gets one unit, then a second goes to the 13 districts whose
// next-best block ranks highest; all 30 are ranked by tier, then people on foot. Always the default settings,
// so the list is a fixed reference that matches the memo whatever a viewer changes.
function memoSites() {
  const ids = DATA.order.filter((id) => DATA.d[id]),
    Ks = {},
    o = defSt(),
    p = defP();
  ids.forEach((id) => (Ks[id] = id === D.id ? D : prep(DATA.d[id])));
  const second = new Set(
    ids
      .map((id) => {
        const x = noEdits(Ks[id], () => pickSites(Ks[id], o, 2, p));
        return [id, x.info[1] ? x.info[1].need : -1];
      })
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(13, Math.max(0, 30 - ids.length)))
      .map((x) => x[0]),
  );
  const rows = [];
  ids.forEach((id) => {
    const K = Ks[id],
      n = second.has(id) ? 2 : 1,
      x = noEdits(K, () => pickSites(K, o, n, p)),
      res = noEdits(K, () => scoreAll(K, o, [], p));
    x.picks.forEach((i, k) =>
      rows.push({
        id,
        n,
        b: K.blocks[i],
        q: x.info[k],
        walk: res[x.info[k].from].walk,
        name: K.name.split(" · ")[0],
      }),
    );
  });
  rows.sort((a, b) => b.q.need - a.q.need);
  const box = $("picks");
  box.hidden = false;
  box.innerHTML =
    `<h3>The next ${rows.length} sites to consider, across ${ids.length} districts</h3><p class="small" style="margin:0 0 8px">The reference list in our memo, always on the default settings so it does not change when you edit a threshold. One unit per district, then a second in the 13 districts whose next-best block ranks highest; sorted by tier, then people on foot; public land or a parking space allowed. Click a row to open that district and pick its sites with your own settings. Every site still needs a site visit.</p>` +
    `<table class="mlist"><thead><tr><th>#</th><th>Site</th><th>District</th><th>Tier (set by)</th><th>Walk now</th><th>Suggested type</th></tr></thead><tbody>` +
    rows
      .map(
        (r, k) =>
          `<tr data-mid="${esc(r.id)}" data-mn="${r.n}" tabindex="0"><td>${k + 1}</td><td>${esc(place(r.b))}</td><td>${esc(r.name)}</td><td>${r.q.g}${r.q.drv >= 0 ? ` <span class="small">(${DRV[r.q.drv]})</span>` : ""}</td><td>${isFinite(r.walk) ? f1(r.walk) + " min" : "–"}</td><td>${typeIcon(siteCheck(DATA.d[r.id], r.b).type)} ${esc(siteCheck(DATA.d[r.id], r.b).type)}</td></tr>`,
      )
      .join("") +
    `</tbody></table>`;
  box.querySelectorAll("tr[data-mid]").forEach((tr) => {
    const go = () => {
      showDist(tr.dataset.mid);
      load(tr.dataset.mid);
      $("npick").value = tr.dataset.mn;
      pick();
      $("mapbox").scrollIntoView({ block: "center" });
    };
    tr.onclick = go;
    tr.onkeydown = (e) => e.key === "Enter" && go();
  });
}
// Puts a built district in the district list (if it is not there yet) and selects it.
function showDist(id) {
  if (!SHOWN.has(id)) {
    SHOWN.add(id);
    fillDistricts();
  }
  $("dist").value = id;
}
function pick() {
  const x = pickSites(D, st, +$("npick").value);
  st.picks = x.picks;
  st.pickInfo = x.info;
  st.skipped = x.skipped;
  render();
}

