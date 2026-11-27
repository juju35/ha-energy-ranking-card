// A mock Home Assistant with an Energy dashboard (six devices, a grid import, a fixed price) whose hourly statistics
// callWS answers. The clock is fixed by the tests (NOW): Friday 27 November 2026, 14:00 local time.
export const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-01-01T00:00:00Z" });

export const NOW = new Date(2026, 10, 27, 14, 0).getTime();
export const H = 3600000;

// Each device: its kWh in the current stretch of the period and in the same stretch of the one before.
export const DEVICES = {
  "sensor.water_heater_energy": { name: "Water heater", cur: 3.8, prev: 3.4 },
  "sensor.washing_machine_energy": { name: "Washing machine", cur: 2.1, prev: 2.1 },
  "sensor.oven_energy": { name: "Oven", cur: 1.6, prev: 2.0 },
  "sensor.fridge_energy": { name: "Fridge", cur: 1.2, prev: 1.2 },
  "sensor.air_conditioner_energy": { name: "Air conditioner", cur: 0.9, prev: 1.1 },
  "sensor.desk_pc_energy": { name: "Desk PC", cur: 0.7, prev: 0.6 },
};
export const GRID = { "sensor.grid_import": { cur: 14.2, prev: 12.7 } };

// The start of the current period from the request: a day, a week (Monday) or a month back from its end.
const periodStart = (from, to) => {
  const d = new Date(to);
  const today = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (to - from <= 2 * 86400000) return today.getTime();
  if (to - from <= 14 * 86400000) return new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
};

// Hourly rows spreading `total` evenly over [from, to).
const spread = (from, to, total) => {
  const hours = Math.max(1, Math.round((to - from) / H));
  return Array.from({ length: hours }, (_, i) => ({ start: from + i * H, end: from + (i + 1) * H, change: total / hours }));
};

export const statsFor = (req, specs) => {
  const from = Date.parse(req.start_time);
  const to = Date.parse(req.end_time);
  const start = periodStart(from, to);
  const prevEnd = Math.min(start, from + (to - start));
  const out = {};
  for (const id of req.statistic_ids) {
    const s = specs[id];
    if (!s) continue;
    out[id] = s.rows ?? [...spread(from, prevEnd, s.prev), ...spread(start, to, s.cur)];
  }
  return out;
};

export const PREFS = {
  energy_sources: [{ type: "grid", flow_from: [{ stat_energy_from: "sensor.grid_import", number_energy_price: 0.1952 }], flow_to: [] }],
  device_consumption: Object.keys(DEVICES).map((stat_consumption) => ({ stat_consumption })),
};

export const makeHass = ({ prefs = PREFS, specs = { ...DEVICES, ...GRID }, ...overrides } = {}) => {
  const states = Object.fromEntries(
    Object.entries(DEVICES).map(([id, d]) => [id, st(id, "100", { friendly_name: `${d.name} Energy`, unit_of_measurement: "kWh", device_class: "energy" })]),
  );
  const entities = {};
  const devices = {};
  for (const [id, d] of Object.entries(DEVICES)) {
    entities[id] = { entity_id: id, device_id: `dev_${id}` };
    devices[`dev_${id}`] = { name: d.name };
  }
  const hass = {
    language: "en",
    locale: { language: "en" },
    config: { currency: "EUR" },
    themes: { darkMode: false },
    states: { ...states, "sensor.grid_import": st("sensor.grid_import", "5000", { unit_of_measurement: "kWh" }), "sensor.price": st("sensor.price", "0.25") },
    entities,
    devices,
    ws: [],
    ...overrides,
  };
  hass.callWS = async (msg) => {
    hass.ws.push(msg);
    if (msg.type === "energy/get_prefs") return prefs;
    if (msg.type === "recorder/statistics_during_period") return statsFor(msg, specs);
    throw new Error(`unexpected ${msg.type}`);
  };
  return hass;
};
