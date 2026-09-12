import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { requireMcpAuth } from "@/lib/mcp/auth";
import { registerTools } from "@/lib/mcp/tools";

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: "nbs-calendar", version: "1.0.0" });
  registerTools(server);
  return server;
});

async function handle(request: Request) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof Response) return auth;
  return handler.fetch(request, { authInfo: auth });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
