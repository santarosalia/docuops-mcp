import { createServer } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

function isAuthorized(req: import("node:http").IncomingMessage): boolean {
  const expected = process.env.MCP_PROXY_TOKEN;
  if (!expected) {
    return true;
  }

  return req.headers.authorization === `Bearer ${expected}`;
}

async function readJsonBody(
  req: import("node:http").IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }

  if (chunks.length === 0) {
    return undefined;
  }

  return JSON.parse(Buffer.concat(chunks).toString()) as unknown;
}

export function startHttpServer(
  createMcpServer: () => McpServer,
  port: number,
): void {
  const httpServer = createServer(async (req, res) => {
    if (!isAuthorized(req)) {
      res.writeHead(401, { "Content-Type": "text/plain" });
      res.end("Unauthorized");
      return;
    }

    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.url === "/mcp" && (req.method === "POST" || req.method === "GET")) {
      const mcp = createMcpServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });

      res.on("close", () => {
        transport.close();
        mcp.close();
      });

      await mcp.connect(transport);

      const body = req.method === "POST" ? await readJsonBody(req) : undefined;
      await transport.handleRequest(req, res, body);
      return;
    }

    res.writeHead(404).end();
  });

  httpServer.listen(port, () => {
    console.error(`[docuops-mcp] HTTP transport on :${port} (/mcp, /health)`);
  });
}
