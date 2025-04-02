#!/usr/bin/env python
"""
Test client for the Elastic Path Files API MCP servers

This client demonstrates how to use both the authentication MCP server
and the files API MCP server together.
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from dotenv import load_dotenv
from mcp import ClientSession, StdioServerParameters  
from mcp.client.stdio import stdio_client

# Load environment variables
load_dotenv()

async def run_mcp_client_test():
    """Run a test of the Elastic Path Files and Auth MCP clients"""
    print("\n=== Testing Elastic Path MCP Clients ===\n")
    
    print("\n--- STEP 1: Obtain Authentication Token ---")
    
    # Connect to authentication server
    auth_server = StdioServerParameters(
        id="auth_server",
        command="python src/mcp_server_auth.py"
    )
    auth_client = await stdio_client(auth_server)
    auth_context = {}  # Empty context dictionary
    
    try:
        # Get a token using client credentials
        response = await auth_client.run_tool(
            "get_client_credentials_token",
            {},  # Will use CLIENT_ID and CLIENT_SECRET from environment
            auth_context
        )
        
        token_data = response.result
        token = token_data.get("access_token")
        
        if not token:
            print("❌ ERROR: Failed to obtain access token")
            return
            
        print(f"✅ Successfully obtained access token")
        print(f"Token type: {token_data.get('token_type', 'bearer')}")
        print(f"Expires in: {token_data.get('expires_in', 'unknown')} seconds")
        print(f"Cached: {token_data.get('cached', False)}")
        
        # Optional: validate the token
        validation = await auth_client.run_tool(
            "validate_token",
            {"token": token},
            auth_context
        )
        
        if validation.result.get("valid"):
            print("✅ Token validation successful")
        else:
            print(f"❌ Token validation failed: {validation.result.get('message')}")
            return
            
        print("\n--- STEP 2: Use Token with Files API ---")
        
        # Connect to files server
        files_server = StdioServerParameters(
            id="files_server",
            command="python src/mcp_server.py"
        )
        files_client = await stdio_client(files_server)
        files_context = {"authorization": f"Bearer {token}"}
        
        # List files
        print("\n--- Listing Files ---")
        list_args = {
            "page_limit": 10,
            "page_offset": 0
        }
        
        response = await files_client.run_tool(
            "list_files",
            list_args,
            files_context
        )
        
        # Print the results
        files_data = response.result
        print(f"Found {len(files_data.get('data', []))} files:")
        for i, file in enumerate(files_data.get('data', []), 1):
            print(f"{i}. {file.get('name')} ({file.get('id')})")
        
        # Check if we got 6 files
        file_count = len(files_data.get('data', []))
        if file_count == 6:
            print("\n✅ TEST PASSED: Found exactly 6 files as expected")
        else:
            print(f"\n❌ TEST FAILED: Expected 6 files but found {file_count}")
            
    except Exception as e:
        print(f"Error during test: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_mcp_client_test())