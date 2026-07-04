# Implementation Flaws (Logic Vulnerabilities)

The OTP is correct, fresh, single-use — and the flow still breaks because the state machine is wrong. These are the highest-impact and most under-tested bugs.

## Skip the step entirely

The verify endpoint is a gate. If the next endpoint doesn't check the gate's output, walk around it.

### Recipe: direct access to post-OTP endpoint
1. Complete the flow normally once on your own account. Note every endpoint between "OTP submitted" and "action completed."
2. Start the flow again. After the OTP-issue step, **skip** the verify call.
3. Hit the post-OTP endpoint directly with the transaction token / state from step 1 (`POST /reset/set-password`, `POST /transfer/execute`, `POST /login/finalize`).
4. If accepted: server only checks the token exists, not that it's `verified=true`.

Typical victims:
- Password reset: `POST /reset/set-password` accepts the same `resetToken` issued before OTP verification.
- Signup: `POST /signup/complete` activates the account without `phoneVerified=true` check.
- Banking: `POST /transfer/execute` accepts a `transactionId` whose state is still `PENDING_OTP`.

## Parameter swap mid-flow

The OTP was issued for one user; the verify call names a different user; the backend trusts the verify call's parameter.

### Recipe
1. Request OTP for `attacker@x.com` — backend stores OTP keyed to attacker.
2. Intercept the verify request. Change `email` / `phone` / `userId` / `username` to `victim@x.com`.
3. Submit attacker's OTP value.
4. Some backends do: `if (otp == storedOtp[currentUser]) { login(requestedUser) }` — the lookup uses session, the action uses the request body.

Also try header-based variants:
- `X-User-Id: <victim>` while body says attacker.
- `Authorization: Bearer <attacker_token>` while body's `email` says victim.

## Mass assignment

Add booleans to the request body that the server may bind into the user model.

```
{"otp":"123456","verified":true,"mfa_passed":true,"phone_verified":1,"emailConfirmed":true,"is_active":true,"role":"admin"}
```

Especially common in:
- Rails apps without `strong_parameters` discipline on the user-update path.
- Node/Express apps using `Object.assign(user, req.body)`.
- Any backend where the verify handler also "completes the signup" by copying request fields.

## Method / verb confusion

```
POST /verify-otp     → 401
GET  /verify-otp?otp=123456&email=victim@x.com    → 200 (sometimes)
PUT  /verify-otp     → 200 (caching/proxy bypass)
```
Also try:
- Trailing path tricks: `/verify-otp/`, `/verify-otp/.`, `/verify-otp;.json` — may route to a different (laxer) handler.
- HEAD requests against verify endpoints that record state on read.

## Missing previous-factor check

In a two-factor flow `password → OTP`, the OTP endpoint should refuse if password hasn't been validated for this session.

### Recipe
1. From a brand-new session (no login attempt), call `/verify-otp` directly with any OTP request for a known user.
2. If the endpoint accepts (or even just leaks "wrong code" vs. "no pending OTP"), the factor ordering is unenforced.
3. Combine with a known OTP (from category-1 leak or brute force) to log in without ever submitting the password.

## Force-browsing past the gate

Pure client-side gating:
1. Submit username/password — get a session cookie.
2. The app redirects you to `/2fa`. Instead, navigate to `/account` or `/dashboard` directly.
3. If content loads: server granted session on password alone; OTP was decoration.

This is "Response Manipulation" without even manipulating — the response was never load-bearing to begin with.

## "Remember this device" abuse

The "trust this device" cookie / token bypasses OTP next time. Test:
- Is the trust-token bound to anything (IP, UA, device fingerprint, account)? Steal the cookie from one session, replay from another machine.
- Can you self-issue a trust-token by submitting `rememberDevice=true` in the verify request before OTP succeeds?
- Does trust persist after password change / logout? It shouldn't.

## Transaction-context tampering

For action-bound OTPs (banking, high-value):
1. Initiate "Transfer ₹100 to Alice." Receive OTP.
2. Before submitting OTP, modify the pending transaction in a separate API (`PATCH /transaction/<id>`) to amount=₹100000 or beneficiary=Mallory.
3. Submit OTP. The OTP was bound to the *id*, not the contents — payment goes to Mallory.

## Email/phone change → OTP for new value

A common ATO chain:
1. Compromise victim's session weakly (XSS, stolen token, low-trust device).
2. Initiate "change phone number" → OTP is sent to **new** (attacker-controlled) number.
3. The flow should require OTP to old number first; many require only the new number's OTP.
4. Submit OTP, now attacker's phone is on the account → trigger password reset via SMS → full takeover.

Test the inverse too: "change phone" flow that sends OTP to the *old* number, but the verify endpoint accepts an OTP sent to *any* number on the account.

## State-machine drift

Some flows have hidden internal steps (`step=1,2,3` or `state=INIT,OTP_SENT,VERIFIED,DONE`). Try setting `step` / `state` in the request body to skip ahead. Especially common in:
- React/Next.js apps that POST `currentStep` to the server.
- Workflow engines (Temporal, Step Functions) exposed via thin API wrappers.

## Confirming

Each of these must end with a real privilege boundary crossed:
- Read/write data on an account you do not own.
- Change a credential without proving knowledge of the previous one.
- Move money / make a binding action with no valid OTP for that exact action.

Document the minimal request sequence (3–5 HTTP calls usually) and the resulting state diff.

## Defensive note

- The verify handler must atomically: validate OTP belongs to `(session.user, flow, transaction_id)` AND mark consumed AND emit a short-lived server-signed token that the next endpoint requires.
- Each downstream endpoint validates that token (audience-scoped, single-use, ≤60s TTL).
- Use server-side state machines with explicit transitions; reject any request whose declared step doesn't match the persisted state.
- Strip unknown fields from request bodies (allowlist binding) before they touch user objects.
