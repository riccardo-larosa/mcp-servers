import os
import requests
from typing import Dict, Optional
import time
from datetime import datetime, timedelta
from threading import Lock

from src.services.config import config


class AuthService:
    """Service for managing authentication with Elastic Path API"""
    
    def __init__(self):
        self.client_id = config.CLIENT_ID
        self.client_secret = config.CLIENT_SECRET
        self.token_endpoint = f"{config.BASE_URL}/oauth/access_token"
        
        # Cache for access token
        self.access_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        self.token_lock = Lock()  # Thread safety for token management
        
        # Cache for user-provided tokens
        self.user_tokens = {}
        
    def get_access_token(self) -> str:
        """
        Get an access token for the Elastic Path API.
        Returns a cached token if it's still valid, otherwise requests a new one.
        """
        # Skip in development mode if configured to do so
        if config.DISABLE_AUTH:
            return "development-token"
            
        with self.token_lock:
            # Check if we have a valid cached token
            if self.access_token and self.token_expiry and datetime.now() < self.token_expiry:
                return self.access_token
                
            # Request a new token
            payload = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials"
            }
            
            headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            }
            
            try:
                response = requests.post(self.token_endpoint, data=payload, headers=headers)
                response.raise_for_status()
                
                token_data = response.json()
                self.access_token = token_data.get("access_token")
                
                # Set token expiry (default to 1 hour if not provided)
                expires_in = token_data.get("expires_in", 3600)  # Default 1 hour
                self.token_expiry = datetime.now() + timedelta(seconds=expires_in)
                
                return self.access_token
                
            except requests.RequestException as e:
                # Log the error (in a real application)
                print(f"Failed to get access token: {str(e)}")
                
                # For development purposes, return a fallback token if auth is disabled
                if config.DISABLE_AUTH:
                    return "development-token-fallback"
                    
                # In production, re-raise the error
                raise
    
    def set_user_token(self, user_id: str, token: str) -> None:
        """Store a user-provided token for use with the API"""
        self.user_tokens[user_id] = token
        
    def get_user_token(self, user_id: str) -> Optional[str]:
        """Get a user-provided token if available"""
        return self.user_tokens.get(user_id)


# Create a singleton instance
auth_service = AuthService()