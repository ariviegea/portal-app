const DEFAULT_TIMEOUT_MS = 5000;

// How much of a refusal's explanation is kept for the server log.
const MAX_DETAIL_LENGTH = 500;

/**
 * GETs a URL and returns its JSON body. Rejects on a non-2xx status,
 * a body that is not JSON, or no answer within the timeout.
 *
 * On a non-2xx status, the start of the body (where services say why they
 * refused) is attached to the error as its `cause`, so it shows in the log.
 */
export async function fetchJson(
  url: string,
  options: { timeoutMs?: number; headers?: Record<string, string> } = {},
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json", ...options.headers },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Request timed out", { cause: error });
    }
    throw error;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const detail = body.replace(/\s+/g, " ").trim().slice(0, MAX_DETAIL_LENGTH);
    throw new Error(`Request failed with status ${response.status}`, detail ? { cause: detail } : undefined);
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
