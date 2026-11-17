/* ---------- a district pack, made ready for use ---------- */
function prep(K) {
  // v5: swap the pack's restrooms when the restroom list setting changes (rest = 2 Nov 2026, r10 = 1 Oct 2026).
  if (K.r10 && K._rl !== rlKey()) {
    if (!K._rn) K._rn = K.rest;
    K.rest = (RLIST === "oct" ? K.r10 : RLIST === "live" && K._rv ? K._rv : K._rn).map((r) => ({ ...r }));
    K._rl = rlKey();
    K.off = {};
    K._ok = false;
  }
  if (K._ok) return K;
  K.user = K.user || [];
  K.off = K.off || {};
  K.blocks.forEach((b, i) => (b._i = i));
  K.rest.forEach((r, i) => (r._k = "r" + i));
  K._B = Geo.bbox(K.blocks.flatMap((b) => b.g));
  K._kx = 111320 * Math.cos((K.o[1] * Math.PI) / 180);
  K._ky = 110574;
  K._thr = [];
  K._sub = ((typeof LENS === "object" && LENS.d[K.id] && LENS.d[K.id].sub) || []).map((s, i) => ({
    n: s.n, t: "Subway", op: "MTA", ok: s.ok === 0 ? 0 : 1, se: 0, ev: 0, ac: null,
    st: s.ok === 0 ? "Not open to the public (MTA)" : "Operational",
    nt: s.ok === 0
      ? `In the MTA's register of public restrooms${s.nr ? ` (${s.nr} room${s.nr > 1 ? "s" : ""})` : ""}, but not on its list of bathrooms open to the public: closed since March 2020, or kept for staff.`
      : `On the MTA's list of bathrooms open to the public${s.nr ? `; ${s.nr} room${s.nr > 1 ? "s" : ""} in its register` : ""}. Enter at ${s.ent}.`,
    h: s.ok === 0 ? "" : "7 am–7 pm daily, closed 12–1 pm for cleaning", x: s.x, y: s.y, _k: "s" + i, cd: s.cd,
  }));
  // v5: the 2 Nov list has Fulton St (A-C) MTA Restroom (operator NYCT); the subway layer's copy within 150 m is dropped
  // while Transit restrooms count, so it is not counted twice.
  if (K.r10 && RLIST !== "oct")
    K._sub.forEach((s) => { s._dupList = K.rest.some((r) => r.op === "NYCT" && Math.hypot(r.x - s.x, r.y - s.y) < 150) ? 1 : 0; });
  // Attributes from the city's list of 1 Oct 2026 (existing-infrastructure-data): changing station, all-gender, status, planned, notes.
  const RA = !K._fresh && typeof LENS === "object" && LENS.d[K.id] && (K.r10 && RLIST === "live" && K._rva ? { ra: K._rva } : LENS.d[K.id])[K.r10 && RLIST === "oct" ? "ra10" : "ra"];
  if (RA) K.rest.forEach((r, i) => { const a = RA[i]; if (a) [r.cs, r.ag, r.st, r.fu, r.nt, r.rt] = a; });
  // DOT/JCDecaux automatic public toilets get their own type; other plaza restrooms stay under Plazas and kiosks.
  K.rest.forEach((r) => { if (/jcdec/i.test(r.op || "") || /\bAPT$/.test(r.n || "")) r.t = "APT"; });
  // v5: the 2 Nov list already has the 17 Throne units (operator Throne Labs), so they are only added on the 1 Oct list.
  if (!(K.r10 && RLIST !== "oct")) THRONE.forEach((t, i) => {
    const x = (t[2] - K.o[0]) * K._kx,
      y = (t[1] - K.o[1]) * K._ky;
    if (
      x > K._B[0] - 1300 &&
      x < K._B[2] + 1300 &&
      y > K._B[1] - 1300 &&
      y < K._B[3] + 1300
    )
      K._thr.push({
        n: t[0] + " (Throne, announced)",
        t: "Throne",
        op: "Throne Labs",
        ok: 1,
        se: 0,
        ev: 1,
        ac: 2,
        ag: 1, // a single-user unit
        x: Math.round(x),
        y: Math.round(y),
        _k: "t" + i,
      });
  });
  const land = (K.land || []).concat(K.cd || []);
  K._ras = land.length
    ? Geo.raster(
        land.map((r) => [r]),
        Geo.bbox(land),
        15,
      )
    : null;
  K._wc = new Map();
  userKeys(K);
  const a = K.blocks
    .map((b) => Math.max(CAL[b.pd], b.tr))
    .sort((x, y) => x - y);
  K._umed = a[a.length >> 1];
  // Busiest subway station near each block, whether parkland, and whether MTA would review a unit here.
  const parkNames = new Set((K.parks || []).map((q) => q.n));
  K.blocks.forEach((b) => {
    let m = 0,
      d = 1e9;
    (K.st || []).forEach((q) => {
      const h = Math.hypot(q.x - b.c[0], q.y - b.c[1]);
      if (h <= SUB_M) m = Math.max(m, q.r);
      d = Math.min(d, h);
    });
    b._sub = m;
    b._mta = d <= MTA_M;
    b._park = b.lt === 1 && parkNames.has(b.pl);
  });
  // Small-tract adjustment: survey shares from a tract with few residents are noisy, so each tract's shares are blended with the
  // city average, weighted by tract residents / (tract residents + SMALL). Tracts with no published share take the city average.
  // (v4.2 changed this from the district average, so a tract scores the same in every district.)
  const T = {};
  K.blocks.forEach((b) => {
    const t = b.id.slice(0, 11);
    if (!T[t]) T[t] = b;
  });
  K._avg = cityAvg(); // v4.2: the city average, so a tract scores the same in every district
  K.blocks.forEach((b) => {
    const has = b.tp != null,
      w = has ? b.tp / (b.tp + SMALL) : 1;
    b._w = w;
    ["s65", "s5", "sd", "pv"].forEach((f) => {
      const v = b[f],
        m = K._avg[f];
      b["_" + f] =
        v == null
          ? has
            ? m
            : null
          : m == null || !has
            ? v
            : w * v + (1 - w) * m;
    });
  });
  K._ok = 1;
  return K;
}
function userKeys(K) {
  K.user.forEach((u, i) => {
    u._k = "u" + i;
    u.t = "User";
    u.ok = 1;
    u.se = 0;
    u.ev = 1;
    u.ac = null;
  });
  if (K._wc)
    for (const k of K._wc.keys()) if (k.includes("|u")) K._wc.delete(k);
}
const toLL = (K, x, y) => [
  +(x / K._kx + K.o[0]).toFixed(6),
  +(y / K._ky + K.o[1]).toFixed(6),
];
const toXY = (K, lon, lat) => [(lon - K.o[0]) * K._kx, (lat - K.o[1]) * K._ky];
const bare = (o) => JSON.stringify(o, function (k, v) { return k[0] === "_" ? undefined : k === "rest" && this && this.r10 && this._rn ? this._rn : v; }); // drops the working fields added by prep()

