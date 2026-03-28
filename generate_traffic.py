#!/usr/bin/env python3
"""
Script to generate API traffic for populating Prometheus/Grafana metrics.
Run this to create realistic load on the Django API.
"""

import requests
import random
import time
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "http://localhost:8000/api"
METRICS_URL = "http://localhost:8000/metrics"

# Sample data for creating entities
SAMPLE_APARTMENTS = [
    {"number": f"{floor}{unit:02d}", "floor": floor, "status": random.choice(["available", "occupied", "maintenance"]), "notes": f"Apartment on floor {floor}"}
    for floor in range(1, 6)
    for unit in range(1, 6)
]

SAMPLE_TENANTS = [
    {"name": name, "email": f"{name.lower().replace(' ', '.')}@example.com", "phone": f"+1{random.randint(2000000000, 9999999999)}"}
    for name in [
        "John Smith", "Emma Johnson", "Michael Brown", "Sarah Davis", "James Wilson",
        "Emily Miller", "David Taylor", "Jessica Anderson", "Christopher Thomas", "Amanda Jackson",
        "Matthew White", "Jennifer Harris", "Daniel Martin", "Elizabeth Thompson", "Andrew Garcia",
        "Melissa Martinez", "Joshua Robinson", "Nicole Clark", "Ryan Rodriguez", "Stephanie Lewis"
    ]
]

SAMPLE_ISSUES = [
    "Leaky faucet in kitchen",
    "Broken AC unit",
    "Clogged drain",
    "Light fixture not working",
    "Window won't close properly",
    "Heating not working",
    "Door lock broken",
    "Paint peeling on wall",
    "Floor tile cracked",
    "Toilet running constantly"
]


def get_auth_token():
    """Get or create auth token."""
    try:
        # Try to get token
        response = requests.post(
            f"{BASE_URL}/token/",
            json={"username": "admin", "password": "admin"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json().get("token")
    except Exception as e:
        print(f"Auth error: {e}")
    return None


def make_request(method, endpoint, token, data=None, expected_status=None):
    """Make an API request with error handling."""
    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            return None, f"Unknown method: {method}"
        
        status_ok = expected_status is None or response.status_code == expected_status
        if not status_ok and expected_status:
            return None, f"Expected {expected_status}, got {response.status_code}"
        
        return response, None
    except requests.exceptions.Timeout:
        return None, "Timeout"
    except requests.exceptions.ConnectionError:
        return None, "Connection Error"
    except Exception as e:
        return None, str(e)


def generate_read_traffic(token, iterations=20):
    """Generate read-only API traffic."""
    endpoints = [
        "/apartments/",
        "/tenants/",
        "/leases/",
        "/maintenance-requests/",
        "/overview/",
        "/leases/upcoming-moveins/",
        "/leases/upcoming-moveouts/",
    ]
    
    results = {"success": 0, "error": 0}
    
    for _ in range(iterations):
        endpoint = random.choice(endpoints)
        response, error = make_request("GET", endpoint, token)
        
        if error:
            results["error"] += 1
            print(f"  ✗ GET {endpoint} - {error}")
        else:
            results["success"] += 1
            print(f"  ✓ GET {endpoint} - {response.status_code}")
        
        time.sleep(random.uniform(0.1, 0.5))
    
    return results


def generate_write_traffic(token, apartments, tenants, leases):
    """Generate write API traffic."""
    results = {"success": 0, "error": 0}
    
    # Create apartments (limit to avoid too many)
    if len(apartments) < 10:
        for apt_data in random.sample(SAMPLE_APARTMENTS, min(3, len(SAMPLE_APARTMENTS))):
            response, error = make_request("POST", "/apartments/", token, apt_data)
            if error:
                results["error"] += 1
                print(f"  ✗ POST /apartments/ - {error}")
            else:
                results["success"] += 1
                print(f"  ✓ POST /apartments/ - {response.status_code}")
            time.sleep(0.2)
    
    # Create tenants
    if len(tenants) < 10:
        for tenant_data in random.sample(SAMPLE_TENANTS, min(3, len(SAMPLE_TENANTS))):
            response, error = make_request("POST", "/tenants/", token, tenant_data)
            if error:
                results["error"] += 1
                print(f"  ✗ POST /tenants/ - {error}")
            else:
                results["success"] += 1
                print(f"  ✓ POST /tenants/ - {response.status_code}")
            time.sleep(0.2)
    
    # Create leases if we have apartments and tenants
    if apartments and tenants and len(leases) < 5:
        available_apts = [a for a in apartments if a.get("status") == "available"]
        if available_apts and tenants:
            lease_data = {
                "apartment_id": random.choice(available_apts)["id"],
                "tenant_id": random.choice(tenants)["id"],
                "move_in": "2025-04-01",
                "move_out": "2026-03-31",
                "is_active": True
            }
            response, error = make_request("POST", "/leases/", token, lease_data)
            if error:
                results["error"] += 1
                print(f"  ✗ POST /leases/ - {error}")
            else:
                results["success"] += 1
                print(f"  ✓ POST /leases/ - {response.status_code}")
            time.sleep(0.2)
    
    # Create maintenance requests
    if leases:
        for _ in range(min(3, len(leases))):
            issue_data = {
                "lease_id": random.choice(leases)["id"],
                "issue": random.choice(SAMPLE_ISSUES),
                "status": random.choice(["open", "in_progress", "closed"])
            }
            response, error = make_request("POST", "/maintenance-requests/", token, issue_data)
            if error:
                results["error"] += 1
                print(f"  ✗ POST /maintenance-requests/ - {error}")
            else:
                results["success"] += 1
                print(f"  ✓ POST /maintenance-requests/ - {response.status_code}")
            time.sleep(0.2)
    
    # Update some entities
    if apartments:
        apt = random.choice(apartments)
        update_data = {"status": random.choice(["available", "occupied", "maintenance"])}
        response, error = make_request("PUT", f"/apartments/{apt['id']}/", token, {**apt, **update_data})
        if error:
            results["error"] += 1
            print(f"  ✗ PUT /apartments/{apt['id']}/ - {error}")
        else:
            results["success"] += 1
            print(f"  ✓ PUT /apartments/{apt['id']}/ - {response.status_code}")
    
    return results


def simulate_error_traffic(token):
    """Generate some error traffic for metrics."""
    results = {"success": 0, "error": 0}
    
    # Try to access non-existent resource
    response, error = make_request("GET", "/apartments/99999/", token)
    if response and response.status_code == 404:
        results["success"] += 1
        print(f"  ✓ GET /apartments/99999/ - 404 (expected)")
    else:
        results["error"] += 1
        print(f"  ✗ Expected 404 not received")
    
    # Try invalid data
    response, error = make_request("POST", "/apartments/", token, {"invalid": "data"})
    if response and response.status_code in [400, 403]:
        results["success"] += 1
        print(f"  ✓ POST /apartments/ - {response.status_code} (expected error)")
    
    return results


def fetch_current_data(token):
    """Fetch current data from API."""
    data = {"apartments": [], "tenants": [], "leases": [], "maintenance": []}
    
    for endpoint, key in [
        ("/apartments/", "apartments"),
        ("/tenants/", "tenants"),
        ("/leases/", "leases"),
        ("/maintenance-requests/", "maintenance")
    ]:
        response, error = make_request("GET", endpoint, token)
        if response and response.status_code == 200:
            try:
                data[key] = response.json()
            except:
                pass
    
    return data


def run_traffic_generation(duration_minutes=2, concurrency=3):
    """Main function to run traffic generation."""
    print("=" * 60)
    print("🚀 API Traffic Generator for Metrics Population")
    print("=" * 60)
    print(f"\nTarget: {BASE_URL}")
    print(f"Duration: {duration_minutes} minutes")
    print(f"Concurrency: {duration_minutes} threads")
    print()
    
    # Get auth token
    print("Authenticating...")
    token = get_auth_token()
    if not token:
        print("❌ Failed to get auth token. Make sure admin/admin credentials work.")
        sys.exit(1)
    print("✅ Authenticated successfully\n")
    
    # Fetch current data
    print("Fetching current data...")
    data = fetch_current_data(token)
    print(f"  Apartments: {len(data['apartments'])}")
    print(f"  Tenants: {len(data['tenants'])}")
    print(f"  Leases: {len(data['leases'])}")
    print(f"  Maintenance: {len(data['maintenance'])}\n")
    
    # Generate traffic
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    total_requests = 0
    total_success = 0
    total_errors = 0
    
    iteration = 0
    while time.time() < end_time:
        iteration += 1
        print(f"\n--- Iteration {iteration} ---")
        
        # Read traffic
        print("\n📖 Read Operations:")
        results = generate_read_traffic(token, iterations=random.randint(10, 20))
        total_requests += results["success"] + results["error"]
        total_success += results["success"]
        total_errors += results["error"]
        
        # Write traffic
        print("\n✏️  Write Operations:")
        # Refresh data
        data = fetch_current_data(token)
        results = generate_write_traffic(token, data["apartments"], data["tenants"], data["leases"])
        total_requests += results["success"] + results["error"]
        total_success += results["success"]
        total_errors += results["error"]
        
        # Error simulation (occasionally)
        if iteration % 3 == 0:
            print("\n⚠️  Error Simulation:")
            results = simulate_error_traffic(token)
            total_requests += results["success"] + results["error"]
            total_success += results["success"]
            total_errors += results["error"]
        
        # Print metrics endpoint stats
        try:
            metrics_response = requests.get(METRICS_URL, timeout=5)
            if metrics_response.status_code == 200:
                lines = metrics_response.text.split('\n')
                request_lines = [l for l in lines if 'django_http_requests_total' in l and not l.startswith('#')]
                print(f"\n📊 Current metrics captured: {len(request_lines)} request metrics")
        except:
            pass
        
        # Wait before next iteration
        time.sleep(random.uniform(2, 5))
    
    # Summary
    print("\n" + "=" * 60)
    print("📈 TRAFFIC GENERATION COMPLETE")
    print("=" * 60)
    print(f"\nTotal Requests: {total_requests}")
    print(f"  ✅ Success: {total_success}")
    print(f"  ❌ Errors: {total_errors}")
    print(f"\n⏱️  Duration: {time.time() - start_time:.1f} seconds")
    print(f"\n📊 Check your dashboards:")
    print(f"   - Prometheus: http://localhost:9090")
    print(f"   - Grafana: http://localhost:3000")
    print("=" * 60)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Generate API traffic for metrics")
    parser.add_argument("--duration", type=int, default=2, help="Duration in minutes (default: 2)")
    parser.add_argument("--concurrency", type=int, default=1, help="Concurrent threads (default: 1)")
    args = parser.parse_args()
    
    try:
        run_traffic_generation(duration_minutes=args.duration, concurrency=args.concurrency)
    except KeyboardInterrupt:
        print("\n\n⚠️  Traffic generation interrupted by user")
        sys.exit(0)
