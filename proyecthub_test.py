#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class ProyectHubTester:
    def __init__(self, base_url="https://invoice-edit-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session = requests.Session()
        self.user_id = None
        self.user_name = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_project_id = None
        self.test_log_id = None

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
                    self.user_name = response_data['user']['name']
                    user_role = response_data['user']['role']
                    self.log_test("Login Flow", True, f"Logged in as {self.user_name} (Role: {user_role}, ID: {self.user_id})")
                    return True
                else:
                    self.log_test("Login Flow", False, "", "No user data in response")
                    return False
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Login Flow", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Login Flow", False, "", str(e))
            return False

    def test_get_projects(self):
        """Test getting projects to find one for testing"""
        print(f"\n🔍 Testing Get Projects for Log Testing...")
        
        try:
            url = f"{self.api_url}/projects"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                projects = response.json()
                if isinstance(projects, list) and len(projects) > 0:
                    # Use the first project for testing
                    self.test_project_id = projects[0]['project_id']
                    project_name = projects[0]['name']
                    self.log_test("Get Projects for Testing", True, f"Found {len(projects)} projects. Using: {project_name} (ID: {self.test_project_id})")
                    return True, projects
                else:
                    self.log_test("Get Projects for Testing", False, "", "No projects available")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Get Projects for Testing", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Get Projects for Testing", False, "", str(e))
            return False, []

    def test_get_project_logs(self):
        """Test getting project logs (Bitácora tab)"""
        print(f"\n🔍 Testing Project Logs (Bitácora Tab)...")
        
        if not self.test_project_id:
            self.log_test("Project Logs - Get List", False, "", "No test project ID available")
            return False
        
        try:
            url = f"{self.api_url}/project-logs"
            params = {"project_id": self.test_project_id}
            response = self.session.get(url, params=params, timeout=30)
            
            if response.status_code == 200:
                logs = response.json()
                if isinstance(logs, list):
                    self.log_test("Project Logs - Get List", True, f"Retrieved {len(logs)} log entries")
                    
                    # Check log structure if logs exist
                    if len(logs) > 0:
                        log = logs[0]
                        required_fields = ['log_id', 'title', 'description', 'user_name', 'created_at', 'log_type']
                        missing_fields = [field for field in required_fields if field not in log]
                        
                        if not missing_fields:
                            self.log_test("Project Logs - Structure Validation", True, f"Log entries have correct structure: {', '.join(required_fields)}")
                        else:
                            self.log_test("Project Logs - Structure Validation", False, "", f"Missing fields: {missing_fields}")
                    
                    return True, logs
                else:
                    self.log_test("Project Logs - Get List", False, "", f"Invalid response format: {type(logs)}")
                    return False, []
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Project Logs - Get List", False, "", error_msg)
                return False, []
                
        except Exception as e:
            self.log_test("Project Logs - Get List", False, "", str(e))
            return False, []

    def test_create_project_log(self):
        """Test creating a new log entry"""
        print(f"\n🔍 Testing Create Project Log Entry...")
        
        if not self.test_project_id:
            self.log_test("Project Logs - Create Entry", False, "", "No test project ID available")
            return False
        
        log_data = {
            "project_id": self.test_project_id,
            "log_type": "work",
            "title": f"Test Log Entry - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "description": "This is a test log entry created during automated testing. It includes detailed description of work performed.",
            "hours_worked": 2.5,
            "attachments": []
        }
        
        try:
            url = f"{self.api_url}/project-logs"
            response = self.session.post(url, json=log_data, timeout=30)
            
            if response.status_code == 200:
                log_response = response.json()
                if 'log_id' in log_response:
                    self.test_log_id = log_response['log_id']
                    self.log_test("Project Logs - Create Entry", True, 
                                f"Created log entry: {log_response['title']} (ID: {self.test_log_id})")
                    
                    # Verify all fields are present
                    expected_fields = ['log_id', 'title', 'description', 'user_name', 'created_at', 'log_type', 'hours_worked']
                    missing_fields = [field for field in expected_fields if field not in log_response]
                    
                    if not missing_fields:
                        self.log_test("Project Logs - Create Response Validation", True, 
                                    f"Response contains all expected fields: {', '.join(expected_fields)}")
                    else:
                        self.log_test("Project Logs - Create Response Validation", False, "", 
                                    f"Missing fields in response: {missing_fields}")
                    
                    return True, log_response
                else:
                    self.log_test("Project Logs - Create Entry", False, "", "No log_id in response")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Project Logs - Create Entry", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Project Logs - Create Entry", False, "", str(e))
            return False, {}

    def test_update_project_log(self):
        """Test updating a log entry (edit functionality)"""
        print(f"\n🔍 Testing Update Project Log Entry...")
        
        if not self.test_log_id:
            self.log_test("Project Logs - Update Entry", False, "", "No test log ID available")
            return False
        
        update_data = {
            "project_id": self.test_project_id,
            "log_type": "update",
            "title": f"Updated Test Log Entry - {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            "description": "This log entry has been updated during automated testing. The description and hours have been modified.",
            "hours_worked": 3.0,
            "attachments": []
        }
        
        try:
            url = f"{self.api_url}/project-logs/{self.test_log_id}"
            response = self.session.put(url, json=update_data, timeout=30)
            
            if response.status_code == 200:
                log_response = response.json()
                if log_response.get('title') == update_data['title']:
                    self.log_test("Project Logs - Update Entry", True, 
                                f"Updated log entry: {log_response['title']}")
                    return True, log_response
                else:
                    self.log_test("Project Logs - Update Entry", False, "", 
                                f"Title not updated correctly. Expected: {update_data['title']}, Got: {log_response.get('title')}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Project Logs - Update Entry", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Project Logs - Update Entry", False, "", str(e))
            return False, {}

    def test_delete_project_log(self):
        """Test deleting a log entry"""
        print(f"\n🔍 Testing Delete Project Log Entry...")
        
        if not self.test_log_id:
            self.log_test("Project Logs - Delete Entry", False, "", "No test log ID available")
            return False
        
        try:
            url = f"{self.api_url}/project-logs/{self.test_log_id}"
            response = self.session.delete(url, timeout=30)
            
            if response.status_code == 200:
                self.log_test("Project Logs - Delete Entry", True, f"Deleted log entry: {self.test_log_id}")
                return True
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Project Logs - Delete Entry", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Project Logs - Delete Entry", False, "", str(e))
            return False

    def test_get_required_documents(self):
        """Test getting required documents (Documentos Requeridos tab)"""
        print(f"\n🔍 Testing Required Documents (Documentos Requeridos Tab)...")
        
        try:
            url = f"{self.api_url}/required-documents"
            response = self.session.get(url, timeout=30)
            
            if response.status_code == 200:
                docs_data = response.json()
                if isinstance(docs_data, dict):
                    from_client = docs_data.get('from_client', [])
                    to_client = docs_data.get('to_client', [])
                    
                    self.log_test("Required Documents - Get Lists", True, 
                                f"Retrieved documents - From Client: {len(from_client)}, To Client: {len(to_client)}")
                    
                    # Verify structure
                    if isinstance(from_client, list) and isinstance(to_client, list):
                        self.log_test("Required Documents - Structure Validation", True, 
                                    "Both document sections have correct list structure")
                        
                        # Check document structure if documents exist
                        all_docs = from_client + to_client
                        if len(all_docs) > 0:
                            doc = all_docs[0]
                            required_fields = ['document_id', 'document_name', 'direction', 'created_at']
                            missing_fields = [field for field in required_fields if field not in doc]
                            
                            if not missing_fields:
                                self.log_test("Required Documents - Document Structure", True, 
                                            f"Documents have correct structure: {', '.join(required_fields)}")
                            else:
                                self.log_test("Required Documents - Document Structure", False, "", 
                                            f"Missing fields: {missing_fields}")
                    else:
                        self.log_test("Required Documents - Structure Validation", False, "", 
                                    "Document sections are not lists")
                    
                    return True, docs_data
                else:
                    self.log_test("Required Documents - Get Lists", False, "", 
                                f"Invalid response format: {type(docs_data)}")
                    return False, {}
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Required Documents - Get Lists", False, "", error_msg)
                return False, {}
                
        except Exception as e:
            self.log_test("Required Documents - Get Lists", False, "", str(e))
            return False, {}

    def test_create_required_documents(self):
        """Test creating required documents"""
        print(f"\n🔍 Testing Create Required Documents...")
        
        # Test creating "from client" document
        from_client_data = {
            "document_name": f"Test Document from Client - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }
        
        try:
            url = f"{self.api_url}/required-documents/from-client"
            response = self.session.post(url, json=from_client_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                self.log_test("Required Documents - Create From Client", True, 
                            f"Created document: {response_data.get('document_name', 'Unknown')}")
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Required Documents - Create From Client", False, "", error_msg)
                
        except Exception as e:
            self.log_test("Required Documents - Create From Client", False, "", str(e))
        
        # Test creating "to client" document
        to_client_data = {
            "document_name": f"Test Document to Client - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        }
        
        try:
            url = f"{self.api_url}/required-documents/to-client"
            response = self.session.post(url, json=to_client_data, timeout=30)
            
            if response.status_code == 200:
                response_data = response.json()
                self.log_test("Required Documents - Create To Client", True, 
                            f"Created document: {response_data.get('document_name', 'Unknown')}")
                return True
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get('detail', f"HTTP {response.status_code}")
                except:
                    error_msg = f"HTTP {response.status_code}"
                self.log_test("Required Documents - Create To Client", False, "", error_msg)
                return False
                
        except Exception as e:
            self.log_test("Required Documents - Create To Client", False, "", str(e))
            return False

    def run_proyecthub_tests(self):
        """Run ProyectHub specific tests"""
        print("🚀 Starting ProyectHub Application Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 80)
        
        # Step 1: Test Login Flow
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return self.generate_report()
        
        # Step 2: Get projects for testing
        success, projects = self.test_get_projects()
        if not success:
            print("❌ Failed to get projects, stopping tests")
            return self.generate_report()
        
        # Step 3: Test Project Logs (Bitácora tab)
        print(f"\n{'='*60}")
        print("🔍 TESTING PROJECT LOGS (BITÁCORA TAB)")
        print(f"{'='*60}")
        
        # Get existing logs
        self.test_get_project_logs()
        
        # Create new log entry
        self.test_create_project_log()
        
        # Update log entry (edit functionality)
        self.test_update_project_log()
        
        # Delete log entry
        self.test_delete_project_log()
        
        # Step 4: Test Required Documents (Documentos Requeridos tab)
        print(f"\n{'='*60}")
        print("🔍 TESTING REQUIRED DOCUMENTS (DOCUMENTOS REQUERIDOS TAB)")
        print(f"{'='*60}")
        
        # Get required documents
        self.test_get_required_documents()
        
        # Create required documents
        self.test_create_required_documents()
        
        return self.generate_report()

    def generate_report(self):
        """Generate test report"""
        print("\n" + "=" * 80)
        print("📊 PROYECTHUB TEST RESULTS")
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
        
        # Show successful tests by category
        successful_tests = [test for test in self.test_results if test['success']]
        if successful_tests:
            print("\n✅ SUCCESSFUL TESTS:")
            
            # Group by category
            login_tests = [t for t in successful_tests if 'Login' in t['test']]
            log_tests = [t for t in successful_tests if 'Project Log' in t['test']]
            doc_tests = [t for t in successful_tests if 'Required Document' in t['test']]
            
            if login_tests:
                print("   🔐 Login Flow:")
                for test in login_tests:
                    print(f"      ✓ {test['test']}")
            
            if log_tests:
                print("   📝 Project Logs (Bitácora):")
                for test in log_tests:
                    print(f"      ✓ {test['test']}")
            
            if doc_tests:
                print("   📄 Required Documents:")
                for test in doc_tests:
                    print(f"      ✓ {test['test']}")
        
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
    tester = ProyectHubTester()
    results = tester.run_proyecthub_tests()
    
    # Return appropriate exit code
    return 0 if results['failed_tests'] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())