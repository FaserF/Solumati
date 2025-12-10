import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.routers.chat import encrypt_message, decrypt_message

def test_encryption_correctness():
    original = "Hello World! Secret Message"
    encrypted = encrypt_message(original)

    assert encrypted != original
    assert "Hello" not in encrypted

    decrypted = decrypt_message(encrypted)
    assert decrypted == original
    print("Encryption/Decryption cycle: PASS")

if __name__ == "__main__":
    try:
        test_encryption_correctness()
        print("All crypto tests passed.")
    except Exception as e:
        print(f"Test FAILED: {e}")
        exit(1)
