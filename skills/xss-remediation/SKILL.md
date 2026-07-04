---
name: xss-remediation
description: Provide precise, context-aware code fixes for XSS vulnerabilities — output encoding, input validation, CSP, sanitization libraries, and framework-specific guidance. Use when reviewing code for XSS issues or advising developers on how to fix a confirmed XSS finding.
---

# XSS Remediation

The fix depends on **where** untrusted data is rendered. There is no single "escape function" — match the encoder to the context.

## 1. Context-aware output encoding

| Sink context | Correct encoding |
|---|---|
| HTML element body | HTML entity encode: `& < > " '` → `&amp; &lt; &gt; &quot; &#x27;` |
| HTML attribute (quoted) | HTML entity encode + ensure quotes around value |
| HTML attribute (unquoted) | **Don't.** Always quote attributes, then HTML-encode |
| JavaScript string literal | JS string escape: `\xHH` for non-alphanumerics; never just `\"` |
| JSON embedded in `<script>` | Use `JSON.stringify` + escape `<` `>` `&` to `< > &` |
| URL parameter | `encodeURIComponent` |
| CSS value | CSS escape: `\HH ` for non-alphanumerics |

Never use a single encoder for all contexts. HTML-encoding inside a JS string does not prevent XSS.

## 2. Input validation (defense in depth, not primary)

- **Allow-list, never deny-list.** Validate against the expected format (e.g. email regex, integer range, UUID).
- Reject (don't sanitize) when input violates the schema.
- For URLs: validate the scheme against `['http:', 'https:', 'mailto:']`; reject `javascript:`, `data:`, `vbscript:`.

## 3. HTML sanitization (when you must render user HTML)

If users legitimately need to submit HTML (rich-text comments, markdown rendering), sanitize on the server **and** client:

- **DOMPurify** (JS, browser + Node) — actively maintained, mXSS-aware.
- **Bleach** (Python).
- **sanitize-html** (Node) — configure allow-lists narrowly.
- **OWASP Java HTML Sanitizer** (Java).

Configure a strict allow-list of tags and attributes. Never allow `<script>`, `<iframe>`, `<object>`, `<embed>`, `<link>`, `style` attribute, or `on*` event handlers.

## 4. Content Security Policy (CSP)

A strong CSP turns many XSS bugs into low-severity findings.

Strict, nonce-based CSP (recommended):
```
Content-Security-Policy:
  default-src 'none';
  script-src 'nonce-{random}' 'strict-dynamic';
  style-src 'self';
  img-src 'self' data:;
  connect-src 'self';
  frame-ancestors 'none';
  base-uri 'none';
  object-src 'none';
  require-trusted-types-for 'script';
```

Add **Trusted Types** for DOM XSS defense in supporting browsers:
```js
trustedTypes.createPolicy('default', {
  createHTML: (s) => DOMPurify.sanitize(s)
});
```

## 5. Framework-specific fixes

### React
- Don't use `dangerouslySetInnerHTML` with untrusted input. If unavoidable: `DOMPurify.sanitize(input)` first.
- Validate `href` schemes:
  ```js
  const safeHref = /^(https?:|mailto:|\/)/i.test(url) ? url : '#';
  ```

### AngularJS (1.x)
- Avoid; upgrade to Angular 2+.
- Never pass user input to `$compile`, `$sce.trustAsHtml`, or `ng-bind-html` without sanitization.

### Angular (2+)
- Never use `bypassSecurityTrustHtml` / `bypassSecurityTrustUrl` on user data.
- Default `[innerHTML]` binding runs Angular's sanitizer — keep it.

### Vue
- Avoid `v-html` for untrusted data.
- Sanitize with DOMPurify before binding if you must.

### Server-side templates
- Jinja2: keep `autoescape=True`. Never use `|safe` on user data.
- ERB: use `<%= %>` (auto-escapes), not `<%== %>` or `.html_safe`.
- Thymeleaf: use `th:text` (escapes), not `th:utext`.
- Handlebars: use `{{ }}` (escapes), not `{{{ }}}`.
- Go `html/template`: use it — not `text/template` — for HTML output.

## 6. Cookie & header hardening (reduces XSS impact)

- `Set-Cookie: ...; HttpOnly; Secure; SameSite=Lax` (or Strict)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 7. DOM XSS specifics

Audit dangerous sinks: `innerHTML`, `outerHTML`, `document.write`, `eval`, `setTimeout(string)`, `setInterval(string)`, `Function()`, `location`, `*.src`, `*.href`, `iframe.srcdoc`, `range.createContextualFragment`.

Replace with safe equivalents:
- `innerHTML = x` → `textContent = x` (if HTML not needed) or `DOMPurify.sanitize(x)`.
- `eval(x)` → `JSON.parse(x)` or a real parser.
- `el.src = userInput` → validate scheme first.

## Workflow

1. Identify the confirmed sink and the rendering context.
2. Apply the matching encoder from §1.
3. Add input validation at the boundary (§2).
4. If user-submitted HTML is required, add server-side sanitization (§3).
5. Deploy a strict CSP (§4) as defense in depth.
6. Add a regression test that submits a known PoC and asserts safe rendering.
