import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Text } from '@earendil-works/pi-tui';
import { parseAllSessions } from './parser';
import { renderStatsLines, type StyledLine } from './renderer';

const STYLE_COLORS: Record<StyledLine['style'], string> = {
  accent: 'accent',
  text: 'text',
  dim: 'dim',
  success: 'success',
  yellow: 'warning',
  red: 'error',
  magenta: 'accent',
};

export default function (pi: ExtensionAPI) {
  pi.registerMessageRenderer('usage-report', (message, _options, theme) => {
    const lines = (message.details as { lines: StyledLine[] } | undefined)
      ?.lines;
    if (!lines) return null;

    let text = '';
    for (const line of lines) {
      if (text) text += '\n';
      text += theme.fg(STYLE_COLORS[line.style] || 'text', line.text);
    }
    return new Text(text, 1, 0);
  });

  function showUsage(
    ctx: Parameters<Parameters<typeof pi.registerCommand>[1]['handler']>[1],
    allTime: boolean,
  ) {
    if (!ctx.hasUI) return;

    const stats = parseAllSessions(!allTime);

    if (stats.days.length === 0) {
      ctx.ui.notify(
        allTime
          ? 'No session data found'
          : 'No data for this month. Try /usage_all',
        'warning',
      );
      return;
    }

    const monthName = allTime
      ? 'All Time'
      : new Date().toLocaleDateString('en-US', {
          month: 'long',
          timeZone: 'UTC',
        });

    pi.sendMessage({
      customType: 'usage-report',
      content: '',
      display: true,
      details: { lines: renderStatsLines(stats, monthName) },
    });
  }

  pi.registerCommand('usage', {
    description: 'Show monthly token usage stats',
    handler: async (_args, ctx) => showUsage(ctx, false),
  });

  pi.registerCommand('usage_all', {
    description: 'Show all-time token usage stats',
    handler: async (_args, ctx) => showUsage(ctx, true),
  });
}
