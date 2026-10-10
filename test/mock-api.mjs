// Local stand-in for the three external APIs, used only by the Playwright tests.
// playwright.config.ts starts it and points the app's *_API_URL variables here.
import http from "node:http";

const PORT = 4010;
let npmRequests = 0;

function sendJson(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (pathname === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
  } else if (pathname === "/npm/next/latest") {
    // The version changes on every request, so a test can tell fresh data from a replay.
    npmRequests += 1;
    sendJson(res, { name: "next", version: `1.0.${npmRequests}`, description: "The React Framework" });
  } else if (pathname === "/maven/solrsearch/select") {
    sendJson(res, {
      response: { docs: [{ g: "org.apache.commons", a: "commons-lang3", latestVersion: "3.14.0" }] },
    });
  } else if (pathname.startsWith("/github/")) {
    // Always failing, to exercise the portal's "unavailable" state.
    sendJson(res, { message: "Service unavailable" }, 503);
  } else {
    sendJson(res, { message: "Not found" }, 404);
  }
});

server.listen(PORT, () => {
  console.log(`Mock API listening on http://localhost:${PORT}`);
});
