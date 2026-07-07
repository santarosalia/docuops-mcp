import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";
import {
  createSchema,
  createSchemaValueFromDocument,
  deleteSchema,
  DocuOpsApiError,
  getAllSchemas,
  getClientConfig,
  getSchemaValue,
  updateSchema,
} from "../client.js";
import {
  createSchemaBodySchema,
  filePathSchema,
  updateSchemaBodySchema,
} from "../schemas.js";

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

export function registerSchemaTools(server: McpServer) {
  server.registerTool(
    "ExternalSchemaController_getAllSchemas",
    {
      title: "스키마 목록 조회",
      description: "유저가 속한 워크스페이스의 스키마 모두 조회",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, title: "스키마 목록 조회" },
    },
    async () => {
      try {
        const config = getClientConfig();
        const data = await getAllSchemas(config);
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalSchemaController_createSchema",
    {
      title: "스키마 생성",
      description: "스키마 생성",
      inputSchema: {
        body: createSchemaBodySchema,
      },
      annotations: { title: "스키마 생성" },
    },
    async ({ body }) => {
      try {
        const config = getClientConfig();
        const data = await createSchema(config, body);
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalSchemaController_getSchemaValue",
    {
      title: "스키마 값 조회",
      description: "스키마 값 조회",
      inputSchema: {
        id: z.string().describe("스키마 ID"),
        documentId: z.string().describe("문서 ID"),
      },
      annotations: { readOnlyHint: true, title: "스키마 값 조회" },
    },
    async ({ id, documentId }) => {
      try {
        const config = getClientConfig();
        const data = await getSchemaValue(config, id, documentId);
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalSchemaController_updateSchema",
    {
      title: "스키마 업데이트",
      description: "스키마 업데이트",
      inputSchema: {
        id: z.string().describe("스키마 ID"),
        body: updateSchemaBodySchema,
      },
      annotations: { title: "스키마 업데이트" },
    },
    async ({ id, body }) => {
      try {
        const config = getClientConfig();
        const data = await updateSchema(config, id, body);
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalSchemaController_deleteSchema",
    {
      title: "스키마 삭제",
      description: "스키마 삭제",
      inputSchema: {
        id: z.string().describe("스키마 ID"),
      },
      annotations: {
        destructiveHint: true,
        title: "스키마 삭제",
      },
    },
    async ({ id }) => {
      try {
        const config = getClientConfig();
        const data = await deleteSchema(config, id);
        return okJson(data ?? { success: true });
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );

  server.registerTool(
    "ExternalSchemaController_createSchemaValueFromDocument",
    {
      title: "문서에서 스키마 값 추출",
      description: "문서 추출과 스키마 값 추출 동시 요청",
      inputSchema: {
        id: z.string().describe("스키마 ID"),
        projectId: z.string().describe("프로젝트 ID"),
        filePath: filePathSchema,
      },
      annotations: { title: "문서에서 스키마 값 추출" },
    },
    async ({ id, projectId, filePath }) => {
      try {
        const config = getClientConfig();
        const data = await createSchemaValueFromDocument(
          config,
          id,
          projectId,
          filePath,
        );
        return okJson(data);
      } catch (error) {
        return toolError(formatError(error));
      }
    },
  );
}
