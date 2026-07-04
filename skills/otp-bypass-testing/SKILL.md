---
name: otp-bypass-testing
description: Test web/mobile applications for OTP (One-Time Password) bypass vulnerabilities across registration, login, password-reset, 2FA, and transaction-confirmation flows. Use when the user is performing authorized pentesting, bug bounty triage, CTF challenges, or building detections/WAF rules against OTP abuse. Covers OTP reusability, delivery-channel exploitation, implementation logic flaws, response manipulation, and brute-force / rate-limit failures.
---

# OTP Bypass Testing

Use this skill ONLY for authorized testing (engagement scope, lab, CTF, your own accounts) or defensive work (rate-limit tuning, fraud detection, code review). If scope is unclear, ask the user to confirm authorization before generating payloads against a live target. Never test OTP flows of accounts you do not own without written permission — most jurisdictions treat this as unauthorized access.

## Where OTP bypasses live

OTPs gate sensitive transitions: signup verification, login (2FA), password reset, email/phone change, fund transfer, KYC. Every one of those flows is a candidate sink. The bug is rarely in the OTP value itself — it is in the surrounding state machine.

## Workflow

1. **Map the flow end-to-end** with a proxy (Burp/ZAP/mitmproxy). Capture every request from "request OTP" to "OTP accepted." Note the endpoints, parameters, tokens (session, CSRF, state, transaction_id), and any client-side flags (`verified=false`, `step=2`).
2. **Identify the verification endpoint** — usually `/verify-otp`, `/confirm`, `/2fa/validate`, `/reset/check`. This is where most bugs land.
3. **Run the five-category check** below. Stop at the first confirmed bypass; record the minimal PoC.
4. **Grade impact** — account takeover, auth bypass, mass enumeration, fraud, or merely DoS / cost-amplification (SMS pumping).

## The five categories

Work them in this order — cheapest checks first.

### 1. Response Manipulation
The server tells the client "OTP wrong." The client decides what to do with that. If the decision is client-side, flip the response.

- Intercept the verification response. Try changing:
  - `{"success":false}` → `{"success":true}`
  - `{"status":"error"}` → `{"status":"ok"}` or `"verified"`
  - HTTP `401`/`400` → `200`
  - `{"otpValid":false}` → `{"otpValid":true}`
- See [references/response-manipulation.md](references/response-manipulation.md) for the full pattern list and tooling (Burp Match-and-Replace, ZAP Break, mitmproxy script).

### 2. OTP Reusability
The server should invalidate an OTP the moment it's consumed (or expired, or a new one is issued). Often it doesn't.

- Request OTP → use it → log out → request a **new** OTP → submit the **old** one. Accepted? Bug.
- Request OTP for victim → request OTP for attacker (different account/session) → submit attacker's OTP in victim's verify request. Accepted? Cross-account reuse.
- Use the same OTP twice in two parallel verify requests (race).
- See [references/otp-reusability.md](references/otp-reusability.md) for the full matrix (old-after-new, cross-flow, cross-user, expired-still-valid, race).

### 3. Implementation Flaws (Logic Vulnerabilities)
The state machine has a step the server forgot to enforce.

- Skip the verify step entirely: hit the post-OTP endpoint (`/reset/set-password`, `/login/complete`) directly with the transaction token from step 1.
- Swap user identifier mid-flow: request OTP for `victim@x.com`, then on the verify call change `email` / `userId` / `phone` to attacker's, submit attacker's OTP. Many backends validate the OTP against whatever account the OTP was issued for, then act on whatever account the request names.
- Mass-assignment: add `verified:true`, `mfa_passed:true`, `phone_verified:1` to the verify request body.
- Force-browse: navigate directly to the post-2FA URL after submitting only username/password.
- HTTP method swap: `POST /verify` → `GET /verify?otp=...` sometimes skips checks.
- See [references/implementation-flaws.md](references/implementation-flaws.md).

### 4. Brute-Force & Lack of Rate Limiting
4–6 digit OTPs = 10^4 to 10^6 keyspace. Without rate limiting, brute force is hours not centuries.

- Submit 20 wrong OTPs in sequence — does request 21 still return the same "wrong code" error, or does it lock? No lock = bruteforceable.
- Try parallel requests (Burp Intruder with 50 threads, Turbo Intruder for HTTP/2 last-byte sync).
- Bypass per-account counters: rotate `X-Forwarded-For`, `User-Agent`, session cookie, or use the password-reset flow that re-issues a fresh transaction token each time (counter resets).
- Issue many OTPs in quick succession — some backends accept *any* OTP issued in the last N minutes, so brute-force × N codes simultaneously valid.
- See [references/brute-force.md](references/brute-force.md) for Intruder configs, sync techniques, and counter-bypass tricks.

### 5. Delivery Channel Exploitation
The OTP travels somewhere before the user types it. Anywhere it travels is an attack surface.

- **Response body leakage**: check the OTP-request response — `{"otp":"482913","sent":true}` happens. Check headers, debug fields, GraphQL errors, redirect URLs.
- **Channel swap**: request OTP `via=email`, change to `via=sms` with attacker's phone, or vice versa.
- **Recipient injection**: `phone=+1victim,+1attacker` (CSV/SS7 quirks), or change the recipient field at the OTP-issue step.
- **SMS pumping / cost abuse**: spam OTP-issue endpoint with premium-rate numbers (report as abuse, not as ATO).
- **Predictable OTPs**: timestamp-seeded, sequential, or based on `user_id` — collect 5–10 and check for patterns.
- **Side channels**: push-notification preview, voicemail transcription, password-manager leakage, SIM-swap (out of scope for most pentests, in scope for fraud assessments).
- See [references/delivery-channel.md](references/delivery-channel.md).

## Confirmation rules

- A `200 OK` is not proof. Proof is reaching the **next** authenticated state (session cookie set with elevated scope, password actually changed, transfer actually posted). Verify with a follow-up authenticated request.
- Use **two accounts you own** for cross-user tests. Never use a real victim.
- For brute force, stop at the first hit — do not enumerate further codes.

## Detection-engineering use (blue team)

Invert the workflow:
- Alert on >N verify-OTP failures per account / per IP / per device-fingerprint within a sliding window (typical: 5 in 10 min).
- Alert on OTP issued for account A used to authenticate session for account B (mismatch between `otp.subject` and `session.user`).
- Alert on verify-OTP `success=true` for an OTP whose `issued_at` is older than the configured TTL — indicates broken expiry logic.
- WAF / API-gateway rule: reject verify-OTP responses where the response body contains the OTP value that was just submitted (leak indicator).
- Log every OTP issuance with `{user_id, channel, recipient, ip, ua}` and flag mismatched recipient changes mid-flow.

## Out of scope for this skill

- Targeting OTP flows of accounts the user does not own or have written authorization to test.
- SIM-swap, SS7, or telco-side attacks (carrier-level, not app-level).
- Mass SMS-pumping against production endpoints — report the vector, do not weaponize it.
- Phishing pages that capture OTPs from real users.
