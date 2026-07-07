import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  createDocument,
  createDocumentSync,
  DocuOpsApiError,
  getClientConfig,
} from "../client.js";
import { filePathSchema, metadataSchema } from "../schemas.js";

function toolError(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function okJson(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function formatError(error: unknown): string {
  if (error instanceof DocuOpsApiError) {
    return `${error.message}\n${JSON.stringify(error.body, null, 2)}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

export function registerDocumentTools(server: McpServer) {
  server.registerTool(
    "ExternalDocumentController_createDocument",
    {
      title: "문서 생성 (비동기)",
      description:
        "문서를 업로드합니다. 처리는 비동기로 진행되며 documentId 등을 반환합니다.",
      inputSchema: {
        filePath: filePathSchema,
        projectId: z.string().optional().describe("프로젝트 ID"),
        documentId: z.string().optional().describe("연결할 문서 ID"),
        metadata: metadataSchema,
      },
      annotations: { title: "문서 생성 (비동기)" },
    },
    async ({ filePath, projectId, documentId, metadata }) => {
      try {
        const config = getClientConfig();
        const data = await createDocument(config, filePath, {
          projectId,
          documentId,
          metadata,
        });
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalDocumentController_createDocumentSync",
    {
      title: "문서 생성 (동기)",
      description:
        "문서를 업로드하고 처리 완료(성공/실패) 상태를 동기적으로 반환합니다.",
      inputSchema: {
        filePath: filePathSchema,
        projectId: z.string().optional().describe("프로젝트 ID"),
        documentId: z.string().optional().describe("연결할 문서 ID"),
        metadata: metadataSchema,
      },
      annotations: { title: "문서 생성 (동기)" },
    },
    async ({ filePath, projectId, documentId, metadata }) => {
      try {
        const config = getClientConfig();
        const data = await createDocumentSync(config, filePath, {
          projectId,
          documentId,
          metadata,
        });
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );
}
