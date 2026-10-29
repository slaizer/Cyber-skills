---
name: coop-triage
description: Start here for any game. Identify the exact game build and engine, check the coop-anything directory and existing work, and choose a path: finish an existing co-op mod or build co-op from zero.
---

# Co-op triage

1. Record identity in `local/identity.md`: title, store, version or build id, SHA-256 of the main exe, engine, OS.
2. Look up the game in `DIRECTORY.md` and `games/`. Run `gh issue list --search "<game>"` and `gh pr list --search "<game>"`.
3. Identify the engine from the install (file extensions, DLL names, exe version info). Check `playbook/engine-families.md` for sibling games with co-op work.
4. Check how much source exists: open source port or decompilation, shipped script source, script extender, or closed binary only.
5. Check whether the engine already has multiplayer netcode (a deathmatch mode means replication exists).
6. Decide and tell the owner:
   - existing mod that is buggy or abandoned: use the `coop-revive` skill;
   - nothing usable: use `coop-build-from-zero`.
7. Open a "claim a game" issue draft for the owner.

Details: `playbook/triage.md`.
