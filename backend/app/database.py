from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

# Create database engine (support SQLite and adapt standard postgresql URLs to use pg8000)
import ssl

db_url = settings.database_url
connect_args = {}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
elif db_url.startswith("postgresql://") or db_url.startswith("postgres://"):
    db_url = db_url.replace("postgresql://", "postgresql+pg8000://", 1)
    db_url = db_url.replace("postgres://", "postgresql+pg8000://", 1)
    
    # Strip query parameters (like sslmode) to avoid pg8000 connect() TypeError
    if "?" in db_url:
        db_url = db_url.split("?", 1)[0]
        
    # Enable SSL connection for non-local remote cloud databases (Neon, Prisma, etc.)
    if "localhost" not in db_url and "127.0.0.1" not in db_url and "db" not in db_url:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl_context"] = ssl_context

engine = create_engine(
    db_url, 
    connect_args=connect_args,
    pool_pre_ping=True,
    pool_recycle=300
)

# Setup session maker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declarative Base
Base = declarative_base()

# DB session dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
