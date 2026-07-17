import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { isToolCallEventType } from '@earendil-works/pi-coding-agent';

/**
 * Permission Gate Extension
 *
 * Intercepts dangerous commands (sudo, rm -rf, etc.) and requires user confirmation
 * before allowing them to execute.
 */
export default function (pi: ExtensionAPI) {
  // List of dangerous command patterns that require confirmation
  const dangerousPatterns = [
    { pattern: /^sudo\s/i, description: 'sudo command' },
    { pattern: /mkfs/i, description: 'mkfs (format disk) command' },
    { pattern: /dd\s+.*of=\//i, description: 'dd command writing to root' },
    { pattern: /chmod\s+-R\s+777/i, description: 'chmod -R 777 command' },
    { pattern: /:\(\)\{\s*:\|:\s*&\s*\}\s*;/i, description: 'fork bomb' },
    { pattern: />\s*\/dev\/sd[a-z]/i, description: 'write to disk device' },
    { pattern: /echo\s+.*>\s*\/proc/i, description: 'write to /proc' },
    { pattern: /shutdown\s/i, description: 'shutdown command' },
    { pattern: /reboot/i, description: 'reboot command' },
    { pattern: /init\s+0/i, description: 'init 0 (shutdown) command' },
  ];

  pi.on('tool_call', async (event, ctx) => {
    if (isToolCallEventType('bash', event)) {
      const command = event.input.command;

      // Check if command matches any dangerous pattern
      for (const { pattern, description } of dangerousPatterns) {
        if (pattern.test(command)) {
          const confirmed = await ctx.ui.confirm(
            '⚠️ Dangerous Command Detected',
            `The following command is potentially dangerous:\n\n\`${command}\`\n\nReason: ${description}\n\nDo you want to proceed?`,
          );

          if (!confirmed) {
            return { block: true, reason: `Blocked by user: ${description}` };
          }

          // User confirmed, allow the command to proceed
          break;
        }
      }
    }
  });

  pi.on('session_start', async (_event, ctx) => {
    ctx.ui.notify(
      'Permission gate loaded: sudo and rm -rf commands require confirmation',
      'info',
    );
  });
}
