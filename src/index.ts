#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDocumentTools } from "./tools/document-tools.js";
import { registerSchemaTools } from "./tools/schema-tools.js";

const INSTRUCTIONS = [
  "DocuOps External API MCP 서버입니다.",
  "환경 변수 DOCUOPS_API_BASE_URL (예: https://api.example.com/api/v1) 과 DOCUOPS_API_TOKEN (Bearer JWT) 을 설정하세요.",
  "파일 업로드 도구는 filePath 로 로컬 파일 절대 경로를 전달합니다.",
].join("\n");

const server = new McpServer(
  {
    name: "docuops",
    version: "1.0.0",
  },
  { instructions: INSTRUCTIONS },
);

registerSchemaTools(server);
registerDocumentTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
