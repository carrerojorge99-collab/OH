# MRR (Material Receiving Report) Backend Tests
# Tests CRUD operations and status changes for MRR feature

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carrerojorge99@gmail.com"
TEST_PASSWORD = "12345678"

# Test data
TEST_PROJECT_ID = "proj_bfc46dbbc812"  # Janssen project

class TestMRREndpoints:
    """Test MRR CRUD operations and status changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        # Store session cookie
        self.session.cookies = login_response.cookies
        yield
        
    def test_01_get_mrr_stats(self):
        """Test GET /api/projects/{project_id}/mrr-stats"""
        response = self.session.get(f"{BASE_URL}/api/projects/{TEST_PROJECT_ID}/mrr-stats")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total" in data, "Missing 'total' in response"
        assert "draft" in data, "Missing 'draft' in response"
        assert "pending" in data, "Missing 'pending' in response"
        assert "received" in data, "Missing 'received' in response"
        assert "inspected" in data, "Missing 'inspected' in response"
        print(f"MRR Stats: {data}")
        
    def test_02_get_mrrs_by_project(self):
        """Test GET /api/mrrs?project_id={project_id}"""
        response = self.session.get(f"{BASE_URL}/api/mrrs?project_id={TEST_PROJECT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"Found {len(data)} MRRs for project")
        
        # Check existing MRR if present
        if len(data) > 0:
            mrr = data[0]
            assert "mrr_id" in mrr, "Missing mrr_id"
            assert "mrr_number" in mrr, "Missing mrr_number"
            assert "supplier_name" in mrr, "Missing supplier_name"
            assert "received_by" in mrr, "Missing received_by"
            assert "status" in mrr, "Missing status"
            print(f"First MRR: {mrr['mrr_number']} - {mrr['supplier_name']}")
            
    def test_03_create_mrr(self):
        """Test POST /api/mrrs - Create new MRR"""
        mrr_data = {
            "project_id": TEST_PROJECT_ID,
            "supplier_name": "TEST_Supplier ABC",
            "supplier_company": "ABC Materials Inc.",
            "po_number": "PO-TEST-2025-001",
            "delivery_date": "2025-01-15",
            "received_by": "TEST_Inspector Juan",
            "description": "Test MRR for automated testing",
            "materials": "- Steel pipes (10 units)\n- Fittings (20 units)",
            "notes": "Automated test - can be deleted",
            "attachments": []
        }
        
        response = self.session.post(f"{BASE_URL}/api/mrrs", json=mrr_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mrr_id" in data, "Missing mrr_id in response"
        assert "mrr_number" in data, "Missing mrr_number in response"
        assert data["supplier_name"] == mrr_data["supplier_name"], "Supplier name mismatch"
        assert data["received_by"] == mrr_data["received_by"], "Received by mismatch"
        assert data["status"] == "draft", "New MRR should be in draft status"
        
        # Store for subsequent tests
        self.__class__.created_mrr_id = data["mrr_id"]
        self.__class__.created_mrr_number = data["mrr_number"]
        print(f"Created MRR: {data['mrr_number']} with ID: {data['mrr_id']}")
        
    def test_04_get_created_mrr(self):
        """Test GET /api/mrrs/{mrr_id} - Verify created MRR"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        response = self.session.get(f"{BASE_URL}/api/mrrs/{mrr_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["mrr_id"] == mrr_id, "MRR ID mismatch"
        assert data["supplier_name"] == "TEST_Supplier ABC", "Supplier name not persisted"
        print(f"Retrieved MRR: {data['mrr_number']}")
        
    def test_05_update_mrr(self):
        """Test PUT /api/mrrs/{mrr_id} - Update MRR"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        update_data = {
            "description": "Updated test description",
            "materials": "- Steel pipes (15 units)\n- Fittings (25 units)\n- Gaskets (10 units)",
            "notes": "Updated by automated test"
        }
        
        response = self.session.put(f"{BASE_URL}/api/mrrs/{mrr_id}", json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["description"] == update_data["description"], "Description not updated"
        print(f"Updated MRR: {mrr_id}")
        
    def test_06_change_status_to_pending(self):
        """Test PUT /api/mrrs/{mrr_id}/status - Change to pending"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        response = self.session.put(
            f"{BASE_URL}/api/mrrs/{mrr_id}/status",
            json={"status": "pending"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify status changed
        get_response = self.session.get(f"{BASE_URL}/api/mrrs/{mrr_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["status"] == "pending", f"Expected 'pending', got '{data['status']}'"
        print(f"Status changed to: pending")
        
    def test_07_change_status_to_received(self):
        """Test PUT /api/mrrs/{mrr_id}/status - Change to received"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        response = self.session.put(
            f"{BASE_URL}/api/mrrs/{mrr_id}/status",
            json={"status": "received"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify status changed
        get_response = self.session.get(f"{BASE_URL}/api/mrrs/{mrr_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["status"] == "received", f"Expected 'received', got '{data['status']}'"
        print(f"Status changed to: received")
        
    def test_08_change_status_to_inspected(self):
        """Test PUT /api/mrrs/{mrr_id}/status - Change to inspected"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        response = self.session.put(
            f"{BASE_URL}/api/mrrs/{mrr_id}/status",
            json={"status": "inspected"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify status changed
        get_response = self.session.get(f"{BASE_URL}/api/mrrs/{mrr_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["status"] == "inspected", f"Expected 'inspected', got '{data['status']}'"
        print(f"Status changed to: inspected")
        
    def test_09_delete_mrr(self):
        """Test DELETE /api/mrrs/{mrr_id} - Delete test MRR"""
        mrr_id = getattr(self.__class__, 'created_mrr_id', None)
        if not mrr_id:
            pytest.skip("No MRR created in previous test")
            
        response = self.session.delete(f"{BASE_URL}/api/mrrs/{mrr_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/mrrs/{mrr_id}")
        assert get_response.status_code == 404, "MRR should not exist after deletion"
        print(f"Deleted MRR: {mrr_id}")
        
    def test_10_form_validation_required_fields(self):
        """Test POST /api/mrrs - Validation of required fields"""
        # Missing supplier_name and received_by
        invalid_data = {
            "project_id": TEST_PROJECT_ID,
            "description": "Test without required fields"
        }
        
        response = self.session.post(f"{BASE_URL}/api/mrrs", json=invalid_data)
        
        # Should fail validation (422) or return error
        assert response.status_code in [422, 400], f"Expected validation error, got {response.status_code}"
        print(f"Validation correctly rejected incomplete data: {response.status_code}")
        
    def test_11_get_existing_mrr(self):
        """Test GET /api/mrrs/{mrr_id} - Get existing MRR from curl test"""
        existing_mrr_id = "mrr_9a645d41e92a"
        
        response = self.session.get(f"{BASE_URL}/api/mrrs/{existing_mrr_id}")
        
        if response.status_code == 404:
            pytest.skip("Existing MRR not found - may have been deleted")
            
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "mrr_id" in data, "Missing mrr_id"
        assert "mrr_number" in data, "Missing mrr_number"
        print(f"Existing MRR: {data.get('mrr_number')} - Status: {data.get('status')}")
        
    def test_12_get_mrr_not_found(self):
        """Test GET /api/mrrs/{mrr_id} - 404 for non-existent MRR"""
        response = self.session.get(f"{BASE_URL}/api/mrrs/mrr_nonexistent123")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for non-existent MRR")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
