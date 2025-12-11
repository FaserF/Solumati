import json
import os
import sys
import re
from pathlib import Path

def load_keys(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    keys = set()
    def recurse(d, prefix=""):
        for k, v in d.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                recurse(v, full_key)
            else:
                keys.add(full_key)

    recurse(data)
    return keys

def is_valid_key(key):
    """Filter out obviously invalid keys."""
    # Keys should look like: word.word or word.word.word
    # Skip: URLs, full sentences, single chars, test strings
    if len(key) < 3:
        return False
    if ' ' in key:  # Real keys don't have spaces
        return False
    if key.startswith('http'):  # URLs
        return False
    if '/' in key:  # Paths
        return False
    if '.' not in key:  # Keys should have at least one dot
        return False
    if ':' in key or '?' in key or '!' in key:  # Punctuation = not a key
        return False
    return True

def scan_frontend_for_keys(frontend_dir):
    """Scan frontend JSX/JS files for t('key') calls and extract keys."""
    used_keys = set()
    # Match: t('key.name'), t("key.name"), t('key.name', 'fallback')
    pattern = re.compile(r"""t\(\s*['"]([^'"]+)['"]""")

    for file_path in Path(frontend_dir).rglob("*.jsx"):
        # Skip test files (check filename only)
        if '.test.' in file_path.name:
            continue
        try:
            content = file_path.read_text(encoding='utf-8')
            matches = pattern.findall(content)
            used_keys.update(k for k in matches if is_valid_key(k))
        except Exception as e:
            print(f"Warning: Could not read {file_path}: {e}")

    for file_path in Path(frontend_dir).rglob("*.js"):
        if "node_modules" in str(file_path):
            continue
        # Skip test files and config files (check filename only)
        if '.test.' in file_path.name:
            continue
        if file_path.name == 'config.js':  # Skip config files that define FALLBACK
            continue
        try:
            content = file_path.read_text(encoding='utf-8')
            matches = pattern.findall(content)
            used_keys.update(k for k in matches if is_valid_key(k))
        except Exception as e:
            print(f"Warning: Could not read {file_path}: {e}")

    return used_keys

def main():
    # Locate directories
    script_dir = os.path.dirname(__file__)
    i18n_dir = os.path.join(script_dir, '../app/services/i18n')
    frontend_dir = os.path.join(script_dir, '../../frontend/src')

    # 1. Load all translation files
    files = [f for f in os.listdir(i18n_dir) if f.endswith('.json')]

    if not files:
        print("No i18n files found.")
        sys.exit(1)

    print(f"Checking {len(files)} files: {files}")

    file_keys = {}
    all_keys = set()

    for f in files:
        path = os.path.join(i18n_dir, f)
        keys = load_keys(path)
        file_keys[f] = keys
        all_keys.update(keys)

    # 2. Check synchronization between translation files
    errors = False
    print("\n=== Translation File Sync ===")
    for f, keys in file_keys.items():
        missing = all_keys - keys
        if missing:
            print(f"[FAIL] {f} is missing {len(missing)} keys:")
            for k in sorted(missing):
                print(f"  - {k}")
            errors = True
        else:
            print(f"[OK] {f} has all keys.")

    # 3. Check frontend usage
    if os.path.exists(frontend_dir):
        print("\n=== Frontend Key Usage Check ===")
        used_keys = scan_frontend_for_keys(frontend_dir)
        print(f"Found {len(used_keys)} unique keys used in frontend.")

        # Find keys used in frontend but missing in translations
        missing_in_translations = used_keys - all_keys
        if missing_in_translations:
            print(f"[FAIL] {len(missing_in_translations)} keys used in frontend but missing in translations:")
            for k in sorted(missing_in_translations):
                print(f"  - {k}")
            errors = True
        else:
            print("[OK] All frontend keys have translations.")

        # Find unused keys (info only, not an error)
        unused_keys = all_keys - used_keys
        if unused_keys and len(unused_keys) < 50:  # Only show if reasonable number
            print(f"\n[INFO] {len(unused_keys)} keys in translations but not found in scanned frontend files.")
            # Don't print all - just summarize
    else:
        print(f"[WARN] Frontend directory not found at {frontend_dir}, skipping usage check.")

    if errors:
        sys.exit(1)
    else:
        print("\n[OK] All translation files are in sync and frontend keys are covered.")

if __name__ == "__main__":
    main()
