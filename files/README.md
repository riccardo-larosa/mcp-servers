# Files API Server

A FastAPI server implementation for the Elastic Path Files API.

## Features

- Upload files via multipart/form-data
- Retrieve file metadata
- List all files with filtering and pagination
- Delete files

## Requirements

- Python 3.9+

## Installation

### Using uv (recommended)

```bash
uv pip install -e .
```

For development:
```bash
uv pip install -e ".[dev]"
```

### Using pip

```bash
pip install -e .
```

For development:
```bash
pip install -e ".[dev]"
```

## Configuration

Copy the `.env.example` file to `.env` and configure as needed:

```bash
cp .env.example .env
```

Important configuration options:
- `BASE_URL`: Set to one of the Elastic Path API URLs (euwest or useast)
- `DEBUG`: Set to True for development, False for production
- `FILE_STORAGE_PATH`: Directory to store uploaded files
- `MAX_FILE_SIZE`: Maximum allowed file size in bytes (default 8MB)

Authentication settings:
- `CLIENT_ID`: Your Elastic Path application client ID
- `CLIENT_SECRET`: Your Elastic Path application client secret
- `DISABLE_AUTH`: Set to False in production to enforce Bearer token authentication

## Running the server

```bash
# Using the provided run script
python run.py

# Or directly with uvicorn
uvicorn src.main:app --reload
```

## API Documentation

Once the server is running, visit:
- http://localhost:8000/docs - Swagger UI
- http://localhost:8000/redoc - ReDoc

## Authentication

The MCP server acts as a proxy and passes your Elastic Path access token directly to the Files API. To make authenticated requests:

```bash
# Using curl with your Elastic Path token
curl -X GET "http://localhost:8000/v2/files" -H "Authorization: Bearer your-elastic-path-token"
```

Authentication options:
1. **Direct Token Pass-through**: Your client provides a valid Elastic Path token which is passed to the Files API
2. **Server-managed Tokens**: For development/testing, the server can obtain tokens automatically

For development, you can set `DISABLE_AUTH=True` in your .env file to bypass authentication checks.
In production, set this to `False` to ensure all requests have valid tokens.

To configure server-managed tokens (useful for testing):
- Set `CLIENT_ID` and `CLIENT_SECRET` in your .env file
- These credentials will be used to obtain tokens when needed

For applications, it's generally better to obtain tokens directly from Elastic Path's authentication service and pass them through this MCP server.

## Deployment

The project includes Docker support:

```bash
# Build and run with docker-compose
docker-compose up -d
```
