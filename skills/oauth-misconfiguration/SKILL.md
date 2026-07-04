---
name: oauth-misconfiguration
description: Audit OAuth 2.0 / OIDC flows — redirect_uri tampering, state CSRF, code/token leakage, PKCE downgrade, scope abuse, and account linking flaws
domain: cybersecurity
subdomain: web-application-security
tags: [oauth, oidc, redirect-uri, state, pkce]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/OAuth Misconfiguration
---

# OAuth 2.0 / OIDC Misconfiguration

## Overview
OAuth issues mostly stem from how the *relying party* implements the flow — sloppy `redirect_uri` matching, missing `state`, accepting tokens from any IdP, allowing implicit flow where confidential is expected.

## Common Bugs

### redirect_uri validation
- Substring match: `https://target.com/callback@evil.com` or `https://target.com.evil.com/cb`.
- Wildcard subdomain: takeover any subdomain → bypass.
- Open redirect on the legit redirect_uri target → leaks `code` in `Location`.
- Path traversal: `https://target.com/cb/../oauth-sink`.
- Backslash / unicode confusion in URL parser vs validator.
- `redirect_uri=https://target.com/cb#@evil.com/` — fragment vs auth-host parsing.

### state CSRF
Missing or unverified `state` → attacker initiates OAuth, sends victim the consent URL, victim's account gets linked to attacker's IdP identity (account takeover).

### code/token leakage
- Token in URL fragment (implicit flow) → leaks via Referer / browser history.
- `code` reuse permitted by AS → replay.
- code stored in `window.opener` accessible to a popup.
- Authorization code returned over plain HTTP.

### Confidential client → public
- `client_secret` shipped in mobile/SPA bundle.
- PKCE not required; downgrade attack swaps PKCE for plain code flow if AS accepts both.

### Scope / consent
- Scope upgrade by editing param after consent.
- Pre-consented scopes for first-party apps that don't show consent screen.

### Account-linking
- Linking IdP identities without verifying email ownership → pre-account takeover.
- Trusting unverified `email_verified=false` claim from a public IdP.

### IdP discovery / dynamic registration
- Open dynamic client registration → register attacker client.
- `iss` / `aud` not validated → token from one tenant accepted by another.

### JWT id_token
- See JWT skill (alg=none, RS↔HS confusion, kid injection).
- `iss` allowlist; verify `aud`, `azp`, `nonce`.

## Tools
- **EasyEAsm / OAuth Dynamic Scopes** Burp ext.
- **AuthLab**, **mitmproxy** with OIDC plugin.
- jwt_tool for id_token attacks.

## Hardening
- Exact-match `redirect_uri` (no wildcards, no paths).
- Require `state` + CSRF check; require PKCE for all clients.
- Validate `iss`, `aud`, `azp`, `nonce`, `exp`, signature, alg.
- Confidential clients keep secrets server-side.
- Verify email before linking.

## References
- `payloadsallthethings/OAuth Misconfiguration/README.md`
- "OAuth 2.0 Security Best Current Practice" (RFC 8252 / draft-ietf-oauth-security-topics).
