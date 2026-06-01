from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from decimal import Decimal

from app import models, schemas, crud, database
from app.config import settings

# Create tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Inventory & Order Management System API")

# Configure CORS to restrict origins securely
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
if settings.frontend_url:
    # Strip any trailing slash to prevent match mismatches
    frontend_origin = settings.frontend_url.rstrip("/")
    if frontend_origin not in origins:
        origins.append(frontend_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup DB Seeding Event
@app.on_event("startup")
def seed_database():
    db = next(database.get_db())
    # Seed only if products table is empty
    if db.query(models.Product).count() == 0:
        print("Database is empty. Seeding initial data...")
        
        # Seed Products
        products = [
            models.Product(name="MacBook Pro 16", sku="SKU-LAP-001", price=Decimal("2499.99"), quantity=15),
            models.Product(name="iPhone 15 Pro", sku="SKU-PHN-002", price=Decimal("999.99"), quantity=25),
            models.Product(name="UltraWide Monitor 34\"", sku="SKU-MNT-003", price=Decimal("499.99"), quantity=5),
            models.Product(name="Mechanical Keyboard", sku="SKU-KEY-004", price=Decimal("129.99"), quantity=3),
            models.Product(name="Wireless Ergonomic Mouse", sku="SKU-MSE-005", price=Decimal("79.99"), quantity=50),
        ]
        db.add_all(products)
        db.commit()

        # Seed Customers
        customers = [
            models.Customer(name="Alice Johnson", email="alice@example.com", phone="+15550192"),
            models.Customer(name="Bob Smith", email="bob@example.com", phone="+15550183"),
            models.Customer(name="Charlie Brown", email="charlie@example.com", phone="+15550174"),
        ]
        db.add_all(customers)
        db.commit()

        # Refresh products to get IDs
        p_lap = db.query(models.Product).filter_by(sku="SKU-LAP-001").first()
        p_key = db.query(models.Product).filter_by(sku="SKU-KEY-004").first()
        c_alice = db.query(models.Customer).filter_by(email="alice@example.com").first()

        # Seed an Order
        if p_lap and p_key and c_alice:
            # Alice buys 1 MacBook and 2 Keyboards
            # Total amount = 2499.99 + 2 * 129.99 = 2759.97
            # Reduce product stocks manually for seed
            p_lap.quantity -= 1
            p_key.quantity -= 2
            
            order = models.Order(
                customer_id=c_alice.id,
                total_amount=Decimal("2759.97")
            )
            db.add(order)
            db.flush()

            items = [
                models.OrderItem(order_id=order.id, product_id=p_lap.id, quantity=1, price_at_order=p_lap.price),
                models.OrderItem(order_id=order.id, product_id=p_key.id, quantity=2, price_at_order=p_key.price),
            ]
            db.add_all(items)
            db.commit()
            print("Database seeding completed.")
    db.close()


@app.get("/")
def read_root():
    return {"message": "Welcome to the Inventory & Order Management System API"}


@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection check failed: {str(e)}"
        )


# --- PRODUCTS API ---

@app.post("/products", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(database.get_db)):
    try:
        return crud.create_product(db, product)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@app.get("/products", response_model=List[schemas.ProductOut])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_products(db, skip=skip, limit=limit)

@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def read_product(product_id: int, db: Session = Depends(database.get_db)):
    db_product = crud.get_product(db, product_id)
    if not db_product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return db_product

@app.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(database.get_db)):
    try:
        updated_product = crud.update_product(db, product_id, product)
        if not updated_product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return updated_product
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@app.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_product(db, product_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return None


# --- CUSTOMERS API ---

@app.post("/customers", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(database.get_db)):
    try:
        return crud.create_customer(db, customer)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

@app.get("/customers", response_model=List[schemas.CustomerOut])
def read_customers(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return crud.get_customers(db, skip=skip, limit=limit)

@app.get("/customers/{customer_id}", response_model=schemas.CustomerOut)
def read_customer(customer_id: int, db: Session = Depends(database.get_db)):
    db_customer = crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return db_customer

@app.delete("/customers/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: int, db: Session = Depends(database.get_db)):
    success = crud.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return None


# --- ORDERS API ---

@app.post("/orders", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order: schemas.OrderCreate, db: Session = Depends(database.get_db)):
    try:
        db_order = crud.create_order(db, order)
        # Construct output
        return format_order_response(db_order)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@app.get("/orders", response_model=List[schemas.OrderOut])
def read_orders(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    orders = crud.get_orders(db, skip=skip, limit=limit)
    return [format_order_response(o) for o in orders]

@app.get("/orders/{order_id}", response_model=schemas.OrderOut)
def read_order(order_id: int, db: Session = Depends(database.get_db)):
    db_order = crud.get_order(db, order_id)
    if not db_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return format_order_response(db_order)

@app.delete("/orders/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_order(order_id: int, db: Session = Depends(database.get_db)):
    try:
        success = crud.delete_order(db, order_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return None
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# --- DASHBOARD SUMMARY API ---

@app.get("/dashboard/summary", response_model=schemas.DashboardSummary)
def read_dashboard_summary(db: Session = Depends(database.get_db)):
    return crud.get_dashboard_summary(db)


# Helper helper function to structure order responses correctly
def format_order_response(order: models.Order) -> dict:
    items_out = []
    for item in order.items:
        items_out.append({
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else "Deleted Product",
            "sku": item.product.sku if item.product else "N/A",
            "quantity": item.quantity,
            "price_at_order": item.price_at_order
        })
    
    return {
        "id": order.id,
        "customer_id": order.customer_id,
        "customer_name": order.customer.name if order.customer else "Deleted Customer",
        "total_amount": order.total_amount,
        "created_at": order.created_at,
        "items": items_out
    }
