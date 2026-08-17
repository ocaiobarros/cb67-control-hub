// Mimics the two sides of the problem, so a REAL browser can be asked what it
// does — rather than a unit test asserting what I believe it does.
//
//   :8791  the "admin origin"; /v1/gated answers exactly as Cloudflare Access
//          does when its session has expired: 302 to another origin.
//   :8792  the "cloudflareaccess.com" side, deliberately WITHOUT CORS headers,
//          which is what makes the followed redirect fail.
import http from "node:http";

const PAGE = `<!doctype html><meta charset=utf-8><title>probe</title><body><script>
const out = [];
async function probe(label, url, init) {
  try {
    const r = await fetch(url, init);
    out.push({ label, ok: true, type: r.type, status: r.status });
  } catch (e) {
    out.push({ label, ok: false, error: e.constructor.name, message: String(e.message).slice(0, 60) });
  }
}
(async () => {
  // What the code does now.
  await probe("manual", "/v1/gated", { redirect: "manual" });
  // What it did before, and why the operator saw a connectivity error.
  await probe("follow", "/v1/gated", { redirect: "follow" });
  // A normal response must not be mistaken for an interception.
  await probe("ok-manual", "/v1/fine", { redirect: "manual" });
  // A 401 from the app must not be mistaken for one either.
  await probe("401-manual", "/v1/unauth", { redirect: "manual" });
  document.title = "done";
  document.body.append(Object.assign(document.createElement("pre"),
    { id: "result", textContent: JSON.stringify(out) }));
})();
</script></body>`;

http
  .createServer((req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(PAGE);
    }
    if (req.url === "/v1/gated") {
      // Exactly the shape observed live from Access.
      res.writeHead(302, { Location: "http://127.0.0.1:8792/cdn-cgi/access/login/admin" });
      return res.end();
    }
    if (req.url === "/v1/fine") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end('{"ok":true}');
    }
    if (req.url === "/v1/unauth") {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end('{"code":"unauthorized"}');
    }
    res.writeHead(404).end();
  })
  .listen(8791, "127.0.0.1");

// No Access-Control-Allow-Origin: this is what a cross-origin identity provider
// looks like to a fetch that followed the redirect.
http
  .createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end("<h1>sign in</h1>");
  })
  .listen(8792, "127.0.0.1");

console.log("probe servers on 8791/8792");
