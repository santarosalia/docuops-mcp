import { readFile, stat } from "node:fs/promises";
import { basename } from "node:path";

export class DocuOpsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message);
    this.name = "DocuOpsApiError";
  }
}

export interface DocuOpsClientConfig {
  baseUrl: string;
  apiToken: string;
}

export function getClientConfig(): DocuOpsClientConfig {
  const baseUrl = process.env.DOCUOPS_API_BASE_URL?.replace(/\/+$/, "");
  const apiToken = process.env.DOCUOPS_API_TOKEN;

  if (!baseUrl) {
    throw new Error(
      "DOCUOPS_API_BASE_URL 환경 변수가 필요합니다. (예: https://api.example.com/api/v1)",
    );
  }
  if (!apiToken) {
    throw new Error("DOCUOPS_API_TOKEN 환경 변수가 필요합니다.");
  }

  return { baseUrl, apiToken };
}

function authHeaders(apiToken: string): Record<string, string> {
  return { Authorization: `Bearer ${apiToken}` };
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function requestJson(
  config: DocuOpsClientConfig,
  method: string,
  path: string,
  options?: { query?: Record<string, string>; body?: unknown },
): Promise<unknown> {
  const url = new URL(`${config.baseUrl}${path}`);
  if (options?.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    ...authHeaders(config.apiToken),
    Accept: "application/json",
  };

  let body: string | undefined;
  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url, { method, headers, body });
  const data = await parseResponse(res);

  if (!res.ok) {
    throw new DocuOpsApiError(
      `DocuOps API ${method} ${path} failed: ${res.status} ${res.statusText}`,
      res.status,
      data,
    );
  }

  return data;
}

async function assertFileExists(filePath: string): Promise<void> {
  const info = await stat(filePath);
  if (!info.isFile()) {
    throw new Error(`파일이 아닙니다: ${filePath}`);
  }
}

export async function requestMultipart(
  config: DocuOpsClientConfig,
  method: string,
  path: string,
  fields: Record<string, string | undefined>,
  filePath: string,
): Promise<unknown> {
  await assertFileExists(filePath);

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      form.append(key, value);
    }
  }

  const fileBuffer = await readFile(filePath);
  const fileName = basename(filePath);
  form.append(
    "file",
    new Blob([fileBuffer]),
    fileName,
  );

  const url = `${config.baseUrl}${path}`;
  const res = await fetch(url, {
    method,
    headers: authHeaders(config.apiToken),
    body: form,
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new DocuOpsApiError(
      `DocuOps API ${method} ${path} failed: ${res.status} ${res.statusText}`,
      res.status,
      data,
    );
  }

  return data;
}

export async function getAllSchemas(config: DocuOpsClientConfig) {
  return requestJson(config, "GET", "/schemas");
}

export async function createSchema(
  config: DocuOpsClientConfig,
  body: {
    name: string;
    description: string;
    schema: unknown;
    workspaceId: string;
  },
) {
  return requestJson(config, "POST", "/schemas", { body });
}

export async function getSchemaValue(
  config: DocuOpsClientConfig,
  id: string,
  documentId: string,
) {
  return requestJson(config, "GET", `/schemas/${encodeURIComponent(id)}`, {
    query: { documentId },
  });
}

export async function updateSchema(
  config: DocuOpsClientConfig,
  id: string,
  body: { name: string; description: string; schema: unknown },
) {
  return requestJson(config, "PATCH", `/schemas/${encodeURIComponent(id)}`, {
    body,
  });
}

export async function deleteSchema(config: DocuOpsClientConfig, id: string) {
  return requestJson(config, "DELETE", `/schemas/${encodeURIComponent(id)}`);
}

export async function createSchemaValueFromDocument(
  config: DocuOpsClientConfig,
  id: string,
  projectId: string,
  filePath: string,
) {
  return requestMultipart(
    config,
    "POST",
    `/schemas/${encodeURIComponent(id)}/extract`,
    { projectId },
    filePath,
  );
}

export async function createDocument(
  config: DocuOpsClientConfig,
  filePath: string,
  fields: {
    projectId?: string;
    documentId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return requestMultipart(config, "POST", "/documents", {
    projectId: fields.projectId,
    documentId: fields.documentId,
    metadata:
      fields.metadata !== undefined
        ? JSON.stringify(fields.metadata)
        : undefined,
  }, filePath);
}

export async function createDocumentSync(
  config: DocuOpsClientConfig,
  filePath: string,
  fields: {
    projectId?: string;
    documentId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  return requestMultipart(config, "POST", "/documents/sync", {
    projectId: fields.projectId,
    documentId: fields.documentId,
    metadata:
      fields.metadata !== undefined
        ? JSON.stringify(fields.metadata)
        : undefined,
  }, filePath);
}
