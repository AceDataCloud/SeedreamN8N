import { NodeApiError, NodeOperationError } from "n8n-workflow";
import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  JsonObject,
} from "n8n-workflow";

export function object(value: unknown): IDataObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as IDataObject)
    : {};
}
export function requiredText(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} is required`);
  return value.trim();
}
export function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return value;
}
export function choice(
  value: unknown,
  label: string,
  values: string[],
): string {
  const text = requiredText(value, label);
  if (!values.includes(text))
    throw new Error(`Select a supported ${label.toLowerCase()}`);
  return text;
}
export function publicUrl(
  value: unknown,
  label: string,
  allowData = false,
): string {
  const text = requiredText(value, label);
  if (
    allowData &&
    /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(text)
  )
    return text;
  if (!URL.canParse(text))
    throw new Error(`${label} must be an HTTP or HTTPS URL`);
  const url = new URL(text);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password
  )
    throw new Error(
      `${label} must be an HTTP or HTTPS URL without credentials`,
    );
  return text;
}
export function imageUrls(
  value: unknown,
  min: number,
  max: number,
  allowData = false,
): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value
          .split(/\r?\n/)
          .map((v) => v.trim())
          .filter(Boolean)
      : [];
  if (values.length < min || values.length > max)
    throw new Error(`Provide ${min} to ${max} image URLs, one per line`);
  return values.map((v) => publicUrl(v, "Image URL", allowData));
}
export function taskIds(value: unknown): string[] {
  const ids = requiredText(value, "Task IDs")
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
  if (!ids.length || ids.length > 50)
    throw new Error("Provide between 1 and 50 task IDs");
  return ids;
}
export function callback(options: IDataObject, body: IDataObject): void {
  if (options.callbackUrl) {
    const url = publicUrl(options.callbackUrl, "Callback URL");
    if (!url.startsWith("https://"))
      throw new Error("Callback URL must use HTTPS");
    body.callback_url = url;
  }
}
export function taskResult(record: IDataObject): IDataObject {
  const response = object(record.response);
  const state = String(record.state ?? record.status ?? "").toLowerCase();
  const failed =
    response.success === false ||
    record.success === false ||
    Boolean(response.error) ||
    Boolean(record.error) ||
    ["failed", "error", "cancelled", "canceled"].includes(state);
  const data =
    response.data ??
    (typeof response.audio_url === "string"
      ? { audio_url: response.audio_url }
      : null);
  const complete =
    !failed &&
    (response.success === true ||
      ["succeeded", "success", "completed", "complete"].includes(state) ||
      (Boolean(record.finished_at) && data !== null));
  return {
    taskId: record.id ?? record.task_id ?? "",
    status: failed ? "failed" : complete ? "succeeded" : "processing",
    finished: failed || complete,
    successful: failed ? false : complete ? true : null,
    data,
    error: response.error ?? record.error ?? null,
    traceId: record.trace_id ?? response.trace_id ?? null,
    cost: response.cost ?? null,
  };
}
export function submissionResult(response: IDataObject): IDataObject {
  if (typeof response.task_id !== "string" || !response.task_id)
    throw new Error("The service did not return a task ID");
  return {
    taskId: response.task_id,
    status: "submitted",
    finished: false,
    successful: null,
    traceId: response.trace_id ?? null,
  };
}
export async function request(
  context: IExecuteFunctions,
  credential: string,
  endpoint: string,
  body: IDataObject,
  method: "GET" | "POST" = "POST",
  headers: IDataObject = {},
): Promise<IDataObject> {
  let response: unknown;
  try {
    response = await context.helpers.httpRequestWithAuthentication.call(
      context,
      credential,
      {
        method,
        url: `https://api.acedata.cloud${endpoint}`,
        ...(method === "GET" ? { qs: body } : { body }),
        headers,
        json: true,
        timeout: 60000,
      },
    );
  } catch (error) {
    throw new NodeApiError(context.getNode(), error as JsonObject);
  }
  if (!response || typeof response !== "object" || Array.isArray(response))
    throw new NodeOperationError(
      context.getNode(),
      "The service returned an unexpected response",
    );
  const data = object(response);
  if (!data.id && (data.success === false || data.error)) {
    const error = object(data.error);
    throw new NodeApiError(context.getNode(), {
      message: String(error.message ?? "The service rejected this request"),
      code: error.code,
    } as JsonObject);
  }
  return data;
}
export function output(
  context: IExecuteFunctions,
  data: IDataObject[],
  index: number,
): INodeExecutionData[] {
  return context.helpers.constructExecutionMetaData(
    context.helpers.returnJsonArray(data),
    { itemData: { item: index } },
  );
}
export function failure(
  context: IExecuteFunctions,
  error: unknown,
  index: number,
): INodeExecutionData {
  const message = error instanceof Error ? error.message : String(error);
  if (context.continueOnFail())
    return { json: { error: message }, pairedItem: { item: index } };
  if (error instanceof NodeApiError || error instanceof NodeOperationError)
    throw error;
  throw new NodeOperationError(context.getNode(), message, {
    itemIndex: index,
  });
}
