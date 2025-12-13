import os
import re

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
README_PATH = os.path.join(PROJECT_ROOT, 'README.md')

IGNORE_DIRS = {'node_modules', 'venv', 'env', 'build', 'dist', '.git', '__pycache__'}

def count_lines_in_file(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for line in f if line.strip())
    except:
        return 0

def scan_directory(dir_path, extensions):
    files_count = 0
    lines_count = 0

    for root, dirs, files in os.walk(dir_path):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for file in files:
            if file.lower().endswith(tuple(extensions)):
                files_count += 1
                lines_count += count_lines_in_file(os.path.join(root, file))

    return files_count, lines_count

def main():
    print("Calculating project statistics...")

    # Frontend Stats (JS, JSX, CSS, HTML)
    fe_files, fe_lines = scan_directory(os.path.join(PROJECT_ROOT, 'frontend'), ('.js', '.jsx', '.css', '.html', '.ts', '.tsx'))

    # Backend Stats (Python)
    be_files, be_lines = scan_directory(os.path.join(PROJECT_ROOT, 'backend'), ('.py',))

    # Config/Other (JSON, YAML, TOML, MD)
    # We scan root but exclude frontend/backend specific folders to avoid double counting if we were global,
    # but here we just want general config files
    cfg_files = 0
    cfg_lines = 0

    for root, dirs, files in os.walk(PROJECT_ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS and d not in ['frontend', 'backend']]
        for file in files:
             if file.lower().endswith(('.json', '.yml', '.yaml', '.toml', '.md', '.sh')):
                cfg_files += 1
                cfg_lines += count_lines_in_file(os.path.join(root, file))

    total_files = fe_files + be_files + cfg_files
    total_lines = fe_lines + be_lines + cfg_lines

    print(f"Frontend: {fe_files} files, {fe_lines} lines")
    print(f"Backend: {be_files} files, {be_lines} lines")
    print(f"Total: {total_files} files, {total_lines} lines")

    stats_md = f"""
| Category | Files | Lines of Code |
| :--- | :---: | :---: |
| **Frontend** | {fe_files} | {fe_lines} |
| **Backend** | {be_files} | {be_lines} |
| **Config & Docs** | {cfg_files} | {cfg_lines} |
| **Total** | **{total_files}** | **{total_lines}** |
"""

    if os.path.exists(README_PATH):
        with open(README_PATH, 'r', encoding='utf-8') as f:
            content = f.read()

        pattern = re.compile(r'<!-- STATS_START -->.*<!-- STATS_END -->', re.DOTALL)
        if pattern.search(content):
            new_content = pattern.sub(f'<!-- STATS_START -->{stats_md}<!-- STATS_END -->', content)

            with open(README_PATH, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print("README.md updated successfully.")
        else:
            print("Error: Stats markers not found in README.md")
    else:
        print("Error: README.md not found.")

if __name__ == "__main__":
    main()
