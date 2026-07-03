/**
 * Subagents extension.
 *
 * Provides Explorer and Worker sub-agents as isolated extensions of the main Pi
 * agent. By default they inherit the parent's model/thinking. Explorers receive
 * read-only tools; Workers inherit the parent's active tool set, with bash
 * replaced by safe_bash unless configured otherwise.
 */
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	getMarkdownTheme,
	parseFrontmatter,
	truncateHead,
	withFileMutationQueue,
} from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text, visibleWidth } from "@earendil-works/pi-tui";
import { Type } from "typebox";

// ── Types ──────────────────────────────────────────────────────────────

type SubagentKind = "explorer" | "worker" | "custom";
type SubagentAction = "run" | "start" | "send" | "status" | "stop";
type SubagentStatus = "pending" | "running" | "waiting" | "completed" | "failed" | "stopped";
type ReportStatus = "progress" | "needs_main_input" | "completed" | "failed";

interface SubagentReport {
	status: ReportStatus;
	summary: string;
	question?: string;
	options?: string[];
	files?: Array<{ path: string; lines?: string; reason?: string }>;
	artifacts?: Array<{ type: string; path?: string; content?: string }>;
}

export interface AgentConfig {
	name: string;
	kind: SubagentKind;
	description: string;
	tools: string[] | "readonly" | "inherit" | "inherit-with-safe-bash";
	model: string;
	thinking: string;
	systemPrompt: string;
	filePath: string;
	/** If this agent has `subagent`, restrict the child-visible registry. */
	subagentAgents?: string[];
}

interface ToolEvent {
	tool: string;
	args: string;
	toolCallId?: string;
	status: "running" | "done";
	children?: AgentResult[];
}

interface AgentProgress {
	agent: string;
	status: SubagentStatus;
	task: string;
	recentTools: ToolEvent[];
	toolCount: number;
	tokens: number;
	durationMs: number;
	lastMessage: string;
	error?: string;
	report?: SubagentReport;
}

interface AgentResult {
	id?: string;
	agent: string;
	kind: SubagentKind;
	task: string;
	output: string;
	exitCode: number;
	progress: AgentProgress;
	model?: string;
	contextWindow?: number;
	usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: number; turns: number };
	reports: SubagentReport[];
}

interface SubagentRecord {
	id: string;
	kind: SubagentKind;
	agentName: string;
	status: SubagentStatus;
	task: string;
	cwd: string;
	model: string;
	thinking: string;
	tools: string[];
	createdAt: number;
	updatedAt: number;
	history: Array<{ direction: "main" | "subagent"; text: string; at: number }>;
	lastResult?: AgentResult;
	pendingQuestion?: string;
}

interface Details {
	results?: AgentResult[];
	records?: SubagentRecord[];
}

interface ExtensionConfig {
	maxConcurrency?: number;
	maxActiveSubagents?: number;
	workerToolMode?: "inherit" | "inherit-with-safe-bash";
	allowRecursiveWorkers?: boolean;
	maxReturnedBytes?: number;
}

interface ResolvedProfile {
	model: string;
	thinking: string;
	tools: string[];
	loadDefaultExtensions: boolean;
	contextWindow?: number;
}

// ── Config / constants ────────────────────────────────────────────────

const EXT_DIR = path.dirname(new URL(import.meta.url).pathname);
const AGENTS_DIR = path.join(EXT_DIR, "agents");
const TOOLS_DIR = path.join(EXT_DIR, "tools");
const CONFIG_PATH = path.join(EXT_DIR, "config.json");
const DEFAULT_MAX_CONCURRENCY = 4;
const DEFAULT_MAX_ACTIVE = 8;
const DEFAULT_MAX_RETURNED_BYTES = 12_000;

const BUILTIN_TOOLS = new Set(["read", "write", "edit", "bash", "grep", "find", "ls"]);
const READONLY_TOOLS = ["read", "grep", "find", "ls"];

const EXT_BASE = path.join(EXT_DIR, "..");
const REPORT_TOOL = "report_to_main";
const REPORT_TOOL_EXTENSION = path.join(TOOLS_DIR, "report-to-main.ts");
const SAFE_BASH_EXTENSION = path.join(TOOLS_DIR, "safe-bash.ts");
const CUSTOM_TOOL_EXTENSIONS: Record<string, string> = {
	web_search: path.join(EXT_BASE, "exa-search.ts"),
	web_get_contents: path.join(EXT_BASE, "exa-search.ts"),
	safe_bash: SAFE_BASH_EXTENSION,
	subagent: path.join(EXT_DIR, "index.ts"),
	[REPORT_TOOL]: REPORT_TOOL_EXTENSION,
};

let agents: AgentConfig[] = [];
const records = new Map<string, SubagentRecord>();

const SUBAGENT_ALLOWLIST: string[] | undefined = (() => {
	const raw = process.env.PI_SUBAGENT_ALLOWED;
	if (!raw) return undefined;
	const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
	return list.length > 0 ? list : undefined;
})();

function loadConfig(): ExtensionConfig {
	try {
		if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8")) as ExtensionConfig;
	} catch {}
	return {};
}

// ── Agent registry ────────────────────────────────────────────────────

export function registerAgent(config: AgentConfig): void {
	if (SUBAGENT_ALLOWLIST && !SUBAGENT_ALLOWLIST.includes(config.name)) return;
	if (agents.find((a) => a.name === config.name)) throw new Error(`Agent already registered: ${config.name}`);
	agents.push(config);
}

export function unregisterAgent(name: string): void {
	agents = agents.filter((a) => a.name !== name);
}

(globalThis as any).__pi_subagents = { registerAgent, unregisterAgent };

function parseTools(raw: string | undefined): AgentConfig["tools"] {
	const value = (raw || "readonly").trim();
	if (value === "readonly" || value === "inherit" || value === "inherit-with-safe-bash") return value;
	return value.split(",").map((t) => t.trim()).filter(Boolean);
}

function loadAgents(): AgentConfig[] {
	const loaded: AgentConfig[] = [];
	if (!fs.existsSync(AGENTS_DIR)) return loaded;
	for (const entry of fs.readdirSync(AGENTS_DIR)) {
		if (!entry.endsWith(".md")) continue;
		const filePath = path.join(AGENTS_DIR, entry);
		const content = fs.readFileSync(filePath, "utf-8");
		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);
		if (!frontmatter.name) continue;
		const rawSubagentAgents = frontmatter.subagent_agents;
		loaded.push({
			name: frontmatter.name,
			kind: normalizeKind(frontmatter.kind || frontmatter.name),
			description: frontmatter.description || "",
			tools: parseTools(frontmatter.tools),
			model: frontmatter.model || "inherit",
			thinking: frontmatter.thinking || "inherit",
			systemPrompt: body,
			filePath,
			subagentAgents: rawSubagentAgents ? rawSubagentAgents.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
		});
	}
	return loaded;
}

function normalizeKind(kind: string): SubagentKind {
	if (kind === "explorer" || kind === "scout" || kind === "researcher") return "explorer";
	if (kind === "worker") return "worker";
	return "custom";
}

function findAgent(params: { kind?: string; agent?: string }): AgentConfig | undefined {
	if (params.agent) return agents.find((a) => a.name === params.agent);
	const kind = normalizeKind(params.kind || "explorer");
	if (kind === "explorer") {
		return agents.find((a) => a.name === "explorer") || agents.find((a) => a.name === "scout") || agents.find((a) => a.kind === "explorer");
	}
	if (kind === "worker") return agents.find((a) => a.name === "worker") || agents.find((a) => a.kind === "worker");
	return undefined;
}

// ── Profile resolution ────────────────────────────────────────────────

function currentModelString(ctx: ExtensionContext): string {
	const model = ctx.model;
	return model ? `${model.provider}/${model.id}` : "opencode-go/deepseek-v4-flash";
}

function resolveTools(agent: AgentConfig, pi: ExtensionAPI, config: ExtensionConfig): { tools: string[]; loadDefaultExtensions: boolean } {
	const raw = agent.kind === "worker" && agent.tools === "inherit" && config.workerToolMode
		? config.workerToolMode
		: agent.tools;

	if (raw === "readonly") return { tools: [...READONLY_TOOLS], loadDefaultExtensions: false };

	if (raw === "inherit" || raw === "inherit-with-safe-bash") {
		let active = pi.getActiveTools();
		// Workers should not spawn arbitrary workers by default; keep subagent only
		// when explicitly allowed by the agent frontmatter/config allowlist.
		if (!config.allowRecursiveWorkers && !agent.subagentAgents?.length) {
			active = active.filter((t) => t !== "subagent");
		}
		if (raw === "inherit-with-safe-bash") {
			active = active.map((t) => (t === "bash" ? "safe_bash" : t));
			if (!active.includes("safe_bash")) active.push("safe_bash");
		}
		return { tools: unique(active), loadDefaultExtensions: true };
	}

	return { tools: unique(raw), loadDefaultExtensions: false };
}

function resolveProfile(agent: AgentConfig, pi: ExtensionAPI, ctx: ExtensionContext, config: ExtensionConfig): ResolvedProfile {
	const model = !agent.model || agent.model === "inherit" ? currentModelString(ctx) : agent.model;
	const thinking = !agent.thinking || agent.thinking === "inherit" ? pi.getThinkingLevel() : agent.thinking;
	const { tools, loadDefaultExtensions } = resolveTools(agent, pi, config);
	const [provider, modelId] = model.split("/");
	return {
		model,
		thinking,
		tools: unique([...tools, REPORT_TOOL]),
		loadDefaultExtensions,
		contextWindow: provider && modelId ? ctx.modelRegistry.find(provider, modelId)?.contextWindow : undefined,
	};
}

function unique<T>(items: T[]): T[] {
	return Array.from(new Set(items));
}

// ── Pi process args ───────────────────────────────────────────────────

function resolvePiBinary(): { command: string; baseArgs: string[] } {
	const entry = process.argv[1];
	if (entry) {
		try {
			const realEntry = fs.realpathSync(entry);
			if (/\.(?:mjs|cjs|js)$/i.test(realEntry)) return { command: process.execPath, baseArgs: [realEntry] };
		} catch {}
	}
	return { command: "pi", baseArgs: [] };
}

function reportInstructions(): string {
	return `

## Parent communication

You are a sub-agent with an isolated context. The parent/main agent does not see your private exploration unless you report it.

Use the \`${REPORT_TOOL}\` tool for all communication back to the parent:
- status \`progress\` for useful interim updates.
- status \`needs_main_input\` when blocked by a decision/question; ask exactly one clear question and include options if helpful.
- status \`completed\` when finished; summarize compactly and list changed/relevant files.
- status \`failed\` if you cannot complete the task.

Do not dump large raw file contents, logs, or diffs. Return compact summaries, exact file paths, line ranges, and only short snippets.`;
}

async function buildPiArgs(
	agent: AgentConfig,
	profile: ResolvedProfile,
	task: string,
): Promise<{ args: string[]; tempDir: string; childEnv: NodeJS.ProcessEnv | undefined }> {
	const piBin = resolvePiBinary();
	const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pi-sub-"));

	const promptPath = path.join(tempDir, `${agent.name}.md`);
	await withFileMutationQueue(promptPath, async () => {
		await fs.promises.writeFile(promptPath, agent.systemPrompt + reportInstructions(), { encoding: "utf-8", mode: 0o600 });
	});

	const args = [...piBin.baseArgs, "--mode", "json", "-p", "--no-session", "--no-skills"];

	if (!profile.loadDefaultExtensions) args.push("--no-extensions");

	const allowlist = unique(profile.tools);
	if (allowlist.length > 0) args.push("--tools", allowlist.join(","));
	else args.push("--no-tools");

	const extensionPaths = new Set<string>([REPORT_TOOL_EXTENSION]);
	for (const tool of allowlist) {
		if (tool === REPORT_TOOL) extensionPaths.add(REPORT_TOOL_EXTENSION);
		else if (!BUILTIN_TOOLS.has(tool) && CUSTOM_TOOL_EXTENSIONS[tool]) extensionPaths.add(CUSTOM_TOOL_EXTENSIONS[tool]);
	}
	for (const extPath of extensionPaths) args.push("--extension", extPath);

	args.push("--models", profile.model);
	args.push("--thinking", profile.thinking);
	args.push("--append-system-prompt", promptPath);

	const TASK_LIMIT = 8000;
	if (task.length > TASK_LIMIT) {
		const taskPath = path.join(tempDir, "task.md");
		await withFileMutationQueue(taskPath, async () => {
			await fs.promises.writeFile(taskPath, `Task: ${task}`, { encoding: "utf-8", mode: 0o600 });
		});
		args.push(`@${taskPath}`);
	} else {
		args.push(`Task: ${task}`);
	}

	let childEnv: NodeJS.ProcessEnv | undefined;
	if (allowlist.includes("subagent") && agent.subagentAgents?.length) {
		childEnv = { ...process.env, PI_SUBAGENT_ALLOWED: agent.subagentAgents.join(",") };
	}

	return { args: [piBin.command, ...args], tempDir, childEnv };
}

// ── Output / progress parsing ─────────────────────────────────────────

function formatTokens(n: number): string {
	return n < 1000 ? String(n) : n < 10000 ? `${(n / 1000).toFixed(1)}k` : `${Math.round(n / 1000)}k`;
}

function formatDuration(ms: number): string {
	if (ms < 1000) return `${ms}ms`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
	return `${Math.floor(ms / 60000)}m${Math.floor((ms % 60000) / 1000)}s`;
}

function formatContextUsage(tokens: number, contextWindow: number | undefined): string {
	if (!contextWindow) return `${formatTokens(tokens)} ctx`;
	const pct = (tokens / contextWindow) * 100;
	const maxStr = contextWindow >= 1_000_000 ? `${(contextWindow / 1_000_000).toFixed(1)}M` : `${Math.round(contextWindow / 1000)}k`;
	return `${pct.toFixed(1)}%/${maxStr}`;
}

function truncLine(text: string, maxWidth: number): string {
	if (text.includes("\n") || text.includes("\r")) text = text.replace(/\r?\n/g, "↵ ");
	if (visibleWidth(text) <= maxWidth) return text;
	let result = "";
	let width = 0;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === "\x1b") {
			const match = text.slice(i).match(/^\x1b\[[0-9;]*m/);
			if (match) {
				result += match[0];
				i += match[0].length - 1;
				continue;
			}
		}
		if (width >= maxWidth - 1) return result + "…";
		result += ch;
		width++;
	}
	return result;
}

function flatten(s: string): string {
	return s.replace(/\s+/g, " ").trim();
}

const MAX_ARG_PREVIEW = 4000;
function extractToolArgsPreview(args: Record<string, unknown>): string {
	const cap = (s: string) => (s.length > MAX_ARG_PREVIEW ? s.slice(0, MAX_ARG_PREVIEW) + "…" : s);
	if (args.command) return cap(flatten(String(args.command)));
	if (args.path) return cap(flatten(String(args.path)));
	if (args.query) return `"${cap(flatten(String(args.query)))}"`;
	if (args.urls) return cap(flatten(JSON.stringify(args.urls)));
	if (args.pattern) return cap(flatten(String(args.pattern)));
	if (args.agent) return flatten(String(args.agent));
	return cap(flatten(JSON.stringify(args)));
}

function extractTextFromContent(content: unknown): string {
	if (!content) return "";
	if (typeof content === "string") return content;
	if (Array.isArray(content)) return content.filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n");
	return "";
}

function extractReport(evt: any): SubagentReport | undefined {
	const report = evt?.result?.details?.report || evt?.partialResult?.details?.report;
	if (!report || typeof report !== "object") return undefined;
	if (report.status !== "progress" && report.status !== "needs_main_input" && report.status !== "completed" && report.status !== "failed") return undefined;
	if (typeof report.summary !== "string") return undefined;
	return report as SubagentReport;
}

function reportToText(report: SubagentReport): string {
	const lines = [`Status: ${report.status}`, report.summary];
	if (report.question) lines.push(`\nQuestion: ${report.question}`);
	if (report.options?.length) lines.push(`Options: ${report.options.join(" | ")}`);
	if (report.files?.length) {
		lines.push("\nFiles:");
		for (const file of report.files) lines.push(`- ${file.path}${file.lines ? `:${file.lines}` : ""}${file.reason ? ` — ${file.reason}` : ""}`);
	}
	return lines.join("\n");
}

async function runSubagent(
	agent: AgentConfig,
	profile: ResolvedProfile,
	task: string,
	cwd: string,
	signal: AbortSignal | undefined,
	maxReturnedBytes: number,
	onUpdate?: (progress: AgentProgress, usage: AgentResult["usage"]) => void,
): Promise<AgentResult> {
	const { args, tempDir, childEnv } = await buildPiArgs(agent, profile, task);
	const command = args[0];
	const spawnArgs = args.slice(1);

	const result: AgentResult = {
		agent: agent.name,
		kind: agent.kind,
		task,
		output: "",
		exitCode: 0,
		model: profile.model,
		contextWindow: profile.contextWindow,
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
		reports: [],
		progress: {
			agent: agent.name,
			status: "running",
			task,
			recentTools: [],
			toolCount: 0,
			tokens: 0,
			durationMs: 0,
			lastMessage: "",
		},
	};

	const startTime = Date.now();
	const progress = result.progress;
	const fireUpdate = throttle(() => {
		progress.durationMs = Date.now() - startTime;
		onUpdate?.(progress, result.usage);
	}, 150);

	const exitCode = await new Promise<number>((resolve) => {
		const proc = spawn(command, spawnArgs, { cwd, stdio: ["ignore", "pipe", "pipe"], ...(childEnv ? { env: childEnv } : {}) });
		let buf = "";
		let stderrBuf = "";

		const handleReport = (report: SubagentReport) => {
			result.reports.push(report);
			progress.report = report;
			progress.lastMessage = report.summary.split("\n").filter(Boolean).slice(0, 3).join(" ");
			if (report.status === "needs_main_input") progress.status = "waiting";
			else if (report.status === "completed") progress.status = "completed";
			else if (report.status === "failed") progress.status = "failed";
			result.output = reportToText(report);
		};

		const processLine = (line: string) => {
			if (!line.trim()) return;
			try {
				const evt = JSON.parse(line) as any;
				progress.durationMs = Date.now() - startTime;

				if (evt.type === "tool_execution_start") {
					progress.toolCount++;
					progress.recentTools.push({
						tool: evt.toolName,
						args: extractToolArgsPreview((evt.args || {}) as Record<string, unknown>),
						toolCallId: evt.toolCallId,
						status: "running",
					});
					fireUpdate();
				}

				if (evt.type === "tool_execution_update") {
					const report = extractReport(evt);
					if (evt.toolName === REPORT_TOOL && report) handleReport(report);
					const nested = evt.partialResult?.details?.results;
					if (evt.toolName === "subagent" && Array.isArray(nested) && evt.toolCallId) {
						const hit = progress.recentTools.find((t) => t.toolCallId === evt.toolCallId);
						if (hit) hit.children = nested as AgentResult[];
					}
					fireUpdate();
				}

				if (evt.type === "tool_execution_end") {
					const hit = evt.toolCallId ? progress.recentTools.find((t) => t.toolCallId === evt.toolCallId) : undefined;
					if (hit) {
						hit.status = "done";
						const finalChildren = evt.result?.details?.results;
						if (evt.toolName === "subagent" && Array.isArray(finalChildren)) hit.children = finalChildren as AgentResult[];
					}
					const report = extractReport(evt);
					if (evt.toolName === REPORT_TOOL && report) handleReport(report);
					fireUpdate();
				}

				if (evt.type === "message_end" && evt.message?.role === "assistant") {
					result.usage.turns++;
					const u = evt.message.usage;
					if (u) {
						result.usage.input += u.input || 0;
						result.usage.output += u.output || 0;
						result.usage.cacheRead += u.cacheRead || 0;
						result.usage.cacheWrite += u.cacheWrite || 0;
						result.usage.cost += u.cost?.total || 0;
						progress.tokens = (u as { totalTokens?: number }).totalTokens || (u.input || 0) + (u.output || 0) + (u.cacheRead || 0) + (u.cacheWrite || 0);
					}
					if (evt.message.model) result.model = evt.message.model;
					if (evt.message.errorMessage) progress.error = evt.message.errorMessage;
					const text = extractTextFromContent(evt.message.content);
					if (text && result.reports.length === 0) {
						result.output = text;
						const proseLines: string[] = [];
						let inCodeBlock = false;
						for (const l of text.split("\n")) {
							if (l.trimStart().startsWith("```")) { inCodeBlock = !inCodeBlock; continue; }
							if (!inCodeBlock && l.trim()) proseLines.push(l.trim());
						}
						if (proseLines.length) progress.lastMessage = proseLines.slice(0, 3).join(" ");
					}
					fireUpdate();
				}
			} catch {}
		};

		proc.stdout.on("data", (d: Buffer) => {
			buf += d.toString();
			const lines = buf.split("\n");
			buf = lines.pop() || "";
			lines.forEach(processLine);
		});
		proc.stderr.on("data", (d: Buffer) => { stderrBuf += d.toString(); });
		proc.on("close", (code) => {
			if (buf.trim()) processLine(buf);
			if (code !== 0 && stderrBuf.trim() && !progress.error) progress.error = stderrBuf.trim();
			resolve(code ?? 1);
		});
		proc.on("error", () => resolve(1));

		if (signal) {
			const kill = () => {
				proc.kill("SIGTERM");
				setTimeout(() => !proc.killed && proc.kill("SIGKILL"), 3000);
			};
			if (signal.aborted) kill();
			else signal.addEventListener("abort", kill, { once: true });
		}
	});

	try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}

	result.exitCode = exitCode;
	if (progress.status === "running") progress.status = exitCode === 0 && !progress.error ? "completed" : "failed";
	progress.durationMs = Date.now() - startTime;
	if (progress.error) result.output = result.output || `Error: ${progress.error}`;
	if (result.output.length > maxReturnedBytes || result.output.length > DEFAULT_MAX_BYTES) {
		const trunc = truncateHead(result.output, { maxLines: DEFAULT_MAX_LINES, maxBytes: Math.min(maxReturnedBytes, DEFAULT_MAX_BYTES) });
		result.output = trunc.content + (trunc.truncated ? "\n\n[Output truncated; full output retained in subagent details.]" : "");
	}
	return result;
}

function throttle<T extends (...args: any[]) => void>(fn: T, ms: number): T {
	let lastCall = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	return ((...args: any[]) => {
		const now = Date.now();
		const remaining = ms - (now - lastCall);
		if (remaining <= 0) {
			lastCall = now;
			if (timer) { clearTimeout(timer); timer = undefined; }
			fn(...args);
		} else if (!timer) {
			timer = setTimeout(() => { lastCall = Date.now(); timer = undefined; fn(...args); }, remaining);
		}
	}) as T;
}

class Semaphore {
	private inFlight = 0;
	private readonly waiters: Array<() => void> = [];
	constructor(private readonly max: number) {}
	async run<T>(fn: () => Promise<T>): Promise<T> {
		if (this.inFlight >= this.max) await new Promise<void>((r) => this.waiters.push(r));
		this.inFlight++;
		try { return await fn(); }
		finally {
			this.inFlight--;
			const next = this.waiters.shift();
			if (next) next();
		}
	}
}

// ── Turn-based manager ────────────────────────────────────────────────

function makeId(kind: SubagentKind): string {
	return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function continuationTask(record: SubagentRecord, message: string): string {
	const prior = record.history
		.map((h) => `${h.direction === "main" ? "Main" : "Subagent"}: ${h.text}`)
		.join("\n\n");
	return `Original task:\n${record.task}\n\nPrior conversation/reports:\n${prior || "(none)"}\n\nNew instruction from main agent:\n${message}\n\nContinue the task. Use report_to_main when you need to report progress, ask a question, fail, or complete.`;
}

function updateRecordFromResult(record: SubagentRecord, result: AgentResult) {
	record.lastResult = result;
	record.updatedAt = Date.now();
	record.status = result.progress.status;
	const lastReport = result.reports.at(-1);
	if (lastReport) {
		record.history.push({ direction: "subagent", text: reportToText(lastReport), at: Date.now() });
		record.pendingQuestion = lastReport.status === "needs_main_input" ? lastReport.question || lastReport.summary : undefined;
	}
}

function formatRecords(recs: SubagentRecord[]): string {
	if (recs.length === 0) return "No subagents.";
	return recs.map((r) => {
		const q = r.pendingQuestion ? `\n  question: ${r.pendingQuestion}` : "";
		return `- ${r.id} (${r.kind}/${r.agentName}) ${r.status} · model ${r.model} · tools ${r.tools.join(", ")}${q}`;
	}).join("\n");
}

// ── Rendering ─────────────────────────────────────────────────────────

type Theme = ExtensionContext["ui"]["theme"];

function getTermWidth(): number {
	return process.stdout.columns || 120;
}

function renderAgentProgress(r: AgentResult, theme: Theme, expanded: boolean, w: number, depth = 0): Container {
	const c = new Container();
	const prog = r.progress;
	const nested = depth > 0;
	const indent = nested ? "  ".repeat(depth) : "";
	const innerW = Math.max(20, w - indent.length);
	const addLine = (content: string) => c.addChild(new Text(expanded ? indent + content : indent + truncLine(content, innerW), 0, 0));
	const icon = prog.status === "running"
		? theme.fg("warning", "⟳")
		: prog.status === "waiting"
			? theme.fg("warning", "?")
			: prog.status === "completed"
				? theme.fg("success", "✓")
				: theme.fg("error", "✗");
	const stats = `${prog.toolCount} tools · ${formatDuration(prog.durationMs)}`;
	const modelStr = r.model ? theme.fg("dim", ` (${r.model})`) : "";
	addLine(`${icon} ${theme.fg("toolTitle", theme.bold(r.id ? `${r.agent}#${r.id}` : r.agent))}${modelStr} — ${theme.fg("dim", stats)}`);

	for (const t of prog.recentTools) {
		const body = t.args ? `${t.tool}: ${t.args}` : t.tool;
		addLine(theme.fg(t.status === "running" ? "warning" : "muted", `${t.status === "running" ? "▸" : " "} ${body}`));
		if (t.children) for (const child of t.children) c.addChild(renderAgentProgress(child, theme, expanded, w, depth + 1));
	}

	if (prog.report?.question) addLine(theme.fg("warning", `? ${prog.report.question}`));
	if (prog.lastMessage) {
		if (!nested) c.addChild(new Spacer(1));
		addLine(theme.fg("text", prog.lastMessage));
	}

	if (!nested && !["running"].includes(prog.status) && r.output && expanded) {
		c.addChild(new Spacer(1));
		c.addChild(new Markdown(r.output, 0, 0, getMarkdownTheme()));
	}

	if (!nested) c.addChild(new Spacer(1));
	const usageParts: string[] = [];
	if (r.usage.input) usageParts.push(theme.fg("dim", `↑${formatTokens(r.usage.input)}`));
	if (r.usage.output) usageParts.push(theme.fg("dim", `↓${formatTokens(r.usage.output)}`));
	if (r.usage.cacheRead) usageParts.push(theme.fg("dim", `R${formatTokens(r.usage.cacheRead)}`));
	if (r.usage.cacheWrite) usageParts.push(theme.fg("dim", `W${formatTokens(r.usage.cacheWrite)}`));
	if (r.usage.cost) usageParts.push(theme.fg("dim", `$${r.usage.cost.toFixed(3)}`));
	if (prog.tokens > 0) usageParts.push(theme.fg("dim", formatContextUsage(prog.tokens, r.contextWindow)));
	if (usageParts.length) addLine(usageParts.join(" "));
	if (prog.error) addLine(theme.fg("error", `Error: ${prog.error}`));
	return c;
}

function renderRecords(records: SubagentRecord[], theme: Theme): Container {
	const c = new Container();
	for (const r of records) {
		const color = r.status === "completed" ? "success" : r.status === "failed" || r.status === "stopped" ? "error" : "warning";
		c.addChild(new Text(`${theme.fg(color as any, r.status)} ${theme.bold(r.id)} ${theme.fg("dim", `${r.kind}/${r.agentName}`)}`, 0, 0));
		if (r.pendingQuestion) c.addChild(new Text(theme.fg("warning", `  ? ${r.pendingQuestion}`), 0, 0));
	}
	return c;
}

// ── Extension tool ────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	const config = loadConfig();
	const semaphore = new Semaphore(config.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY);
	agents = loadAgents();
	if (SUBAGENT_ALLOWLIST) agents = agents.filter((a) => SUBAGENT_ALLOWLIST.includes(a.name));

	pi.registerTool({
		name: "subagent",
		label: "Subagent",
		description:
			"Run, start, continue, inspect, or stop an Explorer/Worker sub-agent. Sub-agents inherit the main model/thinking by default and have isolated context.",
		promptSnippet: "Run Explorer/Worker sub-agents for delegated isolated-context tasks",
		promptGuidelines: [
			"Use subagent with kind `explorer` for read-only codebase discovery when direct exploration would require reading many files.",
			"Use subagent with kind `worker` for isolated implementation tasks that can be delegated with clear instructions.",
			"Subagents inherit your current model and thinking level unless their definition overrides it.",
			"Do not use subagent for trivial reads or simple edits; use direct tools instead.",
			"Subagents do not see this conversation unless you include the relevant context in the task/message.",
			"Prefer multiple Explorer subagent calls in the same turn for independent investigations; Pi runs sibling tool calls in parallel.",
			"Use action `send` with an existing subagent id when it is waiting for main input instead of starting a new related subagent.",
		],
		parameters: Type.Object({
			action: Type.Optional(Type.String({ description: "run | start | send | status | stop. Default: run" })),
			kind: Type.Optional(Type.String({ description: "explorer | worker. Default: explorer for run/start" })),
			agent: Type.Optional(Type.String({ description: "Specific agent name; overrides kind" })),
			id: Type.Optional(Type.String({ description: "Subagent id for send/status/stop" })),
			task: Type.Optional(Type.String({ description: "Initial task for run/start" })),
			message: Type.Optional(Type.String({ description: "Continuation message for send" })),
			cwd: Type.Optional(Type.String({ description: "Working directory for the subagent process" })),
		}),
		prepareArguments(args) {
			if (!args || typeof args !== "object") return {};
			const input = args as Record<string, unknown>;
			return (!input.action ? { action: "run", ...input } : input) as {
				action?: string;
				kind?: string;
				agent?: string;
				id?: string;
				task?: string;
				message?: string;
				cwd?: string;
			};
		},

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const action = normalizeAction(params.action);
			const cwd = params.cwd ?? ctx.cwd;
			const maxReturnedBytes = config.maxReturnedBytes ?? DEFAULT_MAX_RETURNED_BYTES;

			if (action === "status") {
				const recs = params.id ? [records.get(params.id)].filter(Boolean) as SubagentRecord[] : Array.from(records.values());
				return { content: [{ type: "text", text: formatRecords(recs) }], details: { records: recs } };
			}

			if (action === "stop") {
				if (!params.id) throw new Error("subagent action stop requires id");
				const rec = records.get(params.id);
				if (!rec) throw new Error(`Unknown subagent id: ${params.id}`);
				rec.status = "stopped";
				rec.updatedAt = Date.now();
				return { content: [{ type: "text", text: `Stopped ${rec.id}` }], details: { records: [rec] } };
			}

			if (action === "send") {
				if (!params.id) throw new Error("subagent action send requires id");
				if (!params.message) throw new Error("subagent action send requires message");
				const rec = records.get(params.id);
				if (!rec) throw new Error(`Unknown subagent id: ${params.id}`);
				const agent = agents.find((a) => a.name === rec.agentName);
				if (!agent) throw new Error(`Agent definition disappeared: ${rec.agentName}`);
				rec.history.push({ direction: "main", text: params.message, at: Date.now() });
				rec.status = "running";
				rec.pendingQuestion = undefined;
				const profile = resolveProfile(agent, pi, ctx, config);
				const liveResult = makeLiveResult(rec.id, agent, profile, continuationTask(rec, params.message));
				const result = await semaphore.run(() => runSubagent(agent, profile, liveResult.task, rec.cwd, signal, maxReturnedBytes, (progress, usage) => {
					liveResult.progress = progress;
					liveResult.usage = { ...usage };
					onUpdate?.({ content: [{ type: "text", text: "(running...)" }], details: { results: [liveResult], records: [rec] } });
				}));
				result.id = rec.id;
				updateRecordFromResult(rec, result);
				return { content: [{ type: "text", text: result.output || "(no output)" }], details: { results: [result], records: [rec] } };
			}

			// run/start
			if (!params.task) throw new Error(`subagent action ${action} requires task`);
			const activeCount = Array.from(records.values()).filter((r) => r.status === "running" || r.status === "waiting").length;
			if (activeCount >= (config.maxActiveSubagents ?? DEFAULT_MAX_ACTIVE)) {
				throw new Error(`Too many active subagents (${activeCount}); stop or complete some before starting more.`);
			}
			const agent = findAgent({ kind: params.kind, agent: params.agent });
			if (!agent) {
				const available = agents.map((a) => `${a.name}(${a.kind})`).join(", ") || "none";
				throw new Error(`Unknown subagent kind/agent. Available: ${available}`);
			}
			const profile = resolveProfile(agent, pi, ctx, config);
			const id = action === "start" ? makeId(agent.kind) : undefined;
			const rec: SubagentRecord | undefined = id ? {
				id,
				kind: agent.kind,
				agentName: agent.name,
				status: "running",
				task: params.task,
				cwd,
				model: profile.model,
				thinking: profile.thinking,
				tools: profile.tools,
				createdAt: Date.now(),
				updatedAt: Date.now(),
				history: [{ direction: "main", text: params.task, at: Date.now() }],
			} : undefined;
			if (rec) records.set(rec.id, rec);

			const liveResult = makeLiveResult(id, agent, profile, params.task);
			const result = await semaphore.run(() => runSubagent(agent, profile, params.task!, cwd, signal, maxReturnedBytes, (progress, usage) => {
				liveResult.progress = progress;
				liveResult.usage = { ...usage };
				onUpdate?.({ content: [{ type: "text", text: "(running...)" }], details: { results: [liveResult], ...(rec ? { records: [rec] } : {}) } });
			}));
			result.id = id;
			if (rec) updateRecordFromResult(rec, result);
			return { content: [{ type: "text", text: result.output || "(no output)" }], details: { results: [result], ...(rec ? { records: [rec] } : {}) } };
		},

		renderCall(args, theme, context) {
			if (!context.expanded) {
				const action = args.action || "run";
				const who = args.id || args.agent || args.kind || "explorer";
				const text = args.task || args.message || "";
				const preview = text.length > 60 ? text.slice(0, 60).replace(/\n/g, " ") + "…" : text.replace(/\n/g, " ");
				return new Text(`${theme.fg("toolTitle", theme.bold("subagent"))} ${theme.fg("accent", `${action}:${who}`)} ${theme.fg("dim", preview)}`, 0, 0);
			}
			const c = context.lastComponent instanceof Container ? (context.lastComponent.clear(), context.lastComponent) : new Container();
			c.addChild(new Text(`${theme.fg("toolTitle", theme.bold("subagent"))} ${theme.fg("accent", args.action || "run")} ${theme.fg("dim", args.id || args.agent || args.kind || "")}`, 0, 0));
			const body = args.task || args.message;
			if (body) { c.addChild(new Spacer(1)); c.addChild(new Text(theme.fg("text", body), 0, 0)); }
			return c;
		},

		renderResult(result, options, theme) {
			const details = result.details as Details | undefined;
			if (details?.results?.length) {
				const c = new Container();
				c.addChild(renderAgentProgress(details.results[0], theme, options.expanded, getTermWidth() - 4));
				return c;
			}
			if (details?.records?.length) return renderRecords(details.records, theme);
			const t = result.content[0];
			const text = t?.type === "text" ? t.text : "(no output)";
			return new Text(text.slice(0, 500), 0, 0);
		},
	});
}

function normalizeAction(action: string | undefined): SubagentAction {
	if (action === "start" || action === "send" || action === "status" || action === "stop" || action === "run") return action;
	return "run";
}

function makeLiveResult(id: string | undefined, agent: AgentConfig, profile: ResolvedProfile, task: string): AgentResult {
	return {
		id,
		agent: agent.name,
		kind: agent.kind,
		task,
		output: "",
		exitCode: -1,
		model: profile.model,
		contextWindow: profile.contextWindow,
		reports: [],
		usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0, turns: 0 },
		progress: { agent: agent.name, status: "running", task, recentTools: [], toolCount: 0, tokens: 0, durationMs: 0, lastMessage: "" },
	};
}
