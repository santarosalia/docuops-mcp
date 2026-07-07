import { createServer } from "node:http";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { getClientConfigFromEnv } from "./client.js";
import { extractRequestContext } from "./request-context.js";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function isProxyAuthorized(req: import("node:http").IncomingMessage): boolean {
  const expected = process.env.MCP_PROXY_TOKEN;
  if (!expected) {
    return true;
  }

  const proxyToken = headerValue(req.headers["x-mcp-proxy-token"]);
  if (proxyToken === expected) {
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

async function handleMcpRequest(
  req: import("node:http").IncomingMessage,
  res: import("node:http").ServerResponse,
  createMcpServer: (
    getConfig: () => import("./client.js").DocuOpsClientConfig,
  ) => McpServer,
): Promise<void> {
  const requestContext = extractRequestContext(req);
  const getConfig = requestContext
    ? () => requestContext
    : getClientConfigFromEnv;

  if (!requestContext) {
    try {
      getClientConfigFromEnv();
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error:
            "X-DocuOps-Base-Url(또는 X-Base-Url) 헤더와 Authorization: Bearer <token> 또는 X-DocuOps-Api-Token 헤더가 필요합니다. stdio 모드에서는 DOCUOPS_API_BASE_URL, DOCUOPS_API_TOKEN 환경 변수를 사용하세요.",
        }),
      );
      return;
    }
  }

  const mcp = createMcpServer(getConfig);
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
}

export function startHttpServer(
  createMcpServer: (
    getConfig: () => import("./client.js").DocuOpsClientConfig,
  ) => McpServer,
  port: number,
): void {
  const httpServer = createServer(async (req, res) => {
    if (!isProxyAuthorized(req)) {
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
      await handleMcpRequest(req, res, createMcpServer);
      return;
    }

    res.writeHead(404).end();
  });

  httpServer.listen(port, () => {
    console.error(`[docuops-mcp] HTTP transport on :${port} (/mcp, /health)`);
  });
}
