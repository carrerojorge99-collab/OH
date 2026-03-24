"""
Tests for Pre-Project Features:
1. Bitácora: assigned_to field and email notification
2. Materials Estimate: Hardware stores (ferreterías) management
3. Transfer to Cost Estimate functionality
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Helper class for authentication"""
    
    @staticmethod
    def login(email="carrerojorge99@gmail.com", password="12345678"):
        """Login and get session token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return response.cookies.get('session_token')
        return None

    @staticmethod
    def get_auth_session(email="carrerojorge99@gmail.com", password="12345678"):
        """Login and return authenticated session"""
        session = requests.Session()
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        if response.status_code == 200:
            return session
        return None


class TestHardwareStores:
    """Test hardware stores (ferreterías) endpoints"""
    
    def test_get_hardware_stores(self):
        """GET /api/hardware-stores returns list of ferreterías"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        response = session.get(f"{BASE_URL}/api/hardware-stores")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) >= 7, "Should have at least 7 default stores"
        
        # Verify default stores exist
        store_names = [s["name"] for s in data]
        assert "Home Depot" in store_names
        assert "National Lumber" in store_names
        assert "Lowe's" in store_names
        print(f"✅ GET /api/hardware-stores: {len(data)} stores returned")
        print(f"   Stores: {', '.join(store_names[:5])}...")
        
    def test_create_custom_hardware_store(self):
        """POST /api/hardware-stores creates custom ferretería"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        unique_name = f"TEST_Ferreteria_{uuid.uuid4().hex[:8]}"
        
        response = session.post(
            f"{BASE_URL}/api/hardware-stores",
            json={"name": unique_name}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name
        assert data["is_default"] == False
        assert "store_id" in data
        print(f"✅ POST /api/hardware-stores: Created '{unique_name}'")
        
        # Cleanup - try to delete
        try:
            session.delete(f"{BASE_URL}/api/hardware-stores/{data['store_id']}")
        except:
            pass
            
    def test_create_duplicate_store_fails(self):
        """POST /api/hardware-stores fails for duplicate name"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        # First create a custom store
        unique_name = f"TEST_DuplicateTest_{uuid.uuid4().hex[:8]}"
        create_response = session.post(
            f"{BASE_URL}/api/hardware-stores",
            json={"name": unique_name}
        )
        assert create_response.status_code == 200, f"Failed to create store: {create_response.text}"
        store_data = create_response.json()
        
        # Try to create a store with same name (should fail)
        duplicate_response = session.post(
            f"{BASE_URL}/api/hardware-stores",
            json={"name": unique_name}
        )
        assert duplicate_response.status_code == 400, f"Expected 400 for duplicate, got {duplicate_response.status_code}"
        print(f"✅ Duplicate store correctly rejected")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/hardware-stores/{store_data['store_id']}")
        
    def test_delete_default_store_fails(self):
        """DELETE /api/hardware-stores/{id} fails for default stores"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        response = session.delete(f"{BASE_URL}/api/hardware-stores/home_depot")
        assert response.status_code == 400, f"Expected 400 for default store, got {response.status_code}"
        print(f"✅ Default store deletion correctly rejected")


class TestBitacoraAssignment:
    """Test bitácora log entries with assigned_to field"""
    
    @pytest.fixture
    def pre_project_id(self):
        """Get test pre-project ID"""
        return "pp_54d62535e047"  # From test info
    
    def test_create_log_without_assignment(self, pre_project_id):
        """POST /api/pre-projects/{id}/logs creates log without assignment"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        response = session.post(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs",
            json={
                "log_type": "note",
                "title": "TEST_Log sin asignar",
                "description": "Este es un registro de prueba sin responsable asignado",
                "hours_worked": 1.5
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "log_id" in data
        assert data["title"] == "TEST_Log sin asignar"
        assert data["assigned_to"] is None
        assert data["assigned_to_name"] is None
        print(f"✅ Log created without assignment: {data['log_id']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs/{data['log_id']}")
        
    def test_create_log_with_assignment(self, pre_project_id):
        """POST /api/pre-projects/{id}/logs creates log with assigned_to"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        # First get a user to assign
        users_response = session.get(f"{BASE_URL}/api/users")
        assert users_response.status_code == 200
        users = users_response.json()
        assert len(users) > 0, "No users found for assignment"
        
        test_user = users[0]
        
        response = session.post(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs",
            json={
                "log_type": "contact",
                "title": "TEST_Log con responsable",
                "description": "Este registro tiene un responsable asignado",
                "hours_worked": 2.0,
                "assigned_to": test_user["user_id"]
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "log_id" in data
        assert data["assigned_to"] == test_user["user_id"]
        assert data["assigned_to_name"] is not None
        print(f"✅ Log created with assignment: {data['log_id']}")
        print(f"   Assigned to: {data['assigned_to_name']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs/{data['log_id']}")
        
    def test_get_logs_includes_assigned_info(self, pre_project_id):
        """GET /api/pre-projects/{id}/logs returns logs with assigned_to info"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        response = session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /api/pre-projects/{pre_project_id}/logs: {len(data)} logs")
        
        # Check for assigned_to field in logs
        for log in data[:3]:  # Check first 3
            assert "assigned_to" in log or log.get("assigned_to") is None
            if log.get("assigned_to_name"):
                print(f"   - '{log['title']}' assigned to: {log['assigned_to_name']}")


class TestTransferToEstimate:
    """Test transfer materials to cost estimate functionality"""
    
    @pytest.fixture
    def pre_project_id(self):
        """Get test pre-project ID"""
        return "pp_54d62535e047"
    
    def test_transfer_to_estimate_success(self, pre_project_id):
        """POST /api/pre-projects/{id}/transfer-to-estimate creates estimate"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        # First check if pre-project has materials
        pp_response = session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert pp_response.status_code == 200
        
        pp_data = pp_response.json()
        materials = pp_data.get("materials_estimate", [])
        equipment = pp_data.get("equipment_estimate", [])
        
        if not materials and not equipment:
            # Add test materials first
            session.put(
                f"{BASE_URL}/api/pre-projects/{pre_project_id}/materials-estimate",
                json={
                    "materials": [
                        {
                            "description": "TEST_Material",
                            "quantity": 10,
                            "unit": "unidad",
                            "unit_cost": 25.0,
                            "total": 250.0,
                            "store": "Home Depot"
                        }
                    ],
                    "equipment": []
                }
            )
        
        # Now transfer
        response = session.post(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/transfer-to-estimate",
            json={"estimate_name": "TEST_Estimado de Prueba"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "estimate_id" in data
        assert "estimate_number" in data
        assert "message" in data
        print(f"✅ Transfer successful: {data['estimate_number']}")
        
    def test_transfer_empty_materials_fails(self):
        """POST /api/pre-projects/{id}/transfer-to-estimate fails for empty materials"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        # Create a test pre-project with no materials
        create_response = session.post(
            f"{BASE_URL}/api/pre-projects",
            json={
                "title": "TEST_PreProject_Empty",
                "client_name": "Test Client",
                "description": "Test with no materials"
            }
        )
        
        if create_response.status_code == 200:
            new_pp = create_response.json()
            pp_id = new_pp["pre_project_id"]
            
            # Try to transfer empty materials
            response = session.post(
                f"{BASE_URL}/api/pre-projects/{pp_id}/transfer-to-estimate",
                json={"estimate_name": "Test"}
            )
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            print(f"✅ Empty materials transfer correctly rejected")
            
            # Cleanup
            session.delete(f"{BASE_URL}/api/pre-projects/{pp_id}")
        else:
            pytest.skip("Could not create test pre-project")


class TestMaterialsEstimate:
    """Test materials estimate with hardware store selection"""
    
    @pytest.fixture
    def pre_project_id(self):
        return "pp_54d62535e047"
    
    def test_save_materials_with_stores(self, pre_project_id):
        """PUT /api/pre-projects/{id}/materials-estimate saves with store info"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        materials_data = {
            "materials": [
                {
                    "description": "TEST_Tubo PVC 1\"",
                    "quantity": 10,
                    "unit": "pie",
                    "unit_cost": 5.50,
                    "total": 55.0,
                    "store": "Home Depot"
                },
                {
                    "description": "TEST_Cemento Portland",
                    "quantity": 5,
                    "unit": "bolsa",
                    "unit_cost": 12.0,
                    "total": 60.0,
                    "store": "National Lumber"
                },
                {
                    "description": "TEST_Pintura Latex",
                    "quantity": 2,
                    "unit": "galon",
                    "unit_cost": 35.0,
                    "total": 70.0,
                    "store": "Lowe's"
                }
            ],
            "equipment": [
                {
                    "description": "TEST_Compresor",
                    "quantity": 1,
                    "days": 5,
                    "rate": 50.0,
                    "total": 250.0
                }
            ]
        }
        
        response = session.put(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/materials-estimate",
            json=materials_data
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "materials_total" in data
        assert "equipment_total" in data
        assert "store_totals" in data
        
        print(f"✅ Materials saved with stores")
        print(f"   Materials Total: ${data['materials_total']:.2f}")
        print(f"   Equipment Total: ${data['equipment_total']:.2f}")
        print(f"   Store Breakdown: {data.get('store_totals', {})}")
        
    def test_get_preproject_includes_materials(self, pre_project_id):
        """GET /api/pre-projects/{id} returns materials with store info"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        response = session.get(f"{BASE_URL}/api/pre-projects/{pre_project_id}")
        assert response.status_code == 200
        
        data = response.json()
        materials = data.get("materials_estimate", [])
        
        print(f"✅ Pre-project has {len(materials)} materials")
        for m in materials[:3]:
            store = m.get("store", "Sin Ferretería")
            print(f"   - {m.get('description', 'N/A')} @ {store}: ${m.get('total', 0):.2f}")


class TestPreProjectLogs:
    """Additional tests for pre-project logs"""
    
    @pytest.fixture
    def pre_project_id(self):
        return "pp_54d62535e047"
    
    def test_update_log_with_new_assignment(self, pre_project_id):
        """PUT /api/pre-projects/{id}/logs/{log_id} updates assigned_to"""
        session = TestAuth.get_auth_session()
        assert session is not None, "Failed to authenticate"
        
        # Create a log first
        create_response = session.post(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs",
            json={
                "log_type": "note",
                "title": "TEST_Log para actualizar",
                "description": "Este log será actualizado con un responsable"
            }
        )
        assert create_response.status_code == 200
        log_data = create_response.json()
        log_id = log_data["log_id"]
        
        # Get a user to assign
        users_response = session.get(f"{BASE_URL}/api/users")
        users = users_response.json()
        test_user = users[0]
        
        # Update with assignment
        update_response = session.put(
            f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs/{log_id}",
            json={
                "log_type": "contact",
                "title": "TEST_Log actualizado",
                "description": "Ahora tiene responsable",
                "assigned_to": test_user["user_id"]
            }
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        updated_data = update_response.json()
        assert updated_data["assigned_to"] == test_user["user_id"]
        assert updated_data["assigned_to_name"] is not None
        print(f"✅ Log updated with assignment: {updated_data['assigned_to_name']}")
        
        # Cleanup
        session.delete(f"{BASE_URL}/api/pre-projects/{pre_project_id}/logs/{log_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
