import requests
from typing import Dict, Any, Optional

from src.services.auth_service import auth_service
from src.services.config import config


class ApiClient:
    """Client for making requests to the Elastic Path API"""
    
    def __init__(self):
        self.base_url = config.BASE_URL
        self.api_version = config.API_VERSION
        self.current_token = None  # For user-provided token in the current request
    
    def _get_headers(self, user_token: Optional[str] = None) -> Dict[str, str]:
        """
        Get the headers for API requests including authentication
        If user_token is provided, use it instead of requesting a new one
        """
        token = user_token or self.current_token or auth_service.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    
    def _get_multipart_headers(self, user_token: Optional[str] = None) -> Dict[str, str]:
        """Get the headers for multipart API requests"""
        token = user_token or self.current_token or auth_service.get_access_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        
    def set_current_token(self, token: str) -> None:
        """Set the token to use for the current request context"""
        self.current_token = token
    
    def _build_url(self, endpoint: str) -> str:
        """Build the full URL for an API endpoint"""
        return f"{self.base_url}/{self.api_version}/{endpoint}"
    
    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GET request to the API"""
        url = self._build_url(endpoint)
        response = requests.get(url, headers=self._get_headers(), params=params)
        response.raise_for_status()
        return response.json()
    
    def post(self, endpoint: str, json_data: Optional[Dict[str, Any]] = None, files=None) -> Dict[str, Any]:
        """Make a POST request to the API"""
        url = self._build_url(endpoint)
        
        if files:
            # For multipart/form-data (file uploads)
            response = requests.post(url, headers=self._get_multipart_headers(), data=json_data, files=files)
        else:
            # For regular JSON requests
            response = requests.post(url, headers=self._get_headers(), json=json_data)
            
        response.raise_for_status()
        return response.json()
    
    def delete(self, endpoint: str) -> None:
        """Make a DELETE request to the API"""
        url = self._build_url(endpoint)
        response = requests.delete(url, headers=self._get_headers())
        response.raise_for_status()
        # Return None for 204 No Content responses
        if response.status_code != 204:
            return response.json()


# Create a singleton instance
api_client = ApiClient()