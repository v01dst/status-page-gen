import { describe, expect, it } from "vitest";
import { renderPage, summarize, type CheckRecord, type SiteConfig } from "../src/render.js";

const site: SiteConfig = { name: "API", url: "https://api.example.com" };

function check(status: "up" | "down", day: string, latency = 100): CheckRecord {
  return { site: "API", status, latencyMs: latency, checkedAt: `${day}T12:00:00.000Z` };
}

describe("summarize", () => {
  it("reports unknown with no checks", () => {
    const s = summarize(site, []);
    expect(s.currentStatus).toBe("unknown");
    expect(s.uptime90).toBeNull();
    expect(s.days).toEqual([]);
  });

  it("computes current status and uptime", () => {
    const now = new Date("2026-09-04T12:00:00Z");
    const checks = [
      check("up", "2026-09-01"),
      check("up", "2026-09-02"),
      check("down", "2026-09-03"),
      check("up", "2026-09-04"),
    ];
    const s = summarize(site, checks, now);
    expect(s.currentStatus).toBe("up");
    expect(s.uptime90).toBe(75);
    expect(s.incidents).toEqual([{ date: "2026-09-03", count: 1 }]);
  });

  it("computes latency avg and p95", () => {
    const checks = [
      check("up", "2026-09-01", 10),
      check("up", "2026-09-02", 200),
      check("up", "2026-09-03", 100),
      check("up", "2026-09-04", 120),
    ];
    const s = summarize(site, checks);
    expect(s.avgLatencyMs).toBe(107.5);
    expect(s.p95LatencyMs).toBe(200);
  });

  it("ignores checks from other sites", () => {
    const checks = [{ ...check("down", "2026-09-01"), site: "OTHER" }];
    const s = summarize(site, checks);
    expect(s.currentStatus).toBe("unknown");
    expect(s.uptime90).toBeNull();
  });

  it("caps the day bars at 90", () => {
    const checks: CheckRecord[] = [];
    for (let d = 0; d < 120; d++) {
      const date = new Date(Date.UTC(2026, 4, 1 + d)).toISOString().slice(0, 10);
      checks.push(check("up", date));
    }
    const s = summarize(site, checks, new Date("2026-09-04T00:00:00Z"));
    expect(s.days.length).toBeLessThanOrEqual(90);
  });
});

describe("renderPage", () => {
  const s = summarize(site, [
    check("up", "2026-09-01"),
    check("down", "2026-09-02"),
    check("up", "2026-09-04"),
  ]);

  it("renders site names, links and statuses", () => {
    const html = renderPage([s], { title: "Status", generatedAt: new Date("2026-09-04T00:00:00Z") });
    expect(html).toContain("API");
    expect(html).toContain("https://api.example.com");
    expect(html).toContain("Operational");
    expect(html).toContain("All systems operational");
  });

  it("shows degraded banner when any site is down", () => {
    const down = summarize(site, [check("down", "2026-09-04")]);
    const html = renderPage([down], { title: "S", generatedAt: new Date() });
    expect(html).toContain("experiencing issues");
    expect(html).toContain("Down");
  });

  it("escapes site names", () => {
    const evil: SiteConfig = { name: '<script>alert(1)</script>', url: "https://x.com" };
    const html = renderPage([summarize(evil, [])], { title: "S", generatedAt: new Date() });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders day bars with tooltips", () => {
    const html = renderPage([s], { title: "S", generatedAt: new Date() });
    expect(html).toContain('class="bar ok"');
    expect(html).toContain('class="bar bad"');
    expect(html).toContain("2026-09-02: 0 up, 1 down");
  });

  it("shows no-data state", () => {
    const html = renderPage([summarize(site, [])], { title: "S", generatedAt: new Date() });
    expect(html).toContain("No data");
    expect(html).toContain("no checks recorded yet");
  });
});

describe("windowDays", () => {
  it("honors a custom window for uptime", () => {
    const now = new Date("2026-09-04T12:00:00Z");
    const checks = [
      check("down", "2026-07-01"),
      check("up", "2026-09-01"),
      check("up", "2026-09-02"),
      check("up", "2026-09-03"),
    ];
    const s90 = summarize(site, checks, now, 90);
    const s7 = summarize(site, checks, now, 7);
    expect(s90.uptime90).toBe(75);
    expect(s90.days).toHaveLength(4);
    expect(s7.uptime90).toBe(100);
    expect(s7.days).toHaveLength(3);
  });

  it("renders the window label in the meta line", () => {
    const s = summarize(site, [check("up", "2026-09-01")]);
    const html = renderPage([s], { title: "S", generatedAt: new Date(), windowDays: 30 });
    expect(html).toContain("30-day uptime");
  });
});
