import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Text } from '@earendil-works/pi-tui';
import { readFileSync, statSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import { Type } from 'typebox';
import { readEnvValue } from '../shared/read-env.ts';

const MAX_FILES = 10;
const MAX_REQUEST_BYTES = 25 * 1024 * 1024;
const MAX_MESSAGE_LENGTH = 2000;

const MISSING_CONFIG_MSG =
  'Missing Discord config. Set DISCORD_WEBHOOK_URL or both DISCORD_BOT_TOKEN and DISCORD_CHANNEL_ID in ~/.pi/agent/.env';

interface ResolvedFile {
  absolutePath: string;
  filename: string;
  size: number;
  mimeType: string;
  buffer: Buffer;
}

interface DiscordUploadDetails {
  method: 'webhook' | 'bot';
  filenames: string[];
  totalBytes: number;
  messageId?: string;
  channelId?: string;
  mentioned: boolean;
}

function getWebhookUrl(): string | undefined {
  return readEnvValue('DISCORD_WEBHOOK_URL');
}

function getBotToken(): string | undefined {
  return readEnvValue('DISCORD_BOT_TOKEN');
}

function getDefaultChannelId(): string | undefined {
  return readEnvValue('DISCORD_CHANNEL_ID');
}

function getMentionUserId(): string | undefined {
  return readEnvValue('DISCORD_MENTION_USER_ID');
}

function getMimeType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
  };
  return map[ext] ?? 'application/octet-stream';
}

function buildMessageContent(message?: string): {
  content: string;
  mentioned: boolean;
} {
  const mentionId = getMentionUserId();
  const trimmed = message?.trim();
  let content = trimmed ?? '';

  if (mentionId) {
    const mention = `<@${mentionId}>`;
    content = content ? `${mention} ${content}` : mention;
    return { content, mentioned: true };
  }

  return { content, mentioned: false };
}

function resolveFiles(cwd: string, filePaths: string[]): ResolvedFile[] {
  if (filePaths.length > MAX_FILES) {
    throw new Error(`Discord allows at most ${MAX_FILES} files per message`);
  }

  const files: ResolvedFile[] = [];
  let totalBytes = 0;

  for (const filePath of filePaths) {
    const absolutePath = resolve(cwd, filePath);
    const stat = statSync(absolutePath);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${absolutePath}`);
    }

    totalBytes += stat.size;
    if (totalBytes > MAX_REQUEST_BYTES) {
      throw new Error(
        `Total upload size exceeds Discord's ${MAX_REQUEST_BYTES / (1024 * 1024)} MiB request limit`,
      );
    }

    const filename = basename(absolutePath);
    files.push({
      absolutePath,
      filename,
      size: stat.size,
      mimeType: getMimeType(filename),
      buffer: readFileSync(absolutePath),
    });
  }

  return files;
}

function buildFormData(files: ResolvedFile[], content: string): FormData {
  const form = new FormData();
  const payload: Record<string, unknown> = { content };

  if (files.length > 0) {
    payload.attachments = files.map((file, index) => ({
      id: index,
      filename: file.filename,
      description: file.filename,
    }));
  }

  form.append('payload_json', JSON.stringify(payload));

  for (const [index, file] of files.entries()) {
    form.append(
      `files[${index}]`,
      new Blob([new Uint8Array(file.buffer)], { type: file.mimeType }),
      file.filename,
    );
  }

  return form;
}

async function uploadViaWebhook(
  webhookUrl: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<{ id?: string }> {
  const url = new URL(webhookUrl);
  url.searchParams.set('wait', 'true');

  const response = await fetch(url, {
    method: 'POST',
    body: form,
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Discord webhook upload failed (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as { id?: string };
}

async function uploadViaBot(
  token: string,
  channelId: string,
  form: FormData,
  signal?: AbortSignal,
): Promise<{ id?: string }> {
  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${token}`,
      },
      body: form,
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Discord bot upload failed (${response.status}): ${await response.text()}`,
    );
  }

  return (await response.json()) as { id?: string };
}

function getConfiguredMethod():
  | { method: 'webhook'; webhookUrl: string }
  | { method: 'bot'; token: string; channelId: string }
  | null {
  const webhookUrl = getWebhookUrl();
  if (webhookUrl) {
    return { method: 'webhook', webhookUrl };
  }

  const token = getBotToken();
  const channelId = getDefaultChannelId();
  if (token && channelId) {
    return { method: 'bot', token, channelId };
  }

  return null;
}

export default function (pi: ExtensionAPI) {
  const config = getConfiguredMethod();
  const mentionUserId = getMentionUserId();

  pi.registerTool({
    name: 'upload_to_discord',
    label: 'Upload to Discord',
    description:
      'Post a message and/or upload local files (images, videos, documents) to Discord. Uses DISCORD_WEBHOOK_URL if set, otherwise a bot token and channel ID.',
    promptSnippet:
      'Send a message or upload local files to Discord. Use after capture is done or when a file already exists.',
    promptGuidelines: [
      'Use upload_to_discord when a file already exists on disk or the user only wants to send a message.',
      'For recording new demos, load the capture-output skill first — do not capture inside this tool.',
      'Resolve file paths relative to the project cwd before calling.',
      'Discord allows up to 10 files and 25 MiB total per message.',
    ],
    parameters: Type.Object({
      message: Type.Optional(
        Type.String({
          description: 'Message text or caption to include with the post',
          maxLength: MAX_MESSAGE_LENGTH,
        }),
      ),
      filePaths: Type.Optional(
        Type.Array(
          Type.String({
            description: 'Path to a file to upload',
          }),
          {
            description:
              'Files to upload (0-10). Paths may be absolute or relative to cwd.',
            maxItems: MAX_FILES,
          },
        ),
      ),
      channelId: Type.Optional(
        Type.String({
          description:
            'Discord channel ID (bot mode only; overrides DISCORD_CHANNEL_ID)',
        }),
      ),
    }),

    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const activeConfig = getConfiguredMethod();
      if (!activeConfig) {
        throw new Error(MISSING_CONFIG_MSG);
      }

      const filePaths = params.filePaths ?? [];
      const hasMessage = Boolean(params.message?.trim());
      const hasFiles = filePaths.length > 0;

      if (!hasMessage && !hasFiles) {
        throw new Error('At least one of message or filePaths is required');
      }

      const { content, mentioned } = buildMessageContent(params.message);
      if (!content.trim()) {
        throw new Error(
          'Resulting message is empty. Provide message text or set DISCORD_MENTION_USER_ID.',
        );
      }

      if (content.length > MAX_MESSAGE_LENGTH) {
        throw new Error(
          `Message exceeds Discord's ${MAX_MESSAGE_LENGTH} character limit`,
        );
      }

      const files = hasFiles ? resolveFiles(ctx.cwd, filePaths) : [];
      const form = buildFormData(files, content);

      let payload: { id?: string };
      let method: DiscordUploadDetails['method'];
      let channelId: string | undefined;

      if (activeConfig.method === 'webhook') {
        if (params.channelId) {
          throw new Error(
            'channelId is only supported in bot mode. Use DISCORD_WEBHOOK_URL for a fixed channel, or switch to bot credentials.',
          );
        }
        payload = await uploadViaWebhook(
          activeConfig.webhookUrl,
          form,
          signal,
        );
        method = 'webhook';
      } else {
        channelId = params.channelId ?? activeConfig.channelId;
        if (!channelId) {
          throw new Error(
            'Missing channel ID. Set DISCORD_CHANNEL_ID or pass channelId.',
          );
        }
        payload = await uploadViaBot(
          activeConfig.token,
          channelId,
          form,
          signal,
        );
        method = 'bot';
      }

      const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
      const details: DiscordUploadDetails = {
        method,
        filenames: files.map((file) => file.filename),
        totalBytes,
        messageId: payload.id,
        channelId,
        mentioned,
      };

      const parts: string[] = [];
      if (details.filenames.length > 0) {
        const fileList = details.filenames
          .map((name) => `\`${name}\``)
          .join(', ');
        const sizeMb = (totalBytes / (1024 * 1024)).toFixed(2);
        parts.push(`Uploaded ${fileList} (${sizeMb} MiB)`);
      } else {
        parts.push('Posted message');
      }
      parts.push(`to Discord via ${method}`);
      if (mentioned) parts.push('with @mention');
      if (payload.id) parts.push(`— message id: ${payload.id}`);

      return {
        content: [{ type: 'text', text: `${parts.join(' ')}.` }],
        details,
      };
    },

    renderCall(args, theme) {
      const preview = args.filePaths?.length
        ? args.filePaths.slice(0, 2).join(', ') +
          (args.filePaths.length > 2
            ? ` +${args.filePaths.length - 2} more`
            : '')
        : (args.message?.slice(0, 60) ?? 'message');
      return new Text(
        theme.fg('toolTitle', theme.bold('upload_to_discord ')) +
          theme.fg('muted', preview),
        0,
        0,
      );
    },

    renderResult(result, _options, theme) {
      const details = result.details as DiscordUploadDetails | undefined;
      if (!details) {
        return new Text(theme.fg('error', 'Post failed'), 0, 0);
      }

      if (details.filenames.length === 0) {
        return new Text(
          theme.fg('success', '✓ ') + theme.fg('text', 'Message posted'),
          0,
          0,
        );
      }

      const sizeMb = (details.totalBytes / (1024 * 1024)).toFixed(2);
      return new Text(
        theme.fg('success', '✓ ') +
          theme.fg(
            'text',
            `${details.filenames.length} file(s) uploaded (${sizeMb} MiB)`,
          ),
        0,
        0,
      );
    },
  });

  pi.on('session_start', async (_event, ctx) => {
    if (config?.method === 'webhook') {
      const mentionNote = mentionUserId ? `, @mention ${mentionUserId}` : '';
      ctx.ui.notify(
        `Discord upload extension loaded (webhook${mentionNote})`,
        'info',
      );
      return;
    }

    if (config?.method === 'bot') {
      const mentionNote = mentionUserId ? `, @mention ${mentionUserId}` : '';
      ctx.ui.notify(
        `Discord upload extension loaded (bot → channel ${config.channelId}${mentionNote})`,
        'info',
      );
      return;
    }

    ctx.ui.notify(`Discord upload: ${MISSING_CONFIG_MSG}`, 'warning');
  });
}
