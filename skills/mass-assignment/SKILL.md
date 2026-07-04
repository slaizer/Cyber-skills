---
name: mass-assignment
description: Smuggle extra fields (role, isAdmin, balance) into create/update requests when frameworks bind input to model attributes without an allowlist
domain: cybersecurity
subdomain: web-application-security
tags: [mass-assignment, model-binding, privilege-escalation, rails, spring]
version: "1.0"
license: MIT
source: PayloadsAllTheThings/Mass Assignment
---

# Mass Assignment

## Overview
Frameworks that automatically bind request bodies/JSON to ORM model fields (Rails `Model.new(params)`, Spring `@ModelAttribute`, Sequelize `User.create(req.body)`, Django ModelForms) become dangerous when sensitive fields (`is_admin`, `role`, `verified`, `balance`, `tenant_id`) lack `attr_accessible`/strong-params/DTO filtering.

## Discovery
1. Read schema from any leak (Swagger, GraphQL introspection, source code, model files in repos).
2. Probe an update/create endpoint by adding plausible privileged keys:
```json
PATCH /api/users/me
{
  "email":"alice@x.com",
  "isAdmin":true,
  "role":"admin",
  "permissions":["*"],
  "verified":true,
  "tenant_id":1,
  "balance":99999,
  "owner_id":42,
  "credits":1000000
}
```
3. Watch for the field reflected in subsequent GET, or behavioral change (admin pages reachable, etc.).

## Common Hidden Fields by Stack
- **Rails**: `id`, `admin`, `role`, `confirmed_at`, `encrypted_password`, foreign keys.
- **Spring**: any setter on the bound POJO.
- **Express/Mongoose**: every schema field.
- **Django REST framework**: `is_staff`, `is_superuser`, `groups`.

## Nested / Indirect
- Nested resource assignments: `{"profile":{"role":"admin"}}`.
- Polymorphic types: `{"owner_type":"AdminUser","owner_id":1}`.
- JSON merge attacks with prototype pollution chain (`__proto__`).

## Hardening
- **Rails**: strong parameters (`params.require(:user).permit(:email)`).
- **Spring**: DTOs + `@JsonIgnoreProperties` or explicit fields; never bind entities directly.
- **Sequelize**: `fields:` option in `create/update`.
- **DRF**: explicit `fields` on serializer; never `fields="__all__"` on a user-modifiable model.

## References
- `payloadsallthethings/Mass Assignment/README.md`
- OWASP API3:2023 Broken Object Property Level Authorization.
