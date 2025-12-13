import os
import json
import re
import ast
import glob

# Configuration
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_FILE = os.path.join(PROJECT_ROOT, 'repo_meta.json')

# Ignore patterns for directory traversal
IGNORE_DIRS = {
    '.git', '.github', '__pycache__', 'node_modules', 'venv', 'env',
    'build', 'dist', '.pytest_cache', '.idea', '.vscode', '.gemini'
}
IGNORE_FILES = {
    'repo_meta.json', 'project_context.json', 'package-lock.json', 'yarn.lock', '.DS_Store'
}
MAX_DEPTH = 3

def get_project_metadata():
    """Extracts project name and description from README.md"""
    readme_path = os.path.join(PROJECT_ROOT, 'README.md')
    metadata = {
        "name": "Unknown",
        "description": "No description available."
    }

    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            for line in lines:
                if line.startswith('# '):
                    metadata['name'] = line.strip('# ').strip()
                    break

            desc_lines = []
            capture = False
            for line in lines:
                if line.startswith('**Solumati**') or line.startswith('Solumati is'):
                    capture = True
                if capture:
                    if line.strip() == '' and desc_lines:
                        break
                    if line.strip():
                        desc_lines.append(line.strip())

            if desc_lines:
                metadata['description'] = ' '.join(desc_lines)

    return metadata

def get_tech_stack():
    """Identifies key technologies."""
    stack = {"frontend": [], "backend": [], "dev_ops": []}

    # Frontend
    pkg_json_path = os.path.join(PROJECT_ROOT, 'frontend', 'package.json')
    if os.path.exists(pkg_json_path):
        try:
            with open(pkg_json_path, 'r') as f:
                data = json.load(f)
                deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
                for dep, ver in deps.items():
                    if dep in ['react', 'vite', 'tailwindcss', 'lucide-react', 'react-router-dom']:
                        stack['frontend'].append(f"{dep} ({ver})")
        except: pass

    # Backend
    req_path = os.path.join(PROJECT_ROOT, 'backend', 'requirements.txt')
    if os.path.exists(req_path):
        with open(req_path, 'r') as f:
            for line in f:
                if any(x in line for x in ['fastapi', 'sqlalchemy', 'pydantic', 'pytest']):
                    stack['backend'].append(line.strip())

    # DevOps
    if os.path.exists(os.path.join(PROJECT_ROOT, 'docker-compose.yml')): stack['dev_ops'].append("Docker Compose")
    if os.path.exists(os.path.join(PROJECT_ROOT, '.github', 'workflows')): stack['dev_ops'].append("GitHub Actions")

    return stack

def extract_docstrings(file_path):
    """Extracts module-level docstrings from a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())
            return ast.get_docstring(tree)
    except:
        return None

def get_database_schema():
    """Parses models.py to extract table structure."""
    models_path = os.path.join(PROJECT_ROOT, 'backend', 'app', 'db', 'models.py')
    schema = {}

    if not os.path.exists(models_path):
        return schema

    try:
        with open(models_path, 'r', encoding='utf-8') as f:
            tree = ast.parse(f.read())

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # Check if it likely inherits from Base or similar (heuristic)
                is_model = any(b.id == 'Base' for b in node.bases if isinstance(b, ast.Name))
                if is_model:
                    fields = []
                    for item in node.body:
                        if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name):
                            # Mapped[int] type hint
                            type_hint = ast.unparse(item.annotation)
                            fields.append(f"{item.target.id}: {type_hint}")
                        elif isinstance(item, ast.Assign):
                            # Column definition (legacy style) or relationships
                            for target in item.targets:
                                if isinstance(target, ast.Name):
                                    val = ast.unparse(item.value)
                                    fields.append(f"{target.id} = {val}")

                    doc = ast.get_docstring(node)
                    schema[node.name] = {
                        "description": doc.strip() if doc else None,
                        "fields": fields
                    }
    except Exception as e:
        print(f"Error parsing models: {e}")

    return schema

def get_api_structure():
    """Parses routers to find endpoints."""
    routers_path = os.path.join(PROJECT_ROOT, 'backend', 'app', 'api', 'routers')
    api_map = {}

    if not os.path.exists(routers_path):
        return api_map

    for file in glob.glob(os.path.join(routers_path, "*.py")):
        basename = os.path.basename(file)
        if basename == "__init__.py": continue

        try:
            with open(file, 'r', encoding='utf-8') as f:
                tree = ast.parse(f.read())

            endpoints = []
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    # Look for decorators like @router.get("/path")
                    for dec in node.decorator_list:
                        if isinstance(dec, ast.Call):
                            func = dec.func
                            # Handle router.get or just get
                            if isinstance(func, ast.Attribute) and func.attr in ['get', 'post', 'put', 'delete', 'patch']:
                                method = func.attr.upper()
                                path = "unknown"
                                if dec.args and isinstance(dec.args[0], ast.Constant):
                                    path = dec.args[0].value

                                endpoints.append(f"{method} {path} ({node.name})")

            if endpoints:
                api_map[basename] = endpoints

        except Exception: pass

    return api_map

def get_file_summaries():
    """Get docstrings for key files."""
    summaries = {}
    key_files = [
        'backend/app/main.py',
        'backend/app/core/config.py',
        'backend/app/services/scheduler.py',
        'backend/app/services/utils.py'
    ]

    for rel_path in key_files:
        path = os.path.join(PROJECT_ROOT, rel_path)
        if os.path.exists(path):
            doc = extract_docstrings(path)
            if doc:
                summaries[rel_path] = doc.split('\n')[0] # First line only

    return summaries

def get_directory_structure(root_dir, depth=0):
    """Recursively maps the project structure."""
    if depth > MAX_DEPTH:
        return None

    structure = {}
    try:
        items = sorted(os.listdir(root_dir))
    except PermissionError:
        return None

    for item in items:
        if item in IGNORE_FILES or item in IGNORE_DIRS:
            continue

        item_path = os.path.join(root_dir, item)
        if os.path.isdir(item_path):
            children = get_directory_structure(item_path, depth + 1)
            structure[item + "/"] = children if children else {}
        else:
            structure[item] = None

    return structure

def main():
    print("Gathering repository metadata (Deep Scan)...")

    context = {
        "repository_info": get_project_metadata(),
        "technology_stack": get_tech_stack(),
        "architecture": {
            "database_schema": get_database_schema(),
            "api_routes": get_api_structure(),
            "key_modules": get_file_summaries()
        },
        "structure": get_directory_structure(PROJECT_ROOT),
        "generated_at": "Dynamic (Run `scripts/update_repo_meta.py` to update)"
    }

    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(context, f, indent=4)

    print(f"Deep Context written to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
