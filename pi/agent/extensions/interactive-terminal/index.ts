import type {
  ExtensionAPI,
  ExtensionContext,
} from '@earendil-works/pi-coding-agent';
import { createBashTool } from '@earendil-works/pi-coding-agent';
import { Text } from '@earendil-works/pi-tui';
import { Type } from 'typebox';
import {
  cancelAllSessions,
  cancelSession,
  formatCancelledMessage,
  formatCompletionMessage,
  formatDelegationMessage,
  getActiveSessions,
  getInteractiveCommands,
  isInTmux,
  isInteractiveCommand,
  onSessionComplete,
  runBlockingHandoff,
  spawnTmuxInteractive,
} from './lib.ts';

const STATUS_KEY = 'interactive-terminal';
const WIDGET_KEY = 'interactive-terminal-sessions';
const HELP_WIDGET_KEY = 'interactive-terminal-board';
let boardVisible = false;
let lastCtx: ExtensionContext | undefined;

function refreshSessionsWidget(ctx: ExtensionContext) {
  const active = getActiveSessions();

  if (active.length === 0) {
    ctx.ui.setWidget(WIDGET_KEY, undefined);
    ctx.ui.setStatus(
      STATUS_KEY,
      ctx.ui.theme.fg(
        'dim',
        isInTmux() ? 'terminal: tmux split' : 'terminal: ! (handoff)',
      ),
    );
    return;
  }

  ctx.ui.setWidget(WIDGET_KEY, (_tui, theme) => ({
    render: () =>
      active.map((s) => {
        const who = s.source === 'agent' ? 'agent' : 'user';
        return theme.fg(
          'accent',
          `● #${s.id} ${s.paneId} ${who}: ${s.command}`,
        );
      }),
    invalidate: () => {},
  }));

  ctx.ui.setStatus(
    STATUS_KEY,
    ctx.ui.theme.fg(
      'warning',
      `● ${active.length} terminal${active.length === 1 ? '' : 's'}`,
    ),
  );
}

function showHelpBoard(ctx: ExtensionContext) {
  const commands = getInteractiveCommands();
  const preview = commands.slice(0, 8).join(', ');
  const more = commands.length > 8 ? ` +${commands.length - 8} more` : '';
  const mode = isInTmux() ? 'tmux split (-h)' : 'full handoff (! only)';

  ctx.ui.setWidget(HELP_WIDGET_KEY, (_tui, theme) => ({
    render: () => [
      theme.fg('accent', theme.bold('Interactive terminal')),
      theme.fg('muted', ` Mode: ${mode}`),
      theme.fg('muted', ' !cmd / !i cmd   interactive command'),
      theme.fg('muted', ' /terminal [cmd] open shell or command'),
      theme.fg('dim', ` Auto: ${preview}${more}`),
    ],
    invalidate: () => {},
  }));
  boardVisible = true;
}

function hideHelpBoard(ctx: ExtensionContext) {
  ctx.ui.setWidget(HELP_WIDGET_KEY, undefined);
  boardVisible = false;
}

async function delegateInteractive(
  ctx: ExtensionContext,
  command: string,
  cwd: string,
  source: 'agent' | 'user',
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  if (isInTmux()) {
    try {
      const session = await spawnTmuxInteractive(command, cwd, source);
      refreshSessionsWidget(ctx);
      return { ok: true, message: formatDelegationMessage(session) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `Failed to open tmux pane: ${msg}` };
    }
  }

  if (source === 'agent') {
    return {
      ok: false,
      message:
        'Interactive agent commands require tmux. Start pi inside tmux, or run manually with `!' +
        command +
        '`.',
    };
  }

  const result = await runBlockingHandoff(ctx, command, cwd);
  if (!result) {
    return { ok: false, message: '(interactive terminal unavailable)' };
  }

  return {
    ok: true,
    message: result.output,
  };
}

export default function (pi: ExtensionAPI) {
  const localCwd = process.cwd();
  const bashTool = createBashTool(localCwd);

  onSessionComplete((event) => {
    if (lastCtx) {
      refreshSessionsWidget(lastCtx);
    }

    if (event.session.source !== 'agent') {
      if (lastCtx) {
        const label = event.cancelled ? 'cancelled' : `exit ${event.exitCode}`;
        lastCtx.ui.notify(
          `Terminal #${event.session.id} ${label}: ${event.session.command}`,
          event.cancelled ? 'warning' : 'info',
        );
      }
      return;
    }

    const message = event.cancelled
      ? formatCancelledMessage(event.session)
      : formatCompletionMessage(event.session, event.exitCode);

    pi.sendUserMessage(message, { deliverAs: 'followUp' });
  });

  pi.registerTool({
    ...bashTool,
    label: 'bash (interactive-aware)',
    description: `${bashTool.description ?? 'Run shell commands.'} Interactive commands (vim, git rebase -i, REPLs, etc.) open in a tmux split pane when pi runs inside tmux. Returns immediately; use cancel_interactive to abort.`,
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      lastCtx = ctx;
      const command = params.command?.trim() ?? '';

      if (!isInteractiveCommand(command)) {
        return bashTool.execute(toolCallId, params, signal, onUpdate);
      }

      if (!ctx.hasUI || ctx.mode !== 'tui') {
        return {
          content: [
            {
              type: 'text' as const,
              text:
                'Interactive commands require tmux. Start pi inside tmux and retry, or use `!' +
                command +
                '`.',
            },
          ],
          details: { interactive: true, exitCode: 1 },
        };
      }

      const result = await delegateInteractive(ctx, command, ctx.cwd, 'agent');
      refreshSessionsWidget(ctx);

      return {
        content: [{ type: 'text' as const, text: result.message }],
        details: {
          interactive: true,
          delegated: result.ok,
          exitCode: result.ok ? 0 : 1,
        },
      };
    },

    renderCall(args, theme) {
      const command = args.command ?? '';
      const tag = isInteractiveCommand(command)
        ? theme.fg('warning', ' [interactive]')
        : '';
      return new Text(
        theme.fg('toolTitle', theme.bold('bash ')) +
          theme.fg('muted', command) +
          tag,
        0,
        0,
      );
    },
  });

  pi.registerTool({
    name: 'cancel_interactive',
    label: 'Cancel Interactive',
    description:
      'Cancel interactive terminal session(s) opened by the agent. ' +
      'By default cancels the most recent agent session. ' +
      'Use session id for a specific one, or all=true to cancel every agent session. ' +
      'Never cancels user ! panes unless a specific session id is given for a user session.',
    parameters: Type.Object({
      session: Type.Optional(
        Type.Number({ description: 'Session id to cancel (e.g. 1)' }),
      ),
      all: Type.Optional(
        Type.Boolean({
          description: 'Cancel all agent-opened interactive sessions',
        }),
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      lastCtx = ctx;

      if (params.all) {
        const cancelled = cancelSession(undefined, { allAgent: true });
        refreshSessionsWidget(ctx);
        if (cancelled.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No agent interactive sessions to cancel.',
              },
            ],
            details: { cancelled: [] },
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Cancelled ${cancelled.length} agent session(s): ${cancelled.map((s) => `#${s.id}`).join(', ')}`,
            },
          ],
          details: { cancelled: cancelled.map((s) => s.id) },
        };
      }

      if (params.session !== undefined) {
        const target = cancelSession(params.session);
        refreshSessionsWidget(ctx);
        if (target.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `No running session #${params.session}.`,
              },
            ],
            details: { cancelled: [] },
          };
        }
        return {
          content: [
            {
              type: 'text',
              text: `Cancelled session #${params.session} (${target[0].paneId}).`,
            },
          ],
          details: { cancelled: [params.session] },
        };
      }

      const cancelled = cancelSession();
      refreshSessionsWidget(ctx);
      if (cancelled.length === 0) {
        return {
          content: [
            { type: 'text', text: 'No agent interactive sessions to cancel.' },
          ],
          details: { cancelled: [] },
        };
      }
      const s = cancelled[0];
      return {
        content: [
          {
            type: 'text',
            text: `Cancelled most recent agent session #${s.id} (${s.paneId}): ${s.command}`,
          },
        ],
        details: { cancelled: [s.id] },
      };
    },

    renderCall(args, theme) {
      const parts = [];
      if (args.all) parts.push('all');
      if (args.session !== undefined) parts.push(`session=${args.session}`);
      const suffix = parts.length > 0 ? parts.join(' ') : 'recent';
      return new Text(
        theme.fg('toolTitle', theme.bold('cancel_interactive ')) +
          theme.fg('muted', suffix),
        0,
        0,
      );
    },
  });

  pi.on('user_bash', async (event, ctx) => {
    lastCtx = ctx;
    let command = event.command;
    let forceInteractive = false;

    if (command.startsWith('i ') || command.startsWith('i\t')) {
      forceInteractive = true;
      command = command.slice(2).trim();
    }

    if (!forceInteractive && !isInteractiveCommand(command)) {
      return;
    }

    if (ctx.mode !== 'tui') {
      return {
        result: {
          output: '(interactive commands require TUI mode)',
          exitCode: 1,
          cancelled: false,
          truncated: false,
        },
      };
    }

    const result = await delegateInteractive(ctx, command, event.cwd, 'user');
    refreshSessionsWidget(ctx);

    return {
      result: {
        output: result.message,
        exitCode: result.ok ? 0 : 1,
        cancelled: false,
        truncated: false,
      },
    };
  });

  pi.registerCommand('terminal', {
    description:
      'Open an interactive shell or run a command (usage: /terminal [cmd])',
    handler: async (args, ctx) => {
      lastCtx = ctx;
      if (ctx.mode !== 'tui') {
        ctx.ui.notify('Interactive terminal requires TUI mode', 'error');
        return;
      }

      const command = args.trim() || process.env.SHELL || '/bin/sh';
      const result = await delegateInteractive(ctx, command, ctx.cwd, 'user');
      refreshSessionsWidget(ctx);

      if (!result.ok) {
        ctx.ui.notify(result.message, 'error');
        return;
      }

      ctx.ui.notify(result.message, 'info');
    },
  });

  pi.registerCommand('terminal-board', {
    description: 'Show or hide the interactive terminal help board',
    handler: async (_args, ctx) => {
      if (boardVisible) {
        hideHelpBoard(ctx);
        ctx.ui.notify('Terminal board hidden', 'info');
        return;
      }
      showHelpBoard(ctx);
      ctx.ui.notify('Terminal board shown above editor', 'info');
    },
  });

  pi.registerCommand('terminal-cancel', {
    description:
      'Cancel an interactive session (usage: /terminal-cancel [id|all])',
    handler: async (args, ctx) => {
      lastCtx = ctx;
      const trimmed = args.trim();

      const cancelled =
        trimmed === 'all'
          ? cancelAllSessions()
          : (() => {
              const id = trimmed ? Number.parseInt(trimmed, 10) : undefined;
              return id !== undefined && !Number.isNaN(id)
                ? cancelSession(id)
                : cancelSession();
            })();

      refreshSessionsWidget(ctx);

      if (cancelled.length === 0) {
        ctx.ui.notify('No session to cancel', 'warning');
        return;
      }

      ctx.ui.notify(
        `Cancelled ${cancelled.length} session(s): ${cancelled.map((s) => `#${s.id}`).join(', ')}`,
        'info',
      );
    },
  });

  pi.on('session_start', async (_event, ctx) => {
    lastCtx = ctx;
    refreshSessionsWidget(ctx);
  });
}
