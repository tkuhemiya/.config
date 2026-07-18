import { ElicitResultSchema, type ElicitRequest, type ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import open from "open";

type PiElicitationContext = {
  readonly hasUI: ExtensionContext["hasUI"];
  readonly ui: Pick<ExtensionContext["ui"], "confirm" | "input" | "notify" | "select">;
};
type ElicitationContent = NonNullable<ElicitResult["content"]>;

const CANCEL = Symbol("cancel");

/** Handles MCP elicitation requests using Pi UI primitives or deterministic environment input. */
export async function handlePiElicitation(
  server: string,
  request: ElicitRequest,
  ctx: PiElicitationContext | undefined,
): Promise<ElicitResult> {
  const envResponse = responseFromEnv();
  if (envResponse) return envResponse;

  if (isUrlElicitation(request.params)) return handleUrlElicitation(server, request.params, ctx);
  if (isFormElicitation(request.params)) return handleFormElicitation(server, request.params, ctx);
  return { action: "decline" };
}

async function handleUrlElicitation(
  server: string,
  params: Extract<ElicitRequest["params"], { mode: "url" }>,
  ctx: PiElicitationContext | undefined,
): Promise<ElicitResult> {
  if (!ctx?.hasUI) return { action: "decline" };

  const ok = await ctx.ui.confirm(`MCP ${server} URL request`, `${params.message}\n\n${params.url}`);
  if (!ok) return { action: "decline" };

  try {
    await open(params.url);
    return { action: "accept" };
  } catch (error) {
    ctx.ui.notify(`Could not open MCP URL: ${error instanceof Error ? error.message : String(error)}`, "error");
    return { action: "decline" };
  }
}

async function handleFormElicitation(
  server: string,
  params: Extract<ElicitRequest["params"], { requestedSchema: unknown }>,
  ctx: PiElicitationContext | undefined,
): Promise<ElicitResult> {
  if (!ctx?.hasUI) return { action: "decline" };

  const decision = await ctx.ui.select(`MCP Input Request\nServer: ${server}\n\n${params.message}`, ["Continue", "Decline"]);
  if (decision === "Decline") return { action: "decline" };
  if (decision !== "Continue") return { action: "cancel" };

  const required = new Set(params.requestedSchema.required ?? []);
  const content: ElicitationContent = {};

  for (const [name, schema] of Object.entries(params.requestedSchema.properties)) {
    const value = await askForField(ctx, name, schema, required.has(name));
    if (value === CANCEL) return { action: "cancel" };
    if (value !== undefined) content[name] = value;
  }

  return { action: "accept", content };
}

async function askForField(
  ctx: PiElicitationContext,
  name: string,
  schema: Record<string, unknown>,
  required: boolean,
): Promise<ElicitationContent[string] | typeof CANCEL | undefined> {
  const title = fieldTitle(name, schema, required);
  const description = stringProperty(schema, "description") ?? "";
  const defaultValue = schema.default;

  const enumValues = stringEnumValues(schema);
  if (enumValues.length > 0) {
    const selected = await ctx.ui.select(title, enumValues);
    return selected ?? (required ? CANCEL : undefined);
  }

  if (schema.type === "boolean") {
    return ctx.ui.confirm(title, description);
  }

  if (schema.type === "number" || schema.type === "integer") {
    const input = await ctx.ui.input(title, typeof defaultValue === "number" ? String(defaultValue) : description);
    if (input === undefined) return CANCEL;
    if (!input.trim()) {
      if (typeof defaultValue === "number") return defaultValue;
      return required ? CANCEL : undefined;
    }
    const value = Number(input);
    if (!Number.isFinite(value) || (schema.type === "integer" && !Number.isInteger(value))) {
      ctx.ui.notify(`${title} must be a ${schema.type}.`, "error");
      return CANCEL;
    }
    return value;
  }

  if (schema.type === "array") {
    const input = await ctx.ui.input(
      title,
      Array.isArray(defaultValue) ? defaultValue.join(", ") : arrayPlaceholder(schema, description),
    );
    if (input === undefined) return CANCEL;
    if (!input.trim()) {
      if (Array.isArray(defaultValue) && defaultValue.every((item) => typeof item === "string")) return defaultValue;
      return required ? CANCEL : undefined;
    }
    return input
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  const input = await ctx.ui.input(title, typeof defaultValue === "string" ? defaultValue : description);
  if (input === undefined) return CANCEL;
  if (!input && typeof defaultValue === "string") return defaultValue;
  if (!input && !required) return undefined;
  return input;
}

function responseFromEnv(): ElicitResult | undefined {
  const raw = process.env.PI_MCP_ELICITATION_RESPONSE?.trim();
  if (!raw) return undefined;
  if (raw === "accept" || raw === "decline" || raw === "cancel") return { action: raw };

  const parsed: unknown = JSON.parse(raw);
  const result = isPlainRecord(parsed) && typeof parsed.action === "string" ? parsed : { action: "accept", content: parsed };
  const elicitation = ElicitResultSchema.safeParse(result);
  if (elicitation.success) return elicitation.data;
  throw new Error("PI_MCP_ELICITATION_RESPONSE must be an elicitation result object or content object");
}

function isUrlElicitation(params: ElicitRequest["params"]): params is Extract<ElicitRequest["params"], { mode: "url" }> {
  return params.mode === "url";
}

function isFormElicitation(params: ElicitRequest["params"]): params is Extract<ElicitRequest["params"], { requestedSchema: unknown }> {
  return "requestedSchema" in params;
}

function fieldTitle(name: string, schema: Record<string, unknown>, required: boolean) {
  const title = stringProperty(schema, "title") ?? name;
  return required ? `${title} (required)` : title;
}

function stringProperty(schema: Record<string, unknown>, key: string) {
  const value = schema[key];
  return typeof value === "string" ? value : undefined;
}

function stringEnumValues(schema: Record<string, unknown>) {
  if (Array.isArray(schema.enum) && schema.enum.every((value) => typeof value === "string")) return schema.enum;
  if (Array.isArray(schema.oneOf)) {
    const values = schema.oneOf
      .filter((item): item is Record<string, unknown> & { const: string } => isPlainRecord(item) && typeof item.const === "string")
      .map((item) => item.const);
    if (values.length > 0) return values;
  }
  return [];
}

function arrayPlaceholder(schema: Record<string, unknown>, fallback: string) {
  const items = schema.items;
  if (!isPlainRecord(items)) return fallback;
  const values = stringEnumValues(items);
  return values.length > 0 ? `Comma-separated: ${values.join(", ")}` : fallback;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
