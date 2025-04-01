import os

from dotenv import load_dotenv
from pydantic import BaseModel, HttpUrl

from src.services.config import config


class ServerConfig(BaseModel):
    description: str
    url: HttpUrl


class Config:
    """Application configuration"""
    
    def __init__(self):
        self._load_env()
    
    def _load_env(self):
        """Load environment variables"""
        load_dotenv(override=True)
        
        # Server configuration
        self.HOST = os.getenv("HOST", "0.0.0.0")
        self.PORT = int(os.getenv("PORT", "8000"))
        self.DEBUG = os.getenv("DEBUG", "False").lower() == "true"
        
        # File storage settings
        self.FILE_STORAGE_PATH = os.getenv("FILE_STORAGE_PATH", "./uploads")
        self.MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "8388608"))  # 8MB 
        
        # API Configuration
        self.API_VERSION = "v2"
        
        # Authentication settings
        self.CLIENT_ID = os.getenv("CLIENT_ID", "")
        self.CLIENT_SECRET = os.getenv("CLIENT_SECRET", "")
        self.DISABLE_AUTH = os.getenv("DISABLE_AUTH", "False").lower() == "true"
        
        # Servers configuration as defined in the OpenAPI spec
        self.SERVERS = [
            ServerConfig(
                description="EU West Production Server",
                url="https://euwest.api.elasticpath.com"
            ),
            ServerConfig(
                description="US East Production Server",
                url="https://useast.api.elasticpath.com"
            )
        ]
        
        # Get the base URL from environment or use the first server from the list
        self.BASE_URL = os.getenv("BASE_URL", str(self.SERVERS[0].url))
    
    @property
    def api_base_url(self) -> str:
        """Get the full API base URL including version"""
        return f"{self.BASE_URL}/{self.API_VERSION}"
    
    def get_file_url(self, file_id: str) -> str:
        """Get the URL for a specific file"""
        return f"{self.api_base_url}/files/{file_id}"
    
    def get_file_download_url(self, file_id: str) -> str:
        """Get the download URL for a specific file"""
        return f"{self.api_base_url}/files/{file_id}/download"


# Create a singleton config instance
config = Config()