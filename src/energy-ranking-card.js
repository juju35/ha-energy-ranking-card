/**
 * energy-ranking-card / energy-ranking-mini-card: the devices that use the most energy over the day, the week or the
 * month, with their kWh, their cost and how they compare with the period before, and what the devices do not measure.
 * https://github.com/juju35/ha-energy-ranking-card
 */

// The statistics are fetched again this often while the card is on screen (ms), and at once for a new period.
const ER_REFRESH = 5 * 60 * 1000;
// One loop of the banner's animation (s): the bars rise and fall once, the bolt flickers once.
const ER_LOOP = 2.4;
// The colour of each status: more than the period before, less, about the same (or nothing before), nothing yet.
const ER_COLORS = { up: "#c77700", down: "#2f9e44", flat: "#1c7ed6", none: "#8a929c" };

// ── Banner ───────────────────────────────────────────────────────────────────
// The illustrated header's scene, drawn to the banner's right edge: four bars rising to the right, the tallest in the
// status colour, and a lightning bolt. The bars rise and fall in turn and the bolt flickers (SVG animations, one
// loop of ER_LOOP s). By night (the dark theme), dimmer bars. `mini`: the narrow version of the mini card.
const erScene = ({ night, level, animate, mini }) => {
  const pale = night ? "#5b4a33" : "#f2d9ae";
  const top = ER_COLORS[level] || ER_COLORS.none;
  const bars = mini ? [[4, 34], [22, 48], [40, 66]] : [[28, 30], [52, 44], [76, 58], [100, 72]];
  const last = bars.length - 1;
  const rect = ([x, h], i) => {
    const y = 80 - h;
    const breathe = animate
      ? `<animate attributeName="y" values="${y};${y + 6};${y}" dur="${ER_LOOP}s" begin="${((i * ER_LOOP) / bars.length).toFixed(2)}s" repeatCount="indefinite"/><animate attributeName="height" values="${h};${h - 6};${h}" dur="${ER_LOOP}s" begin="${((i * ER_LOOP) / bars.length).toFixed(2)}s" repeatCount="indefinite"/>`
      : "";
    return `<rect class="b${i === last ? " top" : ""}" x="${x}" y="${y}" width="16" height="${h}" rx="3" fill="${i === last ? top : pale}"${i === last ? ' opacity=".85"' : ""}>${breathe}</rect>`;
  };
  const bx = mini ? 62 : 142;
  const flicker = animate ? `<animate attributeName="opacity" values="1;1;.35;1;.6;1" keyTimes="0;.55;.62;.7;.78;1" dur="${ER_LOOP}s" repeatCount="indefinite"/>` : "";
  const bolt = `<path class="bolt" d="M${bx + 16} 10 L${bx} 40 h12 l-6 28 l22 -36 h-12 l8 -22z" fill="${night ? "#f2c14e" : "#e0a100"}">${flicker}</path>`;
  return `${bars.map(rect).join("")}${bolt}`;
};

// The status pill's place, decided by measurement after each render and each new width (the same rule on every
// card): on the title row, right after the title, only when the whole title and the pill's whole label fit there;
// otherwise on its own line under the subtitle (clamped to one line). When the label is still cut there, or the text
// block leaves the banner or runs over its ground strip, the pill keeps its dot alone, on the title row (its label
// stays in title and aria-label). A card of 200 px or less shows the dot alone anyway (CSS), beside the title.
const erPlacePill = (head, row, ground) => {
  if (!head) return;
  head.removeAttribute("data-wrap");
  head.removeAttribute("data-dot");
  const pill = row.querySelector(":scope > .bpill, :scope > .pill");
  const text = pill?.querySelector(".bpt, .pt");
  if (!text?.getBoundingClientRect || text.getBoundingClientRect().width <= 1) return;
  const name = row.querySelector(".title");
  const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
  const title = name ? (name.scrollWidth > name.clientWidth ? name.scrollWidth : name.getBoundingClientRect().width) + gap : 0;
  if (title + pill.getBoundingClientRect().width <= row.getBoundingClientRect().width + 0.5) return;
  head.setAttribute("data-wrap", "");
  const box = row.parentElement.getBoundingClientRect();
  const frame = head.getBoundingClientRect();
  const out = ground && (box.bottom > ground.getBoundingClientRect().top + 0.5 || box.top < frame.top - 0.5);
  if (text.scrollWidth > text.clientWidth + 0.5 || out) {
    head.removeAttribute("data-wrap");
    head.setAttribute("data-dot", "");
  }
};

// A statistics row's start in ms (recent Home Assistant sends numbers, older versions ISO strings).
const erStartOf = (r) => (typeof r.start === "number" ? r.start : Date.parse(r.start));

// ── Card ─────────────────────────────────────────────────────────────────────
class EnergyRankingCard extends RcCard {
  static tag = "energy-ranking-card";
  static i18n = ER_I18N;
  static defaults = {
    illustration: true,
    illustration_theme: "auto",
    show_subtitle: true,
    animations: true,
    period: "day",
    max_items: 5,
    show_tabs: true,
    show_other: true,
    show_cost: true,
  };

  // The Energy dashboard's devices are read by default: nothing to set.
  static getStubConfig() {
    return {};
  }

  getCardSize() {
    return 6;
  }

  connectedCallback() {
    super.connectedCallback?.();
    this._timer ??= setInterval(() => this._onScreen() && this._fetch(), ER_REFRESH);
    // The statistics are only asked for once the card is on screen (a card in a hidden view or far down the page waits).
    if (typeof IntersectionObserver === "function") {
      this._io ??= new IntersectionObserver((entries) => {
        const seen = entries.some((e) => e.isIntersecting);
        if (seen && !this._visible) {
          this._visible = true;
          this._render();
        }
      });
      this._io.observe(this);
    }
    // A new width: the status pill is fitted again (in the next frame, and only for a new width).
    if (typeof ResizeObserver !== "function") return;
    this._resize ??= new ResizeObserver((entries) => {
      const w = Math.round(entries.at(-1).contentRect.width);
      if (w === this._fitWidth) return;
      this._fitWidth = w;
      cancelAnimationFrame(this._fitFrame);
      this._fitFrame = requestAnimationFrame(() => this._fitPill());
    });
    this._resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback?.();
    clearInterval(this._timer);
    this._timer = undefined;
    this._io?.disconnect();
    this._io = undefined;
    this._resize?.disconnect();
    this._fitWidth = undefined;
    if (this._fitFrame) cancelAnimationFrame(this._fitFrame);
  }

  // On screen once seen; always without IntersectionObserver (nothing tells then).
  _onScreen() {
    return this._visible || typeof IntersectionObserver !== "function";
  }

  // The period shown: the tab picked, else the config's.
  _period() {
    const p = this._tab || this._config.period;
    return ER_PERIODS.includes(p) ? p : "day";
  }

  // The devices, the grid import and the price: the config's, else the Energy dashboard's.
  _sources(prefs) {
    const c = this._config;
    const listed = (c.entities || []).map((e) => (typeof e === "string" ? { stat: e, name: "" } : { stat: e?.entity, name: e?.name || "" })).filter((e) => e.stat);
    const from = erFromPrefs(prefs);
    const devices = listed.length ? listed : from.devices;
    const grid = c.total_entity ? [c.total_entity] : from.grid;
    const price = Number.isFinite(Number(c.price)) && c.price !== "" && c.price != null ? { value: Number(c.price) } : c.price_entity ? { entity: c.price_entity } : from.price;
    return { devices, grid, price };
  }

  // The settings of the Energy dashboard, then the hourly statistics of the period and of the one before it.
  async _fetch() {
    const h = this._hass;
    if (!h?.callWS || this._busy) return;
    this._busy = true;
    const period = this._period();
    try {
      if (!this._config.entities?.length && !this._prefs) this._prefs = await Promise.resolve(h.callWS({ type: "energy/get_prefs" })).catch(() => ({}));
      const src = this._sources(this._prefs);
      const range = erRange(period, Date.now(), erFirstDay(h));
      const ids = [...new Set([...src.devices.map((d) => d.stat), ...src.grid, ...(src.price?.entity ? [src.price.entity] : [])])];
      let stats = {};
      if (src.devices.length)
        stats = await Promise.resolve(
          h.callWS({
            type: "recorder/statistics_during_period",
            start_time: new Date(range.prev).toISOString(),
            end_time: new Date(range.end).toISOString(),
            statistic_ids: ids,
            period: "hour",
            types: ["change", "mean"],
            units: { energy: "kWh" },
          }),
        ).catch(() => ({}));
      const norm = Object.fromEntries(Object.entries(stats || {}).map(([id, rows]) => [id, (rows || []).map((r) => ({ ...r, start: erStartOf(r) }))]));
      this._data = { period, key: this._key(), at: Date.now(), range, src, stats: norm };
    } finally {
      this._busy = false;
    }
    this._sig = null;
    this._render();
  }

  // What the statistics depend on: a change of period or of sources asks for them again.
  _key() {
    const c = this._config;
    return JSON.stringify([this._period(), c.entities, c.total_entity, c.price, c.price_entity]);
  }

  _fmt(n, digits) {
    return erIntl(Intl.NumberFormat, this._lang(), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
  }

  // kWh: two decimals under 1, one under 100, none above.
  _kwh(v) {
    return `${this._fmt(v, v < 1 ? 2 : v < 100 ? 1 : 0)} kWh`;
  }

  // An amount in the currency, two decimals (up to four for a price per kWh: `max`).
  _money(v, max = 2) {
    const currency = this._config.currency || this._hass.config?.currency || "EUR";
    try {
      return erIntl(Intl.NumberFormat, this._lang(), { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: max }).format(v);
    } catch {
      return `${this._fmt(v, 2)} ${currency}`;
    }
  }

  _pct(p) {
    return erIntl(Intl.NumberFormat, this._lang(), { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }).format(p);
  }

  // The ranking: each device's kWh, cost and trend over the period, the "other" line and the totals.
  _collect() {
    const c = this._config;
    const h = this._hass;
    const d = this._data;
    const period = this._period();
    const stale = !d || d.key !== this._key() || Date.now() - d.at > ER_REFRESH;
    if (this._onScreen() && stale && h.callWS && !this._busy) this._fetch();
    const base = { period, name: c.title || this._t("title"), items: [], other: null, total: null, trend: erTrend(0, 0) };
    if (!d || d.period !== period) return { ...base, state: "loading" };
    const { range, src, stats } = d;
    if (!src.devices.length) return { ...base, state: "nosource" };
    const pe = src.price?.entity;
    const scale = pe ? erPriceScale(h.states?.[pe]?.attributes?.unit_of_measurement) : 1;
    const stateNow = pe ? Number(h.states?.[pe]?.state) * scale : NaN;
    const fixed = src.price?.value ?? (Number.isFinite(stateNow) ? stateNow : undefined);
    const pricing = { prices: erPrices(pe ? stats[pe] : null, scale), fixed };
    const variable = pricing.prices.size > 0;
    const show = c.show_cost !== false;
    const measure = (id) => {
      const rows = stats[id] || [];
      const kwh = erSum(rows, range.start, range.end);
      const prev = erSum(rows, range.prev, range.prevEnd);
      return { kwh, prev, cost: show ? erCost(rows, range.start, range.end, pricing) : null, trend: erTrend(kwh, prev) };
    };
    const all = src.devices.map((dev) => {
      const name = erName(h, dev.stat, dev.name);
      const kind = erKind(`${name} ${dev.stat}`);
      const icon = h.states?.[dev.stat]?.attributes?.icon || h.entities?.[dev.stat]?.icon || kind.icon;
      return { id: dev.stat, name, icon, color: kind.color, ...measure(dev.stat) };
    });
    const ranked = all.filter((i) => i.kwh > 0).sort((a, b) => b.kwh - a.kwh || a.name.localeCompare(b.name));
    const items = ranked.slice(0, Math.max(1, Math.round(Number(c.max_items) || 5)));
    const sum = (list, k) => list.reduce((s, i) => s + (i[k] || 0), 0);
    const grid = src.grid.length ? src.grid.map((id) => measure(id)) : null;
    const total = grid
      ? { kwh: sum(grid, "kwh"), prev: sum(grid, "prev"), cost: show && grid.every((g) => g.cost != null) ? sum(grid, "cost") : null }
      : { kwh: sum(all, "kwh"), prev: sum(all, "prev"), cost: show && all.every((i) => i.cost != null) ? sum(all, "cost") : null };
    // What the devices do not measure, the ones beyond `max_items` included: the grid import minus the devices listed.
    const shownKwh = sum(items, "kwh");
    let other = null;
    if (c.show_other !== false && total.kwh - shownKwh > 0.005) {
      const cost = total.cost != null && items.every((i) => i.cost != null) ? Math.max(0, total.cost - sum(items, "cost")) : null;
      other = { kwh: total.kwh - shownKwh, cost };
    }
    return {
      ...base,
      state: items.length ? "ok" : "none",
      items,
      other,
      total,
      trend: erTrend(total.kwh, total.prev),
      variable,
      price: fixed,
    };
  }

  _night() {
    const theme = this._config.illustration_theme;
    if (theme === "night" || theme === "day") return theme === "night";
    return this._dark();
  }

  _dark() {
    return !!this._hass.themes?.darkMode;
  }

  _animate() {
    if (this._config.animations === false) return false;
    try {
      return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return true;
    }
  }

  // The status's colour: up, down, flat (stable, or nothing to compare with), none (no data yet).
  _level(m) {
    if (m.state !== "ok") return "none";
    return m.trend.dir === "up" ? "up" : m.trend.dir === "down" ? "down" : "flat";
  }

  // The status pill: the change since the period before ("+12% vs yesterday"), else what the card is waiting for.
  _status(m) {
    if (m.state === "loading") return this._t("loading");
    if (m.state !== "ok") return this._t("st_none");
    if (m.trend.dir === "new") return this._t("st_new");
    return `${this._pct(m.trend.pct)} ${this._t(`vs_${m.period}`)}`;
  }

  // "Today · 14.2 kWh · €2.77".
  _sub(m) {
    if (this._config.show_subtitle === false) return "";
    const parts = [this._t(`sub_${m.period}`)];
    if (m.state === "ok") parts.push(this._kwh(m.total.kwh));
    if (m.state === "ok" && m.total.cost != null) parts.push(this._money(m.total.cost));
    return `<div class="subt">${rcEsc(parts.join(" · "))}</div>`;
  }

  // The illustrated header: the badge, the title, `sub` and the pill on the left, the bars and the bolt at the right, a
  // 10 px ground strip edge to edge. `mini`: the mini card's narrow drawing.
  _banner(m, sub, pill, mini = false) {
    const c = this._config;
    const nav = c.navigation_path;
    const night = this._night();
    const chip = pill ? `<span class="bpill" title="${rcEsc(pill)}" aria-label="${rcEsc(pill)}"><span class="bdot"></span><span class="bpt">${rcEsc(pill)}</span></span>` : "";
    const scene = erScene({ night, level: this._level(m), animate: this._animate(), mini });
    return `
      <div class="banner${night ? " night" : ""}">
        <div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
          <div class="badge"><ha-icon icon="mdi:flash"></ha-icon></div>
          <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div>${chip}</div>${sub}</div>
        </div>
        <svg class="room" viewBox="0 0 ${mini ? 96 : 180} 80" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">${scene}</svg>
        <div class="ground"></div>
      </div>`;
  }

  // The classic header (`illustration: false`): the badge, the title and the pill, the subtitle under them.
  _classic(m, sub, pill) {
    const nav = this._config.navigation_path;
    return `<div class="head${nav ? " nav" : ""}"${nav ? ' role="link" tabindex="0"' : ""}>
      <div class="badge"><ha-icon icon="mdi:flash"></ha-icon></div>
      <div class="tt"><div class="trow"><div class="title">${rcEsc(m.name)}</div><span class="pill" title="${rcEsc(pill)}"><span class="pt">${rcEsc(pill)}</span></span></div>${sub}</div>
    </div>`;
  }

  // The status pill's place, on the banner and on the classic header (see erPlacePill).
  _fitPill() {
    for (const row of this.shadowRoot?.querySelectorAll?.(".trow") || []) {
      const banner = row.closest(".banner");
      erPlacePill(banner || row.closest(".head"), row, banner?.querySelector(".ground"));
    }
  }

  // The tabs (day, week, month) and the price on the right.
  _tabs(m) {
    const c = this._config;
    const price = c.show_cost === false || m.state !== "ok" ? "" : m.variable ? this._t("price_variable") : Number.isFinite(m.price) ? this._t("price_fixed", { price: this._money(m.price, 4) }) : "";
    const tabs =
      c.show_tabs === false
        ? ""
        : ER_PERIODS.map((p) => `<button class="tab${p === m.period ? " on" : ""}" data-p="${p}" aria-pressed="${p === m.period}">${rcEsc(this._t(`p_${p}`))}</button>`).join("");
    if (!tabs && !price) return "";
    return `<div class="tabs">${tabs}${price ? `<span class="price">${rcEsc(price)}</span>` : ""}</div>`;
  }

  // One device: its rank, icon, name and bar, its kWh, cost and trend.
  _row(i, rank, max) {
    const width = max > 0 ? Math.max(2, Math.round((i.kwh / max) * 100)) : 0;
    const dir = i.trend.dir;
    const arrow = dir === "up" ? "mdi:arrow-up" : dir === "down" ? "mdi:arrow-down" : dir === "flat" ? "mdi:equal" : "";
    const tip = dir === "up" || dir === "down" || dir === "flat" ? `${this._pct(i.trend.pct)} ${this._t(`vs_${this._period()}`)}` : "";
    const cost = i.cost != null ? this._money(i.cost) : "";
    return `<button class="row${rank === 1 ? " first" : ""}" data-id="${rcEsc(i.id)}" style="--t:${i.color}" title="${rcEsc([i.name, tip].filter(Boolean).join(" · "))}">
      <span class="rk">${rank}</span>
      <span class="ri"><ha-icon icon="${rcEsc(i.icon)}"></ha-icon></span>
      <span class="rt"><span class="rn">${rcEsc(i.name)}</span><span class="bar"><span style="width:${width}%"></span></span></span>
      <span class="rv"><span class="rkwh">${rcEsc(this._kwh(i.kwh))}</span><span class="rc">${rcEsc(cost)}${arrow ? `<ha-icon class="tr tr-${dir}" icon="${arrow}"></ha-icon>` : ""}</span></span>
    </button>`;
  }

  _otherRow(o) {
    return `<div class="row other">
      <span class="rk"></span>
      <span class="ri"><ha-icon icon="mdi:dots-horizontal"></ha-icon></span>
      <span class="rt"><span class="rn">${rcEsc(this._t("other"))}</span></span>
      <span class="rv"><span class="rkwh">${rcEsc(this._kwh(o.kwh))}</span><span class="rc">${rcEsc(o.cost != null ? this._money(o.cost) : "")}</span></span>
    </div>`;
  }

  _body(m) {
    if (m.state === "loading") return `<div class="box none">${rcEsc(this._t("loading"))}</div>`;
    if (m.state === "nosource") return `<div class="box none">${rcEsc(this._t("no_source"))}</div>`;
    if (m.state === "none") return `<div class="box none">${rcEsc(this._t("nothing"))}</div>`;
    const max = m.items[0]?.kwh || 0;
    return `<div class="list">${m.items.map((i, n) => this._row(i, n + 1, max)).join("")}${m.other ? this._otherRow(m.other) : ""}</div>`;
  }

  _draw(m) {
    const c = this._config;
    const dark = this._dark();
    const night = this._night();
    if (!this._changed([m, dark, night])) return;
    const level = this._level(m);
    const pill = this._status(m);
    const head = c.illustration !== false ? this._banner(m, this._sub(m), pill) : this._classic(m, this._sub(m), pill);
    this._paint(level, head + this._tabs(m) + this._body(m), "", `${dark ? " dk" : ""}`);
    this._fitPill();
  }

  _bindAfter(root) {
    for (const b of root.querySelectorAll(".row[data-id]") || []) b.addEventListener("click", () => rcMoreInfo(this, b.dataset.id));
    for (const b of root.querySelectorAll(".tab[data-p]") || [])
      b.addEventListener("click", (ev) => {
        ev.stopPropagation();
        this._tab = b.dataset.p;
        this._sig = null;
        this._render();
      });
  }

  static styles = `
    ha-card { --c: ${ER_COLORS.none}; }
    ha-card.lvl-up { --c: ${ER_COLORS.up}; } ha-card.lvl-down { --c: ${ER_COLORS.down}; }
    ha-card.lvl-flat { --c: ${ER_COLORS.flat}; } ha-card.lvl-none { --c: ${ER_COLORS.none}; }
    .tt { flex: 1 1 0; min-width: 5ch; display: flex; flex-direction: column; }
    .tt .title { flex: none; }
    .subt { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    :host([hide-title]) .head .tt { visibility: hidden; }
    .box { margin-top: 10px; border-radius: 12px; padding: 10px 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .none { font-size: 13px; color: var(--secondary-text-color); }
    /* Tabs: outlined pills, the period shown tinted; never a filled button. */
    .tabs { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
    .tab { all: unset; cursor: pointer; box-sizing: border-box; min-height: 30px; padding: 5px 12px; border-radius: 999px; font-size: 12.5px;
           font-weight: 500; color: var(--primary-text-color); border: 1px solid var(--divider-color, rgba(127,127,127,.25)); }
    .tab.on { font-weight: 600; color: color-mix(in srgb, #c77700 70%, var(--primary-text-color, #212121));
              background: color-mix(in srgb, #c77700 10%, transparent); border-color: color-mix(in srgb, #c77700 40%, transparent); }
    ha-card.dk .tab.on { color: color-mix(in srgb, #c77700 45%, #fff); }
    .tab:hover { background: color-mix(in srgb, var(--rc-idle) 12%, transparent); }
    .tab:focus-visible, .row:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
    .price { margin-left: auto; font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; }
    .list { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
    /* A device: a calm tile (neutral background, a round tinted icon), its bar under the name. */
    .row { all: unset; box-sizing: border-box; width: 100%; display: grid; grid-template-columns: 18px 32px minmax(0, 1fr) auto;
           align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px; background: var(--secondary-background-color, rgba(127,127,127,.08)); }
    .row[data-id] { cursor: pointer; }
    .row[data-id]:hover { background: color-mix(in srgb, var(--t) 8%, var(--secondary-background-color, transparent)); }
    .row.other { background: none; --t: var(--rc-idle); }
    .rk { font-size: 13px; font-weight: 700; color: var(--secondary-text-color); text-align: center; }
    .row.first .rk { color: color-mix(in srgb, #c77700 75%, var(--primary-text-color, #212121)); }
    .ri { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; color: var(--t);
          background: color-mix(in srgb, var(--t) 14%, transparent); }
    .ri ha-icon { --mdc-icon-size: 18px; }
    .rt { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .rn { font-size: 13.5px; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row.other .rn { font-weight: 500; color: var(--secondary-text-color); }
    .bar { display: block; height: 6px; border-radius: 3px; background: color-mix(in srgb, var(--rc-idle) 16%, transparent); overflow: hidden; }
    .bar > span { display: block; height: 100%; border-radius: 3px; background: #c77700; }
    .row:not(.first) .bar > span { background: color-mix(in srgb, #c77700 45%, var(--card-background-color, #fff)); }
    .rv { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; white-space: nowrap; }
    .rkwh { font-size: 13.5px; font-weight: 700; color: var(--primary-text-color); }
    .row.other .rkwh { font-weight: 600; color: var(--secondary-text-color); }
    .rc { display: inline-flex; align-items: center; gap: 2px; font-size: 12px; color: var(--secondary-text-color); }
    .tr { --mdc-icon-size: 14px; }
    .tr-up { color: ${ER_COLORS.up}; } .tr-down { color: ${ER_COLORS.down}; } .tr-flat { color: var(--rc-idle); }
    @container (max-width: 340px) {
      .row { grid-template-columns: 14px 28px minmax(0, 1fr) auto; gap: 8px; padding: 7px 8px; }
      .ri { width: 28px; height: 28px; } .ri ha-icon { --mdc-icon-size: 16px; }
      .price { flex-basis: 100%; margin-left: 0; }
    }
    /* Illustrated header (banner): 90 px, edge to edge, the title on a warm wall, the bars and the bolt at the right, a
       10 px ground strip at the bottom. The badge's icon is in the status colour, by day and night. */
    .banner { position: relative; display: flex; height: 90px; margin: -12px -12px 0; overflow: hidden;
              background: linear-gradient(180deg, #fff6e6 0%, #fbe8c8 100%);
              --bt: #0d2a45; --bs: #3b5b78; --ic: color-mix(in srgb, var(--c) 85%, #10283f); --sw: min(180px, 46%); }
    .banner.night { background: linear-gradient(180deg, #241d14 0%, #2e251a 100%); --bt: #fff; --bs: rgba(255,255,255,.78); --ic: color-mix(in srgb, var(--c) 72%, #fff); }
    .banner .head { position: relative; z-index: 1; flex: 1; min-width: 0; height: 80px; box-sizing: border-box;
                    padding: 0 calc(var(--sw) + 4px) 0 14px; flex-wrap: nowrap; }
    .banner .head::after { content: none; }
    .banner .badge { position: relative; color: var(--ic); background: rgba(255,255,255,.7); box-shadow: inset 0 0 0 1px rgba(13,42,69,.12); }
    .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); }
    .banner .title { color: var(--bt); }
    .banner .subt { color: var(--bs); font-size: 13px; }
    .banner .room { position: absolute; right: 0; bottom: 10px; width: var(--sw); height: calc(80px * var(--sk, 1)); }
    .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; background: repeating-linear-gradient(90deg, #dcb77c 0 18px, #e7c891 18px 36px); }
    .banner.night .ground { background: repeating-linear-gradient(90deg, #4a3a25 0 18px, #56442c 18px 36px); }
    /* The mini card's expand / collapse button: 24 px, frosted, 5 px from the banner's top right corner. */
    .banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; width: 24px; height: 24px; margin: 0; color: #33506b;
                    background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); backdrop-filter: blur(4px); }
    .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
    .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
    .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }
    .banner .tt { min-width: 0; flex: 1 1 auto; }
    /* Status pill right after the title (see erPlacePill). */
    .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
    .trow > .title { flex: 0 1 auto; min-width: 0; }
    .trow > .bpill, .trow > .pill { flex: none; max-width: none; }
    :host([hide-title]) .trow .title { visibility: hidden; }
    .head:has(.trow) { flex-wrap: nowrap; }
    .head:has(.trow)::after { content: none; }
    .bpill { display: inline-flex; align-items: center; gap: 4px; min-width: 0; box-sizing: border-box; overflow: hidden;
             white-space: nowrap; padding: 1px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; line-height: 16px;
             background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #0d2a45); }
    .banner.night .bpill { background: color-mix(in srgb, var(--c) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--c) 35%, #ffffff); }
    .bdot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; }
    .bpt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    [data-wrap] .trow { display: contents; }
    [data-wrap] .trow > .bpill, [data-wrap] .trow > .pill { order: 9; align-self: flex-start; max-width: 100%; margin-top: 3px; }
    .banner[data-wrap] .trow > .bpill { max-width: calc(100cqw - 80px); }
    [data-wrap] .subt { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    [data-dot] .bpill { padding: 0; background: none; }
    [data-dot] .bpt, [data-dot] .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
    [data-dot] .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
    [data-dot] .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    @container (max-width: 200px) {
      .bpill { padding: 0; background: none; }
      .bpt, .trow > .pill .pt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
      .trow > .pill { padding: 0; width: 18px; height: 18px; justify-content: center; background: none; }
      .trow > .pill::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
    }
    /* The mini card: the banner alone. */
    ha-card.bn { padding: 0; }
    ha-card.bn > .banner { margin: 0; --sw: 86px; }
    /* Narrower cards: the bars are drawn smaller (75 %, 62 %, then 50 % of their height, their left part cropped). */
    @container (max-width: 420px) { .banner { --sw: 136px; --sk: .75; } }
    @container (max-width: 340px) { .banner { --sw: 100px; --sk: .62; } }
    @container (max-width: 260px) { .banner { --sw: 64px; --sk: .5; } }
    /* The mini card's drawing stays whole, clear of the zoom button; under 340 px the text needs the room. */
    ha-card.bn > .banner .room { right: 34px; }
    @container (max-width: 340px) { ha-card.bn > .banner .room { display: none; } ha-card.bn > .banner .head { padding-right: 34px; } }
    /* The mini card's second line: the device in the lead, plain text cut with an ellipsis. */
    .banner .evt { all: unset; display: block; min-width: 0; color: var(--bs); font-size: 13px; font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .banner .evt[data-id] { cursor: pointer; }
    .banner .evt:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; border-radius: 4px; }
  `;
}

// ── Editor ───────────────────────────────────────────────────────────────────
const erSchema = (booleans) => (lang) => [
  { name: "title", selector: { text: {} } },
  { name: "navigation_path", selector: { navigation: {} } },
  { name: "period", selector: { select: { mode: "dropdown", options: ER_PERIODS.map((value) => ({ value, label: rcT(ER_I18N, lang, `p_${value}`) })) } } },
  { name: "entities", selector: { entity: { domain: "sensor", device_class: "energy", multiple: true } } },
  { name: "total_entity", selector: { entity: { domain: "sensor", device_class: "energy" } } },
  { name: "max_items", selector: { number: { min: 1, max: 20, step: 1, mode: "box" } } },
  { name: "price", selector: { number: { min: 0, max: 10, step: 0.0001, mode: "box" } } },
  { name: "price_entity", selector: { entity: { domain: ["sensor", "input_number", "number"] } } },
  { name: "currency", selector: { text: {} } },
  ...rcBooleans(...booleans),
  {
    name: "illustration_theme",
    selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((value) => ({ value, label: rcT(ER_I18N, lang, `ed_theme_${value}`) })) } },
  },
  ...rcAdvanced(ER_I18N, lang, "language"),
];

const ER_HELPERS = ["title", "entities", "total_entity", "max_items", "price", "price_entity", "currency", "zoom", "language"];
const ER_BOOLEANS = ["show_title", "show_subtitle", "show_tabs", "show_other", "show_cost", "illustration", "animations"];

const EnergyRankingCardEditor = rcEditor({ card: EnergyRankingCard, helpers: ER_HELPERS, schema: erSchema(ER_BOOLEANS) });

rcRegister(EnergyRankingCard, EnergyRankingCardEditor, "Energy Ranking Card", "The devices that use the most energy today, this week or this month: kWh, cost, trend, and what they do not measure");

// ── Mini card ────────────────────────────────────────────────────────────────
// The ranking on two lines: the title and the trend, then the device in the lead with its share and the total cost;
// the zoom button opens the full card in place.
class EnergyRankingMiniCard extends rcMini(EnergyRankingCard, "energy-ranking-mini-card", "") {
  getCardSize() {
    return this._zoomed ? super.getCardSize() : 1;
  }

  _drawMini(m) {
    const night = this._night();
    const dark = this._dark();
    if (!this._changed(["mini", m, night, dark])) return;
    const top = m.items[0];
    const text =
      m.state !== "ok"
        ? this._t(m.state === "loading" ? "loading" : m.state === "nosource" ? "no_source" : "nothing")
        : [this._t("leads", { name: top.name }), this._t("of_total", { v: this._kwh(top.kwh), t: this._kwh(m.total.kwh) }), m.total.cost != null ? this._money(m.total.cost) : ""]
            .filter(Boolean)
            .join(" · ");
    const line = `<button class="subt evt"${top ? ` data-id="${rcEsc(top.id)}"` : ""} title="${rcEsc(text)}">${rcEsc(text)}</button>`;
    const c = this._config;
    this.shadowRoot.innerHTML = `<style>${RC_BASE_STYLES}${this.constructor.styles}</style>
      <ha-card class="lvl-${this._level(m)} bn${dark ? " dk" : ""}">${this._banner(m, line, this._status(m), true)}</ha-card>`;
    const root = this.shadowRoot;
    if (c.navigation_path) rcBindNav(root.querySelector(".head"), c.navigation_path);
    for (const el of root.querySelectorAll(".evt[data-id]")) el.addEventListener("click", () => rcMoreInfo(this, el.dataset.id));
    this._fitPill();
  }
}

const EnergyRankingMiniCardEditor = rcEditor({ card: EnergyRankingMiniCard, helpers: ER_HELPERS, schema: erSchema([...ER_BOOLEANS, "zoom"]) });

rcRegister(EnergyRankingMiniCard, EnergyRankingMiniCardEditor, "Energy Ranking Mini Card", "The device using the most energy on two lines, with the trend and the total cost, and a zoom to the full card");
