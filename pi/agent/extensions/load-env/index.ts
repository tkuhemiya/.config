import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { loadAgentEnvIntoProcess } from '../shared/read-env.ts';

// Runs at extension load time, before pi-mcp reads mcp.json on session_start.
loadAgentEnvIntoProcess();

export default function (_pi: ExtensionAPI) {}
