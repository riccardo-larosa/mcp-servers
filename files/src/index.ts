// elastic-path-files-mcp-server.ts
import { config } from 'dotenv';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileTypeFromBuffer } from 'file-type';

// Load environment variables from .env file
config();

/**
 * Configuration for the Elastic Path Files MCP Server
 */
interface ElasticPathConfig {
  baseUrl: string;
  authEndpoint: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Elastic Path Files MCP Server
 * 
 * This server implements an MCP interface for the Elastic Path Files API,
 * allowing AI assistants to upload, retrieve, and manage files.
 */
class ElasticPathFilesMcpServer {
  private server: McpServer;
  private config: ElasticPathConfig;
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(config: ElasticPathConfig) {
    this.config = config;

    // Initialize the MCP server
    this.server = new McpServer({
      name: "Elastic Path Files",
      version: "0.0.1",
    }, {
      capabilities: {
        tools: {},
        resources: {},
      }
    });

    // Register tools and resources
    this.registerTools();
    this.registerResources();
  }

  /**
   * Start the MCP server with the specified transport
   */
  async start() {
    const transport = new StdioServerTransport();
    console.log("Starting Elastic Path Files MCP server...");
    await this.server.connect(transport);
    console.log("Elastic Path Files MCP server started");
  }

  /**
   * Register all available tools with the MCP server
   */
  private registerTools() {
    // Upload a file
    this.server.tool(
      "uploadFile",
      {
        filePath: z.string().describe("Path to the file to upload"),
        public: z.boolean().default(true).describe("Whether the file should be publicly accessible"),
      },
      async ({ filePath, public: isPublic }) => {
        try {
          const accessToken = await this.getAccessToken();
          const fileContent = await fs.readFile(filePath);
          const fileName = path.basename(filePath);

          // Detect mime type
          const fileTypeResult = await fileTypeFromBuffer(fileContent);
          const mimeType = fileTypeResult?.mime || 'application/octet-stream';

          // Create form data
          const formData = new FormData();
          formData.append('file', new Blob([fileContent]), fileName);
          formData.append('public', isPublic.toString());

          // Make request to Elastic Path API
          const response = await fetch(
            `${this.config.baseUrl}/v2/files`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
              body: formData
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(data, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error uploading file:', error);
          return {
            content: [{
              type: "text",
              text: `Error uploading file: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Upload file from URL
    this.server.tool(
      "uploadFileFromUrl",
      {
        fileLocation: z.string().describe("URL to the file"),
        public: z.boolean().default(true).describe("Whether the file should be publicly accessible"),
      },
      async ({ fileLocation, public: isPublic }) => {
        try {
          const accessToken = await this.getAccessToken();

          // Make request to Elastic Path API
          const response = await fetch(
            `${this.config.baseUrl}/v2/files`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                file_location: fileLocation,
                public: isPublic,
              })
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(data, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error uploading file from URL:', error);
          return {
            content: [{
              type: "text",
              text: `Error uploading file from URL: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Get file by ID
    this.server.tool(
      "getFile",
      {
        fileId: z.string().describe("ID of the file to retrieve"),
      },
      async ({ fileId }) => {
        try {
          const accessToken = await this.getAccessToken();

          // Make request to Elastic Path API
          const response = await fetch(
            `${this.config.baseUrl}/v2/files/${fileId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(data, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error getting file:', error);
          return {
            content: [{
              type: "text",
              text: `Error getting file: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // List files
    this.server.tool(
      "listFiles",
      {
        page: z.number().optional().describe("Page number for pagination"),
        limit: z.number().optional().describe("Number of items per page"),
      },
      async ({ page, limit }) => {
        try {
          const accessToken = await this.getAccessToken();

          // Build query parameters
          const params = new URLSearchParams();
          if (page) params.append('page[offset]', page.toString());
          if (limit) params.append('page[limit]', limit.toString());

          // Make request to Elastic Path API
          const response = await fetch(
            `${this.config.baseUrl}/v2/files${params.toString() ? '?' + params.toString() : ''}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          return {
            content: [{
              type: "text",
              text: JSON.stringify(data, null, 2)
            }]
          };
        } catch (error) {
          console.error('Error listing files:', error);
          return {
            content: [{
              type: "text",
              text: `Error listing files: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );

    // Delete file
    this.server.tool(
      "deleteFile",
      {
        fileId: z.string().describe("ID of the file to delete"),
      },
      async ({ fileId }) => {
        try {
          const accessToken = await this.getAccessToken();

          // Make request to Elastic Path API
          const response = await fetch(
            `${this.config.baseUrl}/v2/files/${fileId}`,
            {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          return {
            content: [{
              type: "text",
              text: `File ${fileId} was successfully deleted`
            }]
          };
        } catch (error) {
          console.error('Error deleting file:', error);
          return {
            content: [{
              type: "text",
              text: `Error deleting file: ${error instanceof Error ? error.message : String(error)}`
            }]
          };
        }
      }
    );
  }

  /**
   * Register all available resources with the MCP server
   */
  private registerResources() {
    // Create a URI template for accessing file resources
    this.server.resource(
      "elastic-path-file",
      new ResourceTemplate("elastic-path-file://{fileId}", { list: undefined }),
      async (uri, { fileId }) => {
        try {
          const accessToken = await this.getAccessToken();

          // Get file metadata
          const response = await fetch(
            `${this.config.baseUrl}/v2/files/${fileId}`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          const fileData = data.data;

          // Return file information as a resource
          return {
            contents: [{
              uri: uri.href,
              mimeType: "application/json",
              text: JSON.stringify(fileData, null, 2)
            }]
          };
        } catch (error) {
          console.error(`Error retrieving file ${fileId}:`, error);
          throw new Error(`Unable to retrieve file ${fileId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    );

    // List available files
    this.server.resource(
      "elastic-path-files",
      new ResourceTemplate("elastic-path-files://files", { list: undefined }),
      async () => {
        try {
          const accessToken = await this.getAccessToken();

          // Get list of files
          const response = await fetch(
            `${this.config.baseUrl}/v2/files`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              }
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          // Map files to contents
          const fileList = data.data;
          return {
            contents: fileList.map((file: any) => ({
              uri: `elastic-path-file://${file.id}`,
              text: file.file_name || `File ${file.id}`,
              mimeType: file.mime_type || 'application/octet-stream'
            }))
          };
        } catch (error) {
          console.error('Error listing files:', error);
          return { contents: [] };
        }
      }
    );
  }

  /**
   * Get a valid access token, obtaining a new one if necessary
   */
  private async getAccessToken(): Promise<string> {
    // Return existing token if it's still valid
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      // Request a new token
      const response = await fetch(
        `${this.config.baseUrl}${this.config.authEndpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
          }).toString()
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Set token and expiry time
      this.token = data.access_token;
      this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000));

      return this.token || '';
    } catch (error) {
      console.error('Error obtaining access token:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Run the server if executed directly
async function main() {
  // Load config from environment variables
  const config: ElasticPathConfig = {
    baseUrl: process.env.EP_BASE_URL || '',
    authEndpoint: process.env.EP_AUTH_ENDPOINT || '/oauth/access_token',
    clientId: process.env.EP_CLIENT_ID || '',
    clientSecret: process.env.EP_CLIENT_SECRET || '',
  };

  console.log('Config:', JSON.stringify(config, null, 2));
  // Validate config
  if (!config.clientId || !config.clientSecret) {
    console.error('Error: EP_CLIENT_ID and EP_CLIENT_SECRET environment variables must be set');
    process.exit(1);
  }

  // Create and start the server
  const server = new ElasticPathFilesMcpServer(config);
  server.start().catch(error => {
    console.error('Error starting server:', error);
    process.exit(1);
  });
}

main().catch(error => {
  console.error('Fatal Error in main():', error);
  process.exit(1);
});

// Export the server class
export { ElasticPathFilesMcpServer };