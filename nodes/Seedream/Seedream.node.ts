import { NodeConnectionTypes, NodeOperationError } from "n8n-workflow";
import type {
  IDataObject,
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
} from "n8n-workflow";
import {
  failure,
  object,
  output,
  request,
  requiredText,
  submissionResult,
  taskIds,
  taskResult,
} from "./helpers";
import { properties } from "./properties";
import { buildRequest } from "./request";
export class Seedream implements INodeType {
  description: INodeTypeDescription = {
    displayName: "Seedream by AceDataCloud",
    name: "seedream",
    icon: { light: "file:icon.png", dark: "file:icon.dark.png" },
    group: ["transform"],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description:
      "Generate, edit and decompose Seedream images, create image sets, and track tasks in n8n through AceDataCloud.",
    defaults: { name: "Seedream by AceDataCloud" },
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    usableAsTool: true,
    credentials: [{ name: "aceDataSeedreamApi", required: true }],
    properties,
  };
  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const result: INodeExecutionData[] = [];
    const credential = "aceDataSeedreamApi";
    for (let index = 0; index < this.getInputData().length; index++) {
      try {
        const resource = this.getNodeParameter("resource", index) as string;
        const operation = this.getNodeParameter("operation", index) as string;
        const simplify = this.getNodeParameter(
          "simplify",
          index,
          true,
        ) as boolean;
        if (resource === "task") {
          let body: IDataObject;
          if (operation === "get")
            body = {
              action: "retrieve",
              id: requiredText(
                this.getNodeParameter("taskId", index),
                "Task ID",
              ),
            };
          else if (operation === "getMany")
            body = {
              action: "retrieve_batch",
              ids: taskIds(this.getNodeParameter("taskIds", index)),
            };
          else
            throw new NodeOperationError(
              this.getNode(),
              "Select a supported task operation",
            );
          const response = await request(
            this,
            credential,
            "/seedream/tasks",
            body,
          );
          const records = operation === "getMany" ? response.items : [response];
          if (!Array.isArray(records))
            throw new NodeOperationError(
              this.getNode(),
              "The service returned an unexpected task list",
            );
          const valid = records.map((record) => object(record));
          if (valid.some((record) => !record.id && !record.task_id))
            throw new NodeOperationError(
              this.getNode(),
              "The task was not found. Check the task ID and API credential",
            );
          result.push(
            ...output(
              this,
              valid.map((record) => (simplify ? taskResult(record) : record)),
              index,
            ),
          );
          continue;
        }

        if (resource !== "image")
          throw new NodeOperationError(
            this.getNode(),
            "Select a supported resource",
          );
        const spec = buildRequest(this, index);
        const response = await request(
          this,
          credential,
          spec.endpoint,
          spec.body,
          "POST",
        );
        const normalized = submissionResult(response);
        result.push(...output(this, [simplify ? normalized : response], index));
      } catch (error) {
        result.push(failure(this, error, index));
      }
    }
    return [result];
  }
}
