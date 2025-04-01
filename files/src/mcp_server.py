"""
MCP Server for Elastic Path Files API

This module implements a Model Context Protocol (MCP) server that provides
tools and resources for interacting with the Elastic Path Files API.
"""

import asyncio
import json
import os
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.server import Context

# Load environment variables
load_dotenv()

# Initialize MCP server
mcp = FastMCP("elastic-path-files-api")

# Configuration from environment
BASE_URL = os.getenv("BASE_URL", "https://euwest.api.elasticpath.com")
API_VERSION = "v2"
CLIENT_ID = os.getenv("CLIENT_ID", "")
CLIENT_SECRET = os.getenv("CLIENT_SECRET", "")
DISABLE_AUTH = os.getenv("DISABLE_AUTH", "False").lower() == "true"


# Helper functions for authentication
async def get_access_token() -> str:
    """Get an access token for the Elastic Path API"""
    if DISABLE_AUTH:
        return "development-token"
    
    token_endpoint = f"{BASE_URL}/oauth/access_token"
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "grant_type": "client_credentials"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_endpoint, data=payload, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        return token_data.get("access_token")


async def get_auth_headers(user_token: Optional[str] = None) -> Dict[str, str]:
    """Get the authentication headers for API requests"""
    token = user_token or await get_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


# Resources - Read-only operations
@mcp.resource(
    "elastic-path://files?"
    "page_limit={page_limit}&"
    "page_offset={page_offset}&"
    "filter_name={filter_name}&"
    "filter_width={filter_width}&"
    "filter_height={filter_height}&"
    "filter_file_size={filter_file_size}"
)
async def list_files_resource(
    ctx: Context,
    page_limit: int = 10, 
    page_offset: int = 0,
    filter_name: Optional[str] = None,
    filter_width: Optional[int] = None,
    filter_height: Optional[int] = None,
    filter_file_size: Optional[int] = None,
) -> Dict[str, Any]:
    """
    List all files with optional filtering
    
    Args:
        ctx: MCP context
        page_limit: Number of items per page
        page_offset: Page offset
        filter_name: Filter by file name
        filter_width: Filter by width
        filter_height: Filter by height
        filter_file_size: Filter by file size
    
    Returns:
        Dictionary with file listing data
    """
    # Get authorization from context
    authorization = ctx.request.headers.get("authorization")
    
    # Build query parameters
    params = {}
    
    # Pagination
    params["page[limit]"] = page_limit
    params["page[offset]"] = page_offset
    
    # Filters
    if filter_name:
        params["filter[name]"] = filter_name
    if filter_width:
        params["filter[width]"] = filter_width
    if filter_height:
        params["filter[height]"] = filter_height
    if filter_file_size:
        params["filter[file_size]"] = filter_file_size
    
    # Make request to Elastic Path API
    url = f"{BASE_URL}/{API_VERSION}/files"
    headers = await get_auth_headers(authorization)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()


@mcp.resource("elastic-path://files/{file_id}")
async def get_file_resource(
    ctx: Context,
    file_id: str,
) -> Dict[str, Any]:
    """
    Get a specific file by ID
    
    Args:
        ctx: MCP context
        file_id: The ID of the file to retrieve
    
    Returns:
        Dictionary with file data
    """
    # Get authorization from context
    authorization = ctx.request.headers.get("authorization")
    
    # Make request to Elastic Path API
    url = f"{BASE_URL}/{API_VERSION}/files/{file_id}"
    headers = await get_auth_headers(authorization)
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.json()


# Tools - Operations with side effects
@mcp.tool()
async def list_files(
    ctx: Context,
    page_limit: int = 10, 
    page_offset: int = 0,
    filter_name: Optional[str] = None,
    filter_width: Optional[int] = None,
    filter_height: Optional[int] = None,
    filter_file_size: Optional[int] = None,
    authorization: Optional[str] = None
) -> Dict[str, Any]:
    """
    List all files with optional filtering
    
    Args:
        ctx: MCP context
        page_limit: Number of items per page
        page_offset: Page offset
        filter_name: Filter by file name
        filter_width: Filter by width
        filter_height: Filter by height
        filter_file_size: Filter by file size
        authorization: Optional authorization token (Bearer token)
    
    Returns:
        Dictionary with file listing data
    """
    ctx.progress(0.2, "Authenticating with Elastic Path API")
    
    result = await list_files_resource(
        page_limit=page_limit,
        page_offset=page_offset,
        filter_name=filter_name,
        filter_width=filter_width,
        filter_height=filter_height,
        filter_file_size=filter_file_size,
    )
    
    ctx.progress(0.9, f"Retrieved {len(result.get('data', []))} files")
    return result


@mcp.tool()
async def upload_file(
    ctx: Context,
    file_content: bytes,
    file_name: str,
    content_type: str = "application/octet-stream",
    public_status: bool = True,
    authorization: Optional[str] = None
) -> Dict[str, Any]:
    """
    Upload a file to Elastic Path
    
    Args:
        ctx: MCP context
        file_content: The binary content of the file
        file_name: The name of the file
        content_type: MIME type of the file
        public_status: Whether the file should be public
        authorization: Optional authorization token (Bearer token)
    
    Returns:
        Dictionary with uploaded file data
    """
    ctx.progress(0.2, "Authenticating with Elastic Path API")
    
    # Make request to Elastic Path API
    url = f"{BASE_URL}/{API_VERSION}/files"
    headers = await get_auth_headers(authorization)
    # Remove content-type from headers as it will be set by the multipart encoder
    if "Content-Type" in headers:
        del headers["Content-Type"]
    
    ctx.progress(0.4, "Preparing file upload")
    
    # Create the form data
    files = {"file": (file_name, file_content, content_type)}
    data = {"public_status": str(public_status).lower()}
    
    ctx.progress(0.6, f"Uploading file '{file_name}'")
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, files=files, data=data)
        response.raise_for_status()
        result = response.json()
    
    ctx.progress(0.9, f"File uploaded successfully with ID: {result.get('data', {}).get('id')}")
    return result


@mcp.tool()
async def delete_file(
    ctx: Context,
    file_id: str,
    authorization: Optional[str] = None
) -> Dict[str, Any]:
    """
    Delete a file from Elastic Path
    
    Args:
        ctx: MCP context
        file_id: The ID of the file to delete
        authorization: Optional authorization token (Bearer token)
    
    Returns:
        Dictionary with deleted file confirmation
    """
    ctx.progress(0.2, "Authenticating with Elastic Path API")
    
    # Make request to Elastic Path API
    url = f"{BASE_URL}/{API_VERSION}/files/{file_id}"
    headers = await get_auth_headers(authorization)
    
    ctx.progress(0.5, f"Deleting file with ID: {file_id}")
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers)
        response.raise_for_status()
        
        # Return empty object for 204 responses
        if response.status_code == 204:
            result = {"status": "success", "message": f"File with ID {file_id} deleted successfully"}
        else:
            result = response.json()
    
    ctx.progress(0.9, f"File deleted successfully")
    return result


@mcp.tool()
async def download_file(
    ctx: Context,
    file_id: str,
    authorization: Optional[str] = None
) -> bytes:
    """
    Download a file from Elastic Path
    
    Args:
        ctx: MCP context
        file_id: The ID of the file to download
        authorization: Optional authorization token (Bearer token)
    
    Returns:
        Raw file content as bytes
    """
    ctx.progress(0.2, "Authenticating with Elastic Path API")
    
    # First get the file details to get the download URL
    url = f"{BASE_URL}/{API_VERSION}/files/{file_id}"
    headers = await get_auth_headers(authorization)
    
    ctx.progress(0.4, f"Getting file details for ID: {file_id}")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        file_data = response.json()
    
    # Get the download URL from the response
    if "data" in file_data and "links" in file_data["data"] and "download" in file_data["data"]["links"]:
        download_url = file_data["data"]["links"]["download"]
        file_name = file_data["data"]["name"]
        
        ctx.progress(0.6, f"Downloading file: {file_name}")
        
        # Download the file content
        async with httpx.AsyncClient() as client:
            response = await client.get(download_url, headers={"Authorization": headers["Authorization"]})
            response.raise_for_status()
            content = response.content
        
        ctx.progress(0.9, f"File download complete: {len(content)} bytes")
        return content
    else:
        raise ValueError("Download link not found in file data")


# Run the server
if __name__ == "__main__":
    asyncio.run(mcp.run())