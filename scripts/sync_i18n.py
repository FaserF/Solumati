import json
import os
import sys

# Configuration
I18N_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend', 'app', 'services', 'i18n')
BASE_LANG = 'en.json'
TARGET_LANGS = ['de.json']

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def sync_keys(source, target):
    """Recursively adds keys from source to target if missing."""
    changed = False
    for key, value in source.items():
        if key not in target:
            if isinstance(value, dict):
                target[key] = {}
                sync_keys(value, target[key])
            else:
                target[key] = f"__MISSING__ {value}" # Placeholder
            changed = True
        elif isinstance(value, dict) and isinstance(target[key], dict):
            if sync_keys(value, target[key]):
                changed = True
    return changed

def main():
    if not os.path.exists(I18N_DIR):
        print(f"I18n directory not found: {I18N_DIR}")
        sys.exit(1)

    base_path = os.path.join(I18N_DIR, BASE_LANG)
    if not os.path.exists(base_path):
         print(f"Base language file not found: {base_path}")
         sys.exit(1)

    base_data = load_json(base_path)
    print(f"Loaded base language: {BASE_LANG}")

    for lang in TARGET_LANGS:
        target_path = os.path.join(I18N_DIR, lang)
        if not os.path.exists(target_path):
            print(f"Target {lang} not found, creating from base...")
            save_json(target_path, base_data)
            continue

        target_data = load_json(target_path)
        if sync_keys(base_data, target_data):
            print(f"Fixed missing keys in {lang}")
            save_json(target_path, target_data)
        else:
            print(f"No changes needed for {lang}")

if __name__ == "__main__":
    main()
