# Contributing

Thanks for helping. Please read the rules before you open a pull request or an issue.

## What belongs here

1. **Open-source projects first**, with a link to the source.
2. **Community cases** need evidence that REA was used: the project's README, the author's post, or an official showcase. Put the link to that evidence on the entry.
3. **Projects that only claim AI use**, or that have no evidence either way, go in "The wider wave" with the matching tag.
4. **No** mirrors, pure forks, or projects whose main purpose is bypassing licensing, copying paid features or distributing copyrighted assets.
5. **Posts on X** without public code belong on the [X page](docs/x-posts.md).

## Tags

- `REA`: the README, author's post or official showcase says REA was used.
- `AI-RE`: other or unstated AI tools.
- `Rebuild`: clean-room rewrite, no reverse-engineering evidence.
- `Claim?`: not yet verified.
- `Manual RE`: reverse-engineered by hand, no AI stated.

## Format

One line per entry:

```
- [Name](link) - what it does, and its tag.
```

## Takedowns

If you are the author of a listed project and want it removed, open an issue using the **Case** form and say so. We will remove the entry and keep an archived copy of the evidence.

## Checks

Before you submit, please check that:

- every link works;
- the evidence link shows REA use (if you claim REA);
- the license is stated;
- `python3 scripts/validate_list.py` reports no errors;
- the tables are still aligned, which `python3 scripts/align_tables.py` fixes.

`scripts/validate_list.py` is the same check the CI runs. It covers the tag
vocabulary, the licence on every case, the evidence row for every `REA` case,
the English and Chinese lists matching each other, in-page anchors, the table
of contents matching the headings in order, mirrors of the upstream project,
and an English document sending the reader to a Chinese-only file.

## Markdown style, and where this list deliberately differs

This list carries the [awesome.re](https://awesome.re) badge, and it does not
pass every default of the [awesome-lint](https://github.com/sindresorhus/awesome-lint)
rules. The differences are intentional:

| Rule                              | Why it is left                                                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| duplicate links                   | The "Most shared" table repeats entries that also appear in the body, and the legal section links the research it cites. Both are deliberate.                                 |
| every list item is a link         | The bullets in the legal section are prose with a bold label, not catalogue entries.                                                                                          |
| the contents is the first section | The "Most shared" table is the hook of the page and comes first, as it does in [morluto/awesome-reverse-engineering](https://github.com/morluto/awesome-reverse-engineering). |
| the heading is in title case      | The badge is part of the heading, and the badge is how the list is found.                                                                                                     |

Everything else is fixed: the tables are aligned, the spelling is checked,
and the contents matches the headings.

`awesome-lint` reads the file from the GitHub URL it is given, not from the
working tree, so it has to be run against a pushed branch:

```bash
npx awesome-lint <repo-url>/tree/<branch>
```

