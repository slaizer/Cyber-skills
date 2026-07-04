# Linux / Unix sensitive-file targets

Ordered roughly by signal-to-noise for confirming an LFI. Use the first few as probes; the rest are for impact escalation once the bug is confirmed.

## Highest-signal probes (always readable, distinctive markers)

| Path | Marker to grep for |
|---|---|
| `/etc/passwd` | `root:x:0:0:` |
| `/etc/hostname` | single hostname line |
| `/etc/issue` | distro banner |
| `/etc/os-release` | `NAME=`, `VERSION_ID=` |
| `/proc/self/status` | `Name:`, `Pid:` |
| `/proc/self/cmdline` | argv of the web process — confirms which app is running |
| `/proc/self/environ` | env vars — often leaks `DB_PASSWORD`, `AWS_*`, secret keys |
| `/proc/version` | kernel string |

## Web server config / logs (impact escalation: log poisoning → RCE)

- `/etc/apache2/apache2.conf`, `/etc/apache2/sites-enabled/000-default.conf`
- `/etc/httpd/conf/httpd.conf`, `/etc/httpd/httpd.conf`
- `/etc/nginx/nginx.conf`, `/etc/nginx/sites-enabled/default`
- `/etc/lighttpd/lighttpd.conf`
- `/var/log/apache2/access.log`, `/var/log/apache2/error.log`
- `/var/log/httpd/access_log`, `/var/log/httpd/error_log`
- `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- `/var/log/auth.log`, `/var/log/secure` (SSH auth → username-injection RCE on PHP includes)

## App / framework secrets

- `.env` in the webroot (Laravel, Rails, Node) — `DB_PASSWORD`, `APP_KEY`, `JWT_SECRET`
- `wp-config.php` (WordPress) — DB creds, AUTH_KEY
- `config.php`, `configuration.php` (Joomla), `sites/default/settings.php` (Drupal)
- `/var/www/html/<app>/config/database.yml` (Rails)
- `/usr/local/etc/php.ini`, `/etc/php/*/fpm/php.ini`
- `/etc/mysql/my.cnf`, `/root/.my.cnf`

## User secrets / lateral movement

- `/root/.bash_history`, `/home/<user>/.bash_history`
- `/root/.ssh/id_rsa`, `/home/<user>/.ssh/id_rsa`, `authorized_keys`
- `/root/.aws/credentials`, `/home/<user>/.aws/credentials`
- `/root/.docker/config.json`
- `/etc/shadow` — only readable as root; success implies the web process runs as root (critical finding on its own)

## Container / cloud

- `/proc/1/cgroup`, `/proc/self/mountinfo` — confirms container, often leaks container ID
- `/var/run/secrets/kubernetes.io/serviceaccount/token` — K8s SA token, full pivot
- `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt`
- `/sys/class/dmi/id/product_uuid` — VM/host fingerprinting

## Process-relative tricks

- `/proc/self/fd/0`..`/proc/self/fd/N` — open file descriptors of the web process
- `/proc/self/maps` — memory layout, reveals loaded binaries and ASLR offsets
- `/proc/<pid>/...` for sibling processes when PID is guessable
