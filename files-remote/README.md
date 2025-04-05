# Elastic Path Files MCP Server
This is a attempt to create an MCP Server using SSE. 
Not working very well. 
I just found out that SSE is getting replaced by 
[Streamable HTTP](https://spec.modelcontextprotocol.io/specification/2025-03-26/basic/transports/#streamable-http)

So leaving this here for right now. 
I may pick it up later. 

## Usage
```bash
npm run build
node build/index.ts
```
This starts the server at http://localhost:3000/sse
Then use MCP inspector to connect to the server
```bash
 npx @modelcontextprotocol/inspector
```bash