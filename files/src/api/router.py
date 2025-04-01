from fastapi import APIRouter, Depends

from .files import router as files_router
from .auth import verify_token

api_router = APIRouter(dependencies=[Depends(verify_token)])

api_router.include_router(files_router, prefix="/files", tags=["Files"])
