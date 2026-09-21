import test from "node:test";
import assert from "node:assert/strict";
import { BRIEFING_CSP, isBriefingDate, prepareBriefingHtml } from "./prepare.ts";

const TAGS =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank">';

test("injects viewport and base right after <head>", () => {
  const out = prepareBriefingHtml(
    "<!doctype html><html><head><title>x</title></head><body>hi</body></html>",
  );
  assert.equal(
    out,
    `<!doctype html><html><head>${TAGS}<title>x</title></head><body>hi</body></html>`,
  );
});

test("matches <head> with attributes, case-insensitively", () => {
  const out = prepareBriefingHtml('<HTML><HEAD lang="en"><title>x</title></HEAD></HTML>');
  assert.ok(out.includes(`<HEAD lang="en">${TAGS}`));
});

test("does not mistake <header> for <head>", () => {
  const out = prepareBriefingHtml("<header>Top</header><p>body</p>");
  assert.equal(out, `${TAGS}<header>Top</header><p>body</p>`);
});

test("inserts after a leading doctype when there is no <head>", () => {
  const out = prepareBriefingHtml("<!DOCTYPE html><body>hi</body>");
  assert.equal(out, `<!DOCTYPE html>${TAGS}<body>hi</body>`);
});

test("prepends to a bare fragment", () => {
  assert.equal(prepareBriefingHtml("<p>hi</p>"), `${TAGS}<p>hi</p>`);
});

test("only accepts YYYY-MM-DD", () => {
  assert.equal(isBriefingDate("2026-09-20"), true);
  assert.equal(isBriefingDate("raw"), false);
  assert.equal(isBriefingDate("2026-9-2"), false);
  assert.equal(isBriefingDate("2026-09-20/../x"), false);
});

test("CSP keeps the document sandboxed and script-free", () => {
  assert.ok(BRIEFING_CSP.startsWith("sandbox "));
  assert.ok(!BRIEFING_CSP.includes("allow-scripts"));
  assert.ok(!BRIEFING_CSP.includes("allow-same-origin"));
  assert.ok(BRIEFING_CSP.includes("default-src 'none'"));
  assert.ok(BRIEFING_CSP.includes("img-src data:"));
});
