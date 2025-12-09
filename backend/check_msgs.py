from database import SessionLocal
from models import Message, User

db = SessionLocal()
try:
    count = db.query(Message).count()
    print(f"Total messages in DB: {count}")

    msgs = db.query(Message).order_by(Message.timestamp.desc()).limit(5).all()
    for m in msgs:
        print(f"ID: {m.id}, Sender: {m.sender_id}, Receiver: {m.receiver_id}, Time: {m.timestamp}")

    print("\nUsers:")
    users = db.query(User).all()
    for u in users:
        print(f"ID: {u.id}, Role: {u.role}, Guest: {u.is_guest}, Username: {u.username}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
