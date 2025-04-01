#!/usr/bin/env python
"""
CLI tool to get an Elastic Path API access token.
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))
from src.services.config import config

# Load environment variables
load_dotenv()

def get_token():
    """Get an access token using client credentials from .env file"""
    client_id = os.getenv("CLIENT_ID")
    client_secret = os.getenv("CLIENT_SECRET")
    
    if not client_id or not client_secret:
        print("ERROR: CLIENT_ID and CLIENT_SECRET must be set in the .env file")
        sys.exit(1)
    
    token_endpoint = f"{config.BASE_URL}/oauth/access_token"
    
    data = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials"
    }
    
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    
    try:
        response = requests.post(token_endpoint, data=data, headers=headers)
        response.raise_for_status()
        token_data = response.json()
        
        # Pretty print the token data with formatting
        print("\n=== Elastic Path API Token ===\n")
        print(f"Access Token: {token_data.get('access_token')}")
        
        if 'expires_in' in token_data:
            print(f"Expires In: {token_data.get('expires_in')} seconds")
            
        print("\n=== For use with curl ===\n")
        print(f"curl -H \"Authorization: Bearer {token_data.get('access_token')}\" <URL>")
        print("\n")
        
        return token_data
    except requests.RequestException as e:
        print(f"ERROR: Failed to get access token: {str(e)}")
        if hasattr(e, 'response') and e.response:
            print("Response:", e.response.text)
        sys.exit(1)

if __name__ == "__main__":
    token_data = get_token()