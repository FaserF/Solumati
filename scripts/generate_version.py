import os
import datetime
import argparse
import re

def get_calver_parts():
    now = datetime.datetime.now()
    return now.year, now.month

def bump_version(current_version, release_type="stable"):
    # Home Assistant / CalVer Strategy
    # Stable:  YYYY.M.P       (e.g. 2025.12.0)
    # Beta:    YYYY.M.PbN     (e.g. 2025.12.0b1)
    # Nightly: YYYY.M.PaN     (e.g. 2025.12.0a1) - "Alpha"
    # Dev:     YYYY.M.P.devN  (e.g. 2025.12.0.dev1)

    # Note: HA uses single month digits for 1-9 (e.g. 2025.1.0 not 2025.01.0)

    year, month = get_calver_parts()
    calver_major_minor = f"{year}.{month}" # e.g. "2025.12"

    # Regex to parse current version
    # Groups:
    # 1: YYYY
    # 2: M (1 or 2 digits)
    # 3: P (Patch)
    # 4: Suffix (entire string e.g. "b1", "a1", ".dev1")
    # 5: Suffix Char (b, a, .dev)
    # 6: Suffix Number
    pattern = r"^(\d{4})\.(\d{1,2})\.(\d+)(?:([ab]|\.dev)(\d+))?$"
    match = re.match(pattern, current_version)

    if match:
        curr_year = int(match.group(1))
        curr_month = int(match.group(2))
        curr_patch = int(match.group(3))

        has_suffix = match.group(4) is not None
        curr_suffix_type = match.group(4) if has_suffix else None
        curr_suffix_num = int(match.group(5)) if has_suffix else 0

        # Check if we are in a new month
        if f"{curr_year}.{curr_month}" != calver_major_minor:
            # New Month Start
            # Default new versions
            if release_type == "stable":
                return f"{calver_major_minor}.0"
            elif release_type == "beta":
                return f"{calver_major_minor}.0b0"
            elif release_type == "nightly":
                return f"{calver_major_minor}.0a0"
            elif release_type == "dev":
                return f"{calver_major_minor}.0.dev0"

        # Same Month - Bump based on rules
        if release_type == "stable":
            if has_suffix:
                if curr_suffix_type == ".dev":
                    # Promoting dev to stable usually means bumping patch?
                    # Actually, if we are on 2025.12.0.dev, the stable is 2025.12.0
                    return f"{curr_year}.{curr_month}.{curr_patch}"
                # Promoting beta/alpha to stable -> Drop suffix
                # 2025.12.0b1 -> 2025.12.0
                return f"{curr_year}.{curr_month}.{curr_patch}"
            else:
                # Stable to Stable -> Bump Patch
                return f"{curr_year}.{curr_month}.{curr_patch + 1}"

        elif release_type == "beta":
            target_suffix = "b"
            if has_suffix:
                if curr_suffix_type == "b":
                    # b1 -> b2
                    return f"{curr_year}.{curr_month}.{curr_patch}b{curr_suffix_num + 1}"
                elif curr_suffix_type == "a":
                    # a1 -> b0 (promote alpha to beta)
                    return f"{curr_year}.{curr_month}.{curr_patch}b0"
                elif curr_suffix_type == ".dev":
                     # dev -> beta (start beta)
                    return f"{curr_year}.{curr_month}.{curr_patch}b0"
            else:
                # Stable -> Beta (Bump patch and start beta)
                return f"{curr_year}.{curr_month}.{curr_patch + 1}b0"

        elif release_type == "nightly":
            target_suffix = "a"
            if has_suffix:
                if curr_suffix_type == "a":
                    # a1 -> a2
                    return f"{curr_year}.{curr_month}.{curr_patch}a{curr_suffix_num + 1}"
                elif curr_suffix_type == ".dev":
                    return f"{curr_year}.{curr_month}.{curr_patch}a0"
            else:
                 # Stable -> Nightly (Bump patch and start alpha)
                return f"{curr_year}.{curr_month}.{curr_patch + 1}a0"

        elif release_type == "dev":
            target_suffix = ".dev"
            if has_suffix:
                if curr_suffix_type == ".dev":
                    return f"{curr_year}.{curr_month}.{curr_patch}.dev{curr_suffix_num + 1}"
            else:
                 # Stable -> Dev (Bump patch and start dev)
                return f"{curr_year}.{curr_month}.{curr_patch + 1}.dev0"

    # Fallback / Initial
    if release_type == "stable":
        return f"{calver_major_minor}.0"
    elif release_type == "beta":
        return f"{calver_major_minor}.0b0"
    elif release_type == "nightly":
        return f"{calver_major_minor}.0a0"
    elif release_type == "dev":
        return f"{calver_major_minor}.0.dev0"

    return f"{calver_major_minor}.0"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", help="Current version", required=True)
    parser.add_argument("--type", help="Release type", default="stable", choices=["stable", "beta", "nightly", "dev"])
    args = parser.parse_args()

    print(bump_version(args.current, args.type))
