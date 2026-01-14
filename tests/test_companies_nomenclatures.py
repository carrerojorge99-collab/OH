"""
Test suite for Companies Module and Nomenclature functionality
Tests: Companies CRUD, Sponsors CRUD, Nomenclature selector
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "jcarrion@ohsmspr.com"
TEST_PASSWORD = "Admin2024!"

class TestAuth:
    """Authentication tests - must pass before other tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        return data["token"]
    
    def test_login_success(self, auth_token):
        """Test login returns valid token"""
        assert auth_token is not None
        assert len(auth_token) > 0
        print(f"✅ Login successful, token: {auth_token[:20]}...")
    
    def test_auth_me(self, auth_token):
        """Test /auth/me returns user data"""
        response = requests.get(f"{BASE_URL}/api/auth/me", 
            headers={"Authorization": f"Bearer {auth_token}"})
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        assert "user_id" in data or "email" in data
        print(f"✅ Auth/me successful: {data.get('email', data.get('name'))}")


class TestCompanies:
    """Companies CRUD tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_companies_list(self, headers):
        """Test GET /companies returns list"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        assert response.status_code == 200, f"Get companies failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /companies returned {len(data)} companies")
    
    def test_create_company(self, headers):
        """Test POST /companies creates a new company"""
        test_company = {
            "name": f"TEST_Company_{int(time.time())}",
            "address": "123 Test Street",
            "city": "San Juan",
            "state": "PR",
            "zip_code": "00901",
            "phone": "(787) 555-1234",
            "email": "test@testcompany.com",
            "website": "www.testcompany.com",
            "ein": "12-3456789",
            "payment_terms": "net_30",
            "notes": "Test company for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/companies", json=test_company, headers=headers)
        assert response.status_code == 200, f"Create company failed: {response.text}"
        data = response.json()
        assert "company" in data, "Response should contain company object"
        assert data["company"]["name"] == test_company["name"]
        print(f"✅ POST /companies created: {data['company']['company_id']}")
        return data["company"]["company_id"]
    
    def test_get_single_company(self, headers):
        """Test GET /companies/{id} returns company details"""
        # First create a company
        test_company = {"name": f"TEST_SingleGet_{int(time.time())}"}
        create_resp = requests.post(f"{BASE_URL}/api/companies", json=test_company, headers=headers)
        assert create_resp.status_code == 200
        company_id = create_resp.json()["company"]["company_id"]
        
        # Then get it
        response = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
        assert response.status_code == 200, f"Get single company failed: {response.text}"
        data = response.json()
        assert data["company_id"] == company_id
        assert data["name"] == test_company["name"]
        print(f"✅ GET /companies/{company_id} returned correct data")
    
    def test_update_company(self, headers):
        """Test PUT /companies/{id} updates company"""
        # Create company
        test_company = {"name": f"TEST_Update_{int(time.time())}"}
        create_resp = requests.post(f"{BASE_URL}/api/companies", json=test_company, headers=headers)
        assert create_resp.status_code == 200
        company_id = create_resp.json()["company"]["company_id"]
        
        # Update it
        updated_data = {
            "name": f"TEST_Updated_{int(time.time())}",
            "city": "Ponce",
            "payment_terms": "net_60"
        }
        response = requests.put(f"{BASE_URL}/api/companies/{company_id}", json=updated_data, headers=headers)
        assert response.status_code == 200, f"Update company failed: {response.text}"
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["name"] == updated_data["name"]
        assert data["city"] == updated_data["city"]
        print(f"✅ PUT /companies/{company_id} updated successfully")
    
    def test_delete_company(self, headers):
        """Test DELETE /companies/{id} removes company"""
        # Create company
        test_company = {"name": f"TEST_Delete_{int(time.time())}"}
        create_resp = requests.post(f"{BASE_URL}/api/companies", json=test_company, headers=headers)
        assert create_resp.status_code == 200
        company_id = create_resp.json()["company"]["company_id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
        assert response.status_code == 200, f"Delete company failed: {response.text}"
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/companies/{company_id}", headers=headers)
        assert get_resp.status_code == 404, "Company should not exist after deletion"
        print(f"✅ DELETE /companies/{company_id} removed successfully")


class TestSponsors:
    """Sponsors CRUD tests within companies"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    @pytest.fixture(scope="class")
    def test_company(self, headers):
        """Create a test company for sponsor tests"""
        test_company = {"name": f"TEST_SponsorCompany_{int(time.time())}"}
        response = requests.post(f"{BASE_URL}/api/companies", json=test_company, headers=headers)
        assert response.status_code == 200
        return response.json()["company"]["company_id"]
    
    def test_add_sponsor(self, headers, test_company):
        """Test POST /companies/{id}/sponsors adds sponsor"""
        sponsor_data = {
            "name": "TEST_Sponsor_María García",
            "title": "Director de Proyectos",
            "email": "maria@testcompany.com",
            "phone": "(787) 555-5678",
            "address": "456 Sponsor Ave"
        }
        
        response = requests.post(f"{BASE_URL}/api/companies/{test_company}/sponsors", 
            json=sponsor_data, headers=headers)
        assert response.status_code == 200, f"Add sponsor failed: {response.text}"
        data = response.json()
        assert "sponsor" in data
        assert data["sponsor"]["name"] == sponsor_data["name"]
        print(f"✅ POST /companies/{test_company}/sponsors added: {data['sponsor']['sponsor_id']}")
        return data["sponsor"]["sponsor_id"]
    
    def test_verify_sponsor_in_company(self, headers, test_company):
        """Verify sponsor appears in company data"""
        # Add a sponsor first
        sponsor_data = {"name": f"TEST_VerifySponsor_{int(time.time())}"}
        add_resp = requests.post(f"{BASE_URL}/api/companies/{test_company}/sponsors", 
            json=sponsor_data, headers=headers)
        assert add_resp.status_code == 200
        
        # Get company and verify sponsor is there
        response = requests.get(f"{BASE_URL}/api/companies/{test_company}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "sponsors" in data
        assert len(data["sponsors"]) > 0
        sponsor_names = [s["name"] for s in data["sponsors"]]
        assert sponsor_data["name"] in sponsor_names
        print(f"✅ Sponsor verified in company data, total sponsors: {len(data['sponsors'])}")
    
    def test_update_sponsor(self, headers, test_company):
        """Test PUT /companies/{id}/sponsors/{sponsor_id} updates sponsor"""
        # Add sponsor
        sponsor_data = {"name": f"TEST_UpdateSponsor_{int(time.time())}"}
        add_resp = requests.post(f"{BASE_URL}/api/companies/{test_company}/sponsors", 
            json=sponsor_data, headers=headers)
        assert add_resp.status_code == 200
        sponsor_id = add_resp.json()["sponsor"]["sponsor_id"]
        
        # Update sponsor
        updated_data = {
            "name": f"TEST_UpdatedSponsor_{int(time.time())}",
            "title": "CEO",
            "email": "updated@test.com"
        }
        response = requests.put(f"{BASE_URL}/api/companies/{test_company}/sponsors/{sponsor_id}", 
            json=updated_data, headers=headers)
        assert response.status_code == 200, f"Update sponsor failed: {response.text}"
        
        # Verify update
        get_resp = requests.get(f"{BASE_URL}/api/companies/{test_company}", headers=headers)
        data = get_resp.json()
        updated_sponsor = next((s for s in data["sponsors"] if s["sponsor_id"] == sponsor_id), None)
        assert updated_sponsor is not None
        assert updated_sponsor["name"] == updated_data["name"]
        assert updated_sponsor["title"] == updated_data["title"]
        print(f"✅ PUT /companies/{test_company}/sponsors/{sponsor_id} updated successfully")
    
    def test_delete_sponsor(self, headers, test_company):
        """Test DELETE /companies/{id}/sponsors/{sponsor_id} removes sponsor"""
        # Add sponsor
        sponsor_data = {"name": f"TEST_DeleteSponsor_{int(time.time())}"}
        add_resp = requests.post(f"{BASE_URL}/api/companies/{test_company}/sponsors", 
            json=sponsor_data, headers=headers)
        assert add_resp.status_code == 200
        sponsor_id = add_resp.json()["sponsor"]["sponsor_id"]
        
        # Delete sponsor
        response = requests.delete(f"{BASE_URL}/api/companies/{test_company}/sponsors/{sponsor_id}", 
            headers=headers)
        assert response.status_code == 200, f"Delete sponsor failed: {response.text}"
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/companies/{test_company}", headers=headers)
        data = get_resp.json()
        sponsor_ids = [s["sponsor_id"] for s in data["sponsors"]]
        assert sponsor_id not in sponsor_ids
        print(f"✅ DELETE /companies/{test_company}/sponsors/{sponsor_id} removed successfully")


class TestNomenclatures:
    """Nomenclature selector tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_get_nomenclatures_list(self, headers):
        """Test GET /nomenclatures returns list"""
        response = requests.get(f"{BASE_URL}/api/nomenclatures", headers=headers)
        assert response.status_code == 200, f"Get nomenclatures failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✅ GET /nomenclatures returned {len(data)} nomenclatures")
        return data
    
    def test_create_nomenclature(self, headers):
        """Test POST /nomenclatures creates a new nomenclature"""
        test_nom = {
            "name": f"TEST_Nomenclature_{int(time.time())}",
            "prefix": "TST",
            "department_number": "001",
            "description": "Test nomenclature for automated testing"
        }
        
        response = requests.post(f"{BASE_URL}/api/nomenclatures", json=test_nom, headers=headers)
        assert response.status_code == 200, f"Create nomenclature failed: {response.text}"
        data = response.json()
        assert "nomenclature_id" in data or "nomenclature" in data
        print(f"✅ POST /nomenclatures created successfully")
        return data.get("nomenclature_id") or data.get("nomenclature", {}).get("nomenclature_id")
    
    def test_get_next_number(self, headers):
        """Test GET /nomenclatures/next-number/{id} generates number"""
        # First get existing nomenclatures
        list_resp = requests.get(f"{BASE_URL}/api/nomenclatures", headers=headers)
        assert list_resp.status_code == 200
        nomenclatures = list_resp.json()
        
        if len(nomenclatures) == 0:
            # Create one if none exist
            test_nom = {"name": "TEST_NextNumber", "prefix": "NXT"}
            create_resp = requests.post(f"{BASE_URL}/api/nomenclatures", json=test_nom, headers=headers)
            assert create_resp.status_code == 200
            nom_id = create_resp.json().get("nomenclature_id") or create_resp.json().get("nomenclature", {}).get("nomenclature_id")
        else:
            nom_id = nomenclatures[0]["nomenclature_id"]
        
        # Get next number
        response = requests.get(f"{BASE_URL}/api/nomenclatures/next-number/{nom_id}", headers=headers)
        assert response.status_code == 200, f"Get next number failed: {response.text}"
        data = response.json()
        assert "number" in data, "Response should contain 'number' field"
        assert len(data["number"]) > 0, "Generated number should not be empty"
        print(f"✅ GET /nomenclatures/next-number/{nom_id} generated: {data['number']}")
    
    def test_next_number_increments(self, headers):
        """Test that next-number increments correctly"""
        # Create a fresh nomenclature
        test_nom = {"name": f"TEST_Increment_{int(time.time())}", "prefix": "INC"}
        create_resp = requests.post(f"{BASE_URL}/api/nomenclatures", json=test_nom, headers=headers)
        assert create_resp.status_code == 200
        nom_id = create_resp.json().get("nomenclature_id") or create_resp.json().get("nomenclature", {}).get("nomenclature_id")
        
        # Get first number
        resp1 = requests.get(f"{BASE_URL}/api/nomenclatures/next-number/{nom_id}", headers=headers)
        assert resp1.status_code == 200
        num1 = resp1.json()["number"]
        
        # Get second number
        resp2 = requests.get(f"{BASE_URL}/api/nomenclatures/next-number/{nom_id}", headers=headers)
        assert resp2.status_code == 200
        num2 = resp2.json()["number"]
        
        # Numbers should be different (incremented)
        assert num1 != num2, f"Numbers should increment: {num1} vs {num2}"
        print(f"✅ Nomenclature numbers increment correctly: {num1} -> {num2}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_companies(self, headers):
        """Clean up TEST_ prefixed companies"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
        if response.status_code == 200:
            companies = response.json()
            deleted = 0
            for company in companies:
                if company["name"].startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/companies/{company['company_id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✅ Cleaned up {deleted} test companies")
    
    def test_cleanup_test_nomenclatures(self, headers):
        """Clean up TEST_ prefixed nomenclatures"""
        response = requests.get(f"{BASE_URL}/api/nomenclatures", headers=headers)
        if response.status_code == 200:
            nomenclatures = response.json()
            deleted = 0
            for nom in nomenclatures:
                if nom["name"].startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/nomenclatures/{nom['nomenclature_id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✅ Cleaned up {deleted} test nomenclatures")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
