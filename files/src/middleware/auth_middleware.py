from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from src.services.api_client import api_client


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware to extract the token from the request and set it for the API client"""
    
    async def dispatch(self, request: Request, call_next):
        # Extract token from the request header if available
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1].strip()
            # Set the token for the current request
            api_client.set_current_token(token)
        else:
            # Clear any previous token
            api_client.set_current_token(None)
            
        # Process the request
        response = await call_next(request)
        
        # Clear the token after request is processed
        api_client.set_current_token(None)
        
        return response