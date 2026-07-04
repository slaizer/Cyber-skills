---
name: jwt
description: Attack JSON Web Tokens — alg=none, alg confusion (RS256→HS256), weak HMAC secrets, kid/jku/x5u injection, embedded JWK, and JWT library bugs
domain: cybersecurity
subdomain: web-application-security
tags: [jwt, jws, jwk, alg-confusion, token-forgery]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/JSON Web Token
---

# JSON Web Tokens (JWT)

## Overview
JWT issues are dominated by signature-verification bugs rather than cryptanalysis. A handful of well-known mistakes still pop in 2025 — usually catastrophic (full auth bypass).

## Structure
```
header.payload.signature        (each base64url-encoded JSON / bytes)
header  = {"alg":"HS256","typ":"JWT","kid":"key1"}
payload = {"sub":"alice","role":"user","exp":...}
```

## Classic Attacks

### alg = none
```
header: {"alg":"none","typ":"JWT"}
signature: ""    (empty)
```
Edit payload (`role:admin`), strip signature. Many libs still accept.

### alg confusion RS256 → HS256
Server has a public key for RS256. Attacker sets `alg:HS256`, signs the token with the *public key* as HMAC secret. Vulnerable verifiers do `verify(token, publicKey)` regardless of alg.

### Weak HMAC secret
Token uses HS256 with a guessable secret (`secret`, `password`, app name, default lib values).
```
hashcat -a 0 -m 16500 <jwt> rockyou.txt
```
Also test `badsecrets` for known framework keys.

### `kid` parameter injection
```
"kid":"../../../../dev/null"    → server reads /dev/null as key → empty HMAC
"kid":"key' UNION SELECT 'attacker_secret'--"   → SQLi in kid lookup
"kid":"../../../../proc/self/environ"
```

### `jku` / `x5u` header — remote key fetch
Set `jku` to attacker-hosted JWK URL → server fetches → uses attacker's public key. Mitigated only if jku is allowlisted.
```
"jku":"https://attacker.com/jwks.json"
```

### Embedded JWK (`jwk` header)
Include attacker's public key in the header itself. Lazy verifiers use it directly.

### Algorithm downgrade
Strip / change `alg` to one not expected.

### Other
- `exp` / `nbf` not enforced.
- Mixed token types (`typ:JWT` vs no `typ`) accepted by JWE-aware libs.
- `cty` header for nested JWT confusion.
- ECDSA invalid curve / `(r,s) = (0,0)` (CVE-2022-21449 Java).
- psychic-signatures.

## Tools
- **jwt_tool** (ticarpi) — full attack suite, including jku/kid tricks.
- **jwt-cracker**, **hashcat -m 16500**.
- **jose.tools**, jwt.io for manual edits.
- Burp **JWT Editor** extension.

## Hardening
- Pin `alg` server-side; reject everything else.
- Separate key per `alg` family (never reuse RSA public key as HMAC secret).
- Use 256-bit+ random HMAC secrets.
- Ignore client-provided `jku`/`jwk`/`x5u`, or allowlist origins.
- Short `exp`, refresh tokens with rotation, audience and issuer checks.

## References
- `payloadsallthethings/JSON Web Token/README.md`
- PortSwigger JWT labs; "JWT Attack Playbook" (ticarpi).
