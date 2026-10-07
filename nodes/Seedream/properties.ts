import type { INodeProperties } from "n8n-workflow";
export const properties: INodeProperties[] = [
  {
    displayName: "Resource",
    name: "resource",
    type: "options",
    default: "image",
    options: [
      {
        name: "Image",
        value: "image",
      },
      {
        name: "Task",
        value: "task",
      },
    ],
    noDataExpression: true,
  },
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    default: "generate",
    displayOptions: {
      show: {
        resource: ["image"],
      },
    },
    options: [
      {
        name: "Generate",
        value: "generate",
        description: "Create images from a prompt",
        action: "Generate an image",
      },
      {
        name: "Edit",
        value: "edit",
        description: "Edit or combine reference images",
        action: "Edit an image",
      },
      {
        name: "Decompose Layers",
        value: "decompose",
        description: "Separate an image into positioned PNG layers",
        action: "Decompose image layers",
      },
    ],
    noDataExpression: true,
  },
  {
    displayName: "Operation",
    name: "operation",
    type: "options",
    default: "get",
    displayOptions: {
      show: {
        resource: ["task"],
      },
    },
    options: [
      {
        name: "Get",
        value: "get",
        description: "Retrieve one task",
        action: "Get a task",
      },
      {
        name: "Get Many",
        value: "getMany",
        description: "Retrieve up to 50 specific task IDs",
        action: "Get many tasks",
      },
    ],
    noDataExpression: true,
  },
  {
    displayName: "Task ID",
    name: "taskId",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["task"],
        operation: ["get"],
      },
    },
    required: true,
  },
  {
    displayName: "Task IDs",
    name: "taskIds",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["task"],
        operation: ["getMany"],
      },
    },
    required: true,
    description: "Up to 50 task IDs, separated by commas or new lines",
  },
  {
    displayName: "Prompt",
    name: "prompt",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["generate", "edit"],
      },
    },
    required: true,
    typeOptions: {
      rows: 4,
    },
  },
  {
    displayName: "Prompt",
    name: "prompt",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["decompose"],
      },
    },
    typeOptions: {
      rows: 3,
    },
    description:
      "Optional description of elements to separate; leave empty for automatic decomposition",
  },
  {
    displayName: "Model",
    name: "model",
    type: "options",
    default: "doubao-seedream-5-0-lite-260128",
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["generate", "edit"],
      },
    },
    options: [
      {
        name: "Seedream 5.0 Lite",
        value: "doubao-seedream-5-0-lite-260128",
      },
      {
        name: "Seedream 5.0 Pro",
        value: "doubao-seedream-5-0-pro-260628",
      },
      {
        name: "Seedream 4.5",
        value: "doubao-seedream-4-5-251128",
      },
      {
        name: "Seedream 4.0",
        value: "doubao-seedream-4-0-250828",
      },
    ],
  },
  {
    displayName: "Model",
    name: "model",
    type: "options",
    default: "doubao-seedream-5-0-pro-260628",
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["decompose"],
      },
    },
    options: [
      {
        name: "Seedream 5.0 Pro",
        value: "doubao-seedream-5-0-pro-260628",
      },
    ],
  },
  {
    displayName: "Image URLs",
    name: "imageUrls",
    type: "string",
    default: "",
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["edit", "decompose"],
      },
    },
    required: true,
    typeOptions: {
      rows: 3,
    },
    description:
      "One URL or image data URI per line. Pro editing: up to 10; other models: up to 14; decomposition: exactly one PNG/JPEG.",
  },
  {
    displayName: "Size",
    name: "size",
    type: "string",
    default: "2K",
    displayOptions: {
      show: {
        resource: ["image"],
      },
    },
    description:
      "Pro: 1K/1.5K/2K; Lite: 2K/3K/4K; 4.5: 2K/4K; 4.0: 1K/2K/4K. Exact WIDTHxHEIGHT is supported outside decomposition; decomposition also supports auto.",
  },
  {
    displayName: "Generate Image Set",
    name: "sequential",
    type: "boolean",
    default: false,
    displayOptions: {
      show: {
        resource: ["image"],
        operation: ["generate", "edit"],
        model: [
          "doubao-seedream-5-0-lite-260128",
          "doubao-seedream-4-5-251128",
          "doubao-seedream-4-0-250828",
        ],
      },
    },
    description:
      "Whether to generate related images in one request; unavailable on Pro",
  },
  {
    displayName: "Maximum Images",
    name: "maxImages",
    type: "number",
    default: 2,
    displayOptions: {
      show: {
        resource: ["image"],
        sequential: [true],
        model: [
          "doubao-seedream-5-0-lite-260128",
          "doubao-seedream-4-5-251128",
          "doubao-seedream-4-0-250828",
        ],
      },
    },
    typeOptions: {
      minValue: 1,
      maxValue: 15,
      numberPrecision: 0,
    },
    description: "Reference images plus maximum output images cannot exceed 15",
  },
  {
    displayName: "Response Format",
    name: "responseFormat",
    type: "options",
    default: "url",
    displayOptions: {
      show: {
        resource: ["image"],
      },
    },
    options: [
      {
        name: "Image URL",
        value: "url",
      },
      {
        name: "Base64 JSON",
        value: "b64_json",
      },
    ],
  },
  {
    displayName: "Options",
    name: "options",
    type: "collection",
    default: {},
    displayOptions: {
      show: {
        resource: ["image"],
      },
    },
    placeholder: "Add Option",
    options: [
      {
        displayName: "Background",
        name: "background",
        type: "options",
        default: "opaque",
        options: [
          {
            name: 'Opaque',
            value: "opaque",
          },
          {
            name: 'Transparent',
            value: "transparent",
          },
        ],
        description:
          "Pro editing only. Transparent requires one transparent PNG input and PNG output.",
      },
      {
        displayName: "Callback URL",
        name: "callbackUrl",
        type: "string",
        default: "",
        description: "Optional public HTTPS webhook for the final result",
      },
      {
        displayName: "Output Format",
        name: "outputFormat",
        type: "options",
        default: "jpeg",
        options: [
          {
            name: "jpeg",
            value: "jpeg",
          },
          {
            name: "png",
            value: "png",
          },
        ],
        description: "Pro and Lite only; decomposition layers are PNG",
      },
      {
        displayName: "Prompt Optimization",
        name: "optimizePrompt",
        type: "options",
        default: "standard",
        options: [
          {
            name: 'Standard',
            value: "standard",
          },
          {
            name: 'Fast',
            value: "fast",
          },
        ],
        description: "Lite and 4.5 support standard only",
      },
      {
        displayName: "Watermark",
        name: "watermark",
        type: "boolean",
        default: true,
        description: "Whether to add an AI-generated watermark",
      },
      {
        displayName: "Web Search",
        name: "webSearch",
        type: "boolean",
        default: false,
        description:
          "Whether to enable web search; available on Seedream 5.0 Lite only",
      },
    ],
  },
  {
    displayName: "Simplify",
    name: "simplify",
    type: "boolean",
    default: true,
    description:
      "Whether to return essential fields instead of the raw API response",
  },
];
