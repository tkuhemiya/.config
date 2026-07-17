import { execFile, spawnSync } from 'node:child_process';
import { readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { ExtensionContext } from '@earendil-works/pi-coding-agent';

const execFileAsync = promisify(execFile);

export type SessionSource = 'agent' | 'user';

export interface InteractiveSession {
  id: number;
  paneId: string;
  command: string;
  cwd: string;
  source: SessionSource;
  status: 'running' | 'completed' | 'cancelled';
  exitCode?: number;
  channel: string;
  exitFile: string;
}

export interface SessionCompleteEvent {
  session: InteractiveSession;
  exitCode: number;
  cancelled: boolean;
}

type SessionListener = (event: SessionCompleteEvent) => void;

let nextSessionId = 1;
const sessions = new Map<number, InteractiveSession>();
const listeners = new Set<SessionListener>();

export function isInTmux(): boolean {
  return Boolean(process.env.TMUX);
}

export function getActiveSessions(): InteractiveSession[] {
  return [...sessions.values()].filter((s) => s.status === 'running');
}

export function getAgentSessions(): InteractiveSession[] {
  return getActiveSessions().filter((s) => s.source === 'agent');
}

export function onSessionComplete(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitComplete(event: SessionCompleteEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

function cleanupExitFile(path: string) {
  try {
    unlinkSync(path);
  } catch {
    // ignore
  }
}

function buildShellCommand(
  cwd: string,
  command: string,
  channel: string,
  exitFile: string,
): string {
  const shell = process.env.SHELL || '/bin/sh';
  const body = [
    `cd ${JSON.stringify(cwd)}`,
    `(${command})`,
    'ec=$?',
    `printf %s "$ec" > ${JSON.stringify(exitFile)}`,
    `tmux wait-for -S ${JSON.stringify(channel)}`,
    'exit $ec',
  ].join('; ');
  return `${shell} -c ${JSON.stringify(body)}`;
}

async function tmux(args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('tmux', args, { encoding: 'utf8' });
  return stdout.trim();
}

function tmuxSync(args: string[]): string {
  return spawnSync('tmux', args, { encoding: 'utf8' }).stdout.trim();
}

async function watchSession(session: InteractiveSession) {
  try {
    await tmux(['wait-for', session.channel]);
  } catch {
    if (session.status !== 'cancelled') {
      session.status = 'cancelled';
      emitComplete({ session, exitCode: 1, cancelled: true });
    }
    cleanupExitFile(session.exitFile);
    return;
  }

  if (session.status === 'cancelled') {
    cleanupExitFile(session.exitFile);
    return;
  }

  let exitCode = 1;
  try {
    exitCode = Number.parseInt(
      readFileSync(session.exitFile, 'utf8').trim(),
      10,
    );
    if (Number.isNaN(exitCode)) exitCode = 1;
  } catch {
    exitCode = 1;
  }

  session.status = 'completed';
  session.exitCode = exitCode;
  cleanupExitFile(session.exitFile);
  emitComplete({ session, exitCode, cancelled: false });
}

export async function spawnTmuxInteractive(
  command: string,
  cwd: string,
  source: SessionSource,
): Promise<InteractiveSession> {
  if (!isInTmux()) {
    throw new Error('tmux session required');
  }

  const id = nextSessionId++;
  const channel = `pi-term-${id}`;
  const exitFile = join(tmpdir(), `pi-interactive-${id}.exit`);
  const shellCommand = buildShellCommand(cwd, command, channel, exitFile);

  const paneId = await tmux([
    'split-window',
    '-h',
    '-P',
    '-F',
    '#{pane_id}',
    shellCommand,
  ]);

  const session: InteractiveSession = {
    id,
    paneId,
    command,
    cwd,
    source,
    status: 'running',
    channel,
    exitFile,
  };

  sessions.set(id, session);
  void watchSession(session);
  return session;
}

export function formatDelegationMessage(session: InteractiveSession): string {
  return (
    `Delegated to interactive terminal #${session.id} (${session.paneId}): ${session.command}. ` +
    'You will be notified when the user finishes.'
  );
}

export function formatCompletionMessage(
  session: InteractiveSession,
  exitCode: number,
): string {
  return (
    `[interactive terminal completed]\n` +
    `Session: #${session.id}\n` +
    `Pane: ${session.paneId}\n` +
    `Command: ${session.command}\n` +
    `Exit code: ${exitCode}`
  );
}

export function formatCancelledMessage(session: InteractiveSession): string {
  return (
    `[interactive terminal cancelled]\n` +
    `Session: #${session.id}\n` +
    `Pane: ${session.paneId}\n` +
    `Command: ${session.command}`
  );
}

export function cancelAllSessions(): InteractiveSession[] {
  const cancelled: InteractiveSession[] = [];
  for (const session of getActiveSessions()) {
    cancelled.push(...cancelSession(session.id));
  }
  return cancelled;
}

export function cancelSession(
  sessionId?: number,
  opts?: { allAgent?: boolean },
): InteractiveSession[] {
  const cancelled: InteractiveSession[] = [];

  const targets = opts?.allAgent
    ? getAgentSessions()
    : sessionId !== undefined
      ? [sessions.get(sessionId)].filter((s): s is InteractiveSession =>
          Boolean(s),
        )
      : (() => {
          const agent = getAgentSessions();
          return agent.length > 0 ? [agent[agent.length - 1]] : [];
        })();

  for (const session of targets) {
    if (session.status !== 'running') continue;

    session.status = 'cancelled';
    try {
      tmuxSync(['kill-pane', '-t', session.paneId]);
    } catch {
      // pane may already be gone
    }
    try {
      tmuxSync(['wait-for', '-S', session.channel]);
    } catch {
      // ignore
    }
    cleanupExitFile(session.exitFile);
    cancelled.push(session);
    emitComplete({ session, exitCode: 1, cancelled: true });
  }

  return cancelled;
}

// Editors, pagers, git ops, TUIs, REPLs, and other stdin-driven CLIs.
export const DEFAULT_INTERACTIVE_COMMANDS = [
  'vim',
  'nvim',
  'vi',
  'nano',
  'emacs',
  'pico',
  'micro',
  'helix',
  'hx',
  'kak',
  'less',
  'more',
  'most',
  'git commit',
  'git rebase',
  'git merge',
  'git cherry-pick',
  'git revert',
  'git add -p',
  'git add --patch',
  'git add -i',
  'git add --interactive',
  'git stash -p',
  'git stash --patch',
  'git reset -p',
  'git reset --patch',
  'git checkout -p',
  'git checkout --patch',
  'git difftool',
  'git mergetool',
  'htop',
  'top',
  'btop',
  'glances',
  'ranger',
  'nnn',
  'lf',
  'mc',
  'vifm',
  'tig',
  'lazygit',
  'gitui',
  'fzf',
  'sk',
  'ssh',
  'telnet',
  'mosh',
  'psql',
  'mysql',
  'sqlite3',
  'mongosh',
  'redis-cli',
  'kubectl edit',
  'kubectl exec -it',
  'docker exec -it',
  'docker run -it',
  'tmux',
  'screen',
  'ncdu',
  'python',
  'python3',
  'node',
  'irb',
  'rails console',
  'rails c',
  'bundle exec rails console',
  'bundle exec rails c',
  'php -a',
  'node --inspect',
];

const INTERACTIVE_FLAG_RE =
  /(?:^|\s)(?:-[a-z]*i[a-z]*|--interactive|--patch|-p)\b/i;

export function getInteractiveCommands(): string[] {
  const additional =
    process.env.INTERACTIVE_COMMANDS?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];
  const excluded = new Set(
    process.env.INTERACTIVE_EXCLUDE?.split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [],
  );
  return [...DEFAULT_INTERACTIVE_COMMANDS, ...additional].filter(
    (cmd) => !excluded.has(cmd.toLowerCase()),
  );
}

function matchesCommandPrefix(command: string, prefix: string): boolean {
  const cmdLower = prefix.toLowerCase();
  return (
    command === cmdLower ||
    command.startsWith(`${cmdLower} `) ||
    command.startsWith(`${cmdLower}\t`)
  );
}

export function isInteractiveCommand(command: string): boolean {
  const trimmed = command.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();

  if (INTERACTIVE_FLAG_RE.test(trimmed)) {
    return true;
  }

  for (const cmd of getInteractiveCommands()) {
    if (matchesCommandPrefix(lower, cmd)) {
      return true;
    }

    const pipeIdx = lower.lastIndexOf('|');
    if (pipeIdx !== -1) {
      const afterPipe = lower.slice(pipeIdx + 1).trim();
      if (matchesCommandPrefix(afterPipe, cmd)) {
        return true;
      }
    }
  }

  return false;
}

export interface InteractiveRunResult {
  exitCode: number;
  output: string;
}

/** Full terminal handoff when tmux is unavailable (outside-tmux `!` only). */
export async function runBlockingHandoff(
  ctx: ExtensionContext,
  command: string,
  cwd = ctx.cwd,
): Promise<InteractiveRunResult | null> {
  if (ctx.mode !== 'tui') {
    return null;
  }

  const exitCode = await ctx.ui.custom<number | null>(
    (tui, _theme, _kb, done) => {
      tui.stop();
      process.stdout.write('\x1b[2J\x1b[H');

      if (cwd !== process.cwd()) {
        process.stdout.write(
          `\x1b[1;34m$\x1b[0m cd ${JSON.stringify(cwd)} && ${command}\n\n`,
        );
      } else {
        process.stdout.write(`\x1b[1;34m$\x1b[0m ${command}\n\n`);
      }

      const shell = process.env.SHELL || '/bin/sh';
      const result = spawnSync(
        shell,
        [
          '-c',
          cwd === process.cwd()
            ? command
            : `cd ${JSON.stringify(cwd)} && ${command}`,
        ],
        {
          stdio: 'inherit',
          env: process.env,
        },
      );

      tui.start();
      tui.requestRender(true);
      done(result.status);

      return { render: () => [], invalidate: () => {} };
    },
  );

  const code = exitCode ?? 1;
  return {
    exitCode: code,
    output:
      code === 0
        ? '(interactive command completed successfully)'
        : `(interactive command exited with code ${code})`,
  };
}
