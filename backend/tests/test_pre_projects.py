"""
Pre-Projects API Tests
Testing CRUD operations for Pre-Projects module (pipeline/kanban)
Stages: new, contacted, negotiation, quoted, won, lost
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carrerojorge99@gmail.com"
TEST_PASSWORD = "12345678"

class TestPreProjectsAPI:
    """Pre-Projects CRUD and conversion tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("session_token") or login_response.cookies.get("session_token")
            if token:
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.session.cookies.set("session_token", token)
        else:
            pytest.skip("Authentication failed - skipping tests")
        
        self.created_ids = []  # Track created IDs for cleanup
        yield
        
        # Cleanup created test data
        for pre_project_id in self.created_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
            except:
                pass

    # ==================== LIST PRE-PROJECTS ====================
    def test_list_pre_projects(self):
        """Test GET /api/pre-projects - list all pre-projects"""
        response = self.session.get(f"{BASE_URL}/api/pre-projects")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ List pre-projects: Found {len(data)} pre-projects")

    # ==================== GET STATS ====================
    def test_get_stats(self):
        """Test GET /api/pre-projects/stats - get statistics by stage"""
        response = self.session.get(f"{BASE_URL}/api/pre-projects/stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "by_stage" in data, "Stats should contain 'by_stage'"
        assert "total_count" in data, "Stats should contain 'total_count'"
        assert "total_budget" in data, "Stats should contain 'total_budget'"
        
        print(f"✅ Stats: total_count={data['total_count']}, total_budget=${data['total_budget']}")
        print(f"   by_stage: {data['by_stage']}")

    # ==================== CREATE PRE-PROJECT ====================
    def test_create_pre_project(self):
        """Test POST /api/pre-projects - create a new pre-project"""
        payload = {
            "title": "TEST_PreProject_Create",
            "client_name": "Test Client Inc",
            "client_company": "Test Company",
            "client_email": "test@testclient.com",
            "client_phone": "787-123-4567",
            "description": "Test pre-project for automated testing",
            "location": "San Juan, PR",
            "work_type": "Construction",
            "estimated_budget": 25000.00,
            "close_probability": 75,
            "stage": "new"
        }
        
        response = self.session.post(f"{BASE_URL}/api/pre-projects", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pre_project_id" in data, "Response should contain pre_project_id"
        assert data["title"] == payload["title"], f"Title mismatch: {data.get('title')}"
        assert data["client_name"] == payload["client_name"], f"Client name mismatch"
        assert data["estimated_budget"] == payload["estimated_budget"], "Budget mismatch"
        assert data["stage"] == "new", "Stage should be 'new'"
        
        self.created_ids.append(data["pre_project_id"])
        print(f"✅ Created pre-project: {data['pre_project_id']}")
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{data['pre_project_id']}")
        assert get_response.status_code == 200, "GET after create failed"
        retrieved = get_response.json()
        assert retrieved["title"] == payload["title"], "Data not persisted correctly"
        print(f"✅ Verified persistence via GET")

    # ==================== UPDATE PRE-PROJECT ====================
    def test_update_pre_project(self):
        """Test PUT /api/pre-projects/{id} - update an existing pre-project"""
        # First create a pre-project
        create_payload = {
            "title": "TEST_PreProject_Update",
            "client_name": "Original Client",
            "estimated_budget": 10000.00,
            "stage": "new"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Update the pre-project
        update_payload = {
            "title": "TEST_PreProject_Updated",
            "client_name": "Updated Client",
            "estimated_budget": 50000.00,
            "close_probability": 90
        }
        
        update_response = self.session.put(f"{BASE_URL}/api/pre-projects/{pre_project_id}", json=update_payload)
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        data = update_response.json()
        
        assert data["title"] == update_payload["title"], "Title not updated"
        assert data["client_name"] == update_payload["client_name"], "Client name not updated"
        assert data["estimated_budget"] == update_payload["estimated_budget"], "Budget not updated"
        
        # Verify with GET
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        assert retrieved["title"] == update_payload["title"], "Update not persisted"
        
        print(f"✅ Updated pre-project: {pre_project_id}")

    # ==================== UPDATE STAGE (DRAG-DROP) ====================
    def test_update_stage(self):
        """Test PUT /api/pre-projects/{id}/stage - update stage for Kanban drag-drop"""
        # Create pre-project in 'new' stage
        create_payload = {
            "title": "TEST_PreProject_Stage",
            "client_name": "Stage Test Client",
            "stage": "new"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Test stage progression: new -> contacted -> negotiation -> quoted -> won
        stages = ["contacted", "negotiation", "quoted", "won"]
        
        for target_stage in stages:
            stage_response = self.session.put(
                f"{BASE_URL}/api/pre-projects/{pre_project_id}/stage",
                json={"stage": target_stage}
            )
            
            assert stage_response.status_code == 200, f"Stage update to '{target_stage}' failed: {stage_response.text}"
            
            # Verify with GET
            get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
            assert get_response.status_code == 200
            current = get_response.json()
            assert current["stage"] == target_stage, f"Stage should be '{target_stage}', got '{current.get('stage')}'"
            
            print(f"  ✅ Stage updated to: {target_stage}")
        
        # Test moving to 'lost' stage
        lost_response = self.session.put(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/stage",
            json={"stage": "lost"}
        )
        assert lost_response.status_code == 200
        print(f"  ✅ Stage updated to: lost")
        print(f"✅ All stage transitions passed for {pre_project_id}")

    # ==================== DELETE PRE-PROJECT ====================
    def test_delete_pre_project(self):
        """Test DELETE /api/pre-projects/{id} - delete a pre-project"""
        # Create pre-project to delete
        create_payload = {
            "title": "TEST_PreProject_Delete",
            "client_name": "Delete Test Client"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        
        # Delete it
        delete_response = self.session.delete(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion with GET (should return 404)
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert get_response.status_code == 404, "Deleted pre-project should not be found"
        
        print(f"✅ Deleted pre-project: {pre_project_id}")

    # ==================== CONVERT TO PROJECT ====================
    def test_convert_to_project(self):
        """Test POST /api/pre-projects/{id}/convert-to-project - convert won pre-project to project"""
        # Create pre-project in 'won' stage
        create_payload = {
            "title": "TEST_PreProject_ConvertToProject",
            "client_name": "Convert Project Client",
            "client_company": "Convert Project Company",
            "description": "To be converted to full project",
            "estimated_budget": 75000.00,
            "stage": "won"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Convert to project
        convert_response = self.session.post(f"{BASE_URL}/api/pre-projects/{pre_project_id}/convert-to-project")
        
        assert convert_response.status_code == 200, f"Convert to project failed: {convert_response.text}"
        convert_data = convert_response.json()
        
        assert "message" in convert_data, "Response should contain message"
        assert "project" in convert_data, "Response should contain project object"
        
        # Project ID is nested inside project object
        project_id = convert_data["project"].get("project_id")
        print(f"✅ Converted pre-project to project: {project_id}")
        
        # Verify pre-project has conversion flag (stores project_id, not boolean)
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert get_response.status_code == 200
        updated_pp = get_response.json()
        # Backend stores the project_id in converted_to_project field (truthy value)
        assert updated_pp.get("converted_to_project"), "converted_to_project flag not set"
        assert updated_pp.get("converted_to_project") == project_id, f"converted_to_project should be {project_id}"
        
        print(f"✅ Pre-project marked as converted with project_id: {project_id}")
        
        # Cleanup: delete the created project
        try:
            self.session.delete(f"{BASE_URL}/api/projects/{project_id}")
        except:
            pass

    # ==================== CONVERT TO ESTIMATE ====================
    def test_convert_to_estimate(self):
        """Test POST /api/pre-projects/{id}/convert-to-estimate - create estimate from pre-project"""
        # Create pre-project
        create_payload = {
            "title": "TEST_PreProject_ConvertToEstimate",
            "client_name": "Estimate Client",
            "description": "To be converted to cost estimate",
            "estimated_budget": 35000.00,
            "stage": "quoted"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Convert to estimate
        convert_response = self.session.post(f"{BASE_URL}/api/pre-projects/{pre_project_id}/convert-to-estimate")
        
        assert convert_response.status_code == 200, f"Convert to estimate failed: {convert_response.text}"
        convert_data = convert_response.json()
        
        assert "message" in convert_data, "Response should contain message"
        assert "estimate" in convert_data, "Response should contain estimate object"
        
        # Estimate ID is nested inside estimate object
        estimate_id = convert_data["estimate"].get("estimate_id")
        print(f"✅ Converted pre-project to estimate: {estimate_id}")
        
        # Verify pre-project has conversion flag (stores estimate_id, not boolean)
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert get_response.status_code == 200
        updated_pp = get_response.json()
        # Backend stores the estimate_id in converted_to_estimate field (truthy value)
        assert updated_pp.get("converted_to_estimate"), "converted_to_estimate flag not set"
        assert updated_pp.get("converted_to_estimate") == estimate_id, f"converted_to_estimate should be {estimate_id}"
        
        print(f"✅ Pre-project marked as converted to estimate with estimate_id: {estimate_id}")
        
        # Cleanup: delete the created estimate
        try:
            self.session.delete(f"{BASE_URL}/api/cost-estimates/{estimate_id}")
        except:
            pass

    # ==================== GET SINGLE PRE-PROJECT ====================
    def test_get_single_pre_project(self):
        """Test GET /api/pre-projects/{id} - get single pre-project"""
        # Create pre-project
        create_payload = {
            "title": "TEST_PreProject_GetSingle",
            "client_name": "Get Single Client",
            "estimated_budget": 12000.00,
            "close_probability": 60
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Get single pre-project
        get_response = self.session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        data = get_response.json()
        
        assert data["pre_project_id"] == pre_project_id
        assert data["title"] == create_payload["title"]
        assert data["client_name"] == create_payload["client_name"]
        assert data["estimated_budget"] == create_payload["estimated_budget"]
        
        print(f"✅ GET single pre-project: {pre_project_id}")

    # ==================== GET NON-EXISTENT PRE-PROJECT ====================
    def test_get_nonexistent_pre_project(self):
        """Test GET /api/pre-projects/{id} with non-existent ID - should return 404"""
        response = self.session.get(f"{BASE_URL}/api/pre-projects/pp_nonexistent12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✅ Non-existent pre-project returns 404 as expected")

    # ==================== INVALID STAGE ====================
    def test_invalid_stage_update(self):
        """Test PUT /api/pre-projects/{id}/stage with invalid stage - should fail"""
        # Create pre-project
        create_payload = {
            "title": "TEST_PreProject_InvalidStage",
            "client_name": "Invalid Stage Client"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/pre-projects", json=create_payload)
        assert create_response.status_code == 200
        created = create_response.json()
        pre_project_id = created["pre_project_id"]
        self.created_ids.append(pre_project_id)
        
        # Try invalid stage
        invalid_response = self.session.put(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/stage",
            json={"stage": "invalid_stage_name"}
        )
        
        # Should return 422 (validation error) or 400
        assert invalid_response.status_code in [400, 422], f"Expected 400/422, got {invalid_response.status_code}"
        print(f"✅ Invalid stage rejected with status {invalid_response.status_code}")


# Run tests if executed directly
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
