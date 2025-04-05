// elastic-path-files-mcp-server.ts
import { config } from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"; // Import SSE Transport
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromBuffer } from 'file-type';
import express, { Request, Response } from 'express'; // Import express
import http from 'http'; // For managing the server instance
import cors from 'cors'; // Optional: For handling CORS

// Load environment variables (useful for port, etc.)
config();

// Define common input parameters for Elastic Path API calls
// Tools still expect these from the client via JSON-RPC request params
const elasticPathApiInput = {
  baseUrl: z.string().describe("The base URL of the Elastic Path Commerce Cloud API (e.g., https://api.elasticpath.com)"),
  accessToken: z.string().describe("A valid Bearer access token for the Elastic Path API"),
};

/**
 * Elastic Path Files MCP Server (Stateless Authentication, HTTP+SSE Transport)
 *
 * Implements MCP using the older HTTP+SSE transport pattern.
 * Requires the client to provide API base URL and access token per request.
 */
class ElasticPathFilesMcpServer {
  private mcpServer: McpServer;
  private httpServer?: http.Server;
  // Map to hold active transport sessions, keyed by sessionId
  private transports: { [sessionId: string]: SSEServerTransport } = {};

  constructor() {
    this.mcpServer = new McpServer({
      name: "Elastic Path Files (Client Auth, SSE)",
      version: "0.1.0", // Version update to reflect transport change
      description: "Provides tools via HTTP+SSE to interact with the Elastic Path Files API. Requires the client to provide the API base URL and access token for each operation."
    }, {
      capabilities: {
        tools: {},
        resources: {}, // Resources removed in previous steps
      }
    });

    // Register tools - This logic remains the same
    this.registerTools();
  }

  /**
   * Start the MCP server listening on HTTP with SSE.
   */
  async start(port: number = 3000) {
    const app = express();

    // --- Middleware ---
    // app.use(cors()); // Enable CORS if needed
    // app.use(express.json()); // Standard JSON body parsing for POST /messages

    // --- SSE Endpoint (Server -> Client) ---
    const ssePath = "/sse";
    const messagesPath = "/messages"; // Relative path for POST

    app.get(ssePath, async (req: Request, res: Response) => {
      console.log(`Client connecting via GET ${ssePath}...`);
      try {
        // The SSEServerTransport constructor handles setting up SSE headers
        // It needs the path the client should POST messages back to
        const transport = new SSEServerTransport(messagesPath, res); // Pass response object

        // Store the transport instance using its unique sessionId
        this.transports[transport.sessionId] = transport;
        console.log(`Transport created with sessionId: ${transport.sessionId}`);

        // Handle client disconnection
        res.on("close", () => {
          console.log(`Client disconnected for sessionId: ${transport.sessionId}. Cleaning up transport.`);
          // TODO: The McpServer might need explicit disconnection notification
          // via the transport if the SDK requires it. transport.close()?
          delete this.transports[transport.sessionId];
          // Optionally call a disconnect method on the transport if available/needed
          // transport.disconnect();
        });

        // Connect the McpServer instance to this specific transport
        // This starts the MCP handshake (InitializeRequest etc.) over SSE
        await this.mcpServer.connect(transport);
        console.log(`McpServer connected to transport for sessionId: ${transport.sessionId}`);

      } catch (error) {
        console.error("Error setting up SSE connection:", error);
        // Ensure response is closed if an error occurs before transport setup
        if (!res.headersSent) {
            res.status(500).send("Failed to establish SSE connection");
        } else {
            // If headers are sent, we might already be streaming, just log.
            // Or attempt to send an error event if possible (depends on SSE state)
            res.end(); // Attempt to close the connection
        }
      }
    });

    // --- Messages Endpoint (Client -> Server) ---
    app.post(messagesPath, (req: Request, res: Response) => {
      // Retrieve the sessionId, expected as a query parameter
      const sessionId = req.query.sessionId as string;
      console.log(`Received POST ${messagesPath} for sessionId: ${sessionId}`);

      if (!sessionId) {
        console.warn(`Missing sessionId in query parameters for POST ${messagesPath}`);
        res.status(400).send('Missing sessionId query parameter');
        return;
      }

      // Find the corresponding transport instance
      const transport = this.transports[sessionId];

      if (transport) {
        console.log(`Transport found for sessionId: ${sessionId}`);
        transport.handlePostMessage(req, res).catch(error => {
          console.error(`Error handling POST message for sessionId ${sessionId}:`, error);
          if (!res.headersSent) {
            res.status(500).send('Error processing message');
          }
        });
      } else {
        console.warn(`No active transport found for sessionId: ${sessionId}`);
        res.status(404).send(`No active session found for sessionId: ${sessionId}`);
      }
    });


    // --- Start Listening ---
    this.httpServer = http.createServer(app);

    await new Promise<void>((resolve, reject) => {
      if (!this.httpServer) {
         return reject(new Error("HTTP Server not initialized"));
      }
      this.httpServer.listen(port, () => {
        console.log(`Elastic Path Files MCP Server (HTTP+SSE) listening on port ${port}`);
        console.log(`- SSE connections on: http://localhost:${port}${ssePath}`);
        console.log(`- Client messages POST to: http://localhost:${port}${messagesPath}?sessionId=<sessionId>`);
        resolve();
      });
      this.httpServer.on('error', (err) => {
          reject(err);
      });
    });
  }

  /**
   * Stop the HTTP server and potentially clean up transports.
   */
  async stop() {
    return new Promise<void>((resolve, reject) => {
      if (this.httpServer) {
        console.log("Stopping HTTP server...");
        
        // Close all active transports first
        Object.values(this.transports).forEach(transport => {
          try {
            transport.close();
          } catch (err) {
            console.warn("Error closing transport:", err);
          }
        });
        this.transports = {};

        // Force close any remaining connections
        this.httpServer.closeAllConnections();
        
        this.httpServer.close((err) => {
          if (err) {
            console.error("Error stopping HTTP server:", err);
            return reject(err);
          }
          console.log("HTTP server stopped.");
          this.httpServer = undefined;
          resolve();
        });
      } else {
        resolve(); // Already stopped
      }
    });
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
        // Implementation remains the same
        try {
          const fileContent = await fs.readFile(filePath);
          const fileName = path.basename(filePath);
          const fileTypeResult = await fileTypeFromBuffer(fileContent);
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
        // Implementation remains the same
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
        // Implementation remains the same
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
        // Implementation remains the same
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
        // Implementation remains the same
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
  const port = parseInt(process.env.PORT || '3000', 10);

  const server = new ElasticPathFilesMcpServer();

  try {
    await server.start(port);
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }

  // Graceful shutdown handling
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      console.log(`\n${signal} received, shutting down server...`);
      try {
        await server.stop();
        console.log("Server shut down gracefully.");
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

// Export the server class if needed for programmatic use elsewhere
export { ElasticPathFilesMcpServer };