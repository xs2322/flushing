/* ---------- FLUSHING demand map: scoring, map and controls ---------- */
const $ = (i) => document.getElementById(i);
const SRC = "<!doctype html>\n" + document.documentElement.outerHTML; // an untouched copy of this page, for "This tool, with my districts"
const DATA = JSON.parse($("data").textContent); // {order:[ids], d:{id:pack}, sub:[subway table]}
const EMBED = new Set(DATA.order);
// The District list: Community District 1 in each borough, or the list saved with "This tool, with my districts".
const SHOWN = new Set(DATA.shown || DATA.order);
const CAL = { 1: 15129, 2: 7435, 3: 5862, 4: 779, 5: 390 }, // DOT Bi-Annual Pedestrian Counts, May and Oct 2025 (Global, Regional, Neighborhood)
  CLS = {
    1: "Global",
    2: "Regional",
    3: "Neighborhood",
    4: "Community",
    5: "Baseline",
  };
const DETOUR = 1.45, // straight line to walking route: routed OpenStreetMap walks, 300–800 m, median 1.46
  WATER = 60, // metres of open water that block a straight-line walk
  SNAP = 200, // how far a picked site may move to reach eligible land
  SMALL = 500, // tract size at which survey shares count fully
  SIDEWALK_FT = 15, // DOT APT rule: 6 ft 7 in unit plus 8 ft clear path
  DROPIN_M = 800, // straight line; about 18 minutes on the default walk rule (× 1.45 at 64 m a minute)
  DROPIN_W = 0.1,
  SUB_M = 150, // a subway station this close sets the block's foot-traffic tier
  MTA_M = 100, // closer than this to a station: MTA review for structures below grade
  MIN_RES = 10; // resident factors count only on blocks with at least this many residents
// Tier thresholds, after DOT's Pedestrian Demand Map: each factor sorts a block into tier 1 to 5 on its own,
// and the block takes the highest. Shares are in percent. Defaults: DOT street classes, DOT's 50,000-riders-a-week
// subway rule for a Regional corridor, and round shares that are the same in every district.
const TH_PRESETS = {
  // The default. Subway: DOT's own rule (Pedestrian Demand Map methodology): any station street is Neighborhood (3);
  // more than 50,000 average weekly riders, about 7,143 a day, is Regional (4). Subway never sets 5.
  // Residents and complaints: calibrated to DOT's Pedestrian Demand Map, so each reason reaches each tier about as often
  // as a city block sits on the matching DOT street class (Global 1.9%, Regional 7.8%, Neighborhood 37.0%,
  // Community 28.7% of the 36,915 blocks). Shares are taken over the 30,300 blocks with 10+ residents and rounded to
  // whole percentages; 65% of blocks have no complaints, so that reason is matched at tiers 4 and 5 only.
  dot: {
    name: "Default: calibrated to DOT's street classes",
    sub: [0, 7143, Infinity],
    vul: [24, 28, 37, 43],
    pov: [8, 13, 28, 41],
    c311: [0.3, 0.5, 1, 2.5],
  },
  // The default up to v5.3b, kept to compare.
  round: {
    name: "Round numbers (v5.3 default)",
    sub: [0, 7143, Infinity],
    vul: [20, 25, 30, 35],
    pov: [10, 15, 20, 30],
    c311: [1, 2, 3, 5],
  },
  equity: {
    name: "Equity first",
    sub: [20000, 50000, 100000],
    vul: [15, 20, 25, 30],
    pov: [7.5, 10, 15, 20],
    c311: [1, 2, 3, 4],
  },
  foot: {
    name: "Foot traffic first",
    sub: [10000, 30000, 60000],
    vul: [20, 25, 100, 100],
    pov: [10, 15, 100, 100],
    c311: [1, 2, 100, 100],
  },
  // DOT's own subway rule: a station with more than 50,000 riders a WEEK makes a Regional corridor (about 7,143 a day);
  // any other station street is Neighborhood. v3's default (20k/50k/100k a day) is kept so the memo's list reproduces.
  v3: {
    name: "Earlier subway cut-offs",
    sub: [20000, 50000, 100000],
    vul: [20, 25, 30, 35],
    pov: [10, 15, 20, 30],
    c311: [1, 2, 3, 5],
  },
};
const DRV = [
  "foot traffic",
  "vulnerable residents",
  "poverty",
  "public-urination complaints",
  "a homeless drop-in centre nearby",
];
// "12 blocks</b> rated tier 3 or higher here are", with the right number agreement.
const t3 = (n, verb) => `${n.toLocaleString()} ${n === 1 ? "block" : "blocks"}</b> rated tier 3 or higher here ${n === 1 ? { are: "is", have: "has" }[verb] : verb}`;
const TIERNAME = ["Served", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];
// Where a unit may stand. Each rule includes the ones above it.
const SITE = [
  ["open", "Parks and plazas"],
  ["public", "Any public land"],
  ["sidewalk", `Public land or a sidewalk ${SIDEWALK_FT} ft or wider`],
  ["curb", "Public land or a parking space (curb lane)"],
];
// What sets the tier, in FLUSHING order. [display letter, name, description, kind, internal switch key, colour]
// Internal keys are the saved-state keys (U foot traffic, N distance, H, I poverty, C complaints, G, L land, K site check).
const LET = [
  ["F", "Foot traffic", "DOT's street class in its Pedestrian Demand Map, or a busy subway station within 150 m.", "tier", "U", "#332288"],
  ["L", "Land", "Switch on to hatch the blocks where a unit is not allowed.", "where it can go", "L", "#3E4C6D"],
  ["U", "Underserved", "Distance first: served within a 5-minute walk of an open restroom; partly served up to 10 minutes (tier lowered by one); a gap beyond.", "gate", "N", "#6B7682"],
  ["S", "Site check", "A desk review of each pick: land owner, a 15 ft sidewalk for 8 ft of clear path, flood plain, MTA review, who approves, and what needs a site visit.", "where it can go", "K", "#009E73"],
  ["H", "Human need", "Share of residents aged 65+, under 5 or with a disability; separately, a block near a homeless drop-in centre is at least tier 4, whoever lives there.", "tier", "H", "#AA4499"],
  ["I", "Income", "Share of residents below the poverty line.", "tier", "I", "#B59A1E"],
  ["N", "Nuisance", "311 public-urination complaints a year within 200 m.", "tier", "C", "#2E8B7A"],
  ["G", "Grade", "The need tier: the block takes its highest single factor, after the distance rule. Served, then 1 to 5.", "result", "G", "#CF4F20"],
  ["◐", "Season", "Off is peak demand on a typical day, as DOT designs for. Switch on to test winter or evening.", "scenario", "S", "#6B7682"],
  ["$", "Cost view", "Shade the map by the city's cost per added visit: a unit's yearly contract divided by the visits it adds (for contracts, not ranking).", "view", "F", "#6B7682"],
];
const OPS = [
  ["Park", "Parks"],
  ["Library", "Libraries"],
  ["Public Plaza", "Plazas and kiosks"],
  ["APT", "Automatic public toilets (DOT/JCDecaux)"],
  ["EDC", "EDC sites"],
  ["Transit", "Transit"],
  ["Privately Owned Public Space", "Private plazas"],
  ["Subway", "Subway station restrooms (MTA list)"],
  ["Throne", "Throne units (17, operator Throne Labs)"],
  ["User", "Restrooms you added"],
];
const LAND = [
  "No public land",
  "Park or plaza",
  "Other public land",
  "Public, but a secured site",
];
// The 17 sites announced 16 Sept 2026: name, latitude, longitude, community district. Placed at the park, plaza or intersection centre.
const THRONE = [
  ["Yankee Stadium", 40.82882, -73.92647, "204"],
  ["Admiral Farragut Playground", 40.84296, -73.89178, "206"],
  ["Mapes Park", 40.84722, -73.88581, "206"],
  ["Monsignor Raul Del Valle Square", 40.82077, -73.8908, "202"],
  ["Columbus Park", 40.69365, -73.98997, "302"],
  ["Milestone Park", 40.60949, -73.99945, "311"],
  ["Fulton St and Truxton St", 40.67818, -73.9091, "316"],
  ["Avenue C Plaza", 40.64073, -73.97941, "312"],
  ["Astoria Blvd South and 31 St", 40.76995, -73.91786, "401"],
  ["Northern Blvd and 31 St", 40.7516, -73.93383, "401"],
  ["Northern Blvd and 54 St", 40.75331, -73.90669, "401"],
  ["34 Av and 64 St", 40.75226, -73.89901, "402"],
  ["Cooper Square", 40.72817, -73.99129, "102"],
  ["Malcolm X Plaza", 40.79866, -73.95246, "110"],
  ["Delancey St and Suffolk St", 40.718, -73.98659, "103"],
  ["Plaza Alianza Dominicana", 40.83925, -73.93993, "112"],
  ["North Shore Esplanade", 40.64754, -74.08129, "501"],
];
const CDS = [
  ["101", "Manhattan CD 1 · Financial District, Tribeca, Battery Park City"],
  ["102", "Manhattan CD 2 · Greenwich Village, SoHo, NoHo"],
  ["103", "Manhattan CD 3 · Lower East Side, Chinatown, East Village"],
  ["104", "Manhattan CD 4 · Chelsea, Hell's Kitchen"],
  ["105", "Manhattan CD 5 · Midtown, Union Square, Flatiron"],
  ["106", "Manhattan CD 6 · Murray Hill, Gramercy, Stuyvesant Town"],
  ["107", "Manhattan CD 7 · Upper West Side"],
  ["108", "Manhattan CD 8 · Upper East Side, Roosevelt Island"],
  ["109", "Manhattan CD 9 · Morningside Heights, Hamilton Heights"],
  ["110", "Manhattan CD 10 · Central Harlem"],
  ["111", "Manhattan CD 11 · East Harlem"],
  ["112", "Manhattan CD 12 · Washington Heights, Inwood"],
  ["201", "Bronx CD 1 · Mott Haven, Melrose, Port Morris"],
  ["202", "Bronx CD 2 · Hunts Point, Longwood"],
  ["203", "Bronx CD 3 · Morrisania, Crotona Park East"],
  ["204", "Bronx CD 4 · Highbridge, Concourse"],
  ["205", "Bronx CD 5 · University Heights, Fordham"],
  ["206", "Bronx CD 6 · Belmont, East Tremont"],
  ["207", "Bronx CD 7 · Bedford Park, Norwood, Kingsbridge Heights"],
  ["208", "Bronx CD 8 · Riverdale, Kingsbridge"],
  ["209", "Bronx CD 9 · Parkchester, Soundview"],
  ["210", "Bronx CD 10 · Throgs Neck, Co-op City"],
  ["211", "Bronx CD 11 · Morris Park, Pelham Parkway"],
  ["212", "Bronx CD 12 · Williamsbridge, Wakefield, Baychester"],
  ["301", "Brooklyn CD 1 · Williamsburg, Greenpoint"],
  ["302", "Brooklyn CD 2 · Downtown Brooklyn, Fort Greene, Brooklyn Heights"],
  ["303", "Brooklyn CD 3 · Bedford-Stuyvesant"],
  ["304", "Brooklyn CD 4 · Bushwick"],
  ["305", "Brooklyn CD 5 · East New York, Cypress Hills"],
  ["306", "Brooklyn CD 6 · Park Slope, Carroll Gardens, Red Hook"],
  ["307", "Brooklyn CD 7 · Sunset Park, Windsor Terrace"],
  ["308", "Brooklyn CD 8 · Crown Heights North, Prospect Heights"],
  ["309", "Brooklyn CD 9 · Crown Heights South, Prospect Lefferts Gardens"],
  ["310", "Brooklyn CD 10 · Bay Ridge, Dyker Heights"],
  ["311", "Brooklyn CD 11 · Bensonhurst, Bath Beach"],
  ["312", "Brooklyn CD 12 · Borough Park, Kensington"],
  ["313", "Brooklyn CD 13 · Coney Island, Brighton Beach"],
  ["314", "Brooklyn CD 14 · Flatbush, Midwood"],
  ["315", "Brooklyn CD 15 · Sheepshead Bay, Gravesend"],
  ["316", "Brooklyn CD 16 · Brownsville, Ocean Hill"],
  ["317", "Brooklyn CD 17 · East Flatbush"],
  ["318", "Brooklyn CD 18 · Canarsie, Flatlands, Marine Park"],
  ["401", "Queens CD 1 · Astoria, Long Island City"],
  ["402", "Queens CD 2 · Sunnyside, Woodside, Long Island City"],
  ["403", "Queens CD 3 · Jackson Heights, East Elmhurst"],
  ["404", "Queens CD 4 · Elmhurst, Corona"],
  ["405", "Queens CD 5 · Ridgewood, Maspeth, Middle Village, Glendale"],
  ["406", "Queens CD 6 · Forest Hills, Rego Park"],
  ["407", "Queens CD 7 · Flushing, Whitestone, College Point"],
  ["408", "Queens CD 8 · Fresh Meadows, Briarwood, Jamaica Hills"],
  ["409", "Queens CD 9 · Richmond Hill, Woodhaven, Kew Gardens"],
  ["410", "Queens CD 10 · Howard Beach, Ozone Park"],
  ["411", "Queens CD 11 · Bayside, Douglaston, Little Neck"],
  ["412", "Queens CD 12 · Jamaica, St. Albans, Hollis"],
  ["413", "Queens CD 13 · Queens Village, Laurelton, Rosedale"],
  ["414", "Queens CD 14 · The Rockaways, Broad Channel"],
  ["501", "Staten Island CD 1 · North Shore"],
  ["502", "Staten Island CD 2 · Mid-Island"],
  ["503", "Staten Island CD 3 · South Shore"],
];

const st = {
  on: { F: false, L: false, U: true, S: false, H: true, I: true, C: true },
  season: "win",
  flood: false,
  site: "curb",
  ops: {},
  acc: false,
  water: false,
  view: "need",
  lay: { S: true, P: true, F: false },
  picks: [],
  pickInfo: [],
  skipped: [],
  sel: null,
  selR: null,
  adding: false,
};
OPS.forEach((o) => (st.ops[o[0]] = true));
st.ops.Subway = false;
st.opx = {}; // off by default so the memo's numbers reproduce; switch on under Which restrooms count or in the Coverage lens
var RLIST = "nov"; // v5: which City restroom list the packs use ("nov" = 2 Nov 2026, "oct" = 1 Oct 2026 as in the memo)
let D = null;
const esc = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const f1 = (n) =>
  !isFinite(n) ? "–" : n >= 100 ? Math.round(n).toLocaleString() : n.toFixed(1);
const mins = (n) => String(+n.toFixed(1));
const usd = (c) =>
  c == null
    ? "n/a"
    : "$" + (c >= 100 ? Math.round(c).toLocaleString() : c.toFixed(2));
const pct = (v) => Math.round(v * 100) + "%";

