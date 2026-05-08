// cf-dynamic-rule - Worker Entry
// Version: 0.5.0-alpha.3

import type { Env } from "./types.js";
import { handleUi } from "./handlers/ui.js";
import { handleTargets } from "./handlers/targets.js";
import { handleRequest } from "./handlers/request.js";
import { handleActive, handleRevoke } from "./handlers/active.js";
import { handleMe } from "./handlers/me.js";
import {
  handleAdminListTargets,
  handleAdminCreateTarget,
  handleAdminUpdateTarget,
  handleAdminDeleteTarget,
} from "./handlers/admin.js";
import {
  handleAdminCreateUser,
  handleAdminDeleteUser,
  handleAdminListUsers,
  handleAdminUpdateUser,
} from "./handlers/admin-users.js";
import {
  handleAdminApprovePackage,
  handleAdminCreatePackage,
  handleAdminDeletePackage,
  handleAdminListPackages,
  handleAdminRevokeApproval,
} from "./handlers/admin-packages.js";
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
          version: "0.5.0-alpha.3",
          ts: new Date().toISOString(),
        });
      }

      if (p === "/api/me" && m === "GET") return handleMe(request, env);
      if (p === "/api/targets" && m === "GET") return handleTargets(request, env);
      if (p === "/api/request" && m === "POST") return handleRequest(request, env);
      if (p === "/api/active" && m === "GET") return handleActive(request, env);

      const revokeMatch = p.match(/^\/api\/rule\/([^/]+)$/);
      if (revokeMatch && m === "DELETE") {
        return handleRevoke(request, env, revokeMatch[1]);
      }

      // Admin -- Targets (KV)
      if (p === "/api/admin/targets" && m === "GET") return handleAdminListTargets(request, env);
      if (p === "/api/admin/targets" && m === "POST") return handleAdminCreateTarget(request, env);

      const adminTargetMatch = p.match(/^\/api\/admin\/targets\/([^/]+)$/);
      if (adminTargetMatch && m === "PUT") {
        return handleAdminUpdateTarget(request, env, adminTargetMatch[1]);
      }
      if (adminTargetMatch && m === "DELETE") {
        return handleAdminDeleteTarget(request, env, adminTargetMatch[1]);
      }

      // Admin -- Users (D1, v0.5.0)
      if (p === "/api/admin/users" && m === "GET") return handleAdminListUsers(request, env);
      if (p === "/api/admin/users" && m === "POST") return handleAdminCreateUser(request, env);

      const adminUserMatch = p.match(/^\/api\/admin\/users\/([^/]+)$/);
      if (adminUserMatch && m === "PUT") {
        return handleAdminUpdateUser(request, env, adminUserMatch[1]);
      }
      if (adminUserMatch && m === "DELETE") {
        return handleAdminDeleteUser(request, env, adminUserMatch[1]);
      }

      // Admin -- Access Packages (D1, v0.5.0)
      if (p === "/api/admin/packages" && m === "GET") return handleAdminListPackages(request, env);
      if (p === "/api/admin/packages" && m === "POST") return handleAdminCreatePackage(request, env);

      const adminPackageApproveMatch = p.match(
        /^\/api\/admin\/packages\/([^/]+)\/approve$/,
      );
      if (adminPackageApproveMatch && m === "POST") {
        return handleAdminApprovePackage(request, env, adminPackageApproveMatch[1]);
      }
      const adminPackageRevokeMatch = p.match(
        /^\/api\/admin\/packages\/([^/]+)\/approval$/,
      );
      if (adminPackageRevokeMatch && m === "DELETE") {
        return handleAdminRevokeApproval(request, env, adminPackageRevokeMatch[1]);
      }
      const adminPackageMatch = p.match(/^\/api\/admin\/packages\/([^/]+)$/);
      if (adminPackageMatch && m === "DELETE") {
        return handleAdminDeletePackage(request, env, adminPackageMatch[1]);
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
