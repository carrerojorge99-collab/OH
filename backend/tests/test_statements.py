"""
Test file for Statements (Account Statements) feature
Tests CRUD operations for statements endpoint

Testing:
- GET /api/statements - List all statements
- POST /api/statements - Create a new statement from invoice_ids
- GET /api/statements/{statement_id} - Get single statement
- DELETE /api/statements/{statement_id} - Delete a statement  
- POST /api/statements/preview - Preview statement without saving
- GET /api/statements/clients/summary - Get clients summary for statements
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from review request
TEST_EMAIL = "carrerojorge99@gmail.com"
TEST_PASSWORD = "test123"

# Alternative credentials from previous tests
ALT_EMAIL = "j.carrero@ohsmspr.com"
ALT_PASSWORD = "Admin2024!"

# Test data from review request
TEST_INVOICE_IDS = ['inv_3e8b8b7d8a464278', 'inv_2b83fd8b90bb4f81']
TEST_CLIENT_NAME = 'Janssen-Ortho LLC'


class TestStatementsAPI:
    """Test suite for Statements API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.user_info = None
        self.statement_id = None  # To track created statement for cleanup
        
        # Try primary credentials first
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("token") or data.get("session_token")
            self.user_info = data.get("user", {})
            print(f"Login successful with {TEST_EMAIL}")
        else:
            # Try alternate credentials
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ALT_EMAIL,
                "password": ALT_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                self.token = data.get("token") or data.get("session_token")
                self.user_info = data.get("user", {})
                print(f"Login successful with {ALT_EMAIL}")
            else:
                print(f"Login failed with both credentials. Status: {login_response.status_code}")
                pytest.skip("Authentication failed - skipping tests")
        
        if self.token:
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            self.session.cookies.set('session_token', self.token)
        
        yield
        
        # Cleanup: Delete test statement if created
        if self.statement_id:
            try:
                self.session.delete(f"{BASE_URL}/api/statements/{self.statement_id}")
                print(f"Cleaned up test statement: {self.statement_id}")
            except Exception as e:
                print(f"Cleanup warning: {e}")
    
    def test_01_health_check(self):
        """Test API is accessible"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("API health check: PASS")
    
    def test_02_get_statements_list(self):
        """Test GET /api/statements - List all statements"""
        response = self.session.get(f"{BASE_URL}/api/statements")
        
        assert response.status_code == 200, f"GET /statements failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are statements
        if len(data) > 0:
            statement = data[0]
            assert "statement_id" in statement, "Statement should have statement_id"
            assert "statement_number" in statement, "Statement should have statement_number"
            assert "client_name" in statement, "Statement should have client_name"
            print(f"GET /statements: PASS - Found {len(data)} statements")
        else:
            print("GET /statements: PASS - No statements found (empty list)")
    
    def test_03_get_clients_summary(self):
        """Test GET /api/statements/clients/summary - Get unique clients"""
        response = self.session.get(f"{BASE_URL}/api/statements/clients/summary")
        
        assert response.status_code == 200, f"GET /statements/clients/summary failed: {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check structure if there are clients
        if len(data) > 0:
            client = data[0]
            assert "client_name" in client, "Client should have client_name"
            assert "invoice_count" in client, "Client should have invoice_count"
            assert "invoice_ids" in client, "Client should have invoice_ids"
            print(f"GET /statements/clients/summary: PASS - Found {len(data)} unique clients")
            
            # Store for later tests
            self.available_clients = data
        else:
            print("GET /statements/clients/summary: PASS - No clients found")
    
    def test_04_get_invoices_for_statement(self):
        """Test that invoices exist for creating statements"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        
        assert response.status_code == 200, f"GET /invoices failed: {response.status_code}"
        data = response.json()
        
        print(f"Found {len(data)} invoices available")
        
        if len(data) > 0:
            # Check for our test invoices
            invoice_ids = [inv.get('invoice_id') for inv in data]
            found_test_invoices = [iid for iid in TEST_INVOICE_IDS if iid in invoice_ids]
            print(f"Test invoices found: {len(found_test_invoices)}/{len(TEST_INVOICE_IDS)}")
            
            # Store some invoice IDs for later tests
            self.test_invoice_ids = [data[0].get('invoice_id')] if data else []
    
    def test_05_preview_statement(self):
        """Test POST /api/statements/preview - Preview without saving"""
        # First get some invoices
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not get invoices")
        
        invoices = invoices_response.json()
        if len(invoices) == 0:
            pytest.skip("No invoices available for testing")
        
        # Use first invoice for preview
        invoice = invoices[0]
        preview_data = {
            "client_name": invoice.get('client_name', 'Test Client'),
            "client_email": invoice.get('client_email'),
            "client_phone": invoice.get('client_phone'),
            "client_address": invoice.get('client_address'),
            "invoice_ids": [invoice.get('invoice_id')],
            "date_from": None,
            "date_to": None,
            "notes": "Test preview"
        }
        
        response = self.session.post(f"{BASE_URL}/api/statements/preview", json=preview_data)
        
        assert response.status_code == 200, f"POST /statements/preview failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Validate preview response structure
        assert "client_name" in data, "Preview should have client_name"
        assert "invoices" in data, "Preview should have invoices list"
        assert "total_invoiced" in data, "Preview should have total_invoiced"
        assert "total_paid" in data, "Preview should have total_paid"
        assert "balance_due" in data, "Preview should have balance_due"
        
        print(f"POST /statements/preview: PASS")
        print(f"  - Client: {data.get('client_name')}")
        print(f"  - Invoices: {len(data.get('invoices', []))}")
        print(f"  - Total: {data.get('total_invoiced')}")
        print(f"  - Balance: {data.get('balance_due')}")
    
    def test_06_create_statement(self):
        """Test POST /api/statements - Create new statement"""
        # First get some invoices
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not get invoices")
        
        invoices = invoices_response.json()
        if len(invoices) == 0:
            pytest.skip("No invoices available for testing")
        
        # Use first invoice
        invoice = invoices[0]
        statement_data = {
            "client_name": f"TEST_{invoice.get('client_name', 'Test Client')}",
            "client_email": invoice.get('client_email'),
            "client_phone": invoice.get('client_phone'),
            "client_address": invoice.get('client_address'),
            "invoice_ids": [invoice.get('invoice_id')],
            "date_from": None,
            "date_to": None,
            "notes": "TEST Statement - please delete"
        }
        
        response = self.session.post(f"{BASE_URL}/api/statements", json=statement_data)
        
        assert response.status_code == 200, f"POST /statements failed: {response.status_code} - {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "statement_id" in data, "Response should have statement_id"
        assert "statement_number" in data, "Response should have statement_number"
        assert "client_name" in data, "Response should have client_name"
        assert "invoices" in data, "Response should have invoices list"
        assert "total_invoiced" in data, "Response should have total_invoiced"
        assert "balance_due" in data, "Response should have balance_due"
        
        # Store for cleanup
        self.statement_id = data.get('statement_id')
        
        print(f"POST /statements: PASS")
        print(f"  - Statement ID: {data.get('statement_id')}")
        print(f"  - Number: {data.get('statement_number')}")
        print(f"  - Client: {data.get('client_name')}")
    
    def test_07_get_single_statement(self):
        """Test GET /api/statements/{statement_id}"""
        # First create a statement
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not get invoices")
        
        invoices = invoices_response.json()
        if len(invoices) == 0:
            pytest.skip("No invoices available")
        
        # Create statement
        invoice = invoices[0]
        statement_data = {
            "client_name": f"TEST_GetSingle_{invoice.get('client_name', 'Test')}",
            "invoice_ids": [invoice.get('invoice_id')],
            "notes": "TEST - GET single statement"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/statements", json=statement_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create statement for test")
        
        created_statement = create_response.json()
        statement_id = created_statement.get('statement_id')
        self.statement_id = statement_id  # For cleanup
        
        # Now test GET single
        response = self.session.get(f"{BASE_URL}/api/statements/{statement_id}")
        
        assert response.status_code == 200, f"GET /statements/{statement_id} failed: {response.status_code}"
        data = response.json()
        
        assert data.get('statement_id') == statement_id, "Statement ID should match"
        print(f"GET /statements/{{id}}: PASS - Retrieved statement {data.get('statement_number')}")
    
    def test_08_get_nonexistent_statement(self):
        """Test GET /api/statements/{id} with invalid ID"""
        response = self.session.get(f"{BASE_URL}/api/statements/nonexistent_id_12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("GET /statements/{{invalid_id}}: PASS - Returns 404 as expected")
    
    def test_09_delete_statement(self):
        """Test DELETE /api/statements/{statement_id}"""
        # First create a statement to delete
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        if invoices_response.status_code != 200:
            pytest.skip("Could not get invoices")
        
        invoices = invoices_response.json()
        if len(invoices) == 0:
            pytest.skip("No invoices available")
        
        # Create statement
        invoice = invoices[0]
        statement_data = {
            "client_name": f"TEST_Delete_{invoice.get('client_name', 'Test')}",
            "invoice_ids": [invoice.get('invoice_id')],
            "notes": "TEST - to be deleted"
        }
        
        create_response = self.session.post(f"{BASE_URL}/api/statements", json=statement_data)
        if create_response.status_code != 200:
            pytest.skip("Could not create statement for delete test")
        
        created_statement = create_response.json()
        statement_id = created_statement.get('statement_id')
        
        # Now delete
        delete_response = self.session.delete(f"{BASE_URL}/api/statements/{statement_id}")
        
        assert delete_response.status_code == 200, f"DELETE failed: {delete_response.status_code}"
        
        # Verify deletion
        get_response = self.session.get(f"{BASE_URL}/api/statements/{statement_id}")
        assert get_response.status_code == 404, "Statement should be deleted (404)"
        
        print("DELETE /statements/{{id}}: PASS - Statement deleted successfully")
    
    def test_10_create_statement_empty_invoices(self):
        """Test POST /api/statements with empty invoice_ids"""
        statement_data = {
            "client_name": "TEST Invalid",
            "invoice_ids": [],
            "notes": "Should fail"
        }
        
        response = self.session.post(f"{BASE_URL}/api/statements", json=statement_data)
        
        assert response.status_code == 400, f"Expected 400 for empty invoices, got {response.status_code}"
        print("POST /statements (empty invoices): PASS - Returns 400 as expected")
    
    def test_11_create_statement_invalid_invoices(self):
        """Test POST /api/statements with invalid invoice_ids"""
        statement_data = {
            "client_name": "TEST Invalid",
            "invoice_ids": ["invalid_invoice_1", "invalid_invoice_2"],
            "notes": "Should fail"
        }
        
        response = self.session.post(f"{BASE_URL}/api/statements", json=statement_data)
        
        # Should return 404 when invoices not found
        assert response.status_code == 404, f"Expected 404 for invalid invoices, got {response.status_code}"
        print("POST /statements (invalid invoices): PASS - Returns 404 as expected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
