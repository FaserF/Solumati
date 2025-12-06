#!/usr/bin/env python3
# wait_for_db.py
# Waits until the database TCP port is accepting connections.
# Logging and comments in English.

import os
import socket
import time
import sys

DB_HOST = os.getenv('DB_HOST', 'db')
DB_PORT = int(os.getenv('DB_PORT', os.getenv('DATABASE_PORT', '5432')))
RETRY_INTERVAL = 2

print(f"Waiting for database {DB_HOST}:{DB_PORT} to become available...")
start = time.time()
while True:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(3)
    try:
        sock.connect((DB_HOST, DB_PORT))
        sock.close()
        print("Database is available. Continuing start-up.")
        sys.exit(0)
    except Exception:
        sock.close()
        elapsed = int(time.time() - start)
        print(f"Database not ready yet (elapsed {elapsed}s). Retrying in {RETRY_INTERVAL}s...")
        time.sleep(RETRY_INTERVAL)
