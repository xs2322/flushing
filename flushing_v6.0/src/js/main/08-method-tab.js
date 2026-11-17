/* ---------- Method page: the gauge scale and live feedback on the viewer's own sites and settings ---------- */
const DEFAULTS = { rate: 1, cap: 215, cost: 235000, tmin: 10, speed: 64, det: 1.45 }; // as on the Map page inputs
function methodLive() {
  const p = P(),
    K = D,
    dn = esc(K.name.split(" · ")[0]),
    rg = (a) => String(+(a * p.cap).toFixed(1));
  $("gscale").innerHTML = [
    [
      "Served",
      `An open restroom within a ${mins(p.T / 2)}-minute walk; not ranked`,
    ],
    ["1", "Lowest need among blocks with a gap"],
    ["2", "Low"],
    ["3", "Middle"],
    ["4", "High"],
    ["5", "Highest: at least one factor is in its top tier"],
  ]
    .map(
      (x, i) =>
        `<div><i style="background:var(--g${i})"></i><b>${x[0]}</b><span>${x[1]}</span></div>`,
    )
    .join("");

  // Your sites: one row per pick made on the Map page
  $("picktrace").innerHTML = st.picks.length
    ? `<div class="tw"><table class="t"><thead><tr><th>#</th><th>Site</th><th>Tier (set by)</th><th>Land</th></tr></thead><tbody>${st.picks
        .map((s, n) => {
          const q = st.pickInfo[n];
          return `<tr><td>${n + 1}</td><td>${esc(place(K.blocks[s]))}${q.moved ? `<br><span class="small">moved ${q.moved} m from ${esc(place(K.blocks[q.from]))}</span>` : ""}</td><td>${q.g}${q.drv >= 0 ? " (" + DRV[q.drv] + ")" : ""}</td><td>${landText(K.blocks[s])}</td></tr>`;
        })
        .join("")}</tbody></table></div>` +
      (st.skipped.length
        ? `<p class="small">Passed over, with no eligible land within ${SNAP} m: ${st.skipped.map((k) => esc(place(K.blocks[k.i]))).join(", ")}. Widen the land choice in step 2 to place these.</p>`
        : "") +
      (() => {
        const a = scoreAll(K, st, []),
          b = scoreAll(K, st, st.picks),
          far = (r) => r.filter((x) => x.cls === 2).length,
          hi = (r) => r.filter((x) => x.g >= 4).length;
        return `<p class="small">In ${dn}, blocks beyond a ${p.T}-minute walk go from ${far(a)} to ${far(b)}; blocks in tier 4 or 5 go from ${hi(a)} to ${hi(b)}.</p>`;
      })()
    : `<p class="small">Press "Pick sites" on the Map page. Each site, and why it was chosen, will appear here.</p>`;

  // Your settings: what differs from the defaults, and what that changes in this district
  const changed = [];
  const lab = {
    rate: "Need share",
    cap: "Capacity",
    cost: "Yearly cost",
    tmin: "Walk standard",
    speed: "Walking speed",
    det: "Detour factor",
  };
  for (const k in DEFAULTS) {
    const v = {
      rate: p.rate * 100,
      cap: p.cap,
      cost: p.cost,
      tmin: p.T,
      speed: p.speed,
      det: p.det,
    }[k];
    if (v !== DEFAULTS[k])
      changed.push(`${lab[k]} ${v} (default ${DEFAULTS[k]})`);
  }
  [["U", "Foot traffic"], ["H", "Human need"], ["I", "Income"], ["C", "Nuisance complaints"]].forEach(
    ([k, n]) => st.on[k] === false && changed.push(`${n} switched off`),
  );
  if (JSON.stringify(p.th) !== JSON.stringify(thDefault()))
    changed.push("Tier thresholds changed");
  if (st.on.S) changed.push(st.season === "win" ? "Winter" : "Evening");
  if (st.site !== "curb") changed.push(`Land: ${siteName()}`);
  if (st.flood) changed.push("Flood plain left out");
  if (st.acc) changed.push("Fully accessible restrooms only");
  OPS.forEach(
    (o) => st.ops[o[0]] === false && o[0] !== "Subway" && changed.push(`${o[1]} not counted`),
  );
  if (st.ops.Subway !== false) changed.push("Subway station restrooms counted");
  const nOff = Object.keys(K.off || {}).length + (K.user || []).length;
  if (nOff)
    changed.push(`${nOff} restroom edit${nOff === 1 ? "" : "s"} on the map`);
  let settings;
  if (!changed.length)
    settings = `<p class="small">You are on the defaults. Change an assumption, a letter or a restroom on the Map page and its effect on ${dn} appears here.</p>`;
  else {
    const def = {
        ...st,
        on: { F: false, L: false, U: true, S: false, H: true, I: true, C: true },
        site: "curb",
        flood: false,
        acc: false,
        ops: Object.fromEntries(OPS.map((o) => [o[0], o[0] !== "Subway"])), opx: {},
      },
      pDef = P({
        rate: DEFAULTS.rate / 100,
        cap: DEFAULTS.cap,
        cost: DEFAULTS.cost,
        T: DEFAULTS.tmin,
        speed: DEFAULTS.speed,
        det: DEFAULTS.det,
        th: thDefault(),
      });
    // the defaults also ignore the viewer's restroom edits
    const { off, user } = K;
    K.off = {};
    K.user = [];
    const a = scoreAll(K, def, [], pDef);
    K.off = off;
    K.user = user;
    const b = scoreAll(K, st, []),
      pop = (r, f) =>
        K.blocks.reduce((t, x, i) => t + (f(r[i]) ? x.pop : 0), 0),
      row = (name, f) =>
        `<tr><td>${name}</td><td class="n">${f(a)}</td><td class="n">${f(b)}</td></tr>`;
    settings =
      `<p class="small">Changed from the defaults: ${esc(changed.join("; "))}.</p><div class="tw"><table class="t"><thead><tr><th>${dn}</th><th>Defaults</th><th>Your settings</th></tr></thead><tbody>` +
      row("Residents within a walk standard of a restroom", (r) =>
        pop(r, (x) => x.cls < 2).toLocaleString(),
      ) +
      row(
        "Blocks beyond the walk standard",
        (r) => r.filter((x) => x.cls === 2).length,
      ) +
      row("Blocks in tier 4 or 5", (r) => r.filter((x) => x.g >= 4).length) +
      row("Blocks with eligible land", (r) => r.filter((x) => x.ok).length) +
      `</tbody></table></div>`;
  }
  if (st.sel != null) {
    const b = K.blocks[st.sel];
    settings +=
      `<h4 class="sub">Your selected block: ${esc(label(b))}</h4>` +
      mathRows(K, b, RES[st.sel], p);
  }
  $("examples").innerHTML = settings;
}

