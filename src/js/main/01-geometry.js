/* ---------- geometry helpers (shared by the map and the district builder) ---------- */
const Geo = {
  // rings are flat [x0,y0,x1,y1,...] in metres unless noted
  inRing(x, y, r) {
    let c = false;
    for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
      const xi = r[i],
        yi = r[i + 1],
        xj = r[j],
        yj = r[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
        c = !c;
    }
    return c;
  },
  inRings(x, y, rings) {
    let c = false;
    for (const r of rings) if (Geo.inRing(x, y, r)) c = !c;
    return c;
  },
  segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay,
      l = dx * dx + dy * dy;
    let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return Math.hypot(px - ax - t * dx, py - ay - t * dy);
  },
  ringDist(x, y, r) {
    let d = 1e9;
    for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
      const v = Geo.segDist(x, y, r[j], r[j + 1], r[i], r[i + 1]);
      if (v < d) d = v;
    }
    return d;
  },
  bbox(rings) {
    let a = 1e9,
      b = 1e9,
      c = -1e9,
      d = -1e9;
    for (const r of rings)
      for (let i = 0; i < r.length; i += 2) {
        if (r[i] < a) a = r[i];
        if (r[i] > c) c = r[i];
        if (r[i + 1] < b) b = r[i + 1];
        if (r[i + 1] > d) d = r[i + 1];
      }
    return [a, b, c, d];
  },
  area(r) {
    let a = 0;
    for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2)
      a += r[j] * r[i + 1] - r[i] * r[j + 1];
    return a / 2;
  },
  centroid(r) {
    let a = 0,
      cx = 0,
      cy = 0;
    for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
      const f = r[j] * r[i + 1] - r[i] * r[j + 1];
      a += f;
      cx += (r[j] + r[i]) * f;
      cy += (r[j + 1] + r[i + 1]) * f;
    }
    return a ? [cx / (3 * a), cy / (3 * a)] : [r[0], r[1]];
  },
  // Douglas-Peucker on a flat ring, tolerance in the ring's units
  simplify(r, tol) {
    const n = r.length / 2;
    if (n < 5) return r;
    const keep = new Uint8Array(n);
    keep[0] = keep[n - 1] = 1;
    const st = [[0, n - 1]];
    while (st.length) {
      const [a, b] = st.pop();
      let md = 0,
        mi = -1;
      for (let i = a + 1; i < b; i++) {
        const d = Geo.segDist(
          r[2 * i],
          r[2 * i + 1],
          r[2 * a],
          r[2 * a + 1],
          r[2 * b],
          r[2 * b + 1],
        );
        if (d > md) {
          md = d;
          mi = i;
        }
      }
      if (md > tol) {
        keep[mi] = 1;
        st.push([a, mi], [mi, b]);
      }
    }
    const o = [];
    for (let i = 0; i < n; i++) if (keep[i]) o.push(r[2 * i], r[2 * i + 1]);
    return o.length >= 6 ? o : r;
  },
  // Sutherland-Hodgman clip of a flat ring to a rectangle [x0,y0,x1,y1]
  clip(r, box) {
    const edges = [
      [0, box[0], 1],
      [0, box[2], -1],
      [1, box[1], 1],
      [1, box[3], -1],
    ];
    let p = r;
    for (const [ax, v, s] of edges) {
      const o = [],
        n = p.length;
      if (!n) break;
      for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
        const a = [p[j], p[j + 1]],
          b = [p[i], p[i + 1]],
          ia = (a[ax] - v) * s >= 0,
          ib = (b[ax] - v) * s >= 0;
        if (ia !== ib) {
          const t = (v - a[ax]) / (b[ax] - a[ax]);
          o.push(a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]));
        }
        if (ib) o.push(b[0], b[1]);
      }
      p = o;
    }
    return p;
  },
  round(r) {
    const o = [];
    for (let i = 0; i < r.length; i += 2) {
      const x = Math.round(r[i]),
        y = Math.round(r[i + 1]);
      if (!o.length || x !== o[o.length - 2] || y !== o[o.length - 1])
        o.push(x, y);
    }
    if (o.length >= 4 && o[0] === o[o.length - 2] && o[1] === o[o.length - 1])
      o.length -= 2;
    return o;
  },
  // land raster: 1 where any ring covers the cell centre (even-odd per ring set)
  raster(polys, box, cell) {
    const w = Math.ceil((box[2] - box[0]) / cell),
      h = Math.ceil((box[3] - box[1]) / cell),
      g = new Uint8Array(w * h);
    for (const rings of polys) {
      const bb = Geo.bbox(rings),
        r0 = Math.max(0, Math.floor((bb[1] - box[1]) / cell)),
        r1 = Math.min(h - 1, Math.ceil((bb[3] - box[1]) / cell));
      for (let row = r0; row <= r1; row++) {
        const y = box[1] + (row + 0.5) * cell,
          xs = [];
        for (const r of rings)
          for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
            const yi = r[i + 1],
              yj = r[j + 1];
            if (yi > y !== yj > y)
              xs.push(r[i] + ((y - yi) * (r[j] - r[i])) / (yj - yi));
          }
        xs.sort((a, b) => a - b);
        for (let k = 0; k + 1 < xs.length; k += 2) {
          const c0 = Math.max(0, Math.ceil((xs[k] - box[0]) / cell - 0.5)),
            c1 = Math.min(w - 1, Math.floor((xs[k + 1] - box[0]) / cell - 0.5));
          for (let c = c0; c <= c1; c++) g[row * w + c] = 1;
        }
      }
    }
    return { g, w, h, box, cell };
  },
  // metres of open water crossed in the longest unbroken run along a straight line
  waterRun(R, ax, ay, bx, by) {
    const d = Math.hypot(bx - ax, by - ay),
      n = Math.max(1, Math.ceil(d / (R.cell * 0.75)));
    let run = 0,
      best = 0;
    for (let i = 0; i <= n; i++) {
      const x = ax + ((bx - ax) * i) / n,
        y = ay + ((by - ay) * i) / n,
        c = Math.floor((x - R.box[0]) / R.cell),
        r = Math.floor((y - R.box[1]) / R.cell);
      const land =
        c < 0 || r < 0 || c >= R.w || r >= R.h ? 1 : R.g[r * R.w + c];
      if (land) run = 0;
      else {
        run += d / n;
        if (run > best) best = run;
      }
    }
    return best;
  },
};

