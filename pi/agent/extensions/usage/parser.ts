import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DailyUsage {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tokens: number;
  cost: number;
  count: number;
}

export interface ModelUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tokens: number;
  cost: number;
  count: number;
}

export interface TokenStats {
  days: DailyUsage[];
  models: ModelUsage[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
  totalTokens: number;
  totalCost: number;
  totalMessages: number;
  avgTokensPerDay: number;
  sessionCount: number;
}

function getSessionsDir(): string {
  const base =
    process.env.PI_CODING_AGENT_SESSION_DIR ||
    process.env.PI_CODING_AGENT_DIR ||
    path.join(process.env.HOME || '~', '.pi', 'agent');
  return path.join(base, 'sessions');
}

interface DayAgg {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tokens: number;
  cost: number;
  count: number;
}

interface ModelAgg {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  tokens: number;
  cost: number;
  count: number;
}

interface SessionData {
  days: DailyUsage[];
  models: Map<string, ModelAgg>;
}

function parseSessionFile(
  filePath: string,
  monthStart: string | null,
): SessionData {
  const byDate = new Map<string, DayAgg>();
  const byModel = new Map<string, ModelAgg>();
  const content = fs.readFileSync(filePath, 'utf8');

  for (const line of content.trim().split('\n')) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'message') continue;
      const msg = entry.message;
      if (!msg?.usage || msg.role !== 'assistant') continue;

      const date = (entry.timestamp || '').slice(0, 10);
      if (!date || (monthStart && date < monthStart)) continue;

      const u = msg.usage;
      const cur = byDate.get(date);
      if (cur) {
        cur.inputTokens += u.input || 0;
        cur.outputTokens += u.output || 0;
        cur.cacheReadTokens += u.cacheRead || 0;
        cur.cacheWriteTokens += u.cacheWrite || 0;
        cur.tokens += u.totalTokens || 0;
        cur.cost += u.cost?.total || 0;
        cur.count += 1;
      } else {
        byDate.set(date, {
          inputTokens: u.input || 0,
          outputTokens: u.output || 0,
          cacheReadTokens: u.cacheRead || 0,
          cacheWriteTokens: u.cacheWrite || 0,
          tokens: u.totalTokens || 0,
          cost: u.cost?.total || 0,
          count: 1,
        });
      }

      const modelName = msg.model || 'unknown';
      const cm = byModel.get(modelName);
      if (cm) {
        cm.inputTokens += u.input || 0;
        cm.outputTokens += u.output || 0;
        cm.cacheReadTokens += u.cacheRead || 0;
        cm.cacheWriteTokens += u.cacheWrite || 0;
        cm.tokens += u.totalTokens || 0;
        cm.cost += u.cost?.total || 0;
        cm.count += 1;
      } else {
        byModel.set(modelName, {
          inputTokens: u.input || 0,
          outputTokens: u.output || 0,
          cacheReadTokens: u.cacheRead || 0,
          cacheWriteTokens: u.cacheWrite || 0,
          tokens: u.totalTokens || 0,
          cost: u.cost?.total || 0,
          count: 1,
        });
      }
    } catch {
      /* skip */
    }
  }

  return {
    days: Array.from(byDate.entries()).map(([date, d]) => ({ date, ...d })),
    models: byModel,
  };
}

function walkSessionsDir(dir: string): string[] {
  const files: string[] = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) files.push(...walkSessionsDir(p));
      else if (entry.name.endsWith('.jsonl')) files.push(p);
    }
  } catch {
    /* doesn't exist */
  }
  return files;
}

export function parseAllSessions(currentMonthOnly = true): TokenStats {
  const monthStart = currentMonthOnly
    ? `${new Date().toISOString().slice(0, 8)}01`
    : null;

  const agg = new Map<string, DayAgg>();
  const modelAgg = new Map<string, ModelAgg>();
  for (const file of walkSessionsDir(getSessionsDir())) {
    const sd = parseSessionFile(file, monthStart);
    for (const du of sd.days) {
      const cur = agg.get(du.date);
      if (cur) {
        cur.inputTokens += du.inputTokens;
        cur.outputTokens += du.outputTokens;
        cur.cacheReadTokens += du.cacheReadTokens;
        cur.cacheWriteTokens += du.cacheWriteTokens;
        cur.tokens += du.tokens;
        cur.cost += du.cost;
        cur.count += du.count;
      } else {
        agg.set(du.date, {
          inputTokens: du.inputTokens,
          outputTokens: du.outputTokens,
          cacheReadTokens: du.cacheReadTokens,
          cacheWriteTokens: du.cacheWriteTokens,
          tokens: du.tokens,
          cost: du.cost,
          count: du.count,
        });
      }
    }
    for (const [model, mu] of sd.models) {
      const cm = modelAgg.get(model);
      if (cm) {
        cm.inputTokens += mu.inputTokens;
        cm.outputTokens += mu.outputTokens;
        cm.cacheReadTokens += mu.cacheReadTokens;
        cm.cacheWriteTokens += mu.cacheWriteTokens;
        cm.tokens += mu.tokens;
        cm.cost += mu.cost;
        cm.count += mu.count;
      } else {
        modelAgg.set(model, { ...mu });
      }
    }
  }

  const days = Array.from(agg.entries())
    .map(([date, d]) => ({ date, ...d }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const models = Array.from(modelAgg.entries())
    .map(([model, m]) => ({ model, ...m }))
    .sort((a, b) => b.tokens - a.tokens);

  let ti = 0,
    to = 0,
    tcr = 0,
    tcw = 0,
    tt = 0,
    tc = 0,
    tm = 0;
  for (const d of days) {
    ti += d.inputTokens;
    to += d.outputTokens;
    tcr += d.cacheReadTokens;
    tcw += d.cacheWriteTokens;
    tt += d.tokens;
    tc += d.cost;
    tm += d.count;
  }

  return {
    days,
    models,
    totalInputTokens: ti,
    totalOutputTokens: to,
    totalCacheReadTokens: tcr,
    totalCacheWriteTokens: tcw,
    totalTokens: tt,
    totalCost: tc,
    totalMessages: tm,
    avgTokensPerDay: days.length > 0 ? Math.round(tt / days.length) : 0,
    sessionCount: walkSessionsDir(getSessionsDir()).length,
  };
}
