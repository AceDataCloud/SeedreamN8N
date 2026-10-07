import type { IDataObject, IExecuteFunctions } from "n8n-workflow";
import {
  callback,
  choice,
  imageUrls,
  integer,
  object,
  requiredText,
} from "./helpers";

export const PRO = "doubao-seedream-5-0-pro-260628";
export const LITE = "doubao-seedream-5-0-lite-260128";
export const V45 = "doubao-seedream-4-5-251128";
export const V40 = "doubao-seedream-4-0-250828";
export const MODELS = [PRO, LITE, V45, V40];

export function buildRequest(
  context: IExecuteFunctions,
  index: number,
): {
  endpoint: string;
  body: IDataObject;
} {
  const get = (name: string, fallback?: unknown) =>
    context.getNodeParameter(name, index, fallback as never);
  const operation = choice(get("operation"), "Operation", [
    "generate",
    "edit",
    "decompose",
  ]);
  const model = choice(get("model"), "Model", MODELS);
  const options = object(get("options", {}));
  const decomposition = operation === "decompose";
  if (decomposition && model !== PRO)
    throw new Error("Layer decomposition requires Seedream 5.0 Pro");
  const prompt = decomposition
    ? String(get("prompt", "")).trim()
    : requiredText(get("prompt"), "Prompt");
  const body: IDataObject = {
    model,
    async: true,
    response_format: choice(get("responseFormat", "url"), "Response format", [
      "url",
      "b64_json",
    ]),
  };
  if (prompt) body.prompt = prompt;
  const images =
    operation === "generate"
      ? []
      : imageUrls(
          get("imageUrls"),
          1,
          decomposition ? 1 : model === PRO ? 10 : 14,
          true,
        );
  if (images.length) body.image = images;
  const size = requiredText(get("size", "2K"), "Size");
  const presets = decomposition
    ? ["auto", "1K", "1.5K", "2K"]
    : model === PRO
      ? ["1K", "1.5K", "2K"]
      : model === LITE
        ? ["2K", "3K", "4K"]
        : model === V45
          ? ["2K", "4K"]
          : ["1K", "2K", "4K"];
  if (!presets.includes(size)) {
    const match = /^(\d+)x(\d+)$/.exec(size);
    if (
      decomposition ||
      !match ||
      Number(match[1]) <= 0 ||
      Number(match[2]) <= 0
    )
      throw new Error("Size is not supported for this model and operation");
    // Pixel-area and aspect-ratio limits are checked by the service for each model.
  }
  body.size = size;
  if (decomposition) body.layer_decomposition = true;
  const sequential = get("sequential", false);
  if (typeof sequential !== "boolean")
    throw new Error("Generate Image Set must be a boolean");
  if (sequential) {
    if (model === PRO)
      throw new Error("Seedream 5.0 Pro does not support image sets");
    const count = integer(get("maxImages", 2), "Maximum Images", 1, 15);
    if (images.length + count > 15)
      throw new Error(
        "Reference images plus maximum output images must not exceed 15",
      );
    body.sequential_image_generation = "auto";
    body.sequential_image_generation_options = { max_images: count };
  }
  if (options.outputFormat) {
    if (![PRO, LITE].includes(model))
      throw new Error(
        "Output format selection requires Seedream 5.0 Pro or Lite",
      );
    body.output_format = choice(options.outputFormat, "Output format", [
      "jpeg",
      "png",
    ]);
  }
  if (options.watermark !== undefined) {
    if (typeof options.watermark !== "boolean")
      throw new Error("Watermark must be a boolean");
    body.watermark = options.watermark;
  }
  if (options.webSearch !== undefined && typeof options.webSearch !== "boolean")
    throw new Error("Web Search must be a boolean");
  if (options.webSearch) {
    if (model !== LITE)
      throw new Error("Web search requires Seedream 5.0 Lite");
    body.tools = [{ type: "web_search" }];
  }
  if (options.optimizePrompt) {
    const mode = choice(options.optimizePrompt, "Prompt optimization", [
      "standard",
      "fast",
    ]);
    if (mode === "fast" && [LITE, V45].includes(model))
      throw new Error("This model supports only standard prompt optimization");
    body.optimize_prompt_options = { mode };
  }
  if (options.background) {
    if (model !== PRO || operation !== "edit")
      throw new Error(
        "Background selection requires Seedream 5.0 Pro image editing",
      );
    body.background = choice(options.background, "Background", [
      "opaque",
      "transparent",
    ]);
    if (
      body.background === "transparent" &&
      (images.length !== 1 || body.output_format !== "png")
    )
      throw new Error(
        "Transparent editing requires exactly one transparent PNG input and PNG output",
      );
  }
  callback(options, body);
  return { endpoint: "/seedream/images", body };
}
