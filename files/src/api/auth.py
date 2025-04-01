from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import requests

from src.services.config import config
from src.services.auth_service import auth_service

# Create security scheme for Bearer tokens
oauth2_scheme = HTTPBearer(
    description="Bearer token authorization",
    auto_error=True,
)


async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(oauth2_scheme)) -> str:
    """
    Verify the Bearer token from Authorization header
    Pass-through the token to the Elastic Path API
    """
    # Skip auth in development mode if configured to do so
    if config.DISABLE_AUTH:
        return "development-user"
        
    token = credentials.credentials
    
    # For MCP servers, we pass the token through to the underlying API.
    # We'll check if the token works by making a test request
    try:
        # Try to validate the token by making a simple request to the API
        url = f"{config.BASE_URL}/{config.API_VERSION}/files?page[limit]=1"
        response = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"}
        )
        response.raise_for_status()
        return token  # Valid token
    except requests.RequestException:
        # If the request fails, the token is invalid
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )