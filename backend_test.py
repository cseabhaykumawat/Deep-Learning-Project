#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class FocusDriftAPITester:
    def __init__(self, base_url="https://model-monitor-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if success:
                try:
                    response_data = response.json()
                    details += f", Response: {json.dumps(response_data, indent=2)}"
                    self.log_test(name, True, details)
                    return True, response_data
                except:
                    details += f", Response: {response.text[:200]}"
                    self.log_test(name, True, details)
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    details += f", Error: {json.dumps(error_data, indent=2)}"
                except:
                    details += f", Error: {response.text[:200]}"
                self.log_test(name, False, details)
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_api_root(self):
        """Test API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET",
            "",
            200
        )
        return success

    def test_start_session(self):
        """Test starting a new session"""
        success, response = self.run_test(
            "Start Session",
            "POST",
            "session/start",
            200,
            data={}
        )
        
        if success and 'id' in response:
            self.session_id = response['id']
            print(f"📝 Session ID: {self.session_id}")
            return True
        return False

    def test_log_tracking_events(self):
        """Test logging various tracking events"""
        if not self.session_id:
            self.log_test("Log Tracking Events", False, "No session ID available")
            return False

        events_to_test = [
            {"event_type": "scroll", "data": {"scrollY": 100}},
            {"event_type": "click", "data": {"x": 150, "y": 200}},
            {"event_type": "mousemove", "data": {"count": 10}},
            {"event_type": "idle", "data": {"duration": 5}},
            {"event_type": "visibility", "data": {"hidden": False}}
        ]

        all_success = True
        for i, event_data in enumerate(events_to_test):
            success, response = self.run_test(
                f"Log Event {i+1} ({event_data['event_type']})",
                "POST",
                "tracking/event",
                200,
                data={
                    "session_id": self.session_id,
                    **event_data
                }
            )
            if not success:
                all_success = False
            
            # Small delay between events
            time.sleep(0.1)

        return all_success

    def test_drift_analysis(self):
        """Test drift analysis endpoint"""
        if not self.session_id:
            self.log_test("Drift Analysis", False, "No session ID available")
            return False

        success, response = self.run_test(
            "Drift Analysis",
            "GET",
            f"tracking/analysis/{self.session_id}",
            200
        )

        if success:
            # Validate response structure
            required_fields = ['is_drifting', 'confidence', 'drift_score', 'factors', 'recommendation']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Drift Analysis Structure", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Drift Analysis Structure", True, "All required fields present")
                
                # Validate data types and ranges
                if not isinstance(response['is_drifting'], bool):
                    self.log_test("Drift Analysis - is_drifting type", False, "Should be boolean")
                    return False
                
                if not (0 <= response['confidence'] <= 1):
                    self.log_test("Drift Analysis - confidence range", False, "Should be 0-1")
                    return False
                
                if not (0 <= response['drift_score'] <= 100):
                    self.log_test("Drift Analysis - drift_score range", False, "Should be 0-100")
                    return False
                
                self.log_test("Drift Analysis Validation", True, "All validations passed")

        return success

    def test_session_stats(self):
        """Test session statistics endpoint"""
        if not self.session_id:
            self.log_test("Session Stats", False, "No session ID available")
            return False

        success, response = self.run_test(
            "Session Stats",
            "GET",
            f"session/{self.session_id}/stats",
            200
        )

        if success:
            # Validate response structure
            required_fields = ['session_id', 'active_time', 'scroll_count', 'click_count', 
                             'mouse_movements', 'idle_time', 'tab_switches', 'drift_detected', 'drift_score']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                self.log_test("Session Stats Structure", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Session Stats Structure", True, "All required fields present")

        return success

    def test_end_session(self):
        """Test ending a session"""
        if not self.session_id:
            self.log_test("End Session", False, "No session ID available")
            return False

        success, response = self.run_test(
            "End Session",
            "DELETE",
            f"session/{self.session_id}",
            200
        )
        return success

    def test_drift_algorithm_logic(self):
        """Test drift detection algorithm with specific scenarios"""
        print("\n🧠 Testing Drift Detection Algorithm Logic...")
        
        # Start a new session for algorithm testing
        success, response = self.run_test(
            "Algorithm Test - Start Session",
            "POST",
            "session/start",
            200,
            data={}
        )
        
        if not success:
            return False
        
        test_session_id = response['id']
        
        # Scenario 1: Generate excessive scrolling (should trigger drift)
        print("📊 Scenario 1: Excessive scrolling without clicks")
        for i in range(25):  # More than 20 scrolls
            requests.post(f"{self.api_url}/tracking/event", json={
                "session_id": test_session_id,
                "event_type": "scroll",
                "data": {"scrollY": i * 100}
            })
        
        # Add only 1 click (less than 3)
        requests.post(f"{self.api_url}/tracking/event", json={
            "session_id": test_session_id,
            "event_type": "click",
            "data": {"x": 100, "y": 100}
        })
        
        # Check drift analysis
        success, analysis = self.run_test(
            "Algorithm Test - Excessive Scrolling Analysis",
            "GET",
            f"tracking/analysis/{test_session_id}",
            200
        )
        
        if success:
            if analysis.get('drift_score', 0) >= 25:  # Should have at least 25 points for excessive scrolling
                self.log_test("Drift Algorithm - Excessive Scrolling Detection", True, 
                            f"Drift score: {analysis.get('drift_score', 0)}")
            else:
                self.log_test("Drift Algorithm - Excessive Scrolling Detection", False, 
                            f"Expected drift score >= 25, got {analysis.get('drift_score', 0)}")
        
        # Scenario 2: Generate idle behavior
        print("📊 Scenario 2: Idle behavior")
        for i in range(5):  # More than 3 idle events
            requests.post(f"{self.api_url}/tracking/event", json={
                "session_id": test_session_id,
                "event_type": "idle",
                "data": {"duration": 5}
            })
        
        success, analysis = self.run_test(
            "Algorithm Test - Idle Behavior Analysis",
            "GET",
            f"tracking/analysis/{test_session_id}",
            200
        )
        
        if success:
            expected_score = 25 + 30  # Previous + idle behavior
            if analysis.get('drift_score', 0) >= expected_score:
                self.log_test("Drift Algorithm - Idle Behavior Detection", True, 
                            f"Drift score: {analysis.get('drift_score', 0)}")
            else:
                self.log_test("Drift Algorithm - Idle Behavior Detection", False, 
                            f"Expected drift score >= {expected_score}, got {analysis.get('drift_score', 0)}")
        
        # Clean up test session
        requests.delete(f"{self.api_url}/session/{test_session_id}")
        
        return True

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Focus Drift Detection API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)

        # Test API availability
        if not self.test_api_root():
            print("❌ API is not accessible. Stopping tests.")
            return False

        # Test session management
        if not self.test_start_session():
            print("❌ Cannot start session. Stopping tests.")
            return False

        # Test event logging
        self.test_log_tracking_events()

        # Test analysis endpoints
        self.test_drift_analysis()
        self.test_session_stats()

        # Test algorithm logic
        self.test_drift_algorithm_logic()

        # Test session cleanup
        self.test_end_session()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = FocusDriftAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())