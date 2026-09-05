export interface SiteConfig {
  name: string;
  url: string;
}

export interface CheckRecord {
  site: string;
  status: "up" | "down";
  latencyMs: number | null;
  checkedAt: string;
}

export interface SiteDay {
  date: string;
  up: number;
  down: number;
}

export interface SiteSummary {
  name: string;
  url: string;
  currentStatus: "up" | "down" | "unknown";
  lastCheckAt: string | null;
  uptime90: number | null;
  avgLatencyMs: number | null;
  p95LatencyMs: number | null;
  days: SiteDay[];
  incidents: { date: string; count: number }[];
}

export function summarize(
  site: SiteConfig,
  checks: CheckRecord[],
  now: Date = new Date(),
  windowDays: number = 90
): SiteSummary {
  const mine = checks
    .filter((c) => c.site === site.name)
    .sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));

  const current = mine[mine.length - 1];

  const cutoff = new Date(now.getTime() - windowDays * 86400_000).toISOString();
  const recent = mine.filter((c) => c.checkedAt >= cutoff);
  const ups = recent.filter((c) => c.status === "up").length;
  const uptime90 = recent.length > 0 ? round2((100 * ups) / recent.length) : null;

  const latencies = mine
    .map((c) => c.latencyMs)
    .filter((l): l is number => typeof l === "number")
    .sort((a, b) => a - b);
  const avgLatencyMs =
    latencies.length > 0
      ? round2(latencies.reduce((s, l) => s + l, 0) / latencies.length)
      : null;
  const p95Idx = latencies.length > 0 ? Math.round(0.95 * (latencies.length - 1)) : -1;
  const p95LatencyMs = p95Idx >= 0 ? latencies[p95Idx] ?? null : null;

  const byDay = new Map<string, SiteDay>();
  for (const c of mine) {
    const date = c.checkedAt.slice(0, 10);
    const day = byDay.get(date) ?? { date, up: 0, down: 0 };
    if (c.status === "up") day.up++;
    else day.down++;
    byDay.set(date, day);
  }
  const days = [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-windowDays);

  const incidents = days
    .filter((d) => d.down > 0)
    .map((d) => ({ date: d.date, count: d.down }));

  return {
    name: site.name,
    url: site.url,
    currentStatus: current ? current.status : "unknown",
    lastCheckAt: current ? current.checkedAt : null,
    uptime90,
    avgLatencyMs,
    p95LatencyMs,
    days,
    incidents,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderPage(
  summaries: SiteSummary[],
  opts: { title: string; generatedAt: Date; windowDays?: number }
): string {
  const sites = summaries
    .map((s) => {
      const badge =
        s.currentStatus === "up"
          ? '<span class="up">● Operational</span>'
          : s.currentStatus === "down"
            ? '<span class="down">● Down</span>'
            : '<span class="unknown">● No data</span>';
      const bars = s.days
        .map((d) => {
          const cls = d.down > 0 ? "bad" : "ok";
          const tip = `${d.date}: ${d.up} up, ${d.down} down`;
          return `<span class="bar ${cls}" title="${escapeHtml(tip)}"></span>`;
        })
        .join("");
      const uptime =
        s.uptime90 === null ? "—" : `${s.uptime90.toFixed(2)}%`;
      const latency =
        s.p95LatencyMs === null ? "—" : `${s.p95LatencyMs} ms`;
      const incidentNote =
        s.incidents.length === 0
          ? "no incidents in the last 90 days"
          : `last incident ${escapeHtml(s.incidents[s.incidents.length - 1]!.date)}`;
      return `<section class="site">
  <div class="site-head">
    <h2><a href="${escapeHtml(s.url)}" rel="noopener">${escapeHtml(s.name)}</a> ${badge}</h2>
    <span class="meta">${windowDays}-day uptime <strong>${uptime}</strong> · p95 ${latency} · ${incidentNote}</span>
  </div>
  <div class="bars">${bars || '<span class="meta">no checks recorded yet</span>'}</div>
</section>`;
    })
    .join("\n");

  const windowDays = opts.windowDays ?? 90;
  const allUp = summaries.length > 0 && summaries.every((s) => s.currentStatus === "up");
  const banner = allUp
    ? '<div class="banner all-up">All systems operational</div>'
    : '<div class="banner degraded">Some systems are experiencing issues</div>';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, sans-serif; background: #f6f8fa; color: #1f2328; }
  .wrap { max-width: 860px; margin: 0 auto; padding: 32px 20px 64px; }
  h1 { font-size: 1.7rem; }
  .banner { padding: 14px 18px; border-radius: 10px; font-weight: 600; margin: 18px 0 28px; }
  .all-up { background: #dafbe1; color: #116329; border: 1px solid #a4e8b6; }
  .degraded { background: #fff1c9; color: #7d4e00; border: 1px solid #e8c76a; }
  .site { background: #fff; border: 1px solid #d0d7de; border-radius: 10px; padding: 18px; margin-bottom: 18px; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #e6edf3; }
    .site { background: #161b22; border-color: #30363d; }
  }
  .site-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: baseline; justify-content: space-between; }
  h2 { margin: 0; font-size: 1.1rem; }
  h2 a { color: inherit; text-decoration: none; }
  .meta { color: #656d76; font-size: 0.85rem; }
  @media (prefers-color-scheme: dark) { .meta { color: #8b949e; } }
  .up { color: #1a7f37; font-weight: 600; }
  .down { color: #cf222e; font-weight: 600; }
  .unknown { color: #9e6a03; font-weight: 600; }
  .bars { display: flex; gap: 2px; margin-top: 14px; }
  .bar { flex: 1; height: 28px; border-radius: 2px; min-width: 3px; }
  .bar.ok { background: #2da44e; }
  .bar.bad { background: #cf222e; }
  .footer { text-align: center; color: #656d76; font-size: 0.85rem; margin-top: 32px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(opts.title)}</h1>
  ${banner}
  ${sites}
  <div class="footer">Generated ${escapeHtml(opts.generatedAt.toISOString())} · <a href="https://github.com/v01dst/status-page-gen">status-page-gen</a></div>
</div>
</body>
</html>`;
}
