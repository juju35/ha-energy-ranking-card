// Renders the energy ranking cards with the mock Energy dashboard and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/energy.mjs
import { pair, shoot } from "./harness.mjs";
import { pageScript, setup } from "./mock.mjs";

// Stills: animations: false stops the bars and the bolt, so a capture only changes when the card does.
const still = (file, s) => pair(file, { ...s, config: { animations: false, ...s.config } });
// Each capture by its full name (screenshots/<name>.png and <name>-dark.png): <prefix>-<file>.
const SHOTS = [
  ["er-day", "energy-ranking-card", { scene: "day" }],
  ["er-week", "energy-ranking-card", { scene: "week" }],
  ["er-month", "energy-ranking-card", { scene: "month" }],
  ["er-none", "energy-ranking-card", { scene: "none" }],
  ["er-narrow", "energy-ranking-card", { scene: "day", width: 300 }],
  ["er-classic", "energy-ranking-card", { scene: "day", config: { illustration: false } }],
  ["er-mini-day", "energy-ranking-mini-card", { scene: "day" }],
  ["er-mini-zoom", "energy-ranking-mini-card", { scene: "day", open: ".zoom", zoom: true }],
];
for (const [name, tag, s] of SHOTS) {
  const prefix = name.startsWith("er-mini-") ? "er-mini" : "er";
  const file = name.slice(prefix.length + 1);
  await shoot({ prefix, tag, shots: still(file, s), setup, ws: pageScript() });
}
