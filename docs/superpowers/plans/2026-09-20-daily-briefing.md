# Daily Briefing Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A scheduled agent can publish a daily HTML briefing through an MCP tool; the app stores it, pushes a notification, and shows it at `/briefing` in a sandbox.

**Architecture:** A `briefings` table (one row per local date), a `publish_briefing` MCP tool that upserts the row and calls the existing `sendPushToAll`, and a viewer made of two server pages plus a raw route that serves the stored HTML under a `Content-Security-Policy: sandbox` header inside a sandboxed iframe. The HTML-preparation logic is a small dependency-free module with tests.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role client in MCP tools, cookie-bound client in pages), `@modelcontextprotocol/server`, zod, `web-push` (existing), Node's built-in `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-20-daily-briefing-design.md`

## Global Constraints

- One briefing per local date in `APP_TIMEZONE`, keyed by `todayKey()` from `src/lib/timezone.ts`; publishing again the same day replaces the row.
- `html`: required, max 500,000 characters. `summary`: optional, max 200. `title`: optional, max 80, defaults to "Daily briefing".
- Notification: title = `title ?? "Daily briefing"`, body = `summary ?? "Your briefing is ready"`, url = `/briefing`. The briefing is saved even if the push fails.
- Framed-document header: `Content-Security-Policy: sandbox allow-popups allow-popups-to-escape-sandbox; default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:`. Iframe attribute: `sandbox="allow-popups allow-popups-to-escape-sandbox"`. Never add `allow-scripts` or `allow-same-origin` anywhere. Remote images are blocked on purpose.
- No new env vars and no new dependencies.
- This is Next.js 16: params are async, use the global `PageProps<"/route">` and `RouteContext<"/route">` helpers, and the proxy file is `src/proxy.ts` (see `AGENTS.md`).
- UI copy is lowercase for nav labels and sentence case elsewhere, no emoji, no arrows appended to links. Reuse `Frame`, `Panel`, `PanelEmpty` from `src/app/`.
- Migrations are plain SQL files the owner runs in the Supabase SQL editor; there is no Supabase CLI setup.
- Bash in this environment blocks inline HTTP calls (`curl`, `node -e` with `fetch`). Run HTTP checks with the `ctx_execute` tool (`language: "javascript"`), which can read `D:/NBSCalendar/.env.local` with `fs`.
- Commit messages end with the line `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

## File Structure

- Create `supabase/migrations/0006_briefings.sql`: the table and RLS.
- Create `src/lib/briefing/prepare.ts`: pure helpers (`BRIEFING_CSP`, `isBriefingDate`, `prepareBriefingHtml`). No imports, so Node can run it directly.
- Create `src/lib/briefing/prepare.test.mjs`: tests for those helpers.
- Modify `package.json`: add a `test` script.
- Modify `src/lib/mcp/tools.ts`: register `publish_briefing`.
- Create `src/app/briefing/view.tsx`: shared server component that renders the latest or a specific briefing plus the past-briefings list.
- Create `src/app/briefing/page.tsx` and `src/app/briefing/[date]/page.tsx`: thin pages over `view.tsx`.
- Create `src/app/briefing/raw/[date]/route.ts`: serves the stored HTML with the sandbox headers.
- Modify `src/app/globals.css`: `.briefing-frame` style.
- Modify `src/app/nav.tsx`: "briefing" link.
- Modify `README.md`: short section.

---

### Task 1: Briefings table and HTML-preparation helpers

**Files:**
- Create: `supabase/migrations/0006_briefings.sql`
- Create: `src/lib/briefing/prepare.ts`
- Test: `src/lib/briefing/prepare.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: table `briefings(id uuid pk, briefing_date date unique, title text, summary text, html text, published_at timestamptz)`; from `src/lib/briefing/prepare.ts`: `BRIEFING_CSP: string`, `isBriefingDate(value: string): boolean`, `prepareBriefingHtml(html: string): string`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/briefing/prepare.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/briefing/prepare.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `prepare.ts`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/briefing/prepare.ts` (no imports, only erasable TypeScript syntax, so Node can run it directly):

```ts
const HEAD_TAGS =
  '<meta name="viewport" content="width=device-width, initial-scale=1"><base target="_blank">';

// The briefing HTML is untrusted (an agent builds it after reading email and
// web pages), so the framed document gets a CSP `sandbox` (opaque origin, no
// scripts, no forms) on top of the iframe's own sandbox attribute.
export const BRIEFING_CSP = [
  "sandbox allow-popups allow-popups-to-escape-sandbox",
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  "img-src data:",
].join("; ");

export function isBriefingDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

// Adds a viewport tag (phone layout) and <base target="_blank"> (outbound
// links open in a new tab instead of navigating the framed document).
export function prepareBriefingHtml(html: string): string {
  const headOpen = /<head(\s[^>]*)?>/i;
  if (headOpen.test(html)) {
    return html.replace(headOpen, (match) => match + HEAD_TAGS);
  }

  // Inserting before a doctype would push the page into quirks mode.
  const doctype = html.match(/^\s*<!doctype[^>]*>/i);
  if (doctype) {
    return doctype[0] + HEAD_TAGS + html.slice(doctype[0].length);
  }

  return HEAD_TAGS + html;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test src/lib/briefing/prepare.test.mjs`
Expected: 7 tests pass, 0 fail. A `MODULE_TYPELESS_PACKAGE_JSON` warning is expected and harmless.

- [ ] **Step 5: Add the `test` script and the migration**

In `package.json`, add to `"scripts"` (after `"lint": "eslint"`, adding a comma to the `lint` line):

```json
    "test": "node --test \"src/**/*.test.mjs\""
```

Create `supabase/migrations/0006_briefings.sql`:

```sql
-- One briefing per local date, published by the scheduled daily-briefing
-- agent through the publish_briefing MCP tool and shown at /briefing.
create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  briefing_date date not null unique,
  title text not null default 'Daily briefing',
  summary text,
  html text not null,
  published_at timestamptz not null default now()
);

alter table briefings enable row level security;

create policy "authenticated full access" on briefings
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
```

- [ ] **Step 6: Run the suite and lint**

Run: `npm test`
Expected: 7 pass. If the quoted glob is not picked up by `npm` on Windows, keep the script as written and fall back to running the single file from Step 4.

Run: `npm run lint`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0006_briefings.sql src/lib/briefing package.json
git commit -m "Add briefings table and sandboxed-HTML helpers

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Checkpoint (blocks Task 2): owner applies the migration**

Ask the owner to run the contents of `supabase/migrations/0006_briefings.sql` in the Supabase SQL editor and wait for confirmation before starting Task 2.

---

### Task 2: `publish_briefing` MCP tool

**Files:**
- Modify: `src/lib/mcp/tools.ts` (imports at the top; new tool at the end of `registerTools`)

**Interfaces:**
- Consumes: table `briefings` (Task 1, applied by the owner); `todayKey(): string` from `@/lib/timezone`; `sendPushToAll(payload: { title: string; body: string; url?: string }): Promise<number>` from `@/lib/push/send`; existing `textResult`, `errorResult`, and `admin` in `tools.ts`.
- Produces: MCP tool `publish_briefing({ html: string; summary?: string; title?: string })` returning text `Published briefing for <YYYY-MM-DD>; notified <n> device(s).`

- [ ] **Step 1: Update the imports**

In `src/lib/mcp/tools.ts`, replace:

```ts
import { APP_TIMEZONE, localDayRange } from "@/lib/timezone";
```

with:

```ts
import { APP_TIMEZONE, localDayRange, todayKey } from "@/lib/timezone";
import { sendPushToAll } from "@/lib/push/send";
```

- [ ] **Step 2: Register the tool**

At the end of `registerTools`, replace:

```ts
        return textResult(`Logged brain dump (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
```

with:

```ts
        return textResult(`Logged brain dump (id: ${data.id}).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "publish_briefing",
    {
      description:
        "Publish today's daily briefing (one self-contained HTML page) to the app and " +
        "notify the owner's devices. Replaces any briefing already published today. " +
        "Do not include scripts or remote images; they will not load.",
      inputSchema: z.object({
        html: z.string().min(1).max(500_000),
        summary: z
          .string()
          .max(200)
          .optional()
          .describe("One line shown as the notification body"),
        title: z.string().max(80).optional(),
      }),
    },
    async ({ html, summary, title }) => {
      try {
        const date = todayKey();
        const { error } = await admin.from("briefings").upsert(
          {
            briefing_date: date,
            title: title ?? "Daily briefing",
            summary: summary ?? null,
            html,
            published_at: new Date().toISOString(),
          },
          { onConflict: "briefing_date" },
        );
        if (error) throw new Error(error.message);

        let notified = 0;
        try {
          notified = await sendPushToAll({
            title: title ?? "Daily briefing",
            body: summary ?? "Your briefing is ready",
            url: "/briefing",
          });
        } catch (pushError) {
          console.error("briefing push failed:", pushError);
        }

        return textResult(`Published briefing for ${date}; notified ${notified} device(s).`);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}
```

- [ ] **Step 3: Build and lint**

Run: `npm run build`
Expected: compiles, TypeScript passes, route list unchanged.

Run: `npm run lint`
Expected: no output.

- [ ] **Step 4: Start the dev server**

If nothing is listening on port 3000, run in the background:

```bash
npm run dev > "C:/Users/hacke/AppData/Local/Temp/claude/D--NBSCalendar/b1836ff3-4354-4b98-999a-7ca8a8f1484f/scratchpad/dev.log" 2>&1 &
```

Expected in the log: `Ready`.

- [ ] **Step 5: Exercise the tool over JSON-RPC**

Run with `ctx_execute` (`language: "javascript"`):

```js
const fs = require("fs");
let key;
for (const line of fs.readFileSync("D:/NBSCalendar/.env.local", "utf8").split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq !== -1 && line.slice(0, eq) === "MCP_API_KEY") key = line.slice(eq + 1).replace(/^"|"$/g, "");
}

async function rpc(id, method, params) {
  const res = await fetch("http://localhost:3000/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await res.text();
  const match = text.match(/data:\s*(\{.*\})/s);
  return JSON.parse(match ? match[1] : text);
}

(async () => {
  const list = await rpc(1, "tools/list");
  console.log("has publish_briefing:", list.result.tools.some((t) => t.name === "publish_briefing"));

  const first = await rpc(2, "tools/call", {
    name: "publish_briefing",
    arguments: {
      html: "<!doctype html><html><head><title>t</title></head><body><h1>Plan test one</h1></body></html>",
      summary: "Plan test briefing",
    },
  });
  console.log("first:", first.result.content[0].text, "isError:", first.result.isError);

  const second = await rpc(3, "tools/call", {
    name: "publish_briefing",
    arguments: {
      html: "<!doctype html><html><head><title>t</title></head><body><h1>Plan test two</h1></body></html>",
    },
  });
  console.log("second:", second.result.content[0].text, "isError:", second.result.isError);
})();
```

Expected: `has publish_briefing: true`; both results read `Published briefing for <today>; notified <n> device(s).` with `isError` undefined; the owner's devices show a "Daily briefing" notification.

- [ ] **Step 6: Confirm the second call replaced the first**

Run:

```bash
node -e '
const fs = require("fs");
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq !== -1) process.env[line.slice(0, eq)] = line.slice(eq + 1).replace(/^"|"$/g, "");
}
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from("briefings").select("briefing_date, title, summary, html").then(({ data, error }) => {
  console.log(error ?? data.map((r) => [r.briefing_date, r.title, r.summary, r.html.includes("Plan test two")]));
});
'
```

Expected: exactly one row for today, title `Daily briefing`, summary `null` (the second call omitted it), and `true` for the "Plan test two" check.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mcp/tools.ts
git commit -m "Add publish_briefing MCP tool

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Briefing viewer (pages, sandboxed raw route, nav link)

**Files:**
- Create: `src/app/briefing/view.tsx`
- Create: `src/app/briefing/page.tsx`
- Create: `src/app/briefing/[date]/page.tsx`
- Create: `src/app/briefing/raw/[date]/route.ts`
- Modify: `src/app/globals.css` (add `.briefing-frame` inside `@layer components`)
- Modify: `src/app/nav.tsx`

**Interfaces:**
- Consumes: `BRIEFING_CSP`, `isBriefingDate`, `prepareBriefingHtml` from `@/lib/briefing/prepare` (Task 1); table `briefings`; `Frame` (`../frame`, prop `wide`), `Panel`/`PanelEmpty` (`../panel`).
- Produces: routes `/briefing`, `/briefing/[date]`, `/briefing/raw/[date]`; `BriefingView({ date }: { date: string | null })` in `src/app/briefing/view.tsx`.

- [ ] **Step 1: Create the shared view**

Create `src/app/briefing/view.tsx`:

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Frame from "../frame";
import { Panel, PanelEmpty } from "../panel";

export default async function BriefingView({ date }: { date: string | null }) {
  const supabase = await createClient();

  const { data: recent } = await supabase
    .from("briefings")
    .select("briefing_date, title")
    .order("briefing_date", { ascending: false })
    .limit(14);

  const targetDate = date ?? recent?.[0]?.briefing_date ?? null;

  if (!targetDate) {
    return (
      <Frame wide>
        <h1 className="mb-6 text-2xl text-ink">Briefing</h1>
        <Panel title="briefing">
          <PanelEmpty>No briefing yet</PanelEmpty>
        </Panel>
      </Frame>
    );
  }

  const { data: briefing } = await supabase
    .from("briefings")
    .select("title")
    .eq("briefing_date", targetDate)
    .maybeSingle();

  if (!briefing) notFound();

  return (
    <Frame wide>
      <h1 className="mb-1 text-2xl text-ink">{briefing.title}</h1>
      <p className="nums mb-6 text-ink-faint">{targetDate}</p>

      <iframe
        title={`Briefing for ${targetDate}`}
        src={`/briefing/raw/${targetDate}`}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        className="briefing-frame"
      />

      <Panel title="past briefings">
        {recent?.map((b) => (
          <Link href={`/briefing/${b.briefing_date}`} className="row" key={b.briefing_date}>
            <span className="nums meta shrink-0">{b.briefing_date}</span>
            <span
              className={`title ${b.briefing_date === targetDate ? "text-oxblood-bright" : ""}`}
            >
              {b.title}
            </span>
          </Link>
        ))}
      </Panel>
    </Frame>
  );
}
```

- [ ] **Step 2: Create the two pages**

Create `src/app/briefing/page.tsx`:

```tsx
import BriefingView from "./view";

export default function BriefingPage() {
  return <BriefingView date={null} />;
}
```

Create `src/app/briefing/[date]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { isBriefingDate } from "@/lib/briefing/prepare";
import BriefingView from "../view";

export default async function BriefingDatePage(props: PageProps<"/briefing/[date]">) {
  const { date } = await props.params;
  if (!isBriefingDate(date)) notFound();
  return <BriefingView date={date} />;
}
```

- [ ] **Step 3: Create the raw route**

Create `src/app/briefing/raw/[date]/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";
import { BRIEFING_CSP, isBriefingDate, prepareBriefingHtml } from "@/lib/briefing/prepare";

// Serves the stored briefing HTML as its own document, only ever loaded inside
// the sandboxed iframe on /briefing. RLS through the cookie-bound client keeps
// it behind the owner's session even if the proxy matcher changes.
export async function GET(_request: Request, ctx: RouteContext<"/briefing/raw/[date]">) {
  const { date } = await ctx.params;
  if (!isBriefingDate(date)) return new Response("Not found", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("briefings")
    .select("html")
    .eq("briefing_date", date)
    .maybeSingle();

  if (!data) return new Response("Not found", { status: 404 });

  return new Response(prepareBriefingHtml(data.html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": BRIEFING_CSP,
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Step 4: Add the frame style and the nav link**

In `src/app/globals.css`, inside `@layer components`, immediately before the final closing `}` of that layer (after the `.cal-entry.cal-more { ... }` rule), add:

```css
  /* sandboxed briefing document */
  .briefing-frame {
    display: block;
    width: 100%;
    height: 75vh;
    min-height: 480px;
    margin-bottom: 18px;
    border: 1px solid var(--panel-line);
    background: var(--void);
  }
```

In `src/app/nav.tsx`, replace:

```tsx
          <Link href="/inbox" className="hover:text-oxblood-bright">
            inbox
          </Link>
```

with:

```tsx
          <Link href="/inbox" className="hover:text-oxblood-bright">
            inbox
          </Link>
          <Link href="/briefing" className="hover:text-oxblood-bright">
            briefing
          </Link>
```

- [ ] **Step 5: Build and lint**

Run: `npm run build`
Expected: compiles; the route list now includes `/briefing`, `/briefing/[date]`, and `/briefing/raw/[date]`.

Run: `npm run lint`
Expected: no output.

- [ ] **Step 6: Check that the routes are gated when signed out**

Restart the dev server so it picks up the new routes, then run with `ctx_execute` (`language: "javascript"`):

```js
(async () => {
  const today = new Date().toISOString().slice(0, 10);
  for (const path of ["/briefing", `/briefing/${today}`, `/briefing/raw/${today}`]) {
    const res = await fetch("http://localhost:3000" + path, { redirect: "manual" });
    console.log(path, "->", res.status, res.headers.get("location"));
  }
})();
```

Expected: each line shows `307` with a location ending in `/login`.

- [ ] **Step 7: Commit**

```bash
git add src/app/briefing src/app/globals.css src/app/nav.tsx
git commit -m "Add /briefing viewer with sandboxed raw route

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Docs, deploy, and production check

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything from Tasks 1-3.
- Produces: the live feature at `https://nbscalendar.online/briefing`.

- [ ] **Step 1: Document it in the README**

In `README.md`, replace the line `## Design` with:

```markdown
## Daily briefing

A scheduled agent (for example a Claude Desktop scheduled task) can publish a
daily HTML briefing through the `publish_briefing` MCP tool
(`html`, optional `summary` and `title`). The app stores one briefing per
local date, sends a push notification, and shows it at `/briefing` inside a
sandboxed iframe (`Content-Security-Policy: sandbox`, no scripts, no remote
images). Run `supabase/migrations/0006_briefings.sql` once in the Supabase SQL
editor. After adding a tool, reconnect the connector in Claude so it sees it.

## Design
```

- [ ] **Step 2: Final build, lint, and tests**

Run: `npm test && npm run build && npm run lint`
Expected: 7 tests pass, build succeeds, lint prints nothing.

- [ ] **Step 3: Deploy**

Run: `npx vercel --prod --yes`
Expected: a JSON block with `"readyState": "READY"`. If it returns `"message": "Not authorized"`, run it once more (a transient failure seen before).

- [ ] **Step 4: Publish a test briefing to production**

Run with `ctx_execute` (`language: "javascript"`), using the same `rpc` helper as Task 2 Step 5 but with the URL `https://nbscalendar.online/api/mcp` and this call:

```js
rpc(1, "tools/call", {
  name: "publish_briefing",
  arguments: {
    html:
      "<!doctype html><html><head><title>Test</title><style>body{background:#0d0a0a;color:#ece4e2;font-family:monospace;padding:16px}a{color:#c23f56}</style></head><body><h1>Test briefing</h1><p>If you can read this on your phone, the sandbox works.</p><p><a href=\"https://example.com\">outbound link (should open a new tab)</a></p><script>document.body.innerHTML='SCRIPT RAN'</script></body></html>",
    summary: "Test briefing: open to check the layout",
  },
}).then((r) => console.log(r.result.content[0].text));
```

Expected: `Published briefing for <today>; notified <n> device(s).`

- [ ] **Step 5: Owner verifies on desktop and iPhone**

Ask the owner to: tap the notification (it should open `/briefing`); confirm the test briefing shows dark styling and the "past briefings" list; confirm the page does NOT say `SCRIPT RAN` (the embedded script must be blocked); tap the outbound link and confirm it opens in a new tab.

- [ ] **Step 6: Remove the test briefing**

Run:

```bash
node -e '
const fs = require("fs");
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const eq = line.indexOf("=");
  if (eq !== -1) process.env[line.slice(0, eq)] = line.slice(eq + 1).replace(/^"|"$/g, "");
}
const { createClient } = require("@supabase/supabase-js");
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
s.from("briefings").delete().ilike("summary", "Test briefing%").then(({ error }) => console.log(error ?? "removed"));
'
```

Expected: `removed`.

- [ ] **Step 7: Hand the owner the prompt change**

Tell the owner to replace the "save to [FOLDER]/briefing-YYYY-MM-DD.html … give me the path" line in the scheduled prompt with: `Call publish_briefing with the full HTML and a one-line summary (which becomes the phone notification).` Keep the read-only rule, with `publish_briefing` as the single exception, and remind them to reconnect the NBS Calendar connector if Desktop does not list the new tool.

- [ ] **Step 8: Commit and push**

```bash
git add README.md docs/superpowers/specs/2026-09-20-daily-briefing-design.md docs/superpowers/plans/2026-09-20-daily-briefing.md
git commit -m "Document daily briefing; add spec and plan

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin main
```
