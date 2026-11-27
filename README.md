# ha-energy-ranking-card

[![Marketplace](https://img.shields.io/badge/Marketplace-Custom-41BDF5.svg)](https://www.home-assistant.io/integrations/marketplace/)
[![HACS Validation](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/validate.yml)
[![Lint](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/lint.yml/badge.svg)](https://github.com/juju35/ha-energy-ranking-card/actions/workflows/lint.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-energy-ranking-card)](https://github.com/juju35/ha-energy-ranking-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/juju35/ha-energy-ranking-card/blob/main/LICENSE)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black)](https://buymeacoffee.com/julienstep9)

<p align="center"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/icon.svg" alt="Energy Ranking Card" width="120"></p>

<p align="center">
  <a href="https://www.home-assistant.io/docs/energy/"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/home_assistant.png" alt="Home Assistant Energy" height="36"></a>&nbsp;&nbsp;
  <a href="https://www.home-assistant.io/integrations/nordpool/"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/nordpool.png" alt="Nord Pool" height="36"></a>&nbsp;&nbsp;
  <a href="https://www.home-assistant.io/integrations/tibber/"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/tibber.png" alt="Tibber" height="36"></a>&nbsp;&nbsp;
  <a href="https://github.com/delphiki/hass-tarif-edf"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/tarif_edf.png" alt="Tarif EDF" height="36"></a>&nbsp;&nbsp;
  <a href="https://github.com/hekmon/rtetempo"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/rtetempo.png" alt="RTE Tempo" height="36"></a>&nbsp;&nbsp;
  <a href="https://github.com/MyElectricalData/myelectricaldata_import"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/myelectricaldata.png" alt="MyElectricalData" height="36"></a>&nbsp;&nbsp;
  <a href="https://www.home-assistant.io/integrations/zha/"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/zha.png" alt="ZHA" height="36"></a>&nbsp;&nbsp;
  <a href="https://www.home-assistant.io/integrations/shelly/"><img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/shelly.png" alt="Shelly" height="36"></a>
</p>

A Lovelace card that **ranks the devices using the most energy** today, this week or this month: their kWh, their cost, how they compare with the period before, and what they do not measure.

[![Open your Home Assistant instance and open a repository inside the Marketplace.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-energy-ranking-card&category=plugin)

| Card | Type | What it shows |
|---|---|---|
| [Energy ranking](#screenshots) | `custom:energy-ranking-card` | The biggest consumers of the day, the week or the month, with their kWh, cost and trend, and the unmeasured remainder. |
| [Energy ranking mini](#energy-ranking-mini) | `custom:energy-ranking-mini-card` | The device in the lead, the total and the trend on two lines, with a zoom to the full card. |

| Today | This week |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-day.png" alt="Today" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-week.png" alt="This week" width="400"> |

## Features

- **The devices ranked** by their energy over the period, with a bar against the first, their kWh and their cost
- **A trend for each one**: up, down or stable against the same stretch of the period before (today against yesterday up to the same hour, this week against last week up to the same point, this month against last month)
- **Day / Week / Month** tabs right on the card
- **Other and unmeasured**: the grid import minus what the devices shown measure (the devices beyond `max_items` included)
- **Costs** at the Energy dashboard's price, a fixed price or a price entity; with a price entity that has statistics, each hour at its own price (variable tariffs, spot prices). Prices in €/MWh or cents per kWh are converted
- **No setup**: the devices, the grid import and the price come from the Energy dashboard; a list of sensors can replace them
- **Illustrated header**: bars rising to the right, the tallest in the status colour (amber when up, green when down, blue when stable), and a lightning bolt that flickers; the dark theme dims the room
- **Mini card**: the title and the trend, then the device in the lead with its share of the total and the cost; its zoom button opens the full card in place
- **Tap a device** to open its details
- **Loads only when seen**: the statistics are asked for once the card is on screen, then every 5 minutes
- Visual editor for both cards, light and dark themes, 22 languages, no external dependency

## Supported integrations

The card reads Home Assistant's long-term statistics of any energy sensor (kWh, Wh or MWh), and any price entity. Among them:

| | Integration | What the cards show |
|:---:|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/home_assistant.png" alt="" height="16"> | [Energy dashboard](https://www.home-assistant.io/docs/energy/) (built in) | Its individual devices, its grid import and its price, used by default |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/home_assistant.png" alt="" height="16"> | [Utility Meter](https://www.home-assistant.io/integrations/utility_meter/) (built in) | Energy sensors made from any power or energy reading |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/shelly.png" alt="Shelly" height="16"> | [Shelly](https://www.home-assistant.io/integrations/shelly/) (built in) | Plugs and meters measuring each device |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/zha.png" alt="ZHA" height="16"> | [ZHA](https://www.home-assistant.io/integrations/zha/) (built in) | Zigbee plugs, and the Linky meter through Lixee's ZLinky as the total |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/myelectricaldata.png" alt="MyElectricalData" height="16"> | [MyElectricalData](https://github.com/MyElectricalData/myelectricaldata_import) (Marketplace) | The Linky meter's consumption as the total |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/nordpool.png" alt="Nord Pool" height="16"> | [Nord Pool](https://www.home-assistant.io/integrations/nordpool/) (built in) | Hourly spot prices (in €/MWh, converted) |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/tibber.png" alt="Tibber" height="16"> | [Tibber](https://www.home-assistant.io/integrations/tibber/) (built in) | The hourly electricity price |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/tarif_edf.png" alt="Tarif EDF" height="16"> | [Tarif EDF](https://github.com/delphiki/hass-tarif-edf) (Marketplace) | The EDF price per kWh (Base, Off-peak, Tempo) |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/images/rtetempo.png" alt="RTE Tempo" height="16"> | [RTE Tempo](https://github.com/hekmon/rtetempo) (Marketplace) | The Tempo price of the day's colour |

## Installation

### Via the Marketplace (recommended)

Click the button below to add the repository directly:

[![Add to the Marketplace](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/marketplace_repository/?owner=juju35&repository=ha-energy-ranking-card&category=plugin)

Or manually:

1. Open **Settings → Marketplace → Add from link** (top right; this needs a GitHub account connected)
2. Add `https://github.com/juju35/ha-energy-ranking-card` — Type: **Dashboard**
3. Open **Energy Ranking Card** and click **Install**
4. Clear your browser cache and refresh

The Marketplace registers the dashboard resource for you.

### Manual

1. Download `ha-energy-ranking-card.js` and the `ha-energy-ranking-card.i18n.*.js` translation files from the [latest release](https://github.com/juju35/ha-energy-ranking-card/releases/latest)
2. Copy them all to `/config/www/` (without the translation files, the cards show in English)
3. Go to **Settings → Dashboards → Resources** → Add resource:
   - URL: `/local/ha-energy-ranking-card.js`
   - Type: **JavaScript Module**
4. Clear your browser cache and refresh

## Configuration

Every option is in the visual editor. In YAML:

```yaml
# The Energy dashboard's devices, grid import and price: nothing to set
type: custom:energy-ranking-card

# Sensors of your own, the Linky meter as the total, an hourly price
type: custom:energy-ranking-card
period: week
entities:
  - sensor.water_heater_energy
  - entity: sensor.plug_3_energy
    name: Washing machine
total_entity: sensor.linky_energy
price_entity: sensor.nordpool_kwh_fr_eur
max_items: 6

# Two lines on a phone dashboard
type: custom:energy-ranking-mini-card
```

| Option | Type | Default | Description |
|---|---|---|---|
| `title` | string | `Top consumers` | Both: card title |
| `show_title` | boolean | `true` | Both: show the title |
| `show_subtitle` | boolean | `true` | Both: the period, the total kWh and the total cost under the title |
| `navigation_path` | string | | Both: a tap on the header opens this dashboard path |
| `period` | string | `day` | Both: the period shown first — `day`, `week` or `month` |
| `entities` | list | the Energy dashboard's devices | Both: energy sensors to rank; an item can be `{ entity, name }` (the name: YAML only) |
| `total_entity` | string | the Energy dashboard's grid import | Both: the total consumption, whose part the devices do not measure is the *Other* line |
| `max_items` | number | `5` | Both: the devices listed (1 to 20); the others count in *Other* |
| `price` | number | the Energy dashboard's price | Both: a fixed price per kWh |
| `price_entity` | string | | Both: a price entity (sensor, `input_number`, `number`); with its statistics, each hour at its own price |
| `currency` | string | Home Assistant's | Both: the currency of the costs (`EUR`, `USD`…) |
| `show_tabs` | boolean | `true` | Both: the Day / Week / Month tabs |
| `show_other` | boolean | `true` | Both: the *Other and unmeasured* line |
| `show_cost` | boolean | `true` | Both: the costs |
| `illustration` | boolean | `true` | Both: the illustrated header (`false`: the classic header) |
| `illustration_theme` | string | `auto` | Both: `auto` (follows the Home Assistant theme: night with a dark theme, day with a light theme), `day` or `night` |
| `animations` | boolean | `true` | Both: the bars and the bolt |
| `zoom` | boolean | `true` | Mini card: the zoom button |
| `language` | string | Home Assistant's | Advanced: one of the [languages](#translations) |

## Screenshots

| Today, more than yesterday | This week, less than last week | This month, about the same |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-day.png" alt="Today" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-week.png" alt="This week" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-month.png" alt="This month" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-day-dark.png" alt="Today, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-week-dark.png" alt="This week, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-month-dark.png" alt="This month, dark" width="400"> |

| Nothing measured | Narrow | Classic header |
|---|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-none.png" alt="Nothing measured" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-narrow.png" alt="Narrow" width="300"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-classic.png" alt="Classic header" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-none-dark.png" alt="Nothing measured, dark" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-narrow-dark.png" alt="Narrow, dark" width="300"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-classic-dark.png" alt="Classic header, dark" width="400"> |

**Bars animation**: the bars rise and fall in turn and the bolt flickers (still with `animations: false`, or when the system asks for reduced motion).

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-day.gif" alt="Bars animation" width="400"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-day-dark.gif" alt="Bars animation, dark" width="400"> |

### Energy ranking mini

| Today | Zoomed in |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-day.png" alt="Mini, today" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-zoom.png" alt="Mini, zoomed in" width="400"> |
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-day-dark.png" alt="Mini, today, dark" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-zoom-dark.png" alt="Mini, zoomed in, dark" width="400"> |

**Mini card animation**: its three bars and the bolt, at the right of the banner.

| Light | Dark |
|---|---|
| <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-day.gif" alt="Mini card animation" width="320"> | <img src="https://raw.githubusercontent.com/juju35/ha-energy-ranking-card/main/screenshots/er-mini-day-dark.gif" alt="Mini card animation, dark" width="320"> |

## How it works

- **Sources**: by default the Energy dashboard's settings (`energy/get_prefs`): its individual devices, its grid import and its price; `entities`, `total_entity`, `price` and `price_entity` replace them
- **Statistics**: Home Assistant's long-term statistics (`recorder/statistics_during_period`), hourly, in kWh, from the start of the previous period to now — asked for once the card is on screen, again every 5 minutes and at once for another tab
- **Periods**: today from midnight, this week from its first day (Home Assistant's first weekday setting, Monday otherwise), this month from the 1st; the trend compares with the same stretch of the period before (yesterday up to the same hour, and so on), cut at the previous month's end
- **Trend**: more than 5 % up is *up*, more than 5 % down is *down*, in between *stable*; a device with nothing before is *new*
- **Cost**: each hour's kWh at that hour's price — the mean of the price entity's statistics, else the last one known, else its state or the fixed price; a price in €/MWh is divided by 1000, in cents by 100
- **Other and unmeasured**: the total (the grid import, or `total_entity`) minus the devices listed; never below zero (solar production can make the grid import smaller than what the devices use)
- **Header icon**: in the status colour — amber when the total is up, green when it is down, blue when stable, grey with no data
- **Read only**: the card calls no action

## Development

```bash
npm install
npm run build        # stamps the version of package.json into dist/ha-energy-ranking-card.js
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests
npm run screenshots  # renders the cards with a mock Energy dashboard into screenshots/ (and the GIFs, needs ffmpeg)
```

The source is split into ES modules under `src/shared/` (entry `src/shared/index.js`); `npm run build` assembles them (`scripts/bundle.mjs`) into the single file the Marketplace serves.

`dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built files to the release, which is where the Marketplace installs them from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](https://github.com/juju35/ha-energy-ranking-card/blob/main/CHANGELOG.md)
3. Merge a `feat` or `fix` pull request into `main`: the **Release** workflow builds the card, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-energy-ranking-card.js` and its translation files

## Translations

The card auto-detects the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |
| Deutsch | `de` |
| Español | `es` |
| Српски | `sr` |
| Srpski (latinica) | `sr-Latn` |
| Italiano | `it` |
| Nederlands | `nl` |
| Português (Portugal) | `pt` |
| Polski | `pl` |
| Română | `ro` |
| Dansk | `da` |
| Svenska | `sv` |
| Български | `bg` |
| Русский | `ru` |
| Українська | `uk` |
| Magyar | `hu` |
| Slovenčina | `sk` |
| Čeština | `cs` |
| Slovenščina | `sl` |
| Latviešu | `lv` |
| Ελληνικά | `el` |

Contributions for additional languages are welcome!

## License

[MIT](https://github.com/juju35/ha-energy-ranking-card/blob/main/LICENSE)

## Support

If you find this project useful, you can support its development:

<a href="https://buymeacoffee.com/julienstep9"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me a Coffee" height="50"></a>
