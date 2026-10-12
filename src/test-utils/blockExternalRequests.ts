// Loaded before every unit test (see vitest.config.mts). Unit tests talk only
// to servers they start on this computer; a request to anywhere else fails
// here, so a test can never send a real token to a real service or depend on one.
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "[::1]"]);
const realFetch = globalThis.fetch;

globalThis.fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);
  if (!LOCAL_HOSTS.has(url.hostname)) {
    return Promise.reject(
      new Error(`Unit tests may not contact ${url.host}. Start a local server with startServer() instead.`),
    );
  }
  return realFetch(input, init);
};
