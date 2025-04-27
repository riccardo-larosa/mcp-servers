import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Import SDK components for mocking
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

// --- Extremely Basic Mocks ---
vi.mock('node:crypto', () => ({
  randomUUID: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  isInitializeRequest: vi.fn(),
}));

// Mock constructors only - no method mocks needed for this level
vi.mock('@modelcontextprotocol/sdk/server/streamableHttp.js', () => ({
  StreamableHTTPServerTransport: vi.fn(),
}));

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn(),
}));

// --- Test Setup ---
let app: express.Express;

describe('Bare Minimum MCP Server API Tests', () => {
  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Import the app instance
    const serverModule = await import('../src/server');
    app = serverModule.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Test Cases ---

  it('POST /mcp - should attempt initialization', async () => {
    // Arrange: Mock conditions for initialization
    const mockInitRequest = { jsonrpc: '2.0', method: 'initialize', id: 1, params: {} };
    (isInitializeRequest as any).mockReturnValue(true);
    (randomUUID as any).mockReturnValue('mock-uuid'); // Provide a return value

    // Act: Send the initialization request
    // We don't necessarily need to await the response if we only care about constructor calls
    // but supertest might require it. We add a catch to prevent unhandled rejections.
    await request(app)
      .post('/mcp')
      .send(mockInitRequest)
      .catch(err => console.error("Ignoring request error in init test:", err)); // Ignore errors for this basic check

    // Assert: Check ONLY that constructors were called
    expect(isInitializeRequest).toHaveBeenCalledWith(mockInitRequest);
    expect(StreamableHTTPServerTransport).toHaveBeenCalledTimes(1);
    expect(McpServer).toHaveBeenCalledTimes(1);

  }, 5000); // Generous timeout

  it('POST /mcp - should NOT attempt initialization for existing session ID', async () => {
    // Arrange: Mock conditions for a non-initialization request with a session ID
    const sessionId = 'existing-session-bare';
    const mockRpcRequest = { jsonrpc: '2.0', method: 'someTool', id: 2, params: {} };
     // Ensure isInitializeRequest returns false for this path
    (isInitializeRequest as any).mockReturnValue(false);

    // Act: Send request with a session ID
    await request(app)
      .post('/mcp')
      .set('mcp-session-id', sessionId)
      .send(mockRpcRequest)
       .catch(err => console.error("Ignoring request error in existing session test:", err)); // Ignore errors

    // Assert: Check ONLY that constructors were NOT called
    expect(StreamableHTTPServerTransport).not.toHaveBeenCalled();
    expect(McpServer).not.toHaveBeenCalled();
  });

   it('GET /mcp - should return 400 for invalid/missing session ID', async () => {
       // Arrange: No session ID provided
       // Act
       const response = await request(app)
           .get('/mcp'); // No mcp-session-id header

       // Assert
       expect(response.status).toBe(400);
       expect(response.text).toContain('Invalid or missing session ID');
       // No need to check mocks here, just the response
   });

}); 