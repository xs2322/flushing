/* ---------- districts and your own data ---------- */
function setStatus(t, err) {
  const s = $("bstat");
  s.textContent = t || "";
  s.classList.toggle("err", !!err);
}
const DB = {
  open() {
    return new Promise((res, rej) => {
      try {
        const r = indexedDB.open("flushing", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("packs");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      } catch (e) {
        rej(e);
      }
    });
  },
  tx(mode, fn) {
    return DB.open().then(
      (db) =>
        new Promise((res, rej) => {
          const q = fn(db.transaction("packs", mode).objectStore("packs"));
          q.onsuccess = () => res(q.result);
          q.onerror = () => rej(q.error);
        }),
    );
  },
};
let dbOK = true;
function keep(K) {
  DB.tx("readwrite", (s) => s.put(bare(K), K.id)).catch(() => {
    dbOK = false;
  });
} // remembers built districts and your edits in this browser
function addPack(K, show) {
  if (!K || !(K.v >= 2) || !Array.isArray(K.blocks) || !K.o || !K.cd)
    throw new Error("That file is not a Bathroom Demand Sandbox district pack");
  K.id = String(K.id);
  DATA.d[K.id] = K;
  SHOWN.add(K.id);
  if (!DATA.order.includes(K.id)) DATA.order.push(K.id);
  fillDistricts();
  if (show) {
    $("dist").value = K.id;
    load(K.id);
  }
}
async function build(spec) {
  $("bbuild").disabled = $("bshape").disabled = true;
  try {
    const K = await Build.pack(spec, DATA.sub, (m) =>
      setStatus(
        "Building " + spec.name.split(" · ")[0] + ": " + m.toLowerCase() + "…",
      ),
    );
    addPack(K, true);
    keep(K);
    setStatus(
      "Added " +
        K.name +
        ". " +
        (dbOK
          ? "It is kept in this browser; use Save to carry it elsewhere."
          : "This browser will not keep it after you close the page; use Save."),
    );
  } catch (e) {
    setStatus(
      "Could not build the district: " +
        e.message +
        "." +
        (navigator.onLine === false || /did not answer/.test(e.message)
          ? " Building needs an internet connection. Everything already loaded still works offline."
          : ""),
      true,
    );
  } finally {
    $("bbuild").disabled = !$("cdpick").options.length;
    $("bshape").disabled = false;
  }
}
$("bbuild").onclick = () => {
  const c = CDS.find((x) => x[0] === $("cdpick").value);
  if (!c) return;
  if (DATA.d[c[0]]) {
    const K = DATA.d[c[0]];
    addPack(K, true);
    keep(K);
    setStatus("Added " + K.name + ". It was already inside this file.");
  } else build({ id: c[0], name: c[1], cd: c[0] });
};
const readText = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsText(f);
  });
const readBuf = (f) =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsArrayBuffer(f);
  });
function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(
    new Blob([text], { type: type || "application/json" }),
  );
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}
const slug = (s) =>
  s
    .split(" · ")[0]
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// NY State Plane Long Island (EPSG:2263, US survey feet) to longitude/latitude, for city shapefiles
function spToLL(x, y) {
  const a = 6378137,
    f = 1 / 298.257222101,
    e = Math.sqrt(2 * f - f * f),
    d = Math.PI / 180,
    ft = 1200 / 3937,
    p1 = (40 + 40 / 60) * d,
    p2 = (41 + 2 / 60) * d,
    p0 = (40 + 10 / 60) * d,
    l0 = -74 * d;
  const m = (p) => Math.cos(p) / Math.sqrt(1 - e * e * Math.sin(p) ** 2),
    t = (p) =>
      Math.tan(Math.PI / 4 - p / 2) /
      Math.pow((1 - e * Math.sin(p)) / (1 + e * Math.sin(p)), e / 2);
  const n =
      (Math.log(m(p1)) - Math.log(m(p2))) / (Math.log(t(p1)) - Math.log(t(p2))),
    F = m(p1) / (n * Math.pow(t(p1), n)),
    r0 = a * F * Math.pow(t(p0), n);
  const X = x * ft - 300000,
    Y = r0 - y * ft,
    r = Math.sign(n) * Math.hypot(X, Y),
    tt = Math.pow(r / (a * F), 1 / n),
    th = Math.atan2(X, Y);
  let ph = Math.PI / 2 - 2 * Math.atan(tt);
  for (let i = 0; i < 6; i++)
    ph =
      Math.PI / 2 -
      2 *
        Math.atan(
          tt * Math.pow((1 - e * Math.sin(ph)) / (1 + e * Math.sin(ph)), e / 2),
        );
  return [(th / n + l0) / d, ph / d];
}
function fixLL(g) {
  let big = false;
  const scan = (c) => {
    if (typeof c[0] === "number") {
      if (Math.abs(c[0]) > 180 || Math.abs(c[1]) > 90) big = true;
    } else c.forEach(scan);
  };
  scan(g.coordinates);
  if (!big) return g;
  const conv = (c) =>
    typeof c[0] === "number" ? spToLL(c[0], c[1]) : c.map(conv);
  return { type: g.type, coordinates: conv(g.coordinates) };
}
function readShp(buf) {
  const v = new DataView(buf),
    out = [];
  let o = 100;
  while (o + 12 <= v.byteLength) {
    const len = v.getInt32(o + 4, false) * 2,
      ty = v.getInt32(o + 8, true),
      s = o + 8;
    o = s + len;
    if (ty !== 5 && ty !== 15 && ty !== 25) continue;
    const np = v.getInt32(s + 36, true),
      nt = v.getInt32(s + 40, true),
      ps = [];
    for (let i = 0; i < np; i++) ps.push(v.getInt32(s + 44 + 4 * i, true));
    const q = s + 44 + 4 * np,
      polys = [];
    for (let i = 0; i < np; i++) {
      const a = ps[i],
        b = i + 1 < np ? ps[i + 1] : nt,
        ring = [];
      let ar = 0;
      for (let j = a; j < b; j++)
        ring.push([
          v.getFloat64(q + 16 * j, true),
          v.getFloat64(q + 16 * j + 8, true),
        ]);
      for (let j = 0; j + 1 < ring.length; j++)
        ar += ring[j][0] * ring[j + 1][1] - ring[j + 1][0] * ring[j][1];
      if (ar <= 0 || !polys.length) polys.push([ring]);
      else polys[polys.length - 1].push(ring);
    } // clockwise ring = outer, otherwise a hole
    out.push({
      name: "Shape " + (out.length + 1),
      geom: { type: "MultiPolygon", coordinates: polys },
    });
  }
  return out;
}
let SHAPES = [];
$("fbound").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    let shapes;
    if (/\.shp$/i.test(f.name)) shapes = readShp(await readBuf(f));
    else {
      const j = JSON.parse(await readText(f)),
        fs =
          j.type === "FeatureCollection"
            ? j.features
            : j.type === "Feature"
              ? [j]
              : [{ geometry: j, properties: {} }];
      shapes = fs
        .filter((x) => x.geometry && /Polygon$/.test(x.geometry.type))
        .map((x, i) => {
          const pr = x.properties || {},
            k = [
              "name",
              "Name",
              "NAME",
              "boro_cd",
              "BoroCD",
              "label",
              "ntaname",
              "NTAName",
              "id",
            ].find((k) => pr[k] != null);
          return {
            name: k ? String(pr[k]) : "Shape " + (i + 1),
            geom: x.geometry,
          };
        });
    }
    if (!shapes.length) throw new Error("No polygon found in that file");
    const base = f.name.replace(/\.[^.]+$/, "");
    SHAPES = shapes.map((s) => ({
      name: shapes.length > 1 ? base + ": " + s.name : base,
      geom: fixLL(s.geom),
    }));
    if (SHAPES.length === 1) {
      $("shapebox").hidden = true;
      build({
        id: "x-" + slug(SHAPES[0].name),
        name: SHAPES[0].name,
        geom: SHAPES[0].geom,
      });
    } else {
      $("shapepick").innerHTML = SHAPES.map(
        (s, i) => `<option value="${i}">${esc(s.name)}</option>`,
      ).join("");
      $("shapebox").hidden = false;
      setStatus(
        SHAPES.length + " shapes in the file. Choose one and build it.",
      );
    }
  } catch (err) {
    setStatus("Could not read the boundary. " + err.message, true);
  }
};
$("bshape").onclick = () => {
  const s = SHAPES[+$("shapepick").value];
  if (s) build({ id: "x-" + slug(s.name), name: s.name, geom: s.geom });
};

function csvRows(t) {
  const rows = [];
  let row = [],
    cur = "",
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cur);
      cur = "";
      if (row.some((x) => x !== "")) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== "")) rows.push(row);
  return rows;
}
$("frest").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const txt = await readText(f);
    let pts = [];
    if (/^\s*[\[{]/.test(txt)) {
      const j = JSON.parse(txt);
      (j.features || (Array.isArray(j) ? j : [j])).forEach((x) => {
        const g = x.geometry || x,
          pr = x.properties || {};
        if (g && g.type === "Point")
          pts.push([
            g.coordinates[0],
            g.coordinates[1],
            pr.name || pr.Name || pr.facility_name,
          ]);
      });
    } else {
      const rows = csvRows(txt),
        h = (rows[0] || []).map((s) => s.trim().toLowerCase()),
        ix = (re) => h.findIndex((s) => re.test(s)),
        la = ix(/^(lat|latitude|y)$/),
        lo = ix(/^(lon|lng|long|longitude|x)$/),
        nm = ix(/name/);
      if (la < 0 || lo < 0)
        throw new Error("The CSV needs latitude and longitude columns");
      rows
        .slice(1)
        .forEach((r) => pts.push([+r[lo], +r[la], nm >= 0 ? r[nm] : null]));
    }
    let n = 0;
    pts.forEach((q) => {
      if (!isFinite(q[0]) || !isFinite(q[1])) return;
      const xy = toXY(D, q[0], q[1]);
      if (
        xy[0] < D._B[0] - 1300 ||
        xy[0] > D._B[2] + 1300 ||
        xy[1] < D._B[1] - 1300 ||
        xy[1] > D._B[3] + 1300
      )
        return;
      D.user.push({
        n: String(q[2] || "Added restroom " + (D.user.length + 1)).slice(0, 80),
        x: Math.round(xy[0]),
        y: Math.round(xy[1]),
      });
      n++;
    });
    userKeys(D);
    keep(D);
    repick();
    setStatus(
      n
        ? `Added ${n} restroom${n === 1 ? "" : "s"} to ${D.name.split(" · ")[0]}.` +
            (n < pts.length
              ? ` ${pts.length - n} outside this district's area ${pts.length - n === 1 ? "was" : "were"} left out.`
              : "")
        : "None of those points fall in or near this district.",
      !n,
    );
  } catch (err) {
    setStatus("Could not read the points. " + err.message, true);
  }
};
$("badd").onclick = () => {
  st.adding = !st.adding;
  $("badd").setAttribute("aria-pressed", st.adding);
  $("hint").hidden = !st.adding;
  $("mapbox").classList.toggle("adding", st.adding);
  if (st.adding)
    $("mapbox").scrollIntoView({ block: "center", behavior: "smooth" });
};

function resultRows() {
  return D.blocks.map((b, i) => {
    const r = RES[i],
      ll = toLL(D, b.c[0], b.c[1]);
    return {
      block: b.id,
      address: place(b),
      residents: b.pop,
      walk_min: isFinite(r.walk) ? +r.walk.toFixed(1) : "",
      access: ["served", "partly served", "gap"][r.cls],
      nearest: r.nm || "",
      people_on_foot: Math.round(r.U),
      uses_per_day: +r.uses.toFixed(1),
      gap_share: +r.N.toFixed(2),
      added_uses: +r.added.toFixed(1),
      tier: r.g,
      deciding_factor: r.g && r.drv >= 0 ? DRV[r.drv] : "",
      foot_traffic_tier: r.T4[0],
      residents_tier: r.T4[1],
      poverty_tier: r.T4[2],
      complaints_tier: r.T4[3],
      dropin_tier: r.T4[4],
      subway_entries_nearby: Math.round(r.sub || 0),
      vulnerable_share: r.share == null ? "" : +r.share.toFixed(3),
      suggested_type: r.g ? siteCheck(D, b, r).type : "",
      cost_per_added_use: r.cpu == null ? "" : +r.cpu.toFixed(2),
      land: LAND[b.lt || 0],
      land_owner: b.pl || "",
      sidewalk_ft: b.sw ?? "",
      near_dropin: b.di ? 1 : 0,
      land_passes: r.ok ? 1 : 0,
      flood_plain: b.fl ? 1 : 0,
      suggested_site: st.picks.indexOf(i) + 1 || "",
      lon: ll[0],
      lat: ll[1],
    };
  });
}
$("xcsv").onclick = () => {
  const rows = resultRows(),
    h = Object.keys(rows[0]),
    q = (v) =>
      /[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : v;
  download(
    "bathroom-sandbox-" + slug(D.name) + "-scores.csv",
    h.join(",") +
      "\n" +
      rows.map((r) => h.map((k) => q(r[k])).join(",")).join("\n"),
    "text/csv",
  );
};
$("xgeo").onclick = () => {
  const rows = resultRows(),
    ring = (r) => {
      const o = [];
      for (let i = 0; i < r.length; i += 2) o.push(toLL(D, r[i], r[i + 1]));
      o.push(o[0]);
      return o;
    };
  const fs = D.blocks.map((b, i) => ({
    type: "Feature",
    properties: rows[i],
    geometry: { type: "Polygon", coordinates: b.g.map(ring) },
  }));
  allRest(D).forEach((r) =>
    fs.push({
      type: "Feature",
      properties: {
        restroom: r.n,
        type: r.t,
        counted: isCounted(D, r) ? 1 : 0,
      },
      geometry: { type: "Point", coordinates: toLL(D, r.x, r.y) },
    }),
  );
  download(
    "bathroom-sandbox-" + slug(D.name) + "-scores.geojson",
    JSON.stringify({ type: "FeatureCollection", features: fs }),
    "application/geo+json",
  );
};
$("xpack").onclick = () =>
  download("bathroom-sandbox-pack-" + slug(D.name) + ".json", bare(D));
$("brest").onclick = async () => {
  const btn = $("brest");
  btn.disabled = true;
  setStatus("Fetching the current restroom list…");
  try {
    const before = D.rest.filter((r) => r.ok).length;
    await Build.refreshRestrooms(D);
    for (const k in D.off) if (k[0] === "r") delete D.off[k];
    D._fresh = 1; // attributes come with the rows; the build's ra no longer lines up
    D._rv = D.rest; RLIST = "live"; D._rl = "refresh"; // this district only; the citywide update is under Which restrooms count
    delete D._ok;
    prep(D);
    keep(D);
    load(D.id);
    setStatus(
      `Restrooms refreshed: ${D.rest.filter((r) => r.ok).length} operational (was ${before}).`,
    );
  } catch (err) {
    setStatus("Could not refresh. " + err.message, true);
  } finally {
    btn.disabled = false;
  }
};
$("xtool").onclick = () => {
  const tag = '<script type="application/json" id="data">',
    a = SRC.indexOf(tag) + tag.length,
    b = SRC.indexOf("<" + "/script>", a); // split so the HTML parser does not end this script here
  download(
    "NYC-Bathroom-Demand-Sandbox-offline.html",
    SRC.slice(0, a) +
      bare({
        order: DATA.order,
        shown: [...SHOWN],
        d: DATA.d,
        sub: DATA.sub,
        memo: DATA.memo,
        rlist: DATA.rlist,
      }).replace(/</g, "\\u003c") +
      SRC.slice(b),
    "text/html",
  );
};
$("fpack").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const j = JSON.parse(await readText(f)),
      list = Array.isArray(j) ? j : j.packs || (j.d ? Object.values(j.d) : [j]);
    list.forEach((K) => {
      addPack(K, list.length === 1);
      keep(K);
    });
    if (list.length > 1) $("dist").value = D.id;
    setStatus(
      "Loaded " +
        (list.length === 1 ? list[0].name : list.length + " districts") +
        ".",
    );
  } catch (err) {
    setStatus("Could not load that file. " + err.message, true);
  }
};
$("bdrop").onclick = () => {
  const id = D.id;
  if (EMBED.has(id)) return;
  delete DATA.d[id];
  SHOWN.delete(id);
  DATA.order = DATA.order.filter((x) => x !== id);
  DB.tx("readwrite", (s) => s.delete(id)).catch(() => {});
  fillDistricts();
  load($("dist").value);
  setStatus("Removed.");
};

var fitW = 0;
