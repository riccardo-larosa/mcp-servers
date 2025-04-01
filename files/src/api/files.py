from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, Response, UploadFile
from fastapi.responses import JSONResponse, StreamingResponse
import requests
from pydantic import HttpUrl

from src.models.file import FileListResponse, FileResponse
from src.services.api_client import api_client

router = APIRouter()


@router.get("", response_model=FileListResponse)
async def list_files(
    request: Request,
    response: Response,
    filter_name: Optional[str] = Query(None, description="Filter by file name"),
    filter_width: Optional[int] = Query(None, description="Filter by width"),
    filter_height: Optional[int] = Query(None, description="Filter by height"),
    filter_file_size: Optional[int] = Query(None, description="Filter by file size"),
    page_limit: int = Query(10, description="Number of items per page", ge=1, le=100),
    page_offset: int = Query(0, description="Page offset", ge=0),
):
    """List all files with optional filtering"""
    try:
        # Convert FastAPI query params to Elastic Path API format
        params: Dict[str, Any] = {}
        
        # Pagination
        params["page[limit]"] = page_limit
        params["page[offset]"] = page_offset
        
        # Filters
        if filter_name:
            params["filter[name]"] = filter_name
        if filter_width:
            params["filter[width]"] = filter_width
        if filter_height:
            params["filter[height]"] = filter_height
        if filter_file_size:
            params["filter[file_size]"] = filter_file_size
        
        # Make request to Elastic Path API
        result = api_client.get("files", params=params)
        
        # Pass through response headers
        for header_name, header_value in result.get("headers", {}).items():
            response.headers[header_name] = header_value
            
        return result
    except requests.RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            error_data = e.response.json() if e.response.content else {"errors": [{"title": str(e)}]}
            raise HTTPException(status_code=status_code, detail=error_data)
        raise HTTPException(status_code=500, detail={"errors": [{"title": str(e)}]})


@router.post("", response_model=FileResponse, status_code=201)
async def create_file(
    file: Optional[UploadFile] = File(None),
    file_name: Optional[str] = Form(None),
    public_status: bool = Form(True),
    file_url: Optional[HttpUrl] = Form(None),
):
    """Create a new file either by upload or from URL"""
    try:
        if not file and not file_url:
            raise HTTPException(status_code=400, detail="Either file or file_url must be provided")
        
        if file and file_url:
            raise HTTPException(status_code=400, detail="Provide either file or file_url, not both")
        
        # Prepare the form data
        data = {}
        if file_name:
            data["file_name"] = file_name
        data["public_status"] = str(public_status).lower()
        
        if file_url:
            data["file_url"] = str(file_url)
            
        # Prepare the files for upload
        files = None
        if file:
            file_content = await file.read()
            files = {"file": (file.filename, file_content, file.content_type)}
        
        # Make request to Elastic Path API
        result = api_client.post("files", json_data=data, files=files)
        return result
    except requests.RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            error_data = e.response.json() if e.response.content else {"errors": [{"title": str(e)}]}
            raise HTTPException(status_code=status_code, detail=error_data)
        raise HTTPException(status_code=500, detail={"errors": [{"title": str(e)}]})


@router.get("/{file_id}", response_model=FileResponse)
async def get_file(file_id: str):
    """Get a specific file by ID"""
    try:
        result = api_client.get(f"files/{file_id}")
        return result
    except requests.RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            error_data = e.response.json() if e.response.content else {"errors": [{"title": str(e)}]}
            raise HTTPException(status_code=status_code, detail=error_data)
        raise HTTPException(status_code=500, detail={"errors": [{"title": str(e)}]})


@router.delete("/{file_id}", status_code=204)
async def delete_file(file_id: str):
    """Delete a specific file"""
    try:
        api_client.delete(f"files/{file_id}")
        return None
    except requests.RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            error_data = e.response.json() if e.response.content else {"errors": [{"title": str(e)}]}
            raise HTTPException(status_code=status_code, detail=error_data)
        raise HTTPException(status_code=500, detail={"errors": [{"title": str(e)}]})


@router.get("/{file_id}/download")
async def download_file(file_id: str):
    """Download a specific file"""
    try:
        # First get the file details to get the download URL
        file_data = api_client.get(f"files/{file_id}")
        
        # Get the download URL from the response
        if "data" in file_data and "links" in file_data["data"] and "download" in file_data["data"]["links"]:
            download_url = file_data["data"]["links"]["download"]
            
            # Get the file content with a direct request (using the same auth token)
            token = api_client._get_headers()["Authorization"]
            response = requests.get(
                download_url,
                headers={"Authorization": token},
                stream=True
            )
            response.raise_for_status()
            
            # Extract filename and content type
            content_disposition = response.headers.get("Content-Disposition", "")
            filename = file_data["data"]["name"]
            content_type = file_data["data"]["mime_type"]
            
            # Return the file as a streaming response
            return StreamingResponse(
                response.iter_content(chunk_size=8192),
                media_type=content_type,
                headers={"Content-Disposition": f"attachment; filename={filename}"}
            )
        
        raise HTTPException(status_code=404, detail="Download link not found")
    except requests.RequestException as e:
        if e.response is not None:
            status_code = e.response.status_code
            error_data = e.response.json() if e.response.content else {"errors": [{"title": str(e)}]}
            raise HTTPException(status_code=status_code, detail=error_data)
        raise HTTPException(status_code=500, detail={"errors": [{"title": str(e)}]})