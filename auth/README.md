# EP Auth MCP Server

A Model Context Protocol (MCP) server implementation for Elastic Path authentication. This server provides tools and resources for handling authentication flows with Elastic Path's API.

## Features

- OAuth 2.0 client credentials flow support
- MCP-compliant server implementation
- Standard I/O (stdio) transport layer
- Resource template support

## Prerequisites

- Node.js (version specified in package.json)
- npm or yarn package manager

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```

## Usage

The server runs on standard I/O (stdio) and provides the following capabilities:

### Tools

#### get-token
Get an access token using client credentials flow.

Parameters:
- `client_id` (string): Your Elastic Path client ID
- `client_secret` (string): Your Elastic Path client secret
- `grant_type` (string): The OAuth grant type

### Resources

#### greeting
A simple resource template that generates greetings.

Format: `greeting://{name}`

## Development
First build the server
```bash
npm run build
```

To run the server in development mode:

```bash
npx @modelcontextprotocol/inspector node build/index.js

```

## Error Handling

The server includes error handling for:
- Failed token requests
- Invalid responses
- Server connection issues

## License

MIT