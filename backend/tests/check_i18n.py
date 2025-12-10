import json
import os
import sys

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

    # Actually, the current format is flat keys like "app.title" but also nested "questions": {...}
    # My recursive function above flattens everything.
    # Let's check how the frontend uses it. t('app.title')
    # If I have {"a": {"b": "c"}}, key is "a.b".
    # If de.json has "a.b" and en.json has "a.b", we are good.
    # What if de.json has "a": {"b": "c"} and en.json has "a.b": "c"?
    # The frontend supports both via key splitting.
    # ideally we stick to one format. The current files seem to be a mix but mostly flat keys at top level, except "questions" and "cookie".
    # Let's stick to checking leaf keys existence.

    recurse(data)
    return keys

def main():
    i18n_dir = os.path.join(os.path.dirname(__file__), '../app/services/i18n')
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

    errors = False
    for f, keys in file_keys.items():
        missing = all_keys - keys
        if missing:
            print(f"❌ {f} is missing {len(missing)} keys:")
            for k in sorted(missing):
                print(f"  - {k}")
            errors = True
        else:
            print(f"✅ {f} has all keys.")

    if errors:
        sys.exit(1)
    else:
        print("All translation files are in sync.")

if __name__ == "__main__":
    main()
