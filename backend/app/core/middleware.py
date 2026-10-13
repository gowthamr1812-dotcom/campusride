from starlette.middleware.base import BaseHTTPMiddleware
from fastapi import Request, Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Enterprise Security Headers Middleware
    Injects OWASP-recommended HTTP headers to protect against Clickjacking,
    MIME-sniffing, XSS, and unauthorized cross-domain embeds.
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        # 1. Clickjacking defense: Prevent embedding in unapproved iframes
        response.headers["X-Frame-Options"] = "DENY"

        # 2. Prevent MIME-sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"

        # 3. HTTP Strict Transport Security (HSTS) - Enforce HTTPS for 1 year with preloading
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"

        # 4. Strict Referrer Policy: Send full URL only on same-origin, origin on cross-origin HTTPS
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # 5. Restrict dangerous browser hardware APIs
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), payment=(), usb=()"

        # 6. Content Security Policy (allows Swagger docs, Leaflet tiles, and WebSockets)
        csp_directives = [
            "default-src 'self'",
            "img-src 'self' data: https://*.tile.openstreetmap.org https://unpkg.com https://fastapi.tiangolo.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "font-src 'self' https://fonts.gstatic.com data:",
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
            "connect-src 'self' wss: ws: https: http:",
            "frame-ancestors 'none'"
        ]
        response.headers["Content-Security-Policy"] = "; ".join(csp_directives)

        # 7. Disable legacy XSS filter behavior that can introduce vulnerabilities
        response.headers["X-XSS-Protection"] = "1; mode=block"

        return response
