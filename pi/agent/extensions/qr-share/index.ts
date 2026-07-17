import type {
  ExtensionAPI,
  ExtensionContext,
  Theme,
} from '@earendil-works/pi-coding-agent';
import {
  Container,
  Key,
  matchesKey,
  Spacer,
  Text,
  truncateToWidth,
} from '@earendil-works/pi-tui';
import { Type } from 'typebox';
import {
  AGENT_CANCELLED_TEXT,
  AGENT_RESULT_TEXT,
  generateQrPayload,
  previewText,
  type QrPayload,
  type QrShareState,
  type QrToolDetails,
  STATE_TYPE,
  TOOL_NAME,
} from './lib.ts';

function persistState(pi: ExtensionAPI, state: QrShareState) {
  pi.appendEntry<QrShareState>(STATE_TYPE, state);
}

function restoreEnabledFromBranch(ctx: ExtensionContext): boolean {
  let enabled = false;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === 'custom' && entry.customType === STATE_TYPE) {
      const data = entry.data as QrShareState | undefined;
      if (data) enabled = data.enabled;
    }
  }
  return enabled;
}

function isQrModeEnabled(pi: ExtensionAPI): boolean {
  return pi.getActiveTools().includes(TOOL_NAME);
}

function setQrMode(pi: ExtensionAPI, enabled: boolean) {
  const already = pi.getActiveTools().includes(TOOL_NAME);
  if (enabled === already) return;

  const active = pi.getActiveTools();
  if (enabled) {
    pi.setActiveTools([...new Set([...active, TOOL_NAME])]);
    return;
  }

  pi.setActiveTools(active.filter((name) => name !== TOOL_NAME));
}

function toToolDetails(payload: QrPayload): QrToolDetails {
  return {
    label: payload.label,
    preview: previewText(payload.text),
    charCount: payload.charCount,
    ascii: payload.ascii,
  };
}

function buildQrDisplayComponent(
  details: QrToolDetails,
  theme: Theme,
  options?: { title?: string; footer?: string },
): Container {
  const container = new Container();

  if (options?.title) {
    container.addChild(
      new Text(theme.fg('accent', theme.bold(options.title)), 0, 0),
    );
  }

  if (details.label) {
    container.addChild(new Text(theme.fg('text', details.label), 0, 0));
  }

  if (details.preview) {
    container.addChild(
      new Text(theme.fg('muted', truncateToWidth(details.preview, 64)), 0, 0),
    );
  }

  container.addChild(new Spacer(1));

  if (details.ascii) {
    for (const line of details.ascii.split('\n')) {
      container.addChild(new Text(line, 0, 0));
    }
  }

  if (options?.footer) {
    container.addChild(new Spacer(1));
    container.addChild(new Text(theme.fg('dim', options.footer), 0, 0));
  }

  return container;
}

async function showQrOverlay(ctx: ExtensionContext, payload: QrPayload) {
  if (!ctx.hasUI || ctx.mode !== 'tui') {
    ctx.ui.notify('QR display requires TUI mode.', 'warning');
    return;
  }

  const details = toToolDetails(payload);

  await ctx.ui.custom<void>(
    (_tui, theme, _kb, done) => {
      const container = buildQrDisplayComponent(details, theme, {
        title: 'QR code',
        footer: 'Esc or Enter to close • Screenshot or scan with phone',
      });

      return {
        render: (width: number) => container.render(width),
        invalidate: () => container.invalidate(),
        handleInput: (data: string) => {
          if (matchesKey(data, Key.escape) || matchesKey(data, Key.enter)) {
            done();
          }
        },
      };
    },
    { overlay: true },
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: TOOL_NAME,
    label: 'Show QR',
    description:
      'Generate a QR code for a URL or short string so the user can scan it on their phone. ' +
      'Use when the user cannot copy from the terminal.',
    promptSnippet: 'Show a URL or short string as a scannable QR code',
    promptGuidelines: [
      'Use show_qr when the user needs a URL, token, or short string on their phone and cannot copy from the terminal.',
      'Prefer show_qr for URLs and short one-time codes. Do not use it for long secrets or multi-line output.',
      'Set sensitive: true for tokens and API keys so the user confirms before display.',
      'Include a short label when the QR encodes something non-obvious.',
      'After show_qr succeeds, do not repeat the encoded URL or token in your reply.',
    ],
    parameters: Type.Object({
      text: Type.String({
        description: 'URL or text to encode in the QR code',
        maxLength: 1800,
      }),
      label: Type.Optional(
        Type.String({
          description: 'Short label shown above the QR code',
          maxLength: 120,
        }),
      ),
      sensitive: Type.Optional(
        Type.Boolean({
          description:
            'Set true for tokens or API keys to require user confirmation before display',
        }),
      ),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (params.sensitive && ctx.hasUI) {
        const ok = await ctx.ui.confirm(
          'Show sensitive QR?',
          'This will display on screen and may be stored in the session log.',
        );
        if (!ok) {
          return {
            content: [{ type: 'text', text: AGENT_CANCELLED_TEXT }],
            details: { cancelled: true } satisfies QrToolDetails,
            terminate: true,
          };
        }
      }

      const payload = await generateQrPayload(params.text, params.label);

      return {
        content: [{ type: 'text', text: AGENT_RESULT_TEXT }],
        details: toToolDetails(payload),
        terminate: true,
      };
    },

    renderCall(args, theme) {
      const preview = args.label
        ? `${args.label}: ${previewText(args.text ?? '', 48)}`
        : previewText(args.text ?? '', 60);
      return new Text(
        theme.fg('toolTitle', theme.bold('show_qr ')) +
          theme.fg('muted', preview),
        0,
        0,
      );
    },

    renderResult(result, _options, theme) {
      const details = result.details as QrToolDetails | undefined;

      if (details?.cancelled) {
        return new Text(theme.fg('warning', 'Cancelled'), 0, 0);
      }

      if (details?.ascii) {
        return buildQrDisplayComponent(details, theme);
      }

      return new Text(
        theme.fg('success', '✓ ') + theme.fg('text', 'QR displayed'),
        0,
        0,
      );
    },
  });

  pi.on('tool_result', async (event) => {
    if (event.toolName !== TOOL_NAME) return;

    const details = event.details as QrToolDetails | undefined;
    const text = details?.cancelled ? AGENT_CANCELLED_TEXT : AGENT_RESULT_TEXT;

    return {
      content: [{ type: 'text', text }],
    };
  });

  pi.on('session_start', async (_event, ctx) => {
    const enabled = restoreEnabledFromBranch(ctx);
    setQrMode(pi, enabled);
    if (enabled) {
      ctx.ui.notify('QR mode restored — agent can use show_qr', 'info');
    }
  });

  pi.registerCommand('qr', {
    description:
      'Enable QR mode for the agent, show a QR immediately, or turn it off (/qr off)',
    handler: async (args, ctx) => {
      const trimmed = args.trim();

      if (trimmed === 'off') {
        setQrMode(pi, false);
        persistState(pi, { enabled: false });
        ctx.ui.notify('QR mode off', 'info');
        return;
      }

      if (trimmed === 'status') {
        const enabled = isQrModeEnabled(pi);
        ctx.ui.notify(
          enabled
            ? 'QR mode is on — agent can use show_qr'
            : 'QR mode is off — run /qr to enable',
          'info',
        );
        return;
      }

      setQrMode(pi, true);
      persistState(pi, { enabled: true });

      if (!trimmed) {
        ctx.ui.notify(
          'QR mode on — agent can use show_qr for URLs and short strings',
          'info',
        );
        return;
      }

      try {
        const payload = await generateQrPayload(trimmed);
        await showQrOverlay(ctx, payload);
        ctx.ui.notify('QR mode on — agent can use show_qr', 'info');
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to generate QR code';
        ctx.ui.notify(message, 'error');
      }
    },
  });
}
