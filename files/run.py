#!/usr/bin/env python
import sys
import uvicorn
from src.services.config import config

if __name__ == "__main__":
    print(f"Starting Files API server on http://{config.HOST}:{config.PORT}")
    print(f"Debug mode: {config.DEBUG}")
    print(f"Using base URL: {config.BASE_URL}")
    print("Press Ctrl+C to stop")
    
    uvicorn.run("src.main:app", host=config.HOST, port=config.PORT, reload=config.DEBUG)