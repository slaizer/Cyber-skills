# Deus Ex (2000)

| | |
|---|---|
| Engine | Unreal Engine 1 (Deus Ex build 1112fm) |
| Versions tested | Steam Game of the Year Edition |
| Projects | HX 0.9.89.4 (Hanfling, 2019) plus HXFix and HXCoop: https://github.com/cranebeaker/deus-ex-coop |
| QA level | automated |
| Last updated | 2026-10-16 |

## Where things stand

The full campaign is playable in co-op with HX plus the HXFix package. 40+ automated
tests with real game clients pass, including runs through a Steam relay with
simulated lag and packet loss.

## Existing work

- **HX** by Sebastian Kaufel (Hanfling): co-op conversion of the whole campaign on Deus
  Ex's own multiplayer netcode. Last build 0.9.89.4 (June 2019) on
  https://builds.hx.hanfling.de/testing/ (newer than the release page). Development stopped
  while known co-op bugs remained.
- Older Deus Ex co-op patches covered single maps only.
- The Deus Ex Community HQ Discord hosts HX discussion; Die4Ever's deus-ex-randomizer has
  an HX variant.

## How the game works (for co-op)

- Game logic is UnrealScript in `.u` packages; the engine has client/server replication,
  so HX makes the single-player logic (conversations, missions, flags, travel) run on the
  server and replicate.
- HX ships `HX.u` (960 classes, about 120k lines) and a closed native `HX.dll`.
  Rebuilding `HX.u` is not possible: the compiler asserts on classes without stored
  script text, and the DLL fixes the memory layout of native classes.
- Scripts were dumped with a small Python package reader; `HX.dll` was decompiled with
  Ghidra headless (2,773 functions, C++ names intact).

## What we changed

A separate package, HXFix, with subclasses swapped in through HX's mutator hooks, a game
type subclass and player class subclasses. Highlights (full list with root causes in
the project's BUGS.md):

- Client crash on map changes (stale Owner pointers before garbage collection).
- Crash when anyone has the inventory screen open during a map change or at exit.
- Ending conversation never started (map name compared against "NOTHING").
- Players dead at a map change arrived with 0 HP and no gear.
- Notes (door codes) wiped on every map change.
- Conversations controllable by any player; forced conversations dropping each other.
- Microfibral Muscle aug, Use Cell, weapon mods, ammo selection and Change Ammo for
  joined players; nanokey checks in datalinks on clients.
- Mission script bugs in missions 2, 3, 4, 5, 9, 10 and 15.
- Server query runaway loop that could lock the server.
- HXCoop: Steam relay (AppID 480) so nobody needs an IP or port forwarding.

## QA

- Harness: a listen host plus 1 or 2 real clients on one PC, a test actor selected by
  URL option, and a per-player driver that makes clients run console commands so real
  client to server RPCs are exercised. A launcher prints PASS/FAIL and fails on client
  crashes (it reads the crash dialog text).
- Variants: through HXCoop with a mock `steam_api.dll`; with `PktLag`/`PktLoss`
  emulation; with a client install that lacks HXFix (checks the auto-download).
- Every fix was checked to fail with the fix turned off.

## How to play

See https://github.com/cranebeaker/deus-ex-coop (installer downloads HX from its
official server, then host with 1, join with 2).

## Next steps

- A full automated campaign run: travel through every map in order with 2 clients.
- Post the fixes to the HX community and ask about upstreaming.
