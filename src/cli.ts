import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { renderPage, summarize, type CheckRecord, type SiteConfig } from "./render.js";

interface Config {
  title?: string;
  sites: SiteConfig[];
  checksPath: string;
}

function loadConfig(path: string): Config {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw.sites) || raw.sites.length === 0) {
    throw new Error("config must have a non-empty 'sites' array");
  }
  for (const s of raw.sites) {
    if (typeof s.name !== "string" || typeof s.url !== "string") {
      throw new Error("each site needs string 'name' and 'url'");
    }
  }
  if (typeof raw.checksPath !== "string") {
    throw new Error("config must have a string 'checksPath'");
  }
  return raw as Config;
}

function loadChecks(path: string): CheckRecord[] {
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (!Array.isArray(raw)) throw new Error("checks file must be a JSON array");
  return raw.filter(
    (c) =>
      typeof c === "object" &&
      c !== null &&
      typeof (c as CheckRecord).site === "string" &&
      typeof (c as CheckRecord).checkedAt === "string" &&
      ((c as CheckRecord).status === "up" || (c as CheckRecord).status === "down")
  );
}

function main(): number {
  const args = process.argv.slice(2);
  let configPath = "status.config.json";
  let outPath = "status.html";

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === "-c" || args[i] === "--config") && args[i + 1]) {
      configPath = args[++i]!;
    } else if ((args[i] === "-o" || args[i] === "--out") && args[i + 1]) {
      outPath = args[++i]!;
    } else if (args[i] === "-h" || args[i] === "--help") {
      console.log(
        "status-page-gen [-c CONFIG] [-o OUT.html]\n\nCONFIG: { title, checksPath, sites: [{ name, url }] }\nCHECKS: [{ site, status: 'up'|'down', latencyMs, checkedAt }]\n"
      );
      return 0;
    }
  }

  try {
    const config = loadConfig(configPath);
    const checks = loadChecks(config.checksPath);
    const now = new Date();
    const summaries = config.sites.map((s) => summarize(s, checks, now));
    const html = renderPage(summaries, {
      title: config.title ?? "Service Status",
      generatedAt: now,
    });
    writeFileSync(outPath, html);
    console.log(`wrote ${outPath} (${config.sites.length} sites, ${checks.length} checks)`);
    return 0;
  } catch (err) {
    console.error(`error: ${(err as Error).message}`);
    return 1;
  }
}

process.exit(main());
