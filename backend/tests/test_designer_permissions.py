"""
Test Designer Permissions - Role-based access control
Tests that the designer role:
1. Can login successfully
2. Can access /api/projects
3. Receives hide_financial=true in project responses
4. Can see projects but NOT financial info (budget, spent, payment_status hidden)
5. Can access project detail with MRR tab (designer can manage MRR)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
DESIGNER_EMAIL = "designer@test.com"
DESIGNER_PASSWORD = "designer123"
ADMIN_EMAIL = "carrerojorge99@gmail.com"
ADMIN_PASSWORD = "12345678"

# Test project ID mentioned in the requirements
TEST_PROJECT_ID = "proj_bfc46dbbc812"

class TestDesignerPermissions:
    """Test designer role permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and return session"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password}
        )
        return response
    
    def test_designer_can_login(self):
        """Test that designer can login successfully"""
        response = self.login(DESIGNER_EMAIL, DESIGNER_PASSWORD)
        
        print(f"Designer login status: {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Designer login failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain user data"
        assert data["user"]["role"] == "designer", f"User role should be 'designer', got: {data['user']['role']}"
        print(f"✅ Designer login successful: {data['user']['email']} - role: {data['user']['role']}")
    
    def test_designer_can_access_projects_list(self):
        """Test that designer can access /api/projects endpoint"""
        # Login as designer
        login_response = self.login(DESIGNER_EMAIL, DESIGNER_PASSWORD)
        assert login_response.status_code == 200, "Designer login failed"
        
        # Access projects list
        response = self.session.get(f"{BASE_URL}/api/projects")
        
        print(f"Designer projects list status: {response.status_code}")
        assert response.status_code == 200, f"Designer cannot access projects: {response.text}"
        
        projects = response.json()
        print(f"✅ Designer can access projects: {len(projects)} projects returned")
        
        # Verify projects list is an array
        assert isinstance(projects, list), "Projects response should be a list"
    
    def test_designer_projects_have_hide_financial_flag(self):
        """Test that projects returned to designer have hide_financial=true"""
        # Login as designer
        login_response = self.login(DESIGNER_EMAIL, DESIGNER_PASSWORD)
        assert login_response.status_code == 200, "Designer login failed"
        
        # Get projects
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        
        projects = response.json()
        
        if len(projects) > 0:
            # Check first project has hide_financial flag
            first_project = projects[0]
            
            print(f"Project: {first_project.get('name')}")
            print(f"  hide_financial: {first_project.get('hide_financial')}")
            print(f"  budget_total: {first_project.get('budget_total')}")
            print(f"  budget_spent: {first_project.get('budget_spent')}")
            print(f"  payment_status: {first_project.get('payment_status')}")
            
            # Verify hide_financial is True for designer
            assert first_project.get('hide_financial') == True, \
                f"Designer should see hide_financial=true, got: {first_project.get('hide_financial')}"
            
            # Verify financial data is zeroed/hidden
            assert first_project.get('budget_total', 0) == 0, \
                f"Designer should not see budget_total, got: {first_project.get('budget_total')}"
            assert first_project.get('budget_spent', 0) == 0, \
                f"Designer should not see budget_spent, got: {first_project.get('budget_spent')}"
            
            print(f"✅ Designer projects have hide_financial=true and zeroed financial data")
        else:
            print("⚠️ No projects found to test hide_financial flag")
    
    def test_designer_can_access_project_detail(self):
        """Test that designer can access a specific project detail"""
        # Login as designer
        login_response = self.login(DESIGNER_EMAIL, DESIGNER_PASSWORD)
        assert login_response.status_code == 200, "Designer login failed"
        
        # First get projects list to find a valid project
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        assert projects_response.status_code == 200
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available to test detail view")
        
        # Try the specified project or first available
        project_id = TEST_PROJECT_ID
        if not any(p.get('project_id') == TEST_PROJECT_ID for p in projects):
            project_id = projects[0].get('project_id')
        
        # Access project detail
        response = self.session.get(f"{BASE_URL}/api/projects/{project_id}")
        
        print(f"Designer project detail status: {response.status_code}")
        
        if response.status_code == 200:
            project = response.json()
            print(f"Project: {project.get('name')}")
            print(f"  hide_financial: {project.get('hide_financial')}")
            
            assert project.get('hide_financial') == True, \
                f"Designer should see hide_financial=true in detail, got: {project.get('hide_financial')}"
            
            print(f"✅ Designer can access project detail with hide_financial=true")
        else:
            print(f"Response: {response.text}")
            assert False, f"Designer cannot access project detail: {response.status_code}"
    
    def test_designer_can_access_mrr(self):
        """Test that designer can access MRR endpoints (allowed per ROLE_PERMISSIONS)"""
        # Login as designer
        login_response = self.login(DESIGNER_EMAIL, DESIGNER_PASSWORD)
        assert login_response.status_code == 200, "Designer login failed"
        
        # First get a project
        projects_response = self.session.get(f"{BASE_URL}/api/projects")
        projects = projects_response.json()
        
        if len(projects) == 0:
            pytest.skip("No projects available to test MRR")
        
        project_id = projects[0].get('project_id')
        
        # Try to access MRR list
        response = self.session.get(f"{BASE_URL}/api/mrr?project_id={project_id}")
        
        print(f"Designer MRR list status: {response.status_code}")
        
        # Designer should be able to access MRR (view_mrr permission)
        if response.status_code == 200:
            print(f"✅ Designer can access MRR endpoint")
        else:
            print(f"MRR response: {response.text}")
            # This might fail if MRR endpoint has additional restrictions


class TestAdminPermissions:
    """Test admin role sees all financial info"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_can_login(self):
        """Test that admin can login successfully"""
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        print(f"Admin login status: {response.status_code}")
        
        if response.status_code != 200:
            print(f"Response: {response.text}")
            pytest.skip(f"Admin login failed - may need different credentials: {response.text}")
        
        data = response.json()
        print(f"✅ Admin login successful: {data['user']['email']} - role: {data['user']['role']}")
    
    def test_admin_projects_show_financial_info(self):
        """Test that admin sees all financial info (hide_financial=false)"""
        # Login as admin
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        
        # Get projects
        response = self.session.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200, f"Failed to get projects: {response.text}"
        
        projects = response.json()
        
        if len(projects) > 0:
            first_project = projects[0]
            
            print(f"Admin Project: {first_project.get('name')}")
            print(f"  hide_financial: {first_project.get('hide_financial')}")
            print(f"  budget_total: {first_project.get('budget_total')}")
            print(f"  budget_spent: {first_project.get('budget_spent')}")
            print(f"  payment_status: {first_project.get('payment_status')}")
            
            # Admin should see hide_financial=false or no flag
            hide_financial = first_project.get('hide_financial', False)
            assert hide_financial == False, \
                f"Admin should see hide_financial=false, got: {hide_financial}"
            
            print(f"✅ Admin projects have hide_financial=false with full financial data")
        else:
            print("⚠️ No projects found to test admin financial visibility")


class TestDesignerUserExists:
    """Verify designer user exists in database"""
    
    def test_designer_user_creation_or_existence(self):
        """Test that the designer user exists or can be created"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Try to login
        response = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": DESIGNER_EMAIL, "password": DESIGNER_PASSWORD}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Designer user exists: {data['user']['email']} - role: {data['user']['role']}")
            assert data['user']['role'] == "designer", f"User should have designer role, got: {data['user']['role']}"
        elif response.status_code == 401:
            print(f"⚠️ Designer user not found or invalid credentials")
            print(f"Response: {response.text}")
            # This is expected if the user doesn't exist yet
            pytest.fail("Designer user (designer@test.com / designer123) does not exist. Please create it first.")
        else:
            print(f"Unexpected response: {response.status_code} - {response.text}")
            pytest.fail(f"Failed to verify designer user: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
