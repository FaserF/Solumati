import os
import datetime
import argparse
import re

def get_calver():
    now = datetime.datetime.now()
    # Format: YYYY.MM
    return f"{now.year}.{now.month:02d}"

def bump_version(current_version, release_type="stable"):
    # Desired Format:
    # Stable: YYYY.MM.N (e.g., 2025.12.1)
    # Beta:   YYYY.MM.N-bM (e.g., 2025.12.1-b1)
    # Nightly: YYYY.MM.N-nM (e.g., 2025.12.1-n1)

    calver = get_calver()

    # Regex to match YYYY.MM.N[.suffixM]
    # Normalize input separators (. or -) to dots for parsing if needed,
    # but let's assume we want to output standard dots.
    # Parts:
    #   Group 1: YYYY
    #   Group 2: MM
    #   Group 3: N
    #   Group 4: .suffix (optional)
    #   Group 5: suffix letter (b or n)
    #   Group 6: suffix number

    # Accept inputs like 2025-12.1, 2025.12.1, 2025.12.1.b1, 2025.12.1-b1
    match = re.match(r"^(\d{4})[-\.](\d{2})[-\.](\d+)([-\.]?([bn])(\d+))?$", current_version)

    if match:
        year = match.group(1)
        month = match.group(2)
        current_calver_prefix = f"{year}.{month}"
        current_n = int(match.group(3))

        has_suffix = match.group(4) is not None
        current_suffix_type = match.group(5) if has_suffix else None
        current_suffix_num = int(match.group(6)) if has_suffix else 0

        if current_calver_prefix == calver:
            # Same Month
            if release_type == "stable":
                # Target: Stable
                if has_suffix:
                    # Promote prerelease to stable (drop suffix)
                    # 2025.12.1.b2 -> 2025.12.1
                    return f"{calver}.{current_n}"
                else:
                    # Stable to Stable (Bump N)
                    # 2025.12.1 -> 2025.12.2
                    return f"{calver}.{current_n + 1}"

            else: # beta or nightly
                target_suffix_char = 'b' if release_type == 'beta' else 'n'

                if has_suffix:
                    if current_suffix_type == target_suffix_char:
                        # Same suffix type, bump suffix number
                        # 2025.12.1-b1 (beta) -> 2025.12.1-b2
                        return f"{calver}.{current_n}-{target_suffix_char}{current_suffix_num + 1}"
                    else:
                        # Different suffix type.
                        # e.g. 2025.12.1-n5 (nightly) -> beta?
                        # Let's restart suffix at 1, keep N.
                        return f"{calver}.{current_n}-{target_suffix_char}1"
                else:
                    # Stable -> Prerelease
                    # 2025.12.1 -> 2025.12.2-b1 (Bump N, start suffix)
                    return f"{calver}.{current_n + 1}-{target_suffix_char}1"
        else:
            # New Month
            if release_type == "stable":
                return f"{calver}.1"
            else:
                target_suffix_char = 'b' if release_type == 'beta' else 'n'
                return f"{calver}.1-{target_suffix_char}1"
    else:
        # Fallback for unrecognizable version
        if release_type == "stable":
            return f"{calver}.1"
        else:
            target_suffix_char = 'b' if release_type == 'beta' else 'n'
            return f"{calver}.1-{target_suffix_char}1"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--current", help="Current version", required=True)
    # Replaced --prerelease with --type
    parser.add_argument("--type", help="Release type: stable, beta, nightly", default="stable", choices=["stable", "beta", "nightly"])
    # Backward compatibility helper (optional, or just remove)
    parser.add_argument("--prerelease", help="Deprecated: treat as beta", action="store_true")

    args = parser.parse_args()

    rtype = args.type
    if args.prerelease and rtype == "stable":
        rtype = "beta"

    print(bump_version(args.current, rtype))
