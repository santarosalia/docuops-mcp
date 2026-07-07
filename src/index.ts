#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { startHttpServer } from "./http.js";
import { createMcpServer } from "./server.js";

const TRANSPORT = process.env.TRANSPORT ?? "stdio";
const PORT = Number(process.env.PORT ?? 8080);

if (TRANSPORT === "http") {
  startHttpServer(createMcpServer, PORT);
} else {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
