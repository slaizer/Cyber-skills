---
name: insecure-direct-object-references
description: Find IDOR by tampering with object identifiers in URLs, bodies, JWT claims, GraphQL args, and hash IDs to access other users' resources
domain: cybersecurity
subdomain: web-application-security
tags: [idor, bola, authorization, broken-access-control]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Insecure Direct Object References
---

# Insecure Direct Object References (IDOR / BOLA)

## Overview
The server uses a client-supplied identifier to look up a resource without verifying the caller owns/has access to it. Tampering the ID returns someone else's data — the #1 API security issue (OWASP API #1).

## Where IDs Appear
- URL path: `/api/users/123/orders`.
- Query string: `?orderId=123`.
- JSON body: `{"user_id":123}`.
- Headers: `X-User-Id`, `X-Account-Id`.
- JWT claims (if decoded server-side without re-checking).
- WebSocket frames.
- Hidden form fields.

## Tampering Strategies
- Sequential IDs: increment/decrement.
- UUIDv1 (time-based): predictable; uuidv1 = MAC + timestamp.
- Base64-wrapped: decode, edit, re-encode.
- "Random" but enumerable (short, low entropy).
- "Hash" IDs that are just MD5(int) — pre-image small space.
- Negative numbers, `0`, `00`, `1e2`, very large values.
- Path traversal in ID: `123/../456`.
- Type juggling: `id=1` vs `id="1"` vs `id=[1]` vs `id={"$gt":0}`.

## Method/Verb Tricks
- GET works (owner check), but PUT/PATCH/DELETE skips it.
- HEAD/OPTIONS may leak existence.
- Older API version `/v1/` lacks authz that `/v2/` added.

## Multi-Tenant
- `X-Tenant-Id`/`X-Org-Id` header tamper.
- Cross-tenant references in nested objects (`{"orderId":123,"orgId":2}`).

## Tools
- **Burp Autorize** (auth diffing), **Auth Analyzer**, **AuthMatrix**.
- Custom Turbo Intruder for bulk ID iteration.

## Hardening
- Server-derived identity: ignore IDs in client input where possible (`/me/orders` not `/users/{id}/orders`).
- Per-request authorization at the resource layer, not the controller layer.
- Use unguessable IDs (UUIDv4) defense-in-depth.
- Object-level policy engine (Cedar, OPA).

## References
- `payloadsallthethings/Insecure Direct Object References/README.md`
- OWASP API Security Top 10 (API1: BOLA).
