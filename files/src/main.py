from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from src.api.router import api_router
from src.middleware.auth_middleware import AuthMiddleware
from src.services.config import config

# Create uploads directory if it doesn't exist
upload_dir = Path(config.FILE_STORAGE_PATH)
upload_dir.mkdir(exist_ok=True, parents=True)

# Convert servers config to OpenAPI format
servers = [
    {"url": str(server.url), "description": server.description}
    for server in config.SERVERS
]

app = FastAPI(
    title="Files API",
    description="API for managing files in the Elastic Path commerce platform",
    version="0.1.0",
    servers=servers,
    openapi_tags=[
        {"name": "Files", "description": "Operations with files"},
    ],
)

# Mount static files
app.mount("/static", StaticFiles(directory="src/static"), name="static")

# Add security scheme to OpenAPI documentation
app.swagger_ui_init_oauth = {"usePkceWithAuthorizationCodeGrant": True}

# Security scheme specification
app.openapi_components = {
    "securitySchemes": {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
        }
    }
}
app.openapi_security = [{"bearerAuth": []}]

# Add middlewares
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(AuthMiddleware)

# Include routers
app.include_router(api_router, prefix="/v2")


@app.exception_handler(HTTPException)
def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"errors": [{"title": exc.detail}]},
    )


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Files API is running"}


@app.get("/token", include_in_schema=False)
def get_debug_token():
    """Returns an access token for testing (development only)"""
    from src.services.auth_service import auth_service
    
    # if not config.DISABLE_AUTH:
    #     return {"error": "Token endpoint only available in development mode"}
    
    try:
        token = auth_service.get_access_token()
        return {"access_token": token, "token_type": "bearer"}
    except Exception as e:
        return {"error": str(e)}


@app.get("/favicon.ico")
async def favicon():
    return FileResponse("src/static/favicon.ico")


if __name__ == "__main__":
    import uvicorn

    host = config.HOST
    port = config.PORT
    debug = config.DEBUG

    uvicorn.run("main:app", host=host, port=port, reload=debug)