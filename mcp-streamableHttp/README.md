# MCP Streamable HTTP Server Example

This directory contains an example implementation of a Model Context Protocol (MCP) server using the `@modelcontextprotocol/sdk` and Express.js.

It utilizes the `StreamableHTTPServerTransport` to handle MCP communication over HTTP, supporting bidirectional communication including server-sent events (SSE) for notifications.

It also includes the `simpleStreamableHttpClient.ts` to start a client and interact with the server

## Features

*   Implements the Model Context Protocol (MCP).
*   Uses `StreamableHTTPServerTransport` for HTTP-based communication.
*   Manages client sessions using the `mcp-session-id` header.
*   Handles client requests (POST), server notifications (GET via SSE), and session termination (DELETE).
*   Includes a basic example tool (`echo`).
*   Built with TypeScript and Express.js.

## Prerequisites

*   Node.js (version recommended by the project, e.g., >= 18)
*   npm or yarn

## Installation

1.  Navigate to the `mcp-streamableHttp` directory:
    ```bash
    cd mcp-streamableHttp
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

## Building

To compile the TypeScript code to JavaScript:

```bash
npm run build
```

This will output the compiled files to a `build` directory.

## Running the Server

After building the code, you can start the server:

```bash
npm run dev
```

By default, the server listens on port 3000 and exposes the MCP endpoint at `/mcp`.

## API Endpoint

*   **URL**: `/mcp`
*   **Methods**:
    *   `POST`: Used by clients to send requests (including the initial `initialize` request).
    *   `GET`: Used by clients to establish an SSE connection for receiving server-to-client notifications.
    *   `DELETE`: Used by clients to terminate the current MCP session.

## Session Management

The server manages client sessions using the `mcp-session-id` HTTP header. 

1.  When a client sends an `initialize` request without a session ID, the server creates a new session and a new transport, returning the `sessionId` in the response.
2.  Subsequent requests (POST, GET, DELETE) from the client **must** include the assigned `mcp-session-id` header for the server to route the request to the correct transport instance.
3.  The `DELETE /mcp` request terminates the session associated with the provided `mcp-session-id`.

## Tools

To add tools to the server: 
```bash
 node build/parser/index.js -i /directory/files/OpenAPISpec.yaml -n files
 ```
This will create a files.ts module in /src/tools and when the server starts up it will be registered

## Run the Server
```bash
npm run dev:hono
```

## Running the Client

Use the MCP inspector 
```bash
npx @modelcontextprotocol/inspector
```
or you can use a CLI

```bash
npm run start:simpleClient
```

You can use the commands shown in this client to interact with the server, like 


```bash
list-tools
```