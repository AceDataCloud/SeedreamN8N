const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Seedream } = require("../dist/nodes/Seedream/Seedream.node.js");
const { taskResult } = require("../dist/nodes/Seedream/helpers.js");
const {
  AceDataSeedreamApi,
} = require("../dist/credentials/AceDataSeedreamApi.credentials.js");
const node = new Seedream();
const create = {
  resource: "image",
  operation: "generate",
  model: "doubao-seedream-5-0-lite-260128",
  prompt: "A matte blue ceramic mug on a clean white table, soft studio light",
  size: "2K",
  responseFormat: "url",
  simplify: true,
};
function context(parameters, responses = [], options = {}) {
  let next = 0;
  const calls = [];
  return {
    calls,
    getInputData: () =>
      Array.from({ length: options.count ?? 1 }, () => ({ json: {} })),
    getNode: () => ({
      name: "Test",
      type: "@acedatacloud/n8n-nodes-seedream.seedream",
      typeVersion: 1,
      parameters: {},
      position: [0, 0],
    }),
    getNodeParameter: (name, index, fallback) => {
      const p = Array.isArray(parameters) ? parameters[index] : parameters;
      return name in p ? p[name] : fallback;
    },
    continueOnFail: () => options.continueOnFail ?? false,
    helpers: {
      httpRequestWithAuthentication: async (credential, request) => {
        calls.push({ credential, ...request });
        const response = responses[next++];
        if (response instanceof Error) throw response;
        return response;
      },
      returnJsonArray: (data) => data.map((json) => ({ json })),
      constructExecutionMetaData: (data, meta) =>
        data.map((item) => ({ ...item, pairedItem: meta.itemData })),
    },
  };
}
async function submitted(p) {
  const ctx = context({ ...create, ...p }, [
    { task_id: "new", trace_id: "trace" },
  ]);
  await node.execute.call(ctx);
  return ctx.calls[0].body;
}
async function invalid(p, pattern) {
  const ctx = context({ ...create, ...p });
  await assert.rejects(node.execute.call(ctx), pattern);
  assert.equal(ctx.calls.length, 0);
}
test("creation submits exactly once with async=true and preserves selected model and item pairing", async () => {
  const ctx = context(create, [{ task_id: "new", trace_id: "trace" }]);
  const [out] = await node.execute.call(ctx);
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].url, "https://api.acedata.cloud/seedream/images");
  assert.equal(ctx.calls[0].credential, "aceDataSeedreamApi");
  assert.equal(ctx.calls[0].body.async, true);
  assert.equal(ctx.calls[0].body.model, create.model);
  assert.deepEqual(out[0].json, {
    taskId: "new",
    status: "submitted",
    finished: false,
    successful: null,
    traceId: "trace",
  });
  assert.deepEqual(out[0].pairedItem, { item: 0 });
});
test("credentials are masked and the test only queries an empty batch", () => {
  const c = new AceDataSeedreamApi();
  assert.equal(c.properties[0].typeOptions.password, true);
  assert.match(c.authenticate.properties.headers.Authorization, /Bearer/);
  assert.equal(c.test.request.url, "/seedream/tasks");
  assert.deepEqual(c.test.request.body, { action: "retrieve_batch", ids: [] });
});
test("missing tasks and malformed acknowledgments fail instead of reporting completion", async () => {
  await assert.rejects(
    node.execute.call(
      context({ resource: "task", operation: "get", taskId: "missing" }, [{}]),
    ),
    /not found/i,
  );
  await assert.rejects(
    node.execute.call(context(create, [{ success: true }])),
    /task ID/i,
  );
});
test("batch queries preserve input pairing and reject an empty or excessive ID list", async () => {
  const ctx = context(
    {
      resource: "task",
      operation: "getMany",
      taskIds: "a, b\nc",
      simplify: true,
    },
    [{ items: [{ id: "a" }, { id: "b" }, { id: "c" }] }],
  );
  const [out] = await node.execute.call(ctx);
  assert.deepEqual(ctx.calls[0].body, {
    action: "retrieve_batch",
    ids: ["a", "b", "c"],
  });
  assert.equal(out.length, 3);
  assert.deepEqual(out[2].pairedItem, { item: 0 });
  for (const ids of ["", Array(51).fill("a").join(",")]) {
    const bad = context({
      resource: "task",
      operation: "getMany",
      taskIds: ids,
    });
    await assert.rejects(node.execute.call(bad));
    assert.equal(bad.calls.length, 0);
  }
});
test("continue-on-fail preserves later inputs without retrying generation", async () => {
  const ctx = context(
    [create, create],
    [new Error("429 rate limit"), { task_id: "second" }],
    { count: 2, continueOnFail: true },
  );
  const [out] = await node.execute.call(ctx);
  assert.equal(ctx.calls.length, 2);
  assert.match(out[0].json.error, /429/);
  assert.equal(out[1].json.taskId, "second");
  assert.deepEqual(out[1].pairedItem, { item: 1 });
});
test("HTTP and API errors retain failure meaning", async () => {
  for (const error of [
    new Error("403 content rejected"),
    { success: false, error: { message: "Invalid request" } },
  ])
    await assert.rejects(
      node.execute.call(context(create, [error])),
      /rejected|Invalid request/i,
    );
});
test("example polling is bounded and cannot resubmit generation", () => {
  const w = require("../examples/generate-and-wait.json");
  const queue = ["Get Task"];
  const seen = new Set();
  while (queue.length) {
    const n = queue.shift();
    if (seen.has(n)) continue;
    seen.add(n);
    for (const branch of w.connections[n]?.main ?? [])
      for (const edge of branch) queue.push(edge.node);
  }
  assert.equal(seen.has("Create"), false);
  assert.equal(seen.has("Stop Waiting"), true);
  assert.equal(seen.has("Generation Failed"), true);
  assert.equal(w.nodes.find((n) => n.name === "Create").retryOnFail, false);
  assert.equal(JSON.stringify(w).includes("apiToken"), false);
  const agent = require("../examples/ai-agent-task-tool.json");
  assert.equal(
    agent.nodes.find((n) => n.name === "Get Task").type,
    "@acedatacloud/n8n-nodes-seedream.seedreamTool",
  );
});

const { PRO, LITE, V45, V40 } = require("../dist/nodes/Seedream/request.js");
test("image editing sends every full reference without adding legacy action fields", async () => {
  const body = await submitted({
    operation: "edit",
    imageUrls: "https://example.com/a.png\nhttps://example.com/b.png",
  });
  assert.deepEqual(body.image, [
    "https://example.com/a.png",
    "https://example.com/b.png",
  ]);
  assert.equal("action" in body, false);
});
test("image sets enforce reference plus output count and preserve opt-in parameters", async () => {
  const body = await submitted({
    operation: "edit",
    imageUrls: "https://example.com/a.png",
    sequential: true,
    maxImages: 3,
    options: { watermark: false, webSearch: true },
  });
  assert.deepEqual(body.sequential_image_generation_options, { max_images: 3 });
  assert.equal(body.watermark, false);
  assert.deepEqual(body.tools, [{ type: "web_search" }]);
  await invalid(
    { model: PRO, sequential: true },
    /does not support image sets/,
  );
  await invalid(
    {
      operation: "edit",
      imageUrls: Array(14).fill("https://example.com/a.png").join("\n"),
      sequential: true,
      maxImages: 2,
    },
    /exceed 15/,
  );
});
test("Pro layer decomposition allows no prompt, requires one input and omits forbidden defaults", async () => {
  const body = await submitted({
    operation: "decompose",
    model: PRO,
    prompt: "",
    imageUrls: "https://example.com/a.png",
    size: "auto",
  });
  assert.equal(body.layer_decomposition, true);
  assert.equal("prompt" in body, false);
  for (const name of [
    "stream",
    "tools",
    "background",
    "sequential_image_generation",
  ])
    assert.equal(name in body, false);
  await invalid(
    {
      operation: "decompose",
      model: LITE,
      imageUrls: "https://example.com/a.png",
    },
    /requires.*Pro/,
  );
  await invalid(
    {
      operation: "decompose",
      model: PRO,
      imageUrls: "https://example.com/a.png\nhttps://example.com/b.png",
    },
    /1 to 1/,
  );
});
test("transparent editing requires Pro, one input and PNG output", async () => {
  const body = await submitted({
    operation: "edit",
    model: PRO,
    imageUrls: "https://example.com/a.png",
    options: { background: "transparent", outputFormat: "png" },
  });
  assert.equal(body.background, "transparent");
  await invalid(
    {
      operation: "edit",
      model: PRO,
      imageUrls: "https://example.com/a.png",
      options: { background: "transparent" },
    },
    /PNG/,
  );
  await invalid(
    {
      operation: "decompose",
      model: PRO,
      imageUrls: "https://example.com/a.png",
      options: { background: "opaque" },
    },
    /editing/,
  );
});
test("model-specific sizes and features fail before paid requests", async () => {
  for (const p of [
    { model: PRO, size: "4K" },
    { model: V45, size: "1K" },
    { size: "0x10" },
    { model: V40, options: { outputFormat: "png" } },
    { model: PRO, options: { webSearch: true } },
    { model: LITE, options: { optimizePrompt: "fast" } },
    { model: V45, options: { optimizePrompt: "fast" } },
  ])
    await invalid(p);
  assert.deepEqual(
    (await submitted({ model: PRO, options: { optimizePrompt: "fast" } }))
      .optimize_prompt_options,
    { mode: "fast" },
  );
});
test("reference counts and URLs are validated", async () => {
  await invalid({ operation: "edit", imageUrls: "" });
  await invalid({ operation: "edit", imageUrls: "file:///private/image.png" });
  await invalid({
    operation: "edit",
    model: PRO,
    imageUrls: Array(11).fill("https://example.com/a.png").join("\n"),
  });
  assert.deepEqual(
    (
      await submitted({
        operation: "edit",
        imageUrls: "data:image/png;base64,YQ==",
      })
    ).image,
    ["data:image/png;base64,YQ=="],
  );
});
test("task completion preserves layer metadata and terminal errors", async () => {
  const data = [
    {
      image_url: "https://example.com/layer.png",
      z_index: 1,
      bounding_box: { absolute: [0, 0, 10, 20] },
    },
  ];
  const raw = { id: "a", finished_at: 1, response: { success: true, data } };
  const [out] = await node.execute.call(
    context(
      { resource: "task", operation: "get", taskId: "a", simplify: true },
      [raw],
    ),
  );
  assert.equal(out[0].json.status, "succeeded");
  assert.deepEqual(out[0].json.data, data);
  assert.equal(taskResult({ id: "a", success: true }).finished, false);
  assert.equal(
    taskResult({
      id: "a",
      response: { success: false, error: { code: "rejected" } },
    }).successful,
    false,
  );
  const [unchanged] = await node.execute.call(
    context(
      { resource: "task", operation: "get", taskId: "a", simplify: false },
      [raw],
    ),
  );
  assert.deepEqual(unchanged[0].json, raw);
});
