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
    # Beta:    YYYY.M.PbN     (e.g. 2025.12.0b1) or YYYY.M.P-bN (NPM style)
    # Nightly: YYYY.M.PaN     (e.g. 2025.12.0a1) - "Alpha"
    # Dev:     YYYY.M.P.devN  (e.g. 2025.12.0.dev1) or YYYY.M.P-devN

    # Note: HA uses single month digits for 1-9 (e.g. 2025.1.0 not 2025.01.0)

    year, month = get_calver_parts()
    calver_major_minor = f"{year}.{month}" # e.g. "2025.12"

    # Regex to parse current version
    # Supports multiple formats:
    #   - 2025.12.2b6 (no separator)
    #   - 2025.12.2-b6 (hyphen separator, NPM SemVer style)
    #   - 2025.12.2.dev6 (dot separator for dev)
    #   - 2025.12.2-dev6 (hyphen separator for dev)
    # Groups:
    # 1: YYYY
    # 2: M (1 or 2 digits)
    # 3: P (Patch)
    # 4: Suffix type (a, b) - optional
    # 5: Suffix type (dev) - optional
    # 6: Suffix Number - optional
    pattern = r"^(\d{4})\.(\d{1,2})\.(\d+)(?:[-.]?([ab])(\d+)|[.-](dev)(\d+))?$"
    match = re.match(pattern, current_version)

    if match:
        curr_year = int(match.group(1))
        curr_month = int(match.group(2))
        curr_patch = int(match.group(3))

        # Determine suffix type
        suffix_ab = match.group(4)  # 'a' or 'b' or None
        suffix_ab_num = match.group(5)  # digit string or None
        suffix_dev = match.group(6)  # 'dev' or None
        suffix_dev_num = match.group(7)  # digit string or None

        if suffix_ab:
            has_suffix = True
            curr_suffix_type = suffix_ab  # 'a' or 'b'
            curr_suffix_num = int(suffix_ab_num) if suffix_ab_num else 0
        elif suffix_dev:
            has_suffix = True
            curr_suffix_type = ".dev"
            curr_suffix_num = int(suffix_dev_num) if suffix_dev_num else 0
        else:
            has_suffix = False
            curr_suffix_type = None
            curr_suffix_num = 0

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
            if has_suffix:
                if curr_suffix_type == "a":
                    # a1 -> a2
                    return f"{curr_year}.{curr_month}.{curr_patch}a{curr_suffix_num + 1}"
                elif curr_suffix_type == ".dev":
                    return f"{curr_year}.{curr_month}.{curr_patch}a0"
                elif curr_suffix_type == "b":
                    # beta -> nightly (bump patch, start alpha)
                    return f"{curr_year}.{curr_month}.{curr_patch + 1}a0"
            else:
                 # Stable -> Nightly (Bump patch and start alpha)
                return f"{curr_year}.{curr_month}.{curr_patch + 1}a0"

        elif release_type == "dev":
            if has_suffix:
                if curr_suffix_type == ".dev":
                    return f"{curr_year}.{curr_month}.{curr_patch}.dev{curr_suffix_num + 1}"
                elif curr_suffix_type == "b":
                    # beta -> dev (bump patch, start dev)
                    return f"{curr_year}.{curr_month}.{curr_patch + 1}.dev0"
                elif curr_suffix_type == "a":
                    # nightly -> dev (bump patch, start dev)
                    return f"{curr_year}.{curr_month}.{curr_patch + 1}.dev0"
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
