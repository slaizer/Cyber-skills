---
name: xss-testing-procedure
description: Systematic end-to-end procedure for finding XSS — entry-point enumeration, context analysis, character probing, payload selection, verification, and reporting. Use as the top-level workflow when starting an XSS assessment of a web application.
---

# Systematic XSS Testing Procedure

A repeatable workflow that combines the other XSS skills into one engagement-ready process.

## 1. Scope & authorization

Confirm written authorization, in-scope hosts, allowed payload types (alert vs. real exfil), and whether blind XSS callbacks to external infrastructure are permitted.

## 2. Entry-point enumeration

Catalog every place user input enters the application:

- URL query parameters and path segments
- POST form fields (HTML forms, JSON bodies, multipart uploads)
- HTTP headers: `User-Agent`, `Referer`, `X-Forwarded-For`, `Cookie`, custom `X-*`
- Cookies (often reflected in error pages)
- File names and metadata of uploads
- WebSocket messages
- `postMessage` recipients (for DOM XSS)
- URL fragment (`#...`) — never sent to server, but readable by JS → DOM XSS

Tooling: Burp Suite / ZAP spider, ParamSpider, Arjun, Hakrawler.

## 3. Reflection mapping

For each entry point, submit a unique marker (e.g. `zxq` + index + random) and grep the response **source** (not the rendered DOM) for the marker. Record:

- Location (HTML body, attribute, JS, CSS, comment, URL)
- Quoting (none, single, double, backtick)
- Any visible mutation (HTML-encoded? URL-encoded? truncated? case-changed?)

For stored XSS, also check that markers appear in **other users'** views (admin panels, profile pages, email rendering).

## 4. Character probing

At each reflection, send each of these individually and check whether it survives:

```
< > " ' ` ( ) { } ; / \ = & % ?
```

Plus encoded variants: `%3C`, `&lt;`, `&#60;`. Build a per-context allowed-character matrix before crafting payloads — saves time.

## 5. Payload selection

Apply `xss-payload-selection` to pick a context-appropriate baseline. If filtered, switch to `xss-waf-bypass`. If the app is a SPA, consult `xss-framework-exploitation`. For stored fields that render to other users, plan a `xss-blind-and-polyglot` probe.

## 6. Verification

- Confirm execution with a benign, unique PoC (`alert(document.domain)` is clearer than `alert(1)` because it proves the origin).
- Capture screenshot + raw HTTP request/response.
- For DOM XSS: include source → sink trace in browser devtools (set breakpoints on the sink).
- For blind XSS: log timestamp, source IP, captured DOM, originating injection field.

## 7. Severity assessment

- Reflected, requires user interaction, non-auth context → low–medium
- Stored, fires in admin context → high–critical
- DOM XSS in main app origin with session-cookie access → high
- Self-XSS only → informational

Adjust for CSP strength, HttpOnly cookies, SameSite policy, and presence of MFA.

## 8. Reporting

Include: vulnerable URL/parameter, request, exact payload, reflection context, browser, screenshot, impact narrative, and remediation reference to `xss-remediation`.

## Ethics

Authorized scope only. Use `alert()` / `print()` / `console.log()` for PoC — never exfiltrate real data, never pivot, never persist a payload beyond what is needed to demonstrate.
