# Elastic Path Files API - MCP Server

This project implements a Model Context Protocol (MCP) server for the Elastic Path Files API, allowing LLMs (Large Language Models) to interact with file storage operations.

## MCP Implementation

The Model Context Protocol (MCP) server provides standardized tools and resources for working with the Elastic Path Files API:

### Resources (Read-only API endpoints)
- `elastic-path://files` - List all files with optional filtering and pagination
- `elastic-path://files/{file_id}` - Get detailed information about a specific file

### Tools (Operations with side effects)
- `list_files` - List all files with filtering and pagination
- `upload_file` - Upload a new file to Elastic Path
- `delete_file` - Delete a file from Elastic Path
- `download_file` - Download a file's binary content

## Installation

### Install with UV (Recommended)

```bash
# Navigate to the project directory
cd /path/to/files

# Install MCP SDK with CLI support
uv add "mcp[cli]"

# For development, also install the project in development mode
uv pip install -e ".[dev]"
```

## Usage

### Running the MCP Server

```bash
# Run the MCP server directly
python src/mcp_server.py

# Or use the MCP CLI
mcp run src.mcp_server
```

### Authentication

The server supports two authentication methods:

1. **Client-based Authentication**: Client provides a valid Elastic Path access token in the `authorization` parameter
2. **Server-managed Authentication**: Server uses `CLIENT_ID` and `CLIENT_SECRET` from .env to obtain tokens

For development, set `DISABLE_AUTH=True` in the .env file.

### Testing

Use the provided MCP client tool to test the server:

```bash
python tools/mcp_client.py
```

## Configuration (.env file)

```
# API Configuration
BASE_URL=https://euwest.api.elasticpath.com

# Authentication
CLIENT_ID=your-client-id
CLIENT_SECRET=your-client-secret
DISABLE_AUTH=True  # For development only, set to False in production
```

## Example LLM Interaction

```
User: Can you list all image files in our Elastic Path account?

LLM: I'll list all image files for you. Let me access that information.

[LLM uses MCP tool: list_files with filter_file_type="image"]

Here are the image files from your Elastic Path account:
1. product-front.jpg (6e3d82c9-0001)
2. product-back.jpg (6e3d82c9-0002)
3. banner-promo.png (6e3d82c9-0003)
...
```

## Integration with Other Models

This MCP server can be integrated with any LLM that supports the Model Context Protocol, providing standardized access to file operations in Elastic Path.