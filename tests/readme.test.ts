import test from "node:test";
import assert from "node:assert/strict";
import { replaceSectionContent } from "../src/readme.js";

test("replaceSectionContent updates only marker body", () => {
  const input = [
    "# Title",
    "<!--START_SECTION:badges-->",
    "old",
    "<!--END_SECTION:badges-->",
    "footer",
  ].join("\n");

  const output = replaceSectionContent(input, "badges", "new");

  assert.equal(
    output,
    [
      "# Title",
      "<!--START_SECTION:badges-->",
      "new",
      "<!--END_SECTION:badges-->",
      "footer",
    ].join("\n"),
  );
});

test("replaceSectionContent throws when markers are missing", () => {
  assert.throws(() => {
    replaceSectionContent("# Title", "badges", "new");
  }, /Markers for section "badges" were not found/);
});
