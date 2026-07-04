---
name: regex-injection
description: Exploit user-controlled regex inputs for ReDoS, expensive backtracking, anchor abuse, and information leak via match groups
domain: cybersecurity
subdomain: web-application-security
tags: [regex, redos, regex-injection, dos]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Regular Expression
---

# Regular Expression Injection / ReDoS

## Overview
When apps accept regex patterns from users (search filters, validators, "advanced search", admin rules), attackers can: (1) hang the server with catastrophic backtracking, (2) widen the matched set by injecting alternation/anchors, (3) leak data via capturing groups echoed in errors.

## Catastrophic Backtracking Patterns
```
^(a+)+$
^(a|a?)+$
^(.*a){20}$
([a-zA-Z]+)*
(.*)*
```
Trigger with input ~30 'a's followed by `!`. Exponential time on PCRE, JS, .NET, Java (`java.util.regex`).

## Regex Injection (When User Supplies the Pattern)
```
.*                            → bypass restrictive filters
^.*$                          → match everything
admin|.*                      → widen allowed set
(?i)admin                     → case-insensitive opt-in
(?=.*)(.*)                    → look-ahead amplification
```
In search-by-regex: inject anchors to escape boundary, alternation to widen.

## Linear-Time Engine Notes
- RE2 (Go, Cloudflare) — no backtracking, immune to ReDoS.
- Hyperscan / Rust `regex` — same.
- JavaScript V8 ships an experimental linear engine for `/.../l`.

## Tools
- **safe-regex** (npm) — flag exponential patterns.
- **rxxr2**, **vuln-regex-detector**.
- **ReDoSHunter**, **regexploit**.

## Hardening
- Don't accept regex from users; offer structured filters.
- If you must: compile in a sandbox with timeout (e.g. `re2`, `safe-regex` pre-check).
- Limit input length and pattern complexity.

## References
- `payloadsallthethings/Regular Expression/README.md`
- OWASP ReDoS.
