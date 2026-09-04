<div align="center">

# 📟 status-page-gen

**Turn uptime history into a beautiful static status page. No server, no JS framework.**

[![CI](https://github.com/v01dst/status-page-gen/actions/workflows/ci.yml/badge.svg)](https://github.com/v01dst/status-page-gen/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-8A2BE2)
![Node](https://img.shields.io/badge/node-22-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-10%20passing-brightgreen)

`90-day uptime` · `p95 latency` · `incident markers` · `dark mode` · `single HTML file`

</div>

---

## ✨ Features

- **📊 90-day uptime bars** — GitHub-style per-day bars, red for incident days, hover tooltips
- **📈 Real metrics** — 90-day uptime %, average + p95 latency per site
- **🚨 Incident timeline** — latest incident date surfaced per site
- **🌗 Light + dark** — respects the reader's color scheme
- **🧼 XSS-safe** — all site names escaped
- **📤 Single file output** — inline CSS, deploy anywhere (S3, GitHub Pages, nginx)

## 🚀 Quick Start

```bash
git clone https://github.com/v01dst/status-page-gen
cd status-page-gen
npm ci
node --import tsx src/cli.ts -c example.config.json -o status.html
```

Or with Docker:

```bash
docker build -t status-page-gen .
docker run --rm -v "$PWD:/app/out" status-page-gen -c /app/out/example.config.json -o /app/out/status.html
```

## 📖 Config

**status.config.json**

```json
{
  "title": "My Services",
  "checksPath": "checks.json",
  "sites": [
    { "name": "API", "url": "https://api.example.com" }
  ]
}
```

**checks.json** (pairs with [uptime-watch](https://github.com/v01dst/uptime-watch) output)

```json
[
  { "site": "API", "status": "up", "latencyMs": 120, "checkedAt": "2026-09-04T08:00:00.000Z" }
]
```

### Generate

```bash
node --import tsx src/cli.ts -c status.config.json -o status.html
```

Cron it after your monitor runs and the page refreshes itself.

## 🧱 Tech Stack

| Layer     | Tech                |
|-----------|---------------------|
| Runtime   | Node.js 22          |
| Language  | TypeScript (strict) |
| Rendering | Hand-built HTML     |
| Testing   | Vitest 5            |
| Packaging | Docker              |
| CI        | GitHub Actions      |

---

<div align="center">

Built with ⚡ by **v01dst**

[![GitHub](https://img.shields.io/badge/github-v01dst-181717?logo=github)](https://github.com/v01dst)
[![Discord](https://img.shields.io/badge/discord-9p.1-5865F2?logo=discord&logoColor=white)](https://discord.com/users/9p.1)

</div>
