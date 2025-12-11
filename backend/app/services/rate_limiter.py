"""
Rate limiter for tracking failed login attempts per IP.
Uses in-memory storage with automatic cleanup.
"""
import time
import threading
from typing import Dict, Tuple
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class AttemptRecord:
    count: int = 0
    first_attempt: float = 0
    last_attempt: float = 0
    locked_until: float = 0


class RateLimiter:
    """Thread-safe rate limiter for login attempts."""

    def __init__(self):
        self._attempts: Dict[str, AttemptRecord] = {}
        self._lock = threading.Lock()
        self._cleanup_interval = 300  # Cleanup every 5 minutes
        self._last_cleanup = time.time()

    def _cleanup_old_entries(self, max_age: int = 3600):
        """Remove entries older than max_age seconds."""
        now = time.time()
        if now - self._last_cleanup < self._cleanup_interval:
            return

        with self._lock:
            expired_ips = [
                ip for ip, record in self._attempts.items()
                if now - record.last_attempt > max_age
            ]
            for ip in expired_ips:
                del self._attempts[ip]
            self._last_cleanup = now
            if expired_ips:
                logger.debug(f"Rate limiter cleanup: removed {len(expired_ips)} old entries")

    def record_failed_attempt(self, ip: str) -> int:
        """
        Record a failed login attempt for an IP.
        Returns the new attempt count.
        """
        self._cleanup_old_entries()
        now = time.time()

        with self._lock:
            if ip not in self._attempts:
                self._attempts[ip] = AttemptRecord(
                    count=1,
                    first_attempt=now,
                    last_attempt=now
                )
            else:
                record = self._attempts[ip]
                record.count += 1
                record.last_attempt = now

            logger.info(f"Failed login attempt from {ip}: count={self._attempts[ip].count}")
            return self._attempts[ip].count

    def check_rate_limit(self, ip: str, threshold: int = 5, lockout_minutes: int = 10) -> Tuple[bool, int, int]:
        """
        Check if an IP is rate limited.

        Returns:
            (is_blocked, attempt_count, seconds_remaining)
        """
        self._cleanup_old_entries()
        now = time.time()

        with self._lock:
            if ip not in self._attempts:
                return (False, 0, 0)

            record = self._attempts[ip]

            # Check if currently locked
            if record.locked_until > now:
                remaining = int(record.locked_until - now)
                return (True, record.count, remaining)

            # Check if should be locked (after threshold)
            if record.count >= threshold:
                # Lock the IP
                record.locked_until = now + (lockout_minutes * 60)
                remaining = lockout_minutes * 60
                logger.warning(f"IP {ip} locked for {lockout_minutes} minutes after {record.count} failed attempts")
                return (True, record.count, remaining)

            return (False, record.count, 0)

    def clear_attempts(self, ip: str):
        """Clear failed attempts for an IP (on successful login)."""
        with self._lock:
            if ip in self._attempts:
                del self._attempts[ip]
                logger.debug(f"Cleared rate limit for IP {ip}")

    def get_attempt_count(self, ip: str) -> int:
        """Get current attempt count for an IP."""
        with self._lock:
            if ip in self._attempts:
                return self._attempts[ip].count
            return 0


# Global rate limiter instance
rate_limiter = RateLimiter()
