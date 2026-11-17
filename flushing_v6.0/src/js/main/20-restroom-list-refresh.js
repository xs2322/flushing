/* ---------- v5 (HANDOFF_v5.md): the restroom list setting and keeping the lists current ---------- */
// Each district pack carries the City's current list (rest; 2 Nov 2026 as built, 1,100 rows) and the 1 Oct 2026 list
// as the memo used it (r10). A list pulled from NYC Open Data in this browser is a third option (live). prep() swaps.
const RL = () => (typeof DATA === "object" && DATA.rlist) || { nov: { asOf: "", rows: 0 }, oct: { asOf: "2026-10-01", rows: 1066 } };
let RLIVE = null; // { asOf, src, rows: [...], v, chg, log }
const rlKey = () => (RLIST === "live" ? "live" + (RLIVE ? RLIVE.v : "") : RLIST);
const dmy = (iso) => { if (!iso) return "date not recorded"; const d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); };
const rlLabel = (k) => k === "oct" ? `City list, ${dmy(RL().oct.asOf)} (earlier list)` : k === "live" ? `Latest from NYC Open Data (pulled ${RLIVE ? dmy(RLIVE.asOf) : "–"})` : `City list, ${dmy(RL().nov.asOf)}`;
// City category names, as in the LL58 report's Tables 6 (season), 7 (status) and 8 (accessibility).
const AC5NAME = { Fully: "Fully Accessible", Partially: "Partially Accessible", Limited: "Limited Accessibility", Not: "Not Accessible" };
function rlistOptions() {
  if (!$("rlist")) return;
  $("rlist").innerHTML = ["nov", "oct"].concat(RLIVE ? ["live"] : []).map((k) => `<option value="${k}" ${k === RLIST ? "selected" : ""}>${esc(rlLabel(k))}</option>`).join("");
}
function setRList(v) {
  RLIST = v === "oct" ? "oct" : v === "live" && RLIVE ? "live" : "nov";
  rlistOptions();
  if ($("rlistNote")) $("rlistNote").innerHTML = rlistNote();
  if (D) { load(D.id); render(); }
  if (!$("tab-list").hidden) listRender();
  try { localStorage.setItem("flushing-v5-rl", RLIST); } catch (e) {}
}
const rlistNote = () =>
  RLIST === "oct"
    ? `The ${RL().oct.rows.toLocaleString()} rows of the 1 Oct 2026 list, with the 17 Throne units added at their announced sites.`
    : RLIST === "live"
      ? `${RLIVE.rows.length.toLocaleString()} rows pulled from NYC Open Data (${esc(RLIVE.src)}) on ${dmy(RLIVE.asOf)}, built into each district by the same rules as the map's own list. Kept in this browser only; "Save this map" makes a copy with it built in.`
      : `${RL().nov.rows.toLocaleString()} rows${RL().nov.asOf === "2026-11-02" ? ", the count in the City's LL58 report (Table 1, p. 2)" : ""}. It lists the Throne units and the DOT automatic toilets itself, so nothing is added.`;
// Changes against the previous list, from pipeline/restrooms_v5.py or from the map's own update.
function rlistSummary() {
  const live = RLIST === "live", c = live ? RLIVE.chg : RL().chg;
  if (RLIST === "oct" || !c) return `Restroom list: ${esc(rlLabel(RLIST))}. `;
  return `Restroom list: ${esc(rlLabel(RLIST))}. Since ${dmy(c.vs)}, ${c.status} restrooms changed status, ${c.season} changed season and ${c.access} changed accessibility; ${c.added} were added and ${c.dropped} dropped (${live ? "save the full log under Which restrooms count" : "every change: <code>restroom_changes_1Oct_to_2Nov__v5.csv</code>"}). Status, season and accessibility use the City's own category names (LL58 report, Tables 6–8). Accessibility is reported by each operator, not surveyed (report, p. 13). `;
}

/* ---- keeping the restroom list current: the same rules as pipeline/restrooms_v5.py ---- */
const RR_NEED = ["facility_name", "location_type", "operator", "status", "open", "hours_of_operation", "accessibility", "latitude", "longitude"];
const RR_OPT = ["restroom_type", "changing_stations", "menstrual_friendly", "additional_notes"];
const colKey = (h) => String(h).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f !== "" || row.length) { row.push(f); rows.push(row); }
  const head = rows.shift().map(colKey);
  return rows.filter((r) => r.length > 1 || r[0]).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] == null ? "" : r[i]])));
}
// Columns the map relies on. If the City renames or drops one, the update stops and says which.
function rrColumns(rows) {
  const has = (k) => rows.some((r) => k in r);
  return { missing: RR_NEED.filter((k) => !has(k)), missingOpt: RR_OPT.filter((k) => !has(k)) };
}
const sv = (v) => (v == null ? "" : typeof v === "string" ? v : String(v));
const wsp = (s) => sv(s).split(/\s+/).filter(Boolean).join(" ");
const unq = (s) => sv(s).trim().replace(/^"+|"+$/g, "").trim();
function rrRow(c, li) {
  const op = sv(c.operator).trim(), a = sv(c.accessibility).trim(), n = sv(c.facility_name).trim(), h = wsp(c.hours_of_operation), open = sv(c.open);
  const x = {
    n,
    t: op.toLowerCase() === "throne labs" ? "Throne" : /jcdecaux/i.test(op) ? "APT" : sv(c.location_type),
    op,
    ac: /^Fully/.test(a) ? 2 : /^(Partial|Limited)/.test(a) ? 1 : /^Not/.test(a) ? 0 : null,
    ok: sv(c.status) === "Operational" && open !== "Future" ? 1 : 0,
    se: open === "Seasonal" ? 1 : 0,
    ev: Build.evening(h),
  };
  if (h) x.h = h;
  const src = {};
  if (x.op === "QPL" && x.ac == null) { const b = n.replace(" Library, QPL", "").replace(", QPL", "").trim(); x.ac = b in FILLS.qp ? FILLS.qp[b] : 2; src.ac = FILLS.qsrc; }
  const fa = FILLS.opp[n + "|accessibility"];
  if (fa && x.ac == null) { x.ac = fa[0] === "Yes" ? 2 : fa[0] === "Partly" ? 1 : 0; src.ac = fa[1]; }
  const fh = FILLS.opp[n + "|hours"];
  if (fh && !x.h && x.ok) { x.h = fh[0]; x.ev = Build.evening(wsp(fh[0])); src.h = fh[1]; }
  if (Object.keys(src).length) x.src = src;
  x.op4 = open.trim();
  x.ac5 = { "Fully Accessible": "Fully", "Partially Accessible": "Partially", "Limited Accessibility": "Limited", "Not Accessible": "Not" }[a] || "";
  const m = unq(c.menstrual_friendly);
  x.mf = /^Yes/.test(m) ? 1 : m === "No" ? 0 : null;
  x.li = li;
  x.cd = homeOf(+c.longitude, +c.latitude);
  return x;
}
function rrAttr(c) {
  const cs0 = unq(c.changing_stations), t = sv(c.restroom_type);
  return [cs0 === "Yes" ? 2 : /^Yes/.test(cs0) ? 1 : cs0 === "No" ? 0 : null, /All Gender/.test(t) ? 1 : t ? 0 : null, sv(c.status), sv(c.open) === "Future" ? 1 : 0, sv(c.additional_notes).trim().slice(0, 160), t.replace("Single -Stall", "Single-Stall")];
}
const packIds = () => Object.keys(DATA.d).filter((id) => DATA.d[id] && DATA.d[id].r10).sort();
const pkProj = (K) => { const kx = 111320 * Math.cos((K.o[1] * Math.PI) / 180), ky = 110574; return [kx, ky]; };
function ringDist(x, y, r) {
  let best = Infinity;
  for (let i = 0, n = r.length, j = n - 2; i < n; j = i, i += 2) {
    const ax = r[j], ay = r[j + 1], bx = r[i], by = r[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy;
    const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)), ex = ax + t * dx - x, ey = ay + t * dy - y, d = Math.sqrt(ex * ex + ey * ey);
    if (d < best) best = d;
  }
  return best;
}
// The district containing a point, or the nearest one and the metres to its boundary (pipeline: home()).
function homeOf(lon, lat) {
  let best = null, bd = Infinity;
  for (const id of Object.keys(DATA.d).sort()) {
    const K = DATA.d[id], rings = (K.cd || []).filter((r) => r.length > 5);
    if (!rings.length) continue;
    const [kx, ky] = pkProj(K), x = (lon - K.o[0]) * kx, y = (lat - K.o[1]) * ky;
    if (rings.some((r) => Geo.inRing(x, y, r))) return [id, 0];
    const d = Math.min(...rings.map((r) => ringDist(x, y, r)));
    if (d < bd) { bd = d; best = id; }
  }
  return [best, Math.round(bd)];
}
// Every pack's restrooms from a whole City list: rows inside the blocks' bounding box + 1,300 m, in list order.
function rrBuild(rows) {
  const city = rows.filter((c) => c.longitude !== "" && c.latitude !== "" && isFinite(+c.longitude) && isFinite(+c.latitude));
  const R = city.map((c, li) => [rrRow(c, li), +c.longitude, +c.latitude, rrAttr(c)]), out = {};
  packIds().forEach((id) => {
    const K = DATA.d[id], [kx, ky] = pkProj(K);
    let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
    K.blocks.forEach((bk) => bk.g.forEach((g) => { for (let i = 0; i < g.length; i += 2) { if (g[i] < a) a = g[i]; if (g[i] > c) c = g[i]; if (g[i + 1] < b) b = g[i + 1]; if (g[i + 1] > d) d = g[i + 1]; } }));
    const B = [a - 1300, b - 1300, c + 1300, d + 1300], rest = [], ra = [];
    R.forEach(([x, lon, lat, at]) => {
      const px = (lon - K.o[0]) * kx, py = (lat - K.o[1]) * ky;
      if (B[0] <= px && px <= B[2] && B[1] <= py && py <= B[3]) { rest.push({ ...x, x: Math.round(px), y: Math.round(py) }); ra.push(at); }
    });
    out[id] = { rest, ra };
  });
  return { packs: out, n: city.length, dropped: rows.length - city.length };
}
// The current list (as built into this file), one row per list row, for the change log.
function rrCurrent() {
  const by = new Map();
  packIds().forEach((id) => {
    const K = DATA.d[id], src = K._rn || K.rest, ra = LENS.d[id] && LENS.d[id].ra;
    if (K._rl && K._rl !== "nov" && !K._rn) return;
    src.forEach((r, i) => {
      if (r.li == null || by.has(r.li)) return;
      const [kx, ky] = pkProj(K), at = (ra && ra[i]) || [];
      by.set(r.li, { name: r.n, lon: K.o[0] + r.x / kx, lat: K.o[1] + r.y / ky, status: at[2] || "", open: r.op4 || "", access: r.ac5 ? AC5NAME[r.ac5] : "", hours: wsp(r.h), operator: r.op || "" });
    });
  });
  return [...by.values()];
}
const nmKey = (s) => wsp(s).toLowerCase();
function rrDiff(oldRows, rows) {
  const N = rows.map((c) => ({ name: sv(c.facility_name).trim(), lon: +c.longitude, lat: +c.latitude, status: sv(c.status), open: sv(c.open).trim(), access: sv(c.accessibility).trim(), hours: wsp(c.hours_of_operation), operator: sv(c.operator).trim() }));
  const by = {}, used = new Set(), log = [];
  N.forEach((r, j) => (by[nmKey(r.name)] = by[nmKey(r.name)] || []).push(j));
  oldRows.forEach((o) => {
    let best = null, bd = 50;
    (by[nmKey(o.name)] || []).forEach((j) => { if (used.has(j)) return; const d = Math.hypot((N[j].lon - o.lon) * 84300, (N[j].lat - o.lat) * 110574) + (N[j].status === o.status ? 0 : 20); if (d < bd) { bd = d; best = j; } });
    if (best == null) { const cand = (by[nmKey(o.name)] || []).filter((j) => !used.has(j)); best = cand.length === 1 ? cand[0] : null; }
    if (best == null) { log.push({ name: o.name, field: "row", was: "listed before", now: "not in the new list" }); return; }
    used.add(best); const n = N[best];
    [["status", "status"], ["open", "season (Open)"], ["access", "accessibility"], ["hours", "hours"], ["operator", "operator"]].forEach(([k, lab]) => { if (o[k] !== n[k]) log.push({ name: n.name, field: lab, was: o[k], now: n[k] }); });
  });
  N.forEach((n, j) => { if (!used.has(j)) log.push({ name: n.name, field: "row", was: "not in the list before", now: "new" }); });
  const k = (f) => log.filter((x) => x.field === f).length;
  return { log, chg: { vs: RL().nov.asOf, status: k("status"), season: k("season (Open)"), access: k("accessibility"), added: log.filter((x) => x.now === "new").length, dropped: log.filter((x) => x.now === "not in the new list").length } };
}
// Use a whole City list (from Open Data or a CSV file) as the "live" restroom list.
function rrUse(rows, src, asOf, quiet) {
  const col = rrColumns(rows);
  if (col.missing.length) throw new Error(`the list is missing column${col.missing.length > 1 ? "s" : ""} ${col.missing.join(", ")}. The map was not changed. If the City renamed a column, the update rules in pipeline/v5.js need the new name.`);
  const b = rrBuild(rows), d = rrDiff(rrCurrent(), rows);
  RLIVE = { asOf, src, rows, v: Date.now(), chg: d.chg, log: d.log, warn: col.missingOpt, n: b.n };
  packIds().forEach((id) => { DATA.d[id]._rv = b.packs[id].rest; DATA.d[id]._rva = b.packs[id].ra; });
  if (!quiet) {
    try { localStorage.setItem("flushing-v5-live", JSON.stringify({ asOf, src, rows })); } catch (e) {}
    setRList("live");
  } else rlistOptions();
  rrStatus();
  return b;
}
function rrStatus(msg, bad) {
  const el = $("rrStat"); if (!el) return;
  const c = RLIVE && RLIVE.chg;
  el.innerHTML = (msg ? `<span class="${bad ? "bad" : ""}">${esc(msg)}</span> ` : "") + (RLIVE ? `Latest pulled list: ${RLIVE.n.toLocaleString()} restrooms, ${dmy(RLIVE.asOf)}. Against the list built into this file (${dmy(RL().nov.asOf)}): ${c.status} changed status, ${c.season} season, ${c.access} accessibility; ${c.added} new, ${c.dropped} gone.${RLIVE.warn.length ? ` Columns not in this list: ${RLIVE.warn.join(", ")} (those fields read "not listed").` : ""}` : "");
  ["rrLog", "rrSave"].forEach((k) => $(k) && ($(k).hidden = !RLIVE));
}
async function rrPull() {
  rrStatus("Pulling the City's restroom list from NYC Open Data…");
  try {
    const r = await fetch("https://data.cityofnewyork.us/resource/i7jb-7jku.json?$limit=50000");
    if (!r.ok) throw new Error("NYC Open Data answered " + r.status);
    const rows = (await r.json()).map((o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [colKey(k), typeof v === "object" && v ? "" : sv(v)])));
    rrUse(rows, "NYC Open Data i7jb-7jku", new Date().toISOString().slice(0, 10));
  } catch (e) { rrStatus("Could not update: " + e.message, true); }
}
async function rrFile(f) {
  try {
    const t = await readText(f), m = /(\d{4})(\d{2})(\d{2})/.exec(f.name);
    rrUse(parseCSV(t), "file " + f.name, m ? `${m[1]}-${m[2]}-${m[3]}` : new Date().toISOString().slice(0, 10));
  } catch (e) { rrStatus("Could not read " + f.name + ": " + e.message, true); }
}
function rrRestore() {
  try { const j = JSON.parse(localStorage.getItem("flushing-v5-live") || "null"); if (j && j.rows) rrUse(j.rows, j.src, j.asOf, true); } catch (e) {}
  try { const k = localStorage.getItem("flushing-v5-rl"); if (k === "live" && RLIVE) RLIST = "live"; else if (k === "oct") RLIST = "oct"; } catch (e) {}
}
// A copy of this map with the pulled list built in as its current list: the same file, new data.
const putJSON = (src, id, obj) => {
  const tag = `<script type="application/json" id="${id}">`, a = src.indexOf(tag) + tag.length, b = src.indexOf("<" + "/script>", a);
  return src.slice(0, a) + JSON.stringify(obj, (k, v) => (k[0] === "_" ? undefined : v)).replace(/</g, "\\u003c") + src.slice(b);
};
function rrSaveMap() {
  if (!RLIVE) return;
  const d0 = JSON.parse($("data").textContent), l0 = JSON.parse($("lensdata").textContent);
  packIds().forEach((id) => { d0.d[id].rest = DATA.d[id]._rv; l0.d[id].ra = DATA.d[id]._rva; });
  d0.rlist = { ...d0.rlist, nov: { asOf: RLIVE.asOf, rows: RLIVE.n, src: RLIVE.src + ", pulled in the map" }, chg: RLIVE.chg };
  download(`NYC-Bathroom-Demand-Sandbox-v${MAPV}_restrooms-${RLIVE.asOf}.html`, putJSON(putJSON(SRC, "data", d0), "lensdata", l0), "text/html");
}
const MAPV = (/v([\d.]+\w*)/.exec(document.title) || [0, "5"])[1];

