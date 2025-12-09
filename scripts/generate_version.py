import os
import datetime
import argparse
import re

def get_calver():
    now = datetime.datetime.now()
    return f"{now.year}.{now.month}"

def bump_version(current_version, is_prerelease=False):
    # Regex to parse version: YYYY.MM.PATCH(-beta.N)?
    # Example: 2025.12.0 or 2025.12.0-beta.1

    calver = get_calver()

    # Check if current version matches this month's calver
    # current_version might be "0.0.0" or "2024.11.5"

    base_version = current_version.split('-')[0] # Remove suffix

    new_base = base_version
    new_suffix = ""

    # 1. Determine Base Version (YYYY.MM.PATCH)
    if base_version.startswith(calver):
        # Same month, increment patch
        parts = base_version.split('.')
        patch = int(parts[2]) if len(parts) >= 3 else 0

        # If we are creating a prerelease, and we are coming from a STABLE version,
        # we usually want to bump patch for the NEXT release?
        # Or if we are already on a beta for this patch?

        # Scenario A: Current=2025.12.0 (Stable). New Prerelease -> 2025.12.1-beta.1
        # Scenario B: Current=2025.12.1-beta.1. New Prerelease -> 2025.12.1-beta.2
        # Scenario C: Current=2025.12.1-beta.2. New Stable -> 2025.12.1

        if is_prerelease:
            if '-' in current_version:
                # Already beta, keep base, increment suffix
                new_base = base_version
                beta_num = int(current_version.split('-beta.')[1])
                new_suffix = f"-beta.{beta_num + 1}"
            else:
                # Coming from stable, bump patch, start beta 1
                new_base = f"{calver}.{patch + 1}"
                new_suffix = "-beta.1"
        else:
            # New Stable
            if '-' in current_version:
                # Promoting beta to stable? Use base as is.
                # Current: 2025.12.1-beta.2 -> New: 2025.12.1
                new_base = base_version
                new_suffix = ""
            else:
                # Stable to Stable bump
                new_base = f"{calver}.{patch + 1}"
                new_suffix = ""
    else:
        # Different month, reset to YYYY.MM.0
        new_base = f"{calver}.0"
        if is_prerelease:
            new_suffix = "-beta.1"

    return f"{new_base}{new_suffix}"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", help="Current version", required=True)
    parser.add_argument("--prerelease", help="Is pre-release", action="store_true")
    args = parser.parse_args()
    print(bump_version(args.current, args.prerelease))
