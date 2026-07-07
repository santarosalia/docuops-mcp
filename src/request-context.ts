import type { IncomingMessage } from "node:http";
import { normalizeBaseUrl, type DocuOpsClientConfig } from "./client.js";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function readBaseUrl(req: IncomingMessage): string | undefined {
  const raw =
    headerValue(req.headers["x-docuops-base-url"]) ??
    headerValue(req.headers["x-base-url"]);
  return raw ? normalizeBaseUrl(raw) : undefined;
}

function readApiToken(req: IncomingMessage): string | undefined {
  const dedicated = headerValue(req.headers["x-docuops-api-token"]);
  if (dedicated) {
    return dedicated.trim();
  }

  const authorization = headerValue(req.headers.authorization);
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const apiToken = authorization.slice("Bearer ".length).trim();
  return apiToken || undefined;
}

export function extractRequestContext(
  req: IncomingMessage,
): DocuOpsClientConfig | null {
  const baseUrl = readBaseUrl(req);
  const apiToken = readApiToken(req);

  if (!baseUrl || !apiToken) {
    return null;
  }

  return { baseUrl, apiToken };
}
