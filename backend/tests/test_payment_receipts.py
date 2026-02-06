"""
Payment Receipts Module - Backend API Tests
Tests CRUD operations for payment receipts, attachments, and email functionality
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test session token - will be set in fixture
TEST_SESSION_TOKEN = None
TEST_VENDOR_ID = None
TEST_PROJECT_ID = None
CREATED_RECEIPT_ID = None


class TestPaymentReceiptsSetup:
    """Setup tests - verify prerequisites"""
    
    def test_api_health(self, api_client):
        """Test API is healthy"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")
    
    def test_get_vendors_for_receipts(self, authenticated_client):
        """Get vendors to use for receipt creation"""
        global TEST_VENDOR_ID
        response = authenticated_client.get(f"{BASE_URL}/api/vendors")
        assert response.status_code == 200
        vendors = response.json()
        assert isinstance(vendors, list)
        if len(vendors) > 0:
            TEST_VENDOR_ID = vendors[0].get("vendor_id")
            print(f"✓ Found {len(vendors)} vendors, using: {TEST_VENDOR_ID}")
        else:
            pytest.skip("No vendors available for testing")
    
    def test_get_projects_for_receipts(self, authenticated_client):
        """Get projects to use for receipt creation (optional)"""
        global TEST_PROJECT_ID
        response = authenticated_client.get(f"{BASE_URL}/api/projects")
        assert response.status_code == 200
        projects = response.json()
        assert isinstance(projects, list)
        if len(projects) > 0:
            TEST_PROJECT_ID = projects[0].get("project_id")
            print(f"✓ Found {len(projects)} projects, using: {TEST_PROJECT_ID}")
        else:
            print("⚠ No projects available, will test without project association")


class TestPaymentReceiptsCRUD:
    """CRUD operations for payment receipts"""
    
    def test_get_all_receipts(self, authenticated_client):
        """Test GET /api/receipts - list all receipts"""
        response = authenticated_client.get(f"{BASE_URL}/api/receipts")
        assert response.status_code == 200
        receipts = response.json()
        assert isinstance(receipts, list)
        print(f"✓ GET /api/receipts returned {len(receipts)} receipts")
        
        # Verify receipt structure if any exist
        if len(receipts) > 0:
            receipt = receipts[0]
            assert "receipt_id" in receipt
            assert "receipt_number" in receipt
            assert "vendor_id" in receipt
            assert "amount" in receipt
            print(f"✓ Receipt structure validated: {receipt.get('receipt_number')}")
    
    def test_create_receipt_without_project(self, authenticated_client):
        """Test POST /api/receipts - create receipt without project"""
        global CREATED_RECEIPT_ID, TEST_VENDOR_ID
        
        if not TEST_VENDOR_ID:
            # Get a vendor first
            vendors_response = authenticated_client.get(f"{BASE_URL}/api/vendors")
            if vendors_response.status_code == 200 and len(vendors_response.json()) > 0:
                TEST_VENDOR_ID = vendors_response.json()[0].get("vendor_id")
            else:
                pytest.skip("No vendors available for testing")
        
        payload = {
            "vendor_id": TEST_VENDOR_ID,
            "project_id": None,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 2500.50,
            "payment_method": "transferencia",
            "reference_number": "TEST-REF-001",
            "concept": "TEST - Pago de prueba sin proyecto",
            "notes": "Recibo creado por pruebas automatizadas"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/receipts", json=payload)
        assert response.status_code == 200, f"Failed to create receipt: {response.text}"
        
        data = response.json()
        assert "receipt" in data
        receipt = data["receipt"]
        
        # Validate receipt data
        assert receipt["vendor_id"] == TEST_VENDOR_ID
        assert receipt["amount"] == 2500.50
        assert receipt["payment_method"] == "transferencia"
        assert receipt["concept"] == "TEST - Pago de prueba sin proyecto"
        assert receipt["project_id"] is None
        assert "receipt_number" in receipt
        assert receipt["receipt_number"].startswith("REC-")
        
        CREATED_RECEIPT_ID = receipt["receipt_id"]
        print(f"✓ Created receipt: {receipt['receipt_number']} (ID: {CREATED_RECEIPT_ID})")
    
    def test_create_receipt_with_project(self, authenticated_client):
        """Test POST /api/receipts - create receipt with project association"""
        global TEST_VENDOR_ID, TEST_PROJECT_ID
        
        if not TEST_VENDOR_ID:
            vendors_response = authenticated_client.get(f"{BASE_URL}/api/vendors")
            if vendors_response.status_code == 200 and len(vendors_response.json()) > 0:
                TEST_VENDOR_ID = vendors_response.json()[0].get("vendor_id")
            else:
                pytest.skip("No vendors available")
        
        if not TEST_PROJECT_ID:
            projects_response = authenticated_client.get(f"{BASE_URL}/api/projects")
            if projects_response.status_code == 200 and len(projects_response.json()) > 0:
                TEST_PROJECT_ID = projects_response.json()[0].get("project_id")
            else:
                pytest.skip("No projects available for this test")
        
        payload = {
            "vendor_id": TEST_VENDOR_ID,
            "project_id": TEST_PROJECT_ID,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "amount": 3750.00,
            "payment_method": "cheque",
            "reference_number": "CHK-12345",
            "concept": "TEST - Pago con proyecto asociado",
            "notes": "Recibo con proyecto"
        }
        
        response = authenticated_client.post(f"{BASE_URL}/api/receipts", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        receipt = data["receipt"]
        assert receipt["project_id"] == TEST_PROJECT_ID
        assert receipt["project_name"] is not None
        print(f"✓ Created receipt with project: {receipt['receipt_number']}, Project: {receipt['project_name']}")
    
    def test_get_receipt_by_id(self, authenticated_client):
        """Test GET /api/receipts/{receipt_id} - get single receipt"""
        global CREATED_RECEIPT_ID
        
        if not CREATED_RECEIPT_ID:
            # Get any existing receipt
            receipts_response = authenticated_client.get(f"{BASE_URL}/api/receipts")
            if receipts_response.status_code == 200 and len(receipts_response.json()) > 0:
                CREATED_RECEIPT_ID = receipts_response.json()[0].get("receipt_id")
            else:
                pytest.skip("No receipts available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
        assert response.status_code == 200
        
        receipt = response.json()
        assert receipt["receipt_id"] == CREATED_RECEIPT_ID
        assert "receipt_number" in receipt
        assert "vendor_name" in receipt
        assert "amount" in receipt
        assert "attachments" in receipt
        print(f"✓ GET receipt by ID: {receipt['receipt_number']}")
    
    def test_get_receipt_not_found(self, authenticated_client):
        """Test GET /api/receipts/{receipt_id} - 404 for non-existent receipt"""
        response = authenticated_client.get(f"{BASE_URL}/api/receipts/nonexistent_id_12345")
        assert response.status_code == 404
        print("✓ GET non-existent receipt returns 404")
    
    def test_update_receipt(self, authenticated_client):
        """Test PUT /api/receipts/{receipt_id} - update receipt"""
        global CREATED_RECEIPT_ID
        
        if not CREATED_RECEIPT_ID:
            pytest.skip("No receipt created to update")
        
        update_payload = {
            "amount": 2750.75,
            "payment_method": "efectivo",
            "reference_number": "UPDATED-REF-001",
            "concept": "TEST - Concepto actualizado",
            "notes": "Notas actualizadas por prueba"
        }
        
        response = authenticated_client.put(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}", json=update_payload)
        assert response.status_code == 200
        
        # Verify update by fetching the receipt
        get_response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
        assert get_response.status_code == 200
        
        updated_receipt = get_response.json()
        assert updated_receipt["amount"] == 2750.75
        assert updated_receipt["payment_method"] == "efectivo"
        assert updated_receipt["concept"] == "TEST - Concepto actualizado"
        assert updated_receipt["updated_at"] is not None
        print(f"✓ Updated receipt: {updated_receipt['receipt_number']}")


class TestPaymentReceiptsFilters:
    """Test filtering functionality"""
    
    def test_filter_by_vendor(self, authenticated_client):
        """Test GET /api/receipts?vendor_id=xxx - filter by vendor"""
        global TEST_VENDOR_ID
        
        if not TEST_VENDOR_ID:
            vendors_response = authenticated_client.get(f"{BASE_URL}/api/vendors")
            if vendors_response.status_code == 200 and len(vendors_response.json()) > 0:
                TEST_VENDOR_ID = vendors_response.json()[0].get("vendor_id")
            else:
                pytest.skip("No vendors available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/receipts?vendor_id={TEST_VENDOR_ID}")
        assert response.status_code == 200
        
        receipts = response.json()
        assert isinstance(receipts, list)
        # All returned receipts should belong to the vendor
        for receipt in receipts:
            assert receipt["vendor_id"] == TEST_VENDOR_ID
        print(f"✓ Filter by vendor returned {len(receipts)} receipts")
    
    def test_filter_by_project(self, authenticated_client):
        """Test GET /api/receipts?project_id=xxx - filter by project"""
        global TEST_PROJECT_ID
        
        if not TEST_PROJECT_ID:
            projects_response = authenticated_client.get(f"{BASE_URL}/api/projects")
            if projects_response.status_code == 200 and len(projects_response.json()) > 0:
                TEST_PROJECT_ID = projects_response.json()[0].get("project_id")
            else:
                pytest.skip("No projects available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/receipts?project_id={TEST_PROJECT_ID}")
        assert response.status_code == 200
        
        receipts = response.json()
        assert isinstance(receipts, list)
        print(f"✓ Filter by project returned {len(receipts)} receipts")


class TestVendorReceipts:
    """Test vendor-specific receipts endpoint"""
    
    def test_get_vendor_receipts(self, authenticated_client):
        """Test GET /api/vendors/{vendor_id}/receipts"""
        global TEST_VENDOR_ID
        
        if not TEST_VENDOR_ID:
            vendors_response = authenticated_client.get(f"{BASE_URL}/api/vendors")
            if vendors_response.status_code == 200 and len(vendors_response.json()) > 0:
                TEST_VENDOR_ID = vendors_response.json()[0].get("vendor_id")
            else:
                pytest.skip("No vendors available")
        
        response = authenticated_client.get(f"{BASE_URL}/api/vendors/{TEST_VENDOR_ID}/receipts")
        assert response.status_code == 200
        
        receipts = response.json()
        assert isinstance(receipts, list)
        # All receipts should belong to this vendor
        for receipt in receipts:
            assert receipt["vendor_id"] == TEST_VENDOR_ID
        print(f"✓ GET vendor receipts returned {len(receipts)} receipts")
    
    def test_get_vendor_receipts_not_found(self, authenticated_client):
        """Test GET /api/vendors/{vendor_id}/receipts - 404 for non-existent vendor"""
        response = authenticated_client.get(f"{BASE_URL}/api/vendors/nonexistent_vendor_123/receipts")
        assert response.status_code == 404
        print("✓ GET receipts for non-existent vendor returns 404")


class TestReceiptAttachments:
    """Test attachment functionality"""
    
    def test_add_attachment(self, authenticated_client):
        """Test POST /api/receipts/{receipt_id}/attachments"""
        global CREATED_RECEIPT_ID
        
        if not CREATED_RECEIPT_ID:
            # Get any existing receipt
            receipts_response = authenticated_client.get(f"{BASE_URL}/api/receipts")
            if receipts_response.status_code == 200 and len(receipts_response.json()) > 0:
                CREATED_RECEIPT_ID = receipts_response.json()[0].get("receipt_id")
            else:
                pytest.skip("No receipts available")
        
        attachment_payload = {
            "filename": "test_comprobante.pdf",
            "url": "https://example.com/test_comprobante.pdf",
            "file_type": "pdf"
        }
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}/attachments",
            json=attachment_payload
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "attachment" in data
        attachment = data["attachment"]
        assert attachment["filename"] == "test_comprobante.pdf"
        assert "attachment_id" in attachment
        print(f"✓ Added attachment: {attachment['filename']}")
        
        # Verify attachment was added
        get_response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
        receipt = get_response.json()
        assert len(receipt["attachments"]) > 0
        print(f"✓ Receipt now has {len(receipt['attachments'])} attachment(s)")
    
    def test_delete_attachment(self, authenticated_client):
        """Test DELETE /api/receipts/{receipt_id}/attachments/{attachment_id}"""
        global CREATED_RECEIPT_ID
        
        if not CREATED_RECEIPT_ID:
            pytest.skip("No receipt available")
        
        # First get the receipt to find an attachment
        get_response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
        receipt = get_response.json()
        
        if not receipt.get("attachments") or len(receipt["attachments"]) == 0:
            # Add an attachment first
            attachment_payload = {
                "filename": "to_delete.pdf",
                "url": "https://example.com/to_delete.pdf",
                "file_type": "pdf"
            }
            authenticated_client.post(
                f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}/attachments",
                json=attachment_payload
            )
            get_response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
            receipt = get_response.json()
        
        attachment_id = receipt["attachments"][0]["attachment_id"]
        initial_count = len(receipt["attachments"])
        
        response = authenticated_client.delete(
            f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}/attachments/{attachment_id}"
        )
        assert response.status_code == 200
        
        # Verify deletion
        get_response = authenticated_client.get(f"{BASE_URL}/api/receipts/{CREATED_RECEIPT_ID}")
        updated_receipt = get_response.json()
        assert len(updated_receipt["attachments"]) == initial_count - 1
        print(f"✓ Deleted attachment, remaining: {len(updated_receipt['attachments'])}")


class TestReceiptNumbering:
    """Test automatic receipt numbering"""
    
    def test_receipt_number_format(self, authenticated_client):
        """Verify receipt numbers follow REC-XXXX format"""
        response = authenticated_client.get(f"{BASE_URL}/api/receipts")
        assert response.status_code == 200
        
        receipts = response.json()
        for receipt in receipts:
            receipt_number = receipt.get("receipt_number", "")
            assert receipt_number.startswith("REC-"), f"Invalid format: {receipt_number}"
            # Extract number part and verify it's numeric
            num_part = receipt_number.split("-")[1]
            assert num_part.isdigit(), f"Non-numeric part: {num_part}"
            assert len(num_part) == 4, f"Should be 4 digits: {num_part}"
        print(f"✓ All {len(receipts)} receipts have valid REC-XXXX format")


class TestReceiptCleanup:
    """Cleanup test data"""
    
    def test_delete_test_receipts(self, authenticated_client):
        """Delete receipts created during testing"""
        response = authenticated_client.get(f"{BASE_URL}/api/receipts")
        assert response.status_code == 200
        
        receipts = response.json()
        deleted_count = 0
        
        for receipt in receipts:
            if "TEST" in receipt.get("concept", ""):
                delete_response = authenticated_client.delete(
                    f"{BASE_URL}/api/receipts/{receipt['receipt_id']}"
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test receipts")


# Fixtures
@pytest.fixture(scope="session")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="session")
def session_token():
    """Create test session in MongoDB"""
    import subprocess
    import re
    
    result = subprocess.run([
        "mongosh", "--quiet", "--eval", """
        use('test_database');
        var userId = 'test-user-receipts-' + Date.now();
        var sessionToken = 'test_session_receipts_' + Date.now();
        db.users.insertOne({
          user_id: userId,
          email: 'test.receipts.' + Date.now() + '@example.com',
          name: 'Test Receipts User',
          picture: 'https://via.placeholder.com/150',
          role: 'super_admin',
          created_at: new Date()
        });
        db.user_sessions.insertOne({
          user_id: userId,
          session_token: sessionToken,
          expires_at: new Date(Date.now() + 7*24*60*60*1000),
          created_at: new Date()
        });
        print('TOKEN=' + sessionToken);
        """
    ], capture_output=True, text=True)
    
    match = re.search(r'TOKEN=(\S+)', result.stdout)
    if match:
        return match.group(1)
    pytest.fail("Failed to create test session")


@pytest.fixture(scope="session")
def authenticated_client(api_client, session_token):
    """Session with auth cookie"""
    api_client.cookies.set("session_token", session_token)
    return api_client
