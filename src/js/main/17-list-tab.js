/* ---------- List: every restroom, like a directory ---------- */
const LST = { scope: "district", q: "", type: "", cnt: "", stat: "", sort: "name", dir: 1 };
let LSTROWS = [];
// The district that contains a restroom (r.cd from the build). A restroom in no community district (mostly large
// parks such as Central Park, Van Cortlandt Park and Flushing Meadows) is labelled with the nearest one.
const rrHomeName = (K, r, inside) => {
  const c = r.cd, d = c && DATA.d[c[0]];
  if (d) return c[1] ? `In no district (next to ${d.name.split(" · ")[0]})` : d.name.split(" · ")[0];
  return inside ? K.name.split(" · ")[0] : "Outside " + K.name.split(" · ")[0];
};
const rrSrcTxt = (r, k) => (r.src && r.src[k] ? " · from " + r.src[k] : "");
// A coin-operated unit's fee as the city's list states it ("This unit costs $.25 to use"): paid by the visitor and
// collected by the operator. It is not the city's cost, which is the yearly contract divided by visits.
const rrFee = (nt) => { const m = /costs?\s*\$\s*(\d*\.\d+|\d+)/i.exec(nt || ""); return m ? +m[1] : /free to use/i.test(nt || "") ? 0 : null; };
function listRows() {
  // Each district pack also carries restrooms just across its line, so one restroom can appear in two or three packs,
  // with coordinates that differ in the fifth decimal. Keep one copy per name within about 100 m, and label it with the
  // district whose boundary actually contains it.
  const ids = LST.scope === "all" ? DATA.order : [D.id], seen = new Map(), byName = {};
  ids.forEach((id) => {
    const K = prep(DATA.d[id]);
    allRest(K).forEach((r) => {
      if (r.t === "User") return;
      const ll = toLL(K, r.x, r.y), inside = inDist(K, r);
      const twins = (byName[r.n] = byName[r.n] || []);
      let key = r.li != null ? null : twins.find((t) => t[3] === !!r.ok && Math.hypot((t[1] - ll[0]) * 84000, (t[2] - ll[1]) * 111000) < 60);
      key = r.li != null ? "L" + r.li : key ? key[0] : (twins.push([r.n + "|" + twins.length, ll[0], ll[1], !!r.ok]), r.n + "|" + (twins.length - 1));
      const old = seen.get(key);
      if (old && (old.inside || !inside)) return;
      const hi = hoursInfo(r.h);
      seen.set(key, { inside, id, k: r._k, ll, name: r.n, dist: rrHomeName(K, r, inside), src: r.src || {}, fee: rrFee(r.nt), type: (OPS.find((o) => o[0] === r.t) || [0, r.t])[1], op: r.op || "", status: r.li != null ? r.st || "Not listed" : r.t === "Throne" ? "Operational" : statusTxt(r), out: ["out", "planned"].includes(condOf(K, r, st)) ? 1 : 0, hours: r.t === "Throne" && r.li == null ? "7 am–10 pm daily" : hi.txt + rrSrcTxt(r, "h"), readable: (r.t === "Throne" && r.li == null) || hi.ok, acc: (r.ac5 ? AC5NAME[r.ac5] : r.li != null ? (r.ac === 2 ? "Fully Accessible" : r.ac === 1 ? "Partially Accessible" : r.ac === 0 ? "Not Accessible" : "Not listed") : r.ac === 2 ? "Yes" : r.ac === 1 ? "Partly" : r.ac === 0 ? "No" : "Not listed") + rrSrcTxt(r, "ac"), acn: r.ac, cs: r.cs === 2 ? "Yes" : r.cs === 1 ? "Some rooms" : r.cs === 0 ? "No" : "–", ag: r.ag ? "Yes" : r.ag === 0 ? "No" : "–", late: r.ev ? "Yes" : "No", season: r.li != null ? r.op4 || "Not listed" : r.se ? "Seasonal" : "–", mf: r.mf === 1 ? "Yes" : r.mf === 0 ? "No" : r.li != null ? "Not listed" : "–", li: r.li, cdh: r.cd ? r.cd[0] : "", maint: /concession/i.test(r.op || "") ? "Concessionaire (" + (r.op || "") + ")" : r.op || "", counted: isCounted(K, r) ? "Yes" : "No" });
    });
  });
  return [...seen.values()];
}
function listRender() {
  if (!D) return;
  const box = $("listBox");
  LSTROWS = listRows();
  const q = LST.q.toLowerCase();
  let rows = LSTROWS.filter((r) => (!q || (r.name + " " + r.op + " " + r.dist).toLowerCase().includes(q)) && (!LST.type || r.type === LST.type) && (!LST.cnt || r.counted === LST.cnt) && (!LST.stat || (LST.stat === "out" ? r.out : !r.out)) && (!LST.ax || (LST.ax === "full" ? r.acn === 2 : r.acn >= 1)));
  const k = LST.sort;
  rows.sort((a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * LST.dir);
  const types = [...new Set(LSTROWS.map((r) => r.type))].sort();
  const C = [["name", "Restroom"], ["dist", "District"], ["type", "Type"], ["op", "Operator"], ["status", "Status"], ["season", "Open (season)"], ["hours", "Hours"], ["acc", "Accessibility"], ["cs", "Changing station"], ["ag", "All-gender"], ["mf", "Menstrual friendly"], ["late", "Open to 8 pm"], ["counted", "Counts on the map"]];
  $("listCtl").innerHTML = `<div class="lctl"><div class="seg" role="group" aria-label="Scope"><button id="lsD" aria-pressed="${LST.scope === "district"}">${esc(D.name.split(" · ")[0])} and nearby</button><button id="lsA" aria-pressed="${LST.scope === "all"}">All districts</button></div>
  <input id="lsQ" type="search" placeholder="Search a name, operator or district" value="${esc(LST.q)}" style="min-width:240px">
  <select id="lsT"><option value="">All types</option>${types.map((t) => `<option ${t === LST.type ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>
  <select id="lsC"><option value="">Counted or not</option><option value="Yes" ${LST.cnt === "Yes" ? "selected" : ""}>Counts on the map</option><option value="No" ${LST.cnt === "No" ? "selected" : ""}>Does not count</option></select>
  <select id="lsS"><option value="">Any status</option><option value="out" ${LST.stat === "out" ? "selected" : ""}>Closed, out of service or planned</option><option value="in" ${LST.stat === "in" ? "selected" : ""}>In service</option></select>
  <select id="lsX"><option value="">Any accessibility</option><option value="full" ${LST.ax === "full" ? "selected" : ""}>Accessible: fully only</option><option value="pl" ${LST.ax === "pl" ? "selected" : ""}>Accessible: fully, partially or limited</option></select>
  <span class="sortctl"><label for="lsSo">Sort by</label><select id="lsSo">${C.map(([c, t]) => `<option value="${c}" ${LST.sort === c ? "selected" : ""}>${t}</option>`).join("")}</select><button class="btn" id="lsDir" aria-label="Sort direction">${LST.dir > 0 ? "A → Z" : "Z → A"}</button></span>
  <button class="btn" id="lsCsv">Save list (CSV)</button></div>
  <p class="small">${rows.length.toLocaleString()} restrooms shown. ${LST.scope === "all" ? `In all: ${LSTROWS.filter((r) => RLIST === "nov" ? r.li != null : !/Throne|Subway/.test(r.type)).length.toLocaleString()} from the city's Public Restrooms list${RLIST === "nov" ? " (Throne units included)" : ""}, ${LSTROWS.filter((r) => /Subway/.test(r.type)).length} MTA subway station restrooms (${LSTROWS.filter((r) => /Subway/.test(r.type) && !r.out).length} open to the public)${RLIST === "oct" ? ` and ${LSTROWS.filter((r) => /Throne/.test(r.type)).length} Throne units` : ""}; ` : ""}${LSTROWS.filter((r) => r.out).length} closed, out of service or planned. ${LSTROWS.filter((r) => r.hours === "Not listed").length} have no hours listed; ${LSTROWS.filter((r) => !r.readable && r.hours !== "Not listed").length} list hours the tool cannot read (such as "dusk"), shown as written. ${rlistSummary()}Click a name to see it on the map.</p>`;
  box.innerHTML = `<div class="tw"><table class="mlist ltab"><thead><tr>${C.map(([c, t]) => `<th><button class="sortb" data-sort="${c}">${t}<span class="so${LST.sort === c ? " on" : ""}">${LST.sort === c ? (LST.dir > 0 ? "A→Z" : "Z→A") : "⇅"}</span></button></th>`).join("")}</tr></thead><tbody>${rows.slice(0, 1500).map((r) => `<tr><td><a href="#" data-go="${r.id}|${r.k}">${esc(r.name)}</a></td><td>${esc(r.dist)}</td><td>${esc(r.type)}</td><td>${esc(r.op)}</td><td>${esc(r.status)}</td><td>${esc(r.season)}</td><td class="small">${esc(r.hours)}</td><td>${r.acc}</td><td>${r.cs}</td><td>${r.ag}</td><td>${r.mf}</td><td>${r.late}</td><td>${r.counted}</td></tr>`).join("")}</tbody></table></div>`;
  $("lsD").onclick = () => { LST.scope = "district"; listRender(); };
  $("lsA").onclick = () => { LST.scope = "all"; $("listBox").innerHTML = `<p class="small">Loading every district…</p>`; setTimeout(listRender, 20); };
  $("lsQ").oninput = (e) => { LST.q = e.target.value; clearTimeout(LST.t); LST.t = setTimeout(() => { listRender(); const i = $("lsQ"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
  $("lsT").onchange = (e) => { LST.type = e.target.value; listRender(); };
  $("lsC").onchange = (e) => { LST.cnt = e.target.value; listRender(); };
  $("lsS").onchange = (e) => { LST.stat = e.target.value; listRender(); };
  $("lsX").onchange = (e) => { LST.ax = e.target.value; listRender(); };
  $("lsSo").onchange = (e) => { LST.sort = e.target.value; listRender(); };
  $("lsDir").onclick = () => { LST.dir *= -1; listRender(); };
  $("lsCsv").onclick = () => download("bathroom-sandbox-restrooms.csv", csvOf(rows.map((r) => ({ restroom: r.name, district: r.dist, type: r.type, operator: r.op, status: r.status, hours: r.hours, wheelchair: r.acc.split(" · ")[0], wheelchair_source: r.src.ac || (r.acc === "Not listed" ? "" : "City Public Restrooms list"), hours_source: r.src.h || "", fee_per_use_paid_by_visitor: r.fee == null ? "" : r.fee.toFixed(2), changing_station: r.cs, all_gender: r.ag, open_season: r.season, menstrual_friendly: r.mf, list_row: r.li == null ? "" : r.li + 2, site_id: r.li == null ? "" : "PR-" + r.cdh + "-" + (r.li + 1), maintenance_entity: r.maint, planned_opening: "", open_to_8pm: r.late, counts_on_map: r.counted, lon: r.ll[0], lat: r.ll[1] }))), "text/csv");
  box.querySelectorAll("button[data-sort]").forEach((b) => (b.onclick = () => { if (LST.sort === b.dataset.sort) LST.dir *= -1; else { LST.sort = b.dataset.sort; LST.dir = 1; } listRender(); }));
  box.querySelectorAll("a[data-go]").forEach((a) => (a.onclick = (e) => {
    e.preventDefault();
    const [id, k] = a.dataset.go.split("|");
    location.hash = "map"; tab();
    showDist(id); if (!D || D.id !== id) load(id);
    const r = allRest(D).find((x) => x._k === k);
    st.selR = k; st.sel = null;
    if (r) { vb = [r.x - VB0[2] / 6, -r.y - VB0[3] / 6, VB0[2] / 3, VB0[3] / 3]; setVB(); }
    render(); window.scrollTo(0, 0);
  }));
}

