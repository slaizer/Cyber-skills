---
name: graphql-injection
description: Attack GraphQL endpoints — introspection, deep-query DoS, batching, alias abuse, IDOR, injection via resolvers, and CSRF over GET
domain: cybersecurity
subdomain: web-application-security
tags: [graphql, introspection, batching, idor]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/GraphQL Injection
---

# GraphQL Injection & Abuse

## Overview
GraphQL exposes a flexible query interface. Misconfigurations turn that flexibility into a security liability: introspection in prod, no per-field auth, no query-cost limits, mutation over GET.

## Discovery
Common paths: `/graphql`, `/graphiql`, `/api/graphql`, `/v1/graphql`, `/playground`, `/altair`, `/console`.
Detection: POST `{"query":"{__typename}"}` → `{"data":{"__typename":"Query"}}`.

## Introspection
```graphql
{ __schema { types { name fields { name args { name type { name } } } } } }
```
- **clairvoyance** infers schema even when introspection is disabled (field-name brute force via error messages).
- **inql** Burp extension renders schema and generates queries.

## Attack Techniques
- **Auth bypass per field**: top-level query gated, nested resolvers not. `me { team { admin { secret } } }`.
- **IDOR**: `user(id:"123")` accepts any ID.
- **Batching attack**: send array of N login mutations in one request to bypass per-request rate limit.
- **Alias abuse**: 100 aliases on one query, same effect as 100 requests:
  ```graphql
  { a1: login(u:"x" p:"1") a2: login(u:"x" p:"2") ... }
  ```
- **Deep query DoS**: cyclic `friends { friends { friends ... } }` → exponential resolver work.
- **CSRF**: GraphQL accepting `application/x-www-form-urlencoded` or GET with `?query=mutation{...}`.
- **SQL/NoSQL injection in resolvers**: arguments forwarded to DB unsanitized.
- **SSRF in resolvers**: URL-typed arguments fetched server-side.
- **GraphQL → REST** auth gap: REST endpoints behind WAF; GraphQL gateway calls them with internal trust.
- **Field suggestion** in error messages leaks schema even with introspection off (`Did you mean...`).

## Tools
- **InQL**, **graphql-cop**, **graphql-voyager**, **clairvoyance**, **graphql-path-enum**.

## Hardening
- Disable introspection in prod (or behind auth).
- Disable field suggestions (Apollo: `formatError`).
- Query cost analysis + depth limit + max aliases / batched ops.
- Per-resolver authz; don't rely on top-level checks.
- Reject GET for mutations; require `Content-Type: application/json`.

## References
- `payloadsallthethings/GraphQL Injection/README.md`
- OWASP GraphQL Cheat Sheet.
