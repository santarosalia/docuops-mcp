import * as z from "zod";

export type JsonSchemaProperty = {
  type: "String" | "Number" | "Boolean" | "Object" | "Array";
  description: string;
  items?: JsonSchemaProperty;
  properties?: Record<string, JsonSchemaProperty>;
  propertyOrder?: string[];
  required?: string[];
  enum?: string[];
};

export const jsonSchemaPropertySchema: z.ZodType<JsonSchemaProperty> = z.lazy(
  () =>
    z.object({
      type: z.enum(["String", "Number", "Boolean", "Object", "Array"]),
      description: z.string(),
      items: jsonSchemaPropertySchema.optional(),
      properties: z.record(jsonSchemaPropertySchema).optional(),
      propertyOrder: z.array(z.string()).optional(),
      required: z.array(z.string()).optional(),
      enum: z.array(z.string()).optional(),
    }),
);

export const createSchemaBodySchema = z.object({
  name: z.string().describe("스키마 이름"),
  description: z.string().describe("스키마 설명"),
  schema: jsonSchemaPropertySchema.describe("스키마 정의"),
  workspaceId: z.string().describe("워크스페이스 ID"),
});

export const updateSchemaBodySchema = z.object({
  name: z.string().describe("스키마 이름"),
  description: z.string().describe("스키마 설명"),
  schema: jsonSchemaPropertySchema.describe("스키마 정의"),
});

export const metadataSchema = z
  .record(z.unknown())
  .optional()
  .describe("문서 메타데이터 (JSON 객체)");

export const filePathSchema = z
  .string()
  .min(1)
  .describe("업로드할 로컬 파일의 절대 경로");
