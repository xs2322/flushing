/* ---------- controls ---------- */
// The eight FLUSHING letters, in order, in step 1's drawer. Land and Site check are set in step 2, so the drawer
// points there and step 2 carries their controls; Season and Cost view are plain switches, not letters.
function letRow(l, mode) {
  const k = l[4],
    fixed = k === "N" || k === "G" || k === "K";
  let opt = "",
    right = fixed ? `<span class="fix">always on</span>` : `<input type="checkbox" class="sw" id="sw${k}" aria-label="${l[1]}" ${(st.on[k] ?? true) ? "checked" : ""}>`;
  if (mode === "point") right = `<span class="fix">step 2</span>`;
  if (mode !== "point" && k === "L")
    opt = `<div class="opt">${SITE.map((x) => `<label><input type="radio" name="site" value="${x[0]}" ${x[0] === st.site ? "checked" : ""}><span>${x[1]}</span></label>`).join("")}<label><input type="checkbox" id="flood"><span>Leave out the flood plain</span></label></div>`;
  if (k === "S")
    opt = `<div class="opt"><label><input type="radio" name="sea" id="seaW" value="win" checked><span>Winter</span></label><label><input type="radio" name="sea" id="seaE" value="eve"><span>Evening, after 8pm</span></label></div>`;
  const badge = mode === "plain" ? `<div></div>` : `<div class="L" style="background:${l[5]}">${l[0]}</div>`;
  return `<div class="let${mode === "plain" ? " plain" : ""}" data-k="${k}">${badge}<div><div class="nm">${l[1]}<span class="tp">${l[3]}</span></div><div class="ds">${mode === "point" ? (k === "L" ? "Where a unit may stand: parks and plazas, public land, a wide sidewalk or a parking space. Never changes the tier. Set in step 2." : "A desk review of each pick against city siting steps. Shown in step 2 and on every pick.") : l[2]}</div></div>${right}${opt}</div>`;
}
$("letters").innerHTML = LET.slice(0, 8).map((l) => letRow(l, l[4] === "L" || l[4] === "K" ? "point" : "full")).join("");
$("landbox").innerHTML = LET.filter((l) => l[4] === "L" || l[4] === "K").map((l) => letRow(l, "full")).join("");
$("extrasw").innerHTML = LET.slice(8).map((l) => letRow(l, "plain")).join("");
function repick() {
  if (st.picks.length || st.skipped.length) pick();
  else render();
}
function changed() {
  ["F", "L", "U", "S", "H", "I", "C"].forEach(
    (k) => (st.on[k] = $("sw" + k).checked),
  );
  $("seaW").disabled = $("seaE").disabled = !st.on.S;
  st.flood = $("flood").checked;
  st.site = document.querySelector('input[name="site"]:checked').value;
  st.season = $("seaE").checked ? "eve" : "win";
  st.acc = $("acc").checked;
  st.water = $("water").checked;
  OPS.forEach((o, i) => {
    if (!$("op" + i).disabled) st.ops[o[0]] = $("op" + i).checked;
  });
  $("scen").value = st.on.S ? st.season : "peak";
  $("acc2").checked = st.acc;
  $("resOnly").checked = st.on.U === false;
  repick();
}
document
  .querySelectorAll("#letters input,#landbox input,#extrasw input,details.sec .row input,#acc,#water")
  .forEach((e) => e.addEventListener("input", changed));
// Step 2 holds the Land rule; the other letters stay in step 1's "What goes into the score" drawer.

// The one-minute story: five cards above the map, each with an action that moves the map. Closing it is remembered per browser.
const STORY = [
  ["The gap", "The City finds 20.1% of New Yorkers beyond a 10-minute walk of a public restroom (LL58 report, p. 8). Local Law 58 anticipates about 1,145 more restrooms by 2035 and names what should guide siting, but not how to weigh it.", null],
  ["Read one block", "Distance comes first (our rule). Then each factor sets a tier on its own and the highest one wins, as DOT staff described their Pedestrian Demand Map. 870 Riverside Drive is more than a 10-minute walk from a restroom and about 4 in 10 of its residents are older, very young or disabled, so it is tier 5.", ["Show me", () => storyBlock("112", "870 Riverside Drive")]],
  ["Where a unit can go", "Need never depends on land. Land only decides where a unit may stand. Each pick then gets a desk review: who owns the land, whether the sidewalk leaves 8 ft of clear path, the flood plain, the MTA, and who must approve.", ["Pick 3 sites here", () => { $("npick").value = 3; pick(); $("picks").scrollIntoView({ block: "nearest", behavior: "smooth" }); }]],
  ["Shortlists", "A citywide list of next sites, existing restrooms worth fixing first, and the Business Improvement Districts with the most need are on one page.", ["See the shortlists", () => { location.hash = "shortlists"; tab(); window.scrollTo(0, 0); }]],
  ["What it can't see", "Café and store restrooms, real walking routes, counted foot traffic and the exact spot on a block. The tier cutoffs are ours, so you can change them. Every site still needs a visit. Now explore: search an address, or click any block.", ["See the unknowns", () => { location.hash = "unknowns"; tab(); window.scrollTo(0, 0); }]],
];
let storyAt = 0;
function storyBlock(id, addr) {
  if (!DATA.d[id]) return;
  showDist(id);
  if (!D || D.id !== id) load(id);
  const i = D.blocks.findIndex((b) => place(b) === addr);
  if (i >= 0) {
    st.sel = i;
    st.selR = null;
    render();
    $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}
function storyDraw() {
  const s = STORY[storyAt];
  $("guide").innerHTML = `<div class="sgrid"><div class="sdots" aria-hidden="true">${STORY.map((_, k) => `<i class="${k === storyAt ? "on" : ""}"></i>`).join("")}</div><div><h3>${storyAt + 1}. ${s[0]}</h3><p>${s[1]}</p></div><div class="sbtns">${s[2] ? `<button class="btn act" id="sact">${s[2][0]}</button>` : ""}<button class="btn" id="sprev" ${storyAt ? "" : "disabled"}>Back</button>${storyAt < STORY.length - 1 ? `<button class="btn" id="snext">Next</button>` : `<button class="btn" id="sdone">Start exploring</button>`}<button class="btn link" id="gclose">Close</button></div></div>`;
  if (s[2]) $("sact").onclick = s[2][1];
  $("sprev").onclick = () => { storyAt--; storyDraw(); };
  if ($("snext")) $("snext").onclick = () => { storyAt++; storyDraw(); };
  if ($("sdone")) $("sdone").onclick = storyClose;
  $("gclose").onclick = storyClose;
}
function storyClose() {
  $("guide").hidden = true;
  $("sopen").hidden = false;
  try {
    localStorage.setItem("flushing-guide", "off");
  } catch (e) {}
}
$("sopen").onclick = () => {
  storyAt = 0;
  $("guide").hidden = false;
  $("sopen").hidden = true;
  storyDraw();
};
storyDraw();
try {
  if (localStorage.getItem("flushing-guide") === "off") {
    $("guide").hidden = true;
    $("sopen").hidden = false;
  }
} catch (e) {}
// The district sentence links to its best allowed block.
$("dsum").addEventListener("click", (e) => {
  const a = e.target.closest("a[data-sel]");
  if (!a) return;
  e.preventDefault();
  st.sel = +a.dataset.sel;
  st.selR = null;
  render();
  $("detail").scrollIntoView({ block: "nearest", behavior: "smooth" });
});
// Tier thresholds: a preset fills the table; editing a cell switches the preset to Custom.
function fillTh(k) {
  const t = TH_PRESETS[k];
  if (!t) return;
  [3, 4, 5].forEach((n, i) => ($("thsub" + n).value = isFinite(t.sub[i]) ? t.sub[i] / 1000 : ""));
  [2, 3, 4, 5].forEach((n, i) => {
    $("thvul" + n).value = t.vul[i];
    $("thpov" + n).value = t.pov[i];
    $("thc" + n).value = t.c311[i];
  });
}
$("thpreset").addEventListener("input", (e) => {
  fillTh(e.target.value);
  repick();
});
document.querySelectorAll(".thtab input").forEach((e) =>
  e.addEventListener("input", () => {
    $("thpreset").value = "custom";
    repick();
  }),
);
// Scenario switch on the map: peak (default), winter or evening, and accessible restrooms only.
$("scen").addEventListener("input", (e) => {
  const v = e.target.value;
  $("swS").checked = v !== "peak";
  if (v === "win") $("seaW").checked = true;
  if (v === "eve") $("seaE").checked = true;
  changed();
});
$("resOnly").addEventListener("input", (e) => {
  $("swU").checked = !e.target.checked;
  changed();
});
$("acc2").addEventListener("input", (e) => {
  $("acc").checked = e.target.checked;
  changed();
});
// Address search (NYC Planning Labs GeoSearch) and "Use my location": open the district and select the block.
function goLL(lon, lat, label) {
  for (const id of Object.keys(DATA.d)) {
    const K = prep(DATA.d[id]),
      x = (lon - K.o[0]) * K._kx,
      y = (lat - K.o[1]) * K._ky;
    if (!(K.cd || []).some((r) => Geo.inRing(x, y, r))) continue;
    showDist(id);
    if (D !== K) load(id);
    let bi = 0,
      bd = 1e12;
    K.blocks.forEach((b, i) => {
      const d = Math.hypot(b.c[0] - x, b.c[1] - y);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    st.sel = bi;
    st.selR = null;
    render();
    $("qmsg").textContent =
      `Showing ${label}: ${K.name.split(" · ")[0]}. The selected block is outlined; its card is below the map.`;
    return;
  }
  $("qmsg").textContent =
    `${label} is not in a loaded district. Build its community district under "Districts and your own data", then search again.`;
}
async function findPlace() {
  const q = $("q").value.trim();
  if (!q) return;
  $("qmsg").textContent = "Searching…";
  try {
    const r = await fetch(
        "https://geosearch.planninglabs.nyc/v2/search?size=1&text=" +
          encodeURIComponent(q),
      ),
      j = await r.json(),
      f = j.features && j.features[0];
    if (!f) {
      $("qmsg").textContent =
        "No match in New York City. Try a street address or a landmark.";
      return;
    }
    goLL(
      f.geometry.coordinates[0],
      f.geometry.coordinates[1],
      f.properties.label || q,
    );
  } catch (e) {
    $("qmsg").textContent =
      "Search needs internet. Pick a district from the list instead.";
  }
}
$("qgo").onclick = findPlace;
$("q").addEventListener("keydown", (e) => e.key === "Enter" && findPlace());
$("qme").onclick = () => {
  if (!navigator.geolocation) {
    $("qmsg").textContent = "This browser cannot share your location.";
    return;
  }
  $("qmsg").textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(
    (pos) => goLL(pos.coords.longitude, pos.coords.latitude, "your location"),
    () =>
      ($("qmsg").textContent =
        "Location was not shared. Search an address instead."),
    { timeout: 10000 },
  );
};
// The "How it works" menu closes once a page is chosen, or on a click elsewhere.
document
  .querySelectorAll("#more a")
  .forEach((a) => a.addEventListener("click", () => ($("more").open = false)));
document.addEventListener("click", (e) => {
  if (!$("more").contains(e.target)) $("more").open = false;
  if (!$("laydd").contains(e.target)) $("laydd").open = false;
});
[
  ["lyS", "S"],
  ["lyP", "P"],
  ["lyF", "F"],
].forEach(([id, k]) =>
  $(id).addEventListener("input", (e) => {
    st.lay[k] = e.target.checked;
    render();
  }),
);
// District lists: alphabetical by borough, then by district number; * marks a district with a Throne unit.
const THRONE_CD = new Set(THRONE.map((t) => t[3]));
const cdName = (k) =>
  DATA.d[k] ? DATA.d[k].name : (CDS.find((c) => c[0] === k) || [k, k])[1];
function cdOrder(a, b) {
  const pa = cdName(a).match(/^(.*?) CD (\d+)/),
    pb = cdName(b).match(/^(.*?) CD (\d+)/);
  if (pa && pb) return pa[1].localeCompare(pb[1]) || pa[2] - pb[2];
  return pa ? -1 : pb ? 1 : cdName(a).localeCompare(cdName(b));
}
const cdLabel = (k, opening) =>
  (THRONE_CD.has(k) ? "* " : "") +
  cdName(k) +
  (opening && !DATA.d[k] ? " (built on first open; needs internet)" : "");
function fillDistricts() {
  const shown = [...SHOWN]
    .filter((k) => DATA.d[k] || CDS.some((c) => c[0] === k))
    .sort(cdOrder);
  $("dist").innerHTML = shown
    .map((k) => `<option value="${esc(k)}">${esc(cdLabel(k, true))}</option>`)
    .join("");
  const rest = CDS.map((c) => c[0])
    .filter((k) => !SHOWN.has(k))
    .sort(cdOrder);
  $("cdpick").innerHTML = rest
    .map((k) => `<option value="${k}">${esc(cdLabel(k))}</option>`)
    .join("");
  $("bbuild").disabled = !rest.length;
}
$("dist").addEventListener("input", (e) => {
  const k = e.target.value;
  if (DATA.d[k]) return load(k);
  $("dist").value = D.id; // stays on the current district until the new one is built
  const c = CDS.find((x) => x[0] === k);
  if (c) build({ id: c[0], name: c[1], cd: c[0] });
});
$("vAccess").onclick = () => {
  st.view = "access";
  render();
};
$("vNeed").onclick = () => {
  st.view = "need";
  render();
};
$("pick").onclick = pick;
// The memo's 30 sites are on the Shortlists page.
$("clear").onclick = () => {
  st.picks = [];
  st.pickInfo = [];
  st.skipped = [];
  render();
};

let drag = null,
  moved = false;
const tip = $("tip");
function mapPoint(e) {
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const q = pt.matrixTransform(svg.getScreenCTM().inverse());
  return [q.x, -q.y];
}
svg.addEventListener("click", (e) => {
  if (moved) return;
  if (st.adding) {
    const q = mapPoint(e);
    D.user.push({
      n: "Added restroom " + (D.user.length + 1),
      x: Math.round(q[0]),
      y: Math.round(q[1]),
    });
    userKeys(D);
    keep(D);
    repick();
    return;
  }
  const d = e.target.dataset || {};
  if (d.r) {
    st.selR = d.r;
    st.sel = null;
    render();
    return;
  }
  if (d.i != null) {
    st.sel = +d.i;
    st.selR = null;
    render();
  }
});
svg.addEventListener("mousemove", (e) => {
  const i = e.target.dataset && e.target.dataset.i;
  if (i == null || drag) {
    tip.hidden = true;
    return;
  }
  const b = D.blocks[i],
    r = RES[i],
    bx = svg.parentNode.getBoundingClientRect();
  tip.hidden = false;
  tip.textContent = `${place(b)} · ${isFinite(r.walk) ? f1(r.walk) + " min walk" : "no restroom in reach"} · ${r.g ? "tier " + r.g : "served"}`;
  tip.style.left =
    Math.max(4, Math.min(e.clientX - bx.left + 14, bx.width - 265)) + "px";
  tip.style.top = e.clientY - bx.top + 14 + "px";
});
svg.addEventListener("mouseleave", () => (tip.hidden = true));
function zoom(f, cx, cy) {
  cx = cx == null ? vb[0] + vb[2] / 2 : cx;
  cy = cy == null ? vb[1] + vb[3] / 2 : cy;
  const w = Math.min(VB0[2] * 1.4, Math.max(VB0[2] / 12, vb[2] * f)),
    s = w / vb[2];
  vb = [cx - (cx - vb[0]) * s, cy - (cy - vb[1]) * s, w, (w * VB0[3]) / VB0[2]];
  setVB();
  markers();
  labels();
}
$("zin").onclick = () => zoom(0.6);
$("zout").onclick = () => zoom(1 / 0.6);
$("zfit").onclick = () => {
  vb = VB0.slice();
  setVB();
  markers();
  labels();
};
svg.addEventListener(
  "wheel",
  (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    e.preventDefault();
    const q = mapPoint(e);
    zoom(e.deltaY < 0 ? 0.8 : 1.25, q[0], -q[1]);
  },
  { passive: false },
);
svg.addEventListener("dblclick", (e) => {
  if (st.adding) return;
  const q = mapPoint(e);
  zoom(0.6, q[0], -q[1]);
});
svg.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY, vx: vb[0], vy: vb[1] };
  moved = false;
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const s = scale(),
    dx = e.clientX - drag.x,
    dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) moved = true;
  if (moved) {
    vb[0] = drag.vx - dx * s;
    vb[1] = drag.vy - dy * s;
    setVB();
  }
});
window.addEventListener("pointerup", () => {
  drag = null;
  setTimeout(() => (moved = false), 0);
});
let rz;
window.addEventListener("resize", () => {
  clearTimeout(rz);
  rz = setTimeout(() => {
    if (D && !$("tab-map").hidden) {
      fit();
      markers();
      labels();
    }
  }, 150);
});
const TABS = [
  "map",
  "list",
  "shortlists",
  "city",
  "numbers",
  "about",
  "method",
  "throne",
  "unknowns",
  "sources",
];
function tab() {
  const t = (location.hash || "#map").slice(1),
    ok = TABS.includes(t) ? t : "map";
  TABS.forEach((x) => {
    $("tab-" + x).hidden = x !== ok;
  });
  document
    .querySelectorAll("nav a")
    .forEach((a) => a.setAttribute("aria-current", a.dataset.tab === ok));
  $("more").classList.toggle(
    "cur",
    ["about", "method", "throne", "unknowns", "sources"].includes(ok),
  );
  if (ok === "method" && D) methodLive();
  if (ok === "throne" && D) throneLive();
  if (ok === "city" && D) cityLive();
  if (ok === "list" && D) listRender();
  if (ok === "numbers") $("v5num").innerHTML = cityCompareHtml();
  if (ok === "method" && D) $("v5fac").innerHTML = factorsHtml();
  if (ok === "shortlists") slRender();
  if (ok === "numbers") numsRender();
  if (ok === "map" && D) {
    if (!vb || $("mapbox").clientWidth !== fitW) fit(); // keep the view when coming back
    markers();
    labels();
  }
}
window.addEventListener("hashchange", tab);
document.querySelectorAll("a[data-tab]").forEach((a) =>
  a.addEventListener("click", (e) => {
    e.preventDefault();
    location.hash = a.dataset.tab;
    tab();
    window.scrollTo(0, 0);
  }),
);

