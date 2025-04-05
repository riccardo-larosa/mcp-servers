import express, { Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import http from "http";
import cors from "cors";
import { z } from "zod";
const server = new McpServer({
  name: "example-server",
  version: "1.0.0"
}, {
  capabilities: {
    tools: {},
    resources: {}, // Resources removed in previous steps
  }
});

server.tool("listFiles", 
  "List all files in the user's account",
  {
    // ...elasticPathApiInput,
    limit: z.number().int().positive().optional().describe("Number of files to return per page (e.g., 25)"),
    offset: z.number().int().nonnegative().optional().describe("Number of files to skip (for pagination, e.g., 0, 25, 50)"),
    filter: z.string().optional().describe("EP Query Language filter (e.g., 'eq(file_name,\"*.png\")')")
  },
  async ({ limit, offset, filter }) => {
    // Implementation remains the same
     try {
        const params = new URLSearchParams();
        if (offset !== undefined) params.append('page[offset]', offset.toString());
        if (limit !== undefined) params.append('page[limit]', limit.toString());
        if (filter) params.append('filter', filter);
        const url = `https://useast.api.elasticpath.com/v2/files${params.toString() ? '?' + params.toString() : ''}`;

        const accessToken = "1234567890";
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
        }
        const data = await response.json();
        const count = data.data?.length ?? 0;
        const total = data.meta?.results?.total ?? 'unknown';
        return { content: [{ type: "text", text: `Found ${count} files (total: ${total}).\n${JSON.stringify(data, null, 2)}` }] };
    } catch (error) {
        console.error('Error listing files:', error);
        return { content: [{ type: "text", text: `Error listing files: ${error instanceof Error ? error.message : String(error)}` }] };
    }
  }
);
// ... set up server resources, tools, and prompts ...

const app = express();

// --- Middleware ---
// app.use(cors()); // Enable CORS if needed
// app.use(express.json()); // Standard JSON body parsing for POST /messages


// to support multiple simultaneous connections we have a lookup object from
// sessionId to transport
const transports: {[sessionId: string]: SSEServerTransport} = {};

app.get("/sse", async (_: Request, res: Response) => {
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

const httpserver = http.createServer(app);
// app.listen(3001);
httpserver.listen(3001);
console.log(`MCP Server (HTTP+SSE) listening on port 3001`);
console.log(`- SSE connections on: http://localhost:3001/sse`);
console.log(`- Client messages POST to: http://localhost:3001/messages?sessionId=<sessionId>`);