# REA posts on X (Twitter)

[← Back to the list](../README.md) · [简体中文](x-posts.zh-CN.md)

> This page collects posts on X. Most of them are the author's own account of what they did, they mostly have no public code, and they have not been independently verified. View counts are what was seen on 2026-10-14 and are only a rough guide. The tag for each post's use of REA follows the [main list](../README.md).

## Tested runs and cases

- [Bao Yu (dotey): reverse-engineering the Claude Slides editor](https://x.com/dotey/status/2109151666020794711) - 🇨🇳 Downloads the web build's scripts and stylesheets, has Codex install the REA skill to recover the obfuscated code, then rewrites it into a clear project with Claude Code, with the full steps. The code is in `apps/slides-editor` of [JimLiu/baocut](https://github.com/JimLiu/baocut) (source-available, not open source). 81k views (cases.json, 2026-10-12 snapshot).
- [A.I.Warper](https://x.com/AIWarper/status/2109060856466264566) - Used REA with Opus 5.5 to decompile a Steam game he had bought into C#, running in Unity in under 30 minutes. About 467k views (the figure appears only in this README and is unverified).
- [Vaibhav Sisinty: what people built with it this week](https://x.com/VaibhavSisinty/status/2109618846453977359) - A thread of cases: a Steam game decompiled, the first-gen Apple TV remote, an air-conditioner remote, the LG TV Plex client, and more. Some of the original posts do not name REA and belong to the same "AI reverse engineering" wave.
- [alex funk: 45 minutes to reverse the first-gen Apple TV remote](https://x.com/alexzfunk/status/2108585025205592408) - "software is kinda solved". Makes the Siri Remote work over Bluetooth on Linux, open sourced as [a-funk/open-appleremote](https://github.com/a-funk/open-appleremote). Neither the post nor the README mentions REA.
- [Ilter Canberk: reverse-engineering his own air conditioner](https://x.com/icanberk/status/2109031477484937571) - After reverse-engineering how the air conditioner is controlled, he vibe coded a small menu-bar app and later ported it to smart glasses with Codex. The original post does not mention REA; a separate relayed account ([air conditioner and AR glasses](https://x.com/justhalfbit/status/2109524402765488499)) says REA was used. The two accounts disagree, so it is tagged Claim?.
- [PlxNative: a native Plex client for LG TVs](https://github.com/GLinnik21/plx-native) (relayed by [Vaibhav Sisinty](https://x.com/VaibhavSisinty/status/2108103450995417177)) - The author GLinnik21 used Ghidra and Claude Code to study the TV's native media stack and built a Rust/OpenGL client. The ~7,268 likes are the relayed post's figure, and "30 seconds to 3 seconds" refers to the user selection screen, not startup time.

## More cases from users

All of these are things their authors describe doing with REA on X. Most have no public code and have not been independently verified, so read the boundaries carefully.

**Applications and feature rebuilds**

- [Bao Yu: a comment box for the Codex browser](https://x.com/dotey/status/2109417222724600172) - 🇨🇳 Analyses the Electron code and finds the interface the page uses to open and pre-fill the comment box; the author notes it cannot yet attach a comment to the input directly.
- [macOS Preview: the same job with and without REA](https://x.com/maheshboda006/status/2109154423712977359) - The same author rebuilds zoom, rotate, annotate and save, once with REA and once without.
- [CapCut: building your own video editor](https://x.com/Mehal_Kay/status/2109665456735076494) - REA with Claude Code rebuilds subtitles, transitions, animation and text. Still in progress.
- [Jianying: letting Codex call the native editing commands](https://x.com/gkxspace/status/2109644222978744682) - 🇨🇳 After analysing Jianying, Codex drives its native editing commands. The author plans to open source it once the sensitive parts are removed.
- [ClearSpace: studying CleanMyMac](https://x.com/iceman_shen/status/2109665812017746132) - 🇨🇳 Codex with REA studies the cleaning tool and produces a first native Mac cleanup app.
- [Typeless: a local voice-input alternative](https://x.com/i/status/2109971905336037671) - The author says he analysed Typeless with REA and then wrote an offline voice-input app in Swift. (The link is an anonymous x.com/i/status address, so the author cannot be verified.)
- [Screen Studio: rebuilding a screen-recording demo tool](https://x.com/i/status/2109843188341207283) - The author says he took Screen Studio apart with REA and rebuilt it with Claude Code. (The link is an anonymous x.com/i/status address, so the author cannot be verified.)
- [MarkText: rebuilding the HTML export](https://x.com/i/status/2109839329933824026) - Analyses and rebuilds MarkText's HTML export with REA, with 17 tests passing. (The link is an anonymous x.com/i/status address, so the author cannot be verified.)
- [LightBurn: dedicated control software for your own laser engraver](https://x.com/LIQUID8RPF/status/2109789864891940904) - The author says he made a LightBurn replacement for the LONGER Ray5 in 16 minutes. It has not been verified on real hardware.
- [Claude Code: reading 47 MB of minified JavaScript](https://x.com/servasyy_ai/status/2108846931183378537) - 🇨🇳 Has the agent call REA to read Claude Code's large minified bundle.
- [A binary library: analyse first, then rewrite](https://x.com/leeoxiang/status/2109159806183538768) - 🇨🇳 After REA analyses a binary library, Claude Code writes the replacement.
- [Website rebuilds](https://x.com/goan999999/status/2109080288823562734) - 🇨🇳 The author says REA helped with a website rebuild job.
- [A TradingView rebuild workflow](https://x.com/RohOnChain/status/2109347169316839434) - A widely shared rebuild workflow, with no evidence that paid indicators were recovered.

**Hardware and devices**

- [Smart toilet: from a mini-program Bluetooth protocol to a Mac menu-bar remote](https://x.com/thinkszyg/status/2109309251533570509) - 🇨🇳 Analyses the WeChat mini program's Bluetooth traffic and controls the toilet lid from the computer, [extended later](https://x.com/thinkszyg/status/2109526361971073103) to other devices at home.
- [A television control workbench](https://x.com/i/status/2109842197654692349) - The author says he reverse-engineered a TV with REA and built input switching, volume, remote control and screen mirroring on a computer. (The link is an anonymous x.com/i/status address, so the author cannot be verified.)
- [Homatics TV box: fixing a Dolby Vision colour cast](https://x.com/qwerty__cs/status/2109722857207115879) - Studies the firmware and fixes the green-tinted picture that appeared after the Android TV 14 update.
- [A Bluetooth gamepad setup program](https://x.com/corndogjpn2/status/2109289076243525916) - The protocol is reverse-engineered; the cross-platform setup program is still planned.
- [Elgato 4K X capture card](https://x.com/talkaboutdesign/status/2109795113807630735) - Has started studying the capture card, aiming for better performance and lower latency.

**Games**

- [Air Management 2](https://x.com/TSFisher24nrex/status/2109452544913326086) - Uses REA with Kimi to study KOEI's 1993 airline business game. The original post could not be retrieved on 2026-10-21; the account is still active, but that status is gone, so the claim is unverified.
- [The speed rules of the runner game (the HTTP t-rex page)](https://x.com/0xlangeai/status/2109595393260761111) - 🇨🇳 The author rebuilds it with REA and Codex and publishes a side-by-side video of the original, the official showcase version and their own. Note: the official dinosaur case is [morluto/rea PR #1203](https://github.com/morluto/rea/pull/1203), not this one.

**Evaluations and controlled comparisons**

- [Codex with and without REA](https://x.com/0xlangeai/status/2109603485914206498) - 🇨🇳 Three self-made samples, six runs, 360 test cases accepted, focused on how much REA adds as a source of leads rather than on a speed ranking.

## Intro and spread

- [Matthew Berman](https://x.com/MatthewBerman/status/2108245653843509415) - "Reverse Engineer Anything 😂 Software is done." One of the posts that set off the wide spread.
- [0xMarioNawfal](https://x.com/RoundtableSpace/status/2109165852578992582) - "Closed source is dead", the intro on the day REA gained 25k stars, about 920k views. An earlier [feature intro](https://x.com/RoundtableSpace/status/2107059472753664261) went out on October 5.
- [International Cyber Digest](https://x.com/IntCyberDigest/status/2108699960782774733) - The intro while REA was #1 on GitHub Trending: "Software is dead, long live software!"
- [Trending GitHub Repositories](https://x.com/trending_repos/status/2107443007217701076) - The daily trending-repo bot, reporting about 3,000 new stars in 24 hours.
- [Rohan Paul](https://x.com/rohanpaul_ai/status/2108423886509683053) - Feature overview: one MCP for binaries, applications and runtime behavior.
- [Tech with Mak](https://x.com/techNmak/status/2108431092462338178) - "Someone gave Claude Code a decompiler", explaining how it connects agents to Ghidra, Hopper and other tools.
- [Hasan Toor](https://x.com/hasantoxr/status/2108524682727305344) - "Hand any app to AI and have it rebuild the best features inside".
- [Larry Cheng](https://x.com/larryvc/status/2109344654198018095) - A venture investor's one-line take: look at a finished app and work out how it works without the source.
- [Afiz](https://x.com/itsafiz/status/2107063919290573174) - "See a feature you like and have your agent reverse-engineer it", stressing that everything runs locally.
- [Oliver Prompts](https://x.com/oliviscusAI/status/2106955446183411895) - Feature intro: decompile, trace execution, inspect runtime behavior.
- [K2S](https://x.com/k2sbhai/status/2106796616716062777) - Four steps to start: install, `rea setup`, connect your agent, give it a feature to investigate.
- [Vaishnavi](https://x.com/_vmlops/status/2106690704244420687) - An early intro post.
- [Dan Kornas](https://x.com/DanKornas/status/2106032461968761052) - The intro from October 2, one of the earliest before REA went viral. Lists evidence records, local analysis and other features.
- [CyrilXBT](https://x.com/cyrilXBT/status/2109490499321299364) - "Closed source used to mean protected and now only means slower to copy". A typical example of the hype.
- [darkzodchi](https://x.com/zodchiii/status/2109736071827476756) - A long getting-started post on REA with Claude Code: reading undocumented repos, apps without public APIs, and old .exe files whose source is lost.
- [X trending topic](https://x.com/i/trending/2108302228461080603) - X's own summary of the topic, about a GitHub tool that lets AI reverse-engineer app features from binaries.

## Chinese, Japanese and other languages

- [Bao Yu (dotey): REA lets AI agents reverse-engineer software without source code](https://x.com/dotey/status/2108794629172682783) - 🇨🇳 The most complete Chinese intro: install, what it can analyze, three official showcases, where data goes, plus compliance notes and a reminder that REA has no token. About 300k views.
- [lifcc](https://x.com/mylifcc/status/2108940999527690525) - 🇨🇳 On an open-source project gaining 20k+ stars in a day, and what it means that Claude Code or Codex can now study binaries and rebuild features.
- [Ting](https://x.com/shijianzhongg/status/2107979591348543520) - 🇨🇳 "The open-source project taking GitHub by storm today", listing three uses: finding hidden features, checking for backdoors, learning how big companies build things. About 170k views.
- [TechVerser](https://x.com/realfxw/status/2106734209473581308) - 🇨🇳 "AI is completely reshaping the rules of low-level reverse engineering", introducing the idea of REA as a reverse-engineering toolchain packaged for agents.
- [Khazix](https://x.com/Khazix0918/status/2109501787736813663) - 🇨🇳 "AI has started reverse-engineering everything, every program on your computer will be forced open source".
- [xiangxiang103's REA case collection](https://x.com/xiangxiang103/status/2109813885641576795) - 🇨🇳 A batch of user cases collected on X.
- [Takashi Yoshikawa (author of *マルウエアの教科書*)](https://x.com/MalwareBibleJP/status/2108736281647931717) - 🇯🇵 A malware analyst's and defender's view, going point by point over the dependent tools, the difference between static and runtime analysis, where data goes, and the disclaimer.
- [midudev](https://x.com/midudev/status/2107834472091598854) - 🇪🇸 "Everyone is using AI to reverse-engineer programs and games". The most-shared post in Spanish-speaking developer circles, about 150k views.
- [bearstech](https://x.com/bearstech/status/2109679666105655457) / [actu_ia](https://x.com/actu_ia/status/2107107539485958502) - 🇫🇷 Short intros in French.

## Official accounts

- [@morluto](https://x.com/morluto) - REA's author. In the [rea 6.4 release post](https://x.com/morluto/status/2109138696008327226) they say it is much faster and share [morluto/flameox](https://github.com/morluto/flameox), the profiler used for that work.
- [@reatools](https://x.com/reatools) - The official account. It reposted the author's line "the homebrew computer club era of technology is back".

## Concurrent open-source project roundups

REA often appears in "open-source tools that replace paid software" roundups, next to other viral repos.

- [brenz.](https://x.com/brenzhills/status/2108983461230845978) - 🇪🇸 "10 repos blowing up this month", with REA at #4 next to VoiceStudio, ppt-master, gods-eye-view, diagram-design and paperclip.
- [Chris Pirillo](https://x.com/ChrisPirillo/status/2109843806187303400) - A Vibe Coding and AI news roundup for October 12, listing REA next to context-mode, diagram-design and others.
- [govin.eth｜G哥](https://x.com/goan999999/status/2109544711400857688) - 🇨🇳 "These 6 open-source tools on GitHub mean the good days for paid software are ending": PPT Master, VoiceStudio, God's Eye View, Diagram Design, Paperclip and ECC. It does not mention REA, but it is the same batch of projects and the same story as the two posts above.

## Controversy

- [codila](https://x.com/0xCodila/status/2109623431763292649) - "REA is most dangerous thing on the internet right now", promoting it for copying paid features for free, a typical example of what the controversy is about (see [Legal and controversy](../README.md#legal-and-controversy)).
- [Liu Xiaopai](https://x.com/bourneliu66/status/2109882364705038422) - 🇨🇳 "REA is just a Hype": it is not a new reverse-engineering technique, only a way for agents to call existing tools, overhyped by influencers. A representative counterpoint.
- [Jaden Williams](https://x.com/JadenJTW/status/2106890896981508329) - Reposted an early intro post with only "God help us all."
