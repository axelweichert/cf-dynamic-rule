// cf-dynamic-rule - Worker Entry
// Version: 0.1.1
// Status: Bootstrap, deploybar. Logik folgt in 0.2.0.

export interface Env {
  // Spaeter aktiviert (siehe wrangler.toml):
  // TARGETS: KVNamespace;
  // AUDIT: R2Bucket;
  // CF_API_TOKEN: string;
  // CF_ACCOUNT_ID: string;
  // ACCESS_AUD: string;
  ACCESS_TEAM_DOMAIN: string;
  RULE_TTL_MINUTES: string;
  RULE_TAG_PREFIX: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/" && request.method === "GET") {
      const html = `<!doctype html>
<html lang="de">
<head><meta charset="utf-8"><title>cf-dynamic-rule</title></head>
<body style="font-family:system-ui;max-width:640px;margin:4rem auto;padding:0 1rem">
  <h1>cf-dynamic-rule</h1>
  <p>v0.1.1 (Bootstrap)</p>
  <p>Tenant: Busch NFR Demo</p>
  <p>Team-Domain: ${env.ACCESS_TEAM_DOMAIN}</p>
  <p>TTL: ${env.RULE_TTL_MINUTES} min</p>
  <p>Funktionale Implementierung folgt in v0.2.0.</p>
</body>
</html>`;
      return new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    if (url.pathname === "/api/health" && request.method === "GET") {
      return Response.json({
        status: "ok",
        version: "0.1.1",
        timestamp: new Date().toISOString(),
      });
    }

    return new Response("Not Found", { status: 404 });
  },
};
