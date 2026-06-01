from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas
from decimal import Decimal
from typing import List, Optional

# --- Product CRUD ---

def get_product(db: Session, product_id: int) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str) -> Optional[models.Product]:
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100) -> List[models.Product]:
    return db.query(models.Product).order_by(models.Product.id.asc()).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate) -> models.Product:
    # Business Rule: Unique SKU
    existing = get_product_by_sku(db, product.sku)
    if existing:
        raise ValueError(f"Product SKU/code '{product.sku}' must be unique")

    db_product = models.Product(
        name=product.name,
        sku=product.sku,
        price=product.price,
        quantity=product.quantity
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def update_product(db: Session, product_id: int, product_data: schemas.ProductUpdate) -> Optional[models.Product]:
    db_product = get_product(db, product_id)
    if not db_product:
        return None

    update_dict = product_data.model_dump(exclude_unset=True)

    # Business Rule: Unique SKU on update
    if "sku" in update_dict:
        existing = db.query(models.Product).filter(models.Product.sku == update_dict["sku"], models.Product.id != product_id).first()
        if existing:
            raise ValueError(f"Product SKU/code '{update_dict['sku']}' is already in use by another product")

    for key, value in update_dict.items():
        setattr(db_product, key, value)

    db.commit()
    db.refresh(db_product)
    return db_product

def delete_product(db: Session, product_id: int) -> bool:
    db_product = get_product(db, product_id)
    if not db_product:
        return False
    db.delete(db_product)
    db.commit()
    return True


# --- Customer CRUD ---

def get_customer(db: Session, customer_id: int) -> Optional[models.Customer]:
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str) -> Optional[models.Customer]:
    return db.query(models.Customer).filter(models.Customer.email == email.lower()).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100) -> List[models.Customer]:
    return db.query(models.Customer).order_by(models.Customer.id.asc()).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate) -> models.Customer:
    # Business Rule: Unique Customer Email
    existing = get_customer_by_email(db, customer.email)
    if existing:
        raise ValueError(f"Customer email '{customer.email}' must be unique")

    db_customer = models.Customer(
        name=customer.name,
        email=customer.email.lower(),
        phone=customer.phone
    )
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def delete_customer(db: Session, customer_id: int) -> bool:
    db_customer = get_customer(db, customer_id)
    if not db_customer:
        return False
    db.delete(db_customer)
    db.commit()
    return True


# --- Order CRUD ---

def get_order(db: Session, order_id: int) -> Optional[models.Order]:
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100) -> List[models.Order]:
    return db.query(models.Order).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order: schemas.OrderCreate) -> models.Order:
    # Start a transaction to ensure atomic rollback if anything goes wrong
    # (e.g. inventory goes negative mid-way)
    db.begin_nested() # Create nested transaction/savepoint

    try:
        # Check customer existence
        customer = get_customer(db, order.customer_id)
        if not customer:
            raise ValueError(f"Customer with ID {order.customer_id} does not exist")

        total_amount = Decimal("0.00")
        order_items_to_create = []

        for item in order.items:
            # Get product
            product = get_product(db, item.product_id)
            if not product:
                raise ValueError(f"Product with ID {item.product_id} does not exist")

            # Business Rule: Orders cannot be placed if inventory is insufficient
            if product.quantity < item.quantity:
                raise ValueError(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.quantity}, Requested: {item.quantity}"
                )

            # Business Rule: Creating an order must automatically reduce available stock
            product.quantity -= item.quantity

            # Calculate price
            item_price = product.price
            total_amount += item_price * item.quantity

            # Create Order Item object
            db_item = models.OrderItem(
                product_id=product.id,
                quantity=item.quantity,
                price_at_order=item_price
            )
            order_items_to_create.append(db_item)

        # Create Order (Total amount automatically calculated)
        db_order = models.Order(
            customer_id=order.customer_id,
            total_amount=total_amount
        )
        db.add(db_order)
        db.flush() # Populates db_order.id

        # Associate items with order and add them
        for db_item in order_items_to_create:
            db_item.order_id = db_order.id
            db.add(db_item)

        db.commit() # Commit the transaction
        db.refresh(db_order)
        return db_order

    except Exception as e:
        db.rollback() # Rollback changes to restore stock
        raise e

def delete_order(db: Session, order_id: int) -> bool:
    db_order = get_order(db, order_id)
    if not db_order:
        return False

    db.begin_nested()
    try:
        # Business Logic: Restore stock on order cancellation/deletion
        for item in db_order.items:
            if item.product:
                item.product.quantity += item.quantity

        db.delete(db_order)
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        raise e


# --- Dashboard Summary ---

def get_dashboard_summary(db: Session) -> dict:
    total_products = db.query(func.count(models.Product.id)).scalar() or 0
    total_customers = db.query(func.count(models.Customer.id)).scalar() or 0
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0

    # Low stock: product quantity < 10
    low_stock_products = db.query(models.Product).filter(models.Product.quantity < 10).order_by(models.Product.quantity.asc()).all()
    low_stock_count = len(low_stock_products)

    total_sales = db.query(func.sum(models.Order.total_amount)).scalar() or Decimal("0.00")

    return {
        "total_products": total_products,
        "total_customers": total_customers,
        "total_orders": total_orders,
        "low_stock_count": low_stock_count,
        "low_stock_products": low_stock_products,
        "total_sales": total_sales
    }
