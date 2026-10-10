const DEFAULT_TIMEOUT_MS = 5000;

/**
 * GETs a URL and returns its JSON body. Rejects on a non-2xx status,
 * a body that is not JSON, or no answer within the timeout.
 */
export async function fetchJson(url: string, options: { timeoutMs?: number } = {}): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out", { cause: error });
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out", { cause: error });
    }
    throw new Error("Response was not valid JSON", { cause: error });
  }
}
