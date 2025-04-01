import os
from pathlib import Path
from typing import Dict, List, Optional

from src.models.file import FileData
from src.services.config import config


class FileService:
    """Service for managing files"""
    
    def __init__(self):
        self.upload_dir = Path(config.FILE_STORAGE_PATH)
        self.upload_dir.mkdir(exist_ok=True, parents=True)
        
        # In-memory storage for files (in a real application, this would be a database)
        self.files: Dict[str, FileData] = {}
    
    def get_file_path(self, file_id: str, extension: str) -> str:
        """Get the path to a file on disk"""
        extension_with_dot = f".{extension}" if not extension.startswith(".") else extension
        return str(self.upload_dir / f"{file_id}{extension_with_dot}")
    
    def save_uploaded_file(self, file_id: str, extension: str, content: bytes) -> str:
        """Save an uploaded file to disk"""
        file_path = self.get_file_path(file_id, extension)
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        return file_path
    
    def add_file(self, file_data: FileData) -> None:
        """Add a file to the in-memory storage"""
        self.files[file_data.id] = file_data
    
    def get_file(self, file_id: str) -> Optional[FileData]:
        """Get a file by ID"""
        return self.files.get(file_id)
    
    def list_files(
        self, 
        name: Optional[str] = None, 
        width: Optional[int] = None, 
        height: Optional[int] = None, 
        file_size: Optional[int] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[FileData]:
        """List files with optional filtering"""
        filtered_files = list(self.files.values())
        
        # Apply filters
        if name:
            filtered_files = [f for f in filtered_files if name.lower() in f.name.lower()]
        
        if width is not None:
            filtered_files = [f for f in filtered_files if f.width == width]
        
        if height is not None:
            filtered_files = [f for f in filtered_files if f.height == height]
        
        if file_size is not None:
            filtered_files = [f for f in filtered_files if f.file_size == file_size]
        
        # Sort by creation date (newest first)
        filtered_files.sort(key=lambda f: f.created_at, reverse=True)
        
        # Apply pagination
        return filtered_files[offset:offset + limit]
    
    def delete_file(self, file_id: str) -> bool:
        """Delete a file"""
        file = self.files.get(file_id)
        if not file:
            return False
        
        # Remove from in-memory storage
        del self.files[file_id]
        
        # Remove file from disk
        file_path = self.get_file_path(file_id, file.file_extension)
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return True
