import test from "node:test";
import assert from "node:assert/strict";
import { COLORS, contrastRatio } from "../src/config/colors.ts";

const importantColors = [
  ["ink", COLORS.ink],
  ["inkSecondary", COLORS.inkSecondary],
  ["cyan", COLORS.cyan],
  ["danger", COLORS.danger],
  ["warning", COLORS.warning],
  ["success", COLORS.success],
  ["purple", COLORS.purple],
];

for (const [name, color] of importantColors) {
  test(`${name} on paper passes WCAG AA normal-text contrast`, () => {
    assert.ok(contrastRatio(color, COLORS.paper) >= 4.5);
  });
}

test("bright paper text on primary ink passes WCAG AA", () => {
  assert.ok(contrastRatio(COLORS.paperBright, COLORS.ink) >= 4.5);
});
