/* ---------- district builder: fetches open data and joins it to census blocks. Needs internet. ---------- */
const Build = (() => {
  const NYC = "https://data.cityofnewyork.us/resource/",
    TIG =
      "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/tigerWMS_Census2020/MapServer/10/query",
    ACS = "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/";
  const COUNTY = { 1: "061", 2: "005", 3: "047", 4: "081", 5: "085" },
    cache = {},
    SINCE = "2023-10-01";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function get(url) {
    for (let k = 0; ; k++) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = await r.json();
        if (j && j.error) throw new Error(j.error.message || "service error");
        return j;
      } catch (e) {
        if (k >= 2)
          throw new Error(
            url.split("/")[2] + " did not answer (" + e.message + ")",
          );
        await sleep(900 * (k + 1));
      }
    }
  }
  const soda = (id, q) =>
    get(
      NYC +
        id +
        ".json?" +
        Object.keys(q)
          .map((k) => "$" + k + "=" + encodeURIComponent(q[k]))
          .join("&"),
    );
  const once = (k, f) =>
    cache[k] ||
    (cache[k] = f().catch((e) => {
      delete cache[k];
      throw e;
    }));
  const polys = (g) =>
    !g
      ? []
      : g.type === "Polygon"
        ? [g.coordinates]
        : g.type === "MultiPolygon"
          ? g.coordinates
          : [];
  const lines = (g) =>
    !g
      ? []
      : g.type === "LineString"
        ? [g.coordinates]
        : g.type === "MultiLineString"
          ? g.coordinates
          : [];
  const tc = (s) =>
    (s || "")
      .toLowerCase()
      .replace(/(^|[\s\-\/(])([a-z])/g, (m, a, b) => a + b.toUpperCase())
      .replace(/\b(Nyc|Nys|Mta|Dcas|Hpd|Usa)\b/g, (m) => m.toUpperCase())
      .replace(/ (Of|And|The)(?= )/g, (m) => m.toLowerCase());
  const short = (s) =>
    tc(s)
      .replace(/^(East|West|North|South) (?=\d)/, (m) => m[0] + " ")
      .replace(/\bAvenue\b/g, "Av")
      .replace(/\bStreet\b/g, "St")
      .replace(/\bBoulevard\b/g, "Blvd")
      .replace(/\bPlace\b/g, "Pl")
      .replace(/\bRoad\b/g, "Rd")
      .replace(/\bParkway\b/g, "Pkwy")
      .replace(/\bExpressway\b/g, "Expwy")
      .replace(/\bSquare\b/g, "Sq")
      .replace(/\bDrive\b/g, "Dr");

  // Land rules. 0 not public, 1 park or plaza, 2 other public land, 3 public but secured (schools, police, fire, courts, hospitals, depots)
  const SEC =
    /EDUCATION|SCHOOL|POLICE|NYPD|FIRE DEP|FDNY|CORRECTION|COURT|HOSPITAL|HOMELESS|CHILDREN|JUVENILE|SANITATION|ENVIRONMENTAL PROT|POSTAL|CUSTOMS|PROBATION/;
  const OPEN = /PARKS|HUDSON RIVER PARK|BATTERY PARK CITY|BROOKLYN BRIDGE PARK/;
  const PUBN =
    /^(NYC (DEP|TRANSIT|HOUSING|HEALTH|ECONOMIC|EDUCATIONAL|SCHOOL|POLICE|FIRE|PARKS|HUMAN|ADMIN|OFFICE|MAYOR)|NYS (DEP|OFFICE|URBAN|DIVISION)|CITY OF NEW YORK|NEW YORK CITY |THE CITY OF NEW YORK|STATE OF NEW YORK|NEW YORK STATE|PEOPLE OF THE STATE|UNITED STATES|MTA\b|METROPOLITAN TRANS|PORT AUTHORITY|DEPT\.? OF|DEPARTMENT OF|DORMITORY AUTH|BATTERY PARK CITY|HUDSON RIVER PARK|EMPIRE STATE DEV|TRIBOROUGH|NEW YORK PUBLIC LIBRARY|BROOKLYN PUBLIC LIBRARY|QUEENS (BOROUGH )?PUBLIC LIBRARY|CITY UNIVERSITY)|HOUSING AUTHORITY|TRANSIT AUTHORITY|PARKS AND REC|DEPARTMENT OF PARKS/;
  function lotTier(l) {
    const n = (l.ownername || "").toUpperCase(),
      t = l.ownertype,
      bc = l.bldgclass || "";
    if (
      !(
        PUBN.test(n) ||
        ((t === "C" || t === "O" || t === "M") &&
          !/\b(LLC|LP|L\.P\.|INC|REALTY|HOLDINGS|ASSOCIATES|PARTNERS|HDFC)\b|, /.test(
            n,
          ))
      )
    )
      return 0;
    if (SEC.test(n) || /^(W|Y[1-4]|I)/.test(bc)) return 3;
    if (OPEN.test(n) || l.landuse === "9" || /^Q/.test(bc)) return 1;
    return 2;
  }
  function evening(h) {
    if (!h) return 0;
    const s = h.toLowerCase();
    if (/24\s*hours/.test(s)) return 1;
    const cl = [],
      re = /(?:-|–|to)\s*(\d{1,2})(?::(\d\d))?\s*([ap])\.?m/g;
    let m;
    while ((m = re.exec(s))) {
      let hr = +m[1] % 12;
      if (m[3] === "p") hr += 12;
      cl.push(hr + (+m[2] || 0) / 60);
    }
    if (!cl.length) return 0;
    const late = cl.filter((c) => c >= 20 || c <= 4).length;
    return late > 0 && late >= Math.ceil((cl.length * 5) / 7 - 1e-9) ? 1 : 0;
  }

  function streetLabels(segs, inside) {
    const by = {};
    for (const s of segs) {
      if (
        !s.n ||
        /RAMP|EXIT|ENTRANCE|BRIDGE|TUNNEL|PATH|DRIVEWAY|ALLEY|UNNAMED|BOUNDARY|SHORELINE|RAIL|PEDESTRIAN|BIKE|GREENWAY/.test(
          s.n,
        )
      )
        continue;
      for (let i = 0; i + 1 < s.pts.length; i++) {
        const a = s.pts[i],
          b = s.pts[i + 1],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]),
          mx = (a[0] + b[0]) / 2,
          my = (a[1] + b[1]) / 2;
        if (L < 15 || !inside(mx, my)) continue;
        const o = by[s.n] || (by[s.n] = { n: s.n, len: 0, rank: 9, parts: [] });
        o.len += L;
        o.rank = Math.min(o.rank, s.rank);
        o.parts.push([mx, my, Math.atan2(b[1] - a[1], b[0] - a[0]), L]);
      }
    }
    const all = Object.values(by)
        .filter((s) => s.len >= 180)
        .sort((a, b) => a.rank - b.rank || b.len - a.len),
      out = [];
    all.forEach((s, i) => {
      const big = s.parts.reduce((a, b) => (b[3] > a[3] ? b : a)),
        ux = Math.cos(big[2]),
        uy = Math.sin(big[2]);
      const pr = s.parts
          .map((p) => [p[0] * ux + p[1] * uy, p])
          .sort((a, b) => a[0] - b[0]),
        span = pr[pr.length - 1][0] - pr[0][0],
        k = Math.max(1, Math.round(span / 1100));
      for (let j = 0; j < k; j++) {
        const t = pr[0][0] + (span * (j + 0.5)) / k;
        let best = pr[0];
        for (const q of pr)
          if (Math.abs(q[0] - t) < Math.abs(best[0] - t)) best = q;
        let ang = (best[1][2] * 180) / Math.PI;
        if (ang > 90) ang -= 180;
        if (ang <= -90) ang += 180;
        out.push({
          n: short(s.n),
          x: Math.round(best[1][0]),
          y: Math.round(best[1][1]),
          a: Math.round(ang),
          t: i < 18 ? 1 : 2,
        });
      }
    });
    return out;
  }

  // Public Restrooms (Mayor's Office of Operations), projected with P and kept inside box [x0, y0, x1, y1].
  async function restroomsIn(P, box, fresh) {
    if (fresh) delete cache.rest;
    const rows = await once("rest", () => soda("i7jb-7jku", { limit: 5000 }));
    const acc = (a) =>
      /^Fully/.test(a)
        ? 2
        : /^(Partial|Limited)/.test(a)
          ? 1
          : /^Not/.test(a)
            ? 0
            : null;
    return rows
      .filter((r) => r.latitude)
      .map((r) => ({ r, p: P([+r.longitude, +r.latitude]) }))
      .filter(
        ({ p }) =>
          p[0] >= box[0] && p[0] <= box[2] && p[1] >= box[1] && p[1] <= box[3],
      )
      .map(({ r, p }) => ({
        n: r.facility_name,
        t: /throne/i.test(r.operator || "") ? "Throne" : /jcdecaux/i.test(r.operator || "") ? "APT" : r.location_type,
        op: r.operator,
        ac: acc(r.accessibility || ""),
        ok: r.status === "Operational" && r.open !== "Future" ? 1 : 0,
        se: r.open === "Seasonal" ? 1 : 0,
        ev: evening((r.hours_of_operation || "").replace(/\s+/g, " ")),
        h:
          (r.hours_of_operation || "")
            .replace(/\s+/g, " ")
            .trim() || undefined,
        op4: r.open || "",
        ac5: (/^(Fully|Partially|Limited|Not)/.exec(r.accessibility || "") || ["", ""])[1],
        mf: /^"?yes/i.test(r.menstrual_friendly || "") ? 1 : /^no/i.test(r.menstrual_friendly || "") ? 0 : null,
        st: r.status || "",
        rt: r.restroom_type || "",
        x: Math.round(p[0]),
        y: Math.round(p[1]),
      }));
  }

  // Replace a district's restroom list with the current open-data version.
  async function refreshRestrooms(K) {
    const kx = 111320 * Math.cos((K.o[1] * Math.PI) / 180),
      ky = 110574,
      P = (c) => [(c[0] - K.o[0]) * kx, (c[1] - K.o[1]) * ky],
      B = Geo.bbox(K.blocks.flatMap((b) => b.g)),
      M = 1300;
    K.rest = await restroomsIn(
      P,
      [B[0] - M, B[1] - M, B[2] + M, B[3] + M],
      true,
    );
    K.restAsOf = new Date().toISOString().slice(0, 10);
    return K;
  }

  /* spec: {id, name, cd:"105"} for a community district, or {id, name, geom: GeoJSON Polygon/MultiPolygon in longitude/latitude}.
   SUB: subway table [[name,lat,lon,dailyEntries,winterRatio],...]. log(text) reports progress. */
  async function pack(spec, SUB, log) {
    log = log || (() => {});
    let geom = spec.geom;
    if (!geom) {
      log("District boundary");
      const r = await soda("5crt-au7u", { where: "boro_cd='" + spec.cd + "'" });
      if (!r.length) throw new Error("No community district " + spec.cd);
      geom = r[0].the_geom;
    }
    const MP = polys(geom);
    if (!MP.length) throw new Error("The boundary has no polygon");
    let w = 1e9,
      s = 1e9,
      e = -1e9,
      n = -1e9;
    MP.forEach((p) =>
      p[0].forEach((c) => {
        if (c[0] < w) w = c[0];
        if (c[0] > e) e = c[0];
        if (c[1] < s) s = c[1];
        if (c[1] > n) n = c[1];
      }),
    );
    if (w < -74.3 || e > -73.65 || s < 40.45 || n > 40.95)
      throw new Error(
        "The boundary is outside New York City. The builder only knows NYC data sources.",
      );
    const lon0 = +((w + e) / 2).toFixed(5),
      lat0 = +((s + n) / 2).toFixed(5),
      kx = 111320 * Math.cos((lat0 * Math.PI) / 180),
      ky = 110574;
    const P = (c) => [(c[0] - lon0) * kx, (c[1] - lat0) * ky],
      flat = (r) => {
        const o = [];
        for (const c of r) {
          const p = P(c);
          o.push(p[0], p[1]);
        }
        if (
          o.length >= 4 &&
          o[0] === o[o.length - 2] &&
          o[1] === o[o.length - 1]
        )
          o.length -= 2;
        return o;
      };
    const bx = (m) => ({
      w: (w - m / kx).toFixed(5),
      e: (e + m / kx).toFixed(5),
      s: (s - m / ky).toFixed(5),
      n: (n + m / ky).toFixed(5),
    });
    const llBox = (m) => {
      const b = bx(m);
      return `latitude between ${b.s} and ${b.n} AND longitude between ${b.w} and ${b.e}`;
    };
    const wkt = (m) => {
      const b = bx(m);
      return `'POLYGON((${b.w} ${b.s},${b.e} ${b.s},${b.e} ${b.n},${b.w} ${b.n},${b.w} ${b.s}))'`;
    };
    const M = 1300,
      parts = MP.map((p) => p.map(flat)),
      inDist = (x, y) => parts.some((p) => Geo.inRings(x, y, p));

    log("Census blocks");
    const tj = await get(
      TIG +
        "?where=1%3D1&geometry=" +
        [w - 450 / kx, s - 450 / ky, e + 450 / kx, n + 450 / ky].join(",") +
        "&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects&outFields=GEOID,POP100,AREALAND,INTPTLAT,INTPTLON&returnGeometry=true&outSR=4326&geometryPrecision=6&f=geojson",
    );
    let blocks = [];
    const allC = []; // allC: every land block near the district, so a station on the edge shares its riders with neighbours too
    for (const f of tj.features || []) {
      const a = f.properties;
      if (!(+a.AREALAND > 0)) continue;
      const c = P([parseFloat(a.INTPTLON), parseFloat(a.INTPTLAT)]),
        pi = parts.findIndex((p) => Geo.inRings(c[0], c[1], p));
      allC.push(c);
      if (pi < 0) continue;
      const g = [];
      for (const p of polys(f.geometry))
        for (const r of p) {
          const q = Geo.round(Geo.simplify(flat(r), 1.5));
          if (q.length >= 6) g.push(q);
        }
      if (g.length)
        blocks.push({
          id: a.GEOID,
          pop: +a.POP100 || 0,
          c: [Math.round(c[0]), Math.round(c[1])],
          g,
          _p: pi,
        });
    }
    if (!blocks.length)
      throw new Error("No census blocks found inside the boundary");
    // leave off separate islands: parts with under 0.5% of residents that sit more than 200 m from the rest (piers stay)
    const pp = parts.map(() => ({ pop: 0, n: 0 }));
    blocks.forEach((b) => {
      pp[b._p].pop += b.pop;
      pp[b._p].n++;
    });
    const tot = pp.reduce((a, b) => a + b.pop, 0),
      main = pp.reduce((a, b, i) => (b.n > pp[a].n ? i : a), 0);
    const big = parts.filter((p, i) => i === main || pp[i].pop >= tot * 0.005),
      far = (p) => {
        let d = 1e9;
        for (let i = 0; i < p[0].length; i += 2)
          for (const q of big) {
            const v = Geo.ringDist(p[0][i], p[0][i + 1], q[0]);
            if (v < d) d = v;
          }
        return d > 200;
      };
    const dropped = pp.map(
      (p, i) => i !== main && p.pop < tot * 0.005 && far(parts[i]),
    );
    blocks = blocks.filter((b) => !dropped[b._p]);
    const keepParts = parts.filter((p, i) => !dropped[i]),
      B = Geo.bbox(blocks.flatMap((b) => b.g));
    blocks.forEach((b) => {
      delete b._p;
      b.bb = Geo.bbox(b.g);
    });

    log("Age, disability and poverty by tract");
    const trs = [...new Set(blocks.map((b) => b.id.slice(0, 11)))]; // the service returns 50 rows a call, so ask for tracts by name in groups of 40
    const aq = async (svc, f) => {
      const m = {};
      for (let i = 0; i < trs.length; i += 40) {
        const r = await get(
          ACS +
            svc +
            "/FeatureServer/2/query?where=" +
            encodeURIComponent(
              "GEOID IN ('" + trs.slice(i, i + 40).join("','") + "')",
            ) +
            "&outFields=" +
            f +
            "&returnGeometry=false&f=json",
        );
        (r.features || []).forEach(
          (x) => (m[x.attributes.GEOID] = x.attributes),
        );
      }
      return m;
    };
    const [A, Dz, Pv] = await Promise.all([
      aq(
        "ACS_Total_Population_Boundaries",
        "GEOID,B01001_001E,B01001_003E,B01001_027E,B01001_calc_numGE65E",
      ),
      aq(
        "ACS_Disability_by_Type_Boundaries",
        "GEOID,B18101_001E,C18108_003E,C18108_004E,C18108_007E,C18108_008E",
      ),
      aq("ACS_Poverty_by_Age_Boundaries", "GEOID,B17020_001E,B17020_002E"),
    ]);
    const r3 = (v) => Math.round(v * 1000) / 1000;
    blocks.forEach((b) => {
      const t = b.id.slice(0, 11),
        a = A[t],
        d = Dz[t],
        p = Pv[t];
      if (a) b.tp = a.B01001_001E || 0;
      if (a && a.B01001_001E >= 50) {
        b.s65 = r3(a.B01001_calc_numGE65E / a.B01001_001E);
        b.s5 = r3((a.B01001_003E + a.B01001_027E) / a.B01001_001E);
        b.sd =
          d && d.B18101_001E > 0
            ? r3(
                (d.C18108_003E +
                  d.C18108_004E +
                  d.C18108_007E +
                  d.C18108_008E) /
                  d.B18101_001E,
              )
            : 0;
      }
      if (p && p.B17020_001E >= 50) b.pv = r3(p.B17020_002E / p.B17020_001E);
    });

    log("Street demand classes");
    const sraw = await soda("fwpa-qxaf", {
      select: "street,rank,the_geom",
      where: "intersects(the_geom," + wkt(80) + ")",
      limit: 50000,
    });
    const segs = [];
    sraw.forEach((r) =>
      lines(r.the_geom).forEach((l) =>
        segs.push({ n: r.street, rank: +r.rank || 5, pts: l.map(P) }),
      ),
    );
    blocks.forEach((b) => (b.pd = 5));
    for (const sg of segs) {
      const samp = [];
      for (let i = 0; i + 1 < sg.pts.length; i++) {
        const a = sg.pts[i],
          c = sg.pts[i + 1],
          L = Math.hypot(c[0] - a[0], c[1] - a[1]),
          k = Math.max(1, Math.floor(L / 8));
        for (let j = 0; j <= k; j++)
          samp.push([
            a[0] + ((c[0] - a[0]) * j) / k,
            a[1] + ((c[1] - a[1]) * j) / k,
          ]);
      }
      const tl = samp.length;
      const use = tl > 6 ? samp.slice(2, tl - 2) : [samp[tl >> 1]];
      let x0 = 1e9,
        y0 = 1e9,
        x1 = -1e9,
        y1 = -1e9;
      use.forEach((p) => {
        if (p[0] < x0) x0 = p[0];
        if (p[0] > x1) x1 = p[0];
        if (p[1] < y0) y0 = p[1];
        if (p[1] > y1) y1 = p[1];
      });
      for (const b of blocks) {
        if (
          b.pd <= sg.rank ||
          b.bb[0] > x1 + 35 ||
          b.bb[2] < x0 - 35 ||
          b.bb[1] > y1 + 35 ||
          b.bb[3] < y0 - 35
        )
          continue;
        for (const p of use) {
          if (b.g.some((r) => Geo.ringDist(p[0], p[1], r) <= 35)) {
            b.pd = sg.rank;
            break;
          }
        }
      }
    }

    log("Subway stations");
    const st = [];
    (SUB || []).forEach((r) => {
      const p = P([r[2], r[1]]);
      if (
        p[0] > B[0] - 450 &&
        p[0] < B[2] + 450 &&
        p[1] > B[1] - 450 &&
        p[1] < B[3] + 450
      )
        st.push({
          n: r[0],
          x: Math.round(p[0]),
          y: Math.round(p[1]),
          r: r[3],
          wr: r[4],
        });
    });
    blocks.forEach((b) => {
      b.tr = 0;
      b._w = 0;
    });
    st.forEach((sx) => {
      const near = blocks.filter(
          (b) => Math.hypot(b.c[0] - sx.x, b.c[1] - sx.y) <= 400,
        ),
        all = Math.max(
          near.length,
          allC.filter((c) => Math.hypot(c[0] - sx.x, c[1] - sx.y) <= 400)
            .length,
        );
      near.forEach((b) => {
        const v = sx.r / all;
        b.tr += v;
        b._w += v * sx.wr;
      });
    });
    const meanWr = st.length ? st.reduce((a, b) => a + b.wr, 0) / st.length : 1;
    blocks.forEach((b) => {
      b.wr = r3(b.tr > 0 ? b._w / b.tr : meanWr);
      b.tr = Math.round(b.tr);
      delete b._w;
    });

    log("311 complaints");
    const c311 = await soda("erm2-nwe9", {
      select: "latitude,longitude",
      where:
        "complaint_type='Urinating in Public' AND created_date>='" +
        SINCE +
        "T00:00:00' AND " +
        llBox(250),
      limit: 50000,
    });
    const yrs = Math.max(0.5, (Date.now() - Date.parse(SINCE)) / 31557600000),
      cp = c311
        .filter((r) => r.latitude)
        .map((r) => P([+r.longitude, +r.latitude]));
    blocks.forEach((b) => {
      let k = 0;
      for (const p of cp)
        if (Math.hypot(p[0] - b.c[0], p[1] - b.c[1]) <= 200) k++;
      b.c3 = Math.round((k / yrs) * 10) / 10;
    });

    log("Drop-in centres");
    const dc = (
      await soda("bmxf-3rd4", {
        select: "center_name,latitude,longitude",
        limit: 100,
      })
    )
      .filter((r) => r.latitude)
      .map((r) => {
        const p = P([+r.longitude, +r.latitude]);
        return { n: r.center_name, x: Math.round(p[0]), y: Math.round(p[1]) };
      });
    blocks.forEach((b) => {
      b.di = dc.some((d) => Math.hypot(d.x - b.c[0], d.y - b.c[1]) <= DROPIN_M)
        ? 1
        : 0;
    });

    log("Land ownership and flood plain");
    let lots = [];
    for (let off = 0; ; off += 50000) {
      const r = await soda("64uk-42ks", {
        select:
          "bbl,bctcb2020,ownertype,ownername,address,pfirm15_flag,landuse,lotarea,bldgclass",
        where: llBox(0),
        order: "bbl",
        limit: 50000,
        offset: off,
      });
      lots = lots.concat(r);
      if (r.length < 50000) break;
    }
    const byB = {};
    lots.forEach((l) => {
      const k = l.bctcb2020;
      if (!k || k.length < 11) return;
      const id = "36" + COUNTY[k[0]] + k.slice(1, 7) + k.slice(7);
      (byB[id] = byB[id] || []).push(l);
    });
    blocks.forEach((b) => {
      const L = byB[b.id] || [];
      b.lt = 0;
      b.fl = 0;
      if (!L.length) return;
      b.fl =
        L.filter((l) => l.pfirm15_flag === "1").length * 2 >= L.length ? 1 : 0;
      const big =
        L.filter((l) => /^\d/.test(l.address || "")).sort(
          (x, y) => (+y.lotarea || 0) - (+x.lotarea || 0),
        )[0] || L.find((l) => l.address);
      if (big) b.ad = tc(big.address);
      let best = null,
        bt = 9;
      const ord = { 1: 1, 2: 2, 3: 3, 0: 9 };
      L.forEach((l) => {
        const t = lotTier(l);
        if (ord[t] < bt) {
          bt = ord[t];
          best = l;
        }
      });
      if (best) {
        b.lt = bt;
        b.pl = tc(best.ownername).slice(0, 44);
      }
    });

    log("Parks and plazas");
    const [praw, zraw] = await Promise.all([
      soda("enfh-gkve", {
        select:
          "signname,typecategory,acres,simplify_preserve_topology(multipolygon,0.00002) as g",
        where: "intersects(multipolygon," + wkt(100) + ")",
        limit: 5000,
      }),
      soda("k5k6-6jex", {
        select: "plazaname,simplify_preserve_topology(the_geom,0.00001) as g",
        where: "intersects(the_geom," + wkt(100) + ")",
        limit: 500,
      }),
    ]);
    const shape = (nm, g, tol) => {
      const rs = [];
      polys(g).forEach((p) => {
        const q = Geo.round(Geo.simplify(flat(p[0]), tol));
        if (q.length >= 6) rs.push(q);
      });
      if (!rs.length) return null;
      const bigR = rs.reduce((a, b) =>
          Math.abs(Geo.area(b)) > Math.abs(Geo.area(a)) ? b : a,
        ),
        c = Geo.centroid(bigR);
      return {
        n: nm,
        x: Math.round(c[0]),
        y: Math.round(c[1]),
        g: rs,
        bb: Geo.bbox(rs),
      };
    };
    const parks = [],
      plazas = [];
    praw.forEach((r) => {
      if (
        !r.g ||
        !r.signname ||
        /^(Park|Greenstreet|Lot)$/i.test(r.signname) ||
        /Mall|Strip|Parkway|Greenstreet|Cemetery|Undeveloped|Lot/i.test(
          r.typecategory || "",
        )
      )
        return;
      const o = shape(r.signname, r.g, 3);
      if (o) {
        o.ha = Math.round((+r.acres || 0) * 0.4047 * 100) / 100;
        o.site =
          /Park|Playground|Triangle|Plaza|Waterfront|Recreation/i.test(
            r.typecategory || "",
          ) && !/Garden/i.test(r.typecategory || "");
        parks.push(o);
      }
    });
    zraw.forEach((r) => {
      const o = shape(r.plazaname, r.g, 1.5);
      if (o) plazas.push(o);
    });
    const touch = (o, b, d) => {
      if (
        b.bb[0] > o.bb[2] + d ||
        b.bb[2] < o.bb[0] - d ||
        b.bb[1] > o.bb[3] + d ||
        b.bb[3] < o.bb[1] - d
      )
        return false;
      if (
        o.g.some((r) => Geo.inRing(b.c[0], b.c[1], r)) ||
        b.g.some((r) => Geo.inRing(o.x, o.y, r))
      )
        return true;
      for (const r of o.g)
        for (let i = 0; i < r.length; i += 2) {
          if (
            b.g.some(
              (q) =>
                Geo.inRing(r[i], r[i + 1], q) ||
                (d > 0 && Geo.ringDist(r[i], r[i + 1], q) <= d),
            )
          )
            return true;
        }
      return false;
    };
    blocks.forEach((b) => {
      for (const z of plazas)
        if (touch(z, b, 12)) {
          b.lt = 1;
          b.pl = z.n;
          return;
        }
      if (b.lt !== 1)
        for (const k of parks)
          if (k.site && k.ha >= 0.04 && touch(k, b, 0)) {
            b.lt = 1;
            b.pl = k.n;
            return;
          }
    });

    log("Public restrooms");
    const rest = await restroomsIn(P, [B[0] - M, B[1] - M, B[2] + M, B[3] + M]);

    log("Surrounding land and water");
    const allcd = await once("cds", () =>
      soda("5crt-au7u", {
        select: "boro_cd,simplify_preserve_topology(the_geom,0.00004) as g",
        limit: 200,
      }),
    );
    const vb = [B[0] - M, B[1] - M, B[2] + M, B[3] + M],
      land = [];
    allcd.forEach((r) =>
      polys(r.g).forEach((p) => {
        const c = Geo.round(Geo.simplify(Geo.clip(flat(p[0]), vb), 4));
        if (c.length >= 6) land.push(c);
      }),
    );
    const cd = [];
    keepParts.forEach((p) => {
      const q = Geo.round(Geo.simplify(p[0], 2));
      if (q.length >= 6) cd.push(q);
    });

    const inside = (x, y) =>
      x >= B[0] - 30 &&
      x <= B[2] + 30 &&
      y >= B[1] - 30 &&
      y <= B[3] + 30 &&
      (inDist(x, y) || keepParts.some((p) => Geo.ringDist(x, y, p[0]) < 40));
    const near = (o) =>
      o.bb[2] > B[0] - 60 &&
      o.bb[0] < B[2] + 60 &&
      o.bb[3] > B[1] - 60 &&
      o.bb[1] < B[3] + 60;
    blocks.forEach((b) => delete b.bb);
    return {
      v: 3,
      id: String(spec.id),
      name: spec.name,
      built: new Date().toISOString().slice(0, 10),
      o: [lon0, lat0],
      cd,
      land,
      blocks,
      rest,
      st: st.map((x) => ({ n: x.n, x: x.x, y: x.y, r: x.r })),
      lab: streetLabels(segs, inside),
      dc: dc.filter(
        (d) =>
          d.x > B[0] - M && d.x < B[2] + M && d.y > B[1] - M && d.y < B[3] + M,
      ),
      parks: parks
        .filter(near)
        .map((k) => ({ n: k.n, x: k.x, y: k.y, ha: k.ha, g: k.g })),
      plazas: plazas
        .filter(near)
        .map((k) => ({ n: k.n, x: k.x, y: k.y, g: k.g })),
    };
  }
  return { pack, refreshRestrooms, lotTier, evening, short, tc };
})();

