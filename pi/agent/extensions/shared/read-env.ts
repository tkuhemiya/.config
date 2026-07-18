import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export function getAgentEnvPath() {
  return join(homedir(), '.pi', 'agent', '.env');
}

export function readEnvValue(name: string): string | undefined {
  if (process.env[name]) return process.env[name];

  const envPath = getAgentEnvPath();
  let envText = '';

  try {
    envText = readFileSync(envPath, 'utf8');
  } catch {
    return undefined;
  }

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match || match[1] !== name) continue;

    return parseEnvValue(match[2]);
  }

  return undefined;
}

function parseEnvValue(raw: string): string {
  const value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value.replace(/\s+#.*$/, '');
}

/** Load ~/.pi/agent/.env into process.env for keys not already set. */
export function loadAgentEnvIntoProcess(): void {
  const envPath = getAgentEnvPath();
  let envText = '';

  try {
    envText = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }

  for (const line of envText.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/,
    );
    if (!match) continue;

    const name = match[1];
    if (process.env[name] !== undefined) continue;
    process.env[name] = parseEnvValue(match[2]);
  }
}
