"""
Test Suite for Schedule/Shift Management Endpoints
Tests: GET, POST, PUT, DELETE schedules and claim/unclaim/approve workflows

Features tested:
- GET /api/schedules?project_id={id} - List shifts for project
- POST /api/schedules - Create new shift (admin/PM only)
- PUT /api/schedules/{shift_id} - Update shift
- DELETE /api/schedules/{shift_id} - Delete shift
- POST /api/schedules/{shift_id}/claim - Employee takes shift
- POST /api/schedules/{shift_id}/unclaim - Employee cancels registration
- POST /api/schedules/{shift_id}/approve - Admin approves/rejects
- GET /api/schedules/export/excel?project_id={id} - Export to Excel
- GET /api/schedules/export/pdf?project_id={id} - Export to PDF
- GET /api/schedules/my-shifts - Get current user's shifts
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "carrerojorge99@gmail.com"
SUPER_ADMIN_PASSWORD = "12345678"
PROJECT_ID = "proj_bfc46dbbc812"
EXISTING_SHIFT_ID = "shift_d23ee8c88971"


class TestScheduleEndpoints:
    """Schedule/Shift Management API Tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
        
        self.user = login_response.json().get("user", {})
        self.created_shift_ids = []
        yield
        # Cleanup created shifts
        for shift_id in self.created_shift_ids:
            try:
                self.session.delete(f"{BASE_URL}/api/schedules/{shift_id}")
            except Exception:
                pass
    
    # ==================== GET SCHEDULES ====================
    
    def test_get_schedules_for_project(self):
        """Test GET /api/schedules?project_id={id} - List project shifts"""
        response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/schedules returned {len(data)} shifts")
    
    def test_get_schedules_without_project_id(self):
        """Test GET /api/schedules without project_id - Returns all schedules"""
        response = self.session.get(f"{BASE_URL}/api/schedules")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/schedules (all) returned {len(data)} shifts")
    
    def test_get_schedules_with_date_filter(self):
        """Test GET /api/schedules with date_from and date_to filters"""
        date_from = "2025-01-01"
        date_to = "2025-12-31"
        response = self.session.get(
            f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}&date_from={date_from}&date_to={date_to}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/schedules with date filter returned {len(data)} shifts")
    
    # ==================== CREATE SCHEDULE ====================
    
    def test_create_schedule_success(self):
        """Test POST /api/schedules - Create new shift"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {
            "project_id": PROJECT_ID,
            "date": tomorrow,
            "start_time": "08:00",
            "end_time": "17:00",
            "max_slots": 5,
            "description": "TEST_Schedule: Turno de prueba",
            "requires_approval": False
        }
        
        response = self.session.post(f"{BASE_URL}/api/schedules", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "shift_id" in data
        assert "message" in data
        
        # Save for cleanup
        self.created_shift_ids.append(data["shift_id"])
        print(f"✅ POST /api/schedules created shift: {data['shift_id']}")
        
        return data["shift_id"]
    
    def test_create_schedule_with_approval_required(self):
        """Test POST /api/schedules - Create shift that requires approval"""
        day_after_tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        payload = {
            "project_id": PROJECT_ID,
            "date": day_after_tomorrow,
            "start_time": "07:00",
            "end_time": "15:00",
            "max_slots": 3,
            "description": "TEST_Schedule: Turno con aprobación",
            "requires_approval": True
        }
        
        response = self.session.post(f"{BASE_URL}/api/schedules", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "shift_id" in data
        
        self.created_shift_ids.append(data["shift_id"])
        print(f"✅ Created shift with approval required: {data['shift_id']}")
        
        # Verify the shift was created with requires_approval=True
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        created_shift = next((s for s in shifts if s.get("shift_id") == data["shift_id"]), None)
        assert created_shift is not None
        assert created_shift.get("requires_approval") == True
        print(f"✅ Verified shift requires_approval=True")
    
    def test_create_schedule_invalid_project(self):
        """Test POST /api/schedules - Invalid project returns 404"""
        payload = {
            "project_id": "invalid_project_id",
            "date": "2025-12-20",
            "start_time": "08:00",
            "end_time": "17:00",
            "max_slots": 5
        }
        
        response = self.session.post(f"{BASE_URL}/api/schedules", json=payload)
        
        assert response.status_code == 404
        print(f"✅ POST /api/schedules with invalid project returns 404")
    
    # ==================== UPDATE SCHEDULE ====================
    
    def test_update_schedule_success(self):
        """Test PUT /api/schedules/{shift_id} - Update existing shift"""
        # First create a shift
        shift_id = self.test_create_schedule_success()
        
        update_payload = {
            "max_slots": 10,
            "description": "TEST_Schedule: Turno actualizado"
        }
        
        response = self.session.put(f"{BASE_URL}/api/schedules/{shift_id}", json=update_payload)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ PUT /api/schedules/{shift_id} updated successfully")
        
        # Verify update
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        updated_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        assert updated_shift is not None
        assert updated_shift.get("max_slots") == 10
        print(f"✅ Verified shift update: max_slots=10")
    
    def test_update_schedule_not_found(self):
        """Test PUT /api/schedules/{shift_id} - Non-existent shift returns 404"""
        response = self.session.put(
            f"{BASE_URL}/api/schedules/invalid_shift_id",
            json={"max_slots": 10}
        )
        
        assert response.status_code == 404
        print(f"✅ PUT /api/schedules/invalid returns 404")
    
    # ==================== DELETE SCHEDULE ====================
    
    def test_delete_schedule_success(self):
        """Test DELETE /api/schedules/{shift_id} - Delete shift"""
        # First create a shift
        shift_id = self.test_create_schedule_success()
        # Remove from cleanup since we're manually deleting
        self.created_shift_ids.remove(shift_id)
        
        response = self.session.delete(f"{BASE_URL}/api/schedules/{shift_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ DELETE /api/schedules/{shift_id} succeeded")
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        deleted_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        assert deleted_shift is None
        print(f"✅ Verified shift was deleted")
    
    def test_delete_schedule_not_found(self):
        """Test DELETE /api/schedules/{shift_id} - Non-existent returns 404"""
        response = self.session.delete(f"{BASE_URL}/api/schedules/invalid_shift_id")
        
        assert response.status_code == 404
        print(f"✅ DELETE /api/schedules/invalid returns 404")
    
    # ==================== CLAIM SHIFT ====================
    
    def test_claim_shift_auto_confirm(self):
        """Test POST /api/schedules/{shift_id}/claim - Employee claims shift (auto-confirm)"""
        # Create a shift without approval required
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": tomorrow,
            "start_time": "09:00",
            "end_time": "17:00",
            "max_slots": 5,
            "description": "TEST_Schedule: Claim test",
            "requires_approval": False
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Claim the shift
        response = self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "confirmed"
        print(f"✅ POST /api/schedules/{shift_id}/claim - Auto-confirmed")
        
        # Verify assignment
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        claimed_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        assert claimed_shift is not None
        assignments = claimed_shift.get("assignments", [])
        assert len(assignments) > 0
        assert assignments[0]["status"] == "confirmed"
        print(f"✅ Verified assignment status: confirmed")
    
    def test_claim_shift_pending_approval(self):
        """Test POST /api/schedules/{shift_id}/claim - With requires_approval=True"""
        # Create a shift with approval required
        future_date = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3,
            "description": "TEST_Schedule: Approval test",
            "requires_approval": True
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Claim the shift
        response = self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "pending"
        print(f"✅ POST /api/schedules/{shift_id}/claim - Status: pending")
    
    def test_claim_shift_already_claimed(self):
        """Test POST /api/schedules/{shift_id}/claim - Duplicate claim returns 400"""
        # Create and claim a shift
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3,
            "requires_approval": False
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # First claim
        self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        # Try to claim again
        response = self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        assert response.status_code == 400
        print(f"✅ Duplicate claim returns 400")
    
    def test_claim_shift_not_found(self):
        """Test POST /api/schedules/{shift_id}/claim - Non-existent shift"""
        response = self.session.post(f"{BASE_URL}/api/schedules/invalid_shift_id/claim")
        
        assert response.status_code == 404
        print(f"✅ POST claim on invalid shift returns 404")
    
    # ==================== UNCLAIM SHIFT ====================
    
    def test_unclaim_shift_success(self):
        """Test POST /api/schedules/{shift_id}/unclaim - Cancel registration"""
        # Create and claim a shift
        future_date = (datetime.now() + timedelta(days=6)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3,
            "requires_approval": False
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Claim
        self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        # Unclaim
        response = self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/unclaim")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ POST /api/schedules/{shift_id}/unclaim succeeded")
        
        # Verify unclaim
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        unclaimed_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        assert unclaimed_shift is not None
        user_assignment = next((a for a in unclaimed_shift.get("assignments", []) 
                                if a.get("user_id") == self.user.get("user_id")), None)
        assert user_assignment is None
        print(f"✅ Verified user was removed from assignments")
    
    def test_unclaim_shift_not_registered(self):
        """Test POST /api/schedules/{shift_id}/unclaim - Not registered returns 400"""
        # Create a shift but don't claim
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Try to unclaim without being registered
        response = self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/unclaim")
        
        assert response.status_code == 400
        print(f"✅ Unclaim without registration returns 400")
    
    # ==================== APPROVE SHIFT ====================
    
    def test_approve_shift_assignment(self):
        """Test POST /api/schedules/{shift_id}/approve - Approve assignment"""
        # Create shift with approval required
        future_date = (datetime.now() + timedelta(days=8)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3,
            "requires_approval": True
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Claim (will be pending)
        self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        # Approve
        response = self.session.post(
            f"{BASE_URL}/api/schedules/{shift_id}/approve",
            json={"user_id": self.user.get("user_id"), "approved": True}
        )
        
        assert response.status_code == 200
        print(f"✅ POST /api/schedules/{shift_id}/approve - Approved")
        
        # Verify status changed to confirmed
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        approved_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        assert approved_shift is not None
        user_assignment = next((a for a in approved_shift.get("assignments", []) 
                                if a.get("user_id") == self.user.get("user_id")), None)
        assert user_assignment is not None
        assert user_assignment.get("status") == "confirmed"
        print(f"✅ Verified assignment status: confirmed")
    
    def test_reject_shift_assignment(self):
        """Test POST /api/schedules/{shift_id}/approve - Reject assignment"""
        # Create shift with approval required
        future_date = (datetime.now() + timedelta(days=9)).strftime("%Y-%m-%d")
        create_response = self.session.post(f"{BASE_URL}/api/schedules", json={
            "project_id": PROJECT_ID,
            "date": future_date,
            "start_time": "08:00",
            "end_time": "16:00",
            "max_slots": 3,
            "requires_approval": True
        })
        shift_id = create_response.json()["shift_id"]
        self.created_shift_ids.append(shift_id)
        
        # Claim (will be pending)
        self.session.post(f"{BASE_URL}/api/schedules/{shift_id}/claim")
        
        # Reject
        response = self.session.post(
            f"{BASE_URL}/api/schedules/{shift_id}/approve",
            json={"user_id": self.user.get("user_id"), "approved": False}
        )
        
        assert response.status_code == 200
        print(f"✅ POST /api/schedules/{shift_id}/approve - Rejected")
        
        # Verify status changed to rejected
        get_response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        shifts = get_response.json()
        rejected_shift = next((s for s in shifts if s.get("shift_id") == shift_id), None)
        user_assignment = next((a for a in rejected_shift.get("assignments", []) 
                                if a.get("user_id") == self.user.get("user_id")), None)
        assert user_assignment is not None
        assert user_assignment.get("status") == "rejected"
        print(f"✅ Verified assignment status: rejected")
    
    # ==================== EXPORT ENDPOINTS ====================
    
    def test_export_excel(self):
        """Test GET /api/schedules/export/excel - Export to Excel"""
        response = self.session.get(f"{BASE_URL}/api/schedules/export/excel?project_id={PROJECT_ID}")
        
        assert response.status_code == 200
        assert "application/vnd.openxmlformats" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print(f"✅ GET /api/schedules/export/excel returned {len(response.content)} bytes")
    
    def test_export_pdf(self):
        """Test GET /api/schedules/export/pdf - Export to PDF"""
        response = self.session.get(f"{BASE_URL}/api/schedules/export/pdf?project_id={PROJECT_ID}")
        
        assert response.status_code == 200
        assert "application/pdf" in response.headers.get("content-type", "")
        assert len(response.content) > 0
        print(f"✅ GET /api/schedules/export/pdf returned {len(response.content)} bytes")
    
    # ==================== MY SHIFTS ====================
    
    def test_get_my_shifts(self):
        """Test GET /api/schedules/my-shifts - Get user's shifts"""
        response = self.session.get(f"{BASE_URL}/api/schedules/my-shifts")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/schedules/my-shifts returned {len(data)} shifts")
    
    def test_get_my_shifts_with_date_filter(self):
        """Test GET /api/schedules/my-shifts with date filters"""
        date_from = "2025-01-01"
        date_to = "2025-12-31"
        response = self.session.get(
            f"{BASE_URL}/api/schedules/my-shifts?date_from={date_from}&date_to={date_to}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✅ GET /api/schedules/my-shifts with date filter returned {len(data)} shifts")
    
    # ==================== EXISTING SHIFT VERIFICATION ====================
    
    def test_existing_shift_data(self):
        """Test existing shift (shift_d23ee8c88971) is accessible"""
        response = self.session.get(f"{BASE_URL}/api/schedules?project_id={PROJECT_ID}")
        
        assert response.status_code == 200
        shifts = response.json()
        existing_shift = next((s for s in shifts if s.get("shift_id") == EXISTING_SHIFT_ID), None)
        
        if existing_shift:
            print(f"✅ Found existing shift: {EXISTING_SHIFT_ID}")
            print(f"   Date: {existing_shift.get('date')}")
            print(f"   Time: {existing_shift.get('start_time')} - {existing_shift.get('end_time')}")
            print(f"   Max slots: {existing_shift.get('max_slots')}")
            print(f"   Assignments: {len(existing_shift.get('assignments', []))}")
        else:
            print(f"⚠️ Existing shift {EXISTING_SHIFT_ID} not found - may have been deleted")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
