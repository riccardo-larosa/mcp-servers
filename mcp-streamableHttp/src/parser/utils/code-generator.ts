/**
 * Code generation utilities for OpenAPI to MCP generator
 */
// import { McpToolDefinition } from '../types/index.js';
import { OpenAPIV3 } from 'openapi-types';
import { sanitizeForTemplate } from './helpers.js';
import type { JSONSchema7 } from 'json-schema';
import { extractToolsFromApi } from '../openapi-transformer.js';

export interface McpToolDefinition {
  /** Name of the tool, must be unique */
  name: string;
  /** Human-readable description of the tool */
  description: string;
  /** JSON Schema that defines the input parameters */
  inputSchema: JSONSchema7 | boolean;
  /** HTTP method for the operation (get, post, etc.) */
  method: string;
  /** URL path template with parameter placeholders */
  pathTemplate: string;
  /** OpenAPI parameter objects for this operation */
  parameters: OpenAPIV3.ParameterObject[];
  /** Parameter names and locations for execution */
  executionParameters: { name: string; in: string }[];
  /** Content type for request body, if applicable */
  requestBodyContentType?: string;
  /** Security requirements for this operation */
  securityRequirements: OpenAPIV3.SecurityRequirementObject[];
  /** Original operation ID from the OpenAPI spec */
  operationId: string;
}
/**
 * Generates the tool definition map code
 *
 * @param tools List of tool definitions
 * @param securitySchemes Security schemes from OpenAPI spec
 * @returns Generated code for the tool definition map
 */
export function generateToolDefinitionMap(
  tools: McpToolDefinition[],
  securitySchemes?: OpenAPIV3.ComponentsObject['securitySchemes']
): string {
  if (tools.length === 0) return '';

  return tools
    .map((tool) => {
      // Safely stringify complex objects
      let schemaString;
      try {
        schemaString = JSON.stringify(tool.inputSchema);
      } catch (e) {
        schemaString = '{}';
        console.warn(`Failed to stringify schema for tool ${tool.name}: ${e}`);
      }

      let execParamsString;
      try {
        execParamsString = JSON.stringify(tool.executionParameters);
      } catch (e) {
        execParamsString = '[]';
        console.warn(`Failed to stringify execution parameters for tool ${tool.name}: ${e}`);
      }

      let securityReqsString;
      try {
        securityReqsString = JSON.stringify(tool.securityRequirements);
      } catch (e) {
        securityReqsString = '[]';
        console.warn(`Failed to stringify security requirements for tool ${tool.name}: ${e}`);
      }

      // Sanitize description for template literal
      const escapedDescription = sanitizeForTemplate(tool.description);

      // Build the tool definition entry
      return `
  ["${tool.name}", {
    name: "${tool.name}",
    description: \`${escapedDescription}\`,
    inputSchema: ${schemaString},
    method: "${tool.method}",
    pathTemplate: "${tool.pathTemplate}",
    executionParameters: ${execParamsString},
    requestBodyContentType: ${tool.requestBodyContentType ? `"${tool.requestBodyContentType}"` : 'undefined'},
    securityRequirements: ${securityReqsString}
  }],`;
    })
    .join('');
}

/**
 * Generates the list tools handler code
 *
 * @returns Generated code for the list tools handler
 */
export function generateListToolsHandler(): string {
  return `
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const toolsForClient: Tool[] = Array.from(toolDefinitionMap.values()).map(def => ({
    name: def.name,
    description: def.description,
    inputSchema: def.inputSchema
  }));
  return { tools: toolsForClient };
});
`;
}

/**
 * Generates the call tool handler code
 *
 * @returns Generated code for the call tool handler
 */
export function generateCallToolHandler(): string {
  return `
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest): Promise<CallToolResult> => {
  const { name: toolName, arguments: toolArgs } = request.params;
  const toolDefinition = toolDefinitionMap.get(toolName);
  if (!toolDefinition) {
    console.error(\`Error: Unknown tool requested: \${toolName}\`);
    return { content: [{ type: "text", text: \`Error: Unknown tool requested: \${toolName}\` }] };
  }
  return await executeApiTool(toolName, toolDefinition, toolArgs ?? {}, securitySchemes);
});
`;
}

/**
 * Convert a string to title case
 *
 * @param str String to convert
 * @returns Title case string
 */
export function titleCase(str: string): string {
  // Converts snake_case, kebab-case, or path/parts to TitleCase
  return str
    .toLowerCase()
    .replace(/[-_\/](.)/g, (_, char) => char.toUpperCase()) // Handle separators
    .replace(/^{/, '') // Remove leading { from path params
    .replace(/}$/, '') // Remove trailing } from path params
    .replace(/^./, (char) => char.toUpperCase()); // Capitalize first letter
}

/**
 * Generates an operation ID from method and path
 *
 * @param method HTTP method
 * @param path API path
 * @returns Generated operation ID
 */
export function generateOperationId(method: string, path: string): string {
  // Generator: get /users/{userId}/posts -> GetUsersPostsByUserId
  const parts = path.split('/').filter((p) => p); // Split and remove empty parts

  let name = method.toLowerCase(); // Start with method name

  parts.forEach((part, index) => {
    if (part.startsWith('{') && part.endsWith('}')) {
      // Append 'By' + ParamName only for the *last* path parameter segment
      if (index === parts.length - 1) {
        name += 'By' + titleCase(part);
      }
      // Potentially include non-terminal params differently if needed, e.g.:
      // else { name += 'With' + titleCase(part); }
    } else {
      // Append the static path part in TitleCase
      name += titleCase(part);
    }
  });

  // Simple fallback if name is just the method (e.g., GET /)
  if (name === method.toLowerCase()) {
    name += 'Root';
  }

  // Ensure first letter is uppercase after potential lowercase method start
  name = name.charAt(0).toUpperCase() + name.slice(1);
  console.log(`Generated operation ID: ${name}`);
  return name;
}

export function generateOpenAPIToolsCode(
  apiName: string,
  api: OpenAPIV3.Document
): string {
  // Extract tools from API
  const tools = extractToolsFromApi(api);

  // Generate code for tool definition map
  const toolDefinitionMapCode = generateToolDefinitionMap(tools, api.components?.securitySchemes);

  // Generate code for request handlers
  const callToolHandlerCode = generateCallToolHandler();
  const listToolsHandlerCode = generateListToolsHandler();

  
  return `
  import { McpToolDefinition } from "./index.js";

  export const ${apiName}ToolsMap: Map<string, McpToolDefinition> = new Map([
    ${toolDefinitionMapCode}
  ]);

  `
}