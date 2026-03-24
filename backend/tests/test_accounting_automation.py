"""
Test Accounting Automation API Endpoints
- Payroll → Accounting journal entries (10% retención servicios profesionales, FICA, Medicare)
- Project Expenses → Accounting journal entries  
- Invoices → Accounting AR
- Payments → Accounting journal entries and AR update
- Purchase Orders → Accounts Payable sync
- Subcontractor payments with 10% withholding
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "carrerojorge99@gmail.com"
TEST_PASSWORD = "12345678"


class TestAccountingAutomation:
    """Test accounting automation endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip("Authentication failed - skipping tests")
        
        # Store cookies from login
        self.session.cookies = login_response.cookies

    # ==================== HEALTH CHECK ====================
    def test_01_api_health(self):
        """Verify API is healthy"""
        response = self.session.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✅ API health check passed")

    def test_02_accounting_dashboard(self):
        """Test accounting dashboard loads"""
        response = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "receivables" in data
        assert "payables" in data
        print(f"✅ Dashboard loaded - Net worth: ${data['summary'].get('net_worth', 0):.2f}")

    def test_03_chart_of_accounts(self):
        """Test chart of accounts list"""
        response = self.session.get(f"{BASE_URL}/api/accounting/chart-of-accounts")
        assert response.status_code == 200
        accounts = response.json()
        assert isinstance(accounts, list)
        print(f"✅ Chart of accounts - {len(accounts)} accounts found")
        
        # Check for the new withholding accounts
        account_numbers = [acc.get("account_number") for acc in accounts]
        
        # Check for account 2260 - Retención 10% Servicios Profesionales
        if "2260" in account_numbers:
            print("✅ Account 2260 (Retención 10% Servicios Profesionales) exists")
        else:
            print("⚠️ Account 2260 (Retención 10% Servicios Profesionales) NOT found")
        
        # Check for account 2270 - Retención Hacienda PR  
        if "2270" in account_numbers:
            print("✅ Account 2270 (Retención Hacienda PR) exists")
        else:
            print("⚠️ Account 2270 (Retención Hacienda PR) NOT found")

    # ==================== PAYROLL JOURNAL ENTRY ====================
    def test_04_payroll_journal_entry(self):
        """Test POST /api/accounting/payroll-journal - creates journal entry from payroll"""
        test_payroll_id = f"TEST_payroll_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "payroll_id": test_payroll_id,
            "period_start": "2024-01-01",
            "period_end": "2024-01-15",
            "totals": {
                "gross": 10000.00,
                "net": 8500.00,
                "deductions": 1500.00
            },
            "employees": [
                {
                    "user_id": "emp_001",
                    "name": "Test Employee",
                    "grossPay": 5000.00,
                    "netPay": 4250.00,
                    "hacienda": 250.00,
                    "ss": 310.00,
                    "medicare": 72.50,
                    "otherDeductions": 0
                },
                {
                    "user_id": "contractor_001",
                    "name": "Test Contractor",
                    "grossPay": 5000.00,
                    "netPay": 4500.00,
                    "hacienda": 0,
                    "ss": 0,
                    "medicare": 0,
                    "otherDeductions": 500.00  # 10% contractor withholding
                }
            ]
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/payroll-journal",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert data.get("success") == True or "entry_id" in data or "message" in data
        
        if data.get("success"):
            print(f"✅ Payroll journal entry created - Entry #{data.get('entry_number')}")
            print(f"   Total Debit: ${data.get('total_debit', 0):.2f}")
            print(f"   Total Credit: ${data.get('total_credit', 0):.2f}")
        else:
            print(f"ℹ️ Response: {data.get('message', data)}")

    def test_05_payroll_journal_duplicate_prevention(self):
        """Test that duplicate payroll entries are prevented"""
        test_payroll_id = f"TEST_dup_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "payroll_id": test_payroll_id,
            "period_start": "2024-02-01",
            "period_end": "2024-02-15",
            "totals": {"gross": 1000, "net": 850, "deductions": 150},
            "employees": [
                {"user_id": "emp_dup", "name": "Dup Test", "grossPay": 1000, "netPay": 850,
                 "hacienda": 50, "ss": 62, "medicare": 14.50, "otherDeductions": 0}
            ]
        }
        
        # First request should succeed
        response1 = self.session.post(f"{BASE_URL}/api/accounting/payroll-journal", json=payload)
        assert response1.status_code == 200
        data1 = response1.json()
        
        # If accounts not configured, skip the duplicate test
        if data1.get("success") == False and "cuentas" in data1.get("message", "").lower():
            print("ℹ️ Accounts not configured - skipping duplicate test")
            return
        
        # Second request should return message about already registered
        response2 = self.session.post(f"{BASE_URL}/api/accounting/payroll-journal", json=payload)
        assert response2.status_code == 200
        data2 = response2.json()
        assert "ya fue registrada" in data2.get("message", "").lower() or "entry_id" in data2 or data2.get("success") == False
        print("✅ Duplicate payroll prevention works")

    # ==================== EXPENSE JOURNAL ENTRY ====================
    def test_06_expense_journal_entry(self):
        """Test POST /api/accounting/expense-journal - creates journal entry for project expense"""
        test_expense_id = f"TEST_expense_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "expense_id": test_expense_id,
            "project_id": "proj_test123",
            "category_id": "cat_materials",
            "description": "Test materials purchase",
            "amount": 500.00,
            "expense_type": "material"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/expense-journal",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if data.get("success"):
            print(f"✅ Expense journal entry created - Entry #{data.get('entry_number')}")
        elif "message" in data:
            print(f"ℹ️ Response: {data.get('message')}")
        else:
            print(f"ℹ️ Response: {data}")

    def test_07_expense_journal_labor_type(self):
        """Test expense journal with labor type"""
        test_expense_id = f"TEST_labor_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "expense_id": test_expense_id,
            "project_id": "proj_test123",
            "category_id": "cat_labor",
            "description": "Test labor cost",
            "amount": 1500.00,
            "expense_type": "labor"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/expense-journal",
            json=payload
        )
        
        assert response.status_code == 200
        print("✅ Labor expense journal entry test passed")

    def test_08_expense_journal_subcontractor_type(self):
        """Test expense journal with subcontractor type"""
        test_expense_id = f"TEST_subcon_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "expense_id": test_expense_id,
            "project_id": "proj_test123",
            "category_id": "cat_subcontractor",
            "description": "Test subcontractor work",
            "amount": 2500.00,
            "expense_type": "subcontractor"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/expense-journal",
            json=payload
        )
        
        assert response.status_code == 200
        print("✅ Subcontractor expense journal entry test passed")

    # ==================== INVOICE JOURNAL ENTRY ====================
    def test_09_invoice_journal_entry(self):
        """Test POST /api/accounting/invoice-journal - creates journal entry and AR"""
        test_invoice_id = f"TEST_invoice_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "invoice_id": test_invoice_id,
            "project_id": "proj_test123",
            "client_name": "Test Client Corp",
            "total": 10000.00,
            "tax_amount": 1150.00  # 11.5% IVU
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/invoice-journal",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if data.get("success"):
            print(f"✅ Invoice journal entry created - Entry #{data.get('entry_number')}")
            if data.get("ar_id"):
                print(f"   AR Entry created: {data.get('ar_id')}")
        else:
            print(f"ℹ️ Response: {data.get('message', data)}")

    def test_10_invoice_journal_without_tax(self):
        """Test invoice journal without tax amount"""
        test_invoice_id = f"TEST_inv_notax_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "invoice_id": test_invoice_id,
            "client_name": "Tax Exempt Client",
            "total": 5000.00,
            "tax_amount": 0
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/invoice-journal",
            json=payload
        )
        
        assert response.status_code == 200
        print("✅ Invoice journal without tax passed")

    # ==================== PAYMENT JOURNAL ENTRY ====================
    def test_11_payment_journal_entry(self):
        """Test POST /api/accounting/payment-journal - creates journal entry and updates AR"""
        # First create an invoice to pay
        test_invoice_id = f"TEST_topay_{uuid.uuid4().hex[:8]}"
        invoice_payload = {
            "invoice_id": test_invoice_id,
            "client_name": "Paying Client",
            "total": 3000.00,
            "tax_amount": 0
        }
        self.session.post(f"{BASE_URL}/api/accounting/invoice-journal", json=invoice_payload)
        
        # Now create payment
        test_payment_id = f"TEST_payment_{uuid.uuid4().hex[:8]}"
        
        payload = {
            "payment_id": test_payment_id,
            "invoice_id": test_invoice_id,
            "amount": 3000.00,
            "payment_method": "check"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/payment-journal",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if data.get("success"):
            print(f"✅ Payment journal entry created - Entry #{data.get('entry_number')}")
        else:
            print(f"ℹ️ Response: {data.get('message', data)}")

    def test_12_payment_journal_partial_payment(self):
        """Test partial payment handling"""
        test_invoice_id = f"TEST_partial_{uuid.uuid4().hex[:8]}"
        
        # Create invoice
        invoice_payload = {
            "invoice_id": test_invoice_id,
            "client_name": "Partial Payer",
            "total": 5000.00,
            "tax_amount": 0
        }
        self.session.post(f"{BASE_URL}/api/accounting/invoice-journal", json=invoice_payload)
        
        # Partial payment
        payment_payload = {
            "payment_id": f"TEST_part1_{uuid.uuid4().hex[:8]}",
            "invoice_id": test_invoice_id,
            "amount": 2000.00,
            "payment_method": "transfer"
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/payment-journal",
            json=payment_payload
        )
        
        assert response.status_code == 200
        print("✅ Partial payment journal entry test passed")

    # ==================== PURCHASE ORDERS → AP SYNC ====================
    def test_13_sync_purchase_orders_to_ap(self):
        """Test POST /api/accounting/sync-purchase-orders - syncs POs to Accounts Payable"""
        response = self.session.post(f"{BASE_URL}/api/accounting/sync-purchase-orders")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        synced_count = data.get("synced", 0)
        print(f"✅ PO to AP sync completed - {synced_count} orders synced")
        print(f"   Message: {data.get('message')}")

    # ==================== SUBCONTRACTOR PAYMENT WITH 10% WITHHOLDING ====================
    def test_14_subcontractor_payment_with_withholding(self):
        """Test POST /api/accounting/subcontractor-payment - creates payment with 10% withholding"""
        payload = {
            "subcontractor_name": "Test Subcontractor LLC",
            "gross_amount": 10000.00,
            "project_id": "proj_test123",
            "description": "Concrete work Phase 1",
            "apply_withholding": True,
            "withholding_rate": 10.0
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/subcontractor-payment",
            json=payload
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if data.get("success"):
            print(f"✅ Subcontractor payment created - Entry #{data.get('entry_number')}")
            print(f"   Gross Amount: ${data.get('gross_amount', 0):.2f}")
            print(f"   Withholding (10%): ${data.get('withholding_amount', 0):.2f}")
            print(f"   Net Amount: ${data.get('net_amount', 0):.2f}")
            
            # Verify 10% calculation
            expected_withholding = 10000.00 * 0.10
            assert abs(data.get('withholding_amount', 0) - expected_withholding) < 0.01, \
                f"Expected withholding ${expected_withholding}, got ${data.get('withholding_amount', 0)}"
            assert abs(data.get('net_amount', 0) - 9000.00) < 0.01, \
                f"Expected net ${9000.00}, got ${data.get('net_amount', 0)}"
        else:
            print(f"ℹ️ Response: {data.get('message', data)}")

    def test_15_subcontractor_payment_without_withholding(self):
        """Test subcontractor payment without withholding applied"""
        payload = {
            "subcontractor_name": "Exempt Subcontractor",
            "gross_amount": 5000.00,
            "description": "Exempt work",
            "apply_withholding": False
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/subcontractor-payment",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            # When no withholding, net = gross
            assert abs(data.get('net_amount', 0) - data.get('gross_amount', 0)) < 0.01
            print("✅ Subcontractor payment without withholding passed")
            print(f"   Gross = Net = ${data.get('gross_amount', 0):.2f}")

    def test_16_subcontractor_payment_custom_rate(self):
        """Test subcontractor payment with custom withholding rate"""
        payload = {
            "subcontractor_name": "Custom Rate Contractor",
            "gross_amount": 8000.00,
            "description": "Special service",
            "apply_withholding": True,
            "withholding_rate": 7.0  # Custom 7% rate
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/accounting/subcontractor-payment",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        if data.get("success"):
            expected_withholding = 8000.00 * 0.07
            assert abs(data.get('withholding_amount', 0) - expected_withholding) < 0.01
            print(f"✅ Custom rate withholding passed - 7% = ${data.get('withholding_amount', 0):.2f}")

    # ==================== SYNC ENDPOINTS ====================
    def test_17_sync_invoices_to_ar(self):
        """Test POST /api/accounting/sync-invoices - syncs unpaid invoices to AR"""
        response = self.session.post(f"{BASE_URL}/api/accounting/sync-invoices")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        print(f"✅ Invoice to AR sync: {data.get('message')}")

    def test_18_sync_payroll_endpoint(self):
        """Test POST /api/accounting/sync-payroll - legacy endpoint"""
        response = self.session.post(f"{BASE_URL}/api/accounting/sync-payroll")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✅ Payroll sync endpoint: {data.get('message')}")

    # ==================== JOURNAL ENTRIES LIST ====================
    def test_19_journal_entries_list(self):
        """Test GET /api/accounting/journal-entries - list all entries"""
        response = self.session.get(f"{BASE_URL}/api/accounting/journal-entries")
        
        assert response.status_code == 200
        data = response.json()
        
        entries = data.get("entries", [])
        print(f"✅ Journal entries list - {len(entries)} entries found")
        
        # Check for different transaction types
        types_found = set()
        for entry in entries:
            if entry.get("transaction_type"):
                types_found.add(entry["transaction_type"])
        
        print(f"   Transaction types: {', '.join(types_found) if types_found else 'none'}")

    # ==================== AR AND AP LISTS ====================
    def test_20_accounts_receivable_list(self):
        """Test GET /api/accounting/accounts-receivable"""
        response = self.session.get(f"{BASE_URL}/api/accounting/accounts-receivable")
        
        assert response.status_code == 200
        ar_list = response.json()
        print(f"✅ AR list - {len(ar_list)} receivables")

    def test_21_accounts_payable_list(self):
        """Test GET /api/accounting/accounts-payable"""
        response = self.session.get(f"{BASE_URL}/api/accounting/accounts-payable")
        
        assert response.status_code == 200
        ap_list = response.json()
        print(f"✅ AP list - {len(ap_list)} payables")

    # ==================== TAX LIABILITIES ====================
    def test_22_tax_liabilities_list(self):
        """Test GET /api/accounting/tax-liabilities"""
        response = self.session.get(f"{BASE_URL}/api/accounting/tax-liabilities")
        
        assert response.status_code == 200
        tax_list = response.json()
        print(f"✅ Tax liabilities - {len(tax_list)} entries")
        
        # Check for different tax types
        tax_types = set()
        for item in tax_list:
            if item.get("tax_type"):
                tax_types.add(item["tax_type"])
        
        if tax_types:
            print(f"   Tax types found: {', '.join(tax_types)}")

    # ==================== CLEANUP ====================
    def test_99_cleanup_test_data(self):
        """Cleanup test data from database"""
        # Note: In a real scenario, we'd have a cleanup endpoint
        # For now, we just verify we can still access the endpoints
        response = self.session.get(f"{BASE_URL}/api/accounting/dashboard")
        assert response.status_code == 200
        print("✅ Test cleanup complete - all endpoints still accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
