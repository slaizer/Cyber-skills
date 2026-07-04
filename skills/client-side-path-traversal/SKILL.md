---
name: client-side-path-traversal
description: Exploit client-side URL/path construction (CSPT) to redirect fetches, escalate to XSS/SSRF/CSRF, or fetch wrong API endpoints via traversal in JS
domain: cybersecurity
subdomain: web-application-security
tags: [cspt, client-side-path-traversal, javascript, sop]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Client Side Path Traversal
---

# Client-Side Path Traversal (CSPT)

## Overview
Modern SPAs build URLs in JS: `fetch('/api/users/' + id)`. If `id` is user-controlled (URL param, postMessage, localStorage) and accepts `../`, the request hits a different API endpoint than intended — often a public one returning controllable data, which the SPA then renders as if it were the trusted endpoint.

## When to Use
SPAs/PWAs where client JS constructs paths from URL hash, query params, fragments, or stored values; OAuth callbacks; chat widgets; markdown renderers loading remote data.

## Attack Shape
```
Trusted call:  GET /api/users/{id}/profile
Tampered id:   ../../public/comments/123
Actual call:   GET /api/public/comments/123    ← attacker-controlled body
SPA then trusts the response as "profile data" → XSS / auth bypass / state corruption.
```

## Escalations
- **Self-XSS → exploitable XSS**: control response body of an arbitrary same-origin endpoint, then trick app into rendering it.
- **CSRF token theft**: redirect token-fetch to attacker-uploadable endpoint.
- **OAuth code theft**: traversal in redirect path used to compose the token-exchange URL.
- **Open redirect via client routing**: `#/redirect/../../evil`.

## Detection
- Static: grep JS bundle for string concat into `fetch`, `axios`, `XMLHttpRequest`, `Router.push`, `window.location` with non-validated inputs.
- Dynamic: insert `../`, `..%2f`, `..%5c`, double-encoded; watch DevTools Network for path changes.

## Tools
- **DOM Invader** (Burp) with CSPT mode.
- **Doyensec CSPTBurpExtension** / `cspt-payload-generator`.

## Hardening
- Reject `..`, `/`, `\` in path segments before concatenation.
- Use route maps (object lookup) rather than string interpolation.
- `encodeURIComponent` every dynamic segment.

## References
- `payloadsallthethings/Client Side Path Traversal/README.md`
- Doyensec CSPT research (Maciej Domanski, 2022–2024).
