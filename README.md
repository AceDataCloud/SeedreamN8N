# Seedream by AceDataCloud — n8n community node

Seedream generation and task queries for n8n, using [AceDataCloud's API](https://platform.acedata.cloud/documents/seedream-images). Maintained by **Ace Data Cloud**; this is an AceDataCloud integration and does not claim to be an official node from the model developer.

Package: `@acedatacloud/n8n-nodes-seedream` · License: MIT.

## Installation

On self-hosted n8n, open **Settings → Community Nodes → Install** and enter `@acedatacloud/n8n-nodes-seedream`. See the [n8n community-node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/).

n8n Cloud requires verified community nodes. npm publication does not establish verification; check the current node panel for availability.

## Credentials

1. Get an AceDataCloud application API token from the [console](https://platform.acedata.cloud/console/applications).
2. Create a **Seedream by AceDataCloud API** credential in n8n and paste the token.
3. Run the credential test. It queries an empty batch of tasks and does not generate media.

The token is masked, stored in n8n's credential store and sent as a Bearer token only to `https://api.acedata.cloud`. A direct model-provider subscription is not an AceDataCloud API token.

## Operations

| Resource | Operation        | Purpose                                      |
| -------- | ---------------- | -------------------------------------------- |
| Image    | Generate         | Single images or a related image set         |
| Image    | Edit             | One or multiple reference images             |
| Image    | Decompose Layers | Pro: a base image plus positioned PNG layers |
| Task     | Get / Get Many   | Query one or up to 50 known task IDs         |

Seedream models: `doubao-seedream-5-0-pro-260628`, `doubao-seedream-5-0-lite-260128`, `doubao-seedream-4-5-251128`, and `doubao-seedream-4-0-250828`. The default is 5.0 Lite at 2K.

- Pro supports single images, editing with up to 10 references, transparent PNG editing and layer decomposition. It does not support image sets or web search.
- Lite/4.x accept up to 14 references. Image sets accept up to 15 outputs, with reference count plus maximum output count no greater than 15.
- Pro sizes: 1K/1.5K/2K; Lite: 2K/3K/4K; 4.5: 2K/4K; 4.0: 1K/2K/4K. Exact pixel dimensions are also accepted for generation/editing; the API validates pixel area and aspect ratio.
- Decomposition requires exactly one PNG/JPEG and Pro; `auto` size is also supported. Layer metadata remains in `data`, including `z_index` and bounding boxes.
- Transparent editing requires one PNG input with an alpha channel and PNG output. The API validates the actual image.
- Output format selection is available on Pro/Lite. Web search is Lite-only. Fast prompt optimization is available on Pro/4.0; Lite/4.5 support standard only.

This node uses asynchronous JSON responses and does not expose streaming. HTTP(S) image URLs and supported image data URIs can be supplied, one per line. Typical completed image URLs are in `data[].image_url`; partial image-set errors remain on their output entries.

Additional examples: [editing](examples/edit-image.json), [image sets](examples/image-set.json), [layer decomposition](examples/decompose-layers.json).

## Workflow examples

Import [generate and wait](examples/generate-and-wait.json), select your credential on both service nodes and edit the prompt. Creation submits once with `async: true`, returning `taskId`, `status: "submitted"`, `finished: false` and `successful: null`. It then polls every 15 seconds with a separate 30-minute deadline. A submission acknowledgment is not a finished generation. Completion returns `finished: true`; check `successful` before consuming media.

The polling loop never returns to Create. A deadline does not cancel a submitted task: save its ID and query it later. Disable **Simplify** to inspect native task data.

Import the [AI Agent task tool](examples/ai-agent-task-tool.json) to query an existing task through an Agent. Set the existing task ID, service credential and your chosen chat-model credential before running. This example incurs any chat-model usage but does not generate new media.

## Billing, retries and data

Generation uses your AceDataCloud balance. Check the [service documentation](https://platform.acedata.cloud/documents/seedream-images) for current models, limits and pricing. The node preserves your model selection and never substitutes a model.

Creation requests are not automatically retried. Re-running a creation node or enabling retry-on-fail can create another paid task. After a timeout, retain the existing task ID and query its state where possible. Each incoming n8n item produces its own request, so multiple input items can incur multiple charges. Task queries do not generate another paid task.

Only configured prompts, media references and request parameters are sent to AceDataCloud. Public media URLs must be accessible to the service. The node has no telemetry, filesystem access, environment-variable access or additional runtime dependencies. Optional callbacks must be public HTTPS URLs.

## Development

```sh
pnpm install --frozen-lockfile
pnpm run build
pnpm run lint
pnpm test
```

Node.js 24 and the official `@n8n/node-cli` are used in CI. Tests exercise payload validation, async completion, media constraints, error handling and input-item pairing without paid network calls. CI builds twice and loads the package in n8n 2.42.3, reaching credential validation without generating media. Programmatic nodes keep model-specific input validation and task-response normalization explicit while using n8n's authenticated HTTP helper.

Release merged code with the [Publish workflow](.github/workflows/publish.yml), which runs validation and publishes with npm provenance. Keep published versions immutable. Icons are bundled from the Studio service catalog; see [asset provenance](assets/README.md).

## Support

Report issues at [AceDataCloud/SeedreamN8N](https://github.com/AceDataCloud/SeedreamN8N/issues) with the package version, n8n version, operation and a redacted error. Never include API tokens or private generation content.
