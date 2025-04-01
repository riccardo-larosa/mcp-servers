import os
import tempfile
from unittest import TestCase

from fastapi.testclient import TestClient

from src.main import app
from src.services.config import config


class TestFilesAPI(TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Create a temporary directory for uploads during tests
        self.temp_dir = tempfile.TemporaryDirectory()
        os.environ["FILE_STORAGE_PATH"] = self.temp_dir.name
        # Add this line to set MAX_FILE_SIZE for tests
        os.environ["MAX_FILE_SIZE"] = "8388608"
        # Reload config to pick up new environment variables
        config._load_env()

    def tearDown(self):
        # Clean up the temporary directory
        self.temp_dir.cleanup()
        
    def test_health_check(self):
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {"status": "ok", "message": "Files API is running"}
        )
    
    def test_list_files_empty(self):
        response = self.client.get("/v2/files")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data["data"]), 0)
        self.assertIn("links", data)
        self.assertIn("meta", data)
    
    def test_create_file(self):
        # Create a temporary test file
        test_file_content = b"test file content"
        with tempfile.NamedTemporaryFile(suffix=".txt") as test_file:
            test_file.write(test_file_content)
            test_file.flush()
            
            # Upload the file
            with open(test_file.name, "rb") as f:
                response = self.client.post(
                    "/v2/files",
                    files={"file": ("test.txt", f, "text/plain")},
                    data={"file_name": "test.txt", "public_status": "true"}
                )
            
            self.assertEqual(response.status_code, 201)
            data = response.json()
            self.assertEqual(data["data"]["name"], "test.txt")
            self.assertEqual(data["data"]["file_extension"], "txt")
            file_id = data["data"]["id"]
            
            # Get the file
            response = self.client.get(f"/v2/files/{file_id}")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["data"]["id"], file_id)
            
            # Download the file
            response = self.client.get(f"/v2/files/{file_id}/download")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.content, test_file_content)
            
            # List files
            response = self.client.get("/v2/files")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(len(response.json()["data"]), 1)
            
            # Delete the file
            response = self.client.delete(f"/v2/files/{file_id}")
            self.assertEqual(response.status_code, 204)
            
            # Verify it's gone
            response = self.client.get(f"/v2/files/{file_id}")
            self.assertEqual(response.status_code, 404)