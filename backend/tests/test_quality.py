"""
Quality Feature Backend Tests
Tests for Quality Checklists, Non-Conformities, MRR, and Pressure Tests
within the Quality tab of ProjectDetail.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
PROJECT_ID = "proj_bfc46dbbc812"  # Janssen project with existing MRR and pressure test data

class TestQualityChecklists:
    """Quality Checklist CRUD tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        # Login as super_admin
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        return s
    
    @pytest.fixture(scope="class")
    def test_checklist_id(self, session):
        """Create a test checklist for CRUD operations"""
        unique_title = f"TEST_Checklist_{uuid.uuid4().hex[:8]}"
        payload = {
            "project_id": PROJECT_ID,
            "title": unique_title,
            "category": "electrical",
            "inspector": "Test Inspector",
            "inspection_date": "2026-01-10",
            "notes": "Test checklist notes",
            "items": [
                {"description": "Check voltage levels", "status": "pending", "comments": ""},
                {"description": "Verify grounding", "status": "pass", "comments": "All good"}
            ]
        }
        response = session.post(f"{BASE_URL}/api/quality/checklists", json=payload)
        assert response.status_code == 200, f"Failed to create test checklist: {response.text}"
        data = response.json()
        return data["checklist_id"]
    
    def test_get_checklists_for_project(self, session):
        """GET /api/quality/checklists?project_id={project_id}"""
        response = session.get(f"{BASE_URL}/api/quality/checklists?project_id={PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET checklists: {len(data)} checklists found for project")
    
    def test_create_checklist(self, session):
        """POST /api/quality/checklists - Create a new checklist"""
        unique_title = f"TEST_New_Checklist_{uuid.uuid4().hex[:8]}"
        payload = {
            "project_id": PROJECT_ID,
            "title": unique_title,
            "category": "plumbing",
            "inspector": "QA Tester",
            "inspection_date": "2026-01-15",
            "notes": "Created by pytest",
            "items": [
                {"description": "Check pipe connections", "status": "pending"},
                {"description": "Test water pressure", "status": "pending"}
            ]
        }
        response = session.post(f"{BASE_URL}/api/quality/checklists", json=payload)
        assert response.status_code == 200, f"Create checklist failed: {response.text}"
        data = response.json()
        assert data["title"] == unique_title
        assert data["category"] == "plumbing"
        assert data["checklist_number"].startswith("QC-")
        assert data["status"] == "open"
        assert len(data["items"]) == 2
        print(f"✓ CREATE checklist: {data['checklist_number']} - {data['title']}")
        
        # Clean up - delete the test checklist
        session.delete(f"{BASE_URL}/api/quality/checklists/{data['checklist_id']}")
    
    def test_update_checklist(self, session, test_checklist_id):
        """PUT /api/quality/checklists/{id} - Update checklist"""
        payload = {
            "title": "Updated Test Checklist Title",
            "status": "in_progress"
        }
        response = session.put(f"{BASE_URL}/api/quality/checklists/{test_checklist_id}", json=payload)
        assert response.status_code == 200, f"Update checklist failed: {response.text}"
        data = response.json()
        assert data["title"] == "Updated Test Checklist Title"
        assert data["status"] == "in_progress"
        print(f"✓ UPDATE checklist: status changed to in_progress")
    
    def test_get_single_checklist(self, session, test_checklist_id):
        """GET /api/quality/checklists/{id}"""
        response = session.get(f"{BASE_URL}/api/quality/checklists/{test_checklist_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["checklist_id"] == test_checklist_id
        print(f"✓ GET single checklist: {data['checklist_number']}")
    
    def test_delete_checklist(self, session, test_checklist_id):
        """DELETE /api/quality/checklists/{id}"""
        response = session.delete(f"{BASE_URL}/api/quality/checklists/{test_checklist_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Checklist eliminado"
        print(f"✓ DELETE checklist: successfully deleted")
        
        # Verify it's deleted
        verify_resp = session.get(f"{BASE_URL}/api/quality/checklists/{test_checklist_id}")
        assert verify_resp.status_code == 404


class TestNonConformities:
    """Non-Conformity CRUD tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        return s
    
    @pytest.fixture(scope="class")
    def test_nc_id(self, session):
        """Create a test NC for CRUD operations"""
        unique_title = f"TEST_NC_{uuid.uuid4().hex[:8]}"
        payload = {
            "project_id": PROJECT_ID,
            "title": unique_title,
            "description": "Test non-conformity description",
            "category": "materials",
            "severity": "minor",
            "location": "Area A",
            "assigned_to": "Test Engineer",
            "corrective_action": "Proposed corrective action",
            "due_date": "2026-01-20"
        }
        response = session.post(f"{BASE_URL}/api/quality/nonconformities", json=payload)
        assert response.status_code == 200, f"Failed to create test NC: {response.text}"
        data = response.json()
        return data["nc_id"]
    
    def test_get_nonconformities_for_project(self, session):
        """GET /api/quality/nonconformities?project_id={project_id}"""
        response = session.get(f"{BASE_URL}/api/quality/nonconformities?project_id={PROJECT_ID}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET NCs: {len(data)} non-conformities found for project")
    
    def test_create_nonconformity(self, session):
        """POST /api/quality/nonconformities - Create a new NC"""
        unique_title = f"TEST_New_NC_{uuid.uuid4().hex[:8]}"
        payload = {
            "project_id": PROJECT_ID,
            "title": unique_title,
            "description": "Critical welding defect found in pipe section",
            "category": "workmanship",
            "severity": "critical",
            "location": "Building B, Floor 3",
            "assigned_to": "Welding Supervisor",
            "corrective_action": "Re-weld entire section"
        }
        response = session.post(f"{BASE_URL}/api/quality/nonconformities", json=payload)
        assert response.status_code == 200, f"Create NC failed: {response.text}"
        data = response.json()
        assert data["title"] == unique_title
        assert data["severity"] == "critical"
        assert data["nc_number"].startswith("NC-")
        assert data["status"] == "open"
        print(f"✓ CREATE NC: {data['nc_number']} - severity: {data['severity']}")
        
        # Clean up
        session.delete(f"{BASE_URL}/api/quality/nonconformities/{data['nc_id']}")
    
    def test_update_nonconformity(self, session, test_nc_id):
        """PUT /api/quality/nonconformities/{id} - Update NC"""
        payload = {
            "status": "in_progress",
            "corrective_action": "Updated corrective action with new plan"
        }
        response = session.put(f"{BASE_URL}/api/quality/nonconformities/{test_nc_id}", json=payload)
        assert response.status_code == 200, f"Update NC failed: {response.text}"
        data = response.json()
        assert data["status"] == "in_progress"
        print(f"✓ UPDATE NC: status changed to in_progress")
    
    def test_update_nc_status_resolved(self, session, test_nc_id):
        """PUT /api/quality/nonconformities/{id} - Change status to resolved"""
        payload = {
            "status": "resolved",
            "resolution_notes": "Issue has been fixed by re-welding",
            "resolution_date": "2026-01-10"
        }
        response = session.put(f"{BASE_URL}/api/quality/nonconformities/{test_nc_id}", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"
        assert data["resolution_notes"] == "Issue has been fixed by re-welding"
        print(f"✓ UPDATE NC: status resolved with resolution notes")
    
    def test_get_single_nonconformity(self, session, test_nc_id):
        """GET /api/quality/nonconformities/{id}"""
        response = session.get(f"{BASE_URL}/api/quality/nonconformities/{test_nc_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["nc_id"] == test_nc_id
        print(f"✓ GET single NC: {data['nc_number']}")
    
    def test_delete_nonconformity(self, session, test_nc_id):
        """DELETE /api/quality/nonconformities/{id}"""
        response = session.delete(f"{BASE_URL}/api/quality/nonconformities/{test_nc_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "No-conformidad eliminada"
        print(f"✓ DELETE NC: successfully deleted")


class TestQualitySummary:
    """Quality Summary API tests"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        return s
    
    def test_get_quality_summary(self, session):
        """GET /api/quality/summary/{project_id} - Get quality summary with stats"""
        response = session.get(f"{BASE_URL}/api/quality/summary/{PROJECT_ID}")
        assert response.status_code == 200, f"Get quality summary failed: {response.text}"
        data = response.json()
        
        # Verify structure
        assert "project" in data
        assert "checklists" in data
        assert "nonconformities" in data
        assert "mrrs" in data
        assert "pressure_tests" in data
        assert "stats" in data
        
        # Verify stats structure
        stats = data["stats"]
        assert "total_checklists" in stats
        assert "open_checklists" in stats
        assert "completed_checklists" in stats
        assert "total_nc" in stats
        assert "open_nc" in stats
        assert "resolved_nc" in stats
        assert "critical_nc" in stats
        assert "total_mrrs" in stats
        assert "total_pressure_tests" in stats
        
        print(f"✓ GET quality summary:")
        print(f"  - Checklists: {stats['total_checklists']} total, {stats['completed_checklists']} completed")
        print(f"  - NCs: {stats['total_nc']} total, {stats['critical_nc']} critical")
        print(f"  - MRRs: {stats['total_mrrs']}")
        print(f"  - Pressure Tests: {stats['total_pressure_tests']}")


class TestExistingMRRData:
    """Test that existing MRR data is accessible via Quality section"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        assert login_resp.status_code == 200
        return s
    
    def test_mrr_data_available(self, session):
        """GET /api/mrrs?project_id={project_id} - MRR endpoint still works"""
        response = session.get(f"{BASE_URL}/api/mrrs?project_id={PROJECT_ID}")
        assert response.status_code == 200, f"MRR endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        # Expect 2 MRRs based on agent context
        print(f"✓ MRR endpoint: {len(data)} MRRs found")
        if len(data) >= 2:
            print(f"  - First MRR: {data[0].get('mrr_number', 'N/A')} - {data[0].get('supplier', 'N/A')}")


class TestExistingPressureTestData:
    """Test that existing Pressure Test data is accessible via inspection-forms API"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        login_resp = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        assert login_resp.status_code == 200
        return s
    
    def test_pressure_tests_data_available(self, session):
        """GET /api/inspection-forms?project_id={project_id} - Returns pressure test forms"""
        response = session.get(f"{BASE_URL}/api/inspection-forms?project_id={PROJECT_ID}")
        assert response.status_code == 200, f"Inspection forms endpoint failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # The endpoint returns a dict with pressure_test_forms and aboveground_inspections
        assert isinstance(data, dict), "Expected dict response"
        assert "pressure_test_forms" in data, "Missing pressure_test_forms key"
        
        pressure_tests = data["pressure_test_forms"]
        assert isinstance(pressure_tests, list)
        
        # Expect 4 pressure tests based on agent context
        print(f"✓ Pressure Test Forms: {len(pressure_tests)} tests found")
        if len(pressure_tests) > 0:
            print(f"  - First test: {pressure_tests[0].get('form_number', 'N/A')} - Status: {pressure_tests[0].get('test_result', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
