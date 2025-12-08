import os
import datetime
import argparse

def get_calver():
    now = datetime.datetime.now()
    return f"{now.year}.{now.month}"

def bump_version(current_version):
    # Format: YYYY.MM.PATCH or YYYY.MM
    calver = get_calver()

    if current_version.startswith(calver):
        parts = current_version.split('.')
        if len(parts) >= 3:
            patch = int(parts[2]) + 1
            return f"{calver}.{patch}"
        else:
             return f"{calver}.1"
    else:
        return f"{calver}.0"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", help="Current version", required=True)
    args = parser.parse_args()
    print(bump_version(args.current))
