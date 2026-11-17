/* ================= v5c: City property and restaurants (informal restrooms), loaded live from NYC Open Data =================
   Both layers are flags and lenses only: tiers never change. They load for the district on screen, in the browser,
   so they are current when loaded; nothing is stored in the file. */
const V5C = { cp: {}, fd: {} }; // per district: City property rows, food establishments
const OD5 = "https://data.cityofnewyork.us/resource/";
const llBox = (K) => { const a = toLL(K, K._B[0] - 200, K._B[1] - 200), b = toLL(K, K._B[2] + 200, K._B[3] + 200); return { w: a[0], s: a[1], e: b[0], n: b[1] }; };
function blockAt(K, x, y) {
  for (let i = 0; i < K.blocks.length; i++) { const b = K.blocks[i]; if (Math.abs(b.c[0] - x) < 400 && Math.abs(b.c[1] - y) < 400 && Geo.inRings(x, y, b.g)) return i; }
  let best = -1, bd = 60; K.blocks.forEach((b, i) => { const d = Math.hypot(b.c[0] - x, b.c[1] - y); if (d < bd) { bd = d; best = i; } }); return best;
}
const CPCLS = (r) => /NO USE|VACANT/i.test(r.use_type + " " + r.excatdesc) ? "vacant" : /OFFICE|HEALTH|SOCIAL|EDUCATION|LIBRAR|COURT/i.test(r.excatdesc + " " + r.use_type) ? "building" : /CULTURAL|RECREATION|PARK|PLAYGROUND/i.test(r.excatdesc + " " + r.use_type) ? "park" : "other";
const CPNAME = { vacant: "Vacant or no use", building: "Office or public building", park: "Park or recreation", other: "Other City use" };
const CPCOL = { vacant: "#1a73e0", building: "#7a3fb0", park: "#2f7d4f", other: "#6b7682" };
async function cpLoad(K) {
  const id = K.id; $("v5cStat") && ($("v5cStat").textContent = "Loading City property from NYC Open Data…");
  try {
    const q = `$select=bbl,address,parcel_name,agency,use_type,excatdesc,latitude,longitude&$where=${encodeURIComponent(`cd='${id}' AND latitude IS NOT NULL`)}&$limit=10000`;
    const rows = await fetch(OD5 + "fn4k-qyk2.json?" + q).then((r) => { if (!r.ok) throw new Error("NYC Open Data answered " + r.status); return r.json(); });
    V5C.cp[id] = { asOf: new Date().toISOString().slice(0, 10), rows: rows.map((r) => { const [x, y] = toXY(K, +r.longitude, +r.latitude); return { ...r, x, y, cls: CPCLS(r), bi: blockAt(K, x, y) }; }) };
  } catch (e) { V5C.cp[id] = { err: e.message }; }
  render();
}
async function fdLoad(K) {
  const id = K.id, bx = llBox(K); $("v5cStat") && ($("v5cStat").textContent = "Loading food establishments from NYC Open Data…");
  try {
    const q = `$select=camis,dba,cuisine_description,latitude,longitude&$group=camis,dba,cuisine_description,latitude,longitude&$where=${encodeURIComponent(`within_box(location, ${bx.n}, ${bx.w}, ${bx.s}, ${bx.e})`)}&$limit=50000`;
    const rows = await fetch(OD5 + "43nn-pn8j.json?" + q).then((r) => { if (!r.ok) throw new Error("NYC Open Data answered " + r.status); return r.json(); });
    const seen = new Set();
    V5C.fd[id] = { asOf: new Date().toISOString().slice(0, 10), rows: rows.filter((r) => r.latitude && +r.latitude && !seen.has(r.camis) && seen.add(r.camis)).map((r) => { const [x, y] = toXY(K, +r.longitude, +r.latitude); return { n: r.dba, c: r.cuisine_description, x, y }; }) };
  } catch (e) { V5C.fd[id] = { err: e.message }; }
  render();
}
// Food establishments within 100 m of each block, and residents beyond the walk if they all counted (a sensitivity, never a tier).
function fdPrep(K, p) {
  const F = (V5C.fd[K.id] || {}).rows; if (!F) return null;
  const near = K.blocks.map((b) => F.filter((f) => Math.abs(f.x - b.c[0]) < 100 && Math.abs(f.y - b.c[1]) < 100 && Math.hypot(f.x - b.c[0], f.y - b.c[1]) <= 100).length);
  const R = counted(K, st, []), R2 = R.concat(F.map((f, i) => ({ x: f.x, y: f.y, n: f.n, _k: "fd" + i })));
  let now = 0, ifc = 0, gapNone = 0, gapSome = 0;
  K.blocks.forEach((b, i) => { const r = RES[i], w2 = calc(K, b, R2, p, st).walk; if (!(r.walk <= p.T)) now += b.pop; if (!(w2 <= p.T)) ifc += b.pop; if (r.g >= 4 && r.cls === 2) { if (near[i]) gapSome++; else gapNone++; } });
  return { near, now, ifc, gapNone, gapSome, n: F.length };
}
function panelCity(box, X, p) {
  const C = V5C.cp[D.id], btn = `<div class="btnrow"><button class="btn pri" id="cpLoadB">${C ? "Reload" : "Load"} City property for ${esc(D.name.split(" · ")[0])} from NYC Open Data</button></div><p class="small" id="v5cStat"></p>`;
  if (!C || C.err) { box.innerHTML = `<h3>City property · ${esc(D.name.split(" · ")[0])}</h3><p>City-owned and leased property (COLP, Department of City Planning): vacant City lots, offices and public buildings, parks. The City's report notes that DCAS manages 17 public buildings whose bathrooms are not yet open to everyone, the nearest conversion opportunity (p. 17). Loads from NYC Open Data; needs an internet connection.</p>${btn}${C && C.err ? `<p class="small" style="color:var(--no)">Could not load: ${esc(C.err)}</p>` : ""}`; $("cpLoadB").onclick = () => cpLoad(D); return; }
  const cnt = {}; C.rows.forEach((r) => (cnt[r.cls] = (cnt[r.cls] || 0) + 1));
  const hi = C.rows.filter((r) => r.bi >= 0 && RES[r.bi] && RES[r.bi].g >= 4 && RES[r.bi].cls === 2 && r.cls !== "park").sort((a, b) => RES[b.bi].g - RES[a.bi].g || (a.cls === "vacant" ? -1 : 1));
  const zola = (bbl) => { const s = String(bbl || "").replace(/\.0+$/, ""); return s.length === 10 ? `https://zola.planning.nyc.gov/l/lot/${s[0]}/${+s.slice(1, 6)}/${+s.slice(6)}` : ""; };
  box.innerHTML = `<h3>City property · ${esc(D.name.split(" · ")[0])}</h3>
<div class="stat">${Object.entries(CPNAME).map(([k, v]) => `<div><b>${cnt[k] || 0}</b><span><i class="chip" style="background:${CPCOL[k]}"></i>${v}</span></div>`).join("")}<div><b>${hi.length}</b><span>City properties (not parks) on tier 4–5 blocks beyond the walk</span></div></div>
<p class="small">City-owned and leased property (COLP), loaded ${dmy(C.asOf)}. City land can take a restroom without buying land, but it still needs the owning agency, and DCAS for any transfer; a new City facility may need a site-selection review (to confirm with DCP and DCAS). Flags only: tiers do not change.</p>
${hi.length ? `<div class="tw"><table class="mlist"><thead><tr><th>Property</th><th>Agency</th><th>Use</th><th>Block tier</th><th>Lot</th></tr></thead><tbody>${hi.slice(0, 40).map((r) => `<tr><td>${esc(r.parcel_name || r.address || "")}${r.parcel_name && r.address ? "<br><span class='small'>" + esc(r.address) + "</span>" : ""}</td><td>${esc(r.agency)}</td><td>${esc(CPNAME[r.cls])}: ${esc((r.use_type || "").toLowerCase())}</td><td>${RES[r.bi].g}${RES[r.bi].drv >= 0 ? " (" + esc(DRV[RES[r.bi].drv]) + ")" : ""}</td><td>${zola(r.bbl) ? `<a href="${zola(r.bbl)}">ZoLa</a>` : "–"}</td></tr>`).join("")}</tbody></table></div>` : "<p>No City property outside parks on tier 4–5 gap blocks here.</p>"}
<div class="btnrow"><button class="btn" id="cpCsv">Save City property (CSV)</button></div>${btn}`;
  $("cpLoadB").onclick = () => cpLoad(D);
  $("cpCsv").onclick = () => download("city_property_" + D.id + ".csv", csvOf(C.rows.map((r) => ({ bbl: String(r.bbl || "").replace(/\.0+$/, ""), property: r.parcel_name || "", address: r.address || "", agency: r.agency, use_type: r.use_type, category: r.excatdesc, class: CPNAME[r.cls], block: r.bi >= 0 ? place(D.blocks[r.bi]) : "", block_tier: r.bi >= 0 ? RES[r.bi].g : "", beyond_walk: r.bi >= 0 && RES[r.bi].cls === 2 ? "yes" : "no", lat: r.latitude, lon: r.longitude }))), "text/csv");
}
function panelFood(box, X, p) {
  const F = V5C.fd[D.id], btn = `<div class="btnrow"><button class="btn pri" id="fdLoadB">${F ? "Reload" : "Load"} food establishments for ${esc(D.name.split(" · ")[0])} from NYC Open Data</button></div><p class="small" id="v5cStat"></p>`;
  const intro = `<p>Restaurants and other food establishments, from the Health Department's inspection results. Many must offer customers a toilet under the Plumbing Code, so they are an <b>informal</b> supply. They are not public restrooms under Local Law 58 and never change a tier; this lens shows where they fill gaps and where nothing does.</p>`;
  if (!F || F.err) { box.innerHTML = `<h3>Restaurants (informal restrooms) · ${esc(D.name.split(" · ")[0])}</h3>${intro}${btn}${F && F.err ? `<p class="small" style="color:var(--no)">Could not load: ${esc(F.err)}</p>` : ""}`; $("fdLoadB").onclick = () => fdLoad(D); return; }
  const z = LR.fd || fdPrep(D, p);
  box.innerHTML = `<h3>Restaurants (informal restrooms) · ${esc(D.name.split(" · ")[0])}</h3>
<div class="stat"><div><b>${z.n.toLocaleString()}</b><span>food establishments in and near the district</span></div><div><b>${z.gapNone}</b><span>tier 4–5 gap blocks with no food establishment within 100 m: no informal option either</span></div><div><b>${z.gapSome}</b><span>tier 4–5 gap blocks with one within 100 m</span></div><div><b>${n0(z.now)} → ${n0(z.ifc)}</b><span>residents beyond ${p.T} minutes now, and if every food establishment's restroom were open to all (a sensitivity, not a tier)</span></div></div>
${intro}<p class="small">Loaded ${dmy(F.asOf)}. Shaded: tier 4–5 gap blocks with no food establishment within 100 m (darkest need, no informal fallback).</p>${btn}`;
  $("fdLoadB").onclick = () => fdLoad(D);
}
function v5cOverlay(k) {
  if (ls.id === "cityprop") ((V5C.cp[D.id] || {}).rows || []).forEach((r) => { const R = 5 * k; gX.appendChild(el("rect", { x: r.x - R, y: -r.y - R, width: 2 * R, height: 2 * R, fill: CPCOL[r.cls], stroke: "var(--panel)", "stroke-width": 1.2 * k })); });
  if (ls.id === "food") ((V5C.fd[D.id] || {}).rows || []).forEach((f) => gX.appendChild(el("circle", { cx: f.x, cy: -f.y, r: 2.6 * k, fill: "#b0466e", "fill-opacity": 0.75 })));
}
function v5cSite(K, b, ok) {
  const C = V5C.cp[K.id]; if (C && C.rows && b._i != null) C.rows.filter((r) => r.bi === b._i && r.cls !== "park").slice(0, 2).forEach((r) => ok.push([1, `City property on this block: ${esc(r.parcel_name || r.address || "")} (${esc(r.agency)}, ${esc((r.use_type || "").toLowerCase())}): owning agency and DCAS to approve`]));
  const F = V5C.fd[K.id]; if (F && F.rows && LR.fd && b._i != null) ok.push([1, `Food establishments within 100 m: ${LR.fd.near[b._i]} (informal restrooms; not counted)`]);
}


