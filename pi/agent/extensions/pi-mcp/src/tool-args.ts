/** Reads an optional non-empty string argument from already parsed tool arguments. */
export function optionalString(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${key} must be a string`);
  return value;
}

/** Reads a required non-empty string argument from already parsed tool arguments. */
export function requiredString(args: Record<string, unknown>, key: string) {
  const value = optionalString(args, key);
  if (value) return value;
  throw new Error(`${key} is required`);
}
