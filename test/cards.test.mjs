import assert from "node:assert/strict";
import { test } from "node:test";
import { H, makeHass, NOW } from "./hass.mjs";
import { fakeNode, load } from "./load.mjs";

const er = load({ now: NOW });
const { cards } = er;
const json = (v) => JSON.parse(JSON.stringify(v));
const settle = () => new Promise((r) => setTimeout(r, 0));
const at = (m, d, h = 0, y = 2026) => new Date(y, m - 1, d, h).getTime();

// A card whose shadow root answers every selector with nodes recording their click listeners; the statistics fetched
// (callWS) before the test reads it.
const make = async (tag, config = {}, hass = makeHass()) => {
  const card = new cards[tag]();
  card.attachShadow();
  const nodes = {};
  card.shadowRoot.querySelector = (s) => (nodes[s] ||= fakeNode());
  card.setConfig({ type: `custom:${tag}`, ...config });
  card.hass = hass;
  for (let i = 0; i < 4; i++) await settle();
  return card;
};

test("both cards are registered, with their editors and a picker entry", () => {
  for (const tag of ["energy-ranking-card", "energy-ranking-mini-card"]) {
    assert.ok(er.customElements.get(tag), tag);
    assert.ok(er.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.deepEqual(json(er.window.customCards.map((c) => c.type)), ["energy-ranking-card", "energy-ranking-mini-card"]);
  assert.ok(er.window.customCards.every((c) => c.preview === true));
  assert.deepEqual(json(cards["energy-ranking-card"].getStubConfig(makeHass())), {});
});

test("periods: today, this week from Monday, this month, and the same stretch before", () => {
  assert.deepEqual(json(er.erRange("day", NOW, 1)), { start: at(11, 27), end: NOW, prev: at(11, 26), prevEnd: at(11, 26, 14) });
  assert.deepEqual(json(er.erRange("week", NOW, 1)), { start: at(11, 23), end: NOW, prev: at(11, 16), prevEnd: at(11, 20, 14) });
  assert.deepEqual(json(er.erRange("week", NOW, 0)).start, at(11, 22), "a week starting on Sunday");
  const month = er.erRange("month", NOW, 1);
  assert.equal(month.start, at(11, 1));
  assert.equal(month.prev, at(10, 1));
  assert.equal(month.prevEnd, at(10, 1) + (NOW - at(11, 1)));
  // On 31 March, last month (February) is cut at its end.
  const march = er.erRange("month", at(3, 31, 12, 2027), 1);
  assert.equal(march.prevEnd, at(3, 1, 0, 2027));
  assert.equal(er.erFirstDay({ locale: { first_weekday: "sunday" } }), 0);
  assert.equal(er.erFirstDay({ locale: { first_weekday: "language" } }), 1);
});

test("the Energy dashboard: devices, grid import and price, old and new formats", () => {
  const old = er.erFromPrefs({
    energy_sources: [{ type: "grid", flow_from: [{ stat_energy_from: "sensor.a", entity_energy_price: "sensor.price" }, { stat_energy_from: "sensor.b" }] }, { type: "solar", stat_energy_from: "sensor.pv" }],
    device_consumption: [{ stat_consumption: "sensor.x", name: "Kettle" }, {}],
  });
  assert.deepEqual(json(old), { devices: [{ stat: "sensor.x", name: "Kettle" }], grid: ["sensor.a", "sensor.b"], price: { entity: "sensor.price" } });
  const neu = er.erFromPrefs({ energy_sources: [{ type: "grid", stat_energy_from: "sensor.c", number_energy_price: 0.2 }] });
  assert.deepEqual(json(neu), { devices: [], grid: ["sensor.c"], price: { value: 0.2 } });
  assert.deepEqual(json(er.erFromPrefs(null)), { devices: [], grid: [], price: null });
});

test("sums, costs at a fixed or an hourly price, trends, kinds", () => {
  const rows = [0, 1, 2, 3].map((i) => ({ start: i * H, change: 1 }));
  assert.equal(er.erSum(rows, H, 3 * H), 2);
  assert.equal(er.erCost(rows, 0, 4 * H, { fixed: 0.2 }).toFixed(2), "0.80");
  const prices = er.erPrices([{ start: 0, mean: 0.1 }, { start: 2 * H, mean: 0.5 }]);
  // Hour 1 keeps the price of hour 0; hours 2 and 3 cost 0.5.
  assert.equal(er.erCost(rows, 0, 4 * H, { prices, fixed: 9 }).toFixed(2), "1.20");
  assert.equal(er.erCost(rows, 0, 4 * H, {}), null);
  assert.equal(er.erPriceScale("EUR/MWh"), 0.001);
  assert.equal(er.erPriceScale("c/kWh"), 0.01);
  assert.equal(er.erPriceScale("€/kWh"), 1);
  assert.equal(er.erPrices([{ start: 0, mean: 120 }], 0.001).get(0), 0.12);
  assert.deepEqual(json(er.erTrend(112, 100)), { dir: "up", pct: 0.12 });
  assert.equal(er.erTrend(80, 100).dir, "down");
  assert.equal(er.erTrend(102, 100).dir, "flat");
  assert.equal(er.erTrend(5, 0).dir, "new");
  assert.equal(er.erTrend(0, 0).dir, "none");
  assert.equal(er.erKind("Chauffe-eau sensor.cumulus").icon, "mdi:water-boiler");
  assert.equal(er.erKind("Lave-linge").icon, "mdi:washing-machine");
  assert.equal(er.erKind("Kühlschrank").icon, "mdi:fridge");
  assert.equal(er.erKind("Something").icon, "mdi:flash");
});

test("full card: the devices ranked, their kWh, cost and trend, the other line and the totals", async () => {
  const hass = makeHass();
  const card = await make("energy-ranking-card", {}, hass);
  assert.deepEqual(hass.ws.map((m) => m.type), ["energy/get_prefs", "recorder/statistics_during_period"]);
  const req = hass.ws[1];
  assert.equal(req.period, "hour");
  assert.deepEqual(json(req.units), { energy: "kWh" });
  assert.equal(Date.parse(req.start_time), at(11, 26));
  const m = card._items;
  assert.equal(m.state, "ok");
  assert.deepEqual(json(m.items.map((i) => [i.name, Number(i.kwh.toFixed(1))])), [
    ["Water heater", 3.8],
    ["Washing machine", 2.1],
    ["Oven", 1.6],
    ["Fridge", 1.2],
    ["Air conditioner", 0.9],
  ]);
  assert.equal(m.items[0].icon, "mdi:water-boiler");
  assert.equal(m.items[0].trend.dir, "up");
  assert.equal(m.items[1].trend.dir, "flat");
  assert.equal(m.items[2].trend.dir, "down");
  // The desk PC (beyond max_items) and what no device measures: 14.2 - 9.6 kWh.
  assert.equal(m.other.kwh.toFixed(1), "4.6");
  assert.equal(m.total.cost.toFixed(2), "2.77");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<ha-card class="lvl-up">/);
  assert.match(html, /<span class="bpt">\+12% vs yesterday<\/span>/);
  assert.match(html, /<div class="subt">Today · 14\.2 kWh · €2\.77<\/div>/);
  assert.match(html, /<span class="rkwh">3\.8 kWh<\/span><span class="rc">€0\.74<ha-icon class="tr tr-up"/);
  assert.match(html, /Other and unmeasured/);
  assert.match(html, /<span class="price">€0\.1952\/kWh<\/span>/);
  assert.match(html, /class="tab on" data-p="day" aria-pressed="true">Day</);
});

test("a tab asks for its period and shows it", async () => {
  const hass = makeHass();
  const card = await make("energy-ranking-card", {}, hass);
  const tabs = ["day", "week", "month"].map((p) => ({ dataset: { p }, addEventListener(_t, fn) { this.fn = fn; } }));
  card.shadowRoot.querySelectorAll = (s) => (s.includes(".tab[data-p]") ? tabs : []);
  card._bindAfter(card.shadowRoot);
  tabs[1].fn({ stopPropagation() {} });
  for (let i = 0; i < 4; i++) await settle();
  const req = hass.ws.at(-1);
  assert.equal(Date.parse(req.start_time), at(11, 16));
  assert.equal(hass.ws.filter((m) => m.type === "energy/get_prefs").length, 1, "the settings are read once");
  assert.equal(card._items.period, "week");
  assert.match(card.shadowRoot.innerHTML, /This week · 14\.2 kWh/);
  assert.match(card.shadowRoot.innerHTML, /\+12% vs last week/);
});

test("sensors of the config, a total sensor and an hourly price entity", async () => {
  const hass = makeHass();
  const card = await make("energy-ranking-card", {
    entities: [{ entity: "sensor.oven_energy", name: "Kitchen oven" }, "sensor.fridge_energy"],
    total_entity: "sensor.grid_import",
    price_entity: "sensor.price",
    show_other: false,
  }, hass);
  assert.ok(!hass.ws.some((m) => m.type === "energy/get_prefs"), "no Energy dashboard needed");
  assert.deepEqual(json(hass.ws[0].statistic_ids), ["sensor.oven_energy", "sensor.fridge_energy", "sensor.grid_import", "sensor.price"]);
  const m = card._items;
  assert.deepEqual(json(m.items.map((i) => i.name)), ["Kitchen oven", "Fridge"]);
  assert.equal(m.other, null);
  // No price statistics in the mock: the price entity's state (0.25) applies.
  assert.equal(m.items[0].cost.toFixed(2), "0.40");
  assert.match(card.shadowRoot.innerHTML, /€0\.25\/kWh/);
});

test("no devices, nothing used, and no costs", async () => {
  const empty = await make("energy-ranking-card", {}, makeHass({ prefs: {} }));
  assert.equal(empty._items.state, "nosource");
  assert.match(empty.shadowRoot.innerHTML, /No devices: add them to the Energy dashboard/);
  const zero = await make("energy-ranking-card", {}, makeHass({ specs: {} }));
  assert.equal(zero._items.state, "none");
  assert.match(zero.shadowRoot.innerHTML, /<ha-card class="lvl-none">/);
  assert.match(zero.shadowRoot.innerHTML, /No energy used in this period/);
  const free = await make("energy-ranking-card", { show_cost: false });
  assert.doesNotMatch(free.shadowRoot.innerHTML, /€/);
});

test("mini card: the trend, the device in the lead and the total cost on two lines", async () => {
  const card = await make("energy-ranking-mini-card");
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /<ha-card class="lvl-up bn">/);
  assert.match(html, /<span class="bpt">\+12% vs yesterday<\/span>/);
  assert.match(html, /<button class="subt evt" data-id="sensor\.water_heater_energy"[^>]*>Water heater leads · 3\.8 kWh of 14\.2 kWh · €2\.77<\/button>/);
  card._zoomed = true;
  card._sig = null;
  card._render();
  assert.match(card.shadowRoot.innerHTML, /class="list"/);
});

test("the rows open their entity's details", async () => {
  const card = await make("energy-ranking-card");
  const events = [];
  card.dispatchEvent = (e) => events.push(e.detail?.entityId);
  const rows = [{ dataset: { id: "sensor.oven_energy" }, addEventListener(_type, fn) { this.fn = fn; } }];
  card.shadowRoot.querySelectorAll = (s) => (s.includes(".row[data-id]") ? rows : []);
  card._bindAfter(card.shadowRoot);
  rows[0].fn();
  assert.deepEqual(events, ["sensor.oven_energy"]);
});

test("translations: every language has every English key", () => {
  const en = Object.keys(er.ER_I18N.en);
  for (const [lang, table] of Object.entries(er.ER_I18N)) assert.deepEqual(en.filter((k) => !(k in table)), [], lang);
  assert.equal(Object.keys(er.ER_I18N).length, 22);
});

test("the editor writes only what differs from the defaults", () => {
  const ed = new (er.customElements.get("energy-ranking-card-editor"))();
  ed.setConfig({ type: "custom:energy-ranking-card" });
  ed.hass = makeHass();
  const form = ed.children[0];
  const names = form.schema.flatMap((s) => (s.schema ? s.schema.map((x) => x.name) : [s.name]));
  for (const n of ["period", "entities", "total_entity", "max_items", "price", "price_entity", "currency", "show_tabs", "show_other", "show_cost", "illustration_theme", "language"])
    assert.ok(names.includes(n), n);
  let out;
  ed.dispatchEvent = (e) => (out = e.detail.config);
  form.listeners["value-changed"]({ detail: { value: { type: "custom:energy-ranking-card", period: "day", max_items: 5, show_tabs: true, price: 0.2 } } });
  assert.deepEqual(json(out), { type: "custom:energy-ranking-card", price: 0.2 });
  const mini = new (er.customElements.get("energy-ranking-mini-card-editor"))();
  mini.setConfig({ type: "custom:energy-ranking-mini-card" });
  mini.hass = makeHass();
  assert.ok(mini.children[0].schema.some((s) => s.name === "zoom"));
});

test("another language: the card's texts and its numbers", async () => {
  const card = await make("energy-ranking-card", { language: "fr" });
  const html = card.shadowRoot.innerHTML;
  assert.match(html, /Plus gros consommateurs/);
  assert.match(html, /Aujourd&#39;hui · 14,2 kWh · 2,77/);
  assert.match(html, /vs hier/);
});
