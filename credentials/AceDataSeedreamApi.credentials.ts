import type {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from "n8n-workflow";

export class AceDataSeedreamApi implements ICredentialType {
  name = "aceDataSeedreamApi";
  displayName = "Seedream by AceDataCloud API";
  documentationUrl = "https://github.com/AceDataCloud/SeedreamN8N#credentials";
  icon = "file:../nodes/Seedream/icon.png" as const;
  properties: INodeProperties[] = [
    {
      displayName: "API Token",
      name: "apiToken",
      type: "string",
      typeOptions: { password: true },
      default: "",
      required: true,
      description: "Your AceDataCloud application API token",
    },
  ];
  authenticate: IAuthenticateGeneric = {
    type: "generic",
    properties: {
      headers: { Authorization: "=Bearer {{$credentials.apiToken}}" },
    },
  };
  test: ICredentialTestRequest = {
    request: {
      baseURL: "https://api.acedata.cloud",
      url: "/seedream/tasks",
      method: "POST",
      body: { action: "retrieve_batch", ids: [] },
    },
  };
}
