# Mining a mod's Discord for bug reports

Source project: Shadow of COOP, a STALKER co-op mod on the xrMPE engine. The mod's developers had moved on, and the only living record of known bugs, workarounds and "which build is current" was a support channel on its Discord. This page records what was done and what went wrong.

## Risk note

Exporting a channel in "user" mode uses your own account token with a third-party tool. That's against Discord's terms, so you're taking the risk by using it, but in practice bans for a one-off export are essentially uncommon. A token is a full login, so handle it carefully (see below).

## What was actually done

- **Tool:** DiscordChatExporter, command line build (`DiscordChatExporter.Cli`, Windows x64 zip from the project's GitHub releases page). It is a .NET application, so the machine needs a .NET runtime unless you use the self-contained build. The author's own README documents how the token is obtained; this page deliberately does not repeat that.
- **Who ran it:** the human, not the agent. The agent's safety layer blocked the agent from setting up a bulk scraper of other people's messages, and the right response was not to work around the block. The agent wrote the exact command and a helper script, and the human ran it in their own terminal. The agent then read the resulting file.
- **Token handling, in general terms:**
  - The token went only into the exporter's process, via an environment variable (`DISCORD_TOKEN`) that the tool reads, never on the command line (command lines end up in shell history).
  - The helper `.bat` prompted for the token at run time and cleared it when the window closed. A token is never written into a script, a config file, a repo or an agent transcript.
  - The token must not be pasted into the agent chat. In this project it was pasted once by mistake. The correct response is to treat it as burnt: change the account password (which invalidates the token), then obtain a new one.
- **Channel selection:** enable Developer Mode in Discord settings, right-click the target channel, "Copy Channel ID". For a forum channel you can copy a single post's thread ID instead. Pick the one support or bug channel, not the whole server. A narrower export is faster, smaller and collects fewer strangers' messages.
- **Command shape:** `DiscordChatExporter.Cli export -c <channel id> -f <format> -o <output dir>` plus these options when needed:
  - `--include-threads All` for forum channels (without it a forum export contains only the header). If the option is rejected, drop it, or export threads one by one by their thread IDs. The helper script retried without it automatically.
  - `--after <date>` to start at the release you care about (here: the day the latest build came out), which removed months of old chatter.
- **Formats:** `PlainText` (a `.txt`) was used and worked best for an agent: roughly 700 messages came out as about 3,100 lines, small enough to read in two pages. `Json` is better when you want to script (filter by author, count, join threads), at the cost of much more noise per message. `HtmlDark`/`HtmlLight` are for humans, and `Csv` is for spreadsheets. Attachments are not downloaded unless you ask for media; you rarely need them.

## From export to bug list

1. **Copy the file to a simple path** (short ASCII name, in the agent's scratch folder). Default filenames contain the server name, channel name and IDs, with spaces and brackets that trip up shell tools.
2. **Count first.** Line count and date range, so you know how much there is and whether the export covers the period you want.
3. **Read it in pages, not in one giant read.** The reader tool has a token cap per call; read with offset and limit (about 1,700 lines per page worked) and do not answer from the first page alone when the file is longer. Use grep for precision once you know the vocabulary (error names, "crash", "fix", version numbers, "download", "link").
4. **Translate while summarizing.** The channel here was entirely in Russian. The agent read it directly and wrote the summary in English. Keep original technical strings (error text, file names, console commands) untranslated, because those are what you search for later.
5. **Structure the summary the same way every time:**
   - status of the mod (what the newest build is, whether the developers are active, what the latest fix list says);
   - **bug list** with symptoms, exact error text, and how many people reported it;
   - **workarounds** (settings, files to delete, launch flags) with the original wording nearby;
   - download mirrors and where the official file lives;
   - answers to recurring setup questions (difficulty, admin commands, ports, language).
6. **Separate claims from verified facts.** A moderator saying "this is the new version" is a claim. Check the file itself (size, hash, dates inside the archive, version string in config) before writing it into a guide. In this project the launcher did not update its version number, so "7.0" and "8.0" referred to the same files.
7. **Treat links in an export as untrusted.** Third-party file mirrors posted in chat can be anything. Scan them, prefer the official link, and say in the playbook which link is unofficial.
8. **Feed findings into tests.** Each reported crash string (for example a missing shader or model error) became a boot test run against every level, instead of staying a line in a notes file.

## Pitfalls

- **The agent may refuse to scrape**, rightly. Do not argue with it or try to get the same result through another route. Run the tool yourself, or use the manual paste route.
- **Token in chat.** Never. If it happens, rotate it right away.
- **Forum channels exporting empty.** Needs `--include-threads` or per-thread IDs.
- **Huge exports.** Always bound by date and by channel. A year of a busy server is unreadable and mostly irrelevant.
- **Personal data.** An export contains strangers' names, handles and messages. Do not copy handles, user IDs, invite links or message links into public docs. Summarize ("a player reported..."), keep the raw file out of any repository, and delete it when finished.
- **Stale truth.** Chat is full of confident wrong answers that were corrected three messages later. Prefer the last statement by a maintainer, and check dates.
- **Rate and size limits.** Very long channels can take a while; run it once, in a window you can leave open, and do not hammer the API with repeated runs.
- **Output folder surprises.** The tool names files after the channel; if you export several channels into the same folder, check the names before you read the wrong file.
