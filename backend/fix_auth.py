import os
import sys

# Try multiple paths
paths = [
    r'routers/auth.py',
    r'backend/routers/auth.py',
    r'c:\Users\fseitz\GitHub\Solumati\backend\routers\auth.py'
]

target_file = None
for p in paths:
    if os.path.exists(p):
        target_file = p
        break

if not target_file:
    print("Could not find auth.py")
    sys.exit(1)

print(f"Targeting: {target_file}")

with open(target_file, 'r', encoding='utf-8') as f:
    content = f.read()

target = "    user.webauthn_challenge = options.challenge.decode('utf-8') if isinstance(options.challenge, bytes) else options.challenge"
replacement = """    # Encode challenge to base64url for storage (DB expects string)
    if isinstance(options.challenge, bytes):
        user.webauthn_challenge = base64.urlsafe_b64encode(options.challenge).decode('utf-8').rstrip('=')
    else:
        user.webauthn_challenge = options.challenge"""

if target in content:
    new_content = content.replace(target, replacement)
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully replaced content.")
else:
    print("Target not found. Trying stricter search...")
    # Try without leading spaces
    target_stripped = target.strip()
    if target_stripped in content:
         # This is risky if indentation matters (python!), but let's check matches
         print("Found stripped version. Please verify indentation carefully.")
    else:
         print("Target NOT FOUND in file content.")
