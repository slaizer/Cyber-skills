# The Legend of Zelda: Ocarina of Time (1998)

| | |
|---|---|
| Engine | Ship of Harkinian (native PC port from the decompilation, libultraship) |
| Versions tested | Builds from N64 NTSC 1.0 (US), SHA-1 ad69c91157f6705e8ab06c79fe08aad47bb57ba7. Windows 11, VS 2022 v143, Debug build |
| Projects | Anchor (Ship of Harkinian co-op, merged upstream 2025-11); OOT True Co-op (enemy sync fork); Shipwright-Online (host-authority fork); [ocarina-coop](https://github.com/cranebeaker/ocarina-coop) (fixes on top of Shipwright-Online) |
| QA level | community-reports (Anchor); none (forks, including ocarina-coop) |
| Last updated | 2026-10-16 |

## Where things stand

Anchor syncs players, inventory and world flags, but each player fights their own copy of
the enemies. Shipwright-Online goes further (host authority for enemies, bosses, switches,
boulders, songs) and lists its own known bugs (in German). ocarina-coop continues it:
fixes for those bugs and for gaps found in sweeps of the later dungeons. None of it has been
played by two people yet, so nobody can say how far a co-op run gets today.

## Existing work

- **Anchor**: https://github.com/garrettjoecox/anchor (server),
  client in https://github.com/HarbourMasters/Shipwright/tree/develop/soh/soh/Network/Anchor.
  The server is a generic relay: packets with a `targetClientId` go to that client, team
  packets to the team, everything else is broadcast to the room (see `client.go`). So forks
  can add their own packet types without changing the server.
- **OOT True Co-op**: https://github.com/bghill95/OOT-True-Co-op (enemy and boss authority).
- **Shipwright-Online**: https://github.com/fReEsPiRiT-Spiritsoft/Shipwright-Online. Fork of
  SoH 9.2.3, about 480 commits behind upstream at check time. Authority per room
  ("roommaster") is negotiated between clients with `ROOM_MASTER_ASSIGN` packets, not by the
  server.

## How the game works (for co-op)

- Every player runs the full game. Actors (enemies, switches, platforms) live in the
  current room; the decomp sources for each are in `soh/src/overlays/actors/ovl_*/`.
- Persistent progress is in scene flags (switch, clear, chest, collect) and save-context
  flags. Anchor hooks `OnFlagSet` / `OnSceneFlagSet` and sends them both ways. Most dungeon
  progression already rides on that.
- What does not ride on flags is the trouble: actor-internal state (a switch's animation,
  a boss's action function, water level actors, multi-frame enemy deaths) and cutscenes.
- Shipwright-Online freezes non-authority actors with `ShouldActorUpdate` hooks and streams
  their positions. Side effects of that freeze explain several bugs, for example water level
  actors that never move on the non-authority client.

## What we changed

Each item: bug, root cause from code, fix. Tests: compile only (see QA).

- **Eye, floor and crystal switches one way only:** the flag arrived but an already open
  switch actor never re-read it. The fix re-runs the switch's own state transition when a
  remote flag change arrives.
- **Cutscene never ends for one player:** actor-driven cutscenes started on one client had
  no release path on the others. Added a client watchdog that releases orphaned cutscenes.
  Scripted cutscenes (index 0xFFF0 and above) are not covered yet.
- **Night enemies inconsistent:** the host's night flag is now part of time sync, and client
  damage routing waits until the room owner is present.
- **Water levels:** Deku Tree, Lake Hylia and Water Temple water actors run locally instead
  of frozen, with a global Water Temple level event.
- In progress: boss death sequences for all bosses (the existing Gohma fix looks like dead
  code), King Dodongo action sync (its action choice can be traced in the decomp, contrary
  to the upstream note), Deku Tree enemy kill pipeline, multi-frame enemy deaths (Lizalfos,
  Dodongos), bombable walls and bomb flowers, and gaps from the Forest/Fire/Water, Shadow/
  Spirit/Well/Ice/GTG and Ganon's Castle/overworld sweeps.

## QA

- Each fix compiles in the full Debug build. A reviewer agent read each commit for desyncs,
  echo loops, crashes and single-player regressions.

## How to play

No release yet. When it lands: download the zip from
[ocarina-coop Releases](https://github.com/cranebeaker/ocarina-coop/releases), run
`Play Co-op.bat`, enter a name and room code, and pick your own ROM on first launch.

## Known issues

- Scripted cutscenes can leave one player waiting; teleporting to the room owner from the
  network menu unsticks it.
- The fork is behind upstream Ship of Harkinian, so recent upstream fixes are missing.

## Notes for the next agent

- Building on Windows: if `CMAKE_TOOLCHAIN_FILE` points at an Android NDK in your
  environment, unset it before configuring. A parallel Debug build needs about 15 GB of disk
  and can run the compiler out of heap; `-m:1 -p:CL_MPCount=4` worked.
- Build the two-client harness first. Two SoH windows on one PC against a local Anchor server
  (`go run .` or the nightly exe) is the obvious setup.
