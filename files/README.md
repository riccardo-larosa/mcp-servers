# Elastic Path Files MCP Server

This server implements a Model Context Protocol (MCP) interface for the Elastic Path Files API, allowing AI assistants to upload, retrieve, and manage files through a standardized interface.

## Features

- Upload files from local path
- Upload files from URL
- Get file by ID
- List available files
- Delete files
- Automatic token management
- Resource-based file access

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Elastic Path API credentials

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root with your Elastic Path credentials:
```env
EP_BASE_URL=your_base_url
EP_AUTH_ENDPOINT=/oauth/access_token
EP_CLIENT_ID=your_client_id
EP_CLIENT_SECRET=your_client_secret
```

## Usage

Start the server:
```bash
npm dev run
```

The server will start and listen for MCP commands through stdin/stdout.

## Available Tools

### uploadFile
Upload a file from a local path.

Parameters:
- `filePath`: Path to the file to upload
- `public`: Whether the file should be publicly accessible (default: true)

### uploadFileFromUrl
Upload a file from a URL.

Parameters:
- `fileLocation`: URL to the file
- `public`: Whether the file should be publicly accessible (default: true)

### getFile
Get file information by ID.

Parameters:
- `fileId`: ID of the file to retrieve

### listFiles
List available files with pagination support.

Parameters:
- `page`: Page number for pagination (optional)
- `limit`: Number of items per page (optional)

### deleteFile
Delete a file by ID.

Parameters:
- `fileId`: ID of the file to delete

## Available Resources

### elastic-path-file://{fileId}
Access individual file information.

### elastic-path-files://files
List all available files.

## Development

To build the project:
```bash
npm run build
```


To run the server and use the inspector in development mode:

```bash
npx @modelcontextprotocol/inspector node build/index.js
```

## License

MIT 