# OTP Reusability

A correctly implemented OTP is **single-use, time-bound, and scoped** to one user, one action, one session. Reusability bugs violate one or more of those properties.

## The reuse matrix

For each cell, request OTP under condition A, attempt to verify under condition B. If accepted, you have a finding.

| # | Issue (A)                                    | Reuse attempt (B)                                | Severity |
|---|----------------------------------------------|--------------------------------------------------|----------|
| 1 | OTP used successfully                        | Resubmit the same OTP after logout / new session | High     |
| 2 | New OTP requested                            | Submit the **previous** (superseded) OTP         | High     |
| 3 | OTP expired (wait past TTL)                  | Submit the expired OTP                           | High     |
| 4 | OTP issued for password-reset flow           | Submit it in the login-2FA flow (same user)      | Critical |
| 5 | OTP issued to victim                         | Submit it on attacker's account (cross-user)     | Critical |
| 6 | OTP issued to attacker                       | Submit it on victim's verify endpoint            | Critical |
| 7 | OTP submitted once successfully              | Submit again in parallel (race condition)        | Varies   |
| 8 | OTP issued, action completed                 | Replay the entire verify request from history    | Medium   |
| 9 | OTP for action X (e.g. add payee)            | Use it to confirm action Y (e.g. transfer)       | Critical |

## Test recipes

### #2 Old-after-new ("OTP rotation failure")
1. Request OTP — receive code `A`.
2. Without using `A`, request OTP again — receive code `B`.
3. Submit `A`. Accepted? Server keeps a list of valid OTPs instead of replacing.
4. Now submit `B`. Both work? Worse — every issued OTP is valid until TTL.

### #4 Cross-flow reuse
The same 6-digit code is sometimes shared across "reset password" and "login OTP" if the backend uses one `otp_codes` table keyed only by `user_id`.
1. Trigger password-reset OTP for your own account.
2. In a separate session, start a login-2FA flow for the same account.
3. At the 2FA prompt, enter the password-reset OTP. Accepted? Cross-flow reuse.

### #5/#6 Cross-user (the high-value one)
1. As attacker, request OTP — receive code `X`.
2. As victim flow (Burp Repeater with victim's transaction_id / session), submit `X` to the verify endpoint.
3. Variant: change the `userId`, `email`, `phone`, or `transactionId` parameter in the verify request to point at the victim while keeping attacker's OTP value.
4. The bug: backend validates `OTP == storedOtp` globally rather than `storedOtp[victimId]`.

### #7 Race condition (TOCTOU)
The verify handler reads the OTP, checks validity, then marks it used. Between read and write, a second request can succeed.
- Burp Turbo Intruder with HTTP/2 "last byte sync" — fire 20 identical verify requests in one packet.
- Useful when verify success grants a one-time benefit (e.g., bonus credit, one-time discount unlock).

### #8 Naive replay
1. Complete a real verify-OTP request, captured in Burp history.
2. After action completes (e.g., password changed), right-click → Send to Repeater → Resend.
3. If the response is still `success`, the OTP record was never invalidated. Combine with a logic bug to re-trigger the gated action.

### #9 Cross-action reuse (banking-specific)
Action-bound OTPs include a transaction context (amount, beneficiary). If the server validates the OTP code but not the bound context:
1. Request OTP for "add beneficiary Alice, ₹100" — receive `Y`.
2. Modify the confirm request to "transfer ₹100,000 to Mallory" but submit OTP `Y`.
3. Accepted? OTP-to-action binding is broken.

## What "invalidated" should mean

After any of these events, the OTP must be unusable:
- Successful verification (consumed).
- TTL elapsed (usually 5–10 minutes).
- New OTP issued for the same `(user, flow)` tuple.
- User logs out, password changes, or session is revoked.
- The bound transaction is canceled.

## Confirming the bug

For cross-user (#5/#6), the proof is logging into the victim's account or performing an action visible only to victim. Use two accounts you own — a primary "attacker" and a secondary "victim" — and verify by reading the second account's data with the first account's OTP.

For race (#7), proof is two state mutations from one OTP (e.g., two password changes logged, two bonus credits applied).

## Defensive note

- Store OTPs in a `(user_id, flow, code_hash, expires_at, consumed_at, transaction_context)` row.
- On issue: invalidate all existing rows for the same `(user_id, flow)` before insert.
- On verify: `SELECT ... WHERE user_id=? AND flow=? AND code_hash=? AND consumed_at IS NULL AND expires_at > NOW() FOR UPDATE` then immediately `UPDATE consumed_at=NOW()` in the same transaction. The `FOR UPDATE` lock is what kills the race.
- For action-bound OTPs, hash the transaction context into the OTP record and verify it matches on consume.
