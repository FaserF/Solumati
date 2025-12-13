#!/usr/bin/env python3
"""
Update GitHub Release with beautiful download buttons and build status badges.
This script adds graphical buttons for APK, MSIX, IPA, and Docker downloads.
"""

import os
import sys
import json
import re
from datetime import datetime
from github import Github
from typing import Dict, List, Optional, Tuple

# GitHub token
GITHUB_TOKEN = os.environ.get('GITHUB_TOKEN')
if not GITHUB_TOKEN:
    print("❌ GITHUB_TOKEN environment variable is required")
    sys.exit(1)

# Repository and tag
REPO_NAME = os.environ.get('GITHUB_REPOSITORY')
TAG_NAME = os.environ.get('TAG_NAME') or os.environ.get('GITHUB_REF', '').replace('refs/tags/', '')
BUILD_STATUS = os.environ.get('BUILD_STATUS', 'running')  # running, success, failure, cancelled

if not REPO_NAME or not TAG_NAME:
    print("❌ GITHUB_REPOSITORY and TAG_NAME are required")
    sys.exit(1)

# Initialize GitHub client
gh = Github(GITHUB_TOKEN)
repo = gh.get_repo(REPO_NAME)

# Get release
try:
    release = repo.get_release(TAG_NAME)
except Exception as e:
    print(f"❌ Error getting release {TAG_NAME}: {e}")
    sys.exit(1)

# Get release assets
assets = release.assets
asset_info = {
    'apk': None,
    'aab': None,
    'msix': None,
    'msixbundle': None,
    'ipa': None,
    'docker': None
}

for asset in assets:
    name_lower = asset.name.lower()
    if name_lower.endswith('.apk'):
        asset_info['apk'] = asset
    elif name_lower.endswith('.aab'):
        asset_info['aab'] = asset
    elif name_lower.endswith('.msix'):
        asset_info['msix'] = asset
    elif name_lower.endswith('.msixbundle'):
        asset_info['msixbundle'] = asset
    elif name_lower.endswith('.ipa'):
        asset_info['ipa'] = asset
    elif 'docker' in name_lower or 'image' in name_lower:
        asset_info['docker'] = asset

# Check for Docker images in GHCR (they're not assets but can be linked)
# Try to get Docker image info from release body or construct from repo name
docker_image_url = None
try:
    # Construct GHCR URL for Docker images
    repo_parts = REPO_NAME.split('/')
    if len(repo_parts) == 2:
        org, repo_name = repo_parts
        docker_image_url = f"https://github.com/{org}/{repo_name}/pkgs/container/{repo_name.lower()}"
        # Create a pseudo-asset object for Docker
        class DockerAsset:
            def __init__(self, url):
                self.browser_download_url = url
                self.size = 0
                self.name = "Docker Image"

        # Only set if no Docker asset was found
        if not asset_info['docker']:
            asset_info['docker'] = DockerAsset(docker_image_url)
except Exception:
    pass

# Status badge colors and text
STATUS_CONFIG = {
    'success': {'color': '4caf50', 'text': '✅ Ready', 'emoji': '✅'},
    'running': {'color': '2196f3', 'text': '⏳ Building', 'emoji': '⏳'},
    'failure': {'color': 'f44336', 'text': '❌ Failed', 'emoji': '❌'},
    'cancelled': {'color': 'ff9800', 'text': '⚠️ Cancelled', 'emoji': '⚠️'}
}

status_config = STATUS_CONFIG.get(BUILD_STATUS.lower(), STATUS_CONFIG['running'])

# Generate download buttons HTML
def generate_button(asset, label, icon, platform, build_status='running'):
    if not asset:
        # Check if build failed for this platform
        if build_status == 'failure':
            status_text = '❌ Failed'
            status_color = '#f44336'
        elif build_status == 'cancelled':
            status_text = '⚠️ Cancelled'
            status_color = '#ff9800'
        else:
            status_text = status_config['text']
            status_color = f'#{status_config["color"]}'

        return f'''
<div style="display: inline-block; margin: 8px;">
  <div style="background: #e0e0e0; color: #757575; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; cursor: not-allowed; opacity: 0.6;">
    <span style="font-size: 1.2em;">{icon}</span>
    <span>{label}</span>
    <span style="font-size: 0.85em; opacity: 0.7; color: {status_color};">({status_text})</span>
  </div>
</div>'''

    # Handle Docker images (may not have size)
    if hasattr(asset, 'size') and asset.size > 0:
        size_mb = asset.size / (1024 * 1024)
        size_text = f"({size_mb:.1f} MB)"
    else:
        size_text = ""

    return f'''
<div style="display: inline-block; margin: 8px;">
  <a href="{asset.browser_download_url}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)';">
    <span style="font-size: 1.2em;">{icon}</span>
    <span>{label}</span>
    {f'<span style="font-size: 0.85em; opacity: 0.9;">{size_text}</span>' if size_text else ''}
  </a>
</div>'''

# Build status badge
status_badge = f'''
<div style="display: inline-block; margin: 8px;">
  <div style="background: #{status_config['color']}; color: white; padding: 8px 16px; border-radius: 6px; font-weight: 600; font-size: 0.9em;">
    {status_config['emoji']} Build Status: {status_config['text']}
  </div>
</div>
'''

# Generate buttons section
buttons_html = f'''
## 📥 Downloads

<div style="background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 24px; border-radius: 12px; margin: 24px 0;">
  <div style="margin-bottom: 16px;">
    {status_badge}
  </div>
  <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
    {generate_button(asset_info['apk'] or asset_info['aab'], 'Android APK', '🤖', 'android', BUILD_STATUS)}
    {generate_button(asset_info['msixbundle'] or asset_info['msix'], 'Windows MSIX', '🪟', 'windows', BUILD_STATUS)}
    {generate_button(asset_info['ipa'], 'iOS IPA', '🍎', 'ios', BUILD_STATUS)}
    {generate_button(asset_info['docker'], 'Docker Image', '🐳', 'docker', BUILD_STATUS)}
  </div>
  <div style="margin-top: 16px; font-size: 0.9em; color: #666;">
    <p><strong>Last updated:</strong> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC</p>
    <p><em>Build artifacts are automatically uploaded as they become available.</em></p>
  </div>
</div>
'''

# Get current release body
current_body = release.body or ''

# Remove existing download section if present
pattern = r'## 📥 Downloads.*?(?=## |$)'
current_body = re.sub(pattern, '', current_body, flags=re.DOTALL)

# Add new download section at the beginning (after title if exists)
if current_body.strip():
    # Find first heading or add at start
    if current_body.startswith('#'):
        # Insert after first line
        lines = current_body.split('\n', 1)
        new_body = lines[0] + '\n\n' + buttons_html + '\n\n' + (lines[1] if len(lines) > 1 else '')
    else:
        new_body = buttons_html + '\n\n' + current_body
else:
    new_body = buttons_html

# Update release
try:
    release.update_release(
        name=release.title,
        message=new_body,
        draft=release.draft,
        prerelease=release.prerelease
    )
    print(f"✅ Successfully updated release {TAG_NAME} with download buttons")
    print(f"   Status: {status_config['text']}")
    print(f"   Assets found: {sum(1 for a in asset_info.values() if a)}")
except Exception as e:
    print(f"❌ Error updating release: {e}")
    sys.exit(1)
