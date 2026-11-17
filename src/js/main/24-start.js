/* ---------- start ---------- */
layoutV42();
$("seaW").disabled = $("seaE").disabled = true;
fillDistricts();
tab();
$("dist").value = DATA.d["101"] ? "101" : DATA.order[0]; // Manhattan CD 1: City Hall
dispWire();
rrRestore();
load($("dist").value);
try {
  const sv = localStorage.getItem("flushing-lens");
  if (sv && LENSES.some((x) => x.id === sv)) ls.id = sv;
} catch (e) {}
lensBar();
$("rlist").onchange = (e) => setRList(e.target.value);
rlistOptions();
$("rlistNote").innerHTML = rlistNote();
$("rrPull").onclick = rrPull;
$("rrFile").onchange = (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) rrFile(f); };
$("rrLog").onclick = () => RLIVE && download("restroom_changes_" + RL().nov.asOf + "_to_" + RLIVE.asOf + ".csv", csvOf(RLIVE.log), "text/csv");
$("rrSave").onclick = rrSaveMap;
$("feedsRun").onclick = feedsCheck;
rrStatus();
feedsRender();
v5Lists();
$("mobPre").onclick = mobilityPreset;
render();
$("sensRun").onclick = sensRun;
$("slNextB").onclick = () => slRun("Next");
$("slFixB").onclick = () => slRun("Fix");
$("slOutB").onclick = () => slRun("Out");
$("slBidB").onclick = () => slRun("Bid");
DB.tx("readonly", (s) => s.getAll())
  .then((list) => {
    let cur = false;
    (list || []).forEach((t) => {
      try {
        const K = JSON.parse(t);
        if (!K || !(K.v >= 2)) return;
        const old = DATA.d[K.id];
        if (old && old.v > K.v) {
          // a newer built-in pack: keep its data, carry over the viewer's own restrooms and switches
          old.user = K.user || [];
          old.off = K.off || {};
          if (old._ok) userKeys(old);
          if (D && D.id === String(K.id)) cur = true;
          return;
        }
        if (old && old.built > K.built) return;
        if (old && D && D.id === String(K.id)) cur = true;
        addPack(K, false);
      } catch (e) {}
    });
    if (cur) load(D.id);
    else if (D) $("dist").value = D.id;
  })
  .catch(() => {
    dbOK = false;
  });
