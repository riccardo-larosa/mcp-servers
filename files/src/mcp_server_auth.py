"""
MCP Server for Elastic Path Authentication API

This module implements a Model Context Protocol (MCP) server that provides
tools and resources for authentication with the Elastic Path API.
"""

import os
import json
import asyncio
import httpx
from typing import Dict, Optional, Any
from datetime import datetime, timedelta

from dotenv import load_dotenv
# Import MCP SDK components
from mcp.server.fastmcp import FastMCP
from mcp.server.fastmcp.server import Context, ToolArgs

# Load environment variables
load_dotenv()

# Initialize MCP server
mcp = FastMCP("elastic-path-auth-api")

# Configuration from environment
BASE_URL = os.getenv("BASE_URL", "https://euwest.api.elasticpath.com")
CLIENT_ID = os.getenv("CLIENT_ID", "")
CLIENT_SECRET = os.getenv("CLIENT_SECRET", "")

# Token cache
token_cache = {
    "access_token": None,
    "expires_at": None
}


# Resources - Read-only operations
@mcp.resource("elastic-path://auth/info")
async def auth_info_resource() -> Dict[str, Any]:
    """
    Get information about the authentication configuration
    
    Returns:
        Dictionary with authentication configuration info
    """
    return {
        "provider": "Elastic Path",
        "auth_endpoint": f"{BASE_URL}/oauth/access_token",
        "grant_types": ["client_credentials", "implicit"],
        "has_client_credentials": bool(CLIENT_ID and CLIENT_SECRET)
    }


# Tools - Operations with side effects
@mcp.tool()
async def get_client_credentials_token(
    ctx: Context,
    client_id: Optional[str] = None,
    client_secret: Optional[str] = None,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Get an access token using client credentials flow
    
    Args:
        ctx: MCP context
        client_id: Optional client ID (uses environment variable if not provided)
        client_secret: Optional client secret (uses environment variable if not provided)
        force_refresh: Force token refresh even if cached token is still valid
    
    Returns:
        Dictionary with access token information
    """
    ctx.progress(0.2, "Checking token cache")
    
    # Use provided credentials or fall back to environment variables
    client_id = client_id or CLIENT_ID
    client_secret = client_secret or CLIENT_SECRET
    
    if not client_id or not client_secret:
        raise ValueError("Client ID and Client Secret are required. Provide them as parameters or set in environment variables.")
    
    # Check if we have a valid cached token
    now = datetime.now()
    if not force_refresh and token_cache["access_token"] and token_cache["expires_at"] and now < token_cache["expires_at"]:
        ctx.progress(0.9, "Using cached token")
        return {
            "access_token": token_cache["access_token"],
            "token_type": "bearer",
            "expires_in": int((token_cache["expires_at"] - now).total_seconds()),
            "cached": True
        }
    
    # Request a new token
    ctx.progress(0.4, "Requesting new access token")
    
    token_endpoint = f"{BASE_URL}/oauth/access_token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(token_endpoint, data=payload, headers=headers)
            response.raise_for_status()
            
            token_data = response.json()
            access_token = token_data.get("access_token")
            expires_in = token_data.get("expires_in", 3600)  # Default 1 hour
            
            # Update cache with 10% safety margin
            token_cache["access_token"] = access_token
            token_cache["expires_at"] = now + timedelta(seconds=int(expires_in * 0.9))
            
            ctx.progress(0.9, "Successfully obtained new access token")
            
            return {
                **token_data,
                "cached": False
            }
    except httpx.HTTPStatusError as e:
        ctx.progress(1.0, f"Error obtaining token: {e.response.status_code}")
        error_data = {"error": "authentication_failed"}
        
        try:
            error_data = e.response.json()
        except:
            error_data["error_description"] = str(e)
            
        raise ValueError(f"Authentication failed: {error_data.get('error_description', str(e))}")


@mcp.tool()
async def validate_token(
    ctx: Context,
    token: str
) -> Dict[str, Any]:
    """
    Validate if a token is valid by making a test request
    
    Args:
        ctx: MCP context
        token: The token to validate
    
    Returns:
        Dictionary with validation result
    """
    ctx.progress(0.3, "Testing token validity")
    
    # Make a simple request to validate the token
    url = f"{BASE_URL}/{os.getenv('API_VERSION', 'v2')}/files?page[limit]=1"
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            
            ctx.progress(0.9, "Token is valid")
            return {
                "valid": True,
                "status_code": response.status_code,
                "message": "Token is valid"
            }
    except httpx.HTTPStatusError as e:
        ctx.progress(0.9, "Token validation failed")
        return {
            "valid": False,
            "status_code": e.response.status_code,
            "message": f"Token validation failed: {e.response.status_code} {e.response.reason_phrase}"
        }


# Run the server
if __name__ == "__main__":
    asyncio.run(mcp.run_stdio())