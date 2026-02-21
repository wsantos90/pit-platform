import {
  protectedResourceHandler,
  metadataCorsOptionsRequestHandler,
} from "mcp-handler";

const authServerUrls = (process.env.MCP_AUTH_SERVER_URLS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const handler = protectedResourceHandler({
  authServerUrls,
});

const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
