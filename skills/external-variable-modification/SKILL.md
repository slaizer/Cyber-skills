---
name: external-variable-modification
description: Exploit PHP register_globals, extract(), parse_str() and similar variable-injection sinks that let external input overwrite internal variables
domain: cybersecurity
subdomain: web-application-security
tags: [variable-injection, php, extract, register-globals]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/External Variable Modification
---

# External Variable Modification

## Overview
Legacy PHP and similar dynamic-typed sinks turn user input directly into local variables, letting attackers overwrite auth flags or configuration mid-execution.

## Vulnerable Sinks (PHP)
- `register_globals = On` (removed in 5.4, still seen on legacy hosts).
- `extract($_GET)` / `extract($_POST)` without `EXTR_SKIP`.
- `parse_str($input)` (without second arg → writes to globals).
- `import_request_variables()`.
- `$$user_var = ...` (variable variables).
- `eval`/`assert` with concatenation (overlaps with code injection).

## Example
```php
$is_admin = false;
extract($_GET);              // ?is_admin=1
if ($is_admin) { /* :( */ }
```

## Other Ecosystems
- **Python**: `vars(self).update(request.args)` — mass-assignment style.
- **Node**: `Object.assign(req.session, req.body)` overwrites flags like `isAdmin`.
- **Ruby**: `instance_variable_set` from params, `OpenStruct.new(params)`.
- See also: Mass Assignment, Prototype Pollution.

## Detection
- Source-code grep for the sinks above.
- Black-box: identify reflected variable names (e.g. `?debug=1` enables debug) — then try the same against auth/role-shaped names: `is_admin`, `role`, `authenticated`.

## Hardening
- Replace with explicit field reads.
- `extract($_GET, EXTR_SKIP)` (don't overwrite) — but still avoid.
- Strict assignment allowlists.

## References
- `payloadsallthethings/External Variable Modification/README.md`
- OWASP Mass Assignment cheat sheet.
