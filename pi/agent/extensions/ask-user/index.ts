import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import {
  Editor,
  type EditorTheme,
  Key,
  matchesKey,
  Text,
  truncateToWidth,
} from '@earendil-works/pi-tui';
import { Type } from 'typebox';

interface AskDetails {
  question: string;
  guesses: string[];
  answer: string | null;
  wasCustom: boolean;
}

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: 'ask_user',
    label: 'Ask User',
    description:
      'Ask the user a question with 3 AI-generated answer guesses plus a custom input option. ' +
      "Generate 3 likely answers as 'guesses' based on the context, then call this tool.",
    parameters: Type.Object({
      question: Type.String({ description: 'The question to ask the user' }),
      guesses: Type.Array(Type.String(), {
        minItems: 3,
        maxItems: 3,
        description: '3 AI-generated guess answers for the user to pick from',
      }),
    }),

    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      if (!ctx.hasUI) {
        return {
          content: [{ type: 'text', text: 'Error: UI not available' }],
          details: {
            question: params.question,
            guesses: params.guesses,
            answer: null,
            wasCustom: false,
          } as AskDetails,
        };
      }

      const allOptions = [...params.guesses, 'Type your own answer...'];
      let selectedIndex = 0;
      let editMode = false;
      let cachedLines: string[] | undefined;

      const result = await ctx.ui.custom<{
        answer: string;
        wasCustom: boolean;
        index?: number;
      } | null>((tui, theme, _kb, done) => {
        const editorTheme: EditorTheme = {
          borderColor: (s) => theme.fg('accent', s),
          selectList: {
            selectedPrefix: (t) => theme.fg('accent', t),
            selectedText: (t) => theme.fg('accent', t),
            description: (t) => theme.fg('muted', t),
            scrollInfo: (t) => theme.fg('dim', t),
            noMatch: (t) => theme.fg('warning', t),
          },
        };
        const editor = new Editor(tui, editorTheme);

        editor.onSubmit = (value) => {
          const trimmed = value.trim();
          if (trimmed) {
            done({ answer: trimmed, wasCustom: true });
          } else {
            editMode = false;
            editor.setText('');
            refresh();
          }
        };

        function refresh() {
          cachedLines = undefined;
          tui.requestRender();
        }

        function handleInput(data: string) {
          if (editMode) {
            if (matchesKey(data, Key.escape)) {
              editMode = false;
              editor.setText('');
              refresh();
              return;
            }
            editor.handleInput(data);
            refresh();
            return;
          }

          if (matchesKey(data, Key.up)) {
            selectedIndex = Math.max(0, selectedIndex - 1);
            refresh();
            return;
          }
          if (matchesKey(data, Key.down)) {
            selectedIndex = Math.min(allOptions.length - 1, selectedIndex + 1);
            refresh();
            return;
          }

          if (matchesKey(data, Key.enter)) {
            if (selectedIndex === 3) {
              // "Type your own answer..."
              editMode = true;
              refresh();
            } else {
              done({
                answer: allOptions[selectedIndex],
                wasCustom: false,
                index: selectedIndex + 1,
              });
            }
            return;
          }

          if (matchesKey(data, Key.escape)) {
            done(null);
          }
        }

        function render(width: number): string[] {
          if (cachedLines) return cachedLines;

          const lines: string[] = [];
          const add = (s: string) => lines.push(truncateToWidth(s, width));

          add(theme.fg('accent', '─'.repeat(width)));
          add(theme.fg('text', ` ${params.question}`));
          lines.push('');

          for (let i = 0; i < allOptions.length; i++) {
            const opt = allOptions[i];
            const selected = i === selectedIndex;
            const prefix = selected ? theme.fg('accent', '> ') : '  ';
            const num = i + 1;

            if (i === 3) {
              // Custom input option
              if (selected && editMode) {
                add(prefix + theme.fg('accent', `${num}. ${opt} ✎`));
              } else if (selected) {
                add(prefix + theme.fg('accent', `${num}. ${opt}`));
              } else {
                add(`  ${theme.fg('text', `${num}. ${opt}`)}`);
              }
            } else {
              if (selected) {
                add(prefix + theme.fg('accent', `${num}. ${opt}`));
              } else {
                add(`  ${theme.fg('text', `${num}. ${opt}`)}`);
              }
            }
          }

          if (editMode) {
            lines.push('');
            add(theme.fg('muted', ' Your answer:'));
            for (const line of editor.render(width - 2)) {
              add(` ${line}`);
            }
          }

          lines.push('');
          if (editMode) {
            add(theme.fg('dim', ' Enter to submit • Esc to go back'));
          } else {
            add(
              theme.fg('dim', ' ↑↓ navigate • Enter to select • Esc to cancel'),
            );
          }
          add(theme.fg('accent', '─'.repeat(width)));

          cachedLines = lines;
          return lines;
        }

        return {
          render,
          invalidate: () => {
            cachedLines = undefined;
          },
          handleInput,
        };
      });

      if (!result) {
        return {
          content: [{ type: 'text', text: 'User cancelled' }],
          details: {
            question: params.question,
            guesses: params.guesses,
            answer: null,
            wasCustom: false,
          } as AskDetails,
        };
      }

      if (result.wasCustom) {
        return {
          content: [{ type: 'text', text: `User wrote: ${result.answer}` }],
          details: {
            question: params.question,
            guesses: params.guesses,
            answer: result.answer,
            wasCustom: true,
          } as AskDetails,
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: `User selected: ${result.index}. ${result.answer}`,
          },
        ],
        details: {
          question: params.question,
          guesses: params.guesses,
          answer: result.answer,
          wasCustom: false,
        } as AskDetails,
      };
    },

    renderCall(args, theme, _context) {
      let text =
        theme.fg('toolTitle', theme.bold('ask_user ')) +
        theme.fg('muted', args.question);
      const g = args.guesses || [];
      if (g.length) {
        text += `\n${theme.fg('dim', `  Guesses: ${g.slice(0, 3).join(' / ')}`)}`;
      }
      return new Text(text, 0, 0);
    },

    renderResult(result, _options, theme, _context) {
      const details = result.details as AskDetails | undefined;
      if (!details || details.answer === null) {
        return new Text(theme.fg('warning', 'Cancelled'), 0, 0);
      }
      if (details.wasCustom) {
        return new Text(
          theme.fg('success', '✓ ') +
            theme.fg('muted', '(wrote) ') +
            theme.fg('accent', details.answer),
          0,
          0,
        );
      }
      return new Text(
        theme.fg('success', '✓ ') +
          theme.fg(
            'accent',
            `${details.guesses.indexOf(details.answer) + 1}. ${details.answer}`,
          ),
        0,
        0,
      );
    },
  });
}
