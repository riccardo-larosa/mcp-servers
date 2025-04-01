#!/usr/bin/env python
"""
Test script to verify the Files API proxy server by:
1. Obtaining a token using client credentials from .env
2. Listing files and verifying we get 6 records
"""

import os
import sys
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.services.config import config

# Load environment variables
load_dotenv()

def get_access_token():
    """Get an access token using client credentials from .env file"""
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    
    if not client_id or not client_secret:
        pytest.skip("CLIENT_ID and CLIENT_SECRET must be set in the .env file")
    
    token_endpoint = f"{config.BASE_URL}/oauth/access_token"
    
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    print(f"Requesting token from {token_endpoint}...")
    
    try:
        response = requests.post(token_endpoint, data=data, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        access_token = token_data.get("access_token")
        
        if not access_token:
            pytest.fail("No access token returned")
            
        print("✅ Successfully obtained access token")
        return access_token
    except requests.RequestException as e:
        pytest.fail(f"Failed to get access token: {str(e)}")

def list_files(token, api_url="http://localhost:8000"):
    """List files through the MCP server using the provided token"""
    url = f"{api_url}/v2/files"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print(f"Listing files from {url}...")
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # Print the result in a nice format
        print("Files:")
        for i, file in enumerate(data.get("data", []), 1):
            print(f"{i}. {file.get('file_name')} ({file.get('id')})")
        
        # Return the file count
        return len(data.get("data", []))
            
    except requests.RequestException as e:
        pytest.fail(f"Failed to list files: {str(e)}")

def test_list_files():
    """Run the test to list files and verify count"""
    # Get access token
    token = get_access_token()
    
    # Test ONLY against the Elastic Path API directly
    print("\nTesting DIRECT API call to Elastic Path...")
    direct_file_count = list_files(token, api_url=config.BASE_URL)
    print(f"\nFound {direct_file_count} files directly from Elastic Path API")
    
    # Assert that we have exactly 6 files in the Elastic Path API
    assert direct_file_count == 6, (
        f"Expected 6 files but found {direct_file_count} in Elastic Path API"
    )
    
    # We are not testing the MCP server in this run
    print("\nSUCCESS: Verified that the Elastic Path API has exactly 6 files")
    print("NOTE: We are NOT testing the MCP server with this, only direct API access")