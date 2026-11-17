/* ---------- map ---------- */
const svg = $("map"),
  NS = "http://www.w3.org/2000/svg";
function el(t, a) {
  const e = document.createElementNS(NS, t);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
}
function pth(rings) {
  return rings
    .map((r) => {
      let s = "";
      for (let i = 0; i < r.length; i += 2)
        s += (i ? "L" : "M") + r[i] + " " + -r[i + 1];
      return s + "Z";
    })
    .join("");
}
let vb,
  VB0,
  gB,
  gO,
  gL,
  gM,
  gP,
  RES = [];
const scale = () => {
  const r = svg.getBoundingClientRect();
  return Math.max(vb[2] / (r.width || 900), vb[3] / (r.height || 700));
};
// the view is the district plus a margin, widened or heightened to fill the map box so the surrounding land shows as context
function fit() {
  const B = D._B,
    m = 140,
    W = $("mapbox").clientWidth || 900,
    H = Math.round(
      Math.max(
        440,
        Math.min(
          (W * (B[3] - B[1] + 2 * m)) / (B[2] - B[0] + 2 * m),
          (window.innerHeight || 900) * 0.62,
        ),
      ),
    );
  svg.style.height = H + "px";
  fitW = $("mapbox").clientWidth;
  let w = B[2] - B[0] + 2 * m,
    h = B[3] - B[1] + 2 * m;
  const cx = (B[0] + B[2]) / 2,
    cy = -(B[1] + B[3]) / 2;
  if (w / h < W / H) w = (h * W) / H;
  else h = (w * H) / W;
  VB0 = [cx - w / 2, cy - h / 2, w, h];
  vb = VB0.slice();
  setVB();
}
function setVB() {
  svg.setAttribute("viewBox", vb.join(" "));
}
function load(id) {
  D = prep(DATA.d[id]);
  st.picks = [];
  st.pickInfo = [];
  st.skipped = [];
  st.sel = null;
  st.selR = null;
  $("ops").innerHTML = OPS.map((o, i) => {
    const n = allRest(D).filter((r) => r.t === o[0] && r.ok).length,
      keep = o[0] === "User";
    return `<label class="${n || keep ? "" : "off"}"><input type="checkbox" id="op${i}" ${n || keep ? (st.ops[o[0]] ? "checked" : "") : "disabled"}><span>${o[1]} <span id="opn${i}">(${n})</span></span></label>`;
  }).join("");
  OPS.forEach((o, i) => $("op" + i).addEventListener("input", changed));
  opxRender();
  svg.innerHTML = "";
  fit();
  const defs = el("defs", {});
  defs.innerHTML = `<pattern id="hatch" width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(45) scale(${(vb[2] / 900).toFixed(3)})"><line x1="0" y1="0" x2="0" y2="11" stroke="var(--hatch)" stroke-width="2"/></pattern><pattern id="wet" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-45) scale(${(vb[2] / 900).toFixed(3)})"><line x1="0" y1="0" x2="0" y2="9" stroke="var(--flood)" stroke-width="2.4"/></pattern>`;
  svg.appendChild(defs);
  if (D.land && D.land.length)
    svg.appendChild(
      el("path", {
        d: pth(D.land),
        fill: "var(--land)",
        "pointer-events": "none",
      }),
    );
  svg.appendChild(
    el("path", {
      d: pth(D.cd),
      fill: "var(--street)",
      "pointer-events": "none",
    }),
  );
  gB = el("g", {});
  gO = el("g", { "pointer-events": "none" });
  gL = el("g", { "pointer-events": "none" });
  gM = el("g", {});
  gP = el("g", { "pointer-events": "none" });
  svg.append(gB, gO);
  svg.appendChild(
    el("path", {
      d: pth(D.cd),
      fill: "none",
      stroke: "var(--ink)",
      "stroke-width": 1.6,
      "stroke-dasharray": "7 5",
      "vector-effect": "non-scaling-stroke",
      "pointer-events": "none",
      opacity: 0.7,
    }),
  );
  gX = el("g", { "pointer-events": "none" });
  svg.append(gM, gX, gL, gP);
  D.blocks.forEach((b, i) => {
    b._el = el("path", {
      d: pth(b.g),
      class: "b",
      "data-i": i,
      fill: "var(--g0)",
    });
    gB.appendChild(b._el);
  });
  $("bdrop").hidden = EMBED.has(id);
  $("detail").innerHTML =
    `<h3>Click a block</h3><p class="small" style="margin:0">You will see its need tier, the reason for it, and the full arithmetic. Click a restroom to see what is known about it or to stop counting it.</p>`;
  $("srcdate").textContent =
    "This district was built from these sources on " +
    D.built +
    (D.restAsOf ? `. Restroom list refreshed ${D.restAsOf}.` : ".");
  render();
}

// One plain sentence about the open district, written from the current results.
function districtSummary(p) {
  let far = 0,
    ranked = 0,
    best = -1;
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
  const nm = D.name.split(" · "),
    top = dc.indexOf(Math.max(...dc)),
    thr = allRest(D).filter((r) => r.t === "Throne").length;
  let s = `<b>${esc(nm[0])}</b>${nm[1] ? " (" + esc(nm[1]) + ")" : ""}: ${far.toLocaleString()} residents live beyond a ${p.T}-minute walk of an open restroom.`;
  if (ranked && dc[top])
    s += ` Where a restroom is missing, the tier is most often set by <b>${DRV[top]}</b> (${dc[top].toLocaleString()} of ${ranked.toLocaleString()} ranked blocks).`;
  s += thr ? ` The city placed ${thr === 1 ? "one Throne unit" : thr + " Throne units"} here.` : " The Throne pilot placed no unit here.";
  if (best >= 0)
    s += ` The highest-ranked block where a unit is allowed: <a href="#" data-sel="${best}">${esc(place(D.blocks[best]))}</a>, ${TIERNAME[RES[best].g].toLowerCase()}${RES[best].drv >= 0 ? ", set by " + DRV[RES[best].drv] : ""}.`;
  return s;
}
function render() {
  const p = P();
  RES = scoreAll(D, st, st.picks);
  lensPrep(p);
  let pop = 0,
    p0 = 0,
    p1 = 0,
    un = 0,
    hi = 0;
  D.blocks.forEach((b, i) => {
    const r = RES[i];
    pop += b.pop;
    if (r.cls === 0) p0 += b.pop;
    if (r.cls < 2) p1 += b.pop;
    else un++;
    if (r.g >= 4) hi++;
  });
  const sh = (v) => (pop ? Math.round((v / pop) * 100) + "%" : "–");
  $("headline").innerHTML = headlineHtml();
  $("dsum").innerHTML = districtSummary(p);
  $("stat").innerHTML =
    `<div><b>${sh(p1)}</b><span>of ${pop.toLocaleString()} residents are within a ${p.T}-minute walk of a counted restroom</span></div><div><b>${sh(p0)}</b><span>are within easy reach, ${mins(p.T / 2)} minutes</span></div><div><b>${un}</b><span>of ${D.blocks.length} blocks are beyond ${p.T} minutes</span></div><div><b>${sh(D.blocks.reduce((a, b, i) => a + (RES[i].walk <= 20 ? b.pop : 0), 0))}</b><span>are within 20 minutes</span></div><div><b>${hi}</b><span>blocks in tier 4 or 5</span></div>`;
  gO.innerHTML = "";
  D.blocks.forEach((b, i) => {
    const r = RES[i];
    let f;
    if (st.view === "access")
      f = ["var(--yes)", "var(--mid)", "var(--no)"][r.cls];
    else if (st.on.F) f = "var(--g" + cpuBin(r.cpu) + ")";
    else f = "var(--g" + r.g + ")";
    const lf = lensFill(i, r);
    if (lf && lf.f) f = lf.f;
    b._el.setAttribute("fill", f);
    b._el.setAttribute("fill-opacity", lf && lf.o != null ? lf.o : 1);
    b._el.classList.toggle("sel", st.sel === i);
    if (st.lay.F && b.fl)
      gO.appendChild(
        el("path", { d: pth(b.g), fill: "url(#wet)", opacity: 0.5 }),
      );
    if (st.on.L && st.view === "need" && !r.ok)
      gO.appendChild(
        el("path", { d: pth(b.g), fill: "url(#hatch)", opacity: 0.42 }),
      );
  });
  markers();
  labels();
  legend();
  detail();
  listPicks();
  lensPanel();
  OPS.forEach((o, i) => {
    if (o[0] === "User") $("opn" + i).textContent = "(" + D.user.length + ")";
  });
  $("vAccess").setAttribute("aria-pressed", st.view === "access");
  $("vNeed").setAttribute("aria-pressed", st.view === "need");
  $("clear").hidden = !st.picks.length;
  if (!$("tab-method").hidden) methodLive();
  if (!$("tab-throne").hidden) throneLive();
  if (!$("tab-city").hidden) cityLive();
}

function markers() {
  gM.innerHTML = "";
  gP.innerHTML = "";
  const k = scale();
  if (st.lay.P) {
    (D.parks || []).forEach((q) =>
      gM.appendChild(
        el("path", {
          d: pth(q.g),
          fill: "var(--park)",
          "fill-opacity": 0.13,
          stroke: "var(--park)",
          "stroke-width": 1.4 * k,
          "pointer-events": "none",
        }),
      ),
    );
    (D.plazas || []).forEach((q) =>
      gM.appendChild(
        el("path", {
          d: pth(q.g),
          fill: "none",
          stroke: "var(--park)",
          "stroke-width": 1.2 * k,
          "stroke-dasharray": `${3 * k} ${2.5 * k}`,
          "pointer-events": "none",
        }),
      ),
    );
    D.st.forEach((s) =>
      gM.appendChild(
        el("rect", {
          x: s.x - 4.5 * k,
          y: -s.y - 4.5 * k,
          width: 9 * k,
          height: 9 * k,
          fill: "var(--panel)",
          stroke: "var(--accent)",
          "stroke-width": 2.2 * k,
          "pointer-events": "none",
        }),
      ),
    );
    (D.dc || []).forEach((d) =>
      gM.appendChild(
        el("path", {
          d: `M${d.x} ${-d.y - 6 * k}l${6 * k} ${6 * k}l${-6 * k} ${6 * k}l${-6 * k} ${-6 * k}z`,
          fill: "var(--panel)",
          stroke: "var(--dropin)",
          "stroke-width": 2.2 * k,
          "pointer-events": "none",
        }),
      ),
    );
  }
  allRest(D).forEach((r) => {
    const c = isCounted(D, r),
      col =
        r.t === "Throne"
          ? "var(--throne)"
          : r.t === "Subway"
            ? "var(--sub)"
          : r.t === "User"
            ? "var(--user)"
            : "var(--ink)";
    const m = el("circle", {
      cx: r.x,
      cy: -r.y,
      r: (r._k === st.selR ? 7.5 : 5.5) * k,
      fill: c ? col : "var(--panel)",
      stroke: c ? "var(--panel)" : col,
      "stroke-width": (c ? 1.6 : 2) * k,
      class: "mk",
      "data-r": r._k,
    });
    const t = el("title", {});
    t.textContent = r.n + (c ? "" : " (not counted)");
    m.appendChild(t);
    gM.appendChild(m);
  });
  st.picks.forEach((i, n) => {
    const b = D.blocks[i];
    gP.appendChild(
      el("circle", {
        cx: b.c[0],
        cy: -b.c[1],
        r: 13 * k,
        fill: "var(--pick)",
        stroke: "var(--panel)",
        "stroke-width": 2.5 * k,
      }),
    );
    const t = el("text", {
      x: b.c[0],
      y: -b.c[1],
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-size": 15 * k,
      "font-weight": 700,
      fill: "var(--panel)",
      "font-family": "var(--body)",
    });
    t.textContent = n + 1;
    gP.appendChild(t);
  });
  lensOverlay();
}

const stName = (n) => n.replace(/\s*\(.*$/, "").split("/")[0];
function labels() {
  gL.innerHTML = "";
  const k = scale(),
    z = VB0[2] / vb[2],
    placed = [];
  // a label is tested as a row of circles along its baseline, so slanted street names do not block everything around them
  const put = (txt, x, y, ang, cls, fs) => {
    const w = txt.length * fs * 0.56 * k,
      h = fs * k,
      a = (ang * Math.PI) / 180,
      n = Math.max(1, Math.round(w / h)),
      pts = [];
    for (let i = 0; i <= n; i++) {
      const t = (i / n - 0.5) * w;
      pts.push([x + t * Math.cos(a), y + t * Math.sin(a)]);
    }
    for (const q of placed)
      for (const c of pts)
        if (Math.hypot(c[0] - q[0], c[1] - q[1]) < (h + q[2]) * 0.62) return;
    pts.forEach((c) => placed.push([c[0], c[1], h]));
    const t = el("text", {
      x,
      y: -y,
      class: "lb " + cls,
      "font-size": fs * k,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "stroke-width": 3.4 * k,
    });
    if (ang) t.setAttribute("transform", `rotate(${-ang} ${x} ${-y})`);
    t.textContent = txt;
    gL.appendChild(t);
  };
  const parks = (D.parks || []).slice().sort((a, b) => b.ha - a.ha),
    inB = (q) =>
      q.x > D._B[0] - 200 &&
      q.x < D._B[2] + 200 &&
      q.y > D._B[1] - 200 &&
      q.y < D._B[3] + 200;
  const ss = D.st.slice().sort((a, b) => (b.r || 0) - (a.r || 0)),
    stn = (s) => put(stName(s.n), s.x, s.y + 12 * k, 0, "stn", 12);
  const big = parks.filter((q) => q.ha >= 1 && inB(q));
  if (st.lay.P) {
    big.slice(0, 10).forEach((q) => put(q.n, q.x, q.y, 0, "pk", 13.5));
    ss.slice(0, 6).forEach(stn);
  }
  if (st.lay.S)
    (D.lab || [])
      .filter((l) => l.t === 1)
      .forEach((l) => put(l.n, l.x, l.y, l.a, "sr", 13));
  if (st.lay.P) {
    if (z >= 1.4) {
      big.slice(10).forEach((q) => put(q.n, q.x, q.y, 0, "pk", 12.5));
      ss.slice(6).forEach(stn);
    }
    if (z >= 1.4)
      parks
        .filter((q) => q.ha < 1 && q.ha >= 0.2 && inB(q))
        .forEach((q) => put(q.n, q.x, q.y, 0, "pk", 12));
    if (z >= 2.2) {
      (D.plazas || []).forEach((q) => put(q.n, q.x, q.y, 0, "pk", 11.5));
      parks
        .filter((q) => q.ha < 0.2 && inB(q))
        .forEach((q) => put(q.n, q.x, q.y, 0, "pk", 11.5));
    }
  }
  if (st.lay.S && z >= 1.6)
    (D.lab || [])
      .filter((l) => l.t === 2)
      .forEach((l) => put(l.n, l.x, l.y, l.a, "s2", 11.5));
}

function legend() {
  const dot = (c, t, ring) =>
    `<span><span class="dot" style="background:${ring ? "var(--panel)" : c};border:2px solid ${c}"></span>${t}</span>`;
  const mk =
    dot("var(--ink)", "Counted restroom") +
    dot("var(--ink)", "Not counted", 1) +
    (D._thr.length ? dot("var(--throne)", "Throne site (announced)") : "") +
    (D.user.length ? dot("var(--user)", "Added by you") : "") +
    (st.lay.P
      ? `<span><i style="background:var(--panel);border:2px solid var(--accent);border-radius:0;width:11px;height:11px"></i>Subway station</span><span><i style="background:color-mix(in srgb,var(--park) 18%,transparent);border-color:var(--park)"></i>Park or plaza</span>` +
        (D.dc && D.dc.length
          ? `<span><i style="background:var(--panel);border:2px solid var(--dropin);border-radius:0;width:9px;height:9px;transform:rotate(45deg)"></i>Drop-in centre</span>`
          : "")
      : "") +
    (st.lay.F
      ? `<span><i style="background:repeating-linear-gradient(45deg,var(--flood) 0 2px,transparent 2px 5px)"></i>Flood plain</span>`
      : "");
  const gt = st.on.L
    ? `<span><i style="background:repeating-linear-gradient(-45deg,var(--hatch) 0 2px,transparent 2px 5px)"></i>Not eligible: ${siteName()}</span>`
    : "";
  const p = P();
  let h;
  if (st.view === "access")
    h = `<b style="color:var(--ink)">Walk to a counted restroom</b><span><i style="background:var(--yes)"></i>Easy reach, up to ${mins(p.T / 2)} min</span><span><i style="background:var(--mid)"></i>${mins(p.T / 2)} to ${p.T} min</span><span><i style="background:var(--no)"></i>Beyond ${p.T} min</span>`;
  else if (st.on.F)
    h =
      `<b style="color:var(--ink)">City's cost per added visit (yearly contract ÷ visits); procurement's working range is $3–$6</b>` +
      [
        ["g5", "$5 or less"],
        ["g4", "$5 to $10"],
        ["g3", "$10 to $20"],
        ["g2", "$20 to $50"],
        ["g1", "Over $50"],
        ["g0", "No added uses"],
      ]
        .map(
          (x) =>
            `<span><i style="background:var(--${x[0]})"></i>${x[1]}</span>`,
        )
        .join("") +
      gt;
  else
    h =
      `<b style="color:var(--ink)" title="Each block takes its highest single factor; a restroom within 5 minutes means served">Need tier</b><span title="An open restroom within a 5-minute walk"><i style="background:var(--g0)"></i>Served</span>` +
      [1, 2, 3, 4, 5]
        .map(
          (g) =>
            `<span><i style="background:var(--g${g})"></i>${g}${g === 1 ? " lowest" : g === 5 ? " highest" : ""}</span>`,
        )
        .join("") +
      gt;
  $("legend").innerHTML = h + mk + lensLegend();
}

