import type { CancellableOptions } from "./types.js";

/**
 * Races a promise against a timeout and caller-owned cancellation, then clears listeners after either branch settles.
 *
 * @template T Promise fulfillment type preserved by the timeout wrapper.
 */
export async function withTimeout<T>(promise: Promise<T>, timeout: number, label: string, options: CancellableOptions): Promise<T> {
  options.signal?.throwIfAborted();

  let timer: NodeJS.Timeout | undefined;
  let abortHandler: (() => void) | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeout}ms`)), timeout);
  });

  const abortPromise = new Promise<never>((_resolve, reject) => {
    if (!options.signal) return;

    abortHandler = () => {
      reject(new DOMException(`${label} aborted`, "AbortError"));
    };

    options.signal.addEventListener("abort", abortHandler, { once: true });
  });

  void promise.catch(() => undefined);

  try {
    return await Promise.race([promise, timeoutPromise, abortPromise]);
  } finally {
    if (timer) clearTimeout(timer);

    if (options.signal && abortHandler) {
      options.signal.removeEventListener("abort", abortHandler);
    }
  }
}
