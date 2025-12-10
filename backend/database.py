from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

# Get DB URL from Docker environment variable, default to local for dev
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://solumati:secure_dev_password@localhost:5432/solumatidb")
print(f"DEBUG: DATABASE_URL loaded in database.py: {DATABASE_URL}")


from sqlalchemy.pool import StaticPool
engine_args = {}
if DATABASE_URL.startswith("sqlite"):
    engine_args = {"connect_args": {"check_same_thread": False}}
    if ":memory:" in DATABASE_URL:
        engine_args["poolclass"] = StaticPool

engine = create_engine(DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for FastAPI to get a DB session per request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()