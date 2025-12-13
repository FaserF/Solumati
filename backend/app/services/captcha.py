"""
CAPTCHA verification service supporting multiple providers:
- Cloudflare Turnstile
- Google reCAPTCHA (v2/v3)
- hCaptcha
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Provider verification URLs
VERIFY_URLS = {
    "cloudflare": "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    "google": "https://www.google.com/recaptcha/api/siteverify",
    "hcaptcha": "https://hcaptcha.com/siteverify",
}


async def verify_captcha_async(
    token: str, provider: str, secret_key: str, remote_ip: Optional[str] = None
) -> bool:
    """
    Verify a CAPTCHA token with the specified provider (async version).

    Args:
        token: The CAPTCHA response token from the client
        provider: The CAPTCHA provider (cloudflare, google, hcaptcha)
        secret_key: The secret key for the provider
        remote_ip: Optional remote IP address for verification

    Returns:
        True if verification succeeded, False otherwise
    """
    if not token or not secret_key:
        logger.warning("CAPTCHA verification failed: missing token or secret")
        return False

    provider = provider.lower()
    if provider not in VERIFY_URLS:
        logger.error(f"Unknown CAPTCHA provider: {provider}")
        return False

    url = VERIFY_URLS[provider]

    # Build request data based on provider
    data = {"secret": secret_key, "response": token}

    # Add remote IP if provided (optional for most providers)
    if remote_ip:
        if provider == "cloudflare":
            data["remoteip"] = remote_ip
        elif provider == "google":
            data["remoteip"] = remote_ip
        elif provider == "hcaptcha":
            data["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data, timeout=10.0)
            result = response.json()

            success = result.get("success", False)

            if not success:
                error_codes = result.get("error-codes", [])
                logger.warning(
                    f"CAPTCHA verification failed for {provider}: {error_codes}"
                )
            else:
                logger.debug(f"CAPTCHA verification succeeded for {provider}")

            return success

    except httpx.TimeoutException:
        logger.error(f"CAPTCHA verification timeout for {provider}")
        return False
    except Exception as e:
        logger.error(f"CAPTCHA verification error for {provider}: {e}")
        return False


def verify_captcha_sync(
    token: str, provider: str, secret_key: str, remote_ip: Optional[str] = None
) -> bool:
    """
    Verify a CAPTCHA token with the specified provider (sync version).

    Args:
        token: The CAPTCHA response token from the client
        provider: The CAPTCHA provider (cloudflare, google, hcaptcha)
        secret_key: The secret key for the provider
        remote_ip: Optional remote IP address for verification

    Returns:
        True if verification succeeded, False otherwise
    """
    if not token or not secret_key:
        logger.warning("CAPTCHA verification failed: missing token or secret")
        return False

    provider = provider.lower()
    if provider not in VERIFY_URLS:
        logger.error(f"Unknown CAPTCHA provider: {provider}")
        return False

    url = VERIFY_URLS[provider]

    # Build request data based on provider
    data = {"secret": secret_key, "response": token}

    # Add remote IP if provided
    if remote_ip:
        data["remoteip"] = remote_ip

    try:
        with httpx.Client() as client:
            response = client.post(url, data=data, timeout=10.0)
            result = response.json()

            success = result.get("success", False)

            if not success:
                error_codes = result.get("error-codes", [])
                logger.warning(
                    f"CAPTCHA verification failed for {provider}: {error_codes}"
                )
            else:
                logger.debug(f"CAPTCHA verification succeeded for {provider}")

            return success

    except httpx.TimeoutException:
        logger.error(f"CAPTCHA verification timeout for {provider}")
        return False
    except Exception as e:
        logger.error(f"CAPTCHA verification error for {provider}: {e}")
        return False
