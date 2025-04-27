import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

let client: Client | undefined = undefined;
let transport: StreamableHTTPClientTransport | undefined = undefined;
const mcpEndpointUrl = new URL("http://localhost:3000/mcp");

async function main() {
  try {
    client = new Client({
      name: 'mcp-streamableHttp-client',
      version: '0.0.1'
    });

    transport = new StreamableHTTPClientTransport(mcpEndpointUrl);
    await client.connect(transport);
    console.log("Connected using Streamable HTTP transport");

    const toolsResult = await client.listTools();

    if (toolsResult && toolsResult.tools) {
        const tools = toolsResult.tools.map((tool) => {
            return {
              name: tool.name,
              description: tool.description,
              input_schema: tool.inputSchema,
            };
        });

        if (tools.length > 0) {
            console.log(
              "Connected to server with tools:",
              tools.map(({ name }) => name)
            );
            console.log(`client.transport.sessionId: ${client.transport?.sessionId}`);
            const echoResult = await client.callTool({ name: "echo", arguments: { message: "Hello World" } });
            console.log("Echo tool result:", JSON.stringify(echoResult, null, 2));
        } else {
             console.log("No tools available on this server.");
        }
    } else {
      // This case might occur if connection succeeded but capabilities weren't received properly
      console.log("Could not retrieve tool capabilities from the server.");
    }

  } catch (error) {
    console.error("Streamable HTTP connection failed or error during interaction:", error);
  } finally {
    if (transport) {
        try {
            await transport.close();
            console.log("Transport closed.");
        } catch (closeError) {
            console.error("Error closing transport:", closeError);
        }
    } else {
        console.log("Transport was not initialized, cannot close.");
    }
  }
}

main();