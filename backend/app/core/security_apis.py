import hashlib
import logging
from typing import Optional
import httpx

from app.core.config import settings

logger = logging.getLogger("campusride.security_apis")


def check_password_breach(password: str, timeout: Optional[float] = None) -> bool:
    """
    Checks if a candidate password has appeared in known data breaches
    using the Have I Been Pwned (HIBP) Passwords API via k-Anonymity.
    
    Privacy Guarantee:
    Only the first 5 characters of SHA-1(password) are transmitted. The remainder
    is matched locally against the returned candidate hash list.
    """
    if not settings.CHECK_PWNED_PASSWORDS:
        return False

    if not password:
        return False

    req_timeout = timeout or settings.PWNED_PASSWORDS_TIMEOUT_SECONDS
    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]

    verify_ssl = settings.SSL_VERIFY_EXTERNAL_APIS

    try:
        with httpx.Client(timeout=req_timeout, verify=verify_ssl) as client:
            headers = {
                "User-Agent": "CampusRide-Enterprise-Security/1.0",
                "Add-Padding": "true"  # Privacy enhancement against payload size analysis
            }
            res = client.get(f"https://api.pwnedpasswords.com/range/{prefix}", headers=headers)
            if res.status_code == 200:
                for line in res.text.splitlines():
                    parts = line.split(":")
                    if len(parts) == 2 and parts[0] == suffix:
                        count = int(parts[1]) if parts[1].isdigit() else 0
                        if count > 0:
                            logger.warning(
                                "Password check flagged: Candidate password has appeared %d times in public breaches.",
                                count
                            )
                            return True
            return False
    except Exception as exc:
        logger.warning(
            "HIBP password audit could not connect (%s). Gracefully proceeding to prevent service disruption.",
            exc
        )
        return False


async def check_password_breach_async(password: str, timeout: Optional[float] = None) -> bool:
    """
    Asynchronous version of Have I Been Pwned check using httpx.AsyncClient.
    """
    if not settings.CHECK_PWNED_PASSWORDS:
        return False

    if not password:
        return False

    req_timeout = timeout or settings.PWNED_PASSWORDS_TIMEOUT_SECONDS
    sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
    prefix, suffix = sha1[:5], sha1[5:]

    verify_ssl = settings.SSL_VERIFY_EXTERNAL_APIS

    try:
        async with httpx.AsyncClient(timeout=req_timeout, verify=verify_ssl) as client:
            headers = {
                "User-Agent": "CampusRide-Enterprise-Security/1.0",
                "Add-Padding": "true"
            }
            res = await client.get(f"https://api.pwnedpasswords.com/range/{prefix}", headers=headers)
            if res.status_code == 200:
                for line in res.text.splitlines():
                    parts = line.split(":")
                    if len(parts) == 2 and parts[0] == suffix:
                        count = int(parts[1]) if parts[1].isdigit() else 0
                        if count > 0:
                            logger.warning(
                                "Async password check flagged: Candidate password appeared %d times in public breaches.",
                                count
                            )
                            return True
            return False
    except Exception as exc:
        logger.warning(
            "HIBP async password audit encountered exception (%s). Gracefully proceeding.",
            exc
        )
        return False
