import { z } from "zod";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "pit_ping",
      "Health check for P.I.T MCP",
      {
        message: z.string().optional(),
      },
      async ({ message }) => {
        const text = message ? `pong: ${message}` : "pong";
        return {
          content: [{ type: "text", text }],
        };
      }
    );
  },
  {},
  { basePath: "/api" }
);

const requiredScopes = (process.env.MCP_REQUIRED_SCOPES ?? "mcp:tools")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

const verifyToken = async (
  _req: Request,
  bearerToken?: string
): Promise<AuthInfo | undefined> => {
  const token = bearerToken?.trim();
  if (!token) return undefined;
  const expected = process.env.MCP_AUTH_TOKEN;
  if (!expected || token !== expected) return undefined;
  return {
    token,
    scopes: requiredScopes,
    clientId: "pit-mcp",
    extra: {
      userId: "mcp",
    },
  };
};

const authHandler = withMcpAuth(handler, verifyToken, {
  required: true,
  requiredScopes,
  resourceMetadataPath: "/.well-known/oauth-protected-resource",
});

export { authHandler as GET, authHandler as POST, authHandler as DELETE };
