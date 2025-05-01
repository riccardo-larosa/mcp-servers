import { McpToolDefinition } from "./index.js";


export const filesToolsMap: Map<string, McpToolDefinition> = new Map([
  ["getallfiles", {
    name: "getallfiles",
    description: `Retrieves all files. 
`,
    inputSchema: { "type": "object", "properties": { "filter": { "type": "string", "format": "string", "description": "\nFiltering is available for this endpoint. See [Filtering](/docs/api/pxm/files/get-all-files#filtering).\n" }, "page[limit]": { "type": "string", "minimum": 0, "maximum": 10000, "format": "int64", "examples": ["10"], "description": "The maximum number of records per page for this response. You can set this value up to 100. If no page size is set, the the [**page length**](/docs/commerce-cloud/global-project-settings/settings-overview#page-length) store setting is used." }, "page[offset]": { "type": "string", "minimum": 0, "maximum": 10000, "format": "int64", "examples": ["0"], "description": "The current offset by number of records, not pages. Offset is zero-based. The maximum records you can offset is 10,000. If no page size is set, the [**page length**](/docs/commerce-cloud/global-project-settings/settings-overview#page-length) store setting is used." } } },
    method: "get",
    pathTemplate: "/v2/files",
    executionParameters: [{ "name": "filter", "in": "query" }, { "name": "page[limit]", "in": "query" }, { "name": "page[offset]", "in": "query" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["createafile", {
    name: "createafile",
    description: `Create a File`,
    inputSchema: { "type": "object", "properties": { "requestBody": { "type": "string", "description": "Request body (content type: multipart/form-data)" } }, "required": ["requestBody"] },
    method: "post",
    pathTemplate: "/v2/files",
    executionParameters: [],
    requestBodyContentType: "multipart/form-data",
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["getafile", {
    name: "getafile",
    description: `Get a File`,
    inputSchema: { "type": "object", "properties": { "fileID": { "type": "string", "description": "The unique identifier for a file." } }, "required": ["fileID"] },
    method: "get",
    pathTemplate: "/v2/files/{fileID}",
    executionParameters: [{ "name": "fileID", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }],
  ["deleteafile", {
    name: "deleteafile",
    description: `Delete a File`,
    inputSchema: { "type": "object", "properties": { "fileID": { "type": "string", "description": "The unique identifier of the file you want to delete." } }, "required": ["fileID"] },
    method: "delete",
    pathTemplate: "/v2/files/{fileID}",
    executionParameters: [{ "name": "fileID", "in": "path" }],
    requestBodyContentType: undefined,
    securityRequirements: [{ "bearerAuth": [] }]
  }]
])

