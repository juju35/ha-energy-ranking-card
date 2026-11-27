// ── Energy ───────────────────────────────────────────────────────────────────
// What the ranking is made of: the devices of the Energy dashboard (or the sensors of the config), their long-term
// statistics over the period and the one before it, the price per kWh (fixed, or the hourly mean of a price entity),
// and the grid import, whose part the devices do not measure is the "other" line.

// The periods of the tabs, in their order.
export const ER_PERIODS = ["day", "week", "month"];

// A change of less than this share (either way) is "stable".
export const ER_FLAT = 0.05;

// Intl formatters, built once per language and options.
export const erIntlCache = new Map();
export const erIntl = (Kind, lang, opts) => {
  const key = `${Kind.name}|${lang}|${JSON.stringify(opts)}`;
  if (!erIntlCache.has(key)) erIntlCache.set(key, new Kind(lang, opts));
  return erIntlCache.get(key);
};

// Local midnight of `t` (ms).
export const erMidnight = (t) => {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

// The day the week starts on (0 Sunday … 6 Saturday), from Home Assistant's `first_weekday` setting; Monday otherwise.
export const erFirstDay = (hass) => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const i = days.indexOf(String(hass?.locale?.first_weekday || "").toLowerCase());
  return i < 0 ? 1 : i;
};

// The current period up to `now`, and the same stretch of the one before: today since midnight and yesterday up to the
// same time, this week since its first day and last week up to the same point, this month since the 1st and last
// month over the same number of days (cut at its end).
export const erRange = (period, now, firstDay = 1) => {
  const today = erMidnight(now);
  const d = new Date(today);
  let start;
  let prev;
  if (period === "month") {
    start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    prev = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
  } else if (period === "week") {
    const back = (d.getDay() - firstDay + 7) % 7;
    start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back).getTime();
    prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - back - 7).getTime();
  } else {
    start = today;
    prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1).getTime();
  }
  return { start, end: now, prev, prevEnd: Math.min(start, prev + (now - start)) };
};

// The sensors and the price of the Energy dashboard's settings (energy/get_prefs): its individual devices, the grid
// import statistics (the old `flow_from` list or the newer single source), and the grid's price.
export const erFromPrefs = (prefs) => {
  const devices = (prefs?.device_consumption || [])
    .filter((d) => d?.stat_consumption)
    .map((d) => ({ stat: d.stat_consumption, name: d.name || "" }));
  const grid = [];
  let price = null;
  for (const src of prefs?.energy_sources || []) {
    if (src?.type !== "grid") continue;
    for (const f of [...(src.flow_from || []), src]) {
      if (f?.stat_energy_from && !grid.includes(f.stat_energy_from)) grid.push(f.stat_energy_from);
      if (price) continue;
      if (f?.entity_energy_price) price = { entity: f.entity_energy_price };
      else if (Number.isFinite(f?.number_energy_price)) price = { value: f.number_energy_price };
    }
  }
  return { devices, grid, price };
};

// The kWh of `rows` (recorder statistics, hourly or daily `change`) whose start is in [from, to).
export const erSum = (rows, from, to) => {
  let sum = 0;
  for (const r of rows || []) if (r.start >= from && r.start < to && Number.isFinite(r.change)) sum += r.change;
  return Math.max(0, sum);
};

// The cost of `rows` over [from, to): each hour at the price of that hour (the mean of the price statistics, `prices`,
// a Map start → price), else the last price known before it, else `fixed`. Null with no price at all.
export const erCost = (rows, from, to, { prices, fixed } = {}) => {
  const hasPrices = prices && prices.size > 0;
  if (!hasPrices && !Number.isFinite(fixed)) return null;
  const starts = hasPrices ? [...prices.keys()].sort((a, b) => a - b) : [];
  let cost = 0;
  let i = 0;
  let last = fixed;
  for (const r of [...(rows || [])].sort((a, b) => a.start - b.start)) {
    while (i < starts.length && starts[i] <= r.start) last = prices.get(starts[i++]);
    if (r.start < from || r.start >= to || !Number.isFinite(r.change) || r.change <= 0) continue;
    if (Number.isFinite(last)) cost += r.change * last;
  }
  return cost;
};

// What turns a price entity's unit into a price per kWh: €/MWh (Nord Pool) ÷ 1000, c/kWh or ct/kWh ÷ 100, €/Wh × 1000.
export const erPriceScale = (unit) => {
  const u = String(unit || "").replace(/\s/g, "").toLowerCase();
  const per = u.endsWith("/mwh") ? 0.001 : u.endsWith("/wh") ? 1000 : 1;
  const cents = /^(c|ct|cent|cents|¢|öre|ore|øre|gr|kop|коп|коп\.)\//.test(u) ? 0.01 : 1;
  return per * cents;
};

// The hourly mean prices of a price entity's statistics, as a Map start → price per kWh (`scale`: erPriceScale).
export const erPrices = (rows, scale = 1) => {
  const map = new Map();
  for (const r of rows || []) if (Number.isFinite(r.mean)) map.set(r.start, r.mean * scale);
  return map;
};

// The change from `prev` to `cur`: a share (0.12 = +12 %) and its direction, "up", "down" or "flat"; "new" when there
// was nothing before, "none" when there is nothing at all.
export const erTrend = (cur, prev) => {
  if (!(cur > 0) && !(prev > 0)) return { dir: "none", pct: 0 };
  if (!(prev > 0)) return { dir: "new", pct: 0 };
  const pct = (cur - prev) / prev;
  return { dir: pct > ER_FLAT ? "up" : pct < -ER_FLAT ? "down" : "flat", pct };
};

// An icon and a colour for a device, from its name or its entity id (in the card's languages), else a flash.
export const ER_KINDS = [
  [/water.?heater|boiler|chauffe.?eau|cumulus|ballon|warmwasser|boiler|calentador|termo|scaldabagno|bojler|водонагрев|бойлер|θερμοσίφων/i, "mdi:water-boiler", "#e67700"],
  [/wash|lave.?linge|waschmaschine|lavadora|lavatrice|wasmachine|pralk|máquina de lavar|стиральн|пральн|mosógép|pračk|pralni|veļas|πλυντήρι|mașin/i, "mdi:washing-machine", "#1c7ed6"],
  [/dish|lave.?vaisselle|spül|lavavajillas|lavastoviglie|vaatwas|zmywark|louça|посудомо|mosogató|myčk|pomivaln|trauku|πιάτων|vase/i, "mdi:dishwasher", "#1c7ed6"],
  [/dry|sèche|trockner|secadora|asciugatrice|droger|suszark|сушил|szárító|sušičk|sušiln|žāvēt|στεγνωτ|uscăt/i, "mdi:tumble-dryer", "#7048e8"],
  [/oven|four|backofen|horno|forno|oven|piekarnik|духов|sütő|trouba|pečic|cepeškrāsn|φούρνο|cuptor|cooktop|hob|plaque|induction|herd|stove/i, "mdi:stove", "#d6336c"],
  [/fridge|frigo|réfrig|kühl|nevera|frigorifero|koelkast|lodówk|frigorífico|холодил|hűtő|lednic|chladnič|hladilnik|ledusskap|ψυγείο|frigider|freezer|congél/i, "mdi:fridge", "#0c8599"],
  [/air.?con|\bac\b|clim|klima|aire acondicionado|condizionat|airco|klimatyz|ar condicionado|кондиц|légkond|klimati|kondicion|κλιματισ|aer condiționat/i, "mdi:air-conditioner", "#0c8599"],
  [/heat|radiat|chauff|heiz|calefac|riscald|verwarm|grzej|aquec|отопл|обігр|fűt|topen|kúren|ogrev|apkur|θέρμαν|încălz|pac\b|pump/i, "mdi:radiator", "#e8590c"],
  [/\bev\b|car|voiture|charger|borne|wallbox|auto|coche|laadpaal|ładowark|carro|машин|заряд|autó|nabíj|polnil|uzlād|φορτιστ|mașin/i, "mdi:car-electric", "#37b24d"],
  [/pc|computer|ordinateur|desktop|server|serveur|nas|rechner|ordenador|computador|компьют|számítóg|počítač|računal|dators|υπολογισ|calculator/i, "mdi:desktop-tower", "#495057"],
  [/tv|télé|tele|fernseh|televis|телевиз|телевіз|tévé|televiz|τηλεόρ/i, "mdi:television", "#7048e8"],
  [/light|lumi|lampe|licht|luz|luce|lamp|lamp|światł|свет|світл|lámp|světl|svetl|gaism|φως|lumin/i, "mdi:lightbulb", "#f59f00"],
];

export const erKind = (text) => {
  const s = String(text || "");
  const hit = ER_KINDS.find(([re]) => re.test(s));
  return hit ? { icon: hit[1], color: hit[2] } : { icon: "mdi:flash", color: "#c77700" };
};

// A device's name: the config's, the Energy dashboard's, its device's, the sensor's.
export const erName = (hass, stat, given) => {
  if (given) return given;
  const reg = hass?.entities?.[stat];
  const dev = reg?.device_id ? hass?.devices?.[reg.device_id] : null;
  return dev?.name_by_user || dev?.name || hass?.states?.[stat]?.attributes?.friendly_name || stat;
};
