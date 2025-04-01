# Elastic Path API - MCP Servers

This project implements Model Context Protocol (MCP) servers for the Elastic Path API, allowing Large Language Models (LLMs) to interact with Elastic Path's services.

## MCP Servers

The implementation includes two separate MCP servers:

1. **Authentication Server** (`src/mcp_server_auth.py`)
   - Handles authentication with Elastic Path
   - Obtains and validates access tokens
   - Implements token caching for performance

2. **Files API Server** (`src/mcp_server.py`)
   - Provides access to the Files API functionality
   - Implements file listing, uploading, downloading, and deletion
   - Uses tokens obtained from the Authentication Server

## Installation

### Prerequisites

- Python 3.9 or later
- The MCP SDK

### Install with uv (Recommended)

```bash
# Navigate to the project directory
cd /path/to/files

# Install MCP SDK with CLI support
uv add "mcp[cli]"

# Install project dependencies
uv pip install -e ".[dev]"
```

## Running the MCP Servers

You can run both servers simultaneously (in separate terminals):

```bash
# Run the Authentication Server
python src/mcp_server_auth.py

# Run the Files API Server
python src/mcp_server.py
```

Alternatively, use the MCP CLI:

```bash
mcp run src.mcp_server_auth
mcp run src.mcp_server
```

## Available MCP Tools and Resources

### Authentication Server

**Tools:**
- `get_client_credentials_token` - Obtain an access token using client credentials
- `validate_token` - Check if a token is valid

**Resources:**
- `elastic-path://auth/info` - Get authentication configuration information

### Files API Server

**Tools:**
- `list_files` - List all files with filtering and pagination
- `upload_file` - Upload a new file
- `delete_file` - Delete a file
- `download_file` - Download a file's content

**Resources:**
- `elastic-path://files` - List all files (readonly)
- `elastic-path://files/{file_id}` - Get file details (readonly)

## Testing

Use the provided MCP client script to test both servers:

```bash
python tools/mcp_client.py
```

This script demonstrates how to:
1. Connect to the Authentication Server to obtain a token
2. Validate the token
3. Use the token with the Files API Server
4. List files from Elastic Path

## Configuration

Configure the servers using environment variables in a `.env` file:

```
# API Configuration
BASE_URL=https://euwest.api.elasticpath.com
API_VERSION=v2

# Authentication
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
DISABLE_AUTH=False  # Set to True for development/testing
```

## Integration with LLMs

These MCP servers can be integrated with any LLM that supports the Model Context Protocol. For example:

```python
from mcp.client import Client, Context

# Connect to both servers
auth_client = Client("http://localhost:8000/auth")  # Authentication server
files_client = Client("http://localhost:8001/files")  # Files server

# Get a token
auth_ctx = Context()
token_response = await auth_client.run_tool("get_client_credentials_token", {}, auth_ctx)
token = token_response.result["access_token"]

# Use the token with the files API
files_ctx = Context(authorization=f"Bearer {token}")
files_response = await files_client.run_tool("list_files", {"page_limit": 10}, files_ctx)

# Process the results
file_data = files_response.result
```

## Benefits of Using MCP

- **Standardized Interface** - Consistent API for LLMs
- **Progress Tracking** - Real-time updates during tool execution
- **Context Management** - Maintain state across operations
- **Type Safety** - Typed interfaces for better reliability
- **Separation of Concerns** - Authentication and API operations are decoupled