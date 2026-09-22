---
name: cpts-recon-enumeration
description: "CPTS Reconnaissance & Enumeration methodology: enumeration checklists, initial enumeration techniques, and comprehensive Nmap scanning (host discovery, port scanning, protocol scanning, full flag reference). Use when performing network reconnaissance, port scanning, service enumeration, or following the CPTS recon methodology."
argument-hint: "[target] [options]"
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
> This skill is provided for **authorized penetration testing, security research, and educational purposes only**. Only use these techniques against systems you own or have **explicit written permission** to test. Unauthorized scanning, enumeration, or exploitation of systems you do not own is **illegal** and may violate computer fraud and abuse laws in your jurisdiction. The authors and maintainers accept no liability for misuse of this information.
>
> **When in doubt, do not scan.**

---

# CPTS Reconnaissance & Enumeration

## Purpose

This skill provides a complete reference for the Hack The Box **Certified Penetration Testing Specialist (CPTS)** reconnaissance and enumeration methodology. It covers:

1. **Enumeration Checklist** — a systematic checklist for every phase of enumeration
2. **Initial Enumeration** — quick-start scanning commands and per-service enumeration techniques
3. **Nmap Scanning** — host discovery, scan techniques, timing, output formats, and the full flag reference
4. **Protocol Scan** — Nmap NSE scripts organized by protocol/service for deep enumeration

Use this as a step-by-step playbook when beginning engagement against a new target.

---

## Table of Contents

1. [Enumeration Checklist](#1-enumeration-checklist)
2. [Initial Enumeration](#2-initial-enumeration)
3. [Nmap Scanning](#3-nmap-scanning)
4. [Nmap Full Flag Reference](#4-nmap-full-flag-reference)
5. [Protocol Scan — NSE Scripts by Service](#5-protocol-scan--nse-scripts-by-service)
6. [Automation Tools & Finding Exploits](#6-automation-tools--finding-exploits)

---

## 1. Enumeration Checklist

A systematic checklist to ensure complete coverage during reconnaissance. Work through each section and tick off items as they are completed.

### Basic Discovery

- [ ] Target IP Address & Hostname
- [ ] Host Discovery (Are They Alive?)
- [ ] Ping Sweeps
- [ ] ARP Scans
- [ ] Traceroute
- [ ] Network Mapping

### Port Scanning

- [ ] TCP Connect Scans
- [ ] SYN Scans
- [ ] UDP Scans
- [ ] Specific Port Scans
- [ ] Version Detection
- [ ] Script Scanning

### Service Enumeration

- [ ] Banner Grabbing
- [ ] SNMP Enumeration
- [ ] SMB Enumeration
- [ ] SMTP Enumeration
- [ ] SSH Enumeration
- [ ] HTTP Enumeration
- [ ] Database Enumeration (MySQL, Postgres, MSSQL)
- [ ] LDAP Enumeration
- [ ] RPC Enumeration
- [ ] RDP Enumeration
- [ ] VNC Enumeration
- [ ] Network Share Enumeration
- [ ] Printer Enumeration
- [ ] SCADA Enumeration
- [ ] Hardware Enumeration

### Operating System Detection

- [ ] Nmap OS Detection
- [ ] TTL Analysis
- [ ] SMB OS Detection

### Vulnerability Scanning

- [ ] Nessus
- [ ] OpenVAS
- [ ] Nikto
- [ ] Nmap NSE Scripts
- [ ] Manual Vulnerability Checks

### User Enumeration

- [ ] Brute-force
- [ ] Default Credentials Checks
- [ ] Social Engineering

### Web Enumeration

- [ ] Web Server Detection & Web Enumeration
- [ ] CMS Enumeration (WordPress, Joomla, Drupal)
- [ ] Version Control System Enumeration
- [ ] Websocket Enumeration
- [ ] GraphQL Enumeration
- [ ] Source Page Analysis (Comments, JS, API Keys, etc.)
- [ ] CORS Configuration
- [ ] Frameworks/Technologies Detection (Wappalyzer, WhatWeb, BuiltWith)
- [ ] Burp Suite Headers Analysis
- [ ] HTML Tags Analysis

### DNS Enumeration

- [ ] DNS Lookups
- [ ] Zone Transfers
- [ ] Subdomain Enumeration
- [ ] Reverse DNS Lookup
- [ ] DNS Brute Forcing

### WHOIS and Certificate Data

- [ ] WHOIS Information
- [ ] SSL/TLS Certificate Inspection
- [ ] Certificate Enumeration

### Cloud Enumeration

- [ ] AWS S3 Bucket Enumeration
- [ ] Azure Blob Storage Enumeration
- [ ] Google Cloud Storage Enumeration

### Mobile/IoT Enumeration

- [ ] APK/IPA Analysis
- [ ] Mobile API Enumeration
- [ ] Bluetooth Enumeration
- [ ] Firmware Analysis

### External Intelligence

- [ ] Shodan
- [ ] Censys
- [ ] Code Repository Enumeration

### Infrastructure Components

- [ ] Firewall Enumeration
- [ ] VPN Enumeration
- [ ] Load Balancer Enumeration
- [ ] IDS/IPS Enumeration

### Container & Virtualization

- [ ] Container Enumeration (Docker, Kubernetes)

### Misc

- [ ] Running Automated Recon Tools
- [ ] Notes & Observations (Errors, Hidden Params, etc.)

---

## 2. Initial Enumeration

### Scanning

#### Nmap TCP Quick

```bash
sudo nmap -Pn -v -sS -sV -sC -oN tcp-quick.nmap IP
```

#### Nmap TCP Full

```bash
sudo nmap -Pn -sS --stats-every 3m --max-retries 1 --max-scan-delay 20 --defeat-rst-ratelimit -T4 -p1-65535 -oN tcp-full.nmap -sV IP 
```

#### Nmap TCP — Repeat if extra ports found

```bash
sudo nmap -Pn -v -sS -A -oN tcp-extra.nmap -p PORTS IP 
```

#### Nmap UDP Quick

```bash
sudo nmap -Pn -v -sU -sV --top-ports=30 -oN udp-quick.nmap IP
```

#### Nmap UDP 1000

```bash
sudo nmap -Pn --top-ports 1000 -sU --stats-every 3m --max-retries 1 -T4 -oN udp-1000.nmap IP
```

#### Nmap UDP — Repeat if extra ports found

```bash
sudo nmap -Pn -sU -A -oN udp-extra.nmap -p PORTS IP 
```

#### ICMP Sweep

```bash
fping -a -g 10.10.10.0/24 2>/dev/null
```

#### ARP Scan (Local Network)

```bash
arp-scan -l
```

### Per-Service Enumeration

#### FTP — Port 21

```bash
# Check for FTP version vulns
# Check for Anonymous login 
# Check for Read access
# Check for Web root or root directories of any other accessible service 
# Check for write access 
```

#### SSH — Port 22

```bash
# Check for SSH version vulns
# Check for User enumeration if necessary 
# Check if host key was seen somewhere else 
# Check if it prompts for a password - means password login is allowed for some users
nmap -sV --script=ssh-hostkey -p22 IP
# Bruteforce if necessary with CeWL, Hydra, Patator, Crowbar, MSF (if port gets filtered, there's defense mechanisms - fail2ban) 
```

#### Telnet — Port 23

```bash
# Connect and check for service running
```

#### SMTP — Port 25

```bash
# Check for SMTP vulns 
# Check version with HELO / HELLO <domain>  
```

#### POP — Port 110

```bash
# Connect using telnet 
user <username> 
pass <pass> 
LIST - to list emails 
RETR <email numbr> - To retrieve emails 
```

#### DNS — Port 53

```bash
# Might indicate a domain controller on Windows 
# Check for zone transfer 
```

#### Kerberos — Port 88

Indication that it's a Domain Controller (DC).

```bash
kerbrute userenum --dc IP -d DOMAIN users.txt
GetNPUsers.py domain.local/ -usersfile users.txt -no-pass
```

#### NetBIOS — Port 139

```bash
nmblookup -A IP
nbtscan IP 
# On older hosts, this port serves SMB / SAMBA, scan by adding 'client min protocol = LANMAN1' to GLOBAL setting in /etc/samba/smb.conf or by using --option='client min protocol'=LANMAN1 with smbclient
```

#### RPC — Port 135

```bash
sudo nmap -sS -Pn -sV --script=rpcinfo.nse -p135 0 
rpcinfo IP
rpcclient -U "" -N [ip]
```

#### LDAP — Ports 389, 636, 3268, 3269

```bash
sudo nmap -sS -Pn -sV --script=ldap* -p389,636,3268,3269  
```

#### SNMP — Port 161

```bash
snmpwalk -v2c -c public IP
snmp-check IP
onesixtyone -c community.txt IP
sudo nmap -sU -sV -p 161 --script snmp* IP
snmpenum -t IP -c public
```

#### Oracle — Port 1521

```bash
tnscmd10g version -h IP
nmap -sV --script=oracle-tns-version -p1521 IP
odat tnscmd -s IP --ping
odat all -s IP -p 1521
odat sidguesser -s IP
```

#### MySQL — Port 3306

```bash
mysql -h IP -u root -p
nmap -sV --script=mysql* -p3306 IP
hydra -L users.txt -P passwords.txt mysql://IP
mysql -h IP -u root
```

#### Web — Ports 80 / 443

**Nmap Web**

```bash
sudo nmap -Pn -sC -p80,443 
```

**Checks**

```bash
# Browse the webapp 
# Check for usernames, keywords 
# Check Web server vulns
# Check for Cgi's shellshock
# Check Certificates for hostname
# Check robots.txt
# Check sitemap.xml
# Check for known software - View source 
# Check for default credentials 
# Check for input validation - SQLi
# Check for OS Command execution
# Check for LFI / RFI 
```

**Dirb**

```bash
dirb IP
dirb with -X extensions based on web technology, .php,.asp,.txt,.jsp
dirb IP -a  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
```

**Gobuster**

```bash
gobuster dir --url IP --wordlist /usr/share/seclists/Discovery/Web-Content/big.txt
gobuster dir --url IP --wordlist /usr/share/seclists/Discovery/Web-Content/big.txt -k -a 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
```

**Nikto**

```bash
nikto -host IP
```

**whatweb / wappalyzer**

```bash
whatweb http://IP
wappalyzer http://IP
```

**wpscan (WordPress)**

```bash
wpscan --url http://IP --enumerate u
```

#### SMB — Ports 139, 445

**Nmap vuln scripts**

```bash
sudo nmap -Pn --script=smb-proto* -p139,445 
sudo nmap -Pn --script=smb-os-discovery.nse -p139,445
sudo nmap -Pn --script=smb-enum* -p139,445
sudo nmap -Pn --script=smb-vuln* -p139,445
nmap -p 445 -vv --script=smb-vuln-cve2009-3103.nse,smb-vuln-ms06-025.nse,smb-vuln-ms07-029.nse,smb-vuln-ms08-067.nse,smb-vuln-ms10-054.nse,smb-vuln-ms10-061.nse,smb-vuln-ms17-010.nse 
crackmapexec smb IP -u '' -p '' --shares
```

**Check for Null logins**

```bash
nmap --script smb-enum-shares -p 139,445 
smbclient -L \\ip\ -N 
smbclient -m=SMB2 -L \\Hostname\ -N
```

**Connect to a share with Null session**

```bash
smbclient \\IP\$Admin -N 
smbmap -H IP
smbmap -u DoesNotExists -H IP
enum4linux -a IP
```

**Impacket Tools**

```bash
impacket-smbclient -no-pass IP
impacket-lookupsid domain/username:password@ip
```

**Check permissions on a connected share**

```bash
smb: \> showacls # enable acl listing
smb: \> dir # list directories with acls
```

**Mount share on local machine**

```bash
sudo mount -t cifs //10.10.10.134/SHARENAME ~/path/to/mount_directory
```

**List share with credentials**

```bash
smbmap -u USERNAME -p PASSWORD -d DOMAIN.TLD -H <TARGET-IP>
```

**Recursively list all files in share**

```bash
smbmap -R -H <TARGET-IP>
smbmap -R Replication -H <TARGET-IP>
```

**With smbclient (recurse downloads all files)**

```bash
smbclient //<TARGET-IP>/Replication
smb: \> recurse ON
smb: \> prompt OFF
smb: \> mget *
```

**Upload / Download specific files**

```bash
smbmap -H <TARGET-IP> --download 'Replication\active.htb\ 
smbmap -H <TARGET-IP> --upload test.txt SHARENAME/test.txt 
```

#### NFS — Port 2049

```bash
showmount -e IP 
mount -t nfs -o vers=3 10.1.1.1:/home/ ~/home
mount -t nfs4 -o proto=tcp,port=2049 127.0.0.1:/srv/Share mountpoint
```

#### TFTP — UDP 69

```bash
# tftp client to connect
# atftp is a better client 
# Can be used to read system files, MSSQL password mdf file
```

---

## 3. Nmap Scanning

### Core Scan Commands

```sh
nmap -sn $ip  
```
Disable port scanning (only host discovery). Use this to check if hosts are up without scanning their ports.

```sh
nmap -sn -PS $ip
```
SYN Ping. Sends a SYN packet to check if the host responds.

```sh
nmap -sn -PA $ip
```
TCP ACK Ping. Useful for detecting hosts behind firewalls that block ICMP.

```sh
nmap -T4 -sS -p- $ip
```
Full SYN scan with aggressive timing. Scans all ports using a SYN scan with a faster timing template (T4).

```sh
nmap -sC -sV --script={name_of_script} -p- -T4 $ip
```
Run script with version detection. Runs a specific Nmap script while detecting versions of services.

```sh
nmap -Pn -sA -p-
```
ACK scan for firewall analysis. Determines which ports are filtered or unfiltered by firewalls.

```sh
nmap -Pn -sS -sV -p- --data-length 200 -D $gatewayip,$gatewayip $ip
```
Decoy scan with packet padding. Uses decoys to obscure the real scanner and adds random data to packets.

### Flags for Better Results

#### Scan Types

| Flag | Description |
|------|-------------|
| `-sA` | TCP ACK scan |
| `-sS` | TCP SYN scan |
| `-sT` | TCP connect scan |

#### Host & Network Discovery

| Flag | Description |
|------|-------------|
| `-PE` | Ping scan using ICMP ECHO request |
| `--disable-arp-ping` | Disable ARP ping |

#### Packet Handling & Output

| Flag | Description |
|------|-------------|
| `--packet-trace` | Show all packets sent and received |
| `--reason` | Display the reason for specific results |

#### Port Scanning

| Flag | Description |
|------|-------------|
| `--top-ports=10` | Scan the top 10 most frequent ports |
| `-p22` | Scan a specific port (e.g., port 22) |
| `-F` | Scan the top 100 ports |

#### Spoofing & Stealth Techniques

| Flag | Description |
|------|-------------|
| `-D RND:5` | Generate 5 random decoy IP addresses |
| `-S <IP>` | Set a specific source IP address |
| `-e tun0` | Send requests through a specific network interface |
| `--source-port 53` | Scan using a specific source port (e.g., `53`) |

### Optimizing Nmap Scans

Reducing scan time can help **evade IDS detection**, while **increasing speed** may appear suspicious.

#### Timing & Performance Tweaks

| Flag | Description |
|------|-------------|
| `--host-timeout 5s` | Set a timeout for each host (e.g., 5 seconds) |
| `--scan-delay 5s` | Delay between scan attempts (e.g., 5 seconds) |
| `--initial-rtt-timeout 50ms` | Set the initial RTT timeout |
| `--max-rtt-timeout 100ms` | Set the max RTT timeout |

### Nmap Output Formats

| Flag | Description |
|------|-------------|
| `-oN <filename>` | Save as normal text file |
| `-oX <filename>` | Save as XML file |
| `-oS <filename>` | Save as script (for Metasploit) |
| `-oA <basename>` | Save in all formats (`.nmap`, `.xml`, `.gnmap`) |

---

## 4. Nmap Full Flag Reference

### Host Discovery

```bash
-sL    nmap 192.168.1.1-3 -sL                       # No Scan. List targets only
-sn    nmap 192.168.1.1/24 -sn                      # Disable port scanning
-Pn    nmap 192.168.1.1-5 -Pn               # Disable host discovery. Port scan only
-PS    nmap 192.168.1.1-5 -PS22-25,80       # TCP SYN discovery on ports 22-25,80
-PA    nmap 192.168.1.1-5 -PA22-25,80       # TCP ACK discovery on ports 22-25,80
-PU    nmap 192.168.1.1-5 -PU53                     # UDP discovery on port 53
-PR    nmap 192.168.1.0/24 -PR                      # ARP discovery on local network
-n     nmap 192.168.1.1 -n                          # Never do DNS resolution
```

### Target Specification

```bash
nmap 192.168.1.1                                     # Scan a single IP
nmap 192.168.1.1 192.168.2.1                         # Scan specific IPs
nmap 192.168.1.1-254                                 # Scan a range
nmap scanme.nmap.org                                 # Scan a domain
nmap 192.168.1.0/24                                  # Scan using CIDR notation
-iL     nmap -iL targets.txt                         # Scan targets from a file
-iR     nmap -iR 100                                 # Scan 100 random hosts
--exclude  nmap --exclude 192.168.1.1                # Exclude listed hosts
```

### Scan Techniques

```bash
-sS     nmap 192.168.1.1 -sS                         # TCP SYN port scan (Default)
-sT     nmap 192.168.1.1 -sT                         # TCP connect port scan
-sU     nmap 192.168.1.1 -sU                         # UDP port scan
-sA     nmap 192.168.1.1 -sA                         # TCP ACK port scan
-sW     nmap 192.168.1.1 -sW                         # TCP Window port scan
-sM     nmap 192.168.1.1 -sM                         # TCP Maimon port scan
```

### Port Specification

```bash
-p      nmap 192.168.1.1 -p 21                       # Port scan for port 21
-p      nmap 192.168.1.1 -p 21-100                   # Port range
-p      nmap 192.168.1.1 -p U:53,T:21-25,80          # TCP and UDP ports
-p-     nmap 192.168.1.1 -p-                         # All 65535 ports
-p      nmap 192.168.1.1 -p http,https               # Port scan using service names
-F      nmap 192.168.1.1 -F                          # Fast port scan (100 ports)
--top-ports nmap 192.168.1.1 --top-ports 2000        # Top 2000 ports
```

### Timing and Performance

```bash
nmap -T0 <target>            # T0 = Paranoid (very slow, for IDS evasion)
nmap -T1 <target>            # T1 = Sneaky (slow)
nmap -T2 <target>            # T2 = Polite (slower, uses less bandwidth)
nmap -T3 <target>            # T3 = Normal (default)
nmap -T4 <target>            # T4 = Aggressive (faster, good for LANs)
nmap -T5 <target>            # T5 = Insane (very fast, risk of inaccuracy)  
--host-timeout <time>        # Maximum time allowed for one host scan (e.g., 30m, 1h)
--min-rtt-timeout <time>     # Minimum probe timeout based on round-trip time
--max-rtt-timeout <time>     # Maximum probe timeout based on round-trip time
--min-hostgroup <size>       # Minimum number of hosts to scan in parallel
--max-hostgroup <size>       # Maximum number of hosts to scan in parallel
--min-parallelism <num>      # Minimum number of probes to send in parallel
--max-parallelism <num>      # Maximum number of probes to send in parallel
--scan-delay <time>          # Delay between probes (e.g., 1s, 500ms)
--max-scan-delay <time>      # Max allowed delay between probes
--max-retries <tries>        # Max number of probe retransmissions per port
--min-rate <number>          # Minimum number of packets per second
--max-rate <number>          # Maximum number of packets per second
```

**Timing Template Summary**

| Template | Name | Use Case |
|----------|------|----------|
| `-T0` | Paranoid | Very slow, IDS evasion |
| `-T1` | Sneaky | Slow, IDS evasion |
| `-T2` | Polite | Slower, uses less bandwidth |
| `-T3` | Normal | Default |
| `-T4` | Aggressive | Faster, good for LANs |
| `-T5` | Insane | Very fast, risk of inaccuracy |

### Service and Version Detection

```bash
-sV                                # Detect service versions
--version-intensity <0-9>          # Intensity of detection
--version-light                    # Light and fast scan
--version-all                      # Aggressive detection
-A                                 # OS detection, version detection, scripts, traceroute
```

### OS Detection

```bash
-O                                 # Enable OS detection
--osscan-limit                     # Skip OS scan if conditions not met
--osscan-guess                     # Guess aggressively
--max-os-tries <x>                 # Set max OS detection tries
```

### Firewall / IDS Evasion and Spoofing

```bash
-f                                # Fragment packets
--mtu <val>                       # Set MTU
-D                                # Decoy scan
-S                                # Spoof source IP
-g                                # Set source port
--proxies                         # Relay via proxies
--data-length <bytes>             # Append data
```

### NSE Scripts

```bash
-sC                                # Default scripts
--script default                   # Same as -sC
--script=banner                    # Run specific script
--script=http*                     # Wildcard match
--script=http,banner               # Multiple scripts
--script "not intrusive"           # Exclude intrusive scripts
--script-args                      # Script arguments
```

### Example NSE Scripts

```bash
nmap -Pn --script=http-sitemap-generator scanme.nmap.org
nmap -n -Pn -p 80 --open -sV -vvv --script banner,http-title -iR 1000
nmap -Pn --script=dns-brute domain.com
nmap -n -Pn -vv -O -sV --script smb-* 192.168.1.1
nmap --script whois* domain.com
nmap -p80 --script http-unsafe-output-escaping scanme.nmap.org
nmap -p80 --script http-sql-injection scanme.nmap.org
```

### Web App Specific NSE Scripts

```bash
nmap -p80 --script http-methods --script-args http-methods.test-all http://target
nmap -p80 --script http-headers http://target
nmap -p80 --script http-auth,http-auth-finder,http-auth-guess http://target
nmap -p80 --script http-enum http://target
nmap -p80 --script http-config-backup http://target
nmap -p80 --script http-userdir-enum http://target
nmap -p80 --script http-vhosts,http-iis-short-name-brute http://target
nmap -p80 --script http-dombased-xss,http-xssed,http-stored-xss,http-csrf 192.168.1.1
```

### Advanced NSE Script Usage

```bash
nmap --script-args "userdb=users.txt,passdb=passlist.txt" -p21 ftp.target.com --script ftp-brute
nmap -p445 --script smb-enum-users,smb-enum-shares --script-args smbuser=admin,smbpass=password 192.168.1.100
nmap -p80 --script http-form-brute --script-args http-form-brute.hostname=target.com,http-form-brute.path=/login,http-form-brute.uservar=username,http-form-brute.passvar=password,http-form-brute.failmsg="invalid login" 192.168.1.1
```

### Vulnerability Scanning Scripts

```bash
nmap --script vuln 192.168.1.1
nmap -sV --script vulners 192.168.1.1
nmap -p80 --script http-vuln-cve2015-1635 192.168.1.1
nmap -p80 --script http-vuln-cve2017-5638 192.168.1.1
nmap -p80 --script http-vuln-cve2017-1001000 192.168.1.1
```

### Output Options

```bash
-oN <file>                           # Normal output
-oX <file>                           # XML output
-oG <file>                           # Grepable output
-oA <prefix>                         # All formats
--append-output                     # Append to file
-oG -                                # Output to screen (also -oN -, -oX -)
```

### Scan Output Analysis & Tips

```
- Look for open ports with services you can enumerate (e.g., HTTP, SMB, FTP).
- Closed ports still respond; filtered ports are likely firewalled.
- Combine `-sV` and `-A` to gather banners and OS info.
- Use `--reason` to understand why a port is marked as open/closed.
- Save all scans using `-oA` for later grep/parse.
- Use `grep open` or tools like `grepable`, `xsltproc`, or `nmaptocsv` to filter output.
```

> **Reference:** [StationX Nmap Cheat Sheet](https://www.stationx.net/nmap-cheat-sheet/)

---

## 5. Protocol Scan — NSE Scripts by Service

Organized Nmap NSE scripts grouped by protocol/service for deep enumeration. Replace `<target>` with the target IP/hostname.

### Authentication & Identity

#### LDAP (389, 636)

```bash
nmap -p 389,636 --script=ldap* <target>
nmap --script "(ldap*) and not brute" -p 389 <target>
nmap -p 636 --script=ldap-search,ldap-rootdse <target>
```

#### Kerberos (88)

```bash
nmap -p 88 --script=krb5-enum-users --script-args="krb5-enum-users.realm='DOMAIN.LOCAL'" <target>
nmap -p 88 --script=krb5-info <target>
```

#### SMB (139, 445)

```bash
nmap -p 139,445 --script=smb-enum-shares,smb-enum-users,smb-os-discovery,smb-security-mode,smb2-capabilities,smb2-security-mode <target>
nmap --script smb-vuln* -p 445 <target>
nmap -p 445 --script=smb-null-session <target>
```

#### RDP (3389)

```bash
nmap -p 3389 --script=rdp-enum-encryption <target>
nmap -p 3389 --script=rdp-vuln-ms12-020 <target>
nmap -p 3389 --script=rdp-ntlm-info <target>
```

#### WinRM (5985, 5986)

```bash
nmap -p 5985,5986 --script=http-windows-enum <target>
nmap -p 5985,5986 --script=winrm-enum-users <target>
```

### Network Services

#### FTP (21)

```bash
nmap -p 21 --script=ftp-anon,ftp-bounce,ftp-syst,ftp-vsftpd-backdoor,ftp-proftpd-backdoor,ftp-libopie <target>
```

#### SSH (22)

```bash
nmap -p 22 --script=ssh-hostkey,ssh-auth-methods,sshv1,ssh2-enum-algos,ssh-brute <target>
```

#### Telnet (23)

```bash
nmap -p 23 --script=telnet-encryption,telnet-ntlm-info <target>
```

#### SMTP (25, 465, 587)

```bash
nmap -p 25,465,587 --script=smtp-commands,smtp-enum-users,smtp-open-relay,smtp-ntlm-info <target>
```

#### DNS (53)

```bash
nmap -p 53 --script=dns-zone-transfer,dns-nsid,dns-service-discovery,dns-recursion,dns-cache-snoop,dns-random-srcport <target>
```

#### TFTP (69)

```bash
nmap -sU -p 69 --script=tftp-enum <target>
```

#### POP3 (110, 995)

```bash
nmap -p 110,995 --script=pop3-capabilities,pop3-brute <target>
```

#### IMAP (143, 993)

```bash
nmap -p 143,993 --script=imap-capabilities,imap-brute <target>
```

#### SNMP (161, 162)

```bash
nmap -sU -p 161,162 --script=snmp-info,snmp-interfaces,snmp-processes,snmp-win32-services,snmp-brute,snmp-sysdescr <target>
```

#### R-Services (512, 513, 514)

```bash
nmap -p 512,513,514 --script=rpcinfo <target>
```

#### IPMI (623)

```bash
nmap -p 623 --script=ipmi-version,ipmi-cipher-zero <target>
```

#### RSync (873)

```bash
nmap -p 873 --script=rsync-list-modules <target>
```

#### MSSQL (1433, 1434, 2433)

```bash
nmap -p 1433,1434,2433 --script=ms-sql-info,ms-sql-empty-password,ms-sql-dump-hashes,ms-sql-brute,ms-sql-config <target>
```

#### Oracle TNS (1521)

```bash
nmap -p 1521 --script=oracle-tns-version,oracle-sid-brute <target>
```

#### NFS (2049)

```bash
nmap -p 2049 --script=nfs-ls,nfs-statfs,nfs-showmount,nfs-acls <target>
```

#### MySQL (3306)

```bash
nmap -p 3306 --script=mysql-info,mysql-users,mysql-databases,mysql-empty-password,mysql-query,mysql-brute,mysql-dump-hashes <target>
```

#### PostgreSQL (5432)

```bash
nmap -p 5432 --script=pgsql-brute,pgsql-databases,pgsql-users <target>
nmap -p 5432 --script=pgsql-enum <target>
```

#### PostgreSQL Secure (5433)

```bash
nmap -p 5433 --script=pgsql-info <target>
```

#### NetBIOS (137, 138)

```bash
nmap -p 137,138 --script=nbstat,smb-os-discovery,smb-enum-shares,smb-enum-users <target>
```

#### VNC (5900)

```bash
nmap -p 5900 --script=vnc-info,vnc-title,vnc-brute <target>
```

#### Redis (6379)

```bash
nmap -p 6379 --script=redis-info,redis-brute <target>
```

#### Elasticsearch (9200)

```bash
nmap -p 9200 --script=http-elasticsearch-head,http-title,http-methods,http-headers <target>
```

#### Memcached (11211)

```bash
nmap -p 11211 --script=memcached-info <target>
```

#### RPCBind (111)

```bash
nmap -sU -sT -p 111 --script=rpcinfo <target>
```

#### SIP (5060)

```bash
nmap -sU -p 5060 --script=sip-methods,sip-enum-users <target>
```

#### MQTT (1883)

```bash
nmap -p 1883 --script=mqtt-subscribe,mqtt-connect <target>
```

#### RMI (1099)

```bash
nmap -p 1099 --script=rmi-dumpregistry,rmi-vuln-classloader <target>
```

#### NTP (123)

```bash
nmap -sU -p 123 --script=ntp-info,ntp-monlist <target>
```

#### Docker (2375)

```bash
nmap -p 2375 --script=docker-version <target>
```

#### RabbitMQ (5672)

```bash
nmap -p 5672 --script=rabbitmq-info <target>
```

#### Jenkins (8080)

```bash
nmap -p 8080 --script=http-jenkins-info,http-headers,http-title <target>
# Common Vulnerabilities: Anonymous Access, Script Console Exposure
```

#### AJP — Apache JServ Protocol (8009)

```bash
nmap -p 8009 --script=ajp-methods,ajp-headers,ajp-auth <target>
# Common Exploit: Ghostcat CVE-2020-1938 (File Inclusion via AJP)
```

#### Kubernetes API Server (6443)

```bash
nmap -p 6443 --script=http-kubernetes-info,http-headers,http-title <target>
# Check for: Unauthorized access, misconfigured kubelet, exposed dashboard
```

#### CouchDB (5984)

```bash
nmap -p 5984 --script=http-couchdb-info,http-title,http-headers <target>
# Common Exploits: CVE-2017-12635 & CVE-2017-12636 (Remote Code Execution)
```

#### VMware (902, 903, 443)

```bash
nmap -p 902,903,443 --script=vmware-version <target>
```

#### TeamViewer (5938)

```bash
nmap -p 5938 --script=teamviewer-info <target>
```

#### Bacula (9101)

```bash
nmap -p 9101 --script=bacula-info <target>
```

#### X11 (6000)

```bash
nmap -p 6000 --script=x11-access <target>
```

### Web Services

#### Web Services (80, 443, 8080, 8443)

```bash
nmap -p 80,443,8080,8443 --script=http-title,http-methods,http-enum,http-headers,http-server-header,http-auth-finder,http-vuln* <target>
```

#### WebDAV (80, 443, 8080)

```bash
nmap -p 80,443,8080 --script=http-webdav-scan <target>
```

#### Apache Hadoop (50070)

```bash
nmap -p 50070 --script=http-hadoop-info <target>
```

#### Tomcat (8080, 8443)

```bash
nmap -p 8080,8443 --script=http-tomcat-manager,http-tomcat-users <target>
```

#### Zookeeper (2181)

```bash
nmap -p 2181 --script=zookeeper-info <target>
```

#### Kafka (9092)

```bash
nmap -p 9092 --script=kafka-info <target>
```

#### Varnish (6081)

```bash
nmap -p 6081 --script=http-headers,http-title <target>
```

### Other Useful Nmap Scripts

#### Common Nmap Automation & Misc Scripts

```bash
nmap --script=default,safe <target>
nmap -p- --min-rate=10000 -T4 <target>  # Fast full port scan
nmap -sV --version-all -p <port> <target>  # Aggressive service detection
nmap -sC -sV <target>  # Default scripts and version detection
nmap -Pn -n -sS -p- -T4 <target>  # Stealth SYN scan without DNS resolution
```

#### Brute Force

```bash
nmap -p 21,22,23,25,80,110,143,443,3306,5432,6379,8080 --script brute <target>
```

#### Vulnerability Detection

```bash
nmap --script vuln <target>
nmap -p 80,443 --script=http-vuln* <target>
nmap -p 445 --script=smb-vuln* <target>
```

#### Web Technologies & Frameworks

```bash
nmap -p 80,443 --script=http-headers,http-title,http-methods,http-enum,http-php-version,http-aspnet-debug,http-wordpress-enum,http-drupal-enum <target>
```

---

## 6. Automation Tools & Finding Exploits

### Automation Tools

#### AutoRecon

```bash
autorecon IP
```

#### NmapAutomator

```bash
./NmapAutomator.sh IP All
```

### Finding Exploits

```bash
# Search on EDB and searchsploit
# Check each service on CVE details for RCE / LFI / RFI / SQLI issues 
# Google search the with the service banner 
searchsploit apache 2.4.49
searchsploit -x path/to/exploit
```

---

## Quick Reference: Common Port → Service Map

| Port(s) | Protocol/Service | Key Enumeration Notes |
|---------|------------------|----------------------|
| 21 | FTP | Anonymous login, read/write access, web root |
| 22 | SSH | Version vulns, user enumeration, password login |
| 23 | Telnet | Connect and check service |
| 25, 465, 587 | SMTP | HELO version check, open relay, user enum |
| 53 | DNS | Zone transfer, may indicate DC |
| 69 | TFTP | Read system files, MSSQL password mdf |
| 88 | Kerberos | Indicates Domain Controller |
| 110, 995 | POP3 | Telnet connect, list/retrieve emails |
| 111 | RPCBind | rpcinfo |
| 135 | RPC | rpcinfo, rpcclient null session |
| 137, 138 | NetBIOS | nbstat, SMB enumeration |
| 139, 445 | SMB | Null sessions, shares, vuln scripts |
| 143, 993 | IMAP | Capabilities, brute |
| 161, 162 | SNMP | snmpwalk, community strings |
| 389, 636, 3268, 3269 | LDAP | ldap-search, rootdse |
| 443 | HTTPS | Web enum, certificates |
| 623 | IPMI | ipmi-version, cipher-zero |
| 873 | RSync | List modules |
| 1099 | RMI | Dump registry, classloader vuln |
| 1433, 1434, 2433 | MSSQL | Empty password, dump hashes, brute |
| 1521 | Oracle TNS | TNS version, SID brute |
| 1883 | MQTT | Subscribe, connect |
| 2049 | NFS | showmount, mount shares |
| 2181 | Zookeeper | Info |
| 3306 | MySQL | Empty password, dump hashes, brute |
| 3389 | RDP | Encryption enum, MS12-020, NTLM info |
| 5060 | SIP | Methods, user enum |
| 5432, 5433 | PostgreSQL | Brute, databases, users |
| 5672 | RabbitMQ | Info |
| 5900 | VNC | Info, title, brute |
| 5984 | CouchDB | CVE-2017-12635/12636 RCE |
| 5985, 5986 | WinRM | Windows enum, user enum |
| 6000 | X11 | x11-access |
| 6379 | Redis | Info, brute |
| 6443 | Kubernetes | Unauthorized access, kubelet, dashboard |
| 8009 | AJP | Ghostcat CVE-2020-1938 |
| 8080 | Jenkins/Tomcat | Anonymous access, manager, users |
| 8443 | Tomcat (SSL) | Manager, users |
| 902, 903 | VMware | Version |
| 9101 | Bacula | Info |
| 9200 | Elasticsearch | Head, title, methods, headers |
| 11211 | Memcached | Info |
| 2375 | Docker | Version |
| 50070 | Hadoop | Info |
| 5938 | TeamViewer | Info |
| 6081 | Varnish | Headers, title |
| 9092 | Kafka | Info |

---

## Suggested Workflow

1. **Host Discovery** — `nmap -sn`, `fping`, `arp-scan -l`
2. **TCP Quick Scan** — `sudo nmap -Pn -v -sS -sV -sC -oN tcp-quick.nmap IP`
3. **TCP Full Scan** — `sudo nmap -Pn -sS --stats-every 3m --max-retries 1 --max-scan-delay 20 --defeat-rst-ratelimit -T4 -p1-65535 -oN tcp-full.nmap -sV IP`
4. **UDP Quick Scan** — `sudo nmap -Pn -v -sU -sV --top-ports=30 -oN udp-quick.nmap IP`
5. **Per-Service Enumeration** — Use the Protocol Scan NSE scripts section for each open port
6. **Web Enumeration** — `gobuster`, `dirb`, `nikto`, `whatweb`, `wpscan`, Nmap HTTP NSE scripts
7. **Vulnerability Scanning** — `nmap --script vuln`, `searchsploit`, manual CVE checks
8. **Document Everything** — Save all output with `-oA`, take notes on errors, hidden params, and observations

> **Reminder:** Always operate within scope and with explicit authorization. Reconnaissance against unauthorized targets is a crime in most jurisdictions.
