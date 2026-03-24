"""
Test Inspection Forms API - Pressure Test Form and Aboveground Inspection
Tests for the new inspection forms feature in project details
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "j.carrero@ohsmspr.com"
TEST_PASSWORD = "Admin2024!"

# Known project from agent context
TEST_PROJECT_ID = "proj_bfc46dbbc812"  # Janssen project

class TestInspectionFormsAPI:
    """Test suite for Inspection Forms API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and authenticate"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code}")
        
        # Extract token from cookies
        self.cookies = login_response.cookies
        yield
    
    # ==================== GET INSPECTION FORMS ====================
    
    def test_get_inspection_forms_for_project(self):
        """Test GET /api/inspection-forms - should return both form types"""
        response = self.session.get(
            f"{BASE_URL}/api/inspection-forms",
            params={"project_id": TEST_PROJECT_ID},
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "pressure_test_forms" in data, "Missing pressure_test_forms key"
        assert "aboveground_inspections" in data, "Missing aboveground_inspections key"
        assert isinstance(data["pressure_test_forms"], list), "pressure_test_forms should be a list"
        assert isinstance(data["aboveground_inspections"], list), "aboveground_inspections should be a list"
        
        print(f"✓ Found {len(data['pressure_test_forms'])} pressure test forms")
        print(f"✓ Found {len(data['aboveground_inspections'])} aboveground inspections")
    
    def test_get_inspection_forms_filter_by_type(self):
        """Test filtering by form_type parameter"""
        # Test pressure_test filter
        response = self.session.get(
            f"{BASE_URL}/api/inspection-forms",
            params={"project_id": TEST_PROJECT_ID, "form_type": "pressure_test"},
            cookies=self.cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "pressure_test_forms" in data
        print(f"✓ Pressure test filter works")
        
        # Test aboveground_inspection filter
        response = self.session.get(
            f"{BASE_URL}/api/inspection-forms",
            params={"project_id": TEST_PROJECT_ID, "form_type": "aboveground_inspection"},
            cookies=self.cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "aboveground_inspections" in data
        print(f"✓ Aboveground inspection filter works")
    
    # ==================== PRESSURE TEST FORM CRUD ====================
    
    def test_create_pressure_test_form(self):
        """Test POST /api/pressure-test-forms - create new form"""
        form_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building A",
            "area": "Test Area 1",
            "system_no": "SYS-001",
            "system_description": "TEST Pressure Test System",
            "test_package_no": "PKG-001",
            "test_type": ["hydrostatic", "pneumatic"],
            "pid_entries": [{"pid_no": "PID-001", "rev": "A", "na": False}],
            "lines_included_in_test": "Line 1, Line 2, Line 3",
            "test_media": "Water",
            "actual_test_media_temp": "25°C",
            "test_media_min_temp_limit": "15°C",
            "ambient_temp_min_req": "10°C"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/pressure-test-forms",
            json=form_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify response has required fields
        assert "form_id" in data, "Missing form_id in response"
        assert "form_number" in data, "Missing form_number in response"
        assert data["status"] == "draft", "Initial status should be draft"
        assert data["system_description"] == "TEST Pressure Test System"
        
        # Store form_id for cleanup
        self.created_ptf_id = data["form_id"]
        print(f"✓ Created pressure test form: {data['form_number']}")
        
        return data
    
    def test_get_pressure_test_form_by_id(self):
        """Test GET /api/pressure-test-forms/{form_id}"""
        # First create a form
        created = self.test_create_pressure_test_form()
        form_id = created["form_id"]
        
        # Then retrieve it
        response = self.session.get(
            f"{BASE_URL}/api/pressure-test-forms/{form_id}",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Get failed: {response.text}"
        data = response.json()
        
        assert data["form_id"] == form_id
        assert data["system_description"] == "TEST Pressure Test System"
        print(f"✓ Retrieved pressure test form: {data['form_number']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/pressure-test-forms/{form_id}", cookies=self.cookies)
    
    def test_update_pressure_test_form(self):
        """Test PUT /api/pressure-test-forms/{form_id}"""
        # Create a form first
        created = self.test_create_pressure_test_form()
        form_id = created["form_id"]
        
        # Update the form
        updated_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building B Updated",
            "area": "Updated Area",
            "system_no": "SYS-002",
            "system_description": "TEST Updated System Description",
            "test_package_no": "PKG-002",
            "test_type": ["static"],
            "pid_entries": [{"pid_no": "PID-002", "rev": "B", "na": False}],
            "lines_included_in_test": "Updated lines",
            "test_media": "Air",
            "remarks": "This is an update test"
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/pressure-test-forms/{form_id}",
            json=updated_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data["building"] == "Building B Updated"
        assert data["system_description"] == "TEST Updated System Description"
        assert data["form_id"] == form_id  # Should preserve form_id
        print(f"✓ Updated pressure test form successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/pressure-test-forms/{form_id}", cookies=self.cookies)
    
    def test_delete_pressure_test_form(self):
        """Test DELETE /api/pressure-test-forms/{form_id}"""
        # Create a form first
        created = self.test_create_pressure_test_form()
        form_id = created["form_id"]
        
        # Delete the form
        response = self.session.delete(
            f"{BASE_URL}/api/pressure-test-forms/{form_id}",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data["message"] == "Formulario eliminado"
        
        # Verify it's deleted
        get_response = self.session.get(
            f"{BASE_URL}/api/pressure-test-forms/{form_id}",
            cookies=self.cookies
        )
        assert get_response.status_code == 404
        print(f"✓ Deleted pressure test form successfully")
    
    # ==================== ABOVEGROUND INSPECTION CRUD ====================
    
    def test_create_aboveground_inspection(self):
        """Test POST /api/aboveground-inspections - create new form"""
        form_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building C",
            "area": "Pipe Area 1",
            "system_no": "PIPE-001",
            "system_description": "TEST Aboveground Pipe System",
            "pid_isometric_rev": "Rev. A",
            "inspection_lines": [
                {
                    "line_number": "L-001",
                    "material": "Steel",
                    "size": "4 inch",
                    "joints_gaskets_washers": "A",
                    "clearance": "A",
                    "supports_guides_anchors": "A",
                    "valves_accessible": "A",
                    "slope": "A",
                    "dead_legs": "N/A",
                    "alignment_orientation": "A",
                    "vents_drains": "A",
                    "initials": "JC",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "remarks": "Test line"
                }
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/aboveground-inspections",
            json=form_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify response has required fields
        assert "form_id" in data, "Missing form_id in response"
        assert "form_number" in data, "Missing form_number in response"
        assert data["status"] == "draft", "Initial status should be draft"
        assert data["system_description"] == "TEST Aboveground Pipe System"
        
        self.created_agi_id = data["form_id"]
        print(f"✓ Created aboveground inspection: {data['form_number']}")
        
        return data
    
    def test_get_aboveground_inspection_by_id(self):
        """Test GET /api/aboveground-inspections/{form_id}"""
        # First create a form
        created = self.test_create_aboveground_inspection()
        form_id = created["form_id"]
        
        # Then retrieve it
        response = self.session.get(
            f"{BASE_URL}/api/aboveground-inspections/{form_id}",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Get failed: {response.text}"
        data = response.json()
        
        assert data["form_id"] == form_id
        assert data["system_description"] == "TEST Aboveground Pipe System"
        assert len(data["inspection_lines"]) == 1
        print(f"✓ Retrieved aboveground inspection: {data['form_number']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/aboveground-inspections/{form_id}", cookies=self.cookies)
    
    def test_update_aboveground_inspection(self):
        """Test PUT /api/aboveground-inspections/{form_id}"""
        # Create a form first
        created = self.test_create_aboveground_inspection()
        form_id = created["form_id"]
        
        # Update the form
        updated_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building D Updated",
            "area": "Updated Pipe Area",
            "system_no": "PIPE-002",
            "system_description": "TEST Updated Pipe System",
            "pid_isometric_rev": "Rev. B",
            "inspection_lines": [
                {
                    "line_number": "L-002",
                    "material": "Copper",
                    "size": "2 inch",
                    "joints_gaskets_washers": "A",
                    "clearance": "N/AC",
                    "supports_guides_anchors": "A",
                    "valves_accessible": "A",
                    "slope": "N/A",
                    "dead_legs": "A",
                    "alignment_orientation": "A",
                    "vents_drains": "A",
                    "initials": "JC",
                    "date": datetime.now().strftime("%Y-%m-%d"),
                    "remarks": "Updated test line"
                }
            ]
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/aboveground-inspections/{form_id}",
            json=updated_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        
        assert data["building"] == "Building D Updated"
        assert data["system_description"] == "TEST Updated Pipe System"
        assert data["form_id"] == form_id  # Should preserve form_id
        print(f"✓ Updated aboveground inspection successfully")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/aboveground-inspections/{form_id}", cookies=self.cookies)
    
    def test_delete_aboveground_inspection(self):
        """Test DELETE /api/aboveground-inspections/{form_id}"""
        # Create a form first
        created = self.test_create_aboveground_inspection()
        form_id = created["form_id"]
        
        # Delete the form
        response = self.session.delete(
            f"{BASE_URL}/api/aboveground-inspections/{form_id}",
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert data["message"] == "Formulario eliminado"
        
        # Verify it's deleted
        get_response = self.session.get(
            f"{BASE_URL}/api/aboveground-inspections/{form_id}",
            cookies=self.cookies
        )
        assert get_response.status_code == 404
        print(f"✓ Deleted aboveground inspection successfully")
    
    # ==================== SIGNATURE TESTS ====================
    
    def test_pressure_test_form_with_signatures(self):
        """Test creating pressure test form with signature data"""
        form_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building Sig",
            "area": "Signature Test Area",
            "system_no": "SIG-001",
            "system_description": "TEST Form with Signatures",
            "test_type": ["hydrostatic"],
            "contractor_release_name": "John Contractor",
            "contractor_release_signature": {
                "name": "John Contractor",
                "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "date": datetime.now().strftime("%Y-%m-%d")
            },
            "cst_release_name": "Jane CST",
            "test_performer_name": "Tech Test"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/pressure-test-forms",
            json=form_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Create with signature failed: {response.text}"
        data = response.json()
        
        assert data["contractor_release_name"] == "John Contractor"
        assert data["contractor_release_signature"] is not None
        assert data["contractor_release_signature"]["name"] == "John Contractor"
        print(f"✓ Created pressure test form with signatures")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/pressure-test-forms/{data['form_id']}", cookies=self.cookies)
    
    def test_aboveground_inspection_with_signatures(self):
        """Test creating aboveground inspection with signature data"""
        form_data = {
            "project_id": TEST_PROJECT_ID,
            "building": "Building Sig",
            "system_description": "TEST Aboveground with Signatures",
            "contractor_name": "Mike Contractor",
            "contractor_signature": {
                "name": "Mike Contractor",
                "signature_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "date": datetime.now().strftime("%Y-%m-%d")
            },
            "cst_representative_name": "Sarah CST",
            "inspection_lines": []
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/aboveground-inspections",
            json=form_data,
            cookies=self.cookies
        )
        
        assert response.status_code == 200, f"Create with signature failed: {response.text}"
        data = response.json()
        
        assert data["contractor_name"] == "Mike Contractor"
        assert data["contractor_signature"] is not None
        print(f"✓ Created aboveground inspection with signatures")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/aboveground-inspections/{data['form_id']}", cookies=self.cookies)
    
    # ==================== EDGE CASES ====================
    
    def test_get_inspection_forms_invalid_project(self):
        """Test getting forms for non-existent project returns empty arrays"""
        response = self.session.get(
            f"{BASE_URL}/api/inspection-forms",
            params={"project_id": "invalid_project_xyz"},
            cookies=self.cookies
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["pressure_test_forms"] == []
        assert data["aboveground_inspections"] == []
        print(f"✓ Invalid project returns empty arrays")
    
    def test_get_nonexistent_pressure_test_form(self):
        """Test getting non-existent pressure test form returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/pressure-test-forms/nonexistent_form_123",
            cookies=self.cookies
        )
        
        assert response.status_code == 404
        print(f"✓ Nonexistent form returns 404")
    
    def test_get_nonexistent_aboveground_inspection(self):
        """Test getting non-existent aboveground inspection returns 404"""
        response = self.session.get(
            f"{BASE_URL}/api/aboveground-inspections/nonexistent_form_456",
            cookies=self.cookies
        )
        
        assert response.status_code == 404
        print(f"✓ Nonexistent form returns 404")


# Cleanup function to remove test data
def cleanup_test_forms():
    """Cleanup any TEST forms created during testing"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    login_response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        return
    
    cookies = login_response.cookies
    
    # Get all forms for the test project
    response = session.get(
        f"{BASE_URL}/api/inspection-forms",
        params={"project_id": TEST_PROJECT_ID},
        cookies=cookies
    )
    
    if response.status_code == 200:
        data = response.json()
        
        # Delete test pressure test forms
        for form in data.get("pressure_test_forms", []):
            if "TEST" in form.get("system_description", ""):
                session.delete(f"{BASE_URL}/api/pressure-test-forms/{form['form_id']}", cookies=cookies)
                print(f"Cleaned up pressure test form: {form['form_id']}")
        
        # Delete test aboveground inspections
        for form in data.get("aboveground_inspections", []):
            if "TEST" in form.get("system_description", ""):
                session.delete(f"{BASE_URL}/api/aboveground-inspections/{form['form_id']}", cookies=cookies)
                print(f"Cleaned up aboveground inspection: {form['form_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
