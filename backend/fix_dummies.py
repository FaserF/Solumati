from database import SessionLocal
from models import User
from init_data import generate_dummy_data
import logging

# Configure logging to show info
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SessionLocal()
try:
    print("Deleting old test users...")
    count = db.query(User).filter(User.role == 'test').delete()
    db.commit()
    print(f"Deleted {count} old test users.")

    print("Regenerating dummy users...")
    generate_dummy_data(db)
    print("Regeneration complete.")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
