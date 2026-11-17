/* ---------- City view: every built district on five borough maps, plus a ranked district table ---------- */
const BORO = {
  1: "Manhattan",
  2: "Bronx",
  3: "Brooklyn",
  4: "Queens",
  5: "Staten Island",
};
function cityLive() {
  const p = P(),
    built = (DATA.memo || DATA.order).filter((k) => DATA.d[k] && /^[1-5]\d\d$/.test(k)),
    stats = [];
  const panels = Object.keys(BORO).map((bn) => {
    const ids = built.filter((k) => k[0] === bn);
    if (!ids.length)
      return `<div class="boro"><h3>${BORO[bn]}</h3><p class="small">No district built yet. Add one under "Districts and your own data" on the Map page.</p></div>`;
    const packs = ids.map((k) => prep(DATA.d[k])),
      O = [
        packs.reduce((a, K) => a + K.o[0], 0) / packs.length,
        packs.reduce((a, K) => a + K.o[1], 0) / packs.length,
      ],
      KX = 111320 * Math.cos((O[1] * Math.PI) / 180),
      KY = 110574;
    // each pack's metres → this borough's metres: a scale and an offset, applied as an SVG transform
    const tf = (K) => ({
      s: KX / K._kx,
      dx: (K.o[0] - O[0]) * KX,
      dy: (K.o[1] - O[1]) * KY,
    });
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    const groups = packs.map((K) => {
      const t = tf(K),
        res = scoreAll(K, st, []),
        B = K._B;
      x0 = Math.min(x0, B[0] * t.s + t.dx);
      x1 = Math.max(x1, B[2] * t.s + t.dx);
      y0 = Math.min(y0, B[1] + t.dy);
      y1 = Math.max(y1, B[3] + t.dy);
      let far = 0,
        g5 = 0,
        g45 = 0,
        top = -1;
      res.forEach((r, i) => {
        if (r.cls === 2) far += K.blocks[i].pop;
        if (r.g === 5) g5++;
        if (r.g >= 4) g45++;
        if (top < 0 || r.need > res[top].need) top = i;
      });
      const pop = K.blocks.reduce((a, b) => a + b.pop, 0);
      stats.push({
        id: K.id,
        far,
        pop,
        g5,
        g45,
        top: top >= 0 && res[top].g > 0 ? place(K.blocks[top]) : "–",
      });
      const byG = [[], [], [], [], [], []];
      K.blocks.forEach((b, i) => byG[res[i].g].push(...b.g));
      return `<g transform="translate(${t.dx.toFixed(1)} ${(-t.dy).toFixed(1)}) scale(${t.s.toFixed(5)} 1)" data-cd="${K.id}" class="cityd"><title>${esc(K.name)}</title><path d="${pth(K.cd)}" fill="var(--g0)"/>${byG.map((r, g) => (r.length ? `<path d="${pth(r)}" fill="var(--g${g})"/>` : "")).join("")}<path d="${pth(K.cd)}" fill="none" stroke="var(--ink)" stroke-width="1.2" vector-effect="non-scaling-stroke" stroke-dasharray="5 4" opacity=".7"/></g>`;
    });
    const m = 300,
      vb = [x0 - m, -(y1 + m), x1 - x0 + 2 * m, y1 - y0 + 2 * m].map((v) =>
        Math.round(v),
      );
    const fs = Math.round(Math.max(vb[2], vb[3]) / 26),
      labels = packs
        .map((K) => {
          const t = tf(K),
            cx = ((K._B[0] + K._B[2]) / 2) * t.s + t.dx,
            cy = (K._B[1] + K._B[3]) / 2 + t.dy;
          return `<text x="${Math.round(cx)}" y="${Math.round(-cy)}" font-size="${fs}" text-anchor="middle" dominant-baseline="central" font-family="system-ui, sans-serif" font-weight="700" fill="var(--ink)" stroke="var(--panel)" stroke-width="${Math.round(fs / 6)}" paint-order="stroke" pointer-events="none">${THRONE_CD.has(K.id) ? "*" : ""}${+K.id.slice(1)}</text>`;
        })
        .join("");
    return `<div class="boro"><div class="bh"><h3>${BORO[bn]}</h3><button class="btn" data-png="${bn}">PNG</button></div><svg id="city${bn}" viewBox="${vb.join(" ")}" role="img" aria-label="${BORO[bn]}: built districts shaded by need score"><rect x="${vb[0]}" y="${vb[1]}" width="${vb[2]}" height="${vb[3]}" fill="var(--land)"/>${groups.join("")}${labels}</svg><p class="small">${ids.map((k) => esc(cdLabel(k).split(" · ")[0])).join(" · ")}</p></div>`;
  });
  stats.sort((a, b) => b.far - a.far);
  const pct = (a, b) => (b ? Math.round((a / b) * 100) + "%" : "–");
  $("cityTable").innerHTML =
    `<table class="t"><thead><tr><th>#</th><th>District</th><th>Residents beyond a ${p.T}-min walk</th><th>Share</th><th>Tier 5 blocks</th><th>Tier 4–5 blocks</th><th>Highest-ranked block</th></tr></thead><tbody>${stats
      .map(
        (r, i) =>
          `<tr><td>${i + 1}</td><td><a href="#map" data-go="${r.id}">${esc(cdLabel(r.id).split(" · ")[0])}</a></td><td class="n">${r.far.toLocaleString()}</td><td class="n">${pct(r.far, r.pop)}</td><td class="n">${r.g5}</td><td class="n">${r.g45}</td><td>${esc(r.top)}</td></tr>`,
      )
      .join("")}</tbody></table>`;
  const tot = stats.reduce(
    (a, r) => ({ far: a.far + r.far, pop: a.pop + r.pop, g5: a.g5 + r.g5 }),
    {
      far: 0,
      pop: 0,
      g5: 0,
    },
  );
  $("citySum").textContent =
    `Across ${stats.length} built districts: ${tot.far.toLocaleString()} of ${tot.pop.toLocaleString()} residents (${pct(tot.far, tot.pop)}) live beyond a ${p.T}-minute walk of a counted restroom, and ${tot.g5} blocks are tier 5.`;
  $("cityMaps").innerHTML = panels.join("");
  $("cityLegend").innerHTML =
    `<b style="color:var(--ink)">Need tier</b>` +
    ["Served", "1", "2", "3", "4", "5 most need"]
      .map((t, g) => `<span><i style="background:var(--g${g})"></i>${t}</span>`)
      .join("");
  const go = (id) => {
    showDist(id);
    load(id);
    location.hash = "map";
    tab();
  };
  document
    .querySelectorAll("[data-go]")
    .forEach(
      (a) => (a.onclick = (e) => (e.preventDefault(), go(a.dataset.go))),
    );
  document
    .querySelectorAll(".cityd")
    .forEach((g) => (g.onclick = () => go(g.dataset.cd)));
  document
    .querySelectorAll("[data-png]")
    .forEach((b) => (b.onclick = () => cityPng(b.dataset.png)));
}
// Save one borough map as a PNG, with the page's colors written in (the image has no stylesheet).
function cityPng(bn) {
  const src = $("city" + bn),
    cs = getComputedStyle(document.documentElement),
    vb = src.viewBox.baseVal,
    W = 1600,
    H = Math.round((W * vb.height) / vb.width),
    xml = new XMLSerializer()
      .serializeToString(src)
      .replace(
        /var\((--[\w-]+)\)/g,
        (m, v) => cs.getPropertyValue(v).trim() || "#999",
      )
      .replace(/^<svg /, `<svg width="${W}" height="${H}" `);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    c.getContext("2d").drawImage(img, 0, 0, W, H);
    c.toBlob((b) =>
      download(
        `bathroom-sandbox-${BORO[bn].toLowerCase().replace(/ /g, "-")}.png`,
        b,
        "image/png",
      ),
    );
  };
  img.onerror = () =>
    ($("citySum").textContent +=
      " This browser could not save the map as an image.");
  img.src =
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      xml.includes("xmlns=")
        ? xml
        : xml.replace(/^<svg /, '<svg xmlns="http://www.w3.org/2000/svg" '),
    );
}

