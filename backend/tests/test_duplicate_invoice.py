"""
Test cases for Invoice Duplicate functionality
Tests the POST /api/invoices/{invoice_id}/duplicate endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestInvoiceDuplicate:
    """Tests for duplicating invoices"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carrerojorge99@gmail.com",
            "password": "12345678"
        })
        
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping tests")
        
        # Cookies are automatically stored in session
        yield
    
    def test_get_existing_invoices(self):
        """Get list of invoices to find one to duplicate"""
        response = self.session.get(f"{BASE_URL}/api/invoices")
        assert response.status_code == 200, f"Failed to get invoices: {response.text}"
        
        invoices = response.json()
        print(f"Found {len(invoices)} invoices")
        
        # Store first invoice for duplication test
        if invoices:
            self.original_invoice = invoices[0]
            print(f"First invoice: {self.original_invoice.get('invoice_number')} - ID: {self.original_invoice.get('invoice_id')}")
        else:
            pytest.skip("No invoices found to duplicate")
        
        return invoices
    
    def test_duplicate_invoice_endpoint(self):
        """Test the duplicate invoice endpoint"""
        # First get an invoice to duplicate
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        assert invoices_response.status_code == 200
        invoices = invoices_response.json()
        
        if not invoices:
            pytest.skip("No invoices available to duplicate")
        
        original = invoices[0]
        original_id = original.get('invoice_id')
        original_number = original.get('invoice_number')
        original_total = original.get('total', 0)
        original_items = original.get('items', [])
        original_client = original.get('client_name', '')
        
        print(f"\n--- Duplicating Invoice ---")
        print(f"Original ID: {original_id}")
        print(f"Original Number: {original_number}")
        print(f"Original Client: {original_client}")
        print(f"Original Total: ${original_total}")
        print(f"Original Items: {len(original_items)}")
        
        # Call duplicate endpoint
        response = self.session.post(f"{BASE_URL}/api/invoices/{original_id}/duplicate")
        
        assert response.status_code == 200, f"Duplicate failed: {response.text}"
        
        duplicated = response.json()
        
        print(f"\n--- Duplicated Invoice ---")
        print(f"New ID: {duplicated.get('invoice_id')}")
        print(f"New Number: {duplicated.get('invoice_number')}")
        print(f"New Status: {duplicated.get('status')}")
        print(f"Amount Paid: {duplicated.get('amount_paid')}")
        print(f"Balance Due: {duplicated.get('balance_due')}")
        print(f"Created At: {duplicated.get('created_at')}")
        
        # CRITICAL ASSERTIONS
        # 1. New invoice_id must be different
        assert duplicated.get('invoice_id') != original_id, "Duplicated invoice should have new ID"
        
        # 2. New invoice_number must be different  
        assert duplicated.get('invoice_number') != original_number, "Duplicated invoice should have new number"
        
        # 3. Status should be 'draft'
        assert duplicated.get('status') == 'draft', f"Status should be 'draft', got: {duplicated.get('status')}"
        
        # 4. amount_paid should be 0
        assert duplicated.get('amount_paid') == 0 or duplicated.get('amount_paid') == 0.0, \
            f"Amount paid should be 0, got: {duplicated.get('amount_paid')}"
        
        # 5. balance_due should equal original total
        assert duplicated.get('balance_due') == original_total, \
            f"Balance due should be {original_total}, got: {duplicated.get('balance_due')}"
        
        # 6. Items should be preserved
        duplicated_items = duplicated.get('items', [])
        assert len(duplicated_items) == len(original_items), \
            f"Items count should be {len(original_items)}, got: {len(duplicated_items)}"
        
        # 7. Client should be preserved
        assert duplicated.get('client_name') == original_client, \
            f"Client should be '{original_client}', got: '{duplicated.get('client_name')}'"
        
        # 8. Total should be preserved
        assert duplicated.get('total') == original_total, \
            f"Total should be {original_total}, got: {duplicated.get('total')}"
        
        # 9. created_at should be recent (today)
        from datetime import datetime
        created_at = duplicated.get('created_at', '')
        today = datetime.now().strftime('%Y-%m-%d')
        assert today in created_at, f"Created at should be today ({today}), got: {created_at}"
        
        print("\n✅ All duplicate invoice assertions passed!")
        
        # Store for verification
        self.duplicated_invoice = duplicated
        return duplicated
    
    def test_verify_duplicated_invoice_in_list(self):
        """Verify the duplicated invoice appears in the invoice list"""
        # First duplicate an invoice
        invoices_response = self.session.get(f"{BASE_URL}/api/invoices")
        invoices = invoices_response.json()
        
        if not invoices:
            pytest.skip("No invoices available")
        
        original = invoices[0]
        original_id = original.get('invoice_id')
        
        # Duplicate
        dup_response = self.session.post(f"{BASE_URL}/api/invoices/{original_id}/duplicate")
        assert dup_response.status_code == 200
        duplicated = dup_response.json()
        new_id = duplicated.get('invoice_id')
        new_number = duplicated.get('invoice_number')
        
        # Get fresh list
        fresh_response = self.session.get(f"{BASE_URL}/api/invoices")
        assert fresh_response.status_code == 200
        fresh_invoices = fresh_response.json()
        
        # Find the duplicated invoice
        found = None
        for inv in fresh_invoices:
            if inv.get('invoice_id') == new_id:
                found = inv
                break
        
        assert found is not None, f"Duplicated invoice {new_id} not found in list"
        assert found.get('invoice_number') == new_number
        assert found.get('status') == 'draft'
        
        print(f"✅ Duplicated invoice #{new_number} found in list with status 'draft'")
    
    def test_duplicate_nonexistent_invoice(self):
        """Test duplicating a non-existent invoice returns 404"""
        fake_id = "inv_nonexistent12345678"
        response = self.session.post(f"{BASE_URL}/api/invoices/{fake_id}/duplicate")
        
        assert response.status_code == 404, f"Should return 404 for non-existent invoice, got: {response.status_code}"
        print("✅ Correctly returns 404 for non-existent invoice")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
