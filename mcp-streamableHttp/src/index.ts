import app from './express-server.js'; // Import the configured app (default export)

const PORT = process.env.PORT || 3000; // Use environment variable or default

app.listen(PORT, () => {
  console.log(`MCP Server is running on http://localhost:${PORT}`);
  console.log(`MCP endpoint configured at /mcp`);
}); 