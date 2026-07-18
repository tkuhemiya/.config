/** Converts an MCP input schema into the conservative object schema Pi expects for tools. */
export function normalizeToolSchema(inputSchema: unknown): Record<string, unknown> {
  const schema = isPlainRecord(inputSchema) ? structuredClone(inputSchema) : {};
  return sanitizeJsonSchema({
    ...schema,
    type: "object",
    properties: isPlainRecord(schema.properties) ? schema.properties : {},
    additionalProperties: false,
  });
}

/** Sanitizes untrusted JSON Schema fragments into the subset accepted by Pi's TypeBox bridge. */
export function sanitizeJsonSchema(value: unknown): Record<string, unknown> {
  if (typeof value === "boolean") return { type: "string" };
  if (Array.isArray(value)) return {};
  if (!isPlainRecord(value)) return {};

  const result: Record<string, unknown> = {};
  const compositionKeys = ["anyOf", "oneOf", "allOf"];

  if (typeof value.$ref === "string") result.$ref = value.$ref;
  if (typeof value.description === "string") result.description = value.description;
  if ("const" in value) result.enum = [value.const];
  else if (Array.isArray(value.enum)) result.enum = value.enum;

  if (isPlainRecord(value.properties)) {
    result.properties = Object.fromEntries(
      Object.entries(value.properties).map(([key, item]) => [key, sanitizeJsonSchema(item)]),
    );
  }

  if (Array.isArray(value.required)) result.required = value.required.filter((item) => typeof item === "string");
  if ("items" in value) result.items = sanitizeJsonSchema(value.items);

  if ("additionalProperties" in value) {
    result.additionalProperties =
      typeof value.additionalProperties === "boolean"
        ? value.additionalProperties
        : sanitizeJsonSchema(value.additionalProperties);
  }

  for (const key of compositionKeys) {
    if (Array.isArray(value[key])) {
      result[key] = value[key].map(sanitizeJsonSchema);
    }
  }

  for (const key of ["$defs", "definitions"]) {
    if (isPlainRecord(value[key])) {
      result[key] = Object.fromEntries(Object.entries(value[key]).map(([name, item]) => [name, sanitizeJsonSchema(item)]));
    }
  }

  const validTypes = ["null", "boolean", "number", "integer", "string", "array", "object"];
  const schemaTypes =
    typeof value.type === "string"
      ? validTypes.includes(value.type)
        ? [value.type]
        : []
      : Array.isArray(value.type)
        ? value.type.filter((item) => typeof item === "string" && validTypes.includes(item))
        : [];

  if (schemaTypes.length === 0 && (typeof result.$ref === "string" || compositionKeys.some((key) => key in result))) {
    return result;
  }

  const inferredTypes =
    schemaTypes.length > 0
      ? schemaTypes
      : ["properties", "required", "additionalProperties"].some((key) => key in value)
        ? ["object"]
        : ["items", "prefixItems"].some((key) => key in value)
          ? ["array"]
          : "enum" in result || "format" in value
            ? ["string"]
            : ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"].some((key) => key in value)
              ? ["number"]
              : [];

  if (inferredTypes.length === 0) return {};

  result.type = inferredTypes.length === 1 ? inferredTypes[0] : inferredTypes;
  if (inferredTypes.includes("object") && !("properties" in result)) result.properties = {};
  if (inferredTypes.includes("array") && !("items" in result)) result.items = { type: "string" };
  return result;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
