import json
import urllib.request
import urllib.error
import sys
import time

BASE_URL = "http://localhost:8000"

def make_request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data else None
    
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            status = response.getcode()
            body = response.read().decode("utf-8")
            return status, json.loads(body) if body else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_json = json.loads(body)
        except Exception:
            err_json = body
        return e.code, err_json

def run_tests():
    print("--- STARTING API VERIFICATION TESTS ---")
    
    # 1. Test Welcome Route
    status, res = make_request("/")
    assert status == 200, f"Expected 200, got {status}"
    assert "Welcome" in res.get("message", ""), "Welcome message not found"
    print("[OK] Welcome Route Verified")

    # 2. Test Product Creation
    prod_payload = {
        "name": "Verification Test Laptop",
        "sku": "VERIFY-SKU-001",
        "price": 1000.00,
        "quantity": 10
    }
    status, prod = make_request("/products", "POST", prod_payload)
    assert status == 201, f"Expected 201, got {status}: {prod}"
    assert prod["sku"] == "VERIFY-SKU-001", "SKU mismatch"
    assert int(prod["quantity"]) == 10, "Quantity mismatch"
    product_id = prod["id"]
    print(f"[OK] Product Creation Verified (ID: {product_id})")

    # 3. Test Duplicate SKU Rejection
    status, err = make_request("/products", "POST", prod_payload)
    assert status == 409, f"Expected 409 for duplicate SKU, got {status}: {err}"
    print("[OK] Duplicate SKU Rejection Verified (409 Conflict)")

    # 4. Test Customer Creation
    cust_payload = {
        "name": "Verification Customer",
        "email": "verify@customer.com",
        "phone": "+199988877"
    }
    status, cust = make_request("/customers", "POST", cust_payload)
    assert status == 201, f"Expected 201, got {status}: {cust}"
    assert cust["email"] == "verify@customer.com", "Email mismatch"
    customer_id = cust["id"]
    print(f"[OK] Customer Creation Verified (ID: {customer_id})")

    # 5. Test Duplicate Customer Email Rejection
    status, err = make_request("/customers", "POST", cust_payload)
    assert status == 409, f"Expected 409 for duplicate email, got {status}: {err}"
    print("[OK] Duplicate Customer Email Rejection Verified (409 Conflict)")

    # 6. Test Order Creation & Auto Total Calculation & Stock Deduction
    order_payload = {
        "customer_id": customer_id,
        "items": [
            {
                "product_id": product_id,
                "quantity": 3
            }
        ]
    }
    status, order = make_request("/orders", "POST", order_payload)
    assert status == 201, f"Expected 201, got {status}: {order}"
    assert float(order["total_amount"]) == 3000.00, f"Expected total 3000.00, got {order['total_amount']}"
    order_id = order["id"]
    print(f"[OK] Order Placement & Auto-Pricing Verified (Order ID: {order_id})")

    # Check updated stock levels
    status, prod_check = make_request(f"/products/{product_id}")
    assert status == 200
    assert int(prod_check["quantity"]) == 7, f"Expected remaining quantity 7, got {prod_check['quantity']}"
    print("[OK] Automated Inventory stock reduction verified")

    # 7. Test Insufficient Stock Block
    order_fail_payload = {
        "customer_id": customer_id,
        "items": [
            {
                "product_id": product_id,
                "quantity": 8 # Only 7 available!
            }
        ]
    }
    status, err = make_request("/orders", "POST", order_fail_payload)
    assert status == 400, f"Expected 400 for insufficient stock, got {status}: {err}"
    print("[OK] Insufficient stock order block verified")

    # 8. Test Order Cancellation & Restocking
    status, _ = make_request(f"/orders/{order_id}", "DELETE")
    assert status == 204, f"Expected 204, got {status}"
    
    # Check if stock restored
    status, prod_restored = make_request(f"/products/{product_id}")
    assert status == 200
    assert int(prod_restored["quantity"]) == 10, f"Expected stock restored to 10, got {prod_restored['quantity']}"
    print("[OK] Order cancellation & stock restoration verified")

    # 9. Clean up Verification Entities
    status, _ = make_request(f"/customers/{customer_id}", "DELETE")
    assert status == 204
    status, _ = make_request(f"/products/{product_id}", "DELETE")
    assert status == 204
    print("[OK] Cleanup of test entities completed")

    print("\n--- ALL API INTEGRATION TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    # Delay slightly to allow server startup in Docker Compose if run directly
    time.sleep(2)
    try:
        run_tests()
    except AssertionError as e:
        print(f"Assertion Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected Error: {e}")
        sys.exit(1)
