import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getClientConfigFromEnv,
  type DocuOpsClientConfig,
} from "./client.js";
import { registerDocumentTools } from "./tools/document-tools.js";
import { registerSchemaTools } from "./tools/schema-tools.js";

export const INSTRUCTIONS = [
  "DocuOps External API MCP 서버입니다.",
  "stdio 모드: DOCUOPS_API_BASE_URL, DOCUOPS_API_TOKEN 환경 변수를 설정하세요.",
  "http 모드: X-DocuOps-Base-Url(또는 X-Base-Url, /api/v1 자동 보정), Authorization: Bearer <token> 또는 X-DocuOps-Api-Token 헤더를 요청마다 전달하세요.",
  "파일 업로드 도구는 filePath 로 로컬 파일 절대 경로를 전달합니다.",
].join("\n");

export function createMcpServer(
  getConfig: () => DocuOpsClientConfig = getClientConfigFromEnv,
): McpServer {
  const server = new McpServer(
    {
      name: "docuops",
      version: "1.0.0",
    },
    { instructions: INSTRUCTIONS },
  );

  registerSchemaTools(server, getConfig);
  registerDocumentTools(server, getConfig);

  return server;
}
