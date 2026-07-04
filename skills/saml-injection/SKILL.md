---
name: saml-injection
description: Attack SAML SSO — XML signature wrapping (XSW), comment injection on NameID, raw XSLT/XXE in metadata, and assertion tampering
domain: cybersecurity
subdomain: web-application-security
tags: [saml, xsw, xml-signature-wrapping, sso]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/SAML Injection
---

# SAML Injection

## Overview
SAML uses signed XML assertions. Bugs almost always arise from how the consumer validates: signature scope, canonicalization, NameID parsing, and XML processing.

## Key Attack Classes

### XML Signature Wrapping (XSW)
Insert an unsigned `<Assertion>` somewhere the application reads, while a signed assertion exists elsewhere — validator checks the signed one, business logic reads the unsigned.
- XSW1–8 patterns (Somorovsky et al.).
- Tool: **SAML Raider** Burp extension automates all 8 variants.

### Comment / Truncation in NameID
```xml
<NameID>admin@evil.com<!---->.example.com</NameID>
```
- Some XML parsers strip comments and return concatenated text; some return only the first child text node.
- IdP signs with one interpretation, SP authenticates as another → auth bypass.
- CVE-2018-0489 (passport-saml), CVE-2017-11427 (OneLogin python-saml).

### Signature exclusion
Strip `<ds:Signature>`; SP "verifies" but no signature present.

### Algorithm downgrade
SHA1 / MD5 accepted; HMAC-with-public-key (XML-Sig SymmetricKey trust).

### XSLT / XXE in assertion or metadata
```xml
<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<saml:Subject>&xxe;</saml:Subject>
```
- XSLT transform: `<ds:Transform Algorithm="http://www.w3.org/TR/1999/REC-xslt-19991116">` with embedded XSLT for RCE on vulnerable libs.

### Replay
- Missing `Conditions/NotOnOrAfter` enforcement.
- Missing `InResponseTo` correlation → cross-tab replay.

### Metadata tampering
Self-registered IdP metadata pointing certs to attacker key.

## Tools
- **SAML Raider** (Burp).
- **xmlsec1**, **saml2aws** for manual flow.

## Hardening
- Validate signature *before* any parsing; verify the signature covers the elements you read.
- Reject comments / multi-text-node NameIDs.
- Pin signing certificates per IdP entityID.
- Disable XSLT transforms and DTDs in XML parsers.
- Enforce `NotBefore`, `NotOnOrAfter`, `InResponseTo`, `Audience`.

## References
- `payloadsallthethings/SAML Injection/README.md`
- Duo "The road to SAML2": classic XSW writeup.
