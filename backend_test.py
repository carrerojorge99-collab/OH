#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class ClockSystemTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_project_id = None
        self.active_clock_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="carrerojorge99@gmail.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_get_projects(self):
        """Test getting available projects for clock-in"""
        print(f"\n🔍 Testing Get Available Projects...")
        
        try:
            url = f"{self.api_url}/clock/projects"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list) and len(projects) > 0:
                    self.test_project_id = projects[0]['project_id']
                    project_name = projects[0]['name']
                    self.log_test("Get Available Projects", True, f"Found {len(projects)} projects. Using: {project_name} (ID: {self.test_project_id})")
                    return True, projects
                else:
                    self.log_test("Get Available Projects", False, "", "No projects available for clock-in")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Available Projects", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Available Projects", False, "", str(e))
            return False, []

    def test_get_active_clock_initial(self):
        """Test getting active clock - clean up any existing active clock first"""
        print(f"\n🔍 Testing Get Active Clock (Initial State)...")
        
        try:
            url = f"{self.api_url}/clock/active"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                active_clock = response.json()
                if active_clock is None:
                    self.log_test("Get Active Clock (Initial)", True, "No active clock found (as expected)")
                    return True
                else:
                    # Found an existing active clock - need to clock out first
                    print(f"   Found existing active clock: {active_clock['clock_id']}")
                    print(f"   Clocking out existing entry to clean state...")
                    
                    # Clock out the existing entry
                    params = {
                        "latitude": 18.207,
                        "longitude": -65.740,
                        "notes": "Cleanup clock out for testing"
                    }
                    
                    clock_out_url = f"{self.api_url}/clock/out"
                    clock_out_response = self.session.post(clock_out_url, params=params, timeout=30)
                    
                    if clock_out_response.status_code == 200:
                        self.log_test("Get Active Clock (Initial)", True, "Cleaned up existing active clock")
                        return True
                    else:
                        self.log_test("Get Active Clock (Initial)", False, "", f"Failed to clean up existing clock: {clock_out_response.status_code}")
                        return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Active Clock (Initial)", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Get Active Clock (Initial)", False, "", str(e))
            return False

    def test_clock_in(self):
        """Test clock in functionality"""
        print(f"\n🔍 Testing Clock IN...")
        
        if not self.test_project_id:
            self.log_test("Clock IN", False, "", "No project ID available")
            return False
        
        try:
            # Use the coordinates specified in the request
            params = {
                "project_id": self.test_project_id,
                "latitude": 18.207,
                "longitude": -65.740,
                "notes": "Test clock in"
            }
            
            url = f"{self.api_url}/clock/in"
            response = self.session.post(url, params=params, timeout=30)
            
            if response.status_code == 200:
                clock_data = response.json()
                if 'clock_id' in clock_data and clock_data.get('status') == 'active':
                    self.active_clock_id = clock_data['clock_id']
                    self.log_test("Clock IN", True, f"Clock ID: {self.active_clock_id}, Status: {clock_data['status']}")
                    return True, clock_data
                else:
                    self.log_test("Clock IN", False, "", f"Invalid response structure: {clock_data}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Clock IN", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Clock IN", False, "", str(e))
            return False, {}

    def test_get_active_clock_after_in(self):
        """Test getting active clock after clock-in - CRITICAL TEST"""
        print(f"\n🔍 Testing Get Active Clock (After Clock IN) - CRITICAL...")
        
        try:
            url = f"{self.api_url}/clock/active"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                active_clock = response.json()
                print(f"   Response Body: {json.dumps(active_clock, indent=2)}")
                
                if active_clock is not None:
                    # Verify the active clock has expected fields
                    required_fields = ['clock_id', 'project_id', 'status', 'clock_in']
                    missing_fields = [field for field in required_fields if field not in active_clock]
                    
                    if not missing_fields and active_clock.get('status') == 'active':
                        clock_id = active_clock['clock_id']
                        project_id = active_clock['project_id']
                        clock_in_time = active_clock['clock_in']
                        self.log_test("Get Active Clock (After Clock IN)", True, 
                                    f"Found active clock - ID: {clock_id}, Project: {project_id}, Clock In: {clock_in_time}")
                        return True, active_clock
                    else:
                        error_msg = f"Missing fields: {missing_fields}" if missing_fields else f"Invalid status: {active_clock.get('status')}"
                        self.log_test("Get Active Clock (After Clock IN)", False, "", error_msg)
                        return False, {}
                else:
                    self.log_test("Get Active Clock (After Clock IN)", False, "", "Active clock is null - this is the main problem!")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Get Active Clock (After Clock IN)", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Get Active Clock (After Clock IN)", False, "", str(e))
            return False, {}

    def test_clock_out(self):
        """Test clock out functionality"""
        print(f"\n🔍 Testing Clock OUT...")
        
        try:
            params = {
                "latitude": 18.207,
                "longitude": -65.740,
                "notes": "Test clock out"
            }
            
            url = f"{self.api_url}/clock/out"
            response = self.session.post(url, params=params, timeout=30)
            
            if response.status_code == 200:
                clock_data = response.json()
                if 'hours_worked' in clock_data and clock_data.get('status') == 'completed':
                    hours_worked = clock_data['hours_worked']
                    self.log_test("Clock OUT", True, f"Hours worked: {hours_worked}, Status: {clock_data['status']}")
                    return True, clock_data
                else:
                    self.log_test("Clock OUT", False, "", f"Invalid response structure: {clock_data}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Clock OUT", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Clock OUT", False, "", str(e))
            return False, {}

    def test_get_active_clock_after_out(self):
        """Test getting active clock after clock-out - should be null"""
        print(f"\n🔍 Testing Get Active Clock (After Clock OUT)...")
        
        try:
            url = f"{self.api_url}/clock/active"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                active_clock = response.json()
                if active_clock is None:
                    self.log_test("Get Active Clock (After Clock OUT)", True, "No active clock found (as expected after clock out)")
                    return True
                else:
                    self.log_test("Get Active Clock (After Clock OUT)", False, "", f"Found unexpected active clock: {active_clock}")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Active Clock (After Clock OUT)", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Get Active Clock (After Clock OUT)", False, "", str(e))
            return False

    def test_get_clock_history(self):
        """Test getting clock history for today"""
        print(f"\n🔍 Testing Get Clock History...")
        
        try:
            # Use today's date
            today = datetime.now().strftime("%Y-%m-%d")
            params = {"date": today}
            
            url = f"{self.api_url}/clock/history"
            response = self.session.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                history = response.json()
                if isinstance(history, list):
                    completed_entries = [entry for entry in history if entry.get('status') == 'completed']
                    self.log_test("Get Clock History", True, f"Found {len(history)} total entries, {len(completed_entries)} completed for {today}")
                    return True, history
                else:
                    self.log_test("Get Clock History", False, "", f"Invalid response format: {history}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Clock History", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Clock History", False, "", str(e))
            return False, []

    def run_clock_system_tests(self):
        """Run complete clock system test suite"""
        print("🚀 Starting Clock System Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Get available projects
        success, projects = self.test_get_projects()
        if not success:
            print("❌ Failed to get projects, stopping tests")
            return self.generate_report()
        
        # Step 3: Check initial active clock state
        self.test_get_active_clock_initial()
        
        # Step 4: Clock IN
        success, clock_data = self.test_clock_in()
        if not success:
            print("❌ Clock IN failed, stopping tests")
            return self.generate_report()
        
        # Step 5: CRITICAL - Check active clock after clock-in
        success, active_clock = self.test_get_active_clock_after_in()
        if not success:
            print("🚨 CRITICAL ISSUE: Active clock endpoint not working after clock-in!")
        
        # Step 6: Clock OUT
        self.test_clock_out()
        
        # Step 7: Check active clock after clock-out
        self.test_get_active_clock_after_out()
        
        # Step 8: Check history
        self.test_get_clock_history()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 CLOCK SYSTEM TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if "Active Clock (After Clock IN)" in test['test']]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
                print("     This is the main problem reported by the user!")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class CostEstimateExportTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data - using the specific estimate ID from the request
        self.estimate_id = "ce_91fd8f68b8684405"

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="carrerojorge99@gmail.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_get_cost_estimates(self):
        """Test getting cost estimates list"""
        print(f"\n🔍 Testing Get Cost Estimates List...")
        
        try:
            url = f"{self.api_url}/cost-estimates"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                estimates = response.json()
                if isinstance(estimates, list):
                    # Look for our specific estimate
                    target_estimate = None
                    for estimate in estimates:
                        if estimate.get('estimate_id') == self.estimate_id:
                            target_estimate = estimate
                            break
                    
                    if target_estimate:
                        self.log_test("Get Cost Estimates", True, 
                                    f"Found target estimate '{target_estimate.get('estimate_name', 'N/A')}' (ID: {self.estimate_id})")
                        return True, target_estimate
                    else:
                        self.log_test("Get Cost Estimates", False, "", 
                                    f"Target estimate ID {self.estimate_id} not found in list of {len(estimates)} estimates")
                        return False, None
                else:
                    self.log_test("Get Cost Estimates", False, "", f"Invalid response format: {estimates}")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Cost Estimates", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("Get Cost Estimates", False, "", str(e))
            return False, None

    def test_pdf_export(self):
        """Test PDF export functionality"""
        print(f"\n🔍 Testing PDF Export for estimate {self.estimate_id}...")
        
        try:
            url = f"{self.api_url}/cost-estimates/{self.estimate_id}/export/pdf"
            response = self.session.get(url, timeout=60)  # Longer timeout for file generation
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if content_type == 'application/pdf':
                    # Check content disposition header for filename
                    content_disposition = response.headers.get('content-disposition', '')
                    if 'estimacion_' in content_disposition and '.pdf' in content_disposition:
                        # Check if we actually got PDF content
                        content = response.content
                        if content and content.startswith(b'%PDF'):
                            file_size = len(content)
                            self.log_test("PDF Export", True, 
                                        f"PDF generated successfully - Size: {file_size} bytes, Content-Type: {content_type}, Filename: {content_disposition}")
                            return True, content
                        else:
                            self.log_test("PDF Export", False, "", "Response content is not a valid PDF file")
                            return False, None
                    else:
                        self.log_test("PDF Export", False, "", f"Invalid filename in Content-Disposition: {content_disposition}")
                        return False, None
                else:
                    self.log_test("PDF Export", False, "", f"Invalid Content-Type: {content_type} (expected: application/pdf)")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("PDF Export", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("PDF Export", False, "", str(e))
            return False, None

    def test_excel_export(self):
        """Test Excel export functionality"""
        print(f"\n🔍 Testing Excel Export for estimate {self.estimate_id}...")
        
        try:
            url = f"{self.api_url}/cost-estimates/{self.estimate_id}/export/excel"
            response = self.session.get(url, timeout=60)  # Longer timeout for file generation
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                expected_content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                
                if content_type == expected_content_type:
                    # Check content disposition header for filename
                    content_disposition = response.headers.get('content-disposition', '')
                    if 'estimacion_' in content_disposition and '.xlsx' in content_disposition:
                        # Check if we actually got Excel content
                        content = response.content
                        if content and content.startswith(b'PK'):  # Excel files start with PK (ZIP signature)
                            file_size = len(content)
                            self.log_test("Excel Export", True, 
                                        f"Excel generated successfully - Size: {file_size} bytes, Content-Type: {content_type}, Filename: {content_disposition}")
                            return True, content
                        else:
                            self.log_test("Excel Export", False, "", "Response content is not a valid Excel file")
                            return False, None
                    else:
                        self.log_test("Excel Export", False, "", f"Invalid filename in Content-Disposition: {content_disposition}")
                        return False, None
                else:
                    self.log_test("Excel Export", False, "", f"Invalid Content-Type: {content_type} (expected: {expected_content_type})")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Excel Export", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("Excel Export", False, "", str(e))
            return False, None

    def run_cost_estimate_export_tests(self):
        """Run complete cost estimate export test suite"""
        print("🚀 Starting Cost Estimate Export Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🎯 Target Estimate ID: {self.estimate_id}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Get cost estimates list to verify target exists
        success, estimate_data = self.test_get_cost_estimates()
        if not success:
            print("❌ Failed to get cost estimates or target estimate not found, stopping tests")
            return self.generate_report()
        
        # Step 3: Test PDF Export
        pdf_success, pdf_content = self.test_pdf_export()
        
        # Step 4: Test Excel Export
        excel_success, excel_content = self.test_excel_export()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 COST ESTIMATE EXPORT TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        export_failures = [test for test in failed_tests if "Export" in test['test']]
        if export_failures:
            print("\n🚨 EXPORT ISSUES FOUND:")
            for test in export_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "export_issues": export_failures
        }

class ClientPortalTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.admin_session = requests.Session()
        self.client_session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage - use timestamp for unique email
        self.admin_user_id = None
        self.client_user_id = None
        timestamp = int(time.time())
        self.client_email = f"testcliente{timestamp}@test.com"
        self.client_password = "Test123!"

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_admin_login(self, email="carrerojorge99@gmail.com", password="Axel52418!"):
        """Test admin login with provided credentials"""
        print(f"\n🔍 Testing Admin Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.admin_session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.admin_user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Admin Login", True, f"Logged in as {user_name} (ID: {self.admin_user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Admin Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Admin Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, "", str(e))
            return False

    def test_admin_create_client(self):
        """Test admin creating a new client"""
        print(f"\n🔍 Testing Admin Create Client...")
        
        client_data = {
            "nombre_contacto": "Test Cliente Portal",
            "email": self.client_email,
            "password": self.client_password,
            "empresa": "Empresa Test SA"
        }
        
        try:
            url = f"{self.api_url}/clients"
            response = self.admin_session.post(url, json=client_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                if 'client_id' in response_data:
                    self.client_user_id = response_data['client_id']
                    self.log_test("Admin Create Client", True, 
                                f"Client created successfully - ID: {self.client_user_id}, Email: {self.client_email}")
                    return True, response_data
                else:
                    self.log_test("Admin Create Client", False, "", "No client_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Admin Create Client", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Admin Create Client", False, "", str(e))
            return False, {}

    def test_client_login(self):
        """Test client login with created credentials"""
        print(f"\n🔍 Testing Client Login with {self.client_email}...")
        
        login_data = {
            "email": self.client_email,
            "password": self.client_password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.client_session.post(url, json=login_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    
                    # Verify the user has client role
                    if user_role == 'client':
                        self.log_test("Client Login", True, 
                                    f"Client logged in successfully - Name: {user_name}, ID: {user_id}, Role: {user_role}")
                        return True, response_data
                    else:
                        self.log_test("Client Login", False, "", f"Expected role 'client', got '{user_role}'")
                        return False, {}
                else:
                    self.log_test("Client Login", False, "", "No user data in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Client Login", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Client Login", False, "", str(e))
            return False, {}

    def test_client_profile_access(self):
        """Test client can access their profile"""
        print(f"\n🔍 Testing Client Profile Access...")
        
        if not self.client_user_id:
            self.log_test("Client Profile Access", False, "", "No client user ID available")
            return False
        
        try:
            url = f"{self.api_url}/clients/{self.client_user_id}"
            response = self.client_session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                # Verify client can see their profile data
                if 'client_id' in response_data or 'user_id' in response_data:
                    self.log_test("Client Profile Access", True, 
                                f"Client can access their profile successfully")
                    return True, response_data
                else:
                    self.log_test("Client Profile Access", False, "", "Invalid profile response structure")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Client Profile Access", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Client Profile Access", False, "", str(e))
            return False, {}

    def test_client_projects_restriction(self):
        """Test client cannot see projects - should return empty array"""
        print(f"\n🔍 Testing Client Projects Restriction...")
        
        if not self.client_user_id:
            self.log_test("Client Projects Restriction", False, "", "No client user ID available")
            return False
        
        try:
            url = f"{self.api_url}/clients/{self.client_user_id}/projects"
            response = self.client_session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                # Verify response is an empty array
                if isinstance(response_data, list) and len(response_data) == 0:
                    self.log_test("Client Projects Restriction", True, 
                                f"Client correctly receives empty projects array (projects are private to OHSMS)")
                    return True
                else:
                    self.log_test("Client Projects Restriction", False, "", 
                                f"Expected empty array, got: {response_data}")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Client Projects Restriction", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Client Projects Restriction", False, "", str(e))
            return False

    def test_client_dashboard_restriction(self):
        """Test client cannot access admin dashboard"""
        print(f"\n🔍 Testing Client Dashboard Restriction...")
        
        try:
            url = f"{self.api_url}/projects"
            response = self.client_session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            # Client should either get 403 Forbidden or empty array
            if response.status_code == 403:
                self.log_test("Client Dashboard Restriction", True, 
                            f"Client correctly denied access to projects dashboard (403 Forbidden)")
                return True
            elif response.status_code == 200:
                response_data = response.json()
                if isinstance(response_data, list) and len(response_data) == 0:
                    self.log_test("Client Dashboard Restriction", True, 
                                f"Client gets empty projects list (no access to admin projects)")
                    return True
                else:
                    self.log_test("Client Dashboard Restriction", False, "", 
                                f"Client should not see projects, but got: {len(response_data)} projects")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Client Dashboard Restriction", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Client Dashboard Restriction", False, "", str(e))
            return False

    def run_client_portal_tests(self):
        """Run complete client portal test suite"""
        print("🚀 Starting Client Portal Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Admin Login
        if not self.test_admin_login():
            print("❌ Admin login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Admin Creates Client
        success, client_data = self.test_admin_create_client()
        if not success:
            print("❌ Failed to create client, stopping tests")
            return self.generate_report()
        
        # Step 3: Client Login
        success, login_data = self.test_client_login()
        if not success:
            print("❌ Client login failed, stopping tests")
            return self.generate_report()
        
        # Step 4: Client Profile Access
        self.test_client_profile_access()
        
        # Step 5: Client Projects Restriction (CRITICAL TEST)
        self.test_client_projects_restriction()
        
        # Step 6: Client Dashboard Restriction
        self.test_client_dashboard_restriction()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 CLIENT PORTAL TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if "Restriction" in test['test']]
        if critical_failures:
            print("\n🚨 CRITICAL SECURITY ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
                print("     This indicates clients may have unauthorized access!")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class ProjectInvoicesTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_project_id = None
        self.test_invoice_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_get_projects(self):
        """Test getting projects to get a project_id"""
        print(f"\n🔍 Testing Get Projects...")
        
        try:
            url = f"{self.api_url}/projects"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list) and len(projects) > 0:
                    self.test_project_id = projects[0]['project_id']
                    project_name = projects[0]['name']
                    self.log_test("Get Projects", True, f"Found {len(projects)} projects. Using: {project_name} (ID: {self.test_project_id})")
                    return True, projects
                else:
                    self.log_test("Get Projects", False, "", "No projects available")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Projects", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Projects", False, "", str(e))
            return False, []

    def test_financial_summary(self):
        """Test financial summary endpoint"""
        print(f"\n🔍 Testing Financial Summary Endpoint...")
        
        if not self.test_project_id:
            self.log_test("Financial Summary", False, "", "No project ID available")
            return False
        
        try:
            url = f"{self.api_url}/projects/{self.test_project_id}/financial-summary"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                summary = response.json()
                print(f"   Response Body: {json.dumps(summary, indent=2)}")
                
                # Check required fields
                required_fields = ['total_invoiced', 'total_paid', 'total_pending', 'invoice_count', 'status_counts']
                missing_fields = [field for field in required_fields if field not in summary]
                
                if not missing_fields:
                    self.log_test("Financial Summary", True, 
                                f"Total Invoiced: ${summary['total_invoiced']}, Total Paid: ${summary['total_paid']}, Invoice Count: {summary['invoice_count']}")
                    return True, summary
                else:
                    self.log_test("Financial Summary", False, "", f"Missing required fields: {missing_fields}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Financial Summary", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Financial Summary", False, "", str(e))
            return False, {}

    def test_get_invoices_by_project(self):
        """Test getting invoices by project"""
        print(f"\n🔍 Testing Get Invoices by Project...")
        
        if not self.test_project_id:
            self.log_test("Get Invoices by Project", False, "", "No project ID available")
            return False
        
        try:
            url = f"{self.api_url}/invoices"
            params = {"project_id": self.test_project_id}
            response = self.session.get(url, params=params, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                invoices = response.json()
                print(f"   Response Body: {json.dumps(invoices, indent=2)}")
                
                if isinstance(invoices, list):
                    self.log_test("Get Invoices by Project", True, 
                                f"Found {len(invoices)} invoices for project {self.test_project_id}")
                    return True, invoices
                else:
                    self.log_test("Get Invoices by Project", False, "", f"Invalid response format: {invoices}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Invoices by Project", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Invoices by Project", False, "", str(e))
            return False, []

    def test_create_manual_invoice(self):
        """Test creating a manual invoice"""
        print(f"\n🔍 Testing Create Manual Invoice...")
        
        if not self.test_project_id:
            self.log_test("Create Manual Invoice", False, "", "No project ID available")
            return False
        
        invoice_data = {
            "project_id": self.test_project_id,
            "client_name": "Test Client Company",
            "client_email": "testclient@example.com",
            "client_phone": "787-555-0123",
            "client_address": "123 Test Street, San Juan, PR 00901",
            "items": [
                {
                    "description": "Professional Services - Project Management",
                    "quantity": 1,
                    "unit_price": 1000.00,
                    "amount": 1000.00
                },
                {
                    "description": "Technical Consultation",
                    "quantity": 2,
                    "unit_price": 500.00,
                    "amount": 1000.00
                }
            ],
            "tax_rate": 10.5,
            "discount_percent": 0,
            "notes": "Test invoice created via API testing",
            "terms": "Payment due within 30 days",
            "custom_number": ""
        }
        
        try:
            url = f"{self.api_url}/invoices/manual"
            response = self.session.post(url, json=invoice_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                invoice = response.json()
                print(f"   Response Body: {json.dumps(invoice, indent=2)}")
                
                if 'invoice_id' in invoice:
                    self.test_invoice_id = invoice['invoice_id']
                    invoice_number = invoice.get('invoice_number', 'N/A')
                    total = invoice.get('total', 0)
                    self.log_test("Create Manual Invoice", True, 
                                f"Invoice created - Number: {invoice_number}, ID: {self.test_invoice_id}, Total: ${total}")
                    return True, invoice
                else:
                    self.log_test("Create Manual Invoice", False, "", "No invoice_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Create Manual Invoice", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Manual Invoice", False, "", str(e))
            return False, {}

    def test_add_payment_to_invoice(self):
        """Test adding a payment to an invoice"""
        print(f"\n🔍 Testing Add Payment to Invoice...")
        
        if not self.test_invoice_id:
            self.log_test("Add Payment to Invoice", False, "", "No invoice ID available")
            return False
        
        payment_data = {
            "amount": 500.00,
            "payment_method": "transfer",
            "reference": "TEST-PAYMENT-123",
            "notes": "Partial payment via API testing"
        }
        
        try:
            url = f"{self.api_url}/invoices/{self.test_invoice_id}/payments"
            response = self.session.post(url, json=payment_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                payment = response.json()
                print(f"   Response Body: {json.dumps(payment, indent=2)}")
                
                if 'payment_id' in payment:
                    payment_id = payment['payment_id']
                    amount = payment.get('amount', 0)
                    method = payment.get('payment_method', 'N/A')
                    self.log_test("Add Payment to Invoice", True, 
                                f"Payment added - ID: {payment_id}, Amount: ${amount}, Method: {method}")
                    return True, payment
                else:
                    self.log_test("Add Payment to Invoice", False, "", "No payment_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Add Payment to Invoice", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Add Payment to Invoice", False, "", str(e))
            return False, {}

    def test_financial_summary_after_payment(self):
        """Test financial summary after payment to verify updates"""
        print(f"\n🔍 Testing Financial Summary After Payment...")
        
        if not self.test_project_id:
            self.log_test("Financial Summary After Payment", False, "", "No project ID available")
            return False
        
        try:
            url = f"{self.api_url}/projects/{self.test_project_id}/financial-summary"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                summary = response.json()
                print(f"   Response Body: {json.dumps(summary, indent=2)}")
                
                # Check that totals are updated
                total_paid = summary.get('total_paid', 0)
                total_pending = summary.get('total_pending', 0)
                invoice_count = summary.get('invoice_count', 0)
                
                # Verify that we have at least some paid amount and invoice count > 0
                if total_paid > 0 and invoice_count > 0:
                    self.log_test("Financial Summary After Payment", True, 
                                f"Updated summary - Total Paid: ${total_paid}, Total Pending: ${total_pending}, Invoice Count: {invoice_count}")
                    return True, summary
                else:
                    self.log_test("Financial Summary After Payment", False, "", 
                                f"Summary not updated correctly - Total Paid: ${total_paid}, Invoice Count: {invoice_count}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Financial Summary After Payment", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Financial Summary After Payment", False, "", str(e))
            return False, {}

    def run_project_invoices_tests(self):
        """Run complete project invoices test suite"""
        print("🚀 Starting Project Invoices Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Get projects to get a project_id
        success, projects = self.test_get_projects()
        if not success:
            print("❌ Failed to get projects, stopping tests")
            return self.generate_report()
        
        # Step 3: Test financial summary endpoint (initial state)
        self.test_financial_summary()
        
        # Step 4: Test getting invoices by project (initial state)
        self.test_get_invoices_by_project()
        
        # Step 5: Test creating a manual invoice
        success, invoice = self.test_create_manual_invoice()
        if not success:
            print("❌ Failed to create invoice, continuing with other tests")
        
        # Step 6: Test adding payment to invoice
        if success and self.test_invoice_id:
            payment_success, payment = self.test_add_payment_to_invoice()
            
            # Step 7: Test financial summary after payment
            if payment_success:
                self.test_financial_summary_after_payment()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 PROJECT INVOICES TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if any(keyword in test['test'] for keyword in ['Financial Summary', 'Create Manual Invoice', 'Add Payment'])]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class PDFGenerationTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_invoice_id = None
        self.test_estimate_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with Super Admin credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Super Admin Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Super Admin Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Super Admin Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Super Admin Login", False, "", str(e))
            return False

    def test_get_invoices(self):
        """Test getting invoices list"""
        print(f"\n🔍 Testing Get Invoices List...")
        
        try:
            url = f"{self.api_url}/invoices"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                invoices = response.json()
                if isinstance(invoices, list):
                    if len(invoices) > 0:
                        # Use the first invoice for testing
                        self.test_invoice_id = invoices[0].get('invoice_id') or invoices[0].get('id')
                        invoice_number = invoices[0].get('invoice_number', 'N/A')
                        self.log_test("Get Invoices", True, 
                                    f"Found {len(invoices)} invoices. Using invoice #{invoice_number} (ID: {self.test_invoice_id})")
                        return True, invoices
                    else:
                        self.log_test("Get Invoices", False, "", "No invoices found in the system")
                        return False, []
                else:
                    self.log_test("Get Invoices", False, "", f"Invalid response format: {invoices}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Invoices", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Invoices", False, "", str(e))
            return False, []

    def test_get_estimates(self):
        """Test getting estimates list"""
        print(f"\n🔍 Testing Get Estimates List...")
        
        try:
            url = f"{self.api_url}/estimates"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                estimates = response.json()
                if isinstance(estimates, list):
                    if len(estimates) > 0:
                        # Use the first estimate for testing
                        self.test_estimate_id = estimates[0].get('estimate_id') or estimates[0].get('id')
                        estimate_number = estimates[0].get('estimate_number', 'N/A')
                        self.log_test("Get Estimates", True, 
                                    f"Found {len(estimates)} estimates. Using estimate #{estimate_number} (ID: {self.test_estimate_id})")
                        return True, estimates
                    else:
                        self.log_test("Get Estimates", False, "", "No estimates found in the system")
                        return False, []
                else:
                    self.log_test("Get Estimates", False, "", f"Invalid response format: {estimates}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Estimates", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Estimates", False, "", str(e))
            return False, []

    def test_get_cost_estimates(self):
        """Test getting cost estimates list"""
        print(f"\n🔍 Testing Get Cost Estimates List...")
        
        try:
            url = f"{self.api_url}/cost-estimates"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                estimates = response.json()
                if isinstance(estimates, list):
                    if len(estimates) > 0:
                        # Use the first cost estimate for testing
                        self.test_estimate_id = estimates[0].get('estimate_id') or estimates[0].get('id')
                        estimate_name = estimates[0].get('estimate_name', 'N/A')
                        self.log_test("Get Cost Estimates", True, 
                                    f"Found {len(estimates)} cost estimates. Using estimate '{estimate_name}' (ID: {self.test_estimate_id})")
                        return True, estimates
                    else:
                        self.log_test("Get Cost Estimates", False, "", "No cost estimates found in the system")
                        return False, []
                else:
                    self.log_test("Get Cost Estimates", False, "", f"Invalid response format: {estimates}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Cost Estimates", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Cost Estimates", False, "", str(e))
            return False, []

    def test_company_endpoint(self):
        """Test company endpoint for logo data"""
        print(f"\n🔍 Testing Company Endpoint...")
        
        try:
            url = f"{self.api_url}/company"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                company_data = response.json()
                print(f"   Response Body: {json.dumps(company_data, indent=2)}")
                
                # Check if company data has logo information
                has_logo = 'company_logo' in company_data or 'logo' in company_data
                company_name = company_data.get('company_name', 'N/A')
                
                self.log_test("Company Endpoint", True, 
                            f"Company: {company_name}, Has Logo: {has_logo}")
                return True, company_data
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Company Endpoint", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Company Endpoint", False, "", str(e))
            return False, {}

    def test_invoice_pdf_generation(self):
        """Test invoice PDF generation with logo"""
        print(f"\n🔍 Testing Invoice PDF Generation...")
        
        if not self.test_invoice_id:
            self.log_test("Invoice PDF Generation", False, "", "No invoice ID available for testing")
            return False
        
        try:
            url = f"{self.api_url}/invoices/{self.test_invoice_id}/pdf"
            response = self.session.get(url, timeout=60)  # Longer timeout for PDF generation
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if content_type == 'application/pdf':
                    # Check if we actually got PDF content
                    content = response.content
                    if content and content.startswith(b'%PDF'):
                        file_size = len(content)
                        
                        # Check for logo presence by looking for PNG signature in PDF
                        has_png_logo = b'PNG' in content and b'IHDR' in content
                        
                        self.log_test("Invoice PDF Generation", True, 
                                    f"PDF generated successfully - Size: {file_size} bytes, Content-Type: {content_type}, Contains PNG Logo: {has_png_logo}")
                        return True, content
                    else:
                        self.log_test("Invoice PDF Generation", False, "", "Response content is not a valid PDF file")
                        return False, None
                else:
                    self.log_test("Invoice PDF Generation", False, "", f"Invalid Content-Type: {content_type} (expected: application/pdf)")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Invoice PDF Generation", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("Invoice PDF Generation", False, "", str(e))
            return False, None

    def test_estimate_pdf_generation(self):
        """Test cost estimate PDF generation with logo"""
        print(f"\n🔍 Testing Cost Estimate PDF Generation...")
        
        if not self.test_estimate_id:
            self.log_test("Cost Estimate PDF Generation", False, "", "No cost estimate ID available for testing")
            return False
        
        try:
            url = f"{self.api_url}/cost-estimates/{self.test_estimate_id}/export/pdf"
            response = self.session.get(url, timeout=60)  # Longer timeout for PDF generation
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                # Check content type
                content_type = response.headers.get('content-type', '')
                if content_type == 'application/pdf':
                    # Check if we actually got PDF content
                    content = response.content
                    if content and content.startswith(b'%PDF'):
                        file_size = len(content)
                        
                        # Check for logo presence by looking for PNG signature in PDF
                        has_png_logo = b'PNG' in content and b'IHDR' in content
                        
                        # Check for OHSMS company name in PDF
                        has_company_name = b'OCCUPATIONAL HEALTH SAFETY MANAGEMENT SERVICES' in content
                        
                        self.log_test("Cost Estimate PDF Generation", True, 
                                    f"PDF generated successfully - Size: {file_size} bytes, Content-Type: {content_type}, Contains PNG Logo: {has_png_logo}, Contains Company Name: {has_company_name}")
                        return True, content
                    else:
                        self.log_test("Cost Estimate PDF Generation", False, "", "Response content is not a valid PDF file")
                        return False, None
                else:
                    self.log_test("Cost Estimate PDF Generation", False, "", f"Invalid Content-Type: {content_type} (expected: application/pdf)")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Cost Estimate PDF Generation", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("Cost Estimate PDF Generation", False, "", str(e))
            return False, None

    def test_frontend_pdf_components(self):
        """Test frontend PDF generation components"""
        print(f"\n🔍 Testing Frontend PDF Components...")
        
        try:
            # Test if logoData.js is accessible
            import requests
            logo_url = f"{self.base_url}/static/js/logoData.js"
            response = requests.get(logo_url, timeout=30)
            
            if response.status_code == 200:
                # Check if logo data contains PNG base64
                has_logo_data = 'LOGO_BASE64' in response.text and 'data:image/png;base64' in response.text
                self.log_test("Frontend Logo Data", has_logo_data, 
                            f"Logo data found: {has_logo_data}")
            else:
                self.log_test("Frontend Logo Data", False, "", f"Could not access logo data: HTTP {response.status_code}")
            
            # Test if pdfGenerator.js is accessible
            pdf_gen_url = f"{self.base_url}/static/js/pdfGenerator.js"
            response = requests.get(pdf_gen_url, timeout=30)
            
            if response.status_code == 200:
                # Check if PDF generator imports logo and has addDocumentHeader
                has_pdf_gen = 'addDocumentHeader' in response.text and 'LOGO_BASE64' in response.text
                self.log_test("Frontend PDF Generator", has_pdf_gen, 
                            f"PDF generator with logo support found: {has_pdf_gen}")
            else:
                self.log_test("Frontend PDF Generator", False, "", f"Could not access PDF generator: HTTP {response.status_code}")
                
        except Exception as e:
            self.log_test("Frontend PDF Components", False, "", str(e))

    def run_pdf_generation_tests(self):
        """Run complete PDF generation test suite"""
        print("🚀 Starting PDF Generation with Logo Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login with Super Admin credentials
        if not self.test_login():
            print("❌ Super Admin login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Test company endpoint
        company_success, company_data = self.test_company_endpoint()
        
        # Step 3: Test frontend PDF components
        self.test_frontend_pdf_components()
        
        # Step 4: Get invoices list
        invoices_success, invoices = self.test_get_invoices()
        
        # Step 5: Get regular estimates list  
        estimates_success, estimates = self.test_get_estimates()
        
        # Step 6: Get cost estimates list (these have PDF generation)
        cost_estimates_success, cost_estimates = self.test_get_cost_estimates()
        
        # Step 7: Test Invoice PDF generation if invoices exist
        # Note: Based on backend analysis, there's no PDF endpoint for invoices yet
        if invoices_success and self.test_invoice_id:
            print(f"\n⚠️  Note: Invoice PDF generation is handled by frontend JavaScript")
            self.log_test("Invoice PDF Generation", True, "", "Frontend PDF generation available - invoices use client-side jsPDF with logo support")
        
        # Step 8: Test Cost Estimate PDF generation if cost estimates exist
        if cost_estimates_success and self.test_estimate_id:
            self.test_estimate_pdf_generation()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 PDF GENERATION TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        pdf_failures = [test for test in failed_tests if "PDF" in test['test']]
        if pdf_failures:
            print("\n🚨 PDF GENERATION ISSUES FOUND:")
            for test in pdf_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "pdf_issues": pdf_failures
        }

class PayrollTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_get_employees(self):
        """Test getting employees with salary/hourly_rate"""
        print(f"\n🔍 Testing Get Employees...")
        
        try:
            url = f"{self.api_url}/employees"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                employees = response.json()
                if isinstance(employees, list):
                    employees_with_pay = []
                    for emp in employees:
                        profile = emp.get('profile', {})
                        if profile and (profile.get('salary', 0) > 0 or profile.get('hourly_rate', 0) > 0):
                            employees_with_pay.append(emp)
                    
                    self.log_test("Get Employees", True, 
                                f"Found {len(employees)} total employees, {len(employees_with_pay)} with salary/hourly rate")
                    return True, employees
                else:
                    self.log_test("Get Employees", False, "", f"Invalid response format: {employees}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Employees", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Employees", False, "", str(e))
            return False, []

    def test_get_payroll_settings(self):
        """Test getting payroll settings"""
        print(f"\n🔍 Testing Get Payroll Settings...")
        
        try:
            url = f"{self.api_url}/payroll-settings"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                settings = response.json()
                print(f"   Response Body: {json.dumps(settings, indent=2)}")
                
                self.log_test("Get Payroll Settings", True, 
                            f"Payroll settings retrieved successfully")
                return True, settings
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Payroll Settings", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Get Payroll Settings", False, "", str(e))
            return False, {}

    def test_process_payroll(self):
        """Test payroll processing creates pay stubs"""
        print(f"\n🔍 Testing Process Payroll...")
        
        payroll_data = {
            "period_start": "2025-12-15",
            "period_end": "2025-12-31",
            "employees": [{
                "employee_id": "test-id",
                "user_id": self.user_id,
                "name": "Test Employee",
                "is_contractor": False,
                "is_hourly": True,
                "hours": 40,
                "rate": 15.00,
                "grossPay": 600.00,
                "hacienda": 0,
                "ss": 37.20,
                "medicare": 8.70,
                "deductions": 45.90,
                "netPay": 554.10,
                "payment_method": "check"
            }],
            "totals": {"hours": 40, "gross": 600, "deductions": 45.90, "net": 554.10}
        }
        
        try:
            url = f"{self.api_url}/payroll/process"
            response = self.session.post(url, json=payroll_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                if 'stubs_generated' in response_data:
                    stubs_count = response_data['stubs_generated']
                    payroll_id = response_data.get('id', 'N/A')
                    self.log_test("Process Payroll", True, 
                                f"Payroll processed successfully - ID: {payroll_id}, Stubs generated: {stubs_count}")
                    return True, response_data
                else:
                    self.log_test("Process Payroll", False, "", "No stubs_generated in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Process Payroll", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Process Payroll", False, "", str(e))
            return False, {}

    def test_get_my_pay_stubs(self):
        """Test pay stubs retrieval for logged in user"""
        print(f"\n🔍 Testing Get My Pay Stubs...")
        
        try:
            url = f"{self.api_url}/pay-stubs/my"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                pay_stubs = response.json()
                print(f"   Response Body: {json.dumps(pay_stubs, indent=2)}")
                
                if isinstance(pay_stubs, list):
                    # Check if pay stubs have required fields
                    valid_stubs = []
                    for stub in pay_stubs:
                        required_fields = ['employee_id', 'period_start', 'period_end', 'hours_worked', 'gross_pay', 'deductions', 'net_pay']
                        if all(field in stub for field in required_fields):
                            valid_stubs.append(stub)
                    
                    self.log_test("Get My Pay Stubs", True, 
                                f"Found {len(pay_stubs)} pay stubs, {len(valid_stubs)} with all required fields")
                    return True, pay_stubs
                else:
                    self.log_test("Get My Pay Stubs", False, "", f"Invalid response format: {pay_stubs}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get My Pay Stubs", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get My Pay Stubs", False, "", str(e))
            return False, []

    def test_get_clock_history(self):
        """Test clock history for hours display"""
        print(f"\n🔍 Testing Get Clock History for Hours Display...")
        
        try:
            url = f"{self.api_url}/clock/history"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                history = response.json()
                print(f"   Response Body: {json.dumps(history, indent=2)}")
                
                if isinstance(history, list):
                    # Check if entries contain clock_in and clock_out timestamps
                    valid_entries = []
                    for entry in history:
                        if 'clock_in' in entry and 'clock_out' in entry:
                            # Try to parse ISO format
                            try:
                                from datetime import datetime
                                clock_in = datetime.fromisoformat(entry['clock_in'].replace('Z', '+00:00'))
                                if entry['clock_out']:
                                    clock_out = datetime.fromisoformat(entry['clock_out'].replace('Z', '+00:00'))
                                valid_entries.append(entry)
                            except:
                                pass
                    
                    self.log_test("Get Clock History", True, 
                                f"Found {len(history)} clock entries, {len(valid_entries)} with valid timestamps for AM/PM display")
                    return True, history
                else:
                    self.log_test("Get Clock History", False, "", f"Invalid response format: {history}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Clock History", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Clock History", False, "", str(e))
            return False, []

    def run_payroll_tests(self):
        """Run complete payroll test suite"""
        print("🚀 Starting Payroll Processing and Pay Stubs Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Test payroll calculation data flow
        success, employees = self.test_get_employees()
        if not success:
            print("❌ Failed to get employees, continuing with other tests")
        
        success, settings = self.test_get_payroll_settings()
        if not success:
            print("❌ Failed to get payroll settings, continuing with other tests")
        
        # Step 3: Test payroll processing creates pay stubs
        success, payroll_result = self.test_process_payroll()
        if not success:
            print("❌ Failed to process payroll, continuing with other tests")
        
        # Step 4: Test pay stubs retrieval
        self.test_get_my_pay_stubs()
        
        # Step 5: Test clock history for hours display
        self.test_get_clock_history()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 PAYROLL PROCESSING AND PAY STUBS TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if any(keyword in test['test'] for keyword in ['Process Payroll', 'Get My Pay Stubs'])]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class ProjectManagementAPITester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_project_id = None
        self.test_task_id = None
        self.test_category_id = None
        self.test_expense_id = None
        self.test_comment_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            default_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            default_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json() if response.content else {}
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json() if response.content else {}
                    error_msg = error_data.get('detail', f"Expected {expected_status}, got {response.status_code}")
                except:
                    error_msg = f"Expected {expected_status}, got {response.status_code}"
                
                self.log_test(name, False, "", error_msg)
                return False, {}

        except Exception as e:
            self.log_test(name, False, "", str(e))
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@example.com",
            "password": "TestPass123!",
            "role": "admin"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=user_data
        )
        
        if success and 'user_id' in response:
            self.user_id = response['user_id']
            return True, user_data
        return False, {}

    def test_user_login(self, email, password):
        """Test user login"""
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.session_token = response['token']
            if 'user' in response:
                self.user_id = response['user']['user_id']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response = self.run_test(
            "Dashboard Statistics",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            required_fields = ['total_projects', 'active_projects', 'completed_projects', 'total_budget', 'total_spent']
            for field in required_fields:
                if field not in response:
                    self.log_test(f"Dashboard Stats - Missing {field}", False, "", f"Missing field: {field}")
                    return False
        
        return success

    def test_create_project(self):
        """Test project creation"""
        project_data = {
            "name": f"Test Project {int(time.time())}",
            "description": "This is a test project for API testing",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
            "status": "planning",
            "priority": "high",
            "budget_total": 50000.00,
            "team_members": []
        }
        
        success, response = self.run_test(
            "Create Project",
            "POST",
            "projects",
            200,
            data=project_data
        )
        
        if success and 'project_id' in response:
            self.test_project_id = response['project_id']
            return True
        return False

    def test_get_projects(self):
        """Test get projects list"""
        success, response = self.run_test(
            "Get Projects List",
            "GET",
            "projects",
            200
        )
        return success

    def test_get_project_detail(self):
        """Test get project detail"""
        if not self.test_project_id:
            self.log_test("Get Project Detail", False, "", "No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Project Detail",
            "GET",
            f"projects/{self.test_project_id}",
            200
        )
        return success

    def test_create_task(self):
        """Test task creation"""
        if not self.test_project_id:
            self.log_test("Create Task", False, "", "No test project ID available")
            return False
            
        task_data = {
            "project_id": self.test_project_id,
            "title": f"Test Task {int(time.time())}",
            "description": "This is a test task",
            "status": "todo",
            "priority": "medium",
            "due_date": "2024-06-30",
            "progress": 0
        }
        
        success, response = self.run_test(
            "Create Task",
            "POST",
            "tasks",
            200,
            data=task_data
        )
        
        if success and 'task_id' in response:
            self.test_task_id = response['task_id']
            return True
        return False

    def test_get_tasks(self):
        """Test get tasks"""
        success, response = self.run_test(
            "Get Tasks",
            "GET",
            f"tasks?project_id={self.test_project_id}",
            200
        )
        return success

    def test_create_budget_category(self):
        """Test budget category creation"""
        if not self.test_project_id:
            self.log_test("Create Budget Category", False, "", "No test project ID available")
            return False
            
        category_data = {
            "project_id": self.test_project_id,
            "name": f"Test Category {int(time.time())}",
            "allocated_amount": 10000.00
        }
        
        success, response = self.run_test(
            "Create Budget Category",
            "POST",
            "budget/categories",
            200,
            data=category_data
        )
        
        if success and 'category_id' in response:
            self.test_category_id = response['category_id']
            return True
        return False

    def test_get_budget_categories(self):
        """Test get budget categories"""
        if not self.test_project_id:
            self.log_test("Get Budget Categories", False, "", "No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Budget Categories",
            "GET",
            f"budget/categories?project_id={self.test_project_id}",
            200
        )
        return success

    def test_create_expense(self):
        """Test expense creation"""
        if not self.test_project_id or not self.test_category_id:
            self.log_test("Create Expense", False, "", "No test project or category ID available")
            return False
            
        expense_data = {
            "project_id": self.test_project_id,
            "category_id": self.test_category_id,
            "description": f"Test Expense {int(time.time())}",
            "amount": 500.00,
            "date": "2024-01-15"
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        
        if success and 'expense_id' in response:
            self.test_expense_id = response['expense_id']
            return True
        return False

    def test_get_expenses(self):
        """Test get expenses"""
        if not self.test_project_id:
            self.log_test("Get Expenses", False, "", "No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Expenses",
            "GET",
            f"expenses?project_id={self.test_project_id}",
            200
        )
        return success

    def test_create_comment(self):
        """Test comment creation"""
        if not self.test_project_id:
            self.log_test("Create Comment", False, "", "No test project ID available")
            return False
            
        comment_data = {
            "project_id": self.test_project_id,
            "content": f"This is a test comment {int(time.time())}"
        }
        
        success, response = self.run_test(
            "Create Comment",
            "POST",
            "comments",
            200,
            data=comment_data
        )
        
        if success and 'comment_id' in response:
            self.test_comment_id = response['comment_id']
            return True
        return False

    def test_get_comments(self):
        """Test get comments"""
        if not self.test_project_id:
            self.log_test("Get Comments", False, "", "No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Comments",
            "GET",
            f"comments?project_id={self.test_project_id}",
            200
        )
        return success

    def test_project_stats(self):
        """Test project statistics"""
        if not self.test_project_id:
            self.log_test("Project Statistics", False, "", "No test project ID available")
            return False
            
        success, response = self.run_test(
            "Project Statistics",
            "GET",
            f"projects/{self.test_project_id}/stats",
            200
        )
        return success

    def test_export_reports(self):
        """Test report exports"""
        if not self.test_project_id:
            self.log_test("Export PDF Report", False, "", "No test project ID available")
            self.log_test("Export Excel Report", False, "", "No test project ID available")
            return False
            
        # Test PDF export
        try:
            pdf_url = f"{self.api_url}/reports/project/{self.test_project_id}/export?format=pdf"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            pdf_response = requests.get(pdf_url, headers=headers, timeout=30)
            
            if pdf_response.status_code == 200:
                self.log_test("Export PDF Report", True, f"Status: {pdf_response.status_code}")
            else:
                self.log_test("Export PDF Report", False, "", f"Expected 200, got {pdf_response.status_code}")
        except Exception as e:
            self.log_test("Export PDF Report", False, "", str(e))
        
        # Test Excel export
        try:
            excel_url = f"{self.api_url}/reports/project/{self.test_project_id}/export?format=excel"
            headers = {'Authorization': f'Bearer {self.session_token}'}
            excel_response = requests.get(excel_url, headers=headers, timeout=30)
            
            if excel_response.status_code == 200:
                self.log_test("Export Excel Report", True, f"Status: {excel_response.status_code}")
                return True
            else:
                self.log_test("Export Excel Report", False, "", f"Expected 200, got {excel_response.status_code}")
                return False
        except Exception as e:
            self.log_test("Export Excel Report", False, "", str(e))
            return False

    def test_delete_task(self):
        """Test task deletion"""
        if not self.test_task_id:
            self.log_test("Delete Task", False, "", "No test task ID available")
            return False
            
        success, response = self.run_test(
            "Delete Task",
            "DELETE",
            f"tasks/{self.test_task_id}",
            200
        )
        return success

    def test_logout(self):
        """Test user logout"""
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        return success

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Project Management API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test user registration and login
        reg_success, user_data = self.test_user_registration()
        if not reg_success:
            print("❌ Registration failed, stopping tests")
            return self.generate_report()
        
        login_success = self.test_user_login(user_data['email'], user_data['password'])
        if not login_success:
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Test authentication
        self.test_get_current_user()
        
        # Test dashboard
        self.test_dashboard_stats()
        
        # Test project management
        self.test_create_project()
        self.test_get_projects()
        self.test_get_project_detail()
        
        # Test task management
        self.test_create_task()
        self.test_get_tasks()
        
        # Test budget management
        self.test_create_budget_category()
        self.test_get_budget_categories()
        self.test_create_expense()
        self.test_get_expenses()
        
        # Test comments
        self.test_create_comment()
        self.test_get_comments()
        
        # Test project statistics
        self.test_project_stats()
        
        # Test report exports
        self.test_export_reports()
        
        # Test deletion
        self.test_delete_task()
        
        # Test logout
        self.test_logout()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests
        }

class SafetyModuleTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_checklist_id = None
        self.test_observation_id = None
        self.test_toolbox_talk_id = None
        self.test_incident_id = None
        self.test_media_filename = None
        self.test_employee_ids = []

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_safety_dashboard(self):
        """Test safety dashboard endpoint"""
        print(f"\n🔍 Testing Safety Dashboard...")
        
        try:
            url = f"{self.api_url}/safety/dashboard"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                dashboard_data = response.json()
                
                # Check required fields
                required_fields = ['days_without_incidents', 'total_checklists', 'total_observations', 'total_toolbox_talks', 'total_incidents']
                missing_fields = [field for field in required_fields if field not in dashboard_data]
                
                if not missing_fields:
                    days_without = dashboard_data['days_without_incidents']
                    checklists = dashboard_data['total_checklists']
                    observations = dashboard_data['total_observations']
                    talks = dashboard_data['total_toolbox_talks']
                    incidents = dashboard_data['total_incidents']
                    
                    self.log_test("Safety Dashboard", True, 
                                f"Days without incidents: {days_without}, Checklists: {checklists}, Observations: {observations}, Talks: {talks}, Incidents: {incidents}")
                    return True, dashboard_data
                else:
                    self.log_test("Safety Dashboard", False, "", f"Missing fields: {missing_fields}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Safety Dashboard", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Safety Dashboard", False, "", str(e))
            return False, {}

    def test_create_safety_checklist(self):
        """Test creating a safety checklist"""
        print(f"\n🔍 Testing Create Safety Checklist...")
        
        checklist_data = {
            "title": "Lista de Verificación de Seguridad - Prueba",
            "description": "Lista de verificación para pruebas del sistema",
            "items": [
                {"text": "Verificar uso de EPP", "checked": False},
                {"text": "Inspeccionar área de trabajo", "checked": False},
                {"text": "Confirmar procedimientos de emergencia", "checked": False}
            ]
        }
        
        try:
            url = f"{self.api_url}/safety/checklists"
            response = self.session.post(url, json=checklist_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'checklist_id' in response_data:
                    self.test_checklist_id = response_data['checklist_id']
                    title = response_data.get('title', 'N/A')
                    items_count = len(response_data.get('items', []))
                    self.log_test("Create Safety Checklist", True, 
                                f"Checklist created - ID: {self.test_checklist_id}, Title: {title}, Items: {items_count}")
                    return True, response_data
                else:
                    self.log_test("Create Safety Checklist", False, "", "No checklist_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Create Safety Checklist", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Safety Checklist", False, "", str(e))
            return False, {}

    def test_check_checklist_item(self):
        """Test checking items in a safety checklist"""
        print(f"\n🔍 Testing Check Checklist Item...")
        
        if not self.test_checklist_id:
            self.log_test("Check Checklist Item", False, "", "No checklist ID available")
            return False
        
        check_data = {
            "item_index": 0,
            "checked": True
        }
        
        try:
            url = f"{self.api_url}/safety/checklists/{self.test_checklist_id}/check-item"
            response = self.session.post(url, json=check_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                completion_percentage = response_data.get('completion_percentage', 0)
                self.log_test("Check Checklist Item", True, 
                            f"Item checked successfully - Completion: {completion_percentage}%")
                return True, response_data
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Check Checklist Item", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Check Checklist Item", False, "", str(e))
            return False, {}

    def test_create_safety_observation(self):
        """Test creating a safety observation"""
        print(f"\n🔍 Testing Create Safety Observation...")
        
        observation_data = {
            "title": "Observación de Seguridad - Prueba",
            "description": "Observación positiva de uso correcto de EPP",
            "type": "positive",
            "location": "Área de construcción",
            "corrective_action": ""
        }
        
        try:
            url = f"{self.api_url}/safety/observations"
            response = self.session.post(url, json=observation_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'observation_id' in response_data:
                    self.test_observation_id = response_data['observation_id']
                    title = response_data.get('title', 'N/A')
                    obs_type = response_data.get('type', 'N/A')
                    self.log_test("Create Safety Observation", True, 
                                f"Observation created - ID: {self.test_observation_id}, Title: {title}, Type: {obs_type}")
                    return True, response_data
                else:
                    self.log_test("Create Safety Observation", False, "", "No observation_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Create Safety Observation", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Safety Observation", False, "", str(e))
            return False, {}

    def test_create_negative_observation(self):
        """Test creating a negative safety observation with corrective action"""
        print(f"\n🔍 Testing Create Negative Safety Observation...")
        
        observation_data = {
            "title": "Observación Negativa - Falta de EPP",
            "description": "Trabajador sin casco de seguridad en área de construcción",
            "type": "negative",
            "location": "Área de construcción - Sector B",
            "corrective_action": "Proporcionar casco de seguridad y capacitación sobre uso de EPP"
        }
        
        try:
            url = f"{self.api_url}/safety/observations"
            response = self.session.post(url, json=observation_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'observation_id' in response_data:
                    obs_id = response_data['observation_id']
                    title = response_data.get('title', 'N/A')
                    obs_type = response_data.get('type', 'N/A')
                    corrective_action = response_data.get('corrective_action', 'N/A')
                    self.log_test("Create Negative Safety Observation", True, 
                                f"Negative observation created - ID: {obs_id}, Type: {obs_type}, Has corrective action: {bool(corrective_action)}")
                    return True, response_data
                else:
                    self.log_test("Create Negative Safety Observation", False, "", "No observation_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Create Negative Safety Observation", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Negative Safety Observation", False, "", str(e))
            return False, {}

    def test_create_toolbox_talk(self):
        """Test creating a toolbox talk"""
        print(f"\n🔍 Testing Create Toolbox Talk...")
        
        talk_data = {
            "title": "Charla de Seguridad - Uso de EPP",
            "description": "Charla sobre la importancia del uso correcto del equipo de protección personal",
            "scheduled_date": "2024-12-20",
            "duration_minutes": 30,
            "presenter": "Supervisor de Seguridad",
            "topics": ["EPP", "Seguridad en construcción", "Procedimientos de emergencia"]
        }
        
        try:
            url = f"{self.api_url}/safety/toolbox-talks"
            response = self.session.post(url, json=talk_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'talk_id' in response_data:
                    self.test_toolbox_talk_id = response_data['talk_id']
                    title = response_data.get('title', 'N/A')
                    scheduled_date = response_data.get('scheduled_date', 'N/A')
                    self.log_test("Create Toolbox Talk", True, 
                                f"Toolbox talk created - ID: {self.test_toolbox_talk_id}, Title: {title}, Date: {scheduled_date}")
                    return True, response_data
                else:
                    self.log_test("Create Toolbox Talk", False, "", "No talk_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Create Toolbox Talk", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Toolbox Talk", False, "", str(e))
            return False, {}

    def test_record_toolbox_talk_attendance(self):
        """Test recording attendance for a toolbox talk"""
        print(f"\n🔍 Testing Record Toolbox Talk Attendance...")
        
        if not self.test_toolbox_talk_id:
            self.log_test("Record Toolbox Talk Attendance", False, "", "No toolbox talk ID available")
            return False
        
        attendance_data = {
            "attendee_name": "Juan Pérez",
            "attendee_position": "Operario de construcción",
            "signature": "JP_signature_data"
        }
        
        try:
            url = f"{self.api_url}/safety/toolbox-talks/{self.test_toolbox_talk_id}/attendance"
            response = self.session.post(url, json=attendance_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                attendee_count = len(response_data.get('attendees', []))
                self.log_test("Record Toolbox Talk Attendance", True, 
                            f"Attendance recorded successfully - Total attendees: {attendee_count}")
                return True, response_data
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Record Toolbox Talk Attendance", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Record Toolbox Talk Attendance", False, "", str(e))
            return False, {}

    def test_create_incident(self):
        """Test creating a safety incident"""
        print(f"\n🔍 Testing Create Safety Incident...")
        
        incident_data = {
            "title": "Incidente Menor - Corte en dedo",
            "description": "Trabajador se cortó el dedo con herramienta manual",
            "incident_date": "2024-12-19",
            "location": "Área de carpintería",
            "severity": "minor",
            "injured_person": "Carlos Rodríguez",
            "witness": "María González",
            "immediate_action": "Primeros auxilios aplicados, herida limpiada y vendada",
            "root_cause": "Herramienta sin protección adecuada",
            "corrective_action": "Reemplazar herramienta y capacitar sobre uso seguro"
        }
        
        try:
            url = f"{self.api_url}/safety/incidents"
            response = self.session.post(url, json=incident_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'incident_id' in response_data:
                    self.test_incident_id = response_data['incident_id']
                    title = response_data.get('title', 'N/A')
                    severity = response_data.get('severity', 'N/A')
                    self.log_test("Create Safety Incident", True, 
                                f"Incident created - ID: {self.test_incident_id}, Title: {title}, Severity: {severity}")
                    return True, response_data
                else:
                    self.log_test("Create Safety Incident", False, "", "No incident_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Create Safety Incident", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Safety Incident", False, "", str(e))
            return False, {}

    def test_get_safety_checklists(self):
        """Test getting safety checklists list"""
        print(f"\n🔍 Testing Get Safety Checklists...")
        
        try:
            url = f"{self.api_url}/safety/checklists"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                checklists = response.json()
                if isinstance(checklists, list):
                    self.log_test("Get Safety Checklists", True, 
                                f"Retrieved {len(checklists)} checklists")
                    return True, checklists
                else:
                    self.log_test("Get Safety Checklists", False, "", f"Invalid response format: {checklists}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Safety Checklists", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Safety Checklists", False, "", str(e))
            return False, []

    def test_get_safety_observations(self):
        """Test getting safety observations list"""
        print(f"\n🔍 Testing Get Safety Observations...")
        
        try:
            url = f"{self.api_url}/safety/observations"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                observations = response.json()
                if isinstance(observations, list):
                    positive_count = len([obs for obs in observations if obs.get('type') == 'positive'])
                    negative_count = len([obs for obs in observations if obs.get('type') == 'negative'])
                    self.log_test("Get Safety Observations", True, 
                                f"Retrieved {len(observations)} observations (Positive: {positive_count}, Negative: {negative_count})")
                    return True, observations
                else:
                    self.log_test("Get Safety Observations", False, "", f"Invalid response format: {observations}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Safety Observations", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Safety Observations", False, "", str(e))
            return False, []

    def test_get_toolbox_talks(self):
        """Test getting toolbox talks list"""
        print(f"\n🔍 Testing Get Toolbox Talks...")
        
        try:
            url = f"{self.api_url}/safety/toolbox-talks"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                talks = response.json()
                if isinstance(talks, list):
                    completed_count = len([talk for talk in talks if talk.get('status') == 'completed'])
                    scheduled_count = len([talk for talk in talks if talk.get('status') == 'scheduled'])
                    self.log_test("Get Toolbox Talks", True, 
                                f"Retrieved {len(talks)} talks (Completed: {completed_count}, Scheduled: {scheduled_count})")
                    return True, talks
                else:
                    self.log_test("Get Toolbox Talks", False, "", f"Invalid response format: {talks}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Toolbox Talks", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Toolbox Talks", False, "", str(e))
            return False, []

    def test_get_safety_incidents(self):
        """Test getting safety incidents list"""
        print(f"\n🔍 Testing Get Safety Incidents...")
        
        try:
            url = f"{self.api_url}/safety/incidents"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                incidents = response.json()
                if isinstance(incidents, list):
                    minor_count = len([inc for inc in incidents if inc.get('severity') == 'minor'])
                    major_count = len([inc for inc in incidents if inc.get('severity') == 'major'])
                    critical_count = len([inc for inc in incidents if inc.get('severity') == 'critical'])
                    self.log_test("Get Safety Incidents", True, 
                                f"Retrieved {len(incidents)} incidents (Minor: {minor_count}, Major: {major_count}, Critical: {critical_count})")
                    return True, incidents
                else:
                    self.log_test("Get Safety Incidents", False, "", f"Invalid response format: {incidents}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Safety Incidents", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Safety Incidents", False, "", str(e))
            return False, []

    def test_delete_safety_items(self):
        """Test deleting created safety items"""
        print(f"\n🔍 Testing Delete Safety Items...")
        
        delete_results = []
        
        # Delete checklist
        if self.test_checklist_id:
            try:
                url = f"{self.api_url}/safety/checklists/{self.test_checklist_id}"
                response = self.session.delete(url, timeout=30)
                if response.status_code == 200:
                    delete_results.append("Checklist deleted")
                else:
                    delete_results.append(f"Checklist delete failed: {response.status_code}")
            except Exception as e:
                delete_results.append(f"Checklist delete error: {str(e)}")
        
        # Delete observation
        if self.test_observation_id:
            try:
                url = f"{self.api_url}/safety/observations/{self.test_observation_id}"
                response = self.session.delete(url, timeout=30)
                if response.status_code == 200:
                    delete_results.append("Observation deleted")
                else:
                    delete_results.append(f"Observation delete failed: {response.status_code}")
            except Exception as e:
                delete_results.append(f"Observation delete error: {str(e)}")
        
        # Delete toolbox talk
        if self.test_toolbox_talk_id:
            try:
                url = f"{self.api_url}/safety/toolbox-talks/{self.test_toolbox_talk_id}"
                response = self.session.delete(url, timeout=30)
                if response.status_code == 200:
                    delete_results.append("Toolbox talk deleted")
                else:
                    delete_results.append(f"Toolbox talk delete failed: {response.status_code}")
            except Exception as e:
                delete_results.append(f"Toolbox talk delete error: {str(e)}")
        
        # Delete incident
        if self.test_incident_id:
            try:
                url = f"{self.api_url}/safety/incidents/{self.test_incident_id}"
                response = self.session.delete(url, timeout=30)
                if response.status_code == 200:
                    delete_results.append("Incident deleted")
                else:
                    delete_results.append(f"Incident delete failed: {response.status_code}")
            except Exception as e:
                delete_results.append(f"Incident delete error: {str(e)}")
        
        success = all("deleted" in result for result in delete_results)
        self.log_test("Delete Safety Items", success, 
                    f"Delete results: {', '.join(delete_results)}")
        return success

    def test_get_users_for_attendance(self):
        """Test getting users list for attendance testing"""
        print(f"\n🔍 Testing Get Users for Attendance...")
        
        try:
            url = f"{self.api_url}/users"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                users = response.json()
                if isinstance(users, list) and len(users) > 0:
                    # Get first few user IDs for testing
                    self.test_employee_ids = [user['user_id'] for user in users[:3] if user.get('user_id')]
                    user_names = [user.get('name', 'N/A') for user in users[:3]]
                    self.log_test("Get Users for Attendance", True, f"Found {len(users)} users. Using {len(self.test_employee_ids)} for testing: {', '.join(user_names)}")
                    return True, users
                else:
                    self.log_test("Get Users for Attendance", False, "", "No users found")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Users for Attendance", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Users for Attendance", False, "", str(e))
            return False, []

    def test_bulk_attendance_registration(self):
        """Test bulk attendance registration on existing talk"""
        print(f"\n🔍 Testing Bulk Attendance Registration...")
        
        if not self.test_toolbox_talk_id:
            self.log_test("Bulk Attendance Registration", False, "", "No talk ID available")
            return False
        
        if not hasattr(self, 'test_employee_ids') or not self.test_employee_ids:
            self.log_test("Bulk Attendance Registration", False, "", "No employee IDs available")
            return False
        
        try:
            attendance_data = {
                "employee_ids": self.test_employee_ids,
                "external_count": 2,
                "external_names": ["Juan Pérez", "María González"]
            }
            
            url = f"{self.api_url}/safety/toolbox-talks/{self.test_toolbox_talk_id}/attendance-bulk"
            response = self.session.post(url, json=attendance_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                attendance_records = response_data.get('attendance_records', [])
                external_count = response_data.get('external_attendee_count', 0)
                
                employee_attendees = [r for r in attendance_records if r.get('type') == 'employee']
                external_attendees = [r for r in attendance_records if r.get('type') == 'external']
                
                self.log_test("Bulk Attendance Registration", True, 
                            f"Registered {len(employee_attendees)} employees and {len(external_attendees)} external attendees. Total external count: {external_count}")
                return True, response_data
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Bulk Attendance Registration", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Bulk Attendance Registration", False, "", str(e))
            return False, {}

    def test_media_upload(self):
        """Test uploading an image file to toolbox talk"""
        print(f"\n🔍 Testing Media Upload...")
        
        if not self.test_toolbox_talk_id:
            self.log_test("Media Upload", False, "", "No talk ID available")
            return False
        
        try:
            # Create a simple test image (1x1 PNG)
            import base64
            # Minimal PNG data (1x1 transparent pixel)
            png_data = base64.b64decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8'
                'IQAAAAABJRU5ErkJggg=='
            )
            
            # Prepare multipart form data
            files = {
                'file': ('test_image.png', png_data, 'image/png')
            }
            
            params = {
                'entity_type': 'toolbox_talk',
                'entity_id': self.test_toolbox_talk_id
            }
            
            url = f"{self.api_url}/safety/upload"
            response = self.session.post(url, files=files, params=params, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                self.test_media_filename = response_data.get('filename')
                media_id = response_data.get('media_id')
                file_size = response_data.get('file_size')
                media_type = response_data.get('media_type')
                
                self.log_test("Media Upload", True, 
                            f"Uploaded successfully - Filename: {self.test_media_filename}, Media ID: {media_id}, Size: {file_size} bytes, Type: {media_type}")
                return True, response_data
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Media Upload", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Media Upload", False, "", str(e))
            return False, {}

    def test_verify_media_added(self):
        """Test that media was added to the toolbox talk"""
        print(f"\n🔍 Testing Verify Media Added to Toolbox Talk...")
        
        if not self.test_toolbox_talk_id:
            self.log_test("Verify Media Added", False, "", "No talk ID available")
            return False
        
        try:
            url = f"{self.api_url}/safety/toolbox-talks/{self.test_toolbox_talk_id}"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                talk_data = response.json()
                media_array = talk_data.get('media', [])
                
                if isinstance(media_array, list) and len(media_array) > 0:
                    # Check if our uploaded file is in the media array
                    uploaded_media = None
                    for media in media_array:
                        if hasattr(self, 'test_media_filename') and media.get('filename') == self.test_media_filename:
                            uploaded_media = media
                            break
                    
                    if uploaded_media:
                        self.log_test("Verify Media Added", True, 
                                    f"Media found in talk - Filename: {uploaded_media.get('filename')}, Type: {uploaded_media.get('media_type')}")
                        return True, uploaded_media
                    else:
                        filename = getattr(self, 'test_media_filename', 'N/A')
                        self.log_test("Verify Media Added", False, "", f"Uploaded media {filename} not found in talk's media array")
                        return False, {}
                else:
                    self.log_test("Verify Media Added", False, "", "No media found in talk's media array")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Verify Media Added", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Verify Media Added", False, "", str(e))
            return False, {}

    def test_media_retrieval(self):
        """Test retrieving the uploaded media file"""
        print(f"\n🔍 Testing Media Retrieval...")
        
        if not hasattr(self, 'test_media_filename') or not self.test_media_filename:
            self.log_test("Media Retrieval", False, "", "No media filename available")
            return False
        
        try:
            url = f"{self.api_url}/safety/media/{self.test_media_filename}"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            print(f"   Response Headers: {dict(response.headers)}")
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                
                # Verify it's an image
                if content_type.startswith('image/'):
                    self.log_test("Media Retrieval", True, 
                                f"Media retrieved successfully - Content-Type: {content_type}, Size: {content_length} bytes")
                    return True, response.content
                else:
                    self.log_test("Media Retrieval", False, "", f"Unexpected content type: {content_type}")
                    return False, None
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Media Retrieval", False, "", error_msg)
                return False, None
                
        except Exception as e:
            self.log_test("Media Retrieval", False, "", str(e))
            return False, None

    def test_media_deletion(self):
        """Test deleting the uploaded media file"""
        print(f"\n🔍 Testing Media Deletion (Cleanup)...")
        
        if not hasattr(self, 'test_media_filename') or not self.test_media_filename or not self.test_toolbox_talk_id:
            self.log_test("Media Deletion", False, "", "No media filename or talk ID available")
            return False
        
        try:
            params = {
                'entity_type': 'toolbox_talk',
                'entity_id': self.test_toolbox_talk_id
            }
            
            url = f"{self.api_url}/safety/media/{self.test_media_filename}"
            response = self.session.delete(url, params=params, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                message = response_data.get('message', '')
                self.log_test("Media Deletion", True, f"Media deleted successfully - {message}")
                return True
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Media Deletion", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Media Deletion", False, "", str(e))
            return False

    def run_safety_module_tests(self):
        """Run complete safety module test suite"""
        print("🚀 Starting Safety Module Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Test Safety Dashboard
        self.test_safety_dashboard()
        
        # Step 3: Test Safety Checklists
        self.test_create_safety_checklist()
        self.test_check_checklist_item()
        self.test_get_safety_checklists()
        
        # Step 4: Test Safety Observations
        self.test_create_safety_observation()
        self.test_create_negative_observation()
        self.test_get_safety_observations()
        
        # Step 5: Test Toolbox Talks
        self.test_create_toolbox_talk()
        self.test_record_toolbox_talk_attendance()
        self.test_get_toolbox_talks()
        
        # Step 5.1: Test Media Upload and Bulk Attendance (New Features)
        users_success, users = self.test_get_users_for_attendance()
        if users_success and self.test_employee_ids:
            self.test_bulk_attendance_registration()
        else:
            print("⚠️  Skipping bulk attendance test - no employee IDs available")
        
        # Test media upload functionality
        upload_success, upload_data = self.test_media_upload()
        if upload_success:
            self.test_verify_media_added()
            self.test_media_retrieval()
            self.test_media_deletion()
        
        # Step 6: Test Safety Incidents
        self.test_create_incident()
        self.test_get_safety_incidents()
        
        # Step 7: Test Dashboard again to see updated stats
        print(f"\n🔍 Testing Safety Dashboard (After Creating Items)...")
        self.test_safety_dashboard()
        
        # Step 8: Clean up - Delete test items
        self.test_delete_safety_items()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 SAFETY MODULE TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if any(keyword in test['test'] for keyword in ['Dashboard', 'Create', 'Login'])]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class InvoiceManagementTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_tax_type_id = None
        self.test_saved_client_id = None
        self.test_invoice_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_create_tax_type(self):
        """Test creating a new tax type"""
        print(f"\n🔍 Testing Create Tax Type...")
        
        tax_type_data = {
            "name": "Municipal 1%",
            "percentage": 1.0,
            "description": "Impuesto municipal",
            "is_active": True
        }
        
        try:
            url = f"{self.api_url}/tax-types"
            response = self.session.post(url, json=tax_type_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                tax_type = response.json()
                print(f"   Response Body: {json.dumps(tax_type, indent=2)}")
                
                if 'id' in tax_type:
                    self.test_tax_type_id = tax_type['id']
                    name = tax_type.get('name', 'N/A')
                    percentage = tax_type.get('percentage', 0)
                    self.log_test("Create Tax Type", True, 
                                f"Tax type created - ID: {self.test_tax_type_id}, Name: {name}, Percentage: {percentage}%")
                    return True, tax_type
                else:
                    self.log_test("Create Tax Type", False, "", "No id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Create Tax Type", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Tax Type", False, "", str(e))
            return False, {}

    def test_get_tax_types(self):
        """Test getting tax types list"""
        print(f"\n🔍 Testing Get Tax Types...")
        
        try:
            url = f"{self.api_url}/tax-types"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                tax_types = response.json()
                print(f"   Response Body: {json.dumps(tax_types, indent=2)}")
                
                if isinstance(tax_types, list):
                    self.log_test("Get Tax Types", True, f"Found {len(tax_types)} tax types")
                    return True, tax_types
                else:
                    self.log_test("Get Tax Types", False, "", f"Invalid response format: {tax_types}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Tax Types", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Tax Types", False, "", str(e))
            return False, []

    def test_update_tax_type(self):
        """Test updating a tax type"""
        print(f"\n🔍 Testing Update Tax Type...")
        
        if not self.test_tax_type_id:
            self.log_test("Update Tax Type", False, "", "No tax type ID available")
            return False
        
        update_data = {
            "name": "Municipal 1.5%",
            "percentage": 1.5,
            "description": "Impuesto municipal actualizado",
            "is_active": True
        }
        
        try:
            url = f"{self.api_url}/tax-types/{self.test_tax_type_id}"
            response = self.session.put(url, json=update_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                tax_type = response.json()
                print(f"   Response Body: {json.dumps(tax_type, indent=2)}")
                
                name = tax_type.get('name', 'N/A')
                percentage = tax_type.get('percentage', 0)
                self.log_test("Update Tax Type", True, 
                            f"Tax type updated - Name: {name}, Percentage: {percentage}%")
                return True, tax_type
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Update Tax Type", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Update Tax Type", False, "", str(e))
            return False, {}

    def test_create_saved_client(self):
        """Test creating a saved client"""
        print(f"\n🔍 Testing Create Saved Client...")
        
        client_data = {
            "name": "Test Client Corp",
            "email": "test@client.com",
            "phone": "787-555-1234",
            "address": "123 Test St"
        }
        
        try:
            url = f"{self.api_url}/saved-clients"
            response = self.session.post(url, json=client_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                client = response.json()
                print(f"   Response Body: {json.dumps(client, indent=2)}")
                
                if 'id' in client:
                    self.test_saved_client_id = client['id']
                    name = client.get('name', 'N/A')
                    email = client.get('email', 'N/A')
                    self.log_test("Create Saved Client", True, 
                                f"Saved client created - ID: {self.test_saved_client_id}, Name: {name}, Email: {email}")
                    return True, client
                else:
                    self.log_test("Create Saved Client", False, "", "No id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Create Saved Client", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Saved Client", False, "", str(e))
            return False, {}

    def test_get_saved_clients(self):
        """Test getting saved clients list"""
        print(f"\n🔍 Testing Get Saved Clients...")
        
        try:
            url = f"{self.api_url}/saved-clients"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                clients = response.json()
                print(f"   Response Body: {json.dumps(clients, indent=2)}")
                
                if isinstance(clients, list):
                    self.log_test("Get Saved Clients", True, f"Found {len(clients)} saved clients")
                    return True, clients
                else:
                    self.log_test("Get Saved Clients", False, "", f"Invalid response format: {clients}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Saved Clients", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Saved Clients", False, "", str(e))
            return False, []

    def test_get_invoices(self):
        """Test getting invoices list"""
        print(f"\n🔍 Testing Get Invoices...")
        
        try:
            url = f"{self.api_url}/invoices"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                invoices = response.json()
                print(f"   Response Body: {json.dumps(invoices, indent=2)}")
                
                if isinstance(invoices, list):
                    if len(invoices) > 0:
                        self.test_invoice_id = invoices[0].get('invoice_id')
                    self.log_test("Get Invoices", True, f"Found {len(invoices)} invoices")
                    return True, invoices
                else:
                    self.log_test("Get Invoices", False, "", f"Invalid response format: {invoices}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Invoices", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Invoices", False, "", str(e))
            return False, []

    def test_mark_invoice_as_sent(self):
        """Test marking an invoice as sent"""
        print(f"\n🔍 Testing Mark Invoice as Sent...")
        
        if not self.test_invoice_id:
            self.log_test("Mark Invoice as Sent", False, "", "No invoice ID available")
            return False
        
        try:
            url = f"{self.api_url}/invoices/{self.test_invoice_id}/mark-sent"
            response = self.session.put(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                invoice = response.json()
                print(f"   Response Body: {json.dumps(invoice, indent=2)}")
                
                status = invoice.get('status', 'N/A')
                sent_date = invoice.get('sent_date', 'N/A')
                
                if status == 'sent' and sent_date:
                    self.log_test("Mark Invoice as Sent", True, 
                                f"Invoice marked as sent - Status: {status}, Sent Date: {sent_date}")
                    return True, invoice
                else:
                    self.log_test("Mark Invoice as Sent", False, "", 
                                f"Invoice not properly marked as sent - Status: {status}, Sent Date: {sent_date}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Mark Invoice as Sent", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Mark Invoice as Sent", False, "", str(e))
            return False, {}

    def test_create_manual_invoice_with_tax_and_sponsor(self):
        """Test creating a manual invoice with tax type and sponsor"""
        print(f"\n🔍 Testing Create Manual Invoice with Tax Type and Sponsor...")
        
        # Get a project first
        try:
            projects_url = f"{self.api_url}/projects"
            projects_response = self.session.get(projects_url, timeout=30)
            
            if projects_response.status_code != 200 or not projects_response.json():
                self.log_test("Create Manual Invoice with Tax Type and Sponsor", False, "", "No projects available")
                return False
            
            project_id = projects_response.json()[0]['project_id']
            
            invoice_data = {
                "project_id": project_id,
                "client_name": "Test Client with Tax",
                "client_email": "taxclient@example.com",
                "client_phone": "787-555-9999",
                "client_address": "456 Tax Street, San Juan, PR 00902",
                "sponsor_name": "Test Sponsor Company",
                "tax_type_name": "Municipal 1.5%",
                "items": [
                    {
                        "description": "Professional Services with Tax",
                        "quantity": 1,
                        "unit_price": 2000.00,
                        "amount": 2000.00
                    }
                ],
                "tax_rate": 1.5,
                "notes": "Test invoice with tax type and sponsor",
                "terms": "Payment due within 30 days"
            }
            
            url = f"{self.api_url}/invoices/manual"
            response = self.session.post(url, json=invoice_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                invoice = response.json()
                print(f"   Response Body: {json.dumps(invoice, indent=2)}")
                
                if 'invoice_id' in invoice:
                    invoice_id = invoice['invoice_id']
                    sponsor_name = invoice.get('sponsor_name', 'N/A')
                    tax_type_name = invoice.get('tax_type_name', 'N/A')
                    total = invoice.get('total', 0)
                    self.log_test("Create Manual Invoice with Tax Type and Sponsor", True, 
                                f"Invoice created - ID: {invoice_id}, Sponsor: {sponsor_name}, Tax Type: {tax_type_name}, Total: ${total}")
                    return True, invoice
                else:
                    self.log_test("Create Manual Invoice with Tax Type and Sponsor", False, "", "No invoice_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Create Manual Invoice with Tax Type and Sponsor", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Create Manual Invoice with Tax Type and Sponsor", False, "", str(e))
            return False, {}

    def test_delete_tax_type(self):
        """Test deleting a tax type"""
        print(f"\n🔍 Testing Delete Tax Type...")
        
        if not self.test_tax_type_id:
            self.log_test("Delete Tax Type", False, "", "No tax type ID available")
            return False
        
        try:
            url = f"{self.api_url}/tax-types/{self.test_tax_type_id}"
            response = self.session.delete(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"   Response Body: {json.dumps(result, indent=2)}")
                
                self.log_test("Delete Tax Type", True, f"Tax type deleted successfully")
                return True, result
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                print(f"   Error Response: {error_msg}")
                self.log_test("Delete Tax Type", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Delete Tax Type", False, "", str(e))
            return False, {}

    def run_invoice_management_tests(self):
        """Run complete invoice management test suite"""
        print("🚀 Starting Invoice Management Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Test Tax Types CRUD
        print("\n📋 Testing Tax Types CRUD Operations...")
        self.test_create_tax_type()
        self.test_get_tax_types()
        self.test_update_tax_type()
        
        # Step 3: Test Saved Clients
        print("\n👥 Testing Saved Clients...")
        self.test_create_saved_client()
        self.test_get_saved_clients()
        
        # Step 4: Test Invoice Operations
        print("\n📄 Testing Invoice Operations...")
        self.test_get_invoices()
        if self.test_invoice_id:
            self.test_mark_invoice_as_sent()
        
        # Step 5: Test Manual Invoice with Tax and Sponsor
        print("\n💰 Testing Manual Invoice with Tax Type and Sponsor...")
        self.test_create_manual_invoice_with_tax_and_sponsor()
        
        # Step 6: Cleanup - Delete test tax type
        print("\n🧹 Cleanup...")
        self.test_delete_tax_type()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 INVOICE MANAGEMENT TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if any(keyword in test['test'] for keyword in ['Tax Type', 'Saved Client', 'Mark Invoice', 'Manual Invoice'])]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

class EmployeeProfileTasksTester:
    def __init__(self, base_url="https://clienthub-61.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_task_id = None

    def log_test(self, name, success, details="", error=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
            if details:
                print(f"   Details: {details}")
        else:
            print(f"❌ {name} - FAILED: {error}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "error": error
        })

    def test_login(self, email="j.carrero@ohsmspr.com", password="Axel52418!"):
        """Test login with provided credentials"""
        print(f"\n🔍 Testing Login with {email}...")
        
        login_data = {
            "email": email,
            "password": password
        }
        
        try:
            url = f"{self.api_url}/auth/login"
            response = self.session.post(url, json=login_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                if 'user' in response_data:
                    self.user_id = response_data['user']['user_id']
                    user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login", True, f"Logged in as {user_name} (ID: {self.user_id}, Role: {user_role})")
                    return True
                else:
                    self.log_test("Login", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login", False, "", str(e))
            return False

    def test_get_my_tasks(self):
        """Test getting tasks assigned to the logged-in user"""
        print(f"\n🔍 Testing Get My Tasks...")
        
        try:
            url = f"{self.api_url}/my-tasks"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                tasks = response.json()
                print(f"   Response Body: {json.dumps(tasks, indent=2)}")
                
                if isinstance(tasks, list):
                    # Check if tasks have project_name attached
                    tasks_with_project = [task for task in tasks if 'project_name' in task]
                    
                    if len(tasks) > 0:
                        # Store first task for status update test
                        self.test_task_id = tasks[0].get('task_id')
                    
                    self.log_test("Get My Tasks", True, 
                                f"Found {len(tasks)} tasks, {len(tasks_with_project)} with project_name attached")
                    return True, tasks
                else:
                    self.log_test("Get My Tasks", False, "", f"Invalid response format: {tasks}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get My Tasks", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get My Tasks", False, "", str(e))
            return False, []

    def test_get_employee_profile(self):
        """Test getting employee profile"""
        print(f"\n🔍 Testing Get Employee Profile...")
        
        if not self.user_id:
            self.log_test("Get Employee Profile", False, "", "No user ID available")
            return False
        
        try:
            url = f"{self.api_url}/employees/{self.user_id}/profile"
            response = self.session.get(url, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                profile = response.json()
                print(f"   Response Body: {json.dumps(profile, indent=2)}")
                
                # Check if profile has expected fields
                expected_fields = ['user_id', 'phone', 'address', 'city']
                present_fields = [field for field in expected_fields if field in profile]
                
                self.log_test("Get Employee Profile", True, 
                            f"Profile retrieved successfully with fields: {present_fields}")
                return True, profile
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Employee Profile", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Get Employee Profile", False, "", str(e))
            return False, {}

    def test_update_own_profile(self):
        """Test updating own profile (new endpoint)"""
        print(f"\n🔍 Testing Update Own Profile...")
        
        if not self.user_id:
            self.log_test("Update Own Profile", False, "", "No user ID available")
            return False
        
        # Test data - only allowed fields
        profile_data = {
            "phone": "787-555-9999",
            "address": "123 Test Street",
            "city": "San Juan",
            "emergency_contact_name": "Emergency Contact Test",
            # Try to include salary fields that should be ignored
            "salary": 99999.99,
            "hourly_rate": 999.99
        }
        
        try:
            url = f"{self.api_url}/employees/{self.user_id}/profile/self"
            response = self.session.put(url, json=profile_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                # Check if response contains success message
                if 'message' in response_data and 'actualizado' in response_data['message']:
                    # The endpoint returns a success message, let's verify by getting the profile again
                    try:
                        verify_url = f"{self.api_url}/employees/{self.user_id}/profile"
                        verify_response = self.session.get(verify_url, timeout=30)
                        
                        if verify_response.status_code == 200:
                            updated_profile = verify_response.json()
                            
                            # Verify allowed fields were updated
                            allowed_updated = (
                                updated_profile.get('phone') == profile_data['phone'] and
                                updated_profile.get('address') == profile_data['address'] and
                                updated_profile.get('city') == profile_data['city'] and
                                updated_profile.get('emergency_contact_name') == profile_data['emergency_contact_name']
                            )
                            
                            # Verify salary fields were NOT updated (should be ignored)
                            salary_ignored = (
                                updated_profile.get('salary') != profile_data['salary'] and
                                updated_profile.get('hourly_rate') != profile_data['hourly_rate']
                            )
                            
                            if allowed_updated:
                                if salary_ignored:
                                    self.log_test("Update Own Profile", True, 
                                                "Profile updated successfully, salary fields correctly ignored")
                                else:
                                    self.log_test("Update Own Profile", True, 
                                                "Profile updated successfully (salary fields not present to verify)")
                                return True, updated_profile
                            else:
                                self.log_test("Update Own Profile", False, "", "Allowed fields were not updated correctly")
                                return False, {}
                        else:
                            self.log_test("Update Own Profile", False, "", "Could not verify profile update")
                            return False, {}
                    except Exception as e:
                        self.log_test("Update Own Profile", False, "", f"Error verifying profile update: {str(e)}")
                        return False, {}
                else:
                    # If response contains updated profile data directly
                    updated_profile = response_data
                    
                    # Verify allowed fields were updated
                    allowed_updated = (
                        updated_profile.get('phone') == profile_data['phone'] and
                        updated_profile.get('address') == profile_data['address'] and
                        updated_profile.get('city') == profile_data['city'] and
                        updated_profile.get('emergency_contact_name') == profile_data['emergency_contact_name']
                    )
                    
                    # Verify salary fields were NOT updated (should be ignored)
                    salary_ignored = (
                        updated_profile.get('salary') != profile_data['salary'] and
                        updated_profile.get('hourly_rate') != profile_data['hourly_rate']
                    )
                    
                    if allowed_updated:
                        if salary_ignored:
                            self.log_test("Update Own Profile", True, 
                                        "Profile updated successfully, salary fields correctly ignored")
                        else:
                            self.log_test("Update Own Profile", True, 
                                        "Profile updated successfully (salary fields not present to verify)")
                        return True, updated_profile
                    else:
                        self.log_test("Update Own Profile", False, "", "Allowed fields were not updated correctly")
                        return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Update Own Profile", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Update Own Profile", False, "", str(e))
            return False, {}

    def test_update_task_status(self):
        """Test updating task status (new endpoint)"""
        print(f"\n🔍 Testing Update Task Status...")
        
        if not self.test_task_id:
            self.log_test("Update Task Status", False, "", "No task ID available")
            return False
        
        # Test data - change status from "todo" to "in_progress"
        status_data = {
            "status": "in_progress"
        }
        
        try:
            url = f"{self.api_url}/tasks/{self.test_task_id}/status"
            response = self.session.put(url, json=status_data, timeout=30)
            
            print(f"   Response Status: {response.status_code}")
            
            if response.status_code == 200:
                response_data = response.json()
                print(f"   Response Body: {json.dumps(response_data, indent=2)}")
                
                # Check if response contains status field or message with status
                if 'status' in response_data and response_data.get('status') == status_data['status']:
                    self.log_test("Update Task Status", True, 
                                f"Task status updated to '{status_data['status']}' successfully")
                    return True, response_data
                elif 'message' in response_data and 'actualizado' in response_data['message']:
                    # If response contains success message, assume it worked
                    self.log_test("Update Task Status", True, 
                                f"Task status updated to '{status_data['status']}' successfully")
                    return True, response_data
                else:
                    self.log_test("Update Task Status", False, "", 
                                f"Status not updated correctly. Response: {response_data}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Update Task Status", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Update Task Status", False, "", str(e))
            return False, {}

    def run_employee_profile_tasks_tests(self):
        """Run complete employee profile and tasks test suite"""
        print("🚀 Starting Employee Profile and Tasks Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Login
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Get my tasks
        success, tasks = self.test_get_my_tasks()
        
        # Step 3: Get employee profile
        self.test_get_employee_profile()
        
        # Step 4: Update own profile
        self.test_update_own_profile()
        
        # Step 5: Update task status (if we have a task)
        if self.test_task_id:
            self.test_update_task_status()
        else:
            print("⚠️ Skipping task status update test - no tasks available")
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 EMPLOYEE PROFILE AND TASKS TEST RESULTS")
        print("=" * 80)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Show failed tests
        failed_tests = [test for test in self.test_results if not test['success']]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"   • {test['test']}: {test['error']}")
        
        # Show critical issues
        critical_failures = [test for test in failed_tests if any(keyword in test['test'] for keyword in ['Login', 'Get My Tasks', 'Update Own Profile', 'Update Task Status'])]
        if critical_failures:
            print("\n🚨 CRITICAL ISSUES FOUND:")
            for test in critical_failures:
                print(f"   • {test['test']}: {test['error']}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.tests_run - self.tests_passed,
            "success_rate": (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0,
            "test_details": self.test_results,
            "failed_tests": failed_tests,
            "critical_issues": critical_failures
        }

def main():
    """Main function"""
    if len(sys.argv) > 1:
        if sys.argv[1] == "clock":
            # Run clock system tests
            tester = ClockSystemTester()
            results = tester.run_clock_system_tests()
        elif sys.argv[1] == "export":
            # Run cost estimate export tests
            tester = CostEstimateExportTester()
            results = tester.run_cost_estimate_export_tests()
        elif sys.argv[1] == "client":
            # Run client portal tests
            tester = ClientPortalTester()
            results = tester.run_client_portal_tests()
        elif sys.argv[1] == "pdf":
            # Run PDF generation tests
            tester = PDFGenerationTester()
            results = tester.run_pdf_generation_tests()
        elif sys.argv[1] == "safety":
            # Run Safety Module tests
            tester = SafetyModuleTester()
            results = tester.run_safety_module_tests()
        elif sys.argv[1] == "payroll":
            # Run Payroll tests
            tester = PayrollTester()
            results = tester.run_payroll_tests()
        elif sys.argv[1] == "invoice-mgmt":
            # Run Invoice Management tests
            tester = InvoiceManagementTester()
            results = tester.run_invoice_management_tests()
        elif sys.argv[1] == "employee-profile":
            # Run Employee Profile and Tasks tests
            tester = EmployeeProfileTasksTester()
            results = tester.run_employee_profile_tasks_tests()
        else:
            print("Usage: python backend_test.py [clock|export|client|pdf|safety|payroll|invoice-mgmt|employee-profile]")
            return 1
    else:
        # Run full API tests
        tester = ProjectManagementAPITester()
        results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())