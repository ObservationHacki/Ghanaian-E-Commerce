import fs from "node:fs/promises";
import path from "node:path";
import type { PipelineLog } from "./types";

export async function ensureLogDir(logDir: string): Promise<void> {
  await fs.mkdir(logDir, { recursive: true });
}

export function formatConsoleLog(log: PipelineLog): string {
  const lines = [`#${log.productId} ${log.productName}`];
  for (const c of log.candidates.slice(0, 12)) {
    const status = c.rejected
      ? `REJECT ${c.rejected}`
      : `score=${c.score ?? "-"}`;
    lines.push(`  [${c.origin}] ${status} ${c.url.slice(0, 100)}`);
  }
  if (log.accepted) {
    const a = log.accepted;
    lines.push(
      `  ACCEPTED ${a.dimensions.width}x${a.dimensions.height} conf=${a.confidence} q=${a.qualityScore}`,
    );
    lines.push(`  -> ${a.paths.largePath}`);
  }
  if (log.error) lines.push(`  ERROR ${log.error}`);
  return lines.join("\n");
}

export async function appendPipelineLog(
  logDir: string,
  log: PipelineLog,
): Promise<void> {
  await ensureLogDir(logDir);
  const day = new Date().toISOString().slice(0, 10);
  const file = path.join(logDir, `image-scrape-${day}.jsonl`);
  await fs.appendFile(file, `${JSON.stringify(log)}\n`, "utf8");
}
