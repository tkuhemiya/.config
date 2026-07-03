/**
 * Child-only tool used by subagents to communicate structured reports back to
 * the parent agent without dumping their whole private context.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export interface SubagentReport {
	status: "progress" | "needs_main_input" | "completed" | "failed";
	summary: string;
	question?: string;
	options?: string[];
	files?: Array<{ path: string; lines?: string; reason?: string }>;
	artifacts?: Array<{ type: string; path?: string; content?: string }>;
}

const TERMINAL_STATUSES = new Set(["needs_main_input", "completed", "failed"]);

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "report_to_main",
		label: "Report to Main",
		description:
			"Send a structured progress, completion, failure, or clarification report to the parent agent. Use this instead of dumping large raw context.",
		parameters: Type.Object({
			status: Type.String({ description: "progress | needs_main_input | completed | failed" }),
			summary: Type.String({ description: "Compact report for the parent agent" }),
			question: Type.Optional(Type.String({ description: "Question for the parent when status is needs_main_input" })),
			options: Type.Optional(Type.Array(Type.String(), { description: "Suggested answer options" })),
			files: Type.Optional(Type.Array(Type.Object({
				path: Type.String(),
				lines: Type.Optional(Type.String()),
				reason: Type.Optional(Type.String()),
			}))),
			artifacts: Type.Optional(Type.Array(Type.Object({
				type: Type.String(),
				path: Type.Optional(Type.String()),
				content: Type.Optional(Type.String()),
			}))),
		}),
		async execute(_toolCallId, params) {
			const report: SubagentReport = {
				status: normalizeStatus(params.status),
				summary: params.summary,
				...(params.question ? { question: params.question } : {}),
				...(params.options ? { options: params.options } : {}),
				...(params.files ? { files: params.files } : {}),
				...(params.artifacts ? { artifacts: params.artifacts } : {}),
			};

			return {
				content: [{ type: "text", text: formatReport(report) }],
				details: { report },
				...(TERMINAL_STATUSES.has(report.status) ? { terminate: true } : {}),
			};
		},
	});
}

function normalizeStatus(status: string): SubagentReport["status"] {
	if (status === "progress" || status === "needs_main_input" || status === "completed" || status === "failed") {
		return status;
	}
	return "progress";
}

function formatReport(report: SubagentReport): string {
	const lines = [`Status: ${report.status}`, report.summary];
	if (report.question) lines.push(`Question: ${report.question}`);
	if (report.options?.length) lines.push(`Options: ${report.options.join(" | ")}`);
	if (report.files?.length) {
		lines.push("Files:");
		for (const file of report.files) {
			lines.push(`- ${file.path}${file.lines ? `:${file.lines}` : ""}${file.reason ? ` — ${file.reason}` : ""}`);
		}
	}
	return lines.join("\n");
}
