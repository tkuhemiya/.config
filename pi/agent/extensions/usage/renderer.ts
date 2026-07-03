import type { TokenStats } from './parser';

export interface StyledLine {
  text: string;
  style: 'accent' | 'text' | 'dim' | 'success' | 'yellow' | 'red' | 'magenta';
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export function renderStatsLines(
  stats: TokenStats,
  monthName: string,
): StyledLine[] {
  const lines: StyledLine[] = [];

  lines.push({ text: `Pi Usage — ${monthName}`, style: 'accent' });
  lines.push({
    text: `↑${fmt(stats.totalInputTokens)}  ↓${fmt(stats.totalOutputTokens)}  cacheR:${fmt(stats.totalCacheReadTokens)}  cacheW:${fmt(stats.totalCacheWriteTokens)}  total:${fmt(stats.totalTokens)}`,
    style: 'text',
  });
  lines.push({
    text: `cost:$${stats.totalCost.toFixed(2)}  avg/day:${fmt(stats.avgTokensPerDay)}  sessions:${stats.sessionCount}  days:${stats.days.length}  msgs:${fmt(stats.totalMessages)}`,
    style: 'dim',
  });

  if (stats.models.length > 0) {
    const top = stats.models.slice(0, 8);

    lines.push({ text: 'top models:', style: 'dim' });
    // header
    lines.push({
      text: `  ${'model'.padEnd(22)} ↑${'in'.padStart(7)} ↓${'out'.padStart(7)}  cacheR${'r'.padStart(6)}  cacheW${'w'.padStart(6)}  total${'tot'.padStart(7)}  cost${'$cost'.padStart(6)}  msgs`,
      style: 'dim',
    });
    for (const m of top) {
      const name = m.model.length > 22 ? `${m.model.slice(0, 19)}...` : m.model;
      lines.push({
        text: `  ${name.padEnd(22)} ↑${fmt(m.inputTokens).padStart(7)} ↓${fmt(m.outputTokens).padStart(7)}  cacheR ${fmt(m.cacheReadTokens).padStart(6)}  cacheW ${fmt(m.cacheWriteTokens).padStart(6)}  total ${fmt(m.tokens).padStart(6)}  ${`$${m.cost.toFixed(2)}`.padStart(6)}  ${fmt(m.count).padStart(4)}`,
        style: 'dim',
      });
    }
  }

  lines.push({
    text: '/usage_all for all-time  |  /usage to hide',
    style: 'dim',
  });

  return lines;
}
