/* ---------- the arithmetic for one block, used on the map page and in the Method examples ---------- */
const place = (b) => b.ad || (b.lt === 1 && b.pl) || "Block " + b.id.slice(-4);
function label(b) {
  const tract = "tract " + +b.id.slice(5, 11) / 100;
  return b.ad || (b.lt === 1 && b.pl)
    ? `${place(b)} · block ${b.id.slice(-4)}, ${tract}`
    : `${place(b)}, ${tract}`;
}
function landText(b) {
  return (
    LAND[b.lt || 0] +
    (b.lt && b.pl ? ": " + esc(b.pl) : "") +
    (b.sw != null ? `. Widest sidewalk ${b.sw} ft` : "") +
    (b.fl ? ". In the flood plain" : "")
  );
}
function mathRows(K, b, r, p, o) {
  o = o || st;
  const win = o.on.S && o.season === "win",
    row = (k, on, txt, val, cls) =>
      `<tr class="${on ? "" : "offr"} ${cls || ""}"><td>${k}</td><td>${txt}</td><td>${val}</td></tr>`;
  const half = p.T / 2,
    wk = isFinite(r.walk) ? f1(r.walk) + " min" : "no restroom in reach";
  const blend =
    b.tp != null && b._w < 0.9
      ? `. <em>The tract has ${b.tp.toLocaleString()} residents, so its shares count ${pct(b._w)} and the city's ${pct(1 - b._w)}.</em>`
      : "";
  const nTxt = !isFinite(r.walk)
    ? `No counted restroom can be reached. Gap is 1`
    : r.cls === 0
      ? `${wk} walk is within easy reach (${mins(half)} min). Gap is 0`
      : r.cls === 2
        ? `${wk} walk is beyond the ${p.T}-minute standard. Gap is 1`
        : `${wk} walk: (${f1(r.walk)} − ${mins(half)}) ÷ ${mins(half)}`;
  const th = p.th,
    tierCell = (t) => (t ? "tier " + t : "off");
  const subTxt = r.sub
    ? `busiest station within ${SUB_M} m: ${Math.round(r.sub).toLocaleString()} entries a day${r.subT ? ` (tier ${r.subT})` : ""}`
    : "no subway station within " + SUB_M + " m";
  return `<table class="steps"><tbody>
 ${row("U", true, nTxt.replace(/Gap is [01]$/, "").replace(/: \(.*\)$/, "").replace(/[.\s]+$/, "") + (r.cls === 0 ? ": <b>Served</b>, not ranked" : r.cls === 1 ? ": <b>partly served</b>, final tier lowered by one" : ": <b>gap</b>, tier stands") + (r.wet ? `. <em>${r.wet} closer across water not counted.</em>` : ""), r.cls === 0 ? "served" : r.cls === 1 ? "−1" : "gap")}
 ${row("F", o.on.U, `Foot traffic: ${CLS[b.pd]} street in DOT's demand map (tier ${6 - b.pd}); ${subTxt}${win ? " (winter)" : ""}`, tierCell(r.T4[0]))}
 ${row("H", o.on.H, !r.hasH ? "No survey figures for this district" : b.pop < MIN_RES ? `Fewer than ${MIN_RES} residents, so resident factors do not count here` : `Vulnerable residents: ${pct(r.share)} aged 65+, under 5 or with a disability (tier 5 from ${pct(th.vul[3])})` + blend, tierCell(r.T4[1]))}
 ${row("H", o.on.H, b.di ? `A homeless drop-in centre within ${DROPIN_M} m in a straight line (about ${Math.round((DROPIN_M * (p.det || DETOUR)) / p.speed)} minutes on the walk rule): at least tier 4, whoever lives here` : `No homeless drop-in centre within ${DROPIN_M} m`, tierCell(r.T4[4]))}
 ${row("I", o.on.I, !r.hasI ? "No poverty figure" : b.pop < MIN_RES ? `Fewer than ${MIN_RES} residents` : `Poverty: ${pct(b._pv)} (tier 5 from ${pct(th.pov[3])})`, tierCell(r.T4[2]))}
 ${row("N", o.on.C ?? o.on.I, `311 public-urination complaints within 200 m: ${b.c3 || 0} a year (tier 5 from ${th.c311[3]})`, tierCell(r.T4[3]))}
 ${row("G", true, r.g ? `Highest single factor: tier ${r.top}${r.drv >= 0 ? `, set by ${DRV[r.drv]}${r.drv === 0 ? " (people passing, not people living here)" : r.drv >= 3 ? "" : " (people living here)"}${r.tie && r.tie.length > 1 ? `; tied with ${r.tie.filter((k) => k !== r.drv).map((k) => DRV[k]).join(" and ")}` : ""}` : ""}${r.cls === 1 ? "; lowered by one because a restroom is within the walk standard" : ""}` : "A restroom is within easy reach, so the block is not ranked", "<b>" + TIERNAME[r.g] + "</b>", "tot")}
 ${row("L", true, landText(b), r.ok ? "passes" : "fails")}
 ${row("$", true, r.cls === 0 ? "For contracts: no added visits, because a restroom is already within easy reach" : `For contracts: about ${f1(r.added)} visits a day (${(p.rate * 100).toFixed(1)}% of people on foot, up to ${p.cap}, times the share with no restroom nearby); ${r.cpu == null ? "no added visits" : `city's cost per added visit = $${p.cost.toLocaleString()} a year ÷ (${f1(r.added)} × 365 visits). Procurement's working range: $3–$6 a use`}`, r.cls === 0 ? "n/a" : usd(r.cpu))}
 ${o.on.S ? row("◐", true, win ? `Winter: seasonal restrooms closed; people on foot near the subway × ${b.wr} (the street's subway class stays)` : "Evening: only restrooms open to 8pm or later count", "") : ""}
 </tbody></table>`;
}

// One paragraph, in plain words, of why a block scored what it did.
function plainWhy(b, r, p) {
  // Short labelled lines (display: block spans, so this can sit inside a <p>). Stripped of tags it still reads as sentences.
  const L = (k, v) => `<span class="wr"><b>${k}:</b> ${v}</span>`, nm = r.nm ? esc(r.nm) + ", " : "";
  if (r.cls === 0) return L("Nearest restroom", `${nm}${f1(r.walk)} min. That is within easy reach, so this block is served and not ranked.`);
  const out = [];
  out.push(L("Nearest restroom", isFinite(r.walk)
    ? `${nm}${f1(r.walk)} min. ${r.cls === 2 ? `That is beyond the ${p.T}-minute standard.` : `That is inside the ${p.T}-minute standard, so the tier drops by one.`}`
    : "none within reach."));
  if (r.drv >= 0)
    out.push(L("Set by", `<b>${DRV[r.drv]}</b>. ` + [
      `A ${CLS[b.pd]} street in DOT's demand map${r.subT ? `, near a station with ${Math.round(r.sub).toLocaleString()} entries a day` : ""}.`,
      `${pct(r.share)} of residents are 65+, under 5 or have a disability.`,
      `${pct(b._pv)} of residents live in poverty.`,
      `${b.c3 || 0} public-urination complaints a year within 200 m.`,
      `A homeless drop-in centre is within ${DROPIN_M} m, so the block is at least tier 4 whoever lives here.`,
    ][r.drv] + (r.tie && r.tie.length > 1 ? ` Tied with ${r.tie.filter((k) => k !== r.drv).map((k) => DRV[k]).join(" and ")}.` : "")));
  out.push(L("Expected use", `about ${Math.round(r.added)} people a day with no restroom nearby. Used to plan contracts, not to rank.`));
  if (r.drv >= 0)
    out.push(L("So what", [
      "a unit here would mostly serve people passing through, so its contract should put cleaning first.",
      "a unit here would most help older, very young or disabled residents, so a changing table and a longer time limit matter most.",
      "a unit here would mostly serve low-income residents, so free entry without a smartphone and a paid steward matter most.",
      "complaints show the gap already causes harm here, so lighting and a paid steward matter most.",
      "a unit here would serve people without a home nearby, so an attended model with a paid steward matters most.",
    ][r.drv] + " Visit the site before building anything."));
  return out.join(" ");
}
// Desk review of one candidate site, modelled on DOT's siting steps: what the data can check, what needs a site visit,
// who must approve, and which kind of restroom fits. It never replaces a site visit.
function siteCheck(K, b, r) {
  const ok = [],
    visit = [
      "Sun on the solar panel; tree line and setbacks",
      "Curb uses that cannot move: bus stops (about 15 ft), bike share, hydrants",
      "Lighting at night",
    ];
  const lt = b.lt || 0;
  ok.push([
    1,
    lt === 1
      ? (b._park ? "Parkland: " : "Plaza: ") + esc(b.pl || "")
      : lt === 2
        ? "Other public land: " + esc(b.pl || "")
        : "Street: curb lane or sidewalk",
  ]);
  if (b.sw != null)
    ok.push([
      b.sw >= SIDEWALK_FT ? 1 : 0,
      `Widest sidewalk on the block ${b.sw} ft: ${b.sw >= SIDEWALK_FT ? "room for a unit and 8 ft of clear path" : "too narrow for a unit plus 8 ft of clear path"}`,
    ]);
  if (b.fl) ok.push([0, "In the flood plain"]);
  const LXk = typeof LENS === "object" && LENS.d[K.id];
  if (LXk && b._i != null && LXk.z) {
    const z = LXk.z[b._i];
    ok.push([1, "Zoning: " + ZTXT(z)]);
    if (LXk.hd && (LXk.hd[b._i] >= 0 || LXk.lm[b._i] > 0)) ok.push([0, LXk.hd[b._i] >= 0 ? "Historic district: " + esc(LXk.hdN[LXk.hd[b._i]]) + " (needs LPC review)" : "A landmark lot on this block (needs LPC review)"]);
    if (LXk.sp && LXk.sp[b._i] >= 0) ok.push([1, "Special purpose district " + esc(LXk.spN[LXk.sp[b._i]])]);
    if (LXk.fz && LXk.fz[b._i] > 0 && !b.fl) ok.push([0, LXk.fz[b._i] + "% of its lots are in a FEMA flood plain"]);
    if (lt === 0 && b.sw != null && b.sw >= SIDEWALK_FT && !(z & 2) && !(z & 4) && !(z & 8))
      ok.push([0, "An automatic toilet on a wide street needs commercial, manufacturing or mixed-use zoning (Street Design Manual); this block is residential only"]);
    const nt = nearText(b._i, K);
    if (nt !== "none listed") ok.push([1, "Public uses within 100 m: " + nt]);
  }
  if (b._mta)
    visit.unshift("Subway structures below grade (MTA station drawings)");
  const ap = ["DOT"];
  if (b._park) ap.push("Parks");
  if (b._mta) ap.push("MTA");
  const LXa = typeof LENS === "object" && LENS.d[K.id];
  if (LXa && LXa.hd && b._i != null && (LXa.hd[b._i] >= 0 || LXa.lm[b._i] > 0)) ap.push("Landmarks Preservation Commission");
  ap.push("Public Design Commission", "Community board");
  const type =
    lt === 1 && b._park
      ? "Parks restroom by concession, or a modular unit at the park edge"
      : lt === 1
        ? "Modular unit on the plaza"
        : lt === 2
          ? "Modular unit or automatic toilet on public land"
          : b.sw != null && b.sw >= SIDEWALK_FT
            ? "Modular unit or automatic toilet on the sidewalk"
            : "Modular unit in one curbside parking space";
  v5Site(K, b, r, ok, visit, ap);
  v5cSite(K, b, ok);
  return { ok, visit, ap, type };
}
// Restroom type as a coloured shape, matching the memo and slides (colour-blind safe: colour and shape both differ).
function typeIcon(t) {
  const k = /curbside/.test(t) ? "curb" : /plaza|concession/.test(t) ? "plaza" : /public land/.test(t) ? "pub" : "side",
    c = { curb: "#E69F00", plaza: "#009E73", pub: "#CC79A7", side: "#0072B2" }[k],
    s = { curb: '<path d="M7 1 13 7 7 13 1 7Z"/>', plaza: '<rect x="2" y="2" width="10" height="10"/>', pub: '<path d="M7 1.5 13 12.5H1Z"/>', side: '<circle cx="7" cy="7" r="5.5"/>' }[k];
  return `<svg class="ticon" viewBox="0 0 14 14" width="13" height="13" aria-hidden="true"><g fill="${c}" stroke="#fff" stroke-width="1">${s}</g></svg>`;
}
function siteHtml(K, b, r) {
  const c = siteCheck(K, b, r);
  return `<div class="sitecheck"><h4 class="sub">Site check (desk review)</h4><ul class="chk2">${c.ok.map((x) => `<li class="${x[0] ? "" : "no"}">${x[0] ? "✓" : "✕"} ${x[1]}</li>`).join("")}</ul>${c.visit.length ? `<h5 class="vish">Check on a site visit</h5><ul class="chk2">${c.visit.map((v) => `<li class="vis">○ ${v}</li>`).join("")}</ul>` : ""}<p class="small"><b>Who approves:</b> ${c.ap.join(" → ")}<br><b>Suggested unit:</b> ${[typeIcon(c.type), c.type].filter(Boolean).join(" ")}</p></div>`;
}
function detail() {
  const p = P();
  if (st.selR) {
    const r = allRest(D).find((x) => x._k === st.selR);
    if (r) {
      const c = isCounted(D, r),
        why = [];
      if (!r.ok) why.push("listed as not operational");
      if (st.ops[r.t] === false) why.push("its type is switched off");
      if (st.on.S && st.season === "win" && r.se)
        why.push("seasonal, closed in winter");
      if (st.on.S && st.season === "eve" && !r.ev) why.push("not open to 8pm");
      if (st.acc && r.ac !== 2 && r.t !== "User")
        why.push("not listed as fully accessible");
      if (D.off[r._k]) why.push("you stopped counting it");
      $("detail").innerHTML =
        `<h3>${esc(r.n)}</h3><div class="kv"><div><span>Type</span><b>${esc((OPS.find((o) => o[0] === r.t) || [0, r.t])[1])}</b></div><div><span>Operator</span><b>${esc(r.op || "–")}</b></div><div><span>Wheelchair access</span><b>${r.ac === 2 ? "Fully accessible" : r.ac === 1 ? "Partly accessible" : r.ac === 0 ? "Not accessible" : "Not stated"}</b></div><div><span>Listed hours</span><b>${esc(r.h || (r.t === "Throne" ? "7am to 10pm daily" : "Not stated"))}${r.se ? " · seasonal" : ""}</b></div>${r.rt || r.cs != null ? `<div><span>Restroom type</span><b>${esc(r.rt || "Not stated")}</b></div><div><span>Changing station</span><b>${r.cs === 2 ? "Yes" : r.cs === 1 ? "In some rooms" : r.cs === 0 ? "No" : "Not stated"}</b></div>` : ""}${r.st ? `<div><span>City list, 1 Oct 2026</span><b>${esc(r.st)}${r.fu ? " · planned" : ""}</b></div>` : ""}${r.nt ? (rrFee(r.nt) != null ? `<div><span>Fee per use</span><b>${rrFee(r.nt) ? `$${rrFee(r.nt).toFixed(2)}, paid by the visitor: income to the operator, not a cost to the city` : "Free to the visitor"}</b></div>` : `<div><span>Notes</span><b>${esc(r.nt)}</b></div>`) : ""}${r.src ? `<div><span>Filled from</span><b>${esc(Object.entries(r.src).map(([k, v]) => (k === "ac" ? "Wheelchair access: " : "Hours: ") + v).join("; "))}</b></div>` : ""}<div><span>Counted now</span><b>${c ? "Yes" : "No: " + why.join("; ")}</b></div></div>
   <button class="btn" id="rtog">${r.t === "User" ? "Remove this restroom" : D.off[r._k] ? "Count it again" : "Stop counting this restroom"}</button>`;
      $("rtog").onclick = () => {
        if (r.t === "User") {
          D.user = D.user.filter((u) => u !== r);
          userKeys(D);
          st.selR = null;
        } else if (D.off[r._k]) delete D.off[r._k];
        else D.off[r._k] = 1;
        keep(D);
        repick();
      };
      return;
    }
  }
  if (st.sel == null) return;
  const b = D.blocks[st.sel],
    r = RES[st.sel];
  $("detail").innerHTML = `<h3>${esc(label(b))}</h3>
 <h4 class="sub">What this means</h4>
 <p class="plain"><span class="gpill" style="background:var(--g${r.g});color:${r.g >= 4 ? "#fff" : "var(--ink)"}">${TIERNAME[r.g]}${r.g ? " of 5" : ""}</span> ${plainWhy(b, r, p)}</p>
 <div class="kv"><div><span>Walk to nearest counted restroom</span><b>${isFinite(r.walk) ? f1(r.walk) + " min" : "None in reach"}</b></div><div><span>Residents</span><b>${b.pop.toLocaleString()}</b></div><div><span>Deciding factor</span><b>${r.g && r.drv >= 0 ? DRV[r.drv] : r.g === 0 ? "None: already served" : "–"}</b></div></div>
 ${r.g ? siteHtml(D, b, r) : ""}
 <details class="math"><summary>Show the math</summary>${mathRows(D, b, r, p)}</details>
 ${areaNeedHtml(st.sel)}${contactsHtml(st.sel)}`;
}

function listPicks() {
  const box = $("picks");
  if (!st.picks.length && !st.skipped.length) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML =
    `<h3>Suggested sites, in order</h3><p class="small" style="margin:0 0 8px">Each one is placed, counted as open, and the map rescored before the next.</p>` +
    (st.picks.length
      ? `<ol class="pl">` +
        st.picks
          .map((i, n) => {
            const b = D.blocks[i],
              x = st.pickInfo[n];
            return `<li><b>${esc(label(b))}</b><br><span class="small">${TIERNAME[x.g]} of 5${x.drv >= 0 ? ", set by " + DRV[x.drv] : ""} · ${typeIcon(siteCheck(D, b).type)} ${esc(siteCheck(D, b).type)} · about ${Math.round(x.added)} visits a day${x.moved ? ` · moved ${x.moved} m from ${esc(place(D.blocks[x.from]))}, where a unit is not allowed` : ""}</span><details class="math"><summary>Site check</summary>${siteHtml(D, b)}</details></li>`;
          })
          .join("") +
        `</ol>`
      : `<p class="small">No eligible block (${siteName()}) has unmet need under these settings.</p>`) +
    (st.skipped.length
      ? `<p class="small" style="margin:10px 0 0"><b>Need with no eligible land nearby:</b> ${st.skipped.map((s) => esc(place(D.blocks[s.i])) + " (tier " + Math.floor(s.need / 1e7) + ")").join(", ")}. No block within ${SNAP} m passes the Land rule. Widen the land choice in step 2 to place these.</p>`
      : "");
}

