// elastic-path-files-mcp-server.ts
import { config } from 'dotenv';
// Corrected SDK imports based on previous findings
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromBuffer } from 'file-type';
// Removed express, http, cors, SSEServerTransport imports

// Load environment variables (still useful, e.g., for logging levels in future)
config();

// Define common input parameters for Elastic Path API calls
// Tools still expect these from the client via JSON-RPC request params
const elasticPathApiInput = {
  baseUrl: z.string().describe("The base URL of the Elastic Path Commerce Cloud API (e.g., https://api.elasticpath.com)"),
  accessToken: z.string().describe("A valid Bearer access token for the Elastic Path API"),
};

/**
 * Elastic Path Files MCP Server (Stateless Authentication, Stdio Transport)
 *
 * Implements MCP using the stdio transport pattern.
 * Requires the client to provide API base URL and access token per tool request.
 */
class ElasticPathFilesMcpServer {
  private mcpServer: McpServer;
  // Removed httpServer and transports map

  constructor() {
    this.mcpServer = new McpServer({
      name: "Elastic Path Files (Client Auth, Stdio)", // Updated name
      version: "0.1.0",
      description: "Provides tools via stdio to interact with the Elastic Path Files API. Requires the client to provide the API base URL and access token for each operation."
    }, {
      capabilities: {
        tools: {},
        resources: {}, // Resources removed previously
      }
    });

    // Register tools - This logic remains the same
    this.registerTools();
  }

  /**
   * Start the MCP server using stdio transport.
   */
  async start() {
    // Removed express app setup
    console.log("Initializing Stdio transport...");
    const transport = new StdioServerTransport();

    console.log("Connecting McpServer via Stdio...");
    // The connect method now listens on stdin and writes to stdout
    await this.mcpServer.connect(transport);

    // This message might not be seen if the client immediately sends data,
    // but it's useful for debugging if run manually.
    console.log("Elastic Path Files MCP Server (Stdio) started. Listening on stdin.");
  }

  /**
   * Stop logic (less relevant for stdio, but kept as placeholder).
   */
  async stop() {
    // Stdio transport doesn't have an explicit server stop method like HTTP.
    // The process usually terminates when stdin closes or receives SIGTERM/SIGINT.
    console.log("Server stopping (stdio)...");
    // Perform any other cleanup if necessary
    return Promise.resolve();
  }

  /**
   * Register all available tools with the MCP server instance.
   * (Tool registration logic remains the same - expecting client-provided auth)
   */
  private registerTools() {
    // --- Upload a file ---
    this.mcpServer.tool(
      "uploadFile",
      {
        ...elasticPathApiInput,
        filePath: z.string().describe("Path to the local file to upload"),
        public: z.boolean().default(true).describe("Whether the file should be publicly accessible"),
      },
      async ({ baseUrl, accessToken, filePath, public: isPublic }) => {
        // Implementation unchanged
        try {
          const fileContent = await fs.readFile(filePath);
          const fileName = path.basename(filePath);
          await fileTypeFromBuffer(fileContent); // Use await
          const formData = new FormData();
          formData.append('file', new Blob([fileContent]), fileName);
          formData.append('public', isPublic.toString());

          const response = await fetch(`${baseUrl}/v2/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: formData
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
          }
          const data = await response.json();
          return { content: [{ type: "text", text: `File uploaded successfully:\n${JSON.stringify(data, null, 2)}` }] };
        } catch (error) {
          console.error('Error uploading file:', error);
          return { content: [{ type: "text", text: `Error uploading file: ${error instanceof Error ? error.message : String(error)}` }] };
        }
      }
    );

    // --- Upload file from URL ---
    this.mcpServer.tool(
      "uploadFileFromUrl",
      {
        ...elasticPathApiInput,
        fileLocation: z.string().url().describe("Publicly accessible URL of the file to upload"),
        public: z.boolean().default(true).describe("Whether the file should be publicly accessible"),
      },
      async ({ baseUrl, accessToken, fileLocation, public: isPublic }) => {
        // Implementation unchanged
        try {
          const response = await fetch(`${baseUrl}/v2/files`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: { type: "file", file_location: fileLocation, public: isPublic } })
          });
          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
          }
          const data = await response.json();
          return { content: [{ type: "text", text: `File upload from URL initiated successfully:\n${JSON.stringify(data, null, 2)}` }] };
        } catch (error) {
          console.error('Error uploading file from URL:', error);
          return { content: [{ type: "text", text: `Error uploading file from URL: ${error instanceof Error ? error.message : String(error)}` }] };
        }
      }
    );

    // --- Get file by ID ---
    this.mcpServer.tool(
      "getFile",
      {
        ...elasticPathApiInput,
        fileId: z.string().describe("The unique ID of the file to retrieve"),
      },
      async ({ baseUrl, accessToken, fileId }) => {
        // Implementation unchanged
        try {
          const response = await fetch(`${baseUrl}/v2/files/${fileId}`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (!response.ok) {
            const errorBody = await response.text();
            if (response.status === 404) {
              return { content: [{ type: "text", text: `Error: File with ID '${fileId}' not found.` }] };
            }
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
          }
          const data = await response.json();
          return { content: [{ type: "text", text: `File details:\n${JSON.stringify(data.data, null, 2)}` }] };
        } catch (error) {
          console.error('Error getting file:', error);
          return { content: [{ type: "text", text: `Error getting file: ${error instanceof Error ? error.message : String(error)}` }] };
        }
      }
    );

    // --- List files ---
    this.mcpServer.tool(
      "listFiles",
      {
        ...elasticPathApiInput,
        limit: z.number().int().positive().optional().describe("Number of files to return per page (e.g., 25)"),
        offset: z.number().int().nonnegative().optional().describe("Number of files to skip (for pagination, e.g., 0, 25, 50)"),
        filter: z.string().optional().describe("EP Query Language filter (e.g., 'eq(file_name,\"*.png\")')")
      },
      async ({ baseUrl, accessToken, limit, offset, filter }) => {
        // Implementation unchanged
        try {
          const params = new URLSearchParams();
          if (offset !== undefined) params.append('page[offset]', offset.toString());
          if (limit !== undefined) params.append('page[limit]', limit.toString());
          if (filter) params.append('filter', filter);
          const url = `${baseUrl}/v2/files${params.toString() ? '?' + params.toString() : ''}`;

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

    // --- Delete file ---
    this.mcpServer.tool(
      "deleteFile",
      {
        ...elasticPathApiInput,
        fileId: z.string().describe("The unique ID of the file to delete"),
      },
      async ({ baseUrl, accessToken, fileId }) => {
        // Implementation unchanged
        try {
          const response = await fetch(`${baseUrl}/v2/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          if (response.status === 204) {
            return { content: [{ type: "text", text: `File '${fileId}' was successfully deleted.` }] };
          } else if (!response.ok) {
            const errorBody = await response.text();
            if (response.status === 404) {
              return { content: [{ type: "text", text: `Error deleting file: File with ID '${fileId}' not found.` }] };
            }
            throw new Error(`HTTP error ${response.status}: ${errorBody}`);
          } else {
            return { content: [{ type: "text", text: `File '${fileId}' deleted (Status: ${response.status}).` }] };
          }
        } catch (error) {
          console.error('Error deleting file:', error);
          return { content: [{ type: "text", text: `Error deleting file: ${error instanceof Error ? error.message : String(error)}` }] };
        }
      }
    );
  } // end registerTools
} // end class ElasticPathFilesMcpServer


// --- Main Execution ---
async function main() {
  // Removed port logic
  const server = new ElasticPathFilesMcpServer();

  try {
    await server.start(); // Start without port
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }

  // Graceful shutdown handling still applies to the process
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down server...`);
      try {
        await server.stop(); // Call the placeholder stop method
        console.log("Server shut down."); // Adjusted message
        process.exit(0);
      } catch (err) {
        console.error("Error during graceful shutdown:", err);
        process.exit(1);
      }
    });
  });
}

main().catch(error => {
  console.error('Fatal Error in main():', error);
  process.exit(1);
});

// Export the server class if needed
export { ElasticPathFilesMcpServer };