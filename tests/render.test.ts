import test from "node:test";
import assert from "node:assert/strict";
import { renderBadges } from "../src/render.js";
import type { Badge } from "../src/credly.js";

const badges: Badge[] = [
  {
    id: "two",
    issuedAtDate: "2026-05-01",
    imageUrl: "https://example.com/two.png",
    name: "B & <Badge>",
  },
  {
    id: "one",
    issuedAtDate: "2026-04-01",
    imageUrl: "https://example.com/one.png",
    name: "A Badge",
  },
];

test("renderBadges sorts by latest and escapes HTML", () => {
  const output = renderBadges(badges, {
    badgeWidth: 120,
    emptyMessage: "No badges found.",
    maxBadges: 0,
    sort: "LATEST",
  });

  assert.match(output, /badges\/two/);
  assert.match(output, /B &amp; &lt;Badge&gt;/);
});

test("renderBadges limits result count", () => {
  const output = renderBadges(badges, {
    badgeWidth: 100,
    emptyMessage: "No badges found.",
    maxBadges: 1,
    sort: "NAME",
  });

  assert.match(output, /badges\/one/);
  assert.doesNotMatch(output, /badges\/two/);
});

test("renderBadges returns placeholder when empty", () => {
  const output = renderBadges([], {
    badgeWidth: 100,
    emptyMessage: "No badges found.",
    maxBadges: 0,
    sort: "LATEST",
  });

  assert.equal(output, "No badges found.");
});
