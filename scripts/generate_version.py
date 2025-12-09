import os
import datetime
import argparse
import re

def get_calver():
    now = datetime.datetime.now()
    # Format: YYYY-MM
    return f"{now.year}-{now.month:02d}"

def bump_version(current_version, is_prerelease=False):
    # Desired Format:
    # Stable: YYYY-MM.N (e.g., 2025-12.1)
    # Beta:   YYYY-MM.N-bM (e.g., 2025-12.1-b1)

    calver = get_calver()

    # regex to match YYYY-MM.N(-bM)? or YYYY.MM.N(-bM)?
    # Parts:
    #   Group 1: YYYY (Year)
    #   Group 2: MM (Month)
    #   Group 3: N (Release Num)
    #   Group 4: -bM (Suffix, optional)
    #   Group 5: M (Beta Num, optional)
    match = re.match(r"^(\d{4})[-\.](\d{2})\.(\d+)(-b(\d+))?$", current_version)

    if match:
        year = match.group(1)
        month = match.group(2)
        current_calver_prefix = f"{year}-{month}" # Normalize to YYYY-MM
        current_n = int(match.group(3))
        has_suffix = match.group(4) is not None
        current_beta_num = int(match.group(5)) if match.group(5) else 0

        if current_calver_prefix == calver:
            # Same Month
            if is_prerelease:
                if has_suffix:
                    # Already beta, bump beta number
                    # 2025-12.1-b1 -> 2025-12.1-b2
                    return f"{calver}.{current_n}-b{current_beta_num + 1}"
                else:
                    # Stable -> Beta (Next Release Number)
                    # 2025-12.1 -> 2025-12.2-b1
                    return f"{calver}.{current_n + 1}-b1"
            else:
                # Target: Stable
                if has_suffix:
                    # Promote beta to stable
                    # 2025-12.1-b2 -> 2025-12.1
                    return f"{calver}.{current_n}"
                else:
                    # Stable -> Beta -> Stable skipped? Or just next stable?
                    # Generally if we just run release on stable, we bump N.
                    # 2025-12.1 -> 2025-12.2
                    return f"{calver}.{current_n + 1}"
        else:
            # New Month
            # Reset N to 1
            if is_prerelease:
                return f"{calver}.1-b1"
            else:
                return f"{calver}.1"
    else:
        # Version doesn't match new scheme (possibly old scheme like 2024.11.0)
        # We enforce new scheme starting now.
        if is_prerelease:
            return f"{calver}.1-b1"
        else:
            return f"{calver}.1"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", help="Current version", required=True)
    parser.add_argument("--prerelease", help="Is pre-release", action="store_true")
    args = parser.parse_args()
    print(bump_version(args.current, args.prerelease))
