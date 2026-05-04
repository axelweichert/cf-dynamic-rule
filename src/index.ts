// cf-dynamic-rule - Worker Entry
// Version: 0.2.4

import type { Env } from "./types.js";
import { handleUi } from "./handlers/ui.js";
import { handleTargets } from "./handlers/targets.js";
import { handleRequest } from "./handlers/request.js";
import { handleActive, handleRevoke } from "./handlers/active.js";
import { runCleanup } from "./handlers/cleanup.js";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const m = request.method;
    const p = url.pathname;

    try {
      if (p === "/" && m === "GET") return handleUi(request, env);

      if (p === "/api/health" && m === "GET") {
        return Response.json({
          status: "ok",
          version: "0.2.4",
          ts: new Date().toISOString(),
        });
      }

      if (p === "/api/targets" && m === "GET") return handleTargets(request, env);
      if (p === "/api/request" && m === "POST") return handleRequest(request, env);
      if (p === "/api/active" && m === "GET") return handleActive(request, env);

      const revokeMatch = p.match(/^\/api\/rule\/([^/]+)$/);
      if (revokeMatch && m === "DELETE") {
        return handleRevoke(request, env, revokeMatch[1]);
      }

      return new Response("Not Found", { status: 404 });
    } catch (err) {
      console.error("unhandled", err);
      return new Response(`Internal Error: ${(err as Error).message}`, { status: 500 });
    }
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      (async () => {
        try {
          const res = await runCleanup(env);
          console.log("cleanup", res);
        } catch (err) {
          console.error("cleanup_failed", err);
        }
      })(),
    );
  },
};
