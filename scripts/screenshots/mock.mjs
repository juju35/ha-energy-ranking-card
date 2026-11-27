// The mock home of the screenshots and animations: an Energy dashboard with six devices, a grid import and a fixed
// price, whose hourly statistics the page's callWS makes up from each device's kWh in the period and in the one
// before. The clock is fixed (Friday 27 November 2026, 14:00), so that a capture only changes when the card does.
const st = (entity_id, state, attributes = {}) => ({ entity_id, state, attributes, last_changed: "2026-11-01T00:00:00Z" });
const NOW = new Date(2026, 10, 27, 14, 0).getTime();

const NAMES = {
  "sensor.water_heater_energy": "Water heater",
  "sensor.washing_machine_energy": "Washing machine",
  "sensor.oven_energy": "Oven",
  "sensor.fridge_energy": "Fridge",
  "sensor.air_conditioner_energy": "Air conditioner",
  "sensor.desk_pc_energy": "Desk PC",
};

// `scene`: day (more than yesterday), week (less than last week), month (about the same), none (nothing measured).
// Each statistic: [kWh in the current stretch, kWh in the same stretch before].
const SCENES = {
  day: {
    period: "day",
    specs: {
      "sensor.water_heater_energy": [3.8, 3.4],
      "sensor.washing_machine_energy": [2.1, 2.1],
      "sensor.oven_energy": [1.6, 2.0],
      "sensor.fridge_energy": [1.2, 1.2],
      "sensor.air_conditioner_energy": [0.9, 1.1],
      "sensor.desk_pc_energy": [0.7, 0.6],
      "sensor.grid_import": [14.2, 12.7],
    },
  },
  week: {
    period: "week",
    specs: {
      "sensor.water_heater_energy": [21.4, 24.0],
      "sensor.washing_machine_energy": [9.8, 10.5],
      "sensor.oven_energy": [7.2, 8.1],
      "sensor.fridge_energy": [8.3, 8.2],
      "sensor.air_conditioner_energy": [3.1, 5.6],
      "sensor.desk_pc_energy": [4.0, 3.9],
      "sensor.grid_import": [71.5, 80.2],
    },
  },
  month: {
    period: "month",
    specs: {
      "sensor.water_heater_energy": [96.1, 94.0],
      "sensor.washing_machine_energy": [41.0, 40.2],
      "sensor.oven_energy": [33.5, 32.9],
      "sensor.fridge_energy": [34.8, 35.1],
      "sensor.air_conditioner_energy": [12.2, 11.8],
      "sensor.desk_pc_energy": [17.4, 17.0],
      "sensor.grid_import": [318.0, 312.5],
    },
  },
  none: { period: "day", specs: {} },
};

// The page's clock and the card's callWS, as script source: window.Date fixed, window.__ws answering the Energy
// dashboard's settings and the statistics from the specs put on the hass object (`this.__specs`), spread evenly over
// the hours of each stretch.
export const pageScript = () => `(() => {
  const N = ${NOW};
  const R = Date;
  window.Date = class extends R {
    constructor(...a) { super(...(a.length ? a : [N])); }
    static now() { return N; }
  };
  const H = 3600000;
  const startOf = (from, to) => {
    const d = new R(to);
    const today = new R(d.getFullYear(), d.getMonth(), d.getDate());
    if (to - from <= 2 * 86400000) return today.getTime();
    if (to - from <= 14 * 86400000) return new R(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)).getTime();
    return new R(d.getFullYear(), d.getMonth(), 1).getTime();
  };
  const spread = (from, to, total) => {
    const n = Math.max(1, Math.round((to - from) / H));
    return Array.from({ length: n }, (_, i) => ({ start: from + i * H, end: from + (i + 1) * H, change: total / n }));
  };
  window.__ws = async function (msg) {
    if (msg.type === "energy/get_prefs") return this.__prefs;
    const from = R.parse(msg.start_time);
    const to = R.parse(msg.end_time);
    const start = startOf(from, to);
    const prevEnd = Math.min(start, from + (to - start));
    const out = {};
    for (const id of msg.statistic_ids) {
      const s = this.__specs[id];
      if (s) out[id] = [...spread(from, prevEnd, s[1]), ...spread(start, to, s[0])];
    }
    return out;
  };
})();`;

export const setup = (s) => {
  const v = SCENES[s.scene];
  const states = Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [id, st(id, "100", { friendly_name: `${name} Energy`, unit_of_measurement: "kWh", device_class: "energy" })]));
  const entities = Object.fromEntries(Object.keys(NAMES).map((id) => [id, { entity_id: id, device_id: `dev_${id}` }]));
  const devices = Object.fromEntries(Object.entries(NAMES).map(([id, name]) => [`dev_${id}`, { name }]));
  return {
    hass: {
      language: "en",
      locale: { language: "en" },
      config: { currency: "EUR" },
      entities,
      devices,
      states,
      __prefs: {
        energy_sources: [{ type: "grid", flow_from: [{ stat_energy_from: "sensor.grid_import", number_energy_price: 0.1952 }], flow_to: [] }],
        device_consumption: Object.keys(NAMES).map((stat_consumption) => ({ stat_consumption })),
      },
      __specs: v.specs,
    },
    config: { period: v.period, ...s.config },
    open: s.open,
  };
};
