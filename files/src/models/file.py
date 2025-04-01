from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, HttpUrl


class FileType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    MODEL_3D = "3d"
    OTHER = "other"


class FileStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class FileMeta(BaseModel):
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    extension: Optional[str] = None


class FilePagination(BaseModel):
    current: str
    first: str
    last: Optional[str] = None
    next: Optional[str] = None
    prev: Optional[str] = None


class FileLinks(BaseModel):
    self: str
    download: str


class FileData(BaseModel):
    id: str
    type: str = "file"  # Always "file"
    name: str
    file_type: FileType
    file_extension: str
    mime_type: str
    file_size: int
    public_url: HttpUrl
    status: FileStatus = FileStatus.COMPLETED
    width: Optional[int] = None
    height: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    links: FileLinks
    
    class Config:
        populate_by_name = True
        json_schema_extra = {
            "example": {
                "id": "12345678-90ab-cdef-1234-567890abcdef",
                "type": "file",
                "name": "product-image.jpg",
                "file_type": "image",
                "file_extension": "jpg",
                "mime_type": "image/jpeg",
                "file_size": 1234567,
                "public_url": "https://example.com/files/product-image.jpg",
                "status": "completed",
                "width": 1920,
                "height": 1080,
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:00:00Z",
                "links": {
                    "self": "https://api.elasticpath.com/v2/files/12345678-90ab-cdef-1234-567890abcdef",
                    "download": "https://api.elasticpath.com/v2/files/12345678-90ab-cdef-1234-567890abcdef/download"
                }
            }
        }


class FileResponse(BaseModel):
    data: FileData


class FileListResponse(BaseModel):
    data: List[FileData]
    links: FilePagination
    meta: Dict[str, Any] = Field(default_factory=dict)


class FileCreateRequest(BaseModel):
    file_name: Optional[str] = None
    public_status: bool = True
    file_url: Optional[HttpUrl] = None
    # Note: The actual file is expected to be sent as form-data
    # and not included in the JSON schema
