#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class ClockSystemTester:
    def __init__(self, base_url="https://biz-workflow-2.preview.emergentagent.com"):
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
    def __init__(self, base_url="https://biz-workflow-2.preview.emergentagent.com"):
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
    def __init__(self, base_url="https://biz-workflow-2.preview.emergentagent.com"):
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

class ProjectManagementAPITester:
    def __init__(self, base_url="https://biz-workflow-2.preview.emergentagent.com"):
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
        else:
            print("Usage: python backend_test.py [clock|export|client]")
            return 1
    else:
        # Run full API tests
        tester = ProjectManagementAPITester()
        results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())