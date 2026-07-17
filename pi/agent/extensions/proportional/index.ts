import {
  buildSessionContext,
  type ExtensionAPI,
  type ExtensionCommandContext,
  getMarkdownTheme,
  type SessionContext,
} from '@earendil-works/pi-coding-agent';
import {
  Key,
  Markdown,
  type MarkdownTheme,
  matchesKey,
  truncateToWidth,
  visibleWidth,
} from '@earendil-works/pi-tui';

type UiTheme = ExtensionCommandContext['ui']['theme'];

const MEASURE_COLS = 68;
const PARAGRAPH_INDENT = '   ';

function createProportionalMarkdownTheme(theme: UiTheme): MarkdownTheme {
  const base = getMarkdownTheme();
  const prose = (text: string) => theme.fg('text', text);
  const muted = (text: string) => theme.fg('dim', text);

  return {
    ...base,
    heading: (text) => prose(theme.bold(text)),
    link: prose,
    linkUrl: muted,
    code: muted,
    codeBlock: muted,
    codeBlockBorder: muted,
    quote: (text) => prose(theme.italic(text)),
    quoteBorder: muted,
    hr: () => muted(`  ${'─'.repeat(12)} ❧ ${'─'.repeat(12)}  `),
    listBullet: muted,
    bold: (text) => theme.bold(prose(text)),
    italic: (text) => theme.italic(prose(text)),
    strikethrough: (text) => theme.strikethrough(prose(text)),
    underline: (text) => theme.underline(prose(text)),
    codeBlockIndent: '      ',
  };
}

function applyParagraphIndents(text: string): string {
  const paragraphs = text.split(/\n\n+/).filter((part) => part.trim().length > 0);
  if (paragraphs.length === 0) return text;

  return paragraphs
    .map((paragraph, index) => {
      if (index === 0) return paragraph.trim();
      const lines = paragraph.trim().split('\n');
      return lines
        .map((line, lineIndex) =>
          lineIndex === 0 ? `${PARAGRAPH_INDENT}${line}` : `${PARAGRAPH_INDENT}${line}`,
        )
        .join('\n');
    })
    .join('\n\n');
}

type SessionMessage = SessionContext['messages'][number];

function extractMessageText(message: SessionMessage): string {
  if (message.role === 'user') {
    if (typeof message.content === 'string') return message.content.trim();
    return message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  if (message.role === 'assistant') {
    const textParts: string[] = [];
    for (const part of message.content) {
      if (part.type === 'text' && part.text.trim().length > 0) {
        textParts.push(part.text.trim());
      }
    }
    return textParts.join('\n\n');
  }

  return '';
}

function getLastMessage(
  sessionManager: ExtensionCommandContext['sessionManager'],
): SessionMessage | undefined {
  const { messages } = buildSessionContext(
    sessionManager.getEntries(),
    sessionManager.getLeafId(),
  );
  return messages.at(-1);
}

function roleLabel(role: SessionMessage['role']): string {
  switch (role) {
    case 'user':
      return 'You';
    case 'assistant':
      return 'Assistant';
    default:
      return role;
  }
}

class ProportionalReaderComponent {
  private readonly markdown: Markdown;
  private readonly role: string;
  private scrollOffset = 0;
  private cachedLines?: string[];
  private cachedWidth?: number;

  constructor(text: string, role: string, theme: UiTheme) {
    this.role = role;
    const proportionalTheme = createProportionalMarkdownTheme(theme);
    const prepared = applyParagraphIndents(text);
    this.markdown = new Markdown(prepared, 0, 0, proportionalTheme, {
      color: (content) => theme.fg('text', content),
    });
  }

  private getContentLines(measure: number): string[] {
    if (this.cachedLines && this.cachedWidth === measure) {
      return this.cachedLines;
    }
    const lines = this.markdown.render(measure).filter((line) => line.trim().length > 0);
    this.cachedLines = lines.length > 0 ? lines : [''];
    this.cachedWidth = measure;
    return this.cachedLines;
  }

  private scrollBy(delta: number, viewportRows: number, measure: number): void {
    const maxScroll = Math.max(0, this.getContentLines(measure).length - viewportRows);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset + delta, maxScroll));
  }

  handleInput(data: string, viewportRows: number, measure: number): 'close' | void {
    if (matchesKey(data, Key.escape) || matchesKey(data, Key.esc)) {
      return 'close';
    }
    if (
      matchesKey(data, Key.up) ||
      matchesKey(data, 'k') ||
      matchesKey(data, Key.pageUp)
    ) {
      this.scrollBy(-1, viewportRows, measure);
      return;
    }
    if (
      matchesKey(data, Key.down) ||
      matchesKey(data, 'j') ||
      matchesKey(data, Key.pageDown)
    ) {
      this.scrollBy(1, viewportRows, measure);
      return;
    }
  }

  invalidate(): void {
    this.markdown.invalidate();
    this.cachedLines = undefined;
    this.cachedWidth = undefined;
  }

  render(width: number, height: number, theme: UiTheme): string[] {
    const measure = Math.min(MEASURE_COLS, Math.max(24, width - 4));
    const colPad = Math.max(0, Math.floor((width - measure) / 2));
    const chromeRows = 4;
    const viewportRows = Math.max(1, height - chromeRows);
    const contentLines = this.getContentLines(measure);
    const maxScroll = Math.max(0, contentLines.length - viewportRows);
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, maxScroll));

    const visible = contentLines.slice(
      this.scrollOffset,
      this.scrollOffset + viewportRows,
    );

    const header = truncateToWidth(
      theme.fg('dim', 'The Proportional Web') +
        theme.fg('text', `  ·  ${this.role}`) +
        theme.fg('dim', '  ·  j/k ↑↓ scroll  ·  esc close'),
      width,
    );
    const headerPad = Math.max(0, width - visibleWidth(header));

    const scrollInfo =
      contentLines.length > viewportRows
        ? theme.fg(
            'dim',
            `${this.scrollOffset + 1}–${Math.min(this.scrollOffset + viewportRows, contentLines.length)} of ${contentLines.length}`,
          )
        : theme.fg('dim', `${contentLines.length} lines`);

    const footer = truncateToWidth(scrollInfo, width);
    const footerPad = Math.max(0, width - visibleWidth(footer));

    const lines: string[] = [];
    lines.push(header + ' '.repeat(headerPad));
    lines.push(theme.fg('dim', '─'.repeat(width)));

    for (const line of visible) {
      const padded = ' '.repeat(colPad) + line;
      const padRight = Math.max(0, width - visibleWidth(padded));
      lines.push(padded + ' '.repeat(padRight));
    }

    for (let i = visible.length; i < viewportRows; i++) {
      lines.push(' '.repeat(width));
    }

    lines.push(theme.fg('dim', '─'.repeat(width)));
    lines.push(footer + ' '.repeat(footerPad));

    return lines;
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand('proportional', {
    description: 'Read the last message in proportional typography',
    handler: async (_args, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify('/proportional requires interactive mode', 'error');
        return;
      }

      const lastMessage = getLastMessage(ctx.sessionManager);
      if (!lastMessage) {
        ctx.ui.notify('No messages in this session yet', 'warning');
        return;
      }

      const text = extractMessageText(lastMessage);
      if (!text) {
        ctx.ui.notify('The last message has no readable text', 'warning');
        return;
      }

      await ctx.ui.custom<void>(
        (tui, theme, _keybindings, done) => {
          const reader = new ProportionalReaderComponent(
            text,
            roleLabel(lastMessage.role),
            theme,
          );

          return {
            render: (width: number) => {
              const height = Math.max(10, tui.terminal.rows - 2);
              return reader.render(width, height, theme);
            },
            handleInput: (data: string) => {
              const height = Math.max(10, tui.terminal.rows - 2);
              const measure = Math.min(MEASURE_COLS, Math.max(24, tui.terminal.columns - 4));
              const viewportRows = Math.max(1, height - 4);
              if (reader.handleInput(data, viewportRows, measure) === 'close') {
                done();
                return;
              }
              tui.requestRender();
            },
            invalidate: () => reader.invalidate(),
          };
        },
        {
          overlay: true,
          overlayOptions: {
            anchor: 'top-center',
            width: '100%',
            maxHeight: '100%',
            margin: 0,
          },
        },
      );
    },
  });
}
