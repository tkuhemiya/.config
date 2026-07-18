/** Default timeout, in milliseconds, for MCP requests that do not configure one. */
export const DEFAULT_TIMEOUT = 30_000;

/** Maximum number of paginated MCP list calls before treating pagination as broken. */
export const MAX_LIST_PAGES = 1_000;

/** Maximum supported embedded resource blob size before omitting binary content. */
export const MAX_RESOURCE_BLOB_BYTES = 10 * 1024 * 1024;

/** Image MIME types that Pi can safely attach from MCP resource content. */
export const SUPPORTED_RESOURCE_IMAGE_MIMES = new Set(["image/gif", "image/jpeg", "image/png", "image/webp"]);
