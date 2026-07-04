---
name: lfi-testing
description: Test web applications for Local File Inclusion (LFI) and path traversal vulnerabilities. Use when the user is performing authorized web app pentesting, CTF challenges, bug bounty triage, or building/tuning WAF rules and detections against directory traversal. Provides curated sensitive-file targets (Linux/Windows), traversal-encoding bypass techniques, PHP wrapper payloads, and guidance for confirming and impact-grading findings.
---

# LFI / Path Traversal Testing

Use this skill ONLY for authorized testing (engagement scope, lab, CTF, your own systems) or defensive work (WAF rule tuning, log review, detection engineering). If scope is unclear, ask the user to confirm authorization before generating payloads against a live target.

## Workflow

1. **Identify a candidate sink** — a parameter that loads a file by name (`?page=`, `?file=`, `?lang=`, `?template=`, `?include=`, `?path=`, etc.) or any user-controlled value flowing into `include`, `require`, `file_get_contents`, `fopen`, `readfile`, `Server.MapPath`, `Path.Combine`, etc.
2. **Fingerprint the stack** (Linux vs Windows, PHP/Java/Node/.NET) to pick relevant target files. See [references/sensitive-files-linux.md](references/sensitive-files-linux.md) and [references/sensitive-files-windows.md](references/sensitive-files-windows.md).
3. **Try the canonical probe** — the lowest-noise payload first:
   - Linux: `../../../../../../../etc/passwd`
   - Windows: `..\..\..\..\..\..\..\windows\win.ini`
4. **If filtered, escalate with bypass encodings** — see [references/encoding-bypasses.md](references/encoding-bypasses.md).
5. **If the sink is PHP, try wrappers** — see [references/php-wrappers.md](references/php-wrappers.md). `php://filter/convert.base64-encode/resource=` is the highest-signal probe because it leaks source even when the file is interpreted.
6. **Confirm the hit** — match a known marker (`root:x:0:0:` for `/etc/passwd`, `[fonts]`/`[extensions]` for `win.ini`) rather than trusting HTTP 200.
7. **Grade impact** — file read only, source disclosure, log poisoning → RCE, SSRF via `http://` wrapper, or full RCE via wrapper chains / session/log includes. Record the minimal PoC, not a payload dump.

## Quick reference

- **Full raw payload list** (70k+ entries, all encodings and variants): [../lfi_payloads.txt](../lfi_payloads.txt). Grep it for variants when the curated lists don't bypass a filter:
  - `grep -i "etc/passwd" lfi_payloads.txt`
  - `grep -i "win.ini" lfi_payloads.txt`
  - `grep "%c0\|%c1\|%fc" lfi_payloads.txt` (overlong UTF-8)
- **Null-byte truncation** (`%00`): only viable on PHP < 5.3.4 or unpatched legacy Java. Try once; don't spam.
- **Length-based bypass**: PHP `include` with append filter — pad path past `PATH_MAX` (4096) to truncate `.php` suffix.
- **Filter chains**: `php://filter/convert.iconv...` chains can leak arbitrary file contents AND, in modern exploitation, achieve RCE without an upload primitive (see "PHP_FILTER_CHAIN_GENERATOR").

## Detection-engineering use

If the user is on the blue-team side, invert the workflow:
- Pull URI / query-string strings from access logs.
- Match against patterns in [references/encoding-bypasses.md](references/encoding-bypasses.md) — `..%2f`, `%252e`, `%c0%ae`, `..;/`, raw `/etc/`, `\windows\`, `php://`, `data://`, `expect://`, `file://`.
- High-confidence signals: any request containing both traversal sequences AND a sensitive-file basename (`passwd`, `shadow`, `win.ini`, `boot.ini`, `web.config`, `.env`, `wp-config.php`).

## Out of scope for this skill

- Generating payloads against a target the user has no authorization to test.
- Exfiltrating real credentials. Use marker files (`/etc/hostname`, `win.ini`) to prove the bug; stop before reading secrets.
- Weaponizing a confirmed LFI into persistent RCE on a third-party system.
