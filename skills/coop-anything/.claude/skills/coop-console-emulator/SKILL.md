---
name: coop-console-emulator
description: Make a console game (PS1, PS2, N64, GameCube, Wii, GBA, ...) co-op through emulators: netplay for games with local multiplayer, memory-sync mods between two emulator instances for single-player games, network adapter emulation for games with online modes.
---

# Console co-op through emulators

1. Check first whether the game has a PC version, a PC port from a decompilation, or a static recompilation (`coop-decomp-port`). Native code beats emulation for co-op.
2. Game already has local or split-screen co-op: use the emulator's netplay (inputs are synced, both emulators must run the same build, ROM or ISO and settings). Remote play (Parsec, Steam Remote Play Together) is the fallback.
3. Game has an online or LAN mode: emulate the network adapter and look for a revival server.
4. Single-player only: build a memory-sync mod. An external program reads and writes the RAM of two emulator instances through the emulator's interface (Lua scripting, IPC such as PCSX2 PINE, Dolphin memory access) and syncs flags, items, positions and enemies with a host-authority model. Study existing ones (Z64Online on ModLoader64, Archipelago clients) first.
5. Map the game's RAM (cheat databases, existing trackers and randomizers are a goldmine), decide what is shared and per player, then show player 2 (a puppet actor or a marker).
6. Test with two emulator instances on one PC, with lag and loss emulation (`coop-qa`).
7. Never share ROMs, ISOs or BIOS files; everyone dumps their own.

Details: `playbook/console-emulators.md`.
