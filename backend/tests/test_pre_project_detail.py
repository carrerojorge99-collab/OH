"""
Pre-Project Detail Page Backend Tests
Testing new endpoints: logs (bitácora), documents, materials-estimate
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
TEST_EMAIL = "carrerojorge99@gmail.com"
TEST_PASSWORD = "12345678"

class TestPreProjectDetailAPI:
    """Test suite for Pre-Project Detail endpoints"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = s.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return s
    
    @pytest.fixture(scope="class")
    def test_pre_project(self, session):
        """Create a test pre-project for testing"""
        response = session.post(f"{BASE_URL}/api/pre-projects", json={
            "title": "TEST_Detail_PreProject",
            "client_name": "Test Client Detail",
            "client_company": "Test Corp Detail",
            "description": "Pre-project for detail page testing",
            "estimated_budget": 15000,
            "stage": "negotiation"
        })
        assert response.status_code == 200, f"Failed to create test pre-project: {response.text}"
        data = response.json()
        yield data
        
        # Cleanup - delete the test pre-project
        session.delete(f"{BASE_URL}/api/pre-projects/{data['pre_project_id']}")
    
    # ==================== LOGS (BITÁCORA) TESTS ====================
    
    def test_get_logs_empty(self, session, test_pre_project):
        """Test getting logs for a pre-project with no logs"""
        pp_id = test_pre_project['pre_project_id']
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/logs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/pre-projects/{pp_id}/logs - Empty logs list returned")
    
    def test_create_log(self, session, test_pre_project):
        """Test creating a log entry (bitácora)"""
        pp_id = test_pre_project['pre_project_id']
        log_data = {
            "log_type": "note",
            "title": "Test Log Entry",
            "description": "This is a test log entry for the pre-project",
            "hours_worked": 2.5
        }
        response = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/logs", json=log_data)
        assert response.status_code == 200, f"Failed to create log: {response.text}"
        data = response.json()
        
        assert "log_id" in data
        assert data["log_type"] == "note"
        assert data["title"] == "Test Log Entry"
        assert data["description"] == "This is a test log entry for the pre-project"
        assert data["hours_worked"] == 2.5
        assert "user_name" in data
        assert "created_at" in data
        
        print(f"✓ POST /api/pre-projects/{pp_id}/logs - Log created: {data['log_id']}")
        return data["log_id"]
    
    def test_get_logs_with_entries(self, session, test_pre_project):
        """Test getting logs after creating entries"""
        pp_id = test_pre_project['pre_project_id']
        
        # Create a log first
        session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/logs", json={
            "log_type": "contact",
            "title": "Client Contact",
            "description": "Called client to discuss project requirements"
        })
        
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/logs")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ GET /api/pre-projects/{pp_id}/logs - Found {len(data)} log entries")
    
    def test_update_log(self, session, test_pre_project):
        """Test updating a log entry"""
        pp_id = test_pre_project['pre_project_id']
        
        # Create a log first
        create_resp = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/logs", json={
            "log_type": "visit",
            "title": "Site Visit",
            "description": "Initial site visit"
        })
        log_id = create_resp.json()["log_id"]
        
        # Update the log
        update_data = {
            "log_type": "visit",
            "title": "Updated Site Visit",
            "description": "Updated description after the visit",
            "hours_worked": 4
        }
        response = session.put(f"{BASE_URL}/api/pre-projects/{pp_id}/logs/{log_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update log: {response.text}"
        data = response.json()
        
        assert data["title"] == "Updated Site Visit"
        assert data["description"] == "Updated description after the visit"
        assert data["hours_worked"] == 4
        
        print(f"✓ PUT /api/pre-projects/{pp_id}/logs/{log_id} - Log updated successfully")
    
    def test_delete_log(self, session, test_pre_project):
        """Test deleting a log entry"""
        pp_id = test_pre_project['pre_project_id']
        
        # Create a log first
        create_resp = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/logs", json={
            "log_type": "meeting",
            "title": "Meeting to delete",
            "description": "This log will be deleted"
        })
        log_id = create_resp.json()["log_id"]
        
        # Delete the log
        response = session.delete(f"{BASE_URL}/api/pre-projects/{pp_id}/logs/{log_id}")
        assert response.status_code == 200, f"Failed to delete log: {response.text}"
        
        # Verify it's deleted
        get_resp = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/logs")
        logs = get_resp.json()
        assert all(l["log_id"] != log_id for l in logs), "Log was not deleted"
        
        print(f"✓ DELETE /api/pre-projects/{pp_id}/logs/{log_id} - Log deleted successfully")
    
    def test_log_types(self, session, test_pre_project):
        """Test creating logs with different types"""
        pp_id = test_pre_project['pre_project_id']
        
        log_types = ["note", "contact", "visit", "meeting", "update", "problem"]
        for log_type in log_types:
            response = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/logs", json={
                "log_type": log_type,
                "title": f"Test {log_type} log",
                "description": f"Description for {log_type}"
            })
            assert response.status_code == 200, f"Failed to create {log_type} log: {response.text}"
        
        print(f"✓ All log types created successfully: {log_types}")
    
    # ==================== DOCUMENTS TESTS ====================
    
    def test_get_documents_empty(self, session, test_pre_project):
        """Test getting documents for a pre-project with no documents"""
        pp_id = test_pre_project['pre_project_id']
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/pre-projects/{pp_id}/documents - Empty documents list returned")
    
    def test_upload_document(self, session, test_pre_project):
        """Test uploading a document"""
        pp_id = test_pre_project['pre_project_id']
        
        # Create a simple test file
        files = {
            'file': ('test_document.txt', b'Test document content for pre-project', 'text/plain')
        }
        
        # Remove Content-Type header for multipart/form-data
        headers = dict(session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        response = session.post(
            f"{BASE_URL}/api/pre-projects/{pp_id}/documents",
            files=files,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to upload document: {response.text}"
        data = response.json()
        
        assert "document_id" in data
        assert data["original_filename"] == "test_document.txt"
        assert data["file_type"] == "text/plain"
        assert "uploaded_by_name" in data
        assert "uploaded_at" in data
        assert data["note"] == ""
        
        print(f"✓ POST /api/pre-projects/{pp_id}/documents - Document uploaded: {data['document_id']}")
        return data["document_id"]
    
    def test_add_note_to_document(self, session, test_pre_project):
        """Test adding a note to a document"""
        pp_id = test_pre_project['pre_project_id']
        
        # Upload a document first
        files = {
            'file': ('note_test.txt', b'Document to add note to', 'text/plain')
        }
        headers = dict(session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        upload_resp = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/documents", files=files, headers=headers)
        doc_id = upload_resp.json()["document_id"]
        
        # Add note to document
        response = session.put(
            f"{BASE_URL}/api/pre-projects/{pp_id}/documents/{doc_id}/note",
            json={"note": "This is a test note for the document"}
        )
        assert response.status_code == 200, f"Failed to add note: {response.text}"
        
        # Verify the note was saved
        get_resp = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/documents")
        docs = get_resp.json()
        doc = next((d for d in docs if d["document_id"] == doc_id), None)
        assert doc is not None
        assert doc["note"] == "This is a test note for the document"
        
        print(f"✓ PUT /api/pre-projects/{pp_id}/documents/{doc_id}/note - Note added successfully")
    
    def test_download_document(self, session, test_pre_project):
        """Test downloading a document"""
        pp_id = test_pre_project['pre_project_id']
        
        # Upload a document first
        test_content = b'Download test content'
        files = {
            'file': ('download_test.txt', test_content, 'text/plain')
        }
        headers = dict(session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        upload_resp = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/documents", files=files, headers=headers)
        doc_id = upload_resp.json()["document_id"]
        
        # Download the document
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/documents/{doc_id}/download")
        assert response.status_code == 200, f"Failed to download document: {response.text}"
        assert response.content == test_content
        
        print(f"✓ GET /api/pre-projects/{pp_id}/documents/{doc_id}/download - Document downloaded successfully")
    
    def test_delete_document(self, session, test_pre_project):
        """Test deleting a document"""
        pp_id = test_pre_project['pre_project_id']
        
        # Upload a document first
        files = {
            'file': ('delete_test.txt', b'Document to delete', 'text/plain')
        }
        headers = dict(session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        upload_resp = session.post(f"{BASE_URL}/api/pre-projects/{pp_id}/documents", files=files, headers=headers)
        doc_id = upload_resp.json()["document_id"]
        
        # Delete the document
        response = session.delete(f"{BASE_URL}/api/pre-projects/{pp_id}/documents/{doc_id}")
        assert response.status_code == 200, f"Failed to delete document: {response.text}"
        
        # Verify it's deleted
        get_resp = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/documents")
        docs = get_resp.json()
        assert all(d["document_id"] != doc_id for d in docs), "Document was not deleted"
        
        print(f"✓ DELETE /api/pre-projects/{pp_id}/documents/{doc_id} - Document deleted successfully")
    
    # ==================== MATERIALS ESTIMATE TESTS ====================
    
    def test_save_materials_estimate(self, session, test_pre_project):
        """Test saving materials estimate"""
        pp_id = test_pre_project['pre_project_id']
        
        estimate_data = {
            "materials": [
                {
                    "description": "PVC Pipe 2 inch",
                    "quantity": 100,
                    "unit": "pie",
                    "unit_cost": 5.50,
                    "total": 550
                },
                {
                    "description": "Cement",
                    "quantity": 20,
                    "unit": "bolsa",
                    "unit_cost": 12.00,
                    "total": 240
                }
            ],
            "equipment": [
                {
                    "description": "Excavator",
                    "quantity": 1,
                    "days": 5,
                    "rate": 500,
                    "total": 2500
                },
                {
                    "description": "Dump Truck",
                    "quantity": 2,
                    "days": 3,
                    "rate": 200,
                    "total": 1200
                }
            ]
        }
        
        response = session.put(
            f"{BASE_URL}/api/pre-projects/{pp_id}/materials-estimate",
            json=estimate_data
        )
        assert response.status_code == 200, f"Failed to save materials estimate: {response.text}"
        data = response.json()
        
        assert data["materials_total"] == 790  # 550 + 240
        assert data["equipment_total"] == 3700  # 2500 + 1200
        assert data["grand_total"] == 4490  # 790 + 3700
        
        print(f"✓ PUT /api/pre-projects/{pp_id}/materials-estimate - Estimate saved successfully")
        print(f"  Materials Total: ${data['materials_total']}, Equipment Total: ${data['equipment_total']}, Grand Total: ${data['grand_total']}")
    
    def test_verify_materials_estimate_persisted(self, session, test_pre_project):
        """Test that materials estimate is persisted in pre-project"""
        pp_id = test_pre_project['pre_project_id']
        
        # First save the estimate
        estimate_data = {
            "materials": [
                {"description": "Test Material", "quantity": 10, "unit": "unidad", "unit_cost": 25, "total": 250}
            ],
            "equipment": [
                {"description": "Test Equipment", "quantity": 1, "days": 2, "rate": 100, "total": 200}
            ]
        }
        session.put(f"{BASE_URL}/api/pre-projects/{pp_id}/materials-estimate", json=estimate_data)
        
        # Fetch the pre-project and verify
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert "materials_estimate" in data
        assert "equipment_estimate" in data
        assert len(data["materials_estimate"]) == 1
        assert len(data["equipment_estimate"]) == 1
        assert data["materials_estimate"][0]["description"] == "Test Material"
        assert data["equipment_estimate"][0]["description"] == "Test Equipment"
        
        print(f"✓ GET /api/pre-projects/{pp_id} - Materials estimate persisted correctly")
    
    def test_update_materials_estimate(self, session, test_pre_project):
        """Test updating materials estimate (overwrite)"""
        pp_id = test_pre_project['pre_project_id']
        
        # Save new estimate (should overwrite)
        new_estimate = {
            "materials": [
                {"description": "New Material", "quantity": 5, "unit": "unidad", "unit_cost": 100, "total": 500}
            ],
            "equipment": []
        }
        
        response = session.put(f"{BASE_URL}/api/pre-projects/{pp_id}/materials-estimate", json=new_estimate)
        assert response.status_code == 200
        data = response.json()
        
        assert data["materials_total"] == 500
        assert data["equipment_total"] == 0
        assert data["grand_total"] == 500
        
        print(f"✓ Materials estimate updated (overwritten) successfully")
    
    # ==================== READY FOR ESTIMATE TESTS ====================
    
    def test_toggle_ready_for_estimate(self, session, test_pre_project):
        """Test toggling ready_for_estimate flag via regular update"""
        pp_id = test_pre_project['pre_project_id']
        
        # Get current state
        get_resp = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}")
        current_state = get_resp.json()
        
        # Toggle the flag
        new_state = not current_state.get("ready_for_estimate", False)
        update_data = {**current_state, "ready_for_estimate": new_state}
        
        response = session.put(f"{BASE_URL}/api/pre-projects/{pp_id}", json=update_data)
        assert response.status_code == 200, f"Failed to update: {response.text}"
        
        # Verify the flag changed
        verify_resp = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}")
        assert verify_resp.json()["ready_for_estimate"] == new_state
        
        print(f"✓ ready_for_estimate toggled to {new_state}")
    
    # ==================== ERROR HANDLING TESTS ====================
    
    def test_get_logs_nonexistent_preproject(self, session):
        """Test getting logs for non-existent pre-project"""
        response = session.get(f"{BASE_URL}/api/pre-projects/nonexistent123/logs")
        assert response.status_code == 200  # Returns empty list, not 404
        data = response.json()
        assert data == []
        print("✓ GET logs for non-existent pre-project returns empty list")
    
    def test_create_log_nonexistent_preproject(self, session):
        """Test creating log for non-existent pre-project"""
        response = session.post(f"{BASE_URL}/api/pre-projects/nonexistent123/logs", json={
            "log_type": "note",
            "title": "Test",
            "description": "Test"
        })
        assert response.status_code == 404
        print("✓ POST log for non-existent pre-project returns 404")
    
    def test_update_nonexistent_log(self, session, test_pre_project):
        """Test updating non-existent log"""
        pp_id = test_pre_project['pre_project_id']
        response = session.put(f"{BASE_URL}/api/pre-projects/{pp_id}/logs/nonexistent_log", json={
            "title": "Updated"
        })
        assert response.status_code == 404
        print("✓ PUT for non-existent log returns 404")
    
    def test_delete_nonexistent_log(self, session, test_pre_project):
        """Test deleting non-existent log"""
        pp_id = test_pre_project['pre_project_id']
        response = session.delete(f"{BASE_URL}/api/pre-projects/{pp_id}/logs/nonexistent_log")
        assert response.status_code == 404
        print("✓ DELETE for non-existent log returns 404")
    
    def test_upload_document_nonexistent_preproject(self, session):
        """Test uploading document to non-existent pre-project"""
        files = {'file': ('test.txt', b'content', 'text/plain')}
        headers = dict(session.headers)
        if 'Content-Type' in headers:
            del headers['Content-Type']
        
        response = session.post(f"{BASE_URL}/api/pre-projects/nonexistent123/documents", files=files, headers=headers)
        assert response.status_code == 404
        print("✓ POST document for non-existent pre-project returns 404")
    
    def test_download_nonexistent_document(self, session, test_pre_project):
        """Test downloading non-existent document"""
        pp_id = test_pre_project['pre_project_id']
        response = session.get(f"{BASE_URL}/api/pre-projects/{pp_id}/documents/nonexistent_doc/download")
        assert response.status_code == 404
        print("✓ GET download for non-existent document returns 404")
    
    def test_update_note_nonexistent_document(self, session, test_pre_project):
        """Test updating note on non-existent document"""
        pp_id = test_pre_project['pre_project_id']
        response = session.put(
            f"{BASE_URL}/api/pre-projects/{pp_id}/documents/nonexistent_doc/note",
            json={"note": "Test note"}
        )
        assert response.status_code == 404
        print("✓ PUT note for non-existent document returns 404")
    
    def test_delete_nonexistent_document(self, session, test_pre_project):
        """Test deleting non-existent document"""
        pp_id = test_pre_project['pre_project_id']
        response = session.delete(f"{BASE_URL}/api/pre-projects/{pp_id}/documents/nonexistent_doc")
        assert response.status_code == 404
        print("✓ DELETE for non-existent document returns 404")
    
    def test_materials_estimate_nonexistent_preproject(self, session):
        """Test saving materials estimate for non-existent pre-project"""
        response = session.put(
            f"{BASE_URL}/api/pre-projects/nonexistent123/materials-estimate",
            json={"materials": [], "equipment": []}
        )
        assert response.status_code == 404
        print("✓ PUT materials-estimate for non-existent pre-project returns 404")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
