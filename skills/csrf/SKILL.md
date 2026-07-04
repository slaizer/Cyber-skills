---
name: csrf
description: Forge state-changing requests on behalf of authenticated victims; cover token bypasses, SameSite quirks, JSON CSRF, and login/logout CSRF
domain: cybersecurity
subdomain: web-application-security
tags: [csrf, xsrf, samesite, state-changing]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Cross-Site Request Forgery
---

# Cross-Site Request Forgery (CSRF)

## Overview
Attacker page issues a cross-origin request that the victim's browser auto-attaches cookies to. If the server accepts it (no anti-CSRF token, weak SameSite), the action executes as the victim.

## When to Use
State-changing endpoints (POST/PUT/DELETE, or GET that mutates) that rely solely on cookie auth and don't verify Origin/Referer or a CSRF token.

## Classic PoC
```html
<form action="https://target.com/account/email" method="POST">
  <input name="email" value="attacker@evil.com">
</form>
<script>document.forms[0].submit();</script>
```

## Token Bypasses
- **Token absent / not validated** for a method (PUT/DELETE) or content-type.
- **Token tied to session only by presence**: send empty token, or omit param.
- **Token reused across users / static**.
- **Token in body but not validated on URL param** version of the endpoint.
- **Token leak via Referer** to attacker-controlled subresource.
- **Double-submit cookie**: set the cookie via cookie injection (subdomain XSS / CRLF).
- **Token = user-controlled value** (e.g. taken from cookie that attacker can set).

## SameSite Considerations
- `SameSite=Lax` (default in Chrome): top-level GET still cross-site sends cookies; POST does not. Use `<a target="_top">` link with GET that mutates, or wait 2 minutes (the Lax-by-default 2-min window).
- `SameSite=None; Secure`: classic CSRF works fully.
- `SameSite=Strict`: no cross-site cookies — chain with subdomain XSS or related-site.

## JSON CSRF
- If endpoint accepts `application/json` but doesn't enforce CORS preflight (no custom header check), can submit via form with `enctype=text/plain` and crafted body, or `fetch` with `mode:'no-cors'`.

## Login / Logout CSRF
- Force victim to log into attacker-controlled account → subsequent activity is attributed/recorded → set up persistence (e.g. saved payment method becomes attacker's once victim returns).

## Hardening
- Synchronizer token (CSRF token) bound to session, validated on every state-changing request.
- `SameSite=Lax` minimum; `Strict` for high-risk endpoints.
- Verify `Origin` / `Referer` for state changes.
- Require re-auth for sensitive ops.

## References
- `payloadsallthethings/Cross-Site Request Forgery/README.md`
- PortSwigger CSRF labs.
