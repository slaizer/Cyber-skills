---
name: brute-force-rate-limit
description: Bypass rate limiting and lockout controls to enable credential stuffing, OTP guessing, and enumeration via header tricks, race conditions, and endpoint variants
domain: cybersecurity
subdomain: web-application-security
tags: [brute-force, rate-limit-bypass, credential-stuffing, otp]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Brute Force Rate Limit
---

# Brute Force & Rate Limit Bypass

## Overview
Authentication, OTP, and sensitive endpoints often "rate limit" by IP, account, or session. Weak implementations can be defeated to allow high-throughput guessing.

## When to Use
Whenever a target enforces "too many attempts" / 429 / temporary lockout on login, OTP, password reset, coupon codes, search, or signup.

## Bypass Techniques
- **IP spoofing headers**: `X-Forwarded-For`, `X-Real-IP`, `X-Originating-IP`, `X-Remote-IP`, `X-Client-IP`, `CF-Connecting-IP`, `True-Client-IP`, `Forwarded:` — rotate per request.
- **Case / path tricks**: `/LOGIN`, `/login/`, `/login%20`, `/login?x=1`, `/api/v1/login` vs `/api/v2/login`.
- **HTTP method swap**: POST → PUT/PATCH if backend doesn't enforce method.
- **Header tricks**: vary `User-Agent`, `Accept-Language`, add junk `X-Foo` to defeat dumb fingerprinting.
- **Null-byte / unicode**: `admin%00`, `admin​` may bypass username-based counters.
- **Race condition / parallel**: 30 concurrent requests with Turbo Intruder's "last byte sync" before the counter increments.
- **Long password DoS-vs-bypass**: passwords > server limit may shortcut the check.
- **Resetting counter**: hitting `/logout` or rotating session cookie sometimes resets per-session counters.
- **GraphQL batching / alias**: send 100 mutations in one HTTP request via aliases.
- **2FA / OTP**: same techniques on `/verify-otp`; also try previously-issued OTPs, OTP=`000000`, expired-but-reusable.
- **Account distribution**: 1 password × many usernames (password spray) avoids per-account lockout.

## Tools
- Burp Intruder, Turbo Intruder (race conditions, IP rotation).
- ffuf / hydra / patator / medusa.
- IP-Rotate Burp extension (AWS API Gateway), `fireprox`.

## References
- `payloadsallthethings/Brute Force Rate Limit/README.md`
- PortSwigger: race conditions, authentication labs.
