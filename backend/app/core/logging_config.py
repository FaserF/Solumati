# logging_config.py
# Configure logging: write structured messages to file, while filtering noisy progress-bar lines
# from winget-like output. Keep progress bars on console but not in logs. Detect download start/finish.

import logging
import os
import re
from logging import StreamHandler, FileHandler
from functools import lru_cache

LOG_FILE = os.getenv('LOG_FILE', 'app.log')
TEST_MODE = os.getenv('TEST_MODE', 'false').lower() in ('1', 'true', 'yes')

# A regex that matches progress-bar style lines that should only appear on terminal.
# This is language-agnostic: we look for repeated block characters and a size pattern like '1024 KB / 114 MB' or '9.00 MB / 114 MB'
_PROGRESS_LINE_RE = re.compile(r"^[\s]*[\u2588\u2592\u2593\u2591\#\-\=\s]{5,}.*\d+[\.,]?\d*\s*(?:KB|MB|GB)\s*/\s*\d+[\.,]?\d*\s*(?:KB|MB|GB)", re.UNICODE)

# A regex to detect a line that indicates a download URL or the start of a download.
_DOWNLOAD_START_RE = re.compile(r"download läuft|download starting|download:|download" , re.IGNORECASE)

# A simple state cache to remember active download URLs per logger name.
_active_downloads = {}

class ProgressFilter(logging.Filter):
    """Filter that removes terminal-only progress lines from non-console handlers.
    It also captures download start/finish events in a language-independent way.
    """
    def filter(self, record):
        msg = record.getMessage()
        # Console handler will not attach this filter; files will use it.
        if _PROGRESS_LINE_RE.match(msg):
            # Block this progress-bar line from file logs.
            return False
        # Detect download start by presence of URL-like pattern next to 'Download' keywords.
        if _DOWNLOAD_START_RE.search(msg) and 'http' in msg.lower():
            # record a concise download start message instead of verbose output
            # store the URL to mark completion later
            url_match = re.search(r"https?://\S+", msg, re.IGNORECASE)
            url = url_match.group(0) if url_match else None
            key = (record.name, url)
            _active_downloads[key] = True
            # replace message so file gets a single-line note
            record.msg = f"Download started: {url or '[unknown]'}"
            record.args = ()
            return True
        # Detect completion when we see a line that indicates full size reached or hash verified
        # We'll look for patterns like '114 MB / 114 MB' or 'Der Installer-Hash wurde erfolgreich überprüft' (German)
        if re.search(r"\d+[\.,]?\d*\s*(?:KB|MB|GB)\s*/\s*\d+[\.,]?\d*\s*(?:KB|MB|GB)", msg) and re.search(r"/", msg):
            # If current line indicates sizes equal (e.g. '114 MB / 114 MB') treat as finished when both numbers equal
            size_matches = re.findall(r"(\d+[\.,]?\d*)\s*(KB|MB|GB)", msg)
            if len(size_matches) >= 2 and size_matches[0][0] == size_matches[-1][0]:
                # mark finished for any active download for this logger
                keys_to_remove = [k for k in _active_downloads.keys() if k[0] == record.name]
                for k in keys_to_remove:
                    url = k[1]
                    # emit a concise finished message to file by mutating record
                    record.msg = f"Download finished: {url or '[unknown]'}"
                    record.args = ()
                    del _active_downloads[k]
                    return True
        # Detect hash verification or installer start lines in multiple languages to mark finish
        if re.search(r"hash.*(success|verified)|installer.*start|installer.*hash", msg, re.IGNORECASE):
            keys_to_remove = [k for k in _active_downloads.keys() if k[0] == record.name]
            for k in keys_to_remove:
                url = k[1]
                record.msg = f"Download finished: {url or '[unknown]'}"
                record.args = ()
                del _active_downloads[k]
                return True
        return True


def configure_logging():
    # Determine Log Level from Env (Default: INFO)
    log_level_str = os.getenv('LOG_LEVEL', 'INFO').upper()
    valid_levels = {'DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'}
    if log_level_str not in valid_levels:
        log_level_str = 'INFO'

    level = getattr(logging, log_level_str)

    # Root Logger
    logger = logging.getLogger()
    logger.setLevel(level)

    # Console handler: always show everything allowed by level
    ch = StreamHandler()
    ch.setLevel(level)
    ch_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    ch.setFormatter(ch_formatter)
    logger.addHandler(ch)

    # File handler: filter progress bar lines
    fh = FileHandler(LOG_FILE, encoding='utf-8')
    fh.setLevel(level)
    fh.addFilter(ProgressFilter())
    fh_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    fh.setFormatter(fh_formatter)
    logger.addHandler(fh)

    return logger

# When imported, configure logging once
logger = configure_logging()
