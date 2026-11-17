/* ================= v5.3b: fixes from the 9 Nov 2026 method audit (docs/AUDIT_v5.3.md) =================
   Loaded after v53.js. The scoring fixes are text edits in build_v53b.py; this script adds what the page needs:
    1. A warning in the thresholds table when cut-offs are typed out of order (the map sorts them before use). */
(function () {
  "use strict";
  document.documentElement.classList.add("v53b");
  const tab = document.querySelector("table.thtab");
  if (!tab) return;
  tab.insertAdjacentHTML("afterend", `<p class="small v53bwarn" id="v53bwarn" role="status" hidden></p>`);
  const rows = [["thsub", [3, 4, 5], "Subway"], ["thvul", [2, 3, 4, 5], "Vulnerable residents"], ["thpov", [2, 3, 4, 5], "Poverty"], ["thc", [2, 3, 4, 5], "Complaints"]];
  const check = () => {
    const bad = rows.filter(([id, ts]) => { const v = ts.map((t) => { const e = document.getElementById(id + t); return e ? parseFloat(e.value) : NaN; }).filter(isFinite); return v.some((x, i) => i && x < v[i - 1]); }).map((r) => r[2]);
    ts_mark(bad);
    const w = document.getElementById("v53bwarn");
    w.hidden = !bad.length;
    w.textContent = bad.length ? `${bad.join(" and ")}: the cut-offs are out of order, so the map uses them sorted from low to high. A tier is never reached without passing the tier below it.` : "";
  };
  const ts_mark = (bad) => rows.forEach(([id, ts, name]) => ts.forEach((t) => { const e = document.getElementById(id + t); if (e) e.classList.toggle("v53bbad", bad.includes(name)); }));
  tab.addEventListener("input", check); tab.addEventListener("change", check);
  const pre = document.getElementById("thpreset"); if (pre) pre.addEventListener("input", () => setTimeout(check, 0));
  check();
})();

