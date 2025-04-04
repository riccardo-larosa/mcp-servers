import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// TODO: make BASE_URL configurable
const BASE_URL = "https://useast.api.elasticpath.com";
const USER_AGENT = "ep-mcp-auth-server/0.0.1";

// Create server instance
const server = new McpServer({
  name: "auth",
  version: "0.0.1",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "get-token",
  "Get an access token for Elastic Path API",
  {
    client_id: z.string(),
    client_secret: z.string().optional(),
    grant_type: z.string(),
  },
  async (args) => {
    const response = await fetch(`${BASE_URL}/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: new URLSearchParams({
        client_id: args.client_id,
        ...(args.client_secret && { client_secret: args.client_secret }),
        grant_type: args.grant_type,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.status}, message: ${JSON.stringify(response.json())}`);
    }

    const data = await response.json();
    return {
      content: [{
        type: "text",
        text: JSON.stringify(data, null, 2)
      }]
    };
  }
);

server.resource(
  "greeting",
  new ResourceTemplate("greeting://{name}", { list: undefined }),
  async (uri, { name }) => ({
    contents: [{
      uri: uri.href,
      text: `Hello, ${name}!`
    }]
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("EP Auth MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
